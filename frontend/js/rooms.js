import {
  createRoomRequest,
  getAvailableRooms,
  getHostels,
  getMyRequests,
  getStudentDashboardData,
} from './api.js';
import {
  bindPaginationBar,
  escapeHtml,
  formatShortId,
  initPortalShell,
  openConfirmDialog,
  paginateItems,
  renderEmptyState,
  renderErrorState,
  renderPaginationBar,
  renderStatusTag,
  showToast,
} from './app.js';
import { canStudentApplyForRoom } from './domain.js';

const pageId = document.body.dataset.page;
const activePage = pageId === 'room-application' ? 'room-application.html' : 'rooms.html';
const crumb = pageId === 'room-application' ? 'Apply for Hostel' : 'Find a Room';

const session = initPortalShell({
  role: 'student',
  activePage,
  breadcrumbLabel: crumb,
});

async function initRoomsModule() {
  if (!session) return;

  const hostelSelect = document.getElementById('filter-hostel');
  const hostelTypeSelect = document.getElementById('filter-hostel-type');
  const roomTypeSelect = document.getElementById('filter-room-type');
  const availabilitySelect = document.getElementById('filter-availability');
  const searchInput = document.getElementById('filter-search');
  const gridEl = document.getElementById('rooms-grid');
  const summaryEl = document.getElementById('rooms-count-summary');
  const resetFiltersBtn = document.getElementById('reset-room-filters-btn');

  let paginationEl = document.getElementById('rooms-pagination-wrap');
  if (!paginationEl && gridEl && gridEl.parentNode) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'rooms-pagination-wrap';
    paginationEl.className = 'panel';
    paginationEl.style.overflow = 'hidden';
    gridEl.parentNode.insertBefore(paginationEl, gridEl.nextSibling);
  }

  // Populate hostels dropdown
  const hostelRes = await getHostels();
  if (hostelRes.ok && hostelSelect) {
    hostelSelect.innerHTML =
      '<option value="">All Hostels</option>' +
      hostelRes.data
        .map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.name)} (${escapeHtml(h.type)})</option>`)
        .join('');
  }

  let hostelsList = hostelRes.ok ? hostelRes.data : [];
  let cachedRooms = [];
  let cachedStudent = session;
  let cachedRequests = [];
  let currentPage = 1;
  const pageSize = 9;

  function drawRoomsPage() {
    if (!gridEl) return;

    if (summaryEl) {
      const availCount = cachedRooms.filter((r) => r.status === 'Available').length;
      summaryEl.textContent = `Showing ${cachedRooms.length} room${cachedRooms.length === 1 ? '' : 's'} · ${availCount} available`;
    }

    if (cachedRooms.length === 0) {
      if (paginationEl) paginationEl.innerHTML = '';
      gridEl.innerHTML = `
        <div class="panel" style="grid-column: 1 / -1;">
          ${renderEmptyState({
            title: 'No room records found',
            description: 'No rooms matched your selected hostel, room type, or availability filters.',
            actionHtml: '<button type="button" id="empty-reset-rooms" class="btn btn-secondary btn-sm">Clear Filters</button>',
          })}
        </div>
      `;
      document.getElementById('empty-reset-rooms')?.addEventListener('click', clearFilters);
      return;
    }

    const paged = paginateItems(cachedRooms, currentPage, pageSize);
    currentPage = paged.page;
    const hostelMap = new Map(hostelsList.map((h) => [h.id, h]));

    gridEl.innerHTML = paged.items
      .map((room) => {
        const hostel = hostelMap.get(room.hostelId);
        const pct = room.capacity > 0 ? Math.round((room.occupiedCount / room.capacity) * 100) : 100;
        const fillClass = room.status === 'Full' ? 'is-full' : room.occupiedCount > 0 ? 'is-partial' : '';
        const eligibility = canStudentApplyForRoom(cachedStudent, room, hostel, cachedRequests);
        const isFull = room.status === 'Full';

        let actionBtnHtml = '';
        if (pageId === 'room-application') {
          if (isFull) {
            actionBtnHtml = `<button type="button" class="btn btn-secondary btn-sm" disabled style="width:100%;">Room Full</button>`;
          } else if (!eligibility.allowed) {
            actionBtnHtml = `<button type="button" class="btn btn-secondary btn-sm" disabled title="${escapeHtml(
              eligibility.reason
            )}" style="width:100%;">${escapeHtml(
              eligibility.reason.includes('pending')
                ? 'Pending Request Active'
                : eligibility.reason.includes('allocated')
                ? 'Currently Allocated'
                : 'Ineligible'
            )}</button>`;
          } else {
            actionBtnHtml = `<button type="button" class="btn btn-primary btn-sm apply-room-btn" data-room-id="${escapeHtml(
              room.id
            )}" data-hostel-id="${escapeHtml(room.hostelId)}" data-room-label="${escapeHtml(room.roomNumber)}" data-hostel-name="${escapeHtml(
              room.hostelName
            )}" data-room-type="${escapeHtml(room.roomType)}" style="width:100%;">Apply for Room</button>`;
          }
        } else {
          actionBtnHtml = isFull
            ? `<button type="button" class="btn btn-secondary btn-sm" disabled style="width:100%;">Full Capacity</button>`
            : `<a href="room-application.html?room=${encodeURIComponent(room.id)}" class="btn btn-indigo btn-sm" style="width:100%;">Apply for Room</a>`;
        }

        return `
          <article class="room-card" data-room-id="${escapeHtml(room.id)}">
            <div class="room-card-header">
              <div>
                <h3 class="room-number-title font-mono">Room ${escapeHtml(room.roomNumber)}</h3>
                <div class="room-meta-line">
                  <span>${escapeHtml(room.hostelName)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${escapeHtml(room.hostelType)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${escapeHtml(room.roomType)}</span>
                </div>
              </div>
              ${renderStatusTag(room.status)}
            </div>

            <div class="room-stats-row">
              <div class="room-stat">
                <span class="room-stat-label">Capacity</span>
                <span class="room-stat-value">${room.capacity}</span>
              </div>
              <div class="room-stat">
                <span class="room-stat-label">Occupancy</span>
                <span class="room-stat-value">${room.occupiedCount}</span>
              </div>
              <div class="room-stat">
                <span class="room-stat-label">Available Seats</span>
                <span class="room-stat-value" style="color:${
                  room.availableSeats > 0 ? 'var(--status-success-text)' : 'var(--status-danger-text)'
                };">${room.availableSeats}</span>
              </div>
            </div>

            <div class="occupancy-meter">
              <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);">
                <span>${escapeHtml(room.floor)}</span>
                <span class="font-mono">${pct}% occupied</span>
              </div>
              <div class="occupancy-track">
                <div class="occupancy-fill ${fillClass}" style="width:${pct}%;"></div>
              </div>
            </div>

            ${actionBtnHtml}
          </article>
        `;
      })
      .join('');

    if (paginationEl) {
      paginationEl.innerHTML = renderPaginationBar({
        page: paged.page,
        totalItems: paged.totalItems,
        pageSize,
      });
      paginationEl.hidden = paged.totalItems <= pageSize;
      bindPaginationBar(paginationEl, (nextPage) => {
        currentPage = nextPage;
        drawRoomsPage();
      });
    }

    gridEl.querySelectorAll('.apply-room-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const roomId = btn.dataset.roomId;
        const hostelId = btn.dataset.hostelId;
        const roomNumber = btn.dataset.roomLabel;
        const hostelName = btn.dataset.hostelName;
        const roomType = btn.dataset.roomType;

        const { confirmed, note } = await openConfirmDialog({
          title: `Apply for Room ${roomNumber}`,
          message: `Submit a hostel allocation request for ${hostelName} — Room ${roomNumber} (${roomType})?`,
          confirmLabel: 'Submit Application',
          confirmVariant: 'btn-primary',
          showNoteInput: true,
          noteLabel: 'Application Note (optional)',
          notePlaceholder: 'Mention roommate preference, accessibility needs, or academic reason...',
        });

        if (!confirmed) return;

        btn.disabled = true;
        btn.textContent = 'Submitting...';
        const createRes = await createRoomRequest({
          hostelId,
          roomId,
          notes: note,
        });

        if (!createRes.ok) {
          showToast(createRes.message || 'Unable to submit application.', 'error');
          await renderRooms();
          return;
        }

        showToast(`Request ${formatShortId(createRes.data.id)} submitted for Room ${roomNumber}.`, 'success');
        await renderRooms();
      });
    });
  }

  async function renderRooms() {
    if (!gridEl) return;
    if (paginationEl) paginationEl.innerHTML = '';
    gridEl.innerHTML = `
      <div class="room-card-skeleton"><div class="skeleton-block" style="height:22px;width:45%;"></div><div class="skeleton-block" style="height:54px;"></div><div class="skeleton-block" style="height:36px;"></div></div>
      <div class="room-card-skeleton"><div class="skeleton-block" style="height:22px;width:45%;"></div><div class="skeleton-block" style="height:54px;"></div><div class="skeleton-block" style="height:36px;"></div></div>
      <div class="room-card-skeleton"><div class="skeleton-block" style="height:22px;width:45%;"></div><div class="skeleton-block" style="height:54px;"></div><div class="skeleton-block" style="height:36px;"></div></div>
    `;

    const filters = {
      hostelId: hostelSelect?.value || '',
      hostelType: hostelTypeSelect?.value || '',
      roomType: roomTypeSelect?.value || '',
      status: availabilitySelect?.value || '',
      search: searchInput?.value || '',
    };

    const [roomsRes, studentDashRes, reqRes] = await Promise.all([
      getAvailableRooms(filters),
      getStudentDashboardData(session.studentId),
      getMyRequests(session.studentId),
    ]);

    if (!roomsRes.ok) {
      gridEl.innerHTML = renderErrorState({ description: roomsRes.message, retryId: 'retry-rooms-btn' });
      document.getElementById('retry-rooms-btn')?.addEventListener('click', renderRooms);
      return;
    }

    cachedRooms = roomsRes.data;
    cachedStudent = studentDashRes.ok ? studentDashRes.data.student : session;
    cachedRequests = reqRes.ok ? reqRes.data : [];
    currentPage = 1;
    drawRoomsPage();
  }

  function clearFilters() {
    if (hostelSelect) hostelSelect.value = '';
    if (hostelTypeSelect) hostelTypeSelect.value = '';
    if (roomTypeSelect) roomTypeSelect.value = '';
    if (availabilitySelect) availabilitySelect.value = '';
    if (searchInput) searchInput.value = '';
    renderRooms();
  }

  [hostelSelect, hostelTypeSelect, roomTypeSelect, availabilitySelect].forEach((sel) =>
    sel?.addEventListener('change', renderRooms)
  );
  searchInput?.addEventListener('input', renderRooms);
  resetFiltersBtn?.addEventListener('click', clearFilters);

  await renderRooms();
}

initRoomsModule();
