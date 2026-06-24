'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  GoldRecord, 
  Channel, 
  COLOR_PALETTE,
  formatDateTime 
} from '@/utils/goldData';
import PriceInputForm from '@/components/PriceInputForm';
import LineToggles from '@/components/LineToggles';
import { 
  History, 
  Trash2, 
  Plus, 
  Settings, 
  Tag, 
  TrendingUp,
  X,
  Edit2,
  Check
} from 'lucide-react';

// Dynamically import GoldChart to disable SSR since lightweight-charts relies on window APIs
const GoldChart = dynamic(() => import('@/components/GoldChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] flex items-center justify-center bg-[#161b22] border border-card-border rounded-2xl text-gray-400">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
        <span>Đang tải biểu đồ TradingView...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Core Dynamic States
  const [assetName, setAssetName] = useState<string>('Vàng 9999');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [data, setData] = useState<GoldRecord[]>([]);
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
  const [timeRange, setTimeRange] = useState<'1D' | '1M' | '1Y' | 'ALL'>('ALL');

  // Input states
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [isEditingAsset, setIsEditingAsset] = useState<boolean>(false);
  const [tempAssetName, setTempAssetName] = useState<string>('');

  // Initial load from LocalStorage
  useEffect(() => {
    setMounted(true);
    
    const storedAssetName = localStorage.getItem('gold_asset_name');
    if (storedAssetName) setAssetName(storedAssetName);

    const storedChannels = localStorage.getItem('gold_channels');
    if (storedChannels) {
      try {
        setChannels(JSON.parse(storedChannels));
      } catch (e) {
        console.error('Failed to parse gold channels', e);
      }
    }

    const storedData = localStorage.getItem('gold_records_data');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (Array.isArray(parsed)) {
          setData(parsed.sort((a: GoldRecord, b: GoldRecord) => a.timestamp - b.timestamp));
        }
      } catch (e) {
        console.error('Failed to parse gold records', e);
      }
    }

    const storedVisible = localStorage.getItem('gold_visible_series');
    if (storedVisible) {
      try {
        setVisibleSeries(JSON.parse(storedVisible));
      } catch (e) {
        console.error('Failed to parse visible series mapping', e);
      }
    }
  }, []);

  // Save changes to LocalStorage helpers
  const saveChannels = (updatedChannels: Channel[]) => {
    setChannels(updatedChannels);
    localStorage.setItem('gold_channels', JSON.stringify(updatedChannels));
  };

  const saveRecords = (updatedRecords: GoldRecord[]) => {
    const sorted = [...updatedRecords].sort((a, b) => a.timestamp - b.timestamp);
    setData(sorted);
    localStorage.setItem('gold_records_data', JSON.stringify(sorted));
  };

  const saveVisible = (updatedVisible: Record<string, boolean>) => {
    setVisibleSeries(updatedVisible);
    localStorage.setItem('gold_visible_series', JSON.stringify(updatedVisible));
  };

  // Asset Name Handlers
  const handleStartEditAsset = () => {
    setTempAssetName(assetName);
    setIsEditingAsset(true);
  };

  const handleSaveAsset = () => {
    const trimmed = tempAssetName.trim();
    if (trimmed) {
      setAssetName(trimmed);
      localStorage.setItem('gold_asset_name', trimmed);
    }
    setIsEditingAsset(false);
  };

  // Channel CRUD Handlers
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newChannelName.trim();
    if (!name) return;

    // Check duplicates
    if (channels.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Tên kênh phân phối này đã tồn tại!');
      return;
    }

    // Generate safe alphanumeric ID
    const id = 'ch_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    
    // Pick color from palette index based on length
    const color = COLOR_PALETTE[channels.length % COLOR_PALETTE.length];

    const newChannel: Channel = { id, name, color };
    const updated = [...channels, newChannel];
    saveChannels(updated);

    // Turn visibility on by default
    const updatedVisible = { ...visibleSeries, [id]: true };
    saveVisible(updatedVisible);

    setNewChannelName('');
  };

  const handleDeleteChannel = (channelId: string, channelName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa kênh phân phối "${channelName}"? Dữ liệu giá của kênh này sẽ tạm ẩn đi.`)) {
      const updated = channels.filter(c => c.id !== channelId);
      saveChannels(updated);

      const updatedVisible = { ...visibleSeries };
      delete updatedVisible[channelId];
      saveVisible(updatedVisible);
    }
  };

  // Price Record Handlers
  const handleAddRecord = (record: { timestamp: number; prices: Record<string, number> }) => {
    const index = data.findIndex(r => r.timestamp === record.timestamp);
    let updated: GoldRecord[];

    if (index >= 0) {
      // Merge prices into the existing timestamp
      updated = [...data];
      updated[index] = {
        timestamp: record.timestamp,
        prices: {
          ...updated[index].prices,
          ...record.prices
        }
      };
    } else {
      // Create new timestamp entry
      updated = [...data, record];
    }

    saveRecords(updated);
  };

  const handleDeleteRecord = (timestamp: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa mốc thời gian này?')) {
      const updated = data.filter(r => r.timestamp !== timestamp);
      saveRecords(updated);
    }
  };

  // Toggle visible series on chart
  const handleToggleSeries = (channelId: string) => {
    const updated = {
      ...visibleSeries,
      [channelId]: !visibleSeries[channelId]
    };
    saveVisible(updated);
  };

  // Reset/Clear All
  const handleClearAll = () => {
    if (confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu giá, các kênh phân phối và đặt lại tên sản phẩm không?')) {
      setData([]);
      setChannels([]);
      setVisibleSeries({});
      setAssetName('Vàng 9999');
      localStorage.removeItem('gold_records_data');
      localStorage.removeItem('gold_channels');
      localStorage.removeItem('gold_visible_series');
      localStorage.removeItem('gold_asset_name');
      setIsEditingAsset(false);
    }
  };

  // Calculate dynamic latest prices
  const latestPrices: Record<string, number | undefined> = {};
  channels.forEach((channel) => {
    const recordsWithPrice = data.filter(r => r.prices[channel.id] !== undefined);
    if (recordsWithPrice.length > 0) {
      latestPrices[channel.id] = recordsWithPrice[recordsWithPrice.length - 1].prices[channel.id];
    } else {
      latestPrices[channel.id] = undefined;
    }
  });

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
          <span>Đang khởi tạo hệ thống...</span>
        </div>
      </div>
    );
  }

  // Logs sorting: newest first
  const historyLogs = [...data].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6 sm:px-6 lg:px-8">
      {/* Header section with inline asset name editor */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-card-border">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500/10 text-accent-gold border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Biểu đồ giá vàng tuỳ biến
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isEditingAsset ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempAssetName}
                  onChange={(e) => setTempAssetName(e.target.value)}
                  className="bg-[#0d1117] border border-accent-gold rounded-xl px-3 py-1.5 text-lg font-black text-gray-100 focus:outline-none focus:ring-1 focus:ring-accent-gold"
                  placeholder="Tên loại vàng (Ví dụ: Vàng SJC)"
                  maxLength={30}
                  autoFocus
                />
                <button
                  onClick={handleSaveAsset}
                  className="p-2 bg-accent-gold text-black rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
                  title="Lưu"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setIsEditingAsset(false)}
                  className="p-2 bg-[#161b22] text-gray-400 border border-card-border rounded-xl hover:text-white transition-colors cursor-pointer"
                  title="Huỷ"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-gold via-yellow-400 to-amber-300 tracking-tight">
                  {assetName.toUpperCase()}
                </h1>
                <button
                  onClick={handleStartEditAsset}
                  className="p-1.5 text-gray-500 hover:text-accent-gold hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                  title="Đổi tên loại vàng"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Ứng dụng tạo biểu đồ tự chọn. Người dùng tự định nghĩa loại vàng, tự tạo kênh và nhập dữ liệu linh hoạt.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            title="Xóa toàn bộ dữ liệu"
          >
            <Trash2 size={14} />
            Xóa Toàn Bộ Hệ Thống
          </button>
        </div>
      </header>

      {/* Dynamic Channels Toggles & Prices */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Theo dõi các kênh phân phối
        </h3>
        <LineToggles 
          channels={channels}
          visibleSeries={visibleSeries} 
          onToggle={handleToggleSeries} 
          latestPrices={latestPrices} 
        />
      </section>

      {/* Interactive Chart */}
      <section className="w-full">
        <div className="glass-panel overflow-hidden shadow-2xl">
          <GoldChart
            data={data}
            channels={channels}
            visibleSeries={visibleSeries}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            assetName={assetName}
          />
        </div>
      </section>

      {/* Actions and Settings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left: Input Form */}
        <section className="lg:col-span-4 flex">
          <PriceInputForm channels={channels} onAddRecord={handleAddRecord} />
        </section>

        {/* Middle: Channel Settings */}
        <section className="lg:col-span-4 flex">
          <div className="glass-panel p-6 w-full flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Settings className="text-accent-rose" size={20} />
                <h2 className="text-lg font-bold text-gray-100">
                  Cài Đặt Kênh Phân Phối
                </h2>
              </div>

              {/* Add Channel Form */}
              <form onSubmit={handleAddChannel} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Tên kênh mới (ví dụ: Doji, SJC)..."
                    className="flex-1 bg-[#0d1117] border border-card-border rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent-rose transition-colors"
                    maxLength={20}
                    required
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#161b22] hover:bg-[#21262d] border border-card-border hover:border-accent-rose rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title="Thêm kênh"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </form>

              {/* Channel list */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Kênh đã cấu hình ({channels.length})
                </span>
                
                {channels.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-4">Chưa có kênh phân phối nào. Hãy thêm ở trên.</p>
                ) : (
                  channels.map((channel) => (
                    <div 
                      key={channel.id} 
                      className="flex items-center justify-between p-2.5 bg-[#0d1117]/60 border border-card-border/50 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: channel.color }}
                        ></span>
                        <span className="text-xs font-bold text-gray-300 truncate">{channel.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteChannel(channel.id, channel.name)}
                        className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                        title="Xóa kênh"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-card-border/30 flex items-start gap-2 text-[10px] text-gray-500 leading-relaxed">
              <Tag size={12} className="shrink-0 text-accent-rose mt-0.5" />
              <span>
                Hệ thống hỗ trợ cấu hình số lượng kênh không giới hạn. Mỗi kênh mới sẽ tự chọn màu ngẫu nhiên trong bảng màu chuẩn.
              </span>
            </div>
          </div>
        </section>

        {/* Right: History Logs */}
        <section className="lg:col-span-4 flex">
          <div className="glass-panel p-6 w-full flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <History className="text-accent-teal" size={18} />
                  <h2 className="text-lg font-bold text-gray-100">Bảng Dữ Liệu</h2>
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                  {data.length} mốc
                </span>
              </div>

              <div className="overflow-x-auto overflow-y-auto max-h-[300px] pr-1">
                {data.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 italic text-xs">
                    Chưa có điểm dữ liệu nào được ghi nhận.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="text-[10px] text-gray-400 uppercase bg-[#0d1117] border-b border-card-border sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2">Thời Gian</th>
                        {channels.map(c => (
                          <th key={c.id} className="px-3 py-2 text-right truncate max-w-[80px]" title={c.name}>
                            {c.name}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/20">
                      {historyLogs.map((log) => (
                        <tr key={log.timestamp} className="hover:bg-white/2 transition-colors">
                          <td className="px-3 py-2 font-medium text-gray-400 whitespace-nowrap">
                            {formatDateTime(log.timestamp)}
                          </td>
                          {channels.map(c => {
                            const val = log.prices[c.id];
                            return (
                              <td 
                                key={c.id} 
                                className="px-3 py-2 text-right font-semibold"
                                style={{ color: val !== undefined ? c.color : '#8b949e' }}
                              >
                                {val !== undefined ? val.toFixed(2) : '-'}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleDeleteRecord(log.timestamp)}
                              className="p-1 text-gray-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                              title="Xóa dòng"
                            >
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-card-border/30 text-center text-[10px] text-gray-500">
              * Rê chuột lên dòng dữ liệu để xóa mốc thời gian. Đơn vị: triệu đồng/lượng.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
