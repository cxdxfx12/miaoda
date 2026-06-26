import { api } from '@/lib/api';

const rowsToObject = (res: any, aliases: Record<string, string> = {}) => {
  const data = res?.data ?? res;
  if (!Array.isArray(data)) return res;
  const obj: Record<string, any> = {};
  data.forEach((item: any) => {
    const key = aliases[item.key] || item.key;
    obj[key] = item.value;
  });
  return { ...res, data: obj };
};

const stringifyValues = (data: Record<string, unknown>, aliases: Record<string, string> = {}) => {
  const result: Record<string, string> = {};
  Object.entries(data).forEach(([key, value]) => {
    result[aliases[key] || key] = String(value ?? '');
  });
  return result;
};

const mapReadAliases: Record<string, string> = {
  amap_key: 'amapKey',
  amap_secret: 'amapSecret',
  tencent_key: 'tencentKey',
  default_city: 'defaultCity',
  default_city_code: 'defaultCityCode',
  search_radius: 'searchRadius',
  cache_enabled: 'cacheEnabled',
  cache_ttl: 'cacheTTL',
};

const mapWriteAliases: Record<string, string> = {
  amapKey: 'amap_key',
  amapSecret: 'amap_secret',
  tencentKey: 'tencent_key',
  defaultCity: 'default_city',
  defaultCityCode: 'default_city_code',
  searchRadius: 'search_radius',
  cacheEnabled: 'cache_enabled',
  cacheTTL: 'cache_ttl',
};

export const configApi = {
  getMapConfig: () =>
    api.get('/api/v1/admin/config/map').then((res: any) => rowsToObject(res, mapReadAliases)),

  saveMapConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/map', stringifyValues(data, mapWriteAliases)),

  getPaymentConfig: () =>
    api.get('/api/v1/admin/config/payment').then((res: any) => rowsToObject(res)),

  savePaymentConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/payment', stringifyValues(data)),

  getPhoneConfig: () =>
    api.get('/api/v1/admin/config/phone').then((res: any) => rowsToObject(res)),

  savePhoneConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/phone', stringifyValues(data)),

  testPhoneConnection: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/phone/test', data),

  // 微信服务号配置
  getWechatConfig: () =>
    api.get('/api/v1/admin/config/wechat_mp').then((res: any) => rowsToObject(res)),

  saveWechatConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/wechat_mp', stringifyValues(data)),
};
