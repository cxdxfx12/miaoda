'use client';

import { useState, useEffect } from 'react';
import { Save, MapPin, Globe, Database, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { configApi } from '@/api/config';

interface MapConfig {
  provider: string;
  amapKey: string;
  amapSecret: string;
  tencentKey: string;
  defaultCity: string;
  defaultCityCode: string;
  searchRadius: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

const defaultConfig: MapConfig = {
  provider: 'amap',
  amapKey: '',
  amapSecret: '',
  tencentKey: '',
  defaultCity: '杭州',
  defaultCityCode: '330100',
  searchRadius: 5,
  cacheEnabled: true,
  cacheTTL: 1800,
};

export default function MapConfigPage() {
  const [config, setConfig] = useState<MapConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    configApi.getMapConfig().then((res: any) => {
      if (res?.data) {
        setConfig({ ...defaultConfig, ...res.data });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configApi.saveMapConfig(config as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B7FD7]" />
        </div>
      ) : (
        <>
      <PageHeader
        tag="基础设施"
        title="地图配置"
        subtitle="配置地图服务参数和高德/腾讯地图 API 密钥"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#6B7FD7] to-[#8B9FE8] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
          </button>
        }
      />

        {/* 服务商选择 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-[#F0F3FF] flex items-center justify-center">
              <Globe size={20} className="text-[#6B7FD7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">地图服务商</h2>
              <p className="text-xs text-[#9CA3AF]">选择地图服务提供商</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { id: 'amap', name: '高德地图', desc: '国内首选，数据全面' },
              { id: 'tencent', name: '腾讯地图', desc: '微信生态，流量优势' },
              { id: 'baidu', name: '百度地图', desc: 'AI导航，精度高' },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => setConfig({ ...config, provider: item.id })}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  config.provider === item.id
                    ? 'border-[#6B7FD7] bg-[#F0F3FF]'
                    : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                }`}
              >
                <div className="text-sm font-semibold text-[#1F2937]">{item.name}</div>
                <div className="text-xs text-[#9CA3AF] mt-1">{item.desc}</div>
              </div>
            ))}
          </div>

          {config.provider === 'amap' && (
            <div className="space-y-4 border-t border-[#F3F4F6] pt-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">高德地图 API Key</label>
                <input
                  type="text"
                  value={config.amapKey}
                  onChange={(e) => setConfig({ ...config, amapKey: e.target.value })}
                  placeholder="输入高德地图 Key"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">高德地图 API Secret</label>
                <input
                  type="password"
                  value={config.amapSecret}
                  onChange={(e) => setConfig({ ...config, amapSecret: e.target.value })}
                  placeholder="输入高德地图 Secret"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
                />
              </div>
            </div>
          )}

          {config.provider === 'tencent' && (
            <div className="space-y-4 border-t border-[#F3F4F6] pt-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">腾讯地图 Key</label>
                <input
                  type="text"
                  value={config.tencentKey}
                  onChange={(e) => setConfig({ ...config, tencentKey: e.target.value })}
                  placeholder="输入腾讯地图 Key"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 搜索配置 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-[#F0F3FF] flex items-center justify-center">
              <MapPin size={20} className="text-[#6B7FD7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">搜索配置</h2>
              <p className="text-xs text-[#9CA3AF]">配置搜索半径和默认位置</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">默认城市</label>
              <input
                type="text"
                value={config.defaultCity}
                onChange={(e) => setConfig({ ...config, defaultCity: e.target.value })}
                className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">城市编码</label>
              <input
                type="text"
                value={config.defaultCityCode}
                onChange={(e) => setConfig({ ...config, defaultCityCode: e.target.value })}
                className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-[#4B5563] mb-1.5">
              搜索半径: <span className="text-[#6B7FD7] font-semibold">{config.searchRadius}km</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={config.searchRadius}
              onChange={(e) => setConfig({ ...config, searchRadius: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#F3F4F6] rounded-lg appearance-none cursor-pointer accent-[#6B7FD7]"
            />
            <div className="flex justify-between text-xs text-[#9CA3AF] mt-1">
              <span>1km</span>
              <span>5km</span>
              <span>10km</span>
              <span>15km</span>
              <span>20km</span>
            </div>
          </div>
        </div>

        {/* 缓存配置 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-[#F0F3FF] flex items-center justify-center">
              <Database size={20} className="text-[#6B7FD7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">缓存策略</h2>
              <p className="text-xs text-[#9CA3AF]">配置地图数据缓存策略</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between py-3 border-b border-[#F3F4F6]">
              <div>
                <div className="text-sm font-medium text-[#1F2937]">启用缓存</div>
                <div className="text-xs text-[#9CA3AF] mt-1">缓存地理编码和POI搜索结果</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, cacheEnabled: !config.cacheEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.cacheEnabled ? 'bg-[#6B7FD7]' : 'bg-[#D1D5DB]'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  config.cacheEnabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">缓存时间（秒）</label>
                <input
                  type="number"
                  value={config.cacheTTL}
                  onChange={(e) => setConfig({ ...config, cacheTTL: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#6B7FD7] focus:ring-1 focus:ring-[#6B7FD7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1.5">预定义半径选项</label>
                <div className="flex gap-2 items-center pt-2">
                  {['3km', '5km', '10km'].map((r) => (
                    <span key={r} className="px-3 py-1.5 bg-[#F3F4F6] rounded-lg text-xs text-[#4B5563]">{r}</span>
                  ))}
                  <span className="px-3 py-1.5 bg-[#F0F3FF] rounded-lg text-xs text-[#6B7FD7] font-medium">自定义</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
      )}
    </AdminLayout>
  );
}
