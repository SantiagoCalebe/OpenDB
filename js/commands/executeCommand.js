import {commandReference} from './commandReference.js';
import {formatFileSize} from '../views/renderOverview.js';
import {downloadFile,fileStem} from '../files/downloadFile.js';
import {exportCsv} from '../files/exportCsv.js';

export function createCommandExecutor({session,view,tabs,history,fileInput}) {
  function error(section, problem) {
    view.show(section, 'Error: ' + problem, 'error');
  }

  function renderQuery(section, result, name) {
    for (const payload of result.results) {
      view.result(section, payload, () => {
        exportCsv(payload, name);
        view.status('CSV download started · ' + payload.rows.length + ' rows');
      });
    }
    if (result.error) error(section, result.error);
    if (!result.results.length || result.changes || result.error) {
      view.show(section, result.statements + ' statement(s) completed · ' + result.changes + ' row change(s).');
    }
    view.status(result.error ? 'SQL error' : 'Ready');
  }

  async function openFile(source, origin = 'open') {
    if (!session.state.ready || session.state.busy) return;
    const name = source?.name || (origin === 'demo' ? 'sample.db' : 'untitled.db');
    tabs.show('sql');
    if (source?.size > 128 * 1024 * 1024) {
      error(view.entry('.open ' + name), 'The file limit is 128 MB.');
      return;
    }
    if (!session.canReplace()) return;
    const section = view.entry(origin === 'open' ? '.open ' + name : '.' + origin);
    try {
      const file = await session.open({origin,source,name});
      view.resetResult();
      const info = file.textImport;
      if (info) {
        view.show(section, info.imported + ' records imported into pessoas.', 'success');
        if (info.skipped) {
          const remaining = info.skipped > info.rejectedLines.length ? ', …' : '';
          error(section, info.skipped + ' invalid line(s) skipped: ' + info.rejectedLines.join(', ') + remaining + '.');
        }
      } else {
        view.show(section, 'SQLite ' + file.version + ' · ' + file.tables.length + ' tables and views.', 'success');
      }
      view.status('Working copy opened. Use .save to download changes.');
      if (info?.imported) await execute('SELECT * FROM pessoas LIMIT 50;');
      else if (origin === 'demo') await execute('SELECT * FROM order_summary;');
    } catch (problem) {
      error(section, problem.message);
      if (!problem.cancelled) view.status('Could not open the database.');
    } finally {
      tabs.focus('sql');
    }
  }

  async function execute(raw) {
    const text = raw.trim();
    if (!text || session.state.busy || !session.state.ready) return;
    history.remember(text);
    const verb = text.split(/\s/)[0].toLowerCase();
    const argument = text.slice(verb.length).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (verb === '.open') { fileInput.click(); return; }
    if (verb === '.new' || verb === '.demo') { await openFile(null, verb.slice(1)); return; }

    tabs.show('sql');
    if (verb === '.clear' || verb === 'clear') {
      view.clear();
      tabs.focus('sql');
      return;
    }
    const section = view.entry(text);
    if (verb === '.help' || verb === 'help') { view.show(section, commandReference); return; }
    if (verb === '.history') { view.show(section, history.lines()); return; }
    if (verb === '.export') {
      view.show(section, view.exportLast() ? 'CSV download started.' : 'Run a query that returns rows first.');
      return;
    }

    const file = session.state.current;
    if (!file) {
      error(section, 'Use .new, .open, or .demo to start a database.');
      return;
    }
    if (verb === '.info') {
      const size = formatFileSize(file.savedBytes?.byteLength ?? file.source?.size);
      view.show(section, [
        file.name, 'SQLite ' + file.version, 'Size: ' + size,
        file.dirty ? 'Unsaved changes' : 'Working copy'
      ].join('\n'));
      return;
    }
    if (verb === '.tables') {
      const list = file.tables.map(({schema,name,type}) =>
        (schema === 'main' ? name : schema + '.' + name) + ' [' + type + ']');
      view.show(section, list.join('\n') || 'No tables or views.');
      return;
    }

    try {
      if (verb === '.close') {
        if (!session.canReplace()) return;
        await session.close();
        view.resetResult();
        view.show(section, 'Database closed.', 'success');
        view.status('Ready');
      } else if (verb === '.schema') {
        view.show(section, await session.schema(argument) || 'No matching schema objects.');
        view.status('Ready');
      } else if (verb === '.save') {
        let name = argument || fileStem(file.name) + '_copy.db';
        if (!/\.(db|db3|sqlite|sqlite3)$/i.test(name)) name += '.db';
        const bytes = await session.save();
        downloadFile(bytes, 'application/vnd.sqlite3', name);
        view.show(section, 'Database copy download started: ' + name, 'success');
        view.status('Saved working copy');
      } else if (verb.startsWith('.')) {
        error(section, 'Unknown command. Use .help for the command list.');
      } else {
        renderQuery(section, await session.query(text), file.name);
      }
    } catch (problem) {
      error(section, problem.message);
      if (!problem.cancelled) view.status('Operation failed.');
    } finally {
      if (!session.state.busy && tabs.isActive('sql')) tabs.focus('sql');
    }
  }

  return {execute,openFile};
}
