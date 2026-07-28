/* ==========================================================================
   Grade 11 Early Admission & Fast-Tracked 30-AP Engine (app.js) - FIXED
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
        isSenior30Level: true, 
        weight: 1.30,          
        apMultiplier: 1.050,   
        targetCutoffBonus: 2.0 
    },
    ela20: {
        name: 'ELA 20-1',
        isSenior30Level: false,
        weight: 1.00,
        apMultiplier: 1.035,   
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
 */
function toggleAP(subjectKey) {
    apState[subjectKey] = !apState[subjectKey];
    const btn = document.getElementById(`btn-${subjectKey}`);
    
    if (btn) {
        if (apState[subjectKey]) {
            btn.classList.add('is-ap');
            btn.setAttribute('aria-pressed', 'true');
            btn.textContent = 'AP Course';
        } else {
            btn.classList.remove('is-ap');
            btn.setAttribute('aria-pressed', 'false');
            btn.textContent = 'Standard (-1)';
        }
    }

    calculateAdmissions();
}

/**
 * Sync number input when slider moves
 */
function syncFromSlider(subjectKey) {
    const slider = document.getElementById(`slider-${subjectKey}`);
    const input = document.getElementById(`grade-${subjectKey}`);
    if (slider && input) {
        input.value = slider.value;
    }
    calculateAdmissions();
}

/**
 * Sync slider position when number input changes
 */
function syncFromInput(subjectKey) {
    const input = document.getElementById(`grade-${subjectKey}`);
    const slider = document.getElementById(`slider-${subjectKey}`);
    
    if (input && slider) {
        let inputVal = parseFloat(input.value);
        if (isNaN(inputVal)) inputVal = 0;
        
        if (inputVal > 100) inputVal = 100;
        if (inputVal < 0) inputVal = 0;
        
        slider.value = inputVal;
    }
    calculateAdmissions();
}

/**
 * Helper to safely extract number values from DOM inputs
 */
function getInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const val = parseFloat(el.value);
    return isNaN(val) ? 0 : val;
}

/**
 * Calculates AP converted mark if applicable.
 */
function applyAPConversion(rawMark, isAP, multiplier) {
    if (!isAP) return rawMark;
    
    let boostedMark = rawMark * multiplier;
    let apConversionScale = rawMark;

    if (rawMark >= 88) {
        apConversionScale = Math.max(boostedMark, 96.0);
    } else if (rawMark >= 78) {
        apConversionScale = Math.max(boostedMark, 88.0);
    } else {
        apConversionScale = boostedMark;
    }

    return Math.min(100.0, Math.max(boostedMark, apConversionScale));
}

/**
 * Main Calculation Engine
 */
function calculateAdmissions() {
    // Safely retrieve input values to avoid null/NaN crashes
    const rawGrades = {
        math30_1: getInputValue('grade-math30_1'),
        ela20: getInputValue('grade-ela20'),
        chem20: getInputValue('grade-chem20'),
        phys20: getInputValue('grade-phys20'),
        subj5_20: getInputValue('grade-subj5_20')
    };

    const subjects = Object.keys(rawGrades);
    const earlyMinSubjectThreshold = 60.0; 
    const minFacultyEligibilityAverage = 70.0; 

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
    let baselineTargetCutoff = 88.5;
    
    const completedSeniorCredits = countSeniorCredits();
    if (completedSeniorCredits > 0) {
        baselineTargetCutoff -= 1.5; 
    }

    const finalTargetCutoff = baselineTargetCutoff - totalTargetCutoffBonus;
    const k = 0.40; 

    let rawProb = 1 / (1 + Math.exp(-k * (weightedAvg - finalTargetCutoff)));
    let percentage = rawProb * 100;

    if (weightedAvg >= 94.0) percentage = Math.max(percentage, 99.0);
    if (weightedAvg < 80.0) percentage = Math.min(percentage, 1.0);

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

function calculateUnweightedAvg(grades) {
    const vals = Object.values(grades);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function countActiveAP() {
    return Object.values(apState).filter(Boolean).length;
}

function countSeniorCredits() {
    return 1;
}

function renderResults(data) {
    const chanceDisplay = document.getElementById('chanceDisplay');
    const statusText = document.getElementById('statusText');
    const reasonDisplay = document.getElementById('reasonDisplay');

    if (chanceDisplay) {
        chanceDisplay.textContent = `${data.chance.toFixed(1)}%`;
        chanceDisplay.className = `chance-badge ${data.statusClass}`;
    }

    if (statusText) {
        statusText.textContent = data.statusText;
        statusText.className = `status-title ${data.statusClass}`;
    }

    const unweightedEl = document.getElementById('unweightedAvgDisplay');
    if (unweightedEl) unweightedEl.textContent = `${data.unweightedAvg.toFixed(1)}%`;

    const weightedEl = document.getElementById('weightedAvgDisplay');
    if (weightedEl) weightedEl.textContent = `${data.weightedAvg.toFixed(1)}%`;

    const apCountEl = document.getElementById('apCountDisplay');
    if (apCountEl) apCountEl.textContent = `${data.apCount} / 5`;

    const seniorCreditEl = document.getElementById('seniorCreditDisplay');
    if (seniorCreditEl) seniorCreditEl.textContent = `${data.seniorCount} Locked (30-Level)`;

    if (reasonDisplay) {
        reasonDisplay.textContent = data.reason;
        if (data.statusClass === 'status-rejected') {
            reasonDisplay.classList.add('is-rejected');
        } else {
            reasonDisplay.classList.remove('is-rejected');
        }
    }
}

function copyResultsSummary() {
    const status = document.getElementById('statusText')?.textContent || '';
    const chance = document.getElementById('chanceDisplay')?.textContent || '';
    const unweighted = document.getElementById('unweightedAvgDisplay')?.textContent || '';
    const weighted = document.getElementById('weightedAvgDisplay')?.textContent || '';
    const apCount = document.getElementById('apCountDisplay')?.textContent || '';
    const seniorCredit = document.getElementById('seniorCreditDisplay')?.textContent || '';
    const reason = document.getElementById('reasonDisplay')?.textContent || '';

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

// Guaranteed DOM Ready Initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', calculateAdmissions);
} else {
    calculateAdmissions();
}
