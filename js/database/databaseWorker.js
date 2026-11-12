import initSqlJs from '../vendor/sqlEngine.js';
import {summarizeDatabase, describeSchema} from './databaseMetadata.js';
import {importTextRecords} from './importTextRecords.js';
import {loadDemo} from './loadDemo.js';
import {runSql} from './runSql.js';
import {saveDatabase} from './saveDatabase.js';

let database;
let dirty = false;
const ready = initSqlJs({useOldExtensionFunctions:false});

function openDatabase(SQL, op, data) {
  const bytes = op === 'open' ? new Uint8Array(data) : null;
  const isSQLite = bytes && bytes.length >= 100 &&
    String.fromCharCode(...bytes.subarray(0,16)) === 'SQLite format 3\0';
  const next = new SQL.Database(isSQLite ? bytes : undefined);
  try {
    next.run('PRAGMA trusted_schema=OFF');
    const textImport = bytes && !isSQLite ? importTextRecords(next, bytes) : null;
    if (op === 'demo') loadDemo(next);
    // Create the SQLite header even before the first table is created.
    if (op === 'new') next.run('PRAGMA user_version=0');
    const result = {...summarizeDatabase(next), textImport};
    database?.close();
    database = next;
    dirty = false;
    return result;
  } catch (error) {
    next.close();
    throw error;
  }
}

self.onmessage = async ({data:{id,op,data}}) => {
  try {
    const SQL = await ready;
    let result;
    if (op === 'ready') result = true;
    else if (['open','demo','new'].includes(op)) result = openDatabase(SQL, op, data);
    else if (op === 'close') {
      database?.close();
      database = null;
      dirty = false;
      result = true;
    } else {
      if (!database) throw Error('Use .new, .open, or .demo to start a database.');
      if (op === 'query') {
        result = runSql(database, data, dirty);
        dirty = result.dirty;
      } else if (op === 'save') {
        result = saveDatabase(database);
        dirty = false;
      } else if (op === 'schema') result = describeSchema(database, data);
      else throw Error('Unknown database operation.');
    }
    self.postMessage({id,result}, result instanceof Uint8Array ? [result.buffer] : []);
  } catch (error) {
    self.postMessage({id,error:error.message || String(error)});
  }
};
