export function renderResults(section, result, exportResult, show) {
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(result.rows.length / pageSize));
  let page = 0;
  const output = document.createElement('div');
  output.className = 'result';
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.tabIndex = 0;
  grid.setAttribute('role', 'region');
  grid.setAttribute('aria-label', 'Query results');
  const table = document.createElement('table');
  table.className = 'data-table';
  const heading = table.createTHead().insertRow();
  for (const column of result.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column;
    heading.append(th);
  }
  const body = table.createTBody();
  grid.append(table);

  const controls = document.createElement('div');
  controls.className = 'pagination';
  const range = document.createElement('span');
  const previous = document.createElement('button');
  previous.textContent = '[Previous]';
  const next = document.createElement('button');
  next.textContent = '[Next]';
  const csv = document.createElement('button');
  csv.textContent = '[Export CSV]';
  csv.onclick = exportResult;
  controls.append(range, previous, next, csv);
  output.append(grid, controls);
  section.append(output);

  function draw() {
    body.replaceChildren();
    const start = page * pageSize;
    const end = Math.min(start + pageSize, result.rows.length);
    for (const row of result.rows.slice(start, end)) {
      const tr = body.insertRow();
      for (const value of row) {
        const td = tr.insertCell();
        td.textContent = value === null ? 'NULL' : String(value);
        if (value === null) td.className = 'null';
      }
    }
    range.textContent = end ? (start + 1) + '–' + end + ' of ' + result.rows.length + ' rows' : 'No rows';
    previous.disabled = page === 0;
    next.disabled = page >= totalPages - 1;
    previous.hidden = next.hidden = totalPages === 1;
    grid.scrollTop = 0;
  }
  previous.onclick = () => { page--; draw(); };
  next.onclick = () => { page++; draw(); };
  draw();
  if (result.truncated) show(section, 'Preview limit reached. Use LIMIT and OFFSET to continue.');
  if (result.abbreviated) show(section, 'BLOBs and long text are abbreviated in the preview and CSV.');
}

