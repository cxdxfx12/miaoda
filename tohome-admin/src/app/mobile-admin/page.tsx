'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Crown,
  Gem,
  Home,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  LogOut,
  Megaphone,
  MessageCircle,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UserCog,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import { adminApi, mobileAdminApi, MobilePermission } from '@/api';
import { api } from '@/lib/api';
import { useAdminStore } from '@/store/adminStore';

type MenuKey =
  | 'dashboard'
  | 'cities'
  | 'orders'
  | 'talents'
  | 'talent-review'
  | 'users'
  | 'services'
  | 'finance'
  | 'dispatch'
  | 'reviews'
  | 'marketing'
  | 'banners'
  | 'analytics'
  | 'city-admins';

const permissions: { key: MobilePermission; label: string }[] = [
  { key: 'dashboard', label: '概览' },
  { key: 'cities', label: '城市' },
  { key: 'orders', label: '订单' },
  { key: 'talents', label: '达人' },
  { key: 'talent-review', label: '审核' },
  { key: 'users', label: '用户' },
  { key: 'services', label: '服务' },
  { key: 'finance', label: '财务' },
  { key: 'dispatch', label: '派单' },
  { key: 'reviews', label: '评价' },
  { key: 'marketing', label: '营销' },
  { key: 'banners', label: '轮播' },
  { key: 'analytics', label: '分析' },
];

const menus: { key: MenuKey; label: string; icon: any; tone: string; desc: string }[] = [
  { key: 'dashboard', label: '经营舱', icon: Home, tone: '#8B5CF6', desc: '城市实时经营概览' },
  { key: 'cities', label: '城市', icon: Building2, tone: '#06B6D4', desc: '城市经营分区' },
  { key: 'orders', label: '订单', icon: ClipboardList, tone: '#F97316', desc: '订单履约看板' },
  { key: 'talents', label: '达人', icon: UserCog, tone: '#EC4899', desc: '达人供给状态' },
  { key: 'talent-review', label: '审核', icon: ShieldCheck, tone: '#22C55E', desc: '达人入驻审核' },
  { key: 'users', label: '用户', icon: Users, tone: '#0EA5E9', desc: '用户资产概览' },
  { key: 'services', label: '服务', icon: Store, tone: '#A855F7', desc: '服务项目管理' },
  { key: 'finance', label: '财务', icon: CircleDollarSign, tone: '#EAB308', desc: '营收和结算' },
  { key: 'dispatch', label: '派单', icon: Radar, tone: '#14B8A6', desc: '订单调度' },
  { key: 'reviews', label: '评价', icon: MessageCircle, tone: '#F43F5E', desc: '服务口碑' },
  { key: 'marketing', label: '营销', icon: Megaphone, tone: '#FB7185', desc: '活动优惠券' },
  { key: 'banners', label: '轮播', icon: ImageIcon, tone: '#38BDF8', desc: '首页视觉位' },
  { key: 'analytics', label: '分析', icon: BarChart3, tone: '#6366F1', desc: '趋势洞察' },
  { key: 'city-admins', label: '城管', icon: Crown, tone: '#F59E0B', desc: '城市管理员' },
];

const cityOptions = ['杭州', '北京', '上海', '深圳', '成都', '武汉', '广州', '南京', '苏州', '重庆'];

function getData(res: any) {
  return res?.data || res || {};
}

function numberText(value: any) {
  const n = Number(value || 0);
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString();
}

export default function MobileAdminPage() {
  const loginStore = useAdminStore((s) => s.login);
  const logoutStore = useAdminStore((s) => s.logout);
  const [tokenReady, setTokenReady] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [logging, setLogging] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [active, setActive] = useState<MenuKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [talents, setTalents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    nickname: '',
    phone: '',
    city_name: '杭州',
    permissions: permissions.map((p) => p.key),
  });

  useEffect(() => {
    api.loadToken();
    setTokenReady(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
    if (token) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [meRes, overviewRes, orderRes, talentRes, userRes] = await Promise.all([
        mobileAdminApi.me(),
        mobileAdminApi.overview(),
        mobileAdminApi.orders({ page_size: 30 }),
        mobileAdminApi.talents(),
        mobileAdminApi.users(),
      ]);
      const current = getData(meRes);
      setMe(current);
      setOverview(getData(overviewRes));
      setOrders(getData(orderRes).list || []);
      setTalents(getData(talentRes).list || []);
      setUsers(getData(userRes).list || []);
      if (current?.is_super) {
        const adminRes = await mobileAdminApi.admins();
        setAdmins(getData(adminRes).list || []);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!loginForm.username || !loginForm.password) return alert('请输入账号和密码');
    setLogging(true);
    try {
      const res: any = await adminApi.login(loginForm.username, loginForm.password);
      const d = res?.data || res;
      if (!d?.token) throw new Error('登录失败');
      loginStore(d.admin, d.token);
      api.setToken(d.token);
      await loadAll();
    } catch (e: any) {
      alert(e?.message || '登录失败');
    } finally {
      setLogging(false);
    }
  }

  function handleLogout() {
    logoutStore();
    setMe(null);
  }

  async function createCityAdmin() {
    if (!adminForm.username || !adminForm.password || !adminForm.city_name) {
      alert('请填写账号、密码和城市');
      return;
    }
    await mobileAdminApi.createAdmin(adminForm);
    setShowAdminForm(false);
    setAdminForm({ username: '', password: '', nickname: '', phone: '', city_name: '杭州', permissions: permissions.map((p) => p.key) });
    const adminRes = await mobileAdminApi.admins();
    setAdmins(getData(adminRes).list || []);
    alert('城市管理员已创建');
  }

  const kpis = overview?.kpis || {};
  const allowed = useMemo(() => new Set<string>(me?.is_super ? ['*'] : me?.permissions || []), [me]);
  const visibleMenus = menus.filter((m) => m.key !== 'city-admins' ? (me?.is_super || allowed.has(m.key)) : me?.is_super);
  const activeMenu = menus.find((m) => m.key === active) || menus[0];

  if (!tokenReady || loading) {
    return (
      <div className="min-h-screen bg-[#070A12] text-white flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-cyan-400 blur-3xl opacity-30 animate-pulse" />
          <Loader2 className="relative h-10 w-10 animate-spin text-cyan-200" />
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#06070D] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(20,184,166,.35),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(249,115,22,.3),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(139,92,246,.35),transparent_36%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-end px-6 pb-10 pt-12">
          <div className="mb-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" /> MiaoDa Mobile Console
            </div>
            <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em]">
              掌控城市<br />
              <span className="bg-gradient-to-r from-cyan-200 via-white to-orange-200 bg-clip-text text-transparent">就在掌心</span>
            </h1>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">为手机重新设计的喵搭移动管理端。超管全局调度，城市管理员只看本城经营数据。</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl">
            <label className="text-xs font-semibold text-white/50">管理员账号</label>
            <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none focus:border-cyan-300" />
            <label className="mt-4 block text-xs font-semibold text-white/50">登录密码</label>
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="请输入密码" className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none focus:border-cyan-300" />
            <button onClick={handleLogin} disabled={logging} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0F766E] via-[#14B8A6] to-[#F97316] py-3.5 text-sm font-black shadow-[0_18px_40px_rgba(20,184,166,.28)] disabled:opacity-60">
              {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}进入移动管理端
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3F7F2] text-[#111827]">
      <div className="mx-auto min-h-screen max-w-md overflow-hidden bg-[#F7FAF6] shadow-2xl">
        <header className="relative overflow-hidden rounded-b-[2.4rem] bg-[#09110F] px-5 pb-6 pt-5 text-white">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#D98255]/30 blur-3xl" />
          <div className="absolute left-8 top-20 h-44 w-44 rounded-full bg-[#14B8A6]/25 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">MiaoDa Command</div>
              <div className="mt-1 text-xl font-black tracking-[-0.04em]">{me?.is_super ? '超级管理中枢' : `${me?.city_name || '城市'}运营台`}</div>
            </div>
            <button onClick={handleLogout} className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-xl"><LogOut className="h-4 w-4" /></button>
          </div>
          <div className="relative mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-4 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-orange-300 text-xl font-black text-[#10211D]">{(me.nickname || me.username || '管').slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-black">{me.nickname || me.username}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/55">
                  {me.is_super ? <Crown className="h-3.5 w-3.5 text-amber-200" /> : <Building2 className="h-3.5 w-3.5 text-cyan-200" />}
                  {me.is_super ? '全平台权限' : `${me.city_name} · 城市管理员`}
                </div>
              </div>
              <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">在线</div>
            </div>
          </div>
        </header>

        <section className="-mt-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <Kpi title="本月营收" value={`¥${numberText(kpis.month_revenue)}`} icon={Gem} color="from-[#0F766E] to-[#14B8A6]" />
            <Kpi title="今日订单" value={numberText(kpis.today_orders)} icon={Zap} color="from-[#F97316] to-[#FACC15]" />
            <Kpi title="待处理" value={numberText(kpis.pending_orders)} icon={Activity} color="from-[#8B5CF6] to-[#EC4899]" />
            <Kpi title="在线达人" value={numberText(kpis.online_talents)} icon={Star} color="from-[#2563EB] to-[#06B6D4]" />
          </div>
        </section>

        <nav className="sticky top-0 z-20 mt-5 border-y border-black/5 bg-[#F7FAF6]/90 px-4 py-3 backdrop-blur-xl">
          <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
            {visibleMenus.map((m) => {
              const Icon = m.icon;
              const selected = active === m.key;
              return (
                <button key={m.key} onClick={() => setActive(m.key)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition ${selected ? 'text-white shadow-lg' : 'bg-white text-slate-500'}`} style={selected ? { background: `linear-gradient(135deg, ${m.tone}, #111827)` } : {}}>
                  <Icon className="h-4 w-4" />{m.label}
                </button>
              );
            })}
          </div>
        </nav>

        <section className="px-4 pb-28 pt-4">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400"><Wand2 className="h-3.5 w-3.5" />{activeMenu.desc}</div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">{activeMenu.label}</h2>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">{me.is_super ? '全局' : me.city_name}</div>
          </div>

          {active === 'dashboard' && <DashboardPanel trend={overview?.trend || []} kpis={kpis} />}
          {active === 'orders' && <ListPanel items={orders} type="orders" query={query} setQuery={setQuery} />}
          {active === 'talents' && <ListPanel items={talents} type="talents" query={query} setQuery={setQuery} />}
          {active === 'users' && <ListPanel items={users} type="users" query={query} setQuery={setQuery} />}
          {active === 'city-admins' && me.is_super && (
            <CityAdminPanel
              admins={admins}
              showForm={showAdminForm}
              setShowForm={setShowAdminForm}
              form={adminForm}
              setForm={setAdminForm}
              create={createCityAdmin}
            />
          )}
          {!['dashboard', 'orders', 'talents', 'users', 'city-admins'].includes(active) && (
            <FeaturePanel menu={activeMenu} kpis={kpis} talents={talents} orders={orders} />
          )}
        </section>

        <footer className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-md -translate-x-1/2 grid-cols-4 gap-2 border-t border-black/5 bg-white/90 px-4 py-3 backdrop-blur-2xl">
          {(['dashboard', 'orders', 'talents', me.is_super ? 'city-admins' : 'analytics'] as MenuKey[]).map((key) => {
            const m = menus.find((x) => x.key === key)!;
            const Icon = m.icon;
            return (
              <button key={key} onClick={() => setActive(key)} className={`rounded-2xl py-2 text-[11px] font-black ${active === key ? 'bg-[#10211D] text-white' : 'text-slate-400'}`}>
                <Icon className="mx-auto mb-1 h-4 w-4" />{m.label}
              </button>
            );
          })}
        </footer>
      </div>
    </main>
  );
}

function Kpi({ title, value, icon: Icon, color }: any) {
  return (
    <div className="relative overflow-hidden rounded-[1.6rem] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,.08)]">
      <div className={`absolute -right-5 -top-5 h-20 w-20 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`} />
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-[11px] font-bold text-slate-400">{title}</div>
      <div className="mt-1 text-xl font-black tracking-[-0.04em]">{value}</div>
    </div>
  );
}

function DashboardPanel({ trend, kpis }: any) {
  const max = Math.max(...trend.map((x: any) => Number(x.orders || 0)), 1);
  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] bg-[#10211D] p-5 text-white shadow-[0_24px_60px_rgba(16,33,29,.25)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/45">7日订单心跳</div>
            <div className="mt-1 text-lg font-black">实时经营曲线</div>
          </div>
          <BarChart3 className="h-6 w-6 text-cyan-200" />
        </div>
        <div className="flex h-32 items-end gap-2">
          {trend.map((x: any) => (
            <div key={x.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-2xl bg-gradient-to-t from-[#14B8A6] to-[#FDE68A]" style={{ height: `${Math.max(12, (Number(x.orders || 0) / max) * 110)}px` }} />
              <span className="text-[10px] text-white/35">{x.date}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Mini title="本月订单" value={kpis.month_orders} />
        <Mini title="达人总数" value={kpis.talents} />
        <Mini title="待审达人" value={kpis.pending_talents} />
      </div>
    </div>
  );
}

function Mini({ title, value }: any) {
  return <div className="rounded-3xl bg-white p-4 text-center shadow-sm"><div className="text-lg font-black">{numberText(value)}</div><div className="mt-1 text-[11px] text-slate-400">{title}</div></div>;
}

function ListPanel({ items, type, query, setQuery }: any) {
  const filtered = items.filter((item: any) => JSON.stringify(item).includes(query));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-300" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索当前列表" className="h-9 flex-1 bg-transparent text-sm outline-none" />
      </div>
      {filtered.slice(0, 20).map((item: any) => (
        <div key={`${type}-${item.id}`} className="rounded-[1.5rem] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,.06)]">
          {type === 'orders' && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{item.service_name || '订单服务'}</div>
                <div className="mt-1 text-xs text-slate-400">{item.order_no} · {item.city || '未定位城市'}</div>
                <div className="mt-2 text-xs text-slate-500">{item.user_name} / {item.technician_name?.String || item.technician_name || '待分配'}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-[#0F766E]">¥{Number(item.final_amount || 0).toFixed(0)}</div>
                <div className="mt-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-500">状态 {item.status}</div>
              </div>
            </div>
          )}
          {type === 'talents' && (
            <div className="flex items-center gap-3">
              <img src={item.avatar || '/logo.png'} className="h-14 w-14 rounded-2xl object-cover" alt="" />
              <div className="min-w-0 flex-1">
                <div className="font-black">{item.real_name}</div>
                <div className="mt-1 text-xs text-slate-400">{item.service_city} · {item.service_count} 单 · ★ {item.rating}</div>
              </div>
              <div className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.work_status === 1 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>{item.work_status === 1 ? '在线' : '离线'}</div>
            </div>
          )}
          {type === 'users' && (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-orange-100 font-black text-[#0F766E]">{(item.nickname || item.phone || '用').slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-black">{item.nickname || '喵搭用户'}</div>
                <div className="mt-1 text-xs text-slate-400">{item.phone} · 等级 {item.member_level}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeaturePanel({ menu, kpis, talents, orders }: any) {
  const Icon = menu.icon;
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] p-5 text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${menu.tone}, #10211D)` }}>
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
        <Icon className="h-9 w-9" />
        <div className="mt-8 text-2xl font-black tracking-[-0.05em]">{menu.label}移动工作台</div>
        <p className="mt-2 text-sm leading-6 text-white/65">已按手机端重新收纳核心信息，详细编辑可继续跳转 PC 后台同名模块处理。</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Mini title="相关订单" value={orders.length} />
        <Mini title="达人供给" value={talents.length || kpis.talents} />
      </div>
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="text-sm font-black">移动端能力</div>
        {['手机优先的信息密度', '城市权限自动隔离', '关键指标一屏掌握', '保留 PC 业务菜单入口'].map((text) => (
          <div key={text} className="mt-3 flex items-center gap-2 text-sm text-slate-500"><span className="h-2 w-2 rounded-full bg-[#14B8A6]" />{text}</div>
        ))}
      </div>
    </div>
  );
}

function CityAdminPanel({ admins, showForm, setShowForm, form, setForm, create }: any) {
  function togglePermission(key: MobilePermission) {
    const exists = form.permissions.includes(key);
    setForm({ ...form, permissions: exists ? form.permissions.filter((x: string) => x !== key) : [...form.permissions, key] });
  }
  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="flex w-full items-center justify-center gap-2 rounded-3xl bg-[#10211D] py-4 text-sm font-black text-white shadow-xl">
        <Plus className="h-4 w-4" />添加城市管理员
      </button>
      {showForm && (
        <div className="rounded-[2rem] bg-white p-4 shadow-xl">
          <div className="grid grid-cols-2 gap-3">
            <Input label="账号" value={form.username} onChange={(v: string) => setForm({ ...form, username: v })} />
            <Input label="密码" value={form.password} onChange={(v: string) => setForm({ ...form, password: v })} type="password" />
            <Input label="姓名" value={form.nickname} onChange={(v: string) => setForm({ ...form, nickname: v })} />
            <Input label="手机" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} />
          </div>
          <label className="mt-3 block text-xs font-bold text-slate-400">负责城市</label>
          <select value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })} className="mt-2 h-11 w-full rounded-2xl border border-slate-100 px-3 text-sm outline-none">
            {cityOptions.map((city) => <option key={city}>{city}</option>)}
          </select>
          <div className="mt-4 text-xs font-bold text-slate-400">权限分配</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {permissions.map((p) => (
              <button key={p.key} onClick={() => togglePermission(p.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${form.permissions.includes(p.key) ? 'bg-[#10211D] text-white' : 'bg-slate-100 text-slate-400'}`}>{p.label}</button>
            ))}
          </div>
          <button onClick={create} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#F97316] py-3 text-sm font-black text-white">保存城市管理员</button>
        </div>
      )}
      {admins.map((admin: any) => (
        <div key={admin.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 font-black text-amber-700">{(admin.nickname || admin.username).slice(0, 1)}</div>
            <div className="min-w-0 flex-1">
              <div className="font-black">{admin.nickname || admin.username}</div>
              <div className="mt-1 text-xs text-slate-400">{admin.role_code === 'super_admin' ? '超级管理员' : `${admin.city_name} 城市管理员`}</div>
            </div>
            <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{admin.status === 1 ? '启用' : '停用'}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(admin.permissions || []).slice(0, 6).map((p: string) => <span key={p} className="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-600">{p}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: any) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-100 px-3 text-sm outline-none focus:border-cyan-300" />
    </label>
  );
}
