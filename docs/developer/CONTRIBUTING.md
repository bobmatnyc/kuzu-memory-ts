# Contributing Guide

Welcome to the Kuzu Memory TypeScript library contribution guide! We appreciate your interest in contributing to this memory management library. This guide provides comprehensive information about how to contribute effectively to the project.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment Setup](#development-environment-setup)
3. [Code Contribution Workflow](#code-contribution-workflow)
4. [Code Style and Standards](#code-style-and-standards)
5. [Git Workflow and Branching](#git-workflow-and-branching)
6. [Pull Request Process](#pull-request-process)
7. [Issue Reporting Guidelines](#issue-reporting-guidelines)
8. [Documentation Requirements](#documentation-requirements)
9. [Testing Requirements](#testing-requirements)
10. [Review Process](#review-process)
11. [Release Process](#release-process)
12. [Community Guidelines](#community-guidelines)

## Getting Started

### Before You Begin

1. **Read the documentation** - Familiarize yourself with:
   - [README.md](/README.md) - Project overview
   - [ARCHITECTURE.md](/docs/ARCHITECTURE.md) - System architecture
   - [API_REFERENCE.md](/docs/developer/API_REFERENCE.md) - API documentation
   - [DEVELOPER.md](/docs/developer/DEVELOPER.md) - Development guide

2. **Understand the project goals**:
   - Production-ready memory management for TypeScript/JavaScript applications
   - Cross-platform portability (especially Python porting)
   - High performance with excellent developer experience
   - Comprehensive NLP integration for automatic memory classification

3. **Check existing work**:
   - Browse [open issues](https://github.com/bobmatnyc/kuzu-memory-ts/issues)
   - Review [pull requests](https://github.com/bobmatnyc/kuzu-memory-ts/pulls)
   - Join [discussions](https://github.com/bobmatnyc/kuzu-memory-ts/discussions)

### Ways to Contribute

- 🐛 **Bug fixes** - Fix reported issues
- ✨ **New features** - Implement requested functionality
- 📚 **Documentation** - Improve or add documentation
- 🔧 **Tooling** - Enhance development tools and processes
- 🧪 **Testing** - Add tests or improve test coverage
- 🎨 **Examples** - Create usage examples and demos
- 🌐 **Localization** - Help with internationalization
- 🔍 **Code review** - Review pull requests from other contributors

## Development Environment Setup

### Prerequisites

- **Node.js** 16+ (recommended: 18+ for best performance)
- **npm** 7+ or **yarn** 1.22+
- **Git** 2.25+
- **TypeScript** 5.0+ knowledge
- **Jest** testing experience (helpful)

### Initial Setup

1. **Fork and clone the repository**:
   ```bash
   # Fork on GitHub first, then:
   git clone https://github.com/YOUR-USERNAME/kuzu-memory-ts.git
   cd kuzu-memory-ts
   ```

2. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/bobmatnyc/kuzu-memory-ts.git
   git fetch upstream
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Verify setup**:
   ```bash
   # Run tests to ensure everything works
   make test

   # Check linting and type checking
   make quality

   # Build the project
   make build
   ```

### IDE Configuration

**Visual Studio Code** (recommended):

1. **Install recommended extensions** (see `.vscode/extensions.json`):
   - ESLint
   - Prettier
   - TypeScript
   - Jest
   - GitLens

2. **Configure settings** (`.vscode/settings.json`):
   ```json
   {
     "typescript.preferences.importModuleSpecifier": "relative",
     "editor.formatOnSave": true,
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "jest.autoRun": "watch",
     "typescript.suggest.includeCompletionsForModuleExports": true
   }
   ```

**WebStorm/IntelliJ**:
- Enable TypeScript service
- Configure ESLint for automatic fixing
- Set up Jest run configurations
- Enable Prettier formatting

## Code Contribution Workflow

### 1. Planning Your Contribution

**For bug fixes**:
- Reproduce the bug locally
- Write a failing test that demonstrates the issue
- Fix the bug while keeping the test passing
- Ensure no regressions in existing functionality

**For new features**:
- Discuss the feature in an issue first
- Review the architecture to understand integration points
- Write tests before implementation (TDD approach)
- Update documentation as you develop

**For refactoring**:
- Ensure you understand the current behavior completely
- Write comprehensive tests for existing behavior
- Refactor while maintaining all existing tests
- Update documentation if interfaces change

### 2. Development Process

```bash
# 1. Start with a clean, updated main branch
git checkout main
git pull upstream main

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes with frequent commits
git add .
git commit -m "feat: implement basic memory creation"

# 4. Keep your branch updated
git fetch upstream
git rebase upstream/main

# 5. Run quality checks frequently
make quality
make test

# 6. Push your branch
git push origin feature/your-feature-name
```

### 3. Testing During Development

```bash
# Keep tests running during development
npm run test:watch

# Run specific test suites
make test:unit          # Unit tests
make test:uat           # User acceptance tests
make test:nlp           # NLP-specific tests

# Check coverage
npm run test:coverage

# Performance testing
make test:uat:performance
```

## Code Style and Standards

### TypeScript Guidelines

1. **Strict Type Safety**:
   ```typescript
   // ✅ Good: Explicit, specific types
   interface CreateMemoryOptions {
     content: string;
     type?: MemoryType;
     importance?: number;
     metadata?: Record<string, unknown>;
   }

   function createMemory(options: CreateMemoryOptions): Promise<MemoryItem> {
     // Implementation
   }

   // ❌ Bad: Any types or implicit any
   function createMemory(options: any): any {
     // Implementation
   }
   ```

2. **Interface Design**:
   ```typescript
   // ✅ Good: Descriptive interfaces for contracts
   interface StorageAdapter {
     init(): Promise<void>;
     get(id: string): Promise<MemoryItem | null>;
     create(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem>;
   }

   // ✅ Good: Type unions for discrete values
   type MemoryType = 'episodic' | 'semantic' | 'procedural';
   ```

3. **Error Handling Patterns**:
   ```typescript
   // ✅ Good: Result pattern for recoverable errors
   import { Result } from './types/branded';

   async function safeOperation(): Promise<Result<Data, Error>> {
     try {
       const data = await riskyOperation();
       return Result.ok(data);
     } catch (error) {
       return Result.err(error as Error);
     }
   }

   // ✅ Good: Throw for unrecoverable errors
   function validateInput(input: string): void {
     if (!input?.trim()) {
       throw new ValidationError('Input cannot be empty');
     }
   }
   ```

4. **Async/Await Patterns**:
   ```typescript
   // ✅ Good: Proper async/await usage
   async function processMemories(memories: MemoryItem[]): Promise<ProcessedMemory[]> {
     const results = await Promise.all(
       memories.map(memory => processIndividualMemory(memory))
     );
     return results.filter(result => result.isValid);
   }

   // ❌ Bad: Mixing promises and async/await
   async function mixedPatterns(): Promise<void> {
     const data = await getData();
     return processData(data).then(result => {
       console.log(result);
     });
   }
   ```

### Naming Conventions

- **Classes**: `PascalCase` - `MemoryClassifier`, `IndexedDBAdapter`
- **Functions/Methods**: `camelCase` - `createMemory`, `extractPatterns`
- **Variables**: `camelCase` - `memoryItem`, `storageAdapter`
- **Constants**: `UPPER_SNAKE_CASE` - `DEFAULT_IMPORTANCE`, `MAX_MEMORY_SIZE`
- **Interfaces**: `PascalCase` - `StorageAdapter`, `MemoryQuery`
- **Types**: `PascalCase` - `MemoryType`, `RecallStrategy`
- **Files**: `kebab-case` - `memory-classifier.ts`, `storage-adapter.test.ts`

### Documentation Standards

1. **TSDoc Comments** for all public APIs:
   ```typescript
   /**
    * Creates a new memory item with automatic classification
    *
    * @param content - The content to store as a memory
    * @param options - Optional configuration for memory creation
    * @returns Promise resolving to the created memory item
    *
    * @throws {ValidationError} When content is empty or invalid
    * @throws {StorageError} When storage operation fails
    *
    * @example
    * ```typescript
    * const memory = await client.create('I learned TypeScript today', {
    *   importance: 0.8,
    *   tags: ['learning', 'programming']
    * });
    * console.log(memory.type); // 'semantic'
    * ```
    */
   async create(
     content: string,
     options?: CreateMemoryOptions
   ): Promise<MemoryItem> {
     // Implementation
   }
   ```

2. **README sections** for new features
3. **Architecture documentation** for design decisions
4. **Migration guides** for breaking changes

### Code Organization

```typescript
// File structure within modules
export class MemoryClassifier {
  // 1. Static properties/methods first
  static readonly DEFAULT_CONFIDENCE = 0.7;

  // 2. Instance properties (private first)
  private readonly model: ClassificationModel;
  private trainingData: TrainingExample[];

  // 3. Constructor
  constructor(config: ClassifierConfig) {
    this.model = new ClassificationModel(config.model);
    this.trainingData = config.trainingData || [];
  }

  // 4. Public methods
  public classify(text: string): ClassificationResult {
    // Implementation
  }

  // 5. Private methods last
  private extractFeatures(text: string): Features {
    // Implementation
  }
}
```

## Git Workflow and Branching

### Branch Naming Convention

- **Features**: `feature/description` - `feature/add-redis-adapter`
- **Bug fixes**: `fix/description` - `fix/memory-leak-in-indexeddb`
- **Documentation**: `docs/description` - `docs/update-api-reference`
- **Refactoring**: `refactor/description` - `refactor/simplify-recall-strategies`
- **Performance**: `perf/description` - `perf/optimize-query-performance`
- **Tests**: `test/description` - `test/add-integration-tests`

### Commit Message Format

We follow [Conventional Commits](https://conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(storage): add Redis adapter support

Implements Redis-based storage adapter with connection pooling
and automatic failover capabilities.

Closes #123
```

```
fix(nlp): resolve memory classification accuracy issue

The Naive Bayes classifier was not properly handling
edge cases with very short text inputs.

Fixes #145
```

### Git Best Practices

1. **Keep commits atomic** - One logical change per commit
2. **Write descriptive commit messages** - Explain why, not what
3. **Rebase before pushing** - Keep history clean
4. **Use interactive rebase** to clean up commit history
5. **Test before committing** - Ensure your changes work

```bash
# Example workflow for clean commits
git add -p                    # Stage changes interactively
git commit -m "feat: add..."  # Descriptive commit message
git rebase -i HEAD~3          # Clean up recent commits
make quality                  # Verify code quality
git push origin feature-branch
```

## Pull Request Process

### Before Creating a PR

1. **Ensure your branch is up to date**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all quality checks**:
   ```bash
   make quality    # Lint + type check + test
   make test:uat   # User acceptance tests
   ```

3. **Update documentation** if needed
4. **Add or update tests** for your changes
5. **Test your changes** in multiple scenarios

### PR Creation Checklist

- [ ] Branch is up to date with main
- [ ] All tests pass (`make test`)
- [ ] Code follows style guidelines (`make lint`)
- [ ] TypeScript compiles without errors (`make type-check`)
- [ ] Documentation is updated if needed
- [ ] UAT tests pass if applicable
- [ ] Commit messages follow conventional format
- [ ] PR description explains the changes
- [ ] Related issues are referenced

### PR Description Template

```markdown
## Summary
Brief description of the changes and their purpose.

## Changes Made
- List of specific changes
- Use bullet points
- Be specific about modifications

## Testing
- [ ] Unit tests added/updated
- [ ] UAT tests added/updated if applicable
- [ ] Manual testing performed
- [ ] Performance impact assessed

## Documentation
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Examples updated if needed

## Breaking Changes
Describe any breaking changes and migration path if applicable.

## Related Issues
Closes #123
Fixes #456
```

### PR Review Process

1. **Automated checks** must pass:
   - All tests (unit, UAT, NLP)
   - Linting and type checking
   - Coverage requirements met

2. **Code review** by maintainers:
   - Code quality and style
   - Architecture consistency
   - Test coverage adequacy
   - Documentation completeness

3. **Manual testing** if applicable:
   - Feature functionality
   - Integration with existing features
   - Performance impact

### Addressing Review Feedback

```bash
# Make requested changes
git add .
git commit -m "fix: address review feedback"

# Or amend the last commit if it's a small fix
git add .
git commit --amend

# Force push to update the PR (be careful!)
git push origin feature-branch --force-with-lease
```

## Issue Reporting Guidelines

### Before Opening an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for answers
3. **Try the latest version** of the library
4. **Prepare a minimal reproduction** if possible

### Bug Report Template

```markdown
## Bug Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Initialize memory client with...
2. Create a memory with...
3. Call recall method...
4. Observe the error...

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., macOS 12.0]
- Node.js version: [e.g., 18.0.0]
- Library version: [e.g., 1.2.3]
- Browser (if applicable): [e.g., Chrome 96]

## Minimal Reproduction
```typescript
// Provide minimal code that reproduces the issue
import { createMemoryClient } from 'kuzu-memory';

const client = createMemoryClient({ storage: 'memory' });
// ... reproduction steps
```

**Additional Context**
Any other context about the problem.
```

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature you'd like to see.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
How would you like this feature to work?

## Alternative Solutions
Other approaches you've considered.

## Use Cases
Specific scenarios where this feature would be helpful.

## Implementation Notes
Any technical details or constraints to consider.
```

### Performance Issue Template

```markdown
## Performance Issue Description
Describe the performance problem.

## Current Performance
- Operation: [e.g., creating 1000 memories]
- Current time: [e.g., 2.5 seconds]
- Expected time: [e.g., under 500ms]

## Environment
- Hardware: [e.g., MacBook Pro M1]
- Dataset size: [e.g., 10,000 existing memories]
- Configuration: [e.g., IndexedDB adapter]

## Profiling Data
Include performance profiles if available.
```

## Documentation Requirements

### When Documentation is Required

- **New features** - Complete API documentation with examples
- **Breaking changes** - Migration guides and updated examples
- **Configuration changes** - Updated configuration documentation
- **New patterns** - Architecture or usage pattern documentation

### Documentation Types

1. **API Documentation**:
   - TSDoc comments in code
   - Type definitions and interfaces
   - Method signatures and return types
   - Usage examples

2. **User Guides**:
   - Getting started tutorials
   - Common use case examples
   - Best practices guides
   - Troubleshooting guides

3. **Developer Documentation**:
   - Architecture explanations
   - Contributing guidelines
   - Testing strategies
   - Release processes

### Documentation Standards

```typescript
/**
 * Comprehensive documentation example
 *
 * @param content - The memory content (must be non-empty)
 * @param options - Optional memory creation settings
 * @returns Promise that resolves to the created memory
 *
 * @throws {ValidationError} When content is empty or invalid
 * @throws {StorageError} When storage operation fails
 *
 * @example Basic usage
 * ```typescript
 * const memory = await client.create('I learned something new today');
 * console.log(memory.type); // Auto-classified type
 * ```
 *
 * @example With options
 * ```typescript
 * const memory = await client.create('Important meeting notes', {
 *   importance: 0.9,
 *   tags: ['work', 'meeting'],
 *   metadata: { project: 'alpha' }
 * });
 * ```
 *
 * @since 1.0.0
 */
```

## Testing Requirements

### Test Coverage Requirements

- **Minimum 70% coverage** for all metrics
- **85%+ coverage** for core functionality
- **90%+ coverage** for critical paths (memory creation, storage)
- **100% coverage** for public API methods

### Required Test Types

1. **Unit Tests** for all new functionality:
   ```typescript
   describe('MemoryClassifier', () => {
     let classifier: MemoryClassifier;

     beforeEach(() => {
       classifier = new MemoryClassifier();
     });

     it('should classify episodic memories correctly', () => {
       const result = classifier.classify('Yesterday I went to the store');
       expect(result.type).toBe('episodic');
       expect(result.confidence).toBeGreaterThan(0.7);
     });
   });
   ```

2. **UAT Tests** for user-facing features:
   ```typescript
   describe('Memory Creation UAT', () => {
     it('should create and classify memory automatically', async () => {
       const client = createMemoryClient({ storage: 'memory' });
       await client.init();

       const memory = await client.create('I learned TypeScript today');

       expect(memory.id).toBeDefined();
       expect(memory.type).toBe('semantic');
       expect(memory.content).toBe('I learned TypeScript today');
     });
   });
   ```

3. **Integration Tests** for component interaction:
   ```typescript
   describe('Storage Integration', () => {
     it('should work consistently across all storage adapters', async () => {
       const adapters = ['memory', 'localStorage', 'indexeddb'];

       for (const adapterType of adapters) {
         const client = createMemoryClient({ storage: adapterType });
         await client.init();

         const memory = await client.create('Test memory');
         const recalled = await client.recall('Test');

         expect(recalled).toHaveLength(1);
         expect(recalled[0].id).toBe(memory.id);

         await client.clear();
       }
     });
   });
   ```

### Test Quality Standards

- Tests must be **deterministic** (no flaky tests)
- Tests must be **isolated** (no test interdependencies)
- Tests must be **fast** (unit tests < 10ms each)
- Tests must be **maintainable** (clear, readable code)
- Tests must **cover edge cases** and error conditions

## Review Process

### Code Review Criteria

**Functionality**:
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled properly
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logical errors

**Quality**:
- [ ] Code follows project style guidelines
- [ ] TypeScript types are appropriate and safe
- [ ] No code duplication (DRY principle)
- [ ] Performance considerations addressed

**Architecture**:
- [ ] Changes fit well with existing architecture
- [ ] Abstractions are appropriate
- [ ] Interfaces are well-designed
- [ ] Separation of concerns maintained

**Testing**:
- [ ] Adequate test coverage
- [ ] Tests are well-structured
- [ ] All test types covered where appropriate
- [ ] Tests actually test what they claim to test

**Documentation**:
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] Examples provided where helpful
- [ ] Breaking changes documented

### Review Timeline

- **Initial response**: Within 2 business days
- **Full review**: Within 1 week for most PRs
- **Large PRs**: May take longer, will be communicated
- **Urgent fixes**: Expedited review process

### Reviewer Guidelines

**For Reviewers**:
1. Be constructive and specific in feedback
2. Ask questions to understand design decisions
3. Suggest improvements, don't just point out problems
4. Approve when requirements are met
5. Test complex changes locally when needed

**For Authors**:
1. Respond to feedback promptly
2. Ask for clarification if feedback is unclear
3. Make requested changes or discuss alternatives
4. Test your changes after addressing feedback
5. Thank reviewers for their time

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features (backward compatible)
- **PATCH** (1.1.1): Bug fixes (backward compatible)

### Release Types

**Pre-releases**:
- `1.0.0-alpha.1` - Early development
- `1.0.0-beta.1` - Feature complete, testing phase
- `1.0.0-rc.1` - Release candidate

**Regular Releases**:
- `1.0.0` - Stable release
- `1.1.0` - Minor update
- `1.0.1` - Patch release

### Release Checklist

1. **Pre-release Testing**:
   - [ ] All tests pass (`make test`)
   - [ ] UAT tests pass (`make test:uat`)
   - [ ] Performance tests pass
   - [ ] Cross-platform testing complete

2. **Documentation**:
   - [ ] CHANGELOG.md updated
   - [ ] README.md reflects new features
   - [ ] API documentation current
   - [ ] Migration guide (if breaking changes)

3. **Version Management**:
   - [ ] Version bumped in package.json
   - [ ] Git tags created
   - [ ] Release notes written

4. **Publishing**:
   - [ ] npm package published
   - [ ] GitHub release created
   - [ ] Documentation deployed

### Changelog Format

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added
- Redis storage adapter support
- Advanced pattern extraction for code blocks
- Performance monitoring utilities

### Changed
- Improved NLP classification accuracy (85% -> 92%)
- Updated TypeScript to v5.0

### Fixed
- Memory leak in IndexedDB adapter
- Race condition in concurrent recalls

### Deprecated
- Old configuration format (will be removed in 2.0)

### Security
- Updated dependencies with security patches
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment:

1. **Be respectful** - Treat everyone with respect and kindness
2. **Be inclusive** - Welcome people of all backgrounds and experience levels
3. **Be constructive** - Focus on helping and learning together
4. **Be patient** - Remember that everyone starts somewhere
5. **Be professional** - Keep discussions focused and productive

### Communication Channels

- **GitHub Issues** - Bug reports, feature requests
- **GitHub Discussions** - Questions, ideas, general discussion
- **Pull Requests** - Code contributions and reviews
- **Discord/Slack** - Real-time community chat (if available)

### Getting Help

1. **Check the documentation** first
2. **Search existing issues** and discussions
3. **Ask specific questions** with context
4. **Provide minimal reproductions** when possible
5. **Be patient** waiting for responses

### Recognition

Contributors are recognized through:
- **Contributors file** - All contributors listed
- **Release notes** - Major contributors mentioned
- **GitHub insights** - Contribution statistics
- **Community highlights** - Special contributions featured

### Mentorship

**For New Contributors**:
- Start with "good first issue" labels
- Ask questions early and often
- Pair with experienced contributors
- Focus on learning, not just completing tasks

**For Experienced Contributors**:
- Help mentor new contributors
- Review pull requests constructively
- Share knowledge through documentation
- Participate in community discussions

---

Thank you for contributing to Kuzu Memory! Your efforts help make this library better for everyone. If you have questions about contributing that aren't covered in this guide, please don't hesitate to open an issue or start a discussion.

## Quick Reference

### Essential Commands
```bash
make test           # Run all tests
make quality        # Lint + type check + test
make build          # Build the project
make help           # Show all available commands
```

### Key Files
- `/src/` - Source code
- `/tests/` - Test files
- `/docs/` - Documentation
- `CLAUDE.md` - Project development guide
- `package.json` - Dependencies and scripts