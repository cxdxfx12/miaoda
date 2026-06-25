'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Save, X, Loader2,
  Package, Layers, Clock, DollarSign, Star, Filter, Upload, Image as ImageIcon,
} from 'lucide-react';
import { serviceApi, ServiceItem, ServiceCategory, ServiceSpec } from '@/api/services';

/* ========== 分类映射 ========== */
const CATEGORY_MAP: Record<number, { name: string; icon: string; color: string }> = {
  1: { name: '休闲陪伴', icon: '🎱', color: '#3B82F6' },
  2: { name: '娱乐陪伴', icon: '🎮', color: '#F59E0B' },
  3: { name: '按摩服务', icon: '💆', color: '#EF4444' },
  4: { name: '影院陪伴', icon: '🎬', color: '#8B5CF6' },
};

const ALL_CATEGORIES = [
  { id: 0, name: '全部', icon: '📋' },
  { id: 1, name: '休闲陪伴', icon: '🎱' },
  { id: 2, name: '娱乐陪伴', icon: '🎮' },
  { id: 3, name: '按摩服务', icon: '💆' },
  { id: 4, name: '影院陪伴', icon: '🎬' },
];

function isImageValue(value?: string) {
  return !!value && (/^https?:\/\//.test(value) || value.startsWith('/uploads/'));
}

function renderIcon(value?: string, fallback = '📦', className = 'h-8 w-8 rounded-lg') {
  if (isImageValue(value)) {
    return <img src={value} alt="图标" className={`${className} object-cover`} />;
  }
  return <span>{value || fallback}</span>;
}

/* ========== Mock 数据（后端API未就绪时使用） ========== */
const MOCK_SERVICES: ServiceItem[] = [
  // 休闲陪伴
  { id: 101, name: '台球陪练', description: '专业台球陪练，技术指导+对打练习，适合各水平玩家', cover_image: '', images: [], category_id: 1, base_price: 88, original_price: 128, specs: [{ name: '1小时', price: 88, duration: 60 }], status: 1, sort_order: 1, order_count: 326, view_count: 1200, category_name: '休闲陪伴', category_icon: '🎱' },
  { id: 102, name: '观影陪伴', description: '陪你看电影，聊剧情、分享感悟，让观影不再孤单', cover_image: '', images: [], category_id: 1, base_price: 68, original_price: 0, specs: [{ name: '1场', price: 68, duration: 120 }], status: 1, sort_order: 2, order_count: 512, view_count: 2100, category_name: '休闲陪伴', category_icon: '🍿' },
  { id: 103, name: '茶艺品鉴', description: '专业茶艺师带你品味各类名茶，讲解茶文化知识与冲泡技艺', cover_image: '', images: [], category_id: 1, base_price: 128, original_price: 168, specs: [{ name: '2小时', price: 128, duration: 120 }], status: 1, sort_order: 3, order_count: 189, view_count: 980, category_name: '休闲陪伴', category_icon: '🍵' },
  { id: 104, name: '爬山徒步', description: '户外爬山徒步，沿途赏景拍照，健康运动新方式', cover_image: '', images: [], category_id: 1, base_price: 158, original_price: 0, specs: [{ name: '半天', price: 158, duration: 240 }], status: 1, sort_order: 4, order_count: 257, view_count: 850, category_name: '休闲陪伴', category_icon: '⛰️' },
  { id: 105, name: '麻将陪玩', description: '麻将搭子陪玩，川麻、广麻、国标均可，技术水平在线', cover_image: '', images: [], category_id: 1, base_price: 98, original_price: 0, specs: [{ name: '2小时', price: 98, duration: 120 }], status: 1, sort_order: 5, order_count: 445, view_count: 1600, category_name: '休闲陪伴', category_icon: '🀄' },
  { id: 106, name: '吃饭陪伴', description: '陪你吃饭聊天，探店网红餐厅，让每一餐都有温度', cover_image: '', images: [], category_id: 1, base_price: 128, original_price: 0, specs: [{ name: '1餐', price: 128, duration: 90 }], status: 1, sort_order: 6, order_count: 623, view_count: 2300, category_name: '休闲陪伴', category_icon: '🍽️' },
  { id: 107, name: '逛街陪伴', description: '专业逛街搭子，帮你搭配、参考意见，购物不再纠结', cover_image: '', images: [], category_id: 1, base_price: 108, original_price: 0, specs: [{ name: '2小时', price: 108, duration: 120 }], status: 1, sort_order: 7, order_count: 378, view_count: 1400, category_name: '休闲陪伴', category_icon: '🛍️' },
  { id: 108, name: '桌游陪玩', description: '狼人杀、剧本杀、三国杀，各种桌游陪玩，组局无压力', cover_image: '', images: [], category_id: 1, base_price: 78, original_price: 0, specs: [{ name: '2小时', price: 78, duration: 120 }], status: 1, sort_order: 8, order_count: 534, view_count: 1900, category_name: '休闲陪伴', category_icon: '🎲' },
  // 娱乐陪伴
  { id: 201, name: '电竞游戏', description: 'LOL/王者/吃鸡/PUBG陪玩，大神带你飞，轻松上分', cover_image: '', images: [], category_id: 2, base_price: 88, original_price: 108, specs: [{ name: '1小时', price: 88, duration: 60 }], status: 1, sort_order: 1, order_count: 892, view_count: 3500, category_name: '娱乐陪伴', category_icon: '🎮' },
  { id: 202, name: 'K歌微醺', description: 'KTV包厢陪同欢唱，从经典老歌到热门新曲，气氛担当', cover_image: '', images: [], category_id: 2, base_price: 168, original_price: 0, specs: [{ name: '3小时', price: 168, duration: 180 }], status: 1, sort_order: 2, order_count: 456, view_count: 2100, category_name: '娱乐陪伴', category_icon: '🎤' },
  { id: 203, name: '商务酒局', description: '商务宴请陪同出席，专业礼仪、得体应酬，帮你hold住全场', cover_image: '', images: [], category_id: 2, base_price: 288, original_price: 0, specs: [{ name: '1场', price: 288, duration: 180 }], status: 1, sort_order: 3, order_count: 134, view_count: 780, category_name: '娱乐陪伴', category_icon: '🍷' },
  { id: 204, name: '同城旅游', description: '同城景点一日游，网红打卡、小众秘境，本地达人带你玩', cover_image: '', images: [], category_id: 2, base_price: 328, original_price: 0, specs: [{ name: '1天', price: 328, duration: 480 }], status: 1, sort_order: 4, order_count: 298, view_count: 1200, category_name: '娱乐陪伴', category_icon: '🏙️' },
  { id: 205, name: '异地旅游', description: '周边城市短期旅行陪伴，行程规划+全程陪同，说走就走', cover_image: '', images: [], category_id: 2, base_price: 688, original_price: 0, specs: [{ name: '1-3天', price: 688, duration: 1440 }], status: 1, sort_order: 5, order_count: 87, view_count: 560, category_name: '娱乐陪伴', category_icon: '✈️' },
  { id: 206, name: '密室逃脱', description: '密室/剧本杀队友，智商在线、演技在线，帮你通关解密', cover_image: '', images: [], category_id: 2, base_price: 128, original_price: 0, specs: [{ name: '2小时', price: 128, duration: 120 }], status: 1, sort_order: 6, order_count: 367, view_count: 1500, category_name: '娱乐陪伴', category_icon: '🔍' },
  // 按摩服务
  { id: 301, name: '中式按摩', description: '传统中式推拿手法，舒筋活络、缓解疲劳，肩颈腰背全方位放松', cover_image: '', images: [], category_id: 3, base_price: 168, original_price: 218, specs: [{ name: '60分钟', price: 168, duration: 60 }], status: 1, sort_order: 1, order_count: 1205, view_count: 5200, category_name: '按摩服务', category_icon: '💆‍♂️' },
  { id: 302, name: '泰式SPA', description: '正宗泰式拉伸按摩，配合精油SPA，深层放松身心', cover_image: '', images: [], category_id: 3, base_price: 238, original_price: 0, specs: [{ name: '90分钟', price: 238, duration: 90 }], status: 1, sort_order: 2, order_count: 876, view_count: 3800, category_name: '按摩服务', category_icon: '🧘' },
  { id: 303, name: '扶阳SPA', description: '中医扶阳理论，温灸+经络疏通，提升阳气、改善亚健康', cover_image: '', images: [], category_id: 3, base_price: 298, original_price: 398, specs: [{ name: '90分钟', price: 298, duration: 90 }], status: 1, sort_order: 3, order_count: 654, view_count: 2900, category_name: '按摩服务', category_icon: '🔥' },
  { id: 304, name: '足疗保健', description: '足底穴位按摩+中药泡脚，疏通反射区，缓解全身疲劳', cover_image: '', images: [], category_id: 3, base_price: 128, original_price: 0, specs: [{ name: '60分钟', price: 128, duration: 60 }], status: 1, sort_order: 4, order_count: 1023, view_count: 4400, category_name: '按摩服务', category_icon: '🦶' },
  { id: 305, name: '精油推背', description: '植物精油推背SPA，舒缓肌肉紧张、改善睡眠质量', cover_image: '', images: [], category_id: 3, base_price: 198, original_price: 0, specs: [{ name: '60分钟', price: 198, duration: 60 }], status: 1, sort_order: 5, order_count: 745, view_count: 3100, category_name: '按摩服务', category_icon: '🌸' },
  { id: 306, name: '经络疏通', description: '经络刮痧+穴位点压+拔罐，疏通经络、排除湿气', cover_image: '', images: [], category_id: 3, base_price: 218, original_price: 0, specs: [{ name: '80分钟', price: 218, duration: 80 }], status: 1, sort_order: 6, order_count: 567, view_count: 2400, category_name: '按摩服务', category_icon: '💪' },
  // 影院陪伴
  { id: 401, name: '情窦初开', description: '私人影院双人观影，温馨氛围，轻松愉悦的陪伴体验', cover_image: '', images: [], category_id: 4, base_price: 198, original_price: 258, specs: [{ name: '2小时', price: 198, duration: 120 }], status: 1, sort_order: 1, order_count: 423, view_count: 1800, category_name: '影院陪伴', category_icon: '💕' },
  { id: 402, name: '情难自控', description: '沉浸式影院体验，亲密陪伴，私享二人世界的美好时光', cover_image: '', images: [], category_id: 4, base_price: 298, original_price: 0, specs: [{ name: '3小时', price: 298, duration: 180 }], status: 1, sort_order: 2, order_count: 356, view_count: 1500, category_name: '影院陪伴', category_icon: '💓' },
  { id: 403, name: '共度今宵', description: '高端私人影院包场，精致布置+香槟小食，难忘的专属夜晚', cover_image: '', images: [], category_id: 4, base_price: 398, original_price: 0, specs: [{ name: '4小时', price: 398, duration: 240 }], status: 1, sort_order: 3, order_count: 187, view_count: 920, category_name: '影院陪伴', category_icon: '🌙' },
  { id: 404, name: '经典观影', description: '经典影片重温，专业解说陪伴，解读电影背后的故事与美学', cover_image: '', images: [], category_id: 4, base_price: 128, original_price: 0, specs: [{ name: '2小时', price: 128, duration: 120 }], status: 1, sort_order: 4, order_count: 289, view_count: 1100, category_name: '影院陪伴', category_icon: '🎞️' },
];

const defaultService = (): Partial<ServiceItem> => ({
  name: '',
  description: '',
  cover_image: '',
  images: [],
  category_id: 1,
  base_price: 0,
  original_price: 0,
  specs: [{ name: '', price: 0, duration: 60 }],
  status: 1,
  sort_order: 99,
});

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => { loadInitialData(); }, []);

  const categoryOptions = categories.length > 0
    ? [{ id: 0, name: '全部', icon: '📋', sort_order: 0, status: 1 }, ...categories]
    : ALL_CATEGORIES.map(c => ({ ...c, sort_order: 0, status: 1 }));

  const getCategoryInfo = (id?: number) => {
    const cat = categories.find(c => c.id === id);
    return {
      name: cat?.name || CATEGORY_MAP[id || 0]?.name || '未知',
      icon: cat?.icon || CATEGORY_MAP[id || 0]?.icon || '📦',
      color: CATEGORY_MAP[id || 0]?.color || '#6B7280',
    };
  };

  const filteredServices = activeCategory === 0
    ? services
    : services.filter(s => s.category_id === activeCategory);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [catRes, svcRes]: any[] = await Promise.all([
        serviceApi.getCategories(),
        serviceApi.getServices({ page_size: 200 }),
      ]);
      const catList = Array.isArray(catRes?.data) ? catRes.data : (Array.isArray(catRes) ? catRes : []);
      setCategories(catList);

      const svcList = Array.isArray(svcRes?.data?.list) ? svcRes.data.list : (Array.isArray(svcRes?.data) ? svcRes.data : (Array.isArray(svcRes) ? svcRes : []));
      if (Array.isArray(svcList) && svcList.length > 0) {
        const mapped = svcList.map((s: ServiceItem) => {
          const cat = catList.find((c: ServiceCategory) => c.id === s.category_id);
          return {
          ...s,
          category_name: cat?.name || CATEGORY_MAP[s.category_id]?.name || '未知',
          category_icon: cat?.icon || CATEGORY_MAP[s.category_id]?.icon || '📦',
        };
        });
        setServices(mapped);
      } else {
        setServices(MOCK_SERVICES);
      }
    } catch {
      setServices(MOCK_SERVICES);
    } finally {
      setLoading(false);
    }
  }

  async function loadServices() {
    await loadInitialData();
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.name?.trim()) { alert('请输入服务名称'); return; }
    if (!editing.category_id) { alert('请选择分类'); return; }
    setSaving(true);
    try {
      if (editing.id) {
        await serviceApi.updateService(editing.id, editing);
      } else {
        await serviceApi.saveService(editing);
      }
      setShowForm(false);
      setEditing(null);
      await loadInitialData();
    } catch {
      // 后端不可用 → 本地更新 mock
      const updated = [...services];
      if (editing.id) {
        const idx = updated.findIndex(s => s.id === editing.id);
        if (idx >= 0) updated[idx] = {
          ...updated[idx],
          ...editing,
          category_name: CATEGORY_MAP[editing.category_id || 0]?.name || '未知',
          category_icon: CATEGORY_MAP[editing.category_id || 0]?.icon || '📦',
        } as ServiceItem;
      } else {
        updated.push({
          ...editing,
          id: Date.now(),
          order_count: 0,
          view_count: 0,
          category_name: CATEGORY_MAP[editing.category_id || 0]?.name || '未知',
          category_icon: CATEGORY_MAP[editing.category_id || 0]?.icon || '📦',
        } as ServiceItem);
      }
      setServices(updated);
      setShowForm(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此服务项目？此操作不可恢复。')) return;
    try {
      await serviceApi.deleteService(id);
      await loadServices();
    } catch {
      setServices(prev => prev.filter(s => s.id !== id));
    }
  }

  function toggleStatus(id: number) {
    setServices(prev => prev.map(s =>
      s.id === id ? { ...s, status: s.status === 1 ? 0 : 1 } : s
    ));
    const item = services.find(s => s.id === id);
    if (item) {
      serviceApi.updateService(id, { status: item.status === 1 ? 0 : 1 }).catch(() => {});
    }
  }

  const updateField = (field: string, value: any) => {
    setEditing(prev => prev ? { ...prev, [field]: value } : null);
  };

  async function uploadImage(file: File, target: 'category' | 'service', category?: ServiceCategory) {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片不能超过 10MB');
      return;
    }
    const key = target === 'category' ? `category-${category?.id}` : 'service-cover';
    setUploading(key);
    try {
      const res: any = await serviceApi.uploadImage(file);
      const url = res?.data?.url;
      if (!url) throw new Error('上传失败');
      if (target === 'service') {
        updateField('cover_image', url);
      } else if (category) {
        await serviceApi.updateCategory(category.id, { ...category, icon: url });
        await loadInitialData();
      }
    } catch (e: any) {
      alert(e?.message || '上传失败');
    } finally {
      setUploading(null);
    }
  }

  // 规格管理
  function addSpec() {
    setEditing(prev => {
      if (!prev) return null;
      const specs = [...(prev.specs || [])];
      specs.push({ name: '', price: 0, duration: 60 });
      return { ...prev, specs };
    });
  }

  function removeSpec(index: number) {
    setEditing(prev => {
      if (!prev) return null;
      const specs = prev.specs ? [...prev.specs] : [];
      specs.splice(index, 1);
      return { ...prev, specs };
    });
  }

  function updateSpec(index: number, field: keyof ServiceSpec, value: string | number) {
    setEditing(prev => {
      if (!prev) return null;
      const specs = prev.specs ? [...prev.specs] : [];
      specs[index] = { ...specs[index], [field]: value };
      return { ...prev, specs };
    });
  }

  const catInfo = getCategoryInfo(editing?.category_id || 0);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">服务项目管理</h1>
          <p className="mt-1 text-sm text-gray-400">
            管理用户端展示的所有服务项目，支持分类筛选、规格管理和上下线控制
          </p>
        </div>
        <button
          onClick={() => { setEditing(defaultService()); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft"
        >
          <Plus className="h-4 w-4" /> 新增服务
        </button>
      </div>

      {/* ====== 大项图标管理 ====== */}
      <div className="admin-card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1F2937]">服务大项图标</h3>
            <p className="mt-0.5 text-xs text-gray-400">点击上传可把分类图标从 emoji 改为图片，保存后用户端同步使用</p>
          </div>
          <ImageIcon className="h-5 w-5 text-gray-300" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categoryOptions.filter(cat => cat.id > 0).map(cat => (
            <div key={cat.id} className="rounded-xl border border-[#EEF1F6] bg-[#F9FAFB] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl shadow-sm">
                  {renderIcon(cat.icon, '📦', 'h-12 w-12 rounded-xl')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#1F2937]">{cat.name}</div>
                  <div className="mt-0.5 text-xs text-gray-400">大项图标</div>
                </div>
              </div>
              <label className="mt-3 flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#DDE3F0] bg-white text-xs font-medium text-[#6B7FD7] hover:bg-[#F3F4FE]">
                {uploading === `category-${cat.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                上传图片
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'category', cat as ServiceCategory)}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* ====== 分类筛选标签 ====== */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="mr-1 h-4 w-4 text-gray-400" />
        {categoryOptions.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-white shadow-soft'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-md">
              {renderIcon(cat.icon, cat.id === 0 ? '📋' : '📦', 'h-5 w-5 rounded-md')}
            </span>
            {cat.name}
            {cat.id > 0 && (
              <span className="ml-1 text-xs opacity-75">
                ({services.filter(s => s.category_id === cat.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ====== 服务列表 ====== */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="admin-card flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="admin-card py-16 text-center text-sm text-gray-400">
            <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            {activeCategory === 0 ? '暂无服务项目，点击右上角新增' : '该分类下暂无服务项目'}
          </div>
        ) : (
          <div className="admin-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EEF1F6] bg-[#F9FAFB] text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3 w-14">排序</th>
                  <th className="px-4 py-3">服务名称</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">基础价</th>
                  <th className="px-4 py-3">规格</th>
                  <th className="px-4 py-3">订单</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((s) => (
                  <tr key={s.id} className="border-b border-[#F5F5F5] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-400">
                        <GripVertical className="h-3.5 w-3.5" />
                        <span className="font-medium text-gray-600">{s.sort_order}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                          style={{ background: `${getCategoryInfo(s.category_id).color}15` }}
                        >
                          {renderIcon(s.cover_image || s.category_icon, '📦', 'h-10 w-10 rounded-lg')}
                        </div>
                        <div>
                          <div className="font-medium text-[#1F2937]">{s.name}</div>
                          <div className="mt-0.5 max-w-[240px] truncate text-xs text-gray-400">
                            {s.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          background: `${getCategoryInfo(s.category_id).color}10`,
                          color: getCategoryInfo(s.category_id).color,
                        }}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded">
                          {renderIcon(s.category_icon, '📦', 'h-4 w-4 rounded')}
                        </span>
                        {s.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#1F2937]">¥{s.base_price}</span>
                        {s.original_price > s.base_price && (
                          <span className="text-xs text-gray-400 line-through">¥{s.original_price}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        <Layers className="h-3 w-3" />
                        {s.specs?.length || 0}种规格
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="font-medium">{s.order_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(s.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.status === 1
                            ? 'bg-[#E6F9F0] text-[#10B981]'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {s.status === 1 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {s.status === 1 ? '上线' : '下线'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing({ ...s }); setShowForm(true); }}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-[#F3F4FE] hover:text-[#6B7FD7] transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-[#FEE] hover:text-[#EF4444] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== 编辑/新增弹窗 ====== */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-10">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-fade-in mx-4">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1F2937]">
                {editing.id ? '编辑服务项目' : '新增服务项目'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* 第1行：名称 + 分类 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">服务名称 *</label>
                  <input
                    value={editing.name || ''}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder="如：中式按摩"
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">分类 *</label>
                  <select
                    value={editing.category_id ?? 1}
                    onChange={e => updateField('category_id', Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  >
                    {categoryOptions.filter(c => c.id > 0).map(cat => (
                      <option key={cat.id} value={cat.id}>{isImageValue(cat.icon) ? '🖼️' : cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">服务描述</label>
                <textarea
                  value={editing.description || ''}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="描述服务内容、特色、适用人群等"
                  rows={3}
                  className="w-full rounded-lg border border-[#EEF1F6] px-3 py-2 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20 resize-none"
                />
              </div>

              {/* 价格行 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">基础价格 (¥) *</label>
                  <input
                    type="number"
                    value={editing.base_price ?? 0}
                    onChange={e => updateField('base_price', Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">原价 (¥)</label>
                  <input
                    type="number"
                    value={editing.original_price ?? 0}
                    onChange={e => updateField('original_price', Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">排序</label>
                  <input
                    type="number"
                    value={editing.sort_order ?? 99}
                    onChange={e => updateField('sort_order', Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
              </div>

              {/* 规格管理 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">
                    <Layers className="mr-1 inline h-3.5 w-3.5" />
                    服务规格
                  </label>
                  <button
                    onClick={addSpec}
                    className="inline-flex items-center gap-1 rounded-md border border-[#C4D0E4] px-2.5 py-1 text-xs font-medium text-[#6B7FD7] hover:bg-[#F3F4FE]"
                  >
                    <Plus className="h-3 w-3" /> 添加规格
                  </button>
                </div>
                <div className="space-y-2">
                  {(editing.specs || []).map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
                      <input
                        value={spec.name}
                        onChange={e => updateSpec(idx, 'name', e.target.value)}
                        placeholder="规格名称"
                        className="h-9 flex-1 rounded-md border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none"
                      />
                      <div className="relative w-24">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                        <input
                          type="number"
                          value={spec.price}
                          onChange={e => updateSpec(idx, 'price', Number(e.target.value))}
                          placeholder="价格"
                          min={0}
                          step={0.01}
                          className="h-9 w-full rounded-md border border-[#EEF1F6] pl-6 pr-2 text-sm focus:border-[#6B7FD7] focus:outline-none"
                        />
                      </div>
                      <div className="relative w-20">
                        <input
                          type="number"
                          value={spec.duration}
                          onChange={e => updateSpec(idx, 'duration', Number(e.target.value))}
                          placeholder="分钟"
                          min={0}
                          className="h-9 w-full rounded-md border border-[#EEF1F6] px-2 pr-7 text-sm focus:border-[#6B7FD7] focus:outline-none"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">分钟</span>
                      </div>
                      <button
                        onClick={() => removeSpec(idx)}
                        disabled={(editing.specs || []).length <= 1}
                        className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-[#EF4444] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 小项图标/封面图 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">小项图标 / 封面图</label>
                <div className="flex items-center gap-3 rounded-xl border border-[#EEF1F6] bg-[#F9FAFB] p-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-2xl shadow-sm">
                    {renderIcon(editing.cover_image, catInfo.icon, 'h-20 w-20 rounded-xl')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      value={editing.cover_image || ''}
                      onChange={e => updateField('cover_image', e.target.value)}
                      placeholder="/uploads/... 或 https://example.com/cover.jpg"
                      className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#DDE3F0] bg-white px-3 text-xs font-medium text-[#6B7FD7] hover:bg-[#F3F4FE]">
                        {uploading === 'service-cover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        上传图片
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'service')}
                        />
                      </label>
                      {editing.cover_image && (
                        <button
                          type="button"
                          onClick={() => updateField('cover_image', '')}
                          className="h-8 rounded-lg px-3 text-xs text-gray-400 hover:bg-gray-100"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 状态 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">上线状态</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={editing.status === 1}
                      onChange={() => updateField('status', 1)}
                      className="accent-[#10B981]"
                    />
                    <span className="flex items-center gap-1 text-[#10B981]">
                      <Eye className="h-3.5 w-3.5" /> 上线
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={editing.status === 0}
                      onChange={() => updateField('status', 0)}
                      className="accent-[#9CA3AF]"
                    />
                    <span className="flex items-center gap-1 text-gray-400">
                      <EyeOff className="h-3.5 w-3.5" /> 下线
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#EEF1F6] pt-5">
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="rounded-lg border border-[#EEF1F6] px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-5 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
