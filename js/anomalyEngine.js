/* =============================================================================
   COMMIT NO. 10
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(engine): pipeline transactions through baseline calculation and decorate outliers
   ============================================================================= */

'use strict';

const AnomalyEngine = {
    // Classification rules for Phase 1
    classifySeverity: function(zScoreAbs, baseThreshold = 3.0) {
        const threshold = parseFloat(baseThreshold) || 3.0;
        if (zScoreAbs >= threshold + 2.0) return 'Critical';
        if (zScoreAbs >= threshold + 1.0) return 'High';
        if (zScoreAbs >= threshold) return 'Moderate';
        return 'Normal';
    },

    detectAnomalies: function(transactions = [], threshold = 3.0) {
        const numThreshold = parseFloat(threshold) || 3.0;

        // 1. Establish baselines using statistical calculations
        const baselines = window.StatisticsModule 
            ? window.StatisticsModule.calculateCategoryBaselines(transactions, 3)
            : (window.AnomalyDetector ? window.AnomalyDetector.buildCategoryBaselines(transactions) : {});
        
        const anomalies = [];
        const processedTransactions = [];

        // 2. Evaluate each transaction against its category baseline
        transactions.forEach(tx => {
            const category = tx.category || 'Other';
            const baseline = baselines[category];
            const amount = parseFloat(tx.amount) || 0;
            
            let zScore = 0;
            let severity = 'Normal';
            let isAnomaly = false;

            if (baseline && !baseline.insufficientData && baseline.standardDeviation > 0) {
                // Calculate z-score
                zScore = (amount - baseline.mean) / baseline.standardDeviation;
                const absZScore = Math.abs(zScore);

                // Check against threshold
                if (absZScore >= numThreshold) {
                    isAnomaly = true;
                    severity = this.classifySeverity(absZScore, numThreshold);
                    
                    anomalies.push({
                        transaction: tx,
                        baseline: baseline,
                        zScore: zScore,
                        severity: severity,
                        deviationPercent: baseline.mean > 0 ? ((amount - baseline.mean) / baseline.mean) * 100 : 0,
                        reason: `Transaction of ₹${amount} is ${zScore > 0 ? '+' : ''}${zScore.toFixed(2)}σ from your ${category} baseline (Mean: ₹${Math.round(baseline.mean)}).`
                    });
                }
            } else if (baseline && baseline.insufficientData) {
                severity = 'Insufficient Data';
            }

            // Decorate transaction object with analysis info
            processedTransactions.push({
                ...tx,
                amount: amount,
                isAnomaly: isAnomaly,
                severity: severity,
                analysis: {
                    baselineMean: baseline ? baseline.mean : amount,
                    baselineStdDev: baseline ? baseline.standardDeviation : 0,
                    zScore: zScore,
                    isAnomaly: isAnomaly,
                    severity: severity
                }
            });
        });

        // Sort anomalies by highest absolute z-score
        anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

        return {
            baselines: baselines,
            anomalies: anomalies,
            decoratedTransactions: processedTransactions,
            threshold: numThreshold
        };
    }
};

window.AnomalyEngine = AnomalyEngine;
