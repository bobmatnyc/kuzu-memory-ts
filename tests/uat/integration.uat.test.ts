import { KuzuMemory } from '../../src/core/KuzuMemory';
import { MemoryItem, MemoryType, MemoryQuery, KuzuConfig } from '../../src/types';
import { sampleMemories, createSampleMemory, createMemoryBatch } from '../fixtures/sample-memories';
import { testPatterns } from '../fixtures/test-patterns';

describe('Integration UAT Tests', () => {
  describe('End-to-End Scenarios', () => {
    let memory: KuzuMemory;

    beforeEach(async () => {
      memory = new KuzuMemory({
        storage: 'memory',
        maxMemories: 1000,
        decayEnabled: true,
      });
      await memory.init();
    });

    afterEach(async () => {
      if (memory) {
        await memory.clear();
      }
    });

    it('should handle complete user workflow', async () => {
      // Scenario: User onboarding and interaction tracking
      const userStory = [
        'My name is Alice Johnson and I work as a UX designer.',
        'I prefer Figma over Sketch for design work.',
        'We decided to use Material-UI for our component library.',
        'Contact me at alice@company.com for design reviews.',
      ];

      // Store memories from user interactions
      const storedMemories: MemoryItem[] = [];
      for (const content of userStory) {
        const stored = await memory.store({
          type: 'episodic' as MemoryType,
          content,
          tags: ['user_input'],
          importance: 0.8,
        });
        storedMemories.push(stored);
      }

      expect(storedMemories).toHaveLength(4);

      // Recall user identity
      const identityRecall = await memory.recall('name Alice');
      expect(identityRecall.length).toBeGreaterThan(0);
      expect(identityRecall[0].content).toContain('Alice Johnson');

      // Recall preferences
      const preferenceRecall = await memory.recall('prefer Figma');
      expect(preferenceRecall.length).toBeGreaterThan(0);
      expect(preferenceRecall[0].content).toContain('Figma');

      // Recall decisions
      const decisionRecall = await memory.recall('decided Material-UI');
      expect(decisionRecall.length).toBeGreaterThan(0);
      expect(decisionRecall[0].content).toContain('Material-UI');

      // Recall contact info
      const contactRecall = await memory.recall('contact alice');
      expect(contactRecall.length).toBeGreaterThan(0);
      expect(contactRecall[0].content).toContain('alice@company.com');

      // Verify pattern extractions worked
      const extractedPatterns = await memory.extractPatterns(userStory.join(' '));
      expect(extractedPatterns.length).toBeGreaterThan(0);

      const identityPatterns = extractedPatterns.filter(p =>
        p.pattern.includes('identity') || p.pattern.includes('name')
      );
      expect(identityPatterns.length).toBeGreaterThan(0);
    });

    it('should handle project development lifecycle', async () => {
      // Scenario: Software development project lifecycle
      const projectMemories = [
        {
          content: 'We decided to use React with TypeScript for the frontend.',
          type: 'procedural' as MemoryType,
          tags: ['decision', 'frontend', 'tech_stack'],
          importance: 0.9,
        },
        {
          content: 'The authentication system will use JWT tokens with 24-hour expiry.',
          type: 'semantic' as MemoryType,
          tags: ['auth', 'security', 'implementation'],
          importance: 0.8,
        },
        {
          content: 'Bug found: Memory leak in the user profile component.',
          type: 'episodic' as MemoryType,
          tags: ['bug', 'frontend', 'profile'],
          importance: 0.95,
        },
        {
          content: 'Fixed memory leak by properly cleaning up event listeners.',
          type: 'procedural' as MemoryType,
          tags: ['fix', 'frontend', 'profile'],
          importance: 0.85,
        },
        {
          content: 'Code review: ProfileComponent looks good, approved for merge.',
          type: 'episodic' as MemoryType,
          tags: ['review', 'approval', 'profile'],
          importance: 0.7,
        },
      ];

      // Store project memories
      const storedMemories = await Promise.all(
        projectMemories.map(mem => memory.store(mem))
      );

      expect(storedMemories).toHaveLength(5);

      // Query by project phase
      const decisions = await memory.query({
        tags: ['decision'],
        sortBy: 'importance',
        limit: 5,
      });
      expect(decisions.length).toBe(1);
      expect(decisions[0].content).toContain('React with TypeScript');

      // Query bug-related memories
      const bugs = await memory.query({
        tags: ['bug', 'fix'],
        sortBy: 'timestamp',
        limit: 5,
      });
      expect(bugs.length).toBe(2);

      // Query by importance (critical items first)
      const critical = await memory.query({
        sortBy: 'importance',
        sortOrder: 'desc',
        limit: 3,
      });
      expect(critical[0].importance).toBe(0.95); // Bug report should be highest

      // Test recall with context
      const authRecall = await memory.recall('JWT authentication tokens');
      expect(authRecall.length).toBeGreaterThan(0);
      expect(authRecall[0].content).toContain('JWT tokens');

      // Test composite recall
      const profileRecall = await memory.recall('profile component memory leak');
      expect(profileRecall.length).toBeGreaterThanOrEqual(2); // Should find bug and fix
    });

    it('should handle multi-user context simulation', async () => {
      // Scenario: Multiple team members contributing to memory system
      const teamMemories = [
        {
          content: 'John says: I prefer using Jest for unit testing.',
          type: 'episodic' as MemoryType,
          tags: ['preference', 'john', 'testing'],
          metadata: { author: 'john', context: 'team_meeting' },
          importance: 0.6,
        },
        {
          content: 'Sarah mentioned: We should migrate to TypeScript gradually.',
          type: 'procedural' as MemoryType,
          tags: ['strategy', 'sarah', 'typescript'],
          metadata: { author: 'sarah', context: 'planning' },
          importance: 0.8,
        },
        {
          content: 'Mike found: The API endpoint /users/{id} has performance issues.',
          type: 'episodic' as MemoryType,
          tags: ['issue', 'mike', 'api', 'performance'],
          metadata: { author: 'mike', context: 'debugging' },
          importance: 0.9,
        },
        {
          content: 'Alex implemented: Caching layer for user data endpoints.',
          type: 'procedural' as MemoryType,
          tags: ['implementation', 'alex', 'caching'],
          metadata: { author: 'alex', context: 'development' },
          importance: 0.85,
        },
      ];

      // Store team memories
      await Promise.all(teamMemories.map(mem => memory.store(mem)));

      // Query by team member
      const johnMemories = await memory.query({
        tags: ['john'],
        limit: 10,
      });
      expect(johnMemories.length).toBe(1);
      expect(johnMemories[0].content).toContain('John says');

      // Query by context
      const performanceIssues = await memory.query({
        tags: ['performance'],
        limit: 10,
      });
      expect(performanceIssues.length).toBeGreaterThan(0);

      // Cross-reference related memories
      const apiMemories = await memory.recall('API endpoint performance caching');
      expect(apiMemories.length).toBeGreaterThanOrEqual(2); // Issue and solution

      // Verify metadata preservation
      const mikeMemories = await memory.query({ tags: ['mike'], limit: 1 });
      expect(mikeMemories[0].metadata?.author).toBe('mike');
      expect(mikeMemories[0].metadata?.context).toBe('debugging');
    });

    it('should handle session management and persistence', async () => {
      // Store memories in first session
      const sessionOneMemories = [
        'My preferred IDE is VS Code with the Material Theme.',
        'I work on React applications using hooks and context.',
        'The project deadline is March 15th, 2024.',
      ];

      for (const content of sessionOneMemories) {
        await memory.store({
          type: 'semantic' as MemoryType,
          content,
          tags: ['session_one'],
          importance: 0.7,
        });
      }

      // Verify storage
      const sessionOneRecall = await memory.query({ tags: ['session_one'], limit: 10 });
      expect(sessionOneRecall).toHaveLength(3);

      // Simulate new session (reinitialize)
      const memory2 = new KuzuMemory({
        storage: 'memory',
        maxMemories: 1000,
      });
      await memory2.init();

      // Note: Memory adapter doesn't persist between instances
      // For real persistence tests, we'd use IndexedDB or localStorage

      // Store new memories in second session
      await memory2.store({
        type: 'episodic' as MemoryType,
        content: 'Session two: Started working on the authentication module.',
        tags: ['session_two'],
        importance: 0.8,
      });

      const sessionTwoRecall = await memory2.query({ tags: ['session_two'], limit: 10 });
      expect(sessionTwoRecall).toHaveLength(1);
    });

    it('should handle memory evolution and updates', async () => {
      // Initial memory
      const initialMemory = await memory.store({
        type: 'semantic' as MemoryType,
        content: 'React uses class components for state management.',
        tags: ['react', 'outdated'],
        importance: 0.6,
      });

      // Updated understanding
      const updatedMemory = await memory.store({
        type: 'semantic' as MemoryType,
        content: 'React now primarily uses functional components with hooks for state management.',
        tags: ['react', 'current'],
        importance: 0.9,
      });

      // Query current understanding
      const reactMemories = await memory.recall('React state management');
      expect(reactMemories.length).toBe(2);

      // Higher importance and recency should rank the updated memory higher
      expect(reactMemories[0].importance).toBeGreaterThan(reactMemories[1].importance);
      expect(reactMemories[0].content).toContain('hooks');

      // Access pattern should affect ranking
      await memory.access(updatedMemory.id);
      await memory.access(updatedMemory.id);

      const reactMemoriesAfterAccess = await memory.recall('React state management');
      expect(reactMemoriesAfterAccess[0].accessCount).toBeGreaterThan(1);
    });

    it('should handle event-driven workflows', async () => {
      const events: any[] = [];

      // Set up event listeners
      memory.on('memory:created', (event) => events.push(event));
      memory.on('memory:updated', (event) => events.push(event));
      memory.on('memory:accessed', (event) => events.push(event));

      // Perform operations that trigger events
      const created = await memory.store({
        type: 'episodic' as MemoryType,
        content: 'Testing event system',
        tags: ['events'],
        importance: 0.7,
      });

      const updated = await memory.update(created.id, {
        importance: 0.8,
        tags: ['events', 'updated'],
      });

      await memory.access(updated.id);

      // Verify events were triggered
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('memory:created');
      expect(events[1].type).toBe('memory:updated');
      expect(events[2].type).toBe('memory:accessed');

      // Verify event data
      expect(events[0].memory.id).toBe(created.id);
      expect(events[1].memory.importance).toBe(0.8);
      expect(events[1].previous.importance).toBe(0.7);
    });
  });

  describe('Real-World Use Cases', () => {
    let memory: KuzuMemory;

    beforeEach(async () => {
      memory = new KuzuMemory({
        storage: 'memory',
        maxMemories: 2000,
        decayEnabled: true,
      });
      await memory.init();
    });

    afterEach(async () => {
      if (memory) {
        await memory.clear();
      }
    });

    it('should handle developer knowledge base scenario', async () => {
      // Simulate building a developer knowledge base
      const knowledgeEntries = [
        {
          content: 'Redux pattern: Actions are dispatched to reducers to update state.',
          type: 'semantic' as MemoryType,
          tags: ['redux', 'pattern', 'state'],
          importance: 0.8,
        },
        {
          content: 'React performance: Use React.memo for component optimization.',
          type: 'procedural' as MemoryType,
          tags: ['react', 'performance', 'optimization'],
          importance: 0.9,
        },
        {
          content: 'TypeScript tip: Use union types for flexible APIs.',
          type: 'procedural' as MemoryType,
          tags: ['typescript', 'tips', 'api'],
          importance: 0.7,
        },
        {
          content: 'Bug fix: useState batching in React 18 affects multiple state updates.',
          type: 'episodic' as MemoryType,
          tags: ['react', 'bug', 'state', 'react18'],
          importance: 0.95,
        },
        {
          content: 'Best practice: Always use keys in React lists to prevent rendering issues.',
          type: 'procedural' as MemoryType,
          tags: ['react', 'best_practice', 'lists'],
          importance: 0.85,
        },
      ];

      await Promise.all(knowledgeEntries.map(entry => memory.store(entry)));

      // Search by technology
      const reactKnowledge = await memory.recall('React optimization performance');
      expect(reactKnowledge.length).toBeGreaterThan(0);
      expect(reactKnowledge[0].tags).toContain('react');

      // Search by problem type
      const bugFixes = await memory.query({
        tags: ['bug'],
        sortBy: 'importance',
        limit: 5,
      });
      expect(bugFixes.length).toBe(1);
      expect(bugFixes[0].content).toContain('useState batching');

      // Search by best practices
      const bestPractices = await memory.query({
        tags: ['best_practice'],
        limit: 10,
      });
      expect(bestPractices.length).toBe(1);

      // Complex query combining multiple aspects
      const reactOptimization = await memory.recall('React performance useState memo');
      expect(reactOptimization.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle customer support ticket system scenario', async () => {
      // Simulate customer support knowledge accumulation
      const supportMemories = [
        {
          content: 'Customer reported: Login fails after password reset, error 401.',
          type: 'episodic' as MemoryType,
          tags: ['support', 'login', 'password_reset', 'error'],
          metadata: { ticket_id: 'SUP-001', priority: 'high' },
          importance: 0.9,
        },
        {
          content: 'Solution: Clear browser cache and cookies, then retry login.',
          type: 'procedural' as MemoryType,
          tags: ['solution', 'login', 'browser_cache'],
          metadata: { resolves: 'SUP-001' },
          importance: 0.85,
        },
        {
          content: 'FAQ: How to update payment method? Go to Account > Billing > Payment Methods.',
          type: 'semantic' as MemoryType,
          tags: ['faq', 'payment', 'billing'],
          importance: 0.7,
        },
        {
          content: 'Known issue: API rate limiting causes intermittent 429 errors.',
          type: 'semantic' as MemoryType,
          tags: ['known_issue', 'api', 'rate_limiting'],
          metadata: { status: 'in_progress' },
          importance: 0.8,
        },
      ];

      await Promise.all(supportMemories.map(mem => memory.store(mem)));

      // Query for login issues
      const loginIssues = await memory.recall('login error 401 password');
      expect(loginIssues.length).toBeGreaterThan(0);
      expect(loginIssues[0].content).toContain('Login fails');

      // Find related solutions
      const loginSolutions = await memory.recall('login solution browser cache');
      expect(loginSolutions.length).toBeGreaterThan(0);
      expect(loginSolutions[0].content).toContain('Clear browser cache');

      // Query by priority
      const highPriority = await memory.query({
        sortBy: 'importance',
        sortOrder: 'desc',
        limit: 2,
      });
      expect(highPriority[0].importance).toBe(0.9);

      // Query FAQ items
      const faqItems = await memory.query({
        tags: ['faq'],
        limit: 10,
      });
      expect(faqItems.length).toBe(1);
      expect(faqItems[0].content).toContain('payment method');
    });

    it('should handle personal assistant scenario', async () => {
      // Simulate personal assistant learning user preferences and context
      const personalMemories = [
        {
          content: 'I have a dentist appointment on March 20th at 2:30 PM.',
          type: 'episodic' as MemoryType,
          tags: ['appointment', 'dentist', 'personal'],
          metadata: { date: '2024-03-20', time: '14:30' },
          importance: 0.8,
        },
        {
          content: 'I prefer coffee meetings at Blue Bottle Coffee on 5th Street.',
          type: 'semantic' as MemoryType,
          tags: ['preference', 'coffee', 'meetings', 'location'],
          importance: 0.7,
        },
        {
          content: 'My work schedule: Monday-Friday 9 AM to 6 PM, flexible lunch.',
          type: 'semantic' as MemoryType,
          tags: ['schedule', 'work', 'availability'],
          importance: 0.9,
        },
        {
          content: 'Project X deadline moved to April 15th due to client changes.',
          type: 'working' as MemoryType,
          tags: ['deadline', 'project_x', 'client'],
          metadata: { original_date: '2024-04-01', new_date: '2024-04-15' },
          importance: 0.95,
        },
      ];

      await Promise.all(personalMemories.map(mem => memory.store(mem)));

      // Query upcoming appointments
      const appointments = await memory.query({
        tags: ['appointment'],
        sortBy: 'importance',
        limit: 5,
      });
      expect(appointments.length).toBe(1);
      expect(appointments[0].content).toContain('dentist');

      // Query preferences for meeting planning
      const meetingPrefs = await memory.recall('coffee meetings location');
      expect(meetingPrefs.length).toBeGreaterThan(0);
      expect(meetingPrefs[0].content).toContain('Blue Bottle Coffee');

      // Query work availability
      const workSchedule = await memory.recall('work schedule availability');
      expect(workSchedule.length).toBeGreaterThan(0);
      expect(workSchedule[0].content).toContain('Monday-Friday');

      // Query project deadlines
      const deadlines = await memory.query({
        tags: ['deadline'],
        sortBy: 'importance',
        limit: 5,
      });
      expect(deadlines.length).toBe(1);
      expect(deadlines[0].metadata?.new_date).toBe('2024-04-15');
    });

    it('should handle learning progress tracking scenario', async () => {
      // Simulate educational progress tracking
      const learningMemories = [
        {
          content: 'Completed: Introduction to Machine Learning course on Coursera.',
          type: 'episodic' as MemoryType,
          tags: ['completed', 'course', 'ml', 'coursera'],
          metadata: { completion_date: '2024-01-15', rating: 4.5 },
          importance: 0.8,
        },
        {
          content: 'Learning goal: Master React hooks and context API by March.',
          type: 'working' as MemoryType,
          tags: ['goal', 'react', 'hooks', 'context'],
          metadata: { target_date: '2024-03-31', progress: 60 },
          importance: 0.9,
        },
        {
          content: 'Resource: "Clean Code" book - excellent for software design principles.',
          type: 'semantic' as MemoryType,
          tags: ['resource', 'book', 'clean_code', 'design'],
          importance: 0.7,
        },
        {
          content: 'Challenge: Need to practice algorithm problems for technical interviews.',
          type: 'working' as MemoryType,
          tags: ['challenge', 'algorithms', 'interviews'],
          metadata: { priority: 'high', weekly_target: 5 },
          importance: 0.85,
        },
      ];

      await Promise.all(learningMemories.map(mem => memory.store(mem)));

      // Query completed items
      const completed = await memory.query({
        tags: ['completed'],
        sortBy: 'timestamp',
        limit: 10,
      });
      expect(completed.length).toBe(1);
      expect(completed[0].content).toContain('Machine Learning');

      // Query current goals
      const goals = await memory.query({
        tags: ['goal'],
        sortBy: 'importance',
        limit: 5,
      });
      expect(goals.length).toBe(1);
      expect(goals[0].content).toContain('React hooks');

      // Query by learning area
      const reactLearning = await memory.recall('React hooks context learning');
      expect(reactLearning.length).toBeGreaterThan(0);

      // Query high-priority items
      const challenges = await memory.query({
        tags: ['challenge'],
        sortBy: 'importance',
        limit: 5,
      });
      expect(challenges.length).toBe(1);
      expect(challenges[0].metadata?.priority).toBe('high');
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect memory limits and pruning', async () => {
      const limitedMemory = new KuzuMemory({
        storage: 'memory',
        maxMemories: 5, // Very small limit for testing
        decayEnabled: true,
      });
      await limitedMemory.init();

      // Add more memories than the limit
      const memories = createMemoryBatch(10);
      for (const memData of memories) {
        await limitedMemory.store(memData);
      }

      // Verify memory limit is respected
      const stats = await limitedMemory.getStats();
      expect(stats.totalItems).toBeLessThanOrEqual(5);

      await limitedMemory.clear();
    });

    it('should handle different storage configurations', async () => {
      const storageTypes = ['memory', 'localStorage'] as const;

      for (const storageType of storageTypes) {
        const mem = new KuzuMemory({
          storage: storageType,
          dbName: `test-${storageType}`,
        });

        await mem.init();

        // Test basic operations
        const stored = await mem.store({
          type: 'semantic' as MemoryType,
          content: `Test memory for ${storageType}`,
          tags: [storageType],
          importance: 0.7,
        });

        expect(stored.id).toBeDefined();

        const retrieved = await mem.get(stored.id);
        expect(retrieved?.content).toBe(`Test memory for ${storageType}`);

        await mem.clear();
      }
    });

    it('should support custom recall strategies', async () => {
      // This would test custom recall strategy configuration
      const customMemory = new KuzuMemory({
        storage: 'memory',
        // Custom config would go here
      });

      await customMemory.init();

      // Store test memories
      await customMemory.store({
        type: 'semantic' as MemoryType,
        content: 'Custom strategy test',
        tags: ['custom'],
        importance: 0.8,
      });

      // Test recall (using default strategy for now)
      const results = await customMemory.recall('custom strategy');
      expect(results.length).toBeGreaterThan(0);

      await customMemory.clear();
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    let memory: KuzuMemory;

    beforeEach(async () => {
      memory = new KuzuMemory({ storage: 'memory' });
      await memory.init();
    });

    afterEach(async () => {
      if (memory) {
        await memory.clear();
      }
    });

    it('should handle corrupted memory gracefully', async () => {
      // Store a valid memory
      const validMemory = await memory.store({
        type: 'semantic' as MemoryType,
        content: 'Valid memory content',
        tags: ['valid'],
        importance: 0.7,
      });

      expect(validMemory.id).toBeDefined();

      // Test querying with invalid parameters
      await expect(memory.query({
        limit: -1, // Invalid limit
      } as any)).rejects.toThrow();

      // Test with null/undefined content
      await expect(memory.store({
        type: 'semantic' as MemoryType,
        content: null as any,
        tags: ['invalid'],
        importance: 0.5,
      })).rejects.toThrow();
    });

    it('should handle concurrent operations gracefully', async () => {
      // Create multiple concurrent store operations
      const concurrentStores = Array.from({ length: 20 }, (_, i) =>
        memory.store({
          type: 'semantic' as MemoryType,
          content: `Concurrent memory ${i}`,
          tags: ['concurrent'],
          importance: Math.random(),
        })
      );

      const results = await Promise.all(concurrentStores);
      expect(results).toHaveLength(20);

      // Verify all have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(20);

      // Test concurrent reads
      const concurrentReads = ids.map(id => memory.get(id));
      const readResults = await Promise.all(concurrentReads);

      expect(readResults.filter(r => r !== null)).toHaveLength(20);
    });

    it('should maintain data integrity during updates', async () => {
      const originalMemory = await memory.store({
        type: 'semantic' as MemoryType,
        content: 'Original content',
        tags: ['original'],
        importance: 0.5,
        accessCount: 1,
      });

      // Concurrent updates to same memory
      const updates = [
        memory.update(originalMemory.id, { importance: 0.8 }),
        memory.update(originalMemory.id, { tags: ['updated'] }),
        memory.update(originalMemory.id, { content: 'Updated content' }),
      ];

      const updateResults = await Promise.allSettled(updates);

      // At least one update should succeed
      const successful = updateResults.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const finalMemory = await memory.get(originalMemory.id);
      expect(finalMemory).not.toBeNull();
      expect(finalMemory!.id).toBe(originalMemory.id);
    });

    it('should handle memory cleanup and garbage collection', async () => {
      // Create many memories with high decay
      const decayingMemories = Array.from({ length: 50 }, (_, i) => ({
        type: 'working' as MemoryType,
        content: `Temporary memory ${i}`,
        tags: ['temporary'],
        importance: 0.3,
        decay: 0.8, // High decay rate
      }));

      await Promise.all(decayingMemories.map(mem => memory.store(mem)));

      const initialStats = await memory.getStats();
      expect(initialStats.totalItems).toBe(50);

      // Simulate time passing and decay process
      // (In real implementation, this would be handled by decay intervals)

      // For now, just verify the memories are stored
      const tempMemories = await memory.query({
        tags: ['temporary'],
        limit: 100,
      });
      expect(tempMemories.length).toBe(50);
    });
  });
});