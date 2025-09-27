/**
 * Branded types for improved type safety
 */

// Unique symbols for branding
declare const MemoryIdBrand: unique symbol;
declare const SanitizedContentBrand: unique symbol;
declare const ValidatedMetadataBrand: unique symbol;
declare const SafeRegexBrand: unique symbol;

/**
 * Branded type for Memory IDs
 * Ensures only valid UUIDs are used as memory IDs
 */
export type MemoryId = string & { readonly [MemoryIdBrand]: true };

/**
 * Branded type for sanitized content
 * Ensures content has been sanitized before storage
 */
export type SanitizedContent = string & { readonly [SanitizedContentBrand]: true };

/**
 * Branded type for validated metadata
 * Ensures metadata has been validated for size and content
 */
export type ValidatedMetadata = Record<string, any> & { readonly [ValidatedMetadataBrand]: true };

/**
 * Branded type for safe regex patterns
 * Ensures regex patterns have been validated against ReDoS
 */
export type SafeRegex = RegExp & { readonly [SafeRegexBrand]: true };

/**
 * Result type for better error handling
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = Error> =
  | { ok: true; value: T; error?: never }
  | { ok: false; value?: never; error: E };

/**
 * Helper functions for Result type
 */
export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },

  err<E extends Error>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok === true;
  },

  isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return result.ok === false;
  },

  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.ok) {
      return Result.ok(fn(result.value));
    }
    return result as Result<never, E>;
  },

  mapErr<T, E, F extends Error>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.ok) {
      return Result.err(fn(result.error));
    }
    return result as Result<T, never>;
  },

  unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) {
      return result.value;
    }
    throw result.error;
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.ok) {
      return result.value;
    }
    return defaultValue;
  },

  async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      return Result.err(error as Error);
    }
  },
};

/**
 * Type guards and validators for branded types
 */

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMemoryId(value: string): value is MemoryId {
  return UUID_REGEX.test(value);
}

export function toMemoryId(value: string): Result<MemoryId, Error> {
  if (!isMemoryId(value)) {
    return Result.err(new Error(`Invalid memory ID format: ${value}`));
  }
  return Result.ok(value as MemoryId);
}

export function createMemoryId(): MemoryId {
  // Generate a UUID v4
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return uuid as MemoryId;
}

export function toSanitizedContent(value: string): SanitizedContent {
  // This assumes the content has already been sanitized
  // In practice, this would be called after sanitization
  return value as SanitizedContent;
}

export function toValidatedMetadata(value: Record<string, any>): ValidatedMetadata {
  // This assumes the metadata has already been validated
  // In practice, this would be called after validation
  return value as ValidatedMetadata;
}

export function toSafeRegex(value: RegExp): SafeRegex {
  // This assumes the regex has already been validated
  // In practice, this would be called after validation
  return value as SafeRegex;
}

/**
 * Option type for nullable values
 */
export type Option<T> = T | null | undefined;

export const Option = {
  some<T>(value: T): T {
    return value;
  },

  none(): null {
    return null;
  },

  isSome<T>(value: Option<T>): value is T {
    return value !== null && value !== undefined;
  },

  isNone(value: Option<unknown>): value is null | undefined {
    return value === null || value === undefined;
  },

  unwrapOr<T>(value: Option<T>, defaultValue: T): T {
    return Option.isSome(value) ? value : defaultValue;
  },

  map<T, U>(value: Option<T>, fn: (value: T) => U): Option<U> {
    return Option.isSome(value) ? fn(value) : null;
  },
};

/**
 * NonEmptyArray type for arrays that must have at least one element
 */
export type NonEmptyArray<T> = [T, ...T[]];

export function isNonEmptyArray<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}

/**
 * Percentage type constrained to 0-1 range
 */
export type Percentage = number & { readonly __percentage: true };

export function toPercentage(value: number): Result<Percentage, Error> {
  if (value < 0 || value > 1) {
    return Result.err(new Error(`Value must be between 0 and 1, got: ${value}`));
  }
  return Result.ok(value as Percentage);
}

/**
 * PositiveInteger type
 */
export type PositiveInteger = number & { readonly __positiveInteger: true };

export function toPositiveInteger(value: number): Result<PositiveInteger, Error> {
  if (!Number.isInteger(value) || value <= 0) {
    return Result.err(new Error(`Value must be a positive integer, got: ${value}`));
  }
  return Result.ok(value as PositiveInteger);
}
