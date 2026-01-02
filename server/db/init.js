import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize SQLite database with schema
 * @param {string} dbPath - Path to database file
 * @returns {Database} - Database instance
 */
export function initDatabase(dbPath) {
  console.log(`[DB] Initializing database at ${dbPath}`);

  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Read and execute schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Execute schema (split by statement for better error messages)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('PRAGMA'));

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (err) {
      console.error(`[DB] Error executing statement: ${statement.substring(0, 100)}...`);
      throw err;
    }
  }

  console.log('[DB] Database initialized successfully');
  return db;
}

/**
 * Close database connection
 * @param {Database} db - Database instance
 */
export function closeDatabase(db) {
  db.close();
  console.log('[DB] Database connection closed');
}
