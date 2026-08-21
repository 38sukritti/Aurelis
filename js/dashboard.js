/* =============================================================================
   COMMIT NO. 26
   COMMIT BY: Simran
   COMMIT MESSAGE: feat(dashboard): dashboard event listeners, modal controllers and CSV wiring
   ============================================================================= */

'use strict';

let currentUser = null;

const initDashboard = () => {
    // Auth guard
    currentUser = window.Auth.requireAuth();
    if (!currentUser) return;

    // Set user profile info
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

    // Bind logout button
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', window.Auth.handleLogout);

    // Bind Add Transaction button & Modal
    const addBtn = document.getElementById('btn-add-transaction');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeAddModal);

    const cancelBtn = document.getElementById('cancel-tx-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeAddModal);

    const addForm = document.getElementById('add-tx-form');
    if (addForm) addForm.addEventListener('submit', handleAddTransaction);

    // Bind CSV Import
    const importBtn = document.getElementById('btn-import-csv');
    const fileInput = document.getElementById('csv-file-input');
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            window.CSVModule.handleFileImport(e, currentUser.email, () => {
                renderDashboard();
            });
            fileInput.value = '';
        });
    }

    // Bind Sample CSV Download
    const sampleCsvBtn = document.getElementById('btn-sample-csv');
    if (sampleCsvBtn) {
        sampleCsvBtn.addEventListener('click', window.CSVModule.downloadSampleCSV);
    }

    // Bind Seed Demo Data button
    const seedBtn = document.getElementById('btn-seed-data');
    if (seedBtn) {
        seedBtn.addEventListener('click', () => {
            window.StorageModule.seedDemoDataForUser(currentUser.email);
            window.Utils.showToast('Sample dataset loaded for your account!', 'success');
            renderDashboard();
        });
    }

    // Initial render
    renderDashboard();
};

const renderDashboard = () => {
    const transactions = window.StorageModule.getTransactionsForUser(currentUser.email);
    const settings = window.StorageModule.getSettings();

    // Run anomaly detection
    const { anomalies, decoratedTransactions } = window.AnomalyDetector.detectAnomalies(
        transactions,
        settings.zScoreThreshold
    );

    renderKPIs(transactions, anomalies);
    renderCategorySummary(transactions);
    renderRecentTransactions(decoratedTransactions);
};

const renderKPIs = (transactions, anomalies) => {
    const totalSpend = transactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);

    const totalSpendEl = document.getElementById('kpi-total-spend');
    const totalTxEl = document.getElementById('kpi-total-tx');
    const anomalyCountEl = document.getElementById('kpi-anomaly-count');

    if (totalSpendEl) totalSpendEl.textContent = window.Utils.formatCurrency(totalSpend);
    if (totalTxEl) totalTxEl.textContent = transactions.length;
    if (anomalyCountEl) anomalyCountEl.textContent = anomalies.length;
};

const renderCategorySummary = (transactions) => {
    const container = document.getElementById('category-summary');
    if (!container) return;

    const summary = window.TransactionsModule.getCategorySummary(transactions);
    const maxTotal = summary.length > 0 ? summary[0].total : 1;

    if (summary.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 1.5rem 0;">
                <p class="empty-state-text">No category data yet. Record your first transaction or import a CSV file.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    summary.forEach(({ category, total, count }) => {
        const pct = Math.max(8, Math.round((total / maxTotal) * 100));
        const row = document.createElement('div');
        row.className = 'cat-row';
        row.innerHTML = `
            <div class="cat-header">
                <span class="cat-name">${category} <small style="color:var(--text-tertiary);">(${count})</small></span>
                <span class="cat-val">${window.Utils.formatCurrency(total)}</span>
            </div>
            <div class="cat-bar-track">
                <div class="cat-bar-fill" style="width: ${pct}%;"></div>
            </div>
        `;
        container.appendChild(row);
    });
};

const renderRecentTransactions = (decoratedTransactions) => {
    const tbody = document.getElementById('tx-table-body');
    const emptyNotice = document.getElementById('empty-transactions-notice');
    if (!tbody) return;

    if (!decoratedTransactions || decoratedTransactions.length === 0) {
        tbody.innerHTML = '';
        if (emptyNotice) emptyNotice.style.display = 'block';
        return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';

    // Show latest 10 transactions
    const recent = decoratedTransactions.slice(0, 10);

    tbody.innerHTML = recent.map(tx => {
        let badgeHtml = '<span class="badge badge-normal">Normal</span>';
        if (tx.insufficientData) {
            badgeHtml = '<span class="badge badge-insufficient">Learning</span>';
        } else if (tx.isAnomaly) {
            badgeHtml = `<span class="badge badge-${tx.severity}">${tx.severity} (${Math.abs(tx.zScore)}σ)</span>`;
        }

        return `
            <tr data-id="${tx.id}">
                <td>${window.Utils.formatDate(tx.date)}</td>
                <td><span style="font-weight: 500;">${tx.category}</span></td>
                <td style="color: var(--text-secondary);">${tx.description || '—'}</td>
                <td class="cell-amount">${window.Utils.formatCurrency(tx.amount)}</td>
                <td>${badgeHtml}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="openEditModal('${tx.id}')">
                        Edit
                    </button>
                    <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--status-danger);" onclick="deleteTx('${tx.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

let editingTxId = null;

const openEditModal = (txId) => {
    const tx = window.StorageModule.getTransactionById ? window.StorageModule.getTransactionById(txId) : 
        (window.StorageModule.getTransactionsForUser(currentUser.email).find(t => t.id === txId));
    if (!tx) return;

    editingTxId = txId;
    const modal = document.getElementById('modal-overlay');
    const modalTitle = modal ? modal.querySelector('.modal-title') : null;
    if (modalTitle) modalTitle.textContent = 'Edit Transaction';

    const descEl = document.getElementById('tx-description');
    const amountEl = document.getElementById('tx-amount');
    const catEl = document.getElementById('tx-category');
    const dateEl = document.getElementById('tx-date');

    if (descEl) descEl.value = tx.description || tx.merchant || '';
    if (amountEl) amountEl.value = tx.amount;
    if (catEl) catEl.value = tx.category;
    if (dateEl) dateEl.value = tx.date || (tx.timestamp ? new Date(tx.timestamp).toISOString().split('T')[0] : '');

    if (modal) {
        modal.classList.add('open');
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'all';
    }
};

const openAddModal = () => {
    editingTxId = null;
    const modal = document.getElementById('modal-overlay');
    const modalTitle = modal ? modal.querySelector('.modal-title') : null;
    if (modalTitle) modalTitle.textContent = 'Record Transaction';

    const form = document.getElementById('add-tx-form');
    if (form) form.reset();
    
    // Set default date to today
    const dateInput = document.getElementById('tx-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    if (modal) {
        modal.classList.add('open');
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'all';
    }
};

const closeAddModal = () => {
    editingTxId = null;
    const modal = document.getElementById('modal-overlay');
    if (modal) {
        modal.classList.remove('open');
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
    }
};

const handleAddTransaction = (e) => {
    e.preventDefault();

    const descEl = document.getElementById('tx-description');
    const amountEl = document.getElementById('tx-amount');
    const catEl = document.getElementById('tx-category');
    const dateEl = document.getElementById('tx-date');

    const desc = descEl ? descEl.value.trim() : '';
    const amount = amountEl ? parseFloat(amountEl.value) : 0;
    const category = catEl ? catEl.value : '';
    const dateStr = dateEl ? dateEl.value : '';

    if (!amount || isNaN(amount) || amount <= 0) {
        window.Utils.showToast('Please enter a valid amount greater than 0.', 'danger');
        return;
    }

    if (!category) {
        window.Utils.showToast('Please select a category.', 'danger');
        return;
    }

    if (editingTxId) {
        const updated = {
            id: editingTxId,
            userId: currentUser.email,
            amount: amount,
            category: category,
            description: desc,
            merchant: desc || 'Expense',
            date: dateStr,
            timestamp: new Date(dateStr).getTime()
        };
        if (window.StorageModule.updateTransaction) {
            window.StorageModule.updateTransaction(updated);
        }
        window.Utils.showToast('Transaction updated successfully!', 'success');
    } else {
        const tx = window.TransactionsModule.createTransaction(
            currentUser.email,
            amount,
            category,
            desc,
            dateStr
        );
        window.StorageModule.addTransactionForUser(tx);
        window.Utils.showToast('Transaction recorded successfully!', 'success');
    }

    closeAddModal();
    renderDashboard();
};

const deleteTx = (txId) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
        window.StorageModule.deleteTransaction(txId);
        window.Utils.showToast('Transaction removed.', 'info');
        renderDashboard();
    }
};

window.deleteTx = deleteTx;
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.closeAddModal = closeAddModal;

window.DashboardModule = {
    initDashboard,
    renderDashboard,
    openAddModal,
    openEditModal,
    closeAddModal,
    deleteTx
};

// Close on backdrop click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-overlay');
    if (modal && e.target === modal) {
        closeAddModal();
    }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAddModal();
    }
});

document.addEventListener('DOMContentLoaded', initDashboard);
