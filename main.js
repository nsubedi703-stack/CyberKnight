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
    { q: "Phishing: Someone asks for your password to 'verify' your account. What do you do?", opts: ["Provide it.", "No, it's a scam."], ans: 1 },
    { q: "Malware: A pop-up says your PC is infected. What's the best move?", opts: ["Ignore/Close it.", "Run the scan."], ans: 0 },
    { q: "Cyberbullying: You see mean comments online. What is your action?", opts: ["Fight back.", "Report and Block."], ans: 1 }
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

function triggerExam() {
    gameState = "exam"; selectedIdx = 0;
    let s = scenarios[Math.floor(Math.random() * scenarios.length)];
    document.getElementById("exam-screen").style.display = "flex";
    document.getElementById("question-box").innerText = s.q;
    document.getElementById("options-box").innerHTML = s.opts.map((o, i) =>
        `<button class="btn" onmouseover="selectedIdx=${i}; updateSelection()" onclick="handleAnswer(${i}, ${i === s.ans})">${o}</button>`
    ).join('');
    updateSelection();
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

// Setup seamless briefing loop: duplicate crawl lines into a `.crawl-track`
document.addEventListener('DOMContentLoaded', () => {
    const briefingText = document.querySelector('.briefing-text');
    if (!briefingText) return;
    const original = briefingText.querySelector('.crawl-lines');
    if (!original) return;
    // Avoid double-initializing
    if (briefingText.querySelector('.crawl-track')) return;

    const track = document.createElement('div');
    track.className = 'crawl-track';
    const a = original.cloneNode(true);
    const b = original.cloneNode(true);
    track.appendChild(a);
    track.appendChild(b);

    briefingText.removeChild(original);
    briefingText.appendChild(track);
});