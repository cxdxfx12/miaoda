'use client';

import { Bell, Search, ChevronDown, LogOut, User as UserIcon, Menu, X, Loader2, Camera, Mail, Phone, Lock } from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { adminApi } from '@/api/admin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onToggleSidebar: () => void;
}

// 页面名称映射
const pageNames: Record<string, string> = {
  '/dashboard': '数据概览',
  '/orders': '订单管理',
  '/dispatch': '派单调度',
  '/talents': '达人管理',
  '/talent-review': '达人审核',
  '/users': '用户管理',
  '/services': '服务管理',
  '/marketing': '营销中心',
  '/reviews': '评价管理',
  '/finance': '财务管理',
  '/analytics': '数据分析',
  '/cities': '城市管理',
  '/map-config': '地图配置',
  '/payment-config': '支付配置',
  '/wechat-config': '微信配置',
  '/virtual-phone': '虚拟电话',
  '/settings': '系统设置',
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const admin = useAdminStore((s) => s.admin);
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const logout = useAdminStore((s) => s.logout);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ nickname: '', email: '', phone: '', avatar: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // 获取当前页面名称（支持子路由）
  const currentPageName = (() => {
    // 精确匹配
    if (pageNames[pathname || '']) return pageNames[pathname || ''];
    // 前缀匹配（如 /marketing/invites）
    const match = Object.entries(pageNames).find(([path]) => pathname?.startsWith(path + '/'));
    return match ? match[1] : '管理后台';
  })();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('请填写完整密码信息');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('新密码至少需要6位');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setSavingPassword(true);
    try {
      await adminApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      toast.success('密码修改成功，请重新登录');
      setShowPasswordModal(false);
      logout();
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.message || '密码修改失败');
    } finally {
      setSavingPassword(false);
    }
  };

  const openProfileModal = async () => {
    setShowMenu(false);
    setProfileForm({
      nickname: admin?.nickname || admin?.realName || admin?.username || '',
      email: admin?.email || '',
      phone: (admin as any)?.phone || '',
      avatar: admin?.avatar || '',
    });
    setShowProfileModal(true);
    try {
      const res: any = await adminApi.getProfile();
      const profile = res?.data || res;
      if (profile) {
        setProfileForm({
          nickname: profile.nickname || profile.real_name || profile.username || '',
          email: profile.email || '',
          phone: profile.phone || '',
          avatar: profile.avatar || '',
        });
        setAdmin({
          id: profile.id,
          username: profile.username,
          nickname: profile.nickname,
          realName: profile.real_name || profile.nickname,
          role: profile.role || 'admin',
          avatar: profile.avatar,
          email: profile.email,
        });
      }
    } catch {
      // 保留本地已缓存资料，弹窗仍可编辑
    }
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res: any = await adminApi.uploadAvatar(file);
      const data = res?.data || res;
      setProfileForm((prev) => ({ ...prev, avatar: data.url }));
      toast.success(data.optimized ? '头像已上传并自动压缩' : '头像已上传');
    } catch (err: any) {
      toast.error(err?.message || '头像上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.nickname.trim()) {
      toast.error('请输入昵称');
      return;
    }
    setSavingProfile(true);
    try {
      const res: any = await adminApi.updateProfile({
        nickname: profileForm.nickname.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        avatar: profileForm.avatar.trim(),
      });
      const profile = res?.data || res;
      setAdmin({
        id: profile.id,
        username: profile.username,
        nickname: profile.nickname,
        realName: profile.real_name || profile.nickname,
        role: profile.role || 'admin',
        avatar: profile.avatar,
        email: profile.email,
      });
      toast.success('个人信息已保存');
      setShowProfileModal(false);
    } catch (err: any) {
      toast.error(err?.message || '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200/60 bg-white px-5 shadow-sm">
        {/* 左侧：折叠按钮 + 面包屑 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-gray-400">首页</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-800">{currentPageName}</span>
          </nav>
        </div>

        {/* 右侧：搜索框 + 通知 + 用户 */}
        <div className="flex items-center gap-2.5">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              className="h-8 w-48 rounded-lg bg-gray-100 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 transition-all focus:w-64 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>

          {/* 通知铃铛 */}
          <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* 分隔线 */}
          <div className="h-5 w-px bg-gray-200" />

          {/* 管理员头像+名字 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors',
                showMenu ? 'bg-gray-100' : 'hover:bg-gray-100'
              )}
            >
              {admin?.avatar ? (
                <img src={admin.avatar} alt="管理员头像" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-semibold text-white">
                  {admin?.username?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">
                {admin?.username || '管理员'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg animate-fade-in">
                  <button
                    onClick={openProfileModal}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    个人设置
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                      setShowPasswordModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Lock className="h-4 w-4 text-gray-400" />
                    修改密码
                  </button>
                  <div className="my-1 h-px bg-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 个人信息弹窗 */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">个人信息</h3>
                <p className="mt-1 text-sm text-gray-400">维护后台管理员头像、昵称和联系方式</p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} alt="管理员头像" className="h-16 w-16 rounded-full object-cover ring-4 ring-white" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xl font-semibold text-white">
                    {admin?.username?.[0]?.toUpperCase() || 'A'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">管理员头像</div>
                  <div className="mt-1 text-xs text-gray-400">支持 jpg/png/webp，上传后会自动压缩</div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  上传
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">登录账号</label>
                <input
                  value={admin?.username || ''}
                  disabled
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">昵称</label>
                <input
                  value={profileForm.nickname}
                  onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="请输入昵称"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    手机号
                  </label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="请输入手机号"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">头像地址</label>
                <input
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="/uploads/2026/06/avatar.jpg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                >
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                  保存资料
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">修改密码</h3>
                <p className="mt-1 text-sm text-gray-400">修改后需要重新登录管理后台</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">旧密码</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="请输入旧密码"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="至少6位"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="再次输入新密码"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                >
                  {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
