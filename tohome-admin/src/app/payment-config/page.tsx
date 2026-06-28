'use client';

import { useState, useEffect } from 'react';
import { Save, CreditCard, Banknote, Percent, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { configApi } from '@/api/config';

interface PaymentConfig {
  wechatEnabled: boolean;
  wechatAppId: string;
  wechatMchId: string;
  wechatApiKey: string;
  alipayEnabled: boolean;
  alipayAppId: string;
  alipayPrivateKey: string;
  alipayPublicKey: string;
  alipayGateway: string;
  platformFeeRate: number;
  minWithdraw: number;
  withdrawFee: number;
  settleCycle: string;
  autoWithdraw: boolean;
  autoWithdrawDay: number;
}

const defaultConfig: PaymentConfig = {
  wechatEnabled: true,
  wechatAppId: '',
  wechatMchId: '',
  wechatApiKey: '',
  alipayEnabled: true,
  alipayAppId: '',
  alipayPrivateKey: '',
  alipayPublicKey: '',
  alipayGateway: 'https://openapi.alipay.com/gateway.do',
  platformFeeRate: 20,
  minWithdraw: 100,
  withdrawFee: 0,
  settleCycle: 'T+7',
  autoWithdraw: true,
  autoWithdrawDay: 15,
};

export default function PaymentConfigPage() {
  const [config, setConfig] = useState<PaymentConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    configApi.getPaymentConfig().then((res: any) => {
      if (res?.data) {
        setConfig({ ...defaultConfig, ...res.data });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configApi.savePaymentConfig(config as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
        </div>
      ) : (
        <>
      <PageHeader
        tag="基础设施"
        title="支付配置"
        subtitle="配置微信支付、支付宝等支付渠道参数"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#6B7FD7] to-[#8B9FE8] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
          </button>
        }
      />

        {/* 微信支付 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F0FFF4] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#07C160">
                  <path d="M8.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3 4c-2.5 0-3.5-2-3.5-2h7s-1 2-3.5 2zM21 9.5A9.5 9.5 0 1111.5 0 9.5 9.5 0 0121 9.5z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">微信支付</h2>
                <p className="text-xs text-[#9CA3AF]">配置微信支付商户参数</p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, wechatEnabled: !config.wechatEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                config.wechatEnabled ? 'bg-[#52C41A]' : 'bg-[#D1D5DB]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                config.wechatEnabled ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>

          {config.wechatEnabled && (
            <div className="grid grid-cols-2 gap-4 border-t border-[#F3F4F6] pt-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AppID <span className="text-[#FF4D4F]">*</span></label>
                <input type="text" value={config.wechatAppId} onChange={(e) => setConfig({ ...config, wechatAppId: e.target.value })} placeholder="wx1234567890abcdef" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">商户号 (MchID) <span className="text-[#FF4D4F]">*</span></label>
                <input type="text" value={config.wechatMchId} onChange={(e) => setConfig({ ...config, wechatMchId: e.target.value })} placeholder="1234567890" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">API密钥 (V3) <span className="text-[#FF4D4F]">*</span></label>
                <input type="password" value={config.wechatApiKey} onChange={(e) => setConfig({ ...config, wechatApiKey: e.target.value })} placeholder="输入微信支付 API v3 密钥" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* 支付宝 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E6F7FF] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1677FF">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm2-12h-4c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">支付宝支付</h2>
                <p className="text-xs text-[#9CA3AF]">配置支付宝开放平台参数</p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, alipayEnabled: !config.alipayEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                config.alipayEnabled ? 'bg-[#52C41A]' : 'bg-[#D1D5DB]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                config.alipayEnabled ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>

          {config.alipayEnabled && (
            <div className="grid grid-cols-2 gap-4 border-t border-[#F3F4F6] pt-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">应用 AppID</label>
                <input type="text" value={config.alipayAppId} onChange={(e) => setConfig({ ...config, alipayAppId: e.target.value })} placeholder="2021001..." className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">网关地址</label>
                <input type="text" value={config.alipayGateway} onChange={(e) => setConfig({ ...config, alipayGateway: e.target.value })} className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">应用私钥</label>
                <textarea value={config.alipayPrivateKey} onChange={(e) => setConfig({ ...config, alipayPrivateKey: e.target.value })} rows={2} placeholder="-----BEGIN RSA PRIVATE KEY-----" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none resize-none font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">支付宝公钥</label>
                <textarea value={config.alipayPublicKey} onChange={(e) => setConfig({ ...config, alipayPublicKey: e.target.value })} rows={2} placeholder="-----BEGIN PUBLIC KEY-----" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none resize-none font-mono" />
              </div>
            </div>
          )}
        </div>

        {/* 平台分成 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF7E6] flex items-center justify-center">
              <Percent size={20} className="text-[#FAAD14]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">平台分成 & 提现规则</h2>
              <p className="text-xs text-[#9CA3AF]">设置平台抽成比例和达人提现规则</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-[#F9FAFB]">
              <div className="text-xs text-[#9CA3AF] mb-2">平台抽成</div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-[#1F2937]">{config.platformFeeRate}</span>
                <span className="text-sm text-[#9CA3AF] mb-1">%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={config.platformFeeRate}
                onChange={(e) => setConfig({ ...config, platformFeeRate: parseInt(e.target.value) })}
                className="w-full h-2 mt-3 bg-[#E5E7EB] rounded-lg cursor-pointer accent-[#6B7FD7]"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F9FAFB]">
              <div className="text-xs text-[#9CA3AF] mb-2">最低提现</div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-[#1F2937]">¥{config.minWithdraw}</span>
              </div>
              <input
                type="number"
                value={config.minWithdraw}
                onChange={(e) => setConfig({ ...config, minWithdraw: parseInt(e.target.value) })}
                className="w-full mt-3 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] outline-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F9FAFB]">
              <div className="text-xs text-[#9CA3AF] mb-2">提现手续费</div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-[#1F2937]">{config.withdrawFee}</span>
                <span className="text-sm text-[#9CA3AF] mb-1">%</span>
              </div>
              <input
                type="number"
                value={config.withdrawFee}
                onChange={(e) => setConfig({ ...config, withdrawFee: parseInt(e.target.value) })}
                className="w-full mt-3 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] outline-none"
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-6 border-t border-[#F3F4F6] pt-4">
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">结算周期</label>
              <select
                value={config.settleCycle}
                onChange={(e) => setConfig({ ...config, settleCycle: e.target.value })}
                className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] outline-none"
              >
                <option value="T+0">T+0（实时到账）</option>
                <option value="T+1">T+1（次日到账）</option>
                <option value="T+3">T+3</option>
                <option value="T+7">T+7</option>
                <option value="每月15号">每月15号</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-[#1F2937]">自动提现</div>
                <div className="text-xs text-[#9CA3AF] mt-1">
                  {config.autoWithdraw ? `每月${config.autoWithdrawDay}号自动结算` : '达人手动发起提现'}
                </div>
              </div>
              <button
                onClick={() => setConfig({ ...config, autoWithdraw: !config.autoWithdraw })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.autoWithdraw ? 'bg-[#6B7FD7]' : 'bg-[#D1D5DB]'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  config.autoWithdraw ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          </div>
        </div>
      </>
      )}
    </AdminLayout>
  );
}
