'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Star, ThumbsUp, MessageSquare, Loader2 } from 'lucide-react';
import { reviewApi } from '@/api';

interface Review { id: number; user_name: string; talent_name: string; rating: number; content: string; tags: any; reply_content?: string; created_at: string; }
interface ReviewStats { total_reviews: number; reply_rate: string; avg_rating: string; pending_reply: number; }

// --- Mock 数据 ---
const MOCK_STATS: ReviewStats = { total_reviews: 2856, reply_rate: '96.8%', avg_rating: '4.8', pending_reply: 38 };
const MOCK_REVIEWS: Review[] = [
  { id: 1, user_name: '张先生', talent_name: '李达人', rating: 5, content: '手法非常专业，力道适中，按完浑身轻松。下次还会预约！', tags: ['专业', '手法好'], created_at: '2026-06-23 14:30' },
  { id: 2, user_name: '王女士', talent_name: '陈达人', rating: 5, content: '服务特别周到，环境也很干净。精油SPA太舒服了，必须五星好评！', tags: ['服务好', '环境佳'], reply_content: '感谢您的认可！期待再次为您服务~', created_at: '2026-06-23 12:15' },
  { id: 3, user_name: '刘先生', talent_name: '王达人', rating: 4, content: '整体还不错，就是等待时间稍微有点长，希望改进。', tags: ['态度好'], created_at: '2026-06-23 10:00' },
  { id: 4, user_name: '赵女士', talent_name: '林达人', rating: 5, content: '朋友推荐来的，果然没让我失望。推拿技术一流，解决了我长期的腰酸问题。', tags: ['专业', '效果好'], created_at: '2026-06-22 19:20' },
  { id: 5, user_name: '孙先生', talent_name: '周达人', rating: 3, content: '一般般吧，没有宣传的那么好。', tags: [], reply_content: '非常抱歉给您带来不好的体验，我们会加强培训提升服务质量。', created_at: '2026-06-22 16:45' },
  { id: 6, user_name: '杨女士', talent_name: '吴达人', rating: 5, content: '太棒了！按完感觉整个人都轻松了，已经推荐给身边的朋友了。', tags: ['推荐', '专业'], created_at: '2026-06-22 14:00' },
  { id: 7, user_name: '周先生', talent_name: '郑达人', rating: 4, content: '服务态度很好，技术也不错，价格合理。', tags: ['性价比', '态度好'], reply_content: '谢谢您的支持，我们会继续努力！', created_at: '2026-06-22 11:30' },
  { id: 8, user_name: '吴女士', talent_name: '黄达人', rating: 5, content: '已经是第三次预约了，每次体验都很棒。泰式按摩特别正宗！', tags: ['回头客', '专业'], created_at: '2026-06-22 09:00' },
  { id: 9, user_name: '郑先生', talent_name: '马达人', rating: 4, content: '整体体验不错，达人很准时，手法也可以。', tags: ['准时'], created_at: '2026-06-21 20:30' },
  { id: 10, user_name: '陈女士', talent_name: '谢达人', rating: 5, content: '手法专业，态度亲切，精油用的是进口品牌，体验一级棒！', tags: ['专业', '品质好'], created_at: '2026-06-21 18:00' },
];

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [stats, setStats] = useState<ReviewStats>(MOCK_STATS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(MOCK_REVIEWS.length);
  const [replying, setReplying] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadReviews(); }, [page]);

  async function loadStats() {
    try {
      const res: any = await reviewApi.getOverview();
      const d = res?.data || {};
      if (d.total_reviews) setStats(d);
    } catch { /* backend unavailable, using mock */ }
  }

  async function loadReviews() {
    setLoading(true);
    try {
      const res: any = await reviewApi.list({ page, page_size: 10 });
      const list = res?.data?.list ?? [];
      if (list.length) { setReviews(list); setTotal(res?.data?.total || list.length); }
    } catch { /* backend unavailable, using mock */ }
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
