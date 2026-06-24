'use client';

import React from 'react';
import { Eye, EyeOff, Tag } from 'lucide-react';
import { Channel } from '@/utils/goldData';

interface LineTogglesProps {
  channels: Channel[];
  visibleSeries: Record<string, boolean>;
  onToggle: (key: string) => void;
  latestPrices: Record<string, number | undefined>;
}

export default function LineToggles({ 
  channels,
  visibleSeries, 
  onToggle, 
  latestPrices 
}: LineTogglesProps) {

  if (channels.length === 0) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center border-dashed border-card-border/50 text-center w-full bg-white/2">
        <Tag className="text-gray-500 mb-1.5 animate-pulse" size={20} />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Chưa có kênh phân phối nào
        </span>
        <p className="text-[11px] text-gray-500 max-w-xs mt-1">
          Hãy tạo kênh phân phối đầu tiên ở bảng cài đặt góc phải bên dưới.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {channels.map((channel) => {
        const isVisible = !!visibleSeries[channel.id];
        const price = latestPrices[channel.id];
        
        // Dynamic styling for active state
        const glowStyle = isVisible 
          ? { 
              borderColor: `${channel.color}50`, 
              backgroundColor: `${channel.color}0A`,
              transform: 'translateY(-2px)'
            } 
          : {};

        return (
          <div
            key={channel.id}
            onClick={() => onToggle(channel.id)}
            style={glowStyle}
            className={`glass-panel p-4 flex items-center justify-between cursor-pointer select-none transition-all ${
              isVisible 
                ? 'box-shadow-[0_4px_20px_rgba(0,0,0,0.15)]' 
                : 'border-card-border opacity-40 hover:opacity-75'
            }`}
          >
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                {channel.name}
              </span>
              <span 
                className="text-lg font-black tracking-tight"
                style={{ color: isVisible ? channel.color : '#8b949e' }}
              >
                {price !== undefined 
                  ? `${price.toFixed(2)} tr` 
                  : 'N/A'}
              </span>
            </div>

            <div className="flex items-center shrink-0 ml-2">
              {isVisible ? (
                <div 
                  className="p-1.5 rounded-full bg-white/5 border border-white/10"
                  style={{ color: channel.color }}
                >
                  <Eye size={16} />
                </div>
              ) : (
                <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-500">
                  <EyeOff size={16} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
