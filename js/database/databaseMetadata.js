function quoteIdentifier(name) {
  return '"' + name.replaceAll('"', '""') + '"';
}

function schemas(db) {
  return (db.exec('PRAGMA database_list')[0]?.values || []).map(([,name]) => name);
}

export function listTables(db) {
  return schemas(db).flatMap(schema => {
    const sql = 'SELECT name, type FROM ' + quoteIdentifier(schema) +
      ".sqlite_schema WHERE type IN ('table','view') AND name NOT GLOB 'sqlite_*' ORDER BY type, name";
    return (db.exec(sql)[0]?.values || []).map(([name,type]) => ({schema,name,type}));
  });
}

export function summarizeDatabase(db) {
  return {
    tables: listTables(db),
    version: db.exec('SELECT sqlite_version()')[0].values[0][0]
  };
}

export function describeSchema(db, filter = '') {
  return schemas(db).flatMap(schema => {
    const sql = 'SELECT name, sql FROM ' + quoteIdentifier(schema) +
      ".sqlite_schema WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*' ORDER BY type, name";
    return (db.exec(sql)[0]?.values || [])
      .filter(([name]) => !filter || name === filter || schema + '.' + name === filter)
      .map(([,definition]) => (schema === 'main' ? '' : '-- ' + schema + '\n') + definition + ';');
  }).join('\n\n');
}
