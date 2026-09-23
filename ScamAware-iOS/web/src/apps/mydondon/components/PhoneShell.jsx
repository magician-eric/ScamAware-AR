import { useStageClassName } from '../../../shell/StageClassContext';

// The device frame only: fills the available viewport, safe areas included.
// It is deliberately NOT a shared visual shell - it carries no header, no
// navigation and no brand colour of its own, because scenario05 moves the
// player between several different worlds and each one has to own its
// chrome (spec section 39).
//
// `context` names which world the screen belongs to, and is the single
// switch every context-scoped style hangs off:
//   setup     - CIBAR scenario setup (商品選擇)
//   mydondon  - MyDonDon 買東東, the consumer marketplace app
//   hpefake  - SafeDeal, the fake external trading site the buyer links the
//               player to (data/scenario05FakeSite.js) - never 黑皮通, which
//               only ever renders through its own native app chrome
//               (HpeShell, see HpeShip.jsx)
//   bank      - a brief transitional "processing" beat before the fake
//               trading site fails to load (OrderGone.jsx)
//
// There is no `result` context any more: once the simulation ends the player
// leaves this shell entirely for CIBAR's own Outcome System
// (components/outcome/), which renders its own full-screen shell.
export function PhoneShell({ children, context = 'mydondon', className = '' }) {
  useStageClassName('go-stage');
  return <div className={`go-app go-ctx-${context} ${className}`.trim()}>{children}</div>;
}
