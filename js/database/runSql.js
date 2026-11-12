import {listTables} from './databaseMetadata.js';

function isReadStatement(statement) {
  const sql = statement.getNormalizedSQL() || '';
  if (/^(SELECT|VALUES)\b/i.test(sql)) return true;
  if (/^EXPLAIN\b/i.test(sql)) return !/\bPRAGMA\b/i.test(sql);
  if (!/^WITH\b/i.test(sql)) return false;

  // Classify CTE statements only for preview limits and the unsaved indicator.
  // SQLite, rather than this classification, decides what SQL can run.
  let depth = 0;
  const tokens = /"(?:""|[^"])*"|\x60(?:\x60\x60|[^\x60])*\x60|\[[^\]]*\]|[()]|\b(?:SELECT|VALUES|INSERT|REPLACE|UPDATE|DELETE)\b/gi;
  for (const [token] of sql.matchAll(tokens)) {
    if (token === '(') depth++;
    else if (token === ')') depth--;
    else if (depth === 0 && /^[a-z]/i.test(token)) return /^(SELECT|VALUES)$/i.test(token);
  }
  return false;
}

export function runSql(database, sql, dirty) {
  const results = [];
  const changesBefore = database.exec('SELECT total_changes()')[0].values[0][0];
  let cells = 0, chars = 0, statements = 0, error = '';
  try {
    for (const statement of database.iterateStatements(sql)) {
      const readOnly = isReadStatement(statement);
      if (!readOnly) dirty = true;
      const columns = statement.getColumnNames();
      const rows = [];
      let truncated = false, abbreviated = false;
      while (statement.step()) {
        if (rows.length >= 1000 || cells + columns.length > 30000 || chars >= 4000000) {
          truncated = true;
          // Run writable statements to completion, including RETURNING cursors.
          if (readOnly) break;
          continue;
        }
        const row = statement.get(null, {useBigInt:true}).map(value => {
          if (typeof value === 'bigint') return value.toString();
          if (value instanceof Uint8Array) {
            abbreviated = true;
            return '[BLOB: ' + value.length + ' bytes] ' + Array.from(value.slice(0,32), byte => byte.toString(16).padStart(2,'0')).join('');
          }
          if (typeof value === 'string') {
            if (value.length > 20000) {
              value = value.slice(0,20000) + '…';
              abbreviated = true;
            }
            chars += value.length;
          }
          return value;
        });
        cells += columns.length;
        rows.push(row);
      }
      if (columns.length) results.push({columns,rows,truncated,abbreviated});
      statements++;
    }
  } catch (problem) {
    error = problem.message || String(problem);
  }

  let tables = null;
  try {
    tables = listTables(database);
  } catch (problem) {
    if (!error) error = problem.message || String(problem);
  }
  const changes = database.exec('SELECT total_changes()')[0].values[0][0] - changesBefore;
  return {results, statements, changes, tables, dirty, error};
}

