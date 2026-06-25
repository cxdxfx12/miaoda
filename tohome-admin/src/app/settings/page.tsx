'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Save, Bell, Shield, Globe, Database, Server, MessageSquare, Loader2, Headphones, Percent, Car } from 'lucide-react';
import { settingsApi } from '@/api';

const sections = [
  { id: 'basic', name: '基础设置', icon: Globe },
  { id: 'notify', name: '消息通知', icon: Bell },
  { id: 'support', name: '咨询客服', icon: Headphones },
  { id: 'commission', name: '达人分成', icon: Percent },
  { id: 'travel_fee', name: '车费规则', icon: Car },
  { id: 'security', name: '安全设置', icon: Shield },
  { id: 'database', name: '数据备份', icon: Database },
  { id: 'server', name: '服务监控', icon: Server },
  { id: 'sms', name: '短信/推送', icon: MessageSquare },
];

interface ConfigItem { key: string; value: string; remark: string; }
interface ServiceInfo { name: string; status: string; cpu: number; memory: number; host: string; }

export default function SettingsPage() {
  const [active, setActive] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServiceInfo[]>([]);
  const [serverLoading, setServerLoading] = useState(false);

  useEffect(() => {
    if (active === 'server') { loadServerStatus(); return; }
    if (active === 'database') return; // backups use separate endpoint
    loadConfig(active);
  }, [active]);

  async function loadConfig(group: string) {
    setLoading(true);
    try {
      const endpoint = group === 'basic' ? settingsApi.getBasic() :
        group === 'notify' ? settingsApi.getNotify() :
        group === 'support' ? settingsApi.getSupport() :
        group === 'commission' ? settingsApi.getCommission() :
        group === 'travel_fee' ? settingsApi.getTravelFee() :
        group === 'security' ? settingsApi.getSecurity() :
        settingsApi.getBasic();
      const res: any = await endpoint;
      const items: ConfigItem[] = (res?.data || res || []);
      const map: Record<string, string> = {};
      (Array.isArray(items) ? items : []).forEach((item: ConfigItem) => { map[item.key] = item.value; });
      if (group === 'support') {
        map.support_mode = map.support_mode || 'page';
        map.support_url = map.support_url || '/support';
        map.support_phone = map.support_phone || '';
        map.support_title = map.support_title || '在线客服';
        map.support_desc = map.support_desc || '咨询订单、退款、预约和平台规则等问题';
      }
      if (group === 'commission') {
        map.commission_mode = map.commission_mode || 'monthly_revenue_tier';
        map.tier_1_threshold = map.tier_1_threshold || '0';
        map.tier_1_rate = map.tier_1_rate || '70';
        map.tier_2_threshold = map.tier_2_threshold || '5000';
        map.tier_2_rate = map.tier_2_rate || '75';
        map.tier_3_threshold = map.tier_3_threshold || '10000';
        map.tier_3_rate = map.tier_3_rate || '80';
        map.tier_4_threshold = map.tier_4_threshold || '20000';
        map.tier_4_rate = map.tier_4_rate || '85';
        map.settlement_scope = map.settlement_scope || 'service_amount_only';
      }
      if (group === 'travel_fee') {
        map.enabled = map.enabled || '1';
        map.price_per_km = map.price_per_km || '2';
        map.round_trip = map.round_trip || '1';
        map.min_fee = map.min_fee || '0';
        map.free_km = map.free_km || '0';
        map.refund_lock_status = map.refund_lock_status || 'departed';
        map.refund_policy = map.refund_policy || '出发前服务费和车费均可退；达人出发后车费不退，服务项目金额可按退款规则退。';
      }
      setConfigData(map);
    } catch { /* backend unavailable, using defaults */ }
    finally { setLoading(false); }
  }

  async function saveConfig(group: string) {
    setSaving(true);
    try {
      const endpoint = group === 'basic' ? (settingsApi.saveBasic as any) :
        group === 'notify' ? (settingsApi.saveNotify as any) :
        group === 'support' ? (settingsApi.saveSupport as any) :
        group === 'commission' ? (settingsApi.saveCommission as any) :
        group === 'travel_fee' ? (settingsApi.saveTravelFee as any) :
        (settingsApi.saveSecurity as any);
      await endpoint(configData);
      if (group === 'basic') {
        window.dispatchEvent(new CustomEvent('admin-basic-settings-saved', { detail: configData.service_phone || '' }));
      }
      alert('保存成功');
    } catch { alert('保存失败（后端未连接）'); }
    finally { setSaving(false); }
  }

  async function loadServerStatus() {
    setServerLoading(true);
    try {
      const res: any = await settingsApi.getServerStatus();
      setServerStatus((res?.data || res || []));
    } catch { /* backend unavailable, using empty status */ }
    finally { setServerLoading(false); }
  }

  async function handleBackup() {
    try {
      await settingsApi.createBackup();
      alert('备份已完成');
    } catch { alert('备份失败（后端未连接）'); }
  }

  const updateField = (key: string, value: string) => {
    setConfigData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (label: string, key: string, type = 'text') => (
    <div key={key}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {type === 'textarea' ? (
        <textarea value={configData[key] || ''} onChange={e => updateField(key, e.target.value)}
          rows={3} className="w-full rounded-md border border-[#EEF1F6] bg-white px-3 py-2 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20" />
      ) : (
        <input type={type} value={configData[key] || ''} onChange={e => updateField(key, e.target.value)}
          className="h-10 w-full rounded-md border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20" />
      )}
    </div>
  );

  const defaultConfigs: Record<string, { label: string; key: string; type?: string }[]> = {
    basic: [
      { label: '平台名称', key: 'platform_name' },
      { label: '客服电话', key: 'service_phone' },
      { label: '客服邮箱', key: 'service_email' },
      { label: 'ICP备案号', key: 'icp_number' },
      { label: '平台简介', key: 'description', type: 'textarea' },
    ],
    notify: [
      { label: '邮件通知地址', key: 'email' },
      { label: 'Webhook URL', key: 'webhook' },
      { label: '订单推送(0/1)', key: 'order_push' },
      { label: '退款通知(0/1)', key: 'refund_notify' },
      { label: '系统告警(0/1)', key: 'system_alert' },
    ],
    support: [
      { label: '打开方式(page/phone/link)', key: 'support_mode' },
      { label: '客服页面或外链地址', key: 'support_url' },
      { label: '客服电话', key: 'support_phone' },
      { label: '客服标题', key: 'support_title' },
      { label: '说明文案', key: 'support_desc', type: 'textarea' },
    ],
    commission: [
      { label: '分成模式', key: 'commission_mode' },
      { label: '档位1营业额门槛', key: 'tier_1_threshold', type: 'number' },
      { label: '档位1达人分成比例(%)', key: 'tier_1_rate', type: 'number' },
      { label: '档位2营业额门槛', key: 'tier_2_threshold', type: 'number' },
      { label: '档位2达人分成比例(%)', key: 'tier_2_rate', type: 'number' },
      { label: '档位3营业额门槛', key: 'tier_3_threshold', type: 'number' },
      { label: '档位3达人分成比例(%)', key: 'tier_3_rate', type: 'number' },
      { label: '档位4营业额门槛', key: 'tier_4_threshold', type: 'number' },
      { label: '档位4达人分成比例(%)', key: 'tier_4_rate', type: 'number' },
      { label: '结算范围', key: 'settlement_scope' },
    ],
    travel_fee: [
      { label: '是否启用(0/1)', key: 'enabled', type: 'number' },
      { label: '每公里车费(元)', key: 'price_per_km', type: 'number' },
      { label: '是否往返计费(0/1)', key: 'round_trip', type: 'number' },
      { label: '起步车费(元)', key: 'min_fee', type: 'number' },
      { label: '免车费公里数', key: 'free_km', type: 'number' },
      { label: '车费锁定节点', key: 'refund_lock_status' },
      { label: '退款说明', key: 'refund_policy', type: 'textarea' },
    ],
    security: [
      { label: '登录密码最小长度', key: 'min_password_len' },
      { label: '会话超时(分钟)', key: 'session_timeout' },
      { label: '最大登录失败次数', key: 'max_login_fail' },
    ],
    sms: [
      { label: '短信服务提供商', key: 'sms_provider' },
      { label: 'AccessKey', key: 'sms_access_key' },
      { label: '短信签名', key: 'sms_sign' },
      { label: '推送AppKey', key: 'push_app_key' },
    ],
  };

  const contentSections: Record<string, React.ReactNode> = {
    basic: <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1F2937]">基础设置</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {defaultConfigs.basic.map(f => renderField(f.label, f.key, f.type))}
      </div>
    </div>,
    notify: <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1F2937]">消息通知</h2>
      <div className="space-y-4">
        {defaultConfigs.notify.map(f => renderField(f.label, f.key, f.type))}
      </div>
    </div>,
    support: <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#1F2937]">咨询客服配置</h2>
        <p className="mt-1 text-xs text-gray-400">控制用户端“咨询客服”按钮的打开方式。page=站内客服页，phone=拨打电话，link=跳转外链。</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {defaultConfigs.support.map(f => renderField(f.label, f.key, f.type))}
      </div>
    </div>,
    commission: <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#111827] to-[#312E81] p-5 text-white">
        <div className="text-lg font-semibold">达人分成规则</div>
        <p className="mt-2 text-sm leading-6 text-white/65">
          按达人当月已完成营业额匹配最高档位。建议车费不参与达人分成，只对服务项目金额分账，避免路费被重复抽佣。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {defaultConfigs.commission.map(f => renderField(f.label, f.key, f.type))}
      </div>
      <div className="rounded-xl border border-[#EEF1F6] bg-[#F8FAFC] p-4 text-xs leading-6 text-gray-500">
        示例：当月营业额达到 5000 元使用档位2，达到 10000 元使用档位3。平台收入 = 服务项目金额 × (100 - 达人分成比例)%。
      </div>
    </div>,
    travel_fee: <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#FFF7ED] to-[#EEF2FF] p-5">
        <div className="text-lg font-semibold text-[#1F2937]">车费规则</div>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          车费按用户下单定位地址与达人实时定位优先计算；无实时定位时使用达人注册/服务城市兜底。系统按往返里程计费，并在达人出发后锁定车费不可退。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {defaultConfigs.travel_fee.map(f => renderField(f.label, f.key, f.type))}
      </div>
      <div className="rounded-xl border border-[#FFE4B5] bg-[#FFFBEB] p-4 text-xs leading-6 text-[#92400E]">
        推荐：每公里车费 2 元，往返计费开启，出发前全额可退；达人点击“已出发”后，车费不退，只退可退的服务项目金额。
      </div>
    </div>,
    security: <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1F2937]">安全设置</h2>
      <div className="space-y-4">
        {defaultConfigs.security.map(f => renderField(f.label, f.key, f.type))}
      </div>
    </div>,
    database: <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1F2937]">数据备份</h2>
      <div className="flex items-center gap-4 rounded-lg border border-[#EEF1F6] p-6">
        <Database className="h-10 w-10 text-[#6B7FD7]" />
        <div>
          <div className="font-medium text-[#1F2937]">手动备份数据库</div>
          <div className="mt-1 text-xs text-gray-500">备份当前数据库状态，包括所有表结构和数据</div>
        </div>
        <button onClick={handleBackup} className="ml-auto rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft">立即备份</button>
      </div>
    </div>,
    server: <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1F2937]">服务监控</h2>
      {serverLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
      ) : serverStatus.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">暂无服务状态数据</div>
      ) : (
        <div className="space-y-3">
          {serverStatus.map((s, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-[#EEF1F6] p-4">
              <div className={`h-2.5 w-2.5 rounded-full ${s.status === 'running' ? 'bg-[#10B981]' : 'bg-[#FF9800]'}`} />
              <div className="flex-1">
                <div className="font-medium text-[#1F2937]">{s.name}</div>
                <div className="text-xs text-gray-500">{s.host || '--'}</div>
              </div>
              <div className="w-28"><div className="text-[11px] text-gray-400">CPU</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F5F7FA]"><div className={`h-full ${(s.cpu || 0) > 70 ? 'bg-[#FF9800]' : 'bg-[#6B7FD7]'}`} style={{ width: `${s.cpu || 0}%` }} /></div><div className="mt-0.5 text-xs text-gray-500">{s.cpu || 0}%</div></div>
              <div className="w-28"><div className="text-[11px] text-gray-400">内存</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F5F7FA]"><div className={`h-full ${(s.memory || 0) > 80 ? 'bg-[#FF9800]' : 'bg-[#34D399]'}`} style={{ width: `${s.memory || 0}%` }} /></div><div className="mt-0.5 text-xs text-gray-500">{s.memory || 0}%</div></div>
            </div>
          ))}
        </div>
      )}
    </div>,
    sms: <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1F2937]">短信/推送</h2>
      <div className="space-y-4">
        {defaultConfigs.sms.map(f => renderField(f.label, f.key, f.type))}
      </div>
    </div>,
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">系统设置</h1>
          <p className="mt-1 text-sm text-gray-400">平台配置与系统管理</p>
        </div>
        {active !== 'server' && active !== 'database' && (
          <button onClick={() => saveConfig(active)} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存设置
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="admin-card h-fit p-2">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active === s.id
                    ? 'bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-white shadow-soft'
                    : 'text-gray-600 hover:bg-[#F3F4FE] hover:text-[#6B7FD7]'
                }`}>
                <Icon className="h-4 w-4" />{s.name}
              </button>
            );
          })}
        </div>
        <div className="admin-card col-span-1 p-6 lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
          ) : (
            contentSections[active] || <div className="py-8 text-center text-sm text-gray-400">未知设置项</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
