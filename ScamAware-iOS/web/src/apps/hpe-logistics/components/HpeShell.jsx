import { hpeBrandLabel } from '../brand';
import { HpeLogo } from './HpeLogo';
import { getLang, useT } from '../i18n';

// `title` is content - what this particular screen is about - so a host
// supplies it. `backLabel` is chrome, so HPE names it itself and a host only
// overrides it when its own screen calls the gesture something else.
export function HpeShell({ children, title, onBack, backLabel, backDisplayOnly = false }) {
  const t = useT();
  const back = backLabel ?? t('返回');
  return (
    <section className="hpe-shell" aria-label={hpeBrandLabel(getLang())}>
      <header className="hpe-header">
        {onBack ? (
          <button type="button" className="hpe-header__back" onClick={onBack} aria-label={back}>‹</button>
        ) : backDisplayOnly ? (
          <span className="hpe-header__back hpe-header__back--display" aria-hidden="true">‹</span>
        ) : <span />}
        <div className="hpe-header__brand"><HpeLogo height={30} /></div>
        <span className="hpe-header__spacer" />
      </header>
      {title && <div className="hpe-shell__title">{title}</div>}
      <main className="hpe-shell__content">{children}</main>
    </section>
  );
}
