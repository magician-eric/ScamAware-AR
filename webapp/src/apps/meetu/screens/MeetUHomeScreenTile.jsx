import { MEETU } from '../brand/manifest';

// The MeetU icon as it appears on a phone home screen, including the
// "launching" press-in state. Purely presentational: the host owns the clock
// value, when the launch animation starts, and where it goes afterwards.
export function MeetUHomeScreenTile({ clock, opening = false }) {
  return (
    <div className="meetu-desktop">
      <div className="meetu-desktop-clock">{clock}</div>
      <div className={`meetu-desktop-app${opening ? ' is-opening' : ''}`}>
        <span className="meetu-desktop-app-icon">
          <img src={MEETU.appIcon} alt="" />
        </span>
        <span className="meetu-desktop-app-label">{MEETU.name}</span>
      </div>
    </div>
  );
}
