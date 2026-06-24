'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Calendar, AlertCircle, Info } from 'lucide-react';
import { Channel } from '@/utils/goldData';

interface PriceInputFormProps {
  channels: Channel[];
  onAddRecord: (record: {
    timestamp: number;
    prices: Record<string, number>;
  }) => void;
}

export default function PriceInputForm({ channels, onAddRecord }: PriceInputFormProps) {
  const getLocalDateTimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - offset * 60 * 1000);
    return localNow.toISOString().slice(0, 16);
  };

  const [dateTime, setDateTime] = useState<string>(getLocalDateTimeString());
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');

  // Reset prices form fields when channels list changes
  useEffect(() => {
    const initialPrices: Record<string, string> = {};
    channels.forEach(c => {
      initialPrices[c.id] = '';
    });
    setPrices(initialPrices);
  }, [channels]);

  const handlePriceChange = (channelId: string, val: string) => {
    setPrices(prev => ({
      ...prev,
      [channelId]: val
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dateTime) {
      setError('Vui lòng chọn ngày và giờ.');
      return;
    }

    // Filter out empty strings and build numeric record
    const submittedPrices: Record<string, number> = {};
    let hasValue = false;

    channels.forEach(channel => {
      const stringVal = prices[channel.id];
      if (stringVal !== undefined && stringVal.trim() !== '') {
        const numVal = parseFloat(stringVal);
        if (isNaN(numVal) || numVal <= 0) {
          setError(`Giá cho ${channel.name} phải là số dương hợp lệ.`);
          return;
        }
        submittedPrices[channel.id] = numVal;
        hasValue = true;
      }
    });

    if (error) return; // Exit if validation error occurred inside loop

    if (!hasValue) {
      setError('Vui lòng nhập giá cho ít nhất một kênh phân phối.');
      return;
    }

    // Convert local datetime to Unix timestamp (seconds)
    const timestamp = Math.floor(new Date(dateTime).getTime() / 1000);

    onAddRecord({
      timestamp,
      prices: submittedPrices,
    });

    // Reset inputs
    const resetPrices: Record<string, string> = {};
    channels.forEach(c => {
      resetPrices[c.id] = '';
    });
    setPrices(resetPrices);
    setDateTime(getLocalDateTimeString());
  };

  return (
    <div className="glass-panel p-6 w-full flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <PlusCircle className="text-accent-gold" size={20} />
          <h2 className="text-lg font-bold text-gray-100">
            Nhập Giá Vàng Mới (Mốc Thời Gian Linh Hoạt)
          </h2>
        </div>

        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-card-border rounded-xl bg-white/2">
            <Info className="text-gray-500 mb-2" size={24} />
            <p className="text-sm text-gray-400">Chưa có kênh phân phối nào được cấu hình.</p>
            <p className="text-xs text-gray-500 mt-1">
              Hãy thêm kênh phân phối trước (ví dụ: "Doji", "SJC") trong bảng cài đặt.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date Time Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Calendar size={13} />
                Mốc thời gian (Thời điểm cập nhật)
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-[#0d1117] border border-card-border rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-gold transition-colors"
                required
              />
            </div>

            {/* Dynamic Price Inputs */}
            <div className="grid grid-cols-1 gap-4 max-h-[220px] overflow-y-auto pr-1">
              {channels.map((channel) => (
                <div key={channel.id} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                    <span 
                      className="inline-block w-2 h-2 rounded-full" 
                      style={{ backgroundColor: channel.color }}
                    ></span>
                    Giá {channel.name} (triệu VND/lượng)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`Nhập giá cho ${channel.name}...`}
                      value={prices[channel.id] || ''}
                      onChange={(e) => handlePriceChange(channel.id, e.target.value)}
                      className="w-full bg-[#0d1117] border border-card-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none transition-colors"
                      // Custom inline style hook for focus border
                      onFocus={(e) => {
                        e.target.style.borderColor = channel.color;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                      }}
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₫</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-accent-gold to-yellow-600 text-black font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-accent-gold/15 active:scale-[0.99] transition-all cursor-pointer"
            >
              Thêm Mốc Giá Mới
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
