import { MeetULogo } from '../components/MeetULogo';
import { useT } from '../i18n';

// MeetU's own brand splash - the app-store-style "why you'd want this" pitch
// a real dating app leads with, before the player ever sees a swipe card.
// The copy and the fictional stats are the app's own marketing surface; the
// host only supplies the teaser faces and decides what "start" leads to.
const STATS = [
  { label: '附近活躍用戶', value: '2,483' },
  { label: '今日新配對', value: '612' },
];

export function MeetULandingScreen({ teaserPhotos = [], onStart }) {
  const t = useT();

  return (
    <div className="meetu-landing">
      <div className="meetu-landing-scroll">
        <div className="meetu-landing-logo-block">
          <MeetULogo size={40} variant="full" />
        </div>

        <div className="meetu-landing-teaser" aria-hidden="true">
          {teaserPhotos.map((src, i) => (
            <img
              key={src}
              className="meetu-landing-teaser-photo"
              src={src}
              alt=""
              style={{ zIndex: teaserPhotos.length - i }}
            />
          ))}
        </div>

        <h1 className="meetu-landing-title">{t('遇見，怦然心動的開始')}</h1>
        <p className="meetu-landing-sub">{t('上千位真實用戶，就在你附近')}</p>

        <div className="meetu-landing-stats">
          {STATS.map((s) => (
            <div key={s.label} className="meetu-landing-stat">
              <strong>{s.value}</strong>
              <span>{t(s.label)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="meetu-landing-cta">
        <button type="button" className="meetu-primary-btn" onClick={onStart}>
          {t('立即開始配對')}
        </button>
      </div>
    </div>
  );
}
