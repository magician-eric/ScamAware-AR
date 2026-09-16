import { useParams } from 'react-router-dom';
import { FraudClueAnalysis } from '../../components/outcome/FraudClueAnalysis';
import { resetShoppingRoute } from '../../lib/shoppingStore';
import { useT } from './i18n';

// Screen 26 - 詐騙疑點分析. The teaching page analyses the SCAM, not the
// player: no score, no five-dimension rating, no personalised "what you did
// well / badly" write-up, and nothing folded away behind an accordion. The
// player reaches this straight from the結局 and reads all four red flags at
// once, then goes to the quiz.
//
// The four flags are per-route because the player only ever lived through one
// of the two products, so the first flag names what THAT listing actually
// claimed. The last three are the same trap in both runs - the refund stall,
// the shop going dark, and the off-platform transaction - because that is
// literally the same scam either way.
//
// The flags themselves are unchanged; what changed is that they no longer
// render inside BlackPi's own app shell (`blackpi-app`, `bp-*`), which carried
// the simulation past the結局. They render through the shared
// FraudClueAnalysis, which is CIBAR's own UI.
const SIGNALS = {
  // `health` = the 智慧掃拖機器人 route (legacy internal key, see
  // data/products.js).
  health: [
    {
      title: '商品資訊與實際收到內容明顯不符',
      text: '商品頁宣稱為智慧掃拖機器人，但實際收到的卻是完全不同的清潔用品。',
    },
    {
      title: '賣家以退貨流程持續拖延退款',
      text: '同意退貨不代表退款已經完成。賣家在收到退貨後仍不斷以驗收、確認等理由拖延。',
    },
    {
      title: '賣家失聯或賣場停止營業',
      text: '退款尚未完成時，賣家突然無法聯絡、賣場停止營業，是非常明顯的警訊。',
    },
    {
      title: '平台外交易缺乏平台保障',
      text: '如果付款或交易是在平台外完成，平台通常無法直接退款或賠償。發現疑似詐騙時應保留證據並盡快聯絡 165 或報案。',
    },
  ],
  // `luckyBag` = the VEXA FLEX X1 route (legacy internal key, see
  // apps/blackpi/data/catalog.js).
  luckyBag: [
    {
      title: '遠低於原價的「限時優惠」可能只是誘餌',
      text: '遠低於原價的限時優惠，可能利用價格吸引消費者忽略商品真偽與賣家資訊。購買前先確認商品規格、賣家資訊與交易保障，並保存商品頁面及賣家承諾。',
    },
    {
      title: '賣家以退貨流程持續拖延退款',
      text: '同意退貨不代表退款已經完成。賣家在收到退貨後仍不斷以驗收、確認等理由拖延。',
    },
    {
      title: '賣家失聯或賣場停止營業',
      text: '退款尚未完成時，賣家突然無法聯絡、賣場停止營業，是非常明顯的警訊。',
    },
    {
      title: '平台外交易缺乏平台保障',
      text: '如果付款或交易是在平台外完成，平台通常無法直接退款或賠償。發現疑似詐騙時應保留證據並盡快聯絡 165 或報案。',
    },
  ],
};

export function Ending() {
  const { route } = useParams();
  const t = useT();
  const signals = SIGNALS[route] || SIGNALS.health;

  return (
    <FraudClueAnalysis
      scenarioId="package"
      clues={signals.map(({ title, text }) => ({ title: t(title), note: t(text) }))}
      quizTo="/scenario04-shopping/quiz"
      // Unchanged: the route is banked as the player continues to the shared
      // anti-fraud quiz. This is the page's only flow control - no restart,
      // and no "go play the other product now" detour out of the ending.
      onContinue={resetShoppingRoute}
    />
  );
}
