/* =============================================================================
   COMMIT NO. 09
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(detector): build multi-category Z-score anomaly detector and threshold logic
   ============================================================================= */

'use strict';

const MIN_CATEGORY_SIZE = 3;
const DEFAULT_THRESHOLD = 3.0;

const AnomalyDetector = {
    MIN_CATEGORY_SIZE: MIN_CATEGORY_SIZE,
    DEFAULT_THRESHOLD: DEFAULT_THRESHOLD,

    // Step 1 & 2 & 3: Group by category, compute mean & standard deviation
    buildCategoryBaselines: function(transactions) {
        if (window.StatisticsModule && window.StatisticsModule.calculateCategoryBaselines) {
            return window.StatisticsModule.calculateCategoryBaselines(transactions, MIN_CATEGORY_SIZE);
        }

        const baselines = {};
        const groups = {};

        transactions.forEach(tx => {
            const cat = tx.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(parseFloat(tx.amount) || 0);
        });

        Object.keys(groups).forEach(category => {
            const amounts = groups[category];
            const count = amounts.length;
            const total = amounts.reduce((acc, v) => acc + v, 0);

            if (count < MIN_CATEGORY_SIZE) {
                const sum = amounts.reduce((a, b) => a + b, 0);
                baselines[category] = {
                    mean: count > 0 ? sum / count : 0,
                    standardDeviation: 0,
                    count: count,
                    total: total,
                    insufficientData: true
                };
            } else {
                const mean = amounts.reduce((a, b) => a + b, 0) / count;
                const variance = amounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
                const stdDev = Math.sqrt(variance);

                baselines[category] = {
                    mean: mean,
                    standardDeviation: stdDev,
                    count: count,
                    total: total,
                    insufficientData: false
                };
            }
        });

        return baselines;
    },

    // Step 4: Calculate Z-score
    calculateZScore: function(amount, mean, standardDeviation) {
        if (!standardDeviation || standardDeviation === 0) return 0;
        return (parseFloat(amount) - mean) / standardDeviation;
    },

    // Step 5: Classify Severity based on application-defined thresholds
    classifySeverity: function(absZ, threshold) {
        if (absZ >= threshold + 2.0) return 'critical';
        if (absZ >= threshold + 1.0) return 'high';
        if (absZ >= threshold) return 'moderate';
        return 'normal';
    },

    // Full detection pipeline
    detectAnomalies: function(transactions = [], threshold = DEFAULT_THRESHOLD) {
        const numericThreshold = parseFloat(threshold) || DEFAULT_THRESHOLD;

        if (!transactions || transactions.length === 0) {
            return {
                baselines: {},
                anomalies: [],
                normal: [],
                decoratedTransactions: [],
                threshold: numericThreshold
            };
        }

        const baselines = this.buildCategoryBaselines(transactions);
        const decoratedTransactions = [];
        const anomalies = [];
        const normal = [];

        transactions.forEach(tx => {
            const cat = tx.category || 'Other';
            const baseline = baselines[cat];
            const amount = parseFloat(tx.amount) || 0;

            let zScore = 0;
            let isAnomaly = false;
            let severity = 'normal';
            let insufficientData = false;

            if (!baseline || baseline.insufficientData) {
                insufficientData = true;
                severity = 'insufficient_data';
            } else if (baseline.standardDeviation === 0) {
                zScore = 0;
                severity = 'normal';
            } else {
                zScore = this.calculateZScore(amount, baseline.mean, baseline.standardDeviation);
                const absZ = Math.abs(zScore);

                if (absZ >= numericThreshold) {
                    isAnomaly = true;
                    severity = this.classifySeverity(absZ, numericThreshold);
                }
            }

            const decorated = {
                ...tx,
                amount: amount,
                zScore: zScore,
                isAnomaly: isAnomaly,
                severity: severity,
                categoryMean: baseline ? baseline.mean : 0,
                categoryStdDev: baseline ? baseline.standardDeviation : 0,
                insufficientData: insufficientData
            };

            decoratedTransactions.push(decorated);

            if (isAnomaly) {
                anomalies.push({
                    transaction: decorated,
                    zScore: zScore,
                    severity: severity,
                    mean: baseline ? baseline.mean : 0,
                    stdDev: baseline ? baseline.standardDeviation : 0
                });
            } else {
                normal.push(decorated);
            }
        });

        // Sort anomalies by absolute Z-score descending
        anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

        return {
            baselines: baselines,
            anomalies: anomalies,
            normal: normal,
            decoratedTransactions: decoratedTransactions,
            threshold: numericThreshold
        };
    }
};

window.AnomalyDetector = AnomalyDetector;
