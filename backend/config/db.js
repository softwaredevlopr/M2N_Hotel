const { Pool } = require("pg");

function parseBool(value) {
  return value === "true" || value === "1";
}

function shouldUseSslForDatabaseUrl(databaseUrl) {
  if (parseBool(process.env.DB_SSL)) return true;
  if (process.env.NODE_ENV === "production") return true;
  if (databaseUrl && /sslmode=require/i.test(databaseUrl)) return true;
  return false;
}

function buildPoolConfig() {
  const sharedSettings = {
    max: Number(process.env.DB_POOL_MAX) || 20,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 5000,
  };

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    const useSsl = shouldUseSslForDatabaseUrl(databaseUrl);
    return {
      ...sharedSettings,
      connectionString: databaseUrl,
      ssl: useSsl
        ? { rejectUnauthorized: parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED) }
        : false,
    };
  }

  return {
    ...sharedSettings,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: parseBool(process.env.DB_SSL)
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
      : false,
  };
}

const pool = new Pool(buildPoolConfig());

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT NOW() AS server_time");
    return result.rows[0];
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testConnection,
};
