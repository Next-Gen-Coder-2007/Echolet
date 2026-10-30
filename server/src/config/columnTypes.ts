import 'dotenv/config';

/**
 * Helper to determine the appropriate date/time column type based on the active database driver.
 * PostgreSQL requires 'timestamp', while SQLite requires 'datetime'.
 */
export const getDateColumnType = (): 'timestamp' | 'datetime' => {
  const dbUrl = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  ).trim();

  const isPostgres =
    dbUrl.startsWith('postgres://') ||
    dbUrl.startsWith('postgresql://') ||
    Boolean(process.env.VERCEL);

  return isPostgres ? 'timestamp' : 'datetime';
};
