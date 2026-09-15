import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { ShoppingBag } from 'lucide-react';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Screen 00 - 模擬手機桌面. A plain simulated phone lock/home screen so the
// player's first tap is "open the BlackPi app", not a page that already
// looks like a shopping site.
export function SimPhoneHome() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const t = useT();
  const openApp = () => navigate('/scenario04-shopping/splash');

  // AR Interaction Contract: one app icon, one story action.
  useARInteraction({ mode: 'single', surfaceId: 'scenario04/phone-home', action: openApp });

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="blackpi-app" style={{ background: 'linear-gradient(180deg,#0d3b3a,#092523)', color: '#fff', alignItems: 'center', justifyContent: 'space-between', padding: '48px 0 60px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 300 }}>{time}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={openApp}
          aria-label={t('開啟黑皮購物')}
          style={{
            width: 64, height: 64, borderRadius: 18, border: 0, cursor: 'pointer',
            background: 'linear-gradient(135deg,#0ABAB5,#089B96)', color: '#fff',
            display: 'grid', placeItems: 'center', boxShadow: '0 10px 26px rgba(0,0,0,.35)',
          }}
        >
          <ShoppingBag size={28} />
        </button>
        <span style={{ fontSize: 12 }}>{t('黑皮購物')}</span>
      </div>
    </div>
  );
}
