/* =============================================================================
   COMMIT NO. 19
   COMMIT BY: Simran
   COMMIT MESSAGE: feat(router): build SPA hash router and view renderers for statistical dashboard
   ============================================================================= */

'use strict';

const AppRouter = {
    container: null,

    init: function() {
        this.container = document.getElementById('view-container');
        window.addEventListener('hashchange', this.handleRoute.bind(this));
        
        // Trigger initial route
        if (!window.location.hash) {
            window.location.hash = '#/dashboard';
        } else {
            this.handleRoute();
        }
    },

    handleRoute: function() {
        const hash = window.location.hash.substring(1) || '/dashboard';
        
        if (!this.container) {
            this.container = document.getElementById('view-container');
            if (!this.container) return;
        }

        // Trigger view enter animation
        this.container.classList.remove('view-enter');
        void this.container.offsetWidth;
        this.container.classList.add('view-enter');

        // Update active class on sidebar navigation
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (route && (route === hash || (hash === '' && route === '/dashboard'))) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Fetch user data from LocalStorage
        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
        let transactions = [];
        if (currentUser && window.StorageModule.getTransactionsForUser) {
            transactions = window.StorageModule.getTransactionsForUser(currentUser.email) || [];
        } else {
            transactions = window.StorageModule.getTransactions ? (window.StorageModule.getTransactions() || []) : [];
        }

        const settings = window.StorageModule.getSettings();
        const analysis = window.AnomalyEngine 
            ? window.AnomalyEngine.detectAnomalies(transactions, settings.zScoreThreshold)
            : (window.AnomalyDetector ? window.AnomalyDetector.detectAnomalies(transactions, settings.zScoreThreshold) : { anomalies: [], baselines: {}, decoratedTransactions: [] });

        switch(hash) {
            case '/dashboard':
                this.renderDashboard(transactions, analysis, settings);
                break;
            case '/transactions':
                this.renderTransactions(transactions, analysis);
                break;
            case '/anomalies':
                this.renderAnomalies(analysis);
                break;
            case '/analytics':
                this.renderAnalytics(transactions, analysis);
                break;
            case '/learning':
            case '/education':
            case '/videos':
                this.renderLearning(transactions, analysis);
                break;
            case '/spending-analysis':
            case '/intelligence':
                this.renderSpendingAnalysis(transactions, analysis, settings);
                break;
            case '/settings':
                this.renderSettings(settings);
                break;
            default:
                this.renderDashboard(transactions, analysis, settings);
        }
    },

    /* =======================================================================
     * VIEW RENDERING — DASHBOARD (EXECUTIVE OVERVIEW)
     * ======================================================================= */

    renderDashboard: function(transactions, analysis, settings) {
        const { anomalies, baselines, decoratedTransactions } = analysis;
        const totalTransactions = transactions.length;
        const anomalousCount = anomalies.length;
        const anomalyRate = totalTransactions > 0 ? (anomalousCount / totalTransactions) * 100 : 0;
        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : { name: 'User' };
        const userName = currentUser ? currentUser.name : 'User';

        // Calculate aggregates
        let totalSpend = 0;
        const categoryTotals = {};
        transactions.forEach(tx => {
            const cat = tx.category || 'Other';
            const amt = parseFloat(tx.amount) || 0;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
            totalSpend += amt;
        });

        const avgTransaction = totalTransactions > 0 ? totalSpend / totalTransactions : 0;
        const activeBaselinesCount = Object.values(baselines).filter(b => !b.insufficientData && b.count >= 3).length;
        const totalCategoriesCount = Object.keys(categoryTotals).length;

        // Category breakdown list (Top 4)
        const topCategories = Object.keys(categoryTotals)
            .map(cat => ({
                category: cat,
                total: categoryTotals[cat],
                percent: totalSpend > 0 ? (categoryTotals[cat] / totalSpend) * 100 : 0
            }))
            .sort((a, b) => b.total - a.total);

        // Status badge
        let statusBadgeText = 'ALL NORMAL';
        let statusBadgeBg = 'var(--status-success)';
        let statusBadgeColor = '#000';
        let statusMetricColor = 'var(--status-success)';

        const hasCritical = anomalies.some(a => a.severity === 'Critical');
        const hasHigh = anomalies.some(a => a.severity === 'High');
        if (hasCritical) {
            statusBadgeText = 'CRITICAL ANOMALIES';
            statusBadgeBg = 'var(--status-danger)';
            statusBadgeColor = '#fff';
            statusMetricColor = 'var(--status-danger)';
        } else if (hasHigh || anomalousCount > 0) {
            statusBadgeText = 'ATTENTION REQUIRED';
            statusBadgeBg = 'var(--status-warning)';
            statusBadgeColor = '#000';
            statusMetricColor = 'var(--status-warning)';
        }

        // Recent 5 transactions
        const recentTxs = (decoratedTransactions || transactions).slice(0, 5);

        let emptyBanner = '';
        if (totalTransactions === 0) {
            emptyBanner = `
                <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--accent-primary); background: linear-gradient(to right, rgba(59, 130, 246, 0.08), transparent);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h3 style="margin-bottom: 0.35rem; color: var(--text-primary);">Welcome to your new AURELIS Workspace, ${userName}!</h3>
                            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                                Your workspace is completely clean. Record your first transaction or import a CSV file to begin tracking and calculating your personalized statistical baseline.
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="AppRouter.openAddTransactionModal()">+ Add Your First Transaction</button>
                        <button class="btn" onclick="AppRouter.openImportModal()">Import CSV Data</button>
                        <button class="btn" onclick="AppRouter.loadDemoData()">Load Sample Demo Dataset</button>
                    </div>
                </div>
            `;
        }

        let html = `
            <!-- Top Dashboard Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.75rem;">
                        Executive Dashboard
                        <span class="badge" style="background: rgba(59, 130, 246, 0.12); color: var(--accent-primary); border: 1px solid rgba(59, 130, 246, 0.3);">LIVE WORKSPACE</span>
                    </h1>
                    <p class="subtitle" style="margin-bottom: 0;">Overview of your personal spending velocity, category baselines, and statistical outliers.</p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn" onclick="AppRouter.openImportModal()">Import CSV</button>
                    <button class="btn btn-primary" onclick="AppRouter.openAddTransactionModal()">+ Add Transaction</button>
                </div>
            </div>

            ${emptyBanner}

            <!-- 4 KPI Executive Metric Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                <div class="card" style="display: flex; flex-direction: column;">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">Total Spending</div>
                    <div style="font-size: 1.75rem; font-weight: 600; color: var(--text-primary); margin-top: 0.35rem;">
                        ${window.UIModule.formatCurrency(totalSpend)}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        ${totalTransactions} total recorded transaction${totalTransactions === 1 ? '' : 's'}
                    </div>
                </div>

                <div class="card" style="display: flex; flex-direction: column; border-left: 3px solid ${anomalousCount > 0 ? 'var(--status-warning)' : 'var(--status-success)'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">Anomalies Detected</span>
                        <span class="badge" style="background: ${statusBadgeBg}; color: ${statusBadgeColor}; font-size: 0.65rem; font-weight: 700;">${statusBadgeText}</span>
                    </div>
                    <div style="font-size: 1.75rem; font-weight: 600; color: ${statusMetricColor}; margin-top: 0.35rem;">
                        ${anomalousCount}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        ${anomalyRate.toFixed(1)}% of spending flagged (&ge; ${settings.zScoreThreshold || 3.0}σ)
                    </div>
                </div>

                <div class="card" style="display: flex; flex-direction: column;">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">Average Spend / Txn</div>
                    <div style="font-size: 1.75rem; font-weight: 600; color: var(--accent-primary); margin-top: 0.35rem;">
                        ${window.UIModule.formatCurrency(avgTransaction)}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Across ${totalCategoriesCount} spending categories
                    </div>
                </div>

                <div class="card" style="display: flex; flex-direction: column;">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">Baseline Status</div>
                    <div style="font-size: 1.75rem; font-weight: 600; color: var(--text-primary); margin-top: 0.35rem;">
                        ${activeBaselinesCount} / ${Math.max(1, totalCategoriesCount)}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        ${activeBaselinesCount > 0 ? 'Active category models' : 'Learning your patterns (&ge;3 tx/cat)'}
                    </div>
                </div>
            </div>

            <!-- Two Columns: Anomaly Gauge & Top Categories -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                
                <!-- Anomaly Gauge & Mathematical Model -->
                <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">Statistical Health Gauge</h3>
                        <a href="#/anomalies" class="btn" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">View Anomalies &rarr;</a>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; padding: 0.5rem 0;">
                        <canvas id="anomalyGauge" width="280" height="150"></canvas>
                        <div style="font-size: 1.75rem; font-weight: 700; margin-top: -1.25rem; color: var(--text-primary);">
                            ${anomalyRate.toFixed(0)}%
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            ${anomalousCount} anomalous transactions out of ${totalTransactions}
                        </div>
                    </div>
                    <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.75rem; display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-tertiary);">
                        <span>Threshold Sensitivity: <strong>${settings.zScoreThreshold || 3.0}σ</strong></span>
                        <a href="#/settings" style="color: var(--accent-primary); text-decoration: none;">Adjust in Settings</a>
                    </div>
                </div>

                <!-- Top Categories Spending -->
                <div class="card" style="display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">Top Category Spending</h3>
                        <a href="#/analytics" class="btn" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">Full Analytics &rarr;</a>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.85rem; flex: 1; justify-content: center;">
                        ${topCategories.length > 0 ? topCategories.slice(0, 4).map(item => `
                            <div class="horizontal-bar-container" style="margin-bottom: 0;">
                                <div class="horizontal-bar-label">
                                    <span style="font-weight: 500;">${item.category}</span>
                                    <span style="font-family: monospace; color: var(--text-secondary);">${window.UIModule.formatCurrency(item.total)} (${item.percent.toFixed(0)}%)</span>
                                </div>
                                <div class="horizontal-bar-track">
                                    <div class="horizontal-bar-fill" style="width: ${item.percent.toFixed(1)}%; background-color: var(--accent-primary);"></div>
                                </div>
                            </div>
                        `).join('') : '<p style="color: var(--text-secondary); font-size: 0.875rem; text-align: center; margin: 2rem 0;">No spending recorded yet.</p>'}
                    </div>
                </div>

            </div>

            <!-- Recent Activity Table on Dashboard -->
            <div class="card" style="padding: 1.25rem 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <h3 style="margin-bottom: 0.2rem;">Recent Transactions</h3>
                        <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 0;">Your latest activity and real-time statistical baseline evaluation.</p>
                    </div>
                    <a href="#/transactions" class="btn btn-primary" style="font-size: 0.8125rem;">
                        View All Transactions (${totalTransactions}) &rarr;
                    </a>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Merchant / Description</th>
                                <th>Category</th>
                                <th class="cell-amount">Amount</th>
                                <th>Baseline Status</th>
                                <th style="text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentTxs.map(tx => {
                                const isAnom = tx.isAnomaly || (tx.analysis && tx.analysis.isAnomaly);
                                const z = (tx.zScore !== undefined) ? tx.zScore : (tx.analysis ? tx.analysis.zScore : 0);
                                let statusBadge = '<span class="badge badge-normal">Normal</span>';
                                if (isAnom) {
                                    const severity = tx.severity || (tx.analysis ? tx.analysis.severity : 'High');
                                    statusBadge = `<span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">${severity} (+${Math.abs(z || 0).toFixed(1)}σ)</span>`;
                                } else if (tx.insufficientData) {
                                    statusBadge = '<span class="badge" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8;">Learning</span>';
                                }

                                const txDateDisplay = tx.date || (tx.timestamp ? new Date(tx.timestamp).toISOString().split('T')[0] : '—');

                                return `
                                    <tr data-tx-id="${tx.id}">
                                        <td style="color: var(--text-secondary); white-space: nowrap;">${txDateDisplay}</td>
                                        <td>
                                            <div style="font-weight: 500; color: var(--text-primary);">${tx.merchant || tx.description || 'Expense'}</div>
                                        </td>
                                        <td><span class="badge badge-outline">${tx.category || 'Other'}</span></td>
                                        <td class="cell-amount" style="font-weight: 600; font-family: monospace;">${window.UIModule.formatCurrency(tx.amount)}</td>
                                        <td>${statusBadge}</td>
                                        <td style="text-align: right;">
                                            <button class="btn" style="padding: 0.25rem 0.55rem; font-size: 0.75rem;" onclick="AppRouter.openEditTransactionModal('${tx.id}')">Edit</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    ${recentTxs.length === 0 ? `
                        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
                            <p style="font-size: 0.9375rem; margin-bottom: 1rem;">No transactions recorded yet.</p>
                            <button class="btn btn-primary" onclick="AppRouter.openAddTransactionModal()">+ Add Your First Transaction</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        setTimeout(() => {
            if (window.ChartsModule && window.ChartsModule.drawAnomalyGauge) {
                window.ChartsModule.drawAnomalyGauge('anomalyGauge', anomalyRate, statusBadgeText);
            }
            document.querySelectorAll('.horizontal-bar-fill').forEach(bar => {
                const w = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => bar.style.width = w, 50);
            });
        }, 50);
    },

    /* =======================================================================
     * VIEW RENDERING — SPENDING ANALYSIS (PHASE 1 STATISTICAL DETECTOR)
     * ======================================================================= */

    renderSpendingAnalysis: function(transactions, analysis, settings) {
        const { anomalies, baselines } = analysis;
        const totalTransactions = transactions.length;
        const anomalousCount = anomalies.length;
        const anomalyRate = totalTransactions > 0 ? (anomalousCount / totalTransactions) * 100 : 0;

        // Statistical Status Classification
        let statusBadgeText = 'NORMAL';
        let statusBadgeBg = 'var(--status-success)';
        let statusBadgeColor = '#000';
        let statusMetricColor = 'var(--status-success)';

        const hasCriticalOrHigh = anomalies.some(a => a.severity === 'Critical' || a.severity === 'High');
        if (hasCriticalOrHigh) {
            statusBadgeText = 'HIGH ATTENTION';
            statusBadgeBg = 'var(--status-danger)';
            statusBadgeColor = '#fff';
            statusMetricColor = 'var(--status-danger)';
        } else if (anomalousCount > 0) {
            statusBadgeText = 'REVIEW REQUIRED';
            statusBadgeBg = 'var(--status-warning)';
            statusBadgeColor = '#000';
            statusMetricColor = 'var(--status-warning)';
        }

        // Real Category Spending derived from LocalStorage
        const categoryTotals = {};
        let totalSpend = 0;
        transactions.forEach(tx => {
            const cat = tx.category || 'Other';
            const amt = parseFloat(tx.amount) || 0;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
            totalSpend += amt;
        });

        const categoryList = Object.keys(categoryTotals)
            .map(cat => ({
                category: cat,
                total: categoryTotals[cat],
                percent: totalSpend > 0 ? (categoryTotals[cat] / totalSpend) * 100 : 0
            }))
            .sort((a, b) => b.total - a.total);

        let emptyStateBanner = '';
        if (totalTransactions === 0) {
            emptyStateBanner = `
                <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--accent-primary); background: linear-gradient(to right, rgba(59, 130, 246, 0.08), transparent);">
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">Welcome to your personal AURELIS Workspace!</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1.25rem;">
                        This is your private workspace. You currently have no transactions recorded. Add your expenses or import a CSV to let AURELIS learn your personalized statistical spending baseline.
                    </p>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="AppRouter.openAddTransactionModal()">+ Add Your First Transaction</button>
                        <button class="btn" onclick="AppRouter.openImportModal()">Import CSV Data</button>
                        <button class="btn" onclick="AppRouter.loadDemoData()">Load Sample Demo Dataset</button>
                    </div>
                </div>
            `;
        }

        let html = `
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="display: flex; align-items: center; gap: 0.75rem;">
                        AURELIS Spending Analysis
                        <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary); border: 1px solid rgba(59, 130, 246, 0.3);">STATISTICAL ANALYSIS</span>
                    </h1>
                    <p class="subtitle">Statistical insights derived from your personal transaction history.</p>
                </div>
            </div>

            ${emptyStateBanner}

            <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                <!-- Main Card: Spending Anomaly Analysis -->
                <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="margin-bottom: 0.25rem;">Spending Anomaly Analysis</h3>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;">STATUS: Statistical analysis active</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">ANOMALIES DETECTED</div>
                            <div style="font-size: 2.25rem; font-weight: 600; color: ${statusMetricColor};">${anomalousCount}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: center; margin: 1.5rem 0;">
                        <canvas id="anomalyGauge" width="300" height="170"></canvas>
                        <div style="font-size: 1.75rem; font-weight: 600; margin-top: -1.25rem; color: var(--text-primary);">
                            ${anomalyRate.toFixed(0)}%
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            ${anomalousCount} of ${totalTransactions} transactions flagged
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <span class="badge" style="font-size: 0.875rem; padding: 0.5rem 1.5rem; background: ${statusBadgeBg}; color: ${statusBadgeColor}; font-weight: 600;">
                            ${statusBadgeText}
                        </span>
                    </div>
                </div>

                <!-- Right Card: Category Spending & Pipeline -->
                <div class="card">
                    <h3 style="margin-bottom: 1.25rem;">Category Spending</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.85rem; max-height: 220px; overflow-y: auto; padding-top: 0.25rem; padding-right: 0.35rem;">
                        ${categoryList.length > 0 ? categoryList.slice(0, 5).map(item => `
                            <div class="horizontal-bar-container">
                                <div class="horizontal-bar-label">
                                    <span style="font-weight: 500;">${item.category}</span>
                                    <span style="font-family: monospace; color: var(--text-secondary);">${window.UIModule.formatCurrency(item.total)} (${item.percent.toFixed(0)}%)</span>
                                </div>
                                <div class="horizontal-bar-track">
                                    <div class="horizontal-bar-fill" style="width: ${item.percent.toFixed(1)}%; background-color: var(--accent-primary);"></div>
                                </div>
                            </div>
                        `).join('') : '<p style="color: var(--text-secondary); font-size: 0.875rem;">No transactions recorded.</p>'}
                    </div>
                    
                    <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color);">
                        <h4 style="margin-bottom: 0.75rem; font-size: 0.8125rem; color: var(--text-secondary); letter-spacing: 0.05em; text-transform: uppercase;">STATISTICAL PIPELINE</h4>
                        <div style="font-family: monospace; font-size: 0.75rem; color: var(--text-tertiary); display: flex; flex-direction: column; gap: 0.25rem;">
                            <span>TRANSACTIONS</span>
                            <span>↓ CATEGORY GROUPING</span>
                            <span>↓ STATISTICAL BASELINE</span>
                            <span style="color: var(--accent-primary); font-weight: 600;">↓ MEAN + STANDARD DEVIATION</span>
                            <span>↓ Z-SCORE CALCULATION</span>
                            <span>↓ THRESHOLD CHECK (${settings.zScoreThreshold || 3.0}σ)</span>
                            <span style="color: var(--status-warning); font-weight: 600;">↓ ANOMALY RESULTS</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Section: Recent Anomalies -->
            <div style="margin-top: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3>Recent Anomalies</h3>
                    <a href="#/anomalies" class="btn" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">View Full Analysis Table &rarr;</a>
                </div>

                ${recentAnomalies.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
                        ${recentAnomalies.map(a => {
                            let badgeClass = 'badge-high';
                            if (a.severity === 'Critical') badgeClass = 'badge-critical';
                            else if (a.severity === 'Moderate') badgeClass = 'badge-warning';

                            return `
                                <div class="card" style="border-left: 3px solid ${a.severity === 'Critical' ? 'var(--status-danger)' : (a.severity === 'High' ? 'var(--status-warning)' : 'var(--accent-primary)')};">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                                        <div>
                                            <h4 style="font-weight: 600; margin-bottom: 0.25rem;">${a.transaction.merchant || a.transaction.description || 'Expense'}</h4>
                                            <span class="badge badge-outline" style="font-size: 0.7rem;">${a.transaction.category}</span>
                                        </div>
                                        <span class="badge ${badgeClass}" style="text-transform: uppercase; font-size: 0.7rem; font-weight: 600;">${a.severity}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 0.75rem;">
                                        <span style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">${window.UIModule.formatCurrency(a.transaction.amount)}</span>
                                        <span style="font-family: monospace; font-size: 0.8125rem; color: var(--status-warning); font-weight: 600;">Z: ${a.zScore > 0 ? '+' : ''}${a.zScore.toFixed(2)}σ</span>
                                    </div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                                        Baseline Mean: ${window.UIModule.formatCurrency(a.baseline ? a.baseline.mean : a.mean)} &bull; σ: ${window.UIModule.formatCurrency(a.baseline ? a.baseline.standardDeviation : a.stdDev)}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <div class="card" style="text-align: center; padding: 2.5rem;">
                        <p style="color: var(--text-secondary); margin: 0; font-size: 0.9375rem;">
                            No anomalies detected in your current transaction history.
                        </p>
                    </div>
                `}
            </div>
        `;

        this.container.innerHTML = html;

        setTimeout(() => {
            if (window.ChartsModule && window.ChartsModule.drawAnomalyGauge) {
                window.ChartsModule.drawAnomalyGauge('anomalyGauge', anomalyRate, statusBadgeText);
            }
            document.querySelectorAll('.horizontal-bar-fill').forEach(bar => {
                const w = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => bar.style.width = w, 50);
            });
        }, 50);
    },

    // Backward-compatible alias for navigation
    renderIntelligence: function(transactions, analysis) {
        const settings = window.StorageModule.getSettings();
        this.renderSpendingAnalysis(transactions, analysis, settings);
    },

    /* =======================================================================
     * VIEW RENDERING — TRANSACTIONS MANAGEMENT
     * ======================================================================= */

    _txFilters: { search: '', category: 'ALL', type: 'ALL', status: 'ALL' },

    renderTransactions: function(transactions, analysis) {
        analysis = analysis || window.AnomalyEngine.detectAnomalies(transactions, window.StorageModule.getSettings().zScoreThreshold);
        const decorated = analysis.decoratedTransactions || transactions;
        const categories = window.DataModule ? window.DataModule.CATEGORIES : [
            'Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Utilities', 'Healthcare', 'Travel', 'Education', 'Other'
        ];

        // Apply filters
        const filters = this._txFilters;
        let filtered = decorated.filter(tx => {
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const mMatch = (tx.merchant || '').toLowerCase().includes(q);
                const cMatch = (tx.category || '').toLowerCase().includes(q);
                const nMatch = (tx.notes || tx.description || '').toLowerCase().includes(q);
                if (!mMatch && !cMatch && !nMatch) return false;
            }
            if (filters.category !== 'ALL' && tx.category !== filters.category) return false;
            if (filters.type === 'RECURRING' && !tx.recurring) return false;
            if (filters.type === 'ONETIME' && tx.recurring) return false;
            if (filters.status === 'ANOMALY' && !tx.isAnomaly && !(tx.analysis && tx.analysis.isAnomaly)) return false;
            if (filters.status === 'NORMAL' && (tx.isAnomaly || (tx.analysis && tx.analysis.isAnomaly))) return false;
            return true;
        });

        const totalFilteredSpend = filtered.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
        const totalAllSpend = transactions.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
        const anomalyCount = decorated.filter(t => t.isAnomaly || (t.analysis && t.analysis.isAnomaly)).length;
        const recurringCount = transactions.filter(t => t.recurring).length;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="margin-bottom: 0.25rem;">Transactions Management</h1>
                    <p class="subtitle" style="margin-bottom: 0;">Full CRUD workspace: Add, review, edit, and audit historical transactions with baseline tracking.</p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn" onclick="AppRouter.downloadSampleCsv()" title="Download standard CSV format">Sample CSV</button>
                    <button class="btn" onclick="AppRouter.exportTransactionsCsv()" title="Export your data to CSV">Export CSV</button>
                    <button class="btn" onclick="AppRouter.openImportModal()">Import CSV</button>
                    <button class="btn btn-primary" onclick="AppRouter.openAddTransactionModal()">+ Add Transaction</button>
                </div>
            </div>

            <!-- Summary KPI Strip -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="card" style="padding: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase;">Total Transactions</div>
                    <div style="font-size: 1.5rem; font-weight: 600; margin-top: 0.25rem;">${transactions.length} <small style="font-size: 0.8rem; font-weight: 400; color: var(--text-secondary);">(${filtered.length} shown)</small></div>
                </div>
                <div class="card" style="padding: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase;">Total Spent</div>
                    <div style="font-size: 1.5rem; font-weight: 600; margin-top: 0.25rem; color: var(--accent-primary);">${window.UIModule.formatCurrency(totalAllSpend)}</div>
                </div>
                <div class="card" style="padding: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase;">Recurring Expenses</div>
                    <div style="font-size: 1.5rem; font-weight: 600; margin-top: 0.25rem; color: #a78bfa;">${recurringCount}</div>
                </div>
                <div class="card" style="padding: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase;">Anomalies Detected</div>
                    <div style="font-size: 1.5rem; font-weight: 600; margin-top: 0.25rem; color: var(--status-warning);">${anomalyCount}</div>
                </div>
            </div>

            <!-- Filter Toolbar -->
            <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 0.75rem; align-items: center;">
                    <div>
                        <input type="text" id="txFilterSearch" class="form-input" placeholder="Search merchant, notes, category..." value="${filters.search}" oninput="AppRouter.handleFilterChange('search', this.value)">
                    </div>
                    <div>
                        <select id="txFilterCategory" class="form-select" onchange="AppRouter.handleFilterChange('category', this.value)">
                            <option value="ALL" ${filters.category === 'ALL' ? 'selected' : ''}>All Categories</option>
                            ${categories.map(c => `<option value="${c}" ${filters.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <select id="txFilterType" class="form-select" onchange="AppRouter.handleFilterChange('type', this.value)">
                            <option value="ALL" ${filters.type === 'ALL' ? 'selected' : ''}>All Types</option>
                            <option value="RECURRING" ${filters.type === 'RECURRING' ? 'selected' : ''}>Recurring Only</option>
                            <option value="ONETIME" ${filters.type === 'ONETIME' ? 'selected' : ''}>One-time Only</option>
                        </select>
                    </div>
                    <div>
                        <select id="txFilterStatus" class="form-select" onchange="AppRouter.handleFilterChange('status', this.value)">
                            <option value="ALL" ${filters.status === 'ALL' ? 'selected' : ''}>All Statuses</option>
                            <option value="NORMAL" ${filters.status === 'NORMAL' ? 'selected' : ''}>Normal Only</option>
                            <option value="ANOMALY" ${filters.status === 'ANOMALY' ? 'selected' : ''}>Anomalies Only</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Transactions Table -->
            <div class="table-container">
                <table id="transactionsTable">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Merchant / Details</th>
                            <th>Category</th>
                            <th>Method</th>
                            <th>Type</th>
                            <th class="cell-amount">Amount</th>
                            <th>Baseline Status</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(tx => {
                            const isAnom = tx.isAnomaly || (tx.analysis && tx.analysis.isAnomaly);
                            const z = (tx.zScore !== undefined) ? tx.zScore : (tx.analysis ? tx.analysis.zScore : 0);
                            let statusBadge = '<span class="badge badge-normal">Normal</span>';
                            if (isAnom) {
                                const severity = tx.severity || (tx.analysis ? tx.analysis.severity : 'High');
                                statusBadge = `<span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">${severity} (+${Math.abs(z || 0).toFixed(1)}σ)</span>`;
                            } else if (tx.insufficientData) {
                                statusBadge = '<span class="badge" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8;">Learning</span>';
                            }

                            const txDateDisplay = tx.date || (tx.timestamp ? new Date(tx.timestamp).toISOString().split('T')[0] : '—');

                            return `
                                <tr data-tx-id="${tx.id}">
                                    <td style="color: var(--text-secondary); white-space: nowrap;">${txDateDisplay}</td>
                                    <td>
                                        <div style="font-weight: 500; color: var(--text-primary);">${tx.merchant || tx.description || 'Expense'}</div>
                                        ${tx.notes || (tx.description && tx.description !== tx.merchant) ? `<div style="font-size: 0.75rem; color: var(--text-tertiary);">${tx.notes || tx.description}</div>` : ''}
                                    </td>
                                    <td><span class="badge badge-outline">${tx.category || 'Other'}</span></td>
                                    <td style="color: var(--text-secondary); font-size: 0.8125rem;">${tx.paymentMethod || 'Credit Card'}</td>
                                    <td>${tx.recurring ? '<span class="badge" style="background: rgba(139, 92, 246, 0.12); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.25);">Recurring</span>' : '<span style="color: var(--text-tertiary); font-size: 0.75rem;">One-time</span>'}</td>
                                    <td class="cell-amount" style="font-weight: 600; font-family: monospace;">${window.UIModule.formatCurrency(tx.amount)}</td>
                                    <td>${statusBadge}</td>
                                    <td style="text-align: right; white-space: nowrap;">
                                        <button class="btn" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; margin-right: 0.35rem;" onclick="AppRouter.openEditTransactionModal('${tx.id}')">Edit</button>
                                        <button class="btn" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; color: var(--status-danger); border-color: rgba(239, 68, 68, 0.3);" onclick="AppRouter.deleteTransaction('${tx.id}')">Delete</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ${filtered.length === 0 ? `
                    <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-secondary);">
                        <p style="font-size: 1rem; font-weight: 500; margin-bottom: 0.5rem;">No matching transactions found</p>
                        <p style="font-size: 0.8125rem; color: var(--text-tertiary); margin-bottom: 1.5rem;">Try clearing your filters or record a new transaction.</p>
                        <button class="btn btn-primary" onclick="AppRouter.openAddTransactionModal()">+ Add New Transaction</button>
                    </div>
                ` : ''}
            </div>
        `;
        this.container.innerHTML = html;
    },

    /* =======================================================================
     * VIEW RENDERING — ANOMALIES CENTER
     * ======================================================================= */

    _anomalyFilter: 'ALL',

    handleAnomalyFilter: function(filter) {
        this._anomalyFilter = filter;
        this.handleRoute();
    },

    renderAnomalies: function(analysis) {
        const { anomalies } = analysis;
        const currentFilter = this._anomalyFilter || 'ALL';

        const criticalCount = anomalies.filter(a => (a.severity || '').toLowerCase() === 'critical').length;
        const highCount = anomalies.filter(a => (a.severity || '').toLowerCase() === 'high').length;
        const moderateCount = anomalies.filter(a => {
            const s = (a.severity || '').toLowerCase();
            return s === 'moderate' || s === 'medium' || s === 'low';
        }).length;

        // Apply severity filter
        const filteredAnomalies = anomalies.filter(a => {
            const s = (a.severity || '').toLowerCase();
            if (currentFilter === 'CRITICAL') return s === 'critical';
            if (currentFilter === 'HIGH') return s === 'high';
            if (currentFilter === 'MODERATE') return s === 'moderate' || s === 'medium' || s === 'low';
            return true;
        });
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="margin-bottom: 0.25rem;">Anomaly Center</h1>
                    <p class="subtitle" style="margin-bottom: 0;">Statistical outlier inspection: Flagged charges deviating beyond your personal category threshold.</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="#/learning" class="btn" style="color: var(--accent-primary); border-color: rgba(59, 130, 246, 0.4);">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.35rem;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        Anomaly Playbooks &amp; Videos &rarr;
                    </a>
                </div>
            </div>

            <!-- Interactive Filter Strip -->
            <div style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <span style="font-size: 0.8125rem; color: var(--text-tertiary); margin-right: 0.25rem;">Filter by Severity:</span>
                
                <button type="button" class="btn" style="padding: 0.35rem 0.85rem; font-size: 0.75rem; border-radius: 9999px; ${currentFilter === 'ALL' ? 'background: var(--text-primary); color: var(--bg-base); font-weight: 600;' : ''}" onclick="AppRouter.handleAnomalyFilter('ALL')">
                    All (${anomalies.length})
                </button>
                
                <button type="button" class="btn" style="padding: 0.35rem 0.85rem; font-size: 0.75rem; border-radius: 9999px; ${currentFilter === 'CRITICAL' ? 'background: var(--status-danger); color: #fff; border-color: var(--status-danger); font-weight: 600;' : 'color: var(--status-danger); border-color: rgba(239, 68, 68, 0.4);'}" onclick="AppRouter.handleAnomalyFilter('CRITICAL')">
                    Critical (${criticalCount})
                </button>
                
                <button type="button" class="btn" style="padding: 0.35rem 0.85rem; font-size: 0.75rem; border-radius: 9999px; ${currentFilter === 'HIGH' ? 'background: var(--status-warning); color: #000; border-color: var(--status-warning); font-weight: 600;' : 'color: var(--status-warning); border-color: rgba(245, 158, 11, 0.4);'}" onclick="AppRouter.handleAnomalyFilter('HIGH')">
                    High (${highCount})
                </button>
                
                <button type="button" class="btn" style="padding: 0.35rem 0.85rem; font-size: 0.75rem; border-radius: 9999px; ${currentFilter === 'MODERATE' ? 'background: var(--accent-primary); color: #fff; border-color: var(--accent-primary); font-weight: 600;' : 'color: var(--accent-primary); border-color: rgba(59, 130, 246, 0.4);'}" onclick="AppRouter.handleAnomalyFilter('MODERATE')">
                    Moderate (${moderateCount})
                </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                ${filteredAnomalies.map((a, idx) => {
                    const isCrit = (a.severity || '').toLowerCase() === 'critical';
                    const isHgh = (a.severity || '').toLowerCase() === 'high';
                    const borderCol = isCrit ? 'var(--status-danger)' : (isHgh ? 'var(--status-warning)' : 'var(--accent-primary)');

                    return `
                    <div class="card" style="border-top: 3px solid ${borderCol}; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <div>
                                    <h3 style="margin-bottom: 0.25rem;">${a.transaction.merchant || a.transaction.description || 'Expense'}</h3>
                                    <span class="badge badge-outline">${a.transaction.category}</span>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: 600; font-family: monospace;">${window.UIModule.formatCurrency(a.transaction.amount)}</div>
                                    <div style="margin-top: 0.25rem;">${window.UIModule.getSeverityBadge(a.severity)}</div>
                                </div>
                            </div>
                            
                            <div style="background: var(--bg-base); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 1rem; font-size: 0.8125rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                                    <span style="color: var(--text-secondary);">Z-Score Deviation</span>
                                    <span style="color: ${borderCol}; font-family: monospace; font-weight: 700;">+${Math.abs(a.zScore || 0).toFixed(2)}σ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                                    <span style="color: var(--text-secondary);">Category Baseline (μ)</span>
                                    <span style="font-family: monospace;">${window.UIModule.formatCurrency(a.baseline ? a.baseline.mean : (a.mean || 0))}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-secondary);">Excess Spread</span>
                                    <span style="color: var(--status-warning); font-weight: 600;">+${a.deviationPercent ? a.deviationPercent.toFixed(0) : Math.round(((a.transaction.amount - (a.mean || 1)) / (a.mean || 1)) * 100)}%</span>
                                </div>
                            </div>
                            
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">
                                ${a.reason || a.notes || `Deviates significantly from your personal historical mean.`}
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-primary" style="flex: 1;" onclick='AppRouter.inspectAnomaly(${JSON.stringify(a).replace(/'/g, "&apos;")})'>Inspect</button>
                            <button class="btn" style="flex: 1;" onclick="window.UIModule.showToast('Anomaly acknowledged', 'info')">Dismiss</button>
                        </div>
                    </div>
                `;
                }).join('')}
                
                ${filteredAnomalies.length === 0 ? `
                    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
                        <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">No ${currentFilter === 'ALL' ? '' : currentFilter.toLowerCase()} anomalies found</h3>
                        <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 1.25rem;">
                            ${anomalies.length > 0 ? 'Try selecting a different filter above.' : 'Your transactions are aligned with your historical baseline.'}
                        </p>
                        <button class="btn btn-primary" onclick="AppRouter.handleAnomalyFilter('ALL')">Show All Categories</button>
                    </div>
                ` : ''}
            </div>
        `;
        this.container.innerHTML = html;
    },

    /* =======================================================================
     * VIEW RENDERING — FINANCE & ANOMALY VIDEOS MASTERCLASS
     * ======================================================================= */

    _learningFilter: 'ALL',

    handleLearningFilter: function(filter) {
        this._learningFilter = filter;
        this.handleRoute();
    },

    openVideoModal: function(youtubeId, title, embedUrl) {
        const url = embedUrl || `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
        const html = `
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background: #000; margin-bottom: 1.25rem;">
                <iframe 
                    src="${url}" 
                    title="${title.replace(/"/g, '&quot;')}" 
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen
                ></iframe>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <button type="button" class="btn" onclick="window.UIModule.closeModal()">Close Player</button>
                <a href="https://www.youtube.com/watch?v=${youtubeId}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="font-size: 0.8125rem;">
                    Open on YouTube ↗
                </a>
            </div>
        `;
        window.UIModule.openModal(title, html);
    },

    renderLearning: function(transactions, analysis) {
        const { anomalies, baselines } = analysis;
        const currentFilter = this._learningFilter || 'ALL';

        // Detect user's anomaly categories to provide smart recommendations
        const anomalyCategories = [...new Set(anomalies.map(a => a.transaction.category))];

        // The 6 specific Masterclass YouTube videos
        const videoLibrary = [
            {
                id: 'video-1',
                youtubeId: '67gEoDuSuLE',
                embedUrl: 'https://www.youtube.com/embed/67gEoDuSuLE?si=TE1A5b7aqXaRGCAt',
                title: 'How to Treat Compulsive Shopping & Stop Impulse Spends',
                channel: 'Uncommon Knowledge',
                duration: '11 mins',
                category: 'ANOMALY_CONTROL',
                tags: ['Impulse Control', 'Shopping Spikes', 'Habits'],
                targetAnomaly: 'Shopping',
                description: 'Psychological and practical techniques to dismantle compulsive buying triggers and eliminate shopping outliers.'
            },
            {
                id: 'video-2',
                youtubeId: 'HQzoZfc3GwQ',
                embedUrl: 'https://www.youtube.com/embed/HQzoZfc3GwQ?si=Z7dZA_j4X_LHUndp',
                title: 'How to Build an Unshakeable Budget (The 50/30/20 Rule)',
                channel: 'Ali Abdaal',
                duration: '14 mins',
                category: 'BUDGETING',
                tags: ['50/30/20 Rule', 'Cashflow', 'Personal Finance'],
                targetAnomaly: 'Food',
                description: 'Step-by-step masterclass on tracking fixed essentials vs variable costs and avoiding sudden lifestyle creep.'
            },
            {
                id: 'video-3',
                youtubeId: 'BTXKZpv0U6A',
                embedUrl: 'https://www.youtube.com/embed/BTXKZpv0U6A?si=m2xU1fdon2TDXmTZ',
                title: 'The Zombie Subscription Audit: Kill the Hidden Annual Leaks',
                channel: 'The Sketchbook Economy',
                duration: '12 mins',
                category: 'ANOMALY_CONTROL',
                tags: ['Subscriptions', 'Recurring Bills', 'Auditing'],
                targetAnomaly: 'Subscriptions',
                description: 'How small recurring monthly charges silently inflate your expense baseline and how to systematically purge them.'
            },
            {
                id: 'video-4',
                youtubeId: 'y9sANTpOMmc',
                embedUrl: 'https://www.youtube.com/embed/y9sANTpOMmc?si=Sc8bBl3wPj6dYKmS',
                title: 'Sinking Funds vs Emergency Funds: Smoothing Expense Spikes',
                channel: 'Financial Education',
                duration: '13 mins',
                category: 'BUDGETING',
                tags: ['Sinking Funds', 'Travel Spikes', 'Smoothing'],
                targetAnomaly: 'Travel',
                description: 'How to mathematically smooth annual insurance, flight, and healthcare expenses to prevent budget volatility.'
            },
            {
                id: 'video-5',
                youtubeId: 'TJDcGv9OH4Q',
                embedUrl: 'https://www.youtube.com/embed/TJDcGv9OH4Q?si=PhctGzRyd-dqvhYs',
                title: 'The Psychology of Money (Morgan Housel) - Core Principles',
                channel: 'The Swedish Investor',
                duration: '15 mins',
                category: 'INVESTING',
                tags: ['Wealth Mindset', 'Long-term', 'Discipline'],
                targetAnomaly: 'Electronics',
                description: 'Top insights on controlling financial impulses, maintaining long-term baselines, and building lasting wealth.'
            },
            {
                id: 'video-6',
                youtubeId: 'VrVatDbo64c',
                embedUrl: 'https://www.youtube.com/embed/VrVatDbo64c?si=Ck8W3QwNxg_bIVwN',
                title: 'Where Does Your Money Go? The Hidden Leaks Draining You',
                channel: 'The Sketchbook Economy',
                duration: '11 mins',
                category: 'INVESTING',
                tags: ['Cashflow Leaks', 'Auditing', 'Automation'],
                targetAnomaly: 'General',
                description: 'Diagnose where your money leaks away each month and redirect savings into automated investments.'
            }
        ];

        // Filter videos
        const filteredVideos = videoLibrary.filter(v => {
            if (currentFilter === 'BUDGETING') return v.category === 'BUDGETING';
            if (currentFilter === 'ANOMALY_CONTROL') return v.category === 'ANOMALY_CONTROL';
            if (currentFilter === 'INVESTING') return v.category === 'INVESTING';
            return true;
        });

        // Generate tailored dynamic recommendation based on user anomalies
        let anomalyTailoredMsg = '';
        if (anomalyCategories.length > 0) {
            anomalyTailoredMsg = `
                <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--status-warning); background: linear-gradient(to right, rgba(245, 158, 11, 0.08), transparent);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <span class="badge badge-warning" style="margin-bottom: 0.5rem; font-size: 0.7rem;">AI ANOMALY ADVISORY</span>
                            <h3 style="margin-bottom: 0.35rem; color: var(--text-primary);">
                                Detected Spending Spikes in: ${anomalyCategories.map(c => `<strong>${c}</strong>`).join(', ')}
                            </h3>
                            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem;">
                                Based on your recent transactions, our statistical engine identified deviations in these categories. We have highlighted the top tactical guides below to help you regain control.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }

        let html = `
            <div style="margin-bottom: 2rem;">
                <h1 style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                    Financial Intelligence Academy
                    <span class="badge" style="background: rgba(59, 130, 246, 0.12); color: var(--accent-primary); border: 1px solid rgba(59, 130, 246, 0.3);">CURATED PLAYBOOKS</span>
                </h1>
                <p class="subtitle" style="margin-bottom: 0;">Expert strategies, video masterclasses, and anomaly prevention techniques to optimize your personal cashflow.</p>
            </div>

            ${anomalyTailoredMsg}

            <!-- Category Filter Tabs -->
            <div style="margin-bottom: 1.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn" style="border-radius: 9999px; font-size: 0.8125rem; ${currentFilter === 'ALL' ? 'background: var(--text-primary); color: var(--bg-base); font-weight: 600;' : ''}" onclick="AppRouter.handleLearningFilter('ALL')">
                    All Masterclasses (${videoLibrary.length})
                </button>
                <button type="button" class="btn" style="border-radius: 9999px; font-size: 0.8125rem; ${currentFilter === 'ANOMALY_CONTROL' ? 'background: var(--text-primary); color: var(--bg-base); font-weight: 600;' : ''}" onclick="AppRouter.handleLearningFilter('ANOMALY_CONTROL')">
                    Anomaly &amp; Impulse Control
                </button>
                <button type="button" class="btn" style="border-radius: 9999px; font-size: 0.8125rem; ${currentFilter === 'BUDGETING' ? 'background: var(--text-primary); color: var(--bg-base); font-weight: 600;' : ''}" onclick="AppRouter.handleLearningFilter('BUDGETING')">
                    Budgeting &amp; Sinking Funds
                </button>
                <button type="button" class="btn" style="border-radius: 9999px; font-size: 0.8125rem; ${currentFilter === 'INVESTING' ? 'background: var(--text-primary); color: var(--bg-base); font-weight: 600;' : ''}" onclick="AppRouter.handleLearningFilter('INVESTING')">
                    Investing &amp; Long-Term Wealth
                </button>
            </div>

            <!-- Videos Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;">
                ${filteredVideos.map(video => {
                    const isRelevantToAnomaly = anomalyCategories.includes(video.targetAnomaly);
                    
                    return `
                        <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; ${isRelevantToAnomaly ? 'border: 1px solid var(--accent-primary); box-shadow: 0 0 15px rgba(59, 130, 246, 0.15);' : ''}">
                            <!-- Direct Video Embed Container -->
                            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; background: #000;">
                                <iframe 
                                    src="${video.embedUrl}" 
                                    title="${video.title}" 
                                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    referrerpolicy="strict-origin-when-cross-origin"
                                    allowfullscreen
                                ></iframe>
                            </div>

                            <div style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; flex: 1;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span class="badge" style="background: rgba(255,255,255,0.06); font-size: 0.65rem;">${video.channel} • ${video.duration}</span>
                                        ${isRelevantToAnomaly ? '<span class="badge badge-warning" style="font-size: 0.65rem;">Recommended for You</span>' : ''}
                                    </div>
                                    <h3 style="font-size: 0.95rem; font-weight: 600; line-height: 1.4; margin-bottom: 0.5rem; color: var(--text-primary);">
                                        ${video.title}
                                    </h3>
                                    <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">${video.description}</p>
                                </div>

                                <div>
                                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 1rem;">
                                        ${video.tags.map(t => `<span class="badge badge-outline" style="font-size: 0.65rem;">${t}</span>`).join('')}
                                    </div>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button type="button" class="btn" style="flex: 1; font-size: 0.8125rem; justify-content: center;" onclick="AppRouter.openVideoModal('${video.youtubeId}', '${video.title.replace(/'/g, "\\'")}', '${video.embedUrl}')">
                                            Expand Player
                                        </button>
                                        <a href="https://www.youtube.com/watch?v=${video.youtubeId}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="font-size: 0.8125rem; padding: 0.5rem 0.85rem;" title="Open in YouTube">
                                            Watch on YouTube ↗
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.container.innerHTML = html;
    },

    /* =======================================================================
     * VIEW RENDERING — ANALYTICS
     * ======================================================================= */

    renderAnalytics: function(transactions, analysis) {
        const { baselines } = analysis;
        const insights = window.InsightsModule ? window.InsightsModule.generateInsights(transactions, baselines) : [];

        // Category Palette synchronized with Canvas Charts
        const categoryColors = [
            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
            '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', 
            '#84cc16', '#64748b'
        ];

        // Sort categories by total descending so largest slice comes first
        const sortedCats = Object.keys(baselines).sort((a, b) => (baselines[b].total || 0) - (baselines[a].total || 0));

        // Build deterministic category color map & donut chart payload
        const categoryTotals = {};
        const catColorMap = {};
        let grandTotal = 0;

        sortedCats.forEach((cat, idx) => {
            const catTotal = baselines[cat].total || 0;
            categoryTotals[cat] = catTotal;
            catColorMap[cat] = categoryColors[idx % categoryColors.length];
            grandTotal += catTotal;
        });

        let html = `
            <div style="margin-bottom: 2rem;">
                <h1>Spending Analytics</h1>
                <p class="subtitle">Understand how your category baselines and distributions behave over time.</p>
            </div>

            <!-- Insights Panel -->
            <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--accent-primary);">
                <h3 style="margin-bottom: 1rem;">Baseline Insights</h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${insights.map(i => {
                        let color = 'var(--text-secondary)';
                        if (i.type === 'critical') color = 'var(--status-danger)';
                        if (i.type === 'warning') color = 'var(--status-warning)';
                        if (i.type === 'success') color = 'var(--status-success)';
                        return `<div style="display: flex; gap: 0.5rem; align-items: flex-start;">
                            <span style="color: ${color}; mt-1">•</span>
                            <span style="font-size: 0.875rem;">${i.text}</span>
                        </div>`;
                    }).join('')}
                    ${insights.length === 0 ? '<p style="color: var(--text-secondary); font-size: 0.875rem;">Record more transactions to unlock deeper automated category insights.</p>' : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem; text-align: center;">Category Distribution</h3>
                    <div style="display: flex; justify-content: center;">
                        <canvas id="donutChart" width="300" height="300"></canvas>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 1.25rem;">Category Spending Breakdown</h3>
                    <div style="display: flex; flex-direction: column; max-height: 300px; overflow-y: auto; gap: 0.85rem; padding-right: 0.35rem; padding-top: 0.25rem;">
                        ${sortedCats.map((cat, idx) => {
                            const b = baselines[cat];
                            const pct = grandTotal > 0 ? (b.total / grandTotal) * 100 : 0;
                            const barColor = catColorMap[cat] || categoryColors[idx % categoryColors.length];

                            return `
                                <div class="horizontal-bar-container" style="margin-bottom: 0;">
                                    <div class="horizontal-bar-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                                        <span style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500; color: var(--text-primary);">
                                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background-color: ${barColor}; flex-shrink: 0;"></span>
                                            ${cat}
                                        </span>
                                        <span style="font-family: monospace; color: var(--text-secondary); font-size: 0.8125rem;">${window.UIModule.formatCurrency(b.total)} (${pct.toFixed(0)}%)</span>
                                    </div>
                                    <div class="horizontal-bar-track">
                                        <div class="horizontal-bar-fill" style="width: ${pct}%; background-color: ${barColor};"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom: 1.5rem;">Statistical Baselines Table</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Transactions</th>
                                <th class="cell-amount">Mean (μ)</th>
                                <th class="cell-amount">Std Dev (σ)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedCats.map(cat => {
                                const b = baselines[cat];
                                const isInsufficient = b.insufficientData || b.count < 3;
                                
                                return `
                                <tr>
                                    <td><strong>${cat}</strong></td>
                                    <td>${b.count}</td>
                                    <td class="cell-amount">${window.UIModule.formatCurrency(b.mean)}</td>
                                    <td class="cell-amount">${window.UIModule.formatCurrency(b.standardDeviation)}</td>
                                    <td>
                                        ${isInsufficient 
                                            ? '<span class="badge" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8;">Insufficient Data</span>' 
                                            : '<span class="badge badge-normal">Baseline Active</span>'}
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        this.container.innerHTML = html;

        setTimeout(() => {
            if (window.ChartsModule && window.ChartsModule.drawDonutChart) {
                window.ChartsModule.drawDonutChart('donutChart', categoryTotals);
            }
            document.querySelectorAll('.horizontal-bar-fill').forEach(bar => {
                const w = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => bar.style.width = w, 50);
            });
        }, 50);
    },

    /* =======================================================================
     * VIEW RENDERING — SETTINGS
     * ======================================================================= */

    renderSettings: function(settings) {
        let html = `
            <div style="margin-bottom: 2rem;">
                <h1>Settings & Data</h1>
                <p class="subtitle">Configure detection parameters and manage local data.</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem; color: var(--accent-primary);">Detection Settings</h3>
                    
                    <div class="form-group">
                        <label class="form-label">Z-Score Threshold (σ)</label>
                        <select id="zScoreSelect" class="form-select" onchange="AppRouter.updateSetting('zScoreThreshold', parseFloat(this.value))">
                            <option value="2.0" ${settings.zScoreThreshold === 2.0 ? 'selected' : ''}>2.0σ (Strict - Flags More Anomalies)</option>
                            <option value="2.5" ${settings.zScoreThreshold === 2.5 ? 'selected' : ''}>2.5σ (Sensitive)</option>
                            <option value="3.0" ${settings.zScoreThreshold === 3.0 || !settings.zScoreThreshold ? 'selected' : ''}>3.0σ (Default - High Confidence)</option>
                            <option value="3.5" ${settings.zScoreThreshold === 3.5 ? 'selected' : ''}>3.5σ (Lenient)</option>
                            <option value="4.0" ${settings.zScoreThreshold === 4.0 ? 'selected' : ''}>4.0σ (Extreme Outliers Only)</option>
                        </select>
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                            Controls the threshold for statistical outlier classification: |Z| &ge; threshold flags anomaly.
                        </p>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 1.5rem; color: var(--status-success);">Statistical Engine Info</h3>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
                        Phase 1 uses <strong>Z-Score Statistical Detection</strong> computed per category (mean + standard deviation) over your LocalStorage records.
                    </p>
                    <div style="margin-top: 1rem; font-family: monospace; font-size: 0.75rem; color: var(--accent-primary);">
                        Formula: Z = (Amount - Mean) / StandardDeviation
                    </div>
                </div>

                <div class="card" style="grid-column: 1 / -1;">
                    <h3 style="margin-bottom: 1.5rem;">Data Management</h3>
                    
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="btn" onclick="AppRouter.openImportModal()">Import CSV</button>
                        <button class="btn" onclick="AppRouter.exportTransactionsCsv()">Export CSV</button>
                        <button class="btn" onclick="AppRouter.loadDemoData()">Load Sample Demo Dataset</button>
                        <button class="btn" style="border-color: var(--status-danger); color: var(--status-danger);" onclick="AppRouter.clearAllData()">Clear All My Transactions</button>
                    </div>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
    },

    /* =======================================================================
     * ACTIONS, MODALS & UTILITIES
     * ======================================================================= */

    updateSetting: function(key, value) {
        window.StorageModule.updateSetting(key, value);
        window.UIModule.showToast(`Updated threshold to ${value}σ`, 'success');
        this.handleRoute();
    },

    loadDemoData: function() {
        if(confirm('Load sample transactions into your account for testing statistical anomaly detection?')) {
            const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
            if (currentUser) {
                if (window.StorageModule.seedDemoDataForUser) {
                    window.StorageModule.seedDemoDataForUser(currentUser.email);
                }
            }
            window.UIModule.showToast('Sample dataset loaded successfully!', 'success');
            this.handleRoute();
        }
    },

    clearAllData: function() {
        if(confirm('Are you sure you want to clear all transactions for your account? This cannot be undone.')) {
            const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
            if (currentUser) {
                window.StorageModule.clearUserTransactions(currentUser.email);
            }
            window.UIModule.showToast('All your transactions have been cleared.', 'info');
            this.handleRoute();
        }
    },

    resetData: function() {
        this.loadDemoData();
    },

    inspectAnomaly: function(anomaly) {
        const baseline = anomaly.baseline || { mean: anomaly.mean || 0, standardDeviation: anomaly.stdDev || 1 };
        const amt = anomaly.transaction.amount;
        const mean = baseline.mean;
        const std = baseline.standardDeviation;
        const z = anomaly.zScore;

        let html = `
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Transaction Info -->
                <div style="background: var(--bg-base); padding: 1rem; border-radius: 6px; border: 1px solid var(--border-color);">
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Transaction Details</div>
                    <div style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">${anomaly.transaction.merchant || anomaly.transaction.description || 'Expense'}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="badge badge-outline">${anomaly.transaction.category}</span>
                        <span style="font-size: 1.25rem; font-weight: 600;">${window.UIModule.formatCurrency(amt)}</span>
                    </div>
                    <div style="margin-top: 1rem; font-size: 0.8125rem; color: var(--text-secondary);">
                        Date: ${anomaly.transaction.date || '—'}<br>
                        Payment Method: ${anomaly.transaction.paymentMethod || 'Standard'}
                    </div>
                </div>

                <!-- Mathematical Evidence -->
                <div>
                    <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Statistical Evidence Breakdown</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.5rem 0; color: var(--text-secondary);">Category Historical Mean (μ)</td>
                            <td style="padding: 0.5rem 0; text-align: right; font-family: monospace;">${window.UIModule.formatCurrency(mean)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.5rem 0; color: var(--text-secondary);">Standard Deviation (σ)</td>
                            <td style="padding: 0.5rem 0; text-align: right; font-family: monospace;">${window.UIModule.formatCurrency(std)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.5rem 0; color: var(--text-secondary);">Transaction Amount (x)</td>
                            <td style="padding: 0.5rem 0; text-align: right; font-family: monospace;">${window.UIModule.formatCurrency(amt)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem 0; color: var(--text-primary); font-weight: 600;">Calculated Z-Score</td>
                            <td style="padding: 0.5rem 0; text-align: right; color: var(--status-danger); font-family: monospace; font-weight: 600; font-size: 1.125rem;">+${z.toFixed(2)}σ</td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 4px; font-family: monospace; font-size: 0.75rem; color: var(--accent-primary);">
                        Z = (${amt} - ${mean.toFixed(0)}) / ${std.toFixed(0)} = ${z.toFixed(2)}
                    </div>
                </div>

                <!-- Classification Verdict -->
                <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">Severity Classification</span>
                        <span class="badge badge-critical" style="text-transform: uppercase;">${anomaly.severity}</span>
                    </div>
                </div>
            </div>
        `;
        
        window.UIModule.openDrawer('Statistical Anomaly Inspector', html);
    },

    handleFilterChange: function(key, value) {
        this._txFilters[key] = value;
        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
        let transactions = [];
        if (currentUser && window.StorageModule.getTransactionsForUser) {
            transactions = window.StorageModule.getTransactionsForUser(currentUser.email) || [];
        } else {
            transactions = window.StorageModule.getTransactions ? (window.StorageModule.getTransactions() || []) : [];
        }
        const settings = window.StorageModule.getSettings();
        const analysis = window.AnomalyEngine.detectAnomalies(transactions, settings.zScoreThreshold);
        this.renderTransactions(transactions, analysis);
    },

    openAddTransactionModal: function() {
        const categories = window.DataModule ? window.DataModule.CATEGORIES : [
            'Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Utilities', 'Healthcare', 'Travel', 'Education', 'Other'
        ];
        const html = `
            <form id="addTxForm" onsubmit="AppRouter.submitAddTransaction(event)">
                <div class="form-group">
                    <label class="form-label">Merchant / Description</label>
                    <input type="text" id="txMerchant" class="form-input" required placeholder="e.g., Apple Store, Netflix, Grocery">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Amount (₹)</label>
                        <input type="number" id="txAmount" class="form-input" required min="1" step="0.01" placeholder="e.g., 2500">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select id="txCategory" class="form-select" required>
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" id="txDate" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Method</label>
                        <select id="txMethod" class="form-select">
                            <option value="Credit Card">Credit Card</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Net Banking">Net Banking</option>
                            <option value="Cash">Cash</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes (Optional)</label>
                    <input type="text" id="txNotes" class="form-input" placeholder="e.g., Dinner with friends">
                </div>
                <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                    <input type="checkbox" id="txRecurring">
                    <label for="txRecurring" style="font-size: 0.875rem; cursor: pointer;">This is a recurring expense (Subscription/Utility)</label>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn" onclick="window.UIModule.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Transaction</button>
                </div>
            </form>
        `;
        window.UIModule.openModal('Add Transaction', html);
    },

    submitAddTransaction: function(e) {
        e.preventDefault();
        
        const dateStr = document.getElementById('txDate').value;
        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
        const tx = {
            id: `TXN-MANUAL-${Date.now()}`,
            userId: currentUser ? currentUser.email : null,
            merchant: document.getElementById('txMerchant').value.trim(),
            description: document.getElementById('txMerchant').value.trim(),
            amount: parseFloat(document.getElementById('txAmount').value),
            category: document.getElementById('txCategory').value,
            date: dateStr,
            timestamp: new Date(dateStr).getTime(),
            paymentMethod: document.getElementById('txMethod').value,
            recurring: document.getElementById('txRecurring').checked,
            notes: (document.getElementById('txNotes') ? document.getElementById('txNotes').value.trim() : '')
        };

        window.StorageModule.addTransactionForUser(tx);
        window.UIModule.closeModal();
        window.UIModule.showToast('Transaction recorded. Baselines recalculated!', 'success');
        
        setTimeout(() => this.handleRoute(), 100);
    },

    openEditTransactionModal: function(txId) {
        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
        let transactions = [];
        if (currentUser && window.StorageModule.getTransactionsForUser) {
            transactions = window.StorageModule.getTransactionsForUser(currentUser.email) || [];
        } else {
            transactions = window.StorageModule.getTransactions ? (window.StorageModule.getTransactions() || []) : [];
        }

        const tx = transactions.find(t => t.id === txId) || (window.StorageModule.getTransactionById ? window.StorageModule.getTransactionById(txId) : null);
        if (!tx) {
            window.UIModule.showToast('Transaction not found', 'error');
            return;
        }

        const categories = window.DataModule ? window.DataModule.CATEGORIES : [
            'Food', 'Transport', 'Shopping', 'Subscriptions', 'Entertainment', 'Utilities', 'Healthcare', 'Travel', 'Education', 'Other'
        ];
        const dateVal = tx.date || (tx.timestamp ? new Date(tx.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

        const html = `
            <form id="editTxForm" onsubmit="AppRouter.submitEditTransaction(event, '${tx.id}')">
                <div class="form-group">
                    <label class="form-label">Merchant / Description</label>
                    <input type="text" id="editTxMerchant" class="form-input" required value="${(tx.merchant || tx.description || '').replace(/"/g, '&quot;')}">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Amount (₹)</label>
                        <input type="number" id="editTxAmount" class="form-input" required min="0.01" step="0.01" value="${tx.amount}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select id="editTxCategory" class="form-select" required>
                            ${categories.map(c => `<option value="${c}" ${tx.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" id="editTxDate" class="form-input" required value="${dateVal}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Method</label>
                        <select id="editTxMethod" class="form-select">
                            <option value="Credit Card" ${tx.paymentMethod === 'Credit Card' ? 'selected' : ''}>Credit Card</option>
                            <option value="Debit Card" ${tx.paymentMethod === 'Debit Card' ? 'selected' : ''}>Debit Card</option>
                            <option value="UPI" ${tx.paymentMethod === 'UPI' ? 'selected' : ''}>UPI</option>
                            <option value="Net Banking" ${tx.paymentMethod === 'Net Banking' ? 'selected' : ''}>Net Banking</option>
                            <option value="Cash" ${tx.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes (Optional)</label>
                    <input type="text" id="editTxNotes" class="form-input" value="${(tx.notes || tx.description || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                    <input type="checkbox" id="editTxRecurring" ${tx.recurring ? 'checked' : ''}>
                    <label for="editTxRecurring" style="font-size: 0.875rem; cursor: pointer;">This is a recurring expense</label>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem;">
                    <button type="button" class="btn" style="color: var(--status-danger); border-color: rgba(239,68,68,0.3);" onclick="AppRouter.deleteTransaction('${tx.id}', true)">Delete</button>
                    <div style="display: flex; gap: 0.75rem;">
                        <button type="button" class="btn" onclick="window.UIModule.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </div>
            </form>
        `;
        window.UIModule.openModal('Edit Transaction', html);
    },

    submitEditTransaction: function(e, txId) {
        e.preventDefault();
        const dateStr = document.getElementById('editTxDate').value;
        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
        
        const updatedTx = {
            id: txId,
            userId: currentUser ? currentUser.email : null,
            merchant: document.getElementById('editTxMerchant').value.trim(),
            amount: parseFloat(document.getElementById('editTxAmount').value),
            category: document.getElementById('editTxCategory').value,
            date: dateStr,
            timestamp: new Date(dateStr).getTime(),
            paymentMethod: document.getElementById('editTxMethod').value,
            recurring: document.getElementById('editTxRecurring').checked,
            notes: document.getElementById('editTxNotes').value.trim(),
            description: document.getElementById('editTxNotes').value.trim() || document.getElementById('editTxMerchant').value.trim()
        };

        if (window.StorageModule.updateTransaction) {
            window.StorageModule.updateTransaction(updatedTx);
        }

        window.UIModule.closeModal();
        window.UIModule.showToast('Transaction updated. Baselines recalculated!', 'success');
        setTimeout(() => this.handleRoute(), 100);
    },

    deleteTransaction: function(txId, fromModal = false) {
        if (confirm('Are you sure you want to delete this transaction? This will automatically update your statistical baselines.')) {
            window.StorageModule.deleteTransaction(txId);
            if (fromModal) {
                window.UIModule.closeModal();
            }
            window.UIModule.showToast('Transaction deleted successfully.', 'info');
            setTimeout(() => this.handleRoute(), 100);
        }
    },

    exportTransactionsCsv: function() {
        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
        let transactions = [];
        if (currentUser && window.StorageModule.getTransactionsForUser) {
            transactions = window.StorageModule.getTransactionsForUser(currentUser.email) || [];
        } else {
            transactions = window.StorageModule.getTransactions ? (window.StorageModule.getTransactions() || []) : [];
        }

        if (transactions.length === 0) {
            window.UIModule.showToast('No transactions to export.', 'warning');
            return;
        }

        const headers = ['date', 'merchant', 'category', 'amount', 'paymentMethod', 'recurring', 'notes'];
        const rows = transactions.map(t => [
            t.date || new Date(t.timestamp).toISOString().split('T')[0],
            `"${(t.merchant || t.description || '').replace(/"/g, '""')}"`,
            `"${(t.category || 'Other').replace(/"/g, '""')}"`,
            t.amount,
            `"${(t.paymentMethod || 'Credit Card').replace(/"/g, '""')}"`,
            t.recurring ? 'true' : 'false',
            `"${(t.notes || t.description || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `aurelis_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.UIModule.showToast('CSV export downloaded successfully!', 'success');
    },

    downloadSampleCsv: function() {
        const sampleContent = `date,category,amount,description
2026-08-01,Food,220,Morning Breakfast & Coffee
2026-08-02,Food,250,Lunch at Bistro
2026-08-03,Food,210,Dinner Takeaway
2026-08-04,Food,240,Cafeteria Lunch
2026-08-05,Food,230,Sandwich & Juice
2026-08-06,Food,260,Groceries Mini-Market
2026-08-07,Food,215,Quick Snack
2026-08-08,Food,245,Office Lunch
2026-08-09,Food,1850,Weekend Luxury Dining (Outlier)
2026-08-01,Transport,120,Metro Card Recharge
2026-08-03,Transport,150,Cab to Office
2026-08-05,Transport,135,Evening Auto Ride
2026-08-02,Shopping,850,Books & Stationery
2026-08-04,Shopping,920,Home Essentials
2026-08-06,Shopping,780,Personal Care
2026-08-12,Shopping,4500,Designer Electronics (Outlier)`;

        const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'aurelis_sample_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.UIModule.showToast('Sample CSV template downloaded!', 'success');
    },

    openImportModal: function() {
        const html = `
            <div style="margin-bottom: 1.5rem;">
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Upload a <code>.csv</code> file or paste CSV text below. Standard columns (<code>Date, Category, Amount</code>) are automatically mapped.
                </p>
                <div style="margin-bottom: 1rem;">
                    <input type="file" id="csvFileInput" accept=".csv,text/csv" class="form-input" style="padding: 0.5rem;" onchange="AppRouter.handleCsvFileUpload(event)">
                </div>
                <div style="text-align: center; color: var(--text-tertiary); font-size: 0.75rem; margin-bottom: 0.75rem;">— OR PASTE RAW CSV CONTENT —</div>
                <textarea id="csvData" class="form-input" style="height: 150px; font-family: monospace; font-size: 0.75rem;" placeholder="Transaction_ID,Date,Amount,Category,Merchant,Payment_Method&#10;TXN01,2026-01-01,150.00,Food,Local Diner,UPI"></textarea>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <button type="button" class="btn" onclick="AppRouter.downloadSampleCsv()">Download Sample CSV</button>
                <div style="display: flex; gap: 0.75rem;">
                    <button type="button" class="btn" onclick="window.UIModule.closeModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="AppRouter.submitCsvImport(event)">Import Data</button>
                </div>
            </div>
        `;
        window.UIModule.openModal('Import CSV Data', html);
    },

    handleCsvFileUpload: function(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const textarea = document.getElementById('csvData');
            if (textarea) textarea.value = text;
        };
        reader.readAsText(file);
    },

    submitCsvImport: function(e) {
        if (e) e.preventDefault();

        const textarea = document.getElementById('csvData');
        const text = textarea ? textarea.value : '';

        if (!text.trim()) {
            window.UIModule.showToast('Please paste or upload CSV data first.', 'warning');
            return;
        }

        const currentUser = window.StorageModule.getCurrentUser ? window.StorageModule.getCurrentUser() : null;
        const userEmail = currentUser ? currentUser.email : 'demo@aurelis.io';

        // Parse with CSVModule or fallback to DataModule
        let result = null;
        if (window.CSVModule && window.CSVModule.parseCSVText) {
            result = window.CSVModule.parseCSVText(text, userEmail);
        } else if (window.DataModule && window.DataModule.parseCSV) {
            result = window.DataModule.parseCSV(text, userEmail);
        }

        if (result && (result.valid || result.transactions)) {
            const txns = result.valid || result.transactions || [];
            if (txns.length > 0) {
                // Ensure every transaction has the current user ID
                txns.forEach(tx => {
                    tx.userId = userEmail;
                });

                const currentTxs = window.StorageModule.getTransactionsForUser(userEmail) || [];
                const all = window.StorageModule.getAllTransactions();
                const otherUserTxs = all.filter(tx => tx.userId !== userEmail);

                window.StorageModule.saveAllTransactions([...txns, ...currentTxs, ...otherUserTxs]);
                window.UIModule.closeModal();
                
                let toastMsg = `Imported ${txns.length} transaction${txns.length > 1 ? 's' : ''} successfully!`;
                if (result.invalidCount > 0) {
                    toastMsg += ` (${result.invalidCount} invalid rows skipped)`;
                }
                window.UIModule.showToast(toastMsg, 'success');
                
                this.handleRoute();
                return;
            }
        }
        
        const err = result && result.errors && result.errors[0] ? result.errors[0] : 'Failed to parse CSV. Please check columns: Date, Amount, Category.';
        window.UIModule.showToast(err, 'error');
    }
};

window.AppRouter = AppRouter;
