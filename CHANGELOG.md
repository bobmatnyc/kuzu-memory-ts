# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-09-25

### Added
- **New Memory Type**: Added `preference` memory type for storing user preferences, settings, and personal choices
- **NLP Classification Support**: Extended memory classifier with 30 training examples for preference memory recognition
- **Type System Enhancement**: Updated type definitions to include the new preference memory type alongside the existing 5 types (episodic, semantic, procedural, working, sensory)

### Changed
- **Memory Type Count**: Expanded from 5 to 6 memory types, bringing feature parity with the Python version
- **Training Data**: Enhanced NLP training dataset with comprehensive preference examples including themes, settings, configurations, and user choices

### Technical Details
- Added preference-specific training data in `src/nlp/TrainingData.ts`
- Updated core type definitions in `src/types/index.ts`
- Enhanced memory classifier to recognize and categorize preference-related content
- Maintained backward compatibility with all existing memory types

## [0.1.0] - 2025-09-24

### Added
- Initial release of Kuzu Memory TypeScript library
- Core memory management system with 5 memory types (episodic, semantic, procedural, working, sensory)
- Multiple storage adapters (Memory, localStorage, IndexedDB)
- React hooks for Next.js integration
- Comprehensive recall strategies (Recency, Importance, Frequency, Similarity, Composite)
- Pattern extraction for text processing
- Memory decay system
- Full TypeScript support with Zod validation
- Production-ready with 97+ passing UAT tests