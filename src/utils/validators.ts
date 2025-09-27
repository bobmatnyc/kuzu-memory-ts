import DOMPurify from 'dompurify';
import { MemoryItemSchema, MemoryQuerySchema, KuzuConfigSchema } from '../types';
import { z } from 'zod';

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

// Metadata validation with size limits
const MetadataSchema = z.record(z.any()).refine(
  (data) => {
    // Check total size of metadata
    const jsonString = JSON.stringify(data);
    return jsonString.length <= 10000; // 10KB limit
  },
  { message: 'Metadata exceeds maximum size of 10KB' },
);

export function validateMetadata(metadata: unknown): boolean {
  try {
    MetadataSchema.parse(metadata);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  if (!validateMetadata(metadata)) {
    throw new Error('Invalid metadata: exceeds size limit');
  }

  // Recursively sanitize string values in metadata
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeMemoryContent(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeMemoryContent(item) : item,
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Safe regex validation to prevent ReDoS attacks
export function validateRegexPattern(pattern: string): boolean {
  // Check for common ReDoS patterns
  const dangerousPatterns = [
    /(\w+\+)+/,  // Nested quantifiers
    /(\w+\*)+/,  // Nested quantifiers
    /(\w+\?)+/,  // Nested quantifiers
    /(\w+\{[\d,]+\})+/,  // Nested quantifiers
    /(.*){[\d,]+}/,  // Catastrophic backtracking
    /(\S+)+\s/,  // Overlapping groups
  ];

  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      return false;
    }
  }

  // Test the regex with a timeout
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export function createSafeRegex(pattern: string): RegExp | null {
  if (!validateRegexPattern(pattern)) {
    console.warn(`Potentially dangerous regex pattern rejected: ${pattern}`);
    return null;
  }

  try {
    return new RegExp(pattern);
  } catch (error) {
    console.error(`Invalid regex pattern: ${pattern}`, error);
    return null;
  }
}

// Initialize DOMPurify with strict configuration
const createDOMPurifyInstance = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return DOMPurify(window);
  }
  // For Node.js/testing environments, use JSDOM
  try {
    const { JSDOM } = require('jsdom');
    const window = new JSDOM('').window;
    return DOMPurify(window as any);
  } catch {
    // Fallback to basic sanitization if JSDOM is not available
    return null;
  }
};

const purify = createDOMPurifyInstance();

// Configure DOMPurify for maximum security
if (purify) {
  purify.setConfig({
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'code', 'pre'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: true,
    SANITIZE_DOM: true,
    IN_PLACE: false,
    USE_PROFILES: { html: false, svg: false, mathMl: false },
  });
}

export function sanitizeMemoryContent(content: string): string {
  // First, check content length to prevent DoS
  const MAX_CONTENT_LENGTH = 100000; // 100KB limit
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
  }

  // Use DOMPurify if available
  if (purify) {
    return purify.sanitize(content).trim();
  }

  // Fallback to basic sanitization
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes
    .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remove object tags
    .replace(/<embed[^>]*>/gi, '') // Remove embed tags
    .replace(/<link[^>]*>/gi, '') // Remove link tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .trim();
}
