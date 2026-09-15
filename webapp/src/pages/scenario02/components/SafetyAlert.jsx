import { useEffect } from 'react';
import { FraudWarningBanner } from '../../../components/warnings/FraudWarningBanner';
import { useT } from '../i18n';

// Compatibility adapter for story triggers. A warning never occupies chat
// layout or waits for acknowledgement; the story callback advances on its
// own tick while the shared banner runs its independent display timer.
export function SafetyAlert({ text, acknowledged, onAcknowledge }) {
  const t = useT();
  useEffect(() => {
    if (!acknowledged) onAcknowledge?.();
  }, [acknowledged, onAcknowledge]);
  return <FraudWarningBanner active={!acknowledged} theme="chat" severity="notice" title={t('安全提醒')} body={text} />;
}
