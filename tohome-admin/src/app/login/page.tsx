'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminStore, AdminInfo } from '@/store/adminStore';
import { adminApi } from '@/api/admin';

export default function LoginPage() {
  const router = useRouter();
  const login = useAdminStore((s) => s.login);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res: any = await adminApi.login(username, password);
      // 后端统一返回格式 { code: 0, data: { token, admin } }
      const d = res?.data || res;
      if (!d?.token) {
        throw new Error(res?.message || '登录失败，服务器返回异常');
      }
      const adminInfo: AdminInfo = {
        id: d.admin?.id ?? 1,
        username: d.admin?.username ?? username,
        realName: d.admin?.real_name ?? d.admin?.realName ?? '管理员',
        role: d.admin?.role ?? 'admin',
        avatar: d.admin?.avatar ?? '',
        email: d.admin?.email ?? '',
        nickname: d.admin?.nickname ?? '',
      };
      login(adminInfo, d.token);
      toast.success('登录成功');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.message || err?.response?.data?.message || '账号或密码错误';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#F3F4FE] via-white to-[#FFF8EE] p-4">
      {/* 背景装饰 */}
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#6B7FD7]/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#FFB84D]/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <ShieldCheck className="h-9 w-9 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-[#1F2937]">喵搭</h1>
          <p className="mt-1 text-sm text-gray-500">管理后台 · 商家工作台</p>
        </div>

        {/* 登录卡片 */}
        <div className="rounded-2xl border border-[#EEF1F6] bg-white p-8 shadow-soft">
          <h2 className="mb-1 text-lg font-semibold text-[#1F2937]">欢迎登录</h2>
          <p className="mb-6 text-sm text-gray-400">请使用您的管理员账号登录</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入账号"
                className="h-11 pl-9"
                autoComplete="username"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="h-11 pl-9 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-sm font-medium shadow-soft hover:from-[#5668C2] hover:to-[#6B7FD7]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登 录'
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
            <span>© 2026 喵搭</span>
            <a className="hover:text-[#6B7FD7]" href="#">忘记密码?</a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          默认账号: admin / admin123
        </p>
      </div>
    </div>
  );
}
