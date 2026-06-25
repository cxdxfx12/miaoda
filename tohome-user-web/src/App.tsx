import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Search, Users, User, Star, MapPin, Heart, ArrowRight, ChevronLeft, ChevronRight, Phone, Lock, MessageCircle, X, Clock, Shield, Sparkles, TrendingUp, Award, Zap, Eye, Bell, Settings, Ticket, Gift, Headphones, HelpCircle, FileText } from 'lucide-react';
import { useUserStore } from './store/userStore';
import { serviceApi } from './api/service';
import { talentApi } from './api/talent';
import { orderApi } from './api/order';
import { api, getToken } from './api/client';
import './index.css';

/* ===================================================================
   品类配置 & Mock 数据
   =================================================================== */

interface ServiceItem {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  icon: string;
  desc: string;
  tags: string[];
  duration: string;
  rating: number;
  orderCount: number;
}

const CATEGORIES = [
  { key: 'leisure', icon: '🎱', label: '休闲陪伴', color: '#EFF6FF', tagColor: '#3B82F6', bgGrad: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)' },
  { key: 'entertainment', icon: '🎮', label: '娱乐陪伴', color: '#FFFBEB', tagColor: '#F59E0B', bgGrad: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' },
  { key: 'massage', icon: '💆', label: '按摩服务', color: '#FEF2F2', tagColor: '#EF4444', bgGrad: 'linear-gradient(135deg, #FEE2E2, #FECACA)' },
  { key: 'cinema', icon: '🎬', label: '影院陪伴', color: '#F5F3FF', tagColor: '#8B5CF6', bgGrad: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)' },
];

const MOCK_SERVICES: ServiceItem[] = [
  // —— 休闲陪伴 ——
  { id: 101, name: '台球陪练', category: 'leisure', price: 88, originalPrice: 128, icon: '🎱', desc: '专业台球陪练，技术指导+对打练习，适合各水平玩家', tags: ['热门','新手友好'], duration: '1小时', rating: 4.8, orderCount: 326 },
  { id: 102, name: '观影陪伴', category: 'leisure', price: 68, icon: '🍿', desc: '陪你看电影，聊剧情、分享感悟，让观影不再孤单', tags: ['轻松','休闲'], duration: '1场', rating: 4.7, orderCount: 512 },
  { id: 103, name: '茶艺品鉴', category: 'leisure', price: 128, originalPrice: 168, icon: '🍵', desc: '专业茶艺师带你品味各类名茶，讲解茶文化知识与冲泡技艺', tags: ['高端','文化'], duration: '2小时', rating: 4.9, orderCount: 189 },
  { id: 104, name: '爬山徒步', category: 'leisure', price: 158, icon: '⛰️', desc: '户外爬山徒步，沿途赏景拍照，健康运动新方式', tags: ['户外','运动'], duration: '半天', rating: 4.8, orderCount: 257 },
  { id: 105, name: '麻将陪玩', category: 'leisure', price: 98, icon: '🀄', desc: '麻将搭子陪玩，川麻、广麻、国标均可，技术水平在线', tags: ['趣味','益智'], duration: '2小时', rating: 4.6, orderCount: 445 },
  { id: 106, name: '吃饭陪伴', category: 'leisure', price: 128, icon: '🍽️', desc: '陪你吃饭聊天，探店网红餐厅，让每一餐都有温度', tags: ['美食','社交'], duration: '1餐', rating: 4.7, orderCount: 623 },
  { id: 107, name: '逛街陪伴', category: 'leisure', price: 108, icon: '🛍️', desc: '专业逛街搭子，帮你搭配、参考意见，购物不再纠结', tags: ['购物','时尚'], duration: '2小时', rating: 4.8, orderCount: 378 },
  { id: 108, name: '桌游陪玩', category: 'leisure', price: 78, icon: '🎲', desc: '狼人杀、剧本杀、三国杀，各种桌游陪玩，组局无压力', tags: ['社交','游戏'], duration: '2小时', rating: 4.6, orderCount: 534 },

  // —— 娱乐陪伴 ——
  { id: 201, name: '电竞游戏', category: 'entertainment', price: 88, originalPrice: 108, icon: '🎮', desc: 'LOL/王者/吃鸡/PUBG陪玩，大神带你飞，轻松上分', tags: ['热门','竞技'], duration: '1小时', rating: 4.7, orderCount: 892 },
  { id: 202, name: 'K歌微醺', category: 'entertainment', price: 168, icon: '🎤', desc: 'KTV包厢陪同欢唱，从经典老歌到热门新曲，气氛担当', tags: ['嗨翻','解压'], duration: '3小时', rating: 4.9, orderCount: 456 },
  { id: 203, name: '商务酒局', category: 'entertainment', price: 288, icon: '🍷', desc: '商务宴请陪同出席，专业礼仪、得体应酬，帮你hold住全场', tags: ['商务','高端'], duration: '1场', rating: 4.8, orderCount: 134 },
  { id: 204, name: '同城旅游', category: 'entertainment', price: 328, icon: '🏙️', desc: '同城景点一日游，网红打卡、小众秘境，本地达人带你玩', tags: ['旅游','探索'], duration: '1天', rating: 4.7, orderCount: 298 },
  { id: 205, name: '异地旅游', category: 'entertainment', price: 688, icon: '✈️', desc: '周边城市短期旅行陪伴，行程规划+全程陪同，说走就走', tags: ['深度','长途'], duration: '1-3天', rating: 4.9, orderCount: 87 },
  { id: 206, name: '密室逃脱', category: 'entertainment', price: 128, icon: '🔍', desc: '密室/剧本杀队友，智商在线、演技在线，帮你通关解密', tags: ['智力','冒险'], duration: '2小时', rating: 4.6, orderCount: 367 },

  // —— 按摩服务 ——
  { id: 301, name: '中式按摩', category: 'massage', price: 168, originalPrice: 218, icon: '💆‍♂️', desc: '传统中式推拿手法，舒筋活络、缓解疲劳，肩颈腰背全方位放松', tags: ['经典','热销'], duration: '60分钟', rating: 4.8, orderCount: 1205 },
  { id: 302, name: '泰式SPA', category: 'massage', price: 238, icon: '🧘', desc: '正宗泰式拉伸按摩，配合精油SPA，深层放松身心', tags: ['高端','SPA'], duration: '90分钟', rating: 4.9, orderCount: 876 },
  { id: 303, name: '扶阳SPA', category: 'massage', price: 298, originalPrice: 398, icon: '🔥', desc: '中医扶阳理论，温灸+经络疏通，提升阳气、改善亚健康', tags: ['养生','热门'], duration: '90分钟', rating: 4.9, orderCount: 654 },
  { id: 304, name: '足疗保健', category: 'massage', price: 128, icon: '🦶', desc: '足底穴位按摩+中药泡脚，疏通反射区，缓解全身疲劳', tags: ['实惠','养生'], duration: '60分钟', rating: 4.7, orderCount: 1023 },
  { id: 305, name: '精油推背', category: 'massage', price: 198, icon: '🌸', desc: '植物精油推背SPA，舒缓肌肉紧张、改善睡眠质量', tags: ['芳疗','放松'], duration: '60分钟', rating: 4.8, orderCount: 745 },
  { id: 306, name: '经络疏通', category: 'massage', price: 218, icon: '💪', desc: '经络刮痧+穴位点压+拔罐，疏通经络、排除湿气', tags: ['中医','理疗'], duration: '80分钟', rating: 4.7, orderCount: 567 },

  // —— 影院陪伴 ——
  { id: 401, name: '情窦初开', category: 'cinema', price: 198, originalPrice: 258, icon: '💕', desc: '私人影院双人观影，温馨氛围，轻松愉悦的陪伴体验', tags: ['入门','温馨'], duration: '2小时', rating: 4.8, orderCount: 423 },
  { id: 402, name: '情难自控', category: 'cinema', price: 298, icon: '💓', desc: '沉浸式影院体验，亲密陪伴，私享二人世界的美好时光', tags: ['沉浸','浪漫'], duration: '3小时', rating: 4.9, orderCount: 356 },
  { id: 403, name: '共度今宵', category: 'cinema', price: 398, icon: '🌙', desc: '高端私人影院包场，精致布置+香槟小食，难忘的专属夜晚', tags: ['高端','定制'], duration: '4小时', rating: 5.0, orderCount: 187 },
  { id: 404, name: '经典观影', category: 'cinema', price: 128, icon: '🎞️', desc: '经典影片重温，专业解说陪伴，解读电影背后的故事与美学', tags: ['文艺','影评'], duration: '2小时', rating: 4.7, orderCount: 289 },
];

const NEARBY_TALENT_QUERY = { lat: 39.9042, lng: 116.4074, radius: 5000, limit: 100 };

function getServicesByCategory(cat: string | null): ServiceItem[] {
  if (!cat) return MOCK_SERVICES;
  return MOCK_SERVICES.filter(s => s.category === cat);
}

function getCategoryConfig(cat: string | null) {
  return CATEGORIES.find(c => c.key === cat) || null;
}

function isImageIcon(value?: string) {
  return !!value && (/^https?:\/\//.test(value) || value.startsWith('/uploads/'));
}

function renderServiceIcon(value?: string, size = 44) {
  if (isImageIcon(value)) {
    return (
      <img
        src={value}
        alt="服务图标"
        style={{ width: size, height: size, borderRadius: Math.max(10, Math.round(size / 4)), objectFit: 'cover' }}
      />
    );
  }
  return <span style={{ fontSize: size }}>{value || '✨'}</span>;
}

function renderServiceImageFill(value?: string, fallbackSize = 58) {
  if (isImageIcon(value)) {
    return (
      <img
        src={value}
        alt="服务图标"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
  return <div style={{ position: 'relative', zIndex: 1 }}>{renderServiceIcon(value, fallbackSize)}</div>;
}

/** 将 API 返回的服务数据转换为前端 ServiceItem 格式 */
function adaptApiService(raw: any): ServiceItem {
  const categoryMap: Record<number, string> = {
    1: 'leisure',
    2: 'entertainment',
    3: 'massage',
    4: 'cinema',
  };
  const categoryNameMap: Record<string, string> = {
    '休闲陪伴': 'leisure',
    '娱乐陪伴': 'entertainment',
    '按摩服务': 'massage',
    '影院陪伴': 'cinema',
  };
  const category = categoryMap[Number(raw.category_id)] || categoryNameMap[raw.category?.name] || 'leisure';
  const mock = MOCK_SERVICES.find(s => s.id === Number(raw.id)) || MOCK_SERVICES.find(s => s.category === category);
  return {
    id: Number(raw.id),
    name: raw.name || mock?.name || '',
    category,
    price: Number(raw.base_price ?? raw.price ?? mock?.price ?? 0),
    originalPrice: Number(raw.original_price ?? raw.originalPrice ?? mock?.originalPrice ?? 0) || undefined,
    icon: raw.cover_image || raw.category?.icon || mock?.icon || '✨',
    desc: raw.description || raw.desc || mock?.desc || '',
    tags: Array.isArray(raw.tags) ? raw.tags : (mock?.tags || []),
    duration: raw.duration || mock?.duration || '1小时',
    rating: Number(raw.rating || mock?.rating || 4.8),
    orderCount: Number(raw.order_count || raw.orderCount || 0),
  };
}

/* ---- Mock 达人数据 ---- */
interface TalentItem {
  id: number;
  name: string;
  avatar: string;
  artPhotos: string[];
  lifePhotos: string[];
  gender: '男' | '女';
  age: number;
  distance: number;        // km，与当前用户的距离
  rating: number;
  orderCount: number;
  price: number;           // 该达人此服务的定价（可能覆盖服务默认价）
  serviceIds: number[];    // 该达人可提供的服务ID列表
  tags: string[];
  intro: string;
}

/** 将 API 返回的达人数据转换为前端 TalentItem 格式 */
function adaptApiTalent(raw: any): TalentItem {
  const skills = Array.isArray(raw.skills) ? raw.skills : [];
  const tags = Array.isArray(raw.tags) ? raw.tags :
    skills.length > 0 ? skills.slice(0, 3).map((s: any) => typeof s === 'string' ? s : (s?.name || String(s))) : [];
  return {
    id: Number(raw.id),
    name: raw.real_name || raw.name || '',
    avatar: raw.avatar || '',
    artPhotos: Array.isArray(raw.art_photos) ? raw.art_photos : [],
    lifePhotos: Array.isArray(raw.life_photos) ? raw.life_photos : [],
    gender: raw.gender === 2 ? '女' : '男',
    age: raw.birthday ? Math.floor((Date.now() - new Date(raw.birthday).getTime()) / 31557600000) : 0,
    distance: Number(raw.distance || raw.distance_km || 0),
    rating: Number(raw.rating || 0),
    orderCount: Number(raw.service_count || raw.order_count || 0),
    price: 0,
    serviceIds: skills.map((s: any) => typeof s === 'object' ? Number(s.id) : Number(s)),
    tags: tags.slice(0, 3),
    intro: raw.introduction || raw.intro || '',
  };
}

/* ===================================================================
   通用组件
   =================================================================== */

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'star-filled' : 'star-empty'} fill={i <= Math.round(value) ? '#FFB84D' : 'none'} />
      ))}
    </div>
  );
}

function Avatar({ initials, src, size = 44 }: { initials: string; src?: string; size?: number }) {
  if (src) return <img src={src} alt="" className="avatar" style={{ width: size, height: size }} />;
  return <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</div>;
}

function getTalentHeroImage(talent: TalentItem) {
  return talent.artPhotos?.[0] || talent.lifePhotos?.[0] || talent.avatar || '';
}

function StatusBadge({ status }: { status: number | string }) {
  const map: Record<string, { cls: string; label: string }> = {
    '0': { cls: 'tag-error', label: '待支付' },
    '1': { cls: 'tag-warning', label: '待接单' },
    '2': { cls: 'tag-primary', label: '已接单' },
    '3': { cls: 'tag-primary', label: '服务中' },
    '4': { cls: 'tag-success', label: '已完成' },
    '5': { cls: 'tag-error', label: '已取消' },
  };
  const s = map[String(status)] || { cls: 'tag-primary', label: String(status) };
  return <span className={`tag ${s.cls}`}>{s.label}</span>;
}

function LoadingView() {
  return (
    <div className="flex items-center justify-center" style={{ padding: 40 }}>
      <div className="skeleton" style={{ width: 200, height: 16, borderRadius: 8 }} />
    </div>
  );
}

/* ===================================================================
   登录页 - 品牌粉紫渐变背景
   =================================================================== */
function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'sms' | 'password'>('sms');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const login = useUserStore(s => s.login);
  const loading = useUserStore(s => s.loading);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleSendSms = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return; }
    setSending(true); setError('');
    try { await serviceApi.listCategories(); startCountdown(); } catch { setError('发送失败，请重试'); }
    setSending(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!phone) { setError('请输入手机号'); return; }
    try {
      await login(phone, mode === 'sms' ? (code || '000000') : password);
      const params = new URLSearchParams(loc.search);
      nav(params.get('redirect') || '/home');
    } catch (err: any) { setError(err?.response?.data?.message || err?.message || '登录失败'); }
  };

  // 服务卡片数据 — 4 大品类
  const serviceCards = CATEGORIES.map(c => ({
    ...c,
    desc: c.key === 'leisure' ? '台球·观影·茶艺·桌游·逛街...' :
          c.key === 'entertainment' ? '电竞·K歌·酒局·旅游...' :
          c.key === 'massage' ? '中式按摩·泰式·扶阳SPA' :
          '私人影院·品质陪伴',
  }));

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #7C5CFC 0%, #A78BFA 40%, #C4B5FD 70%, #F5F3FF 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* 背景装饰气泡 */}
      <div className="animate-float" style={{ position: 'absolute', top: '8%', right: '10%', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(1px)' }} />
      <div className="animate-float-delayed" style={{ position: 'absolute', top: '20%', left: '5%', width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
      <div className="animate-float" style={{ position: 'absolute', bottom: '22%', right: '8%', width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', animationDelay: '1.5s' }} />
      <div className="animate-float-delayed" style={{ position: 'absolute', bottom: '10%', left: '12%', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,107,157,0.15)', animationDelay: '0.8s' }} />

      {/* 品牌标识区 */}
      <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 28, zIndex: 1 }}>
        <div style={{
          width: 72, height: 72, margin: '0 auto 16px',
          borderRadius: 22, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(124,92,252,0.3)'
        }}>
          <span style={{ fontSize: 36 }}>🐱</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: 2, textShadow: '0 2px 8px rgba(124,92,252,0.3)' }}>喵 搭</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6, letterSpacing: 1 }}>您身边的陪伴服务平台</div>
      </div>

      {/* 登录卡片 */}
      <div className="animate-fade-up" style={{
        width: '100%', maxWidth: 380, background: '#fff', borderRadius: 24,
        padding: '28px 24px 24px', boxShadow: '0 24px 64px rgba(124,92,252,0.25)',
        zIndex: 1, animationDelay: '0.1s'
      }}>
        {/* 切换标签 */}
        <div style={{ display: 'flex', marginBottom: 24, background: '#F5F3FF', borderRadius: 12, padding: 3 }}>
          <button onClick={() => setMode('sms')}
            style={{
              flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, cursor: 'pointer',
              fontSize: 14, fontWeight: 600, transition: 'all 0.3s',
              background: mode === 'sms' ? 'var(--primary-gradient)' : 'transparent',
              color: mode === 'sms' ? '#fff' : 'var(--text-secondary)',
            }}>
            短信验证码登录
          </button>
          <button onClick={() => setMode('password')}
            style={{
              flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, cursor: 'pointer',
              fontSize: 14, fontWeight: 600, transition: 'all 0.3s',
              background: mode === 'password' ? 'var(--primary-gradient)' : 'transparent',
              color: mode === 'password' ? '#fff' : 'var(--text-secondary)',
            }}>
            密码登录
          </button>
        </div>

        <form onSubmit={handleLogin}>
          {/* 手机号 */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Phone size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input className="input input-lg" style={{ paddingLeft: 44 }} placeholder="请输入手机号" value={phone} onChange={e => setPhone(e.target.value)} maxLength={11} />
          </div>

          {mode === 'sms' ? (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input className="input input-lg" style={{ paddingLeft: 44 }} placeholder="验证码" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
              </div>
              <button type="button" onClick={handleSendSms} disabled={countdown > 0 || sending}
                style={{
                  padding: '0 18px', borderRadius: 14, border: 'none', fontSize: 13, fontWeight: 600,
                  whiteSpace: 'nowrap', cursor: countdown > 0 ? 'default' : 'pointer',
                  background: countdown > 0 ? '#F3F4F6' : 'var(--primary-bg)',
                  color: countdown > 0 ? '#9CA3AF' : 'var(--primary)',
                }}>
                {countdown > 0 ? `${countdown}s` : sending ? '发送中' : '获取验证码'}
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', zIndex: 1 }} />
              <input className="input input-lg" style={{ paddingLeft: 44, paddingRight: 56 }} type={showPwd ? 'text' : 'password'} placeholder="请输入密码" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500 }}>
                {showPwd ? '隐藏' : '显示'}
              </button>
            </div>
          )}

          {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: 'var(--error-bg)', borderRadius: 10 }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%', height: 50, fontSize: 16, borderRadius: 14 }} disabled={loading}>
            {loading ? '登录中...' : '立即登录'}
          </button>
        </form>

        <div className="text-center" style={{ marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
          登录即表示同意 <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>用户协议</span> 和 <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>隐私政策</span>
        </div>
      </div>

      {/* 底部品类展示 */}
      <div className="animate-fade-up" style={{ width: '100%', maxWidth: 380, marginTop: 32, zIndex: 1, animationDelay: '0.2s' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 12, letterSpacing: 1 }}>— 多品类陪伴 —</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {serviceCards.map((item, i) => (
            <NavLink to={`/services?category=${item.key}`} key={i} className="no-underline" style={{
              padding: '14px 12px', borderRadius: 16,
              background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)',
              cursor: 'pointer', transition: 'all 0.3s',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{item.desc}</div>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   Banner 轮播区（后台可配置）
   =================================================================== */
interface BannerData {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  icon: string;
  theme_color: string;
}

const MOCK_BANNERS: BannerData[] = [
  { id: 1, title: '首单立减50元', subtitle: '休闲·娱乐·按摩·影院', image_url: '', link_url: '/invite', icon: '🎁', theme_color: 'linear-gradient(135deg, #FF6B9D 0%, #C44DFF 100%)' },
  { id: 2, title: '新人大礼包', subtitle: '注册即送188元券包', image_url: '', link_url: '/coupons', icon: '🧧', theme_color: 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)' },
  { id: 3, title: '真人认证', subtitle: '100%真人·不满意可退款', image_url: '', link_url: '/about', icon: '🛡️', theme_color: 'linear-gradient(135deg, #34D399 0%, #06B6D4 100%)' },
  { id: 4, title: '限时特惠', subtitle: '休闲约会只要88元起', image_url: '', link_url: '/services?sort=price_asc', icon: '🔥', theme_color: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)' },
];

function BannerCarousel({ banners: inputBanners }: { banners?: BannerData[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const banners: BannerData[] = (inputBanners && inputBanners.length > 0 ? inputBanners : MOCK_BANNERS);
  const nav = useNavigate();

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length, paused]);

  const [touchStart, setTouchStart] = useState(0);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 40) setCurrent(prev => (prev + 1) % banners.length);
    else if (diff < -40) setCurrent(prev => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <div
      style={{ marginTop: 18, position: 'relative', zIndex: 1 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (banners[current]?.link_url) nav(banners[current].link_url); }}
        style={{
          borderRadius: 20, overflow: 'hidden', position: 'relative', height: 170, cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* 底部渐变遮罩 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.3) 100%)',
          borderRadius: 20,
        }} />
        {banners.map((b, i) => (
          <div key={b.id} style={{
            position: 'absolute', inset: 0, transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: i === current ? 1 : 0,
            transform: i === current ? 'scale(1)' : 'scale(1.08)',
            background: b.image_url
              ? `url(${b.image_url}) center/cover no-repeat`
              : (b.theme_color || 'linear-gradient(135deg, #7C5CFC 0%, #A78BFA 100%)'),
            display: 'flex', alignItems: 'flex-end', padding: '0 22px 20px',
          }}>
            {/* 装饰圆 */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4, letterSpacing: 1 }}>
                {b.icon} {b.subtitle}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: 10 }}>
                {b.title}
              </div>
              <button style={{
                border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 50, background: 'rgba(255,255,255,0.15)',
                color: '#fff', fontWeight: 600, fontSize: 12, padding: '6px 18px',
                backdropFilter: 'blur(8px)', cursor: 'pointer', transition: 'all 0.2s',
              }}>
                立即查看
              </button>
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: 18,
              background: 'rgba(255,255,255,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 42, flexShrink: 0,
              position: 'relative', zIndex: 2, marginLeft: 8,
            }}>{b.icon}</div>
          </div>
        ))}
      </div>
      {/* 分页指示器 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 24 : 8, height: 8,
              borderRadius: 4,
              border: 'none',
              background: i === current
                ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)'
                : 'rgba(124,92,252,0.2)',
              boxShadow: i === current ? '0 2px 10px rgba(124,92,252,0.35)' : 'none',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   首页订单状态追踪条 - 实时显示进行中订单的进度
   =================================================================== */
const ORDER_STEPS = [
  { key: 'accepted', label: '已接单', icon: '✅', desc: '技师已接单' },
  { key: 'departing', label: '出发中', icon: '🚗', desc: '正在前往' },
  { key: 'arrived', label: '已到达', icon: '📍', desc: '已到达地点' },
  { key: 'serving', label: '服务中', icon: '💆', desc: '服务进行中' },
  { key: 'done', label: '已完成', icon: '⭐', desc: '等待评价' },
  { key: 'reviewed', label: '已评价', icon: '📝', desc: '订单结束' },
];

function OrderTrackerBar() {
  const nav = useNavigate();
  const { isLoggedIn } = useUserStore();
  const [searchText, setSearchText] = useState('');

  // 找出当前进行中的订单（status 1-3），优先显示最新的
  const activeOrder = isLoggedIn
    ? [...MOCK_ORDER_DATA].filter(o => [1, 2, 3].includes(o.status)).sort((a, b) => b.id - a.id)[0] || null
    : null;

  // 模拟：给进行中的订单分配一个进度步骤（实际应从后端获取）
  const getProgressStep = (order: typeof MOCK_ORDER_DATA[0]) => {
    if (order.status === 1) return 0;   // 待接单 → 显示"待接单"
    if (order.status === 2) return 1;   // 已接单 → 显示"出发中"
    if (order.status === 3) return 3;   // 服务中
    return -1;
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchText.trim()) {
      nav(`/talents?search=${encodeURIComponent(searchText.trim())}`);
    }
  };

  if (!activeOrder) {
    // 无进行中订单，显示搜索框
    return (
      <div className="search-box" style={{ marginTop: 20, position: 'relative', zIndex: 2 }}>
        <Search size={18} color="var(--primary)" style={{zIndex:1}} />
        <input
          className="input"
          style={{
            paddingLeft: 48, borderRadius: 16, height: 52,
            border: 'none',
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#fff', fontSize: 15,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
            transition: 'all 0.3s',
          }}
          placeholder="🔍  搜索服务或达人..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onFocus={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.35)';
            e.target.style.boxShadow = '0 0 0 3px rgba(124,92,252,0.2), 0 8px 32px rgba(124,92,252,0.25)';
          }}
          onBlur={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.22)';
            e.target.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.25), inset 0 1px 0 rgba(255,255,255,0.12)';
          }}
        />
      </div>
    );
  }

  const currentStep = getProgressStep(activeOrder);
  const si = statusMap[activeOrder.status] || statusMap[0];

  return (
    <div style={{
      marginTop: 20, position: 'relative', zIndex: 2,
      background: 'rgba(255,255,255,0.22)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 18,
      padding: '16px 18px',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.25), 0 8px 32px rgba(124,92,252,0.15)',
      cursor: 'pointer',
      transition: 'transform 0.25s, box-shadow 0.25s',
    }}
    onClick={() => nav('/orders?tab=3')}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.35), 0 12px 40px rgba(124,92,252,0.25)'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.25), 0 8px 32px rgba(124,92,252,0.15)'; }}
    >
      {/* 头部信息 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>{activeOrder.service_icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{activeOrder.service_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {activeOrder.talent_name ? `技师: ${activeOrder.talent_name}` : '待派单'}
              <span style={{ marginLeft: 8, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6 }}>
                {si.label}
              </span>
            </div>
          </div>
        </div>
        <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>›</span>
      </div>

      {/* 进度步骤条 */}
      <div style={{ position: 'relative', padding: '4px 0' }}>
        {/* 连接线背景 */}
        <div style={{
          position: 'absolute', top: 13, left: 20, right: 20,
          height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)',
        }} />
        {/* 连接线进度 */}
        <div style={{
          position: 'absolute', top: 13, left: 20,
          width: `calc(${(currentStep / (ORDER_STEPS.length - 1)) * 100}% - ${(currentStep / (ORDER_STEPS.length - 1)) * 40}px)`,
          maxWidth: 'calc(100% - 40px)',
          height: 3, borderRadius: 2,
          background: '#fff',
          transition: 'width 0.5s ease',
          boxShadow: '0 0 8px rgba(255,255,255,0.5)',
        }} />

        {/* 步骤节点 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {ORDER_STEPS.map((step, i) => {
            const isDone = i <= currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                {/* 节点圆 */}
                <div style={{
                  width: isCurrent ? 28 : 24, height: isCurrent ? 28 : 24,
                  borderRadius: '50%',
                  background: isDone
                    ? (isCurrent ? '#fff' : 'rgba(255,255,255,0.7)')
                    : 'rgba(255,255,255,0.15)',
                  border: isDone ? 'none' : '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isCurrent ? 12 : 10,
                  color: isDone ? (isCurrent ? '#7C5CFC' : 'rgba(124,92,252,0.7)') : 'rgba(255,255,255,0.5)',
                  fontWeight: 800,
                  zIndex: 1,
                  transition: 'all 0.3s',
                  boxShadow: isCurrent ? '0 0 16px rgba(255,255,255,0.5), 0 3px 12px rgba(0,0,0,0.1)' : 'none',
                  transform: isCurrent ? 'scale(1.15)' : '',
                }}>
                  {isDone ? (
                    <span>{i < currentStep ? '✓' : step.icon}</span>
                  ) : (
                    <span>{/* empty */}</span>
                  )}
                </div>
                {/* 标签 */}
                <span style={{
                  marginTop: 5, fontSize: 9.5, fontWeight: isCurrent ? 700 : 500,
                  color: isDone ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                }}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部提示 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(255,255,255,0.15)',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: '#34D399',
          animation: 'pulse 1.5s infinite',
          boxShadow: '0 0 8px rgba(52,211,153,0.5)',
        }} />
        <span style={{ fontSize: 11.5, color: '#fff', fontWeight: 600 }}>
          {ORDER_STEPS[currentStep]?.desc || '订单追踪'}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>· 点击查看详情</span>
      </div>

      {/* pulse 动画样式注入（仅此组件需要） */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );
}

/* ===================================================================
   首页 - 摩登O2O
   =================================================================== */
function HomePage() {
  const nav = useNavigate();
  const { data: cats, isLoading: catsLoading } = useQuery({ queryKey: ['categories'], queryFn: () => serviceApi.listCategories() });
  const { data: svcs, isLoading: svcsLoading } = useQuery({ queryKey: ['services'], queryFn: () => serviceApi.listServices() });
  const { data: talents, isLoading: talentsLoading } = useQuery({ queryKey: ['talents-nearby', 100], queryFn: () => talentApi.nearby(NEARBY_TALENT_QUERY) });
  const { data: bannersData } = useQuery({ queryKey: ['banners'], queryFn: () => api.get('/banners') });
  const categories = (cats as any)?.data || [];
  const categoryIdByKey: Record<string, number> = { leisure: 1, entertainment: 2, massage: 3, cinema: 4 };
  const homeCategories = CATEGORIES.map(c => {
    const apiCat = Array.isArray(categories) ? categories.find((item: any) => Number(item.id) === categoryIdByKey[c.key]) : null;
    return { ...c, label: apiCat?.name || c.label, icon: apiCat?.icon || c.icon };
  });
  const services = ((svcs as any)?.data?.list || []).map(adaptApiService);
  const apiTalentsRaw = Array.isArray((talents as any)?.data) ? (talents as any).data : ((talents as any)?.data?.list || []);
  const talentList = apiTalentsRaw.map(adaptApiTalent);
  const bannerList = Array.isArray((bannersData as any)?.data) ? (bannersData as any).data : ((bannersData as any)?.data?.list || []);

  return (
    <div className="page">

      {/* 顶部 - 渐变品牌头 */}
      <div style={{
        background: 'linear-gradient(180deg, #5B3AFF 0%, #7C5CFC 30%, #9B6FFF 65%, #C4B5FD 100%)',
        padding: '0 20px 72px', position: 'relative', overflow: 'hidden'
      }}>
        {/* 装饰光晕 */}
        <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="animate-float" style={{ position: 'absolute', top: 120, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,107,157,0.08)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div className="animate-float-delayed" style={{ position: 'absolute', bottom: 40, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(52,211,153,0.06)', pointerEvents: 'none', filter: 'blur(30px)' }} />
        {/* 小网格装饰 */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

        {/* 顶部行：品牌 Logo + 城市 + 消息按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, position: 'relative', zIndex: 2 }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08))',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}>🐱</div>
            <div>
              <div className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                <MapPin size={15} color="rgba(255,255,255,0.9)" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>北京</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 1 }}>▾</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>朝阳区 · 当前定位</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button style={{
              width: 40, height: 40, borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
              backdropFilter: 'blur(10px)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', transition: 'all 0.25s',
            }}>
              <Bell size={20} />
              {/* 小红点 */}
              <div style={{
                position: 'absolute', top: 8, right: 8, width: 8, height: 8,
                borderRadius: '50%', background: '#FF4757',
                border: '2px solid rgba(124,92,252,0.6)',
              }} />
            </button>
          </div>
        </div>

        {/* 品牌 Slogan */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: 10, marginBottom: 2 }}>
          <h1 style={{
            color: '#fff', fontSize: 28, fontWeight: 900,
            letterSpacing: 2, margin: 0, lineHeight: 1.2,
            textShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}>喵 搭</h1>
          <p style={{
            color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0 0',
            fontWeight: 500, letterSpacing: 1,
          }}>品质生活 · 即刻陪伴</p>
        </div>

        {/* 订单状态追踪 / 搜索栏 */}
        <OrderTrackerBar />

        {/* 轮播区 */}
        <BannerCarousel banners={bannerList} />
      </div>

      {/* 内容区 - 波浪曲线过渡 */}
      <div style={{
        background: 'var(--bg)', borderRadius: '24px 24px 0 0',
        marginTop: -30, position: 'relative', zIndex: 2, paddingTop: 24,
      }}>
        {/* 把手指示器 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'linear-gradient(90deg, #DDD6FE, #C4B5FD)',
          }} />
        </div>

        {/* 服务分类 — 4 大品类 */}
        <div className="section">
          <div className="section-title" style={{ marginBottom: 16 }}>
            <h2>服务分类</h2>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>全部服务</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {homeCategories.map((c) => {
              const hasImage = isImageIcon(c.icon);
              return (
                <NavLink to={`/services?category=${c.key}`} key={c.key} className="no-underline">
                  <div className="home-cat-card" style={{
                    height: 96, borderRadius: 18, cursor: 'pointer',
                    background: hasImage ? '#111827' : c.bgGrad,
                    border: '1px solid var(--border)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative', overflow: 'hidden',
                    boxShadow: `0 4px 14px ${c.tagColor}18`,
                  }}>
                    {hasImage ? (
                      <img
                        src={c.icon}
                        alt={c.label}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 44, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.12))',
                      }}>
                        {c.icon}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: hasImage
                        ? 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 45%, rgba(0,0,0,0.62) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.10) 100%)',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', left: 6, right: 6, bottom: 7,
                      borderRadius: 999, padding: '4px 4px',
                      background: hasImage ? 'rgba(0,0,0,0.34)' : 'rgba(255,255,255,0.72)',
                      backdropFilter: 'blur(8px)',
                      color: hasImage ? '#fff' : '#1F2937',
                      fontSize: 12, fontWeight: 800, textAlign: 'center',
                      textShadow: hasImage ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
                    }}>{c.label}</div>
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* 快速入口 - 4 宫格 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { icon: '🎁', label: '新人有礼', desc: '首单立减', color: '#E11D48', bg: 'linear-gradient(135deg, #FFF1F2, #FFE4E6)', path: '/invite' },
              { icon: '🛡️', label: '达人入驻', desc: '成为达人', color: '#7C5CFC', bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', path: '/talent-apply' },
              { icon: '🔥', label: '热门排行', desc: '大家都在看', color: '#D97706', bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', path: '/services?sort=hot' },
              { icon: '⚡', label: '限时优惠', desc: '低至5折', color: '#059669', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', path: '/coupons' },
            ].map((item, i) => (
              <div key={i} onClick={() => nav(item.path)}
                className="home-quick-card"
                style={{
                  padding: '14px 4px', borderRadius: 16, textAlign: 'center',
                  background: item.bg, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid transparent',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; el.style.borderColor = item.color + '30'; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = ''; el.style.borderColor = 'transparent'; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14, fontSize: 22,
                  background: 'rgba(255,255,255,0.7)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: item.color, marginBottom: 1 }}>{item.label}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Banner — 新用户福利 */}
        <div className="section">
          <div onClick={() => nav('/coupons')} style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            borderRadius: 20, padding: '24px 22px', color: '#fff', position: 'relative',
            overflow: 'hidden', cursor: 'pointer',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s',
            boxShadow: '0 4px 20px rgba(15,23,42,0.15)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(15,23,42,0.25)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(15,23,42,0.15)'; }}
          >
            {/* 金色光晕装饰 */}
            <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -20, left: '40%', width: 120, height: 80, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(236,72,153,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            {/* 装饰点阵 */}
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', width: 3, height: 3, borderRadius: '50%',
                background: i % 2 === 0 ? 'rgba(250,204,21,0.4)' : 'rgba(236,72,153,0.3)',
                top: `${15 + i * 18}px`, right: `${16 + (i % 2) * 16}px`, pointerEvents: 'none',
              }} />
            ))}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, boxShadow: '0 0 16px rgba(250,204,21,0.3)',
                }}>🎉</div>
                <span style={{
                  background: 'rgba(250,204,21,0.15)', borderRadius: 20,
                  padding: '3px 12px', fontSize: 11, fontWeight: 700,
                  color: '#FACC15', letterSpacing: 1,
                }}>限时活动</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, marginBottom: 4 }}>
                新人专享 <span style={{ color: '#FACC15' }}>· ¥50</span> 福利券
              </div>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 16, lineHeight: 1.5 }}>
                休闲陪伴 · 娱乐陪伴 · 按摩服务 · 影院陪伴 全品类通用
              </div>
              <button style={{
                border: 'none', borderRadius: 50, 
                background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                color: '#1a1a2e', fontWeight: 800, fontSize: 13, padding: '10px 24px',
                cursor: 'pointer', boxShadow: '0 0 20px rgba(250,204,21,0.35)',
                letterSpacing: 0.5,
              }}>
                立即领取 →
              </button>
            </div>
          </div>
        </div>

        {/* 热门推荐 — 大+小布局 */}
        <div className="section">
          <div className="section-title" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, #FF6B9D, #FF8FAB)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, boxShadow: '0 3px 10px rgba(255,107,157,0.3)',
              }}>🔥</div>
              <h2>热门推荐</h2>
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#fff',
                background: 'linear-gradient(135deg, #FF6B9D, #EC4899)',
                padding: '2px 8px', borderRadius: 10, letterSpacing: 1,
              }}>HOT</span>
            </div>
            <NavLink to="/services">查看全部 <ArrowRight size={14} /></NavLink>
          </div>

          {/* 推荐服务卡片 - 横向滑动 */}
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}
            onWheel={(e) => { if (e.deltaY !== 0) { (e.currentTarget as HTMLElement).scrollLeft += e.deltaY; e.preventDefault(); } }}>
            {(Array.isArray(services) ? services : MOCK_SERVICES).slice(0, 4).map((s: any, i: number) => {
              const svc = s.id ? s : MOCK_SERVICES[i];
              const hasServiceImage = isImageIcon(svc.icon);
              const themes = [
                { gradient: 'linear-gradient(160deg, #FF6B9D, #FF8FAB)', light: '#FFF5F7', accent: '#FF6B9D' },
                { gradient: 'linear-gradient(160deg, #5B9EFF, #7CB8FF)', light: '#F0F7FF', accent: '#5B9EFF' },
                { gradient: 'linear-gradient(160deg, #A78BFA, #C4B5FD)', light: '#F5F0FF', accent: '#A78BFA' },
                { gradient: 'linear-gradient(160deg, #34D399, #6EE7B7)', light: '#ECFDF5', accent: '#34D399' },
              ];
              const th = themes[i % 4];
              return (
                <NavLink to={`/service-detail?id=${svc.id}`} key={svc.id || i} className="no-underline"
                  style={{ minWidth: 260, flexShrink: 0 }}>
                  <div style={{
                    background: '#fff', borderRadius: 20, overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', position: 'relative',
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = `0 12px 32px ${th.accent}20`; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; }}
                  >
                    {/* 左侧图标/视觉区 */}
                    <div style={{
                      width: 100, minHeight: 140, background: th.light,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden', flexShrink: 0,
                    }}>
                      {hasServiceImage ? (
                        <>
                          {renderServiceImageFill(svc.icon, 58)}
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.18))' }} />
                        </>
                      ) : (
                        <>
                          <div style={{ position: 'absolute', top: -15, right: -15, width: 50, height: 50, borderRadius: '50%', background: `${th.accent}10` }} />
                          <div style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>
                            {renderServiceIcon(svc.icon, 58)}
                          </div>
                        </>
                      )}
                      {/* 排名 */}
                      <div style={{
                        position: 'absolute', top: 10, left: 10,
                        width: 24, height: 24, borderRadius: 8,
                        background: i === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : th.accent,
                        color: '#fff', fontSize: 11, fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: i === 0 ? '0 2px 10px rgba(255,215,0,0.4)' : '0 2px 8px rgba(0,0,0,0.15)',
                      }}>{i + 1}</div>
                    </div>
                    {/* 右侧信息区 */}
                    <div style={{ padding: '14px 14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 4 }}>{svc.name}</div>
                        <div style={{ fontSize: 11.5, color: '#888', marginBottom: 8, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{svc.desc}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                          {(svc.tags || []).slice(0, 2).map((t: string, ti: number) => (
                            <span key={ti} style={{
                              fontSize: 9.5, fontWeight: 600, color: th.accent,
                              background: th.light, padding: '2px 8px', borderRadius: 8,
                            }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                          <span style={{ fontWeight: 800, fontSize: 18, color: th.accent }}>¥{svc.price}</span>
                          {svc.originalPrice && (
                            <span style={{ fontSize: 11, color: '#ccc', textDecoration: 'line-through' }}>¥{svc.originalPrice}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Star size={11} fill="#FBBF24" stroke="#FBBF24" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{svc.rating || 4.8}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* 精选达人 — 2×2 Grid布局 */}
        <div className="section">
          <div className="section-title" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, boxShadow: '0 3px 10px rgba(245,158,11,0.3)',
              }}>⭐</div>
              <h2>精选达人</h2>
            </div>
            <NavLink to="/talents">更多 <ArrowRight size={14} /></NavLink>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {(talentList.length > 0 ? talentList : []).slice(0, 4).map((t, i) => {
              const themes = [
                { primary: '#7C5CFC', light: '#F0ECFE' },
                { primary: '#EC4899', light: '#FCE7F3' },
                { primary: '#F59E0B', light: '#FEF3C7' },
                { primary: '#10B981', light: '#D1FAE5' },
              ];
              const th = themes[i % 4];
              return (
                <NavLink to={`/talents`} key={t.id} className="no-underline">
                  <div style={{
                    background: '#fff', borderRadius: 18, overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 10px 30px ${th.primary}16`; el.style.borderColor = th.primary + '30'; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; el.style.borderColor = 'var(--border)'; }}
                  >
                    {/* 头像区 */}
                    <div style={{
                      height: 80, background: `linear-gradient(135deg, ${th.light}, #fff)`,
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                      paddingBottom: 4, position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{ position: 'absolute', top: -25, left: '50%', transform: 'translateX(-50%)', width: 100, height: 60, borderRadius: '50%', background: `${th.primary}08` }} />
                      <div style={{
                        width: 52, height: 52, borderRadius: 16, border: '3px solid #fff',
                        boxShadow: `0 4px 12px rgba(0,0,0,0.1), 0 0 0 3px ${th.light}`,
                        overflow: 'hidden', position: 'relative', zIndex: 1,
                      }}>
                        <img src={t.avatar} alt={t.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div style={{
                          position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
                          borderRadius: '50%', background: '#34D399',
                          border: '2px solid #fff', boxShadow: '0 0 6px rgba(52,211,153,0.4)',
                        }} />
                      </div>
                    </div>

                    {/* 信息区 */}
                    <div style={{ padding: '10px 12px 14px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: '#1a1a2e', marginBottom: 4 }}>
                        {t.name}
                        <span style={{ fontSize: 11, color: '#999', fontWeight: 400, marginLeft: 4 }}>
                          {t.gender === '女' ? '♀' : '♂'} {t.age}岁
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 10.5, color: '#888' }}>📍 {t.distance}km</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>
                          <Star size={10} fill="#F59E0B" /> {t.rating}
                        </span>
                      </div>
                      {/* 标签 */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                        {t.tags.slice(0, 2).map((tag, ti) => (
                          <span key={ti} style={{
                            fontSize: 9.5, fontWeight: 600, color: th.primary,
                            background: th.light, padding: '2px 8px', borderRadius: 8,
                          }}>{tag}</span>
                        ))}
                      </div>
                      {/* 按钮 */}
                      <button onClick={(e) => { e.preventDefault(); }}
                        style={{
                          width: '100%', padding: '8px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: `linear-gradient(135deg, ${th.primary}, ${th.primary}CC)`,
                          color: '#fff', fontSize: 12, fontWeight: 700,
                          boxShadow: `0 3px 10px ${th.primary}30`,
                          transition: 'all 0.2s',
                        }}>立即预约</button>
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ===================================================================
   服务列表页
   =================================================================== */
/* ============================================================
   服务列表页 — 完全按图片设计重做
   图1：主列表（竖向大卡片 + 人物肖像 + 浅绿渐变背景 + 投影 + 右侧价格）
   图2：子项目（独立圆角小卡片 + 居中图标 + 左上角装饰弧形 + 柔和投影）
   ============================================================ */
function ServiceListPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const [activeTab, setActiveTab] = useState<'services' | 'talents'>('services');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [detailTalentId, setDetailTalentId] = useState<number | null>(null);

  // 获取所有服务数据
  const { data, isLoading } = useQuery({ queryKey: ['services-all'], queryFn: () => serviceApi.listServices() });
  const { data: serviceCatsData } = useQuery({ queryKey: ['service-categories-for-services-page'], queryFn: () => serviceApi.listCategories() });
  const { data: talentsData } = useQuery({ queryKey: ['talents-nearby', 100], queryFn: () => talentApi.nearby(NEARBY_TALENT_QUERY) });
  const apiList = ((data as any)?.data?.list || []).map(adaptApiService);
  const apiCategories = Array.isArray((serviceCatsData as any)?.data) ? (serviceCatsData as any).data : [];
  const categoryIdByKey: Record<string, number> = { leisure: 1, entertainment: 2, massage: 3, cinema: 4 };
  const allMockServices = getServicesByCategory(null);
  const rawList = apiList.length > 0 ? apiList : allMockServices;
  const list = rawList as ServiceItem[];
  const apiTalentsRaw2 = Array.isArray((talentsData as any)?.data) ? (talentsData as any).data : ((talentsData as any)?.data?.list || []);
  const allTalentsForList = apiTalentsRaw2.map(adaptApiTalent);

  // 按品类分组
  const groupedByCat = CATEGORIES.map(cat => {
    const apiCat = apiCategories.find((c: any) => Number(c.id) === categoryIdByKey[cat.key]);
    const services = list.filter(s => s.category === cat.key);
    return {
      ...cat,
      label: apiCat?.name || cat.label,
      icon: apiCat?.icon || cat.icon,
      services,
      minPrice: Math.min(...services.map(s => s.price)),
      maxPrice: Math.max(...services.map(s => s.price)),
    };
  }).filter(g => g.services.length > 0);

  const openSelectPanel = (catKey: string) => setSelectedCategory(catKey);
  const closeSelectPanel = () => setSelectedCategory(null);
  const currentGroup = selectedCategory ? groupedByCat.find(g => g.key === selectedCategory) : null;

  // 数量增减逻辑
  const updateQuantity = (id: number, price: number, delta: number) => {
    setSelectedItems(prev => {
      const cur = prev[id] || 0;
      const newVal = cur + delta;
      if (newVal <= 0) { const n = {...prev}; delete n[id]; return n; }
      if (price < 130 && newVal < 2) return prev;
      if (delta < 0 && cur <= (price < 130 ? 2 : 1)) return prev;
      return { ...prev, [id]: newVal };
    });
  };

  // 统计
  const selectedCount = Object.values(selectedItems).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(selectedItems).reduce((sum, [idStr, qty]) => {
    const svc = list.find(s => s.id === Number(idStr));
    return sum + (svc?.price || 0) * qty;
  }, 0);

  // ========== 主页面渲染 — 图1风格：竖向大肖像卡片 ==========
  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      {/* 顶部 Tab 栏 */}
      <div style={{
        background: 'linear-gradient(to bottom, #FFF9E8, #FFF5DC)',
        padding: '12px 20px 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          <span
            onClick={() => setActiveTab('services')}
            style={{ fontSize: activeTab === 'services' ? 17 : 15, fontWeight: activeTab === 'services' ? 800 : 600, color: activeTab === 'services' ? '#333' : '#999', borderBottom: activeTab === 'services' ? '3px solid #4CAF50' : '3px solid transparent', paddingBottom: 4, cursor: 'pointer', transition: 'all 0.2s' }}
          >项目介绍</span>
          <span
            onClick={() => setActiveTab('talents')}
            style={{ fontSize: activeTab === 'talents' ? 17 : 15, fontWeight: activeTab === 'talents' ? 800 : 600, color: activeTab === 'talents' ? '#333' : '#999', borderBottom: activeTab === 'talents' ? '3px solid #7C5CFC' : '3px solid transparent', paddingBottom: 4, cursor: 'pointer', transition: 'all 0.2s' }}
          >达人介绍</span>
        </div>
      </div>

      {/* ====== 项目介绍 Tab ====== */}
      {activeTab === 'services' && (<>

      {/* ====== 竖向大卡片列表（图1风格） ====== */}
      <div style={{ padding: '14px 16px', paddingBottom: 100 }}>
        {isLoading ? <LoadingView /> : groupedByCat.map(group => (
          /* ---- 单个大卡片：人物肖像 + 价格 ---- */
          <div key={group.key} onClick={() => openSelectPanel(group.key)}
            style={{
              position: 'relative', marginBottom: 20, cursor: 'pointer',
            }}
          >
            <div style={{
              borderRadius: 18,
              overflow: 'hidden',

              /* 卡片整体投影 */
              boxShadow: `
                0 6px 24px rgba(0,0,0,0.10),
                0 2px 8px rgba(0,0,0,0.06),
                0 0 0 1px rgba(255,255,255,0.7)
              `,

              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.7)';
            }}
            >
              {/* 卡片内部布局 */}
              <div style={{ display: 'flex', alignItems: 'stretch' }}>

                {/* ====== 左侧：人物肖像区（浅绿渐变 + 异形感） ====== */}
                <div style={{
                  width: 130,
                  flexShrink: 0,
                  background: `linear-gradient(165deg, #F1F8E9 0%, ${group.color}AA 50%, ${group.color}88 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 168,
                  padding: '18px 8px',
                  position: 'relative', overflow: 'hidden',

                  /* 肖像框内阴影 */
                  boxShadow: 'inset -4px 0 12px rgba(0,0,0,0.04)',
                }}>
                  {/* 大图标 / 分类图片 */}
                  {renderServiceImageFill(group.icon, 136)}

                  {/* 左上角装饰弧形 */}
                  <div style={{
                    position: 'absolute', top: -15, left: -15, width: 56, height: 56,
                    borderRadius: '50%', background: 'rgba(139,195,74,0.18)',
                    pointerEvents: 'none',
                  }} />
                  {/* 底部装饰 */}
                  <div style={{
                    position: 'absolute', bottom: -10, right: -8, width: 38, height: 38,
                    borderRadius: '50%',
                    background: `${group.tagColor}08`,
                    pointerEvents: 'none',
                  }} />
                  {/* 高光线 */}
                  <div style={{
                    position: 'absolute', left: 3, top: 22, width: 3.5, height: 50,
                    borderRadius: 4, background: 'rgba(255,255,255,0.50)',
                    pointerEvents: 'none',
                  }} />

                  {/* 分类名称水印 */}
                  <div style={{
                    position: 'absolute', bottom: 8, left: 0, right: 0,
                    textAlign: 'center', fontSize: 11, fontWeight: 700,
                    color: 'rgba(80,80,80,0.35)', letterSpacing: 2,
                    pointerEvents: 'none', zIndex: 1,
                  }}>{group.label}</div>
                </div>

                {/* ====== 右侧：信息+价格区（纯白底） ====== */}
                <div style={{
                  flex: 1,
                  background: '#fff',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  padding: '16px 16px 16px 14px',
                }}>
                  {/* 上部信息 */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 19, color: '#222', letterSpacing: 0.3 }}>
                      {group.label}
                    </div>
                    <div style={{
                      marginTop: 6, fontSize: 12.5, color: '#888', lineHeight: 1.55,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {group.services.slice(0, 5).map(s => s.name).join(' / ')}
                      {group.services.length > 5 && ' 等...'}
                    </div>

                    {/* 服务标签小标签 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                      {group.services.slice(0, 3).map(s => (
                        <span key={s.id} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 8,
                          background: group.color, color: group.tagColor, fontWeight: 600,
                        }}>{s.name}</span>
                      ))}
                      {group.services.length > 3 && (
                        <span style={{ fontSize: 10, color: '#AAA', fontWeight: 600 }}>+{group.services.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* 下部：价格 + 按钮 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ color: '#E65100', fontWeight: 900, fontSize: 26 }}>
                        ¥{group.minPrice}
                      </span>
                      <span style={{ fontSize: 11, color: '#BBB' }}>
                        起 · {group.services[0]?.duration || '—'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openSelectPanel(group.key); }}
                      style={{
                        padding: '6px 18px', borderRadius: 20,
                        border: '1.5px solid #4CAF50', background: '#fff',
                        color: '#4CAF50', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        boxShadow: '0 2px 10px rgba(76,175,80,0.18)',
                        transition: 'all 0.2s',
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
                    >
                      选择项目
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========== 选择服务弹窗 — 图2风格：独立圆角小卡片网格 ========== */}
      {selectedCategory && currentGroup && (
        <>
          {/* 遮罩 */}
          <div onClick={closeSelectPanel} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99,
            animation: 'fadeIn 0.25s',
          }} />

          {/* 弹窗主体 */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '82vh',
            background: '#FAFAFA',
            borderRadius: '24px 24px 0 0', zIndex: 100,
            display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.32s ease-out',
          }}>
            {/* 头部 */}
            <div style={{
              padding: '18px 20px 14px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: 800, fontSize: 19, color: '#222' }}>选择服务</div>
              <div onClick={closeSelectPanel} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#EEE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#888', fontSize: 17, lineHeight: 1,
              }}>✕</div>
            </div>

            {/* 分类标题行 */}
            <div style={{
              padding: '0 20px 14px', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>{currentGroup.label}</span>
              <span style={{ fontSize: 12, color: '#999' }}>
                共{currentGroup.services.length}项 · ¥{currentGroup.minPrice}起
              </span>
            </div>

            {/* ====== 子项目列表 — 图2风格：每个服务独立卡片 ====== */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 16px 20px' }}>
              {currentGroup.services.map((s, idx) => {
                const qty = selectedItems[s.id] || 0;
                const needMinTwo = s.price < 130;
                const isSelected = qty > 0;

                return (
                  <div key={s.id} style={{
                    marginBottom: 14,

                    /* 图2风格：圆角卡片 */
                    borderRadius: 20,
                    background: isSelected
                      ? `linear-gradient(145deg, #FFFFFF, ${currentGroup.color})`
                      : `linear-gradient(155deg, #FEFEFE, #F5F7F0)`,

                    border: isSelected ? `2px solid ${currentGroup.tagColor}30` : '1px solid #EEE',
                    overflow: 'hidden',

                    /* 卡片投影 */
                    boxShadow: isSelected
                      ? `0 6px 24px ${currentGroup.tagColor}18, 0 2px 8px rgba(0,0,0,0.04)`
                      : '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',

                    position: 'relative',
                    transition: 'all 0.25s ease',
                    padding: '10px 10px 12px',
                  }}>
                    {/* ====== 上半部分：图标区（图2核心样式） ====== */}
                    <div style={{
                      height: 160, borderRadius: 16, marginBottom: 12,

                      /* 渐变背景 */
                      background: `linear-gradient(150deg, #F1F8E9 0%, ${currentGroup.color}DD 60%, ${currentGroup.color}99 100%)`,

                      /* 内投影让图标有凹陷感 */
                      boxShadow: `inset 0 2px 8px rgba(255,255,255,0.6), inset 0 -2px 8px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.05)`,

                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {/* 图片铺满卡片上半部分，emoji 则居中放大 */}
                      {renderServiceImageFill(s.icon, 128)}

                      {/* 图2特征：左上角装饰弧形 */}
                      <div style={{
                        position: 'absolute', top: -14, left: -14, width: 52, height: 52,
                        borderRadius: '50%', background: 'rgba(139,195,74,0.16)',
                        pointerEvents: 'none', zIndex: 1,
                      }} />
                      {/* 右下装饰 */}
                      <div style={{
                        position: 'absolute', bottom: -8, right: -8, width: 34, height: 34,
                        borderRadius: '50%', background: `${currentGroup.tagColor}06`,
                        pointerEvents: 'none', zIndex: 1,
                      }} />

                      {/* 已选标记 */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 26, height: 26, borderRadius: '50%',
                          background: currentGroup.tagColor, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800,
                          boxShadow: `0 2px 8px ${currentGroup.tagColor}44`,
                        }}>✓</div>
                      )}
                    </div>

                    {/* ====== 中间：名称 + 描述 ====== */}
                    <div style={{ paddingLeft: 2 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#222', marginBottom: 4 }}>
                        {s.name}
                      </div>
                      <div style={{
                        fontSize: 12, color: '#999', lineHeight: 1.45,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {s.desc || s.tags.join(' · ')}
                      </div>
                    </div>

                    {/* ====== 底部：价格 + 操作按钮 ====== */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px dashed #EEE' }}>
                      {/* 左：价格信息 */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ color: '#E65100', fontWeight: 900, fontSize: 20 }}>¥{s.price}</span>
                        <span style={{ fontSize: 11, color: '#AAA' }}>⏱ {s.duration}</span>
                        {needMinTwo && (
                          <span style={{ fontSize: 10, color: '#E65100', background: '#FFF3E0', padding: '1px 7px', borderRadius: 6, fontWeight: 700 }}>×2起订</span>
                        )}
                      </div>

                      {/* 右：操作按钮 */}
                      {isSelected ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {(qty > (needMinTwo ? 2 : 1)) ? (
                            <button onClick={() => updateQuantity(s.id, s.price, -1)} style={{
                              width: 28, height: 28, borderRadius: '50%',
                              border: '1.5px solid #DDD', background: '#fff',
                              color: '#666', fontSize: 16, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0,
                            }}>−</button>
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #EEE', background: '#F5F5F5', color: '#CCC', fontSize: 16, lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</div>
                          )}
                          <span style={{ fontWeight: 900, fontSize: 16, color: '#333', minWidth: 22, textAlign: 'center' }}>{qty}</span>
                          <button onClick={() => updateQuantity(s.id, s.price, 1)} style={{
                            width: 28, height: 28, borderRadius: '50%',
                            border: 'none', background: currentGroup.tagColor, color: '#fff',
                            fontSize: 17, cursor: 'pointer', lineHeight: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 2px 10px ${currentGroup.tagColor}40`,
                          }}>+</button>
                          <button onClick={() => { closeSelectPanel(); nav(`/service-detail?id=${s.id}&from=list&qty=${qty}`); }} style={{
                            marginLeft: 6, padding: '5px 12px', borderRadius: 14,
                            border: '1.5px solid #4CAF50', background: '#fff',
                            color: '#4CAF50', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            whiteSpace: 'nowrap', boxShadow: '0 1px 6px rgba(76,175,80,0.15)',
                          }}>选择达人</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateQuantity(s.id, s.price, needMinTwo ? 2 : 1)}
                          style={{
                            padding: '8px 20px', borderRadius: 18,
                            border: '1.5px solid #4CAF50', background: '#fff',
                            color: '#4CAF50', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: '0 2px 10px rgba(76,175,80,0.18)',
                            transition: 'all 0.2s',
                          }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
                        >
                          选择达人
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>)}

      {/* ========== 底部固定结算栏 ========== */}
      {selectedCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          zIndex: 98, boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
        }}>
          <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#888' }}>已选 {selectedCount} 个项目</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#E65100' }}>¥{totalPrice.toLocaleString()}</div>
            </div>
            <button onClick={() => nav('/service-detail?mode=cart')}
              style={{
                background: 'linear-gradient(135deg, #4CAF50, #43A047)',
                color: '#fff', border: 'none', borderRadius: 16,
                padding: '12px 28px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(76,175,80,0.35)',
              }}
            >立即预约</button>
          </div>
        </div>
      )}

      {/* 客服悬浮 */}
      <div style={{ position: 'fixed', right: 14, bottom: selectedCount > 0 ? 80 : 20, zIndex: 50 }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: 'linear-gradient(135deg, #81C784, #4CAF50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 600,
          boxShadow: '0 3px 14px rgba(76,175,80,0.4)', cursor: 'pointer',
        }}>客服</div>
      </div>
      </>)}

      {/* ====== 达人介绍 Tab ====== */}
      {activeTab === 'talents' && (
        <TalentListSection onSelectTalent={(tid) => { setDetailTalentId(tid); }} onBookTalent={(tid, svcId) => {
          nav(`/service-detail?id=${svcId}&talentId=${tid}`);
        }} />
      )}

      {/* 达人详情抽屉 */}
      {detailTalentId !== null && (() => {
        const talent = allTalentsForList.find(t => t.id === detailTalentId);
        if (!talent) return null;
        const talentServices = list.filter(s => talent.serviceIds.includes(s.id));
        return <TalentDetailDrawer talent={talent} services={talentServices} onClose={() => setDetailTalentId(null)} onBook={(svcId) => { setDetailTalentId(null); nav(`/service-detail?id=${svcId}&talentId=${talent.id}`); }} />;
      })()}
    </div>
  );
}

/* ===================================================================
   达人列表组件 — 服务列表页内 Tab 使用
   =================================================================== */
function TalentListSection({ onSelectTalent, onBookTalent }: {
  onSelectTalent: (id: number) => void;
  onBookTalent: (talentId: number, serviceId: number) => void;
}) {
  const { data: talentsData } = useQuery({ queryKey: ['talents-nearby', 100], queryFn: () => talentApi.nearby(NEARBY_TALENT_QUERY) });
  const apiTalentsRaw = Array.isArray((talentsData as any)?.data) ? (talentsData as any).data : ((talentsData as any)?.data?.list || []);
  const allTalents = apiTalentsRaw.map(adaptApiTalent);
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'orders'>('rating');

  const sorted = [...allTalents].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'distance') return a.distance - b.distance;
    return b.orderCount - a.orderCount;
  });

  /* 达人卡片颜色主题 */
  function getTalentTheme(idx: number) {
    const themes = [
      { grad: 'linear-gradient(145deg, #E8F5E9, #C8E6C9)', accent: '#4CAF50', light: '#E8F5E9', ring: 'rgba(76,175,80,0.15)' },
      { grad: 'linear-gradient(145deg, #EDE7F6, #D1C4E9)', accent: '#7C5CFC', light: '#EDE7F6', ring: 'rgba(124,92,252,0.15)' },
      { grad: 'linear-gradient(145deg, #FFF3E0, #FFE0B2)', accent: '#F59E0B', light: '#FFF3E0', ring: 'rgba(245,158,11,0.15)' },
      { grad: 'linear-gradient(145deg, #E3F2FD, #BBDEFB)', accent: '#3B82F6', light: '#E3F2FD', ring: 'rgba(59,130,246,0.15)' },
      { grad: 'linear-gradient(145deg, #FCE4EC, #F8BBD0)', accent: '#EC4899', light: '#FCE4EC', ring: 'rgba(236,72,153,0.15)' },
      { grad: 'linear-gradient(145deg, #E0F7FA, #B2EBF2)', accent: '#06B6D4', light: '#E0F7FA', ring: 'rgba(6,182,212,0.15)' },
    ];
    return themes[idx % themes.length];
  }

  return (
    <div>
      {/* 筛选排序栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', background: 'rgba(255,255,255,0.6)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        {([
          { key: 'rating' as const, label: '评分最高', icon: '★' },
          { key: 'distance' as const, label: '距离最近', icon: '📍' },
          { key: 'orders' as const, label: '接单最多', icon: '🔥' },
        ]).map(s => (
          <span key={s.key} onClick={() => setSortBy(s.key)} style={{
            padding: '6px 14px', borderRadius: 20,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: sortBy === s.key ? 'linear-gradient(135deg, #4CAF50, #43A047)' : '#fff',
            color: sortBy === s.key ? '#fff' : '#666',
            border: sortBy === s.key ? 'none' : '1px solid #EEE',
            boxShadow: sortBy === s.key ? '0 2px 10px rgba(76,175,80,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s',
          }}>{s.icon} {s.label}</span>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#AAA' }}>共 {allTalents.length} 位达人</span>
      </div>

      {/* 达人卡片列表 */}
      <div style={{ padding: '14px 16px', paddingBottom: 100 }}>
        {sorted.map((t, idx) => {
          const theme = getTalentTheme(idx);
          const svcNames = t.serviceIds.slice(0, 4).map(sid => MOCK_SERVICES.find(s => s.id === sid)?.name).filter(Boolean);

          return (
            <div key={t.id} onClick={() => onSelectTalent(t.id)} style={{
              display: 'flex', alignItems: 'stretch',
              borderRadius: 18, marginBottom: 16, cursor: 'pointer',
              overflow: 'hidden',
              background: '#fff',
              boxShadow: `
                0 6px 24px rgba(0,0,0,0.08),
                0 2px 8px rgba(0,0,0,0.04),
                0 0 0 1px rgba(255,255,255,0.8)
              `,
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)'; }}
            >
              {/* ====== 左侧：头像区域（装饰性渐变框） ====== */}
              <div style={{
                width: 176, flexShrink: 0,
                background: theme.grad,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '18px 12px', position: 'relative', overflow: 'hidden',
                boxShadow: 'inset -4px 0 12px rgba(0,0,0,0.03)',
              }}>
                {/* 装饰弧形 — 左上角 */}
                <div style={{ position: 'absolute', top: -14, left: -14, width: 52, height: 52, borderRadius: '50%', background: `${theme.accent}18`, pointerEvents: 'none' }} />
                {/* 装饰 — 右下角 */}
                <div style={{ position: 'absolute', bottom: -8, right: -8, width: 34, height: 34, borderRadius: '50%', background: `${theme.accent}08`, pointerEvents: 'none' }} />
                {/* 高光线 */}
                <div style={{ position: 'absolute', left: 3, top: 20, width: 3, height: 44, borderRadius: 4, background: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />

                {/* 头像（圆形+边框） */}
                <div style={{
                  width: 136, height: 136, borderRadius: '50%',
                  padding: 4,
                  background: 'rgba(255,255,255,0.85)',
                  boxShadow: `0 8px 26px ${theme.ring}, 0 0 0 3px ${theme.accent}25`,
                  marginBottom: 10,
                }}>
                  <img src={t.avatar} alt={t.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                </div>

                {/* 世代标签 */}
                <span style={{
                  fontSize: 10, fontWeight: 700, color: theme.accent,
                  background: `rgba(255,255,255,0.75)`, padding: '2px 10px', borderRadius: 10,
                  letterSpacing: 1,
                }}>{getGenerationLabel(t.age)}</span>

                {/* 距离水印 */}
                <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'rgba(80,80,80,0.28)', pointerEvents: 'none' }}>
                  📍{t.distance}km
                </div>
              </div>

              {/* ====== 右侧：信息区 ====== */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 14px 12px', minWidth: 0 }}>
                {/* 上部：名字+评分+标签 */}
                <div>
                  {/* 名字行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 17, color: '#222', letterSpacing: 0.3 }}>{t.name}</span>
                    <span style={{ fontSize: 11.5, color: '#999' }}>{t.age}岁 · {t.gender}</span>
                  </div>

                  {/* 评分+订单行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {/* 星级评分 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ color: '#FBBF24', fontSize: 13, fontWeight: 800 }}>★</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>{t.rating}</span>
                    </div>
                    <span style={{ width: 1, height: 11, background: '#E5E5E5' }} />
                    <span style={{ fontSize: 11.5, color: '#888' }}>已服务 <strong>{t.orderCount}</strong> 单</span>
                    <span style={{ width: 1, height: 11, background: '#E5E5E5' }} />
                    <span style={{ fontSize: 11.5, color: theme.accent, fontWeight: 600 }}>📍{t.distance}km</span>
                  </div>

                  {/* 标签 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                    {t.tags.map((tg, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 8,
                        background: theme.light, color: theme.accent, fontWeight: 700,
                      }}>{tg}</span>
                    ))}
                  </div>

                  {/* 简介 */}
                  <div style={{
                    fontSize: 12, color: '#999', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{t.intro}</div>
                </div>

                {/* 下部：可提供服务 + 按钮 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #EEE' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: '60%' }}>
                    {svcNames.map((sn, i) => (
                      <span key={i} style={{
                        fontSize: 9.5, padding: '1px 7px', borderRadius: 6,
                        background: '#F5F5F5', color: '#777', fontWeight: 600,
                      }}>{sn}</span>
                    ))}
                    {t.serviceIds.length > 4 && (
                      <span style={{ fontSize: 9.5, color: '#AAA', fontWeight: 600 }}>+{t.serviceIds.length - 4}项</span>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onSelectTalent(t.id); }} style={{
                    padding: '6px 16px', borderRadius: 20,
                    border: `1.5px solid ${theme.accent}`, background: '#fff',
                    color: theme.accent, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    whiteSpace: 'nowrap', boxShadow: `0 2px 10px ${theme.ring}`,
                  }}>查看详情</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================================================================
   达人详情抽屉 — 从底部弹出
   =================================================================== */
function TalentDetailDrawer({ talent, services, onClose, onBook }: {
  talent: TalentItem;
  services: ServiceItem[];
  onClose: () => void;
  onBook: (serviceId: number) => void;
}) {
  const theme = { accent: '#7C5CFC', light: '#EDE7F6', grad: 'linear-gradient(160deg, #7C5CFC, #A78BFA)' };
  const heroImage = getTalentHeroImage(talent);

  return (
    <>
      {/* 遮罩 */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 28, animation: 'fadeIn 0.25s' }} />

      {/* 抽屉主体 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        maxWidth: 430, width: '100%', maxHeight: '85vh',
        background: '#fff', borderRadius: '26px 26px 0 0',
        zIndex: 29, display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* 顶部头部区域 — 艺术照大图 */}
        <div style={{
          height: 260, background: '#111827', position: 'relative', overflow: 'hidden', borderRadius: '26px 26px 0 0',
        }}>
          {heroImage && <img src={heroImage} alt={talent.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.20) 44%, rgba(0,0,0,0.72) 100%)' }} />

          <div style={{ position: 'absolute', inset: 0, zIndex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {/* 关闭按钮 */}
            <div onClick={onClose} style={{
              position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', fontSize: 16,
            }}>✕</div>

            <div />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* 大头像 */}
              <div style={{
                width: 144, height: 144, borderRadius: '50%',
                padding: 4, background: 'rgba(255,255,255,0.88)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.22)',
              }}>
                <img src={talent.avatar} alt={talent.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 21, letterSpacing: 0.3 }}>{talent.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>
                  {talent.age}岁 · {talent.gender} · {getGenerationLabel(talent.age)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ color: '#FDE68A', fontSize: 14, fontWeight: 800 }}>★</span>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{talent.rating}</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>· 已服务 {talent.orderCount} 单 · {talent.distance}km</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 内容滚动区 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px', marginTop: -18 }}>
          {/* 标签 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, background: '#FAFAFA', borderRadius: 12, padding: '10px 12px' }}>
            {talent.tags.map((tg, i) => (
              <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 14, background: theme.light, color: theme.accent, fontWeight: 700 }}>{tg}</span>
            ))}
          </div>

          {/* 简介 */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#222', marginBottom: 6 }}>个人介绍</div>
            <div style={{ fontSize: 13.5, color: '#666', lineHeight: 1.7, background: '#FAFAFA', borderRadius: 12, padding: '12px 14px' }}>{talent.intro}</div>
          </div>

          {/* 可提供服务列表 */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#222', marginBottom: 10 }}>
              可提供服务 ({services.length})
            </div>
            {services.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FAFAFA', borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderServiceIcon(s.icon, 34)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#AAA' }}>{s.duration} · ⭐{s.rating}</div>
                  </div>
                </div>
                <button onClick={() => onBook(s.id)} style={{
                  padding: '7px 16px', borderRadius: 16,
                  background: `linear-gradient(135deg, ${theme.accent}, #9B6FFF)`, color: '#fff',
                  border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap', boxShadow: `0 3px 12px ${theme.accent}35`,
                }}>¥{s.price} 预约</button>
              </div>
            ))}
          </div>

          {/* 底部留白 */}
          <div style={{ height: 12 }} />
        </div>
      </div>
    </>
  );
}

/* ===================================================================
   服务详情页
   =================================================================== */
function ServiceDetailPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const id = Number(params.get('id'));
  const talentId = Number(params.get('talentId')) || 0;
  const qtyFromList = Math.max(1, Number(params.get('qty')) || 1); // 从列表页传来的数量
  const { data, isLoading } = useQuery({ queryKey: ['service', id], queryFn: () => serviceApi.getServiceDetail(id), enabled: !!id });
  const { data: talentsData } = useQuery({ queryKey: ['talents-nearby', 100], queryFn: () => talentApi.nearby(NEARBY_TALENT_QUERY) });

  // 优先 API 数据，无则查 mock
  const apiSvc = (data as any)?.data;
  const mockSvc = MOCK_SERVICES.find(s => s.id === id);
  const svc = apiSvc && Object.keys(apiSvc).length > 0 ? adaptApiService(apiSvc) : mockSvc;
  const cCfg = svc ? getCategoryConfig((svc as any).category) : null;

  // 达人列表：优先 API 数据
  const apiTalentsRaw = Array.isArray((talentsData as any)?.data) ? (talentsData as any).data : ((talentsData as any)?.data?.list || []);
  const allTalents: TalentItem[] = apiTalentsRaw.map(adaptApiTalent);
  const availableTalents = allTalents.filter(t => t.serviceIds.includes(id));

  const name = (svc as any)?.name || '服务详情';
  const price = (svc as any)?.base_price ?? (svc as any)?.price ?? 0;
  const originalPrice = (svc as any)?.original_price ?? (svc as any)?.originalPrice ?? null;
  const rating = (svc as any)?.rating || 4.7;
  const orderCount = (svc as any)?.order_count ?? (svc as any)?.orderCount ?? 0;
  const description = (svc as any)?.description || (svc as any)?.desc || '品质服务，值得信赖';
  const icon = (svc as any)?.icon || '🎬';
  const tags = (svc as any)?.tags || [];
  const duration = (svc as any)?.duration || '';
  const hasServiceHeroImage = isImageIcon(icon);

  // 达人选择面板
  const [showTalentPanel, setShowTalentPanel] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<TalentItem | null>(null);

  // 从达人页面跳转过来时自动选中达人
  useEffect(() => {
    if (talentId && allTalents.length > 0) {
      const t = allTalents.find(t => t.id === talentId);
      if (t) setSelectedTalent(t);
    }
  }, [talentId, allTalents.length]);

  const handleBook = () => {
    if (selectedTalent) {
      // 已选达人，直接下单
      handleConfirmOrder();
    } else {
      setSelectedTalent(null);
      setShowTalentPanel(true);
    }
  };

  const handleConfirmOrder = () => {
    if (!selectedTalent) return;
    const orderNo = 'TH' + new Date().toISOString().slice(0,10).replace(/-/g,'') + String(Math.floor(Math.random()*10000)).padStart(4,'0');
    const finalAmount = price * qtyFromList;
    const newOrder = {
      id: Date.now(),
      service_name: name + (qtyFromList > 1 ? ` ×${qtyFromList}` : ''),
      talent_name: selectedTalent.name,
      talent_phone: '138****' + String(Math.floor(Math.random()*9000+1000)),
      status: 0,
      order_no: orderNo,
      qty: qtyFromList,
      unit_price: price,
      final_amount: finalAmount,
    };
    setShowTalentPanel(false);
    // 跳转订单确认页
    nav(`/order-detail?id=${newOrder.id}`, { state: { mockOrder: newOrder } });
  };

  return (
    <div className="page">
      {/* 头部 */}
      <div style={{
        background: cCfg?.bgGrad || 'linear-gradient(160deg, #7C5CFC, #A78BFA)',
        padding: '16px 20px 80px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <button onClick={() => nav(-1)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          {cCfg && <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 10 }}>{cCfg.icon} {cCfg.label}</span>}
          <button style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Heart size={18} />
          </button>
        </div>
        <div className="animate-float" style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      </div>

      {isLoading ? <LoadingView /> :
        <div style={{ background: 'var(--bg)', borderRadius: '20px 20px 0 0', marginTop: -56, position: 'relative', zIndex: 2, padding: '24px 20px' }}>
          <div className="card" style={{ padding: 20, borderRadius: 16, marginTop: -60, position: 'relative' }}>
            <div style={{
              height: 220, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, marginBottom: 16, background: cCfg?.bgGrad || 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
              position: 'relative', overflow: 'hidden',
            }}>
              {hasServiceHeroImage ? (
                <>
                  {renderServiceImageFill(icon, 92)}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.12) 100%)' }} />
                </>
              ) : (
                renderServiceIcon(icon, 92)
              )}
              {duration && (
                <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 12, padding: '3px 10px', borderRadius: 8 }}>
                  ⏱ {duration}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-h)' }}>{name}</div>
              {tags.map((t: string, i: number) => (
                <span key={i} className="tag tag-accent" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Stars value={rating} size={14} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rating} 分 · 已售 {orderCount} 单</span>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#FF6B9D' }}>¥{price * qtyFromList}</span>
              {qtyFromList > 1 && (
                <>
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>(¥{price} × {qtyFromList})</span>
                  <span className="tag tag-accent" style={{ fontSize: 11 }}>共{qtyFromList}个</span>
                </>
              )}
              {originalPrice && <span style={{ fontSize: 14, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>¥{originalPrice}</span>}
              {originalPrice && !qtyFromList && <span className="tag tag-accent" style={{ fontSize: 11, marginLeft: 8 }}>立省¥{originalPrice - price}</span>}
            </div>
          </div>

          {/* 服务详情 */}
          <div className="card" style={{ padding: 20, borderRadius: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: 'var(--text-h)' }}>📋 服务介绍</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{description || '涵盖休闲、娱乐、按摩、影院等多品类服务，真人认证，品质保障，随时随地预约体验。'}</p>
          </div>

          {/* 保障 */}
          <div className="card" style={{ padding: 20, borderRadius: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--text-h)' }}>🛡️ 服务保障</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['真人认证', '明码标价', '不满意退款', '准时赴约'].map((t, i) => (
                <div key={i} className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Shield size={14} color="var(--success)" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* 底部操作栏 */}
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            maxWidth: 430, width: '100%', padding: '14px 20px',
            paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--border)', display: 'flex', gap: 12, zIndex: 20,
          }}>
            <button className="btn-outline" style={{ flex: 1, height: 48, borderRadius: 14, gap: 6 }}>
              <MessageCircle size={18} /> 咨询客服
            </button>
            <button className="btn-primary" style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16 }} onClick={handleBook}>
              ¥{price * qtyFromList}{qtyFromList > 1 ? ` ×${qtyFromList}` : ''} {selectedTalent ? `预约 ${selectedTalent.name}` : '立即预约'}
            </button>
          </div>
        </div>}

      {/* ========== 达人选择面板 ========== */}
      {showTalentPanel && (
        <>
          {/* 黑色遮罩 */}
          <div onClick={() => setShowTalentPanel(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 30,
            animation: 'fadeIn 0.25s',
          }} />

          {/* 底部抽屉 */}
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            maxWidth: 430, width: '100%', maxHeight: '70vh',
            background: '#fff', borderRadius: '20px 20px 0 0',
            zIndex: 31, display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s ease-out',
          }}>
            {/* 面板头部 */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-h)' }}>选择达人</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  「{name}」共 {availableTalents.length} 位达人可服务
                </div>
              </div>
              <button onClick={() => setShowTalentPanel(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: 'var(--bg)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}>
                <X size={16} />
              </button>
            </div>

            {/* 达人列表 */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
              {/* 可选的达人 */}
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 500 }}>
                ✅ 可预约（{availableTalents.length}位）
              </div>
              {availableTalents.map(t => {
                const talentCfg = CATEGORIES.find(c => t.serviceIds.some(sid => {
                  const sv = MOCK_SERVICES.find(s => s.id === sid);
                  return sv?.category === c.key;
                }));
                const isSelected = selectedTalent?.id === t.id;
                return (
                  <div key={t.id} onClick={() => setSelectedTalent(t)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
                    borderRadius: 16, cursor: 'pointer', marginBottom: 8,
                    border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    background: isSelected ? 'var(--primary-bg)' : '#fff',
                    transition: 'all 0.2s',
                  }}>
                    {/* 头像 */}
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: talentCfg?.bgGrad || 'var(--primary-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, position: 'relative', overflow: 'hidden',
                    }}>
                      {t.avatar.startsWith('http') ? (
                        <img src={t.avatar} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        t.avatar
                      )}
                      {/* 世代标签 */}
                      <span style={{
                        position: 'absolute', bottom: 0, right: 0,
                        fontSize: 8, fontWeight: 600, padding: '1px 5px',
                        background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
                        color: '#fff', borderRadius: '4px 0 0 0',
                      }}>{getGenerationLabel(t.age)}</span>
                    </div>
                    {/* 信息 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-h)' }}>{t.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.age}岁</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{t.distance}km</span>
                        {t.tags.slice(0, 1).map((tg, i) => (
                          <span key={i} style={{ fontSize: 9, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '1px 6px', borderRadius: 6 }}>{tg}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.intro}
                      </div>
                      <div className="flex items-center gap-2">
                        <Stars value={t.rating} size={11} />
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t.rating} · {t.orderCount}单</span>
                      </div>
                    </div>
                    {/* 价格 */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#FF6B9D' }}>¥{t.price || price}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{isSelected ? '已选' : '可选'}</div>
                    </div>
                  </div>
                );
              })}

              {/* 不可选的达人 — 此服务不可约 */}
              {(() => {
                const unavailableTalents = allTalents.filter(t => !t.serviceIds.includes(id));
                if (unavailableTalents.length === 0) return null;
                return (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 16, marginBottom: 8, fontWeight: 500 }}>
                      🚫 未开通此服务（{unavailableTalents.length}位）
                    </div>
                    {unavailableTalents.map(t => (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
                        borderRadius: 16, marginBottom: 8,
                        border: '1px solid var(--border)',
                        background: '#FAFAFA', opacity: 0.45,
                      }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                          background: '#E5E7EB', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 24, filter: 'grayscale(1)', overflow: 'hidden',
                        }}>
                          {t.avatar.startsWith('http') ? (
                            <img src={t.avatar} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            t.avatar
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 15, color: '#9CA3AF' }}>{t.name}</span>
                            <span style={{ fontSize: 9, color: '#D1D5DB', background: '#F3F4F6', padding: '1px 6px', borderRadius: 6 }}>不可选</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#D1D5DB', marginTop: 2 }}>该达人暂未开通此服务</div>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            {/* 底部确认按钮 */}
            <div style={{
              padding: '12px 20px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <button
                className="btn-primary"
                style={{ width: '100%', height: 48, borderRadius: 14, fontSize: 16 }}
                disabled={!selectedTalent}
                onClick={handleConfirmOrder}
              >
                {selectedTalent ? `确认预约 ${selectedTalent.name} · ¥${selectedTalent.price || price}` : '请先选择一位达人'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ===================================================================
   达人动态页 — 双列瀑布流
   =================================================================== */
/** 为达人生成随机的"照片"颜色/图案，做上下错位的视觉效果 */
function getTalentCardStyle(index: number) {
  const palettes = [
    ['#FF6B9D', '#FFE0EB'], ['#7C5CFC', '#EDE9FE'], ['#F59E0B', '#FEF3C7'],
    ['#34D399', '#D1FAE5'], ['#3B82F6', '#DBEAFE'], ['#EC4899', '#FCE7F3'],
    ['#8B5CF6', '#F3E8FF'], ['#06B6D4', '#CFFAFE'], ['#F97316', '#FFEDD5'],
    ['#84CC16', '#ECFCCB'], ['#14B8A6', '#CCFBF1'], ['#6366F1', '#E0E7FF'],
  ];
  const ph = palettes[index % palettes.length];
  const heights = [200, 250, 220, 280, 210, 240, 270, 200, 260, 225, 245, 210];
  return { bg: ph[0], bgl: ph[1], h: heights[index % heights.length] };
}

/** 根据年龄返回世代标签 */
function getGenerationLabel(age: number): string {
  if (age <= 24) return '00后';
  if (age <= 29) return '95后';
  if (age <= 34) return '90后';
  return '85后';
}

function TalentFeedPage() {
  const nav = useNavigate();
  const { data: talentsData } = useQuery({ queryKey: ['talents-nearby', 100], queryFn: () => talentApi.nearby(NEARBY_TALENT_QUERY) });
  const { data: servicesData } = useQuery({ queryKey: ['services-for-feed'], queryFn: () => serviceApi.listServices() });
  const apiTalentsRaw = Array.isArray((talentsData as any)?.data) ? (talentsData as any).data : ((talentsData as any)?.data?.list || []);
  const allTalents = apiTalentsRaw.map(adaptApiTalent);
  const apiServices = ((servicesData as any)?.data?.list || []).map(adaptApiService);
  const serviceList: ServiceItem[] = apiServices.length > 0 ? apiServices : MOCK_SERVICES;

  // 双列分配
  const leftCol = allTalents.filter((_, i) => i % 2 === 0);
  const rightCol = allTalents.filter((_, i) => i % 2 === 1);

  // 达人详情弹窗
  const [detailId, setDetailId] = useState<number | null>(null);

  return (
    <div className="page" style={{ background: '#F5F0E8' }}>
      {/* 顶部 */}
      <div style={{
        background: 'linear-gradient(160deg, #6D28D9, #7C5CFC, #A78BFA, #C4B5FD)',
        padding: '14px 20px 64px', position: 'relative', overflow: 'hidden',
      }}>
        {/* 装饰圆圈 */}
        <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -15, left: -10, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', top: 30, left: 40, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 0.5 }}>✨ 达人动态</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 3 }}>
              {allTalents.length}位优质达人 · 期待与你相遇
            </div>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}>
            <Search size={17} />
          </div>
        </div>
      </div>

      {/* 双列瀑布流 */}
      <div style={{
        display: 'flex', gap: 10, padding: '0 12px', marginTop: -44, position: 'relative', zIndex: 2,
      }}>
        {/* 左列 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leftCol.map((t, ci) => {
            const cs = getTalentCardStyle(ci * 2);
            const svcNames = t.serviceIds.slice(0, 3).map(sid => {
              const sv = serviceList.find(s => s.id === sid);
              return sv?.name || '';
            }).filter(Boolean);
            return (
              <div key={t.id} onClick={() => setDetailId(t.id)} style={{
                borderRadius: 16, overflow: 'hidden', background: '#fff',
                boxShadow: `
                  0 4px 16px rgba(0,0,0,0.08),
                  0 1px 4px rgba(0,0,0,0.04),
                  0 0 0 1px rgba(255,255,255,0.7)
                `,
                cursor: 'pointer', transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(124,92,252,0.15), 0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.9)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.7)'; }}
              >
                {/* 大图 — 整张铺满 */}
                <div style={{
                  height: cs.h, position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(160deg, ${cs.bg}22, ${cs.bgl})`,
                }}>
                  <img src={t.avatar} alt={t.name} style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transition: 'transform 0.35s ease',
                  }} onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = ''; }} />
                  {/* 代际标签 — 左上角 */}
                  <span style={{
                    position: 'absolute', top: 8, left: 8,
                    background: 'linear-gradient(135deg, #F97316, #FB923C)', backdropFilter: 'blur(6px)',
                    color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(249,115,22,0.4)', letterSpacing: 0.5,
                  }}>{getGenerationLabel(t.age)}</span>
                  {/* 在线状态标签 */}
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'linear-gradient(135deg, #34D399, #22C55E)', backdropFilter: 'blur(6px)',
                    color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                    boxShadow: '0 2px 6px rgba(34,197,94,0.35)',
                  }}>在线</span>
                </div>
                {/* 信息 */}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-h)' }}>{t.name}</span>
                    <span style={{
                      fontSize: 9.5, color: '#fff', background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
                      padding: '1.5px 7px', borderRadius: 8, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      boxShadow: '0 1px 5px rgba(124,92,252,0.3)',
                    }}>📍{t.distance}km</span>
                  </div>
                  {/* 评分+接单 */}
                  <div style={{ fontSize: 11, color: '#F59E0B', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                    ★ {t.rating} <span style={{ color: '#B0B0B0', fontWeight: 400 }}>| {t.orderCount}单</span>
                  </div>
                  {/* 简介 */}
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 7, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.intro}
                  </div>
                  {/* 服务标签 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {svcNames.map((sn, i) => (
                      <span key={i} style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 8,
                        background: `linear-gradient(135deg, ${cs.bg}18, ${cs.bgl})`,
                        color: cs.bg, fontWeight: 700,
                      }}>{sn}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 右列 — 顶部下移制造错位 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 20 }}>
          {rightCol.map((t, ci) => {
            const cs = getTalentCardStyle(ci * 2 + 1);
            const svcNames = t.serviceIds.slice(0, 3).map(sid => {
              const sv = serviceList.find(s => s.id === sid);
              return sv?.name || '';
            }).filter(Boolean);
            return (
              <div key={t.id} onClick={() => setDetailId(t.id)} style={{
                borderRadius: 16, overflow: 'hidden', background: '#fff',
                boxShadow: `
                  0 4px 16px rgba(0,0,0,0.08),
                  0 1px 4px rgba(0,0,0,0.04),
                  0 0 0 1px rgba(255,255,255,0.7)
                `,
                cursor: 'pointer', transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(124,92,252,0.15), 0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.9)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.7)'; }}
              >
                {/* 大图 — 整张铺满 */}
                <div style={{
                  height: cs.h, position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(160deg, ${cs.bg}22, ${cs.bgl})`,
                }}>
                  <img src={t.avatar} alt={t.name} style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transition: 'transform 0.35s ease',
                  }} onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = ''; }} />
                  {/* 代际标签 — 左上角 */}
                  <span style={{
                    position: 'absolute', top: 8, left: 8,
                    background: 'linear-gradient(135deg, #F97316, #FB923C)', backdropFilter: 'blur(6px)',
                    color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(249,115,22,0.4)', letterSpacing: 0.5,
                  }}>{getGenerationLabel(t.age)}</span>
                  {/* 在线状态标签 */}
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'linear-gradient(135deg, #34D399, #22C55E)', backdropFilter: 'blur(6px)',
                    color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                    boxShadow: '0 2px 6px rgba(34,197,94,0.35)',
                  }}>在线</span>
                </div>
                {/* 信息 */}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-h)' }}>{t.name}</span>
                    <span style={{
                      fontSize: 9.5, color: '#fff', background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
                      padding: '1.5px 7px', borderRadius: 8, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      boxShadow: '0 1px 5px rgba(124,92,252,0.3)',
                    }}>📍{t.distance}km</span>
                  </div>
                  {/* 评分+接单 */}
                  <div style={{ fontSize: 11, color: '#F59E0B', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                    ★ {t.rating} <span style={{ color: '#B0B0B0', fontWeight: 400 }}>| {t.orderCount}单</span>
                  </div>
                  {/* 简介 */}
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 7, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.intro}
                  </div>
                  {/* 服务标签 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {svcNames.map((sn, i) => (
                      <span key={i} style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 8,
                        background: `linear-gradient(135deg, ${cs.bg}18, ${cs.bgl})`,
                        color: cs.bg, fontWeight: 700,
                      }}>{sn}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部留白 */}
      <div style={{ height: 20 }} />

      {/* ===== 达人详情底部抽屉 ===== */}
      {detailId !== null && (() => {
        const talent = allTalents.find(t => t.id === detailId);
        if (!talent) return null;
        const talentServices = serviceList.filter(s => talent.serviceIds.includes(s.id));
        const heroImage = getTalentHeroImage(talent);
        return (
          <>
            <div onClick={() => setDetailId(null)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 28,
              animation: 'fadeIn 0.25s',
            }} />
            <div style={{
              position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              maxWidth: 430, width: '100%', maxHeight: '82vh',
              background: '#fff', borderRadius: '24px 24px 0 0',
              zIndex: 29, display: 'flex', flexDirection: 'column',
              animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}>
              {/* 头部大图 */}
              <div style={{
                height: 260, position: 'relative', flexShrink: 0, overflow: 'hidden',
                background: `linear-gradient(160deg, ${getTalentCardStyle(detailId).bg}22, ${getTalentCardStyle(detailId).bgl})`,
                borderRadius: '24px 24px 0 0',
              }}>
                {heroImage && <img src={heroImage} alt={talent.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.68) 100%)' }} />
                <div style={{ position: 'absolute', left: 16, right: 56, bottom: 14, color: '#fff' }}>
                  <div style={{ fontWeight: 900, fontSize: 24, textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>{talent.name}</div>
                  <div style={{ marginTop: 3, fontSize: 12.5, opacity: 0.92 }}>{getGenerationLabel(talent.age)} · {talent.age}岁 · 已服务 {talent.orderCount} 单</div>
                </div>
                {/* 关闭按钮 */}
                <button onClick={(e) => { e.stopPropagation(); setDetailId(null); }} style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 32, height: 32, borderRadius: 10, border: 'none',
                  background: 'rgba(0,0,0,0.3)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}><X size={16} /></button>
              </div>

              {/* 信息区 */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-h)' }}>{talent.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
                    color: '#fff',
                  }}>{getGenerationLabel(talent.age)} · {talent.age}岁</span>
                </div>
                <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                  <Stars value={talent.rating} size={14} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{talent.rating} · 已服务 {talent.orderCount} 单</span>
                </div>
                {/* 距离 */}
                <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
                  <span>距您 {talent.distance}km</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {talent.tags.map((tg, i) => (
                    <span key={i} style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 8,
                      background: '#F3F4F6', color: 'var(--text-secondary)',
                    }}>{tg}</span>
                  ))}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
                  {talent.intro}
                </div>

                {/* 可提供的服务 */}
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-h)', marginBottom: 10 }}>
                  🎯 可预约服务（{talentServices.length}项）
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {talentServices.map(s => {
                    const cCfg = getCategoryConfig(s.category);
                    return (
                      <NavLink to={`/service-detail?id=${s.id}&talentId=${talent.id}`} key={s.id} className="no-underline" onClick={() => setDetailId(null)}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                          borderRadius: 14, border: '1px solid var(--border)',
                          transition: 'all 0.2s',
                        }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                            background: cCfg?.bgGrad || '#F3F4F6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                          }}>
                            {renderServiceIcon(s.icon, 36)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.duration} · {s.desc.slice(0, 30)}...</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 17, color: '#FF6B9D', flexShrink: 0 }}>
                            ¥{s.price}
                          </div>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>

                <div style={{ height: 16 }} />
                {/* 预约按钮 */}
                <button className="btn-primary" style={{
                  width: '100%', height: 50, borderRadius: 14, fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }} onClick={() => {
                  if (talentServices.length > 0) {
                    nav(`/service-detail?id=${talentServices[0].id}&talentId=${talent.id}`);
                    setDetailId(null);
                  }
                }}>
                  <Eye size={18} /> 立即预约 {talent.name}
                </button>
                <div style={{ height: 8 }} />
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

/* ===================================================================
   订单详情页
   =================================================================== */
function OrderDetailPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const st = (loc.state as any) || {};
  const params = new URLSearchParams(loc.search);
  const id = Number(params.get('id'));
  const { data, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => orderApi.detail(id), enabled: !!id });
  // 优先 API 数据，其次导航 state 传过来的 mock 订单，最后为空
  const apiOrder = (data as any)?.data;
  const order = (apiOrder && Object.keys(apiOrder).length > 0) ? apiOrder : (st.mockOrder || {});
  const statusInfo: Record<number, { icon: string; text: string; color: string }> = {
    0: { icon: '⏳', text: '等待支付', color: '#FF6B9D' },
    1: { icon: '🔍', text: '正在为您匹配达人', color: '#FBBF24' },
    2: { icon: '✅', text: '达人已接单', color: '#7C5CFC' },
    3: { icon: '💆', text: '服务进行中', color: '#7C5CFC' },
    4: { icon: '🎉', text: '服务已完成', color: '#34D399' },
    5: { icon: '❌', text: '订单已取消', color: '#9CA3AF' },
  };
  const si = statusInfo[order.status] || statusInfo[0];

  return (
    <div className="page">
      <div className="topbar">
        <ChevronLeft size={22} onClick={() => nav(-1)} style={{ cursor: 'pointer' }} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>订单详情</span>
        <div style={{ width: 22 }} />
      </div>
      {isLoading ? <LoadingView /> :
        <div style={{ padding: '16px 20px' }}>
          {/* 状态卡片 */}
          <div style={{
            background: si.color, borderRadius: 18, padding: '24px 20px',
            color: '#fff', textAlign: 'center', marginBottom: 16,
            boxShadow: `0 8px 32px ${si.color}33`,
          }}>
            <div style={{ fontSize: 40 }}>{si.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{si.text}</div>
            {order.talent_phone && <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>达人电话: {order.talent_phone}</div>}
          </div>

          {/* 达人信息 */}
          {order.talent_name && (
            <div className="card" style={{ padding: 16, borderRadius: 14, marginBottom: 14 }}>
              <div className="flex items-center gap-3">
                <Avatar initials={order.talent_name?.[0] || '达'} size={48} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-h)' }}>{order.talent_name}</div>
                  <Stars value={5} size={12} />
                </div>
              </div>
            </div>
          )}

          {/* 服务信息 */}
          <div className="card" style={{ padding: 16, borderRadius: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-h)' }}>服务信息</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2 }}>
              <div className="flex items-center justify-between"><span>服务项目</span><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.service_name}</span></div>
              <div className="flex items-center justify-between"><span>订单编号</span><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.order_no}</span></div>
              <div className="flex items-center justify-between"><span>服务金额</span><span style={{ color: '#FF6B9D', fontWeight: 700, fontSize: 17 }}>¥{order.final_amount || 0}</span></div>
            </div>
          </div>

          {order.status === 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn-outline" style={{ flex: 1, height: 48, borderRadius: 14 }} onClick={() => {}}>取消订单</button>
              <button className="btn-primary" style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16 }} onClick={() => {}}>立即支付 ¥{order.final_amount}</button>
            </div>
          )}
        </div>}
    </div>
  );
}

/* ===================================================================
   个人中心 — 内嵌订单列表
   =================================================================== */
const MOCK_ORDER_DATA = [
  { id: 1001, service_name: '中式推拿60分钟', talent_name: '林姐', status: 2, order_no: 'TH20260620001', final_amount: 198, service_icon: '💆' },
  { id: 1002, service_name: '电竞游戏2小时', talent_name: '阿杰', status: 4, order_no: 'TH20260618002', final_amount: 128, service_icon: '🎮' },
  { id: 1003, service_name: '泰式SPA90分钟', talent_name: '曼曼', status: 1, order_no: 'TH20260622003', final_amount: 298, service_icon: '🧘' },
  { id: 1004, service_name: '情窦初开', talent_name: '', status: 0, order_no: 'TH20260623004', final_amount: 168, service_icon: '💕' },
  { id: 1005, service_name: 'K歌欢唱3小时', talent_name: '小西', status: 3, order_no: 'TH20260621005', final_amount: 398, service_icon: '🎤' },
];

const statusMap: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: '待支付', color: '#FF6B9D', bg: '#FFE0EB' },
  1: { label: '待接单', color: '#F59E0B', bg: '#FEF3C7' },
  2: { label: '已接单', color: '#7C5CFC', bg: '#EDE9FE' },
  3: { label: '服务中', color: '#3B82F6', bg: '#DBEAFE' },
  4: { label: '已完成', color: '#34D399', bg: '#D1FAE5' },
  5: { label: '已取消', color: '#9CA3AF', bg: '#F3F4F6' },
};

function ProfileOrdersSection() {
  const nav = useNavigate();
  const [orderTab, setOrderTab] = useState(0);
  const orderTabs = ['全部', '待支付', '进行中', '已完成'];
  const statusFilter = [null, 0, [1, 2, 3], 4];

  const filtered = statusFilter[orderTab] === null
    ? MOCK_ORDER_DATA
    : Array.isArray(statusFilter[orderTab])
      ? MOCK_ORDER_DATA.filter(o => (statusFilter[orderTab] as number[]).includes(o.status))
      : MOCK_ORDER_DATA.filter(o => o.status === statusFilter[orderTab]);

  return (
    <div className="card" style={{ marginTop: 14, borderRadius: 14, padding: '14px 0 0' }}>
      <div className="flex items-center justify-between" style={{ padding: '0 16px', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-h)' }}>📋 我的订单</span>
        <span onClick={() => nav('/order-detail?id=0')} style={{
          fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
        }}>
          全部 <ArrowRight size={14} />
        </span>
      </div>

      {/* Tab 筛选 */}
      <div style={{ padding: '0 12px', display: 'flex', gap: 6, marginBottom: 10 }}>
        {orderTabs.map((t, i) => (
          <button key={i} onClick={() => setOrderTab(i)} style={{
            padding: '6px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: orderTab === i ? 600 : 400,
            background: orderTab === i ? 'var(--primary-bg)' : '#F9FAFB',
            color: orderTab === i ? 'var(--primary)' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>{t}</button>
        ))}
      </div>

      {/* 订单列表 */}
      <div style={{ padding: '0 12px' }}>
        {filtered.length === 0 ? (
          <div className="text-center" style={{ padding: '32px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 6, opacity: 0.6 }}>📭</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>暂无订单</div>
          </div>
        ) : (
          filtered.map((o, i) => {
            const si = statusMap[o.status] || statusMap[0];
            return (
              <div key={o.id} onClick={() => nav(`/order-detail?id=${o.id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                cursor: 'pointer',
              }}>
                {/* 图标 */}
                <div style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: '#F3F4F6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 20,
                }}>{o.service_icon}</div>
                {/* 信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)', marginBottom: 2 }}>
                    {o.service_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {o.talent_name ? `达人: ${o.talent_name}` : '待派单'}
                  </div>
                </div>
                {/* 价格+状态 */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#FF6B9D' }}>¥{o.final_amount}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                    background: si.bg, color: si.color,
                  }}>{si.label}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div style={{ height: 6 }} />
    </div>
  );
}

/* ===================================================================
   个人中心页 — 全面美化版
   =================================================================== */
function ProfilePage() {
  const userInfo = useUserStore(s => s.userInfo);
  const logout = useUserStore(s => s.logout);
  const isLoggedIn = useUserStore(s => s.isLoggedIn);
  const nav = useNavigate();

  // 会员等级配置
  const memberLevels = [
    { level: 0, name: '普通会员', color: '#9CA3AF', bg: '#F3F4F6', icon: '🌱' },
    { level: 1, name: '银卡会员', color: '#6B7280', bg: '#E5E7EB', icon: '🥉' },
    { level: 2, name: '金卡会员', color: '#D97706', bg: '#FEF3C7', icon: '🥇' },
    { level: 3, name: '铂金会员', color: '#7C3AED', bg: '#EDE9FE', icon: '💎' },
    { level: 4, name: '钻石会员', color: '#0891B2', bg: '#CFFAFE', icon: '👑' },
  ];
  const ml = memberLevels[Math.min(userInfo?.member_level || 0, 4)];

  // 订单快捷入口
  const orderShortcuts = [
    { key: 'pay', icon: '💳', label: '待支付', count: MOCK_ORDER_DATA.filter(o => o.status === 0).length, color: '#FF6B9D', bg: '#FFE0EB' },
    { key: 'accept', icon: '⏳', label: '待接单', count: MOCK_ORDER_DATA.filter(o => o.status === 1).length, color: '#F59E0B', bg: '#FEF3C7' },
    { key: 'service', icon: '🔧', label: '服务中', count: MOCK_ORDER_DATA.filter(o => o.status === 2 || o.status === 3).length, color: '#3B82F6', bg: '#DBEAFE' },
    { key: 'done', icon: '✅', label: '已完成', count: MOCK_ORDER_DATA.filter(o => o.status === 4).length, color: '#34D399', bg: '#D1FAE5' },
    { key: 'all', icon: '📋', label: '全部', count: MOCK_ORDER_DATA.length, color: '#7C5CFC', bg: '#EDE9FE' },
  ];

  // 常用工具
  const tools = [
    { icon: Heart, label: '我的收藏', desc: '收藏的服务和达人', color: '#FF6B9D', bg: '#FFF0F5', path: '/favorites' },
    { icon: Star, label: '我的评价', desc: '已发表的评价记录', color: '#F59E0B', bg: '#FFFBEB', path: '/reviews' },
    { icon: MapPin, label: '地址管理', desc: '收货/服务地址', color: '#34D399', bg: '#ECFDF5', path: '/address' },
    { icon: Ticket, label: '优惠券', desc: `${Math.floor(Math.random() * 5) + 1}张可用`, color: '#7C5CFC', bg: '#F5F3FF', path: '/coupons' },
    { icon: Gift, label: '邀请好友', desc: '邀请新人得奖励', color: '#EF4444', bg: '#FEF2F2', path: '/invite' },
    { icon: Headphones, label: '客服中心', desc: '在线客服咨询', color: '#06B6D4', bg: '#ECFEFF', path: '/support' },
    { icon: Settings, label: '设置', desc: '账号与隐私设置', color: '#6B7280', bg: '#F9FAFB', path: '/settings' },
    { icon: HelpCircle, label: '帮助反馈', desc: '常见问题与建议', color: '#8B5CF6', bg: '#F5F3FF', path: '/help' },
  ];

  // 功能菜单（底部）
  const menuItems = [
    { icon: User, label: '个人信息', sub: '头像、昵称、性别', color: '#7C5CFC' },
    { icon: Shield, label: '账号安全', sub: '密码、手机号绑定', color: '#3B82F6' },
    { icon: Bell, label: '消息通知', sub: '系统消息、订单提醒', color: '#F59E0B' },
    { icon: FileText, label: '关于我们', sub: '版本 v1.0.0', color: '#6B7280' },
  ];

  return (
    <div className="page" style={{ background: 'linear-gradient(180deg, #7C5CFC 0%, #A78BFA 25%, #F5F0E8 25%, #F5F0E8 100%)', minHeight: '100vh' }}>
      {/* ====== 未登录状态 ====== */}
      {!isLoggedIn ? (
        <>
          {/* 头部装饰区 */}
          <div style={{ padding: '20px 20px 60px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ position: 'absolute', bottom: -15, left: -10, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', top: 40, left: 30, width: 55, height: 55, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: 1 }}>我的</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>喵搭 · 您身边的陪伴服务平台</div>
              </div>
              <div onClick={() => nav('/login?redirect=/profile')} style={{
                width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              }}>
                <MessageCircle size={19} />
              </div>
            </div>
          </div>

          {/* 未登录卡片 */}
          <div style={{
            margin: '-36px 16px 0', background: '#fff', borderRadius: 24, padding: '44px 28px 32px',
            boxShadow: '0 12px 40px rgba(124,92,252,0.15), 0 4px 16px rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 88, height: 88, margin: '0 auto 18px', borderRadius: 28,
              background: 'linear-gradient(160deg, #7C5CFC, #A78BFA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
              boxShadow: '0 8px 24px rgba(124,92,252,0.35)',
            }}>🐱</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>欢迎来到喵搭</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>登录后即可享受专属优惠<br />查看订单、收藏达人、管理地址</div>
            <button onClick={() => nav('/login?redirect=/profile')} style={{
              width: '100%', height: 50, border: 'none', borderRadius: 16,
              background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', color: '#fff',
              fontSize: 17, fontWeight: 800, cursor: 'pointer', letterSpacing: 1,
              boxShadow: '0 6px 20px rgba(124,92,252,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(124,92,252,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,92,252,0.35)'; }}
            >立即登录 / 注册</button>
            <div style={{ marginTop: 16, fontSize: 12, color: '#aaa' }}>登录即表示同意 <span style={{ color: '#7C5CFC', cursor: 'pointer' }}>《用户协议》</span> 和 <span style={{ color: '#7C5CFC', cursor: 'pointer' }}>《隐私政策》</span></div>
          </div>

          {/* 未登录功能提示 */}
          <div style={{ margin: '20px 16px 0' }}>
            {[
              { icon: '🎁', title: '新人专享', desc: '注册即送优惠券礼包' },
              { icon: '⭐', title: '积分奖励', desc: '下单消费赚积分兑好礼' },
              { icon: '💝', title: '会员特权', desc: '升级会员享受专属折扣' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: '#fff', borderRadius: 16, marginTop: i === 0 ? 0 : 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #F5F0E8, #FAF5EE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 32 }} />
        </>
      ) : (
        /* ====== 已登录状态 ====== */
        <>
          {/* ====== 头部区域 ====== */}
          <div style={{ padding: '20px 20px 80px', position: 'relative', overflow: 'hidden' }}>
            {/* 装饰元素 */}
            <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ position: 'absolute', bottom: -15, left: -10, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', top: 30, left: 45, width: 55, height: 55, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ position: 'absolute', bottom: 60, right: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

            {/* 顶部操作栏 */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: 1 }}>我的</div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2 }}>喵搭 · 您身边的陪伴服务平台</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer', position: 'relative',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                }}>
                  <Bell size={18} />
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#FF4757', border: '1.5px solid #fff' }} />
                </div>
                <div onClick={() => nav('/settings')} style={{
                  width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                }}>
                  <Settings size={18} />
                </div>
              </div>
            </div>

            {/* 用户信息卡片 */}
            <div onClick={() => nav('/profile/edit')} style={{
              position: 'relative', zIndex: 1, marginTop: 24, display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer',
            }}>
              {/* 头像 */}
              <div style={{ position: 'relative' }}>
                <img src={userInfo?.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'} alt=""
                  style={{
                    width: 68, height: 68, borderRadius: 22, objectFit: 'cover',
                    border: '3px solid rgba(255,255,255,0.35)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 8,
                  background: ml.bg, border: '2.5px solid #fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>{ml.icon}</div>
              </div>

              {/* 信息 */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: 0.5 }}>{userInfo?.nickname || '喵搭用户'}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: ml.color, background: 'rgba(255,255,255,0.95)',
                    padding: '2px 10px', borderRadius: 10, letterSpacing: 0.5,
                    textShadow: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}>{ml.name}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 4, fontFamily: 'monospace' }}>
                  📱 {userInfo?.phone ? `${String(userInfo.phone).slice(0, 3)}****${String(userInfo.phone).slice(-4)}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>积分 {userInfo?.member_points || 1280}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>|</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>ID: {userInfo?.id || 10001}</span>
                </div>
              </div>

              {/* 箭头 */}
              <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
            </div>
          </div>

          {/* ====== 内容区域 ====== */}
          <div style={{ borderRadius: '24px 24px 0 0', marginTop: -52, position: 'relative', zIndex: 2, background: '#F5F0E8', padding: '0 16px' }}>

            {/* ---- 资产卡片 ---- */}
            <div style={{
              background: '#fff', borderRadius: 18, marginTop: -24,
              padding: '20px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05), 0 0 0 1px rgba(255,255,255,0.8)',
            }}>
              {[
                { icon: '💰', label: '余额', value: `¥${(Math.random() * 500 + 50).toFixed(0)}`, tip: '充值享优惠' },
                { icon: '⭐', label: '积分', value: String(userInfo?.member_points || 1280), tip: `抵¥${((userInfo?.member_points || 1280) / 100).toFixed(0)}` },
                { icon: '🎫', label: '优惠券', value: `${Math.floor(Math.random() * 5 + 1)}张`, tip: '去领取 >' },
                { icon: '📋', label: '全部订单', value: `${MOCK_ORDER_DATA.length}`, tip: '查看详情 >' },
              ].map((item, i) => (
                <div key={i} onClick={() => i === 3 ? nav('/order-detail?id=0') : undefined}
                  style={{ textAlign: 'center', cursor: i === 3 ? 'pointer' : 'default', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => { if (i === 3) e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { if (i === 3) e.currentTarget.style.transform = ''; }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e' }}>{item.value}</div>
                  <div style={{ fontSize: 10.5, color: '#bbb', marginTop: 1 }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: '#ddd', marginTop: 1 }}>{item.tip}</div>
                </div>
              ))}
            </div>

            {/* ---- 我的订单（快捷Tab）---- */}
            <div style={{
              background: '#fff', borderRadius: 18, marginTop: 14, padding: '18px 16px 14px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',  overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>📦 我的订单</span>
                <span onClick={() => nav('/orders')} style={{
                  fontSize: 12, color: '#7C5CFC', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 2,
                }}>全部订单 <ChevronRight size={14} /></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {orderShortcuts.map((os, i) => {
                  const tabMap: Record<string, number> = { pay: 1, accept: 2, service: 3, done: 4, all: 0 };
                  return (
                  <div key={i} onClick={() => nav(`/orders?tab=${tabMap[os.key] || 0}`)} style={{
                    textAlign: 'center', cursor: 'pointer', minWidth: 56, transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
                  >
                    <div style={{
                      width: 46, height: 46, borderRadius: 14, margin: '0 auto 6px',
                      background: os.bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 21, position: 'relative',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${os.color}25`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                    >
                      {os.icon}
                      {os.count > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
                          borderRadius: 9, background: os.color, color: '#fff',
                          fontSize: 9, fontWeight: 800, lineHeight: '18px',
                          padding: '0 5px', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}>{os.count}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#444' }}>{os.label}</span>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* ---- 常用工具网格 ---- */}
            <div style={{
              background: '#fff', borderRadius: 18, marginTop: 14, padding: '18px 14px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', marginBottom: 14, paddingLeft: 4 }}>🛠️ 常用工具</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {tools.map((t, i) => (
                  <div key={i} onClick={() => nav(t.path)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '12px 4px 10px', borderRadius: 14, cursor: 'pointer',
                    transition: 'background 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bg; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 14, background: t.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}>
                      <t.icon size={20} color={t.color} strokeWidth={2.2} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 650, color: '#333', textAlign: 'center' }}>{t.label}</span>
                    <span style={{ fontSize: 9, color: '#bbb', textAlign: 'center', maxWidth: 54, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- 推荐服务横幅 ---- */}
            <div onClick={() => nav('/services')} style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 18,
              marginTop: 14, padding: '20px', cursor: 'pointer', position: 'relative',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(102,126,234,0.3)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: -10, left: 30, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 16, marginBottom: 4 }}>✨ 新人专享福利</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>首单立减 ¥20 · 邀请再得 ¥10</div>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>🎁</div>
              </div>
            </div>

            {/* ---- 功能菜单列表 ---- */}
            <div style={{
              background: '#fff', borderRadius: 18, marginTop: 14, padding: 0,
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 14,
            }}>
              {menuItems.map((mi, i) => (
                <div key={i} onClick={() => {
                  if (mi.label === '个人信息') nav('/profile/edit');
                  else if (mi.label === '账号安全') nav('/security');
                  else if (mi.label === '消息通知') nav('/notifications');
                  else if (mi.label === '关于我们') nav('/about');
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
                  borderBottom: i < menuItems.length - 1 ? '1px solid #f5f5f5' : 'none',
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fafafa'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 12, background: `${mi.color}10`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <mi.icon size={18} color={mi.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{mi.label}</div>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{mi.sub}</div>
                  </div>
                  <ChevronRight size={16} color="#ddd" />
                </div>
              ))}
            </div>

            {/* ---- 退出登录 ---- */}
            <button onClick={logout} style={{
              width: '100%', padding: 15, border: '1.5px solid #FEE2E2', borderRadius: 16,
              background: '#fff', color: '#EF4444', fontSize: 14.5, fontWeight: 750, cursor: 'pointer',
              marginBottom: 16, transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#FCA5A5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#FEE2E2'; }}
            >
              退出登录
            </button>

            <div style={{ height: 24 }} />
          </div>
        </>
      )}
    </div>
  );
}

// 订单筛选 state hook（供 ProfilePage 内使用）
let setOrderFilter: (key: string) => void = () => {};

/* ===================================================================
   底部标签栏
   =================================================================== */
function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/home" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
        <Home size={22} /><span>首页</span>
      </NavLink>
      <NavLink to="/services" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
        <Search size={22} /><span>服务</span>
      </NavLink>
      <NavLink to="/feed" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
        <Users size={22} /><span>达人</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
        <User size={22} /><span>我的</span>
      </NavLink>
    </nav>
  );
}

/* ===================================================================
   达人独立页面 — /talents 路由使用
   =================================================================== */
function TalentStandalonePage() {
  const nav = useNavigate();
  const [detailTalentId, setDetailTalentId] = useState<number | null>(null);
  const { data: talentsData } = useQuery({ queryKey: ['talents-nearby', 100], queryFn: () => talentApi.nearby(NEARBY_TALENT_QUERY) });
  const apiTalentsRaw = Array.isArray((talentsData as any)?.data) ? (talentsData as any).data : ((talentsData as any)?.data?.list || []);
  const allTalentsForPage = apiTalentsRaw.map(adaptApiTalent);

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <div style={{
        background: 'linear-gradient(160deg, #7C5CFC, #9B6FFF, #A78BFA)',
        padding: '14px 18px 50px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -15, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChevronLeft size={22} onClick={() => nav(-1)} style={{ cursor: 'pointer', color: '#fff' }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 19 }}>达人介绍</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 }}>精选优质达人 · 为您提供贴心服务</div>
            </div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            cursor: 'pointer',
          }}>
            <Search size={17} />
          </div>
        </div>
      </div>

      {/* 达人列表内容 */}
      <TalentListSection
        onSelectTalent={(tid) => setDetailTalentId(tid)}
        onBookTalent={(tid, svcId) => nav(`/service-detail?id=${svcId}&talentId=${tid}`)}
      />

      {/* 达人详情抽屉 */}
      {detailTalentId !== null && (() => {
        const talent = allTalentsForPage.find(t => t.id === detailTalentId);
        if (!talent) return null;
        const talentServices = MOCK_SERVICES.filter(s => talent.serviceIds.includes(s.id));
        return <TalentDetailDrawer talent={talent} services={talentServices} onClose={() => setDetailTalentId(null)} onBook={(svcId) => { setDetailTalentId(null); nav(`/service-detail?id=${svcId}&talentId=${talent.id}`); }} />;
      })()}
    </div>
  );
}

/* ===================================================================
   子页面 — 通用导航栏组件
   =================================================================== */
function SubPageNav({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <div style={{
      background: '#fff', padding: '0 16px', height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 10,
      borderBottom: '1px solid #f0f0f0',
    }}>
      <div onClick={() => onBack ? onBack() : nav(-1)} style={{ cursor: 'pointer', padding: '8px 4px' }}>
        <ChevronLeft size={24} color="#333" />
      </div>
      <span style={{ fontWeight: 750, fontSize: 17, color: '#1a1a2e' }}>{title}</span>
      <div>{right || <div style={{ width: 32 }} />}</div>
    </div>
  );
}

/* ===================================================================
   个人信息编辑页 /profile/edit
   =================================================================== */
const MOCK_FAVORITES = [
  { id: 1, type: 'service', name: '中式按摩', icon: '💆‍♂️', price: 168, category: '按摩服务', rating: 4.8 },
  { id: 2, type: 'talent', name: '林悦儿', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', rating: 4.9, orderCount: 1256, tags: ['专业','温柔'] },
  { id: 3, type: 'service', name: '泰式SPA', icon: '🧘', price: 238, category: '按摩服务', rating: 4.9 },
  { id: 4, type: 'talent', name: '陈思琪', avatar: 'https://randomuser.me/api/portraits/women/4.jpg', rating: 4.9, orderCount: 1534, tags: ['资深','专家'] },
  { id: 5, type: 'service', name: '电竞游戏', icon: '🎮', price: 88, category: '娱乐陪伴', rating: 4.7 },
  { id: 6, type: 'service', name: 'K歌微醺', icon: '🎤', price: 168, category: '娱乐陪伴', rating: 4.9 },
];
const MOCK_REVIEWS = [
  { id: 1, service: '中式推拿60分钟', talent: '林姐', rating: 5, content: '手法非常专业，力度适中，体验很好！下次还会再来。', date: '2025-06-18', reply: '感谢您的认可，期待再次为您服务~' },
  { id: 2, service: '电竞陪玩2小时', talent: '阿杰', rating: 4, content: '技术不错，就是沟通稍微少了点。整体还是满意的。', date: '2025-06-10', reply: '' },
  { id: 3, service: '泰式SPA90分钟', talent: '曼曼', rating: 5, content: '环境很好，技师很专业，精油味道也很舒服，非常放松的一次体验！', date: '2025-05-28', reply: '' },
  { id: 4, service: '观影陪伴', talent: '小雨', rating: 5, content: '小姐姐很健谈，电影选得也不错，下次还想约！', date: '2025-05-15', reply: '谢谢亲的好评呀～' },
];

function ProfileEditPage() {
  const userInfo = useUserStore(s => s.userInfo);
  const setUserInfo = useUserStore(s => s.setUserInfo);
  const [nick, setNick] = useState(userInfo?.nickname || '');
  const [gender, setGender] = useState(userInfo?.gender === 2 ? '女' : '男');
  const [bio, setBio] = useState('这个人很懒，什么都没写~');
  const [birthday, setBirthday] = useState('1995-06-15');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setUserInfo({ ...(userInfo as any), nickname: nick });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="个人信息" />
      <div style={{ padding: '16px 16px 24px' }}>
        {/* 头像 */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '24px', textAlign: 'center', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={userInfo?.avatar} alt="" style={{ width: 80, height: 80, borderRadius: 24, objectFit: 'cover', border: '3px solid #EDE9FE' }} />
            <div style={{
              position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 10,
              background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              border: '2px solid #fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,92,252,0.3)',
            }}>✏️</div>
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 10 }}>点击修改头像</div>
        </div>

        {/* 表单项 */}
        {[
          { label: '昵称', value: nick, onChange: (v: string) => setNick(v), placeholder: '请输入昵称', icon: '👤' },
          { label: '性别', value: gender, onChange: () => setGender(gender === '男' ? '女' : '男'), type: 'toggle', icon: '⚡', options: ['男', '女'] as const },
          { label: '生日', value: birthday, onChange: (v: string) => setBirthday(v), type: 'date', icon: '🎂' },
          { label: '个人简介', value: bio, onChange: (v: string) => setBio(v), placeholder: '介绍一下自己吧...', type: 'textarea', icon: '💬' },
        ].map((item, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 10,
            boxShadow: '0 1px 6px rgba(0,0,0,0.02)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: item.type !== 'textarea' ? 10 : 8 }}>
              <span style={{ marginRight: 6 }}>{item.icon}</span> {item.label}
            </div>
            {item.type === 'textarea' ? (
              <textarea
                value={item.value}
                onChange={(e) => item.onChange(e.target.value)}
                placeholder={item.placeholder}
                rows={3}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#333', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            ) : item.type === 'toggle' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                {(item.options as readonly string[]).map((opt) => (
                  <button key={opt} onClick={() => item.onChange(opt)} style={{
                    flex: 1, padding: '10px', border: 'none', borderRadius: 12, cursor: 'pointer',
                    fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                    background: item.value === opt ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)' : '#F5F5F5',
                    color: item.value === opt ? '#fff' : '#888',
                  }}>{opt}</button>
                ))}
              </div>
            ) : item.type === 'date' ? (
              <input type="date" value={item.value}
                onChange={(e) => item.onChange(e.target.value)}
                style={{ width: '100%', border: '1px solid #eee', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#333', outline: 'none' }}
              />
            ) : (
              <input type="text"
                value={item.value}
                onChange={(e) => item.onChange(e.target.value)}
                placeholder={item.placeholder}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, color: '#333', fontWeight: 500 }}
              />
            )}
          </div>
        ))}

        {/* 保存按钮 */}
        <button onClick={handleSave} style={{
          width: '100%', height: 52, border: 'none', borderRadius: 16,
          background: saved ? 'linear-gradient(135deg, #34D399, #22C55E)' : 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
          color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer',
          marginTop: 6, letterSpacing: 1,
          boxShadow: saved ? '0 6px 20px rgba(34,197,94,0.35)' : '0 6px 20px rgba(124,92,252,0.35)',
          transition: 'all 0.25s',
        }}>{saved ? '✔ 已保存' : '保存修改'}</button>
      </div>
    </div>
  );
}

/* ===================================================================
   我的收藏页 /favorites
   =================================================================== */
function FavoritesPage() {
  const [tab, setTab] = useState<'all' | 'service' | 'talent'>('all');
  const filtered = tab === 'all' ? MOCK_FAVORITES : MOCK_FAVORITES.filter(f => f.type === tab);
  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="我的收藏" />
      {/* Tab 切换 */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        {(['全部','服务','达人'] as const).map(t => {
          const k = t === '全部' ? 'all' : t === '服务' ? 'service' : 'talent';
          return (<button key={t} onClick={() => setTab(k)} style={{
            padding: '9px 22px', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13.5, fontWeight: tab === k ? 700 : 500, transition: 'all 0.2s',
            background: tab === k ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)' : '#F5F5F5', color: tab === k ? '#fff' : '#666',
          }}>{t}</button>);
        })}
      </div>
      <div style={{ padding: '16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 48, opacity: 0.5 }}>💔</div>
            <div style={{ color: '#999', marginTop: 12, fontSize: 14 }}>暂无收藏内容</div>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} style={{
            background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            cursor: 'pointer', transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = ''}
          >
            {item.type === 'service' ? (
              <>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(160deg,#FFF5F5,#FFE0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>{item.category}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <span style={{ color: '#FF6B9D', fontWeight: 800, fontSize: 15 }}>¥{item.price}</span>
                    <span style={{ color: '#FFB800', fontSize: 12, fontWeight: 600 }}>★ {item.rating}</span>
                  </div>
                </div>
                <Heart size={20} fill="#FF6B9D" color="#FF6B9D" />
              </>
            ) : (
              <>
                <img src={item.avatar} alt="" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>{(item as any).tags?.join(' · ') || ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <span style={{ color: '#FFB800', fontSize: 12, fontWeight: 600 }}>★ {item.rating}</span>
                    <span style={{ color: '#bbb', fontSize: 11 }}>{item.orderCount}单</span>
                  </div>
                </div>
                <Heart size={20} fill="#FF6B9D" color="#FF6B9D" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   我的评价页 /reviews
   =================================================================== */
function ReviewsPage() {
  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="我的评价" right={<span style={{ fontSize: 13, color: '#7C5CFC', fontWeight: 600 }}>共{MOCK_REVIEWS.length}条</span>} />
      <div style={{ padding: '16px' }}>
        {MOCK_REVIEWS.map(r => (
          <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            {/* 服务信息 + 评分 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{r.service}</span>
                <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>· {r.talent}</span>
              </div>
              <div style={{ display: 'flex', gap: 1 }}>
                {[...Array(5)].map((_, i) => (
                  <Star size={15} fill={i < r.rating ? '#FFB800' : 'none'} color={i < r.rating ? '#FFB800' : '#ddd'} strokeWidth={1.8} key={i} />
                ))}
              </div>
            </div>
            {/* 内容 */}
            <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 10 }}>{r.content}</div>
            {/* 回复 */}
            {r.reply && (
              <div style={{
                background: '#F9F9FB', borderRadius: 12, padding: '12px 14px',
                fontSize: 13, color: '#666', lineHeight: 1.6, borderLeft: '3px solid #7C5CFC',
              }}>
                <span style={{ fontWeight: 700, color: '#7C5CFC', fontSize: 11, marginBottom: 4, display: 'block' }}>商家回复</span>
                {r.reply}
              </div>
            )}
            {/* 时间 */}
            <div style={{ textAlign: 'right', fontSize: 11, color: '#ccc', marginTop: 8 }}>{r.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   地址管理页 /address
   =================================================================== */
function AddressPage() {
  const [addresses, setAddresses] = useState([
    { id: 1, name: '张三', phone: '138****1234', address: '四川省成都市武侯区天府大道中段126号', tag: '家', isDefault: true },
    { id: 2, name: '张三', phone: '138****1234', address: '成都市高新区天府软件园E区1栋', tag: '公司', isDefault: false },
    { id: 3, name: '李四', phone: '139****5678', address: '四川省成都市锦江区春熙路88号', tag: '', isDefault: false },
  ]);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="地址管理" right={
        <span style={{ fontSize: 14, color: '#7C5CFC', fontWeight: 700, cursor: 'pointer' }}
          onClick={() => alert('添加地址（演示）')}>+ 新增</span>
      } />
      <div style={{ padding: '16px' }}>
        {addresses.map(addr => (
          <div key={addr.id} style={{
            background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 12,
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)', position: 'relative',
            borderLeft: addr.isDefault ? '4px solid #7C5CFC' : '4px solid transparent',
          }}>
            {addr.isDefault && <span style={{
              position: 'absolute', top: 12, right: 14, fontSize: 10, fontWeight: 800,
              color: '#7C5CFC', background: '#EDE9FE', padding: '2px 10px', borderRadius: 8,
            }}>默认</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>{addr.name}</span>
              <span style={{ fontSize: 14, color: '#666', fontFamily: 'monospace' }}>{addr.phone}</span>
              {addr.tag && <span style={{
                fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #FF6B9D, #FF8FB1)', padding: '2px 10px', borderRadius: 8,
              }}>{addr.tag}</span>}
            </div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>{addr.address}</div>
            <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #f5f5f5', paddingTop: 12 }}>
              <span style={{ fontSize: 13, color: '#7C5CFC', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setAddresses(a => a.map(x => ({ ...x, isDefault: x.id === addr.id })))}>
                {addr.isDefault ? '★ 已设为默认' : '设为默认'}
              </span>
              <span style={{ fontSize: 13, color: '#3B82F6', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setEditing(editing === addr.id ? null : addr.id)}>
                ✏️ 编辑
              </span>
              <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setAddresses(a => a.filter(x => x.id !== addr.id))}>🗑️ 删除</span>
            </div>
          </div>
        ))}
        {addresses.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 48, opacity: 0.5 }}>📍</div>
            <div style={{ color: '#999', marginTop: 12, fontSize: 14 }}>暂无收货地址</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================================================== 
   优惠券页 /coupons
   =================================================================== */
function CouponsPage() {
  const [ctab, setCtab] = useState<'available' | 'used' | 'expired'>('available');
  const coupons = [
    { id: 1, title: '新人专享券', amount: 20, minSpend: 100, expire: '2025-07-31', status: 'available' as const, color: '#FF6B9D' },
    { id: 2, title: '满减优惠券', amount: 30, minSpend: 200, expire: '2025-08-15', status: 'available' as const, color: '#F59E0B' },
    { id: 3, title: '服务通用券', amount: 50, minSpend: 300, expire: '2025-09-01', status: 'available' as const, color: '#7C5CFC' },
    { id: 4, title: '限时特惠券', amount: 15, minSpend: 80, expire: '2025-06-01', status: 'expired' as const, color: '#9CA3AF' },
    { id: 5, title: '首单立减', amount: 10, minSpend: 50, expire: '2025-05-20', status: 'used' as const, color: '#9CA3AF' },
  ];
  const shown = coupons.filter(c => c.status === ctab);

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="我的优惠券" />
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        {[
          { k: 'available' as const, l: `可使用(${coupons.filter(c=>c.status==='available').length})` },
          { k: 'used' as const, l: `已使用(${coupons.filter(c=>c.status==='used').length})` },
          { k: 'expired' as const, l: `已过期(${coupons.filter(c=>c.status==='expired').length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setCtab(t.k)} style={{
            flex: 1, padding: '14px 0', border: 'none', background: ctab === t.k ? '#fff' : '#fafafa',
            fontWeight: 650, fontSize: 14, color: ctab === t.k ? '#1a1a2e' : '#999', cursor: 'pointer',
            borderBottom: ctab === t.k ? '2px solid #7C5CFC' : '2px solid transparent', transition: 'all 0.2s',
          }}>{t.l}</button>
        ))}
      </div>
      <div style={{ padding: '16px' }}>
        {shown.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 44, opacity: 0.45 }}>🎫</div>
            <div style={{ color: '#bbb', marginTop: 10, fontSize: 14 }}>暂无此类优惠券</div>
          </div>
        ) : shown.map(c => (
          <div key={c.id} style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 12,
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)', position: 'relative',
          }}>
            {/* 锯齿虚线分隔效果用渐变模拟 */}
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* 左侧金额 */}
              <div style={{
                width: 110, background: `linear-gradient(180deg, ${c.color}, ${c.color}dd)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px 0', position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>¥</span>
                  <span style={{ color: '#fff', fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{c.amount}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>满{c.minSpend}可用</div>
                {/* 圆形缺口 */}
                <div style={{ position: 'absolute', top: -10, right: -12, width: 24, height: 24, borderRadius: '50%', background: '#F5F0E8' }} />
                <div style={{ position: 'absolute', bottom: -10, right: -12, width: 24, height: 24, borderRadius: '50%', background: '#F5F0E8' }} />
              </div>
              {/* 右侧信息 */}
              <div style={{ flex: 1, padding: '16px 18px', position: 'relative' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: '#999' }}>有效期至 {c.expire}</div>
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>全平台可用 · 部分服务除外</div>
                {c.status !== 'available' && (
                  <div style={{
                    position: 'absolute', top: 12, right: 14,
                    fontSize: 11, fontWeight: 800, color: '#fff', padding: '3px 10px', borderRadius: 8,
                    background: c.status === 'expired' ? '#9CA3AF' : '#D1D5DB',
                  }}>{c.status === 'used' ? '已使用' : '已过期'}</div>
                )}
                {c.status === 'available' && (
                  <div onClick={() => alert('立即使用优惠券')} style={{
                    position: 'absolute', bottom: 14, right: 14,
                    padding: '6px 18px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    color: '#fff', background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)`, cursor: 'pointer',
                  }}>去使用</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   邀请好友页 /invite
   =================================================================== */
function InvitePage() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="page" style={{ background: 'linear-gradient(180deg, #7C5CFC 0%, #A78BFA 30%, #F5F0E8 30%)', minHeight: '100vh' }}>
      <SubPageNav title="邀请好友" />
      <div style={{ padding: '0 16px 24px' }}>
        {/* 主卡片 */}
        <div style={{
          background: '#fff', borderRadius: 24, padding: '32px 24px', marginTop: -10,
          textAlign: 'center', boxShadow: '0 12px 40px rgba(124,92,252,0.2)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(124,92,252,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(124,92,252,0.05)' }} />

          <div style={{ fontSize: 56, marginBottom: 12, position: 'relative', zIndex: 1 }}>🎁</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#1a1a2e', marginBottom: 6, position: 'relative', zIndex: 1 }}>邀请好友 各得奖励</div>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 28, position: 'relative', zIndex: 1, lineHeight: 1.6 }}>
            每邀请一位新用户注册<br />你获得 <b style={{ color: '#FF6B9D' }}>¥10</b> 红包 · 好友获得 <b style={{ color: '#7C5CFC' }}>¥20</b> 新人券
          </div>

          {/* 邀请码卡片 */}
          <div style={{
            background: 'linear-gradient(160deg, #F5F3FF, #EDE9FE)', borderRadius: 18, padding: '20px', marginBottom: 18, position: 'relative', zIndex: 1,
          }}>
            <div style={{ fontSize: 12, color: '#7C5CFC', fontWeight: 700, marginBottom: 8 }}>我的专属邀请码</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#1a1a2e', letterSpacing: 6, fontFamily: 'monospace' }}>MDDA2025</div>
            <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>复制邀请码分享给好友即可</div>
          </div>

          {/* 按钮 */}
          <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1 }}>
            <button onClick={() => { navigator.clipboard.writeText('MDDA2025'); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
              style={{ flex: 1, height: 48, border: 'none', borderRadius: 14, cursor: 'pointer',
                fontWeight: 800, fontSize: 15, letterSpacing: 0.5,
                background: copied ? 'linear-gradient(135deg,#34D399,#22C55E)' : 'linear-gradient(135deg,#7C5CFC,#A78BFA)',
                color: '#fff', boxShadow: '0 4px 16px rgba(124,92,252,0.3)',
              }}>{copied ? '✓ 已复制' : '复制邀请码'}</button>
            <button onClick={() => alert('分享到微信（演示）')}
              style={{ flex: 1, height: 48, border: 'none', borderRadius: 14, cursor: 'pointer',
                fontWeight: 800, fontSize: 15, letterSpacing: 0.5,
                background: '#07C160', color: '#fff', boxShadow: '0 4px 16px rgba(7,193,96,0.3)',
              }}>分享给微信好友</button>
          </div>
        </div>

        {/* 规则说明 */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 18px', marginTop: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', marginBottom: 14 }}>📋 活动规则</div>
          {[
            { num: '1', text: '被邀请人通过你的邀请码注册即视为有效邀请' },
            { num: '2', text: '邀请奖励将在被邀请人完成首次订单后发放' },
            { num: '3', text: '邀请人数不限，上不封顶，多多益善！' },
            { num: '4', text: '如有作弊行为，平台有权取消奖励资格' },
          ].map(r => (
            <div key={r.num} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: '#7C5CFC', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.num}</span>
              <span style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>{r.text}</span>
            </div>
          ))}
        </div>

        {/* 我的邀请记录 */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '18px', marginTop: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', marginBottom: 14 }}>📊 邀请统计</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[{l:'累计邀请', v:'12位', c:'#7C5CFC'}, {l:'待生效', v:'3位', c:'#F59E0B'}, {l:'累计奖励', v:'¥120', c:'#34D399'}].map(s => (
              <div key={s.l} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 14, background: `${s.c}08` }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   客服中心页 /support
   =================================================================== */
function SupportPage() {
  const [messages, setMessages] = useState<{from:'me'|'cs';text:string;time:string}[]>([
    { from: 'cs', text: '您好！喵搭客服为您服务，请问有什么可以帮您的？', time: '14:30' },
  ]);
  const [msg, setMsg] = useState('');

  const sendMsg = () => {
    if (!msg.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
    setMessages([...messages, { from: 'me', text: msg.trim(), time: timeStr }]);
    setMsg('');
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'cs', text: '收到您的消息啦！我们的客服正在处理中，稍后会有专人回复您~', time: new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) }]);
    }, 1500);
  };

  return (
    <div className="page" style={{ background: '#F5F5F5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SubPageNav title="在线客服" />
      {/* 聊天区域 */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {/* 客服头像提示 */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, margin: '0 auto 8px', background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>🐱</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>喵搭官方客服</div>
          <div style={{ fontSize: 11, color: '#27AE60', marginTop: 2 }}>● 在线</div>
        </div>
        {/* 快捷问题 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
          {['如何下单？','退款政策','优惠券使用','投诉建议'].map(q => (
            <span key={q} onClick={() => { setMsg(q); sendMsg(); }} style={{
              padding: '7px 14px', borderRadius: 16, fontSize: 12, color: '#7C5CFC', background: '#EDE9FE', cursor: 'pointer', fontWeight: 500,
            }}>{q}</span>
          ))}
        </div>
        {/* 消息列表 */}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{ maxWidth: '75%' }}>
              <div style={{
                padding: '12px 16px', borderRadius: m.from === 'me' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: m.from === 'me' ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)' : '#fff',
                color: m.from === 'me' ? '#fff' : '#333', fontSize: 14, lineHeight: 1.65,
                boxShadow: m.from === 'me' ? '0 2px 8px rgba(124,92,252,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
                wordBreak: 'break-all',
              }}>{m.text}</div>
              <div style={{ fontSize: 10, color: '#ccc', marginTop: 4, textAlign: m.from === 'me' ? 'right' : 'left' }}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>
      {/* 输入框 */}
      <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input value={msg} onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          placeholder="输入您的问题..."
          style={{ flex: 1, height: 42, border: '1px solid #eee', borderRadius: 21, padding: '0 18px', fontSize: 14, outline: 'none', background: '#F9F9F9' }} />
        <button onClick={sendMsg} style={{
          width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 3px 10px rgba(124,92,252,0.3)',
        }}>↑</button>
      </div>
    </div>
  );
}

/* ===================================================================
   设置页 /settings
   =================================================================== */
function SettingsPage() {
  const [items, setItems] = useState([
    { key: 'push', label: '推送通知', desc: '接收订单、活动等消息提醒', enabled: true, icon: '🔔', color: '#F59E0B' },
    { key: 'sms', label: '短信通知', desc: '订单状态变更时短信通知', enabled: true, icon: '📱', color: '#3B82F6' },
    { key: 'dark', label: '深色模式', desc: '护眼暗色主题', enabled: false, icon: '🌙', color: '#7C5CFC' },
    { key: 'location', label: '位置权限', desc: '用于显示附近达人和服务', enabled: true, icon: '📍', color: '#EF4444' },
    { key: 'wifi', label: '仅WiFi加载图片', desc: '节省流量', enabled: false, icon: '📶', color: '#10B981' },
  ]);

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="设置" />
      <div style={{ padding: '16px' }}>
        {/* 设置项 */}
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          {items.map((it, i) => (
            <div key={it.key} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              borderBottom: i < items.length - 1 ? '1px solid #f5f5f5' : 'none',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${it.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{it.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 650, fontSize: 14.5, color: '#333' }}>{it.label}</div>
                <div style={{ fontSize: 11.5, color: '#bbb', marginTop: 2 }}>{it.desc}</div>
              </div>
              {/* Toggle Switch */}
              <div onClick={() => setItems(items.map(x => x.key === it.key ? { ...x, enabled: !x.enabled } : x))}
                style={{
                  width: 48, height: 28, borderRadius: 14, cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                  background: it.enabled ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)' : '#E5E7EB',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: it.enabled ? 26 : 2, width: 24, height: 24, borderRadius: 12, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.3s cubic-bezier(0.68,-0.55,0.265,1.55)',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* 其他选项 */}
        {[
          { icon: '🗑️', label: '清除缓存', value: '23.5MB', color: '#6B7280' },
          { icon: 'ℹ️', label: '关于喵搭', value: 'v1.0.0', color: '#7C5CFC' },
          { icon: '⚖️', label: '用户协议', value: '', color: '#3B82F6' },
          { icon: '🔒', label: '隐私政策', value: '', color: '#10B981' },
        ].map((opt, i) => (
          <div key={i} onClick={() => opt.label === '清除缓存' ? alert('缓存已清除！(演示)') : null} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: '#fff',
            borderRadius: i === 0 ? 18 : (i === 1 ? 18 : 0), marginTop: i > 0 ? 10 : 14, boxShadow: '0 1px 6px rgba(0,0,0,0.02)',
            borderBottomLeftRadius: i >= 2 ? 0 : undefined, borderBottomRightRadius: i >= 2 ? 0 : undefined,
            borderTopLeftRadius: i === 3 ? 0 : undefined, borderTopRightRadius: i === 3 ? 0 : undefined,
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 17 }}>{opt.icon}</span>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: '#333' }}>{opt.label}</span>
            </div>
            <span style={{ fontSize: 13, color: '#ccc' }}>{opt.value}<ChevronRight size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }} /></span>
          </div>
        ))}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

/* ===================================================================
   帮助反馈页 /help
   =================================================================== */
function HelpPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const faqs = [
    { q: '如何下单预约服务？', a: '进入首页或服务页面，选择您需要的服务项目，选择合适的达人，确认时间和地点后提交订单即可。支持提前预约和即时下单两种模式。' },
    { q: '支付方式有哪些？', a: '目前支持微信支付、支付宝、银行卡等多种支付方式。新人用户还可使用优惠券抵扣部分费用哦！' },
    { q: '如何申请退款？', a: '在订单详情页点击"申请退款"，填写退款原因后提交。客服会在24小时内审核处理，审核通过后款项将在1-3个工作日内原路退回。' },
    { q: '达人资质如何保障？', a: '所有入驻达人均经过实名认证和背景审查，需提供相关从业资格证书。我们定期对达人进行培训和考核，确保服务质量。' },
    { q: '会员有什么权益？', a: '会员可享受专属折扣、积分加速、优先派单、生日礼包等多项特权。等级越高，权益越丰富！' },
    { q: '如何成为达人？', a: '点击"成为达人"入口，提交个人资料和相关证件进行审核。审核通过后即可接单服务。' },
  ];

  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="帮助与反馈" />
      <div style={{ padding: '16px' }}>
        {/* 搜索框 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 16, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.03)' }}>
          <Search size={18} color="#bbb" />
          <input placeholder="搜索常见问题..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#333', background: 'transparent' }} />
        </div>

        {/* FAQ 列表 */}
        <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', marginBottom: 12, paddingLeft: 2 }}>❓ 常见问题</div>
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', marginBottom: 18 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <div onClick={() => setExpanded(expanded === i ? null : i)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', cursor: 'pointer',
              }}>
                <span style={{ fontWeight: 650, fontSize: 14, color: '#333', flex: 1, paddingRight: 10 }}>{f.q}</span>
                <span style={{
                  transition: 'transform 0.3s', display: 'inline-block',
                  transform: expanded === i ? 'rotate(180deg)' : '',
                  color: expanded === i ? '#7C5CFC' : '#ccc', fontSize: 12,
                }}>▼</span>
              </div>
              {expanded === i && (
                <div style={{ padding: '0 18px 16px', fontSize: 13.5, color: '#666', lineHeight: 1.75, animation: 'fadeIn 0.2s' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* 反馈表单 */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', marginBottom: 14 }}>💬 意见反馈</div>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="请描述您遇到的问题或建议..." style={{
            width: '100%', border: '1.5px solid #eee', borderRadius: 14, padding: '14px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#7C5CFC'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#eee'} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={() => { setFeedback(''); alert('反馈已提交，感谢您的宝贵意见！'); }}
              disabled={!feedback.trim()}
              style={{
                flex: 1, height: 46, border: 'none', borderRadius: 14, cursor: feedback.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 800, fontSize: 15, color: '#fff',
                background: feedback.trim() ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)' : '#ddd',
              }}
            >提交反馈</button>
            <button onClick={() => window.location.href = '/support'} style={{
              height: 46, padding: '0 20px', border: 'none', borderRadius: 14, cursor: 'pointer',
              fontWeight: 700, fontSize: 14, background: '#F5F5F5', color: '#666',
            }}>联系客服</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   账号安全页 /security
   =================================================================== */
function SecurityPage() {
  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="账号安全" />
      <div style={{ padding: '16px' }}>
        {/* 安全评分 */}
        <div style={{ background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', borderRadius: 20, padding: '24px 20px', marginBottom: 14, color: '#fff' }}>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>安全评分</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>85</span>
            <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.9 }}>/ 100</span>
            <span style={{ fontSize: 12, opacity: 0.75, marginLeft: 'auto' }}>良好 ✓</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.3)', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ width: '85%', height: '100%', background: '#fff', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>建议开启所有安全选项以提升账户安全性</div>
        </div>

        {/* 安全项 */}
        {[
          { icon: '🔐', label: '登录密码', status: '已设置', tip: '上次修改: 30天前', color: '#34D399', action: '修改' },
          { icon: '📱', label: '手机绑定', status: '138****1234', tip: '已验证', color: '#34D399', action: '更换' },
          { icon: '📧', label: '邮箱绑定', status: '未绑定', tip: '可用于找回密码', color: '#F59E0B', action: '绑定' },
          { icon: '🧾', label: '实名认证', status: '已认证', tip: '姓名：张*', color: '#34D399', action: '查看' },
          { icon: '🔑', label: '两步验证', status: '未开启', tip: '登录时额外验证码保护', color: '#EF4444', action: '开启' },
          { icon: '🖥️', label: '登录设备', status: '3台设备', tip: 'iPhone 15 · Windows PC · iPad', color: '#7C5CFC', action: '管理' },
        ].map((sec, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 10,
            boxShadow: '0 1px 6px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: `${sec.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{sec.icon}</div>
            <div style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: '#333' }}>{sec.label}</div>
              <div style={{ fontSize: 11.5, color: sec.color, marginTop: 2 }}>{sec.status} · <span style={{ color: '#bbb' }}>{sec.tip}</span></div>
            </div>
            <button onClick={() => alert(`${sec.label}${sec.action}(演示)`)} style={{
              padding: '6px 16px', border: `1.5px solid ${sec.color}`, borderRadius: 10, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 700, color: sec.color, background: 'transparent',
            }}>{sec.action}</button>
          </div>
        ))}

        {/* 安全提示 */}
        <div style={{
          background: '#FEF3C7', borderRadius: 14, padding: '14px 16px', marginTop: 4, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: 12.5, color: '#92400E', lineHeight: 1.6 }}>如发现账号异常或密码泄露，请立即修改密码并联系客服冻结账号。</div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   消息通知页 /notifications
   =================================================================== */
function NotificationsPage() {
  const notifications = [
    { id: 1, type: 'order', title: '订单状态更新', content: '您的订单「中式推拿60分钟」已被达人接单，预计今日15:00开始服务', time: '10分钟前', read: false, icon: '📦', color: '#7C5CFC' },
    { id: 2, type: 'system', title: '系统通知', content: '喵搭APP已更新至v1.2.0版本，新增达人视频介绍功能，快来体验吧！', time: '2小时前', read: false, icon: '📢', color: '#3B82F6' },
    { id: 3, type: 'promo', title: '优惠活动', content: '周末狂欢！本周末全场服务8折优惠，更有满减活动等你来参与~', time: '昨天', read: true, icon: '🎉', color: '#F59E0B' },
    { id: 4, type: 'order', title: '交易完成', content: '您的订单「电竞游戏2小时」已完成，快去评价一下吧！', time: '3天前', read: true, icon: '✅', color: '#34D399' },
    { id: 5, type: 'system', title: '积分到账', content: '恭喜您获得128积分奖励（来源：完成评价），当前积分1408分', time: '5天前', read: true, icon: '⭐', color: '#FF6B9D' },
  ];

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="消息通知" right={<span style={{ fontSize: 12, color: '#7C5CFC', fontWeight: 600, cursor: 'pointer' }}>全部已读</span>} />
      <div style={{ padding: '16px' }}>
        {/* 分类Tab */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['全部','订单','系统','活动'].map(t => (
            <button key={t} style={{ padding: '8px 18px', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: t === '全部' ? 700 : 500, background: t === '全部' ? 'linear-gradient(135deg,#7C5CFC,#A78BFA)' : '#fff', color: t === '全部' ? '#fff' : '#666', boxShadow: t !== '全部' ? '0 1px 4px rgba(0,0,0,0.04)' : 'none' }}>{t}</button>
          ))}
        </div>

        {/* 通知列表 */}
        {notifications.map(n => (
          <div key={n.id} style={{
            background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 10,
            boxShadow: n.read ? '0 1px 4px rgba(0,0,0,0.03)' : '0 3px 12px rgba(124,92,252,0.1)',
            borderLeft: n.read ? 'none' : `4px solid ${n.color}`,
            position: 'relative',
          }}>
            {!n.read && <span style={{ position: 'absolute', top: 14, right: 16, width: 8, height: 8, borderRadius: '50%', background: n.color }} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${n.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{n.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: n.read ? '#666' : '#1a1a2e', marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: n.read ? '#aaa' : '#555', lineHeight: 1.6 }}>{n.content}</div>
                <div style={{ fontSize: 11, color: '#ccc', marginTop: 6 }}>{n.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   关于我们页 (菜单项)
   =================================================================== */
function AboutPage() {
  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <SubPageNav title="关于我们" />
      <div style={{ padding: '16px' }}>
        {/* Logo & 信息 */}
        <div style={{ background: '#fff', borderRadius: 24, padding: '40px 24px', textAlign: 'center', marginBottom: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, margin: '0 auto 16px', background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, boxShadow: '0 8px 24px rgba(124,92,252,0.3)' }}>🐱</div>
          <div style={{ fontWeight: 900, fontSize: 24, color: '#1a1a2e', letterSpacing: 1 }}>喵 搭</div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>MiaoDa · 您身边的陪伴服务平台</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '6px 16px', borderRadius: 20,
            background: '#F5F3FF', fontSize: 12, color: '#7C5CFC', fontWeight: 600,
          }}>v1.0.0 (Build 20250625)</div>
        </div>

        {/* 信息项 */}
        {[
          { icon: '📝', label: '应用名称', value: '喵搭' },
          { icon: '🏢', label: '开发团队', value: '喵搭科技' },
          { icon: '🌐', label: '官方网站', value: 'www.miaoda.com' },
          { icon: '📞', label: '客服热线', value: '400-888-0000' },
          { icon: '📧', label: '联系邮箱', value: 'support@miaoda.com' },
        ].map((info, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i === 4 ? 0 : 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17 }}>{info.icon}</span>
              <span style={{ fontSize: 14, color: '#666' }}>{info.label}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{info.value}</span>
          </div>
        ))}

        {/* 版权 */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#ccc', lineHeight: 1.8 }}>
          © 2025 喵搭科技 版权所有<br />
          增值电信业务经营许可证: 川B2-2025XXXX<br />
          ICP备案号: 川ICP备2025XXXXXXXX号
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   我的订单页 /orders
   =================================================================== */
function OrdersPage() {
  const [searchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get('tab') || '0', 10);
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabs = ['全部', '待支付', '待接单', '进行中', '已完成'];

  const tabFilter = (status: number | null | number[]) => {
    if (status === null) return MOCK_ORDER_DATA;
    if (Array.isArray(status)) return MOCK_ORDER_DATA.filter(o => status.includes(o.status));
    return MOCK_ORDER_DATA.filter(o => o.status === status);
  };

  const filters: (number | null | number[])[] = [null, 0, 1, [2, 3], 4];
  const filtered = tabFilter(filters[activeTab]);

  const nav = useNavigate();

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <div style={{
        background: '#fff', padding: '0 16px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <div onClick={() => nav(-1)} style={{ cursor: 'pointer', padding: '8px 4px' }}>
          <ChevronLeft size={24} color="#333" />
        </div>
        <span style={{ fontWeight: 750, fontSize: 17, color: '#1a1a2e' }}>📋 我的订单</span>
        <span onClick={() => setActiveTab(0)} style={{
          fontSize: 13, color: '#7C5CFC', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>全部 <ChevronRight size={14} /></span>
      </div>

      <div style={{ padding: '16px' }}>
        {/* 状态Tab栏 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: activeTab === i ? 700 : 500,
              background: activeTab === i ? 'linear-gradient(135deg,#7C5CFC,#A78BFA)' : '#fff',
              color: activeTab === i ? '#fff' : '#666',
              boxShadow: activeTab === i ? '0 4px 14px rgba(124,92,252,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.25s',
            }}>{t}</button>
          ))}
        </div>

        {/* 订单卡片列表 */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, color: '#999', fontWeight: 600 }}>暂无订单</div>
            <div style={{ fontSize: 12.5, color: '#bbb', marginTop: 4 }}>去首页看看有什么好服务吧～</div>
            <button onClick={() => nav('/services')} style={{
              marginTop: 18, padding: '10px 32px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, color: '#fff',
              background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
              boxShadow: '0 4px 14px rgba(124,92,252,0.3)',
            }}>去下单</button>
          </div>
        ) : (
          filtered.map((o, i) => {
            const si = statusMap[o.status] || statusMap[0];
            return (
              <div key={o.id} onClick={() => nav(`/order-detail?id=${o.id}`)} style={{
                background: '#fff', borderRadius: 18, padding: '16px 18px', marginBottom: 12,
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.03)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* 左侧图标 */}
                  <div style={{
                    width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                    background: 'linear-gradient(135deg, #F8F6F3, #EDE8DF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  }}>{o.service_icon}</div>
                  {/* 中间信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 3 }}>{o.service_name}</div>
                    <div style={{ fontSize: 12.5, color: '#999' }}>达人: {o.talent_name || '待派单'}</div>
                  </div>
                  {/* 右侧价格+状态 */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#FF6B9D' }}>¥{o.final_amount}</div>
                    <span style={{
                      display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 8, background: si.bg, color: si.color,
                    }}>{si.label}</span>
                  </div>
                </div>
                {/* 底部订单号 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #f0f0f0' }}>
                  <span style={{ fontSize: 11, color: '#ccc' }}>订单号: {o.order_no}</span>
                  <span style={{ fontSize: 11.5, color: '#7C5CFC', fontWeight: 600 }}>查看详情 ›</span>
                </div>
              </div>
            );
          })
        )}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

/* ===================================================================
   达人入驻页 /talent-apply
   =================================================================== */
function TalentApplyPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    real_name: '',
    id_card: '',
    gender: 1,
    birthday: '',
    avatar: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    skills: [] as number[],
    life_photos: [] as string[],
    art_photos: [] as string[],
    service_city: '',
    service_districts: [] as string[],
    introduction: '',
  });
  const [uploading, setUploading] = useState<'avatar' | 'life' | 'art' | null>(null);

  const skillOptions = [
    { id: 1, name: '中式按摩' },
    { id: 2, name: '泰式SPA' },
    { id: 3, name: '扶阳SPA' },
    { id: 4, name: '足疗保健' },
    { id: 5, name: '精油推背' },
    { id: 6, name: '经络疏通' },
    { id: 7, name: '台球陪练' },
    { id: 8, name: '观影陪伴' },
    { id: 9, name: 'K歌微醺' },
    { id: 10, name: '电竞游戏' },
  ];

  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'];
  const districts: Record<string, string[]> = {
    '北京': ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '通州区', '昌平区', '大兴区'],
    '上海': ['浦东新区', '黄浦区', '静安区', '徐汇区', '长宁区', '普陀区', '虹口区', '杨浦区'],
    '广州': ['天河区', '越秀区', '海珠区', '荔湾区', '白云区', '番禺区', '黄埔区', '花都区'],
    '深圳': ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区'],
  };

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleSkill = (id: number) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(id) ? f.skills.filter(s => s !== id) : [...f.skills, id],
    }));
  };

  const toggleDistrict = (d: string) => {
    setForm(f => ({
      ...f,
      service_districts: f.service_districts.includes(d)
        ? f.service_districts.filter(x => x !== d)
        : [...f.service_districts, d],
    }));
  };

  const handlePhotoUpload = async (file: File, type: 'avatar' | 'life' | 'art') => {
    if (!file.type.startsWith('image/')) {
      setToastMsg({ text: '请上传图片文件', type: 'error' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToastMsg({ text: '图片不能超过 10MB', type: 'error' });
      return;
    }
    setUploading(type);
    try {
      const res: any = await talentApi.upload(file);
      const url = res?.data?.url;
      if (!url) throw new Error('上传失败');
      if (type === 'avatar') {
        update('avatar', url);
      } else if (type === 'life') {
        setForm(f => ({ ...f, life_photos: f.life_photos.length < 5 ? [...f.life_photos, url] : f.life_photos }));
      } else {
        setForm(f => ({ ...f, art_photos: f.art_photos.length < 5 ? [...f.art_photos, url] : f.art_photos }));
      }
    } catch (e: any) {
      if (e?.code === 1002 || e?.response?.data?.code === 1002) {
        setToastMsg({ text: '图片可先选择，提交申请前请完成登录', type: 'error' });
      } else {
        setToastMsg({ text: e?.response?.data?.message || e?.message || '上传失败', type: 'error' });
      }
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = (type: 'life' | 'art', index: number) => {
    const key = type === 'life' ? 'life_photos' : 'art_photos';
    setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  };

  const step1Valid = !!(form.real_name?.trim() && form.id_card?.trim() && form.birthday && form.phone?.trim());
  const step2Valid = !!form.avatar && form.life_photos.length > 0 && form.art_photos.length > 0 && form.skills.length > 0 && !!form.service_city && form.service_districts.length > 0;
  const canNext = () => {
    if (step === 1) return step1Valid;
    if (step === 2) return step2Valid;
    return true;
  };

  const handleSubmit = async () => {
    if (!canNext()) return;
    if (!getToken()) {
      setToastMsg({ text: '请先登录后再提交达人入驻申请', type: 'error' });
      setTimeout(() => nav('/login?redirect=/talent-apply'), 800);
      return;
    }
    setLoading(true);
    try {
      await talentApi.apply(form);
      setToastMsg({ text: '申请已提交，请等待审核', type: 'success' });
      setStep(4);
    } catch (e: any) {
      if (e?.code === 1002 || e?.response?.data?.code === 1002) {
        setToastMsg({ text: '登录已失效，请重新登录', type: 'error' });
        setTimeout(() => nav('/login?redirect=/talent-apply'), 800);
        return;
      }
      setToastMsg({ text: e?.response?.data?.message || e?.message || '提交失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  return (
    <div className="page" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '10px 24px', borderRadius: 24,
          background: toastMsg.type === 'success' ? '#10B981' : '#EF4444',
          color: '#fff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', pointerEvents: 'none',
        }}>{toastMsg.text}</div>
      )}

      {/* 顶部 */}
      <div style={{
        background: '#fff', padding: '0 16px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #f0f0f0',
      }}>
        <div onClick={() => nav(-1)} style={{ cursor: 'pointer', padding: '8px 4px' }}>
          <ChevronLeft size={24} color="#333" />
        </div>
        <span style={{ fontWeight: 750, fontSize: 17, color: '#1a1a2e' }}>达人入驻</span>
        <div style={{ width: 32 }} />
      </div>

      {/* 步骤条 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 16px' }}>
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div style={{
              width: 32, height: 32, borderRadius: 16,
              background: step >= s ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)' : '#E5E7EB',
              color: step >= s ? '#fff' : '#9CA3AF', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{s}</div>
            {s < 3 && <div style={{ width: 40, height: 3, borderRadius: 2, background: step > s ? '#7C5CFC' : '#E5E7EB' }} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ padding: '0 16px 40px' }}>
        {/* Step 1: 基本信息 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px' }}>基本信息</h3>
            {[
              { label: '真实姓名', key: 'real_name', placeholder: '请输入真实姓名', type: 'text' },
              { label: '身份证号', key: 'id_card', placeholder: '请输入18位身份证号', type: 'text' },
              { label: '手机号码', key: 'phone', placeholder: '请输入手机号', type: 'tel' },
              { label: '生日', key: 'birthday', placeholder: '请选择生日', type: 'date' },
              { label: '紧急联系人', key: 'emergency_contact', placeholder: '选填', type: 'text' },
              { label: '紧急联系人电话', key: 'emergency_phone', placeholder: '选填', type: 'tel' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>
                  {f.label}{f.key !== 'emergency_contact' && f.key !== 'emergency_phone' ? <span style={{ color: '#EF4444' }}>*</span> : null}
                </label>
                <input
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={e => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB',
                    fontSize: 14, background: '#fff', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#7C5CFC'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            ))}
            {/* 必填提示 */}
            {!step1Valid && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
                padding: '10px 14px', fontSize: 12, color: '#DC2626', lineHeight: 1.5,
              }}>
                请填写以下必填项：
                {!form.real_name?.trim() && ' 真实姓名'}
                {!form.id_card?.trim() && ' 身份证号'}
                {!form.birthday && ' 生日'}
                {!form.phone?.trim() && ' 手机号码'}
              </div>
            )}

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>性别<span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ v: 1, l: '男' }, { v: 2, l: '女' }].map(g => (
                  <button key={g.v} onClick={() => update('gender', g.v)} style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid',
                    borderColor: form.gender === g.v ? '#7C5CFC' : '#E5E7EB',
                    background: form.gender === g.v ? '#F5F3FF' : '#fff',
                    color: form.gender === g.v ? '#7C5CFC' : '#6B7280',
                    fontWeight: form.gender === g.v ? 700 : 500, cursor: 'pointer', fontSize: 14,
                  }}>{g.l}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 服务信息 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px' }}>服务信息</h3>
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', marginBottom: 12 }}>形象资料<span style={{ color: '#EF4444' }}>*</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <label style={{
                  minHeight: 116, borderRadius: 14, border: '1.5px dashed #C4B5FD',
                  background: form.avatar ? '#fff' : '#F5F3FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: 'pointer', textAlign: 'center',
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'avatar')}
                  />
                  {form.avatar ? (
                    <img src={form.avatar} alt="头像" style={{ width: '100%', height: 116, objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 12, color: '#7C5CFC', fontWeight: 700 }}>{uploading === 'avatar' ? '上传中...' : '上传头像'}</span>
                  )}
                </label>
                <label style={{
                  minHeight: 116, borderRadius: 14, border: '1.5px dashed #A7F3D0',
                  background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', textAlign: 'center', position: 'relative',
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => Array.from(e.target.files || []).forEach(file => handlePhotoUpload(file, 'life'))}
                  />
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>{uploading === 'life' ? '上传中...' : `生活照 ${form.life_photos.length}/5`}</span>
                </label>
                <label style={{
                  minHeight: 116, borderRadius: 14, border: '1.5px dashed #FCD34D',
                  background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', textAlign: 'center',
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => Array.from(e.target.files || []).forEach(file => handlePhotoUpload(file, 'art'))}
                  />
                  <span style={{ fontSize: 12, color: '#D97706', fontWeight: 700 }}>{uploading === 'art' ? '上传中...' : `艺术照 ${form.art_photos.length}/5`}</span>
                </label>
              </div>

              {(form.life_photos.length > 0 || form.art_photos.length > 0) && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { title: '生活照', key: 'life' as const, list: form.life_photos },
                    { title: '艺术照', key: 'art' as const, list: form.art_photos },
                  ].map(group => group.list.length > 0 && (
                    <div key={group.key}>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{group.title}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {group.list.map((url, idx) => (
                          <div key={url + idx} style={{ position: 'relative' }}>
                            <img src={url} alt={group.title} style={{ width: 58, height: 58, borderRadius: 10, objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => removePhoto(group.key, idx)}
                              style={{
                                position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                                borderRadius: 9, border: 'none', background: '#EF4444', color: '#fff',
                                fontSize: 12, cursor: 'pointer',
                              }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!step2Valid && (
                <div style={{
                  marginTop: 12, background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#DC2626',
                }}>
                  请至少上传头像、1 张生活照和 1 张艺术照，并填写技能、城市和服务区域。
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 8 }}>
                擅长技能<span style={{ color: '#EF4444' }}>*</span> <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(可多选)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skillOptions.map(s => (
                  <button key={s.id} onClick={() => toggleSkill(s.id)} style={{
                    padding: '8px 16px', borderRadius: 20, border: '1.5px solid',
                    borderColor: form.skills.includes(s.id) ? '#7C5CFC' : '#E5E7EB',
                    background: form.skills.includes(s.id) ? '#F5F3FF' : '#fff',
                    color: form.skills.includes(s.id) ? '#7C5CFC' : '#6B7280',
                    fontWeight: form.skills.includes(s.id) ? 600 : 500, cursor: 'pointer', fontSize: 13,
                  }}>{s.name}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>服务城市<span style={{ color: '#EF4444' }}>*</span></label>
              <select
                value={form.service_city}
                onChange={e => update('service_city', e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB',
                  fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              >
                <option value="">请选择城市</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {form.service_city && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 8 }}>
                  服务区域<span style={{ color: '#EF4444' }}>*</span> <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(可多选)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(districts[form.service_city] || []).map(d => (
                    <button key={d} onClick={() => toggleDistrict(d)} style={{
                      padding: '8px 16px', borderRadius: 20, border: '1.5px solid',
                      borderColor: form.service_districts.includes(d) ? '#7C5CFC' : '#E5E7EB',
                      background: form.service_districts.includes(d) ? '#F5F3FF' : '#fff',
                      color: form.service_districts.includes(d) ? '#7C5CFC' : '#6B7280',
                      fontWeight: form.service_districts.includes(d) ? 600 : 500, cursor: 'pointer', fontSize: 13,
                    }}>{d}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>个人简介</label>
              <textarea
                value={form.introduction}
                onChange={e => update('introduction', e.target.value)}
                placeholder="简单介绍一下自己，让用户更了解你..."
                rows={4}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB',
                  fontSize: 14, background: '#fff', outline: 'none', resize: 'none',
                  boxSizing: 'border-box', lineHeight: 1.6,
                }}
                onFocus={e => e.target.style.borderColor = '#7C5CFC'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>
        )}

        {/* Step 3: 确认提交 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px' }}>确认信息</h3>
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: '真实姓名', value: form.real_name },
                { label: '身份证号', value: form.id_card.replace(/^(.{4}).*(.{4})$/, '$1********$2') },
                { label: '性别', value: form.gender === 1 ? '男' : '女' },
                { label: '手机号', value: form.phone },
                { label: '生日', value: form.birthday },
                { label: '头像', value: form.avatar ? '已上传' : '未上传' },
                { label: '生活照', value: `${form.life_photos.length} 张` },
                { label: '艺术照', value: `${form.art_photos.length} 张` },
                { label: '服务城市', value: form.service_city },
                { label: '服务区域', value: form.service_districts.join('、') },
                { label: '擅长技能', value: skillOptions.filter(s => form.skills.includes(s.id)).map(s => s.name).join('、') },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', maxWidth: '60%', textAlign: 'right' }}>{item.value || '-'}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, padding: '0 4px' }}>
              提交后平台将在 1-3 个工作日内完成审核。审核通过后，您将可以接单服务。请确保信息真实有效，虚假信息将导致申请被拒绝。
            </div>
          </div>
        )}

        {/* Step 4: 成功 */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 36,
            }}>🎉</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>申请提交成功</h3>
            <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
              您的达人入驻申请已提交，平台将在 1-3 个工作日内完成审核。<br />审核结果将通过短信通知您。
            </p>
            <button onClick={() => nav('/home')} style={{
              padding: '12px 40px', borderRadius: 24, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, color: '#fff',
              background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
              boxShadow: '0 4px 14px rgba(124,92,252,0.3)',
            }}>返回首页</button>
          </div>
        )}

        {/* 底部按钮 */}
        {step < 4 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                flex: 1, padding: '14px', borderRadius: 14, border: '1.5px solid #E5E7EB',
                background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 15,
                cursor: 'pointer',
              }}>上一步</button>
            )}
            {step < 3 ? (
              <button onClick={() => canNext() && setStep(s => s + 1)} style={{
                flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                background: canNext() ? 'linear-gradient(135deg, #7C5CFC, #A78BFA)' : '#E5E7EB',
                color: canNext() ? '#fff' : '#9CA3AF', fontWeight: 700, fontSize: 15,
                cursor: canNext() ? 'pointer' : 'not-allowed',
                boxShadow: canNext() ? '0 4px 14px rgba(124,92,252,0.3)' : 'none',
              }}>下一步</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} style={{
                flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(124,92,252,0.3)',
              }}>{loading ? '提交中...' : '提交申请'}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================================================================
   路由 & 应用入口
   =================================================================== */
function AppRoutes() {
  const location = useLocation();
  const showTab = ['/', '/home', '/services', '/orders', '/profile', '/talents', '/feed'].includes(location.pathname);
  return (
    <>
      <div style={{ paddingBottom: showTab ? 60 : 0 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/services" element={<ServiceListPage />} />
          <Route path="/service-detail" element={<ServiceDetailPage />} />
          <Route path="/talents" element={<TalentStandalonePage />} />
          <Route path="/feed" element={<TalentFeedPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/order-detail" element={<OrderDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/address" element={<AddressPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/talent-apply" element={<TalentApplyPage />} />
        </Routes>
      </div>
      {showTab && <TabBar />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
