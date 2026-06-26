'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Pencil, Trash2, Image, Eye, EyeOff, GripVertical, Save, X, Loader2, Upload, AlertCircle, ImageIcon } from 'lucide-react';
import { marketingApi, BannerItem } from '@/api/marketing';
import { safePrepareUpload, UPLOAD_LIMITS, type UploadType } from '@/lib/utils';

/* ---- Mock 默认数据（后端API未就绪时使用） ---- */
const MOCK_BANNERS: BannerItem[] = [
  { id: 1, title: '首单立减50元', subtitle: '休闲·娱乐·按摩·影院', image_url: '', link_url: '', sort: 1, status: 1, theme_color: 'linear-gradient(135deg, #FF6B9D 0%, #C44DFF 100%)', icon: '🎁' },
  { id: 2, title: '新人大礼包', subtitle: '注册即送188元券包', image_url: '', link_url: '', sort: 2, status: 1, theme_color: 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)', icon: '🧧' },
  { id: 3, title: '真人认证', subtitle: '100%真人·不满意可退款', image_url: '', link_url: '', sort: 3, status: 1, theme_color: 'linear-gradient(135deg, #34D399 0%, #06B6D4 100%)', icon: '🛡️' },
  { id: 4, title: '限时特惠', subtitle: '休闲约会只要88元起', image_url: '', link_url: '', sort: 4, status: 1, theme_color: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)', icon: '🔥' },
];

const defaultBanner = (): Partial<BannerItem> => ({
  title: '', subtitle: '', image_url: '', link_url: '',
  sort: 99, status: 1, theme_color: 'linear-gradient(135deg, #7C5CFC 0%, #A78BFA 100%)', icon: '🎬',
});

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BannerItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // 图片上传状态
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const bannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadBanners(); }, []);

  async function loadBanners() {
    setLoading(true);
    try {
      const res: any = await marketingApi.getBanners();
      const data = res?.data || res;
      setBanners(Array.isArray(data) ? data : []);
    } catch {
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.title?.trim()) { alert('请输入标题'); return; }
    setSaving(true);
    try {
      if (editing.id) {
        await marketingApi.updateBanner(editing.id, editing);
      } else {
        await marketingApi.saveBanner(editing);
      }
      setShowForm(false);
      setEditing(null);
      await loadBanners();
    } catch (err: any) {
      alert(err?.message || '保存失败，请检查网络或重新登录');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此轮播图？')) return;
    try {
      await marketingApi.deleteBanner(id);
      await loadBanners();
    } catch (err: any) {
      alert(err?.message || '删除失败，请检查网络或重新登录');
    }
  }

  function toggleStatus(id: number) {
    setBanners(prev => prev.map(b =>
      b.id === id ? { ...b, status: b.status === 1 ? 0 : 1 } : b
    ));
    // 静默尝试保存
    const item = banners.find(b => b.id === id);
    if (item) {
      marketingApi.updateBanner(id, { status: item.status === 1 ? 0 : 1 }).catch(() => {});
    }
  }

  const updateField = (field: string, value: string | number) => {
    setEditing(prev => prev ? { ...prev, [field]: value } : null);
  };

  // ==================== 图片上传 ====================
  const handleBannerImageUpload = async (file: File) => {
    setImageError('');
    setUploadingImage(true);

    try {
      const result = await safePrepareUpload(file, 'banner' as UploadType);
      if (!result.ok) {
        setImageError(result.error || '图片校验失败');
        return;
      }

      const res: any = await marketingApi.uploadBannerImage(result.file!);
      const url = res?.data?.url || '';
      updateField('image_url', url);
    } catch (err: any) {
      setImageError(err?.response?.data?.message || err?.message || '图片上传失败');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">轮播图管理</h1>
          <p className="mt-1 text-sm text-gray-400">
            管理用户端首页轮播区（最多4张），支持自定义标题、副标题和主题色
          </p>
        </div>
        <button
          onClick={() => { setEditing(defaultBanner()); setShowForm(true); }}
          disabled={banners.filter(b => b.status === 1).length >= 4 && !showForm}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> 新增轮播图
        </button>
      </div>

      {/* Tab schema: list OR edit dialog */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="admin-card flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" />
          </div>
        ) : banners.length === 0 ? (
          <div className="admin-card py-16 text-center text-sm text-gray-400">
            <Image className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            暂无轮播图，点击右上角新增
          </div>
        ) : (
          <div className="admin-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EEF1F6] bg-[#F9FAFB] text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3">排序</th>
                  <th className="px-4 py-3">预览</th>
                  <th className="px-4 py-3">标题</th>
                  <th className="px-4 py-3">副标题</th>
                  <th className="px-4 py-3">图标</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((b) => (
                  <tr key={b.id} className="border-b border-[#F5F5F5] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-400">
                        <GripVertical className="h-3.5 w-3.5" />
                        <span className="font-medium text-gray-600">{b.sort}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="relative flex h-12 w-20 items-center justify-center rounded-lg text-lg overflow-hidden"
                        style={{ background: b.theme_color }}
                      >
                        {b.image_url ? (
                          <img src={b.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                        ) : null}
                        <span className="relative z-10">{b.icon}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#1F2937]">{b.title}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{b.subtitle}</td>
                    <td className="px-4 py-3 text-lg">{b.icon}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(b.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.status === 1
                            ? 'bg-[#E6F9F0] text-[#10B981]'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {b.status === 1 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {b.status === 1 ? '显示' : '隐藏'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing({ ...b }); setShowForm(true); }}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-[#F3F4FE] hover:text-[#6B7FD7] transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1F2937]">
                {editing.id ? '编辑轮播图' : '新增轮播图'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* ====== 轮播图图片上传 ====== */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  <ImageIcon className="inline h-3 w-3 mr-1 text-[#7C5CFC]" /> 轮播图背景图
                  <span className="ml-1 font-normal text-[#9CA3AF]">(选填，不上传则使用渐变背景)</span>
                </label>
                <input
                  type="file"
                  ref={bannerFileRef}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleBannerImageUpload(e.target.files[0])}
                />
                <div
                  onClick={() => !uploadingImage && bannerFileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleBannerImageUpload(f);
                    e.preventDefault();
                  }}
                  className={`relative flex h-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
                    uploadingImage
                      ? 'border-[#7C5CFC] bg-[#F5F3FF]'
                      : editing?.image_url
                        ? 'border-transparent'
                        : 'border-[#D1D5DB] hover:border-[#7C5CFC] hover:bg-[#FAF9FF]'
                  }`}
                >
                  {editing?.image_url ? (
                    <>
                      <img
                        src={editing.image_url}
                        alt="轮播图"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {/* 重新上传按钮 */}
                      <div className="absolute inset-0 flex items-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity gap-2">
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        ) : (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); bannerFileRef.current?.click(); }}
                              className="flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm"
                            >
                              <Upload className="h-3 w-3" /> 换图
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateField('image_url', ''); }}
                              className="rounded-lg bg-red-500/90 px-2 py-1.5 text-xs text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center px-6">
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-[#7C5CFC]" />
                          <span className="text-xs font-medium text-[#7C5CFC]">校验压缩中...</span>
                        </>
                      ) : (
                        <>
                          <div className="rounded-full bg-[#EDE9FE] p-2.5">
                            <Upload className="h-5 w-5 text-[#7C5CFC]" />
                          </div>
                          <span className="text-xs font-medium text-[#6B7280]">点击或拖拽上传</span>
                          <span className="text-[10px] text-[#B0A8BA]">JPG / PNG / WebP · 最大 {UPLOAD_LIMITS.banner.label} · 建议 1920×600</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* 错误提示 */}
                {imageError && (
                  <div className="mt-1.5 flex items-center gap-1 rounded-md bg-[#FFF1F0] px-2.5 py-1.5 text-xs text-[#FF4D4F]">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>{imageError}</span>
                  </div>
                )}
              </div>

              {/* 实时预览 */}
              <div
                className="relative flex h-28 overflow-hidden rounded-xl px-5 text-white"
                style={{ background: editing.theme_color || '#7C5CFC' }}
              >
                {/* 背景图片层 */}
                {editing.image_url && (
                  <img
                    src={editing.image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay"
                  />
                )}
                <div className="relative z-10 flex flex-1 items-center">
                  <div>
                    <div className="text-xs font-medium opacity-70">{editing.icon} {editing.subtitle || '副标题'}</div>
                    <div className="mt-1 text-xl font-bold">{editing.title || '轮播标题'}</div>
                  </div>
                </div>
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-xl bg-white/15 text-3xl self-end mb-2">
                  {editing.icon}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">标题</label>
                  <input
                    value={editing.title || ''}
                    onChange={e => updateField('title', e.target.value)}
                    placeholder="如：首单立减50元"
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">图标Emoji</label>
                  <input
                    value={editing.icon || ''}
                    onChange={e => updateField('icon', e.target.value)}
                    placeholder="🎁"
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">副标题</label>
                <input
                  value={editing.subtitle || ''}
                  onChange={e => updateField('subtitle', e.target.value)}
                  placeholder="如：休闲·娱乐·按摩·影院"
                  className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">主题渐变色</label>
                  <input
                    value={editing.theme_color || ''}
                    onChange={e => updateField('theme_color', e.target.value)}
                    placeholder="linear-gradient(...)"
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-xs focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">跳转链接</label>
                  <input
                    value={editing.link_url || ''}
                    onChange={e => updateField('link_url', e.target.value)}
                    placeholder="选填"
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">排序</label>
                  <input
                    type="number"
                    value={editing.sort || 99}
                    onChange={e => updateField('sort', Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">状态</label>
                  <select
                    value={editing.status ?? 1}
                    onChange={e => updateField('status', Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-[#EEF1F6] px-3 text-sm focus:border-[#6B7FD7] focus:outline-none focus:ring-2 focus:ring-[#6B7FD7]/20"
                  >
                    <option value={1}>显示</option>
                    <option value={0}>隐藏</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="rounded-lg border border-[#EEF1F6] px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-60"
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
