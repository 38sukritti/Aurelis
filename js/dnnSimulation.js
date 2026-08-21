/* =============================================================================
   COMMIT NO. 29
   COMMIT BY: Sukritti
   COMMIT MESSAGE: refactor: archive experimental DNN simulations in favor of Phase 1 statistical engine
   ============================================================================= */

// Phase 1 uses pure statistical z-score analysis (js/statistics.js and js/anomalyDetector.js).
// This experimental AI simulation module is disabled and not loaded into active workflows.
const DNNSimulation = {
    disabled: true,
    calculateOverallRiskIndex: () => 0,
    generateGlobalSignals: () => []
};

if (typeof window !== 'undefined') {
    window.DNNSimulation = DNNSimulation;
}
