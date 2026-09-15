import { useState } from 'react';
import { User, LifeBuoy, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { PhoneShell } from '../components/PhoneShell';
import { isSoundEnabled, setSoundEnabled } from '../../../lib/feedback';
import { useT } from '../i18n';

// 底部導覽・我的 - fake member page + real entry points into the refund
// center / customer service for when the player wants to re-enter them
// outside of the main story beats. Whether those entry points exist at all
// depends on the run being on a product line, which is handed in; tapping one
// is reported, and the screen it opens is Scenario 04's to mount.
export function Me({ activeProductRoute = null, onOpenRefundCenter, onOpenSupport }) {
  const t = useT();
  const route = activeProductRoute;
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }

  return (
    <PhoneShell nav="me">
      <header className="bp-header"><div className="bp-header-title">{t('我的')}</div></header>
      <div className="bp-scroll bp-page">
        <div className="bp-card bp-section" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="bp-chat-avatar" style={{ width: 48, height: 48 }}><User size={22} /></div>
          <div>
            <div style={{ fontWeight: 700 }}>{t('黑皮會員')}</div>
            <div className="bp-muted">{t('一般會員・會員編號 BP-165165')}</div>
          </div>
        </div>

        <div className="bp-card bp-section">
          <button type="button" className="bp-list-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={toggleSound} aria-pressed={soundOn}>
            {soundOn ? <Volume2 size={20} color="var(--bp-primary-dark)" /> : <VolumeX size={20} color="var(--bp-text-tertiary)" />}
            {t('音效與震動回饋')}
            <span className={`bp-badge ${soundOn ? 'ok' : 'neutral'}`} style={{ marginLeft: 'auto' }}>{soundOn ? t('開啟') : t('關閉')}</span>
          </button>
          {route && (
            <>
              <button type="button" className="bp-list-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => onOpenRefundCenter?.()}>
                <ShieldCheck size={20} color="var(--bp-primary-dark)" /> {t('黑皮退款中心')}
              </button>
              <button type="button" className="bp-list-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => onOpenSupport?.()}>
                <LifeBuoy size={20} color="var(--bp-primary-dark)" /> {t('黑皮安心客服')}
              </button>
            </>
          )}
          {/* S04 remaining audit: two more handler-less button elements, of the kind
              AUD-07 removed from the PDP. 我的收藏 is the one AUD-07's own note
              called out - the heart on the PDP claimed to save something this
              row would then never show - and 優惠券 has no coupon behind it
              either. Neither is in the run: this screen's `dual` contract is
              退款中心 / 客服 above. They stay as member-page furniture, with no
              button semantics and nothing to press. */}
          <div className="bp-list-row is-decorative">{t('我的收藏')}</div>
          <div className="bp-list-row is-decorative">{t('優惠券')}</div>
        </div>
      </div>
    </PhoneShell>
  );
}
