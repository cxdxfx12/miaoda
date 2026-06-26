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

const paymentReadAliases: Record<string, string> = {
  wechat_enabled: 'wechatEnabled',
  wechat_app_id: 'wechatAppId',
  wechat_mch_id: 'wechatMchId',
  wechat_api_key: 'wechatApiKey',
  wechat_api_v3_key: 'wechatApiV3Key',
  alipay_enabled: 'alipayEnabled',
  alipay_app_id: 'alipayAppId',
  alipay_private_key: 'alipayPrivateKey',
  alipay_public_key: 'alipayPublicKey',
  alipay_gateway: 'alipayGateway',
  alipay_gateway_url: 'alipayGateway',
  platform_fee_rate: 'platformFeeRate',
  commission_rate: 'platformFeeRate',
  min_withdraw: 'minWithdraw',
  withdraw_fee: 'withdrawFee',
  settle_cycle: 'settleCycle',
};

const phoneReadAliases: Record<string, string> = {
  aliyun_key: 'aliyunAccessKey',
  aliyun_secret: 'aliyunAccessSecret',
  pool_key: 'aliyunPoolKey',
  bind_expire: 'bindTTL',
  max_daily: 'maxBindsPerDay',
  aliyun_access_key: 'aliyunAccessKey',
  aliyun_access_secret: 'aliyunAccessSecret',
  aliyun_pool_key: 'aliyunPoolKey',
  aliyun_city_code: 'aliyunCityCode',
  tencent_secret_id: 'tencentSecretId',
  tencent_secret_key: 'tencentSecretKey',
  tencent_app_id: 'tencentAppId',
  tencent_pool_id: 'tencentPoolId',
  cloopen_account_sid: 'cloopenAccountSid',
  cloopen_auth_token: 'cloopenAuthToken',
  cloopen_app_id: 'cloopenAppId',
  huawei_app_key: 'huaweiAppKey',
  huawei_app_secret: 'huaweiAppSecret',
  huawei_domain_name: 'huaweiDomainName',
  custom_provider_name: 'customProviderName',
  custom_api_endpoint: 'customApiEndpoint',
  custom_app_key: 'customAppKey',
  custom_app_secret: 'customAppSecret',
  recording_enabled: 'recordingEnabled',
  pre_call_prompt: 'noticeContent',
};

export const configApi = {
  getMapConfig: () =>
    api.get('/api/v1/admin/config/map').then((res: any) => rowsToObject(res, mapReadAliases)),

  saveMapConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/map', stringifyValues(data, mapWriteAliases)),

  getPaymentConfig: () =>
    api.get('/api/v1/admin/config/payment').then((res: any) => rowsToObject(res, paymentReadAliases)),

  savePaymentConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/payment', stringifyValues(data)),

  getPhoneConfig: () =>
    api.get('/api/v1/admin/config/virtual_phone').then((res: any) => rowsToObject(res, phoneReadAliases)),

  savePhoneConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/virtual_phone', stringifyValues(data)),

  testPhoneConnection: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/phone/test', data),

  // 微信服务号配置
  getWechatConfig: () =>
    api.get('/api/v1/admin/config/wechat').then((res: any) => rowsToObject(res)),

  saveWechatConfig: (data: Record<string, unknown>) =>
    api.post('/api/v1/admin/config/wechat', stringifyValues(data)),
};
