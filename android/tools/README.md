# `android/tools/`

Two things that exist because `dl.google.com` is unreachable from the sandbox this repository is
developed in: no Android SDK, no AGP, and therefore no `./gradlew` at all. The real build is done
by CI (`.github/workflows/build-android.yml`) and nothing here replaces it.

## `run-jvm-tests.sh`

Compiles the whole module with `javac` and runs every test under `app/src/test/`.

```bash
android/tools/run-jvm-tests.sh                     # everything
android/tools/run-jvm-tests.sh ota.WebBundleStoreTest
```

It fetches what it needs from Maven Central into `tools/lib/` (git-ignored) on first run:

| | stands in for |
|---|---|
| `org.robolectric:android-all` | `android.jar` - a real one, with real method bodies |
| `org.json:json` | the same jar `app/build.gradle` puts on the test classpath, for the same reason |
| `junit` + `hamcrest` | the test runner |
| `app/libs/jjsdk.aar` → `classes.jar` | the vendor SDK, restored from this repository's history |

and generates two things it cannot download: an `R` class (aapt's job, derived from the resources
the sources actually reference) and the `androidx.webkit` stub in `stubs/`.

This is not a second build system. It exists so the over-the-air update mechanism can be exercised
without a phone: a state machine that can only be run on a device is a state machine nobody runs.
Everything under `com.bigxreality.jorjinverifier.ota` is deliberately free of `android.*` for
exactly that reason, and the tests stand up a real HTTP server, publish real archives and check
real digests rather than agreeing with a mock.

## `stubs/`

Compile-only stand-ins, on the harness classpath and nowhere else. `androidx.webkit`'s
`WebViewAssetLoader` and `androidx.annotation` live on Google's Maven repository - the unreachable
one - and `android.util.Log` bottoms out in a native method that throws on a desktop JVM (Gradle
solves that by generating a mockable `android.jar`; this harness cannot, so it supplies the one
class that matters, and prints rather than discarding).

None of it is compiled into the APK. The real build resolves the real dependencies.
