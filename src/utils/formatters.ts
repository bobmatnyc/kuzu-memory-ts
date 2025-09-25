import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { MemoryItem } from '../types';

export function formatTimestamp(date: Date | string, formatStr: string = 'PPpp'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function formatMemoryForDisplay(memory: MemoryItem): string {
  const lines = [
    `ID: ${memory.id}`,
    `Type: ${memory.type}`,
    `Content: ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`,
    `Created: ${formatRelativeTime(memory.timestamp)}`,
    `Importance: ${(memory.importance || 0).toFixed(2)}`,
    `Access Count: ${memory.accessCount || 0}`,
  ];

  if (memory.tags.length > 0) {
    lines.push(`Tags: ${memory.tags.join(', ')}`);
  }

  if (memory.lastAccessed) {
    lines.push(`Last Accessed: ${formatRelativeTime(memory.lastAccessed)}`);
  }

  return lines.join('\n');
}

export function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;

  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}