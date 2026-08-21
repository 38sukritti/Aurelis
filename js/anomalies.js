/* =============================================================================
   COMMIT NO. 27
   COMMIT BY: Simran
   COMMIT MESSAGE: feat(anomalies): anomaly filter handlers, threshold slider and table updates
   ============================================================================= */

'use strict';

let currentUser = null;
let allDecorated = [];
let activeFilter = 'all'; // 'all' | 'anomalies' | 'normal'
let activeCategory = '';
let currentThreshold = 3.0;

const initAnomaliesPage = () => {
    currentUser = window.Auth.requireAuth();
    if (!currentUser) return;

    // Set user profile info
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

    // Bind logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', window.Auth.handleLogout);

    // Bind threshold slider
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdVal = document.getElementById('threshold-val');
    const settings = window.StorageModule.getSettings();
    currentThreshold = settings.zScoreThreshold || 3.0;

    if (thresholdSlider && thresholdVal) {
        thresholdSlider.value = currentThreshold;
        thresholdVal.textContent = `${parseFloat(currentThreshold).toFixed(1)}σ`;

        thresholdSlider.addEventListener('input', (e) => {
            currentThreshold = parseFloat(e.target.value);
            thresholdVal.textContent = `${currentThreshold.toFixed(1)}σ`;
            window.StorageModule.updateSetting('zScoreThreshold', currentThreshold);
            loadAndRender();
        });
    }

    // Bind filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-filter') || 'all';
            renderTable();
        });
    });

    // Bind category select
    const categorySelect = document.getElementById('filter-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            activeCategory = e.target.value;
            renderTable();
        });
    }

    loadAndRender();
};

const loadAndRender = () => {
    const transactions = window.StorageModule.getTransactionsForUser(currentUser.email);
    const { decoratedTransactions, anomalies, normal } = window.AnomalyDetector.detectAnomalies(
        transactions,
        currentThreshold
    );

    allDecorated = decoratedTransactions;

    // Update KPI strip
    const totalEl = document.getElementById('summary-total');
    const anomEl = document.getElementById('summary-anomalies');
    const normEl = document.getElementById('summary-normal');
    const threshEl = document.getElementById('threshold-display');

    if (totalEl) totalEl.textContent = transactions.length;
    if (anomEl) anomEl.textContent = anomalies.length;
    if (normEl) normEl.textContent = normal.length;
    if (threshEl) threshEl.textContent = `${currentThreshold.toFixed(1)}σ`;

    populateCategoryFilter(transactions);
    renderTable();
};

const populateCategoryFilter = (transactions) => {
    const select = document.getElementById('filter-category');
    if (!select) return;

    const currentVal = select.value;
    const cats = [...new Set(transactions.map(tx => tx.category || 'Other'))].sort();

    select.innerHTML = '<option value="">All Categories</option>';
    cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === currentVal) opt.selected = true;
        select.appendChild(opt);
    });
};

const renderTable = () => {
    const tbody = document.getElementById('anomalies-table-body');
    const emptyNotice = document.getElementById('empty-notice');
    if (!tbody) return;

    // Apply active filter
    let filtered = allDecorated;

    if (activeFilter === 'anomalies') {
        filtered = filtered.filter(tx => tx.isAnomaly);
    } else if (activeFilter === 'normal') {
        filtered = filtered.filter(tx => !tx.isAnomaly);
    }

    // Apply category filter
    if (activeCategory) {
        filtered = filtered.filter(tx => (tx.category || 'Other') === activeCategory);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyNotice) emptyNotice.style.display = 'block';
        return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';

    tbody.innerHTML = filtered.map(tx => {
        let badgeHtml = '<span class="badge badge-normal">Normal</span>';
        let zScoreDisplay = `${tx.zScore > 0 ? '+' : ''}${tx.zScore.toFixed(2)}σ`;

        if (tx.insufficientData) {
            badgeHtml = '<span class="badge badge-insufficient">Need &ge;3 txs</span>';
            zScoreDisplay = '—';
        } else if (tx.isAnomaly) {
            badgeHtml = `<span class="badge badge-${tx.severity}">${tx.severity.toUpperCase()}</span>`;
        }

        const meanDisplay = tx.insufficientData ? '—' : window.Utils.formatCurrency(tx.mean);
        const stdDisplay = tx.insufficientData ? '—' : window.Utils.formatCurrency(tx.standardDeviation);

        return `
            <tr data-id="${tx.id}">
                <td>${window.Utils.formatDate(tx.date)}</td>
                <td><strong style="color: var(--text-primary);">${tx.category}</strong></td>
                <td style="color: var(--text-secondary);">${tx.description || '—'}</td>
                <td class="cell-amount">${window.Utils.formatCurrency(tx.amount)}</td>
                <td style="font-family: monospace; color: var(--text-secondary);">${meanDisplay}</td>
                <td style="font-family: monospace; color: var(--text-secondary);">${stdDisplay}</td>
                <td style="font-family: monospace; font-weight: 600; color: ${tx.isAnomaly ? 'var(--status-danger)' : 'var(--text-primary)'};">${zScoreDisplay}</td>
                <td>${badgeHtml}</td>
                <td style="text-align: right;">
                    <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--status-danger);" onclick="deleteAnomTx('${tx.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

const deleteAnomTx = (txId) => {
    if (confirm('Delete this transaction?')) {
        window.StorageModule.deleteTransaction(txId);
        window.Utils.showToast('Transaction deleted.', 'info');
        loadAndRender();
    }
};

window.deleteAnomTx = deleteAnomTx;
window.AnomaliesPage = {
    initAnomaliesPage,
    loadAndRender,
    renderTable
};

document.addEventListener('DOMContentLoaded', initAnomaliesPage);
