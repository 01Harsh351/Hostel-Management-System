import { getCurrentSession, getLiveNotifications, logoutUser, performGlobalSearch, syncCurrentUser } from './api.js';

export const ICONS = {
  building:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
  bed:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>',
  door:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>',
  clipboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
  wrench:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  user:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  chart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  logout:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  menu:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  alert:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
  refresh:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  bell:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  chevronDown:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  ticketList:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
};

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatShortId(id, prefix = '#') {
  const s = String(id || '').trim();
  if (!s) return '—';
  if (/^[a-f0-9]{24}$/i.test(s)) {
    return `${prefix}${s.slice(-6).toUpperCase()}`;
  }
  return s;
}

export function getInitials(name) {
  const parts = String(name || 'US').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function renderStatusTag(status) {
  const s = String(status || '').trim();
  let cls = 'status-neutral';
  if (['Available', 'Approved', 'Allocated', 'Resolved'].includes(s)) {
    cls = 'status-success';
  } else if (['Pending', 'Pending Review'].includes(s)) {
    cls = 'status-warning';
  } else if (['Full', 'Rejected', 'Unallocated'].includes(s)) {
    cls = s === 'Unallocated' ? 'status-neutral' : 'status-danger';
  } else if (['Boys', 'Girls'].includes(s)) {
    cls = 'status-info';
  }
  return `<span class="status-tag ${cls}">${escapeHtml(s)}</span>`;
}

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;
  item.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button type="button" class="modal-close-btn" aria-label="Dismiss notification" style="color:#fff;width:26px;height:26px;">
      ${ICONS.close}
    </button>
  `;
  const closeBtn = item.querySelector('button');
  closeBtn.addEventListener('click', () => item.remove());
  container.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

export function clearFormErrors(form) {
  if (!form) return;
  form.querySelectorAll('.is-invalid').forEach((el) => {
    el.classList.remove('is-invalid');
    el.setAttribute('aria-invalid', 'false');
  });
  form.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

export function applyFormErrors(form, errors = {}) {
  clearFormErrors(form);
  let firstInvalid = null;
  for (const [field, msg] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${field}"]`);
    const errEl = form.querySelector(`[data-error-for="${field}"]`);
    if (input) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (!firstInvalid) firstInvalid = input;
    }
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.add('visible');
    }
  }
  if (firstInvalid) firstInvalid.focus();
}

export function openConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'btn-primary',
  showNoteInput = false,
  noteLabel = 'Administrative Note (optional)',
  notePlaceholder = 'Enter reason or remarks...',
}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('global-confirm-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'global-confirm-modal';
    backdrop.className = 'modal-backdrop open';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'confirm-modal-title');

    backdrop.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 id="confirm-modal-title" class="modal-title">${escapeHtml(title)}</h2>
          <button type="button" class="modal-close-btn" data-action="cancel" aria-label="Close confirmation dialog">
            ${ICONS.close}
          </button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); font-size: 0.9375rem;">${escapeHtml(message)}</p>
          ${
            showNoteInput
              ? `<div class="form-group">
                   <label for="confirm-modal-note" class="form-label">${escapeHtml(noteLabel)}</label>
                   <textarea id="confirm-modal-note" class="form-control" placeholder="${escapeHtml(notePlaceholder)}" style="min-height:80px;"></textarea>
                 </div>`
              : ''
          }
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button type="button" class="btn ${confirmVariant}" data-action="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const cleanup = (result) => {
      backdrop.remove();
      resolve(result);
    };

    backdrop.querySelectorAll('[data-action="cancel"]').forEach((btn) =>
      btn.addEventListener('click', () => cleanup({ confirmed: false, note: '' }))
    );

    backdrop.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      const noteEl = backdrop.querySelector('#confirm-modal-note');
      cleanup({ confirmed: true, note: noteEl ? noteEl.value.trim() : '' });
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup({ confirmed: false, note: '' });
    });
  });
}

export function renderEmptyState({ title, description, actionHtml = '' }) {
  return `
    <div class="state-panel">
      <div class="state-panel-icon">${ICONS.clipboard}</div>
      <h3 class="state-panel-title">${escapeHtml(title)}</h3>
      <p class="state-panel-text">${escapeHtml(description)}</p>
      ${actionHtml}
    </div>
  `;
}

export function renderErrorState({ title = 'Unable to load records', description, retryId = 'retry-load-btn' }) {
  return `
    <div class="state-panel">
      <div class="state-panel-icon" style="color: var(--status-danger-text); background: var(--status-danger-bg);">${ICONS.alert}</div>
      <h3 class="state-panel-title">${escapeHtml(title)}</h3>
      <p class="state-panel-text">${escapeHtml(description || 'A temporary error occurred while retrieving data.')}</p>
      <button type="button" id="${escapeHtml(retryId)}" class="btn btn-secondary btn-sm">Retry</button>
    </div>
  `;
}

export function renderTableSkeleton(rows = 4, cols = 5) {
  const trs = Array.from({ length: rows })
    .map(
      () =>
        `<tr>${Array.from({ length: cols })
          .map(() => `<td><div class="skeleton-block" style="width:${60 + Math.floor(Math.random() * 30)}%;"></div></td>`)
          .join('')}</tr>`
    )
    .join('');
  return `<div class="table-responsive"><table class="erp-table"><tbody>${trs}</tbody></table></div>`;
}

export function paginateItems(items = [], page = 1, pageSize = 8) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    startIndex: totalItems === 0 ? 0 : start + 1,
    endIndex: Math.min(totalItems, start + pageSize),
  };
}

export function renderPaginationBar({ page, totalItems, pageSize = 8, onPageChange }) {
  if (totalItems <= pageSize) return '';
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, safePage * pageSize);

  const pageButtons = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) {
      pageButtons.push(
        `<button type="button" class="pagination-btn ${i === safePage ? 'active' : ''}" data-page-num="${i}" aria-label="Page ${i}">${i}</button>`
      );
    } else if (pageButtons[pageButtons.length - 1] !== '<span style="padding:0 4px;color:var(--text-muted);">…</span>') {
      pageButtons.push('<span style="padding:0 4px;color:var(--text-muted);">…</span>');
    }
  }

  return `
    <div class="pagination-bar" data-pagination-bar>
      <div class="pagination-info">Showing ${startIndex}–${endIndex} of ${totalItems}</div>
      <div class="pagination-controls">
        <button type="button" class="pagination-btn" data-page-num="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''}>Prev</button>
        ${pageButtons.join('')}
        <button type="button" class="pagination-btn" data-page-num="${safePage + 1}" ${safePage >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>
  `;
}

export function bindPaginationBar(container, onPageChange) {
  if (!container) return;
  container.querySelectorAll('[data-page-num]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const nextPage = Number(btn.dataset.pageNum);
      if (Number.isFinite(nextPage) && nextPage >= 1) {
        onPageChange(nextPage);
      }
    });
  });
}

const STUDENT_NAV = [
  { href: 'student-dashboard.html', label: 'My Dashboard', icon: 'dashboard' },
  { href: 'rooms.html', label: 'Find a Room', icon: 'door' },
  { href: 'room-application.html', label: 'Apply for Hostel', icon: 'bed' },
  { href: 'my-requests.html', label: 'My Applications', icon: 'clipboard' },
  { href: 'my-room.html', label: 'My Room Details', icon: 'building' },
  { href: 'complaints.html', label: 'Raise Complaint', icon: 'wrench' },
  { href: 'my-complaints.html', label: 'My Complaints', icon: 'ticketList' },
  { href: 'profile.html', label: 'My Profile', icon: 'user' },
];

const ADMIN_NAV = [
  { href: 'admin-dashboard.html', label: 'Overview', icon: 'dashboard' },
  { href: 'admin-hostels.html', label: 'Hostel Management', icon: 'building' },
  { href: 'admin-rooms.html', label: 'Room Management', icon: 'door' },
  { href: 'admin-students.html', label: 'Student Management', icon: 'users' },
  { href: 'admin-requests.html', label: 'Room Applications', icon: 'clipboard' },
  { href: 'admin-complaints.html', label: 'Complaint Management', icon: 'wrench' },
  { href: 'admin-reports.html', label: 'Reports & Analytics', icon: 'chart' },
  { href: 'admin-settings.html', label: 'Settings', icon: 'settings' },
];

/**
 * Enforces portal role separation and hydrates the Student or Admin ERP shell
 * with functional global search, live notifications, profile dropdown, and sidebar navigation.
 */
export function initPortalShell({ role, activePage, breadcrumbLabel }) {
  const session = getCurrentSession();
  if (!session) {
    window.location.replace(role === 'admin' ? 'admin-login.html' : 'login.html');
    return null;
  }
  if (session.role !== role) {
    window.location.replace(role === 'admin' ? 'admin-login.html?denied=admin' : 'login.html?denied=1');
    return null;
  }

  const navItems = role === 'admin' ? ADMIN_NAV : STUDENT_NAV;
  const sidebarEl = document.getElementById('erp-sidebar');
  const topbarEl = document.getElementById('erp-topbar');
  const backdropEl = document.getElementById('sidebar-backdrop');

  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <a href="index.html" class="sidebar-brand-link">
            <span class="brand-mark">${ICONS.building}</span>
            <span>UniStay ERP</span>
          </a>
        </div>
        <div class="sidebar-role-caption">${role === 'admin' ? 'Administration Portal' : 'Student Portal'}</div>
        <nav class="sidebar-nav" aria-label="${role === 'admin' ? 'Admin navigation' : 'Student navigation'}">
          ${navItems
            .map(
              (item) => `
              <a href="${item.href}" class="sidebar-link ${item.href === activePage ? 'active' : ''}">
                ${ICONS[item.icon]}
                <span>${escapeHtml(item.label)}</span>
              </a>`
            )
            .join('')}
        </nav>
      </div>
      <div class="sidebar-bottom">
        <button type="button" id="sidebar-logout-btn" class="sidebar-link sidebar-logout-btn">
          ${ICONS.logout}
          <span>Logout</span>
        </button>
      </div>
    `;
  }

  if (topbarEl) {
    const portalName = role === 'admin' ? 'Hostel Administration' : 'Student Housing';
    const subText = role === 'admin' ? session.designation || 'Warden Office' : session.studentId;
    const settingsHref = role === 'admin' ? 'admin-settings.html' : 'profile.html';
    const settingsLabel = role === 'admin' ? 'Portal Settings' : 'My Profile';
    const searchPlaceholder =
      role === 'admin' ? 'Search rooms, students, requests...' : 'Search rooms, applications, tickets...';

    topbarEl.innerHTML = `
      <div class="topbar-left">
        <button type="button" id="mobile-menu-toggle" class="mobile-menu-btn" aria-label="Open navigation menu" aria-expanded="false">
          ${ICONS.menu}
        </button>
        <div class="topbar-breadcrumb">
          <span>${escapeHtml(portalName)}</span>
          <span aria-hidden="true">/</span>
          <strong>${escapeHtml(breadcrumbLabel)}</strong>
        </div>
      </div>

      <div class="topbar-right">
        <div class="topbar-search-wrap" id="global-search-anchor">
          <span class="topbar-search-icon" aria-hidden="true">${ICONS.search}</span>
          <label for="global-erp-search" class="sr-only">Global portal search</label>
          <input
            id="global-erp-search"
            type="search"
            class="topbar-search-input"
            placeholder="${escapeHtml(searchPlaceholder)}"
            autocomplete="off"
          />
          <div id="global-search-popover" class="topbar-popover search-popover" role="region" aria-label="Search results"></div>
        </div>

        <div class="topbar-popover-anchor" id="notifications-anchor">
          <button
            type="button"
            id="notifications-toggle-btn"
            class="topbar-icon-btn"
            aria-label="Notifications"
            aria-expanded="false"
          >
            ${ICONS.bell}
            <span id="notifications-badge" class="topbar-badge" hidden>0</span>
          </button>
          <div id="notifications-popover" class="topbar-popover" role="region" aria-label="Notifications list">
            <div class="popover-header">
              <span>${role === 'admin' ? 'Pending Operations' : 'Housing Updates'}</span>
              <button type="button" id="notifications-refresh-btn" class="btn btn-ghost btn-sm" style="min-height:26px;padding:2px 8px;">Refresh</button>
            </div>
            <div id="notifications-list" class="popover-list">
              <div class="popover-empty">Loading updates...</div>
            </div>
          </div>
        </div>

        <div class="topbar-popover-anchor" id="profile-menu-anchor">
          <button
            type="button"
            id="profile-menu-toggle"
            class="topbar-user-btn"
            aria-expanded="false"
            aria-haspopup="menu"
          >
            <div class="user-avatar" id="topbar-user-avatar" aria-hidden="true">${escapeHtml(getInitials(session.fullName))}</div>
            <div class="user-meta">
              <span class="user-name" id="topbar-user-name">${escapeHtml(session.fullName)}</span>
              <span class="user-sub font-mono" id="topbar-user-sub">${escapeHtml(subText)}</span>
            </div>
            <span class="chevron-icon" aria-hidden="true">${ICONS.chevronDown}</span>
          </button>
          <div id="profile-dropdown" class="topbar-popover profile-dropdown" role="menu">
            <div class="dropdown-account-info">
              <div class="table-primary-text" id="dropdown-user-name">${escapeHtml(session.fullName)}</div>
              <div class="table-sub-text" id="dropdown-user-email">${escapeHtml(session.email)}</div>
            </div>
            <a href="${settingsHref}" class="dropdown-menu-btn" role="menuitem">
              ${role === 'admin' ? ICONS.settings : ICONS.user}
              <span>${escapeHtml(settingsLabel)}</span>
            </a>
            <button type="button" id="topbar-logout-btn" class="dropdown-menu-btn danger" role="menuitem">
              ${ICONS.logout}
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeDrawer = () => {
    sidebarEl?.classList.remove('open');
    backdropEl?.classList.remove('open');
    toggleBtn?.setAttribute('aria-expanded', 'false');
  };

  toggleBtn?.addEventListener('click', () => {
    const isOpen = sidebarEl?.classList.toggle('open');
    backdropEl?.classList.toggle('open', Boolean(isOpen));
    toggleBtn.setAttribute('aria-expanded', String(Boolean(isOpen)));
  });

  backdropEl?.addEventListener('click', closeDrawer);

  const handleLogout = () => {
    logoutUser();
    window.location.href = role === 'admin' ? 'admin-login.html?loggedOut=1' : 'login.html?loggedOut=1';
  };

  document.getElementById('sidebar-logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('topbar-logout-btn')?.addEventListener('click', handleLogout);

  // Popover state management
  const searchInput = document.getElementById('global-erp-search');
  const searchPopover = document.getElementById('global-search-popover');
  const notifBtn = document.getElementById('notifications-toggle-btn');
  const notifPopover = document.getElementById('notifications-popover');
  const notifBadge = document.getElementById('notifications-badge');
  const notifList = document.getElementById('notifications-list');
  const notifRefreshBtn = document.getElementById('notifications-refresh-btn');
  const profileBtn = document.getElementById('profile-menu-toggle');
  const profilePopover = document.getElementById('profile-dropdown');

  function closeAllPopovers(except = null) {
    if (except !== searchPopover) searchPopover?.classList.remove('open');
    if (except !== notifPopover) {
      notifPopover?.classList.remove('open');
      notifBtn?.setAttribute('aria-expanded', 'false');
    }
    if (except !== profilePopover) {
      profilePopover?.classList.remove('open');
      profileBtn?.setAttribute('aria-expanded', 'false');
    }
  }

  profileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextOpen = !profilePopover?.classList.contains('open');
    closeAllPopovers(nextOpen ? profilePopover : null);
    profilePopover?.classList.toggle('open', nextOpen);
    profileBtn.setAttribute('aria-expanded', String(nextOpen));
  });

  async function refreshNotifications() {
    if (!notifList) return;
    notifList.innerHTML = '<div class="popover-empty">Checking live records...</div>';
    const res = await getLiveNotifications(role);
    if (!res.ok) {
      notifList.innerHTML = `<div class="popover-empty">${escapeHtml(res.message || 'Unable to load updates.')}</div>`;
      if (notifBadge) notifBadge.hidden = true;
      return;
    }

    const { unreadCount, items } = res.data;
    if (notifBadge) {
      if (unreadCount > 0) {
        notifBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        notifBadge.hidden = false;
      } else {
        notifBadge.hidden = true;
      }
    }

    if (!items.length) {
      notifList.innerHTML = `<div class="popover-empty">${
        role === 'admin' ? 'No pending requests or maintenance tickets.' : 'No application or ticket updates yet.'
      }</div>`;
      return;
    }

    notifList.innerHTML = items
      .map(
        (item) => `
      <a href="${escapeHtml(item.href)}" class="popover-item">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span class="popover-item-kicker">${escapeHtml(item.kind)}</span>
          ${renderStatusTag(item.status)}
        </div>
        <span class="popover-item-title">${escapeHtml(item.title)}</span>
        <span class="popover-item-meta">${escapeHtml(item.meta)}</span>
      </a>`
      )
      .join('');
  }

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextOpen = !notifPopover?.classList.contains('open');
    closeAllPopovers(nextOpen ? notifPopover : null);
    notifPopover?.classList.toggle('open', nextOpen);
    notifBtn.setAttribute('aria-expanded', String(nextOpen));
    if (nextOpen) {
      refreshNotifications();
    }
  });

  notifRefreshBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    refreshNotifications();
  });

  let searchTimer = null;
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.trim();
    clearTimeout(searchTimer);
    if (!q) {
      searchPopover?.classList.remove('open');
      return;
    }
    searchPopover.innerHTML = '<div class="popover-empty">Searching database...</div>';
    searchPopover.classList.add('open');
    closeAllPopovers(searchPopover);

    searchTimer = setTimeout(async () => {
      const res = await performGlobalSearch(role, q);
      if (!res.ok) {
        searchPopover.innerHTML = `<div class="popover-empty">${escapeHtml(res.message || 'Search unavailable.')}</div>`;
        return;
      }
      if (!res.data.length) {
        searchPopover.innerHTML = `<div class="popover-empty">No matching records for "${escapeHtml(q)}".</div>`;
        return;
      }
      searchPopover.innerHTML = `
        <div class="popover-header">
          <span>Search Results (${res.data.length})</span>
        </div>
        <div class="popover-list">
          ${res.data
            .map(
              (item) => `
            <a href="${escapeHtml(item.href)}" class="popover-item">
              <span class="popover-item-kicker">${escapeHtml(item.category)}</span>
              <span class="popover-item-title">${escapeHtml(item.title)}</span>
              <span class="popover-item-meta">${escapeHtml(item.subtitle)}</span>
            </a>`
            )
            .join('')}
        </div>
      `;
    }, 240);
  });

  document.addEventListener('click', (e) => {
    if (
      !e.target.closest('#global-search-anchor') &&
      !e.target.closest('#notifications-anchor') &&
      !e.target.closest('#profile-menu-anchor')
    ) {
      closeAllPopovers(null);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopovers(null);
  });

  // Load initial notification badge count quietly from live API
  refreshNotifications();

  // Verify JWT token & hydrate latest profile/allocation state from /api/auth/me
  if (session.token && !session.directEntry) {
    syncCurrentUser().then((res) => {
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logoutUser();
          window.location.replace(role === 'admin' ? 'admin-login.html' : 'login.html');
        }
        return;
      }
      if (res.data.role !== role) {
        window.location.replace(role === 'admin' ? 'admin-login.html?denied=admin' : 'login.html?denied=1');
        return;
      }
      const nameEl = document.getElementById('topbar-user-name');
      const avatarEl = document.getElementById('topbar-user-avatar');
      const subEl = document.getElementById('topbar-user-sub');
      const dropNameEl = document.getElementById('dropdown-user-name');
      const dropEmailEl = document.getElementById('dropdown-user-email');
      if (nameEl) nameEl.textContent = res.data.fullName;
      if (avatarEl) avatarEl.textContent = getInitials(res.data.fullName);
      if (subEl) subEl.textContent = role === 'admin' ? res.data.designation || 'Warden Office' : res.data.studentId;
      if (dropNameEl) dropNameEl.textContent = res.data.fullName;
      if (dropEmailEl) dropEmailEl.textContent = res.data.email;
    });
  }

  return session;
}
