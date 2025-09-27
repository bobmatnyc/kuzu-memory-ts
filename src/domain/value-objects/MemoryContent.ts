import { Result, SanitizedContent, toSanitizedContent } from '../../types/branded';
import { sanitizeMemoryContent } from '../../utils/validators';

/**
 * Value object representing memory content
 * Ensures content is always sanitized and within size limits
 */
export class MemoryContent {
  private readonly _value: SanitizedContent;

  private constructor(value: SanitizedContent) {
    this._value = value;
  }

  /**
   * Create a new MemoryContent instance
   */
  static create(content: string): Result<MemoryContent, Error> {
    try {
      // Check length before sanitization
      if (content.length === 0) {
        return Result.err(new Error('Memory content cannot be empty'));
      }

      if (content.length > 100000) {
        return Result.err(new Error('Memory content exceeds maximum length of 100,000 characters'));
      }

      // Sanitize the content
      const sanitized = sanitizeMemoryContent(content);

      // Create the value object
      return Result.ok(new MemoryContent(toSanitizedContent(sanitized)));
    } catch (error) {
      return Result.err(error as Error);
    }
  }

  /**
   * Create from already sanitized content (internal use)
   */
  static fromSanitized(content: SanitizedContent): MemoryContent {
    return new MemoryContent(content);
  }

  /**
   * Get the sanitized content value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Get the length of the content
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Check if content contains a substring
   */
  contains(substring: string): boolean {
    return this._value.toLowerCase().includes(substring.toLowerCase());
  }

  /**
   * Get a preview of the content
   */
  preview(maxLength: number = 100): string {
    if (this._value.length <= maxLength) {
      return this._value;
    }
    return this._value.substring(0, maxLength) + '...';
  }

  /**
   * Extract words from content
   */
  words(): string[] {
    return this._value
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());
  }

  /**
   * Count words in content
   */
  wordCount(): number {
    return this.words().length;
  }

  /**
   * Compare with another MemoryContent
   */
  equals(other: MemoryContent): boolean {
    return this._value === other._value;
  }

  /**
   * Convert to plain string
   */
  toString(): string {
    return this._value;
  }

  /**
   * Convert to JSON
   */
  toJSON(): string {
    return this._value;
  }
}
