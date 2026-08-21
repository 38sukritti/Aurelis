/* =============================================================================
   COMMIT NO. 17
   COMMIT BY: Simran
   COMMIT MESSAGE: feat(insights): generate plain-English spending anomalies and actionable insights
   ============================================================================= */

/**
 * insights.js
 * Generates natural language insights based on transaction statistics.
 */

const InsightsModule = {
    generateInsights: function (transactions, baselines) {
        const insights = [];

        if (!transactions || transactions.length < 10) {
            return [{
                text: "Not enough data yet to generate meaningful insights. Add more transactions to establish baselines.",
                type: "neutral"
            }];
        }

        // 1. Highest Volatility Category
        let highestVolCategory = null;
        let highestVol = -1;

        for (const [cat, data] of Object.entries(baselines)) {
            if (data.count > 3 && data.mean > 0) {
                const coefficientOfVariation = data.standardDeviation / data.mean;
                if (coefficientOfVariation > highestVol) {
                    highestVol = coefficientOfVariation;
                    highestVolCategory = cat;
                }
            }
        }

        if (highestVolCategory && highestVol > 0.4) {
            insights.push({
                text: `${highestVolCategory} has the highest spending volatility recently. Consider establishing a stricter budget for this category.`,
                type: "warning"
            });
        }

        // 2. Spending Velocity (Recent vs Historical Average)
        const recentCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // Last 7 days
        const recentTxs = transactions.filter(t => t.timestamp >= recentCutoff);
        const recentTotal = recentTxs.reduce((sum, t) => sum + t.amount, 0);

        const totalDurationMs = transactions[0].timestamp - transactions[transactions.length - 1].timestamp;
        const totalDurationDays = Math.max(totalDurationMs / (1000 * 60 * 60 * 24), 1);
        const historicalDailyAverage = transactions.reduce((sum, t) => sum + t.amount, 0) / totalDurationDays;

        const recentDailyAverage = recentTotal / 7;

        if (recentDailyAverage > historicalDailyAverage * 1.5) {
            const percentIncrease = Math.round(((recentDailyAverage - historicalDailyAverage) / historicalDailyAverage) * 100);
            insights.push({
                text: `High spending velocity detected. Your spending over the last 7 days is ${percentIncrease}% higher than your historical average.`,
                type: "critical"
            });
        } else if (recentDailyAverage < historicalDailyAverage * 0.8) {
            insights.push({
                text: `Excellent control. Your recent spending velocity is below your historical baseline.`,
                type: "success"
            });
        }

        // 3. Recurring Expense Analysis
        const recurringTxs = transactions.filter(t => t.recurring);
        if (recurringTxs.length > 0) {
            const monthlyRecurringEstimate = recurringTxs.reduce((sum, t) => sum + t.amount, 0) / (totalDurationDays / 30);
            if (monthlyRecurringEstimate > 5000) {
                insights.push({
                    text: `Your estimated monthly recurring expenses are approximately ₹${Math.round(monthlyRecurringEstimate).toLocaleString()}.`,
                    type: "neutral"
                });
            }
        }

        return insights;
    }
};

window.InsightsModule = InsightsModule;
