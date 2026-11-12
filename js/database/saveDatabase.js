export function saveDatabase(database) {
  // BEGIN fails inside a transaction or savepoint; the user's transaction stays open.
  try {
    database.run('BEGIN');
  } catch (error) {
    if (/within a transaction/i.test(error.message)) throw Error('Commit or roll back the active transaction before saving.');
    throw error;
  }
  database.run('ROLLBACK');
  const checkpoint = database.exec('PRAGMA main.wal_checkpoint(TRUNCATE)')[0]?.values[0];
  if (checkpoint?.[0]) throw Error('The database is busy. Try saving again after the operation finishes.');
  const bytes = database.copyMainBytes();
  return bytes;
}

