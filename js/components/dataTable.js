// dataTable.js — generic sortable/filterable table (design 6 preamble).
// Supports:
//   - column sorting on header click (asc/desc toggle)
//   - structured per-column filters (select / text) declared per column
//   - opt-in searchable:true: a case-insensitive substring text filter across
//     ALL visible columns that COMPOSES with the structured filters (search
//     narrows the already-filtered set).
// Horizontally scrollable inside its card at narrow viewports (.table-scroll)
// so a wide table never causes page-level overflow (AC-8).
//
// Presentational: receives rows + column defs + optional callbacks; it never
// fetches. The owning page supplies already-loaded rows.
//
// Column def: {
//   key:   string            // property on each row (also used for sort/search)
//   label: string            // header text
//   sortable: boolean=true
//   render: (row) => string  // optional cell HTML (defaults to escaped value)
//   sortValue: (row) => any  // optional sort key (defaults to row[key])
//   searchText: (row) => string // optional searchable text (defaults to row[key])
//   filter: 'select' | 'text' | undefined   // structured filter control
//   filterOptions: [{value,label}]          // for 'select'
//   filterMatch: (row, value) => boolean     // optional custom match
// }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function createDataTable(opts = {}) {
  const columns = opts.columns || [];
  let rows = Array.isArray(opts.rows) ? opts.rows.slice() : [];
  const searchable = opts.searchable === true;
  const caption = opts.caption || null;

  let sortKey = opts.initialSortKey || null;
  let sortDir = opts.initialSortDir === 'desc' ? 'desc' : 'asc';
  const filterState = {}; // columnKey -> current filter value ('' = all)
  let searchTerm = '';

  const root = document.createElement('div');
  root.className = 'data-table-wrap';

  // ----- controls (search + structured filters) -----
  const structuredCols = columns.filter((c) => c.filter === 'select' || c.filter === 'text');
  if (searchable || structuredCols.length) {
    const controls = document.createElement('div');
    controls.className = 'dt-controls';

    if (searchable) {
      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'dt-search';
      search.placeholder = opts.searchPlaceholder || 'Search…';
      search.setAttribute('aria-label', 'Search table');
      search.addEventListener('input', () => {
        searchTerm = search.value.trim().toLowerCase();
        renderBody();
      });
      controls.appendChild(search);
    }

    for (const col of structuredCols) {
      filterState[col.key] = '';
      if (col.filter === 'select') {
        const sel = document.createElement('select');
        sel.className = 'dt-filter';
        sel.setAttribute('aria-label', `Filter by ${col.label}`);
        const optsList = [{ value: '', label: `All ${col.label}` }].concat(col.filterOptions || []);
        sel.innerHTML = optsList
          .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
          .join('');
        sel.addEventListener('change', () => { filterState[col.key] = sel.value; renderBody(); });
        controls.appendChild(sel);
      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'dt-filter';
        inp.placeholder = col.label;
        inp.setAttribute('aria-label', `Filter by ${col.label}`);
        inp.addEventListener('input', () => { filterState[col.key] = inp.value.trim().toLowerCase(); renderBody(); });
        controls.appendChild(inp);
      }
    }
    root.appendChild(controls);
  }

  // ----- table scaffold -----
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  const table = document.createElement('table');
  table.className = 'data-table';
  if (caption) {
    const cap = document.createElement('caption');
    cap.className = 'dt-caption';
    cap.textContent = caption;
    table.appendChild(cap);
  }
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  columns.forEach((col) => {
    const th = document.createElement('th');
    const sortable = col.sortable !== false;
    th.textContent = col.label;
    if (sortable) {
      th.classList.add('is-sortable');
      th.setAttribute('role', 'button');
      th.tabIndex = 0;
      th.setAttribute('aria-label', `Sort by ${col.label}`);
      const activate = () => toggleSort(col.key);
      th.addEventListener('click', activate);
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    }
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  scroll.appendChild(table);
  root.appendChild(scroll);

  function toggleSort(key) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
    renderHeaderIndicators();
    renderBody();
  }

  function renderHeaderIndicators() {
    const ths = headRow.querySelectorAll('th');
    columns.forEach((col, i) => {
      const th = ths[i];
      th.classList.remove('is-sorted-asc', 'is-sorted-desc');
      if (col.key === sortKey) {
        th.classList.add(sortDir === 'asc' ? 'is-sorted-asc' : 'is-sorted-desc');
      }
    });
  }

  function colSearchText(col, row) {
    if (typeof col.searchText === 'function') return String(col.searchText(row) || '');
    const v = row[col.key];
    return v == null ? '' : String(v);
  }

  function passesStructured(row) {
    for (const col of structuredCols) {
      const val = filterState[col.key];
      if (!val) continue;
      if (typeof col.filterMatch === 'function') {
        if (!col.filterMatch(row, val)) return false;
      } else if (col.filter === 'select') {
        if (String(row[col.key]) !== String(val)) return false;
      } else { // text
        if (!String(row[col.key] == null ? '' : row[col.key]).toLowerCase().includes(val)) return false;
      }
    }
    return true;
  }

  function passesSearch(row) {
    if (!searchable || !searchTerm) return true;
    // Case-insensitive substring across all visible columns.
    return columns.some((col) => colSearchText(col, row).toLowerCase().includes(searchTerm));
  }

  function sortRows(list) {
    if (!sortKey) return list;
    const col = columns.find((c) => c.key === sortKey);
    const getVal = col && typeof col.sortValue === 'function'
      ? col.sortValue
      : (row) => row[sortKey];
    const dir = sortDir === 'asc' ? 1 : -1;
    return list.slice().sort((ra, rb) => {
      const a = getVal(ra);
      const b = getVal(rb);
      if (a == null && b == null) return 0;
      if (a == null) return 1;   // nulls sort last
      if (b == null) return -1;
      if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
      return String(a).localeCompare(String(b), undefined, { numeric: true }) * dir;
    });
  }

  function renderBody() {
    // Structured filters first, then search composes on the narrowed set.
    const filtered = rows.filter((row) => passesStructured(row) && passesSearch(row));
    const ordered = sortRows(filtered);
    tbody.innerHTML = '';
    if (!ordered.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.className = 'dt-empty';
      td.colSpan = columns.length;
      td.textContent = opts.emptyText || 'No matching rows.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    for (const row of ordered) {
      const tr = document.createElement('tr');
      if (typeof opts.onRowClick === 'function') {
        tr.classList.add('is-clickable');
        tr.tabIndex = 0;
        tr.addEventListener('click', () => opts.onRowClick(row));
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); opts.onRowClick(row); }
        });
      }
      for (const col of columns) {
        const td = document.createElement('td');
        if (typeof col.render === 'function') td.innerHTML = col.render(row);
        else td.textContent = row[col.key] == null ? '' : String(row[col.key]);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  // Replace the row set and re-render (used when a page re-queries).
  function setRows(next) {
    rows = Array.isArray(next) ? next.slice() : [];
    renderBody();
  }

  renderHeaderIndicators();
  renderBody();

  return { el: root, setRows };
}
