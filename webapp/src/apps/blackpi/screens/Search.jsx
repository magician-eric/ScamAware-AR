import { ChevronLeft, Search as SearchIcon, Clock, TrendingUp } from 'lucide-react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { Toast } from '../components/Toast';
import { useToast } from '../../../lib/useToast';
import { useT } from '../i18n';

// Only 智慧掃地機器人/摺疊手機 advance the story - kept in fixed rank order
// (1/2) so they read as legitimate top hot-searches, not a hidden trick.
const HISTORY = [
  { label: '智慧掃地機器人', route: 'health' },
  { label: '摺疊手機', route: 'luckyBag' },
];
const HOT = [
  { label: '智慧掃地機器人', route: 'health' },
  { label: '摺疊手機', route: 'luckyBag' },
  { label: '行動電源', route: null },
  { label: '藍牙喇叭', route: null },
  { label: '掛耳咖啡', route: null },
  { label: '保濕精華', route: null },
  { label: '吹風機', route: null },
  { label: '瑜珈墊', route: null },
];

// Screen 03 - 搜尋頁.
export function Search({ onSearchTerm, onBack }) {
  useStageClassName('blackpi-stage');
  const t = useT();
  const [toast, showToast] = useToast();

  function pick(item) {
    // Only the two story terms resolve to a product line; the App just says
    // which term was searched and lets Scenario 04 decide where that leads.
    if (item.route) onSearchTerm?.(item.route);
    else showToast(t('找不到相關商品，請嘗試其他關鍵字'));
  }

  return (
    <div className="blackpi-app">
      <header className="bp-header">
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={() => onBack?.()}>
          <ChevronLeft size={24} />
        </button>
        {/* The AR build's search bar is appearance only: it may not focus,
            may not take typing, and may not be pressed. This one was a live
            input field - the last editable control in Scenario 04, and
            the reason scripts/ar-interaction-known-exceptions.mjs carried a
            standing REPORT for this file. A player on the glasses has no
            keyboard, and a player at the kiosk who lands in it gets a caret,
            an on-screen keyboard and no way to submit anything: the two terms
            that lead anywhere are the rows below.

            So the field becomes the same non-editable prompt SearchResults
            already renders in its own bar - the pill keeps its icon, its
            placeholder copy and its exact shape, and there is no longer an
            element on this screen that can be focused or typed into. */}
        <div className="bp-searchbar is-decorative" style={{ flex: 1 }}>
          <SearchIcon size={16} />
          <span>{t('搜尋掃地機器人、摺疊手機')}</span>
        </div>
      </header>
      <div className="bp-scroll bp-page">
        <div className="bp-section">
          <h2 className="bp-h2"><Clock size={14} style={{ verticalAlign: -2, marginRight: 4 }} />{t('搜尋紀錄')}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {HISTORY.map((h) => (
              <button key={h.label} type="button" className="bp-btn bp-btn-ghost bp-btn-sm" onClick={() => pick(h)}>
                {t(h.label)}
              </button>
            ))}
          </div>
        </div>
        <div className="bp-section">
          <h2 className="bp-h2"><TrendingUp size={14} style={{ verticalAlign: -2, marginRight: 4 }} />{t('熱門搜尋')}</h2>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
            {HOT.map((item, i) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => pick(item)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '11px 4px', fontSize: 14, color: 'var(--bp-text)', cursor: 'pointer', display: 'flex', gap: 10, minHeight: 44 }}
                >
                  <span style={{ color: i < 2 ? 'var(--bp-error)' : 'var(--bp-text-tertiary)', fontWeight: 800, width: 16 }}>{i + 1}</span>
                  {t(item.label)}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
