package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Turns a downloaded {@code bundle.zip} into a verified directory tree - or into nothing at all.
 *
 * <p>Everything here happens inside {@code staging/}. The active bundle is not read, not written
 * and not referenced; a failure at any step leaves the wearer's session exactly as it was, and the
 * only cost is a deleted temporary directory. That is the whole reason the work is split this way:
 * an installer that unpacked over the running bundle could not fail safely no matter how carefully
 * it checked afterwards.
 *
 * <h2>The order of the checks, and why it is that order</h2>
 * <ol>
 *   <li><b>Digest of the archive.</b> Before a single byte is unpacked. A truncated download, a
 *       captive portal's HTML, or a proxy that re-encoded the response all die here, for the cost
 *       of one pass over a file that is already on disk.</li>
 *   <li><b>Unpack, refusing unsafe entry names.</b> A ZIP entry named {@code ../../databases/x} is
 *       a legal archive entry and a file write outside the sandbox; the name is rejected rather
 *       than resolved-then-checked.</li>
 *   <li><b>The manifest inside the archive.</b> Its version has to be the version we were told to
 *       expect, so a stale or swapped archive cannot be installed under a newer number.</li>
 *   <li><b>Every file's length and digest.</b> This is what proves the <em>extraction</em>
 *       finished. An archive can be perfectly intact and still unpack short when the phone runs
 *       out of storage half way through 80 MiB.</li>
 *   <li><b>The shape of a CIBAR build.</b> {@link BundleRequirements} - videos, audio, image
 *       targets, JavaScript, CSS. A bundle that unpacked completely and is missing its videos is
 *       complete by its own manifest and useless on a phone with no network.</li>
 *   <li><b>The base path it was compiled for.</b> Also {@link BundleRequirements}, and the reason
 *       a bundle can be perfect by every check above and still be unservable: its asset URLs are
 *       absolute under the {@code base} it was built with, so mounted anywhere else the page comes
 *       up and nothing on it does. Refused here means it never becomes pending, and the phone is
 *       never in the position of discovering it at launch.</li>
 * </ol>
 */
public final class BundleInstaller {

    /** 64 KiB copy buffer - the same one for 800-byte HTML and 20 MiB video. */
    private static final int CHUNK = 64 * 1024;

    /**
     * The most an archive may expand to. The real bundle is under 100 MiB; this is not a size
     * limit for the product, it is the thing that stops a hostile or corrupt archive from filling
     * the phone's storage before any digest gets a chance to reject it.
     */
    private static final long MAX_UNPACKED_BYTES = 512L * 1024 * 1024;

    private BundleInstaller() { }

    /**
     * Verifies an archive and unpacks it into {@code unpackDirectory}, which is wiped first.
     *
     * @return the manifest of the bundle now sitting in {@code unpackDirectory}.
     * @throws OtaException with a message naming what was wrong. The caller deletes the tree and
     *         records the message; the active bundle is never involved.
     */
    public static OtaManifest unpackAndVerify(File archive, String expectedSha256,
                                              String expectedVersion, File unpackDirectory,
                                              String shellVersion, String basePath, OtaLog log)
            throws OtaException {
        OtaLog logger = log == null ? OtaLog.NONE : log;
        try {
            String actual = Digests.of(archive);
            if (!Digests.matches(expectedSha256, actual)) {
                throw new OtaException("bundle.zip 的 SHA-256 不符：預期 " + expectedSha256
                        + "，實際 " + actual + "（檔案 " + archive.length() + " bytes）");
            }
        } catch (IOException unreadable) {
            throw new OtaException("讀不到剛下載的 bundle.zip：" + unreadable.getMessage(), unreadable);
        }
        logger.line("OTA：bundle.zip SHA-256 驗證通過（" + archive.length() + " bytes）");

        WebBundleStore.deleteRecursively(unpackDirectory);
        if (!unpackDirectory.mkdirs()) {
            throw new OtaException("無法建立解壓縮目錄：" + unpackDirectory);
        }
        int entries = unpack(archive, unpackDirectory);
        logger.line("OTA：解壓縮完成，" + entries + " 個項目");

        File manifestFile = new File(unpackDirectory, WebBundleStore.MANIFEST_ENTRY);
        if (!manifestFile.isFile()) {
            throw new OtaException("bundle 內沒有 " + WebBundleStore.MANIFEST_ENTRY
                    + "，無法驗證它是不是完整的");
        }
        OtaManifest manifest;
        try {
            manifest = OtaManifest.parse(new String(Files.readAllBytes(manifestFile.toPath()),
                    StandardCharsets.UTF_8));
        } catch (IOException unreadable) {
            throw new OtaException("讀不到 bundle 內的 manifest：" + unreadable.getMessage(),
                    unreadable);
        }
        if (expectedVersion != null && !expectedVersion.equals(manifest.version)) {
            throw new OtaException("bundle 自稱是 " + manifest.version + "，但 latest.json 說是 "
                    + expectedVersion);
        }
        if (!SemanticVersion.satisfies(shellVersion, manifest.minShellVersion)) {
            throw new OtaException("bundle " + manifest.version + " 需要 Shell "
                    + manifest.minShellVersion + "，這支 APK 是 " + shellVersion);
        }

        verifyFiles(manifest, unpackDirectory);
        BundleRequirements.assertComplete(manifest, unpackDirectory, basePath);
        logger.line("OTA：內容驗證通過 " + BundleRequirements.describe(manifest));
        return manifest;
    }

    /** Streams the archive out, one entry at a time, refusing any name that could escape. */
    private static int unpack(File archive, File into) throws OtaException {
        long written = 0;
        int entries = 0;
        try (ZipInputStream zip = new ZipInputStream(new FileInputStream(archive))) {
            for (ZipEntry entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                String name = entry.getName();
                if (entry.isDirectory()) {
                    // Directories are implied by the files inside them; an explicit entry adds
                    // nothing and is one more name to have to validate.
                    zip.closeEntry();
                    continue;
                }
                if (!BundlePaths.isSafeRelativePath(name)) {
                    throw new OtaException("bundle 內有不合法的路徑，拒絕安裝：" + name);
                }
                File target = new File(into, name);
                File parent = target.getParentFile();
                if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
                    throw new OtaException("無法建立目錄：" + parent);
                }
                try (OutputStream out = new FileOutputStream(target)) {
                    byte[] buffer = new byte[CHUNK];
                    for (int read = zip.read(buffer); read >= 0; read = zip.read(buffer)) {
                        written += read;
                        if (written > MAX_UNPACKED_BYTES) {
                            throw new OtaException("bundle 解壓縮後超過 "
                                    + (MAX_UNPACKED_BYTES / 1048576) + " MiB，拒絕安裝");
                        }
                        out.write(buffer, 0, read);
                    }
                }
                zip.closeEntry();
                entries++;
            }
        } catch (IOException broken) {
            throw new OtaException("bundle.zip 解壓縮失敗（檔案可能損毀）：" + broken.getMessage(),
                    broken);
        }
        if (entries == 0) throw new OtaException("bundle.zip 裡沒有任何檔案");
        return entries;
    }

    /** Length first, then digest - a length mismatch names the problem without hashing 80 MiB. */
    private static void verifyFiles(OtaManifest manifest, File root) throws OtaException {
        for (OtaManifest.Entry entry : manifest.files) {
            File file = new File(root, entry.path);
            if (!file.isFile()) {
                throw new OtaException("解壓縮後缺少 manifest 列出的檔案：" + entry.path);
            }
            if (file.length() != entry.bytes) {
                throw new OtaException(entry.path + " 長度不對：" + file.length() + " ≠ "
                        + entry.bytes + "（解壓縮可能因為儲存空間不足而中斷）");
            }
        }
        for (OtaManifest.Entry entry : manifest.files) {
            File file = new File(root, entry.path);
            String actual;
            try (InputStream in = new FileInputStream(file)) {
                actual = Digests.of(in);
            } catch (IOException unreadable) {
                throw new OtaException("讀不到解壓縮出來的 " + entry.path + "："
                        + unreadable.getMessage(), unreadable);
            }
            if (!Digests.matches(entry.sha256, actual)) {
                throw new OtaException(entry.path + " 的 SHA-256 不符：預期 " + entry.sha256
                        + "，實際 " + actual);
            }
        }
    }
}
