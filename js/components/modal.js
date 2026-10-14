// modal.js — accessible dialog (design 6.4). Provides a focus trap,
// Escape-to-close, scrim-click-to-close, and focus return to the trigger.
// Used for alarm detail and confirmations.
//
// openModal({ title, body, actions, onClose }) -> { close }
//   title   : heading text
//   body    : an Element OR an HTML string for the dialog content
//   actions : optional array of { label, variant, onClick, closeOnClick }
//   onClose : optional callback fired after close

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function openModal(opts = {}) {
  const trigger = document.activeElement; // return focus here on close
  const titleId = 'modal-title-' + Math.random().toString(36).slice(2, 8);

  const scrim = document.createElement('div');
  scrim.className = 'modal-scrim';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', titleId);

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML =
    `<h2 class="modal-title" id="${titleId}">${escapeHtml(opts.title || '')}</h2>` +
    '<button type="button" class="modal-close" aria-label="Close dialog">\u00D7</button>';

  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (opts.body instanceof Node) bodyEl.appendChild(opts.body);
  else bodyEl.innerHTML = opts.body || '';

  dialog.appendChild(header);
  dialog.appendChild(bodyEl);

  if (Array.isArray(opts.actions) && opts.actions.length) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    opts.actions.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (a.variant ? ' btn-' + a.variant : '');
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        if (typeof a.onClick === 'function') a.onClick();
        if (a.closeOnClick !== false) close();
      });
      footer.appendChild(btn);
    });
    dialog.appendChild(footer);
  }

  scrim.appendChild(dialog);
  document.body.appendChild(scrim);

  function getFocusable() {
    return Array.prototype.slice.call(dialog.querySelectorAll(FOCUSABLE))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const items = getFocusable();
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  function onScrimClick(e) {
    if (e.target === scrim) close(); // scrim click (outside dialog) closes
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown, true);
    scrim.removeEventListener('mousedown', onScrimClick);
    if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
    // Return focus to the triggering element.
    if (trigger && typeof trigger.focus === 'function') trigger.focus();
    if (typeof opts.onClose === 'function') opts.onClose();
  }

  header.querySelector('.modal-close').addEventListener('click', close);
  scrim.addEventListener('mousedown', onScrimClick);
  document.addEventListener('keydown', onKeydown, true);

  // Initial focus: first focusable inside the dialog, else the close button.
  const focusables = getFocusable();
  (focusables[0] || header.querySelector('.modal-close')).focus();

  return { close, el: dialog };
}
