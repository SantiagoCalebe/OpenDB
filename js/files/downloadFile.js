export function fileStem(name) {
  return name.replace(/\.[^.]+$/, '') || 'database';
}

export function downloadFile(data, mime, filename) {
  const blob = new Blob([data], {type:mime});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
