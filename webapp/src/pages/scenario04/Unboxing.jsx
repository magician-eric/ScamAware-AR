import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import { AssetImage } from '../../apps/blackpi';
import { ClaimVsActual } from './components/ClaimVsActual';
import { applyEffects, saveShoppingState } from '../../lib/shoppingStore';
import { LISTING_SCREENSHOT_ASSET } from '../../data/scenarioConfig';
import { feedback } from '../../lib/feedback';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// `health` and `luckyBag` are the legacy internal route keys for the
// 智慧掃拖機器人 and VEXA FLEX X1 stories - see the note at the top of
// apps/blackpi/data/catalog.js.
//
// Only `health` has a stage-2 (first look) beat, so only `health` has a line
// and an asset for it: openPackage() below takes the VEXA route straight from
// the parcel to all four photos, which it has always done.
const FIRST_ANOMALY_LINE = {
  health: '箱子裡好像不是機器人。',
};

// Stage 1 (the parcel) and Stage 2 (first look) each use a distinct asset, so
// "拆開外箱" visibly changes the picture instead of looking like a no-op tap.
const STAGE1_ASSET = { health: 'robot-vacuum-package', luckyBag: 'vexa-flex-x1-actual-unboxing' };
const STAGE2_ASSET = { health: 'robot-vacuum-unboxed' };

// The four unboxing photos per route, shown all at once in a 2x2 grid.
//
// Both routes deliberately use the same presentation. The robot vacuum used
// to reveal its items one tap at a time ("繼續查看" / "還有 X 項尚未查看"),
// which made the player click through a conclusion they had already been
// handed - the punchline is the mismatch, not the pacing. The captions are
// plain labels rather than the old positional prose ("最上面…底下…再往下"),
// because nothing is sequential once all four are on screen together.
const REVEAL_ITEMS = {
  health: [
    { key: 'robot-vacuum-broom-head', text: '掃把頭' },
    { key: 'robot-vacuum-broom-poles', text: '可拆式掃把桿' },
    { key: 'robot-vacuum-dustpan', text: '畚箕' },
    { key: 'robot-vacuum-actual', text: '實際收到的掃把與畚箕' },
  ],
  // The parcel's three product shots first, then the opened box. Order
  // matters: 正面 / 轉軸 / 摺疊背面 is the order the return reason and the
  // platform complaint both name them in. All four are what the player keeps,
  // and therefore what the return request attaches.
  luckyBag: [
    { key: 'vexa-flex-x1-actual-main', text: '實際收到的雙機身手機' },
    { key: 'vexa-flex-x1-actual-hinge', text: '中間的塑膠轉軸' },
    { key: 'vexa-flex-x1-actual-folded', text: '摺疊背面的兩個 Micro USB 充電孔' },
    { key: 'vexa-flex-x1-actual-unboxing', text: '包裹裡的實際內容物' },
  ],
};

const REVEAL_HEADLINE = {
  health: '把東西全部拿出來後，箱子裡只有這些東西。',
  luckyBag: '等等……這是兩支手機接在一起的？',
};

// The line under the grid. Per route because what the photos show is not the
// same kind of mismatch: the robot vacuum simply is not in the box, while the
// VEXA parcel does hold a "foldable" - two phones on a plastic hinge.
const REVEAL_REACTION = {
  health: '這和商品頁展示的內容差太多了。',
  luckyBag: '這根本是兩支獨立手機，中間用塑膠轉軸接起來的！',
};

// Stage 4 - 商品頁宣稱 vs 實際收到. Built from real photos plus these
// translated rows by components/blackpi/ClaimVsActual.jsx; deliberately NOT
// a pre-rendered comparison image, so CN/EN/JP all read natively.
const COMPARE = {
  health: {
    claimAssetKey: LISTING_SCREENSHOT_ASSET.health,
    actualAssetKey: 'robot-vacuum-actual',
    rows: [
      { claim: '智慧掃拖機器人', actual: '可拆式掃把＋畚箕' },
      { claim: '智慧導航', actual: '無' },
      { claim: 'APP 遠端控制', actual: '無' },
      { claim: '自動回充', actual: '無' },
      { claim: '掃拖二合一', actual: '手動清掃工具' },
    ],
  },
  luckyBag: {
    claimAssetKey: LISTING_SCREENSHOT_ASSET.luckyBag,
    actualAssetKey: 'vexa-flex-x1-actual-main',
    rows: [
      { claim: '8.7 吋旗艦摺疊大螢幕', actual: '兩支獨立手機的螢幕' },
      { claim: '一體成型摺疊機身', actual: '塑膠轉軸拼接' },
      { claim: '旗艦三鏡頭', actual: '兩組低階相機' },
      { claim: '512GB／5G', actual: '規格與商品頁不符' },
      { claim: '機身底部 USB-C 充電埠', actual: '兩個獨立 Micro USB 充電孔' },
    ],
  },
};

// Screen 11 - 收貨開箱. Both routes show all four unboxing photos at once.
export function Unboxing() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const t = useT();
  const [stage, setStage] = useState('package');
  const items = REVEAL_ITEMS[route] || [];
  const compare = COMPARE[route];

  // The photos the player has now seen with their own eyes. Persisted rather
  // than kept in component state only, because the return-request flow needs
  // to offer these exact shots as attachable evidence later, and the player
  // can leave this screen (or refresh) in between.
  //
  // Holding the photos is recorded here rather than behind a later "save the
  // photos" choice. The four shots exist from this moment on, and they exist
  // before the player contacts anyone - so `received-photos` (which has no
  // fallback in buildEvidenceInventory, unlike 商品頁, which is recoverable
  // from the order) and `evidence_before_contact` are both simply true now.
  function revealAll() {
    saveShoppingState({ unboxingPhotoAssets: items.map((item) => item.key) });
    applyEffects({ evidence: 10, evidenceSaved: ['received-photos'], warningFlags: ['evidence_before_contact'] });
    setStage('reveal');
    feedback('anomaly');
  }

  function openPackage() {
    if (route === 'luckyBag') {
      revealAll();
      return;
    }
    setStage('firstAnomaly');
  }

  function finish() {
    applyEffects({ evidence: 2 });
    // The player is opening a dispute here, not finishing the order - see
    // shoppingStore.js's correctStaleCompletedOrder() for why this must
    // never be 'completed'.
    saveShoppingState({ orderStatus: 'delivered', disputeStatus: 'opened' });
    navigate(`/scenario04-shopping/dispute-chat/${route}`);
  }

  // AR Interaction Contract: 收貨開箱 is four one-action beats in a row -
  // 拆開外箱, 把東西全部拿出來看看, 查看商品頁與實際內容, 先問賣家是不是寄錯了 -
  // so every stage is `single`. The 2x2 photo grid and the claim-vs-actual
  // table are evidence to read, not controls.
  useARInteraction({
    mode: 'single',
    surfaceId: `scenario04/unboxing/${stage}`,
    action: stage === 'package'
      ? openPackage
      : stage === 'firstAnomaly'
        ? revealAll
        : stage === 'reveal'
          ? () => setStage('compare')
          : finish,
  });

  return (
    <div className="blackpi-app bp-physical-world">
      <div className="bp-scroll bp-page bp-unboxing-stage" style={{ paddingTop: 24 }}>
        {stage === 'package' && (
          <div style={{ textAlign: 'center' }}>
            <AssetImage assetKey={STAGE1_ASSET[route]} className="bp-photo-block" priority />
            <h1 className="bp-h1 bp-section">{t('包裹已送達')}</h1>
            <button type="button" className="bp-btn bp-btn-block bp-section" onClick={openPackage}>{t('拆開外箱')}</button>
          </div>
        )}

        {stage === 'firstAnomaly' && (
          <div className="bp-reveal-item-in">
            <AssetImage assetKey={STAGE2_ASSET[route]} className="bp-photo-block" priority />
            <h1 className="bp-h1 bp-section">{t(FIRST_ANOMALY_LINE[route])}</h1>
            {/* One CTA, not a two-up choice grid: "先拍下這個狀況" advanced to
                the exact same screen, so it was a second option that changed
                nothing the player could see. Keeping evidence-gathering as a
                real decision belongs at the 商品頁宣稱 vs 實際收到 step below,
                where it actually branches. */}
            <button type="button" className="bp-btn bp-btn-block bp-section" onClick={revealAll}>
              {t('把東西全部拿出來看看')}
            </button>
          </div>
        )}

        {stage === 'reveal' && (
          <div className="bp-unboxing-result bp-reveal-item-in">
            <h1 className="bp-h1">{t(REVEAL_HEADLINE[route])}</h1>
            <div className="bp-unboxing-grid bp-section">
              {items.map((item) => (
                <figure key={item.key} className="bp-unboxing-item">
                  <figcaption>{t(item.text)}</figcaption>
                  <AssetImage assetKey={item.key} className="bp-unboxing-thumb" />
                </figure>
              ))}
            </div>
            <p className="bp-muted bp-unboxing-reaction">{t(REVEAL_REACTION[route])}</p>
            <button type="button" className="bp-btn bp-btn-block" onClick={() => setStage('compare')}>
              {t('查看商品頁與實際內容')} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {stage === 'compare' && compare && (
          <div>
            <h1 className="bp-h1">{t('商品頁宣稱 vs 實際收到')}</h1>
            <div className="bp-card bp-section">
              <ClaimVsActual
                claimAssetKey={compare.claimAssetKey}
                actualAssetKey={compare.actualAssetKey}
                rows={compare.rows}
              />
            </div>
            <p className="bp-chat-choices-prompt bp-section" style={{ margin: '0 0 8px' }}>{t('你準備怎麼處理？')}</p>
            {/* One CTA: "先把商品頁和開箱照片留著" asked the player to save
                material they already hold - the 商品頁 is recoverable from the
                order, and the four unboxing photos were kept at reveal above. */}
            <button type="button" className="bp-btn bp-btn-block" onClick={finish}>
              {t('先問賣家是不是寄錯了')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
