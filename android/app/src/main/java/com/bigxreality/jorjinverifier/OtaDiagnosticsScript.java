package com.bigxreality.jorjinverifier;

/**
 * Publishes the update mechanism's state into the page, as {@code window.__cibarOta}.
 *
 * <p>The app has no screen of its own - launching it opens CIBAR, and {@code ProductionStartupTest}
 * keeps it that way - so there is nowhere native to show which bundle is running. This is the
 * substitute, and it is deliberately a global and an event rather than a UI: the webapp already has
 * a hidden staff entry, and if it ever wants to display the running bundle version it can read this
 * without the shell growing a second diagnostics system for a wearer to stumble into.
 *
 * <p>Nothing in the experience may depend on it. It is written after the page has loaded, so it is
 * absent for the whole of first paint, and it is absent entirely when the same build runs in a
 * desktop browser during development. A page that branches on the <em>presence</em> of an update
 * mechanism would behave differently in the two places the same build has to work.
 *
 * <p>The same JSON also goes to Logcat under {@code JorjinOta} and to
 * {@code ota-diagnostics.json} in the app's external files directory, which are the two ways to
 * read it without a debugger attached.
 */
final class OtaDiagnosticsScript {

    private OtaDiagnosticsScript() { }

    /**
     * @param diagnosticsJson {@code OtaDiagnostics.toJson()} - already a JSON object literal, and
     *                        produced by {@code org.json}, so it is a valid JavaScript expression.
     */
    static String install(String diagnosticsJson) {
        String value = diagnosticsJson == null || diagnosticsJson.trim().isEmpty()
                ? "{}" : diagnosticsJson;
        return "(function(){try{"
                + "window.__cibarOta=" + value + ";"
                + "window.dispatchEvent(new CustomEvent('cibarOtaReady',{detail:window.__cibarOta}));"
                + "}catch(e){}})();";
    }
}
