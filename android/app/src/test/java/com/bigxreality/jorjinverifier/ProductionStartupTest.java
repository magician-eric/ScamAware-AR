package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import org.junit.Test;

/**
 * Pins the production start-up flow: launch, bring the glasses up, show CIBAR - and show nothing
 * else on the way.
 *
 * <p>Three engineering screens used to stand between the launcher icon and the experience, and
 * every one of them was a screen a player could reach without asking for it:
 *
 * <ul>
 *   <li>the diagnostics home screen (版本 / versionCode / 最後手勢 / 手勢次數 / 原始事件 /
 *       模擬掃描 / 啟動模式), which the app opened straight into;</li>
 *   <li>the ToF and gesture test controls further down that same panel (ToF 深度網格, 深度幀,
 *       亮區, 距離 mm, 開啟左右手勢測試頁, 在 App 內開啟 CIBAR, 開啟 CIBAR（掃描診斷模式）,
 *       重新連接);</li>
 *   <li>the toolbar above the WebView (返回診斷 / 網址 / 重新載入).</li>
 * </ul>
 *
 * <p>None of that is reachable by the Java compiler once it is deleted - a re-added button breaks
 * nothing at build time and only shows up on a phone, in front of whoever is wearing the glasses.
 * These tests read the layout and the activity as text so a re-added control fails the build.
 * The fourth screen, the top-right {@code Jorjin Gesture / Last: / Count:} overlay, is pinned in
 * {@link GestureBridgeScriptTest} where the script that drew it lives.
 */
public class ProductionStartupTest {

    /**
     * Gradle runs unit tests with android/app as the working directory; a hand-rolled runner can
     * start anywhere. Located once by the manifest only the module directory has.
     */
    private static final File MODULE = findModuleDirectory();

    private static File findModuleDirectory() {
        File start = new File("").getAbsoluteFile();
        for (File dir = start; dir != null; dir = dir.getParentFile()) {
            for (String prefix : new String[] {"", "app", "android/app"}) {
                File candidate = prefix.isEmpty() ? dir : new File(dir, prefix);
                if (new File(candidate, "src/main/AndroidManifest.xml").isFile()) return candidate;
            }
        }
        throw new IllegalStateException(
                "找不到 Android module 目錄（從 " + start + " 往上都沒有 src/main/AndroidManifest.xml）");
    }

    private static String read(String moduleRelativePath) throws IOException {
        File file = new File(MODULE, moduleRelativePath);
        assertTrue("找不到檔案：" + file.getAbsolutePath(), file.isFile());
        return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
    }

    /**
     * The layout with its XML comments removed. The comments explain what used to be here and
     * why the SurfaceView may not be hidden, so they name the very strings these tests search
     * for; matching them would fail the build for the documentation of the fix.
     */
    private static String layout() throws IOException {
        return read("src/main/res/layout/activity_main.xml")
                .replaceAll("(?s)<!--.*?-->", "");
    }

    /** The body of one element, so an attribute can be looked for inside the right tag. */
    private static String element(String xml, String name) {
        int start = xml.indexOf("<" + name);
        assertTrue("找不到 <" + name + ">", start >= 0);
        int end = xml.indexOf(">", start);
        assertTrue("<" + name + "> 沒有結束", end > start);
        return xml.substring(start, end);
    }

    /** MainActivity's source with its comments removed, for the same reason as {@link #layout}. */
    private static String activity() throws IOException {
        return read("src/main/java/com/bigxreality/jorjinverifier/MainActivity.java")
                .replaceAll("(?s)/\\*.*?\\*/", "")
                .replaceAll("(?m)//.*$", "");
    }

    // ------------------------------------------------------------ what the wearer sees

    /** The only two views the app draws: the camera surface, and CIBAR on top of it. */
    @Test public void theLayoutIsACameraSurfaceAndAWebView() throws IOException {
        String layout = layout();
        assertTrue(layout.contains("@+id/cameraSurface"));
        assertTrue(layout.contains("@+id/cibarWebView"));
        String webView = element(layout, "WebView");
        assertTrue("WebView 必須佔滿整個畫面寬度",
                webView.contains("android:layout_width=\"match_parent\""));
        assertTrue("WebView 必須佔滿整個畫面高度（頂部不留工具列）",
                webView.contains("android:layout_height=\"match_parent\""));
    }

    /** Not one control, anywhere. A button is a decision the wearer should never be asked for. */
    @Test public void thereIsNoButtonOnAnyScreen() throws IOException {
        assertFalse("正式流程不得有任何按鈕", layout().contains("<Button"));
    }

    /**
     * The web layer is visible from the first frame. It used to start {@code gone} and appear
     * only when someone tapped "在 App 內開啟 CIBAR" - which is precisely the extra tap this
     * change exists to remove.
     */
    @Test public void cibarIsVisibleWithoutAnyoneTappingAnything() throws IOException {
        String layout = layout();
        assertFalse("webLayer 不得預設隱藏", layout.contains("android:visibility=\"gone\""));
        assertTrue("onCreate 就要載入 CIBAR", activity().contains("web.show();"));
    }

    /** Every readout the old panel carried, by the words that were on it. */
    @Test public void noDiagnosticReadoutSurvivesInTheLayout() throws IOException {
        String layout = layout();
        for (String text : new String[] {
                "版本：", "versionCode", "最後手勢", "手勢次數", "原始事件", "模擬掃描",
                "ToF 深度", "亮區", "距離", "RGB Camera", "解析度", "ToF USB", "ToF Manager",
                "ToF State", "ToF Firmware", "Gesture Listener", "ToF trace",
                "開啟左右手勢測試頁", "在 App 內開啟 CIBAR", "掃描診斷模式", "重新連接",
                "返回診斷", "重新載入", "啟動模式"}) {
            assertFalse("診斷 UI 殘留：" + text, layout.contains(text));
        }
    }

    /** The activity holds no diagnostic widget either - the layout and the code agree. */
    @Test public void theActivityBindsNoDiagnosticWidget() throws IOException {
        String activity = activity();
        for (String widget : new String[] {
                "TextView", "Button", "TofHeatmapView", "R.id.buildVersion", "R.id.gestureText",
                "R.id.gestureCount", "R.id.errorText", "R.id.tofTrace", "R.id.usbInventory",
                "R.id.retryButton", "R.id.modeButton", "R.id.simulateScanButton",
                "R.id.webBackButton", "R.id.webReloadButton", "R.id.webStatus",
                "R.id.tofHeatmap"}) {
            assertFalse("MainActivity 仍持有診斷元件：" + widget, activity.contains(widget));
        }
        assertFalse("正式版不得再有模式選擇", activity.contains("setMode"));
    }

    // ------------------------------------------------------------ what still has to happen

    /**
     * The hardware is not a casualty of the UI removal. Camera permission, the camera surface,
     * the ToF module and the gesture bridge all still start - they moved from "what the
     * diagnostics screen did" to "what launching the app does".
     */
    @Test public void theHardwareStillComesUpOnLaunch() throws IOException {
        String activity = activity();
        assertTrue("相機權限", activity.contains("Manifest.permission.CAMERA"));
        assertTrue("相機權限請求", activity.contains("requestPermissions("));
        assertTrue("硬體啟動", activity.contains("hardware.start()"));
        assertTrue("相機 surface 交給 JJSDK",
                activity.contains("hardware.setSurfaceHolder(cameraSurface.getHolder())"));
        assertTrue("眼鏡相機串流接到 WebView",
                activity.contains("web.setCameraStream(hardware.cameraStream())"));
        assertTrue("手勢仍送進 CIBAR", activity.contains("web.onGesture("));
    }

    /**
     * The camera SurfaceView must never be hidden to make room for the page: a SurfaceView that
     * goes GONE destroys its surface, and JJSDK's camera loses the holder it renders into. The
     * page is drawn over it instead, which is why it is the later sibling in the layout.
     */
    @Test public void theCameraSurfaceIsCoveredRatherThanHidden() throws IOException {
        String layout = layout();
        int surface = layout.indexOf("@+id/cameraSurface");
        int web = layout.indexOf("@+id/webLayer");
        assertTrue("webLayer 必須畫在 SurfaceView 之後（蓋住它，而不是藏起它）", surface < web);
        assertTrue("蓋在上面的那一層必須不透明",
                layout.substring(web).contains("android:background=\"#080A0F\""));
    }

    /** Camera + ToF, decided at build time. Nothing asks, and nothing can be asked. */
    @Test public void theStartupModeIsFixedToCameraPlusTof() throws IOException {
        String hardware = read(
                "src/main/java/com/bigxreality/jorjinverifier/JorjinHardwareManager.java");
        assertTrue("相機一定啟動", hardware.contains("startCamera(camera, generation);"));
        assertTrue("ToF 一定啟動", hardware.contains("startTof(tof);"));
        assertFalse("不得再有啟動模式", hardware.contains("StartupMode"));
        assertFalse("不得再有模式切換", hardware.contains("setMode"));
    }

    // ------------------------------------------------------------ the update never blocks

    /**
     * The page starts loading before anything touches the network, and nothing on screen waits for
     * an update.
     *
     * <p>The order in {@code onCreate} is the whole of this guarantee, and it is easy to reverse
     * without noticing: deciding which bundle to serve is local work and belongs before the
     * WebView; checking whether a newer one exists is a network request and belongs after. Swap
     * them and a phone on a dead conference Wi-Fi sits on a black screen for the connect timeout
     * before the experience starts, every single launch.
     */
    @Test public void cibarLoadsBeforeAnythingTouchesTheNetwork() throws IOException {
        String activity = activity();
        int decide = activity.indexOf("ota.openForLaunch()");
        int show = activity.indexOf("web.show();");
        int check = activity.indexOf("ota.checkForUpdateInBackground()");
        assertTrue("必須先決定這次要用哪一份 bundle", decide > 0);
        assertTrue("再載入 CIBAR", show > decide);
        assertTrue("最後才在背景檢查更新", check > show);
    }

    /**
     * There is no "downloading, please wait" screen, and there is nowhere for one to appear.
     *
     * <p>A wearer must never be held at a loading page by an update. The download runs on a
     * background thread and the only thing that ever changes what is on screen because of it is a
     * rollback - which happens when the page failed to load, not when an update succeeded.
     */
    @Test public void thereIsNoUpdateScreen() throws IOException {
        String layout = layout();
        String activity = activity();
        for (String forbidden : new String[] {
                "ProgressBar", "正在下載", "請稍候", "更新中", "downloadProgress"}) {
            assertFalse("正式畫面不得出現更新提示：" + forbidden, layout.contains(forbidden));
            assertFalse("MainActivity 不得出現更新提示：" + forbidden, activity.contains(forbidden));
        }
    }

    /**
     * A bundle that finishes downloading does not reload the page.
     *
     * <p>{@code setBundle} is the only thing that reloads, and the only caller is the rollback
     * path. If the updater could reach it, an update landing three choices into scenario 03 would
     * swap the page underneath the wearer and lose the run.
     */
    @Test public void aFinishedDownloadNeverReloadsTheRunningPage() throws IOException {
        String activity = activity();
        assertTrue("成功的下載只回報結果，不動畫面",
                activity.contains("ota.checkForUpdateInBackground();"));
        assertFalse("更新完成不得呼叫 setBundle", activity.contains("web.setBundle"));

        String updater = read("src/main/java/com/bigxreality/jorjinverifier/ota/OtaUpdater.java")
                .replaceAll("(?s)/\\*.*?\\*/", "")
                .replaceAll("(?m)//.*$", "");
        for (String forbidden : new String[] {"WebView", "reload", "setBundle", "activeVersion ="}) {
            assertFalse("更新流程不得碰畫面或現用版本：" + forbidden, updater.contains(forbidden));
        }
        assertTrue("驗證通過的新版只會被標記成待生效", updater.contains("store.stagePending("));
    }

    /**
     * The rollback is wired to what the WebView actually reports, in both directions: a page that
     * rendered clears the crash counter, a page that failed demotes the bundle that failed.
     */
    @Test public void theRollbackIsWiredToTheRealPageOutcome() throws IOException {
        String activity = activity();
        assertTrue("頁面載出來就確認這一版可用", activity.contains("ota.markLaunchSucceeded()"));
        assertTrue("載入失敗就退回上一版", activity.contains("ota.rollbackAfterFailure(detail)"));
        String web = read("src/main/java/com/bigxreality/jorjinverifier/WebLayerController.java");
        assertTrue("主框架載入失敗要走 rollback", web.contains("if (rollBack("));
        assertTrue("成功載入要回報", web.contains("listener.onPageReady()"));
    }

    /** The engineering pages are gone from the app, not merely unlinked. */
    @Test public void noEngineeringPageIsReachable() throws IOException {
        String web = read("src/main/java/com/bigxreality/jorjinverifier/WebLayerController.java");
        assertFalse("本機手勢測試頁", web.contains("file:///android_asset/gesture-test"));
        assertFalse("掃描診斷模式", web.contains("diagnosticUrl"));
        assertFalse("測試頁 asset 仍在 APK 裡",
                new File(MODULE, "src/main/assets/gesture-test").exists());
    }

    /**
     * The staff mode's 重新啟動並套用更新 is a relaunch of the app, not a swap under the page.
     *
     * <p>Promotion happens in exactly one place - {@code WebBundleStore.openForLaunch()}, called
     * from {@code onCreate} before the WebView is asked for a byte - so a page-level reload would
     * promote nothing and a {@code setBundle} would do to a staff member exactly what the whole
     * staging mechanism exists to stop happening to a wearer.
     *
     * <p>The hardware order is part of the contract and not an incidental detail: the glasses are
     * a shared USB device, and the new activity's {@code onStart} claims the camera and the ToF
     * module before this instance's {@code onStop} would have released them.
     */
    @Test public void applyingAnUpdateRelaunchesTheAppRatherThanSwappingThePage()
            throws IOException {
        String activity = activity();
        int restart = activity.indexOf("public void restartToApplyUpdate()");
        assertTrue("the staff mode must have somewhere to send 重新啟動並套用更新", restart > 0);
        String body = activity.substring(restart);

        assertTrue("it relaunches through the launcher intent",
                body.contains("getLaunchIntentForPackage(getPackageName())"));
        assertTrue("as a cold start, so onCreate promotes the staged bundle",
                body.contains("Intent.FLAG_ACTIVITY_CLEAR_TASK"));
        int release = body.indexOf("hardware.stop();");
        int start = body.indexOf("startActivity(relaunch);");
        assertTrue("the shared USB devices are released first", release > 0 && release < start);
        assertTrue("and this activity goes away", body.indexOf("finish();", start) > start);

        for (String forbidden : new String[] {"web.setBundle", "web.reload", "webView.reload"}) {
            assertFalse("applying an update must not touch the running page: " + forbidden,
                    activity.contains(forbidden));
        }
    }

    /**
     * The update controls are a bridge into the page, and never a native screen.
     *
     * <p>Adding an operator to the update mechanism is the obvious moment to add an Android
     * dialog with a progress bar to go with it. There is nowhere for one to appear - the WebView
     * fills the window - and the staff management mode inside CIBAR is where the controls live,
     * behind an entry a player cannot find. {@link #thereIsNoUpdateScreen()} covers the wording;
     * this covers the shape.
     */
    @Test public void theUpdateControlsAreABridgeAndNotAScreen() throws IOException {
        String activity = activity();
        assertTrue("the page calls in through the bridge",
                activity.contains("new OtaControlBridge(this)"));
        for (String forbidden : new String[] {
                "AlertDialog", "Toast.makeText", "setContentView(R.layout.ota",
                "addContentView", "Dialog("}) {
            assertFalse("the update controls must not draw anything native: " + forbidden,
                    activity.contains(forbidden));
        }
        assertFalse("正式流程不得有任何按鈕", layout().contains("<Button"));
    }
}
