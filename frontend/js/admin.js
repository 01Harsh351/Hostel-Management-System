import {
  approveRequest,
  createHostel,
  createRoom,
  getAllComplaints,
  getAllRequests,
  getAvailableRooms,
  getDashboardOccupancy,
  getDashboardSummary,
  getHealthStatus,
  getHostels,
  getStudentsList,
  rejectRequest,
  resolveComplaint,
  seedSampleCampusData,
  updateHostel,
  updateMyProfile,
  updateRoom,
} from './api.js';
import {
  applyFormErrors,
  bindPaginationBar,
  clearFormErrors,
  escapeHtml,
  formatShortId,
  getInitials,
  ICONS,
  initPortalShell,
  openConfirmDialog,
  paginateItems,
  renderEmptyState,
  renderErrorState,
  renderPaginationBar,
  renderStatusTag,
  renderTableSkeleton,
  showToast,
} from './app.js';
import { getRoomCapacityByType, validateHostelForm, validateRoomForm } from './domain.js';

const pageId = document.body.dataset.page;

function renderConicDonut(segments, total, caption) {
  let offset = 0;
  const stops =
    total > 0
      ? segments
          .map((seg) => {
            const pct = (seg.value / total) * 100;
            const start = offset;
            offset += pct;
            return `${seg.color} ${start.toFixed(1)}% ${offset.toFixed(1)}%`;
          })
          .join(', ')
      : '#e2e8f0 0% 100%';

  return `
    <div class="donut-chart-wrap">
      <div class="donut-ring" style="background: conic-gradient(${stops});" role="img" aria-label="${escapeHtml(
    caption
  )}: ${total}">
        <div class="donut-hole">
          <span class="donut-total tabular-nums">${total}</span>
          <span class="donut-caption">${escapeHtml(caption)}</span>
        </div>
      </div>
      <div class="chart-legend">
        ${segments
          .map(
            (seg) => `
          <div class="legend-row">
            <span class="legend-label">
              <span class="legend-swatch" style="background:${seg.color};"></span>
              <span>${escapeHtml(seg.label)}</span>
            </span>
            <span class="legend-count">${seg.value}</span>
          </div>`
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderHostelOccupancyBars(hostelOccupancy = []) {
  if (!hostelOccupancy.length) {
    return renderEmptyState({
      title: 'No Hostel Records Found',
      description: 'Add a campus residence hall to monitor bed utilization.',
      actionHtml: '<a href="admin-hostels.html" class="btn btn-primary btn-sm">Add Hostel</a>',
    });
  }
  return `
    <div class="chart-bar-list">
      ${hostelOccupancy
        .map(
          (h) => `
        <div class="chart-bar-item">
          <div class="chart-bar-header">
            <span class="chart-bar-name">${escapeHtml(h.name)} (${escapeHtml(h.type)})</span>
            <span class="chart-bar-value">${h.occupied} / ${h.capacity} beds · ${h.pct}%</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill indigo" style="width:${h.pct}%;"></div>
          </div>
        </div>`
        )
        .join('')}
    </div>
  `;
}

async function initAdminDashboard() {
  const kpiWrap = document.getElementById('admin-kpi-grid');
  const occupancyChartEl = document.getElementById('admin-occupancy-chart');
  const roomsBreakdownEl = document.getElementById('admin-rooms-chart');
  const pendingQueueEl = document.getElementById('admin-pending-queue');
  const recentRequestsEl = document.getElementById('admin-recent-requests');
  const recentComplaintsEl = document.getElementById('admin-recent-complaints');

  async function loadDashboard() {
    if (pendingQueueEl) pendingQueueEl.innerHTML = renderTableSkeleton(3, 6);
    if (recentRequestsEl) recentRequestsEl.innerHTML = renderTableSkeleton(3, 4);
    if (recentComplaintsEl) recentComplaintsEl.innerHTML = renderTableSkeleton(3, 4);

    const res = await getDashboardSummary();
    if (!res.ok) {
      if (kpiWrap) {
        kpiWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-admin-dash' });
        document.getElementById('retry-admin-dash')?.addEventListener('click', loadDashboard);
      }
      if (pendingQueueEl) pendingQueueEl.innerHTML = '';
      if (recentRequestsEl) recentRequestsEl.innerHTML = '';
      if (recentComplaintsEl) recentComplaintsEl.innerHTML = '';
      return;
    }

    const { summary, hostelOccupancy, pendingQueue = [], recentRequests, recentComplaints } = res.data;

    if (kpiWrap) {
      const totalCapacity = Number(summary.totalCapacity ?? 0);
      const occupiedBeds = Number(summary.totalOccupiedBeds ?? 0);
      const availableBeds =
        summary.availableBeds !== undefined ? Number(summary.availableBeds) : Math.max(0, totalCapacity - occupiedBeds);
      const totalStudents = Number(summary.totalStudents ?? 0);

      const cards = [
        {
          label: 'Total Registered Students',
          value: totalStudents,
          foot: 'Student accounts in hostelDB',
          icon: 'users',
        },
        {
          label: 'Total Hostels',
          value: Number(summary.totalHostels ?? 0),
          foot: 'Active residence halls',
          icon: 'building',
        },
        {
          label: 'Total Rooms',
          value: Number(summary.totalRooms ?? 0),
          foot: `${summary.availableRooms ?? 0} available · ${summary.fullRooms ?? 0} full`,
          icon: 'door',
        },
        {
          label: 'Available Beds',
          value: availableBeds,
          foot: `Out of ${totalCapacity} total bed capacity`,
          icon: 'check',
        },
        {
          label: 'Occupied Beds',
          value: occupiedBeds,
          foot: `${summary.occupancyRate ?? 0}% overall utilization`,
          icon: 'bed',
        },
        {
          label: 'Pending Applications',
          value: Number(summary.pendingRequests ?? 0),
          foot: `${summary.approvedRequests ?? 0} approved · ${summary.rejectedRequests ?? 0} rejected`,
          icon: 'clipboard',
        },
        {
          label: 'Pending Complaints',
          value: Number(summary.activeComplaints ?? 0),
          foot: `${summary.resolvedComplaints ?? 0} resolved tickets`,
          icon: 'wrench',
        },
      ];
      kpiWrap.innerHTML = cards
        .map(
          (c) => `
        <div class="kpi-card">
          <div class="kpi-card-top">
            <span class="kpi-label">${escapeHtml(c.label)}</span>
            <span class="kpi-icon">${ICONS[c.icon]}</span>
          </div>
          <div class="kpi-value">${c.value}</div>
          <div class="kpi-foot">${escapeHtml(c.foot)}</div>
        </div>`
        )
        .join('');
    }

    if (occupancyChartEl) {
      occupancyChartEl.innerHTML = renderHostelOccupancyBars(hostelOccupancy);
    }

    if (roomsBreakdownEl) {
      const avail = Number(summary.availableRooms ?? 0);
      const full = Number(summary.fullRooms ?? 0);
      const totalRooms = Number(summary.totalRooms ?? 0);
      roomsBreakdownEl.innerHTML =
        totalRooms > 0
          ? renderConicDonut(
              [
                { label: 'Available Rooms', value: avail, color: '#15803d' },
                { label: 'Full Rooms', value: full, color: '#b91c1c' },
              ],
              totalRooms,
              'Rooms'
            )
          : renderEmptyState({
              title: 'No Room Records Found',
              description: 'Add rooms to your hostels to view availability breakdowns.',
              actionHtml: '<a href="admin-rooms.html" class="btn btn-primary btn-sm">Add Room</a>',
            });
    }

    if (pendingQueueEl) {
      if (!pendingQueue.length) {
        pendingQueueEl.innerHTML = renderEmptyState({
          title: 'No Pending Applications',
          description: 'All submitted student room applications have been reviewed.',
        });
      } else {
        pendingQueueEl.innerHTML = `
          <div class="table-responsive">
            <table class="erp-table mobile-cards">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Student</th>
                  <th>Hostel &amp; Room</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                ${pendingQueue
                  .map(
                    (r) => `
                  <tr>
                    <td data-label="Application ID" class="font-mono table-primary-text">${escapeHtml(formatShortId(r.id))}</td>
                    <td data-label="Student">
                      <div class="table-primary-text">${escapeHtml(r.studentName)}</div>
                      <div class="table-sub-text font-mono">${escapeHtml(r.studentId)}</div>
                    </td>
                    <td data-label="Hostel & Room">${escapeHtml(r.hostelName)} · <span class="font-mono">${escapeHtml(r.roomNumber)}</span> (${escapeHtml(r.roomType)})</td>
                    <td data-label="Submitted" class="font-mono">${escapeHtml(r.requestDate)}</td>
                    <td data-label="Status">${renderStatusTag(r.status)}</td>
                    <td data-label="Decision">
                      <div class="table-actions">
                        <button type="button" class="btn btn-success btn-sm dash-approve-btn" data-id="${escapeHtml(r.id)}">Approve</button>
                        <button type="button" class="btn btn-danger-outline btn-sm dash-reject-btn" data-id="${escapeHtml(r.id)}">Reject</button>
                      </div>
                    </td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;

        pendingQueueEl.querySelectorAll('.dash-approve-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const req = pendingQueue.find((item) => item.id === btn.dataset.id);
            if (!req) return;
            const { confirmed, note } = await openConfirmDialog({
              title: `Approve Application ${formatShortId(req.id)}?`,
              message: `Allocate ${req.studentName} (${req.studentId}) to Room ${req.roomNumber} in ${req.hostelName}?`,
              confirmLabel: 'Confirm Approval',
              confirmVariant: 'btn-success',
              showNoteInput: true,
              noteLabel: 'Approval Note (optional)',
            });
            if (!confirmed) return;
            const resApprove = await approveRequest(req.id, note);
            if (!resApprove.ok) {
              showToast(resApprove.message || 'Approval failed.', 'error');
              return;
            }
            showToast(`Application ${formatShortId(req.id)} approved.`, 'success');
            await loadDashboard();
          });
        });

        pendingQueueEl.querySelectorAll('.dash-reject-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const req = pendingQueue.find((item) => item.id === btn.dataset.id);
            if (!req) return;
            const { confirmed, note } = await openConfirmDialog({
              title: `Reject Application ${formatShortId(req.id)}?`,
              message: `Decline room allocation application from ${req.studentName} for Room ${req.roomNumber}?`,
              confirmLabel: 'Confirm Rejection',
              confirmVariant: 'btn-danger',
              showNoteInput: true,
              noteLabel: 'Rejection Reason (optional)',
            });
            if (!confirmed) return;
            const resReject = await rejectRequest(req.id, note);
            if (!resReject.ok) {
              showToast(resReject.message || 'Rejection failed.', 'error');
              return;
            }
            showToast(`Application ${formatShortId(req.id)} marked as Rejected.`, 'warning');
            await loadDashboard();
          });
        });
      }
    }

    if (recentRequestsEl) {
      recentRequestsEl.innerHTML = recentRequests.length
        ? `<div class="table-responsive"><table class="erp-table">
            <thead><tr><th>Request</th><th>Student</th><th>Room</th><th>Status</th></tr></thead>
            <tbody>${recentRequests
              .map(
                (r) => `
              <tr>
                <td class="font-mono table-primary-text">${escapeHtml(formatShortId(r.id))}</td>
                <td>${escapeHtml(r.studentName)}</td>
                <td class="font-mono">${escapeHtml(r.roomNumber)}</td>
                <td>${renderStatusTag(r.status)}</td>
              </tr>`
              )
              .join('')}</tbody></table></div>`
        : renderEmptyState({ title: 'No Room Applications', description: 'Submitted student applications will appear here.' });
    }

    if (recentComplaintsEl) {
      recentComplaintsEl.innerHTML = recentComplaints.length
        ? `<div class="table-responsive"><table class="erp-table">
            <thead><tr><th>Ticket</th><th>Room</th><th>Category</th><th>Status</th></tr></thead>
            <tbody>${recentComplaints
              .map(
                (c) => `
              <tr>
                <td class="font-mono table-primary-text">${escapeHtml(formatShortId(c.id))}</td>
                <td class="font-mono">${escapeHtml(c.roomNumber)}</td>
                <td>${escapeHtml(c.category)}</td>
                <td>${renderStatusTag(c.status)}</td>
              </tr>`
              )
              .join('')}</tbody></table></div>`
        : renderEmptyState({ title: 'No Complaint Records', description: 'Maintenance tickets submitted by students appear here.' });
    }
  }

  await loadDashboard();
}

async function initAdminHostels() {
  const tableWrap = document.getElementById('hostels-table-wrap');
  const form = document.getElementById('hostel-form');
  const modal = document.getElementById('hostel-modal');
  const modalTitle = document.getElementById('hostel-modal-title');
  const addBtn = document.getElementById('add-hostel-btn');
  const closeBtns = document.querySelectorAll('[data-close-hostel-modal]');
  const detailPanel = document.getElementById('hostel-detail-panel');

  let editingId = null;
  let currentHostels = [];
  let currentPage = 1;
  const pageSize = 8;

  function openModal(hostel = null) {
    clearFormErrors(form);
    editingId = hostel ? hostel.id : null;
    modalTitle.textContent = hostel ? `Edit Hostel — ${hostel.name}` : 'Add New Hostel';
    form.name.value = hostel?.name || '';
    form.type.value = hostel?.type || 'Boys';
    form.address.value = hostel?.address || '';
    form.totalRooms.value = hostel?.totalRooms || '';
    form.warden.value = hostel?.warden || '';
    modal.classList.add('open');
    form.name.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    editingId = null;
  }

  addBtn?.addEventListener('click', () => openModal(null));
  closeBtns.forEach((b) => b.addEventListener('click', closeModal));

  function renderHostelRows() {
    if (currentHostels.length === 0) {
      tableWrap.innerHTML = renderEmptyState({
        title: 'No Hostel Records Found',
        description: 'Add a university residence hall to begin configuring rooms.',
        actionHtml: '<button type="button" id="empty-add-hostel-btn" class="btn btn-primary btn-sm">Add Hostel</button>',
      });
      document.getElementById('empty-add-hostel-btn')?.addEventListener('click', () => openModal(null));
      return;
    }

    const paged = paginateItems(currentHostels, currentPage, pageSize);
    currentPage = paged.page;

    tableWrap.innerHTML = `
      <div class="table-responsive">
        <table class="erp-table mobile-cards">
          <thead>
            <tr>
              <th>Hostel ID</th>
              <th>Hostel Name</th>
              <th>Type</th>
              <th>Address</th>
              <th class="num">Total Rooms</th>
              <th class="num">Occupancy</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items
              .map(
                (h) => `
              <tr>
                <td data-label="Hostel ID" class="font-mono table-primary-text">${escapeHtml(formatShortId(h.id))}</td>
                <td data-label="Hostel Name" class="table-primary-text">${escapeHtml(h.name)}</td>
                <td data-label="Type">${renderStatusTag(h.type)}</td>
                <td data-label="Address">${escapeHtml(h.address)}</td>
                <td data-label="Total Rooms" class="num font-mono">${h.totalRooms}</td>
                <td data-label="Occupancy" class="num font-mono">${h.occupiedBeds}/${h.totalCapacity} beds</td>
                <td data-label="Actions">
                  <div class="table-actions">
                    <button type="button" class="btn btn-secondary btn-sm view-hostel-btn" data-id="${escapeHtml(h.id)}">Details</button>
                    <button type="button" class="btn btn-indigo btn-sm edit-hostel-btn" data-id="${escapeHtml(h.id)}">Edit</button>
                  </div>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar({ page: paged.page, totalItems: paged.totalItems, pageSize })}
    `;

    bindPaginationBar(tableWrap, (nextPage) => {
      currentPage = nextPage;
      renderHostelRows();
    });

    tableWrap.querySelectorAll('.edit-hostel-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = currentHostels.find((item) => item.id === btn.dataset.id);
        if (h) openModal(h);
      });
    });

    tableWrap.querySelectorAll('.view-hostel-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = currentHostels.find((item) => item.id === btn.dataset.id);
        if (!h || !detailPanel) return;
        detailPanel.hidden = false;
        detailPanel.innerHTML = `
          <div class="panel-header">
            <div>
              <h2 class="panel-title">${escapeHtml(h.name)}</h2>
              <p class="panel-subtitle">${escapeHtml(formatShortId(h.id))} · ${escapeHtml(h.type)} Hostel</p>
            </div>
            ${renderStatusTag(h.type)}
          </div>
          <div class="panel-body">
            <div class="kv-list">
              <div class="kv-item"><span class="kv-label">Campus Address</span><span class="kv-value">${escapeHtml(h.address)}</span></div>
              <div class="kv-item"><span class="kv-label">Assigned Warden</span><span class="kv-value">${escapeHtml(h.warden)}</span></div>
              <div class="kv-item"><span class="kv-label">Planned Total Rooms</span><span class="kv-value font-mono">${h.totalRooms}</span></div>
              <div class="kv-item"><span class="kv-label">Configured Active Rooms</span><span class="kv-value font-mono">${h.configuredRoomsCount} (${h.availableRoomsCount} available)</span></div>
            </div>
          </div>
        `;
      });
    });
  }

  async function loadHostels() {
    tableWrap.innerHTML = renderTableSkeleton(4, 6);
    const res = await getHostels();
    if (!res.ok) {
      tableWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-hostels' });
      document.getElementById('retry-hostels')?.addEventListener('click', loadHostels);
      return;
    }

    currentHostels = res.data;
    currentPage = 1;
    renderHostelRows();
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);
    const payload = {
      name: form.name.value,
      type: form.type.value,
      address: form.address.value,
      totalRooms: Number(form.totalRooms.value),
      warden: form.warden.value,
    };

    const validation = validateHostelForm(payload);
    if (!validation.valid) {
      applyFormErrors(form, validation.errors);
      return;
    }

    const submitBtn = document.getElementById('hostel-save-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    const res = editingId ? await updateHostel(editingId, payload) : await createHostel(payload);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Hostel';

    if (!res.ok) {
      if (res.errors) applyFormErrors(form, res.errors);
      showToast(res.message || 'Unable to save hostel.', 'error');
      return;
    }

    showToast(editingId ? 'Hostel details updated.' : 'New hostel created.', 'success');
    closeModal();
    await loadHostels();
  });

  await loadHostels();
}

async function initAdminRooms() {
  const tableWrap = document.getElementById('admin-rooms-table-wrap');
  const filterHostel = document.getElementById('admin-room-hostel-filter');
  const filterType = document.getElementById('admin-room-type-filter');
  const filterStatus = document.getElementById('admin-room-status-filter');
  const searchInput = document.getElementById('admin-room-search');
  const resetBtn = document.getElementById('admin-room-reset-btn');
  const addBtn = document.getElementById('add-room-btn');
  const modal = document.getElementById('room-modal');
  const modalTitle = document.getElementById('room-modal-title');
  const form = document.getElementById('room-form');
  const closeBtns = document.querySelectorAll('[data-close-room-modal]');

  let editingRoomId = null;
  let currentRooms = [];
  let currentPage = 1;
  const pageSize = 10;

  const hostelRes = await getHostels();
  if (hostelRes.ok) {
    const options = hostelRes.data
      .map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.name)} (${escapeHtml(h.type)})</option>`)
      .join('');
    if (filterHostel) filterHostel.innerHTML = '<option value="">All Hostels</option>' + options;
    if (form?.hostelId) form.hostelId.innerHTML = '<option value="">Select hostel...</option>' + options;
  }

  form?.roomType?.addEventListener('change', () => {
    const suggested = getRoomCapacityByType(form.roomType.value);
    if (suggested > 0 && !editingRoomId) {
      form.capacity.value = String(suggested);
    }
  });

  function openModal(room = null) {
    clearFormErrors(form);
    editingRoomId = room ? room.id : null;
    modalTitle.textContent = room ? `Edit Room ${room.roomNumber}` : 'Add New Room';
    form.hostelId.value = room?.hostelId || '';
    form.roomNumber.value = room?.roomNumber || '';
    form.roomType.value = room?.roomType || 'Double';
    form.capacity.value = room?.capacity ?? 2;
    form.occupiedCount.value = room?.occupiedCount ?? 0;
    form.floor.value = room?.floor || '1st Floor';
    modal.classList.add('open');
    form.roomNumber.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    editingRoomId = null;
  }

  addBtn?.addEventListener('click', () => openModal(null));
  closeBtns.forEach((b) => b.addEventListener('click', closeModal));

  function renderRoomRows() {
    if (currentRooms.length === 0) {
      const hasFilters = Boolean(
        filterHostel?.value || filterType?.value || filterStatus?.value || searchInput?.value.trim()
      );
      tableWrap.innerHTML = renderEmptyState({
        title: 'No room records found',
        description: hasFilters
          ? 'No rooms matched your selected hostel, type, availability, or search filters.'
          : 'No rooms have been added yet. Add a room to a hostel to begin allocating beds.',
        actionHtml: hasFilters
          ? '<button type="button" id="empty-reset-admin-rooms" class="btn btn-secondary btn-sm">Clear Filters</button>'
          : '<button type="button" id="empty-add-admin-room" class="btn btn-primary btn-sm">Add Room</button>',
      });
      document.getElementById('empty-reset-admin-rooms')?.addEventListener('click', resetFilters);
      document.getElementById('empty-add-admin-room')?.addEventListener('click', () => openModal(null));
      return;
    }

    const paged = paginateItems(currentRooms, currentPage, pageSize);
    currentPage = paged.page;

    tableWrap.innerHTML = `
      <div class="table-responsive">
        <table class="erp-table mobile-cards">
          <thead>
            <tr>
              <th>Room</th>
              <th>Hostel</th>
              <th>Room Type</th>
              <th class="num">Capacity</th>
              <th class="num">Occupied</th>
              <th class="num">Available</th>
              <th>Occupancy Indicator</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items
              .map((r) => {
                const pct = r.capacity > 0 ? Math.round((r.occupiedCount / r.capacity) * 100) : 0;
                const fillClass = r.status === 'Full' ? 'is-full' : r.occupiedCount > 0 ? 'is-partial' : '';
                return `
                <tr>
                  <td data-label="Room" class="font-mono table-primary-text">${escapeHtml(r.roomNumber)}<div class="table-sub-text">${escapeHtml(r.floor)}</div></td>
                  <td data-label="Hostel">${escapeHtml(r.hostelName)}</td>
                  <td data-label="Type">${escapeHtml(r.roomType)}</td>
                  <td data-label="Capacity" class="num font-mono">${r.capacity}</td>
                  <td data-label="Occupied" class="num font-mono">${r.occupiedCount}</td>
                  <td data-label="Available" class="num font-mono">${r.availableSeats}</td>
                  <td data-label="Occupancy" style="min-width:130px;">
                    <div class="occupancy-track"><div class="occupancy-fill ${fillClass}" style="width:${pct}%;"></div></div>
                  </td>
                  <td data-label="Status">${renderStatusTag(r.status)}</td>
                  <td data-label="Actions">
                    <button type="button" class="btn btn-secondary btn-sm edit-room-btn" data-id="${escapeHtml(r.id)}">Edit</button>
                  </td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar({ page: paged.page, totalItems: paged.totalItems, pageSize })}
    `;

    bindPaginationBar(tableWrap, (nextPage) => {
      currentPage = nextPage;
      renderRoomRows();
    });

    tableWrap.querySelectorAll('.edit-room-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rm = currentRooms.find((item) => item.id === btn.dataset.id);
        if (rm) openModal(rm);
      });
    });
  }

  async function loadRooms() {
    tableWrap.innerHTML = renderTableSkeleton(5, 8);
    const res = await getAvailableRooms({
      hostelId: filterHostel?.value || '',
      type: filterType?.value || '',
      status: filterStatus?.value || '',
      search: searchInput?.value || '',
    });

    if (!res.ok) {
      tableWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-admin-rooms' });
      document.getElementById('retry-admin-rooms')?.addEventListener('click', loadRooms);
      return;
    }

    currentRooms = res.data;
    currentPage = 1;
    renderRoomRows();
  }

  function resetFilters() {
    if (filterHostel) filterHostel.value = '';
    if (filterType) filterType.value = '';
    if (filterStatus) filterStatus.value = '';
    if (searchInput) searchInput.value = '';
    loadRooms();
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);
    const payload = {
      hostelId: form.hostelId.value,
      roomNumber: form.roomNumber.value,
      roomType: form.roomType.value,
      capacity: Number(form.capacity.value),
      occupiedCount: Number(form.occupiedCount.value),
      floor: form.floor.value,
    };

    const validation = validateRoomForm(payload);
    if (!validation.valid) {
      applyFormErrors(form, validation.errors);
      return;
    }

    const saveBtn = document.getElementById('room-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    const res = editingRoomId ? await updateRoom(editingRoomId, payload) : await createRoom(payload);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Room';

    if (!res.ok) {
      if (res.errors) applyFormErrors(form, res.errors);
      showToast(res.message || 'Could not save room.', 'error');
      return;
    }

    showToast(editingRoomId ? 'Room updated.' : 'Room added.', 'success');
    closeModal();
    await loadRooms();
  });

  [filterHostel, filterType, filterStatus].forEach((el) => el?.addEventListener('change', loadRooms));
  searchInput?.addEventListener('input', loadRooms);
  resetBtn?.addEventListener('click', resetFilters);
  await loadRooms();
}

async function initAdminRequests() {
  const tableWrap = document.getElementById('admin-requests-table-wrap');
  const filterTabs = document.querySelectorAll('[data-req-status]');
  const searchInput = document.getElementById('admin-requests-search');
  const viewModal = document.getElementById('request-view-modal');
  const viewBody = document.getElementById('request-view-body');
  const closeViewBtns = document.querySelectorAll('[data-close-request-view]');

  let currentStatus = 'All';
  let currentRequests = [];
  let currentPage = 1;
  const pageSize = 10;

  closeViewBtns.forEach((b) => b.addEventListener('click', () => viewModal?.classList.remove('open')));

  function renderRequestRows() {
    if (currentRequests.length === 0) {
      tableWrap.innerHTML = renderEmptyState({
        title: 'No Room Applications Found',
        description: 'No student room allocation requests matched this filter.',
      });
      return;
    }

    const paged = paginateItems(currentRequests, currentPage, pageSize);
    currentPage = paged.page;

    tableWrap.innerHTML = `
      <div class="table-responsive">
        <table class="erp-table mobile-cards">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Hostel</th>
              <th>Room Number</th>
              <th>Request Date</th>
              <th>Request Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items
              .map(
                (r) => `
              <tr>
                <td data-label="Request ID" class="font-mono table-primary-text">${escapeHtml(formatShortId(r.id))}</td>
                <td data-label="Student Name" class="table-primary-text">${escapeHtml(r.studentName)}</td>
                <td data-label="Student ID" class="font-mono">${escapeHtml(r.studentId)}</td>
                <td data-label="Hostel">${escapeHtml(r.hostelName)}</td>
                <td data-label="Room Number" class="font-mono">${escapeHtml(r.roomNumber)} (${escapeHtml(r.roomType)})</td>
                <td data-label="Request Date" class="font-mono">${escapeHtml(r.requestDate)}</td>
                <td data-label="Status">${renderStatusTag(r.status)}</td>
                <td data-label="Actions">
                  <div class="table-actions">
                    <button type="button" class="btn btn-secondary btn-sm view-req-btn" data-id="${escapeHtml(r.id)}">View</button>
                    ${
                      r.status === 'Pending'
                        ? `<button type="button" class="btn btn-success btn-sm approve-req-btn" data-id="${escapeHtml(
                            r.id
                          )}">Approve</button>
                           <button type="button" class="btn btn-danger-outline btn-sm reject-req-btn" data-id="${escapeHtml(
                             r.id
                           )}">Reject</button>`
                        : ''
                    }
                  </div>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar({ page: paged.page, totalItems: paged.totalItems, pageSize })}
    `;

    bindPaginationBar(tableWrap, (nextPage) => {
      currentPage = nextPage;
      renderRequestRows();
    });

    tableWrap.querySelectorAll('.view-req-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const req = currentRequests.find((item) => item.id === btn.dataset.id);
        if (!req || !viewModal || !viewBody) return;
        viewBody.innerHTML = `
          <div class="kv-list">
            <div class="kv-item"><span class="kv-label">Request ID</span><span class="kv-value font-mono">${escapeHtml(formatShortId(req.id))}</span></div>
            <div class="kv-item"><span class="kv-label">Status</span><span class="kv-value">${renderStatusTag(req.status)}</span></div>
            <div class="kv-item"><span class="kv-label">Student</span><span class="kv-value">${escapeHtml(req.studentName)} (${escapeHtml(req.studentId)})</span></div>
            <div class="kv-item"><span class="kv-label">Request Date</span><span class="kv-value font-mono">${escapeHtml(req.requestDate)}</span></div>
            <div class="kv-item"><span class="kv-label">Hostel</span><span class="kv-value">${escapeHtml(req.hostelName)}</span></div>
            <div class="kv-item"><span class="kv-label">Requested Room</span><span class="kv-value font-mono">${escapeHtml(req.roomNumber)} · ${escapeHtml(req.roomType)}</span></div>
          </div>
          <div style="margin-top:8px;">
            <div class="kv-label">Student Notes</div>
            <p style="margin-top:4px;color:var(--text-secondary);">${escapeHtml(req.notes || 'None provided.')}</p>
          </div>
          ${
            req.adminNote
              ? `<div><div class="kv-label">Administration Decision Note</div><p style="margin-top:4px;color:var(--text-secondary);">${escapeHtml(
                  req.adminNote
                )}</p></div>`
              : ''
          }
        `;
        viewModal.classList.add('open');
      });
    });

    tableWrap.querySelectorAll('.approve-req-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const req = currentRequests.find((item) => item.id === btn.dataset.id);
        if (!req) return;
        const { confirmed, note } = await openConfirmDialog({
          title: `Approve Request ${formatShortId(req.id)}?`,
          message: `Allocate ${req.studentName} (${req.studentId}) to Room ${req.roomNumber} in ${req.hostelName}? This will increment the room's occupied bed count.`,
          confirmLabel: 'Confirm Approval',
          confirmVariant: 'btn-success',
          showNoteInput: true,
          noteLabel: 'Approval Note (optional)',
        });
        if (!confirmed) return;

        const resApprove = await approveRequest(req.id, note);
        if (!resApprove.ok) {
          showToast(resApprove.message || 'Approval failed.', 'error');
          return;
        }
        showToast(`Request ${formatShortId(req.id)} approved and room occupancy updated.`, 'success');
        await loadRequests();
      });
    });

    tableWrap.querySelectorAll('.reject-req-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const req = currentRequests.find((item) => item.id === btn.dataset.id);
        if (!req) return;
        const { confirmed, note } = await openConfirmDialog({
          title: `Reject Request ${formatShortId(req.id)}?`,
          message: `Decline room allocation request from ${req.studentName} for Room ${req.roomNumber}?`,
          confirmLabel: 'Confirm Rejection',
          confirmVariant: 'btn-danger',
          showNoteInput: true,
          noteLabel: 'Rejection Reason (optional)',
          notePlaceholder: 'e.g. Room capacity reserved for incoming cohort...',
        });
        if (!confirmed) return;

        const resReject = await rejectRequest(req.id, note);
        if (!resReject.ok) {
          showToast(resReject.message || 'Rejection failed.', 'error');
          return;
        }
        showToast(`Request ${formatShortId(req.id)} marked as Rejected.`, 'warning');
        await loadRequests();
      });
    });
  }

  async function loadRequests() {
    tableWrap.innerHTML = renderTableSkeleton(5, 8);
    const res = await getAllRequests({ status: currentStatus, search: searchInput?.value || '' });
    if (!res.ok) {
      tableWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-admin-req' });
      document.getElementById('retry-admin-req')?.addEventListener('click', loadRequests);
      return;
    }

    currentRequests = res.data;
    currentPage = 1;
    renderRequestRows();
  }

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatus = tab.dataset.reqStatus;
      loadRequests();
    });
  });

  searchInput?.addEventListener('input', loadRequests);
  await loadRequests();
}

async function initAdminStudents() {
  const tableWrap = document.getElementById('admin-students-table-wrap');
  const statusFilter = document.getElementById('admin-students-status');
  const searchInput = document.getElementById('admin-students-search');

  let currentStudents = [];
  let currentPage = 1;
  const pageSize = 10;

  function renderStudentRows() {
    if (currentStudents.length === 0) {
      tableWrap.innerHTML = renderEmptyState({
        title: 'No Student Records Found',
        description: 'No registered students matched your filter.',
      });
      return;
    }

    const paged = paginateItems(currentStudents, currentPage, pageSize);
    currentPage = paged.page;

    tableWrap.innerHTML = `
      <div class="table-responsive">
        <table class="erp-table mobile-cards">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Department &amp; Year</th>
              <th>Gender</th>
              <th>Contact</th>
              <th>Allocated Room</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items
              .map(
                (s) => `
              <tr>
                <td data-label="Student ID" class="font-mono table-primary-text">${escapeHtml(s.studentId)}</td>
                <td data-label="Full Name">
                  <div class="table-primary-text">${escapeHtml(s.fullName)}</div>
                  <div class="table-sub-text">${escapeHtml(s.email)}</div>
                </td>
                <td data-label="Department">${escapeHtml(s.department)} · ${escapeHtml(s.year)}</td>
                <td data-label="Gender">${escapeHtml(s.gender)}</td>
                <td data-label="Contact" class="font-mono">${escapeHtml(s.contactNumber)}</td>
                <td data-label="Allocated Room">${
                  s.allocatedRoomNumber
                    ? `<span class="font-mono">${escapeHtml(s.allocatedRoomNumber)}</span> · ${escapeHtml(
                        s.allocatedHostelName
                      )}`
                    : '—'
                }</td>
                <td data-label="Status">${renderStatusTag(s.allocationStatus)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar({ page: paged.page, totalItems: paged.totalItems, pageSize })}
    `;

    bindPaginationBar(tableWrap, (nextPage) => {
      currentPage = nextPage;
      renderStudentRows();
    });
  }

  async function loadStudents() {
    tableWrap.innerHTML = renderTableSkeleton(5, 6);
    const res = await getStudentsList({
      status: statusFilter?.value || 'All',
      search: searchInput?.value || '',
    });

    if (!res.ok) {
      tableWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-students' });
      document.getElementById('retry-students')?.addEventListener('click', loadStudents);
      return;
    }

    currentStudents = res.data;
    currentPage = 1;
    renderStudentRows();
  }

  statusFilter?.addEventListener('change', loadStudents);
  searchInput?.addEventListener('input', loadStudents);
  await loadStudents();
}

async function initAdminComplaints() {
  const tableWrap = document.getElementById('admin-complaints-table-wrap');
  const statusFilter = document.getElementById('admin-complaints-status');
  const categoryFilter = document.getElementById('admin-complaints-category');
  const searchInput = document.getElementById('admin-complaints-search');

  let currentComplaints = [];
  let currentPage = 1;
  const pageSize = 10;

  function renderComplaintRows() {
    if (currentComplaints.length === 0) {
      tableWrap.innerHTML = renderEmptyState({
        title: 'No Complaint Records Found',
        description: 'No student maintenance tickets matched the selected filters.',
      });
      return;
    }

    const paged = paginateItems(currentComplaints, currentPage, pageSize);
    currentPage = paged.page;

    tableWrap.innerHTML = `
      <div class="table-responsive">
        <table class="erp-table mobile-cards">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Student</th>
              <th>Room Number</th>
              <th>Category</th>
              <th>Description</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items
              .map(
                (c) => `
              <tr>
                <td data-label="Complaint ID" class="font-mono table-primary-text">${escapeHtml(formatShortId(c.id))}</td>
                <td data-label="Student">
                  <div class="table-primary-text">${escapeHtml(c.studentName)}</div>
                  <div class="table-sub-text font-mono">${escapeHtml(c.studentId)}</div>
                </td>
                <td data-label="Room" class="font-mono">${escapeHtml(c.roomNumber)}<div class="table-sub-text">${escapeHtml(c.hostelName)}</div></td>
                <td data-label="Category">${escapeHtml(c.category)}</td>
                <td data-label="Description">
                  <div>${escapeHtml(c.description)}</div>
                  ${
                    c.resolutionNote
                      ? `<div class="table-sub-text">Note: ${escapeHtml(c.resolutionNote)}</div>`
                      : ''
                  }
                </td>
                <td data-label="Date" class="font-mono">${escapeHtml(c.submittedDate)}</td>
                <td data-label="Status">${renderStatusTag(c.status)}</td>
                <td data-label="Action">
                  ${
                    c.status === 'Pending'
                      ? `<button type="button" class="btn btn-success btn-sm resolve-cmp-btn" data-id="${escapeHtml(
                          c.id
                        )}">Mark Resolved</button>`
                      : '<span class="table-sub-text">Completed</span>'
                  }
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar({ page: paged.page, totalItems: paged.totalItems, pageSize })}
    `;

    bindPaginationBar(tableWrap, (nextPage) => {
      currentPage = nextPage;
      renderComplaintRows();
    });

    tableWrap.querySelectorAll('.resolve-cmp-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cmpId = btn.dataset.id;
        const shortId = formatShortId(cmpId);
        const { confirmed, note } = await openConfirmDialog({
          title: `Mark Complaint ${shortId} as Resolved?`,
          message: 'Confirm that maintenance work has been verified and completed for this room ticket.',
          confirmLabel: 'Mark Resolved',
          confirmVariant: 'btn-success',
          showNoteInput: true,
          noteLabel: 'Resolution Note (optional)',
          notePlaceholder: 'Describe repair or technician action taken...',
        });
        if (!confirmed) return;

        const resResolve = await resolveComplaint(cmpId, note);
        if (!resResolve.ok) {
          showToast(resResolve.message || 'Failed to update complaint.', 'error');
          return;
        }
        showToast(`Complaint ${shortId} marked as Resolved.`, 'success');
        await loadComplaints();
      });
    });
  }

  async function loadComplaints() {
    tableWrap.innerHTML = renderTableSkeleton(5, 7);
    const res = await getAllComplaints({
      status: statusFilter?.value || 'All',
      category: categoryFilter?.value || 'All',
      search: searchInput?.value || '',
    });

    if (!res.ok) {
      tableWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-admin-cmp' });
      document.getElementById('retry-admin-cmp')?.addEventListener('click', loadComplaints);
      return;
    }

    currentComplaints = res.data;
    currentPage = 1;
    renderComplaintRows();
  }

  statusFilter?.addEventListener('change', loadComplaints);
  categoryFilter?.addEventListener('change', loadComplaints);
  searchInput?.addEventListener('input', loadComplaints);
  await loadComplaints();
}

async function initAdminReports() {
  const hostelChartEl = document.getElementById('report-hostel-occupancy');
  const roomStatusEl = document.getElementById('report-rooms-status');
  const requestsChartEl = document.getElementById('report-requests-status');
  const complaintsChartEl = document.getElementById('report-complaints-status');

  const [summaryRes, occupancyRes] = await Promise.all([getDashboardSummary(), getDashboardOccupancy()]);
  if (!summaryRes.ok) {
    if (hostelChartEl) hostelChartEl.innerHTML = renderErrorState({ description: summaryRes.message });
    return;
  }

  const { summary, hostelOccupancy } = summaryRes.data;
  const liveOccupancy = occupancyRes.ok && occupancyRes.data?.byHostel ? occupancyRes.data.byHostel : hostelOccupancy;

  if (hostelChartEl) {
    hostelChartEl.innerHTML = renderHostelOccupancyBars(liveOccupancy);
  }

  if (roomStatusEl) {
    roomStatusEl.innerHTML =
      summary.totalRooms > 0
        ? renderConicDonut(
            [
              { label: 'Available Rooms', value: summary.availableRooms, color: '#15803d' },
              { label: 'Full Rooms', value: summary.fullRooms, color: '#b91c1c' },
            ],
            summary.totalRooms,
            'Total Rooms'
          )
        : renderEmptyState({ title: 'No Room Data', description: 'Add rooms to inspect capacity ratios.' });
  }

  if (requestsChartEl) {
    const totalReq = summary.pendingRequests + summary.approvedRequests + summary.rejectedRequests;
    requestsChartEl.innerHTML =
      totalReq > 0
        ? renderConicDonut(
            [
              { label: 'Approved', value: summary.approvedRequests, color: '#15803d' },
              { label: 'Pending', value: summary.pendingRequests, color: '#d97706' },
              { label: 'Rejected', value: summary.rejectedRequests, color: '#b91c1c' },
            ],
            totalReq,
            'Requests'
          )
        : renderEmptyState({ title: 'No Applications Yet', description: 'Application decision counts will appear here.' });
  }

  if (complaintsChartEl) {
    const totalCmp = summary.activeComplaints + summary.resolvedComplaints;
    complaintsChartEl.innerHTML =
      totalCmp > 0
        ? renderConicDonut(
            [
              { label: 'Resolved', value: summary.resolvedComplaints, color: '#15803d' },
              { label: 'Pending', value: summary.activeComplaints, color: '#d97706' },
            ],
            totalCmp,
            'Tickets'
          )
        : renderEmptyState({ title: 'No Complaints Logged', description: 'Maintenance ticket metrics will appear here.' });
  }
}

async function initAdminSettings(session) {
  const form = document.getElementById('admin-profile-form');
  const healthPanel = document.getElementById('admin-health-panel');
  const refreshBtn = document.getElementById('refresh-health-btn');

  if (form) {
    form.fullName.value = session.fullName || '';
    form.email.value = session.email || '';
    form.contactNumber.value = session.contactNumber || '';
    form.roleLabel.value = session.designation || 'Hostel Administrator';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(form);
      const btn = document.getElementById('admin-save-profile-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const res = await updateMyProfile({
        fullName: form.fullName.value.trim(),
        contactNumber: form.contactNumber.value.trim(),
      });

      btn.disabled = false;
      btn.textContent = 'Save Profile Changes';

      if (!res.ok) {
        if (res.errors) applyFormErrors(form, res.errors);
        showToast(res.message || 'Unable to update administrator profile.', 'error');
        return;
      }

      const nameEl = document.getElementById('topbar-user-name');
      const avatarEl = document.getElementById('topbar-user-avatar');
      const dropNameEl = document.getElementById('dropdown-user-name');
      if (nameEl) nameEl.textContent = res.data.fullName;
      if (avatarEl) avatarEl.textContent = getInitials(res.data.fullName);
      if (dropNameEl) dropNameEl.textContent = res.data.fullName;
      showToast('Administrator profile updated.', 'success');
    });
  }

  async function loadHealth() {
    if (!healthPanel) return;
    healthPanel.innerHTML = '<div class="skeleton-block" style="height:100px;"></div>';
    const res = await getHealthStatus();
    if (!res.ok) {
      healthPanel.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-health-btn' });
      document.getElementById('retry-health-btn')?.addEventListener('click', loadHealth);
      return;
    }

    const dbConnected = res.database === 'connected';
    healthPanel.innerHTML = `
      <div class="kv-list">
        <div class="kv-item">
          <span class="kv-label">Express API Server</span>
          <span class="kv-value">${renderStatusTag(res.server === 'running' || res.server === 'ok' ? 'Available' : 'Full')} <span style="margin-left:6px;">${escapeHtml(res.server || 'running')}</span></span>
        </div>
        <div class="kv-item">
          <span class="kv-label">MongoDB Atlas Connection</span>
          <span class="kv-value">${renderStatusTag(dbConnected ? 'Available' : 'Full')} <span style="margin-left:6px;">${escapeHtml(res.database || 'unknown')}</span></span>
        </div>
        <div class="kv-item">
          <span class="kv-label">Database Name</span>
          <span class="kv-value font-mono">${escapeHtml(res.databaseName || 'hostelDB')}</span>
        </div>
        <div class="kv-item">
          <span class="kv-label">Server Timestamp</span>
          <span class="kv-value font-mono" style="font-size:0.8125rem;">${escapeHtml(res.timestamp || '')}</span>
        </div>
      </div>
      ${
        !dbConnected && res.lastError
          ? `<div class="alert-banner alert-danger" style="margin-top:16px;">${escapeHtml(res.lastError)}</div>`
          : ''
      }
    `;
  }

  refreshBtn?.addEventListener('click', loadHealth);

  const seedBtn = document.getElementById('seed-sample-campus-btn');
  const seedFeedback = document.getElementById('seed-sample-feedback');
  seedBtn?.addEventListener('click', async () => {
    seedBtn.disabled = true;
    seedBtn.textContent = 'Loading Sample Data...';
    const res = await seedSampleCampusData();
    seedBtn.disabled = false;
    seedBtn.textContent = 'Load Sample Hostels & Rooms';
    if (!res.ok) {
      if (seedFeedback) {
        seedFeedback.innerHTML = `<div class="alert-banner alert-danger">${escapeHtml(res.message || 'Unable to load sample campus records.')}</div>`;
      }
      showToast(res.message || 'Unable to load sample campus records.', 'error');
      return;
    }
    if (seedFeedback) {
      seedFeedback.innerHTML = `<div class="alert-banner alert-success">${escapeHtml(res.message || 'Sample campus hostels and rooms loaded.')}</div>`;
    }
    showToast(res.message || 'Sample campus records loaded.', 'success');
  });

  await loadHealth();
}

const adminPageMap = {
  'admin-dashboard': { active: 'admin-dashboard.html', crumb: 'Overview', init: initAdminDashboard },
  'admin-hostels': { active: 'admin-hostels.html', crumb: 'Hostel Management', init: initAdminHostels },
  'admin-rooms': { active: 'admin-rooms.html', crumb: 'Room Management', init: initAdminRooms },
  'admin-requests': { active: 'admin-requests.html', crumb: 'Room Applications', init: initAdminRequests },
  'admin-students': { active: 'admin-students.html', crumb: 'Student Management', init: initAdminStudents },
  'admin-complaints': { active: 'admin-complaints.html', crumb: 'Complaint Management', init: initAdminComplaints },
  'admin-reports': { active: 'admin-reports.html', crumb: 'Reports & Analytics', init: initAdminReports },
  'admin-settings': { active: 'admin-settings.html', crumb: 'Settings', init: initAdminSettings },
};

if (adminPageMap[pageId]) {
  const session = initPortalShell({
    role: 'admin',
    activePage: adminPageMap[pageId].active,
    breadcrumbLabel: adminPageMap[pageId].crumb,
  });
  if (session) {
    adminPageMap[pageId].init(session);
  }
}
