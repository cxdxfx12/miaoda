'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  ArrowLeft, User, Phone, Calendar, MapPin, FileText,
  Upload, X, Plus, Image as ImageIcon, Camera, Star, Shield,
  Check, Loader2, AlertCircle, Info, ChevronDown, Tag,
} from 'lucide-react';
import { talentApi, CreateTalentParams } from '@/api/talents';
import {
  safePrepareUpload, UPLOAD_LIMITS, type UploadType,
  sanitizeFileName,
} from '@/lib/utils';
import { cityDistrictMap, cityNames } from '@/constants/cities';

// ==================== 年龄段计算 ====================
function calcAgeRange(birthday: string): { label: string; desc: string; color: string } | null {
  if (!birthday) return null;
  const year = parseInt(birthday.slice(0, 4));
  if (isNaN(year)) return null;
  if (year >= 2000) return { label: '00后', desc: '年轻有活力，深受年轻客户喜爱', color: 'bg-gradient-to-r from-[#FF6B8A] to-[#FF8EAB]' };
  if (year >= 1995) return { label: '95后', desc: '青春时尚，风格多元', color: 'bg-gradient-to-r from-[#FFB84D] to-[#FFD080]' };
  if (year >= 1990) return { label: '90后', desc: '成熟稳重，手法娴熟', color: 'bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3]' };
  if (year >= 1985) return { label: '85后', desc: '经验丰富，技艺精湛', color: 'bg-gradient-to-r from-[#10B981] to-[#34D399]' };
  if (year >= 1980) return { label: '80后', desc: '资深技师，手法一流', color: 'bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA]' };
  return { label: '资深', desc: '行业资深，技艺无双', color: 'bg-gradient-to-r from-[#EC4899] to-[#F472B6]' };
}

// ==================== 技能选项 ====================
const SKILL_OPTIONS = [
  { id: 1, name: '中式按摩', icon: '💆' },
  { id: 2, name: '推拿', icon: '👐' },
  { id: 3, name: '精油SPA', icon: '🧴' },
  { id: 4, name: '足疗', icon: '🦶' },
  { id: 5, name: '刮痧', icon: '🪨' },
  { id: 6, name: '拔罐', icon: '🔥' },
  { id: 7, name: '经络疏通', icon: '🌀' },
  { id: 8, name: '泰式按摩', icon: '🧘' },
  { id: 9, name: '采耳', icon: '👂' },
  { id: 10, name: '头部按摩', icon: '🤲' },
  { id: 11, name: '肩颈理疗', icon: '💪' },
  { id: 12, name: '纤体塑形', icon: '✨' },
];

// ==================== 服务城市选项 ====================
const CITY_OPTIONS = cityNames;
const DISTRICT_OPTIONS = cityDistrictMap;

// ==================== 主组件 ====================
export default function AddTalentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 表单字段
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState(0); // 0=女 1=男
  const [birthday, setBirthday] = useState('');
  const [idCard, setIdCard] = useState('');
  const [avatar, setAvatar] = useState('');
  const [lifePhotos, setLifePhotos] = useState<string[]>([]);
  const [artPhotos, setArtPhotos] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [certificates, setCertificates] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');
  const [serviceCity, setServiceCity] = useState('');
  const [serviceDistricts, setServiceDistricts] = useState<string[]>([]);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);

  // UI 状态
  const [uploading, setUploading] = useState<'avatar' | 'life' | 'art' | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const fileInputRefs = {
    avatar: useRef<HTMLInputElement>(null),
    life: useRef<HTMLInputElement>(null),
    art: useRef<HTMLInputElement>(null),
  };

  const ageRange = calcAgeRange(birthday);

  // ==================== 安全文件上传 ====================
  const [uploadErrors, setUploadErrors] = useState<string>('');

  const handleFileUpload = async (file: File, type: 'avatar' | 'life' | 'art') => {
    setUploadErrors('');
    setUploading(type);

    try {
      // Step 1: 安全校验 + 压缩
      const prepareResult = await safePrepareUpload(file, type);
      if (!prepareResult.ok) {
        setUploadErrors(prepareResult.error || '文件校验失败');
        setUploading(null);
        return;
      }

      // Step 2: 上传压缩后的文件
      const res: any = await talentApi.upload(prepareResult.file!);
      const url = res?.data?.url || '';

      if (type === 'avatar') {
        setAvatar(url);
      } else if (type === 'life') {
        setLifePhotos(prev => prev.length < 5 ? [...prev, url] : prev);
      } else {
        setArtPhotos(prev => prev.length < 5 ? [...prev, url] : prev);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '上传失败，请重试';
      setUploadErrors(msg);
    } finally {
      setUploading(null);
    }
  };

  /** 拖拽上传支持 */
  const handleDrop = (e: React.DragEvent, type: 'avatar' | 'life' | 'art') => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file, type);
  };

  // ==================== 表单验证 ====================
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!realName.trim()) errs.realName = '请输入达人姓名';
    if (!phone.trim()) errs.phone = '请输入手机号';
    else if (!/^1[3-9]\d{9}$/.test(phone.trim())) errs.phone = '手机号格式不正确';
    if (!birthday) errs.birthday = '请选择出生日期';
    if (!avatar) errs.avatar = '请上传头像';
    if (selectedSkills.length === 0) errs.skills = '请至少选择一项技能';
    if (!serviceCity) errs.serviceCity = '请选择服务城市';
    if (serviceDistricts.length === 0) errs.districts = '请选择服务区域';
    if (emergencyPhone && !/^1[3-9]\d{9}$/.test(emergencyPhone.trim())) errs.emergencyPhone = '紧急电话格式不正确';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ==================== 提交 ====================
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const params: CreateTalentParams = {
        real_name: realName.trim(),
        phone: phone.trim(),
        gender,
        birthday,
        id_card: idCard.trim(),
        avatar,
        life_photos: lifePhotos,
        art_photos: artPhotos,
        skills: selectedSkills,
        certificates,
        service_city: serviceCity,
        service_districts: serviceDistricts,
        emergency_contact: emergencyContact.trim(),
        emergency_phone: emergencyPhone.trim(),
        introduction: introduction.trim(),
        auto_approve: autoApprove,
      };
      await talentApi.create(params);
      router.push('/talents');
    } catch (e: any) {
      const msg = e?.response?.data?.message || '创建失败，请重试';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== 辅助函数 ====================
  const toggleSkill = (id: number) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleDistrict = (d: string) => {
    setServiceDistricts(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const addCertificate = () => {
    if (certInput.trim() && !certificates.includes(certInput.trim())) {
      setCertificates(prev => [...prev, certInput.trim()]);
      setCertInput('');
    }
  };

  const removePhoto = (type: 'life' | 'art', index: number) => {
    if (type === 'life') setLifePhotos(prev => prev.filter((_, i) => i !== index));
    else setArtPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== 渲染 ====================
  return (
    <AdminLayout>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="page-title">新增达人</h1>
            <p className="mt-1 text-sm text-[#9CA3AF]">完善达人资料，信息越丰富越吸引用户</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-6 py-2.5 text-sm font-medium text-white shadow-soft hover:from-[#5668C2] hover:to-[#6B7FD7] disabled:opacity-60 transition-all"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {submitting ? '创建中...' : '保存达人'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ========== 左栏: 照片上传区 ========== */}
        <div className="space-y-5">
          {/* 头像上传 */}
          <div className="admin-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937] mb-4">
              <Camera className="h-4 w-4 text-[#6B7FD7]" /> 达人头像
            </h3>
            <div className="flex flex-col items-center">
              <input
                type="file"
                ref={fileInputRefs.avatar}
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'avatar')}
              />
              {avatar ? (
                <div className="relative group">
                  <img src={avatar} alt="头像" className="h-32 w-32 rounded-2xl object-cover shadow-md border-2 border-[#EEF1F6]" />
                  <button
                    onClick={() => setAvatar('')}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#FF4D4F] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRefs.avatar.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, 'avatar')}
                  disabled={uploading === 'avatar'}
                  className={`flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors ${
                    uploading === 'avatar'
                      ? 'border-[#6B7FD7] bg-[#F3F4FE]'
                      : 'border-[#D1D5DB] hover:border-[#6B7FD7] hover:text-[#6B7FD7] hover:bg-[#FAFBFF] cursor-pointer text-[#9CA3AF]'
                  }`}
                >
                  {uploading === 'avatar' ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-[#6B7FD7]" />
                      <span className="text-xs font-medium text-[#6B7FD7]">校验中...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8" />
                      <span className="text-xs">点击或拖拽</span>
                      <span className="text-[10px] text-[#C4C8CF]">JPG/PNG/WebP</span>
                    </>
                  )}
                </button>
              )}
              {/* 错误提示 */}
              {errors.avatar && <p className="mt-2 text-xs text-[#FF4D4F]">{errors.avatar}</p>}
              {uploadErrors && !errors.avatar && (
                <div className="mt-2 flex items-center gap-1 rounded-lg bg-[#FFF1F0] px-3 py-1.5 text-xs text-[#FF4D4F]">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{uploadErrors}</span>
                </div>
              )}
              <p className={`mt-2 text-xs ${uploadErrors && !errors.avatar ? 'mt-1' : ''}`}>
                <span className="text-[#9CA3AF]">建议 1:1 方形，最大 </span>
                <span className="font-semibold text-[#6B7FD7]">{UPLOAD_LIMITS.avatar.label}</span>
              </p>
            </div>
          </div>

          {/* 生活照上传 */}
          <div className="admin-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937] mb-4">
              <ImageIcon className="h-4 w-4 text-[#10B981]" /> 生活照 <span className="text-xs font-normal text-[#9CA3AF]">({lifePhotos.length}/5)</span>
            </h3>
            <input
              type="file"
              ref={fileInputRefs.life}
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'life')}
            />
            <div
              className="grid grid-cols-3 gap-2"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f, 'life'); }}
            >
              {lifePhotos.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[#EEF1F6]">
                  <img src={url} alt={`生活照${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto('life', i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[#FF4D4F] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {lifePhotos.length < 5 && (
                <button
                  onClick={() => fileInputRefs.life.current?.click()}
                  disabled={uploading === 'life'}
                  className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                    uploading === 'life'
                      ? 'border-[#10B981] bg-[#ECFDF5]'
                      : 'border-[#D1D5DB] hover:border-[#10B981] hover:text-[#10B981] hover:bg-[#F0FDF4] cursor-pointer text-[#9CA3AF]'
                  }`}
                >
                  {uploading === 'life' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
            <p className={`mt-2 text-xs ${uploadErrors ? '' : ''}`}>
              <span className="text-[#9CA3AF]">展示真实面貌，单张最大 </span>
              <span className="font-semibold text-[#10B981]">{UPLOAD_LIMITS.photo.label}</span>
            </p>
          </div>

          {/* 艺术照/宣传照上传 */}
          <div className="admin-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937] mb-4">
              <Star className="h-4 w-4 text-[#FFB84D]" /> 艺术照/宣传照 <span className="text-xs font-normal text-[#9CA3AF]">({artPhotos.length}/5)</span>
            </h3>
            <input
              type="file"
              ref={fileInputRefs.art}
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'art')}
            />
            <div
              className="grid grid-cols-3 gap-2"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f, 'art'); }}
            >
              {artPhotos.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[#EEF1F6] bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3]">
                  <img src={url} alt={`艺术照${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto('art', i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[#FF4D4F] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {artPhotos.length < 5 && (
                <button
                  onClick={() => fileInputRefs.art.current?.click()}
                  disabled={uploading === 'art'}
                  className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                    uploading === 'art'
                      ? 'border-[#FFB84D] bg-[#FFFBEB]'
                      : 'border-[#D1D5DB] hover:border-[#FFB84D] hover:text-[#FFB84D] hover:bg-[#FFFEFA] cursor-pointer text-[#9CA3AF]'
                  }`}
                >
                  {uploading === 'art' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#FFB84D]" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs">
              <span className="text-[#9CA3AF]">宣传照用于首页展示，单张最大 </span>
              <span className="font-semibold text-[#FFB84D]">{UPLOAD_LIMITS.photo.label}</span>
            </p>
          </div>
        </div>

        {/* ========== 右栏: 资料表单 ========== */}
        <div className="lg:col-span-2 space-y-5">
          {/* 基本信息 */}
          <div className="admin-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937] mb-4">
              <User className="h-4 w-4 text-[#6B7FD7]" /> 基本信息
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">姓名 <span className="text-[#FF4D4F]">*</span></label>
                <input
                  type="text"
                  value={realName}
                  onChange={e => setRealName(e.target.value)}
                  placeholder="请输入达人姓名"
                  className={`admin-input w-full ${errors.realName ? 'border-[#FF4D4F]' : ''}`}
                />
                {errors.realName && <p className="mt-1 text-xs text-[#FF4D4F]">{errors.realName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">手机号 <span className="text-[#FF4D4F]">*</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  maxLength={11}
                  className={`admin-input w-full ${errors.phone ? 'border-[#FF4D4F]' : ''}`}
                />
                {errors.phone && <p className="mt-1 text-xs text-[#FF4D4F]">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">性别 <span className="text-[#FF4D4F]">*</span></label>
                <div className="flex gap-2">
                  {[
                    { value: 0, label: '女', icon: '👩' },
                    { value: 1, label: '男', icon: '👨' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all ${
                        gender === opt.value
                          ? 'border-[#6B7FD7] bg-[#F3F4FE] text-[#6B7FD7] shadow-sm'
                          : 'border-[#E5E7EB] text-[#9CA3AF] hover:border-[#D1D5DB]'
                      }`}
                    >
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">出生日期 <span className="text-[#FF4D4F]">*</span></label>
                <div className="relative">
                  <input
                    type="date"
                    value={birthday}
                    onChange={e => setBirthday(e.target.value)}
                    className={`admin-input w-full ${errors.birthday ? 'border-[#FF4D4F]' : ''}`}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
                </div>
                {errors.birthday && <p className="mt-1 text-xs text-[#FF4D4F]">{errors.birthday}</p>}
                {ageRange && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${ageRange.color} text-white text-xs font-medium`}>
                    {ageRange.label} · {ageRange.desc}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">身份证号</label>
                <input
                  type="text"
                  value={idCard}
                  onChange={e => setIdCard(e.target.value)}
                  placeholder="请输入身份证号（选填）"
                  maxLength={18}
                  className="admin-input w-full"
                />
              </div>
            </div>
          </div>

          {/* 服务信息 */}
          <div className="admin-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937] mb-4">
              <MapPin className="h-4 w-4 text-[#6B7FD7]" /> 服务信息
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">服务城市 <span className="text-[#FF4D4F]">*</span></label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                    className={`admin-input flex w-full items-center justify-between ${errors.serviceCity ? 'border-[#FF4D4F]' : ''}`}
                  >
                    <span className={serviceCity ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}>{serviceCity || '请选择城市'}</span>
                    <ChevronDown className={`h-4 w-4 text-[#9CA3AF] transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showCityDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                      {CITY_OPTIONS.map(city => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => { setServiceCity(city); setServiceDistricts([]); setShowCityDropdown(false); }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-[#F3F4FE] transition-colors ${serviceCity === city ? 'bg-[#F3F4FE] text-[#6B7FD7] font-medium' : 'text-[#4B5563]'}`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.serviceCity && <p className="mt-1 text-xs text-[#FF4D4F]">{errors.serviceCity}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">服务区域 <span className="text-[#FF4D4F]">*</span></label>
                <div className={`flex flex-wrap gap-1.5 rounded-lg border p-2 min-h-[38px] ${errors.districts ? 'border-[#FF4D4F]' : 'border-[#E5E7EB]'}`}>
                  {serviceCity ? (
                    (DISTRICT_OPTIONS[serviceCity] || []).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDistrict(d)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                          serviceDistricts.includes(d)
                            ? 'bg-[#6B7FD7] text-white'
                            : 'bg-[#F5F7FA] text-[#6B7280] hover:bg-[#EEF1F6]'
                        }`}
                      >
                        {d}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-[#9CA3AF] px-1">请先选择城市</p>
                  )}
                </div>
                {errors.districts && <p className="mt-1 text-xs text-[#FF4D4F]">{errors.districts}</p>}
              </div>

              {/* 技能选择 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">技能标签 <span className="text-[#FF4D4F]">*</span></label>
                <div className={`flex flex-wrap gap-1.5 rounded-lg border p-3 ${errors.skills ? 'border-[#FF4D4F]' : 'border-[#E5E7EB]'}`}>
                  {SKILL_OPTIONS.map(skill => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedSkills.includes(skill.id)
                          ? 'bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] text-white shadow-sm'
                          : 'bg-[#F5F7FA] text-[#6B7280] hover:bg-[#EEF1F6] border border-transparent hover:border-[#D1D5DB]'
                      }`}
                    >
                      <span>{skill.icon}</span> {skill.name}
                    </button>
                  ))}
                </div>
                {errors.skills && <p className="mt-1 text-xs text-[#FF4D4F]">{errors.skills}</p>}
              </div>

              {/* 资质证书 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">资质证书</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={certInput}
                    onChange={e => setCertInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCertificate())}
                    placeholder="如：高级按摩师证、健康证"
                    className="admin-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={addCertificate}
                    className="flex items-center gap-1 rounded-lg border border-[#6B7FD7] px-4 py-2 text-sm font-medium text-[#6B7FD7] hover:bg-[#F3F4FE] transition-colors"
                  >
                    <Plus className="h-4 w-4" /> 添加
                  </button>
                </div>
                {certificates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {certificates.map((cert, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full bg-[#E6F9F0] px-3 py-1 text-xs font-medium text-[#10B981]">
                        <Shield className="h-3 w-3" />
                        {cert}
                        <button onClick={() => setCertificates(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-[#FF4D4F]">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 紧急联系人 + 个人简介 */}
          <div className="admin-card p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
                  <Info className="inline h-3 w-3 mr-1 text-[#9CA3AF]" /> 紧急联系人
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                  placeholder="姓名"
                  className="admin-input w-full mb-2"
                />
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder="手机号"
                  maxLength={11}
                  className={`admin-input w-full ${errors.emergencyPhone ? 'border-[#FF4D4F]' : ''}`}
                />
                {errors.emergencyPhone && <p className="mt-1 text-xs text-[#FF4D4F]">{errors.emergencyPhone}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
                  <FileText className="inline h-3 w-3 mr-1 text-[#9CA3AF]" /> 个人简介
                </label>
                <textarea
                  value={introduction}
                  onChange={e => setIntroduction(e.target.value)}
                  placeholder="介绍一下达人的特点、经历、擅长领域等..."
                  rows={4}
                  className="admin-input w-full resize-none"
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-[#9CA3AF] text-right">{introduction.length}/500</p>
              </div>
            </div>
          </div>

          {/* 审核设置 */}
          <div className="admin-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={autoApprove}
                  onChange={e => setAutoApprove(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D1D5DB] accent-[#6B7FD7]"
                />
              </div>
              <div>
                <label htmlFor="autoApprove" className="text-sm font-medium text-[#1F2937] cursor-pointer">自动通过审核</label>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">
                  开启后达人创建即上线，无需人工审核；关闭则进入待审核列表
                </p>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#EEF1F6] bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <AlertCircle className="h-3.5 w-3.5" />
              提交前请确认信息无误，部分信息创建后不可修改
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="rounded-lg border border-[#E5E7EB] px-5 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6B7FD7] to-[#8B9AE3] px-6 py-2 text-sm font-medium text-white shadow-soft hover:from-[#5668C2] hover:to-[#6B7FD7] disabled:opacity-60 transition-all"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? '保存中...' : '保存达人'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
