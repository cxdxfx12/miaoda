'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Star, ThumbsUp, MessageSquare, Loader2 } from 'lucide-react';
import { reviewApi } from '@/api';

interface Review { id: number; user_name: string; talent_name: string; rating: number; content: string; tags: any; reply_content?: string; created_at: string; }
interface ReviewStats { total_reviews: number; reply_rate: string; avg_rating: string; pending_reply: number; }

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total_reviews: 0, reply_rate: '0%', avg_rating: '0', pending_reply: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [replying, setReplying] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadReviews(); }, [page]);

  async function loadStats() {
    try {
      const res: any = await reviewApi.getOverview();
      const d = res?.data || {};
      setStats({
        total_reviews: Number(d.total_reviews || 0),
        reply_rate: String(d.reply_rate || '0%'),
        avg_rating: String(d.avg_rating || '0'),
        pending_reply: Number(d.pending_reply || 0),
      });
    } catch {
      setStats({ total_reviews: 0, reply_rate: '0%', avg_rating: '0', pending_reply: 0 });
    }
  }

  async function loadReviews() {
    setLoading(true);
    try {
      const res: any = await reviewApi.list({ page, page_size: 10 });
      const list = res?.data?.list ?? [];
      setReviews(Array.isArray(list) ? list : []);
      setTotal(res?.data?.total || 0);
    } catch {
      setReviews([]);
      setTotal(0);
    }
    finally { setLoading(false); }
  }

  async function handleReply(reviewId: number) {
    if (!replyText.trim()) return;
    try {
      await reviewApi.reply(reviewId, replyText);
      setReplyText('');
      setReplying(null);
      loadReviews();
    } catch { alert('回复失败（后端未连接）'); }
  }

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">评价管理</h1>
          <p className="mt-1 text-sm text-gray-400">用户评价与反馈</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: '总评价数', value: stats.total_reviews.toLocaleString() },
          { label: '好评率', value: stats.reply_rate },
          { label: '平均评分', value: stats.avg_rating },
          { label: '待回复', value: stats.pending_reply.toString() },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-2 text-2xl font-bold text-[#1F2937]">{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" /></div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="divide-y divide-[#F5F7FA]">
            {reviews.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">暂无评价</div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="p-5 hover:bg-[#FAFBFC]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#8B9AE3] text-sm font-semibold text-white">
                      {r.user_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1F2937]">{r.user_name}</span>
                          <span className="text-xs text-gray-400">评价达人</span>
                          <span className="font-medium text-[#6B7FD7]">{r.talent_name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{r.created_at}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-[#FFB84D] text-[#FFB84D]' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{r.content}</p>
                      {r.tags && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(Array.isArray(r.tags) ? r.tags : typeof r.tags === 'string' ? [] : []).map((t: any, i: number) => (
                            <span key={i} className="rounded-md bg-[#F3F4FE] px-2 py-0.5 text-[11px] text-[#6B7FD7]">{typeof t === 'string' ? t : t}</span>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        {r.reply_content ? (
                          <div className="flex flex-1 items-start gap-2 rounded-md bg-[#F9FAFB] p-3">
                            <span className="text-xs text-gray-500">回复:</span>
                            <span className="text-sm text-gray-700">{r.reply_content}</span>
                            <ThumbsUp className="ml-auto h-3 w-3 text-[#10B981]" />
                          </div>
                        ) : replying === r.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              className="flex-1 rounded-md border border-[#EEF1F6] px-3 py-1.5 text-sm"
                              placeholder="输入回复内容..."
                            />
                            <button onClick={() => handleReply(r.id)} className="rounded-md bg-[#6B7FD7] px-3 py-1 text-xs text-white">发送</button>
                            <button onClick={() => { setReplying(null); setReplyText(''); }} className="text-xs text-gray-400">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => setReplying(r.id)} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-3 py-1 text-[11px] font-medium text-white">
                            <MessageSquare className="h-3 w-3" />立即回复
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {total > 10 && (
            <div className="flex items-center justify-between border-t border-[#EEF1F6] px-5 py-3">
              <span className="text-xs text-gray-500">共 {total} 条</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded border border-[#EEF1F6] px-3 py-1 text-xs disabled:opacity-40">上页</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page * 10 >= total}
                  className="rounded border border-[#EEF1F6] px-3 py-1 text-xs disabled:opacity-40">下页</button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
