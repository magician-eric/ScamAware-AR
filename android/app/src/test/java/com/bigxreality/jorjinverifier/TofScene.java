package com.bigxreality.jorjinverifier;

/**
 * A synthetic scene in front of the glasses, rendered into the frames the VL53L5CX would report:
 * 64 distances and 64 signal rates.
 *
 * <p>Rendered the way the sensor actually sees, because the recogniser's rules are only worth
 * pinning against something physical:
 * <ul>
 *   <li>one zone is {@code 0.1036 * d} wide (45 degrees over 8 zones), so a hand covers many
 *       zones close up and a handful at arm's length;</li>
 *   <li>a zone the hand only partly covers reports the hand once it covers a fifth of it, with
 *       its signal scaled by how much it covers;</li>
 *   <li>signal falls with the square of distance.</li>
 * </ul>
 * Zone {@code i} is row {@code i / 8}, column {@code i % 8}; its centre is at that column and row.
 */
final class TofScene {
    static final int GRID = TofHandExtractor.GRID;
    static final int ZONES = TofHandExtractor.ZONES;
    /** 15 frames a second, the rate the module streams at. */
    static final long FRAME_MS = 66L;
    static final float HAND_WIDTH_MM = 90f;
    static final float HAND_HEIGHT_MM = 190f;

    final float[] backgroundRange = new float[ZONES];
    final float[] backgroundSignal = new float[ZONES];

    private boolean hand;
    private float handCol, handRow, handRangeMm, handWidth, handHeight;

    static float zoneWidthMm(float rangeMm) {
        return 0.1036f * rangeMm;
    }

    /** Return strength of a fully covered zone at this distance (arbitrary but physical units). */
    static float signalAt(float rangeMm) {
        return 4.0e6f / (rangeMm * rangeMm);
    }

    /** Everything the sensor sees at one distance - a wall, a door, a person filling the view. */
    TofScene wall(float rangeMm) {
        return block(0, GRID - 1, 0, GRID - 1, rangeMm);
    }

    /** A static object covering these rows and columns (inclusive). */
    TofScene block(int fromRow, int toRow, int fromCol, int toCol, float rangeMm) {
        for (int r = fromRow; r <= toRow; r++) {
            for (int c = fromCol; c <= toCol; c++) {
                backgroundRange[r * GRID + c] = rangeMm;
                backgroundSignal[r * GRID + c] = rangeMm > 0f ? 0.5f * signalAt(rangeMm) : 0f;
            }
        }
        return this;
    }

    TofScene clearBackground() {
        java.util.Arrays.fill(backgroundRange, 0f);
        java.util.Arrays.fill(backgroundSignal, 0f);
        return this;
    }

    /** A hand of real size at this distance, centred on (col, row) in zone units. */
    TofScene handAt(float col, float row, float rangeMm) {
        return handAt(col, row, rangeMm,
                HAND_WIDTH_MM / zoneWidthMm(rangeMm), HAND_HEIGHT_MM / zoneWidthMm(rangeMm));
    }

    /** A hand-like object of explicit size, in zones. */
    TofScene handAt(float col, float row, float rangeMm, float widthZones, float heightZones) {
        hand = true;
        handCol = col;
        handRow = row;
        handRangeMm = rangeMm;
        handWidth = widthZones;
        handHeight = heightZones;
        return this;
    }

    TofScene noHand() {
        hand = false;
        return this;
    }

    float[] range() {
        return render(true);
    }

    float[] signal() {
        return render(false);
    }

    private float[] render(boolean wantRange) {
        float[] out = new float[ZONES];
        for (int i = 0; i < ZONES; i++) {
            int r = i / GRID, c = i % GRID;
            float cover = hand ? overlap(c - 0.5f, c + 0.5f, handCol - handWidth / 2, handCol + handWidth / 2)
                    * overlap(r - 0.5f, r + 0.5f, handRow - handHeight / 2, handRow + handHeight / 2) : 0f;
            if (cover >= 0.2f) {
                out[i] = wantRange ? handRangeMm : signalAt(handRangeMm) * cover;
            } else {
                out[i] = wantRange ? backgroundRange[i] : backgroundSignal[i];
            }
        }
        return out;
    }

    private static float overlap(float a0, float a1, float b0, float b1) {
        return Math.max(0f, Math.min(a1, b1) - Math.max(a0, b0));
    }

    /** Whether the hand, as placed, is visible to the sensor at all. */
    boolean handVisible() {
        float[] range = range();
        for (int i = 0; i < ZONES; i++) {
            if (hand && range[i] == handRangeMm) return true;
        }
        return false;
    }
}
