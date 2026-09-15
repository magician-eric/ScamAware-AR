package com.bigxreality.jorjinverifier.ota;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * The list of everything a bundle contains, with a digest per file.
 *
 * <p>Written by {@code webapp/scripts/ota-bundle.mjs}, shipped <em>inside</em> {@code bundle.zip}
 * (so the archive's own digest covers it) and read here after extraction.
 *
 * <h2>Why a digest per file and not one for the tree</h2>
 * The archive digest already proves the download arrived intact. What it cannot prove is that the
 * <em>extraction</em> finished: a phone that runs out of storage half way through unpacking 80 MiB
 * leaves a tree that is structurally fine and materially short - index.html and the JavaScript are
 * there, the last four scenario videos are not. That bundle would load, run, and fail in front of
 * an audience at scenario 04. Checking every file's length and digest is what turns that into a
 * refused update and a staged copy that is deleted before it is ever promoted.
 */
public final class OtaManifest {

    /** One file in the bundle. */
    public static final class Entry {
        public final String path;
        public final long bytes;
        public final String sha256;

        Entry(String path, long bytes, String sha256) {
            this.path = path;
            this.bytes = bytes;
            this.sha256 = sha256;
        }
    }

    public final int schema;
    public final String version;
    public final String commit;
    /** The document the shell loads - {@code index.html}. */
    public final String entry;
    /** {@code MAJOR.MINOR.PATCH} - the lowest APK Shell this bundle will run on. */
    public final String minShellVersion;
    public final long totalBytes;
    public final List<Entry> files;

    private OtaManifest(int schema, String version, String commit, String entry,
                        String minShellVersion, long totalBytes, List<Entry> files) {
        this.schema = schema;
        this.version = version;
        this.commit = commit;
        this.entry = entry;
        this.minShellVersion = minShellVersion;
        this.totalBytes = totalBytes;
        this.files = Collections.unmodifiableList(files);
    }

    /**
     * Parses a manifest, or explains why it is not one.
     *
     * @throws OtaException on anything malformed. Every field is required: a manifest missing its
     *         file list would verify an empty tree as complete, which is precisely the half
     *         updated bundle this class exists to make impossible.
     */
    public static OtaManifest parse(String json) throws OtaException {
        try {
            JSONObject root = new JSONObject(json);
            int schema = root.getInt("schema");
            if (schema != ShellVersion.SCHEMA) {
                throw new OtaException("manifest schema " + schema + " 不是這個 shell 認得的 "
                        + ShellVersion.SCHEMA);
            }
            String version = root.getString("version");
            if (!BundleVersion.isValid(version)) {
                throw new OtaException("manifest 的版本無法比較：" + version);
            }
            String entry = root.getString("entry");
            if (!BundlePaths.isSafeRelativePath(entry)) {
                throw new OtaException("manifest 的進入點不合法：" + entry);
            }
            JSONArray array = root.getJSONArray("files");
            if (array.length() == 0) throw new OtaException("manifest 沒有列出任何檔案");
            List<Entry> files = new ArrayList<>(array.length());
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                String path = item.getString("path");
                if (!BundlePaths.isSafeRelativePath(path)) {
                    throw new OtaException("manifest 列出的路徑會離開 bundle：" + path);
                }
                long bytes = item.getLong("bytes");
                if (bytes < 0) throw new OtaException("manifest 的檔案大小為負數：" + path);
                String sha256 = item.getString("sha256");
                if (sha256.length() != 64) {
                    throw new OtaException("manifest 的 sha256 長度不對：" + path);
                }
                files.add(new Entry(path, bytes, sha256));
            }
            return new OtaManifest(schema, version, root.optString("commit", ""), entry,
                    root.optString("minShellVersion", ShellVersion.UNKNOWN),
                    root.optLong("totalBytes", 0L), files);
        } catch (JSONException malformed) {
            throw new OtaException("manifest 不是合法的 JSON：" + malformed.getMessage(), malformed);
        }
    }

    /** Whether the manifest lists this path at all. */
    public boolean declares(String path) {
        for (Entry file : files) if (file.path.equals(path)) return true;
        return false;
    }

    /** Where this manifest's entry document sits inside an extracted bundle. */
    public File entryFile(File bundleDirectory) {
        return new File(bundleDirectory, entry);
    }
}
