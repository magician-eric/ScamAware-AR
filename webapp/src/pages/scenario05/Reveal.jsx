import { FraudClueAnalysis } from '../../components/outcome/FraudClueAnalysis';
import { useScenario05State } from '../../lib/scenario05Store';
import { useT } from './i18n';

// 詐騙疑點分析 for the ghost-order scenario - the five stages of the trap, in
// the order the player met them.
//
// All three結局 arrive here, and they did not all live through the same run.
// A player who stopped the moment MyDonDon showed no order never reached the
// fake support desk at all, so the last three clues are not their story: they
// are what the scammer had lined up next. Telling them otherwise would teach
// the wrong lesson twice over - it would credit them with spotting a trap they
// never saw, and it would describe a transfer and a parcel that never
// happened.
//
// So the split is read off this run's own state and nothing else (see
// lib/scenario05Store.js - no second source of truth is introduced here):
//
//   verificationStatus === 'notStarted'  the demand was never put to them, so
//                                        clues 1-2 are what they lived through
//                                        and 3-5 are labelled as the tactics
//                                        the scammer would have used next
//   anything else ('requested' /         they met the fake support desk, so
//   'refused' / 'completed')             all five clues are their own run
//
// Clue 2 is written the same way for the same reason. It rests on what every
// run really saw - the buyer's claim, and MyDonDon with no such order - and
// deliberately says nothing about the fake site's own "transaction
// information", which a player who stopped at the missing order never opened.
//
// Clue 5 is written the same way on every path on purpose too: it names what
// shipping before payment CAN cost, never that this player shipped. A run that
// paid the deposit and then stopped reads it as the loss they avoided, not as
// one they took.
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
    note: '買家聲稱已經付款，但買東東沒有這筆訂單，你也沒有確認到可信的付款紀錄或實際入帳。對方提供的付款說法不能當作收款證明。',
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

// The clues everyone reaches: the platform switch and the payment that was
// only ever a claim. Everything after these two happens on the fake site.
const LIVED_THROUGH_BY_EVERY_RUN = 2;

export function Reveal() {
  const t = useT();
  const [state] = useScenario05State();
  // 'notStarted' is the one value that means the fake support desk never got
  // as far as asking: the player stopped at the missing order.
  const metTheFakeSupport = state.verificationStatus !== 'notStarted';

  const clues = CLUES.map(({ title, note }, index) => {
    const heading = t(title);
    const upcoming = !metTheFakeSupport && index >= LIVED_THROUGH_BY_EVERY_RUN;
    return {
      title: upcoming ? t('詐騙者後續可能使用的手法：{clue}', { clue: heading }) : heading,
      note: t(note),
    };
  });

  return (
    <FraudClueAnalysis
      scenarioId="order"
      lede={t('幽靈訂單是怎麼出現的？')}
      clues={clues}
      quizTo="/scenario05-atm/quiz"
    />
  );
}
