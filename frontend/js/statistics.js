/* =============================================================================
   AURELIS -- Financial Intelligence & Statistical Anomaly Detector
   Collaborative Development: Sukritti Singla -- Harshita Malhotra -- Simran Kapoor
   ============================================================================= */

'use strict';

const StatisticsModule = {
    // Mean: Î¼ = Î£x / N
    calculateMean: function(values) {
        if (!values || values.length === 0) return 0;
        const sum = values.reduce((acc, val) => acc + parseFloat(val), 0);
        return sum / values.length;
    },

    // Variance: ÏƒÂ² = Î£(x - Î¼)Â² / N
    calculateVariance: function(values, mean) {
        if (!values || values.length === 0) return 0;
        const m = mean !== undefined ? mean : this.calculateMean(values);
        const sqDiffs = values.map(val => {
            const diff = parseFloat(val) - m;
            return diff * diff;
        });
        const sumSqDiffs = sqDiffs.reduce((acc, val) => acc + val, 0);
        return sumSqDiffs / values.length;
    },

    // Standard Deviation: Ïƒ = âˆšVariance
    calculateStandardDeviation: function(values, mean) {
        if (!values || values.length <= 1) return 0;
        const variance = this.calculateVariance(values, mean);
        return Math.sqrt(variance);
    },

    // Z-Score: Z = (x - Î¼) / Ïƒ
    calculateZScore: function(value, mean, standardDeviation) {
        // Zero standard deviation edge case: no variance, z-score is 0
        if (!standardDeviation || standardDeviation === 0) return 0;
        return (parseFloat(value) - mean) / standardDeviation;
    },

    // Group transactions by category and calculate statistical baselines
    calculateCategoryBaselines: function(transactions, minCategorySize = 3) {
        const baselines = {};
        const groups = {};

        transactions.forEach(tx => {
            const cat = tx.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(parseFloat(tx.amount) || 0);
        });

        for (const [category, amounts] of Object.entries(groups)) {
            const count = amounts.length;
            const total = amounts.reduce((a, b) => a + b, 0);

            if (count < minCategorySize) {
                baselines[category] = {
                    count,
                    total,
                    mean: this.calculateMean(amounts),
                    standardDeviation: 0,
                    insufficientData: true
                };
            } else {
                const mean = this.calculateMean(amounts);
                const stdDev = this.calculateStandardDeviation(amounts, mean);
                baselines[category] = {
                    count,
                    total,
                    mean,
                    standardDeviation: stdDev,
                    insufficientData: false
                };
            }
        }

        return baselines;
    }
};

window.StatisticsModule = StatisticsModule;
