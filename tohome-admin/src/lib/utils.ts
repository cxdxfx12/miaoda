// 工具函数
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return num.toString();
}

export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/* ===================================================================
   安全图片上传工具 — 文件校验、压缩、防护
   =================================================================== */

/** 允许的图片 MIME 类型白名单 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** 允许的文件扩展名 */
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

/** 上传配置（单位：字节） */
export const UPLOAD_LIMITS = {
  avatar:   { maxSize: 2 * 1024 * 1024, label: '2MB', maxWidth: 512, maxHeight: 512, quality: 0.85 },
  photo:    { maxSize: 5 * 1024 * 1024, label: '5MB', maxWidth: 1200, maxHeight: 1200, quality: 0.82 },
  life:     { maxSize: 5 * 1024 * 1024, label: '5MB', maxWidth: 1200, maxHeight: 1200, quality: 0.82 },
  art:      { maxSize: 5 * 1024 * 1024, label: '5MB', maxWidth: 1200, maxHeight: 1200, quality: 0.82 },
  banner:   { maxSize: 3 * 1024 * 1024, label: '3MB', maxWidth: 1920, maxHeight: 600, quality: 0.88 },
} as const;

export type UploadType = keyof typeof UPLOAD_LIMITS;

/** 校验结果 */
interface FileValidateResult {
  ok: boolean;
  error?: string;
  file?: File; // 可能是压缩后的新文件
}

/**
 * 文件名消毒 — 防止路径穿越攻击
 * 移除 ../ ./ \0 等危险字符，只保留字母、数字、中文、- _ . 
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, '')       // 移除 ..
    .replace(/^\.\//, '')       // 移除 ./
    .replace(/[\\/:\*\?"<>\|\x00-\x1f]/g, '') // 移除非法字符
    .replace(/\s+/g, '_')      // 空格转下划线
    .slice(0, 120);             // 截断过长文件名
}

/**
 * 从文件名提取扩展名并校验
 */
function getExtension(file: File): string | null {
  const name = file.name.toLowerCase();
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx < 0) return null;
  return name.slice(dotIdx + 1);
}

/**
 * 核心文件校验函数 — 类型+大小+MIME 多重验证
 */
export function validateImageFile(file: File, type: UploadType): FileValidateResult {
  // 1. 检查是否为空
  if (!file || !(file instanceof File)) {
    return { ok: false, error: '请选择有效的图片文件' };
  }

  // 2. 文件大小检查
  const limit = UPLOAD_LIMITS[type];
  if (file.size > limit.maxSize) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, error: `文件过大 (${sizeMB}MB)，${type === 'avatar' ? '头像' : '图片'}最大允许 ${limit.label}` };
  }

  // 3. 最小文件大小（防止空文件/损坏）
  if (file.size < 1024) {
    return { ok: false, error: '文件过小，可能已损坏' };
  }

  // 4. 扩展名校验
  const ext = getExtension(file);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: '不支持的文件格式，仅支持 JPG / PNG / WebP' };
  }

  // 5. MIME 类型校验（防伪装扩展名攻击）
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: `文件类型不合法 (${file.type})，仅支持图片文件` };
  }

  return { ok: true, file };
}

/**
 * 图片压缩 + 尺寸限制
 * 返回 Promise<File> 压缩后的文件
 */
export async function compressImage(
  file: File,
  type: UploadType,
): Promise<{ ok: boolean; error?: string; compressedFile?: File }> {
  const limit = UPLOAD_LIMITS[type];

  // 如果文件已经小于 200KB 且是合理尺寸，跳过压缩
  if (file.size <= 200 * 1024) {
    try {
      const dimensions = await getImageDimensions(file);
      if (dimensions.width <= limit.maxWidth && dimensions.height <= limit.maxHeight) {
        return { ok: true, compressedFile: file };
      }
    } catch {
      // 无法读取尺寸时直接返回原文件
      return { ok: true, compressedFile: file };
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      
      // 计算等比缩放尺寸
      const ratio = Math.min(limit.maxWidth / width, limit.maxHeight / height);
      if (ratio < 1) {
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Canvas 绘制并导出
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ ok: false, error: '浏览器不支持图片处理' });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // 根据 MIME 选择输出格式
      let outputMime = file.type;
      let outputExt = getExtension(file) || 'jpg';
      if (file.type === 'image/png') {
        outputMime = 'image/png'; outputExt = 'png';
      } else {
        outputMime = 'image/jpeg'; outputExt = 'jpg';
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ ok: false, error: '图片压缩失败' });
            return;
          }
          const sanitizedName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
          const compressedFile = new File([blob], `${sanitizedName}.${outputExt}`, {
            type: outputMime,
            lastModified: Date.now(),
          });
          resolve({ ok: true, compressedFile });
        },
        outputMime,
        limit.quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, error: '图片加载失败，文件可能已损坏' });
    };

    img.src = url;
  });
}

/**
 * 获取图片原始尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片尺寸'));
    };
    img.src = url;
  });
}

/**
 * 完整的安全上传流程：校验 → 压缩 → 返回可上传文件
 */
export async function safePrepareUpload(
  file: File,
  type: UploadType,
): Promise<{ ok: boolean; error?: string; file?: File }> {
  // Step 1: 校验
  const validation = validateImageFile(file, type);
  if (!validation.ok) return validation;

  // Step 2: 压缩
  const compression = await compressImage(validation.file!, type);
  if (!compression.ok) return compression;

  return { ok: true, file: compression.compressedFile };
}
