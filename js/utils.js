/* =============================================================================
   COMMIT NO. 03
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(utils): create currency formatting, date helpers and DOM utility functions
   ============================================================================= */

/**
 * utils.js
 * Formatting, DOM helpers, toast alerts, and validation utilities.
 */

'use strict';

const Utils = {

    formatCurrency: function (amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    },

    formatDate: function (dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    },

    generateId: function (prefix = 'TXN') {
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${ts}-${rand}`;
    },

    showFieldError: function (fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.classList.add('input-error');

        let errorEl = field.parentElement.querySelector('.form-error');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'form-error';
            field.parentElement.appendChild(errorEl);
        }
        errorEl.textContent = message;
    },

    clearFieldError: function (fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.classList.remove('input-error');

        const errorEl = field.parentElement.querySelector('.form-error');
        if (errorEl) errorEl.remove();
    },

    showToast: function (message, type = 'info', duration = 3500) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

window.Utils = Utils;
