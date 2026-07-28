/* ==========================================================================
   Alberta Engineering Early Admission Evaluator (2026–2027 Cycle)
   Calculates probability against the ~88% competitive early offer threshold.
   ========================================================================== */

const COMPETITIVE_CUTOFF_2026 = 88.0; // Benchmark cutoff for U of A / U of C Engineering

function calculateAdmission() {
    const grades = [
        parseFloat(document.getElementById('grade-math').value) || 0,
        parseFloat(document.getElementById('grade-chem').value) || 0,
        parseFloat(document.getElementById('grade-phys').value) || 0,
        parseFloat(document.getElementById('grade-ela').value) || 0,
        parseFloat(document.getElementById('grade-option').value) || 0
    ];

    // Check for hard prerequisite failure (< 50% or < 60% in Grade 11 prerequisite)
    const hasFailingGrade = grades.some(g => g < 50.0);
    const sum = grades.reduce((acc, curr) => acc + curr, 0);
    const average = sum / 5.0;

    const badge = document.getElementById('chanceBadge');
    const statusText = document.getElementById('statusText');
    const avgDisplay = document.getElementById('avgDisplay');
    const explanation = document.getElementById('explanation');

    avgDisplay.textContent = `${average.toFixed(1)}%`;

    if (hasFailingGrade) {
        badge.textContent = "0.0%";
        badge.className = "badge status-fail";
        statusText.textContent = "INELIGIBLE";
        statusText.className = "status-fail";
        explanation.textContent = "One or more core prerequisites are below the minimum passing threshold (50%). You must pass all 5 required subjects to be eligible for engineering admission.";
        return;
    }

    if (average < 70.0) {
        badge.textContent = "0.0%";
        badge.className = "badge status-fail";
        statusText.textContent = "BELOW FACULTY BASELINE";
        statusText.className = "status-fail";
        explanation.textContent = `Your 5-subject average (${average.toFixed(1)}%) is below the absolute minimum 70.0% faculty baseline required to submit an engineering application.`;
        return;
    }

    // Sigmoid probability function centered on the 88.0% historical Engineering early cutoff
    const k = 0.42; // Curve steepness
    const rawProbability = 1 / (1 + Math.exp(-k * (average - COMPETITIVE_CUTOFF_2026)));
    let chancePercent = rawProbability * 100;

    // Boundary Clamps
    if (average >= 93.0) chancePercent = 99.0;
    if (average <= 78.0) chancePercent = 1.0;

    badge.textContent = `${chancePercent.toFixed(1)}%`;

    if (chancePercent >= 75.0) {
        badge.className = "badge status-strong";
        statusText.textContent = "STRONG CANDIDATE";
        statusText.className = "status-strong";
        explanation.textContent = `Outstanding standing! Your ${average.toFixed(1)}% average exceeds the ~${COMPETITIVE_CUTOFF_2026}% early competitive cutoff for Alberta Engineering. You are in a strong position for an early conditional offer.`;
    } else if (chancePercent >= 40.0) {
        badge.className = "badge status-comp";
        statusText.textContent = "COMPETITIVE / SECONDARY ROUNDS";
        statusText.className = "status-comp";
        explanation.textContent = `Your ${average.toFixed(1)}% average sits directly in the active competitive band (${COMPETITIVE_CUTOFF_2026 - 3}% to ${COMPETITIVE_CUTOFF_2026}%). Early conditional offers may be tight, but you are well-positioned for secondary admission updates in February/March as Grade 12 updates roll in.`;
    } else {
        badge.className = "badge status-risk";
        statusText.textContent = "HIGH RISK / WAITLIST BAND";
        statusText.className = "status-risk";
        explanation.textContent = `Your ${average.toFixed(1)}% average is currently below the estimated early conditional threshold (~${COMPETITIVE_CUTOFF_2026}%). Focus on bringing up your core STEM subjects in semester 1 & 2 of Grade 12 to boost your average for main-round consideration.`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', calculateAdmission);
    });
    calculateAdmission();
});
