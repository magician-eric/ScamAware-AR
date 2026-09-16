import { FraudClueAnalysis } from '../../components/outcome/FraudClueAnalysis';
import { useT } from './i18n';

// 詐騙疑點分析 for the ghost-order scenario - the five stages of the trap, in
// the order the player met them.
//
// The last clue is written conditionally on purpose. All three結局 come
// through this page, and one of them belongs to a player who stopped before
// shipping: it names what shipping before payment can cost, rather than
// telling someone who did not ship that they did.
//
// This page renders CIBAR's own UI like every other scenario's analysis step -
// the simulation ended at the結局, so no PhoneShell and no result bar.
const CLUES = [
  {
    title: '誘導離開原平台',
    note: '假買家要求你離開原本的交易平台，改用他指定的外部網站。這讓你失去原平台交易紀錄的保護與查證依據。',
  },
  {
    title: '假付款資訊',
    note: '買家聲稱已付款，假網站也顯示交易資訊，但你始終沒有確認到可信的付款紀錄或實際入帳。',
  },
  {
    title: '假身分驗證',
    note: '假客服把無法收款歸咎於你的帳戶尚未認證，讓你以為問題出在自己身上，必須依照指示處理。',
  },
  {
    title: '可退還的驗證金',
    note: '假客服宣稱先轉帳一筆驗證金就能開通收款，並承諾全額退還。這是要求你先付錢的詐騙話術，不是真正的收款驗證。',
  },
  {
    title: '未入帳就寄件',
    note: '即使物流服務是真的，也不代表買家的付款是真的。尚未確認實際入帳就寄出商品，可能同時失去貨款與商品。',
  },
];

export function Reveal() {
  const t = useT();
  return (
    <FraudClueAnalysis
      scenarioId="order"
      lede={t('幽靈訂單是怎麼出現的？')}
      clues={CLUES.map(({ title, note }) => ({ title: t(title), note: t(note) }))}
      quizTo="/scenario05-atm/quiz"
    />
  );
}
