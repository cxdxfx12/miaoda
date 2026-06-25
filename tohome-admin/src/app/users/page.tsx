'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Search, UserPlus, Crown, Loader2, X, Edit3, Trash2, Check, AlertTriangle } from 'lucide-react';
import { userApi } from '@/api/users';
import type { UserCreateParams } from '@/api/users';

// Mock 用户数据 — 始终作为本地数据源，后端可用时同步
const INITIAL_MOCK_USERS: any[] = [
  { id: 1, nickname: '张小明', phone: '13800001001', gender: 1, avatar: '', city: '深圳', member_level: 3, status: 1, created_at: '2025-12-01T10:30:00', last_login_at: '2026-06-24T09:15:00' },
  { id: 2, nickname: '李婷婷', phone: '13800001002', gender: 0, avatar: '', city: '广州', member_level: 2, status: 1, created_at: '2026-01-05T14:20:00', last_login_at: '2026-06-23T18:30:00' },
  { id: 3, nickname: '王大伟', phone: '13800001003', gender: 1, avatar: '', city: '北京', member_level: 1, status: 1, created_at: '2026-02-10T09:00:00', last_login_at: '2026-06-22T20:45:00' },
  { id: 4, nickname: '赵雅琪', phone: '13800001004', gender: 0, avatar: '', city: '上海', member_level: 3, status: 1, created_at: '2025-11-20T16:45:00', last_login_at: '2026-06-24T11:00:00' },
  { id: 5, nickname: '陈大鹏', phone: '13800001005', gender: 1, avatar: '', city: '杭州', member_level: 0, status: 1, created_at: '2026-03-15T12:10:00', last_login_at: '2026-06-20T08:30:00' },
  { id: 6, nickname: '刘芳芳', phone: '13800001006', gender: 0, avatar: '', city: '成都', member_level: 2, status: 1, created_at: '2026-04-01T10:00:00', last_login_at: '2026-06-24T07:50:00' },
  { id: 7, nickname: '周建国', phone: '13800001007', gender: 1, avatar: '', city: '重庆', member_level: 0, status: 0, created_at: '2026-02-28T11:30:00', last_login_at: '2026-05-15T16:20:00' },
  { id: 8, nickname: '吴小美', phone: '13800001008', gender: 0, avatar: '', city: '武汉', member_level: 1, status: 1, created_at: '2026-05-10T08:15:00', last_login_at: '2026-06-23T22:10:00' },
  { id: 9, nickname: '郑文博', phone: '13800001009', gender: 1, avatar: '', city: '南京', member_level: 0, status: 1, created_at: '2026-06-01T14:00:00', last_login_at: '2026-06-24T06:30:00' },
  { id: 10, nickname: '何雨萱', phone: '13800001010', gender: 0, avatar: '', city: '苏州', member_level: 2, status: 1, created_at: '2026-03-20T09:45:00', last_login_at: '2026-06-21T19:00:00' },
];

const levelMap: Record<number, string> = {
  0: '普通会员', 1: '白银会员', 2: '黄金会员', 3: '钻石会员',
};
const levelColor: Record<string, { bg: string; text: string }> = {
  '钻石会员': { bg: 'bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA]', text: 'text-white' },
  '黄金会员': { bg: 'bg-gradient-to-r from-[#FFB84D] to-[#FFC97A]', text: 'text-white' },
  '白银会员': { bg: 'bg-gradient-to-r from-[#94A3B8] to-[#CBD5E1]', text: 'text-white' },
  '普通会员': { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  // 用 useRef 保证 mock 数据在组件生命周期内持久化，不被 HMR 重置
  const mockUsersRef = useRef<any[]>([...INITIAL_MOCK_USERS.map(u => ({ ...u }))]);
  const mockIdSeqRef = useRef(100);
  const useMockRef = useRef(true); // 始终优先本地 mock

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = { phone: '', nickname: '', password: '', gender: 1, avatar: '', city: '', member_level: 0 };
  const [form, setForm] = useState({ ...emptyForm });

  // 局部筛选 + 分页
  const applyLocalFilter = useCallback(() => {
    let filtered = [...mockUsersRef.current];
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(u => u.nickname?.toLowerCase().includes(kw) || u.phone?.includes(kw));
    }
    if (statusFilter) filtered = filtered.filter(u => String(u.status) === statusFilter);
    if (levelFilter) filtered = filtered.filter(u => String(u.member_level) === levelFilter);
    setTotal(filtered.length);
    const start = (page - 1) * pageSize;
    setUsers(filtered.slice(start, start + pageSize));
    setLoading(false);
  }, [keyword, statusFilter, levelFilter, page, pageSize]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // 先尝试后端 API
    try {
      const params: any = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (statusFilter) params.status = statusFilter;
      if (levelFilter) params.level = levelFilter;
      const res: any = await userApi.list(params);
      const list = res?.data?.list;
      if (Array.isArray(list) && list.length > 0) {
        // 后端有真实数据，切换到 API 模式
        useMockRef.current = false;
        setUsers(list);
        setTotal(res?.data?.total || list.length);
        setLoading(false);
        return;
      }
    } catch {
      // 后端不可用
    }
    // 降级：使用本地 mock
    useMockRef.current = true;
    applyLocalFilter();
  }, [page, keyword, statusFilter, levelFilter, pageSize, applyLocalFilter]);

  useEffect(() => { setPage(1); }, [keyword, statusFilter, levelFilter]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / pageSize);

  // Create user — 总是先尝试真实 API，失败再降级本地 mock
  const handleCreate = async () => {
    if (!form.phone || !form.nickname || !form.password) return;
    setSubmitting(true);
    try {
      // 优先尝试真实 API
      await userApi.create(form);
      setShowCreate(false);
      setForm({ ...emptyForm });
      fetchUsers(); // 重新从 API 拉取
      return;
    } catch (apiErr: any) {
      console.warn('API 创建用户失败，降级到本地模拟:', apiErr?.message || apiErr);
    }
    // 降级：本地 mock
    try {
      const newUser = {
        id: ++mockIdSeqRef.current,
        nickname: form.nickname,
        phone: form.phone,
        gender: form.gender,
        avatar: form.avatar,
        city: form.city,
        member_level: form.member_level,
        status: 1,
        created_at: new Date().toISOString(),
        last_login_at: null,
      };
      mockUsersRef.current.unshift(newUser);
      setShowCreate(false);
      setForm({ ...emptyForm });
      applyLocalFilter();
    } finally {
      setSubmitting(false);
    }
  };

  // Edit user
  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({
      phone: u.phone || '',
      nickname: u.nickname || '',
      password: '',
      gender: u.gender ?? 1,
      avatar: u.avatar || '',
      city: u.city || '',
      member_level: u.member_level ?? 0,
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editingUser || !form.nickname || !form.phone) return;
    setSubmitting(true);
    try {
      // 优先尝试真实 API
      const data: any = { phone: form.phone, nickname: form.nickname, gender: form.gender, avatar: form.avatar, city: form.city, member_level: form.member_level };
      if (form.password) data.password = form.password;
      await userApi.update(editingUser.id, data);
      setShowEdit(false);
      setEditingUser(null);
      setForm({ ...emptyForm });
      fetchUsers();
      return;
    } catch (apiErr: any) {
      console.warn('API 编辑用户失败，降级到本地模拟:', apiErr?.message || apiErr);
    }
    // 降级：本地 mock
    try {
      const idx = mockUsersRef.current.findIndex(u => u.id === editingUser.id);
      if (idx !== -1) {
        mockUsersRef.current[idx] = {
          ...mockUsersRef.current[idx],
          nickname: form.nickname,
          phone: form.phone,
          gender: form.gender,
          avatar: form.avatar,
          city: form.city,
          member_level: form.member_level,
        };
      }
      setShowEdit(false);
      setEditingUser(null);
      setForm({ ...emptyForm });
      applyLocalFilter();
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status — 先尝试 API，失败降级本地
  const toggleStatus = async (u: any) => {
    try {
      if (u.status === 1) {
        await userApi.disable(u.id);
      } else {
        await userApi.enable(u.id);
      }
      fetchUsers();
    } catch (apiErr: any) {
      console.warn('API 操作失败，降级到本地模拟:', apiErr?.message || apiErr);
      // 降级：本地 mock
      const idx = mockUsersRef.current.findIndex(x => x.id === u.id);
      if (idx !== -1) {
        mockUsersRef.current[idx].status = mockUsersRef.current[idx].status === 1 ? 0 : 1;
      }
      applyLocalFilter();
    }
  };

  // Delete user — 先尝试 API，失败降级本地
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      await userApi.delete(deleteConfirm);
      setDeleteConfirm(null);
      fetchUsers();
      return;
    } catch (apiErr: any) {
      console.warn('API 删除用户失败，降级到本地模拟:', apiErr?.message || apiErr);
    }
    // 降级：本地 mock
    try {
      mockUsersRef.current = mockUsersRef.current.filter(u => u.id !== deleteConfirm);
      setDeleteConfirm(null);
      applyLocalFilter();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">用户管理<span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">演示数据</span></h1>
          <p className="mt-1 text-sm text-gray-400">共 {total.toLocaleString()} 位注册用户</p>
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm }); setShowCreate(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-4 py-2 text-sm font-medium text-white shadow-soft hover:opacity-90 transition-opacity"
        >
          <UserPlus className="h-4 w-4" />新增用户
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF1F6] px-5 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索用户姓名/手机号..."
              className="h-9 w-full rounded-md border border-[#EEF1F6] bg-[#F5F7FA] pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#6B7FD7] focus:bg-white focus:outline-none"
            />
          </div>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-9 rounded-md border border-[#EEF1F6] bg-white px-3 text-sm text-gray-600">
            <option value="">全部会员等级</option>
            <option value="3">钻石会员</option>
            <option value="2">黄金会员</option>
            <option value="1">白银会员</option>
            <option value="0">普通会员</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-[#EEF1F6] bg-white px-3 text-sm text-gray-600">
            <option value="">全部状态</option>
            <option value="1">正常</option>
            <option value="0">禁用</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
            </div>
          ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] text-left text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium"><input type="checkbox" className="h-4 w-4 rounded border-gray-300" /></th>
                <th className="px-3 py-3 font-medium">用户</th>
                <th className="px-3 py-3 font-medium">性别</th>
                <th className="px-3 py-3 font-medium">手机号</th>
                <th className="px-3 py-3 font-medium">会员等级</th>
                <th className="px-3 py-3 font-medium">注册时间</th>
                <th className="px-3 py-3 font-medium">最后登录</th>
                <th className="px-3 py-3 font-medium">状态</th>
                <th className="px-3 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const level = levelMap[u.member_level] || '普通会员';
                const lc = levelColor[level] || levelColor['普通会员'];
                return (
                  <tr key={u.id} className="border-t border-[#F5F7FA] hover:bg-[#FAFBFC]">
                    <td className="px-5 py-3"><input type="checkbox" className="h-4 w-4 rounded border-gray-300" /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary text-sm font-semibold text-white">
                          {(u.nickname || '?')[0]}
                        </div>
                        <span className="font-medium text-[#1F2937]">{u.nickname || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{u.gender === 1 ? '男' : '女'}</td>
                    <td className="px-3 py-3 text-gray-600">{(u.phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${lc.bg} ${lc.text}`}>
                        <Crown className="h-3 w-3" />{level}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('zh-CN') : '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        u.status === 1 ? 'bg-[#E6F9F0] text-[#10B981]' : 'bg-red-50 text-[#EF4444]'
                      }`}>
                        {u.status === 1 ? '正常' : '禁用'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-[#F3F4FE] hover:text-[#6B7FD7] transition-colors"
                          title="编辑"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(u)}
                          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                            u.status === 1
                              ? 'text-gray-400 hover:bg-orange-50 hover:text-orange-500'
                              : 'text-gray-400 hover:bg-green-50 hover:text-green-500'
                          }`}
                          title={u.status === 1 ? '禁用' : '启用'}
                        >
                          {u.status === 1 ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">暂无用户数据</td></tr>
              )}
            </tbody>
          </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#EEF1F6] px-5 py-3">
          <div className="text-xs text-gray-500">显示 {users.length} 共 {total.toLocaleString()} 条</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 rounded-md border border-[#EEF1F6] bg-white px-3 text-xs text-gray-600 disabled:opacity-40">上一页</button>
            <button className="h-8 min-w-[32px] rounded-md bg-[#6B7FD7] text-xs text-white">{page}</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="h-8 rounded-md border border-[#EEF1F6] bg-white px-3 text-xs text-gray-600 disabled:opacity-40">下一页</button>
          </div>
        </div>
      </div>

      {/* ========== 新增用户弹窗 ========== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); }} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[#1F2937]">新增用户</h3>
              <button onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); }} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">手机号 <span className="text-red-400">*</span></label>
                <input
                  type="text" maxLength={11}
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="11位手机号"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">昵称 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  placeholder="用户昵称"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">登录密码 <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="6-20位密码"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">性别</label>
                  <select
                    value={form.gender} onChange={(e) => setForm({ ...form, gender: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none"
                  >
                    <option value={1}>男</option>
                    <option value={0}>女</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">会员等级</label>
                  <select
                    value={form.member_level} onChange={(e) => setForm({ ...form, member_level: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none"
                  >
                    <option value={0}>普通会员</option>
                    <option value={1}>白银会员</option>
                    <option value={2}>黄金会员</option>
                    <option value={3}>钻石会员</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">头像地址</label>
                <input
                  type="text"
                  value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  placeholder="https://... 不填则用默认头像"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">城市</label>
                <input
                  type="text"
                  value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="如：深圳"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); }}
                className="flex-1 h-10 rounded-lg border border-[#EEF1F6] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >取消</button>
              <button
                onClick={handleCreate}
                disabled={submitting || !form.phone || !form.nickname || !form.password}
                className="flex-1 h-10 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-sm font-medium text-white shadow-soft hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? '创建中...' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 编辑用户弹窗 ========== */}
      {showEdit && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowEdit(false); setEditingUser(null); setForm({ ...emptyForm }); }} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[#1F2937]">编辑用户</h3>
              <button onClick={() => { setShowEdit(false); setEditingUser(null); setForm({ ...emptyForm }); }} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">手机号 <span className="text-red-400">*</span></label>
                <input
                  type="text" maxLength={11}
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="11位手机号"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">昵称 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  placeholder="用户昵称"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">新密码 <span className="text-gray-400">(留空则不修改)</span></label>
                <input
                  type="password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="6-20位新密码"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">性别</label>
                  <select
                    value={form.gender} onChange={(e) => setForm({ ...form, gender: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none"
                  >
                    <option value={1}>男</option>
                    <option value={0}>女</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">会员等级</label>
                  <select
                    value={form.member_level} onChange={(e) => setForm({ ...form, member_level: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-white px-3 text-sm focus:border-[#6B7FD7] focus:outline-none"
                  >
                    <option value={0}>普通会员</option>
                    <option value={1}>白银会员</option>
                    <option value={2}>黄金会员</option>
                    <option value={3}>钻石会员</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">头像地址</label>
                <input
                  type="text"
                  value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  placeholder="https://..."
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">城市</label>
                <input
                  type="text"
                  value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="如：深圳"
                  className="w-full h-10 rounded-lg border border-[#EEF1F6] bg-[#F5F7FA] px-3 text-sm focus:border-[#6B7FD7] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setShowEdit(false); setEditingUser(null); setForm({ ...emptyForm }); }}
                className="flex-1 h-10 rounded-lg border border-[#EEF1F6] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >取消</button>
              <button
                onClick={handleEdit}
                disabled={submitting || !form.phone || !form.nickname}
                className="flex-1 h-10 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-sm font-medium text-white shadow-soft hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 删除确认弹窗 ========== */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-5">删除后该用户数据将无法恢复，确定要删除吗？</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 rounded-lg border border-[#EEF1F6] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >取消</button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 h-10 rounded-lg bg-red-500 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
