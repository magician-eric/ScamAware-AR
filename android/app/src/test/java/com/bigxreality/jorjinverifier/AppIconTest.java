package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;

import org.junit.Test;

/**
 * Keeps the phone's launcher icon and the CIBAR PWA's icon from becoming two different pictures.
 *
 * <p>They were two different pictures until now, in the most complete sense: the APK declared no
 * icon at all, so the home screen showed Android's default green robot while the same product in
 * the browser showed the anti-fraud bear. The fix is not "draw the bear for Android too" - that
 * is how a second brand version starts, and a second version drifts. The mipmap bitmaps are
 * <em>copies of the PWA's own PNG files, byte for byte</em>, and this test is what makes that a
 * standing property rather than a one-off: replace the icon on the web side without re-copying
 * it, or re-copy it after a re-export that changed the bytes, and the Android build fails.
 *
 * <p>The rest of the file is about the one thing copying alone cannot get right. A maskable PWA
 * icon and an Android adaptive icon reserve different amounts of their canvas for cropping, so
 * the same PNG dropped straight into an adaptive icon's foreground is drawn too large and a
 * round launcher mask cuts through the artwork. {@link #theInsetKeepsTheArtworkInsideTheMask}
 * measures the artwork and re-derives the inset that avoids it, so a future re-export with wider
 * content fails here instead of arriving cropped on someone's home screen.
 */
public class AppIconTest {
    /** An adaptive icon layer is 108dp square... */
    private static final double LAYER_DP = 108d;
    /** ...of which a launcher mask may show only the middle 72dp; the rest exists to be cropped. */
    private static final double MASK_VIEWPORT_DP = 72d;

    /**
     * Below this the icon stops filling the mask and starts floating in a field of background
     * colour. It is here so that "the mask is clipping the artwork" cannot be answered by
     * shrinking the artwork until the problem goes away.
     */
    private static final double MIN_ARTWORK_DP = 60d;

    private static final File MODULE = findModuleDirectory();

    /** Same reasoning as AppIdentityTest: locate the module once, resolve everything from it. */
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

    private static File resolve(String moduleRelativePath) {
        File file = new File(MODULE, moduleRelativePath);
        assertTrue("找不到檔案：" + file.getAbsolutePath(), file.isFile());
        return file;
    }

    private static String read(String moduleRelativePath) throws IOException {
        return new String(Files.readAllBytes(resolve(moduleRelativePath).toPath()),
                StandardCharsets.UTF_8);
    }

    private static String sha256(String moduleRelativePath) throws IOException {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(Files.readAllBytes(resolve(moduleRelativePath).toPath()));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException impossible) {
            throw new AssertionError(impossible);
        }
    }

    /**
     * The launcher bitmaps are the PWA's files, not copies that merely look like them. Compared
     * by digest rather than by eye, because "looks the same" is exactly the state the two were
     * always going to drift into.
     *
     * <p>Deliberately webapp/public/icons/, not the copy at the repository root: that one is
     * build output, re-published by deploy-pages.yml after a merge, so a PR that changes the
     * icon on both sides at once would be failed by its own guard for not having edited
     * generated files. Same reasoning as AppIdentityTest's reading of the web manifest.
     */
    @Test public void theLauncherBitmapsAreThePwaIconFilesThemselves() throws IOException {
        assertEquals("res/mipmap-xxxhdpi/ic_launcher_maskable.png 必須是 PWA 的 "
                        + "icon-512-maskable.png 的位元組副本（重新匯出 PWA icon 後要一併複製過來）",
                sha256("../../webapp/public/icons/icon-512-maskable.png"),
                sha256("src/main/res/mipmap-xxxhdpi/ic_launcher_maskable.png"));

        assertEquals("res/mipmap-xxxhdpi/ic_launcher.png 必須是 PWA 的 icon-192.png 的位元組副本",
                sha256("../../webapp/public/icons/icon-192.png"),
                sha256("src/main/res/mipmap-xxxhdpi/ic_launcher.png"));
    }

    /**
     * ...and those files are the ones the PWA actually installs with. Copying from a PNG the web
     * manifest no longer references would satisfy the digests above and still leave the phone
     * showing a retired icon.
     */
    @Test public void thePwaManifestStillShipsTheIconsThoseCopiesCameFrom() throws IOException {
        String manifest = read("../../webapp/public/manifest.json");
        assertTrue("PWA manifest 不再提供 icon-192.png：" + manifest,
                manifest.contains("./icons/icon-192.png"));
        assertTrue("PWA manifest 不再提供 icon-512-maskable.png：" + manifest,
                manifest.contains("./icons/icon-512-maskable.png"));
        assertTrue("icon-512-maskable.png 必須仍以 maskable 用途宣告 —— "
                        + "adaptive icon 的前景層假設它自帶滿版背景，可以任意裁切：" + manifest,
                manifest.contains("\"purpose\":\"maskable\""));
    }

    /** Both launcher icons resolve to the adaptive icon, and it is built from the PWA bitmap. */
    @Test public void bothLauncherIconsAreTheAdaptiveIconBuiltFromThePwaArtwork()
            throws IOException {
        String androidManifest = read("src/main/AndroidManifest.xml");
        assertTrue("<application> 必須宣告 android:icon，否則桌面顯示的是 Android 預設圖示",
                androidManifest.contains("android:icon=\"@mipmap/ic_launcher\""));
        assertTrue("圓形圖示的 launcher 需要 android:roundIcon",
                androidManifest.contains("android:roundIcon=\"@mipmap/ic_launcher_round\""));

        for (String name : new String[] {"ic_launcher", "ic_launcher_round"}) {
            String adaptive = read("src/main/res/mipmap-anydpi-v26/" + name + ".xml");
            assertTrue(name + " 必須是 adaptive icon", adaptive.contains("<adaptive-icon"));
            assertTrue(name + " 的背景層必須用 @color/ic_launcher_background",
                    adaptive.contains("android:drawable=\"@color/ic_launcher_background\""));
            assertTrue(name + " 的前景層必須用同一個 @drawable/ic_launcher_foreground，"
                            + "不要各自維護一份視覺",
                    adaptive.contains("android:drawable=\"@drawable/ic_launcher_foreground\""));
        }

        String foreground = read("src/main/res/drawable/ic_launcher_foreground.xml");
        assertTrue("前景層必須引用 PWA 的 maskable 圖，不要引用另一張圖",
                foreground.contains("android:drawable=\"@mipmap/ic_launcher_maskable\""));
    }

    /**
     * The background layer is not a colour anyone picked: it is the colour the artwork's own
     * border already is, so the margin the foreground's inset leaves is indistinguishable from
     * the artwork and a mask that reveals more than 72dp reveals more of the same navy.
     */
    @Test public void theAdaptiveBackgroundIsTheColourTheArtworkEndsIn() throws IOException {
        Png art = artwork();
        int border = art.rgb(0, 0);
        for (int i = 0; i < art.width; i++) {
            assertTrue("maskable 圖的外框不是單一顏色，就不能安全地被 launcher mask 裁切",
                    art.rgb(i, 0) == border
                            && art.rgb(i, art.height - 1) == border
                            && art.rgb(0, i) == border
                            && art.rgb(art.width - 1, i) == border);
        }

        String colors = read("src/main/res/values/colors.xml");
        String expected = String.format("#%06X", border);
        assertTrue("ic_launcher_background 必須等於 maskable 圖外框的顏色 " + expected
                        + "，否則 adaptive icon 的邊緣會出現接縫：" + colors,
                colors.contains("<color name=\"ic_launcher_background\">" + expected + "</color>"));
    }

    /**
     * The one measurement that has to be redone whenever the artwork changes.
     *
     * <p>The badge inside icon-512-maskable.png occupies the middle 71% of its canvas. Drawn
     * full-bleed into a 108dp adaptive layer that is nearly 77dp across - wider than the 72dp a
     * launcher mask is allowed to show - and a round mask cuts through the ANTI-FRAUD line under
     * the bear. The inset in ic_launcher_foreground.xml is what brings it back inside; this
     * asserts the number in that file is still enough for the artwork actually in the tree, and
     * that it has not been over-corrected into a small icon floating in background colour.
     */
    @Test public void theInsetKeepsTheArtworkInsideTheMask() throws IOException {
        String foreground = read("src/main/res/drawable/ic_launcher_foreground.xml");
        Matcher inset = Pattern.compile("android:inset=\"([0-9.]+)%\"").matcher(foreground);
        assertTrue("前景層必須用百分比 inset 來換算 maskable 與 adaptive 的比例差："
                + foreground, inset.find());
        double insetFraction = Double.parseDouble(inset.group(1)) / 100d;

        Png art = artwork();
        double artworkFraction = contentFraction(art);
        double drawnDp = artworkFraction * (1 - 2 * insetFraction) * LAYER_DP;

        assertTrue(String.format(
                        "圖案佔畫布 %.1f%%，inset %.2f%% 之後在 adaptive icon 裡是 %.1fdp，"
                                + "超過 launcher mask 只保證顯示的 %.0fdp —— 圓形 mask 會裁到主要內容。"
                                + "請把 inset 提高到至少 %.2f%%",
                        artworkFraction * 100, insetFraction * 100, drawnDp, MASK_VIEWPORT_DP,
                        (1 - MASK_VIEWPORT_DP / LAYER_DP / artworkFraction) / 2 * 100),
                drawnDp <= MASK_VIEWPORT_DP);

        assertTrue(String.format(
                        "圖案在 adaptive icon 裡只有 %.1fdp，比 %.0fdp 還小 —— "
                                + "圖示會縮成一小塊浮在背景色上。裁切問題不該用縮小圖案來解決",
                        drawnDp, MIN_ARTWORK_DP),
                drawnDp >= MIN_ARTWORK_DP);
    }

    private static Png artwork() throws IOException {
        Png image = Png.decode(Files.readAllBytes(
                resolve("src/main/res/mipmap-xxxhdpi/ic_launcher_maskable.png").toPath()));
        assertEquals("maskable 圖必須是正方形", image.width, image.height);
        return image;
    }

    /**
     * How much of the canvas the artwork occupies: the widest side of the bounding box of every
     * pixel that is not the flat border colour, as a fraction of the canvas. That box is the
     * badge itself - what a mask must not cut into.
     */
    private static double contentFraction(Png art) {
        int border = art.rgb(0, 0);
        int minX = art.width, minY = art.height, maxX = -1, maxY = -1;
        for (int y = 0; y < art.height; y++) {
            for (int x = 0; x < art.width; x++) {
                if (art.rgb(x, y) == border) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        assertTrue("maskable 圖看起來是空的", maxX >= 0);
        return Math.max(maxX - minX + 1, maxY - minY + 1) / (double) art.width;
    }

    /**
     * Just enough PNG to read the artwork's pixels.
     *
     * <p>Written out rather than handed to {@code ImageIO}, because an Android unit test compiles
     * against android.jar: {@code javax.imageio} and {@code java.awt} are not on that classpath
     * even though the test itself runs on a desktop JVM, and the build fails at compile time with
     * "cannot find symbol: ImageIO". {@code java.util.zip.Inflater} is on it, and the rest of PNG
     * - chunk walk, then one of five per-scanline filters to undo - is short enough to be worth
     * more than dropping the measurement this class exists to make.
     *
     * <p>Only what the icon actually is: 8 bits per channel, RGB or RGBA, not interlaced. Anything
     * else fails loudly rather than being decoded wrongly and quietly moving the bounding box.
     */
    private static final class Png {
        final int width;
        final int height;
        private final int bytesPerPixel;
        private final byte[] pixels;

        private Png(int width, int height, int bytesPerPixel, byte[] pixels) {
            this.width = width;
            this.height = height;
            this.bytesPerPixel = bytesPerPixel;
            this.pixels = pixels;
        }

        /** @return 0xRRGGBB; alpha is dropped, the artwork being fully opaque. */
        int rgb(int x, int y) {
            int at = (y * width + x) * bytesPerPixel;
            return ((pixels[at] & 0xFF) << 16)
                    | ((pixels[at + 1] & 0xFF) << 8)
                    | (pixels[at + 2] & 0xFF);
        }

        static Png decode(byte[] file) {
            assertTrue("不是 PNG 檔", file.length > 8
                    && (file[0] & 0xFF) == 0x89 && file[1] == 'P' && file[2] == 'N'
                    && file[3] == 'G');

            int width = 0, height = 0, bytesPerPixel = 0;
            ByteArrayOutputStream compressed = new ByteArrayOutputStream();
            for (int at = 8; at + 8 <= file.length; ) {
                int length = int32(file, at);
                String type = new String(file, at + 4, 4, StandardCharsets.US_ASCII);
                int data = at + 8;
                if ("IHDR".equals(type)) {
                    width = int32(file, data);
                    height = int32(file, data + 4);
                    int bitDepth = file[data + 8] & 0xFF;
                    int colourType = file[data + 9] & 0xFF;
                    int interlace = file[data + 12] & 0xFF;
                    assertEquals("只解得了 8-bit PNG", 8, bitDepth);
                    assertEquals("只解得了非交錯 PNG", 0, interlace);
                    assertTrue("只解得了 RGB / RGBA PNG（colourType=" + colourType + "）",
                            colourType == 2 || colourType == 6);
                    bytesPerPixel = colourType == 2 ? 3 : 4;
                } else if ("IDAT".equals(type)) {
                    compressed.write(file, data, length);
                } else if ("IEND".equals(type)) {
                    break;
                }
                at = data + length + 4;  // ...and past the chunk's CRC.
            }
            assertTrue("PNG 沒有 IHDR", width > 0 && height > 0);

            int stride = width * bytesPerPixel;
            byte[] filtered = inflate(compressed.toByteArray(), height * (stride + 1));
            byte[] pixels = new byte[height * stride];
            for (int y = 0; y < height; y++) {
                int filter = filtered[y * (stride + 1)] & 0xFF;
                int from = y * (stride + 1) + 1;
                int to = y * stride;
                for (int i = 0; i < stride; i++) {
                    // The three neighbours every PNG filter is defined against: left, above,
                    // and above-left. Off the edge of the image they are defined to be zero.
                    int left = i >= bytesPerPixel ? pixels[to + i - bytesPerPixel] & 0xFF : 0;
                    int above = y > 0 ? pixels[to - stride + i] & 0xFF : 0;
                    int aboveLeft = y > 0 && i >= bytesPerPixel
                            ? pixels[to - stride + i - bytesPerPixel] & 0xFF : 0;
                    int value = filtered[from + i] & 0xFF;
                    switch (filter) {
                        case 0: break;
                        case 1: value += left; break;
                        case 2: value += above; break;
                        case 3: value += (left + above) >> 1; break;
                        case 4: value += paeth(left, above, aboveLeft); break;
                        default: throw new AssertionError("未知的 PNG filter：" + filter);
                    }
                    pixels[to + i] = (byte) value;
                }
            }
            return new Png(width, height, bytesPerPixel, pixels);
        }

        private static byte[] inflate(byte[] compressed, int expectedLength) {
            byte[] out = new byte[expectedLength];
            Inflater inflater = new Inflater();
            try {
                inflater.setInput(compressed);
                int written = 0;
                while (written < out.length && !inflater.finished()) {
                    int n = inflater.inflate(out, written, out.length - written);
                    if (n == 0) break;
                    written += n;
                }
                assertEquals("PNG 影像資料長度不符", out.length, written);
            } catch (DataFormatException broken) {
                throw new AssertionError("PNG 影像資料解不開", broken);
            } finally {
                inflater.end();
            }
            return out;
        }

        /** The PNG spec's Paeth predictor: whichever neighbour is nearest their linear estimate. */
        private static int paeth(int left, int above, int aboveLeft) {
            int estimate = left + above - aboveLeft;
            int toLeft = Math.abs(estimate - left);
            int toAbove = Math.abs(estimate - above);
            int toAboveLeft = Math.abs(estimate - aboveLeft);
            if (toLeft <= toAbove && toLeft <= toAboveLeft) return left;
            return toAbove <= toAboveLeft ? above : aboveLeft;
        }

        private static int int32(byte[] bytes, int at) {
            return ((bytes[at] & 0xFF) << 24) | ((bytes[at + 1] & 0xFF) << 16)
                    | ((bytes[at + 2] & 0xFF) << 8) | (bytes[at + 3] & 0xFF);
        }
    }
}
