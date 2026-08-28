const postgres = require('postgres');

let sql;
try {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && connectionString.trim() !== '') {
    sql = postgres(connectionString);
  } else {
    // In-memory / mock fallback when no database connection string is provided
    sql = () => Promise.resolve([]);
  }
} catch (err) {
  console.warn('[AI Studio] PostgreSQL not connected — using fallback mock');
  sql = () => Promise.resolve([]);
}

module.exports = sql;

