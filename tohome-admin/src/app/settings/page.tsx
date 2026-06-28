'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Save, Bell, Shield, Globe, Database, Server, MessageSquare, Loader2, Headphones, Percent, Car, Send, FileText, Download, RotateCcw, Trash2, RefreshCw, HardDrive } from 'lucide-react';
import { settingsApi } from '@/api';

const defaultSupportKnowledge = `[
  {
    "question": "如何下单？",
    "keywords": ["下单", "预约", "怎么约", "怎么下单", "流程"],
    "answer": "您可以在首页或服务页选择服务项目，再选择合适的达人，确认服务时间和地址后提交订单并完成支付。支付成功后，达人会在订单页接单并与您确认服务安排。"
  },
  {
    "question": "退款政策",
    "keywords": ["退款", "退钱", "取消订单", "多久到账", "退款多久到账"],
    "answer": "如需退款，请进入订单详情页提交退款申请。达人未出发前通常可按规则退还服务费；达人出发后，车费可能不退，服务费按订单状态和平台规则处理。审核通过后一般 1-3 个工作日原路退回。"
  },
  {
    "question": "优惠券使用",
    "keywords": ["优惠券", "券", "红包", "抵扣", "新人券"],
    "answer": "优惠券会在下单结算页自动展示。满足使用门槛的优惠券可直接勾选抵扣，一个订单通常只能使用一张优惠券，具体以结算页展示为准。"
  },
  {
    "question": "投诉建议",
    "keywords": ["投诉", "建议", "不满意", "举报", "服务不好"],
    "answer": "如果您对服务不满意，可以在订单详情页提交投诉或联系在线客服。请尽量提供订单号、问题描述和相关截图，我们会尽快核实处理。"
  },
  {
    "question": "达人是否真实？",
    "keywords": ["真人", "认证", "达人真实", "安全吗", "安全"],
    "answer": "平台达人会经过基础资料审核和认证流程。您可以在达人详情页查看头像、评分、服务记录等信息。服务过程中如遇异常，请立即联系平台客服。"
  },
  {
    "question": "如何联系客服？",
    "keywords": ["客服", "电话", "联系", "人工", "转人工"],
    "answer": "您可以在当前页面继续留言，也可以拨打页面上方展示的客服热线。遇到订单紧急问题时，建议优先拨打客服电话处理。"
  }
]`;

const sections = [
  { id: 'basic', name: '基础设置', icon: Globe },
  { id: 'site', name: '页面内容', icon: FileText },
  { id: 'notify', name: '消息通知', icon: Bell },
  { id: 'support', name: '咨询客服', icon: Headphones },
  { id: 'commission', name: '达人分成', icon: Percent },
  { id: 'travel_fee', name: '车费规则', icon: Car },
  { id: 'wecom', name: '企业微信通知', icon: Send },
  { id: 'security', name: '安全设置', icon: Shield },
  { id: 'database', name: '数据备份', icon: Database },
  { id: 'server', name: '服务监控', icon: Server },
  { id: 'sms', name: '短信/推送', icon: MessageSquare },
];

interface ConfigItem { key: string; value: string; remark: string; }
interface ServiceInfo { name: string; status: string; cpu: number; memory: number; host: string; }
interface BackupInfo {
  id: string;
  filename: string;
  created_at: string;
  size: number;
  size_text: string;
  db_name: string;
  format: string;
  scope: string;
  table_count: number;
  total_rows: number;
  tables: { name: string; rows: number }[];
  description: string;
}

export default function SettingsPage() {
  const [active, setActive] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServiceInfo[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [testingWeCom, setTestingWeCom] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backuping, setBackuping] = useState(false);
  const [restoring, setRestoring] = useState('');
  const [deletingBackup, setDeletingBackup] = useState('');

  useEffect(() => {
    if (active === 'server') { loadServerStatus(); return; }
    if (active === 'database') { loadBackups(); return; }
    loadConfig(active);
  }, [active]);

  async function loadConfig(group: string) {
    setLoading(true);
    try {
      const endpoint = group === 'basic' ? settingsApi.getBasic() :
        group === 'site' ? settingsApi.getSite() :
        group === 'notify' ? settingsApi.getNotify() :
        group === 'support' ? settingsApi.getSupport() :
        group === 'commission' ? settingsApi.getCommission() :
        group === 'travel_fee' ? settingsApi.getTravelFee() :
        group === 'wecom' ? settingsApi.getWeCom() :
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
      if (group === 'site') {
        map.app_name = map.app_name || '喵搭';
        map.logo_url = map.logo_url || '/logo.png';
        map.about_slogan = map.about_slogan || '您身边的陪伴服务平台';
        map.about_version = map.about_version || 'v1.0.0';
        map.about_build = map.about_build || 'Build 20250625';
        map.about_team = map.about_team || '喵搭科技';
        map.about_website = map.about_website || 'www.miaoda.com';
        map.about_service_phone = map.about_service_phone || '400-888-0000';
        map.about_service_email = map.about_service_email || 'support@miaoda.com';
        map.about_intro = map.about_intro || '喵搭专注于本地生活陪伴服务，连接用户与经过认证的达人，提供休闲、娱乐、按摩、影院等多场景服务。';
        map.about_copyright = map.about_copyright || '© 2025 喵搭科技 版权所有';
        map.about_license = map.about_license || '增值电信业务经营许可证: 川B2-2025XXXX';
        map.about_icp = map.about_icp || 'ICP备案号: 川ICP备2025XXXXXXXX号';
        map.support_title = map.support_title || '在线客服';
        map.support_subtitle = map.support_subtitle || '喵搭官方客服';
        map.support_desc = map.support_desc || '咨询订单、退款、预约和平台规则等问题';
        map.support_welcome = map.support_welcome || '您好！喵搭客服为您服务，请问有什么可以帮您的？';
        map.support_auto_reply = map.support_auto_reply || '收到您的消息啦！我们的客服正在处理中，稍后会有专人回复您~';
        map.support_quick = map.support_quick || '如何下单？,退款政策,优惠券使用,投诉建议';
        map.support_phone = map.support_phone || '400-888-0000';
        map.support_email = map.support_email || 'support@miaoda.com';
        map.support_work_time = map.support_work_time || '09:00 - 22:00';
        map.support_notice = map.support_notice || '紧急订单问题建议直接拨打客服热线，普通咨询可在线留言。';
        map.support_knowledge_base = map.support_knowledge_base || defaultSupportKnowledge;
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
      if (group === 'wecom') {
        map.enabled = map.enabled || '0';
        map.default_webhook = map.default_webhook || '';
        map.city_webhooks = map.city_webhooks || '{}';
        map.title_prefix = map.title_prefix || '喵搭订单通知';
        map.mention_all = map.mention_all || '0';
        map.notify_order_created = map.notify_order_created || '1';
        map.notify_payment_success = map.notify_payment_success || '1';
        map.notify_talent_accepted = map.notify_talent_accepted || '1';
        map.notify_talent_departed = map.notify_talent_departed || '1';
        map.notify_talent_arrived = map.notify_talent_arrived || '1';
        map.notify_service_started = map.notify_service_started || '1';
        map.notify_service_completed = map.notify_service_completed || '1';
        map.notify_order_cancelled = map.notify_order_cancelled || '1';
        map.notify_refund_success = map.notify_refund_success || '1';
        map.notify_dispatch_exception = map.notify_dispatch_exception || '1';
      }
      setConfigData(map);
    } catch { /* backend unavailable, using defaults */ }
    finally { setLoading(false); }
  }

  async function saveConfig(group: string) {
    setSaving(true);
    try {
      const endpoint = group === 'basic' ? (settingsApi.saveBasic as any) :
        group === 'site' ? (settingsApi.saveSite as any) :
        group === 'notify' ? (settingsApi.saveNotify as any) :
        group === 'support' ? (settingsApi.saveSupport as any) :
        group === 'commission' ? (settingsApi.saveCommission as any) :
        group === 'travel_fee' ? (settingsApi.saveTravelFee as any) :
        group === 'wecom' ? (settingsApi.saveWeCom as any) :
        (settingsApi.saveSecurity as any);
      await endpoint(configData);
      if (group === 'basic') {
        window.dispatchEvent(new CustomEvent('admin-basic-settings-saved', { detail: configData.service_phone || '' }));
      }
      alert('保存成功');
    } catch { alert('保存失败，请检查接口返回或稍后重试'); }
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
    setBackuping(true);
    try {
      await settingsApi.createBackup();
      await loadBackups();
      alert('备份已完成，文件已加入备份列表');
    } catch (e: any) { alert(e?.message || '备份失败（请检查数据库备份工具）'); }
    finally { setBackuping(false); }
  }

  async function loadBackups() {
    setBackupLoading(true);
    try {
      const res: any = await settingsApi.getBackups();
      const data = res?.data || res || {};
      setBackups(data.list || []);
    } catch {
      setBackups([]);
    } finally {
      setBackupLoading(false);
    }
  }

  async function downloadBackup(filename: string) {
    try {
      const blob: any = await settingsApi.downloadBackup(filename);
      const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || '下载失败');
    }
  }

  async function restoreBackup(filename: string) {
    if (!confirm(`确定要恢复备份 ${filename} 吗？\n\n恢复会覆盖当前数据库。系统会先自动创建一份“恢复前自动备份”，但恢复期间请不要操作订单和配置。`)) return;
    setRestoring(filename);
    try {
      await settingsApi.restoreBackup(filename);
      await loadBackups();
      alert('恢复已完成，建议刷新后台并检查关键数据');
    } catch (e: any) {
      alert(e?.message || '恢复失败');
    } finally {
      setRestoring('');
    }
  }

  async function deleteBackup(filename: string) {
    if (!confirm(`确定删除备份文件 ${filename} 吗？删除后不可恢复。`)) return;
    setDeletingBackup(filename);
    try {
      await settingsApi.deleteBackup(filename);
      await loadBackups();
    } catch (e: any) {
      alert(e?.message || '删除失败');
    } finally {
      setDeletingBackup('');
    }
  }

  async function testWeCom() {
    setTestingWeCom(true);
    try {
      await settingsApi.testWeCom({ city: '测试城市' });
      alert('测试消息已发送');
    } catch (e: any) {
      alert(e?.response?.data?.message || '测试发送失败，请检查 Webhook');
    } finally {
      setTestingWeCom(false);
    }
  }

  const updateField = (key: string, value: string) => {
    setConfigData(prev => ({ ...prev, [key]: value }));
  };

  const formatBackupTime = (value: string) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', { hour12: false });
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
    site: [
      { label: '应用名称', key: 'app_name' },
      { label: 'Logo 地址', key: 'logo_url' },
      { label: '关于页标语', key: 'about_slogan' },
      { label: '版本号', key: 'about_version' },
      { label: '构建号', key: 'about_build' },
      { label: '开发团队', key: 'about_team' },
      { label: '官方网站', key: 'about_website' },
      { label: '客服热线', key: 'about_service_phone' },
      { label: '联系邮箱', key: 'about_service_email' },
      { label: '关于页介绍', key: 'about_intro', type: 'textarea' },
      { label: '版权信息', key: 'about_copyright' },
      { label: '许可证信息', key: 'about_license' },
      { label: 'ICP备案号', key: 'about_icp' },
      { label: '客服页标题', key: 'support_title' },
      { label: '客服名称', key: 'support_subtitle' },
      { label: '客服页说明', key: 'support_desc', type: 'textarea' },
      { label: '客服欢迎语', key: 'support_welcome', type: 'textarea' },
      { label: '自动回复文案', key: 'support_auto_reply', type: 'textarea' },
      { label: '快捷问题（英文逗号分隔）', key: 'support_quick' },
      { label: '客服热线', key: 'support_phone' },
      { label: '客服邮箱', key: 'support_email' },
      { label: '服务时间', key: 'support_work_time' },
      { label: '客服提示文案', key: 'support_notice', type: 'textarea' },
      { label: '客服知识库(JSON)', key: 'support_knowledge_base', type: 'textarea' },
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
    wecom: [
      { label: '是否启用(0/1)', key: 'enabled', type: 'number' },
      { label: '默认群机器人 Webhook', key: 'default_webhook' },
      { label: '城市 Webhook 映射(JSON)', key: 'city_webhooks', type: 'textarea' },
      { label: '消息标题前缀', key: 'title_prefix' },
      { label: '是否 @所有人(0/1)', key: 'mention_all', type: 'number' },
      { label: '新订单通知(0/1)', key: 'notify_order_created', type: 'number' },
      { label: '支付成功通知(0/1)', key: 'notify_payment_success', type: 'number' },
      { label: '达人接单通知(0/1)', key: 'notify_talent_accepted', type: 'number' },
      { label: '达人出发通知(0/1)', key: 'notify_talent_departed', type: 'number' },
      { label: '达人到达通知(0/1)', key: 'notify_talent_arrived', type: 'number' },
      { label: '服务开始通知(0/1)', key: 'notify_service_started', type: 'number' },
      { label: '服务完成通知(0/1)', key: 'notify_service_completed', type: 'number' },
      { label: '订单取消通知(0/1)', key: 'notify_order_cancelled', type: 'number' },
      { label: '退款成功通知(0/1)', key: 'notify_refund_success', type: 'number' },
      { label: '派单异常通知(0/1)', key: 'notify_dispatch_exception', type: 'number' },
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
    site: <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#F97316] p-5 text-white">
        <div className="text-lg font-semibold">用户端页面内容</div>
        <p className="mt-2 text-sm leading-6 text-white/75">
          控制用户端 /about 和 /support 页面展示的信息，包括品牌 Logo、关于我们、客服欢迎语、快捷问题、联系方式和备案信息。
        </p>
        <p className="mt-2 text-xs leading-5 text-white/65">
          客服知识库使用 JSON 数组，每条包含 question、keywords、answer。用户提问会先匹配关键词，命中后自动回复对应答案。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {defaultConfigs.site.map(f => renderField(f.label, f.key, f.type))}
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
    wecom: <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-[#111827] p-5 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">企业微信订单通知</div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              订单关键事件会推送到企业微信群机器人。支持默认总群，也支持按城市配置不同群；没有城市专属 Webhook 时自动走默认群。
            </p>
          </div>
          <button
            type="button"
            onClick={testWeCom}
            disabled={testingWeCom}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-soft disabled:opacity-60"
          >
            {testingWeCom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            测试发送
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {defaultConfigs.wecom.map(f => renderField(f.label, f.key, f.type))}
      </div>

      <div className="rounded-xl border border-[#DDE7FF] bg-[#F8FAFF] p-4 text-xs leading-6 text-[#475569]">
        城市 Webhook 示例：{"{\"北京\":\"https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx\",\"武汉\":\"https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=yyy\"}"}。企业微信群机器人地址请从企业微信群右上角“群机器人”里复制。
      </div>
    </div>,
    security: <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1F2937]">安全设置</h2>
      <div className="space-y-4">
        {defaultConfigs.security.map(f => renderField(f.label, f.key, f.type))}
      </div>
    </div>,
    database: <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1F2937]">数据备份与恢复</h2>
          <p className="mt-1 text-xs text-gray-400">备份 PostgreSQL public schema 的表结构和数据，支持下载 SQL 文件和从已有备份恢复。</p>
        </div>
        <button
          onClick={loadBackups}
          disabled={backupLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#EEF1F6] bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${backupLoading ? 'animate-spin' : ''}`} />刷新列表
        </button>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-[#EEF1F6] bg-gradient-to-br from-[#F8FAFF] to-white p-6 md:flex-row md:items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
          <Database className="h-7 w-7 text-[#6B7FD7]" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-[#1F2937]">手动备份数据库</div>
          <div className="mt-1 text-xs leading-5 text-gray-500">生成可下载的 SQL 备份文件，同时记录备份时间、文件大小、数据库名、表数量、总行数和每张表的数据量。</div>
        </div>
        <button
          onClick={handleBackup}
          disabled={backuping}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-60"
        >
          {backuping ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
          {backuping ? '备份中...' : '立即备份'}
        </button>
      </div>

      <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-xs leading-6 text-[#92400E]">
        恢复会覆盖当前数据库。点击恢复时系统会先自动创建一份“恢复前自动备份”，但仍建议在低峰期操作，恢复期间不要新增订单、修改配置或审核达人。
      </div>

      {backupLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
      ) : backups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#DDE3EE] py-12 text-center text-sm text-gray-400">
          暂无备份文件，点击“立即备份”后会在这里显示可下载文件。
        </div>
      ) : (
        <div className="space-y-4">
          {backups.map((backup) => (
            <div key={backup.filename} className="rounded-2xl border border-[#EEF1F6] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold text-[#1F2937]">{backup.filename}</div>
                    <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-medium text-[#6B7FD7]">{backup.description || '手动备份'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-500 md:grid-cols-4">
                    <div><span className="text-gray-400">备份时间</span><div className="mt-1 font-medium text-[#374151]">{formatBackupTime(backup.created_at)}</div></div>
                    <div><span className="text-gray-400">文件大小</span><div className="mt-1 font-medium text-[#374151]">{backup.size_text || '--'}</div></div>
                    <div><span className="text-gray-400">数据库</span><div className="mt-1 font-medium text-[#374151]">{backup.db_name || '--'}</div></div>
                    <div><span className="text-gray-400">数据范围</span><div className="mt-1 font-medium text-[#374151]">{backup.table_count || 0} 张表 / {backup.total_rows || 0} 行</div></div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400">{backup.scope || 'public schema 全量结构和数据'} · {backup.format || 'PostgreSQL SQL'}</div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-[#6B7FD7]">查看备份包含的数据表</summary>
                    <div className="mt-3 grid max-h-52 grid-cols-1 gap-2 overflow-auto rounded-lg bg-[#F8FAFC] p-3 text-xs md:grid-cols-2">
                      {(backup.tables || []).map((table) => (
                        <div key={table.name} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                          <span className="font-medium text-[#374151]">{table.name}</span>
                          <span className="text-gray-400">{table.rows} 行</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button onClick={() => downloadBackup(backup.filename)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3EE] px-3 py-2 text-xs font-medium text-gray-600 hover:bg-[#F8FAFC]">
                    <Download className="h-3.5 w-3.5" />下载
                  </button>
                  <button onClick={() => restoreBackup(backup.filename)} disabled={!!restoring} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#FFFBEB] px-3 py-2 text-xs font-medium text-[#B45309] hover:bg-[#FEF3C7] disabled:opacity-60">
                    {restoring === backup.filename ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}恢复
                  </button>
                  <button onClick={() => deleteBackup(backup.filename)} disabled={!!deletingBackup} className="inline-flex items-center gap-1.5 rounded-lg border border-[#FCA5A5]/50 bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-60">
                    {deletingBackup === backup.filename ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
      <PageHeader
        tag="系统管理"
        title="系统设置"
        subtitle="管理平台基本配置、安全设置和服务参数"
        actions={
          active !== 'server' && active !== 'database' && (
            <button onClick={() => saveConfig(active)} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存设置
            </button>
          )
        }
      />

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
