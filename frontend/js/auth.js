/* =============================================================================
   AURELIS -- Financial Intelligence & Statistical Anomaly Detector
   Collaborative Development: Sukritti Singla -- Harshita Malhotra -- Simran Kapoor
   ============================================================================= */

'use strict';

const requireAuth = () => {
    const user = window.StorageModule.getCurrentUser();
    if (!user) {
        window.location.replace('login.html');
        return null;
    }
    return user;
};

const switchTab = (tabName) => {
    const loginPanel = document.getElementById('login-panel');
    const registerPanel = document.getElementById('register-panel');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (!loginPanel || !registerPanel) return;

    if (tabName === 'login') {
        loginPanel.classList.remove('hidden-panel');
        registerPanel.classList.add('hidden-panel');
        tabLogin.classList.add('tab-active');
        tabRegister.classList.remove('tab-active');
        tabLogin.setAttribute('aria-selected', 'true');
        tabRegister.setAttribute('aria-selected', 'false');
    } else {
        registerPanel.classList.remove('hidden-panel');
        loginPanel.classList.add('hidden-panel');
        tabRegister.classList.add('tab-active');
        tabLogin.classList.remove('tab-active');
        tabRegister.setAttribute('aria-selected', 'true');
        tabLogin.setAttribute('aria-selected', 'false');
    }
};

const getCurrentUser = () => {
    return window.StorageModule.getCurrentUser();
};

const handleLogin = async (e) => {
    if (e) e.preventDefault();

    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');

    if (!emailEl || !passEl) return;

    window.Utils.clearFieldError('login-email');
    window.Utils.clearFieldError('login-password');

    const email = emailEl.value.trim();
    const password = passEl.value;

    let hasError = false;

    if (!email) {
        window.Utils.showFieldError('login-email', 'Please enter your email address.');
        hasError = true;
    }

    if (!password) {
        window.Utils.showFieldError('login-password', 'Please enter your password.');
        hasError = true;
    }

    if (hasError) return;

    const submitBtn = e && e.target ? e.target.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.disabled = true;

    try {
        // The server checks the password against its bcrypt hash.
        const user = await window.StorageModule.login(email, password);
        window.Utils.showToast(`Welcome back, ${user.name}!`, 'success');

        setTimeout(() => {
            window.location.replace('dashboard.html');
        }, 300);
    } catch (error) {
        if (error.status === 401) {
            window.Utils.showFieldError('login-password', 'Incorrect email or password.');
        } else {
            window.Utils.showToast(error.message, 'danger');
        }
        if (submitBtn) submitBtn.disabled = false;
    }
};

const handleRegister = async (e) => {
    if (e) e.preventDefault();

    const nameEl = document.getElementById('reg-name');
    const emailEl = document.getElementById('reg-email');
    const passEl = document.getElementById('reg-password');
    const confirmEl = document.getElementById('reg-confirm');

    if (!nameEl || !emailEl || !passEl || !confirmEl) return;

    ['reg-name', 'reg-email', 'reg-password', 'reg-confirm'].forEach(id => {
        window.Utils.clearFieldError(id);
    });

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const password = passEl.value;
    const confirm = confirmEl.value;

    let hasError = false;

    if (!name) {
        window.Utils.showFieldError('reg-name', 'Full name is required.');
        hasError = true;
    }

    if (!email) {
        window.Utils.showFieldError('reg-email', 'Email address is required.');
        hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window.Utils.showFieldError('reg-email', 'Enter a valid email address.');
        hasError = true;
    }

    if (!password) {
        window.Utils.showFieldError('reg-password', 'Password is required.');
        hasError = true;
    } else if (password.length < 6) {
        window.Utils.showFieldError('reg-password', 'Password must be at least 6 characters.');
        hasError = true;
    }

    if (password && confirm !== password) {
        window.Utils.showFieldError('reg-confirm', 'Passwords do not match.');
        hasError = true;
    }

    if (hasError) return;

    const submitBtn = e && e.target ? e.target.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.disabled = true;

    try {
        await window.StorageModule.register(name, email, password);
        window.Utils.showToast(`Account created! Welcome, ${name}.`, 'success');

        setTimeout(() => {
            window.location.replace('dashboard.html');
        }, 300);
    } catch (error) {
        if (error.status === 409) {
            window.Utils.showFieldError('reg-email', 'An account with this email already exists.');
        } else if (error.status === 400) {
            window.Utils.showFieldError('reg-email', error.message);
        } else {
            window.Utils.showToast(error.message, 'danger');
        }
        if (submitBtn) submitBtn.disabled = false;
    }
};

const handleDemoLogin = async () => {
    const demoLoginBtn = document.getElementById('demo-login-btn');
    if (demoLoginBtn) demoLoginBtn.disabled = true;

    try {
        // The server creates the shared demo account (and its sample
        // transactions) the first time this is used.
        await window.StorageModule.demoLogin();
        window.Utils.showToast('Logged in as Demo User!', 'success');
        setTimeout(() => {
            window.location.replace('dashboard.html');
        }, 250);
    } catch (error) {
        window.Utils.showToast(error.message, 'danger');
        if (demoLoginBtn) demoLoginBtn.disabled = false;
    }
};

const handleLogout = () => {
    window.StorageModule.clearSession();
    window.Utils.showToast('You have been logged out.', 'info');
    setTimeout(() => {
        window.location.replace('index.html');
    }, 250);
};

// Bind on page load if auth forms exist
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const tabLogin = document.getElementById('tab-login');
    if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));

    const tabRegister = document.getElementById('tab-register');
    if (tabRegister) tabRegister.addEventListener('click', () => switchTab('register'));

    const demoLoginBtn = document.getElementById('demo-login-btn');
    if (demoLoginBtn) demoLoginBtn.addEventListener('click', handleDemoLogin);
});

const Auth = {
    requireAuth,
    getCurrentUser,
    switchTab,
    handleLogin,
    handleRegister,
    handleDemoLogin,
    handleLogout
};

window.Auth = Auth;
