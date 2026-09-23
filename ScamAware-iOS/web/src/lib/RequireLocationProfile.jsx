import { getLanguage } from './lang';
import { isLocationProfileLocked } from './location/LocationProfileStore';

// The one thing this guard ever says to a player. It is on the player's side
// of the door - a visitor handed a device staff never set up reads it - so it
// is not covered by the zh-TW-only rule that applies to the staff screens
// behind that door (AD-13).
const NOT_SET_UP = {
  zh: {
    title: '此情境尚未完成場地設定',
    body: '請洽現場工作人員完成所在地初始化後再開始體驗。',
  },
  en: {
    title: 'This scenario has not been set up for this venue yet',
    body: 'Please ask a member of staff to finish the location setup before starting.',
  },
  jp: {
    title: 'このシナリオはこの会場向けの設定が未完了です',
    body: '体験を始める前に、スタッフに所在地の初期設定を完了してもらってください。',
  },
};

// Gate for 假檢警 (scenario03-police) only - the one scenario that actually
// reads locationProfile (spec section 10). Every other scenario has nothing
// to gate: they don't use location data, and per spec section 2, the
// system must never surface a location prompt to a player mid-scenario.
// If staff haven't locked a profile yet, this shows a plain "see staff"
// message instead of the scenario - it deliberately does NOT offer a
// player-facing way to set location themselves (spec: "不要讓一般玩家看到
// 「選擇縣市」或「重新定位」按鈕").
export function RequireLocationProfile({ children }) {
  if (!isLocationProfileLocked()) {
    const copy = NOT_SET_UP[getLanguage()] ?? NOT_SET_UP.zh;
    return (
      <section className="hero">
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
      </section>
    );
  }
  return children;
}
