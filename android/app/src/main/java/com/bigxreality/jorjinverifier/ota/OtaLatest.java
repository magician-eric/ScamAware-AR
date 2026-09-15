package com.bigxreality.jorjinverifier.ota;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * {@code ota/latest.json} - the one file the phone fetches on a routine update check, and the only
 * input to this whole mechanism that did not come out of the APK.
 *
 * <p>The schema is the release manifest {@code .github/workflows/ota-release.yml} writes, described
 * in {@code docs/RELEASE_VERSIONING.md} §10. The same document is published three times over: as
 * {@code release/ota/releases/<Release ID>.json} in the repository, as an asset on the GitHub
 * Release, and as {@code ota/latest.json} on the site - which is the copy this reads.
 *
 * <pre>
 * { "releaseId": "1.0.0-20260825.001", "version": "1.0.0", "releaseDate": "2026-08-25",
 *   "sequence": 1, "gitCommit": "…", "sourcePR": 371, "sha256": "…", "sizeBytes": 81401645,
 *   "minShellVersion": "1.0.0", "url": "https://github.com/…/cibar-web-1.0.0-20260825.001.zip" }
 * </pre>
 *
 * <h2>Why the parsing is strict</h2>
 * A phone on a captive-portal Wi-Fi does not get a connection error when it asks for this file: it
 * gets HTTP 200 and a login page. So does a phone behind a proxy that rewrites unknown hosts.
 * Insisting on a JSON object with a Release ID in the exact published format, an https URL and a
 * 64 character digest turns every one of those into "the update server said something I do not
 * understand" - a diagnosable line in the log and no change to the running experience - rather
 * than a download of an HTML error page that fails its digest check several minutes later.
 */
public final class OtaLatest {

    /** The full Release ID, e.g. {@code 1.0.0-20260825.001}. */
    public final String releaseId;
    /** The semantic half, as the publisher wrote it down. */
    public final String version;
    public final String bundleUrl;
    public final String sha256;
    public final long sizeBytes;
    /** {@code MAJOR.MINOR.PATCH} - the lowest APK Shell this release will run on. */
    public final String minShellVersion;
    public final String gitCommit;
    public final String releaseDate;

    private OtaLatest(String releaseId, String version, String bundleUrl, String sha256,
                      long sizeBytes, String minShellVersion, String gitCommit,
                      String releaseDate) {
        this.releaseId = releaseId;
        this.version = version;
        this.bundleUrl = bundleUrl;
        this.sha256 = sha256;
        this.sizeBytes = sizeBytes;
        this.minShellVersion = minShellVersion;
        this.gitCommit = gitCommit;
        this.releaseDate = releaseDate;
    }

    public static OtaLatest parse(String json) throws OtaException {
        if (json == null || json.trim().isEmpty()) {
            throw new OtaException("更新伺服器沒有回應內容");
        }
        try {
            JSONObject root = new JSONObject(json);
            // The published file carries no schema field today; when a future publisher adds one,
            // a shell that does not recognise it must refuse rather than guess at the fields it
            // does recognise. Absent means "the schema this shell was written for".
            int schema = root.optInt("schema", ShellVersion.SCHEMA);
            if (schema != ShellVersion.SCHEMA) {
                throw new OtaException("latest.json 的 schema " + schema + " 不是這個 shell 認得的 "
                        + ShellVersion.SCHEMA);
            }
            String releaseId = root.getString("releaseId");
            if (!BundleVersion.isPublishedFormat(releaseId)) {
                throw new OtaException("latest.json 的 releaseId 不是發布格式：" + releaseId);
            }
            // The semantic half travels separately, and must agree with the Release ID beside it -
            // otherwise one of the two is describing a different release and there is no way to
            // tell which.
            String version = root.optString("version", BundleVersion.productVersionOf(releaseId));
            if (!version.equals(BundleVersion.productVersionOf(releaseId))) {
                throw new OtaException("latest.json 的 version（" + version + "）與 releaseId（"
                        + releaseId + "）不一致");
            }
            String bundleUrl = root.getString("url");
            // https only. The bundle is verified by digest either way, so this is not what makes
            // the update safe - it keeps a downgraded or intercepted request from being attempted
            // at all, by an app that otherwise never speaks plain http.
            if (!bundleUrl.startsWith("https://")) {
                throw new OtaException("latest.json 的 url 不是 https：" + bundleUrl);
            }
            String sha256 = root.getString("sha256");
            if (sha256.length() != 64) {
                throw new OtaException("latest.json 的 sha256 長度不對：" + sha256);
            }
            long sizeBytes = root.optLong("sizeBytes", 0L);
            if (sizeBytes < 0) throw new OtaException("latest.json 的 sizeBytes 為負數");
            String minShellVersion = root.optString("minShellVersion", ShellVersion.UNKNOWN);
            if (!SemanticVersion.isValid(minShellVersion)) {
                throw new OtaException("latest.json 的 minShellVersion 不是 x.y.z："
                        + minShellVersion);
            }
            return new OtaLatest(releaseId, version, bundleUrl, sha256, sizeBytes, minShellVersion,
                    root.optString("gitCommit", ""), root.optString("releaseDate", ""));
        } catch (JSONException malformed) {
            throw new OtaException("latest.json 不是合法的 JSON（可能連到了登入頁或代理伺服器）："
                    + malformed.getMessage(), malformed);
        }
    }
}
