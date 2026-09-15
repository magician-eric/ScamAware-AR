package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * What makes an extracted tree a CIBAR experience rather than a directory of files.
 *
 * <p>The manifest proves that every file the publisher listed arrived intact. This proves that the
 * publisher listed the right kinds of file in the first place - that the thing about to become the
 * active bundle can actually run the five scenarios with no network.
 *
 * <p>The list lives here, on the phone, and not in the manifest. A manifest is written by the same
 * process that writes the bundle, so a bundle that forgot its videos would ship a manifest that
 * cheerfully declares no videos, and a check driven by that manifest would pass. The shell has to
 * hold its own idea of complete, or it is not checking anything.
 *
 * <p>It mirrors {@code REQUIRED} in {@code webapp/scripts/audit-offline-web-assets.mjs}, which
 * makes the same assertion at build time. Two checks, and deliberately so: the audit fails a
 * publish in CI with a file name and a line number, this one fails an install on a phone that was
 * handed a bundle from somewhere else, or a publish whose audit was skipped.
 */
public final class BundleRequirements {

    /** One thing the bundle must contain, and the words to say when it does not. */
    private static final class Requirement {
        final String what;
        final String description;

        Requirement(String what, String description) {
            this.what = what;
            this.description = description;
        }

        boolean satisfiedBy(String path) {
            switch (what) {
                case "index": return path.equals("index.html");
                case "manifest": return path.equals("manifest.json");
                case "js": return path.startsWith("assets/") && path.endsWith(".js");
                case "css": return path.startsWith("assets/") && path.endsWith(".css");
                case "mind": return path.endsWith(".mind");
                case "mp4": return path.endsWith(".mp4");
                case "mp3": return path.endsWith(".mp3");
                case "image": return path.endsWith(".webp") || path.endsWith(".png");
                default: throw new IllegalStateException(what);
            }
        }
    }

    private static final Requirement[] REQUIRED = {
            new Requirement("index", "SPA 進入點 index.html"),
            new Requirement("manifest", "PWA manifest.json"),
            new Requirement("js", "應用程式 JavaScript（assets/*.js）"),
            new Requirement("css", "應用程式 CSS（assets/*.css）"),
            new Requirement("mind", "圖像辨識 target 資料集（.mind）"),
            new Requirement("mp4", "情境影片（.mp4）"),
            new Requirement("mp3", "情境語音（.mp3）"),
            new Requirement("image", "情境圖片（.webp／.png）"),
    };

    private BundleRequirements() { }

    /**
     * Everything the given set of paths is missing, as human-readable descriptions. Empty means
     * the tree is a complete experience.
     */
    public static List<String> missingFrom(Iterable<String> paths) {
        List<String> missing = new ArrayList<>();
        for (Requirement requirement : REQUIRED) {
            boolean found = false;
            for (String path : paths) {
                if (requirement.satisfiedBy(path)) {
                    found = true;
                    break;
                }
            }
            if (!found) missing.add(requirement.description);
        }
        return missing;
    }

    /**
     * Checks a manifest's file list, and separately checks that the entry document is really on
     * disk.
     *
     * @throws OtaException naming what is missing. The message goes into diagnostics verbatim, so
     *         it says what a person would have to look for rather than "verification failed".
     */
    public static void assertComplete(OtaManifest manifest, File bundleDirectory)
            throws OtaException {
        List<String> paths = new ArrayList<>(manifest.files.size());
        for (OtaManifest.Entry entry : manifest.files) paths.add(entry.path);
        List<String> missing = missingFrom(paths);
        if (!missing.isEmpty()) {
            throw new OtaException("這個 bundle 不是完整的 CIBAR 體驗，缺少："
                    + String.join("、", missing));
        }
        File entry = manifest.entryFile(bundleDirectory);
        if (!entry.isFile()) {
            throw new OtaException("bundle 缺少進入點檔案：" + manifest.entry);
        }
        if (!manifest.declares(manifest.entry)) {
            throw new OtaException("manifest 沒有把自己的進入點 " + manifest.entry + " 列進檔案清單，"
                    + "它的完整性就沒有被驗證過");
        }
    }

    /** A one-line summary for the log, so a successful verification is as visible as a failure. */
    public static String describe(OtaManifest manifest) {
        return String.format(Locale.ROOT, "%s：%d 個檔案 / %.1f MiB（commit %s）",
                manifest.version, manifest.files.size(), manifest.totalBytes / 1048576.0,
                manifest.commit.isEmpty() ? "—" : manifest.commit);
    }
}
