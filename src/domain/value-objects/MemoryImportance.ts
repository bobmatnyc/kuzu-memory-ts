import { Result, Percentage, toPercentage } from '../../types/branded';

/**
 * Value object representing memory importance
 * Ensures importance is always within valid range (0-1)
 */
export class MemoryImportance {
  private readonly _value: Percentage;

  // Predefined importance levels
  static readonly CRITICAL = new MemoryImportance(1.0 as Percentage);
  static readonly HIGH = new MemoryImportance(0.8 as Percentage);
  static readonly MEDIUM = new MemoryImportance(0.5 as Percentage);
  static readonly LOW = new MemoryImportance(0.3 as Percentage);
  static readonly TRIVIAL = new MemoryImportance(0.1 as Percentage);

  private constructor(value: Percentage) {
    this._value = value;
  }

  /**
   * Create a new MemoryImportance instance
   */
  static create(value: number): Result<MemoryImportance, Error> {
    const percentageResult = toPercentage(value);

    if (!percentageResult.ok) {
      return percentageResult;
    }

    return Result.ok(new MemoryImportance(percentageResult.value));
  }

  /**
   * Create from a percentage (0-100)
   */
  static fromPercentage(percentage: number): Result<MemoryImportance, Error> {
    return MemoryImportance.create(percentage / 100);
  }

  /**
   * Create from predefined level
   */
  static fromLevel(level: 'critical' | 'high' | 'medium' | 'low' | 'trivial'): MemoryImportance {
    switch (level) {
      case 'critical':
        return MemoryImportance.CRITICAL;
      case 'high':
        return MemoryImportance.HIGH;
      case 'medium':
        return MemoryImportance.MEDIUM;
      case 'low':
        return MemoryImportance.LOW;
      case 'trivial':
        return MemoryImportance.TRIVIAL;
    }
  }

  /**
   * Get the importance value (0-1)
   */
  get value(): number {
    return this._value;
  }

  /**
   * Get as percentage (0-100)
   */
  get percentage(): number {
    return this._value * 100;
  }

  /**
   * Get importance level as string
   */
  get level(): string {
    if (this._value >= 0.9) return 'critical';
    if (this._value >= 0.7) return 'high';
    if (this._value >= 0.4) return 'medium';
    if (this._value >= 0.2) return 'low';
    return 'trivial';
  }

  /**
   * Apply decay to importance
   */
  decay(decayFactor: number): Result<MemoryImportance, Error> {
    const decayResult = toPercentage(decayFactor);
    if (!decayResult.ok) {
      return Result.err(new Error('Invalid decay factor'));
    }

    const newValue = this._value * (1 - decayResult.value);
    return MemoryImportance.create(newValue);
  }

  /**
   * Boost importance
   */
  boost(boostFactor: number): Result<MemoryImportance, Error> {
    const boostResult = toPercentage(boostFactor);
    if (!boostResult.ok) {
      return Result.err(new Error('Invalid boost factor'));
    }

    // Calculate new importance with diminishing returns
    const remaining = 1 - this._value;
    const boost = remaining * boostResult.value;
    const newValue = Math.min(1, this._value + boost);

    return MemoryImportance.create(newValue);
  }

  /**
   * Compare with another importance
   */
  isHigherThan(other: MemoryImportance): boolean {
    return this._value > other._value;
  }

  /**
   * Compare with another importance
   */
  isLowerThan(other: MemoryImportance): boolean {
    return this._value < other._value;
  }

  /**
   * Check if importance is above threshold
   */
  isAbove(threshold: number): boolean {
    return this._value > threshold;
  }

  /**
   * Check if importance is below threshold
   */
  isBelow(threshold: number): boolean {
    return this._value < threshold;
  }

  /**
   * Check if should be forgotten (too low importance)
   */
  shouldForget(threshold: number = 0.01): boolean {
    return this._value < threshold;
  }

  /**
   * Combine with another importance (weighted average)
   */
  combine(other: MemoryImportance, otherWeight: number = 0.5): Result<MemoryImportance, Error> {
    const weightResult = toPercentage(otherWeight);
    if (!weightResult.ok) {
      return Result.err(new Error('Invalid weight'));
    }

    const thisWeight = 1 - weightResult.value;
    const combinedValue = (this._value * thisWeight) + (other._value * weightResult.value);

    return MemoryImportance.create(combinedValue);
  }

  /**
   * Compare for equality
   */
  equals(other: MemoryImportance): boolean {
    return Math.abs(this._value - other._value) < 0.0001;
  }

  /**
   * Convert to string
   */
  toString(): string {
    return `${this.percentage.toFixed(1)}% (${this.level})`;
  }

  /**
   * Convert to JSON
   */
  toJSON(): number {
    return this._value;
  }
}
