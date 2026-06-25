// 应用配置
export const AppConfig = {
  API_BASE_URL: __DEV__
    ? 'http://localhost:8090/api/v1'
    : 'https://api.tohome.com/api/v1',
  WS_URL: __DEV__
    ? 'ws://localhost:8090/ws'
    : 'wss://api.tohome.com/ws',
  APP_NAME: '到家按摩',
  APP_VERSION: '1.0.0',
  PAGE_SIZE: 20,
  // 第三方配置
  AMAP_KEY: 'your-amap-key',
  WECHAT_APP_ID: 'your-wechat-app-id',
  JPUSH_APP_KEY: 'your-jpush-app-key',
};

// 用户端用户类型
export const USER_TYPE = {
  USER: 1,
  TECHNICIAN: 2,  // 达人
  ADMIN: 3,
} as const;

// 订单状态
export const ORDER_STATUS = {
  PENDING_PAYMENT: 0,
  PENDING_ACCEPT: 1,
  ACCEPTED: 2,
  IN_SERVICE: 3,
  COMPLETED: 4,
  CANCELLED: 5,
  REFUNDED: 6,
  DEPARTED: 7,
  ARRIVED: 8,
} as const;

export const ORDER_STATUS_TEXT: Record<number, string> = {
  0: '待支付',
  1: '待接单',
  2: '已接单',
  3: '服务中',
  4: '已完成',
  5: '已取消',
  6: '已退款',
  7: '已出发',
  8: '已到达',
};

// 支付方式
export const PAY_METHOD = {
  WECHAT: 1,
  ALIPAY: 2,
  BALANCE: 3,
} as const;

export const PAY_METHOD_TEXT: Record<number, string> = {
  1: '微信支付',
  2: '支付宝',
  3: '余额支付',
};
