import { z } from 'zod';
import { MemoryItemSchema, MemoryQuerySchema, KuzuConfigSchema } from '../types';

export function validateMemoryItem(item: unknown): boolean {
  try {
    MemoryItemSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

export function validateMemoryQuery(query: unknown): boolean {
  try {
    MemoryQuerySchema.parse(query);
    return true;
  } catch {
    return false;
  }
}

export function validateConfig(config: unknown): boolean {
  try {
    KuzuConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeMemoryContent(content: string): string {
  // Remove potentially harmful content
  // This is a basic implementation - enhance based on security requirements
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}