export interface Channel {
  id: string;   // Unique ID (e.g. generated or slugified name)
  name: string; // Display name (e.g., Doji, SJC, Hà Đông)
  color: string; // Line color (e.g. #f59e0b)
}

export interface GoldRecord {
  timestamp: number; // UNIX timestamp in seconds
  prices: Record<string, number>; // Maps channel ID -> price value (Million VND / Tael)
}

// Preset color palette for dynamic channels
export const COLOR_PALETTE = [
  '#f59e0b', // Gold / Amber
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f97316', // Orange
  '#ec4899', // Pink
  '#0ea5e9', // Sky
  '#10b981'  // Emerald
];

export function formatCurrency(value: number): string {
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " tr/lượng";
}

export function formatDateTime(secs: number): string {
  const d = new Date(secs * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
