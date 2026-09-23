export const HPE_TRACKING_STEPS = Object.freeze([
  Object.freeze({ key: 'requested', label: '取得寄件編號' }),
  Object.freeze({ key: 'shipped', label: '物流已收件' }),
  Object.freeze({ key: 'inTransit', label: '配送中' }),
  Object.freeze({ key: 'received', label: '賣家已簽收' }),
]);

const STATUS_INDEX = Object.freeze({ requested: 0, evidenceUploaded: 0, shipped: 1, inTransit: 2, inTransit1: 2, received: 3 });

export const createHpeState = (shipments = []) => Object.freeze({ shipments: Object.freeze([...shipments]) });
export const getTrackingStepIndex = (status) => STATUS_INDEX[status] ?? 0;
export const getTrackingStep = (status) => HPE_TRACKING_STEPS[getTrackingStepIndex(status)];
