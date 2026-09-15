import './PhoneHome.css';

// Draws an app's icon inside its tile.
//
// Default (scenario02's MeetU icon, and any well-trimmed export): the file is
// its own artwork, so it just fills the tile and the tile's `place-items:
// center` does the centring.
//
// `iconBox` is for the other case: a file whose artwork does not fill its
// canvas. Centring such a file centres its empty margins too, which puts the
// mark off to one side. Given the artwork's measured box the wrapper frames
// that box instead, so the mark's own centre lands on the tile's centre. The
// box comes from the caller (it is a fact about their asset, measured from
// the file) - nothing here is tuned by eye, and no offset is ever applied to
// the app item, which stays a plain centred column.
function AppIconArt({ src, box }) {
  if (!box) return <img src={src} alt="" />;
  return (
    <span className="phone-home-app-art" style={{ aspectRatio: `${box.width} / ${box.height}` }}>
      <img
        src={src}
        alt=""
        style={{
          width: `${(box.canvasWidth / box.width) * 100}%`,
          height: `${(box.canvasHeight / box.height) * 100}%`,
          left: `${(-box.x / box.width) * 100}%`,
          top: `${(-box.y / box.height) * 100}%`,
        }}
      />
    </span>
  );
}

// Shared fake-phone desktop surface. Story modules provide only the app
// identity and the navigation action; the phone chrome remains app-agnostic.
//
// The layout is scenario02's PhoneDesktop (.meetu-desktop in styles/global.css)
// and scenario04's SimPhoneHome (pages/scenario04/SimPhoneHome.jsx), which are
// already the same desktop: a light 44px clock at the top, the app's icon and
// label as one centred column near the bottom, and nothing else on the screen.
// No status bar, no dock, no filler icons - a simulated desktop only needs to
// carry the one app the story is about, and inventing furniture around it just
// makes the three scenarios look like three different phones.
export function PhoneHome({ time, subtitle, apps }) {
  return (
    <div className="phone-home">
      <div className="phone-home-clock">
        <strong>{time}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="phone-home-apps">
        {apps.map((app) => (
          <button key={app.id} type="button" className="phone-home-app" onClick={app.onOpen} aria-label={app.openLabel}>
            <span className="phone-home-app-icon"><AppIconArt src={app.icon} box={app.iconBox} /></span>
            <span className="phone-home-app-label">{app.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
