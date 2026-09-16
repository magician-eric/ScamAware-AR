package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * What makes an extracted tree a CIBAR experience rather than a directory of files, and one this
 * shell can actually serve.
 *
 * <p>The manifest proves that every file the publisher listed arrived intact. This proves that the
 * publisher listed the right kinds of file in the first place - that the thing about to become the
 * active bundle can actually run the five scenarios with no network - and that it was compiled
 * against the path this shell mounts it at.
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
 *
 * <h2>The base path assertion</h2>
 * A Vite build writes every asset URL in {@code index.html} as an absolute path under its
 * {@code base}. A bundle built for one base path and mounted under another is not subtly wrong: the
 * document loads, and then every script, stylesheet and image 404s, which the wearer sees as a
 * white screen and the rollback gate does not see at all, because the entry document itself
 * arrived. The account migration made that a real state to be in rather than a hypothetical one -
 * a phone upgraded in place still has the previous base path's bundle in internal storage, and
 * nothing in the manifest describes which path a bundle was compiled for.
 *
 * <p>So the shell reads the entry document and looks for its own prefix. Here, and not from a
 * manifest field, for the reason the file list is here: a manifest is written by the process that
 * wrote the bundle, so a bundle built for the wrong path would declare the wrong path with equal
 * confidence, and a check driven by that declaration would pass.
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

    /**
     * The most an entry document may be before this refuses to read it into memory.
     *
     * <p>Both callers have already checked the entry's length against the manifest before they get
     * here, so this is not the check that catches a truncated file. It is the one that keeps a
     * single bad manifest from turning "read the SPA document" into "read 80 MiB on the main
     * thread at launch". A real {@code index.html} is a couple of kilobytes.
     */
    private static final long MAX_ENTRY_BYTES = 1024 * 1024;

    private BundleRequirements() { }

    /**
     * The string an entry document must contain to have been built for {@code basePath}.
     *
     * <p>The same judgement {@code .github/workflows/build-android.yml} makes with
     * {@code grep -q 'src="<prefix>assets/'} over the {@code index.html} it unpacks from the APK.
     * Java and a shell {@code grep} cannot share code, so {@code BasePathGateContractTest} reads
     * that workflow and fails if the two ever stop agreeing - which is what keeps this a single
     * rule with two enforcement points rather than two rules that happen to match today.
     */
    public static String entryAssetMarker(String basePath) {
        return "src=\"" + basePath + "assets/";
    }

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
     * Checks a manifest's file list, checks that the entry document is really on disk, and checks
     * that the entry document was built for the path this shell serves bundles at.
     *
     * @param basePath the shell's own mount prefix, with both slashes - {@code "/Example/"}. Passed
     *                 in rather than read from a constant so that the {@code ota} package stays
     *                 independent of where the rest of the app decided to mount it, and so a test
     *                 can be a shell with a different one.
     * @throws OtaException naming what is missing. The message goes into diagnostics verbatim, so
     *         it says what a person would have to look for rather than "verification failed".
     */
    public static void assertComplete(OtaManifest manifest, File bundleDirectory, String basePath)
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
        assertBuiltFor(manifest, entry, basePath);
    }

    /**
     * The entry document names this shell's own mount prefix in its asset URLs.
     *
     * <p>Last of the checks, and deliberately so: it reads a file, and everything before it has
     * already established that the file is the one the manifest declared and is the length it
     * said. Running it earlier would mean reading whatever a bad manifest pointed at.
     */
    private static void assertBuiltFor(OtaManifest manifest, File entry, String basePath)
            throws OtaException {
        if (basePath == null || basePath.isEmpty()) {
            // Fail closed. In the app this is a compile-time constant and cannot be empty; if it
            // somehow is, refusing every OTA bundle leaves the phone on the APK's own baseline,
            // which is the one bundle that is guaranteed to match whatever this shell mounts.
            throw new OtaException("這支 shell 沒有說出自己的 base path，"
                    + "無法確認 bundle 是為它建置的");
        }
        long length = entry.length();
        if (length > MAX_ENTRY_BYTES) {
            throw new OtaException("bundle 的進入點 " + manifest.entry + " 大得不像一份 SPA 文件（"
                    + length + " bytes），拒絕讀取");
        }
        String document;
        try {
            document = new String(Files.readAllBytes(entry.toPath()), StandardCharsets.UTF_8);
        } catch (IOException unreadable) {
            throw new OtaException("讀不到 bundle 的進入點 " + manifest.entry + "："
                    + unreadable.getMessage(), unreadable);
        }
        String marker = entryAssetMarker(basePath);
        if (!document.contains(marker)) {
            throw new OtaException("這個 bundle 不是為 " + basePath + " 建置的："
                    + manifest.entry + " 裡找不到 " + marker
                    + "；掛在這支 shell 的路徑下，它每一個 asset 都會 404，"
                    + "畫面是白的而網頁本身載入成功，退版機制看不到這種失敗");
        }
    }

    /** A one-line summary for the log, so a successful verification is as visible as a failure. */
    public static String describe(OtaManifest manifest) {
        return String.format(Locale.ROOT, "%s：%d 個檔案 / %.1f MiB（commit %s）",
                manifest.version, manifest.files.size(), manifest.totalBytes / 1048576.0,
                manifest.commit.isEmpty() ? "—" : manifest.commit);
    }
}
