const kuzu = require('kuzu');
const path = require('path');
const fs = require('fs');

async function testKuzu() {
  const dbPath = './.test-kuzu-debug';

  // Clean up any existing database
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }

  try {
    console.log('Creating database...');
    const db = new kuzu.Database(dbPath);
    const conn = new kuzu.Connection(db);

    console.log('Creating tables...');
    const createTableStmt = await conn.prepare(`
      CREATE NODE TABLE Memory (
        id STRING PRIMARY KEY,
        type STRING,
        content STRING,
        timestamp STRING,
        importance DOUBLE
      )
    `);
    await conn.execute(createTableStmt);

    const createRelTableStmt = await conn.prepare(`
      CREATE REL TABLE Related (
        FROM Memory TO Memory,
        type STRING,
        strength DOUBLE
      )
    `);
    await conn.execute(createRelTableStmt);

    console.log('Inserting data...');
    const insertStmt = await conn.prepare(`
      CREATE (m:Memory {
        id: $id,
        type: $type,
        content: $content,
        timestamp: $timestamp,
        importance: $importance
      })
    `);

    await conn.execute(insertStmt, {
      id: '123',
      type: 'test',
      content: 'Test content',
      timestamp: new Date().toISOString(),
      importance: 0.5
    });

    console.log('Querying data with OPTIONAL MATCH...');
    const queryStmt = await conn.prepare(`
      MATCH (m:Memory {id: $id})
      OPTIONAL MATCH (m)-[r:Related]->(related:Memory)
      RETURN m, COLLECT({targetId: related.id, type: r.type, strength: r.strength}) AS relations
    `);
    const result = await conn.execute(queryStmt, { id: '123' });
    const rows = await result.getAll();

    console.log('Full rows:', JSON.stringify(rows, null, 2));
    console.log('First row:', rows[0]);
    console.log('Row[0][0]:', rows[0][0]);
    console.log('Row[0][1]:', rows[0][1]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
    }
  }
}

testKuzu();