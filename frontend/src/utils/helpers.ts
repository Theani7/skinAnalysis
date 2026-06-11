import { clsx, type ClassValue } from 'clsx';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    clear: 'text-status-success',
    mild: 'text-status-success',
    moderate: 'text-status-warning',
    severe: 'text-status-error',
  };
  return colors[severity] || 'text-ink-tertiary';
}

export function getSeverityBg(severity: string): string {
  const colors: Record<string, string> = {
    clear: 'bg-status-success-light',
    mild: 'bg-status-success-light',
    moderate: 'bg-status-warning-light',
    severe: 'bg-status-error-light',
  };
  return colors[severity] || 'bg-surface-2';
}

export function getRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    low: '#16a34a',
    medium: '#d97706',
    high: '#dc2626',
  };
  return colors[risk] || '#94a3b8';
}
