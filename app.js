/* ==========================================================================
   Grade 11 Early Admission & AP Predictor Logic Engine (app.js)
   ========================================================================== */

// Global AP Toggle State Tracking (false = Standard -1, true = AP)
const apState = {
    ela20: false,
    math20_1: false,
    chem20: false,
    phys20: false,
    subj5_20: false
};

// Course weights for Faculty of Engineering / Science early admission tracks
const courseWeights = {
    math20_1: 1.25,
    chem20: 1.15,
    phys20: 1.15,
    ela20: 1.00,
    subj5_20: 1.00
};

/**
 * Toggle AP course status for a subject and trigger re-calculation
 * @param {string} subjectKey 
 */
function toggleAP(subjectKey) {
    apState[subjectKey] = !apState[subjectKey];
    const btn = document.getElementById(`btn-${subjectKey}`);
    
    if (apState[subjectKey]) {
        btn.classList.add('is-ap');
        btn.textContent = 'AP Course';
    } else {
        btn.classList.remove('is-ap');
        btn.textContent = 'Standard (-1)';
    }

    calculateAdmissions();
}

/**
 * Sync number input when slider moves
 * @param {string} subjectKey 
 */
function syncFromSlider(subjectKey) {
    const sliderVal = document.getElementById(`slider-${subjectKey}`).value;
    document.getElementById(`grade-${subjectKey}`).value = sliderVal;
    calculateAdmissions();
}

/**
 * Sync slider position when number input changes
 * @param {string} subjectKey 
 */
function syncFromInput(subjectKey) {
    let inputVal = parseFloat(document.getElementById(`grade-${subjectKey}`).value) || 0;
    
    // Clamp values between 0 and 100
    if (inputVal > 100) inputVal = 100;
    if (inputVal < 0) inputVal = 0;
    
    document.getElementById(`slider-${subjectKey}`).value = inputVal;
    calculateAdmissions();
}

/**
 * Main calculation engine evaluating 20-level prerequisites and AP rigor
 */
function calculateAdmissions() {
    const rawGrades = {
        ela20: parseFloat(document.getElementById('grade-ela20').value) || 0,
        math20_1: parseFloat(document.getElementById('grade-math20_1').value) || 0,
        chem20: parseFloat(document.getElementById('grade-chem20').value) || 0,
        phys20: parseFloat(document.getElementById('grade-phys20').value) || 0,
        subj5_20: parseFloat(document.getElementById('grade-subj5_20').value) || 0
    };

    const subjects = Object.keys(rawGrades);
    
    // Early Admission Threshold Rules (Strict)
    const earlyMinSubjectThreshold = 60.0; // Minimum grade required per subject for early consideration
    const minFacultyEligibilityAverage = 70.0; // Hard cutoff for faculty admission consideration

    // 1. HARD KNOCKOUT EVALUATION (Gatekeeper Rules)
    for (let key of subjects) {
        if (rawGrades[key] < earlyMinSubjectThreshold) {
            renderResults({
                chance: 0.0,
                unweightedAvg: calculateUnweightedAvg(rawGrades),
                weightedAvg: 0.0,
                apCount: countActiveAP(),
                statusClass: 'status-rejected',
                statusText: 'REJECTED',
                reason: `Knockout Rule: Grade in ${formatSubjectName(key)} (${rawGrades[key]}%) is below the early admission minimum prerequisite requirement of ${earlyMinSubjectThreshold}%.`
            });
            return;
        }
    }

    const unweightedAvg = calculateUnweightedAvg(rawGrades);

    if (unweightedAvg < minFacultyEligibilityAverage) {
        renderResults({
            chance: 0.0,
            unweightedAvg: unweightedAvg,
            weightedAvg: unweightedAvg,
            apCount: countActiveAP(),
            statusClass: 'status-rejected',
            statusText: 'REJECTED',
            reason: `Overall 20-level unweighted average (${unweightedAvg.toFixed(1)}%) is below the minimum faculty eligibility threshold of 70.0%.`
        });
        return;
    }

    // 2. AP EVALUATION & RIGOR WEIGHTING
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let apCourseCount = 0;

    for (let key of subjects) {
        let mark = rawGrades[key];
        
        // Applying 1.035x Rigor Multiplier if AP version is selected (capped at 100%)
        if (apState[key]) {
            mark = Math.min(100, mark * 1.035);
            apCourseCount++;
        }

        const weight = courseWeights[key] || 1.0;
        totalWeightedScore += mark * weight;
        totalWeight += weight;
    }

    const weightedAvg = totalWeightedScore / totalWeight;

    // 3. SIGMOID ADMISSION PROBABILITY CURVE
    // Historical Grade 11 Early Admission Target Cutoff: ~89.0%
    // Each completed AP module lowers effective target competitive cutoff by 0.8%
    const targetCutoff = 89.0 - (0.8 * apCourseCount);
    const k = 0.38; // Curve steepness coefficient

    let rawProb = 1 / (1 + Math.exp(-k * (weightedAvg - targetCutoff)));
    let percentage = rawProb * 100;

    // Boundary constraints
    if (weightedAvg >= 94.0) percentage = Math.max(percentage, 98.5);
    if (weightedAvg < 81.0) percentage = Math.min(percentage, 1.5);

    // Classification Categories
    let statusClass = 'status-risk';
    let statusText = 'HIGH RISK / WAITLIST';
    let reason = 'Your Grade 11 average is below recent early admission pools. You will likely need to wait for 30-level final grade evaluations in spring/summer.';

    if (percentage >= 80) {
        statusClass = 'status-strong';
        statusText = 'STRONG CANDIDATE';
        reason = 'Excellent profile! High probability of receiving an Early Admission conditional offer based on 20-level marks.';
    } else if (percentage >= 45) {
        statusClass = 'status-competitive';
        statusText = 'COMPETITIVE';
        reason = 'Your marks place you inside the competitive pool. Conditional offers may arrive in secondary early waves as capacity allows.';
    }

    renderResults({
        chance: percentage,
        unweightedAvg: unweightedAvg,
        weightedAvg: weightedAvg,
        apCount: apCourseCount,
        statusClass: statusClass,
        statusText: statusText,
        reason: reason
    });
}

/**
 * Calculates unweighted arithmetic mean across all subjects
 */
function calculateUnweightedAvg(grades) {
    const vals = Object.values(grades);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Counts total active AP courses
 */
function countActiveAP() {
    return Object.values(apState).filter(Boolean).length;
}

/**
 * Helper to display human-readable subject names
 */
function formatSubjectName(key) {
    const names = {
        ela20: 'ELA 20-1',
        math20_1: 'Math 20-1',
        chem20: 'Chemistry 20',
        phys20: 'Physics 20',
        subj5_20: 'Approved 5th Subject 20'
    };
    return names[key] || key;
}

/**
 * Updates DOM components with calculated data
 */
function renderResults(data) {
    const chanceDisplay = document.getElementById('chanceDisplay');
    const statusText = document.getElementById('statusText');
    const reasonDisplay = document.getElementById('reasonDisplay');

    chanceDisplay.textContent = `${data.chance.toFixed(1)}%`;
    chanceDisplay.className = `chance-badge ${data.statusClass}`;

    statusText.textContent = data.statusText;
    statusText.className = `status-title ${data.statusClass}`;

    document.getElementById('unweightedAvgDisplay').textContent = `${data.unweightedAvg.toFixed(1)}%`;
    document.getElementById('weightedAvgDisplay').textContent = `${data.weightedAvg.toFixed(1)}%`;
    document.getElementById('apCountDisplay').textContent = `${data.apCount} / 5`;

    reasonDisplay.textContent = data.reason;
    if (data.statusClass === 'status-rejected') {
        reasonDisplay.classList.add('is-rejected');
    } else {
        reasonDisplay.classList.remove('is-rejected');
    }
}

/**
 * Copies a text summary of the student's evaluation to clipboard
 */
function copyResultsSummary() {
    const status = document.getElementById('statusText').textContent;
    const chance = document.getElementById('chanceDisplay').textContent;
    const unweighted = document.getElementById('unweightedAvgDisplay').textContent;
    const weighted = document.getElementById('weightedAvgDisplay').textContent;
    const apCount = document.getElementById('apCountDisplay').textContent;
    const reason = document.getElementById('reasonDisplay').textContent;

    const summaryText = `--- Grade 11 Early Admission Prediction ---\n` +
        `Status: ${status} (${chance})\n` +
        `Unweighted 20-Level Average: ${unweighted}\n` +
        `AP-Weighted Average: ${weighted}\n` +
        `Active AP Courses: ${apCount}\n` +
        `Assessment: ${reason}`;

    navigator.clipboard.writeText(summaryText).then(() => {
        alert('Summary copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Initial calculation on page load
window.addEventListener('DOMContentLoaded', calculateAdmissions);
