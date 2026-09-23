// Seller's short acknowledgement chat right after the return request is
// submitted (spec section 19) - shared structure across both routes.

import { t } from '../../pages/scenario04/i18n';

const seller = (text, opts = {}) => ({ speaker: 'seller', text, ...opts });

export function buildReturnAckTree(route, lang, evidenceAssets = []) {
  const p = (id) => `${route}.returnAck.${id}`;
  return [
    {
      id: p('opening'),
      route,
      phase: 'return',
      messages: [
        ...evidenceAssets.map((assetKey) => ({ speaker: 'buyer', type: 'product-card', assetKey })),
        seller(t('我們已收到您的退貨申請。請將商品寄回，商品經倉庫驗收後，將依流程辦理退款。', lang)),
      ],
      // No "取得寄件編號" reply: the next screen hands the player their
      // shipping code anyway, so asking the seller for it here was a choice
      // that changed nothing.
      choices: [
        {
          id: 'confirmRefund',
          label: t('確認收到後會全額退款嗎？', lang),
          playerMessage: t('確認收到後會全額退款嗎？', lang),
          nextNodeId: p('confirmRefund'),
        },
      ],
    },
    {
      id: p('confirmRefund'),
      route,
      phase: 'return',
      messages: [seller(t('倉庫驗收符合條件後，會依平台流程退款。', lang))],
      onEnterEffects: { suspicion: 5, warningFlags: ['conditional_refund'] },
      autoNextNodeId: p('done'),
    },
    { id: p('done'), route, phase: 'return', messages: [], terminal: true },
  ];
}
