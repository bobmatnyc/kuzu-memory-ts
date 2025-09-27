# Migration and Upgrade Guide

This comprehensive guide covers migration paths, version compatibility, breaking changes, and upgrade strategies for the Kuzu Memory TypeScript library. Use this guide when upgrading between versions or migrating from other memory management solutions.

## Table of Contents

1. [Version Migration Overview](#version-migration-overview)
2. [Semantic Versioning Policy](#semantic-versioning-policy)
3. [Breaking Changes by Version](#breaking-changes-by-version)
4. [Migration Paths](#migration-paths)
5. [Data Migration Strategies](#data-migration-strategies)
6. [API Compatibility](#api-compatibility)
7. [Configuration Migration](#configuration-migration)
8. [Storage Format Migration](#storage-format-migration)
9. [Automated Migration Tools](#automated-migration-tools)
10. [Testing Migration](#testing-migration)
11. [Rollback Strategies](#rollback-strategies)
12. [Cross-Platform Migration](#cross-platform-migration)

## Version Migration Overview

### Current Version Status

| Version | Status | Support Level | End of Support |
|---------|--------|---------------|----------------|
| 2.x.x | Development | Active Development | TBD |
| 1.x.x | Current | Full Support | 2025-12-31 |
| 0.x.x | Legacy | Security Only | 2024-06-30 |

### Migration Complexity Matrix

| From → To | Complexity | Data Migration | Breaking Changes | Estimated Time |
|-----------|------------|----------------|------------------|----------------|
| 0.x → 1.0 | High | Required | Major | 4-8 hours |
| 1.0 → 1.1 | Low | None | Minor | 30 minutes |
| 1.1 → 1.2 | Low | None | None | 15 minutes |
| 1.x → 2.0 | High | Required | Major | 6-12 hours |

## Semantic Versioning Policy

The Kuzu Memory library follows [Semantic Versioning 2.0.0](https://semver.org/):

### MAJOR version (X.0.0)
- Breaking API changes
- Storage format changes requiring migration
- Dependency version changes that affect compatibility
- Architectural changes

### MINOR version (X.Y.0)
- New features that are backward compatible
- New optional configuration options
- Performance improvements
- New storage adapters or recall strategies

### PATCH version (X.Y.Z)
- Bug fixes
- Security patches
- Documentation updates
- Internal optimizations without API changes

### Pre-release identifiers
- `alpha`: Early development, unstable API
- `beta`: Feature complete, testing phase
- `rc`: Release candidate, production-ready

## Breaking Changes by Version

### Version 2.0.0 (Planned)
**Release Date**: Q2 2024

**Major Changes**:
- New TypeScript strict mode requirements
- Updated storage format with schema versioning
- Redesigned React hooks API
- Removed deprecated methods from 1.x

**Breaking Changes**:
```typescript
// OLD (1.x)
import { KuzuMemory } from 'kuzu-memory';

const memory = new KuzuMemory({ storage: 'indexeddb' });
await memory.init();

// NEW (2.0)
import { createMemoryClient } from 'kuzu-memory';

const client = createMemoryClient({
  storage: { type: 'indexeddb', version: 2 }
});
await client.init();
```

**Storage Format Changes**:
- Schema version field added to all stored items
- Metadata structure standardized
- Relations stored in separate table/store

**Migration Required**: Yes (automated tool available)

### Version 1.2.0
**Release Date**: 2024-01-15

**New Features**:
- Advanced pattern extraction
- Custom recall strategies
- Performance monitoring

**Breaking Changes**: None

**Migration Required**: No

### Version 1.1.0
**Release Date**: 2023-12-01

**New Features**:
- Redis storage adapter
- Batch operations
- Memory decay system

**Breaking Changes**:
```typescript
// OLD (1.0)
const result = await memory.createMemory(content);

// NEW (1.1) - Method renamed for clarity
const result = await memory.create(content);
```

**Migration Required**: Minor (method renaming only)

### Version 1.0.0
**Release Date**: 2023-10-01

**Major Changes**:
- Production-ready release
- Complete TypeScript rewrite from 0.x JavaScript version
- New storage adapter architecture
- Comprehensive NLP integration

**Breaking Changes**: Complete API redesign from 0.x

**Migration Required**: Yes (complete rewrite)

## Migration Paths

### Migrating from 0.x to 1.x

This is a complete rewrite migration requiring significant changes:

#### Step 1: Update Dependencies

```bash
# Remove old version
npm uninstall kuzu-memory@0.x

# Install new version
npm install kuzu-memory@1.x
```

#### Step 2: Update Imports and Initialization

```typescript
// OLD (0.x)
const KuzuMemory = require('kuzu-memory');
const memory = new KuzuMemory();

// NEW (1.x)
import { createMemoryClient } from 'kuzu-memory';
const client = createMemoryClient({
  storage: 'indexeddb',
  nlp: { autoClassify: true }
});
```

#### Step 3: Update API Calls

```typescript
// OLD (0.x)
memory.addMemory(text, callback);
memory.searchMemories(query, callback);

// NEW (1.x)
const memory = await client.create(text);
const results = await client.recall(query);
```

#### Step 4: Data Migration

```typescript
// Migration script for 0.x to 1.x
async function migrate0xTo1x() {
  // Export from 0.x format
  const oldMemories = await exportOldFormat();

  // Initialize new client
  const client = createMemoryClient({ storage: 'indexeddb' });
  await client.init();

  // Migrate each memory
  for (const oldMemory of oldMemories) {
    const newMemory = {
      content: oldMemory.text,
      type: mapOldTypeToNew(oldMemory.category),
      importance: oldMemory.weight || 0.5,
      tags: oldMemory.tags || [],
      metadata: {
        migrated: true,
        originalId: oldMemory.id,
        migratedAt: new Date()
      }
    };

    await client.create(newMemory.content, {
      type: newMemory.type,
      importance: newMemory.importance,
      tags: newMemory.tags,
      metadata: newMemory.metadata
    });
  }

  console.log(`Migrated ${oldMemories.length} memories`);
}
```

### Migrating from 1.x to 2.0

#### Step 1: Check Compatibility

```bash
# Run compatibility check
npx kuzu-memory-migrate check --from=1.x --to=2.0
```

#### Step 2: Backup Data

```bash
# Export current data
npx kuzu-memory-migrate export --output=backup-$(date +%Y%m%d).json
```

#### Step 3: Update Dependencies

```bash
npm install kuzu-memory@2.0
```

#### Step 4: Update Configuration

```typescript
// OLD (1.x)
const client = createMemoryClient({
  storage: 'indexeddb',
  dbName: 'my-app'
});

// NEW (2.0)
const client = createMemoryClient({
  storage: {
    type: 'indexeddb',
    dbName: 'my-app',
    version: 2
  }
});
```

#### Step 5: Update React Hooks

```typescript
// OLD (1.x)
const { memories, create, search } = useKuzuMemory();

// NEW (2.0)
const { client } = useKuzuMemory({ storage: { type: 'indexeddb' } });
const { data: memories } = useMemoryQuery({ client, query: {...} });
const { mutate: create } = useMemoryMutation({ client });
```

#### Step 6: Run Migration

```bash
# Automated migration with validation
npx kuzu-memory-migrate run --from=1.x --to=2.0 --validate
```

## Data Migration Strategies

### Progressive Migration

For large datasets, use progressive migration to avoid blocking the application:

```typescript
export class ProgressiveMigrator {
  private batchSize = 100;
  private delayMs = 100;

  async migrateProgressively(
    fromClient: KuzuMemoryV1,
    toClient: KuzuMemoryV2,
    onProgress?: (completed: number, total: number) => void
  ): Promise<MigrationResult> {
    const totalMemories = await fromClient.count();
    let migrated = 0;
    let errors: string[] = [];

    for (let offset = 0; offset < totalMemories; offset += this.batchSize) {
      try {
        // Get batch from old version
        const batch = await fromClient.getMany({
          limit: this.batchSize,
          offset
        });

        // Migrate batch
        const migrationPromises = batch.map(memory =>
          this.migrateIndividualMemory(memory, toClient)
        );

        const results = await Promise.allSettled(migrationPromises);

        // Count successful migrations
        const successful = results.filter(r => r.status === 'fulfilled').length;
        migrated += successful;

        // Collect errors
        const batchErrors = results
          .filter(r => r.status === 'rejected')
          .map((r, i) => `Memory ${batch[i].id}: ${(r as any).reason.message}`);
        errors.push(...batchErrors);

        // Progress callback
        onProgress?.(migrated, totalMemories);

        // Delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, this.delayMs));

      } catch (error) {
        errors.push(`Batch error at offset ${offset}: ${error.message}`);
      }
    }

    return {
      totalMemories,
      migrated,
      failed: totalMemories - migrated,
      errors
    };
  }

  private async migrateIndividualMemory(
    oldMemory: LegacyMemoryItem,
    newClient: KuzuMemoryV2
  ): Promise<MemoryItem> {
    // Transform data structure
    const transformed = this.transformMemoryFormat(oldMemory);

    // Validate transformed data
    const validation = validateMemoryItem(transformed);
    if (!validation.valid) {
      throw new Error(`Invalid memory data: ${validation.errors.join(', ')}`);
    }

    // Store in new format
    return newClient.create(transformed.content, {
      type: transformed.type,
      importance: transformed.importance,
      tags: transformed.tags,
      metadata: {
        ...transformed.metadata,
        migrated: true,
        originalVersion: '1.x',
        migratedAt: new Date()
      }
    });
  }

  private transformMemoryFormat(oldMemory: LegacyMemoryItem): NewMemoryFormat {
    return {
      content: oldMemory.text || oldMemory.content,
      type: this.mapMemoryType(oldMemory.type || oldMemory.category),
      importance: Math.max(0, Math.min(1, oldMemory.importance || 0.5)),
      tags: Array.isArray(oldMemory.tags) ? oldMemory.tags : [],
      metadata: {
        originalId: oldMemory.id,
        ...(oldMemory.metadata || {})
      }
    };
  }

  private mapMemoryType(oldType: string): MemoryType {
    const mapping: Record<string, MemoryType> = {
      'fact': 'semantic',
      'experience': 'episodic',
      'skill': 'procedural',
      'note': 'working',
      'observation': 'sensory'
    };

    return mapping[oldType] || 'semantic';
  }
}
```

### Zero-Downtime Migration

For production systems requiring zero downtime:

```typescript
export class ZeroDowntimeMigrator {
  async migrateWithDualWrite(
    oldClient: KuzuMemoryV1,
    newClient: KuzuMemoryV2
  ): Promise<void> {
    // Phase 1: Dual write setup
    const dualWriteProxy = new DualWriteProxy(oldClient, newClient);

    // Replace all write operations with dual-write proxy
    this.setupDualWrite(dualWriteProxy);

    // Phase 2: Background migration of existing data
    await this.migrateExistingData(oldClient, newClient);

    // Phase 3: Validation
    await this.validateMigration(oldClient, newClient);

    // Phase 4: Switch to new client only
    this.switchToNewClient(newClient);

    // Phase 5: Cleanup old client
    await this.cleanupOldClient(oldClient);
  }

  private async migrateExistingData(
    oldClient: KuzuMemoryV1,
    newClient: KuzuMemoryV2
  ): Promise<void> {
    const migrator = new ProgressiveMigrator();

    await migrator.migrateProgressively(
      oldClient,
      newClient,
      (completed, total) => {
        console.log(`Migration progress: ${completed}/${total} (${(completed/total*100).toFixed(1)}%)`);
      }
    );
  }
}

class DualWriteProxy {
  constructor(
    private oldClient: KuzuMemoryV1,
    private newClient: KuzuMemoryV2
  ) {}

  async create(content: string, options?: any): Promise<MemoryItem> {
    // Write to both systems
    const [oldResult, newResult] = await Promise.allSettled([
      this.oldClient.create(content, options),
      this.newClient.create(content, options)
    ]);

    // Prefer new result, fallback to old
    if (newResult.status === 'fulfilled') {
      if (oldResult.status === 'rejected') {
        console.warn('Old client write failed during dual write:', oldResult.reason);
      }
      return newResult.value;
    }

    if (oldResult.status === 'fulfilled') {
      console.error('New client write failed during dual write:', newResult.reason);
      return oldResult.value;
    }

    throw new Error('Both clients failed during dual write');
  }

  // Similar implementations for update, delete, etc.
}
```

## Storage Format Migration

### Schema Versioning

Starting from version 2.0, all stored items include a schema version:

```typescript
interface VersionedMemoryItem extends MemoryItem {
  _schemaVersion: number;
  _createdInVersion: string;
  _lastMigratedVersion?: string;
}

export class SchemaVersionManager {
  private static readonly CURRENT_VERSION = 2;
  private static readonly MIGRATIONS = new Map<number, SchemaMigration>([
    [1, new SchemaV1ToV2Migration()],
    [2, new SchemaV2ToV3Migration()]
  ]);

  static async migrateItem(item: any): Promise<VersionedMemoryItem> {
    let currentItem = item;
    let version = item._schemaVersion || 1; // Default to v1 for legacy items

    while (version < this.CURRENT_VERSION) {
      const migration = this.MIGRATIONS.get(version);
      if (!migration) {
        throw new Error(`No migration path from version ${version}`);
      }

      currentItem = await migration.migrate(currentItem);
      version++;
    }

    return {
      ...currentItem,
      _schemaVersion: this.CURRENT_VERSION,
      _lastMigratedVersion: version > item._schemaVersion ? getCurrentVersion() : undefined
    };
  }

  static isCurrentVersion(item: any): boolean {
    return item._schemaVersion === this.CURRENT_VERSION;
  }
}

abstract class SchemaMigration {
  abstract migrate(item: any): Promise<any>;
  abstract validate(item: any): boolean;
}

class SchemaV1ToV2Migration extends SchemaMigration {
  async migrate(item: any): Promise<any> {
    return {
      ...item,
      // V2 changes: standardized metadata structure
      metadata: {
        ...item.metadata,
        patterns: item.extractedPatterns || [],
        classification: {
          confidence: item.classificationConfidence || 0.5,
          features: item.classificationFeatures || {}
        }
      },
      // V2 changes: separate relations array
      relations: item.relations || [],
      // V2 changes: consistent timestamp format
      timestamp: new Date(item.timestamp || item.createdAt),
      lastAccessed: item.lastAccessed ? new Date(item.lastAccessed) : undefined,
      // Schema version tracking
      _schemaVersion: 2,
      _createdInVersion: item._createdInVersion || '1.0.0'
    };
  }

  validate(item: any): boolean {
    return item.content &&
           typeof item.importance === 'number' &&
           Array.isArray(item.relations);
  }
}
```

### Storage Adapter Migration

```typescript
export class StorageAdapterMigrator {
  async migrateStorageFormat(
    fromAdapter: StorageAdapter,
    toAdapter: StorageAdapter,
    options: MigrationOptions = {}
  ): Promise<StorageMigrationResult> {
    const startTime = Date.now();
    let migrated = 0;
    let errors: string[] = [];

    try {
      // Initialize target adapter
      await toAdapter.init();

      // Clear target if requested
      if (options.clearTarget) {
        await toAdapter.clear();
      }

      // Get all items from source
      const allItems = await fromAdapter.query({});

      for (const item of allItems) {
        try {
          // Migrate schema if needed
          const migratedItem = await SchemaVersionManager.migrateItem(item);

          // Validate migrated item
          const validation = SchemaValidator.validateMemoryItem(migratedItem);
          if (!validation.success) {
            errors.push(`Invalid item ${item.id}: ${validation.errors.join(', ')}`);
            continue;
          }

          // Store in target adapter
          await toAdapter.create(migratedItem);
          migrated++;

        } catch (error) {
          errors.push(`Failed to migrate item ${item.id}: ${error.message}`);
        }
      }

      // Verify migration
      if (options.verify) {
        const verificationResult = await this.verifyMigration(fromAdapter, toAdapter);
        if (!verificationResult.success) {
          errors.push(...verificationResult.errors);
        }
      }

      return {
        success: true,
        totalItems: allItems.length,
        migratedItems: migrated,
        failedItems: allItems.length - migrated,
        duration: Date.now() - startTime,
        errors
      };

    } catch (error) {
      return {
        success: false,
        totalItems: 0,
        migratedItems: migrated,
        failedItems: 0,
        duration: Date.now() - startTime,
        errors: [...errors, error.message]
      };
    }
  }

  private async verifyMigration(
    sourceAdapter: StorageAdapter,
    targetAdapter: StorageAdapter
  ): Promise<VerificationResult> {
    const errors: string[] = [];

    try {
      const sourceItems = await sourceAdapter.query({});
      const targetItems = await targetAdapter.query({});

      // Check counts
      if (sourceItems.length !== targetItems.length) {
        errors.push(`Item count mismatch: source=${sourceItems.length}, target=${targetItems.length}`);
      }

      // Verify random sample
      const sampleSize = Math.min(10, sourceItems.length);
      const sampleIndexes = this.getRandomSample(sourceItems.length, sampleSize);

      for (const index of sampleIndexes) {
        const sourceItem = sourceItems[index];
        const targetItem = await targetAdapter.get(sourceItem.id);

        if (!targetItem) {
          errors.push(`Missing item in target: ${sourceItem.id}`);
          continue;
        }

        // Verify core content
        if (sourceItem.content !== targetItem.content) {
          errors.push(`Content mismatch for item ${sourceItem.id}`);
        }

        if (Math.abs(sourceItem.importance - targetItem.importance) > 0.001) {
          errors.push(`Importance mismatch for item ${sourceItem.id}`);
        }
      }

      return {
        success: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  private getRandomSample(total: number, sampleSize: number): number[] {
    const indexes: number[] = [];
    while (indexes.length < sampleSize) {
      const randomIndex = Math.floor(Math.random() * total);
      if (!indexes.includes(randomIndex)) {
        indexes.push(randomIndex);
      }
    }
    return indexes;
  }
}
```

## Automated Migration Tools

### CLI Migration Tool

```bash
# Install migration CLI
npm install -g kuzu-memory-migrate

# Check current version and migration path
kuzu-memory-migrate check

# Export data before migration
kuzu-memory-migrate export --format=json --output=backup.json

# Run migration
kuzu-memory-migrate run --from=1.x --to=2.0 --config=migration.json

# Verify migration
kuzu-memory-migrate verify --source=backup.json

# Import from backup if needed
kuzu-memory-migrate import --source=backup.json
```

### Migration Configuration

```json
{
  "migration": {
    "source": {
      "version": "1.2.0",
      "storage": "indexeddb",
      "dbName": "kuzu-memory-v1"
    },
    "target": {
      "version": "2.0.0",
      "storage": "indexeddb",
      "dbName": "kuzu-memory-v2"
    },
    "options": {
      "batchSize": 100,
      "delay": 100,
      "verify": true,
      "backup": true,
      "clearTarget": false,
      "onProgress": "console"
    },
    "transformations": [
      {
        "field": "category",
        "rename": "type",
        "mapping": {
          "fact": "semantic",
          "experience": "episodic"
        }
      }
    ]
  }
}
```

### Programmatic Migration

```typescript
import { MigrationManager } from 'kuzu-memory/migration';

const migrator = new MigrationManager({
  source: { version: '1.x', storage: 'indexeddb' },
  target: { version: '2.0', storage: 'indexeddb' },
  options: {
    batchSize: 50,
    verify: true,
    onProgress: (completed, total) => {
      console.log(`Progress: ${completed}/${total}`);
    }
  }
});

try {
  const result = await migrator.migrate();
  console.log('Migration completed:', result);
} catch (error) {
  console.error('Migration failed:', error);
  await migrator.rollback();
}
```

## Testing Migration

### Migration Test Suite

```typescript
describe('Migration Tests', () => {
  describe('Schema V1 to V2', () => {
    test('should migrate basic memory items', async () => {
      const v1Item = {
        id: 'test-id',
        text: 'Test content',
        category: 'fact',
        weight: 0.8,
        createdAt: new Date('2023-01-01')
      };

      const migrated = await SchemaVersionManager.migrateItem(v1Item);

      expect(migrated._schemaVersion).toBe(2);
      expect(migrated.content).toBe(v1Item.text);
      expect(migrated.type).toBe('semantic');
      expect(migrated.importance).toBe(v1Item.weight);
      expect(migrated.timestamp).toEqual(v1Item.createdAt);
    });

    test('should handle missing fields gracefully', async () => {
      const v1Item = {
        id: 'test-id',
        text: 'Test content'
        // Missing category, weight, etc.
      };

      const migrated = await SchemaVersionManager.migrateItem(v1Item);

      expect(migrated._schemaVersion).toBe(2);
      expect(migrated.type).toBe('semantic'); // Default
      expect(migrated.importance).toBe(0.5); // Default
      expect(migrated.relations).toEqual([]);
    });

    test('should preserve existing metadata', async () => {
      const v1Item = {
        id: 'test-id',
        text: 'Test content',
        metadata: { custom: 'value' }
      };

      const migrated = await SchemaVersionManager.migrateItem(v1Item);

      expect(migrated.metadata.custom).toBe('value');
      expect(migrated.metadata.patterns).toBeDefined();
    });
  });

  describe('Storage Migration', () => {
    test('should migrate between storage adapters', async () => {
      const sourceAdapter = new MemoryAdapter();
      const targetAdapter = new MemoryAdapter();

      await sourceAdapter.init();
      await targetAdapter.init();

      // Create test data
      const testMemory = await sourceAdapter.create({
        content: 'Test memory',
        type: 'semantic',
        importance: 0.7,
        timestamp: new Date(),
        accessCount: 0,
        decay: 0.1,
        tags: ['test'],
        metadata: {},
        relations: []
      });

      // Migrate
      const migrator = new StorageAdapterMigrator();
      const result = await migrator.migrateStorageFormat(sourceAdapter, targetAdapter, {
        verify: true
      });

      expect(result.success).toBe(true);
      expect(result.migratedItems).toBe(1);

      // Verify migrated data
      const migrated = await targetAdapter.get(testMemory.id);
      expect(migrated).toBeDefined();
      expect(migrated!.content).toBe(testMemory.content);
    });
  });
});
```

## Rollback Strategies

### Automated Rollback

```typescript
export class MigrationRollback {
  constructor(
    private backupData: BackupData,
    private targetClient: KuzuMemory
  ) {}

  async rollback(): Promise<RollbackResult> {
    const startTime = Date.now();
    let restored = 0;
    const errors: string[] = [];

    try {
      // Clear current data
      await this.targetClient.clear();

      // Restore from backup
      for (const item of this.backupData.memories) {
        try {
          await this.targetClient.create(item.content, {
            type: item.type,
            importance: item.importance,
            tags: item.tags,
            metadata: {
              ...item.metadata,
              restoredFromBackup: true,
              restoredAt: new Date()
            }
          });
          restored++;
        } catch (error) {
          errors.push(`Failed to restore ${item.id}: ${error.message}`);
        }
      }

      return {
        success: true,
        restoredItems: restored,
        failedItems: this.backupData.memories.length - restored,
        duration: Date.now() - startTime,
        errors
      };

    } catch (error) {
      return {
        success: false,
        restoredItems: restored,
        failedItems: this.backupData.memories.length - restored,
        duration: Date.now() - startTime,
        errors: [...errors, error.message]
      };
    }
  }

  async validateRollback(): Promise<boolean> {
    try {
      const currentCount = await this.targetClient.count();
      return currentCount === this.backupData.memories.length;
    } catch {
      return false;
    }
  }
}
```

## Cross-Platform Migration

### TypeScript to Python

```python
# Python equivalent migration script
import json
import sqlite3
from typing import Dict, List, Any
from kuzu_memory_py import KuzuMemory, MemoryItem

class TypeScriptToPythonMigrator:
    def __init__(self, js_export_file: str, python_client: KuzuMemory):
        self.js_export_file = js_export_file
        self.python_client = python_client

    async def migrate(self) -> Dict[str, Any]:
        """Migrate from TypeScript export to Python client"""

        # Load TypeScript export
        with open(self.js_export_file, 'r') as f:
            js_data = json.load(f)

        migrated = 0
        errors = []

        for js_memory in js_data['memories']:
            try:
                # Transform TypeScript memory to Python format
                py_memory = self._transform_memory(js_memory)

                # Create in Python client
                await self.python_client.create(
                    content=py_memory['content'],
                    memory_type=py_memory['type'],
                    importance=py_memory['importance'],
                    tags=py_memory['tags'],
                    metadata=py_memory['metadata']
                )

                migrated += 1

            except Exception as error:
                errors.append(f"Failed to migrate {js_memory['id']}: {str(error)}")

        return {
            'total': len(js_data['memories']),
            'migrated': migrated,
            'failed': len(js_data['memories']) - migrated,
            'errors': errors
        }

    def _transform_memory(self, js_memory: Dict[str, Any]) -> Dict[str, Any]:
        """Transform JavaScript memory format to Python format"""
        return {
            'content': js_memory['content'],
            'type': js_memory['type'],
            'importance': js_memory['importance'],
            'tags': js_memory.get('tags', []),
            'metadata': {
                **js_memory.get('metadata', {}),
                'migrated_from': 'typescript',
                'original_id': js_memory['id'],
                'migrated_at': datetime.now().isoformat()
            }
        }
```

### Configuration Mapping

| TypeScript Config | Python Equivalent | Notes |
|-------------------|-------------------|--------|
| `storage: 'indexeddb'` | `storage: 'sqlite'` | Browser → Server |
| `storage: 'localStorage'` | `storage: 'file'` | Simple storage |
| `storage: 'memory'` | `storage: 'memory'` | Direct mapping |
| `nlp: { autoClassify: true }` | `nlp: { auto_classify: True }` | Naming convention |
| `dbName: 'app-memory'` | `db_path: 'app_memory.db'` | File-based storage |

### Feature Compatibility

| Feature | TypeScript | Python | Java | C# |
|---------|------------|--------|------|-------|
| Basic CRUD | ✅ | ✅ | ✅ | ✅ |
| NLP Classification | ✅ | ✅ (NLTK) | ✅ (OpenNLP) | ✅ (ML.NET) |
| Pattern Extraction | ✅ | ✅ (regex) | ✅ (regex) | ✅ (regex) |
| Storage Adapters | 3 | 4 | 3 | 3 |
| React Hooks | ✅ | ❌ | ❌ | ❌ |
| Web Workers | ✅ | ❌ | ❌ | ❌ |
| Real-time Sync | ⚠️ | ✅ | ✅ | ✅ |

## Migration Best Practices

### Pre-Migration Checklist

- [ ] **Backup current data** - Always create a backup before migration
- [ ] **Test migration** on a copy of production data
- [ ] **Check compatibility** - Verify all features work in target version
- [ ] **Plan rollback** - Have a rollback strategy ready
- [ ] **Schedule downtime** - Plan for maintenance windows if needed
- [ ] **Monitor resources** - Ensure sufficient disk/memory for migration
- [ ] **Validate dependencies** - Check all integrations still work

### During Migration

- [ ] **Monitor progress** - Track migration progress and performance
- [ ] **Handle errors gracefully** - Don't fail entire migration for individual items
- [ ] **Maintain logs** - Log all migration activities for audit trail
- [ ] **Verify data integrity** - Validate migrated data matches source
- [ ] **Performance monitoring** - Watch for resource usage spikes

### Post-Migration

- [ ] **Smoke testing** - Test core functionality in target version
- [ ] **Performance validation** - Ensure performance meets expectations
- [ ] **Feature verification** - Verify all features work as expected
- [ ] **User acceptance testing** - Get user sign-off on migrated system
- [ ] **Cleanup** - Remove old data and temporary migration artifacts
- [ ] **Documentation update** - Update documentation with new version details

This migration guide ensures smooth transitions between versions while maintaining data integrity and minimizing downtime.