package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** The staff mode's gesture tools as the page sees them. */
public class StaffToolsBridgeTest {
    @Test public void theScriptWrapsTheNativeObject() {
        String script = StaffToolsBridge.installScript();
        assertTrue(script.contains("window.__cibarStaffToolsNative"));
        assertTrue(script.contains("window.__cibarStaffTools={"));
        assertTrue(script.contains("n.getGestureSettings()"));
        assertTrue(script.contains("n.setGestureSettings(Number(s.maxRangeCm)||0,String(s.signalMode||''))"));
        assertTrue(script.contains("n.liveFrame()"));
        assertTrue(script.contains("n.shareTofLog()"));
        assertTrue(script.contains("cibarStaffToolsReady"));
    }

    @Test public void theExportOutcomeIsAnEvent() {
        String ok = StaffToolsBridge.exportResultScript(true, "cibar-tof-a.txt", 1234L, null);
        assertTrue(ok, ok.contains("\"cibarTofLogExport\""));
        assertTrue(ok, ok.contains("{ok:true,name:\"cibar-tof-a.txt\",bytes:1234}"));
        String empty = StaffToolsBridge.exportResultScript(false, null, 0L, "empty");
        assertTrue(empty, empty.contains("{ok:false,reason:\"empty\"}"));
        assertFalse(empty.contains("bytes"));
    }

    @Test public void eachCallGoesToTheHost() {
        StringBuilder calls = new StringBuilder();
        StaffToolsBridge bridge = new StaffToolsBridge(new StaffToolsBridge.Host() {
            @Override public String gestureSettingsJson() { calls.append("get;"); return "{}"; }

            @Override public String applyGestureSettings(int maxRangeCm, String signalMode) {
                calls.append("set ").append(maxRangeCm).append(' ').append(signalMode).append(';');
                return "{}";
            }

            @Override public String liveFrameJson() { calls.append("live;"); return "{}"; }

            @Override public void shareTofLog() { calls.append("share;"); }
        });
        bridge.getGestureSettings();
        bridge.setGestureSettings(40, "STRICT");
        bridge.liveFrame();
        bridge.shareTofLog();
        assertEquals("get;set 40 STRICT;live;share;", calls.toString());
    }
}
