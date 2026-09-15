package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import org.junit.Test;

/**
 * Pins what a tester uses to tell one APK from another: the name on the phone's home screen, the
 * version the APK declares, the certificate it is signed with - and, now, that there is only one
 * APK to tell apart at all.
 *
 * <p>None of it is reachable from Java, so none of it can break the compiler. It breaks an
 * on-device session instead, which costs a build round-trip and a person holding the glasses. The
 * failures guarded here all actually happened:
 *
 * <ul>
 *   <li>The launcher label said 佐臻 AR 硬體驗證 while the same product called itself 反詐AR體驗
 *       in the browser, so the icon on the phone did not look like the app under test.</li>
 *   <li>Two consecutive releases shipped the same versionName, and there was no way to tell from
 *       the phone which of them was installed.</li>
 *   <li>The signing key was generated per machine, so every CI build produced a new certificate
 *       and installing over the previous build failed with INSTALL_FAILED_UPDATE_INCOMPATIBLE.</li>
 *   <li>Two APKs sat on one phone with names that differed by one character, and the wrong one
 *       was opened in front of an audience with the network off.</li>
 * </ul>
 */
public class AppIdentityTest {
    /**
     * CIBAR's official Chinese name, exactly as the PWA manifest spells it - no space, because
     * that manifest has no space. {@link #theLauncherLabelMatchesTheOfficialPwaName} reads the
     * manifest rather than trusting this constant, so a rename on the web side surfaces here.
     */
    private static final String APP_NAME = "反詐AR體驗";

    /**
     * Gradle runs unit tests with the module directory (android/app) as the working directory,
     * but a hand-rolled runner can be started from android/ or from the repository root. Rather
     * than trying each prefix per path - which silently picks the wrong file, because
     * {@code build.gradle} exists in both android/ and android/app/ - the module directory is
     * located once, by the manifest that only it has, and every path is resolved against it.
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

    private static File resolve(String moduleRelativePath) {
        return new File(MODULE, moduleRelativePath);
    }

    private static String read(String moduleRelativePath) throws IOException {
        File file = resolve(moduleRelativePath);
        assertTrue("找不到檔案：" + file.getAbsolutePath(), file.isFile());
        return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
    }

    // ------------------------------------------------------------------ the name

    /**
     * The home screen name and the browser name are the same product, so they are the same string.
     * Read out of the webapp's own manifest so this cannot drift into a third name that only the
     * Android side knows about.
     *
     * <p>Deliberately webapp/public/, not the copy at the repository root. That root copy is build
     * output: deploy-pages.yml wipes the root entries and re-copies the Vite build over them on
     * every push to main, so it only catches up with a rename <em>after</em> the merge. A pull
     * request that renames the product in the webapp and in the Android label together - exactly
     * the change this test exists to keep honest - would be failed by its own guard for not having
     * edited generated output that no human is supposed to edit.
     */
    @Test public void theLauncherLabelMatchesTheOfficialPwaName() throws IOException {
        String pwaManifest = read("../../webapp/public/manifest.json");
        assertTrue("CIBAR PWA manifest 的 name 不再是「" + APP_NAME + "」，"
                        + "Android 的桌面名稱必須跟著改：" + pwaManifest,
                pwaManifest.contains("\"name\":\"" + APP_NAME + "\""));

        String androidManifest = read("src/main/AndroidManifest.xml");
        assertTrue("桌面名稱必須由 @string/app_name 決定",
                androidManifest.contains("android:label=\"@string/app_name\""));
        assertFalse("manifest 不可以寫死桌面名稱",
                androidManifest.contains("android:label=\"" + APP_NAME));
        assertFalse("舊的工程用名稱不該再出現在 manifest",
                androidManifest.contains("佐臻 AR 硬體驗證"));

        assertTrue("app_name 就是產品名本身",
                read("src/main/res/values/strings.xml")
                        .contains("<string name=\"app_name\">" + APP_NAME + "</string>"));
    }

    /**
     * The delivery split is gone from the name, and there is nowhere left for it to come back.
     *
     * <p>It was 反詐AR體驗線上版 and 反詐AR體驗線下版, one character apart on a home screen, chosen
     * under time pressure by somebody who had been told which was which twenty minutes earlier.
     * There is one app now, and it is called what the product is called.
     */
    @Test public void thereIsOneNameAndItSaysNothingAboutDeliveries() throws IOException {
        String strings = read("src/main/res/values/strings.xml");
        for (String banned : new String[] {"線上版", "線下版", "離線版", "online", "offline"}) {
            assertFalse("桌面名稱不該再帶版本別：" + banned, labelIn(strings).contains(banned));
        }
        assertEquals(APP_NAME, labelIn(strings));

        for (String flavorDirectory : new String[] {"src/online", "src/offline"}) {
            assertFalse(flavorDirectory + " 應該已經刪除：正式版只有一支 APK",
                    resolve(flavorDirectory).exists());
        }
    }

    /** The app_name a strings.xml declares. */
    private static String labelIn(String stringsXml) {
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("<string name=\"app_name\">([^<]*)</string>").matcher(stringsXml);
        assertTrue("strings.xml 裡找不到 app_name：" + stringsXml, m.find());
        return m.group(1);
    }

    /**
     * The launcher label is the only place the app names itself.
     *
     * <p>There used to be a diagnostics panel headed 反詐AR體驗 with the running versionName and
     * versionCode underneath it. The panel is gone - launching the APK opens CIBAR - so the name a
     * tester reads is the one on the home screen and in App info. Nothing is titled on screen, and
     * a re-added heading is a re-added diagnostics panel.
     */
    @Test public void nothingIsTitledOnScreen() throws IOException {
        String layout = read("src/main/res/layout/activity_main.xml");
        assertFalse("正式畫面不得再有標題文字", layout.contains("android:text="));
        assertFalse("正式畫面不得再顯示版本資訊",
                layout.contains("android:id=\"@+id/buildVersion\""));
    }

    // ------------------------------------------------------------------ the version

    /**
     * versionName carries the CI run number and the commit it was built from, so the string on
     * the phone identifies one build and no other. A local build says {@code +local}, which is
     * below every CI build and so can never be mistaken for one.
     *
     * <p>The version number itself is no longer written in build.gradle - it lives in
     * release/versions.json as SHELL_VERSION and the build reads it from there
     * (docs/RELEASE_VERSIONING.md; {@link ShellVersionTest} pins the file-to-APK contract). What
     * is pinned here is the <em>shape</em> of what build.gradle does with it, which is what a
     * well-meant "simplification" back to a literal would break.
     */
    @Test public void theVersionNameCarriesBuildNumberAndCommit() throws IOException {
        String gradle = read("build.gradle");
        assertTrue("版本號必須來自 release/versions.json，不得寫死在 build.gradle 裡"
                        + "（見 docs/RELEASE_VERSIONING.md）",
                gradle.contains("release/versions.json"));
        assertTrue("baseVersionName 必須就是 SHELL_VERSION",
                gradle.contains("def baseVersionName = shellVersion"));
        assertTrue("versionCode 的基底必須是 shellVersionCode",
                gradle.contains("def baseVersionCode = shellVersionCode"));
        assertTrue("versionName 必須帶 CI run number", gradle.contains("${buildNumber}"));
        assertTrue("versionName 必須帶 commit SHA", gradle.contains("commitSha.take(7)"));
        assertTrue("versionCode 必須隨 CI run number 遞增，否則手機不會視為升級",
                gradle.contains("baseVersionCode + (buildNumber.isNumber()"));
    }

    /**
     * The APK's versionName says nothing about a delivery any more, because there is not one - and
     * nothing about the web bundle either, because that updates without the APK.
     */
    @Test public void theVersionNameNoLongerNamesADelivery() throws IOException {
        String gradle = read("build.gradle");
        assertTrue("只有一個 versionName",
                gradle.contains("def resolvedVersionName = \"${baseVersionName}${buildMetadata}\""));
        assertFalse("不該再有 per-flavor 的 versionName", gradle.contains("versionNameFor"));
        assertFalse("不該再有 product flavor", gradle.contains("flavorDimensions"));
        assertFalse("不該再有 online flavor", gradle.contains("applicationIdSuffix \".online\""));
        assertFalse("不該再有 offline flavor", gradle.contains("applicationIdSuffix \".offline\""));
    }

    /**
     * The keystore is committed on purpose. What this asserts is that both build types actually
     * use it: a build type that falls back to {@code signingConfigs.debug} gets the runner's
     * throwaway key again, and the phone refuses the upgrade with no usable error.
     */
    @Test public void bothBuildTypesAreSignedWithTheCommittedTestKey() throws IOException {
        File keystore = resolve("keystore/cibar-test.jks");
        assertTrue("固定簽章金鑰必須存在於 repo：" + keystore.getAbsolutePath(), keystore.isFile());
        assertTrue("金鑰檔看起來是空的或被截斷", keystore.length() > 500L);

        String gradle = read("build.gradle");
        assertTrue("signingConfigs 必須指向 repo 內的固定金鑰",
                gradle.contains("storeFile file(\"keystore/cibar-test.jks\")"));
        assertEquals("release 與 debug 都必須用同一把固定金鑰（否則兩支 APK 互相蓋不掉）",
                2, countOccurrences(gradle, "signingConfig signingConfigs.cibarTest"));
        assertFalse("不能再用每台機器各自產生的 debug 金鑰",
                gradle.contains("signingConfig signingConfigs.debug"));
    }

    // ------------------------------------------------------------------ what is in the APK

    /**
     * The INTERNET permission is required now, and it is required for exactly one thing.
     *
     * <p>The old offline APK removed it, and that removal was a real guarantee: Android backs the
     * permission with a kernel group, so a process without it cannot open a socket at all. The
     * single APK cannot keep that guarantee, because it has to fetch update pointers - so the
     * guarantee moves to where the network is *used*, and is asserted by the offline audit
     * (webapp/scripts/audit-offline-web-assets.mjs) and by WebContentSourceTest: every byte the
     * experience shows comes out of a bundle on the device, and nothing the page loads is fetched.
     */
    @Test public void theNetworkIsDeclaredAndIsOnlyForUpdates() throws IOException {
        String manifest = read("src/main/AndroidManifest.xml");
        assertTrue("OTA 更新需要 INTERNET",
                manifest.contains("<uses-permission android:name=\"android.permission.INTERNET\" />"));
        assertFalse("不該再有把 INTERNET 移除的 flavor manifest",
                resolve("src/offline/AndroidManifest.xml").exists());

        // navigator.onLine's Android equivalent. Deliberately still removed from the merged
        // manifest: "attached to a network" is not "the internet is reachable", and the update
        // check answers that question by making the request. See OtaHttp.
        assertTrue("ACCESS_NETWORK_STATE 仍然要移除：連上 Wi-Fi 不等於連得到網際網路",
                manifest.contains("<uses-permission android:name=\"android.permission.ACCESS_NETWORK_STATE\""
                        + " tools:node=\"remove\" />"));

        String source = read("src/main/java/com/bigxreality/jorjinverifier/WebContentSource.java");
        assertTrue("唯一會連網的位址是 OTA 的 latest.json",
                source.contains("UPDATE_LATEST_URL = SITE_ROOT + \"ota/latest.json\""));
    }

    /**
     * The APK's web content is produced by the build, from webapp/, every time it is assembled. A
     * hand-copied snapshot would be a second copy of the webapp that drifts from the real one -
     * and the drift is invisible, because the APK keeps working.
     */
    @Test public void theWebContentIsBuiltRatherThanCopiedIn() throws IOException {
        String gradle = read("build.gradle");
        assertTrue("必須自己跑 webapp 的 npm build", gradle.contains("npm(dir, \"run\", \"build\")"));
        assertTrue("建置出來的 dist 必須被放進 assets",
                gradle.contains("onVariants(selector().all())"));
        assertTrue("打包前必須跑禁網稽核", gradle.contains("audit-offline-web-assets.mjs"));

        File audit = resolve("../../webapp/scripts/audit-offline-web-assets.mjs");
        assertTrue("禁網稽核腳本必須存在：" + audit.getAbsolutePath(), audit.isFile());
        File allowlist = resolve("../../webapp/scripts/offline-external-url-allowlist.json");
        assertTrue("外部網址白名單必須存在：" + allowlist.getAbsolutePath(), allowlist.isFile());

        File staged = resolve("src/main/assets");
        assertFalse("src/main/assets 不該存在：內容由 build task 產生，不是手動複製", staged.exists());
    }

    /**
     * The APK ships a manifest naming the version of the build inside it, produced by the same
     * script that produces an OTA release's manifest.
     *
     * <p>Without it the shell has no idea what it shipped with, treats every published bundle as
     * newer, and downloads 80 MiB on first launch to arrive at the bytes it was installed with.
     */
    @Test public void theApkSaysWhichWebBundleItShippedWith() throws IOException {
        String gradle = read("build.gradle");
        assertTrue("baseline manifest 必須由 OTA publisher 產生",
                gradle.contains("build-ota-release.mjs"));
        assertTrue("並且用 --manifest-only 模式", gradle.contains("\"--manifest-only\""));
        assertTrue("放在 assets 根目錄，頁面的 origin 讀不到",
                gradle.contains("it.manifestName.set(\"cibar-baseline-manifest.json\")"));

        String controller = read("src/main/java/com/bigxreality/jorjinverifier/OtaController.java");
        assertTrue("shell 必須從那個 asset 讀出自己的內建版本",
                controller.contains("BASELINE_MANIFEST_ASSET = \"cibar-baseline-manifest.json\""));

        File publisher = resolve("../../webapp/scripts/build-ota-release.mjs");
        assertTrue("OTA publisher 必須存在：" + publisher.getAbsolutePath(), publisher.isFile());
        // One file, and only one, decides every version number in this repository - the APK
        // Shell's, its versionCode, the Web Bundle's, and the floor a bundle may demand. See
        // docs/RELEASE_VERSIONING.md §2 and android/app/build.gradle.
        File versionFile = resolve("../../release/versions.json");
        assertTrue("版本檔必須存在：" + versionFile.getAbsolutePath(), versionFile.isFile());
        assertFalse("webapp/ota-version.json 已經由 release/versions.json 取代，不該復活",
                resolve("../../webapp/ota-version.json").exists());
    }

    // ------------------------------------------------------------------ what CI publishes

    /**
     * The published filename has exactly one job: say what this is. It used to also carry the
     * version, the commit and the run number, and there used to be four of them.
     *
     * <p>The release asset is ASCII on purpose, and that is not a preference: GitHub's release-asset
     * API replaces every character outside {@code [A-Za-z0-9.+_-]} with a dot, so an asset uploaded
     * as {@code CIBAR-反詐AR體驗.apk} arrives as {@code CIBAR-...........apk} and the direct
     * download links in the notes stop resolving. The product's own name travels as the asset label
     * and as the filename in the Actions artifact.
     */
    @Test public void oneApkIsPublished() throws IOException {
        String workflow = read("../../.github/workflows/build-android.yml");
        assertTrue("交付檔名就是產品名", workflow.contains("DELIVERY=\"CIBAR-" + APP_NAME + "\""));
        assertTrue("release asset 用 ASCII 檔名，附上中文 label",
                workflow.contains("\"dist/upload/CIBAR.apk#${DELIVERY}.apk"));
        assertTrue("dist/ 只能有兩支，多出來的要讓建置失敗",
                workflow.contains("dist/ 出現了預期外的檔名"));
        assertTrue("必須擋下 online / offline variant 復活",
                workflow.contains("正式版只有一支 APK"));
        assertFalse("不該再建置 flavor", workflow.contains("assembleOnlineRelease"));
        assertFalse("不該再建置 flavor", workflow.contains("assembleOfflineRelease"));
        assertTrue("只建一支", workflow.contains("./gradlew assembleDebug assembleRelease"));

        // A tester who hits an install failure gets no hint from Android about the cause, so the
        // install caveat must not be something to scroll for.
        assertTrue("Release 說明最上面必須先寫安裝注意事項",
                workflow.contains("printf '## ⚠️ 安裝前請先看這一段"));
        assertTrue("Release 說明必須說清楚網頁內容從哪裡來",
                workflow.contains("### 網頁內容從哪裡來"));
        assertTrue("Release 必須直接附上 APK，測試者不必去解 Actions artifact",
                workflow.contains("gh release create \"$RELEASE_TAG\" \\"));
        assertTrue("Release 內文最上面就要寫「下載哪一支」",
                workflow.contains("printf '# 手機安裝：就這一支"));
    }

    /**
     * CI proves the APK is a complete offline experience, and that the version it declares is the
     * version the OTA publisher would cut from the same commit.
     *
     * <p>That second assertion is what stops every freshly installed phone from immediately
     * downloading a bundle identical to the one it was installed with.
     */
    @Test public void ciChecksTheApkIsSelfContainedAndCorrectlyVersioned() throws IOException {
        String workflow = read("../../.github/workflows/build-android.yml");
        assertTrue(workflow.contains("require \"assets/cibar/index.html\""));
        assertTrue(workflow.contains("require \"assets/cibar/assets/.*\\.mp4\""));
        assertFalse("開場已改成純 CSS 動畫，APK 不該再要求 media/intro/ 這個資料夾",
                workflow.contains("media/intro"));
        assertTrue(workflow.contains("require \"assets/cibar-baseline-manifest.json\""));
        // The baseline is not a release and must not claim to be one: a Release ID is minted
        // after the merge that builds this APK, so a zeroed date and sequence is the only honest
        // thing it can carry.
        assertTrue("CI 必須擋下「APK 內建的 bundle 帶著 Release ID」",
                workflow.contains("-00000000\\.000$"));
        // ...and its semantic half must be the version this commit declares, because that is the
        // half the phone actually compares (BundleVersion.compareSemantic).
        assertTrue("內建版本的語意半部必須等於 release/versions.json 宣告的版本",
                workflow.contains("jq -r .webBundleVersion ../release/versions.json"));
        assertTrue("打包好的網頁內容要再稽核一次",
                workflow.contains("audit-offline-web-assets.mjs /tmp/apk-bundle/assets/cibar"));
    }

    /**
     * The publish pipeline points production at a release only after proving the release exists.
     *
     * <p>Three things in this order, and the order is the mechanism rather than a nicety: create
     * the GitHub Release, fetch the archive back from the outside and check it hashes to what the
     * pointer will claim, and only then commit the pointer the phones read
     * ({@code ota/latest.json} on the published site).
     *
     * <p>Both ways of getting it wrong fail silently. A pointer published before its archive
     * exists is every phone downloading a 404; a pointer published before the upload finished is
     * every phone downloading half an archive and discarding it on the digest check. Neither
     * shows up anywhere except as "the version stopped moving", weeks later.
     */
    @Test public void theOtaPointerIsPublishedLast() throws IOException {
        String release = read("../../.github/workflows/ota-release.yml");
        int create = release.indexOf("gh release create \"$TAG\"");
        int verify = release.indexOf("name: Verify the published bundle downloads");
        int pointer = release.indexOf("cp release/ota/latest.json ota/latest.json");
        assertTrue("必須先建立 GitHub Release", create > 0);
        assertTrue("再從正式位置抓回來驗證", verify > create);
        assertTrue("最後才把 latest.json 發布到網站", pointer > verify);
        assertTrue("抓回來要比對 SHA-256", release.contains("sha256sum --check --strict"));
        assertTrue("並且確認它真的解得開", release.contains("unzip -t /tmp/published-bundle.zip"));
    }

    /**
     * A branch cannot publish. Release IDs exist only on main, which is what keeps a pull request
     * from pointing production at a bundle nobody merged - docs/RELEASE_VERSIONING.md §8.
     */
    @Test public void onlyMainCanPublishARelease() throws IOException {
        String release = read("../../.github/workflows/ota-release.yml");
        assertTrue("release job 只能在 main 上跑",
                release.contains("refs/heads/main"));
    }

    private static int countOccurrences(String haystack, String needle) {
        int count = 0;
        for (int at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) {
            count++;
        }
        return count;
    }
}
