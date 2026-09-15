package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import org.junit.Test;

/**
 * CIBAR's videos play <em>inside</em> the page, and the shell is why.
 *
 * <p>Every video in this app is a scenario's own - a fake ad, a "teacher" pitch, a dating video.
 * They are part of a screen: the page draws its own chrome over them, and CIBAR's one unmarked
 * control (three taps in the screen's top-right corner, which skips the opening - see
 * {@code webapp/src/pages/opening/openingStaffExit.js}) is an HTML element that has to be able to
 * be on top of whatever is underneath it. An HTML element can only be on top of a video for as
 * long as the video is drawn by the page.
 *
 * <p>A {@code <video>} that goes to a native fullscreen layer is not drawn by the page. WebView
 * hands the element to the host app through {@link android.webkit.WebChromeClient#onShowCustomView}
 * and the host adds it to the activity's own view hierarchy, above the WebView entirely - at which
 * point every hit test in the document happens underneath it and no HTML control can be touched at
 * all. Picture-in-picture is the same shape of problem in a smaller window.
 *
 * <p>The pages close their half ({@code playsInline}, no {@code controls}). This test closes the
 * shell's half, which is stronger and needs no cooperation from the page: {@link
 * WebLayerController}'s {@code WebChromeClient} implements no {@code onShowCustomView} at all, and
 * {@code WebChromeClient}'s own default implementation does nothing, so a fullscreen request from
 * ANY page in this WebView - a scenario video, or something a future OTA bundle introduces - has
 * nowhere to go and the element stays where it was drawn.
 *
 * <p>Adding the override back is a two-line change that looks like an improvement ("videos can go
 * fullscreen now") and breaks a scenario's own chrome on a phone, where nobody can attach a
 * debugger to find out why. Hence a test rather than a comment.
 */
public class ScenarioVideoInlinePlaybackTest {

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

    /**
     * The web layer's source with its comments removed - this class's own reasoning names the very
     * method it forbids, and so does the source's, and matching a comment would fail the build for
     * the documentation of the rule.
     */
    private static String webLayerSource() throws IOException {
        File file = new File(MODULE, "src/main/java/com/bigxreality/jorjinverifier/WebLayerController.java");
        assertTrue("找不到檔案：" + file.getAbsolutePath(), file.isFile());
        String source = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
        return source.replaceAll("(?s)/\\*.*?\\*/", " ").replaceAll("(?m)//[^\n]*", " ");
    }

    @Test public void theWebViewCannotHandAVideoToANativeFullscreenLayer() throws IOException {
        String source = webLayerSource();
        assertFalse("WebChromeClient 一旦實作 onShowCustomView，影片就會被交給 WebView 之上的原生圖層，"
                        + "頁面畫在影片上的任何 UI（包含右上角那塊隱藏觸控區）就永遠收不到觸控",
                source.contains("onShowCustomView"));
        assertFalse("onHideCustomView 只在有 onShowCustomView 時才有意義；出現它就代表全螢幕路徑被加回來了",
                source.contains("onHideCustomView"));
        assertFalse("getVideoLoadingProgressView 是原生全螢幕播放器的一部分",
                source.contains("getVideoLoadingProgressView"));
    }

    @Test public void thePageStillGetsToPlayWithoutBeingAskedForAGesture() throws IOException {
        // The other half of inline playback: a scenario's video has to actually start on its
        // own. Without this the element sits on its first frame until somebody touches the
        // screen, and the screen it is part of never gets going.
        assertTrue("情境影片都是自動播放，WebView 預設會要求使用者手勢",
                webLayerSource().contains("setMediaPlaybackRequiresUserGesture(false)"));
    }
}
