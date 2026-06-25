'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, Eye, UserCheck, Filter, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { talentApi } from '@/api/talents';

interface ReviewItem {
  id: number;
  name: string;
  phone: string;
  idCard: string;
  gender: string;
  age: number;
  skills: string[];
  city: string;
  district: string;
  certificates: string[];
  status: 'pending' | 'approved' | 'rejected';
  applyTime: string;
  rejectReason?: string;
  avatar: string;
  avatarUrl?: string;
  lifePhotos?: string[];
  artPhotos?: string[];
  introduction: string;
  rating: number;
  experience: string;
}

// 将后端 status (int) 转为前端枚举
const backendStatusToFrontend = (s: number): 'pending' | 'approved' | 'rejected' => {
  if (s === 1) return 'approved';
  if (s === 3) return 'rejected';
  return 'pending';
};

// 后端达人数据转为前端 ReviewItem
const mapTalentToReviewItem = (t: any): ReviewItem => {
  let skills: string[] = [];
  try { skills = typeof t.skills === 'string' ? JSON.parse(t.skills) : (t.skills || []); } catch {}
  let certificates: string[] = [];
  try { certificates = typeof t.certificates === 'string' ? JSON.parse(t.certificates) : (t.certificates || []); } catch {}
  let districts: string[] = [];
  try { districts = typeof t.service_districts === 'string' ? JSON.parse(t.service_districts) : (t.service_districts || []); } catch {}
  let lifePhotos: string[] = [];
  try { lifePhotos = typeof t.life_photos === 'string' ? JSON.parse(t.life_photos) : (t.life_photos || []); } catch {}
  let artPhotos: string[] = [];
  try { artPhotos = typeof t.art_photos === 'string' ? JSON.parse(t.art_photos) : (t.art_photos || []); } catch {}

  return {
    id: t.id,
    name: t.real_name || '',
    phone: (t.phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    idCard: (t.id_card || '').replace(/(\d{4})\d+(\d{4})/, '$1**********$2'),
    gender: t.gender === 1 ? '男' : '女',
    age: t.birthday ? new Date().getFullYear() - new Date(t.birthday).getFullYear() : 0,
    skills,
    city: t.service_city || '',
    district: districts[0] || '',
    certificates,
    status: backendStatusToFrontend(t.status),
    applyTime: t.created_at ? new Date(t.created_at).toLocaleString('zh-CN') : '',
    avatar: (t.real_name || '?')[0],
    avatarUrl: t.avatar || '',
    lifePhotos,
    artPhotos,
    introduction: t.introduction || '',
    rating: t.rating || 0,
    experience: t.service_count ? `${t.service_count}单` : '新手',
  };
};

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-[#FFF7E6] text-[#FAAD14]' },
  approved: { label: '已通过', color: 'bg-[#F6FFED] text-[#52C41A]' },
  rejected: { label: '已驳回', color: 'bg-[#FFF1F0] text-[#FF4D4F]' },
};

// --- Mock 数据 ---
const MOCK_REVIEW_DATA: ReviewItem[] = [
  { id: 1, name: '王强', phone: '138****5678', idCard: '3301**********1234', gender: '男', age: 28, skills: ['中式推拿', '精油SPA'], city: '杭州市', district: '西湖区', certificates: ['健康证', '按摩师资质'], status: 'pending', applyTime: '2026-06-22 14:30', avatar: '王', introduction: '5年按摩经验，曾在五星级酒店SPA中心工作，擅长中式推拿和精油SPA。', rating: 4.8, experience: '1200单' },
  { id: 2, name: '李小美', phone: '139****2345', idCard: '3301**********5678', gender: '女', age: 25, skills: ['日式按摩', '足疗'], city: '杭州市', district: '拱墅区', certificates: ['健康证'], status: 'pending', applyTime: '2026-06-21 16:00', avatar: '李', introduction: '持有高级按摩师证书，对日式按摩和足疗有深入研究。', rating: 4.5, experience: '800单' },
  { id: 3, name: '赵磊', phone: '186****7890', idCard: '3301**********9012', gender: '男', age: 32, skills: ['泰式按摩', '中式推拿'], city: '杭州市', district: '滨江区', certificates: ['健康证', '推拿师证'], status: 'pending', applyTime: '2026-06-20 09:15', avatar: '赵', introduction: '10年推拿经验，泰式按摩专家，曾在泰国进修。', rating: 4.9, experience: '2500单' },
  { id: 4, name: '陈芳', phone: '156****3456', idCard: '4201**********3456', gender: '女', age: 30, skills: ['精油SPA', '面部护理'], city: '杭州市', district: '江干区', certificates: ['健康证', 'SPA护理资质'], status: 'pending', applyTime: '2026-06-18 11:20', avatar: '陈', introduction: '持有国际SPA护理认证，擅长精油搭配和面部护理。', rating: 4.6, experience: '1500单' },
  { id: 5, name: '周明', phone: '131****7890', idCard: '5101**********7890', gender: '男', age: 35, skills: ['中式推拿', '刮痧', '拔罐'], city: '杭州市', district: '上城区', certificates: ['健康证', '中医推拿师证'], status: 'pending', applyTime: '2026-06-17 15:45', avatar: '周', introduction: '中医世家出身，擅长传统推拿、刮痧和拔罐等中医疗法。', rating: 4.7, experience: '3000单' },
];

export default function TalentReviewPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [data, setData] = useState<ReviewItem[]>(MOCK_REVIEW_DATA);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 根据 tab 获取后端 status 值
  const getBackendStatus = (tab: string): number => {
    if (tab === 'approved') return 1;
    if (tab === 'rejected') return 3;
    return 0;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await talentApi.list({ status: String(getBackendStatus(activeTab)) });
      const list = res?.data?.list || [];
      setData(list.map(mapTalentToReviewItem));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingCount = data.filter(d => d.status === 'pending').length;
  const approvedCount = data.filter(d => d.status === 'approved').length;
  const rejectedCount = data.filter(d => d.status === 'rejected').length;

  const filtered = data.filter(
    (item) =>
      item.status === activeTab &&
      (item.name.includes(search) || item.phone.includes(search) || item.skills.some((s) => s.includes(search)))
  );

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await talentApi.review(id, '1');
      setData((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'approved' as const } : item)));
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(true);
    try {
      await talentApi.review(id, '3', rejectReason);
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'rejected' as const, rejectReason: rejectReason } : item
        )
      );
      setRejectModal({ open: false, id: null });
      setRejectReason('');
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    setActionLoading(true);
    try {
      await talentApi.batchReview(selectedIds, '1');
      setData((prev) =>
        prev.map((item) => (selectedIds.includes(item.id) ? { ...item, status: 'approved' as const } : item))
      );
      setSelectedIds([]);
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">达人审核</h1>
          <p className="mt-1 text-sm text-gray-400">
            待审核 {pendingCount} · 已通过 {approvedCount} · 已驳回 {rejectedCount}
          </p>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#4B5563]">已选 {selectedIds.length} 项</span>
            <button
              onClick={handleBatchApprove}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#52C41A] text-white rounded-lg text-sm font-medium hover:bg-[#49B519] disabled:opacity-60"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              批量通过
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#9CA3AF]"
            >
              取消
            </button>
          </div>
        )}
      </div>

        {/* 标签页 */}
        <div className="flex gap-1 bg-[#F3F4F6] p-1 rounded-xl w-fit mb-6">
          {(['pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedIds([]); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white text-[#1F2937] shadow-sm' : 'text-[#9CA3AF]'
              }`}
            >
              {statusMap[tab].label} ({tab === 'pending' ? pendingCount : tab === 'approved' ? approvedCount : rejectedCount})
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索达人姓名/手机号/技能..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
          />
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
          </div>
        ) : (
        <>
          <div className="space-y-4">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5">
                <div className="flex gap-4">
                  {/* 选择框 */}
                  {item.status === 'pending' && (
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          )
                        }
                        className="w-4 h-4 rounded border-[#D1D5DB] accent-[#6B7FD7]"
                      />
                    </div>
                  )}

                  {/* 达人信息 */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-[#EEF1F6]" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B7FD7] to-[#8B9FE8] flex items-center justify-center text-white font-bold text-lg">
                            {item.avatar}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1F2937]">{item.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMap[item.status].color}`}>
                              {statusMap[item.status].label}
                            </span>
                          </div>
                          <div className="text-sm text-[#9CA3AF] mt-1">
                            {item.phone} · {item.gender} · {item.age}岁 · {item.experience}经验
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[#9CA3AF]">{item.applyTime}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-[#9CA3AF]">服务区域：</span>
                        <span className="text-[#4B5563]">{item.city} {item.district}</span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF]">技能：</span>
                        <span className="text-[#4B5563]">{item.skills.join('、')}</span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF]">资质：</span>
                        <span className="text-[#4B5563]">{item.certificates.join('、')}</span>
                      </div>
                    </div>

                    {((item.lifePhotos?.length || 0) > 0 || (item.artPhotos?.length || 0) > 0) && (
                      <div className="mt-3 space-y-2">
                        {(item.lifePhotos?.length || 0) > 0 && (
                          <div>
                            <span className="text-xs text-[#9CA3AF]">生活照：</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {item.lifePhotos!.map((url, i) => (
                                <img key={url + i} src={url} alt="生活照" className="h-16 w-16 rounded-lg object-cover border border-[#EEF1F6]" />
                              ))}
                            </div>
                          </div>
                        )}
                        {(item.artPhotos?.length || 0) > 0 && (
                          <div>
                            <span className="text-xs text-[#9CA3AF]">艺术照：</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {item.artPhotos!.map((url, i) => (
                                <img key={url + i} src={url} alt="艺术照" className="h-16 w-16 rounded-lg object-cover border border-[#EEF1F6]" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-sm text-[#6B7280]">"{item.introduction}"</p>

                    {item.rejectReason && (
                      <div className="mt-2 px-3 py-2 bg-[#FFF1F0] rounded-lg text-sm text-[#FF4D4F]">
                        驳回原因：{item.rejectReason}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    {item.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#F3F4F6]">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#52C41A] to-[#73D13D] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all disabled:opacity-60"
                        >
                          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 通过
                        </button>
                        <button
                          onClick={() => setRejectModal({ open: true, id: item.id })}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 border border-[#FF4D4F] text-[#FF4D4F] rounded-lg text-sm font-medium hover:bg-[#FFF1F0] transition-all disabled:opacity-60"
                        >
                          <X size={16} /> 驳回
                        </button>
                        <button className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E7EB] text-[#4B5563] rounded-lg text-sm font-medium hover:bg-[#F9FAFB] transition-all">
                          <Eye size={16} /> 查看详情
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#9CA3AF]">
              <Filter size={40} className="mx-auto mb-3 opacity-40" />
              <p>暂无{statusMap[activeTab].label}数据</p>
            </div>
          )}
        </>
        )}

      {/* 驳回弹窗 */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4">驳回申请</h3>
            <label className="block text-sm font-medium text-[#4B5563] mb-2">驳回原因</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因..."
              rows={3}
              className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none resize-none"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setRejectModal({ open: false, id: null }); setRejectReason(''); }}
                className="px-5 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#4B5563]"
              >
                取消
              </button>
              <button
                onClick={() => handleReject(rejectModal.id!)}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-5 py-2 bg-[#FF4D4F] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
