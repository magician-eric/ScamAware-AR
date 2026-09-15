package com.bigxreality.jorjinverifier;

/**
 * Asks the page whether CIBAR actually came up, as opposed to merely finishing its load.
 *
 * <h2>The failure this exists for</h2>
 * {@code onPageFinished} fires for the main document, and only for the main document. An
 * {@code index.html} that returns 200 while its entry script 404s, or returns 200 and throws on
 * the first line, reaches {@code onPageFinished} exactly like a healthy page does - the
 * sub-resource error is not a main-frame error and {@code onReceivedError} ignores it. What the
 * wearer gets is a white screen; what the shell used to record was a successful launch.
 *
 * <p>That is the one failure mode the rollback gate could not see, and it is the worst one to be
 * blind to. A bundle that fails to <em>load</em> rolls back within the session. A bundle that
 * loads and comes up blank was, until this, confirmed as good, had its failure counter cleared,
 * and stayed active for every launch afterwards - a phone bricked into a white screen by an
 * update, with a working previous bundle sitting on disk beside it.
 *
 * <h2>Why a probe and not a callback from the page</h2>
 * A callback needs {@code addJavascriptInterface}, which is a native method the page can call -
 * a permanent widening of what a bundle can reach, added to solve a problem the shell can answer
 * by looking. It would also make the gate depend on the web build remembering to call it: a
 * future bundle that dropped the call would be rolled back on its second launch for being
 * healthy.
 *
 * <p>So the shell asks instead, about the thing every React build does whether or not it knows
 * this exists: {@code #root} has children. An app that mounted has them; a boot that 404'd or
 * threw leaves the div exactly as {@code index.html} shipped it. Nothing in the web source has to
 * cooperate, and nothing there can accidentally stop cooperating.
 */
final class AppMountedProbeScript {

    /** The div {@code webapp/index.html} ships and {@code main.jsx} mounts into. */
    private static final String MOUNT_ELEMENT_ID = "root";

    private AppMountedProbeScript() { }

    /**
     * An expression that evaluates to {@code true} when CIBAR has rendered something.
     *
     * <p>Deliberately generous about what counts. The question is "did the app boot", not "is the
     * app correct": one rendered element is the difference between a running experience and a
     * white screen, and anything stricter would start rolling back bundles for being on a screen
     * this file did not anticipate.
     */
    static String probe() {
        return "(function(){try{"
                + "var r=document.getElementById('" + MOUNT_ELEMENT_ID + "');"
                + "if(r&&r.childElementCount>0)return true;"
                // A build that mounts somewhere else still counts if it drew anything of its own.
                // <body> always has the mount div and the entry <script>, so "more than that"
                // means something rendered.
                + "return !!(document.body&&document.body.childElementCount>2);"
                + "}catch(e){return false;}})();";
    }
}
