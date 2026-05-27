require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { pool, query } = require("../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

function log(message) {
  console.log(`[Migrations] ${message}`);
}

function logError(message) {
  console.error(`[Migrations] ${message}`);
}

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedFilenames() {
  const result = await query("SELECT filename FROM schema_migrations ORDER BY filename");
  return new Set(result.rows.map((row) => row.filename));
}

function getSqlFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations folder not found: ${MIGRATIONS_DIR}`);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

async function runMigrations() {
  log("Starting migration runner...");

  const files = getSqlFiles();

  if (files.length === 0) {
    log("No .sql files found in migrations/. Nothing to run.");
    return;
  }

  log(`Found ${files.length} SQL file(s) (alphabetical order).`);

  await ensureMigrationsTable();
  const applied = await getAppliedFilenames();

  const client = await pool.connect();

  try {
    for (const file of files) {
      if (applied.has(file)) {
        log(`Skipped (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, "utf8").trim();

      if (!sql) {
        log(`Skipped (empty file): ${file}`);
        continue;
      }

      log(`Applying: ${file}`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        log(`Applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    log("All migrations completed successfully.");
  } finally {
    client.release();
  }
}

runMigrations()
  .catch((error) => {
    logError(`FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    log("Database pool closed.");
  });
