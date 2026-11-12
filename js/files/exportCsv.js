import {downloadFile, fileStem} from './downloadFile.js';

export function exportCsv(result, name) {
  function cell(value) {
    let text = value == null ? '' : String(value);
    // Spreadsheet apps interpret some leading characters as formulas.
    if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@-]/.test(text) && !/^-?\d+(?:\.\d+)?$/.test(text)) {
      text = "'" + text;
    }
    return '"' + text.replaceAll('"', '""') + '"';
  }
  const csv = '\uFEFF' + [result.columns,...result.rows].map(row => row.map(cell).join(';')).join('\r\n');
  downloadFile(csv, 'text/csv;charset=utf-8', fileStem(name) + '_query.csv');
}
