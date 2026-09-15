// Shared config for scenario04: warning-flag copy (debug panel + ending
// analysis) and small route-dependent text tables so screens don't hardcode
// "if health else luckyBag" everywhere.

// Human-readable labels for every warningFlags value used across the
// dialogue trees - shown in the debug panel and folded into the ending's
// educational summary.
export const WARNING_FLAG_LABELS = {
  ask_label: '主動詢問商品規格與功能',
  vague_import_document: '賣家迴避提供實機操作證明',
  refuse_actual_photo: '賣家拒絕提供實際商品照片',
  changed_product_claim: '賣家事後更改商品規格說法',
  refuse_proof: '賣家拒絕提供功能或規格證明',
  premature_order_completion: '商品爭議尚未釐清就提前完成訂單',
  evidence_before_contact: '聯絡賣家前已先保存證據',
  undefined_brand: '賣家迴避說明合作品牌',
  unverifiable_value: '福袋價值宣稱無法查證',
  broad_brand_definition: '賣家擴大解釋「品牌商品」定義',
  image_for_reference: '賣家承認商品圖僅供參考',
  unverifiable_brand_claim: '賣家指稱的品牌商品無法查證',
  conditional_refund: '賣家僅承諾有條件退款',
  changing_return_terms: '賣家事後變更退貨承諾內容',
  contacted_165: '已聯絡 165 報案',
};

// Player-facing route names. `health` is a legacy internal key only - the
// product on that route is the 智慧掃拖機器人 (see data/products.js).
export const ROUTE_LABELS = {
  health: '智慧掃地機器人',
  luckyBag: '驚喜福袋',
};

// The image that stands for what the listing claimed, used by the unboxing
// 商品頁宣稱 vs 實際收到 comparison. One table so no screen has to pick its own
// stand-in, and so no separate "screenshot" asset has to be produced for
// something the repo already has. (退貨申請 used to show it as a second
// attachment too; it now attaches the four unboxing photos only.)
//
// For the lucky bag this is the gift-selection shot rather than the plain
// product photo: it is the image that actually sold the "超值" promise, so it
// is what the player believed they were buying.
export const LISTING_SCREENSHOT_ASSET = {
  health: 'robot-vacuum-main',
  luckyBag: 'luckybag-gift-selection',
};

// ---------------------------------------------------------------------------
// Evidence inventory - feeds the Ending's per-run analysis (see
// pages/scenario04/Ending.jsx#buildEvidenceNote). There is no longer a
// dedicated 證據整理 screen: the player never treats evidence-gathering as
// its own task, so this is read only after the fact, to explain what the
// run left the player holding.
// ---------------------------------------------------------------------------
// What the player actually has on hand by this point in the run, read
// entirely from state they already produced - the unboxing photo choice,
// what they attached to the return request, whether the chat log was kept,
// whether the return was signed for, whether a platform case exists.
//
// This deliberately replaces the old "save / partially save / skip" bulk
// actions: by the time a parcel has been returned and signed for, these
// records either exist or they don't, and no button on that screen can
// conjure a photo the player never took. A row is therefore never a task -
// it is a finding.
//
// status: 'complete' - on hand and usable
//         'incomplete' - the event happened but the record has a real gap
//         'pending' - that step hasn't happened yet in this run
const PAID_STATUSES = ['paid', 'preparing', 'shipped', 'shipping', 'delivered', 'completed'];
const RECEIVED_STATUSES = ['delivered', 'completed'];
const RETURN_SHIPPED_STATUSES = ['shipped', 'inTransit', 'received'];

// Whether the player is holding the unboxing photos. The asset list is the
// real artifact (Unboxing.jsx persists it as unboxingPhotoAssets); the
// evidenceSaved flag is accepted too so saves written before that list existed
// still read correctly.
export function hasUnboxingPhotos(state) {
  return Boolean(state.unboxingPhotoAssets?.length) || state.evidenceSaved.includes('received-photos');
}

export function buildEvidenceInventory(state) {
  const saved = state.evidenceSaved;
  const rows = [];

  rows.push({
    key: 'product-page-screenshot',
    label: '商品頁與訂單資料',
    ...(saved.includes('product-page-screenshot')
      ? { status: 'complete', statusLabel: '已保留完整截圖' }
      : state.orderId
        ? { status: 'complete', statusLabel: '訂單仍可查詢' }
        : { status: 'pending', statusLabel: '尚未下單' }),
  });

  rows.push({
    key: 'order-payment-record',
    label: '付款紀錄',
    ...(PAID_STATUSES.includes(state.orderStatus)
      ? { status: 'complete', statusLabel: '已保留' }
      : { status: 'pending', statusLabel: '尚未付款' }),
  });

  rows.push({
    key: 'seller-chat-log',
    label: '與賣家的對話',
    ...(saved.includes('seller-chat-log')
      ? { status: 'complete', statusLabel: '已保留完整紀錄' }
      : state.dialogueHistory.length > 0
        ? { status: 'complete', statusLabel: '可查詢' }
        : { status: 'pending', statusLabel: '尚未與賣家對話' }),
  });

  // Read from the photos themselves (unboxingPhotoAssets, written when the
  // unboxing grid is revealed) rather than only from the evidenceSaved flag.
  // The four shots are shown to the player at 收貨開箱 and again as real
  // thumbnails on the return request, so once they exist this row is simply
  // held - a save from an older build whose flag never got written must not
  // report a gap the player can see is not there.
  const hasPhotos = hasUnboxingPhotos(state);

  rows.push({
    key: 'received-photos',
    label: '開箱與實際收到商品照片',
    ...(hasPhotos
      ? { status: 'complete', statusLabel: '已保留' }
      : RECEIVED_STATUSES.includes(state.orderStatus)
        ? { status: 'incomplete', statusLabel: '未留存完整照片' }
        : { status: 'pending', statusLabel: '尚未收到商品' }),
  });

  // The return request attaches those same photos plus the listing shot, so a
  // filed return carries them by construction. Only a return filed with no
  // photos at all is still reported as a gap.
  rows.push({
    key: 'return-request-record',
    label: '退貨申請紀錄',
    ...(state.returnStatus === 'none'
      ? { status: 'pending', statusLabel: '尚未申請退貨' }
      : hasPhotos
        ? { status: 'complete', statusLabel: '已附於退貨申請' }
        : { status: 'incomplete', statusLabel: '未附商品照片' }),
  });

  rows.push({
    key: 'return-shipping-proof',
    label: '退貨物流與簽收紀錄',
    ...(state.returnStatus === 'received'
      ? { status: 'complete', statusLabel: '已取得' }
      : RETURN_SHIPPED_STATUSES.includes(state.returnStatus)
        ? { status: 'incomplete', statusLabel: '尚未確認賣家簽收' }
        : { status: 'pending', statusLabel: '尚未寄回商品' }),
  });

  return rows;
}

