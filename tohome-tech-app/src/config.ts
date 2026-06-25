// 应用配置
export const AppConfig = {
  API_BASE_URL: __DEV__
    ? 'http://localhost:8090/api/v1'
    : 'https://api.miaoda.cn/api/v1',
  WS_URL: __DEV__
    ? 'ws://localhost:8090/ws'
    : 'wss://api.miaoda.cn/ws',
  APP_NAME: '喵搭达人',
  APP_VERSION: '1.0.0',
  PAGE_SIZE: 20,
  AMAP_KEY: 'your-amap-key',
  // 后台定位上报间隔（毫秒）
  LOCATION_INTERVAL: 30000,
  // 后台定位距离阈值（米）
  LOCATION_DISTANCE: 50,
};

// 达人工作状态
export const WORK_STATUS = {
  OFFLINE: 0,
  ONLINE: 1,
  REST: 2,
} as const;

export const WORK_STATUS_TEXT: Record<number, string> = {
  0: '离线',
  1: '接单中',
  2: '休息中',
};

export const WORK_STATUS_COLORS: Record<number, string> = {
  0: '#9CA3AF',
  1: '#52C41A',
  2: '#FAAD14',
};
