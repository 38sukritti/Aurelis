/* =============================================================================
   AURELIS -- Financial Intelligence & Statistical Anomaly Detector
   Collaborative Development: Sukritti Singla -- Harshita Malhotra -- Simran Kapoor
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
