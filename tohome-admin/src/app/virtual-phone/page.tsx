'use client';

import { useState, useEffect } from 'react';
import { Save, Phone, Shield, Clock, BarChart3, Loader2, Zap, Server } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { configApi } from '@/api/config';

// ---- 服务商定义 ----
type ProviderType = 'aliyun' | 'tencent' | 'cloopen' | 'huawei' | 'custom';

interface ProviderOption {
  value: ProviderType;
  label: string;
  desc: string;
  icon: 'cloud' | 'shield' | 'phone' | 'server' | 'zap';
  status: 'available' | 'deprecated' | 'coming';
}

const providers: ProviderOption[] = [
  { value: 'tencent', label: '腾讯云号码保护', desc: '腾讯云 NPP 隐私保护通话（推荐）', icon: 'shield', status: 'available' },
  { value: 'cloopen', label: '容联云双向回拨', desc: '容联云 DuoCall 双向回拨方案', icon: 'phone', status: 'available' },
  { value: 'aliyun', label: '阿里云隐私号码', desc: '阿里云号码隐私保护 AXB 分机模式', icon: 'cloud', status: 'deprecated' },
  { value: 'huawei', label: '华为隐私保护通话', desc: '华为云 Private Number 服务', icon: 'server', status: 'available' },
  { value: 'custom', label: '自定义服务商', desc: '接入其他第三方虚拟号码服务', icon: 'zap', status: 'available' },
];

// ---- Config 接口 ----
interface ProviderFields {
  // 阿里云
  aliyunAccessKey?: string;
  aliyunAccessSecret?: string;
  aliyunPoolKey?: string;
  aliyunCityCode?: string;
  // 腾讯云
  tencentSecretId?: string;
  tencentSecretKey?: string;
  tencentAppId?: string;
  tencentPoolId?: string;
  // 容联云
  cloopenAccountSid?: string;
  cloopenAuthToken?: string;
  cloopenAppId?: string;
  // 华为云
  huaweiAppKey?: string;
  huaweiAppSecret?: string;
  huaweiDomainName?: string;
  // 自定义
  customProviderName?: string;
  customApiEndpoint?: string;
  customAppKey?: string;
  customAppSecret?: string;
}

interface PhoneConfig extends ProviderFields {
  provider: ProviderType;
  recordingEnabled: boolean;
  bindTTL: number;
  maxBindsPerDay: number;
  noticeEnabled: boolean;
  noticeContent: string;
}

const defaultProviderFields: ProviderFields = {
  aliyunAccessKey: '', aliyunAccessSecret: '', aliyunPoolKey: '', aliyunCityCode: '0571',
  tencentSecretId: '', tencentSecretKey: '', tencentAppId: '', tencentPoolId: '',
  cloopenAccountSid: '', cloopenAuthToken: '', cloopenAppId: '',
  huaweiAppKey: '', huaweiAppSecret: '', huaweiDomainName: '',
  customProviderName: '', customApiEndpoint: '', customAppKey: '', customAppSecret: '',
};

const defaultConfig: PhoneConfig = {
  provider: 'aliyun',
  ...defaultProviderFields,
  recordingEnabled: true,
  bindTTL: 600,
  maxBindsPerDay: 1000,
  noticeEnabled: true,
  noticeContent: '您的通话将由平台录音，用于服务质量监督。',
};

// ---- Status badge ----
function StatusBadge({ status }: { status: ProviderOption['status'] }) {
  return (
    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
      status === 'available' ? 'bg-[#F6FFED] text-[#52C41A]'
        : status === 'deprecated' ? 'bg-[#FFF1F0] text-[#FF4D4F]'
        : 'bg-[#FFFBE6] text-[#FAAD14]'
    }`}>
      {status === 'available' ? '可用' : status === 'deprecated' ? '停止维护' : '即将上线'}
    </span>
  );
}

function ProviderIcon({ type }: { type: ProviderType }) {
  const p = providers.find((x) => x.value === type);
  const colorMap: Record<string, string> = {
    tencent: '#0052D9', cloopen: '#E23B3B', aliyun: '#FF6A00', huawei: '#CC0000', custom: '#6B7FD7',
  };
  const c = colorMap[type] || '#6B7FD7';
  const scale = 28;
  if (type === 'tencent') {
    return (
      <svg width={scale} height={scale} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill={c} />
        <path d="M7 17V7h3l2 6 2-6h3v10h-3v-6l-2 6h-1l-2-6v6H7z" fill="#fff" />
      </svg>
    );
  }
  if (type === 'cloopen') {
    return (
      <svg width={scale} height={scale} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill={c} />
        <path d="M6 17V7l4 2.5V7l4 2.5V7l4 2.5V17l-4-2.5V17l-4-2.5V17l-4-2.5z" fill="#fff" />
      </svg>
    );
  }
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: c }}>
      {type === 'aliyun' ? '阿' : type === 'huawei' ? '华' : '自'}
    </div>
  );
}

export default function VirtualPhonePage() {
  const [config, setConfig] = useState<PhoneConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    configApi.getPhoneConfig().then((res: any) => {
      if (res?.data) {
        setConfig({ ...defaultConfig, ...res.data });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configApi.savePhoneConfig(config as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await configApi.testPhoneConnection(config as any);
      setTestResult('success');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const updateField = <K extends keyof PhoneConfig>(key: K, value: PhoneConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const sel = providers.find((p) => p.value === config.provider);

  // ---- Provider-specific form fields ----
  const renderProviderFields = () => {
    switch (config.provider) {
      case 'aliyun':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AccessKey ID <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.aliyunAccessKey || ''} onChange={(e) => updateField('aliyunAccessKey', e.target.value)}
                placeholder="LTAI5t..." className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AccessKey Secret <span className="text-[#FF4D4F]">*</span></label>
              <input type="password" value={config.aliyunAccessSecret || ''} onChange={(e) => updateField('aliyunAccessSecret', e.target.value)}
                placeholder="输入 AccessKey Secret" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">号码池 Key (PoolKey) <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.aliyunPoolKey || ''} onChange={(e) => updateField('aliyunPoolKey', e.target.value)}
                placeholder="FC100000..." className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">区号</label>
              <select value={config.aliyunCityCode || '0571'} onChange={(e) => updateField('aliyunCityCode', e.target.value)}
                className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#FF6A00] outline-none">
                <option value="0571">0571 - 杭州</option><option value="0574">0574 - 宁波</option>
                <option value="0577">0577 - 温州</option><option value="010">010 - 北京</option>
                <option value="021">021 - 上海</option><option value="020">020 - 广州</option>
                <option value="0755">0755 - 深圳</option>
              </select>
            </div>
          </>
        );
      case 'tencent':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">SecretId <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.tencentSecretId || ''} onChange={(e) => updateField('tencentSecretId', e.target.value)}
                placeholder="AKIDxxxxxxxx" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#0052D9] focus:ring-1 focus:ring-[#0052D9] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">SecretKey <span className="text-[#FF4D4F]">*</span></label>
              <input type="password" value={config.tencentSecretKey || ''} onChange={(e) => updateField('tencentSecretKey', e.target.value)}
                placeholder="输入 SecretKey" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#0052D9] focus:ring-1 focus:ring-[#0052D9] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AppId <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.tencentAppId || ''} onChange={(e) => updateField('tencentAppId', e.target.value)}
                placeholder="1400xxxxxx" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#0052D9] focus:ring-1 focus:ring-[#0052D9] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">号码池 ID <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.tencentPoolId || ''} onChange={(e) => updateField('tencentPoolId', e.target.value)}
                placeholder="NPxxxxxxxx" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#0052D9] focus:ring-1 focus:ring-[#0052D9] outline-none" />
            </div>
          </>
        );
      case 'cloopen':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AccountSid <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.cloopenAccountSid || ''} onChange={(e) => updateField('cloopenAccountSid', e.target.value)}
                placeholder="aaf98f894f7..." className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#E23B3B] focus:ring-1 focus:ring-[#E23B3B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AuthToken <span className="text-[#FF4D4F]">*</span></label>
              <input type="password" value={config.cloopenAuthToken || ''} onChange={(e) => updateField('cloopenAuthToken', e.target.value)}
                placeholder="输入 AuthToken" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#E23B3B] focus:ring-1 focus:ring-[#E23B3B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AppId <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.cloopenAppId || ''} onChange={(e) => updateField('cloopenAppId', e.target.value)}
                placeholder="输入 AppId" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#E23B3B] focus:ring-1 focus:ring-[#E23B3B] outline-none" />
            </div>
            <div className="col-span-2">
              <div className="px-3 py-2 bg-[#FFF8F7] rounded-lg text-xs text-[#E23B3B]">
                💡 容联云采用「双向回拨」模式：用户和达人接听平台来电后互通，无需绑定中间号。
              </div>
            </div>
          </>
        );
      case 'huawei':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AppKey <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.huaweiAppKey || ''} onChange={(e) => updateField('huaweiAppKey', e.target.value)}
                placeholder="输入 AppKey" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AppSecret <span className="text-[#FF4D4F]">*</span></label>
              <input type="password" value={config.huaweiAppSecret || ''} onChange={(e) => updateField('huaweiAppSecret', e.target.value)}
                placeholder="输入 AppSecret" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">环境域名 <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.huaweiDomainName || ''} onChange={(e) => updateField('huaweiDomainName', e.target.value)}
                placeholder="https://rtcbss.xxx.myhuaweicloud.com" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] outline-none" />
            </div>
          </>
        );
      case 'custom':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">服务商名称 <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.customProviderName || ''} onChange={(e) => updateField('customProviderName', e.target.value)}
                placeholder="例如: 闪信、飞鸽传书..." className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">API 端点 <span className="text-[#FF4D4F]">*</span></label>
              <input type="text" value={config.customApiEndpoint || ''} onChange={(e) => updateField('customApiEndpoint', e.target.value)}
                placeholder="https://api.xxx.com/v1/bind" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AppKey / AppId</label>
              <input type="text" value={config.customAppKey || ''} onChange={(e) => updateField('customAppKey', e.target.value)}
                placeholder="输入 AppKey" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">AppSecret</label>
              <input type="password" value={config.customAppSecret || ''} onChange={(e) => updateField('customAppSecret', e.target.value)}
                placeholder="输入 AppSecret" className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
            </div>
          </>
        );
      default:
        return <div className="col-span-2 text-sm text-[#9CA3AF] py-4">请选择服务商</div>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">虚拟电话配置</h1>
          <p className="mt-1 text-sm text-gray-400">管理隐私通话保护服务，保护用户与达人的手机号隐私</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#6B7FD7] to-[#8B9FE8] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? '保存中...' : saved ? '已保存 ✓' : '保存配置'}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '今日通话次数', value: '328', icon: Phone, color: 'from-[#6B7FD7] to-[#8B9FE8]' },
          { label: '当前绑定数', value: '42', icon: Shield, color: 'from-[#52C41A] to-[#73D13D]' },
          { label: '号码池总数', value: '200', icon: BarChart3, color: 'from-[#FFB84D] to-[#FFD08A]' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#9CA3AF]">{item.label}</div>
                <div className="text-2xl font-bold text-[#1F2937] mt-1">{item.value}</div>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                <item.icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============ 服务商选择 ============ */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#F0F3FF] flex items-center justify-center">
            <Server size={20} className="text-[#6B7FD7]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">选择虚拟号码服务商</h2>
            <p className="text-xs text-[#9CA3AF]">选择接入哪家虚拟号码保护服务</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {providers.map((p) => (
            <button
              key={p.value}
              onClick={() => updateField('provider', p.value)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                config.provider === p.value
                  ? 'border-[#6B7FD7] bg-[#F0F3FF] shadow-sm'
                  : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              <div className="pt-0.5">
                <ProviderIcon type={p.value} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <span className="font-medium text-sm text-[#1F2937]">{p.label}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1">{p.desc}</p>
              </div>
              <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                config.provider === p.value ? 'border-[#6B7FD7] bg-[#6B7FD7]' : 'border-[#D1D5DB]'
              }`}>
                {config.provider === p.value && <span className="text-white text-[10px]">✓</span>}
              </div>
            </button>
          ))}
        </div>

        {sel?.status === 'deprecated' && (
          <div className="px-4 py-3 bg-[#FFF1F0] rounded-xl border border-[#FFCCC7]">
            <p className="text-sm text-[#FF4D4F]">
              ⚠️ <strong>阿里云隐私号码服务已停止新用户接入</strong>，存量用户也将逐步下线。建议切换到腾讯云或容联云。
            </p>
          </div>
        )}
      </div>

      {/* ============ 服务商配置参数 ============ */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <ProviderIcon type={config.provider} />
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">{sel?.label || '服务商配置'} 参数</h2>
              <p className="text-xs text-[#9CA3AF]">填写 {sel?.label} 的 API 配置信息</p>
            </div>
          </div>
          <button onClick={handleTest} disabled={testing}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-all ${
              testResult === 'success'
                ? 'bg-[#F6FFED] text-[#52C41A] border border-[#52C41A]'
                : testResult === 'fail'
                ? 'bg-[#FFF1F0] text-[#FF4D4F] border border-[#FF4D4F]'
                : 'bg-[#F0F3FF] text-[#6B7FD7] border border-[#6B7FD7] hover:bg-[#6B7FD7] hover:text-white'
            } disabled:opacity-60`}>
            {testing ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
            {testing ? '测试中...' : testResult === 'success' ? '✓ 连接成功' : testResult === 'fail' ? '✗ 连接失败' : '测试连接'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {renderProviderFields()}
        </div>
      </div>

      {/* ============ 通用绑定规则 ============ */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#F0FFF4] flex items-center justify-center">
            <Shield size={20} className="text-[#52C41A]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">绑定规则</h2>
            <p className="text-xs text-[#9CA3AF]">虚拟号码绑定参数配置（所有服务商通用）</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-[#F9FAFB]">
            <div className="text-xs text-[#9CA3AF] mb-2">绑定有效期</div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-[#1F2937]">{config.bindTTL}</span>
              <span className="text-sm text-[#9CA3AF] mb-1">秒</span>
            </div>
            <div className="text-xs text-[#9CA3AF] mt-2">≈ {Math.floor(config.bindTTL / 60)} 分钟</div>
            <input type="range" min="60" max="3600" step="60" value={config.bindTTL}
              onChange={(e) => updateField('bindTTL', parseInt(e.target.value))}
              className="w-full h-2 mt-3 bg-[#E5E7EB] rounded-lg cursor-pointer accent-[#6B7FD7]" />
          </div>

          <div className="p-4 rounded-xl bg-[#F9FAFB]">
            <div className="text-xs text-[#9CA3AF] mb-2">日最大绑定数</div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-[#1F2937]">{config.maxBindsPerDay.toLocaleString()}</span>
            </div>
            <div className="text-xs text-[#9CA3AF] mt-2">超出后排队等待</div>
            <input type="number" value={config.maxBindsPerDay}
              onChange={(e) => updateField('maxBindsPerDay', parseInt(e.target.value))}
              className="w-full mt-3 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] outline-none" />
          </div>

          <div className="p-4 rounded-xl bg-[#F9FAFB] flex flex-col justify-between">
            <div>
              <div className="text-xs text-[#9CA3AF] mb-2">通话录音</div>
              <div className="text-sm text-[#4B5563]">启用后所有通话将被录音保存</div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${config.recordingEnabled ? 'text-[#52C41A]' : 'text-[#9CA3AF]'}`}>
                {config.recordingEnabled ? '已启用' : '已关闭'}
              </span>
              <button onClick={() => updateField('recordingEnabled', !config.recordingEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${config.recordingEnabled ? 'bg-[#52C41A]' : 'bg-[#D1D5DB]'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${config.recordingEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-[#F3F4F6] pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#1F2937]">通话前提醒</div>
              <div className="text-xs text-[#9CA3AF] mt-1">接通前播放录音提示音</div>
            </div>
            <button onClick={() => updateField('noticeEnabled', !config.noticeEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${config.noticeEnabled ? 'bg-[#6B7FD7]' : 'bg-[#D1D5DB]'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${config.noticeEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4B5563] mb-1.5">提示语内容</label>
            <input type="text" value={config.noticeContent}
              onChange={(e) => updateField('noticeContent', e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none" />
          </div>
        </div>
      </div>

      {/* 工作流程 */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#E6F7FF] flex items-center justify-center">
            <Clock size={20} className="text-[#1677FF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">工作流程</h2>
            <p className="text-xs text-[#9CA3AF]">
              {config.provider === 'cloopen' ? '双向回拨隐私通话流程' : '隐私保护通话流程说明'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 py-6">
          {(config.provider === 'cloopen' ? [
            { label: '用户下单', desc: '订单创建后发起通话请求' },
            { label: '平台呼叫双方', desc: '平台分别拨打用户和达人' },
            { label: '双方接听互通', desc: '接听后平台桥接双方通话' },
            { label: '通话结束', desc: '挂断后自动结束本次通话' },
          ] : [
            { label: '用户下单', desc: '订单创建后系统自动分配中间号' },
            { label: 'AXB绑定', desc: `有效期${Math.floor(config.bindTTL / 60)}分钟` },
            { label: '隐私通话', desc: '双方通过中间号互相拨打' },
            { label: '自动解绑', desc: '服务完成后自动释放号码' },
          ]).map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#8B9FE8] flex items-center justify-center text-white text-xs font-bold">
                  {i + 1}
                </div>
                <div className="text-sm font-medium text-[#1F2937] mt-2">{step.label}</div>
                <div className="text-xs text-[#9CA3AF] mt-1 text-center">{step.desc}</div>
              </div>
              {i < 3 && <div className="w-12 h-0.5 bg-[#E5E7EB] mt-[-30px]" />}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
