import { getMyRequests, getStudentDashboardData, updateStudentProfile } from './api.js';
import {
  bindPaginationBar,
  escapeHtml,
  formatShortId,
  getInitials,
  initPortalShell,
  paginateItems,
  renderEmptyState,
  renderErrorState,
  renderPaginationBar,
  renderStatusTag,
  renderTableSkeleton,
  showToast,
} from './app.js';

const pageId = document.body.dataset.page;

async function initStudentDashboard(session) {
  const welcomeEl = document.getElementById('student-welcome-heading');
  const kpiWrap = document.getElementById('student-kpi-grid');
  const profileWrap = document.getElementById('student-profile-summary');
  const roomWrap = document.getElementById('student-room-summary');
  const availRoomsWrap = document.getElementById('student-available-rooms-summary');
  const activityWrap = document.getElementById('student-activity-list');

  if (welcomeEl) {
    welcomeEl.textContent = `Welcome back, ${session.fullName}`;
  }

  async function loadDashboard() {
    if (profileWrap) profileWrap.innerHTML = renderTableSkeleton(4, 2);
    if (roomWrap) roomWrap.innerHTML = renderTableSkeleton(3, 2);
    if (availRoomsWrap) availRoomsWrap.innerHTML = renderTableSkeleton(3, 2);
    if (activityWrap) activityWrap.innerHTML = renderTableSkeleton(3, 2);

    const res = await getStudentDashboardData(session.studentId);
    if (!res.ok) {
      if (profileWrap) {
        profileWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-student-dash' });
        document.getElementById('retry-student-dash')?.addEventListener('click', loadDashboard);
      }
      if (roomWrap) roomWrap.innerHTML = '';
      if (availRoomsWrap) availRoomsWrap.innerHTML = '';
      if (activityWrap) activityWrap.innerHTML = '';
      return;
    }

    const {
      student,
      room,
      hostel,
      roommates,
      pendingRequest,
      availableRoomsSummary = { availableRoomsCount: 0, availableBedsCount: 0, preview: [] },
      complaintSummary,
      recentActivity,
    } = res.data;

    if (kpiWrap) {
      kpiWrap.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-card-top">
            <span class="kpi-label">Allocation Status</span>
          </div>
          <div class="kpi-value" style="font-size:1.25rem;padding-top:4px;">${renderStatusTag(student.allocationStatus)}</div>
          <div class="kpi-foot">${hostel ? escapeHtml(hostel.name) : 'No hostel assigned yet'}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-top">
            <span class="kpi-label">Room Number &amp; Type</span>
          </div>
          <div class="kpi-value font-mono">${room ? escapeHtml(room.roomNumber) : '—'}</div>
          <div class="kpi-foot">${
            room ? `${escapeHtml(room.roomType)} (${room.occupiedCount}/${room.capacity} occupied)` : 'Apply for an available room'
          }</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-top">
            <span class="kpi-label">Pending Application</span>
          </div>
          <div class="kpi-value font-mono">${pendingRequest ? escapeHtml(formatShortId(pendingRequest.id)) : 'None'}</div>
          <div class="kpi-foot">${
            pendingRequest
              ? `${escapeHtml(pendingRequest.hostelName)} · Room ${escapeHtml(pendingRequest.roomNumber)}`
              : 'No pending applications'
          }</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-top">
            <span class="kpi-label">Complaints Summary</span>
          </div>
          <div class="kpi-value font-mono">${complaintSummary.pending} <span style="font-size:0.9rem;font-weight:500;color:var(--text-muted);">open</span></div>
          <div class="kpi-foot">${complaintSummary.resolved} resolved · ${complaintSummary.total} total submitted</div>
        </div>
      `;
    }

    if (profileWrap) {
      profileWrap.innerHTML = `
        <div class="kv-list">
          <div class="kv-item">
            <span class="kv-label">Full Name</span>
            <span class="kv-value">${escapeHtml(student.fullName)}</span>
          </div>
          <div class="kv-item">
            <span class="kv-label">Student ID</span>
            <span class="kv-value font-mono">${escapeHtml(student.studentId)}</span>
          </div>
          <div class="kv-item">
            <span class="kv-label">University Email</span>
            <span class="kv-value">${escapeHtml(student.email)}</span>
          </div>
          <div class="kv-item">
            <span class="kv-label">Contact Number</span>
            <span class="kv-value font-mono">${escapeHtml(student.contactNumber)}</span>
          </div>
          <div class="kv-item">
            <span class="kv-label">Department &amp; Year</span>
            <span class="kv-value">${escapeHtml(student.department)} · ${escapeHtml(student.year)}</span>
          </div>
          <div class="kv-item">
            <span class="kv-label">Gender</span>
            <span class="kv-value">${escapeHtml(student.gender)}</span>
          </div>
        </div>
      `;
    }

    if (roomWrap) {
      if (room && hostel) {
        const roommateMarkup =
          roommates.length > 0
            ? roommates
                .map(
                  (rm) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-hairline);">
                  <div>
                    <div class="table-primary-text">${escapeHtml(rm.fullName)}</div>
                    <div class="table-sub-text">${escapeHtml(rm.department)} · ${escapeHtml(rm.year)}</div>
                  </div>
                  <span class="font-mono table-sub-text">${escapeHtml(rm.studentId)}</span>
                </div>`
                )
                .join('')
            : `<p class="table-sub-text">No other roommates currently assigned to this room.</p>`;

        roomWrap.innerHTML = `
          <div class="kv-list" style="margin-bottom:14px;">
            <div class="kv-item">
              <span class="kv-label">Assigned Hostel</span>
              <span class="kv-value">${escapeHtml(hostel.name)} (${escapeHtml(hostel.type)})</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">Room &amp; Floor</span>
              <span class="kv-value font-mono">${escapeHtml(room.roomNumber)} · ${escapeHtml(room.floor)}</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">Room Type</span>
              <span class="kv-value">${escapeHtml(room.roomType)} (${room.capacity} beds)</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">Warden</span>
              <span class="kv-value">${escapeHtml(hostel.warden)}</span>
            </div>
          </div>
          <div>
            <div class="kv-label" style="margin-bottom:6px;">Roommate Information</div>
            ${roommateMarkup}
          </div>
        `;
      } else {
        roomWrap.innerHTML = renderEmptyState({
          title: 'No Room Allocated Yet',
          description: pendingRequest
            ? `Your application ${formatShortId(pendingRequest.id)} for Room ${pendingRequest.roomNumber} is currently pending warden approval.`
            : 'Browse available rooms across campus hostels and submit a room allocation request.',
          actionHtml: '<a href="room-application.html" class="btn btn-primary btn-sm">Apply for Hostel</a>',
        });
      }
    }

    if (availRoomsWrap) {
      if (availableRoomsSummary.availableRoomsCount === 0 || !availableRoomsSummary.preview.length) {
        availRoomsWrap.innerHTML = renderEmptyState({
          title: 'No room records found',
          description: 'There are currently no rooms marked Available in the residence inventory.',
          actionHtml: '<a href="rooms.html" class="btn btn-secondary btn-sm">Open Room Directory</a>',
        });
      } else {
        availRoomsWrap.innerHTML = `
          <div class="kv-list" style="margin-bottom:14px;">
            <div class="kv-item">
              <span class="kv-label">Available Rooms</span>
              <span class="kv-value font-mono">${availableRoomsSummary.availableRoomsCount}</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">Open Beds</span>
              <span class="kv-value font-mono">${availableRoomsSummary.availableBedsCount}</span>
            </div>
          </div>
          <div>
            ${availableRoomsSummary.preview
              .map(
                (rm) => `
              <div class="avail-room-mini-row">
                <div>
                  <div class="table-primary-text font-mono">Room ${escapeHtml(rm.roomNumber)} <span style="font-family:var(--font-body);font-weight:500;">(${escapeHtml(rm.roomType)})</span></div>
                  <div class="table-sub-text">${escapeHtml(rm.hostelName)} · ${rm.availableSeats} bed${rm.availableSeats === 1 ? '' : 's'} free</div>
                </div>
                <a href="room-application.html?room=${encodeURIComponent(rm.id)}" class="btn btn-secondary btn-sm">Apply</a>
              </div>`
              )
              .join('')}
          </div>
        `;
      }
    }

    if (activityWrap) {
      if (recentActivity.length === 0) {
        activityWrap.innerHTML = renderEmptyState({
          title: 'No Recent Updates',
          description: 'Room applications and maintenance complaints you submit will appear here.',
        });
      } else {
        activityWrap.innerHTML = `
          <div class="activity-list">
            ${recentActivity
              .map(
                (act) => `
              <div class="activity-item">
                <div>
                  <div class="activity-title">${escapeHtml(act.title)}</div>
                  <div class="activity-meta">${escapeHtml(act.meta)}</div>
                </div>
                <span class="activity-date">${escapeHtml(act.date)}</span>
              </div>`
              )
              .join('')}
          </div>
        `;
      }
    }
  }

  await loadDashboard();
}

async function initMyRoomPage(session) {
  const container = document.getElementById('my-room-container');
  if (!container) return;
  container.innerHTML = renderTableSkeleton(3, 3);

  const res = await getStudentDashboardData(session.studentId);
  if (!res.ok) {
    container.innerHTML = renderErrorState({ description: res.message });
    return;
  }

  const { student, room, hostel, roommates, pendingRequest } = res.data;
  if (!room || !hostel) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-body">
          ${renderEmptyState({
            title: 'Room Not Yet Allocated',
            description: pendingRequest
              ? `Request ${formatShortId(pendingRequest.id)} for ${pendingRequest.hostelName} (${pendingRequest.roomNumber}) is awaiting review.`
              : 'You do not currently hold an active hostel bed allocation.',
            actionHtml: '<a href="room-application.html" class="btn btn-primary">Apply for Hostel Room</a>',
          })}
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="dashboard-split">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Allocated Room ${escapeHtml(room.roomNumber)}</h2>
            <p class="panel-subtitle">${escapeHtml(hostel.name)} · ${escapeHtml(hostel.address)}</p>
          </div>
          ${renderStatusTag(student.allocationStatus)}
        </div>
        <div class="panel-body">
          <div class="kv-list" style="margin-bottom:20px;">
            <div class="kv-item">
              <span class="kv-label">Room Type</span>
              <span class="kv-value">${escapeHtml(room.roomType)}</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">Occupancy</span>
              <span class="kv-value font-mono">${room.occupiedCount} / ${room.capacity} Occupied</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">Floor</span>
              <span class="kv-value">${escapeHtml(room.floor)}</span>
            </div>
            <div class="kv-item">
              <span class="kv-label">Hostel Warden</span>
              <span class="kv-value">${escapeHtml(hostel.warden)}</span>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="complaints.html" class="btn btn-primary btn-sm">Raise Maintenance Complaint</a>
            <a href="rooms.html" class="btn btn-secondary btn-sm">Browse Other Rooms</a>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Roommates &amp; Living Space</h2>
        </div>
        <div class="panel-body" style="display:flex;flex-direction:column;gap:16px;">
          <img src="assets/images/hostel_room_interior.jpg" alt="Representative university hostel room interior" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;border:1px solid var(--border-hairline);" referrerpolicy="no-referrer" />
          ${
            roommates.length > 0
              ? roommates
                  .map(
                    (rm) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-canvas);border:1px solid var(--border-hairline);border-radius:8px;">
                    <div>
                      <div class="table-primary-text">${escapeHtml(rm.fullName)}</div>
                      <div class="table-sub-text">${escapeHtml(rm.department)} · ${escapeHtml(rm.contactNumber)}</div>
                    </div>
                    <span class="font-mono table-sub-text">${escapeHtml(rm.studentId)}</span>
                  </div>`
                  )
                  .join('')
              : '<p class="table-sub-text">Single occupancy or no roommates currently assigned.</p>'
          }
        </div>
      </div>
    </div>
  `;
}

async function initMyRequestsPage(session) {
  const tableWrap = document.getElementById('my-requests-table-wrap');
  const statusFilter = document.getElementById('my-requests-filter');
  if (!tableWrap) return;

  let allRequests = [];
  let currentPage = 1;
  const pageSize = 8;

  function renderRows() {
    const filterVal = statusFilter?.value || 'All';
    const items = filterVal === 'All' ? allRequests : allRequests.filter((r) => r.status === filterVal);

    if (items.length === 0) {
      tableWrap.innerHTML = renderEmptyState({
        title: 'No Room Applications Found',
        description: 'You have not submitted any room allocation requests matching this filter.',
        actionHtml: '<a href="room-application.html" class="btn btn-primary btn-sm">Apply for a Room</a>',
      });
      return;
    }

    const paged = paginateItems(items, currentPage, pageSize);
    currentPage = paged.page;

    tableWrap.innerHTML = `
      <div class="table-responsive">
        <table class="erp-table mobile-cards">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Hostel</th>
              <th>Room</th>
              <th>Type</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Administration Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items
              .map(
                (r) => `
              <tr>
                <td data-label="Request ID" class="font-mono table-primary-text">${escapeHtml(formatShortId(r.id))}</td>
                <td data-label="Hostel">${escapeHtml(r.hostelName)}</td>
                <td data-label="Room" class="font-mono">${escapeHtml(r.roomNumber)}</td>
                <td data-label="Type">${escapeHtml(r.roomType)}</td>
                <td data-label="Request Date" class="font-mono">${escapeHtml(r.requestDate)}</td>
                <td data-label="Status">${renderStatusTag(r.status)}</td>
                <td data-label="Remarks">${escapeHtml(r.adminNote || r.notes || '—')}</td>
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
      renderRows();
    });
  }

  async function loadRequests() {
    tableWrap.innerHTML = renderTableSkeleton(4, 6);
    const res = await getMyRequests(session.studentId);
    if (!res.ok) {
      tableWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-my-req' });
      document.getElementById('retry-my-req')?.addEventListener('click', loadRequests);
      return;
    }
    allRequests = res.data;
    currentPage = 1;
    renderRows();
  }

  statusFilter?.addEventListener('change', () => {
    currentPage = 1;
    renderRows();
  });
  await loadRequests();
}

async function initProfilePage(session) {
  const form = document.getElementById('student-profile-form');
  if (!form) return;

  const res = await getStudentDashboardData(session.studentId);
  const student = res.ok ? res.data.student : session;

  form.fullName.value = student.fullName || '';
  form.studentId.value = student.studentId || '';
  form.email.value = student.email || '';
  form.contactNumber.value = student.contactNumber || '';
  form.gender.value = student.gender || '';
  form.department.value = student.department || '';
  form.year.value = student.year || '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const updateRes = await updateStudentProfile(session.studentId, {
      fullName: form.fullName.value,
      contactNumber: form.contactNumber.value,
      department: form.department.value,
      year: form.year.value,
    });

    btn.disabled = false;
    btn.textContent = 'Save Profile Changes';

    if (updateRes.ok) {
      const topbarName = document.getElementById('topbar-user-name');
      const topbarAvatar = document.getElementById('topbar-user-avatar');
      const dropName = document.getElementById('dropdown-user-name');
      if (topbarName) topbarName.textContent = updateRes.data.fullName;
      if (topbarAvatar) topbarAvatar.textContent = getInitials(updateRes.data.fullName);
      if (dropName) dropName.textContent = updateRes.data.fullName;
      showToast('Student profile updated successfully.', 'success');
    } else {
      showToast(updateRes.message || 'Unable to save profile.', 'error');
    }
  });
}

const pageMap = {
  'student-dashboard': { active: 'student-dashboard.html', crumb: 'My Dashboard', init: initStudentDashboard },
  'my-room': { active: 'my-room.html', crumb: 'My Room Details', init: initMyRoomPage },
  'my-requests': { active: 'my-requests.html', crumb: 'My Applications', init: initMyRequestsPage },
  'student-profile': { active: 'profile.html', crumb: 'My Profile', init: initProfilePage },
};

if (pageMap[pageId]) {
  const session = initPortalShell({
    role: 'student',
    activePage: pageMap[pageId].active,
    breadcrumbLabel: pageMap[pageId].crumb,
  });
  if (session) {
    pageMap[pageId].init(session);
  }
}
