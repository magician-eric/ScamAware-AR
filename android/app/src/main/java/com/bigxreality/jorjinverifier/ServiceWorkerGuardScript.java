package com.bigxreality.jorjinverifier;

/**
 * Keeps a Service Worker from becoming a second, invisible version of the app.
 *
 * <h2>The failure this closes</h2>
 * Native OTA is the version control for this shell: {@code WebBundleStore} decides which bundle is
 * active and {@code WebBundleAssetHandler} serves it, and every request the page makes is answered
 * out of that bundle. A Service Worker sits <em>above</em> all of that. It intercepts fetches
 * before they ever reach {@code shouldInterceptRequest}, and it answers them out of the Cache
 * Storage of the origin - which, because every bundle is served from the same origin on purpose,
 * is shared across every version this phone has ever run.
 *
 * <p>So a stale worker produces exactly the state that is hardest to diagnose: the native side is
 * correctly running bundle v20, the diagnostics say v20, the files on disk are v20, and the page
 * on screen is v19 because a cached response was returned before anything native was consulted.
 * Reinstalling the APK would not fix it - Cache Storage belongs to the origin and the origin does
 * not change.
 *
 * <h2>Why unregister rather than let it be</h2>
 * CIBAR's React build does not register a Service Worker, and {@code webapp/public/sw.js} is
 * itself a kill switch left over from the pre-SPA static site. So in the normal case this script
 * finds nothing and does nothing. It exists for the cases where that is not true: a phone that
 * once loaded the published site in a WebView with the same origin semantics, a future change that
 * adds a worker for the web build's own reasons without realising the shell has its own version
 * control, and any page that registers one by accident.
 *
 * <p>Injected at every {@code onPageFinished}, which is cheap (two promise calls that resolve to
 * empty lists) and unconditional, which is what makes it a guarantee rather than a hope.
 */
final class ServiceWorkerGuardScript {

    private ServiceWorkerGuardScript() { }

    /**
     * Unregisters every Service Worker on this origin and empties its Cache Storage.
     *
     * <p>Every call is wrapped: {@code navigator.serviceWorker} is undefined on an insecure origin
     * and {@code window.caches} can be absent entirely, and a thrown reference error here would
     * abort the injected script before the diagnostics that follow it.
     */
    static String install() {
        return "(function(){try{"
                + "if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){"
                + "navigator.serviceWorker.getRegistrations().then(function(rs){"
                + "rs.forEach(function(r){try{r.unregister();}catch(e){}});"
                + "}).catch(function(){});"
                + "}"
                + "if(window.caches&&caches.keys){"
                + "caches.keys().then(function(ks){"
                + "ks.forEach(function(k){try{caches.delete(k);}catch(e){}});"
                + "}).catch(function(){});"
                + "}"
                + "}catch(e){}})();";
    }
}
