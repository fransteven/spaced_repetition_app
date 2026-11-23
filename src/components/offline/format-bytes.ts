const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Human-readable size in binary units: 0 B, 512 B, 1.5 KB, 12 MB, 4.2 GB. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  const rounded = exponent === 0 || value >= 10 ? Math.round(value).toString() : value.toFixed(1);
  return `${rounded} ${UNITS[exponent]}`;
}
