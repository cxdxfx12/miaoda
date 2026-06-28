'use client';

import { LucideIcon } from 'lucide-react';

interface PageStat {
  value: string | number;
  label: string;
}

interface PageHeaderProps {
  icon?: LucideIcon;
  tag?: string;
  title: string;
  subtitle?: string;
  stats?: PageStat[];
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, tag, title, subtitle, stats, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-[#111827] p-6 text-white shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        {/* 左侧：标签 + 标题 + 描述 */}
        <div>
          {(tag || Icon) && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tag}
            </div>
          )}
          <h1 className="text-2xl font-bold lg:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{subtitle}</p>
          )}
        </div>

        {/* 右侧：统计 + 操作 */}
        <div className="flex items-center gap-4">
          {stats && stats.length > 0 && (
            <div className="flex gap-3">
              {stats.map((s, i) => (
                <div key={i} className="rounded-2xl bg-white/10 px-5 py-4 text-center min-w-[80px]">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="mt-1 text-xs text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {actions && <div>{actions}</div>}
        </div>
      </div>
    </div>
  );
}
