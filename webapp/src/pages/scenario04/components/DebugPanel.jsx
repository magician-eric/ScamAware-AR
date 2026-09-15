import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, X } from 'lucide-react';
import { useShoppingState, resetShoppingAll, resetShoppingRoute } from '../../../lib/shoppingStore';
import { useT } from '../i18n';

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const queryPart = hash.includes('?') ? hash.split('?')[1] : window.location.search.replace(/^\?/, '');
  return new URLSearchParams(queryPart).get('debug') === '1';
}

const SCREENS = [
  'home', 'search', 'orders', 'messages', 'me',
];

// Dev-only debug panel (spec section 30). Only renders when the current URL
// carries ?debug=1 - production visits never see it or its toggle button.
export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [state, update, refresh] = useShoppingState();
  const navigate = useNavigate();
  const t = useT();

  if (!isDebugEnabled()) return null;
  const route = state.selectedRoute || 'health';

  return (
    <>
      <button type="button" className="bp-debug-toggle" aria-label={t('開發除錯面板')} onClick={() => setOpen((v) => !v)}>
        <Bug size={18} />
      </button>
      {open && (
        <div className="bp-debug-panel">
          <button type="button" onClick={() => setOpen(false)} aria-label={t('關閉')} style={{ float: 'right' }}><X size={18} color="#dff" /></button>
          <h3>State</h3>
          <div>selectedRoute: {String(state.selectedRoute)}</div>
          <div>orderStatus: {state.orderStatus} / returnStatus: {state.returnStatus} / refundStatus: {state.refundStatus}</div>
          <div>sellerUnreachable: {String(state.sellerUnreachable)} / reported: {String(state.reported)}</div>
          <h3>Scores</h3>
          <div>trust {state.trustScore} / suspicion {state.suspicionScore} / evidence {state.evidenceScore}</div>
          <div>urgency {state.urgencyScore} / assertiveness {state.assertivenessScore} / sellerPressure {state.sellerPressureScore}</div>
          <h3>warningFlags</h3>
          <div>{state.warningFlags.join(', ') || '(none)'}</div>
          <h3>evidenceSaved</h3>
          <div>{state.evidenceSaved.join(', ') || '(none)'}</div>

          <h3>Jump to screen</h3>
          {SCREENS.map((s) => (
            <button key={s} onClick={() => navigate(`/scenario04-shopping/${s}`)}>{s}</button>
          ))}
          {['order', 'refund-center', 'platform-support', 'ending'].map((s) => (
            <button key={s} onClick={() => navigate(`/scenario04-shopping/${s}/${route}`)}>{s}</button>
          ))}

          <h3>Simulate</h3>
          <button onClick={() => { update({ returnStatus: 'received' }); refresh(); }}>{t('退貨已簽收')}</button>
          <button onClick={() => { update({ refundStatus: 'sellerUnreachable', sellerUnreachable: true }); refresh(); }}>{t('賣家失聯')}</button>
          <button onClick={() => { update({ evidenceSaved: ['product-page-screenshot', 'order-payment-record', 'seller-chat-log', 'received-photos', 'return-shipping-proof', 'seller-signed-receipt'], evidenceScore: 90 }); refresh(); }}>{t('證據完整')}</button>
          <button onClick={() => { update({ evidenceSaved: [], evidenceScore: 0 }); refresh(); }}>{t('證據不足')}</button>
          <button onClick={() => { update({ reported: true }); refresh(); }}>{t('已聯絡 165')}</button>

          <h3>Reset</h3>
          <button onClick={() => { resetShoppingRoute(); refresh(); navigate('/scenario04-shopping/search'); }}>{t('重設目前路線')}</button>
          <button onClick={() => { resetShoppingAll(); refresh(); navigate('/scenario04-shopping'); }}>{t('清除 localStorage')}</button>
        </div>
      )}
    </>
  );
}
