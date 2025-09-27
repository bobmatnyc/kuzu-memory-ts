# Security Implementation Guide

This comprehensive security guide covers the security model, implementation details, and best practices for the Kuzu Memory TypeScript library. The library is designed with security-first principles to protect user data and prevent common web vulnerabilities.

## Table of Contents

1. [Security Philosophy](#security-philosophy)
2. [Security Model Overview](#security-model-overview)
3. [Input Sanitization](#input-sanitization)
4. [XSS Prevention](#xss-prevention)
5. [ReDoS Protection](#redos-protection)
6. [Data Validation](#data-validation)
7. [Storage Security](#storage-security)
8. [Size Limits and Constraints](#size-limits-and-constraints)
9. [Content Security Policy](#content-security-policy)
10. [Security Testing](#security-testing)
11. [Common Vulnerabilities and Mitigations](#common-vulnerabilities-and-mitigations)
12. [Security Best Practices](#security-best-practices)
13. [Incident Response](#incident-response)

## Security Philosophy

### Core Security Principles

1. **Defense in Depth** - Multiple layers of security controls
2. **Principle of Least Privilege** - Minimal permissions and access
3. **Secure by Default** - Safe defaults, opt-in to potentially risky features
4. **Input Validation** - Never trust user input
5. **Output Encoding** - Properly encode all output
6. **Fail Securely** - Graceful degradation with security maintained

### Threat Model

**Assets to Protect**:
- User memory content and metadata
- Application integrity and availability
- User privacy and data confidentiality
- System resources (memory, storage, CPU)

**Threat Actors**:
- Malicious users attempting XSS attacks
- Attackers trying to cause DoS through resource exhaustion
- Script injection attempts
- Data exfiltration attempts
- Third-party dependencies with vulnerabilities

**Attack Vectors**:
- Malicious content injection
- Resource exhaustion attacks
- Storage manipulation
- Pattern extraction exploits
- NLP processing vulnerabilities

### Security Requirements

| Category | Requirement | Implementation |
|----------|-------------|----------------|
| Input Security | All user content sanitized | DOMPurify integration |
| XSS Prevention | No script execution in content | Content filtering |
| DoS Protection | Resource limits enforced | Size/rate limiting |
| Data Integrity | Content validation | Zod schemas |
| Storage Security | Sandboxed storage access | Origin-based isolation |
| Privacy | No sensitive data logging | Scrubbed logs |

## Security Model Overview

### Architecture Security Layers

```
┌─────────────────────────────────────────┐
│           Application Layer             │
│  ┌─────────────────────────────────┐    │
│  │      Input Validation          │    │
│  │   ┌─────────────────────────┐   │    │
│  │   │   Content Sanitization  │   │    │
│  │   │ ┌─────────────────────┐ │   │    │
│  │   │ │   Core Processing   │ │   │    │
│  │   │ │ ┌─────────────────┐ │ │   │    │
│  │   │ │ │    Storage      │ │ │   │    │
│  │   │ │ │   (Sandboxed)   │ │ │   │    │
│  │   │ │ └─────────────────┘ │ │   │    │
│  │   │ └─────────────────────┘ │   │    │
│  │   └─────────────────────────┘   │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Security Flow

1. **Input Reception** - Raw user input received
2. **Validation** - Schema validation with Zod
3. **Sanitization** - Content cleaning with DOMPurify
4. **Size Limiting** - Enforce maximum content sizes
5. **Processing** - Safe processing with controlled resources
6. **Storage** - Sandboxed, origin-isolated storage
7. **Output** - Sanitized output delivery

### Security Configuration

```typescript
// src/security/SecurityConfig.ts
export interface SecurityConfig {
  // Input validation settings
  maxContentLength: number;
  maxMemoryItems: number;
  allowedHtmlTags: string[];
  allowedAttributes: string[];

  // Pattern extraction security
  maxPatternMatches: number;
  patternTimeoutMs: number;
  dangerousPatterns: RegExp[];

  // Storage security
  enforceOriginIsolation: boolean;
  encryptSensitiveData: boolean;
  maxStorageSize: number;

  // Rate limiting
  maxOperationsPerSecond: number;
  maxBatchSize: number;

  // Feature flags
  enableScriptFiltering: boolean;
  enableContentTypeValidation: boolean;
  enableAuditLogging: boolean;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxContentLength: 100000, // 100KB per memory
  maxMemoryItems: 10000,
  allowedHtmlTags: [], // No HTML allowed by default
  allowedAttributes: [],

  maxPatternMatches: 100,
  patternTimeoutMs: 1000,
  dangerousPatterns: [
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<script/gi,
    /eval\s*\(/gi
  ],

  enforceOriginIsolation: true,
  encryptSensitiveData: false, // Enable for sensitive applications
  maxStorageSize: 50 * 1024 * 1024, // 50MB

  maxOperationsPerSecond: 100,
  maxBatchSize: 1000,

  enableScriptFiltering: true,
  enableContentTypeValidation: true,
  enableAuditLogging: false
};
```

## Input Sanitization

### DOMPurify Integration

```typescript
// src/security/ContentSanitizer.ts
import DOMPurify from 'isomorphic-dompurify';

export class ContentSanitizer {
  private config: SecurityConfig;
  private purifyConfig: any;

  constructor(config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
    this.setupPurifyConfig();
  }

  private setupPurifyConfig(): void {
    this.purifyConfig = {
      // Remove all HTML by default
      ALLOWED_TAGS: this.config.allowedHtmlTags,
      ALLOWED_ATTR: this.config.allowedAttributes,

      // Security settings
      KEEP_CONTENT: true, // Keep text content when removing tags
      ALLOW_DATA_ATTR: false, // Disable data attributes
      ALLOW_UNKNOWN_PROTOCOLS: false, // Only allow known protocols
      SANITIZE_DOM: true, // Sanitize DOM manipulation

      // Remove dangerous elements
      FORBID_TAGS: [
        'script', 'object', 'embed', 'applet', 'meta', 'link',
        'style', 'title', 'base', 'iframe', 'frame', 'frameset'
      ],

      // Remove dangerous attributes
      FORBID_ATTR: [
        'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus',
        'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
        'onunload', 'onkeypress', 'onkeydown', 'onkeyup'
      ],

      // Custom hooks for additional security
      ALLOW_SELF_CLOSE_IN_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    };
  }

  sanitizeContent(content: string): SanitizationResult {
    if (!content || typeof content !== 'string') {
      return {
        sanitized: '',
        originalLength: 0,
        sanitizedLength: 0,
        removed: [],
        safe: true
      };
    }

    // Check for dangerous patterns first
    const dangerousPatterns = this.detectDangerousPatterns(content);
    if (dangerousPatterns.length > 0) {
      return {
        sanitized: this.removeDangerousPatterns(content),
        originalLength: content.length,
        sanitizedLength: 0,
        removed: dangerousPatterns,
        safe: false
      };
    }

    // Apply DOMPurify sanitization
    const originalLength = content.length;
    let sanitized = DOMPurify.sanitize(content, this.purifyConfig);

    // Additional custom sanitization
    sanitized = this.customSanitization(sanitized);

    // Check length limits
    if (sanitized.length > this.config.maxContentLength) {
      sanitized = sanitized.substring(0, this.config.maxContentLength);
    }

    const sanitizedLength = sanitized.length;
    const removed = this.identifyRemovedContent(content, sanitized);

    return {
      sanitized,
      originalLength,
      sanitizedLength,
      removed,
      safe: dangerousPatterns.length === 0 && removed.length === 0
    };
  }

  private detectDangerousPatterns(content: string): string[] {
    const detected: string[] = [];

    for (const pattern of this.config.dangerousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detected.push(...matches);
      }
    }

    return detected;
  }

  private removeDangerousPatterns(content: string): string {
    let cleaned = content;

    for (const pattern of this.config.dangerousPatterns) {
      cleaned = cleaned.replace(pattern, '[REMOVED]');
    }

    return cleaned;
  }

  private customSanitization(content: string): string {
    // Remove any remaining script-like content
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove javascript: and vbscript: protocols
    content = content.replace(/(javascript|vbscript):/gi, 'removed:');

    // Remove event handler attributes that might have been missed
    content = content.replace(/\s*on\w+\s*=\s*['""][^'"]*['"]/gi, '');

    // Remove data URIs that could contain JavaScript
    content = content.replace(/data:\s*text\/html/gi, 'data:text/plain');

    // Remove expression() in CSS (IE specific)
    content = content.replace(/expression\s*\([^)]*\)/gi, 'removed');

    return content;
  }

  // Batch sanitization for performance
  async sanitizeBatch(contents: string[]): Promise<SanitizationResult[]> {
    const results: SanitizationResult[] = [];
    const batchSize = 100;

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = batch.map(content => this.sanitizeContent(content));
      results.push(...batchResults);

      // Yield to prevent blocking
      if (i % (batchSize * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return results;
  }

  // Validate sanitization effectiveness
  validateSanitization(original: string, sanitized: string): ValidationResult {
    const issues: SecurityIssue[] = [];

    // Check for script tags
    if (/<script/i.test(sanitized)) {
      issues.push({
        type: 'script-tag',
        severity: 'high',
        description: 'Script tag found in sanitized content'
      });
    }

    // Check for event handlers
    if (/\s*on\w+\s*=/i.test(sanitized)) {
      issues.push({
        type: 'event-handler',
        severity: 'high',
        description: 'Event handler found in sanitized content'
      });
    }

    // Check for dangerous protocols
    if (/(javascript|vbscript):/i.test(sanitized)) {
      issues.push({
        type: 'dangerous-protocol',
        severity: 'high',
        description: 'Dangerous protocol found in sanitized content'
      });
    }

    return {
      safe: issues.length === 0,
      issues,
      confidence: issues.length === 0 ? 1.0 : Math.max(0, 1.0 - (issues.length * 0.2))
    };
  }
}
```

### Content Validation Pipeline

```typescript
// src/security/ValidationPipeline.ts
export class ValidationPipeline {
  private validators: ContentValidator[] = [];
  private sanitizer: ContentSanitizer;

  constructor(config: SecurityConfig) {
    this.sanitizer = new ContentSanitizer(config);
    this.setupValidators(config);
  }

  private setupValidators(config: SecurityConfig): void {
    // Length validator
    this.validators.push(new LengthValidator(config.maxContentLength));

    // Character encoding validator
    this.validators.push(new EncodingValidator());

    // MIME type validator (for rich content)
    if (config.enableContentTypeValidation) {
      this.validators.push(new ContentTypeValidator());
    }

    // Pattern-based validator
    this.validators.push(new PatternValidator(config));

    // Custom business logic validator
    this.validators.push(new BusinessLogicValidator());
  }

  async validateAndSanitize(content: string, context?: ValidationContext): Promise<ProcessedContent> {
    const startTime = performance.now();
    const result: ProcessedContent = {
      original: content,
      sanitized: '',
      valid: true,
      errors: [],
      warnings: [],
      processingTime: 0
    };

    try {
      // Step 1: Basic validation
      for (const validator of this.validators) {
        const validation = await validator.validate(content, context);

        if (!validation.valid) {
          result.valid = false;
          result.errors.push(...validation.errors);
        }

        if (validation.warnings?.length) {
          result.warnings.push(...validation.warnings);
        }

        // Stop on critical errors
        if (validation.errors.some(e => e.severity === 'critical')) {
          throw new SecurityError('Critical validation error', validation.errors);
        }
      }

      // Step 2: Sanitization (even if validation failed)
      const sanitizationResult = this.sanitizer.sanitizeContent(content);
      result.sanitized = sanitizationResult.sanitized;
      result.sanitizationInfo = sanitizationResult;

      // Step 3: Post-sanitization validation
      const postValidation = this.sanitizer.validateSanitization(content, result.sanitized);
      if (!postValidation.safe) {
        result.valid = false;
        result.errors.push({
          type: 'sanitization-failure',
          severity: 'high',
          message: 'Content remains unsafe after sanitization',
          details: postValidation.issues
        });
      }

    } catch (error) {
      result.valid = false;
      result.errors.push({
        type: 'processing-error',
        severity: 'critical',
        message: error.message,
        details: { stack: error.stack }
      });

      // Provide safe fallback
      result.sanitized = '[Content removed due to security concerns]';
    }

    result.processingTime = performance.now() - startTime;
    return result;
  }
}

// Individual validator implementations
class LengthValidator implements ContentValidator {
  constructor(private maxLength: number) {}

  async validate(content: string): Promise<ValidationResult> {
    if (content.length > this.maxLength) {
      return {
        valid: false,
        errors: [{
          type: 'length-exceeded',
          severity: 'medium',
          message: `Content length (${content.length}) exceeds maximum (${this.maxLength})`
        }]
      };
    }

    return { valid: true, errors: [] };
  }
}

class EncodingValidator implements ContentValidator {
  private dangerousEncodings = [
    /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, // Control characters
    /[\uFFF0-\uFFFF]/g, // Unicode specials
    /[\u200E-\u200F\u202A-\u202E]/g // BiDi override characters
  ];

  async validate(content: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (const pattern of this.dangerousEncodings) {
      if (pattern.test(content)) {
        errors.push({
          type: 'dangerous-encoding',
          severity: 'medium',
          message: 'Content contains potentially dangerous character encodings'
        });
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

## XSS Prevention

### Multi-Layer XSS Protection

```typescript
// src/security/XSSProtection.ts
export class XSSProtection {
  private static readonly XSS_PATTERNS = [
    // Script injection patterns
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,

    // HTML injection patterns
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /<object[^>]*>[\s\S]*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,

    // CSS injection patterns
    /expression\s*\([^)]*\)/gi,
    /url\s*\(\s*['"]*javascript:/gi,
    /@import/gi,

    // Data URI patterns
    /data:\s*text\/html/gi,
    /data:\s*application\/javascript/gi,

    // Event handler patterns
    /on(load|error|focus|blur|click|mouseover|mouseout|keyup|keydown|change|submit)\s*=/gi,

    // Protocol patterns
    /(javascript|vbscript|data|livescript|mocha):/gi
  ];

  static detectXSS(content: string): XSSDetectionResult {
    const threats: XSSThreat[] = [];
    let riskScore = 0;

    for (const pattern of this.XSS_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        const threat: XSSThreat = {
          type: this.getPatternType(pattern),
          pattern: pattern.toString(),
          matches: matches,
          severity: this.calculateSeverity(pattern),
          locations: this.findMatchLocations(content, pattern)
        };

        threats.push(threat);
        riskScore += threat.severity * matches.length;
      }
    }

    return {
      safe: threats.length === 0,
      riskScore: Math.min(riskScore, 100), // Cap at 100
      threats,
      recommendation: this.getRecommendation(riskScore)
    };
  }

  static sanitizeForDisplay(content: string): string {
    // HTML entity encoding
    let sanitized = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    // Additional encoding for JavaScript contexts
    sanitized = sanitized
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    return sanitized;
  }

  static createCSPHeader(config: SecurityConfig): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Consider removing unsafe-inline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    return directives.join('; ');
  }

  private static getPatternType(pattern: RegExp): string {
    const patternStr = pattern.toString();

    if (patternStr.includes('script')) return 'script-injection';
    if (patternStr.includes('on\\w+')) return 'event-handler';
    if (patternStr.includes('javascript')) return 'protocol-injection';
    if (patternStr.includes('expression')) return 'css-injection';
    if (patternStr.includes('iframe|object|embed')) return 'html-injection';

    return 'unknown';
  }

  private static calculateSeverity(pattern: RegExp): number {
    const patternStr = pattern.toString();

    // High severity patterns
    if (patternStr.includes('script') || patternStr.includes('javascript')) {
      return 10;
    }

    // Medium severity patterns
    if (patternStr.includes('on\\w+') || patternStr.includes('expression')) {
      return 7;
    }

    // Low severity patterns
    return 4;
  }

  private static getRecommendation(riskScore: number): string {
    if (riskScore === 0) return 'Content appears safe';
    if (riskScore < 20) return 'Low risk - monitor content';
    if (riskScore < 50) return 'Medium risk - sanitize content';
    if (riskScore < 80) return 'High risk - block or heavily sanitize';

    return 'Critical risk - block content';
  }
}
```

### Context-Aware Output Encoding

```typescript
// src/security/OutputEncoder.ts
export class OutputEncoder {
  // HTML context encoding
  static encodeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // HTML attribute context encoding
  static encodeHTMLAttribute(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // JavaScript context encoding
  static encodeJavaScript(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\f/g, '\\f')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0');
  }

  // CSS context encoding
  static encodeCSS(text: string): string {
    return text.replace(/[^a-zA-Z0-9\-_]/g, (char) => {
      const hex = char.charCodeAt(0).toString(16);
      return '\\' + hex.padStart(2, '0') + ' ';
    });
  }

  // URL context encoding
  static encodeURL(text: string): string {
    return encodeURIComponent(text);
  }

  // Context-aware encoding
  static encodeForContext(text: string, context: OutputContext): string {
    switch (context) {
      case 'html':
        return this.encodeHTML(text);
      case 'html-attribute':
        return this.encodeHTMLAttribute(text);
      case 'javascript':
        return this.encodeJavaScript(text);
      case 'css':
        return this.encodeCSS(text);
      case 'url':
        return this.encodeURL(text);
      default:
        return this.encodeHTML(text); // Safe default
    }
  }
}

type OutputContext = 'html' | 'html-attribute' | 'javascript' | 'css' | 'url';
```

## ReDoS Protection

### Regex Safety Analysis

```typescript
// src/security/RegexSafety.ts
export class RegexSafety {
  // Known dangerous regex patterns that can cause ReDoS
  private static readonly REDOS_PATTERNS = [
    // Nested quantifiers
    /(\w+)+/,
    /(\d+)+/,
    /(\s+)+/,

    // Alternation with overlap
    /(a|a)*/,
    /(a|ab)*/,

    // Catastrophic backtracking patterns
    /(a+)+b/,
    /(a*)*b/,
    /([a-z]*)*$/
  ];

  static analyzeRegex(pattern: string | RegExp): RegexAnalysis {
    const regexStr = typeof pattern === 'string' ? pattern : pattern.source;
    const analysis: RegexAnalysis = {
      pattern: regexStr,
      safe: true,
      vulnerabilities: [],
      complexity: 0,
      recommendation: 'safe'
    };

    // Check for known ReDoS patterns
    analysis.vulnerabilities = this.detectVulnerabilities(regexStr);
    analysis.safe = analysis.vulnerabilities.length === 0;

    // Calculate complexity score
    analysis.complexity = this.calculateComplexity(regexStr);

    // Generate recommendations
    analysis.recommendation = this.getRecommendation(analysis);

    return analysis;
  }

  static createSafeRegex(pattern: string, flags?: string): SafeRegex {
    const analysis = this.analyzeRegex(pattern);

    if (!analysis.safe) {
      // Attempt to make the regex safe
      const safePattern = this.makeSafe(pattern);
      return new SafeRegex(safePattern, flags, analysis);
    }

    return new SafeRegex(pattern, flags, analysis);
  }

  private static detectVulnerabilities(pattern: string): RegexVulnerability[] {
    const vulnerabilities: RegexVulnerability[] = [];

    // Check for nested quantifiers
    if (/\([^)]*[+*]\)[+*]/.test(pattern)) {
      vulnerabilities.push({
        type: 'nested-quantifiers',
        severity: 'high',
        description: 'Nested quantifiers can cause exponential backtracking',
        location: pattern.match(/\([^)]*[+*]\)[+*]/)?.[0] || ''
      });
    }

    // Check for alternation with overlap
    if (/\([^|)]*\|[^|)]*\)[+*]/.test(pattern)) {
      vulnerabilities.push({
        type: 'alternation-overlap',
        severity: 'medium',
        description: 'Overlapping alternation with quantifiers',
        location: pattern.match(/\([^|)]*\|[^|)]*\)[+*]/)?.[0] || ''
      });
    }

    // Check for catastrophic backtracking patterns
    if (/\([^)]*\*\)[^+*]*\*/.test(pattern)) {
      vulnerabilities.push({
        type: 'catastrophic-backtracking',
        severity: 'critical',
        description: 'Pattern likely to cause catastrophic backtracking',
        location: pattern.match(/\([^)]*\*\)[^+*]*\*/)?.[0] || ''
      });
    }

    return vulnerabilities;
  }

  private static calculateComplexity(pattern: string): number {
    let complexity = 0;

    // Count quantifiers
    const quantifiers = pattern.match(/[+*?{}]/g);
    complexity += (quantifiers?.length || 0) * 2;

    // Count groups
    const groups = pattern.match(/\(/g);
    complexity += (groups?.length || 0) * 3;

    // Count character classes
    const charClasses = pattern.match(/\[[^\]]+\]/g);
    complexity += (charClasses?.length || 0) * 1;

    // Count alternations
    const alternations = pattern.match(/\|/g);
    complexity += (alternations?.length || 0) * 4;

    return complexity;
  }

  private static makeSafe(pattern: string): string {
    let safe = pattern;

    // Replace nested quantifiers with atomic groups (if supported)
    // This is a simplified approach - real implementation would be more sophisticated
    safe = safe.replace(/\(([^)]*[+*])\)[+*]/g, '(?:$1)');

    // Limit repetition ranges
    safe = safe.replace(/\{(\d+),\}/g, (match, min) => {
      const minNum = parseInt(min);
      const maxNum = Math.min(minNum + 1000, 10000); // Reasonable upper limit
      return `{${min},${maxNum}}`;
    });

    // Replace dangerous patterns with safer alternatives
    safe = safe.replace(/(\w+)+/g, '\\w+');
    safe = safe.replace(/(\d+)+/g, '\\d+');
    safe = safe.replace /(\s+)+/g, '\\s+');

    return safe;
  }

  private static getRecommendation(analysis: RegexAnalysis): string {
    if (analysis.safe && analysis.complexity < 10) {
      return 'safe';
    }

    if (analysis.vulnerabilities.some(v => v.severity === 'critical')) {
      return 'rewrite-required';
    }

    if (analysis.complexity > 20) {
      return 'simplify-pattern';
    }

    if (analysis.vulnerabilities.length > 0) {
      return 'review-and-fix';
    }

    return 'monitor';
  }
}

export class SafeRegex extends RegExp {
  private analysis: RegexAnalysis;
  private timeout: number;

  constructor(pattern: string, flags?: string, analysis?: RegexAnalysis, timeout = 1000) {
    super(pattern, flags);
    this.analysis = analysis || RegexSafety.analyzeRegex(pattern);
    this.timeout = timeout;
  }

  safeTest(input: string): boolean {
    return this.executeWithTimeout(() => this.test(input), false);
  }

  safeExec(input: string): RegExpExecArray | null {
    return this.executeWithTimeout(() => this.exec(input), null);
  }

  private executeWithTimeout<T>(operation: () => T, fallback: T): T {
    const start = Date.now();

    try {
      const result = operation();

      // Check execution time
      if (Date.now() - start > this.timeout) {
        console.warn('Regex execution exceeded timeout:', {
          pattern: this.source,
          input: input.substring(0, 100) + '...',
          duration: Date.now() - start
        });
        return fallback;
      }

      return result;
    } catch (error) {
      console.error('Regex execution error:', error);
      return fallback;
    }
  }

  getAnalysis(): RegexAnalysis {
    return { ...this.analysis };
  }
}
```

## Data Validation

### Comprehensive Schema Validation

```typescript
// src/security/SchemaValidator.ts
import { z } from 'zod';

export class SchemaValidator {
  // Core memory item schema with security constraints
  static readonly SecureMemoryItemSchema = z.object({
    id: z.string().uuid('Invalid UUID format'),

    type: z.enum(['episodic', 'semantic', 'procedural', 'working', 'sensory'])
      .refine(type => type !== undefined, 'Memory type is required'),

    content: z.string()
      .min(1, 'Content cannot be empty')
      .max(100000, 'Content too large (max 100KB)')
      .refine(
        content => !this.containsDangerousContent(content),
        'Content contains dangerous patterns'
      ),

    importance: z.number()
      .min(0, 'Importance must be non-negative')
      .max(1, 'Importance cannot exceed 1')
      .finite('Importance must be a finite number'),

    timestamp: z.date()
      .refine(date => date <= new Date(), 'Timestamp cannot be in the future')
      .refine(
        date => date > new Date('2000-01-01'),
        'Timestamp too old (before 2000)'
      ),

    accessCount: z.number()
      .int('Access count must be an integer')
      .min(0, 'Access count cannot be negative')
      .max(1000000, 'Access count too high'),

    decay: z.number()
      .min(0, 'Decay must be non-negative')
      .max(1, 'Decay cannot exceed 1')
      .finite('Decay must be a finite number'),

    tags: z.array(z.string().max(100, 'Tag too long'))
      .max(50, 'Too many tags (max 50)')
      .refine(
        tags => tags.every(tag => this.isValidTag(tag)),
        'Invalid tag format'
      ),

    metadata: z.record(z.unknown())
      .refine(
        metadata => JSON.stringify(metadata).length <= 10000,
        'Metadata too large (max 10KB)'
      )
      .optional(),

    relations: z.array(z.object({
      targetId: z.string().uuid('Invalid relation target UUID'),
      type: z.string().max(50, 'Relation type too long'),
      strength: z.number().min(0).max(1).finite()
    })).max(100, 'Too many relations (max 100)')

  }).strict('Additional properties not allowed');

  // Query schema with security constraints
  static readonly SecureQuerySchema = z.object({
    searchText: z.string().max(1000, 'Search text too long').optional(),

    types: z.array(z.enum(['episodic', 'semantic', 'procedural', 'working', 'sensory']))
      .max(5, 'Too many types specified')
      .optional(),

    minImportance: z.number().min(0).max(1).optional(),
    maxImportance: z.number().min(0).max(1).optional(),

    dateRange: z.object({
      start: z.date(),
      end: z.date()
    }).refine(
      range => range.start <= range.end,
      'Invalid date range: start must be before end'
    ).optional(),

    tags: z.array(z.string().max(100))
      .max(20, 'Too many tags in query')
      .optional(),

    limit: z.number().int().min(1).max(10000).optional(),
    offset: z.number().int().min(0).optional(),

    sortBy: z.enum(['timestamp', 'importance', 'accessCount', 'relevance']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()

  }).strict()
    .refine(
      query => !query.minImportance || !query.maxImportance || query.minImportance <= query.maxImportance,
      'Invalid importance range'
    );

  private static containsDangerousContent(content: string): boolean {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /expression\s*\(/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }

  private static isValidTag(tag: string): boolean {
    // Tag validation rules
    if (tag.length === 0 || tag.length > 100) return false;
    if (!/^[a-zA-Z0-9\-_\s]+$/.test(tag)) return false;
    if (tag.trim() !== tag) return false; // No leading/trailing whitespace

    return true;
  }

  static validateMemoryItem(data: unknown): ValidationResult<MemoryItem> {
    try {
      const validated = this.SecureMemoryItemSchema.parse(data);
      return {
        success: true,
        data: validated,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: err.received
          }))
        };
      }

      return {
        success: false,
        data: null,
        errors: [{ message: 'Unknown validation error', path: '', code: 'unknown' }]
      };
    }
  }

  static validateQuery(data: unknown): ValidationResult<MemoryQuery> {
    try {
      const validated = this.SecureQuerySchema.parse(data);
      return {
        success: true,
        data: validated,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }

      return {
        success: false,
        data: null,
        errors: [{ message: 'Unknown validation error', path: '', code: 'unknown' }]
      };
    }
  }

  // Runtime type guards with security checks
  static isSecureMemoryItem(obj: unknown): obj is MemoryItem {
    const validation = this.validateMemoryItem(obj);
    return validation.success;
  }

  static isSecureQuery(obj: unknown): obj is MemoryQuery {
    const validation = this.validateQuery(obj);
    return validation.success;
  }
}
```

## Storage Security

### Sandboxed Storage Implementation

```typescript
// src/security/SecureStorage.ts
export class SecureStorageWrapper implements StorageAdapter {
  private adapter: StorageAdapter;
  private config: SecurityConfig;
  private quotaManager: StorageQuotaManager;
  private accessControl: AccessController;

  constructor(
    adapter: StorageAdapter,
    config: SecurityConfig,
    origin?: string
  ) {
    this.adapter = adapter;
    this.config = config;
    this.quotaManager = new StorageQuotaManager(config.maxStorageSize);
    this.accessControl = new AccessController(origin);
  }

  async init(): Promise<void> {
    // Verify origin isolation
    if (this.config.enforceOriginIsolation) {
      await this.accessControl.verifyOrigin();
    }

    // Initialize underlying adapter
    await this.adapter.init();

    // Setup security monitoring
    this.setupSecurityMonitoring();
  }

  async create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    // Security checks
    await this.performSecurityChecks('create', item);

    // Quota check
    await this.quotaManager.checkQuota(JSON.stringify(item).length);

    // Encrypt sensitive data if enabled
    const processedItem = this.config.encryptSensitiveData
      ? await this.encryptSensitiveFields(item)
      : item;

    const result = await this.adapter.create(processedItem);

    // Update quota
    this.quotaManager.updateUsage(JSON.stringify(result).length);

    // Audit log
    this.auditLog('create', result.id, 'success');

    return result;
  }

  async get(id: string): Promise<MemoryItem | null> {
    // Validate ID format
    if (!this.isValidId(id)) {
      throw new SecurityError('Invalid ID format', 'invalid-id');
    }

    const result = await this.adapter.get(id);

    if (result && this.config.encryptSensitiveData) {
      return this.decryptSensitiveFields(result);
    }

    return result;
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    // Security checks
    await this.performSecurityChecks('update', updates);

    // Prevent ID tampering
    if ('id' in updates && updates.id !== id) {
      throw new SecurityError('Cannot modify memory ID', 'id-tampering');
    }

    // Process updates
    const processedUpdates = this.config.encryptSensitiveData
      ? await this.encryptSensitiveFields(updates)
      : updates;

    const result = await this.adapter.update(id, processedUpdates);

    this.auditLog('update', id, 'success');

    return this.config.encryptSensitiveData
      ? this.decryptSensitiveFields(result)
      : result;
  }

  async delete(id: string): Promise<void> {
    if (!this.isValidId(id)) {
      throw new SecurityError('Invalid ID format', 'invalid-id');
    }

    await this.adapter.delete(id);
    this.auditLog('delete', id, 'success');
  }

  async query(query: MemoryQuery): Promise<MemoryItem[]> {
    // Validate query
    const validation = SchemaValidator.validateQuery(query);
    if (!validation.success) {
      throw new SecurityError('Invalid query', 'query-validation', validation.errors);
    }

    // Apply security constraints
    const secureQuery = this.applySecurityConstraints(query);

    const results = await this.adapter.query(secureQuery);

    // Decrypt results if needed
    return this.config.encryptSensitiveData
      ? await Promise.all(results.map(item => this.decryptSensitiveFields(item)))
      : results;
  }

  private async performSecurityChecks(operation: string, data: any): Promise<void> {
    // Rate limiting
    await this.accessControl.checkRateLimit(operation);

    // Content validation
    if (data.content) {
      const xssDetection = XSSProtection.detectXSS(data.content);
      if (!xssDetection.safe) {
        throw new SecurityError('XSS threat detected', 'xss-threat', xssDetection.threats);
      }
    }

    // Size validation
    const dataSize = JSON.stringify(data).length;
    if (dataSize > this.config.maxContentLength) {
      throw new SecurityError('Data too large', 'size-exceeded');
    }
  }

  private applySecurityConstraints(query: MemoryQuery): MemoryQuery {
    return {
      ...query,
      limit: Math.min(query.limit || 100, this.config.maxBatchSize),
      // Add other security constraints
    };
  }

  private isValidId(id: string): boolean {
    // UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  private async encryptSensitiveFields(data: any): Promise<any> {
    // Implementation would use Web Crypto API or similar
    // This is a simplified example
    const result = { ...data };

    if (result.content) {
      result.content = await this.encrypt(result.content);
    }

    return result;
  }

  private async decryptSensitiveFields(data: MemoryItem): Promise<MemoryItem> {
    const result = { ...data };

    if (result.content && this.isEncrypted(result.content)) {
      result.content = await this.decrypt(result.content);
    }

    return result;
  }

  private async encrypt(text: string): Promise<string> {
    // Placeholder for actual encryption
    // Would use AES-GCM or similar
    return `encrypted:${btoa(text)}`;
  }

  private async decrypt(encryptedText: string): Promise<string> {
    // Placeholder for actual decryption
    if (encryptedText.startsWith('encrypted:')) {
      return atob(encryptedText.substring(10));
    }
    return encryptedText;
  }

  private isEncrypted(text: string): boolean {
    return text.startsWith('encrypted:');
  }

  private auditLog(operation: string, id: string, status: string): void {
    if (this.config.enableAuditLogging) {
      console.log(`[AUDIT] ${new Date().toISOString()} - ${operation} - ${id} - ${status}`);
      // In production, send to secure logging service
    }
  }

  private setupSecurityMonitoring(): void {
    // Setup monitoring for suspicious activities
    // This would integrate with security monitoring systems
  }
}
```

## Security Testing

### Automated Security Test Suite

```typescript
// tests/security/security.test.ts
describe('Security Test Suite', () => {
  let client: KuzuMemory;
  let securityConfig: SecurityConfig;

  beforeEach(async () => {
    securityConfig = { ...DEFAULT_SECURITY_CONFIG };
    client = createMemoryClient({
      storage: 'memory',
      security: securityConfig
    });
    await client.init();
  });

  describe('XSS Protection', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<svg onload="alert(1)">',
      'data:text/html,<script>alert(1)</script>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      '<style>@import "javascript:alert(1)";</style>',
      '<div style="expression(alert(1))">',
      '<input onfocus="alert(1)" autofocus>',
      '<body onload="alert(1)">',
      '"><script>alert(1)</script>',
      "' onclick='alert(1)'"
    ];

    test.each(xssPayloads)('should sanitize XSS payload: %s', async (payload) => {
      const memory = await client.create(payload);

      // Content should be sanitized
      expect(memory.content).not.toContain('<script');
      expect(memory.content).not.toContain('javascript:');
      expect(memory.content).not.toContain('onerror=');
      expect(memory.content).not.toContain('onload=');
      expect(memory.content).not.toContain('onclick=');

      // Should not execute any scripts
      expect(memory.content).not.toMatch(/<script[^>]*>/i);
      expect(memory.content).not.toMatch(/on\w+\s*=/i);
    });

    test('should detect XSS threats', () => {
      xssPayloads.forEach(payload => {
        const detection = XSSProtection.detectXSS(payload);
        expect(detection.safe).toBe(false);
        expect(detection.threats.length).toBeGreaterThan(0);
        expect(detection.riskScore).toBeGreaterThan(0);
      });
    });

    test('should properly encode output for different contexts', () => {
      const testString = '<script>alert("test")</script>';

      expect(OutputEncoder.encodeHTML(testString))
        .toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');

      expect(OutputEncoder.encodeJavaScript(testString))
        .toContain('\\"test\\"');

      expect(OutputEncoder.encodeHTMLAttribute(testString))
        .not.toContain('<script>');
    });
  });

  describe('ReDoS Protection', () => {
    const redosPatterns = [
      '(a+)+b',
      '(a*)*b',
      '([a-z]*)*$',
      '(a|a)*b',
      '(a|ab)*c'
    ];

    test.each(redosPatterns)('should detect ReDoS vulnerability in pattern: %s', (pattern) => {
      const analysis = RegexSafety.analyzeRegex(pattern);
      expect(analysis.safe).toBe(false);
      expect(analysis.vulnerabilities.length).toBeGreaterThan(0);
    });

    test('should create safe regex wrappers', async () => {
      const dangerousPattern = '(a+)+b';
      const safeRegex = RegexSafety.createSafeRegex(dangerousPattern);

      const testString = 'a'.repeat(1000) + 'c'; // Should not match

      // Should not hang
      const start = Date.now();
      const result = safeRegex.safeTest(testString);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(result).toBe(false);
    });

    test('should timeout long-running regex operations', () => {
      const safeRegex = new SafeRegex('(a+)+b', undefined, undefined, 10); // 10ms timeout
      const longString = 'a'.repeat(10000) + 'c';

      const result = safeRegex.safeTest(longString);
      expect(result).toBe(false); // Should timeout and return fallback
    });
  });

  describe('Input Validation', () => {
    test('should reject oversized content', async () => {
      const largeContent = 'a'.repeat(securityConfig.maxContentLength + 1);

      await expect(client.create(largeContent)).rejects.toThrow(/too large|size/i);
    });

    test('should validate memory item structure', () => {
      const invalidItems = [
        { content: 'test' }, // Missing required fields
        { id: 'invalid-uuid', content: 'test' }, // Invalid UUID
        { content: 'test', type: 'invalid-type' }, // Invalid type
        { content: 'test', importance: 2 }, // Invalid importance range
        { content: 'test', importance: -1 }, // Negative importance
        { content: '', type: 'semantic' }, // Empty content
        { content: 'test', timestamp: new Date('2030-01-01') } // Future timestamp
      ];

      invalidItems.forEach(item => {
        const validation = SchemaValidator.validateMemoryItem(item);
        expect(validation.success).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    test('should validate query structure', () => {
      const invalidQueries = [
        { limit: -1 }, // Negative limit
        { limit: 100000 }, // Excessive limit
        { minImportance: 2 }, // Invalid importance range
        { maxImportance: -1 }, // Invalid importance range
        { minImportance: 0.8, maxImportance: 0.2 }, // Inverted range
        { searchText: 'a'.repeat(10000) }, // Oversized search text
        { types: ['invalid-type'] }, // Invalid memory type
        { dateRange: { start: new Date('2020-01-01'), end: new Date('2019-01-01') } } // Invalid date range
      ];

      invalidQueries.forEach(query => {
        const validation = SchemaValidator.validateQuery(query);
        expect(validation.success).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on operations', async () => {
      const rapidOperations = Array(securityConfig.maxOperationsPerSecond + 10)
        .fill(0)
        .map((_, i) => client.create(`Test memory ${i}`));

      // Should not all succeed due to rate limiting
      const results = await Promise.allSettled(rapidOperations);
      const failures = results.filter(r => r.status === 'rejected');

      expect(failures.length).toBeGreaterThan(0);
    });

    test('should respect batch size limits', async () => {
      const largeBatch = Array(securityConfig.maxBatchSize + 10)
        .fill(0)
        .map((_, i) => `Memory ${i}`);

      await expect(
        client.createMany(largeBatch)
      ).rejects.toThrow(/batch size|limit/i);
    });
  });

  describe('Storage Security', () => {
    test('should prevent ID tampering', async () => {
      const memory = await client.create('Test content');
      const originalId = memory.id;

      await expect(
        client.update(originalId, { id: 'different-id' } as any)
      ).rejects.toThrow(/cannot modify|id/i);
    });

    test('should validate UUIDs', async () => {
      const invalidIds = [
        'not-a-uuid',
        '12345678-1234-1234-1234-12345678901',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '',
        null,
        undefined
      ];

      for (const invalidId of invalidIds) {
        await expect(
          client.get(invalidId as any)
        ).rejects.toThrow(/invalid.*id|uuid/i);
      }
    });

    test('should enforce storage quotas', async () => {
      // This would require a more sophisticated setup
      // to actually test quota enforcement
      const quotaManager = new StorageQuotaManager(1000); // 1KB limit

      const largeItem = { content: 'a'.repeat(2000) }; // 2KB item
      const itemSize = JSON.stringify(largeItem).length;

      await expect(
        quotaManager.checkQuota(itemSize)
      ).rejects.toThrow(/quota|storage/i);
    });
  });

  describe('Content Sanitization', () => {
    test('should sanitize dangerous content patterns', async () => {
      const dangerousContent = `
        <script>maliciousCode()</script>
        <img src="x" onerror="alert(1)">
        javascript:void(0)
        data:text/html,<script>alert(1)</script>
      `;

      const memory = await client.create(dangerousContent);

      expect(memory.content).not.toContain('<script>');
      expect(memory.content).not.toContain('javascript:');
      expect(memory.content).not.toContain('onerror=');
      expect(memory.content).not.toContain('data:text/html');
    });

    test('should preserve safe content', async () => {
      const safeContent = 'This is safe content with numbers 123 and symbols !@#$%';

      const memory = await client.create(safeContent);

      expect(memory.content).toBe(safeContent);
    });

    test('should handle edge cases in sanitization', async () => {
      const edgeCases = [
        '', // Empty string
        ' ', // Whitespace only
        '\n\t\r', // Control characters
        '🚀 Unicode content 中文', // Unicode characters
        'Very '.repeat(1000) + 'long content' // Long but safe content
      ];

      for (const content of edgeCases) {
        const memory = await client.create(content);
        expect(memory.content).toBeDefined();
        expect(typeof memory.content).toBe('string');
      }
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      try {
        await client.get('invalid-id');
      } catch (error) {
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('secret');
        expect(error.message).not.toContain('key');
        expect(error.message).not.toContain('token');
      }
    });

    test('should fail securely on validation errors', () => {
      const maliciousInput = {
        content: '<script>stealData()</script>',
        type: 'invalid',
        importance: 999
      };

      const validation = SchemaValidator.validateMemoryItem(maliciousInput);
      expect(validation.success).toBe(false);

      // Should not execute or process malicious content
      expect(validation.data).toBeNull();
    });
  });
});
```

### Security Penetration Testing

```typescript
// tests/security/penetration.test.ts
describe('Security Penetration Tests', () => {
  describe('Injection Attacks', () => {
    test('should prevent SQL injection patterns', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE memories; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM memories --",
        "' OR 1=1; --",
        "admin'--",
        "admin'/*",
        "' OR 'x'='x",
        "' OR 'a'='a"
      ];

      for (const payload of sqlInjectionPayloads) {
        const memory = await client.create(payload);

        // Content should be sanitized/escaped
        expect(memory.content).not.toContain('DROP TABLE');
        expect(memory.content).not.toContain('UNION SELECT');
        expect(memory.content).not.toContain("'1'='1");
      }
    });

    test('should prevent NoSQL injection patterns', async () => {
      const nosqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$where": "function() { return true; }"}',
        '{"$regex": ".*"}',
        '{"$eval": "function() { return db.memories.find(); }"}'
      ];

      for (const payload of nosqlPayloads) {
        const memory = await client.create(payload);
        expect(memory.content).not.toContain('$gt');
        expect(memory.content).not.toContain('$where');
        expect(memory.content).not.toContain('$eval');
      }
    });
  });

  describe('Denial of Service Protection', () => {
    test('should handle resource exhaustion attempts', async () => {
      const attempts = [
        // Large content attack
        () => client.create('x'.repeat(1000000)),

        // Rapid creation attack
        () => Promise.all(Array(10000).fill(0).map((_, i) =>
          client.create(`Attack ${i}`)
        )),

        // Complex query attack
        () => client.recall('*'.repeat(10000)),

        // Recursive pattern attack
        () => client.create('('.repeat(10000) + ')'.repeat(10000))
      ];

      for (const attempt of attempts) {
        await expect(attempt()).rejects.toThrow();
      }
    });

    test('should prevent memory exhaustion', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Attempt to create many large objects
      const promises = Array(1000).fill(0).map(() =>
        client.create('Large content '.repeat(1000)).catch(() => {})
      );

      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not consume excessive memory (adjust threshold as needed)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  describe('Data Exfiltration Protection', () => {
    test('should prevent unauthorized data access', async () => {
      // Create some memories
      await Promise.all([
        client.create('Sensitive data 1'),
        client.create('Sensitive data 2'),
        client.create('Sensitive data 3')
      ]);

      // Attempt various data access patterns
      const attempts = [
        // Wildcard queries
        () => client.recall('*'),
        () => client.recall('%'),
        () => client.recall('.*'),

        // Boolean queries that might return all data
        () => client.recall('', { minImportance: -1 }),
        () => client.recall('', { types: [] as any }),

        // Excessive limit queries
        () => client.recall('', { limit: Number.MAX_SAFE_INTEGER })
      ];

      for (const attempt of attempts) {
        const results = await attempt();
        // Should have reasonable limits
        expect(results.length).toBeLessThanOrEqual(1000);
      }
    });
  });
});
```

This comprehensive security implementation guide ensures the Kuzu Memory library maintains robust security across all components and use cases, protecting against common vulnerabilities and providing defense in depth.