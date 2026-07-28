/* ==========================================================================
   Alberta Early Admission & Fast-Tracked AP Evaluation Engine (app.js)
   Part 1 of 2: Data Models, Config Matrices & Primary Calculation Logic
   ========================================================================== */

/**
 * Global State Object
 * Stores course grades, AP toggles, target institution, and selected stream
 */
const engineState = {
    targetUniversity: 'UofA', // 'UofA' (5-Subject Model) or 'UofC' (4-Subject Model)
    facultyStream: 'engineering', // 'engineering', 'sciences', 'business', 'arts'
    apState: {
        math30_1: false, // Fast-tracked Grade 12 Math
        ela20: false,    // Grade 11 ELA
        chem20: false,   // Grade 11 Chemistry
        phys20: false,   // Grade 11 Physics
        subj5_20: false  // 5th Academic Prerequisite
    }
};

/**
 * Institution & Faculty Configuration Matrix
 * Defines admission evaluation rules, required subject counts, and stream multipliers
 */
const institutionConfig = {
    UofA: {
        name: 'University of Alberta',
        subjectCount: 5,
        usesFacultyWeights: true,
        baselineCutoffs: {
            engineering: 88.0,
            sciences: 87.0,
            business: 82.0,
            arts: 78.0
        }
    },
    UofC: {
        name: 'University of Calgary',
        subjectCount: 4, // U of C evaluates top 4 approved subjects for early admission
        usesFacultyWeights: false,
        baselineCutoffs: {
            engineering: 89.0,
            sciences: 86.0,
            business: 83.0,
            arts: 76.0
        }
    }
};

/**
 * Comprehensive Course Metadata Matrix
 * Details subject roles, core requirements per faculty, and AP scaling curves
 */
const courseConfig = {
    math30_1: {
        name: 'Math 30-1 / Math 30-AP',
        isSenior30Level: true,
        weights: {
            engineering: 1.35,
            sciences: 1.25,
            business: 1.20,
            arts: 0.90
        },
        isRequiredForStream: {
            engineering: true,
            sciences: true,
            business: true,
            arts: false
        },
        apMultiplier: 1.050,
        targetCutoffBonus: 2.0
    },
    ela20: {
        name: 'ELA 20-1',
        isSenior30Level: false,
        weights: {
            engineering: 1.00,
            sciences: 1.00,
            business: 1.15,
            arts: 1.35
        },
        isRequiredForStream: {
            engineering: true,
            sciences: true,
            business: true,
            arts: true
        },
        apMultiplier: 1.035,
        targetCutoffBonus: 0.8
    },
    chem20: {
        name: 'Chemistry 20',
        isSenior30Level: false,
        weights: {
            engineering: 1.25,
            sciences: 1.20,
            business: 0.80,
            arts: 0.70
        },
        isRequiredForStream: {
            engineering: true,
            sciences: false, // Core for Bio/Chem majors, but not all science streams
            business: false,
            arts: false
        },
        apMultiplier: 1.035,
        targetCutoffBonus: 0.8
    },
    phys20: {
        name: 'Physics 20',
        isSenior30Level: false,
        weights: {
            engineering: 1.30,
            sciences: 1.15,
            business: 0.80,
            arts: 0.70
        },
        isRequiredForStream: {
            engineering: true,
            sciences: false,
            business: false,
            arts: false
        },
        apMultiplier: 1.035,
        targetCutoffBonus: 0.8
    },
    subj5_20: {
        name: '5th Academic Prerequisite',
        isSenior30Level: false,
        weights: {
            engineering: 0.90,
            sciences: 1.00,
            business: 1.00,
            arts: 1.10
        },
        isRequiredForStream: {
            engineering: false,
            sciences: false,
            business: false,
            arts: false
        },
        apMultiplier: 1.035,
        targetCutoffBonus: 0.8
    }
};

/**
 * Utility to extract valid numerical inputs with bounds clamping (0 - 100)
 * @param {string} id 
 * @returns {number}
 */
function getSanitizedInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    let val = parseFloat(el.value);
    if (isNaN(val)) return 0;
    if (val > 100) val = 100;
    if (val < 0) val = 0;
    return val;
}

/**
 * Simulates College Board AP Conversion Overlay used by Canadian Universities
 * Converts high raw school marks or official AP scale estimates into converted percentage equivalents.
 * @param {number} rawMark 
 * @param {boolean} isAP 
 * @param {number} multiplier 
 * @returns {number}
 */
function applyAPConversion(rawMark, isAP, multiplier) {
    if (!isAP) return rawMark;

    const boostedMark = rawMark * multiplier;
    let apConversionScale = rawMark;

    // Official AP Grade Scale Conversion Mapping (Simulated College Board 4/5 overlay)
    if (rawMark >= 88.0) {
        apConversionScale = Math.max(boostedMark, 96.0); // Equivalent to AP Score 5
    } else if (rawMark >= 78.0) {
        apConversionScale = Math.max(boostedMark, 88.0); // Equivalent to AP Score 4
    } else if (rawMark >= 68.0) {
        apConversionScale = Math.max(boostedMark, 80.0); // Equivalent to AP Score 3
    } else {
        apConversionScale = boostedMark;
    }

    return Math.min(100.0, Math.max(boostedMark, apConversionScale));
}

/**
 * Dual-Pathway Assessment for Fast-Tracked 30-Level Credits
 * Solves the bug where a low 30-level mark unfairly penalizes a Grade 11 student.
 * If Math 30-1 is below the student's 20-level baseline average, the admissions algorithm
 * flags a "Discrepancy" and applies a fallback buffer for early wave consideration.
 * @param {number} raw30Mark 
 * @param {number} baseline20Average 
 * @returns {Object}
 */
function evaluateFastTrackCredit(raw30Mark, baseline20Average) {
    const isDiscrepancy = raw30Mark < (baseline20Average - 12.0);
    
    let adjustedEarlyMark = raw30Mark;
    let statusNote = 'Locked Grade 12 Transcript Credit';

    if (isDiscrepancy) {
        // Universities will request mid-term updates or evaluate using a projected floor buffer
        adjustedEarlyMark = Math.max(raw30Mark, baseline20Average - 8.0);
        statusNote = 'Discrepancy Warning: Low 30-level mark buffered against strong 20-level baseline for early round evaluation.';
    }

    return {
        effectiveMark: adjustedEarlyMark,
        isDiscrepancy: isDiscrepancy,
        note: statusNote
    };
}

/**
 * Calculates raw unweighted arithmetic mean
 * Handles both 5-subject (U of A) and 4-subject top average (U of C) modes
 * @param {Object} gradesMap 
 * @param {number} requiredSubjectCount 
 * @returns {number}
 */
function calculateUnweightedAverage(gradesMap, requiredSubjectCount) {
    const gradeValues = Object.values(gradesMap);
    
    if (requiredSubjectCount === 4) {
        // Keep core ELA 20-1 mandatory, take top 3 remaining highest marks
        const elaGrade = gradesMap.ela20;
        const remainingGrades = [gradesMap.math30_1, gradesMap.chem20, gradesMap.phys20, gradesMap.subj5_20];
        
        remainingGrades.sort((a, b) => b - a); // Sort descending
        const top3Remaining = remainingGrades.slice(0, 3);
        
        const sumTop4 = elaGrade + top3Remaining.reduce((sum, val) => sum + val, 0);
        return sumTop4 / 4.0;
    }

    // Default 5-subject average
    const sumAll = gradeValues.reduce((sum, val) => sum + val, 0);
    return sumAll / 5.0;
}

/**
 * Calculates stream-weighted competitive average
 * Applies faculty-specific weights based on program prerequisites
 * @param {Object} effectiveGradesMap 
 * @param {string} stream 
 * @returns {number}
 */
function calculateWeightedAverage(effectiveGradesMap, stream) {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    const keys = Object.keys(effectiveGradesMap);

    for (let key of keys) {
        const mark = effectiveGradesMap[key];
        const weight = courseConfig[key].weights[stream];

        totalWeightedScore += mark * weight;
        totalWeight += weight;
    }

    return totalWeightedScore / totalWeight;
}
/* ==========================================================================
   Alberta Early Admission & Fast-Tracked AP Evaluation Engine (app.js)
   Part 2 of 2: Main Calculation Engine, Warning System & Render Handlers
   ========================================================================== */

/**
 * Evaluates individual prerequisite warnings based on faculty stream
 * @param {Object} rawGrades 
 * @param {string} stream 
 * @returns {Array<string>} List of warning messages
 */
function analyzePrerequisiteWarnings(rawGrades, stream) {
    const warnings = [];
    const keys = Object.keys(rawGrades);

    for (let key of keys) {
        const grade = rawGrades[key];
        const config = courseConfig[key];
        const isRequired = config.isRequiredForStream[stream];

        if (isRequired && grade < 65.0) {
            warnings.push(`Prerequisite Risk: ${config.name} (${grade}%) is below the recommended 65% competitive baseline for ${stream.toUpperCase()}.`);
        } else if (!isRequired && grade < 50.0) {
            warnings.push(`Passing Credit Risk: ${config.name} (${grade}%) is below the minimum passing threshold (50%).`);
        }
    }

    return warnings;
}

/**
 * Main Evaluation Calculation Engine
 * Orchestrates multi-factor calculations, AP boosts, target cutoffs, and probability curves.
 */
function calculateAdmissions() {
    const rawGrades = {
        math30_1: getSanitizedInputValue('grade-math30_1'),
        ela20: getSanitizedInputValue('grade-ela20'),
        chem20: getSanitizedInputValue('grade-chem20'),
        phys20: getSanitizedInputValue('grade-phys20'),
        subj5_20: getSanitizedInputValue('grade-subj5_20')
    };

    const stream = engineState.facultyStream;
    const uniKey = engineState.targetUniversity;
    const university = institutionConfig[uniKey];

    // 1. HARD KNOCKOUT EVALUATION (Strict failing mark < 50%)
    for (let key of Object.keys(rawGrades)) {
        if (rawGrades[key] < 50.0) {
            renderResults({
                chance: 0.0,
                unweightedAvg: calculateUnweightedAverage(rawGrades, university.subjectCount),
                weightedAvg: 0.0,
                apCount: countActiveAP(),
                seniorCount: 1,
                statusClass: 'status-rejected',
                statusText: 'INELIGIBLE / REJECTED',
                reason: `Hard Knockout: ${courseConfig[key].name} grade (${rawGrades[key]}%) is below the minimum 50% passing prerequisite threshold required for post-secondary credit.`,
                warnings: [`Failed Prerequisite: ${courseConfig[key].name}`]
            });
            return;
        }
    }

    // 2. DUAL-PATHWAY ASSESSMENT (Math 30-1 Safeguard against low fast-track mark)
    const baseline20Avg = (rawGrades.ela20 + rawGrades.chem20 + rawGrades.phys20 + rawGrades.subj5_20) / 4.0;
    const mathAssessment = evaluateFastTrackCredit(rawGrades.math30_1, baseline20Avg);

    // Build Effective Converted Marks map (applying AP scale boosts)
    const effectiveGrades = {};
    let activeAPCount = 0;
    let totalTargetBonus = 0;

    for (let key of Object.keys(rawGrades)) {
        let baseMark = (key === 'math30_1') ? mathAssessment.effectiveMark : rawGrades[key];
        const isAP = engineState.apState[key];
        const config = courseConfig[key];

        if (isAP) {
            activeAPCount++;
            totalTargetBonus += config.targetCutoffBonus;
        }

        effectiveGrades[key] = applyAPConversion(baseMark, isAP, config.apMultiplier);
    }

    // 3. AVERAGING CALCULATIONS
    const unweightedAvg = calculateUnweightedAverage(rawGrades, university.subjectCount);
    const weightedAvg = calculateWeightedAverage(effectiveGrades, stream);

    // 4. PREREQUISITE WARNING ANALYSIS
    const warnings = analyzePrerequisiteWarnings(rawGrades, stream);

    if (mathAssessment.isDiscrepancy) {
        warnings.push(mathAssessment.note);
    }

    // Minimum Faculty Average Knockout check (< 70%)
    if (unweightedAvg < 70.0) {
        renderResults({
            chance: 0.0,
            unweightedAvg: unweightedAvg,
            weightedAvg: weightedAvg,
            apCount: activeAPCount,
            seniorCount: 1,
            statusClass: 'status-rejected',
            statusText: 'BELOW FACULTY BASELINE',
            reason: `Your ${university.subjectCount}-subject average (${unweightedAvg.toFixed(1)}%) is below the minimum standard faculty eligibility threshold of 70.0% for ${university.name}.`,
            warnings: warnings
        });
        return;
    }

    // 5. SIGMOID ADMISSION PROBABILITY CURVE
    const baseCutoff = university.baselineCutoffs[stream];
    const fastTrackSeniorBonus = 1.5; // Dedicated boost for completed Grade 12 credit
    const finalCutoff = baseCutoff - fastTrackSeniorBonus - totalTargetBonus;

    const kFactor = 0.38; // Sigmoid slope factor
    const rawProb = 1 / (1 + Math.exp(-kFactor * (weightedAvg - finalCutoff)));
    let percentage = rawProb * 100;

    // Hard ceiling / floor clamps
    if (weightedAvg >= (baseCutoff + 5.0)) percentage = Math.max(percentage, 98.5);
    if (weightedAvg < (baseCutoff - 8.0)) percentage = Math.min(percentage, 2.0);

    // 6. STATUS TIER ASSIGNMENT
    let statusClass = 'status-risk';
    let statusText = 'HIGH RISK / WAITLIST';
    let summaryReason = `Your weighted average (${weightedAvg.toFixed(1)}%) sits below the projected competitive cutoff (${finalCutoff.toFixed(1)}%) for ${stream.toUpperCase()} at ${university.name}. Early conditional offer probability is low.`;

    if (percentage >= 80.0) {
        statusClass = 'status-strong';
        statusText = 'STRONG CANDIDATE';
        summaryReason = `Excellent profile! Your weighted average (${weightedAvg.toFixed(1)}%) exceeds the projected early offer cutoff (${finalCutoff.toFixed(1)}%) for ${stream.toUpperCase()} at ${university.name}. You are well-positioned for an early conditional offer.`;
    } else if (percentage >= 45.0) {
        statusClass = 'status-competitive';
        statusText = 'COMPETITIVE / SECONDARY WAVE';
        summaryReason = `Your profile is competitive! You fall directly inside the decision threshold band for ${stream.toUpperCase()}. Offers are likely during secondary conditional review rounds as seats open.`;
    }

    renderResults({
        chance: percentage,
        unweightedAvg: unweightedAvg,
        weightedAvg: weightedAvg,
        apCount: activeAPCount,
        seniorCount: 1,
        statusClass: statusClass,
        statusText: statusText,
        reason: summaryReason,
        warnings: warnings
    });
}

function countActiveAP() {
    return Object.values(engineState.apState).filter(Boolean).length;
}

/**
 * Dynamically updates UI DOM elements with evaluated data
 * @param {Object} data 
 */
function renderResults(data) {
    const chanceDisplay = document.getElementById('chanceDisplay');
    const statusText = document.getElementById('statusText');
    const reasonDisplay = document.getElementById('reasonDisplay');
    const warningsBox = document.getElementById('warningsBox');

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
    if (apCountEl) apCountEl.textContent = `${data.apCount} / 5 Active`;

    const seniorCreditEl = document.getElementById('seniorCreditDisplay');
    if (seniorCreditEl) seniorCreditEl.textContent = `${data.seniorCount} Locked (30-Level)`;

    if (reasonDisplay) {
        reasonDisplay.textContent = data.reason;
    }

    // Dynamic Warning Box Rendering
    if (warningsBox) {
        if (data.warnings && data.warnings.length > 0) {
            warningsBox.style.display = 'block';
            warningsBox.innerHTML = '<strong>Evaluation Flags & Risk Factors:</strong><ul>' +
                data.warnings.map(w => `<li>${w}</li>`).join('') +
                '</ul>';
        } else {
            warningsBox.style.display = 'none';
            warningsBox.innerHTML = '';
        }
    }
}

/**
 * Export summary handler for clipboard
 */
function copyResultsSummary() {
    const status = document.getElementById('statusText')?.textContent || '';
    const chance = document.getElementById('chanceDisplay')?.textContent || '';
    const unweighted = document.getElementById('unweightedAvgDisplay')?.textContent || '';
    const weighted = document.getElementById('weightedAvgDisplay')?.textContent || '';
    const apCount = document.getElementById('apCountDisplay')?.textContent || '';
    const reason = document.getElementById('reasonDisplay')?.textContent || '';
    const uni = institutionConfig[engineState.targetUniversity].name;
    const stream = engineState.facultyStream.toUpperCase();

    const summaryText = `--- Alberta University Early Admission Predictor ---\n` +
        `Target Institution: ${uni}\n` +
        `Faculty Stream: ${stream}\n` +
        `Status: ${status} (${chance})\n` +
        `Unweighted Average: ${unweighted}\n` +
        `Stream-Weighted Average: ${weighted}\n` +
        `Active AP Modules: ${apCount}\n` +
        `Assessment Summary: ${reason}\n` +
        `Generated on: ${new Date().toLocaleDateString()}`;

    navigator.clipboard.writeText(summaryText).then(() => {
        alert('Detailed evaluation summary copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed: ', err);
    });
}

/**
 * Self-Initializing Event Listener Binding Engine
 */
document.addEventListener('DOMContentLoaded', function () {
    const keys = Object.keys(engineState.apState);

    // Bind subject sliders, inputs, and AP toggle buttons
    keys.forEach(function (key) {
        const btn = document.getElementById(`btn-${key}`);
        const slider = document.getElementById(`slider-${key}`);
        const input = document.getElementById(`grade-${key}`);

        if (btn) {
            btn.addEventListener('click', function () {
                engineState.apState[key] = !engineState.apState[key];
                if (engineState.apState[key]) {
                    btn.classList.add('is-ap');
                    btn.setAttribute('aria-pressed', 'true');
                    btn.textContent = 'AP Course';
                } else {
                    btn.classList.remove('is-ap');
                    btn.setAttribute('aria-pressed', 'false');
                    btn.textContent = 'Standard (-1)';
                }
                calculateAdmissions();
            });
        }

        if (slider && input) {
            slider.addEventListener('input', function () {
                input.value = slider.value;
                calculateAdmissions();
            });

            input.addEventListener('input', function () {
                let val = parseFloat(input.value);
                if (isNaN(val)) val = 0;
                if (val > 100) val = 100;
                if (val < 0) val = 0;
                slider.value = val;
                calculateAdmissions();
            });
        }
    });

    // Bind Dropdown Selectors (University & Faculty Stream)
    const uniSelect = document.getElementById('selectUniversity');
    if (uniSelect) {
        uniSelect.addEventListener('change', function () {
            engineState.targetUniversity = uniSelect.value;
            calculateAdmissions();
        });
    }

    const streamSelect = document.getElementById('selectStream');
    if (streamSelect) {
        streamSelect.addEventListener('change', function () {
            engineState.facultyStream = streamSelect.value;
            calculateAdmissions();
        });
    }

    // Bind Copy Button
    const copyBtn = document.getElementById('btnCopySummary');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyResultsSummary);
    }

    // Initial Trigger on Page Load
    calculateAdmissions();
});
