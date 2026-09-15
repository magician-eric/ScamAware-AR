package com.bigxreality.jorjinverifier;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.SurfaceHolder;

import com.jorjin.jjsdk.camera.CameraManager;
import com.jorjin.jjsdk.tof.TofDevicesAttachListener;
import com.jorjin.jjsdk.tof.TofFrameData;
import com.jorjin.jjsdk.tof.TofGestureEvent;
import com.jorjin.jjsdk.tof.TofGestureEventListener;
import com.jorjin.jjsdk.tof.TofIncomingFrameListener;
import com.jorjin.jjsdk.tof.TofManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Owns every piece of glasses hardware: USB enumeration and grants, the JJSDK RGB camera and the
 * JJSDK ToF module.  The activity above it starts and stops this, forwards gestures to the CIBAR
 * page, and writes every {@link Listener} report to Logcat - nothing it reports is drawn on the
 * wearer's screen.
 *
 * <h2>Why gestures never arrived before</h2>
 * The RGB camera and the ToF module are two distinct USB devices.  The app previously located the
 * UVC video device, requested a grant for that one, and then built both {@code CameraManager} and
 * {@code TofManager}.  JJSDK's shared USB monitor ({@code d.a}) does have a fallback that would
 * request the ToF grant itself, but it is effectively one-shot: it runs a single poll 300 ms after
 * a manager is constructed, re-arms only on {@code USB_DEVICE_ATTACHED}/{@code DETACHED} or on the
 * SDK's own {@code com.jorjin.jjsdk.USB_PERMISSION} broadcast, gates every request behind a shared
 * "a request is already pending" latch, and clears its per-subsystem request bit permanently once
 * a device is seen as granted.  A grant obtained through <em>our</em> dialog re-arms none of that,
 * so {@code TofManager} was frequently never handed its device, never opened the CDC port, and
 * never emitted a single event - while the camera, whose grant we did hold at the right moment,
 * worked fine.
 *
 * <h2>The fix</h2>
 * Enumerate every USB device, classify each one with the same vendor/product rule JJSDK uses, and
 * obtain grants for <em>all</em> required devices ourselves before constructing any SDK manager.
 * By the time the SDK's single poll runs, both devices already report {@code hasPermission}, so
 * its dispatch path delivers the ToF device on the first pass.  A watchdog rebuilds
 * {@code TofManager} (whose constructor re-arms that poll) if the module is present and granted
 * but has still not come up, which covers a poll that raced a late enumeration.
 */
final class JorjinHardwareManager {
    private static final String TAG = "JorjinVerifier";
    /** Our own action; the SDK's internal com.jorjin.jjsdk.USB_PERMISSION never reaches us. */
    private static final String ACTION_USB_PERMISSION =
            "com.bigxreality.jorjinverifier.USB_PERMISSION";
    private static final long WATCHDOG_INTERVAL_MS = 1000L;
    /** How long the ToF may sit granted-but-not-ready before we rebuild {@link TofManager}. */
    private static final long TOF_REBUILD_AFTER_MS = 6000L;
    private static final int MAX_TOF_REBUILDS = 3;

    /** Per-layer state so on-device testing can see exactly which layer is stuck. */
    enum LayerState { UNKNOWN, OK, WAITING, FAILED }

    /** Everything the UI renders; all callbacks land on the main thread. */
    interface Listener {
        void onCameraState(LayerState state, String detail);
        void onCameraResolution(String resolution);
        void onFrameCount(long frames);
        void onTofUsbState(LayerState detected, LayerState permission, String detail);
        void onTofManagerState(LayerState state, String detail);
        void onTofRuntimeState(LayerState state, String firmware, boolean listenerRegistered);
        /**
         * @param code bare uppercase gesture code ({@code PUSH}, {@code LEFT}, ...), or null when
         *             the counters were merely reset - a reset is not a gesture and must not be
         *             forwarded to the CIBAR page as one.
         */
        void onGesture(String label, String code, String source, long count);
        void onError(String message);
        void onUsbInventory(String inventory);
        /** The SDK-boundary trace, re-rendered whenever it changes. */
        void onTofTrace(String trace);
    }

    private final Context context;
    private final Listener listener;
    private final UsbManager usbManager;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final AtomicLong frameCount = new AtomicLong();
    private final GestureController gestureController;
    private final TofTrace trace = new TofTrace();
    private final AtomicLong tofFrameCount = new AtomicLong();
    private final TofGestureRecognizer depthRecognizer;
    /**
     * The glasses' RGB frames, republished to the WebView. A WebView cannot reach this camera on
     * its own - it is a USB device JJSDK holds - so image recognition in the page has to be fed
     * from here or it silently uses the phone's camera instead.
     */
    private final GlassesCameraStream cameraStream = new GlassesCameraStream();

    private CameraManager cameraManager;
    private TofManager tofManager;
    private SurfaceHolder surfaceHolder;
    private boolean started;
    private boolean receiverRegistered;
    private boolean awaitingPermission;
    private int generation;
    private long tofManagerBuiltAt;
    private int tofRebuilds;
    private boolean tofAttachedReported;
    /**
     * Whether {@code setTofGestureListener} actually succeeded.  This used to be reported to the
     * panel as a hardcoded {@code true}, so the one line a tester would check to rule the listener
     * out said "Registered" whether or not it was - a diagnostic that can only ever mislead.
     */
    private boolean gestureListenerRegistered;
    /** Identifies the live TofManager in the trace; 0 while none exists. */
    private int tofInstanceId;
    private boolean tofReadyReported;

    JorjinHardwareManager(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
        this.usbManager = (UsbManager) this.context.getSystemService(Context.USB_SERVICE);
        this.gestureController = new GestureController((label, gesture, source, count) ->
                handler.post(() -> listener.onGesture(
                        label, GestureLabels.code(gesture), source.label, count)));
        // The second, independent gesture source. JJSDK's TofGestureEvent path reads a bitfield
        // the module's *firmware* fills in, and firmware older than v1.2.2 never sets it - no
        // amount of a healthy USB link produces an event. The vendor's own app does not rely on
        // it either; it computes gestures host-side from the same 8x8 depth grid, which JJSDK
        // hands us through TofIncomingFrameListener. Still the glasses' native ToF sensor, still
        // through JJSDK - just not through the part of it that is dead on this module.
        this.depthRecognizer = new TofGestureRecognizer((gesture, action, eventTimeNanos) ->
                gestureController.onRawEvent(action, gesture, eventTimeNanos,
                        android.os.SystemClock.elapsedRealtime(),
                        GestureController.Source.DEPTH_FRAME));
    }

    void setSurfaceHolder(SurfaceHolder holder) {
        this.surfaceHolder = holder;
    }

    String trace() {
        return trace.render();
    }

    // ---------------------------------------------------------------- USB inventory

    /** Snapshot of one attached USB device, used for classification and for the logcat dump. */
    private static final class UsbEntry {
        final UsbDevice device;
        final boolean isTof;
        final boolean isTofUsableBySdk;
        final boolean isTofInDfu;
        final boolean isCamera;

        UsbEntry(UsbDevice device) {
            this.device = device;
            int vid = device.getVendorId();
            int pid = device.getProductId();
            this.isTofUsableBySdk = JorjinUsbDevices.isSdkSupportedTof(vid, pid);
            this.isTof = JorjinUsbDevices.isTofCandidate(vid, pid);
            this.isTofInDfu = JorjinUsbDevices.isTofInDfuMode(vid, pid);
            this.isCamera = JorjinUsbDevices.isSdkSupportedCamera(vid, pid)
                    || hasInterfaceClass(device, JorjinUsbDevices.CLASS_VIDEO);
        }
    }

    private static boolean hasInterfaceClass(UsbDevice device, int interfaceClass) {
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            if (device.getInterface(i).getInterfaceClass() == interfaceClass) return true;
        }
        return false;
    }

    private List<UsbEntry> enumerate() {
        List<UsbEntry> entries = new ArrayList<>();
        if (usbManager == null) return entries;
        for (UsbDevice device : usbManager.getDeviceList().values()) {
            entries.add(new UsbEntry(device));
        }
        return entries;
    }

    /**
     * Dumps every enumerated device, its interfaces and its grant state.  This is the single most
     * useful artefact when a pair of glasses behaves differently from the ones we tested on, so it
     * is written unconditionally on every start and mirrored into the on-screen panel.
     */
    private String describeInventory(List<UsbEntry> entries) {
        StringBuilder text = new StringBuilder();
        text.append("USB 裝置枚舉：共 ").append(entries.size()).append(" 個");
        for (UsbEntry entry : entries) {
            UsbDevice device = entry.device;
            boolean granted = usbManager != null && usbManager.hasPermission(device);
            text.append('\n')
                    .append(JorjinUsbDevices.formatIds(device.getVendorId(), device.getProductId()))
                    .append(" deviceId=").append(device.getDeviceId())
                    .append(" deviceClass=").append(device.getDeviceClass())
                    .append('/').append(device.getDeviceSubclass())
                    .append('/').append(device.getDeviceProtocol())
                    .append(" interfaces=").append(device.getInterfaceCount())
                    .append(" permission=").append(granted ? "GRANTED" : "MISSING")
                    .append(" role=").append(entry.isTof
                            ? (entry.isTofUsableBySdk ? "TOF" : "TOF(SDK 未支援此 PID)")
                            : entry.isTofInDfu ? "TOF-DFU" : entry.isCamera ? "RGB" : "OTHER");
            for (int i = 0; i < device.getInterfaceCount(); i++) {
                UsbInterface usbInterface = device.getInterface(i);
                text.append("\n  interface[").append(i).append("] class=")
                        .append(usbInterface.getInterfaceClass())
                        .append('/').append(usbInterface.getInterfaceSubclass())
                        .append('/').append(usbInterface.getInterfaceProtocol())
                        .append(" endpoints=").append(usbInterface.getEndpointCount());
            }
        }
        String inventory = text.toString();
        for (String line : inventory.split("\n")) Log.i(TAG, line);
        return inventory;
    }

    // ---------------------------------------------------------------- lifecycle

    void start() {
        if (started) return;
        registerReceiver();
        List<UsbEntry> entries = enumerate();
        String inventory = describeInventory(entries);
        listener.onUsbInventory(inventory);

        UsbEntry camera = firstCamera(entries);
        UsbEntry tof = firstTof(entries);
        reportTofUsb(entries, tof);
        trace.add(0, "start() camera=" + (camera == null ? "none" : "found")
                + " tof=" + (tof == null ? "none" : "found"));

        if (camera == null && tof == null) {
            listener.onCameraState(LayerState.FAILED, "未偵測到眼鏡");
            listener.onError("未偵測到任何眼鏡 USB 裝置；請確認 USB-C 線具資料傳輸能力、"
                    + "眼鏡已接妥且供電充足。");
            return;
        }

        // Both grants are obtained here, before any SDK manager is constructed - see the class
        // comment: JJSDK's own USB monitor asks for the ToF device only through a one-shot poll
        // that our own grant dialog does not re-arm, so a ToF left to it is frequently never
        // handed its device at all.
        if (requestMissingPermission(camera)) return;
        if (requestMissingPermission(tof)) return;

        started = true;
        generation++;
        tofRebuilds = 0;
        frameCount.set(0);
        tofReadyReported = false;
        tofFrameCount.set(0);
        gestureController.reset();
        depthRecognizer.reset();
        // Camera + ToF, always. This is the one start-up path the app has: the production
        // experience needs the RGB stream for recognition and the ToF module for gestures, so
        // there is nothing to choose between and nothing on screen that could choose it.
        startCamera(camera, generation);
        startTof(tof);
        handler.removeCallbacks(watchdog);
        handler.post(watchdog);
        listener.onTofTrace(trace.render());
    }

    void stop() {
        started = false;
        generation++;
        awaitingPermission = false;
        handler.removeCallbacks(watchdog);
        unregisterReceiver();
        trace.add(0, "stop(): releaseCamera() 然後 releaseTof()");
        // Both managers hold the same d.a USB monitor singleton, so the order these are released
        // in is not obviously free of consequence; recorded rather than assumed.
        releaseCamera();
        releaseTof();
    }

    private UsbEntry firstCamera(List<UsbEntry> entries) {
        for (UsbEntry entry : entries) if (entry.isCamera && !entry.isTof) return entry;
        return null;
    }

    private UsbEntry firstTof(List<UsbEntry> entries) {
        for (UsbEntry entry : entries) if (entry.isTof) return entry;
        // Some units enumerate the ToF with ids neither table knows.  Fall back to any pure
        // CDC-ACM node that is not the video device rather than reporting "no ToF" outright.
        for (UsbEntry entry : entries) {
            if (entry.isCamera || entry.isTofInDfu) continue;
            if (hasInterfaceClass(entry.device, JorjinUsbDevices.CLASS_CDC_CONTROL)
                    && hasInterfaceClass(entry.device, JorjinUsbDevices.CLASS_CDC_DATA)) {
                return entry;
            }
        }
        return null;
    }

    private void reportTofUsb(List<UsbEntry> entries, UsbEntry tof) {
        if (tof == null) {
            for (UsbEntry entry : entries) {
                if (entry.isTofInDfu) {
                    listener.onTofUsbState(LayerState.FAILED, LayerState.UNKNOWN,
                            "ToF 停在 DFU 韌體更新模式，無法輸出手勢");
                    return;
                }
            }
            listener.onTofUsbState(LayerState.FAILED, LayerState.UNKNOWN, "未偵測到 ToF USB 裝置");
            return;
        }
        boolean granted = usbManager != null && usbManager.hasPermission(tof.device);
        String detail = JorjinUsbDevices.formatIds(
                tof.device.getVendorId(), tof.device.getProductId());
        if (!tof.isTofUsableBySdk) detail += "（JJSDK 1.3.3 未列此 PID）";
        listener.onTofUsbState(LayerState.OK, granted ? LayerState.OK : LayerState.WAITING, detail);
    }

    // ---------------------------------------------------------------- USB permission

    private final BroadcastReceiver permissionReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (!ACTION_USB_PERMISSION.equals(intent.getAction())) return;
            awaitingPermission = false;
            // An immutable PendingIntent can arrive without the system's fill-in extras, so
            // re-run the whole start path rather than trusting EXTRA_DEVICE.
            Log.i(TAG, "USB 授權結果回傳，重新評估硬體啟動條件");
            start();
        }
    };

    private void registerReceiver() {
        if (receiverRegistered) return;
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(permissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            context.registerReceiver(permissionReceiver, filter);
        }
        receiverRegistered = true;
    }

    private void unregisterReceiver() {
        if (!receiverRegistered) return;
        receiverRegistered = false;
        try { context.unregisterReceiver(permissionReceiver); }
        catch (Throwable error) { Log.w(TAG, "解除 USB 廣播接收器失敗", error); }
    }

    /** @return true when a dialog was raised and {@link #start()} must wait for the result. */
    private boolean requestMissingPermission(UsbEntry entry) {
        if (entry == null || usbManager == null) return false;
        if (usbManager.hasPermission(entry.device)) return false;
        if (awaitingPermission) return true;
        awaitingPermission = true;
        String ids = JorjinUsbDevices.formatIds(
                entry.device.getVendorId(), entry.device.getProductId());
        Log.i(TAG, "請求 USB 授權：" + ids + (entry.isTof ? " (ToF)" : " (RGB)"));
        if (entry.isTof) {
            listener.onTofUsbState(LayerState.OK, LayerState.WAITING, "等待使用者授權 " + ids);
        } else {
            listener.onCameraState(LayerState.WAITING, "等待 USB 授權 " + ids);
        }
        Intent intent = new Intent(ACTION_USB_PERMISSION).setPackage(context.getPackageName());
        usbManager.requestPermission(entry.device, PendingIntent.getBroadcast(
                context, 0, intent, PendingIntent.FLAG_IMMUTABLE));
        return true;
    }

    // ---------------------------------------------------------------- camera

    private void startCamera(UsbEntry camera, final int currentGeneration) {
        if (camera == null) {
            listener.onCameraState(LayerState.FAILED, "未偵測到 RGB 相機裝置");
            return;
        }
        try {
            listener.onCameraState(LayerState.WAITING, "啟動中");
            CameraManager manager = new CameraManager(context);
            cameraManager = manager;
            String[] resolutions = manager.getResolutionList();
            if (resolutions == null || resolutions.length == 0) {
                throw new IllegalStateException("SDK 未回傳任何可用解析度");
            }
            manager.setResolutionIndex(0);
            listener.onCameraResolution(resolutions[0]);
            if (surfaceHolder != null) manager.addSurfaceHolder(surfaceHolder);
            manager.setCameraFrameListener((buffer, width, height, format) -> {
                if (!started || generation != currentGeneration) return;
                long count = frameCount.incrementAndGet();
                // The ToF sensor and the RGB camera are two different devices on the glasses, so
                // working gestures say nothing about whether this listener is being called at
                // all - and that was the assumption that sent a whole debugging session past
                // the actual break. This is the one place that can answer it: a count that
                // rises means JJSDK is delivering RGB frames, and a count stuck at 0 with the
                // camera reporting "已啟動" means it is not, whatever the preview shows.
                if (GlassesCameraStream.isFrameMilestone(count)) {
                    Log.i(TAG, "RGB frames: " + count + " " + width + "x" + height
                            + " format=" + format);
                }
                // Runs on JJSDK's camera thread; offerFrame copies and returns, never blocks.
                cameraStream.offerFrame(buffer, width, height);
            });
            manager.startCamera(CameraManager.COLOR_FORMAT_RGBA);
            listener.onCameraState(LayerState.OK, "已啟動");
        } catch (Throwable error) {
            Log.e(TAG, "啟動 JJSDK RGB 鏡頭失敗", error);
            listener.onCameraState(LayerState.FAILED, describe(error));
            listener.onError("啟動 JJSDK RGB 鏡頭失敗：" + describe(error));
            releaseCamera();
        }
    }

    private void releaseCamera() {
        CameraManager manager = cameraManager;
        cameraManager = null;
        if (manager == null) return;
        try { manager.setCameraFrameListener(null); }
        catch (Throwable error) { Log.w(TAG, "解除相機 listener 失敗", error); }
        trace.add(0, "CameraManager.release()（與 ToF 共用 d.a monitor）");
        cameraStream.clear();
        try { manager.stopCamera(); }
        catch (Throwable error) { Log.w(TAG, "停止相機失敗", error); }
        try { manager.release(); }
        catch (Throwable error) { Log.w(TAG, "釋放相機失敗", error); }
    }

    // ---------------------------------------------------------------- ToF

    /**
     * Counts depth frames arriving over the ToF CDC link, and feeds them to the recogniser.
     *
     * <p>The frame count is what separates "our pipeline is broken" from "the module reports no
     * gestures": JJSDK reads the gesture bitfield out of the very same frame it hands to this
     * listener, so a rising frame count next to a flat firmware-gesture count proves the link,
     * the SDK parser and our listener are all healthy and only the gesture bits are dead.
     */
    @SuppressWarnings("deprecation")
    private final TofIncomingFrameListener frameListener = new TofIncomingFrameListener() {
        @Override public void onTofIncomingFrame(java.util.ArrayList frame) { }

        @Override public void onTofIncomingFrame(TofFrameData frame) {
            tofFrameCount.incrementAndGet();
            if (frame != null) {
                depthRecognizer.onFrame(frame.medianRange,
                        android.os.SystemClock.elapsedRealtime());
            }
        }
    };

    private final TofGestureEventListener gestureListener = new TofGestureEventListener() {
        @Override public void onTofGestureEvent(TofGestureEvent event) {
            if (gestureController.rawEventCount() == 0) {
                trace.add(tofInstanceId, "<- onTofGestureEvent 第一次送達（pipe 已通）");
                handler.post(() -> listener.onTofTrace(trace.render()));
            }
            gestureController.onRawEvent(event, android.os.SystemClock.elapsedRealtime());
        }
    };

    private final TofDevicesAttachListener attachListener = new TofDevicesAttachListener() {
        @Override public void onTofDevicesAttached(boolean attached) {
            Log.i(TAG, "onTofDevicesAttached=" + attached);
            trace.add(tofInstanceId, "<- onTofDevicesAttached(" + attached + ")");
            tofAttachedReported = attached;
            if (!attached) {
                handler.post(() -> listener.onTofRuntimeState(
                        LayerState.FAILED, null, gestureListenerRegistered));
            }
        }
    };

    private void startTof(UsbEntry tof) {
        if (tof == null) {
            listener.onTofManagerState(LayerState.FAILED, "沒有可用的 ToF USB 裝置");
            return;
        }
        buildTofManager();
    }

    /**
     * Constructing {@link TofManager} is also what re-arms JJSDK's device-discovery poll, so this
     * doubles as the recovery action when the module is present and granted but never came up.
     * Listeners are registered before {@code open()} because the poll fires 300 ms after the
     * constructor returns and the attach callback must not find a null listener.
     */
    private void buildTofManager() {
        releaseTof();
        try {
            int id = TofTrace.nextInstanceId();
            tofInstanceId = id;
            trace.add(id, "new TofManager()");
            TofManager manager = new TofManager(context);
            tofManager = manager;
            manager.setTofDevicesAttachListener(attachListener);
            trace.add(id, "setTofDevicesAttachListener(ours)  [static E]");
            manager.setTofGestureListener(gestureListener);
            // Static field: this instance has just taken the listener away from every other one.
            trace.add(id, "setTofGestureListener(ours)  [static D]");
            // The depth-frame path, which is what actually produces gestures on this module.
            manager.setTofFrameListener(frameListener);
            trace.add(id, "setTofFrameListener(ours)  [static C]");
            gestureListenerRegistered = true;
            // isDeviceSupportToF() is inverted in JJSDK 1.3.3 (it returns true while no ToF has
            // been found) and discovery is asynchronous, so it must not gate anything here.
            manager.open();
            trace.add(id, "open()");
            tofManagerBuiltAt = android.os.SystemClock.elapsedRealtime();
            listener.onTofManagerState(LayerState.OK, tofRebuilds == 0
                    ? "已建立並 open()" : "已重建並 open()（第 " + tofRebuilds + " 次）");
            listener.onTofRuntimeState(LayerState.WAITING, null, gestureListenerRegistered);
        } catch (Throwable error) {
            Log.e(TAG, "啟動 JJSDK ToF 失敗", error);
            listener.onTofManagerState(LayerState.FAILED, describe(error));
            listener.onError("啟動 JJSDK ToF 失敗：" + describe(error));
            releaseTof();
        }
    }

    private void releaseTof() {
        TofManager manager = tofManager;
        tofManager = null;
        tofAttachedReported = false;
        gestureListenerRegistered = false;
        if (manager == null) return;
        int id = tofInstanceId;
        tofInstanceId = 0;
        try {
            manager.setTofGestureListener(null);
            // These null a STATIC field, so they take the listener away from every TofManager in
            // the process - including one that is still streaming and still reports Ready.
            trace.add(id, "setTofGestureListener(null)  [static D := null]");
            manager.setTofFrameListener(null);
            trace.add(id, "setTofFrameListener(null)  [static C := null]");
            manager.setTofDevicesAttachListener(null);
        } catch (Throwable error) { Log.w(TAG, "解除 ToF listener 失敗", error); }
        try { manager.close(); trace.add(id, "close()"); }
        catch (Throwable error) { Log.w(TAG, "關閉 ToF 失敗", error); }
        try { manager.release(); trace.add(id, "release()  [static C/D/E := null]"); }
        catch (Throwable error) { Log.w(TAG, "釋放 ToF 失敗", error); }
        listener.onTofTrace(trace.render());
    }

    // ---------------------------------------------------------------- watchdog

    private final Runnable watchdog = new Runnable() {
        @Override public void run() {
            if (!started) return;
            listener.onFrameCount(frameCount.get());
            pollTof();
            handler.postDelayed(this, WATCHDOG_INTERVAL_MS);
        }
    };

    private void pollTof() {
        TofManager manager = tofManager;
        if (manager == null) return;
        boolean ready;
        String firmware;
        try {
            ready = manager.getTofState();
            firmware = manager.getTofFwVersion();
        } catch (Throwable error) {
            Log.w(TAG, "讀取 ToF 狀態失敗", error);
            return;
        }
        listener.onTofRuntimeState(ready ? LayerState.OK : LayerState.WAITING, firmware,
                gestureListenerRegistered);
        if (ready && !tofReadyReported) {
            tofReadyReported = true;
            // getTofState() is z && y: z set by open(), y set at the top of the SDK's handshake.
            // Ready therefore proves the handshake ran, which proves the firmware string below
            // was read from the device and the SDK's gesture gate was computed from it.
            trace.add(tofInstanceId, "getTofState()=true（handshake 已完成）"
                    + " fw=" + TofTrace.escape(firmware)
                    + " packed=0x" + Integer.toHexString(TofFirmware.pack(firmware))
                    + " gate=" + (TofFirmware.deliversGestures(firmware) ? "OPEN" : "CLOSED"));
            listener.onTofTrace(trace.render());
        }
        if (ready) return;
        long waited = android.os.SystemClock.elapsedRealtime() - tofManagerBuiltAt;
        if (waited <= TOF_REBUILD_AFTER_MS || tofRebuilds >= MAX_TOF_REBUILDS) return;
        if (!tofAttachedReported && !hasGrantedTof()) return;
        tofRebuilds++;
        Log.w(TAG, "ToF 已授權但未就緒，重建 TofManager 以重新觸發 SDK 裝置探索（第 "
                + tofRebuilds + " 次）");
        trace.add(tofInstanceId, "watchdog 重建 TofManager（第 " + tofRebuilds + " 次）");
        buildTofManager();
    }

    private boolean hasGrantedTof() {
        UsbEntry tof = firstTof(enumerate());
        return tof != null && usbManager != null && usbManager.hasPermission(tof.device);
    }

    GlassesCameraStream cameraStream() {
        return cameraStream;
    }

    long tofFrameCount() {
        return tofFrameCount.get();
    }

    long gestureCount() {
        return gestureController.gestureCount();
    }

    static String describe(Throwable error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
                ? error.getClass().getSimpleName() : message;
    }

    static String label(LayerState state, String okText, String failText, String waitText) {
        switch (state) {
            case OK: return okText;
            case FAILED: return failText;
            case WAITING: return waitText;
            default: return "—";
        }
    }

    static String formatCount(long value) {
        return String.format(Locale.TAIWAN, "%,d", value);
    }
}
