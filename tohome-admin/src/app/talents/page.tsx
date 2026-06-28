'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Search, Plus, Star, MapPin, Phone, Loader2, X, Edit3, Trash2, Check, Upload, Camera, ImageIcon, AlertCircle, UserCog } from 'lucide-react';
import { talentApi } from '@/api/talents';
import { serviceApi, ServiceCategory, ServiceItem } from '@/api/services';
import { safePrepareUpload, UPLOAD_LIMITS } from '@/lib/utils';

const workStatusLabel: Record<number, string> = { 0: '离线', 1: '在线', 2: '休息' };
const workStatusDot: Record<number, string> = { 0: 'bg-gray-400', 1: 'bg-[#10B981]', 2: 'bg-[#FF9800]' };
const workStatusStyle: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-gray-100', text: 'text-gray-500' },
  1: { bg: 'bg-[#E6F9F0]', text: 'text-[#10B981]' },
  2: { bg: 'bg-[#FFF4E0]', text: 'text-[#FF9800]' },
};

function isImageValue(value?: string) {
  return !!value && (/^https?:\/\//.test(value) || value.startsWith('/uploads/'));
}

function iconText(value?: string, fallback = '✨') {
  return value && !isImageValue(value) ? value : fallback;
}

function CategoryIcon({ value, fallback = '✨', className = 'h-5 w-5' }: { value?: string; fallback?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (isImageValue(value) && !broken) {
    return <img src={value} alt="分类图标" className={`${className} rounded-md object-cover`} onError={() => setBroken(true)} />;
  }
  return <span className="text-base leading-none">{iconText(value, fallback)}</span>;
}

function ServiceThumb({ src, fallbackIcon }: { src?: string; fallbackIcon?: string }) {
  const [broken, setBroken] = useState(false);
  if (isImageValue(src) && !broken) {
    return <img src={src} alt="服务图片" className="h-full w-full object-cover" onError={() => setBroken(true)} />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F7F5FF] to-[#EEF2FF]">
      <CategoryIcon value={fallbackIcon} className="h-7 w-7" />
    </div>
  );
}

// 达人等级根据 service_count 推算
function getLevel(count: number): { label: string; color: string } {
  if (count >= 1000) return { label: '专家', color: 'bg-gradient-to-r from-[#FFB84D] to-[#FFC97A] text-white' };
  if (count >= 500) return { label: '高级', color: 'bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-white' };
  if (count >= 100) return { label: '中级', color: 'bg-[#E8EBFD] text-[#6B7FD7]' };
  return { label: '初级', color: 'bg-gray-100 text-gray-600' };
}

function formatPositiveRate(value: number) {
  const n = Number(value || 0);
  const percent = n > 1 ? n : n * 100;
  return `${Math.round(Math.min(percent, 100))}%`;
}

export default function TechniciansPage() {
  const router = useRouter();
  const [talents, setTalents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 100;

  // 编辑弹窗
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  // 分配弹窗
  const [assignModal, setAssignModal] = useState(false);
  const [assignTalent, setAssignTalent] = useState<any>(null);
  const [assignSkillIds, setAssignSkillIds] = useState<number[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // 删除确认
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // 编辑弹窗 - 上传相关
  const [editUploading, setEditUploading] = useState<'avatar' | 'life' | 'art' | null>(null);
  const [editUploadError, setEditUploadError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const editFileRefs = {
    avatar: useRef<HTMLInputElement>(null),
    life: useRef<HTMLInputElement>(null),
    art: useRef<HTMLInputElement>(null),
  };

  const fetchTalents = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (statusFilter) params.status = statusFilter;
      const res: any = await talentApi.list(params);
      const list = res?.data?.list || [];
      setTalents(Array.isArray(list) ? list : []);
      setTotal(res?.data?.total || (Array.isArray(list) ? list.length : 0));
    } catch {
      setTalents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const [serviceRes, categoryRes]: any[] = await Promise.all([
        serviceApi.getServices({ page: 1, page_size: 500 }),
        serviceApi.getCategories(),
      ]);
      setServices(Array.isArray(serviceRes?.data?.list) ? serviceRes.data.list : []);
      setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);
    } catch {
      setServices([]);
      setCategories([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const getSkillIds = (raw: any): number[] => {
    try {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
      return arr.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v));
    } catch {
      return [];
    }
  };

  const serviceNameById = useMemo(() => {
    const map = new Map<number, string>();
    services.forEach(s => map.set(Number(s.id), s.name));
    return map;
  }, [services]);

  const serviceGroups = useMemo(() => {
    const categoryMap = new Map<number, ServiceCategory>();
    categories.forEach(c => categoryMap.set(Number(c.id), c));
    const grouped = new Map<number, { category?: ServiceCategory; items: ServiceItem[] }>();
    services
      .filter(s => Number(s.status) !== 0)
      .forEach(s => {
        const cid = Number(s.category_id) || 0;
        if (!grouped.has(cid)) grouped.set(cid, { category: categoryMap.get(cid), items: [] });
        grouped.get(cid)!.items.push(s);
      });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([categoryId, group]) => ({ categoryId, ...group }));
  }, [services, categories]);

  const filteredTalents = talents;

  const pagedTalents = filteredTalents;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => { setPage(1); }, [keyword, statusFilter]);
  useEffect(() => { fetchTalents(); }, [page, keyword, statusFilter]);
  useEffect(() => { fetchServices(); }, []);

  // 打开编辑弹窗
  const openEdit = (t: any) => {
    setEditing(t);
    setEditForm({
      real_name: t.real_name || '',
      phone: t.phone || '',
      gender: t.gender ?? 0,
      birthday: t.birthday || '',
      avatar: t.avatar || '',
      life_photos: (() => { try { return typeof t.life_photos === 'string' ? JSON.parse(t.life_photos) : (t.life_photos || []); } catch { return []; } })(),
      art_photos: (() => { try { return typeof t.art_photos === 'string' ? JSON.parse(t.art_photos) : (t.art_photos || []); } catch { return []; } })(),
      skills: typeof t.skills === 'string' ? t.skills : JSON.stringify(t.skills || []),
      service_city: t.service_city || '',
      service_districts: typeof t.service_districts === 'string' ? t.service_districts : JSON.stringify(t.service_districts || []),
      introduction: t.introduction || '',
      rating: t.rating || 0,
      service_count: t.service_count || 0,
      total_income: t.total_income || 0,
      positive_rate: t.positive_rate || 0,
      work_status: t.work_status ?? 1,
    });
    setEditUploadError('');
    setEditModal(true);
  };

  // 编辑弹窗 - 文件上传
  const handleEditFileUpload = async (file: File, type: 'avatar' | 'life' | 'art') => {
    setEditUploadError('');
    setEditUploading(type);
    try {
      // 安全校验 + 压缩
      const prepareResult = await safePrepareUpload(file, type);
      if (!prepareResult.ok) {
        setEditUploadError(prepareResult.error || '文件校验失败');
        setEditUploading(null);
        return;
      }
      // 尝试上传到后端
      try {
        const res: any = await talentApi.upload(prepareResult.file!);
        const url = res?.data?.url || '';
        if (type === 'avatar') {
          setEditForm((prev: any) => ({ ...prev, avatar: url }));
        } else if (type === 'life') {
          setEditForm((prev: any) => ({ ...prev, life_photos: [...(prev.life_photos || []), url].slice(0, 5) }));
        } else {
          setEditForm((prev: any) => ({ ...prev, art_photos: [...(prev.art_photos || []), url].slice(0, 5) }));
        }
      } catch {
        // 后端不通 → 用本地 Object URL 预览
        console.warn('[Demo] 上传功能降级为本地预览');
        const localUrl = URL.createObjectURL(prepareResult.file!);
        if (type === 'avatar') {
          setEditForm((prev: any) => ({ ...prev, avatar: localUrl }));
        } else if (type === 'life') {
          setEditForm((prev: any) => ({ ...prev, life_photos: [...(prev.life_photos || []), localUrl].slice(0, 5) }));
        } else {
          setEditForm((prev: any) => ({ ...prev, art_photos: [...(prev.art_photos || []), localUrl].slice(0, 5) }));
        }
      }
    } catch (err: any) {
      setEditUploadError(err?.message || '上传失败');
    } finally {
      setEditUploading(null);
    }
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      // 解析 skills（如果是JSON字符串）
      let skillsArr: number[] = [];
      try {
        if (typeof editForm.skills === 'string') {
          skillsArr = JSON.parse(editForm.skills);
        } else if (Array.isArray(editForm.skills)) {
          skillsArr = editForm.skills;
        }
      } catch { skillsArr = []; }

      // 解析 service_districts
      let districtsArr: string[] = [];
      try {
        if (typeof editForm.service_districts === 'string') {
          districtsArr = JSON.parse(editForm.service_districts);
        } else if (Array.isArray(editForm.service_districts)) {
          districtsArr = editForm.service_districts;
        }
      } catch { districtsArr = []; }

      // 构建更新参数
      const params: any = {
        real_name: editForm.real_name,
        phone: editForm.phone,
        gender: editForm.gender,
        birthday: editForm.birthday || '',
        avatar: editForm.avatar || '',
        life_photos: editForm.life_photos || [],
        art_photos: editForm.art_photos || [],
        skills: skillsArr,
        certificates: [],
        service_city: editForm.service_city || '',
        service_districts: districtsArr,
        emergency_contact: '',
        emergency_phone: '',
        introduction: editForm.introduction || '',
        auto_approve: false,
      };

      await talentApi.update(editing.id, params);

      // 更新本地列表
      const idx = talents.findIndex((t: any) => t.id === editing.id);
      if (idx !== -1) {
        const updated = [...talents];
        updated[idx] = {
          ...updated[idx],
          ...editForm,
          skills: editForm.skills,
          service_districts: editForm.service_districts,
          age_range: getAgeRange(editForm.birthday),
        };
        setTalents(updated);
      }
      setEditModal(false);
      setEditing(null);
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'));
    } finally {
      setEditSaving(false);
    }
  };

  // 切换状态
  const toggleStatus = async (t: any) => {
    const next = t.work_status === 1 ? 2 : 1; // 在线↔休息
    try {
      await talentApi.update(t.id, { work_status: next } as any);
      setTalents(prev => prev.map(x => x.id === t.id ? { ...x, work_status: next } : x));
    } catch (e) {
      console.error('状态切换失败', e);
    }
  };

  // 删除
  const deleteTalent = async (id: number) => {
    try {
      await talentApi.delete(id);
      setTalents(prev => prev.filter((t: any) => t.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      setDeleteConfirm(null);
    } catch (err: any) {
      alert('删除失败: ' + (err?.message || '请稍后重试'));
    }
  };

  // 分配
  const doAssign = (t: any) => {
    setAssignTalent(t);
    setAssignSkillIds(getSkillIds(t.skills));
    setAssignError('');
    setAssignModal(true);
  };

  const toggleAssignSkill = (serviceId: number) => {
    setAssignSkillIds(prev => (
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    ));
  };

  const saveAssign = async () => {
    if (!assignTalent) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      await talentApi.update(assignTalent.id, {
        skills: assignSkillIds,
        certificates: [],
        auto_approve: false,
      } as any);

      const updatedSkills = JSON.stringify(assignSkillIds);
      setTalents(prev => prev.map((t: any) => (
        t.id === assignTalent.id ? { ...t, skills: updatedSkills } : t
      )));
      setAssignModal(false);
      setAssignTalent(null);
      setAssignSkillIds([]);
    } catch (err: any) {
      setAssignError(err?.message || '保存分配服务失败');
    } finally {
      setAssignSaving(false);
    }
  };

  function getAgeRange(birthday: string): string {
    if (!birthday) return '';
    const y = parseInt(birthday.slice(0, 4), 10);
    if (isNaN(y)) return '';
    if (y >= 2000) return '00后';
    if (y >= 1995) return '95后';
    if (y >= 1990) return '90后';
    if (y >= 1985) return '85后';
    return '资深';
  }

  return (
    <AdminLayout>
      <PageHeader
        icon={UserCog}
        tag="达人运营"
        title="达人管理"
        subtitle="管理平台技师/达人，包括资料审核、服务分配和工作状态"
        actions={
          <button
            onClick={() => router.push('/talents/add')}
            className="flex items-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
          >
            <Plus className="h-4 w-4" />新增达人
          </button>
        }
      />

      <div className="admin-card overflow-hidden">
        {/* 搜索筛选 */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF1F6] px-5 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索达人姓名/手机号..."
              className="h-9 w-full rounded-md border border-[#EEF1F6] bg-[#F5F7FA] pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#6B7FD7] focus:bg-white focus:outline-none"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-[#EEF1F6] bg-white px-3 text-sm text-gray-600">
            <option value="">全部状态</option>
            <option value="1">在线</option>
            <option value="2">休息</option>
            <option value="0">离线</option>
          </select>
        </div>

        {/* 达人卡片网格 */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {pagedTalents.map((t) => {
            const ws = t.work_status ?? 0;
            const wsLabel = workStatusLabel[ws] || '离线';
            const wsDot = workStatusDot[ws] || 'bg-gray-400';
            const wsStyle = workStatusStyle[ws] || workStatusStyle[0];
            const level = getLevel(t.service_count || 0);
            const skills = (() => { try { return typeof t.skills === 'string' ? JSON.parse(t.skills) : (t.skills || []); } catch { return []; } })();
            const skillLabels = skills.map((s: any) => {
              const id = Number(s);
              return Number.isFinite(id) ? serviceNameById.get(id) : String(s);
            }).filter(Boolean) as string[];
            const avatarUrl = t.avatar || '';
            return (
              <div key={t.id} className="rounded-xl border border-[#EEF1F6] bg-white p-4 transition-all hover:border-[#C9D1FA] hover:shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    {avatarUrl ? (
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden">
                        <img src={avatarUrl} alt={t.real_name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-primary text-lg font-bold text-white">
                        {(t.real_name || '?')[0]}
                      </div>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${wsDot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1F2937]">{t.real_name || '-'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${level.color}`}>{level.label}</span>
                      {t.age_range && (
                        <span className="rounded-full bg-[#FDF2F8] px-1.5 py-0.5 text-[10px] text-[#EC4899]">{t.age_range}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="h-3 w-3" />
                      <span>{(t.phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{t.service_city || '-'} · {t.service_count || 0}单</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${wsStyle.bg} ${wsStyle.text}`}>{wsLabel}</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {skillLabels.slice(0, 3).map((s: string, i: number) => (
                    <span key={i} className="rounded-md bg-[#F3F4FE] px-2 py-0.5 text-[11px] text-[#6B7FD7]">{s}</span>
                  ))}
                  {skillLabels.length > 3 && (
                    <span className="text-[10px] text-gray-400">+{skillLabels.length - 3}</span>
                  )}
                </div>

                {/* 简介 */}
                {t.introduction && (
                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">{t.introduction}</p>
                )}

                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#F5F7FA] pt-3">
                  <div>
                    <div className="text-[11px] text-gray-400">评分</div>
                    <div className="mt-0.5 flex items-center gap-0.5 text-sm font-semibold text-[#1F2937]">
                      <Star className="h-3.5 w-3.5 fill-[#FFB84D] text-[#FFB84D]" />
                      {t.rating || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">订单</div>
                    <div className="mt-0.5 text-sm font-semibold text-[#1F2937]">{t.service_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">收入</div>
                    <div className="mt-0.5 text-sm font-semibold text-[#1F2937]">¥{(t.total_income || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">好评率</div>
                    <div className="mt-0.5 text-sm font-semibold text-[#1F2937]">{formatPositiveRate(t.positive_rate)}</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEdit(t)} className="flex-1 rounded-md border border-[#6B7FD7] px-2 py-1.5 text-xs font-medium text-[#6B7FD7] hover:bg-[#F3F4FE] transition-colors">编辑详情</button>
                  <button onClick={() => doAssign(t)} className="flex-1 rounded-md bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-2 py-1.5 text-xs font-medium text-white hover:from-[#5668C2] hover:to-[#6B7FD7] transition-all">分配服务</button>
                  <button onClick={() => toggleStatus(t)} title={t.work_status === 1 ? '切换休息' : '切换在线'} className="rounded-md border border-[#EEF1F6] px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                    {t.work_status === 1 ? '休息' : '上线'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(t.id); }} className="rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
          {pagedTalents.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">暂无匹配的达人数据</div>
          )}
        </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between border-t border-[#EEF1F6] px-5 py-3">
          <div className="text-xs text-gray-500">显示 {pagedTalents.length} 共 {filteredTalents.length.toLocaleString()} 条</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 rounded-md border border-[#EEF1F6] bg-white px-3 text-xs text-gray-600 disabled:opacity-40">上一页</button>
            <button className="h-8 min-w-[32px] rounded-md bg-[#6B7FD7] text-xs text-white">{page}</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="h-8 rounded-md border border-[#EEF1F6] bg-white px-3 text-xs text-gray-600 disabled:opacity-40">下一页</button>
          </div>
        </div>
      </div>

      {/* ===== 编辑详情弹窗 ===== */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onClick={() => setEditModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#EEF1F6] px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2937]">达人详情</h3>
                <p className="mt-0.5 text-xs text-gray-400">编辑 {editForm.real_name} 的资料</p>
              </div>
              <button onClick={() => setEditModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* 头像 + 基本信息 */}
              <div className="flex gap-4">
                <div className="shrink-0">
                  <input
                    type="file"
                    ref={editFileRefs.avatar}
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleEditFileUpload(e.target.files[0], 'avatar')}
                  />
                  <div
                    className="relative group h-24 w-24 rounded-2xl overflow-hidden border-2 border-[#EEF1F6] bg-gray-50 cursor-pointer"
                    onClick={() => editFileRefs.avatar.current?.click()}
                  >
                    {editForm.avatar ? (
                      <img src={editForm.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-gray-300 gap-1">
                        {editUploading === 'avatar' ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[#6B7FD7]" />
                        ) : (
                          <>
                            <Camera className="h-5 w-5" />
                            <span className="text-[10px] font-bold">{editForm.real_name?.[0] || '?'}</span>
                          </>
                        )}
                      </div>
                    )}
                    {/* hover 遮罩 */}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  {/* 上传错误提示 */}
                  {editUploadError && (
                    <div className="mt-1 flex items-center gap-1 rounded bg-[#FFF1F0] px-1.5 py-0.5 text-[10px] text-[#FF4D4F] max-w-[96px]">
                      <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{editUploadError}</span>
                    </div>
                  )}
                  <input
                    value={editForm.avatar}
                    onChange={(e) => setEditForm({...editForm, avatar: e.target.value})}
                    placeholder="或输入头像URL"
                    className="mt-1.5 w-full rounded-md border border-[#EEF1F6] px-2 py-1 text-[10px] text-gray-400 focus:border-[#6B7FD7] focus:outline-none"
                  />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">姓名</label>
                    <input value={editForm.real_name} onChange={(e) => setEditForm({...editForm, real_name: e.target.value})} className="mt-1 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">手机号</label>
                    <input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="mt-1 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">出生日期</label>
                    <input value={editForm.birthday} onChange={(e) => { setEditForm({...editForm, birthday: e.target.value}); }} className="mt-1 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                    {editForm.birthday && <span className="mt-0.5 inline-block rounded bg-[#F3F4FE] px-1.5 py-0.5 text-[10px] text-[#6B7FD7]">{getAgeRange(editForm.birthday)}</span>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">所在城市</label>
                    <input value={editForm.service_city} onChange={(e) => setEditForm({...editForm, service_city: e.target.value})} className="mt-1 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* 技能标签 */}
              <div>
                <label className="text-xs text-gray-400 font-medium">技能标签 (JSON数组)</label>
                <input value={editForm.skills} onChange={(e) => setEditForm({...editForm, skills: e.target.value})} className="mt-1 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none font-mono" />
              </div>

              {/* 服务区域 */}
              <div>
                <label className="text-xs text-gray-400 font-medium">服务区域 (JSON数组)</label>
                <input value={editForm.service_districts} onChange={(e) => setEditForm({...editForm, service_districts: e.target.value})} className="mt-1 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none font-mono" />
              </div>

              {/* 生活照上传 */}
              <div>
                <label className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <ImageIcon className="h-3.5 w-3.5 text-[#10B981]" /> 生活照
                  <span className="font-normal">({(editForm.life_photos || []).length}/5)</span>
                </label>
                <input
                  type="file"
                  ref={editFileRefs.life}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleEditFileUpload(e.target.files[0], 'life')}
                />
                <div className="mt-1.5 grid grid-cols-5 gap-2">
                  {(editForm.life_photos || []).map((url: string, i: number) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[#EEF1F6]">
                      <img src={url} alt={`生活照${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setEditForm((prev: any) => ({ ...prev, life_photos: prev.life_photos.filter((_: any, j: number) => j !== i) }))}
                        className="absolute top-1 right-1 h-4 w-4 rounded-full bg-[#FF4D4F] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  {(editForm.life_photos || []).length < 5 && (
                    <button
                      onClick={() => editFileRefs.life.current?.click()}
                      disabled={editUploading === 'life'}
                      className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors ${
                        editUploading === 'life'
                          ? 'border-[#10B981] bg-[#ECFDF5]'
                          : 'border-[#D1D5DB] hover:border-[#10B981] hover:bg-[#F0FDF4] cursor-pointer text-[#9CA3AF]'
                      }`}
                    >
                      {editUploading === 'life' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#10B981]" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* 艺术照上传 */}
              <div>
                <label className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <Star className="h-3.5 w-3.5 text-[#FFB84D]" /> 艺术照
                  <span className="font-normal">({(editForm.art_photos || []).length}/5)</span>
                </label>
                <input
                  type="file"
                  ref={editFileRefs.art}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleEditFileUpload(e.target.files[0], 'art')}
                />
                <div className="mt-1.5 grid grid-cols-5 gap-2">
                  {(editForm.art_photos || []).map((url: string, i: number) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[#EEF1F6] bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3]">
                      <img src={url} alt={`艺术照${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setEditForm((prev: any) => ({ ...prev, art_photos: prev.art_photos.filter((_: any, j: number) => j !== i) }))}
                        className="absolute top-1 right-1 h-4 w-4 rounded-full bg-[#FF4D4F] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  {(editForm.art_photos || []).length < 5 && (
                    <button
                      onClick={() => editFileRefs.art.current?.click()}
                      disabled={editUploading === 'art'}
                      className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors ${
                        editUploading === 'art'
                          ? 'border-[#FFB84D] bg-[#FFFBEB]'
                          : 'border-[#D1D5DB] hover:border-[#FFB84D] hover:bg-[#FFFEFA] cursor-pointer text-[#9CA3AF]'
                      }`}
                    >
                      {editUploading === 'art' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#FFB84D]" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* 简介 */}
              <div>
                <label className="text-xs text-gray-400 font-medium">个人简介</label>
                <textarea value={editForm.introduction} onChange={(e) => setEditForm({...editForm, introduction: e.target.value})} rows={3} className="mt-1 w-full rounded-lg border border-[#EEF1F6] px-3 py-2 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none resize-none" />
              </div>

              {/* 数据指标 */}
              <div>
                <label className="text-xs text-gray-400 font-medium">数据指标 (可手动修正)</label>
                <div className="mt-1 grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400">评分</label>
                    <input type="number" step="0.1" value={editForm.rating} onChange={(e) => setEditForm({...editForm, rating: parseFloat(e.target.value) || 0})} className="mt-0.5 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">订单数</label>
                    <input type="number" value={editForm.service_count} onChange={(e) => setEditForm({...editForm, service_count: parseInt(e.target.value) || 0})} className="mt-0.5 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">总收入</label>
                    <input type="number" value={editForm.total_income} onChange={(e) => setEditForm({...editForm, total_income: parseInt(e.target.value) || 0})} className="mt-0.5 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">好评率</label>
                    <input type="number" step="0.01" value={editForm.positive_rate} onChange={(e) => setEditForm({...editForm, positive_rate: parseFloat(e.target.value) || 0})} className="mt-0.5 w-full h-9 rounded-lg border border-[#EEF1F6] px-3 text-sm text-gray-700 focus:border-[#6B7FD7] focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#EEF1F6] px-6 py-4">
              <button onClick={() => { setDeleteConfirm(editing?.id); setEditModal(false); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="mr-1 inline h-3.5 w-3.5" />删除
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditModal(false)} className="rounded-lg border border-[#EEF1F6] px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
                <button onClick={saveEdit} className="rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-6 py-2 text-sm font-medium text-white hover:from-[#5668C2] hover:to-[#6B7FD7] transition-all shadow-soft">
                  <Check className="mr-1 inline h-4 w-4" />保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 分配服务弹窗 ===== */}
      {assignModal && assignTalent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setAssignModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 mx-4 w-full max-w-3xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#EEF1F6] px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2937]">分配服务</h3>
                <p className="mt-0.5 text-xs text-gray-400">为 {assignTalent.real_name} 指定可提供的服务</p>
              </div>
              <button onClick={() => setAssignModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="rounded-xl border border-[#EEF1F6] bg-[#F8F9FC] p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                    <img src={assignTalent.avatar} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#1F2937]">{assignTalent.real_name}</div>
                    <div className="text-xs text-gray-400">{assignTalent.service_city} · {getAgeRange(assignTalent.birthday || '')}</div>
                  </div>
                </div>
                <div className="mb-4 flex items-center justify-between rounded-lg bg-white px-3 py-2">
                  <span className="text-xs font-medium text-gray-500">已选择 {assignSkillIds.length} 项服务</span>
                  <button onClick={() => setAssignSkillIds([])} className="text-xs font-medium text-[#6B7FD7] hover:text-[#5668C2]">清空选择</button>
                </div>
                {assignError && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
                    <AlertCircle className="h-4 w-4" /> {assignError}
                  </div>
                )}
                <div className="space-y-5">
                  {servicesLoading ? (
                    <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#6B7FD7]" /> 正在加载服务项目...
                    </div>
                  ) : serviceGroups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#DDE3F0] bg-white px-4 py-8 text-center text-sm text-gray-400">
                      暂无可分配服务，请先到“服务管理”新增服务项目
                    </div>
                  ) : serviceGroups.map(group => (
                    <div key={group.categoryId}>
                      <div className="mb-2 flex items-center gap-2">
                        <CategoryIcon value={group.category?.icon} className="h-5 w-5" />
                        <span className="text-sm font-semibold text-[#1F2937]">{group.category?.name || '未分类服务'}</span>
                        <span className="text-xs text-gray-400">{group.items.length} 项</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.items.map(service => {
                          const sid = Number(service.id);
                          const checked = assignSkillIds.includes(sid);
                          return (
                            <button
                              type="button"
                              key={sid}
                              onClick={() => toggleAssignSkill(sid)}
                              className={`relative rounded-xl border p-3 text-left transition-all ${
                                checked
                                  ? 'border-[#6B7FD7] bg-[#F3F4FE] shadow-sm'
                                  : 'border-[#EEF1F6] bg-white hover:border-[#C9D1FA] hover:bg-[#FAFBFF]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F5F7FA]">
                                  <ServiceThumb
                                    src={service.cover_image || (isImageValue(group.category?.icon) ? group.category?.icon : '')}
                                    fallbackIcon={group.category?.icon}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={`truncate text-sm font-semibold ${checked ? 'text-[#6B7FD7]' : 'text-[#1F2937]'}`}>{service.name}</div>
                                  <div className="mt-1 text-xs text-gray-400">¥{service.base_price || 0} · {service.order_count || 0}单</div>
                                </div>
                                {checked && <Check className="h-4 w-4 shrink-0 text-[#6B7FD7]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-[#EEF1F6] px-6 py-4">
              <button onClick={() => setAssignModal(false)} className="flex-1 rounded-lg border border-[#EEF1F6] px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">关闭</button>
              <button onClick={saveAssign} disabled={assignSaving} className="flex-1 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white hover:from-[#5668C2] hover:to-[#6B7FD7] transition-all shadow-soft disabled:cursor-not-allowed disabled:opacity-60">
                {assignSaving ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />保存中</span> : '确认分配'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 删除确认弹窗 ===== */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-[#1F2937]">确认删除</h3>
            <p className="mt-1 text-sm text-gray-500">删除后数据不可恢复，确定要移除这位达人吗？</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-[#EEF1F6] px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={() => deleteTalent(deleteConfirm)} className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors">确认删除</button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
