'use client';

import React, { useEffect, useRef } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  LineData,
  ColorType,
  Time,
  LineSeries
} from 'lightweight-charts';
import { GoldRecord, Channel } from '@/utils/goldData';
import { ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';

interface GoldChartProps {
  data: GoldRecord[];
  channels: Channel[];
  visibleSeries: Record<string, boolean>;
  timeRange: '1D' | '1M' | '1Y' | 'ALL';
  setTimeRange: (range: '1D' | '1M' | '1Y' | 'ALL') => void;
  assetName: string;
}

export default function GoldChart({ 
  data, 
  channels,
  visibleSeries, 
  timeRange,
  setTimeRange,
  assetName
}: GoldChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  // Map of active series in the chart: key is channel ID
  const seriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  // Use refs to solve stale closure issues in the crosshair callback
  const channelsRef = useRef(channels);
  const visibleSeriesRef = useRef(visibleSeries);

  useEffect(() => {
    channelsRef.current = channels;
    visibleSeriesRef.current = visibleSeries;
  }, [channels, visibleSeries]);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: '#161b22' },
        textColor: '#c9d1d9',
        fontSize: 12,
        fontFamily: 'var(--font-sans), sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(48, 54, 61, 0.3)' },
        horzLines: { color: 'rgba(48, 54, 61, 0.3)' },
      },
      rightPriceScale: {
        borderColor: '#30363d',
        visible: true,
        autoScale: true,
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: '#8b949e',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#30363d',
        },
        horzLine: {
          color: '#8b949e',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#30363d',
        },
      },
    });

    chartRef.current = chart;

    // Set up Tooltip element
    const container = chartContainerRef.current;
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip hidden';
    container.appendChild(tooltip);

    // Track crosshair movements to show tooltip
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        tooltip.classList.add('hidden');
        return;
      }

      const timeSecs = param.time as number;
      const date = new Date(timeSecs * 1000);
      const formattedDate = date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      let html = `<div class="font-semibold text-gray-400 mb-1.5">${formattedDate}</div>`;
      let hasData = false;

      // Loop over dynamic active channels
      channelsRef.current.forEach((channel) => {
        const isVisible = visibleSeriesRef.current[channel.id];
        if (!isVisible) return;

        const series = seriesMapRef.current.get(channel.id);
        if (!series) return;

        const val = param.seriesData.get(series) as LineData | undefined;
        if (val && val.value !== undefined) {
          hasData = true;
          html += `<div class="flex items-center gap-2 mb-1">
            <span class="inline-block w-2.5 h-2.5 rounded-full" style="background-color: ${channel.color}"></span>
            <span>${channel.name}: <strong>${val.value.toFixed(2)}</strong> tr</span>
          </div>`;
        }
      });

      if (!hasData) {
        tooltip.classList.add('hidden');
        return;
      }

      tooltip.classList.remove('hidden');
      tooltip.innerHTML = html;

      // Position tooltip near the crosshair point but offset to not overlap cursor
      const tooltipWidth = 180;
      const tooltipHeight = 120;
      let left = param.point.x + 15;
      let top = param.point.y + 15;

      // Keep inside chart container boundaries
      if (left > container.clientWidth - tooltipWidth) {
        left = param.point.x - tooltipWidth - 15;
      }
      if (top > container.clientHeight - tooltipHeight) {
        top = param.point.y - tooltipHeight - 15;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    // Resize Handler
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.resize(
          chartContainerRef.current.clientWidth,
          480
        );
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
      if (tooltip && container.contains(tooltip)) {
        container.removeChild(tooltip);
      }
    };
  }, []);

  // Update Series configuration dynamically (add, remove, update data)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 1. Remove series that are no longer present or are disabled
    seriesMapRef.current.forEach((series, channelId) => {
      const channelExists = channels.some(c => c.id === channelId);
      const isVisible = visibleSeries[channelId];
      if (!channelExists || !isVisible) {
        chart.removeSeries(series);
        seriesMapRef.current.delete(channelId);
      }
    });

    // 2. Add or update series that are present and enabled
    channels.forEach((channel) => {
      const isVisible = visibleSeries[channel.id];
      if (!isVisible) return;

      let series = seriesMapRef.current.get(channel.id);
      
      // Create if it doesn't exist yet
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: channel.color,
          lineWidth: 2,
          title: channel.name,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        });
        seriesMapRef.current.set(channel.id, series);
      }

      // Filter and map historical points for this channel
      const seriesData: LineData[] = data
        .filter((rec) => rec.prices[channel.id] !== undefined)
        .map((rec) => ({
          time: rec.timestamp as Time,
          value: rec.prices[channel.id],
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      series.setData(seriesData);
    });
  }, [data, channels, visibleSeries]);

  // Apply Time Range Preset programmatically
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || data.length === 0) return;

    const timeScale = chart.timeScale();
    const lastPoint = data[data.length - 1].timestamp;

    let fromTime = data[0].timestamp;

    if (timeRange === '1D') {
      fromTime = lastPoint - 24 * 3600;
    } else if (timeRange === '1M') {
      fromTime = lastPoint - 30 * 24 * 3600;
    } else if (timeRange === '1Y') {
      fromTime = lastPoint - 365 * 24 * 3600;
    } else if (timeRange === 'ALL') {
      timeScale.fitContent();
      return;
    }

    timeScale.setVisibleRange({
      from: fromTime as Time,
      to: (lastPoint + 2 * 3600) as Time,
    });
  }, [timeRange, data]);

  // Zoom In Handler
  const handleZoomIn = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const timeScale = chart.timeScale();
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (logicalRange) {
      const barsCount = logicalRange.to - logicalRange.from;
      const center = (logicalRange.from + logicalRange.to) / 2;
      const newBarsCount = barsCount * 0.7;
      const from = center - newBarsCount / 2;
      const to = center + newBarsCount / 2;
      timeScale.setVisibleLogicalRange({ from, to });
    }
  };

  // Zoom Out Handler
  const handleZoomOut = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const timeScale = chart.timeScale();
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (logicalRange) {
      const barsCount = logicalRange.to - logicalRange.from;
      const center = (logicalRange.from + logicalRange.to) / 2;
      const newBarsCount = barsCount * 1.4;
      const from = center - newBarsCount / 2;
      const to = center + newBarsCount / 2;
      timeScale.setVisibleLogicalRange({ from, to });
    }
  };

  // Reset Zoom
  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setTimeRange('ALL');
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-card-border bg-[#161b22]/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-gold opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-gold"></span>
          </span>
          <span className="text-sm font-semibold tracking-wider text-gray-300 uppercase">
            Biểu đồ tương tác {assetName}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#0d1117] rounded-lg border border-card-border p-0.5">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition-colors border-l border-card-border/50 cursor-pointer"
              title="Xem toàn bộ"
            >
              <Maximize2 size={15} />
            </button>
          </div>

          {/* Time range presets */}
          <div className="flex items-center bg-[#0d1117] rounded-lg border border-card-border p-0.5">
            {(['1D', '1M', '1Y', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-accent-gold text-black shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
                }`}
              >
                {r === '1D' ? '1 Ngày' : r === '1M' ? '1 Tháng' : r === '1Y' ? '1 Năm' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div 
        ref={chartContainerRef} 
        className="w-full relative bg-[#161b22] rounded-b-2xl overflow-hidden border-t-0 border border-card-border"
        style={{ height: '480px' }}
      >
        {/* Empty State Overlay */}
        {data.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#161b22]/95 z-10 p-6 text-center">
            <Maximize2 className="text-gray-500 mb-3 animate-pulse" size={32} />
            <h3 className="text-sm font-bold text-gray-300">Biểu đồ chưa có dữ liệu</h3>
            <p className="text-xs text-gray-500 max-w-xs mt-1">
              Bạn cần cấu hình kênh phân phối (trong phần cài đặt) và thêm mốc giá đầu tiên ở form bên dưới.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
