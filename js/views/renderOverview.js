export function formatFileSize(bytes) {
  if (bytes === undefined) return '—';
  const unit = bytes < 1024 ? 'B' : bytes < 1024 ** 2 ? 'KB' : 'MB';
  const value = bytes / (unit === 'B' ? 1 : unit === 'KB' ? 1024 : 1024 ** 2);
  return value.toLocaleString('en-US', {maximumFractionDigits:1}) + ' ' + unit;
}

export function renderOverview(getElement, file) {
  const label = getElement('filename');
  label.textContent = file ? file.name + (file.dirty ? ' *' : '') : 'no file';
  label.title = file?.dirty ? file.name + ' — unsaved changes' : (file?.name || '');
  label.dataset.dirty = String(!!file?.dirty);
  getElement('file-name').textContent = file?.name || '—';
  getElement('file-kind').textContent = file ? (file.textImport ? 'Text records' : 'SQLite ' + file.version) : '—';
  getElement('file-size').textContent = formatFileSize(file?.savedBytes?.byteLength ?? file?.source?.size);
  getElement('file-tables').textContent = file ? String(file.tables.length) : '—';
  getElement('file-state').textContent = file ? (file.dirty ? 'unsaved changes' : 'working copy') : '—';
}
