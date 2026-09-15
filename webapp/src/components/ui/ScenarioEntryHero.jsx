// The key visual a scenario's entry screen opens on. Shared by all five entry
// screens so the framing rules live in one place instead of five.
//
// The artwork carries no text and gets none added: it is purely the visual
// the entry screen was missing, and it never becomes a control.
//
// Framing is `object-fit: contain` inside a height-capped box, not a fixed
// ratio with `cover`. These are full-bleed compositions - the bear stands at
// one edge and the phone at the other - so any crop eats a subject, and the
// set is not one single ratio either (scenario01's master is 2:3, the other
// four are 9:16). Contain keeps every image at its own aspect ratio, never
// stretched and never cut, and lets the box shrink-wrap it. The entry
// screen's own copy and confirm button stay outside the box - nothing is
// drawn over the image.
//
// Renders nothing when `src` is falsy, so a scenario whose artwork is not in
// the repo yet keeps its previous entry screen.
export function ScenarioEntryHero({ src, className = '' }) {
  if (!src) return null;
  return (
    <div className={`scenario-entry-hero ${className}`.trim()}>
      <img className="scenario-entry-hero-img" src={src} alt="" />
    </div>
  );
}
