const canvas = document.getElementById("gameCanvas"), ctx = canvas.getContext("2d");
const soundGood = new Audio('correct.mp3');
const soundBad = new Audio('wrong.mp3');

const WIN_MILESTONE = 500;
const BASE_SPEED = 150;
const SPEED_STEP = 15;
const MIN_SPEED = 60;

let score = 0, lives = 3, correctAnswers = 0, gameState = "login", username = "";
let snake = [{ x: 200, y: 200 }], dx = 20, dy = 0, good = { x: 40, y: 40 }, bad = { x: 100, y: 100 };
let selectedIdx = 0, difficultyLevel = 0, currentSpeed = BASE_SPEED, nextMilestone = WIN_MILESTONE;
const particles = [], floatingTexts = [];

const scenarios = [
{
    q: "Phishing: An email says your gaming account will be deleted unless you click a link.",
    opts: ["Click the link immediately", "Visit the official website directly"],
    ans: 1,
    correctFeedback: "Correct! Phishing emails often use fake links to steal information.",
    wrongFeedback: "Incorrect. Clicking suspicious links can expose your account."
},
{
    q: "Password Security: Which password is strongest?",
    opts: ["password123", "G7!kP9#mX2@q"],
    ans: 1,
    correctFeedback: "Correct! Strong passwords use letters, numbers and symbols.",
    wrongFeedback: "Incorrect. Simple passwords are easy for hackers to guess."
},
{
    q: "Cyberbullying: Someone sends hurtful messages online.",
    opts: ["Report and Block", "Fight Back"],
    ans: 0,
    correctFeedback: "Correct! Reporting and blocking helps stop cyberbullying safely.",
    wrongFeedback: "Incorrect. Fighting back often makes situations worse."
},
{
    q: "Malware: A pop-up says your computer is infected.",
    opts: ["Close the pop-up", "Download the suggested software"],
    ans: 0,
    correctFeedback: "Correct! Fake malware alerts are common scams.",
    wrongFeedback: "Incorrect. Downloading unknown software may install malware."
},
{
    q: "Online Privacy: A photo reveals your school and address.",
    opts: ["Post it anyway", "Remove personal details first"],
    ans: 1,
    correctFeedback: "Correct! Protecting personal information keeps you safer online.",
    wrongFeedback: "Incorrect. Personal information should not be shared publicly."
},
{
    q: "Public Wi-Fi: You are connected to free café Wi-Fi.",
    opts: ["Access your bank account", "Browse general websites only"],
    ans: 1,
    correctFeedback: "Correct! Public Wi-Fi may not be secure for sensitive activities.",
    wrongFeedback: "Incorrect. Banking on public Wi-Fi can be risky."
},
{
    q: "Friend Request: A stranger claims to know you from school.",
    opts: ["Accept immediately", "Verify who they are first"],
    ans: 1,
    correctFeedback: "Correct! Always verify unknown contacts.",
    wrongFeedback: "Incorrect. Not everyone online is who they claim to be."
},
{
    q: "Safe Downloads: A site offers free game cheats.",
    opts: ["Download immediately", "Check if the source is trustworthy"],
    ans: 1,
    correctFeedback: "Correct! Malware is often hidden inside fake downloads.",
    wrongFeedback: "Incorrect. Untrusted downloads can infect your device."
},
{
    q: "Two-Factor Authentication: A website offers 2FA.",
    opts: ["Enable it", "Ignore it"],
    ans: 0,
    correctFeedback: "Correct! 2FA adds an extra layer of protection.",
    wrongFeedback: "Incorrect. 2FA greatly improves account security."
},
{
    q: "Social Media Safety: Someone asks for your home address online.",
    opts: ["Share it", "Keep it private"],
    ans: 1,
    correctFeedback: "Correct! Personal information should remain private.",
    wrongFeedback: "Incorrect. Sharing your address can put your safety at risk."
}
];

function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play blocked, interaction required."));
}

function startGame(isGuest) {
    if (isGuest) {
        username = "Guest";
    } else {
        const enteredName = prompt("Enter your username:");
        if (!enteredName || enteredName.trim() === "") {
            return;
        }
        username = enteredName.trim();
    }
    document.getElementById("user-display").innerText = username;
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("briefing-screen").style.display = "flex";
    document.getElementById("briefing-mission").innerText = `Agent ${username}, secure the terminal and reach ${WIN_MILESTONE} XP.`;
    // update all greeting placeholders in the briefing (covers duplicated crawl blocks)
    document.querySelectorAll('.greet').forEach(el => el.innerText = `Welcome, ${username}.`);
    gameState = "briefing";
}

function beginMission() {
    document.getElementById("briefing-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "flex";
    resetGame();
    gameState = "playing";
    updateHud();
    gameLoop();
}

function resetGame() {
    score = 0; lives = 3; correctAnswers = 0; difficultyLevel = 0;
    currentSpeed = BASE_SPEED; nextMilestone = WIN_MILESTONE;
    snake = [{ x: 200, y: 200 }]; dx = 20; dy = 0;
    good = randomCell(); bad = randomCell();
    particles.length = 0; floatingTexts.length = 0;
}

function randomCell() {
    return { x: Math.floor(Math.random() * 20) * 20, y: Math.floor(Math.random() * 20) * 20 };
}

function updateSelection() {
    const btns = document.querySelectorAll("#options-box .btn");
    btns.forEach((btn, i) => btn.className = (i === selectedIdx) ? "btn selected" : "btn");
}

function saveScore(name, scoreValue) {
    if (name === "Guest") return;
    let scores = JSON.parse(localStorage.getItem("leaderboard") || "[]");
    scores.push({ name, score: scoreValue });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem("leaderboard", JSON.stringify(scores.slice(0, 5)));
}

function handleAnswer(idx, correct) {
    if (correct) {
        correctAnswers++;
        if (correctAnswers >= 5) endGame(true, "Certified Cyber Rookie!");
        else { gameState = "playing"; document.getElementById("exam-screen").style.display = "none"; }
    } else {
        lives--;
        document.getElementById("lives-val").innerText = lives;
        if (lives <= 0) endGame(false, "System Compromised.");
        else { gameState = "playing"; document.getElementById("exam-screen").style.display = "none"; }
    }
}

// Global variable to store state for after the feedback is closed
let pendingResult = null; 

function triggerExam() {
    gameState = "exam"; selectedIdx = 0;
    let s = scenarios[Math.floor(Math.random() * scenarios.length)];
    document.getElementById("exam-screen").style.display = "flex";
    document.getElementById("question-box").innerText = s.q;
    
    document.getElementById("options-box").innerHTML = s.opts.map((o, i) =>
        `<button class="btn" onmouseover="selectedIdx=${i}; updateSelection()" 
        onclick="handleAnswer(${i}, ${i === s.ans}, '${s.correctFeedback}', '${s.wrongFeedback}')">
        ${o}</button>`
    ).join('');
    updateSelection();
}

function handleAnswer(idx, isCorrect, correctFb, wrongFb) {
    // 1. Hide the exam screen
    document.getElementById("exam-screen").style.display = "none";
    
    // 2. Show the feedback screen
    document.getElementById("feedback-screen").style.display = "flex";
    document.getElementById("feedback-msg").innerText = isCorrect ? correctFb : wrongFb;
    
    // 3. Store result to apply once user clicks "Continue"
    pendingResult = isCorrect;
}

function closeFeedback() {
    document.getElementById("feedback-screen").style.display = "none";
    
    if (pendingResult) {
        correctAnswers++;
        if (correctAnswers >= 5) {
            endGame(true, "Certified Cyber Rookie!");
        } else {
            gameState = "playing";
        }
    } else {
        lives--;
        document.getElementById("lives-val").innerText = lives;
        if (lives <= 0) {
            endGame(false, "System Compromised.");
        } else {
            gameState = "playing";
        }
    }
    pendingResult = null;
}

function skipGame() { endGame(false, "Mission Skipped."); }

function endGame(win, msg) {
    gameState = "over";
    if (username !== "Guest") saveScore(username, score);
    document.getElementById("end-screen").style.display = "flex";
    document.getElementById("end-title").innerText = win ? "MISSION ACCOMPLISHED" : "GAME OVER";
    document.getElementById("end-msg").innerText = `${msg} | Final Score: ${score}`;
    setTimeout(() => {
        document.getElementById("end-screen").style.display = "none";
        showLeaderboard();
    }, 2000);
}

function showLeaderboard() {
    gameState = "leaderboard";
    document.getElementById("leaderboard-screen").style.display = "flex";
    let scores = JSON.parse(localStorage.getItem("leaderboard") || "[]");
    document.getElementById("leaderboard-list").innerHTML = scores.map((s, i) =>
        `<div>${i + 1}. Username: ${s.name} | Score: ${s.score}</div>`
    ).join('');
}

function togglePause() {
    if (gameState === "playing") {
        gameState = "paused";
        document.getElementById("pause-text").innerText = "SYSTEM PAUSED - press SPACE to resume";
        document.getElementById("pause-btn").innerText = "RESUME";
    } else if (gameState === "paused") {
        gameState = "playing";
        document.getElementById("pause-text").innerText = "Press SPACE to pause";
        document.getElementById("pause-btn").innerText = "PAUSE";
    }
}

function updateHud() {
    document.getElementById("score-val").innerText = score;
    document.getElementById("lives-val").innerText = lives;
    const progress = Math.min(100, (score / nextMilestone) * 100);
    document.getElementById("status-bar-fill").style.width = `${progress}%`;
    document.getElementById("status-text").innerText = `SYSTEM STATUS: ${Math.min(score, nextMilestone)}/${nextMilestone}`;
}

function createEatFeedback(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 1.5) * 3, alpha: 1, radius: 2 + Math.random() * 3, color: i % 2 ? '#00ff82' : '#00b4ff' });
    }
    floatingTexts.push({ x, y, text: '+100 XP', color: '#00ff82', alpha: 1, dy: -1.2, life: 60 });
}

function createMilestoneFeedback(x, y) {
    floatingTexts.push({ x, y, text: 'MILESTONE!', color: '#00b4ff', alpha: 1, dy: -1.4, life: 90 });
}

function drawParticles() {
    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.02;
        if (p.alpha <= 0) return;
        ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    });
    particles.length = 0; particles.push(...particles.filter(p => p.alpha > 0));
    floatingTexts.forEach(t => {
        t.y += t.dy; t.alpha -= 0.015; t.life -= 1;
        if (t.alpha <= 0 || t.life <= 0) return;
        ctx.globalAlpha = t.alpha; ctx.fillStyle = t.color;
        ctx.font = '18px Courier New'; ctx.fillText(t.text, t.x - 20, t.y);
    });
    floatingTexts.length = 0; floatingTexts.push(...floatingTexts.filter(t => t.alpha > 0 && t.life > 0));
    ctx.globalAlpha = 1;
}

function gameLoop() {
    if (gameState === 'playing') {
        let head = { x: snake[0].x + dx, y: snake[0].y + dy };
        if (head.x < 0) head.x = 380; else if (head.x > 380) head.x = 0;
        if (head.y < 0) head.y = 380; else if (head.y > 380) head.y = 0;
        snake.unshift(head);
        if (snake.slice(1).some(seg => seg.x === head.x && seg.y === head.y)) {
            playSound(soundBad); endGame(false, "Collision detected."); return;
        }
        if (head.x === good.x && head.y === good.y) {
            score += 100; playSound(soundGood); createEatFeedback(head.x + 10, head.y + 10);
            good = randomCell();
            if (Math.floor(score / WIN_MILESTONE) > difficultyLevel) {
                difficultyLevel++; currentSpeed = Math.max(MIN_SPEED, BASE_SPEED - difficultyLevel * SPEED_STEP);
                createMilestoneFeedback(head.x + 10, head.y + 10); nextMilestone += WIN_MILESTONE;
            }
        } else if (head.x === bad.x && head.y === bad.y) {
            score = Math.max(0, score - 50); playSound(soundBad); bad = randomCell(); triggerExam();
        } else { snake.pop(); }
        updateHud();
    }
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#00ff82'; ctx.fillRect(good.x, good.y, 18, 18);
    ctx.fillStyle = '#ff285a'; ctx.fillRect(bad.x, bad.y, 18, 18);
    ctx.fillStyle = '#00b4ff';
    snake.forEach(p => { ctx.beginPath(); ctx.arc(p.x + 10, p.y + 10, 8, 0, Math.PI * 2); ctx.fill(); });
    drawParticles();
    if (gameState === 'paused') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,400,400);
        ctx.fillStyle = '#00ff82'; ctx.font = '22px Courier New'; ctx.fillText('SYSTEM PAUSED', 105, 200);
    }
    if (gameState !== 'over' && gameState !== 'leaderboard') setTimeout(gameLoop, currentSpeed);
}

window.addEventListener('keydown', e => {
    if (gameState === 'exam') {
        if (e.key === 'ArrowDown') selectedIdx = (selectedIdx + 1) % 2;
        if (e.key === 'ArrowUp') selectedIdx = (selectedIdx - 1 + 2) % 2;
        if (e.key === 'Enter') document.querySelectorAll('#options-box .btn')[selectedIdx]?.click();
        updateSelection();
    } else if (gameState === 'briefing' && e.key === 'Enter') {
        beginMission();
    } else if (e.code === 'Space' && (gameState === 'playing' || gameState === 'paused')) {
        togglePause(); e.preventDefault();
    } else if (gameState === 'playing') {
        if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -20; }
        else if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 20; }
        else if (e.key === 'ArrowLeft' && dx === 0) { dx = -20; dy = 0; }
        else if (e.key === 'ArrowRight' && dx === 0) { dx = 20; dy = 0; }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // --- Briefing crawl setup ---
    const briefingText = document.querySelector('.briefing-text');
    if (briefingText) {
        const original = briefingText.querySelector('.crawl-lines');
        if (original && !briefingText.querySelector('.crawl-track')) {
            const track = document.createElement('div');
            track.className = 'crawl-track';
            const a = original.cloneNode(true);
            const b = original.cloneNode(true);
            track.appendChild(a);
            track.appendChild(b);

            briefingText.removeChild(original);
            briefingText.appendChild(track);
        }
    }

   function resizeGame() {
    const scale = Math.min(
        window.innerWidth / 400,
        window.innerHeight / 600
    );

    const playArea = document.getElementById("play-area");
    playArea.style.transform = `scale(${scale})`;
    playArea.style.transformOrigin = "top center";
}


    window.addEventListener('resize', resizeGame);
    resizeGame();
});
// --- ON-SCREEN DPAD CONTROLS ---
document.getElementById("btn-up").addEventListener("click", () => {
    if (dy === 0) { dx = 0; dy = -20; }
});

document.getElementById("btn-down").addEventListener("click", () => {
    if (dy === 0) { dx = 0; dy = 20; }
});

document.getElementById("btn-left").addEventListener("click", () => {
    if (dx === 0) { dx = -20; dy = 0; }
});

document.getElementById("btn-right").addEventListener("click", () => {
    if (dx === 0) { dx = 20; dy = 0; }
});

