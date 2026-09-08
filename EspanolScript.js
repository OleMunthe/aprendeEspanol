// Korte lydeffekter uten eksterne lydfiler.
function playQuizSound(type) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!window.quizAudioCtx) window.quizAudioCtx = new AudioCtx();
  const ctx = window.quizAudioCtx;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;

  function tone(freq, start, duration, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  if (type === "correct") {
    tone(660, now, 0.12, 0.10);
    tone(880, now + 0.11, 0.18, 0.11);
  } else if (type === "wrong") {
    tone(220, now, 0.18, 0.09);
    tone(165, now + 0.12, 0.24, 0.08);
  }
}

function showPointPopup() {
  const popup = document.getElementById("pointPopup");
  popup.classList.remove("show");
  void popup.offsetWidth;
  popup.classList.add("show");
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPunctuation(str) {
  return str
    .toLowerCase()
    .replace(/[.,!?¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let mode = null;
let allWords = [];
let L = [];
let index = 0;
let riktig = 0;
let feil = 0;
let waitForNext = false;
let startTotal = 0;

const answerInput = document.getElementById("answer");

answerInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();

    const responderBtn = document.getElementById("responderBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (nextBtn.style.display === "block") {
      nextQuestion();
    } else if (responderBtn.style.display === "block") {
      checkAnswer();
    }
  }
});

function shuffle(array) {
  const a = [...array];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function setMode(m) {
  mode = m;

  document.getElementById("modeSelect").style.display = "none";
  document.getElementById("modeTitle").style.display = "none";
  document.getElementById("wordEntry").style.display = "block";
  document.getElementById("wordList").focus();
}

function parseWordList() {
  const text = document.getElementById("wordList").value.trim();
  const error = document.getElementById("listError");

  error.innerText = "";

  if (!text) {
    error.innerText = "Legg inn minst ett par med ord eller uttrykk.";
    return null;
  }

  const lines = text
    .split(/\r?\n/)
    .filter(line => line.trim() !== "");

  const words = [];
  const invalidLines = [];

  lines.forEach((line, lineIndex) => {
    const commaIndex = line.indexOf(",");

    if (commaIndex === -1) {
      invalidLines.push(lineIndex + 1);
      return;
    }

    const spanish = line.slice(0, commaIndex).trim();
    const norwegian = line.slice(commaIndex + 1).trim();

    if (!spanish || !norwegian) {
      invalidLines.push(lineIndex + 1);
      return;
    }

    words.push([spanish, norwegian]);
  });

  if (invalidLines.length > 0) {
    error.innerText =
      `Sjekk linje ${invalidLines.join(", ")}. ` +
      `Bruk formatet: utenlandsk, norsk`;

    return null;
  }

  return words;
}

function updateProgress() {
  if (startTotal === 0) {
    document.getElementById("progressBar").style.width = "0%";
    return;
  }

  const done = startTotal - L.length;
  const percent = (done / startTotal) * 100;

  document.getElementById("progressBar").style.width =
    percent + "%";
}

function resetQuizState() {
  riktig = 0;
  feil = 0;
  waitForNext = false;
  index = 0;

  document.getElementById("final").innerText = "";
  document.getElementById("feedback").innerText = "";
  document.getElementById("restartOptions").style.display = "none";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("progressBar").style.width = "0%";

  answerInput.value = "";
  answerInput.classList.remove("correct", "wrong");
}

function startGame(useExistingList = false) {
  if (!mode) return;

  if (!useExistingList) {
    const parsedWords = parseWordList();

    if (!parsedWords) return;

    allWords = parsedWords;
  }

  resetQuizState();

  startTotal = allWords.length;
  L = shuffle(allWords);

  updateStats();

  document.getElementById("intro").style.display = "none";
  document.getElementById("wordEntry").style.display = "none";
  document.getElementById("question").style.display = "block";

  if (mode === "write") {
    answerInput.style.display = "block";

    document.getElementById("responderBtn").style.display =
      "block";

    document.getElementById("mcOptions").style.display =
      "none";
  } else {
    answerInput.style.display = "none";

    document.getElementById("responderBtn").style.display =
      "none";

    document.getElementById("mcOptions").style.display =
      "block";
  }

  nextQuestion();
}

function finishQuiz() {
  const attempts = riktig + feil;

  const percent =
    attempts === 0
      ? 0
      : Math.round((riktig / attempts) * 100);

  document.getElementById("question").innerText =
    "🏁 Ferdig!";

  document.getElementById("final").innerText =
    `Resultat: ${percent} %`;

  document.getElementById("progressBar").style.width = "100%";

  document.getElementById("restartOptions").style.display =
    "block";

  document.getElementById("responderBtn").style.display =
    "none";

  document.getElementById("nextBtn").style.display =
    "none";

  document.getElementById("mcOptions").style.display =
    "none";

  answerInput.style.display = "none";
}

function nextQuestion() {
  if (waitForNext) {
    L.splice(index, 1);

    updateProgress();

    answerInput.value = "";
    waitForNext = false;
  }

  document.getElementById("feedback").innerText = "";
  document.getElementById("nextBtn").style.display = "none";

  if (L.length === 0) {
    finishQuiz();
    return;
  }

  if (mode === "write") {
    document.getElementById("responderBtn").style.display =
      "block";
  } else {
    document.getElementById("responderBtn").style.display =
      "none";
  }

  index = Math.floor(Math.random() * L.length);

if (mode === "mc") {
  // Flervalg: vis spansk, velg norsk
  document.getElementById("question").innerHTML = `
    <div class="q-line">Hva betyr dette ordet/uttrykket?</div>
    <div class="q-word">
      <strong>"${escapeHtml(L[index][0])}"</strong>
    </div>
  `;
} else {
  // Skrivemodus: vis norsk, skriv spansk
  document.getElementById("question").innerHTML = `
    <div class="q-line">Skriv ordet/uttrykket:</div>
    <div class="q-word">
      <strong>"${escapeHtml(L[index][1])}"</strong>
    </div>
  `;
}

  if (mode === "mc") {
    setupMC();
  } else {
    answerInput.value = "";
    answerInput.classList.remove("correct", "wrong");
    answerInput.focus();
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;

  const dp = Array.from(
    { length: m + 1 },
    () => Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] +
          (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return dp[m][n];
}

function setupMC() {
  const correct = L[index][1];

  const distractors = [
    ...new Set(allWords.map(word => word[1]))
  ].filter(answer => answer !== correct);

  const options = shuffle([
    correct,
    ...shuffle(distractors).slice(0, 3)
  ]);

  const buttons =
    document.querySelectorAll("#mcOptions button");

  buttons.forEach((btn, i) => {
    if (i < options.length) {
      btn.innerText = options[i];
      btn.className = "";
      btn.disabled = false;
      btn.style.display = "block";
    } else {
      btn.style.display = "none";
    }
  });
}

function checkMC(i) {
  const btn = document.getElementById("opt" + i);
  const correct = L[index][1];

  document
    .querySelectorAll("#mcOptions button")
    .forEach(b => b.disabled = true);

  if (btn.innerText === correct) {
    btn.classList.add("correct");

    riktig++;

    playQuizSound("correct");
    showPointPopup();

    L.splice(index, 1);

    updateProgress();
  } else {
    btn.classList.add("wrong");

    feil++;

    playQuizSound("wrong");

    document
      .querySelectorAll("#mcOptions button")
      .forEach(b => {
        if (b.innerText === correct) {
          b.classList.add("correct");
        }
      });
  }

  updateStats();

  document.getElementById("nextBtn").style.display =
    "block";
}

function checkAnswer() {
  const feedback =
    document.getElementById("feedback");

  answerInput.classList.remove("correct", "wrong");

  document.getElementById("nextBtn").style.display =
    "none";

  waitForNext = false;

  const userRaw = answerInput.value.trim();
  const correctRaw = L[index][0];

  const userNorm = normalize(userRaw);
  const correctNorm = normalize(correctRaw);

  const distance =
    levenshtein(userNorm, correctNorm);

  // Helt riktig
  if (
    stripPunctuation(userRaw) ===
    stripPunctuation(correctRaw)
  ) {
    riktig++;

    answerInput.classList.add("correct");

    feedback.innerHTML =
      `✅ <strong>RIKTIG!</strong>`;

    feedback.style.color = "#2ecc71";

    playQuizSound("correct");

    document.getElementById(
      "responderBtn"
    ).style.display = "none";

    showPointPopup();

    updateStats();

    setTimeout(() => {
      feedback.innerText = "";
      answerInput.value = "";

      L.splice(index, 1);

      updateProgress();
      nextQuestion();
    }, 1000);

    return;
  }

  // Nesten riktig – aksent
  if (userNorm === correctNorm) {
    riktig++;

    document.getElementById(
      "responderBtn"
    ).style.display = "none";

    waitForNext = true;

    answerInput.classList.add("correct");

    feedback.style.color = "#b7791f";

    feedback.innerHTML =
      `⚠️ Nesten riktig! 🧐
       <br>
       <small>
       Du gjorde bare en aksentfeil:
       <strong>${escapeHtml(correctRaw)}</strong>
       </small>`;
  }

  // Nesten riktig – én stavefeil
  else if (distance === 1) {
    riktig++;

    document.getElementById(
      "responderBtn"
    ).style.display = "none";

    waitForNext = true;

    answerInput.classList.add("correct");

    feedback.style.color = "#b7791f";

    feedback.innerHTML =
      `⚠️ Nesten riktig! 🧐
       <br>
       <small>
       Minor spelling mistake.
       Correct answer:
       <strong>${escapeHtml(correctRaw)}</strong>
       </small>`;
  }

  // Feil
  else {
    feil++;

    answerInput.classList.add("wrong");

    playQuizSound("wrong");

    feedback.innerHTML =
      `❌ FEIL!
       ✍️Skriv det riktige svaret:
       <strong>${escapeHtml(correctRaw)}</strong>`;

    feedback.style.color = "red";

    updateStats();

    return;
  }

  updateStats();

  document.getElementById("nextBtn").style.display =
    "block";
}

function updateStats() {
  const remaining = L.length;

  document.getElementById("stats").innerText =
    `✅Riktige: ${riktig} | ` +
    `❌Feil: ${feil} | ` +
    `Resterende: ${remaining}`;
}

function restartSameList(newMode) {
  mode = newMode;
  startGame(true);
}

function newList() {
  resetQuizState();

  allWords = [];
  L = [];
  startTotal = 0;

  document.getElementById("question").style.display =
    "none";

  document.getElementById("stats").innerText = "";

  document.getElementById("wordList").value = "";

  document.getElementById("wordEntry").style.display =
    "block";

  document.getElementById("wordList").focus();
}