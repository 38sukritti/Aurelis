/* =============================================================================
   COMMIT NO. 14
   COMMIT BY: Simran
   COMMIT MESSAGE: feat(auth): client-side authentication controller, demo login and session guards
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

const handleLogin = (e) => {
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

    const user = window.StorageModule.findUserByEmail(email);

    if (!user) {
        window.Utils.showFieldError('login-email', 'No account found with this email. Please register.');
        return;
    }

    if (user.password !== password) {
        window.Utils.showFieldError('login-password', 'Incorrect password.');
        return;
    }

    // Set session
    window.StorageModule.setCurrentUser(user);
    window.Utils.showToast(`Welcome back, ${user.name}!`, 'success');

    setTimeout(() => {
        window.location.replace('dashboard.html');
    }, 300);
};

const handleRegister = (e) => {
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

    // Check duplicate
    if (window.StorageModule.findUserByEmail(email)) {
        window.Utils.showFieldError('reg-email', 'An account with this email already exists.');
        return;
    }

    const newUser = { id: email, name, email, password };
    window.StorageModule.saveUser(newUser);
    window.StorageModule.setCurrentUser(newUser);

    window.Utils.showToast(`Account created! Welcome, ${name}.`, 'success');

    setTimeout(() => {
        window.location.replace('dashboard.html');
    }, 300);
};

const handleDemoLogin = () => {
    const demoUser = {
        id: 'demo@aurelis.io',
        name: 'Alex Vance',
        email: 'demo@aurelis.io',
        password: 'password123'
    };

    window.StorageModule.saveUser(demoUser);
    window.StorageModule.setCurrentUser(demoUser);

    // Seed demo transactions if this user currently has none
    const existing = window.StorageModule.getTransactionsForUser(demoUser.email);
    if (existing.length === 0) {
        window.StorageModule.seedDemoDataForUser(demoUser.email);
    }

    window.Utils.showToast('Logged in as Demo User!', 'success');
    setTimeout(() => {
        window.location.replace('dashboard.html');
    }, 250);
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
