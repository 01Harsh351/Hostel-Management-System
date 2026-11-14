import { getHostels, getMyComplaints, getStudentDashboardData, submitComplaint } from './api.js';
import {
  applyFormErrors,
  bindPaginationBar,
  clearFormErrors,
  escapeHtml,
  formatShortId,
  initPortalShell,
  paginateItems,
  renderEmptyState,
  renderErrorState,
  renderPaginationBar,
  renderStatusTag,
  renderTableSkeleton,
  showToast,
} from './app.js';
import { validateComplaintForm } from './domain.js';

const pageId = document.body.dataset.page;
const isMyComplaintsPage = pageId === 'my-complaints';

const session = initPortalShell({
  role: 'student',
  activePage: isMyComplaintsPage ? 'my-complaints.html' : 'complaints.html',
  breadcrumbLabel: isMyComplaintsPage ? 'My Complaints' : 'Raise Complaint',
});

async function initComplaintsModule() {
  if (!session) return;

  const form = document.getElementById('complaint-submit-form');
  const hostelSelect = document.getElementById('complaint-hostel');
  const roomInput = document.getElementById('complaint-room');
  const submitBtn = document.getElementById('complaint-submit-btn');

  const historyWrap =
    document.getElementById('my-complaints-table-wrap') || document.getElementById('complaints-history-wrap');
  const statusFilter =
    document.getElementById('my-complaints-status') || document.getElementById('complaints-status-filter');
  const categoryFilter = document.getElementById('my-complaints-category');
  const searchInput = document.getElementById('my-complaints-search');

  if (form) {
    const [hostelRes, dashRes] = await Promise.all([getHostels(), getStudentDashboardData()]);
    const studentInfo = dashRes.ok ? dashRes.data.student : session;

    if (hostelRes.ok && hostelSelect) {
      hostelSelect.innerHTML =
        '<option value="">Select hostel...</option>' +
        hostelRes.data.map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.name)}</option>`).join('');

      if (studentInfo.allocatedHostelId) {
        hostelSelect.value = studentInfo.allocatedHostelId;
      }
    }

    if (roomInput && studentInfo.allocatedRoomNumber) {
      roomInput.value = studentInfo.allocatedRoomNumber;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(form);

      const payload = {
        studentId: session.studentId,
        studentName: session.fullName,
        category: form.category.value,
        hostelId: form.hostelId.value,
        roomNumber: form.roomNumber.value,
        description: form.description.value,
      };

      const validation = validateComplaintForm(payload);
      if (!validation.valid) {
        applyFormErrors(form, validation.errors);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      const res = await submitComplaint(payload);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Maintenance Complaint';

      if (!res.ok) {
        if (res.errors) applyFormErrors(form, res.errors);
        showToast(res.message || 'Could not submit complaint.', 'error');
        return;
      }

      form.description.value = '';
      showToast(`Complaint ${formatShortId(res.data.id)} logged with Pending status.`, 'success');
      await loadHistory();
    });
  }

  let allComplaints = [];
  let currentPage = 1;
  const pageSize = 8;

  function renderComplaintRows() {
    if (!historyWrap) return;

    const stVal = statusFilter?.value || 'All';
    const catVal = categoryFilter?.value || 'All';
    const q = (searchInput?.value || '').trim().toLowerCase();

    const items = allComplaints.filter((c) => {
      if (stVal !== 'All' && c.status !== stVal) return false;
      if (catVal !== 'All' && c.category !== catVal) return false;
      if (
        q &&
        !c.roomNumber.toLowerCase().includes(q) &&
        !c.category.toLowerCase().includes(q) &&
        !c.description.toLowerCase().includes(q) &&
        !c.hostelName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    if (items.length === 0) {
      historyWrap.innerHTML = renderEmptyState({
        title: 'No Complaint Records Found',
        description: isMyComplaintsPage
          ? 'You have no maintenance tickets matching the current filter.'
          : 'Submit the maintenance form to log an electrical, plumbing, water, or general issue.',
        actionHtml: isMyComplaintsPage
          ? '<a href="complaints.html" class="btn btn-primary btn-sm">Raise New Complaint</a>'
          : '',
      });
      return;
    }

    const paged = paginateItems(items, currentPage, pageSize);
    currentPage = paged.page;

    historyWrap.innerHTML = `
      <div class="table-responsive">
        <table class="erp-table mobile-cards">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Category</th>
              <th>Room</th>
              <th>Description</th>
              <th>Submission Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items
              .map(
                (c) => `
              <tr>
                <td data-label="Complaint ID" class="font-mono table-primary-text">${escapeHtml(formatShortId(c.id))}</td>
                <td data-label="Category">${escapeHtml(c.category)}</td>
                <td data-label="Room" class="font-mono">${escapeHtml(c.roomNumber)}<div class="table-sub-text">${escapeHtml(c.hostelName)}</div></td>
                <td data-label="Description">
                  <div>${escapeHtml(c.description)}</div>
                  ${
                    c.resolutionNote
                      ? `<div class="table-sub-text">Resolution: ${escapeHtml(c.resolutionNote)}</div>`
                      : ''
                  }
                </td>
                <td data-label="Date" class="font-mono">${escapeHtml(c.submittedDate)}</td>
                <td data-label="Status">${renderStatusTag(c.status)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar({ page: paged.page, totalItems: paged.totalItems, pageSize })}
    `;

    bindPaginationBar(historyWrap, (nextPage) => {
      currentPage = nextPage;
      renderComplaintRows();
    });
  }

  async function loadHistory() {
    if (!historyWrap) return;
    historyWrap.innerHTML = renderTableSkeleton(4, 5);
    const res = await getMyComplaints(session.studentId);

    if (!res.ok) {
      historyWrap.innerHTML = renderErrorState({ description: res.message, retryId: 'retry-complaints-btn' });
      document.getElementById('retry-complaints-btn')?.addEventListener('click', loadHistory);
      return;
    }

    allComplaints = res.data;
    currentPage = 1;
    renderComplaintRows();
  }

  statusFilter?.addEventListener('change', () => {
    currentPage = 1;
    renderComplaintRows();
  });
  categoryFilter?.addEventListener('change', () => {
    currentPage = 1;
    renderComplaintRows();
  });
  searchInput?.addEventListener('input', () => {
    currentPage = 1;
    renderComplaintRows();
  });

  await loadHistory();
}

initComplaintsModule();
