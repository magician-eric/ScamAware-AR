package com.bigxreality.jorjinverifier.ota;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Builds real OTA releases for the tests - a real directory of files, a real ZIP, real SHA-256
 * digests, and a real {@code latest.json}.
 *
 * <p>Nothing here is a mock. The whole value of these tests is that they exercise the same code
 * paths a phone does, over the same artefacts a publish produces; a fake archive that agreed with a
 * fake verifier would prove only that the two agree. What is faked is the <em>content</em>: eight
 * small files with the extensions {@link BundleRequirements} insists on, instead of 80 MiB of
 * scenario video.
 *
 * <p>The shape mirrors {@code webapp/scripts/ota-bundle.mjs} exactly - same manifest fields, same
 * entry name for the manifest inside the archive, same digest of the archive as a whole. Where the
 * two could drift, {@code OtaPublisherContractTest} reads the real publisher's own output.
 *
 * <p>The JSON here is built inside {@code catch (Exception)} rather than {@code catch
 * (JSONException)}, and never with {@code toString(int)}. There are two org.json implementations in
 * play - Android's, where {@code JSONException} is checked and {@code toString(int)} declares it,
 * and the reference build on the unit-test classpath, where it is a {@code RuntimeException} and
 * {@code toString(int)} does not. Code that compiles against one and not the other is a build
 * failure that only appears on whichever side happens not to be run first.
 */
final class TestBundles {

    /**
     * The Shell version these fixtures are published for, and the one the tests run as. A
     * {@code MAJOR.MINOR.PATCH} line, per docs/RELEASE_VERSIONING.md §5 - never a Release ID.
     */
    static final String BASELINE_SHELL = "1.0.0";

    /** A Shell newer than any release the fixtures declare, for the "too old" side of the gate. */
    static final String NEWER_SHELL = "2.0.0";

    /** A complete, minimal CIBAR build: one file for each thing the shell insists on finding. */
    static Map<String, byte[]> completeBuild() {
        Map<String, byte[]> files = new LinkedHashMap<>();
        files.put("index.html",
                bytes("<!doctype html><script type=\"module\" src=\"/ScamAware-AR/assets/app.js\"></script>"));
        files.put("manifest.json", bytes("{\"name\":\"反詐AR體驗\"}"));
        files.put("assets/app.js", bytes("export const app = 1;\n"));
        files.put("assets/app.css", bytes("body{margin:0}\n"));
        files.put("assets/targets.mind", filler(2048, (byte) 0x11));
        files.put("assets/scenarios/clip.mp4", filler(65536, (byte) 0x22));
        files.put("assets/scenarios/voice.mp3", filler(4096, (byte) 0x33));
        files.put("assets/scenarios/card.webp", filler(1024, (byte) 0x44));
        // The opening film's drop folder travels in the bundle like anything else under public/.
        files.put("media/stings/outro.mp4", filler(32768, (byte) 0x55));
        return files;
    }

    /** One published release: the extracted tree, the archive, its digest and its manifest. */
    static final class Release {
        final String version;
        final File archive;
        final String sha256;
        final String manifestJson;
        final Map<String, byte[]> files;

        Release(String version, File archive, String sha256, String manifestJson,
                Map<String, byte[]> files) {
            this.version = version;
            this.archive = archive;
            this.sha256 = sha256;
            this.manifestJson = manifestJson;
            this.files = files;
        }

        /** {@code latest.json} as the publisher writes it, pointing at wherever this is served. */
        String latestJson(String bundleUrl) {
            return latestJson(bundleUrl, BASELINE_SHELL);
        }

        String latestJson(String bundleUrl, String minShellVersion) {
            try {
                JSONObject root = new JSONObject();
                root.put("schema", ShellVersion.SCHEMA);
                // Release ID and its semantic half travel side by side, exactly as
                // .github/workflows/ota-release.yml writes them.
                root.put("releaseId", version);
                root.put("version", BundleVersion.productVersionOf(version));
                root.put("releaseDate", isoDateOf(version));
                root.put("sequence", BundleVersion.releaseSequenceOf(version));
                root.put("url", bundleUrl);
                root.put("sha256", sha256);
                root.put("sizeBytes", archive.length());
                root.put("minShellVersion", minShellVersion);
                root.put("gitCommit", "0123456789abcdef0123456789abcdef01234567");
                root.put("entry", "index.html");
                root.put("fileCount", files.size());
                root.put("publishedAt", "2026-08-25T14:35:12Z");
                return root.toString();
            } catch (Exception impossible) {
                throw new IllegalStateException("could not build latest.json", impossible);
            }
        }
    }

    /** Publishes {@link #completeBuild()} under a version. */
    static Release publish(File into, String version) throws IOException {
        return publish(into, version, completeBuild(), BASELINE_SHELL);
    }

    static Release publish(File into, String version, Map<String, byte[]> files,
                           String minShellVersion) throws IOException {
        String manifestJson = manifestFor(version, files, minShellVersion);
        Map<String, byte[]> archived = new LinkedHashMap<>(files);
        archived.put(WebBundleStore.MANIFEST_ENTRY, bytes(manifestJson));

        //noinspection ResultOfMethodCallIgnored
        into.mkdirs();
        File archive = new File(into, "bundle-" + version + ".zip");
        try (ZipOutputStream zip = new ZipOutputStream(new FileOutputStream(archive))) {
            for (Map.Entry<String, byte[]> file : archived.entrySet()) {
                ZipEntry entry = new ZipEntry(file.getKey());
                // A fixed time, exactly as the real publisher does it, so two runs of a test that
                // compares digests compare the same bytes.
                entry.setTime(0L);
                zip.putNextEntry(entry);
                zip.write(file.getValue());
                zip.closeEntry();
            }
        }
        return new Release(version, archive, Digests.of(archive), manifestJson, files);
    }

    /** The manifest the publisher writes: every file, its length and its digest. */
    static String manifestFor(String version, Map<String, byte[]> files,
                              String minShellVersion) {
        try {
            JSONArray entries = new JSONArray();
            long total = 0;
            List<String> paths = new ArrayList<>(files.keySet());
            java.util.Collections.sort(paths);
            for (String path : paths) {
                byte[] body = files.get(path);
                total += body.length;
                JSONObject entry = new JSONObject();
                entry.put("path", path);
                entry.put("bytes", body.length);
                entry.put("sha256", sha256Of(body));
                entries.put(entry);
            }
            JSONObject root = new JSONObject();
            root.put("schema", ShellVersion.SCHEMA);
            root.put("version", version);
            root.put("commit", "0123456789abcdef0123456789abcdef01234567");
            root.put("entry", "index.html");
            root.put("minShellVersion", minShellVersion);
            root.put("fileCount", files.size());
            root.put("totalBytes", total);
            root.put("files", entries);
            return root.toString();
        } catch (Exception impossible) {
            throw new IllegalStateException("could not build a test manifest", impossible);
        }
    }

    /** Writes a build straight into a directory, as though it had already been installed. */
    static void writeTree(File root, Map<String, byte[]> files, String manifestJson)
            throws IOException {
        Map<String, byte[]> all = new LinkedHashMap<>(files);
        all.put(WebBundleStore.MANIFEST_ENTRY, bytes(manifestJson));
        for (Map.Entry<String, byte[]> file : all.entrySet()) {
            File target = new File(root, file.getKey());
            //noinspection ResultOfMethodCallIgnored
            target.getParentFile().mkdirs();
            Files.write(target.toPath(), file.getValue());
        }
    }

    /** An installed, verified bundle sitting in the store, as a previous session would have left it. */
    static void install(WebBundleStore store, String version) throws IOException {
        install(store, version, completeBuild(), BASELINE_SHELL);
    }

    static void install(WebBundleStore store, String version, Map<String, byte[]> files,
                        String minShellVersion) throws IOException {
        File directory = store.versionDirectory(version);
        WebBundleStore.deleteRecursively(directory);
        //noinspection ResultOfMethodCallIgnored
        directory.mkdirs();
        writeTree(directory, files, manifestFor(version, files, minShellVersion));
    }

    /** {@code 20260825} out of a Release ID, as the {@code YYYY-MM-DD} latest.json carries. */
    static String isoDateOf(String version) {
        String compact = BundleVersion.releaseDateOf(version);
        return compact.substring(0, 4) + "-" + compact.substring(4, 6) + "-" + compact.substring(6);
    }

    static String sha256Of(byte[] body) {
        return Digests.hex(Digests.sha256().digest(body));
    }

    static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    static byte[] filler(int length, byte value) {
        byte[] body = new byte[length];
        java.util.Arrays.fill(body, value);
        return body;
    }

    /** Copies a file, so a test can corrupt one copy and leave the original alone. */
    static File copy(File source, File target) throws IOException {
        try (OutputStream out = new FileOutputStream(target)) {
            out.write(Files.readAllBytes(source.toPath()));
        }
        return target;
    }

    private TestBundles() { }
}
