'use client';

import { useState, useEffect } from 'react';
import { Save, MessageCircle, Link, Loader2, Info, Copy, Check } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { configApi } from '@/api/config';

interface WechatConfig {
  enabled: boolean;
  appId: string;
  appSecret: string;
  token: string;
  encodingAesKey: string;
  redirectUri: string;
}

const defaultConfig: WechatConfig = {
  enabled: false,
  appId: '',
  appSecret: '',
  token: '',
  encodingAesKey: '',
  redirectUri: 'https://api.miaoda.cn/api/v1/auth/wechat/callback',
};

export default function WechatConfigPage() {
  const [config, setConfig] = useState<WechatConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    configApi.getWechatConfig().then((res: any) => {
      if (res?.data) {
        const map: Record<string, string> = res.data;
        setConfig({
          enabled: map.enabled === 'true',
          appId: map.app_id || '',
          appSecret: map.app_secret || '',
          token: map.token || '',
          encodingAesKey: map.encoding_aes_key || '',
          redirectUri: map.redirect_uri || defaultConfig.redirectUri,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configApi.saveWechatConfig({
        app_id: config.appId,
        app_secret: config.appSecret,
        token: config.token,
        encoding_aes_key: config.encodingAesKey,
        redirect_uri: config.redirectUri,
        enabled: config.enabled ? 'true' : 'false',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(config.redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const authUrl = config.appId
    ? `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`
    : '';

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">微信配置</h1>
              <p className="mt-1 text-sm text-gray-400">配置微信公众号/服务号，启用微信OAuth一键登录</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#07C160] to-[#06AD56] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
            </button>
          </div>

          {/* 连接状态卡片 */}
          {config.appId && config.appSecret ? (
            <div className="mb-6 p-4 rounded-xl bg-[#F0FFF4] border border-[#B7EB8F] flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#07C160] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={16} className="text-white" />
              </div>
              <div>
                <div className="font-medium text-[#135200]">微信服务号已配置</div>
                <div className="text-sm text-[#389E0D] mt-0.5">
                  AppID: {config.appId} &nbsp;|&nbsp; 登录功能{config.enabled ? '已启用' : '未启用'}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-[#FFF7E6] border border-[#FFD591] flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FAAD14] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info size={16} className="text-white" />
              </div>
              <div>
                <div className="font-medium text-[#AD6800]">尚未配置微信服务号</div>
                <div className="text-sm text-[#D48806] mt-0.5">
                  请填写公众号 AppID 和 AppSecret 以启用微信一键登录功能
                </div>
              </div>
            </div>
          )}

          {/* 基础配置 */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F0FFF4] flex items-center justify-center">
                  <MessageCircle size={20} className="text-[#07C160]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1F2937]">基础配置</h2>
                  <p className="text-xs text-[#9CA3AF]">微信公众号/服务号开发参数</p>
                </div>
              </div>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.enabled ? 'bg-[#52C41A]' : 'bg-[#D1D5DB]'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  config.enabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[#F3F4F6] pt-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">
                  AppID <span className="text-[#FF4D4F]">*</span>
                </label>
                <input
                  type="text"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  placeholder="wx1234567890abcdef"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#07C160] focus:ring-1 focus:ring-[#07C160] outline-none"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">在公众号后台「开发 → 基本配置」中获取</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">
                  AppSecret <span className="text-[#FF4D4F]">*</span>
                </label>
                <input
                  type="password"
                  value={config.appSecret}
                  onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
                  placeholder="输入公众号 AppSecret"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#07C160] focus:ring-1 focus:ring-[#07C160] outline-none font-mono"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">请妥善保管，勿泄露</p>
              </div>
            </div>
          </div>

          {/* OAuth回调配置 */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#E6F7FF] flex items-center justify-center">
                <Link size={20} className="text-[#1890FF]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">OAuth回调配置</h2>
                <p className="text-xs text-[#9CA3AF]">用户授权后微信回调的地址，需在公众号后台配置一致</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">
                回调域名（redirect_uri）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.redirectUri}
                  onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                  className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#1890FF] focus:ring-1 focus:ring-[#1890FF] outline-none font-mono"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check size={16} className="text-[#52C41A]" /> : <Copy size={16} />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1">
                将此地址填入公众号后台「接口权限 → 网页授权 → 修改」中的授权回调域名
              </p>
            </div>

            {authUrl && (
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <div className="text-xs font-medium text-[#6B7280] mb-2">OAuth授权链接（测试用）</div>
                <div className="text-xs text-[#9CA3AF] break-all font-mono bg-white p-3 rounded border">
                  {authUrl}
                </div>
              </div>
            )}
          </div>

          {/* 消息配置 */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#FFF0F6] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#EB2F96">
                  <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 0v12h16V6H4zm3 3h10v2H7V9zm0 4h7v2H7v-2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">消息配置</h2>
                <p className="text-xs text-[#9CA3AF]">服务器URL验证及消息加解密参数</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">
                  Token（令牌）
                </label>
                <input
                  type="text"
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  placeholder="自行设置，3-32位字符"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">
                  EncodingAESKey（消息加解密密钥）
                </label>
                <input
                  type="text"
                  value={config.encodingAesKey}
                  onChange={(e) => setConfig({ ...config, encodingAesKey: e.target.value })}
                  placeholder="43位字符，可随机生成"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 接入指引 */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#F6FFED] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#52C41A">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">接入指引</h2>
                <p className="text-xs text-[#9CA3AF]">按照以下步骤完成微信公众号OAuth登录接入</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { step: 1, title: '获取公众号参数', desc: '登录微信公众平台 → 开发 → 基本配置 → 获取 AppID 和 AppSecret，填入上方表单。' },
                { step: 2, title: '配置IP白名单', desc: '在「基本配置」中将服务器IP加入白名单，否则API调用会被拒绝。' },
                { step: 3, title: '设置OAuth回调域名', desc: '进入「接口权限 → 网页授权获取用户基本信息 → 修改」，填入上方的回调域名（仅填域名，不含路径）。' },
                { step: 4, title: '保存并启用', desc: '点击右上角「保存配置」按钮，将开关切换为启用状态。' },
                { step: 5, title: '测试登录', desc: '在用户端App中点击「微信登录」按钮，扫码授权后即可自动创建/登录账号。' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 p-4 bg-[#F9FAFB] rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-[#6B7FD7] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <div className="font-medium text-[#1F2937] text-sm">{item.title}</div>
                    <div className="text-xs text-[#6B7280] mt-1">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
