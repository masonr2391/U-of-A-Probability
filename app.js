/* ==========================================================================
   Grade 11 Early Admission & Fast-Tracked 30-AP Engine (app.js)
   ========================================================================== */

/**
 * Global AP Toggle State Tracking
 * false = Standard Course (-1), true = AP Course
 */
const apState = {
    math30_1: false, // Math 30-1 / Math 30-AP (Fast-tracked 30-level credit)
    ela20: false,    // ELA 20-1
    chem20: false,   // Chemistry 20 / Chem 30-AP
    phys20: false,   // Physics 20 / Phys 30-AP
    subj5_20: false  // Approved 5th Subject
};

/**
 * Metadata map detailing course level, weightings, and AP multipliers
 */
const courseConfig = {
    math30_1: {
        name: 'Math 30-1 / Math 30-AP',
        isSenior30Level: true, // Direct Grade 12 Credit
        weight: 1.30,          // Critical prerequisite weight for STEM/Science streams
        apMultiplier: 1.050,   // Superior 5.0% rigor boost for completed 30-AP course
        targetCutoffBonus: 2.0 // Reduces competitive target cutoff by 2.0%
    },
    ela20: {
        name: 'ELA 20-1',
        isSenior30Level: false,
        weight: 1.00,
        apMultiplier: 1.035,   // Standard 3.5% rigor boost for 20-level AP
        targetCutoffBonus: 0.8
    },
    chem20: {
        name: 'Chemistry 20',
        isSenior30Level: false,
        weight: 1.15,
        apMultiplier: 1.035,
        targetCutoffBonus: 0.8
    },
    phys20: {
        name: 'Physics 20',
        isSenior30Level: false,
        weight: 1.15,
        apMultiplier: 1.035,
        targetCutoffBonus: 0.8
    },
    subj5_20: {
        name: '5th Academic Prerequisite',
        isSenior30Level: false,
        weight: 1.00,
        apMultiplier: 1.035,
        targetCutoffBonus: 0.8
    }
};

/**
 * Toggle AP status for a subject and trigger re-calculation
 * @param {string} subjectKey 
 */
function toggleAP(subjectKey) {
    apState[subjectKey] = !apState[subjectKey];
    const btn = document.getElementById(`btn-${subjectKey}`);
    
    if (apState[subjectKey]) {
        btn.classList.add('is-ap');
        btn.setAttribute('aria-pressed', 'true');
        btn.textContent = 'AP Course';
    } else {
        btn.classList.remove('is-ap');
        btn.setAttribute('aria-pressed', 'false');
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
 * Calculates AP converted mark if applicable.
 * Canadian institutions convert official AP scores (4 or 5) into boosted percentage equivalencies.
 * @param {number} rawMark 
 * @param {boolean} isAP 
 * @param {number} multiplier 
 * @returns {number}
 */
function applyAPConversion(rawMark, isAP, multiplier) {
    if (!isAP) return rawMark;
    
    // Calculate school percentage with AP rigor multiplier
    let boostedMark = rawMark * multiplier;

    // Simulated College Board AP Scale Overlay:
    // High raw school marks in AP courses (>88%) typically correlate to a 5 on AP Exams (96-100% conversion)
    // Marks between 78-87% correlate to a 4 on AP Exams (86-92% conversion)
    let apConversionScale = rawMark;
    if (rawMark >= 88) {
        apConversionScale = Math.max(boostedMark, 96.0);
    } else if (rawMark >= 78) {
        apConversionScale = Math.max(boostedMark, 88.0);
    } else {
        apConversionScale = boostedMark;
    }

    // Universities take the HIGHER of the school mark vs AP conversion scale
    return Math.min(100.0, Math.max(boostedMark, apConversionScale));
}

/**
 * Main Calculation Engine
 * Evaluates 30-level fast-tracked credits, 20-level prerequisites, and AP rigor
 */
function calculateAdmissions() {
    const rawGrades = {
        math30_1: parseFloat(document.getElementById('grade-math30_1').value) || 0,
        ela20: parseFloat(document.getElementById('grade-ela20').value) || 0,
        chem20: parseFloat(document.getElementById('grade-chem20').value) || 0,
        phys20: parseFloat(document.getElementById('grade-phys20').value) || 0,
        subj5_20: parseFloat(document.getElementById('grade-subj5_20').value) || 0
    };

    const subjects = Object.keys(rawGrades);
    
    // Admission Gatekeeper Threshold Rules
    const earlyMinSubjectThreshold = 60.0; // Minimum grade required per subject
    const minFacultyEligibilityAverage = 70.0; // Hard cutoff for faculty admission consideration

    // 1. HARD KNOCKOUT EVALUATION
    for (let key of subjects) {
        if (rawGrades[key] < earlyMinSubjectThreshold) {
            renderResults({
                chance: 0.0,
                unweightedAvg: calculateUnweightedAvg(rawGrades),
                weightedAvg: 0.0,
                apCount: countActiveAP(),
                seniorCount: countSeniorCredits(),
                statusClass: 'status-rejected',
                statusText: 'REJECTED',
                reason: `Knockout Rule: Grade in ${courseConfig[key].name} (${rawGrades[key]}%) is below the early admission minimum prerequisite requirement of ${earlyMinSubjectThreshold}%.`
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
            seniorCount: countSeniorCredits(),
            statusClass: 'status-rejected',
            statusText: 'REJECTED',
            reason: `Overall 5-subject unweighted average (${unweightedAvg.toFixed(1)}%) is below the minimum faculty eligibility threshold of 70.0%.`
        });
        return;
    }

    // 2. AP EVALUATION & COURSE RIGOR WEIGHTING
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let apCourseCount = 0;
    let totalTargetCutoffBonus = 0;

    for (let key of subjects) {
        const config = courseConfig[key];
        const isAP = apState[key];
        
        // Evaluate AP mark with dual-conversion scaling
        const effectiveMark = applyAPConversion(rawGrades[key], isAP, config.apMultiplier);

        if (isAP) {
            apCourseCount++;
            totalTargetCutoffBonus += config.targetCutoffBonus;
        }

        totalWeightedScore += effectiveMark * config.weight;
        totalWeight += config.weight;
    }

    const weightedAvg = totalWeightedScore / totalWeight;

    // 3. MULTI-FACTOR SIGMOID ADMISSION PROBABILITY CURVE
    // Base Competitive Early Admission Target Cutoff: ~88.5%
    // Having completed Math 30-1 / Math 30-AP early provides an additional systemic boost (-1.5% baseline reduction)
    let baselineTargetCutoff = 88.5;
    
    // Fast-tracked 30-level credit advantage
    const completedSeniorCredits = countSeniorCredits();
    if (completedSeniorCredits > 0) {
        baselineTargetCutoff -= 1.5; // Locked 30-level mark reduces admission volatility
    }

    // Apply cumulative AP course bonuses
    const finalTargetCutoff = baselineTargetCutoff - totalTargetCutoffBonus;

    // Logistic Curve Coefficients
    const k = 0.40; // Curve steepness coefficient

    let rawProb = 1 / (1 + Math.exp(-k * (weightedAvg - finalTargetCutoff)));
    let percentage = rawProb * 100;

    // Boundary constraints
    if (weightedAvg >= 94.0) percentage = Math.max(percentage, 99.0);
    if (weightedAvg < 80.0) percentage = Math.min(percentage, 1.0);

    // Classification Categories & Explanatory Feedback
    let statusClass = 'status-risk';
    let statusText = 'HIGH RISK / WAITLIST';
    let reason = 'Your evaluation average sits below recent early admission cutoffs. You will likely need to wait for Grade 12 second-semester transcript updates.';

    if (percentage >= 80) {
        statusClass = 'status-strong';
        statusText = 'STRONG CANDIDATE';
        reason = `Outstanding profile! Having a completed Grade 12 credit (${courseConfig.math30_1.name}) combined with high AP rigor gives you a top-tier probability for an early conditional offer.`;
    } else if (percentage >= 45) {
        statusClass = 'status-competitive';
        statusText = 'COMPETITIVE';
        reason = 'Your marks place you squarely within the competitive pool. Conditional offers may arrive in secondary early waves as faculty seats open.';
    }

    renderResults({
        chance: percentage,
        unweightedAvg: unweightedAvg,
        weightedAvg: weightedAvg,
        apCount: apCourseCount,
        seniorCount: completedSeniorCredits,
        statusClass: statusClass,
        statusText: statusText,
        reason: reason
    });
}

/**
 * Calculates unweighted arithmetic mean across all 5 subjects
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
 * Counts completed Grade 12 (30-level) credits
 */
function countSeniorCredits() {
    // Math 30-1 / Math 30-AP is completed in Grade 11
    return 1;
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
    document.getElementById('seniorCreditDisplay').textContent = `${data.seniorCount} Locked (30-Level)`;

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
    const seniorCredit = document.getElementById('seniorCreditDisplay').textContent;
    const reason = document.getElementById('reasonDisplay').textContent;

    const summaryText = `--- Grade 11 Early Admission & Fast-Track 30-AP Evaluation ---\n` +
        `Status: ${status} (${chance})\n` +
        `Unweighted 5-Subject Average: ${unweighted}\n` +
        `AP-Weighted Rigor Average: ${weighted}\n` +
        `Active AP Modules: ${apCount}\n` +
        `Grade 12 (30-Level) Credits Completed: ${seniorCredit}\n` +
        `Assessment Summary: ${reason}`;

    navigator.clipboard.writeText(summaryText).then(() => {
        alert('Evaluation summary copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Initial calculation on page load
window.addEventListener('DOMContentLoaded', calculateAdmissions);
