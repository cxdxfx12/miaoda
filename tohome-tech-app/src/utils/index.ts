// 工具函数
import { WORK_STATUS_TEXT, WORK_STATUS } from '../config';

/**
 * 格式化金额
 * @param price 金额（分）
 * @returns 格式化的金额字符串，如 "¥128.00"
 */
export function formatPrice(price: number | string | undefined | null): string {
  if (price === undefined || price === null) return '¥0.00';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '¥0.00';
  // 如果金额大于 100000，可能单位是分，转换为元
  const yuan = num > 100000 ? num / 100 : num;
  return `¥${yuan.toFixed(2)}`;
}

/**
 * 格式化日期
 * @param date 日期字符串或时间戳
 * @param format 格式化模板，支持 YYYY MM DD HH mm ss
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | number | Date | undefined | null,
  format: string = 'YYYY-MM-DD HH:mm'
): string {
  if (!date) return '--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--';

  const pad = (n: number) => n.toString().padStart(2, '0');

  return format
    .replace('YYYY', d.getFullYear().toString())
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

/**
 * 手机号脱敏：138****1234
 * @param phone 手机号
 * @returns 脱敏后的手机号
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '--';
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 手机号正则校验
 * @param phone 手机号
 * @returns 是否合法
 */
export function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 身份证号校验
 * @param idCard 身份证号
 * @returns 是否合法
 */
export function validateIdCard(idCard: string): boolean {
  const reg = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  if (!reg.test(idCard)) return false;

  // 校验位验证
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const sum = idCard
    .slice(0, 17)
    .split('')
    .reduce((acc, digit, idx) => acc + parseInt(digit) * weights[idx], 0);
  return checkCodes[sum % 11] === idCard[17].toUpperCase();
}

/**
 * 订单状态文本映射
 */
const ORDER_STATUS_MAP: Record<string, string> = {
  pending: '待接单',
  accepted: '已接单',
  departed: '已出发',
  arrived: '已到达',
  started: '服务中',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已拒绝',
};

export function getOrderStatusText(status: string): string {
  return ORDER_STATUS_MAP[status] || status || '未知';
}

/**
 * 工作状态文本映射
 */
export function getWorkStatusText(status: number): string {
  return WORK_STATUS_TEXT[status] || '未知';
}

/**
 * 获取工作状态对应的颜色
 */
export function getWorkStatusColor(status: number): string {
  const colors: Record<number, string> = {
    [WORK_STATUS.OFFLINE]: '#9CA3AF',
    [WORK_STATUS.ONLINE]: '#52C41A',
    [WORK_STATUS.REST]: '#FAAD14',
  };
  return colors[status] || '#9CA3AF';
}

/**
 * 格式化分钟为小时分钟
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
}

/**
 * 生成首字母头像颜色
 */
export function getAvatarColor(name: string): string {
  const palette = ['#1D4ED8', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777', '#0891B2'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}
