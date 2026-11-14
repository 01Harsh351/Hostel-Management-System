import { loginUser, logoutUser, registerUser } from './api.js';
import { applyFormErrors, clearFormErrors, showToast } from './app.js';
import { validateLogin, validateStudentRegistration } from './domain.js';

const LAST_REGISTERED_STUDENT_KEY = 'unistay_last_registered_email';

function setButtonBusy(btn, busy, busyText, idleText) {
  if (!btn) return;
  btn.disabled = busy;
  btn.textContent = busy ? busyText : idleText;
}

function showBanner(feedbackEl, variantClass, message) {
  if (!feedbackEl) return;
  feedbackEl.hidden = false;
  feedbackEl.className = `alert-banner ${variantClass}`;
  const textEl = feedbackEl.querySelector('[data-alert-text]');
  if (textEl) {
    textEl.textContent = message;
  } else {
    feedbackEl.textContent = message;
  }
}

function initStudentLogin() {
  const form = document.getElementById('student-login-form');
  if (!form) return;

  const feedbackEl = document.getElementById('auth-feedback');
  const submitBtn = document.getElementById('student-login-submit');
  const sampleFillBtn = document.getElementById('fill-sample-student-login-btn');
  let isSubmitting = false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('registered') === '1') {
    const prefillEmail = params.get('email');
    if (prefillEmail && form.email) {
      form.email.value = prefillEmail;
    }
    showBanner(
      feedbackEl,
      'alert-success',
      'Student profile created successfully. Click Enter Student Portal to continue.'
    );
  } else if (params.get('denied') === '1') {
    showBanner(
      feedbackEl,
      'alert-danger',
      'Access denied. Please enter via a Student account.'
    );
  } else if (params.get('loggedOut') === '1') {
    showBanner(feedbackEl, 'alert-info', 'You have been signed out.');
  }

  sampleFillBtn?.addEventListener('click', () => {
    clearFormErrors(form);
    let savedEmail = '';
    try {
      savedEmail = sessionStorage.getItem(LAST_REGISTERED_STUDENT_KEY) || '';
    } catch {
      savedEmail = '';
    }
    if (form.fullName && !form.fullName.value.trim()) {
      form.fullName.value = 'Aarav Sharma';
    }
    if (form.email) {
      form.email.value = savedEmail || 'aarav.sharma@university.edu';
    }
    showBanner(
      feedbackEl,
      'alert-info',
      `Sample student entry filled (${form.email.value}). Click Enter Student Portal to continue.`
    );
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearFormErrors(form);
    if (feedbackEl) feedbackEl.hidden = true;

    const emailValue = form.email?.value.trim() || '';
    const nameValue = form.fullName?.value.trim() || '';

    const clientCheck = validateLogin({ email: emailValue });
    if (!clientCheck.valid) {
      applyFormErrors(form, clientCheck.errors);
      return;
    }

    const payload = {
      email: emailValue || 'student@university.edu',
      ...(nameValue ? { name: nameValue } : {}),
      expectedRole: 'student',
    };

    isSubmitting = true;
    setButtonBusy(submitBtn, true, 'Entering portal...', 'Enter Student Portal');
    const res = await loginUser(payload);
    isSubmitting = false;
    setButtonBusy(submitBtn, false, 'Entering portal...', 'Enter Student Portal');

    if (!res.ok) {
      if (res.errors) applyFormErrors(form, res.errors);
      showBanner(feedbackEl, 'alert-danger', res.message || 'Unable to enter Student Portal.');
      return;
    }

    if (res.data?.role !== 'student') {
      logoutUser();
      showBanner(feedbackEl, 'alert-danger', 'Administrators must enter through the Admin Console.');
      return;
    }

    showToast(`Welcome, ${res.data.fullName}.`, 'success');
    window.location.href = 'student-dashboard.html';
  });
}

function initAdminLogin() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  const feedbackEl = document.getElementById('admin-auth-feedback');
  const submitBtn = document.getElementById('admin-login-submit');
  const sampleEmailBtn = document.getElementById('fill-sample-admin-email-btn');
  let isSubmitting = false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('denied') === 'admin') {
    showBanner(
      feedbackEl,
      'alert-danger',
      'Access denied. Administrator role is required to access the Admin Console.'
    );
  } else if (params.get('loggedOut') === '1') {
    showBanner(feedbackEl, 'alert-info', 'Administrator session ended.');
  }

  sampleEmailBtn?.addEventListener('click', () => {
    clearFormErrors(form);
    if (form.fullName && !form.fullName.value.trim()) {
      form.fullName.value = 'Hostel Chief Warden';
    }
    if (form.email) {
      form.email.value = 'warden.admin@university.edu';
    }
    showBanner(
      feedbackEl,
      'alert-info',
      'Sample administrator entry filled. Click Enter Admin Console to continue.'
    );
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearFormErrors(form);
    if (feedbackEl) feedbackEl.hidden = true;

    const emailValue = form.email?.value.trim() || '';
    const nameValue = form.fullName?.value.trim() || '';

    const clientCheck = validateLogin({ email: emailValue });
    if (!clientCheck.valid) {
      applyFormErrors(form, clientCheck.errors);
      return;
    }

    const payload = {
      email: emailValue || 'warden.admin@university.edu',
      ...(nameValue ? { name: nameValue } : {}),
      expectedRole: 'admin',
    };

    isSubmitting = true;
    setButtonBusy(submitBtn, true, 'Opening console...', 'Enter Admin Console');
    const res = await loginUser(payload);
    isSubmitting = false;
    setButtonBusy(submitBtn, false, 'Opening console...', 'Enter Admin Console');

    if (!res.ok) {
      if (res.errors) applyFormErrors(form, res.errors);
      showBanner(feedbackEl, 'alert-danger', res.message || 'Unable to enter Admin Console.');
      return;
    }

    if (res.data?.role !== 'admin') {
      logoutUser();
      showBanner(feedbackEl, 'alert-danger', 'This portal is restricted to Hostel Administrators.');
      return;
    }

    showToast('Administrator console opened.', 'success');
    window.location.href = 'admin-dashboard.html';
  });
}

function initStudentRegister() {
  const form = document.getElementById('student-register-form');
  if (!form) return;

  const feedbackEl = document.getElementById('register-feedback');
  const submitBtn = document.getElementById('register-submit-btn');
  const sampleFillBtn = document.getElementById('fill-sample-register-btn');
  let isSubmitting = false;

  sampleFillBtn?.addEventListener('click', () => {
    clearFormErrors(form);
    const suffix = String(Math.floor(100 + Math.random() * 900));
    form.fullName.value = 'Aarav Sharma';
    form.studentId.value = `STU-2026-${suffix}`;
    form.email.value = `aarav.sharma.${suffix}@university.edu`;
    form.contactNumber.value = '+91 98765 43210';
    form.gender.value = 'Male';
    showBanner(
      feedbackEl,
      'alert-info',
      `Sample student entry populated (${form.email.value}). Click Create Student Account to register.`
    );
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearFormErrors(form);
    if (feedbackEl) feedbackEl.hidden = true;

    const payload = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      studentId: form.studentId.value.trim(),
      contactNumber: form.contactNumber.value.trim(),
      gender: form.gender.value.trim(),
    };

    const validation = validateStudentRegistration(payload);
    if (!validation.valid) {
      applyFormErrors(form, validation.errors);
      return;
    }

    isSubmitting = true;
    setButtonBusy(submitBtn, true, 'Creating account...', 'Create Student Account');
    const res = await registerUser(payload, { autoLogin: false });
    isSubmitting = false;
    setButtonBusy(submitBtn, false, 'Creating account...', 'Create Student Account');

    if (!res.ok) {
      if (res.errors) applyFormErrors(form, res.errors);
      showBanner(feedbackEl, 'alert-danger', res.message || 'Unable to complete registration. Please check your details.');
      return;
    }

    try {
      sessionStorage.setItem(LAST_REGISTERED_STUDENT_KEY, res.data?.email || payload.email);
    } catch {
      // Ignore storage restrictions
    }

    showBanner(
      feedbackEl,
      'alert-success',
      'Student profile created successfully. Redirecting to Student Sign In...'
    );
    showToast('Student profile created!', 'success');
    window.location.href = `login.html?registered=1&email=${encodeURIComponent(res.data?.email || payload.email)}`;
  });
}

initStudentLogin();
initAdminLogin();
initStudentRegister();
