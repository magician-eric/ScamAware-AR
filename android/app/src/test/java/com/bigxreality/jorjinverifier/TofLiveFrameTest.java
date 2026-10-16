package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

/** The staff mode's live 8x8 view: what the sensor sees and what was taken for the hand. */
public class TofLiveFrameTest {
    @Test public void beforeTheFirstFrameThereIsNothingToShow() throws Exception {
        assertEquals(-1, new JSONObject(new TofLiveFrame().toJson(5000L)).getInt("ageMs"));
    }

    @Test public void aFrameIsCentimetresSignalAndTheHandsZones() throws Exception {
        TofLiveFrame live = new TofLiveFrame();
        float[] range = new float[64];
        float[] signal = new float[64];
        range[0] = 304f;
        signal[0] = 41.6f;
        range[9] = 1995f;
        range[10] = Float.NaN;
        long mask = (1L << 0) | (1L << 63);
        live.update(1000L, range, signal, TofHandExtractor.Hand.at(2.5f, 3f, 304f, 2, 41.6f), mask,
                1L << 5, 150f, 400f, 0.0314f, 0.15f, false);

        JSONObject json = new JSONObject(live.toJson(1066L));
        assertEquals(66, json.getInt("ageMs"));
        JSONArray r = json.getJSONArray("range");
        assertEquals(64, r.length());
        assertEquals(30, r.getInt(0));
        assertEquals(200, r.getInt(9));
        assertEquals("沒有讀值的格子是 0", 0, r.getInt(10));
        assertEquals(42, json.getJSONArray("signal").getInt(0));
        JSONArray hand = json.getJSONArray("hand");
        assertEquals(1, hand.getInt(0));
        assertEquals(0, hand.getInt(1));
        assertEquals(1, hand.getInt(63));
        assertTrue(json.getBoolean("handPresent"));
        assertEquals(2.5, json.getDouble("handCol"), 0.001);
        assertEquals(30, json.getInt("handCm"));
        assertEquals(40, json.getInt("maxRangeCm"));
        assertEquals(15, json.getInt("minRangeCm"));
        assertEquals("被遮蔽的雜訊格子", 1, json.getJSONArray("masked").getInt(5));
        assertEquals(0, json.getJSONArray("masked").getInt(0));
        assertEquals(0.031, json.getDouble("noise"), 0.0005);
        assertEquals(0.15, json.getDouble("floor"), 0.001);
        assertTrue("左右方向跟著辨識器", !json.getBoolean("columnIncreasesRight"));
    }

    @Test public void noHandHasNoPosition() throws Exception {
        TofLiveFrame live = new TofLiveFrame();
        live.update(1L, new float[64], null, TofHandExtractor.Hand.NONE, 0L, 0L, 100f, 500f, 0f, 0.08f, true);
        JSONObject json = new JSONObject(live.toJson(1L));
        assertTrue(!json.getBoolean("handPresent"));
        assertTrue(!json.has("handCol"));
        assertEquals(0, json.getJSONArray("signal").getInt(5));
    }
}
