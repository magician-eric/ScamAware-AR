// Single source of truth for every CIB 刑事熊 ending artwork.
//
// These are the owner's official uploads, transcoded once to WebP at
// quality 90 (identical pixel dimensions, alpha channel bit-identical) and
// never resized, filtered or cropped anywhere in the app (see the
// object-fit:contain rule on .cibar-outcome-mascot img). They live under
// each scenario's own public asset folder, mirroring the layout scenario01
// established at assets/scenarios/scenario-01/images/results/.
//
// Keyed <scenario>.<outcome> so a page only ever names the pair it needs and
// the URL is built in exactly one place rather than being repeated at every
// call site.
const base = (scenario, file) =>
  `${import.meta.env.BASE_URL}assets/scenarios/${scenario}/images/results/${file}`;

export const RESULT_MASCOTS = {
  investment: {
    scammed: base('scenario-01', 'cib-bear-scammed.webp'),
    stopped: base('scenario-01', 'cib-bear-stopped.webp'),
  },
  romance: {
    scammed: base('scenario-02', 'cib-bear-romance-scammed.webp'),
    stopped: base('scenario-02', 'cib-bear-romance-stopped.webp'),
  },
  authority: {
    scammed: base('scenario-03', 'cib-bear-authority-scammed.webp'),
    verified: base('scenario-03', 'cib-bear-authority-verified.webp'),
  },
  package: {
    scammed: base('scenario-04', 'cib-bear-package-scammed.webp'),
    stopped: base('scenario-04', 'cib-bear-package-stopped.webp'),
  },
  order: {
    scammed: base('scenario-05', 'cib-bear-order-scammed.webp'),
    blocked: base('scenario-05', 'cib-bear-order-blocked.webp'),
  },
};
