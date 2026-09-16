import { PhoneShell } from '../components/PhoneShell';
import { useT } from '../i18n';

// 底部導覽・訊息 - lists the seller/platform threads the player has actually
// opened this run, so it reads as a real inbox rather than a dead tab. Which
// threads exist is handed in; opening one is reported, and the conversation it
// leads to is Scenario 04's to mount.
export function Messages({
  activeProductRoute = null, sellerUnreachable = false,
  onOpenSellerChat, onOpenSupport,
}) {
  const t = useT();
  const route = activeProductRoute;
  const threads = [];
  if (route) {
    threads.push({
      id: 'seller',
      name: t(route === 'health' ? '智選家電生活館' : '潮選數位通訊館'),
      preview: sellerUnreachable ? t('（店家暫停營業）') : t('點擊繼續與賣家的對話'),
      onClick: () => onOpenSellerChat?.(),
    });
    threads.push({
      id: 'platform',
      name: t('黑皮安心客服'),
      preview: t('官方認證・線上服務'),
      onClick: () => onOpenSupport?.(),
    });
  }

  return (
    <PhoneShell nav="messages">
      <header className="bp-header"><div className="bp-header-title">{t('訊息')}</div></header>
      <div className="bp-scroll bp-page">
        {threads.length === 0 && <p className="bp-muted bp-section">{t('目前沒有進行中的對話。')}</p>}
        {threads.map((thread) => (
          <button key={thread.id} type="button" className="bp-list-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={thread.onClick}>
            <div className="bp-chat-avatar" style={{ width: 44, height: 44 }}>{thread.name[0]}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{thread.name}</div>
              <div className="bp-muted">{thread.preview}</div>
            </div>
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}
