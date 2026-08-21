/* =============================================================================
   COMMIT NO. 16
   COMMIT BY: Simran
   COMMIT MESSAGE: feat(charts): build Canvas 2D spending trend timeline and anomaly rate gauge
   ============================================================================= */

const ChartsModule = {
    // Colors matching CSS variables
    colors: {
        primary: '#f4f4f5',
        secondary: '#a1a1aa',
        grid: '#27272a',
        accent: '#3b82f6',
        accentFill: 'rgba(59, 130, 246, 0.2)',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        // Category colors for donut chart
        categories: [
            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
            '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', 
            '#84cc16', '#64748b'
        ]
    },

    drawSpendingTrend: function(canvasId, transactions) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !transactions || transactions.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        ctx.clearRect(0, 0, width, height);

        const sorted = [...transactions].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const dailySums = {};
        
        sorted.forEach(tx => {
            const dateStr = tx.date;
            if (!dailySums[dateStr]) dailySums[dateStr] = 0;
            dailySums[dateStr] += parseFloat(tx.amount) || 0;
        });

        const dataPoints = Object.keys(dailySums).sort().map(k => dailySums[k]);
        if (dataPoints.length < 2) return;

        const maxVal = Math.max(...dataPoints, 1);
        
        // Draw Grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
            const y = padding + (height - 2 * padding) * (i / 4);
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
        }
        ctx.stroke();

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = this.colors.accent;
        ctx.lineWidth = 2;
        
        const stepX = (width - 2 * padding) / (dataPoints.length - 1);
        
        dataPoints.forEach((val, index) => {
            const x = padding + (index * stepX);
            const y = height - padding - ((val / maxVal) * (height - 2 * padding));
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();

        // Draw Area Fill
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.fillStyle = this.colors.accentFill;
        ctx.fill();
    },

    drawDonutChart: function(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || Object.keys(data).length === 0) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2.5;
        const innerRadius = radius * 0.6;

        ctx.clearRect(0, 0, width, height);

        const total = Object.values(data).reduce((a, b) => a + b, 0);
        let startAngle = -Math.PI / 2;
        let colorIndex = 0;
        
        for (const [label, value] of Object.entries(data)) {
            const sliceAngle = total > 0 ? (value / total) * 2 * Math.PI : 0;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            
            ctx.fillStyle = this.colors.categories[colorIndex % this.colors.categories.length];
            ctx.fill();
            
            startAngle += sliceAngle;
            colorIndex++;
        }
        
        // Draw total in middle
        ctx.fillStyle = this.colors.primary;
        ctx.font = '600 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let displayTotal = total;
        if (total >= 100000) displayTotal = (total / 100000).toFixed(1) + 'L';
        else if (total >= 1000) displayTotal = (total / 1000).toFixed(1) + 'k';
        else displayTotal = Math.round(total).toString();
        
        ctx.fillText('₹' + displayTotal, centerX, centerY);
    },

    // Gauge for Anomaly Rate (0% to 100%)
    drawAnomalyGauge: function(canvasId, ratePercent, status = 'NORMAL') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height * 0.78;
        const radius = Math.min(width, height) * 0.58;

        ctx.clearRect(0, 0, width, height);

        // Draw background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 0);
        ctx.lineWidth = 14;
        ctx.strokeStyle = this.colors.grid;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Calculate clamped rate for gauge arc
        const clampedRate = Math.min(Math.max(parseFloat(ratePercent) || 0, 0), 100);
        // Fill up to the rate (or at least a tiny notch if >0)
        const progressFraction = clampedRate === 0 ? 0 : Math.max(clampedRate / 100, 0.03);
        const endAngle = Math.PI + (progressFraction * Math.PI);

        if (progressFraction > 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            
            if (status === 'HIGH ATTENTION' || clampedRate > 20) {
                ctx.strokeStyle = this.colors.danger;
            } else if (status === 'REVIEW REQUIRED' || clampedRate > 0) {
                ctx.strokeStyle = this.colors.warning;
            } else {
                ctx.strokeStyle = this.colors.success;
            }
            ctx.stroke();
        }
    },

    // Backward-compatible alias
    drawRiskGauge: function(canvasId, score) {
        this.drawAnomalyGauge(canvasId, score, score > 50 ? 'HIGH ATTENTION' : (score > 0 ? 'REVIEW REQUIRED' : 'NORMAL'));
    }
};

window.ChartsModule = ChartsModule;
