// --- Global Variables ---
let currentPhrase = "Tap or Click to Roll (uses API)";
let usedWords = new Set();
let currentFontSize = 60;
let isLoading = false;
let showDebugShapes = false; // Keep debug shapes off

// --- p5.js Setup Function ---
function setup() {
    createCanvas(windowWidth, windowHeight);
    console.log(`[Setup] Canvas created: width=${windowWidth}, height=${windowHeight}`);
    colorMode(RGB);
    textAlign(CENTER, CENTER); // Critical for alignment
    console.log("[Setup] textAlign set to (CENTER, CENTER)");
    // Keep default font for now, consider changing for specific style
    textFont('Arial, Helvetica, sans-serif', currentFontSize);
    fill(255); // White text
    console.log("[Setup] Setup complete. Tap or Click.");
    calculateAdaptiveFontSize(currentPhrase);
}

// --- p5.js Draw Function ---
function draw() {
    background(0); // Black background
    textSize(currentFontSize);
    fill(255); // White text

    let displayPhrase = isLoading ? "ROLLING..." : currentPhrase; // Uppercase Rolling too

    let centerX = width / 2;
    let centerY = height / 2;

    // Simplified text call
    text(displayPhrase, centerX, centerY);
}

// --- Trigger Function ---
async function triggerPhraseGeneration() {
    if (isLoading) { console.log("[Trigger] Ignored: Already loading."); return; }
    isLoading = true;
    currentPhrase = "ROLLING..."; // Uppercase here too
    console.log("[Trigger] Set loading state TRUE");

    console.log("\n--- Trigger Received: Generating Phrase via API ---");
    try {
        currentPhrase = await generatePhrase(); // generatePhrase is async
        console.log(`[Trigger] Phrase generated: "${currentPhrase}"`);
    } catch (error) {
        console.error("[Trigger] Error generating phrase:", error);
        currentPhrase = "ERROR: COULD NOT GENERATE PHRASE"; // Uppercase error
    } finally {
        isLoading = false;
        console.log("[Trigger] Set loading state FALSE");
        calculateAdaptiveFontSize(currentPhrase);
        console.log("[Trigger] Adaptive font size recalculated.");
    }
}

// --- Event Handlers ---
function mousePressed() {
    console.log("[Event] Mouse Pressed");
    triggerPhraseGeneration();
}

function touchStarted() {
    console.log("[Event] Touch Started");
    triggerPhraseGeneration();
    return false; // Prevent default touch actions
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    console.log(`[Window Resized] New dimensions: width=${windowWidth}, height=${windowHeight}`);
    calculateAdaptiveFontSize(currentPhrase);
}


// --- Helper: Fetch Word from Datamuse API ---
// (Remains the same)
async function fetchWordFromAPI(length, typeHint = 'any') {
    if (length < 1 || length > 15) { console.log(`Invalid length requested: ${length}`); return null; }
    console.log(`  Fetching API: length=${length}, hint=${typeHint}`);
    const spellingPattern = '?'.repeat(length);
    const apiUrl = `https://api.datamuse.com/words?sp=${spellingPattern}&max=100&md=p`;
    // console.log(`    API URL: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        const data = await response.json();
        // console.log(`    API returned ${data.length} potential words.`);
        const candidates = data.filter(item => {
            const word = item.word;
            if (word.length !== length) return false;
            if (!/^[a-z]+$/i.test(word)) return false;
            if (usedWords.has(word.toLowerCase())) return false;
            if (typeHint === 'noun') return item.tags && item.tags.includes('n');
            return true;
        });
        // console.log(`    Found ${candidates.length} valid, unused candidates matching criteria.`);
        if (candidates.length > 0) {
            const chosenItem = random(candidates);
            console.log(`    Chose API word: '${chosenItem.word}' (Tags: ${chosenItem.tags?.join(', ') || 'N/A'})`);
            return chosenItem.word.toLowerCase();
        } else {
            console.log(`    No suitable candidates found after filtering.`);
            return null;
        }
    } catch (error) {
        console.error(`    Error fetching or processing API data: ${error}`);
        return null;
    }
}


// --- Helper: Generate Phrase using API ---
async function generatePhrase() {
    let d1 = floor(random(1, 7)), d2 = floor(random(1, 7));
    console.log(`Rolled: D1=${d1}, D2=${d2}`);
    let word1_base = null, word2_base = null;
    let word1_display = null, word2_display = null;

    // --- Rule for Word 1 ---
    console.log("Attempting to find Word 1...");
    if (d1 === 1) {
        // Special characters/digits for D1=1
        let specials = ['A', 'I', 'O', '!', '?', '2', '3', '4']; // Use uppercase A, I, O directly
        word1_base = random(specials);
        console.log(`  D1=1, chose special character: '${word1_base}'`);
        word1_display = word1_base; // Use directly (already uppercase or symbol/digit)
    } else {
        // Fetch word of length d1 from API
        word1_base = await fetchWordFromAPI(d1, 'any');
        if (word1_base) {
            word1_display = word1_base; // Keep as base for now, will uppercase later
        } else {
            console.log("  Failed to fetch suitable Word 1 from API.");
            return `RE-ROLL (API FAIL WORD 1 LEN=${d1})`; // Uppercase error
        }
    }

    // --- Rule for Word 2 ---
    console.log("Attempting to find Word 2 (prefer noun)...");
    // Fetch word of length d2, hinting for noun
    word2_base = await fetchWordFromAPI(d2, 'noun');
    if (!word2_base) {
        console.log("  Could not fetch Noun for D2. Falling back to ANY word type...");
        word2_base = await fetchWordFromAPI(d2, 'any'); // Fallback fetch
    }

    if (!word2_base) {
        console.log("  Failed to fetch suitable Word 2 (any type) from API.");
        let word1_info = word1_base ? `'${word1_base}'` : `(Special D1=${d1})`;
        // Uppercase error
        return `RE-ROLL (GOT WORD 1: ${word1_info}, API FAIL WORD 2 LEN=${d2})`;
    }
    // Word 2 display is just the base form now
    word2_display = word2_base;

    // --- NO PLURALIZATION BLOCK ---

    // --- Final Phrase Construction ---
    // Combine and convert the whole phrase to uppercase
    let finalPhrase = `${word1_display} ${word2_display}`.toUpperCase();
    console.log(`Constructed phrase: '${finalPhrase}'`);

    // --- Update Global Used Words ---
    // Add BASE forms only
    if (word1_base && typeof word1_base === 'string' && /^[a-z]+$/i.test(word1_base)) {
        console.log(`  Adding Word 1 base '${word1_base}' to used set.`);
        usedWords.add(word1_base);
    }
    if (word2_base) {
         console.log(`  Adding Word 2 base '${word2_base}' to used set.`);
        usedWords.add(word2_base);
    }
    console.log(`Used words count: ${usedWords.size}`);

    return finalPhrase;
}


// --- Helper Function: Adaptive Font Size ---
// (Remains the same)
function calculateAdaptiveFontSize(text) {
    if (!text || text.length === 0) { console.log("[FontCalc] No text to calculate size for."); return; }
    let currentText = String(text);
    // console.log(`[FontCalc] Calculating for text: "${currentText}"`);
    let testFontSize = height * 0.7;
    let margin = width * 0.1;
    let availableWidth = width - margin;
    let availableHeight = height * 0.8;
    // console.log(`[FontCalc] Initial check: MaxW=${availableWidth.toFixed(1)}, MaxH=${availableHeight.toFixed(1)}, StartSize=${testFontSize.toFixed(1)}`);
    textSize(testFontSize);
    let currentTextWidth = textWidth(currentText);
    // console.log(`[FontCalc] Initial text width at ${testFontSize.toFixed(1)}px: ${currentTextWidth.toFixed(1)}px`);
    while (currentTextWidth > availableWidth && testFontSize > 10) {
        testFontSize -= 2;
        textSize(testFontSize);
        currentTextWidth = textWidth(currentText);
    }
    let currentTextHeight = textAscent() + textDescent();
    while (currentTextHeight > availableHeight && testFontSize > 10) {
         testFontSize -= 2;
         textSize(testFontSize);
         currentTextHeight = textAscent() + textDescent();
    }
    currentFontSize = max(10, testFontSize);
    console.log(`[FontCalc] Final adaptive font size: ${currentFontSize.toFixed(1)}px`);
}
