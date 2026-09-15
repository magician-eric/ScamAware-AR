package com.bigxreality.jorjinverifier;

/**
 * The five reference images, in the order CIBAR expects them.
 *
 * <p>This table is the Android half of a contract whose other half lives in CIBAR's
 * {@code lib/ar/scenarioTargetMap.js}:
 *
 * <pre>
 * export const TARGET_SCENARIO_MAP = {
 *   0: 'investment', 1: 'romance', 2: 'authority', 3: 'fakeSeller', 4: 'fakeBuyer',
 * }
 * </pre>
 *
 * <p>Two sides, one ordering, and nothing in either language checks the other - so the index and
 * the name are both sent. If the orders ever drift apart, a page that trusts the index opens the
 * wrong scenario silently; a page that compares the two sees a mismatch instead. The names here
 * must stay spelled exactly as that file spells them.
 */
enum ScanTarget {
    INVESTMENT(0, "investment", "投資詐騙"),
    ROMANCE(1, "romance", "感情詐騙"),
    AUTHORITY(2, "authority", "假冒公務"),
    FAKE_SELLER(3, "fakeSeller", "假賣家"),
    FAKE_BUYER(4, "fakeBuyer", "假買家");

    /** Position in the registered set; what CIBAR's routeForTargetIndex() takes. */
    final int index;
    /** CIBAR's scenario key, spelled as scenarioTargetMap.js spells it. */
    final String scenario;
    /** For the diagnostics panel only; CIBAR never sees this. */
    final String label;

    ScanTarget(int index, String scenario, String label) {
        this.index = index;
        this.scenario = scenario;
        this.label = label;
    }

    static ScanTarget byIndex(int index) {
        for (ScanTarget target : values()) {
            if (target.index == index) return target;
        }
        return null;
    }
}
