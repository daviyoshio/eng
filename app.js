(() => {
  "use strict";

  const WORDS = Array.isArray(window.VOCABULARY) ? window.VOCABULARY : [];
  const STORAGE_KEY = "ingles-em-fases:v1";
  const SESSION_SIZE = 20;
  const WORDS_PER_PHASE = 300;
  const PAGE_SIZE = 50;

  const PHASES = [
    { name: "Primeiros passos", focus: "Base do inglês" },
    { name: "Conversas essenciais", focus: "Perguntas e respostas" },
    { name: "Rotina e pessoas", focus: "Situações do cotidiano" },
    { name: "Casa e cidade", focus: "Lugares e movimento" },
    { name: "Trabalho e estudo", focus: "Vida profissional" },
    { name: "Ideias e opiniões", focus: "Expressar pensamentos" },
    { name: "Mundo e informação", focus: "Notícias e sociedade" },
    { name: "Descrição e precisão", focus: "Detalhes e nuances" },
    { name: "Inglês natural", focus: "Vocabulário mais amplo" },
    { name: "Domínio das 3.000", focus: "Consolidação final" },
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const elements = {
    views: $$("[data-view]"),
    navItems: $$(".nav-item[data-view-link]"),
    headerXp: $("#header-xp"),
    headerStreak: $("#header-streak"),
    headerAccuracy: $("#header-accuracy"),
    phaseNumber: $("#current-phase-number"),
    phaseName: $("#current-phase-name"),
    phaseFocus: $("#phase-focus"),
    phaseRoute: $("#phase-route"),
    dailyDone: $("#daily-done"),
    dailyGoal: $("#daily-goal"),
    dailyFill: $("#daily-progress-fill"),
    reviewCount: $("#review-count"),
    sessionCurrent: $("#session-current"),
    sessionTotal: $("#session-total"),
    questionLabel: $("#question-label"),
    prompt: $("#quiz-prompt"),
    meaningContext: $("#meaning-context"),
    answerForm: $("#answer-form"),
    answerInput: $("#answer-input"),
    answerButton: $("#answer-button"),
    hintButton: $("#hint-button"),
    soundButton: $("#sound-button"),
    feedback: $("#answer-feedback"),
    phaseProgressFill: $("#phase-progress-fill"),
    phaseProgressLabel: $("#phase-progress-label"),
    phaseGrid: $("#phase-grid"),
    statGrid: $("#stat-grid"),
    weeklyChart: $("#weekly-chart"),
    weeklyTotal: $("#weekly-total"),
    phasePerformance: $("#phase-performance"),
    wordSearch: $("#word-search"),
    phaseFilter: $("#phase-filter"),
    statusFilter: $("#status-filter"),
    wordTableBody: $("#word-table-body"),
    wordResultsLabel: $("#word-results-label"),
    pageLabel: $("#page-label"),
    previousPage: $("#previous-page"),
    nextPage: $("#next-page"),
    goalDialog: $("#goal-dialog"),
    goalInput: $("#goal-input"),
    confirmDialog: $("#confirm-dialog"),
    toast: $("#toast"),
  };

  let state = loadState();
  let currentView = "learn";
  let currentMode = "new";
  let session = [];
  let sessionIndex = 0;
  let answered = false;
  let hintUsed = false;
  let wordPage = 1;
  let toastTimer;

  function defaultState() {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      activePhase: 1,
      dailyGoal: 215,
      xp: 0,
      streak: { current: 0, best: 0, lastDate: null },
      progress: {},
      activity: {},
    };
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored || stored.version !== 1 || typeof stored.progress !== "object") return defaultState();
      return {
        ...defaultState(),
        ...stored,
        streak: { ...defaultState().streak, ...(stored.streak || {}) },
        progress: stored.progress || {},
        activity: stored.activity || {},
      };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      showToast("Não foi possível salvar o progresso neste navegador.");
    }
  }

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function yesterdayKey() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return dateKey(date);
  }

  function normalizeAnswer(value) {
    return value
      .trim()
      .toLocaleLowerCase("en-US")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(value);
  }

  function getWordProgress(id) {
    return state.progress[id] || {
      seen: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      mastered: false,
      nextReview: 0,
      lastSeen: null,
    };
  }

  function wordStatus(word) {
    const progress = getWordProgress(word.id);
    if (progress.mastered) return "mastered";
    if (progress.seen > 0) return "learning";
    return "new";
  }

  function totals() {
    let studied = 0;
    let mastered = 0;
    let correct = 0;
    let wrong = 0;
    Object.values(state.progress).forEach((progress) => {
      if (progress.seen > 0) studied += 1;
      if (progress.mastered) mastered += 1;
      correct += progress.correct || 0;
      wrong += progress.wrong || 0;
    });
    const answers = correct + wrong;
    return { studied, mastered, correct, wrong, answers, accuracy: answers ? Math.round((correct / answers) * 100) : null };
  }

  function phaseStats(phase) {
    const words = WORDS.slice((phase - 1) * WORDS_PER_PHASE, phase * WORDS_PER_PHASE);
    let studied = 0;
    let mastered = 0;
    let correct = 0;
    let wrong = 0;
    words.forEach((word) => {
      const progress = getWordProgress(word.id);
      if (progress.seen > 0) studied += 1;
      if (progress.mastered) mastered += 1;
      correct += progress.correct || 0;
      wrong += progress.wrong || 0;
    });
    const answers = correct + wrong;
    return {
      studied,
      mastered,
      correct,
      wrong,
      accuracy: answers ? Math.round((correct / answers) * 100) : null,
      percent: Math.round((studied / WORDS_PER_PHASE) * 100),
    };
  }

  function reviewWordsCount() {
    return WORDS.filter((word) => {
      const progress = getWordProgress(word.id);
      return progress.seen > 0 && !progress.mastered && (progress.wrong > 0 || progress.nextReview <= Date.now());
    }).length;
  }

  function dailyDoneCount() {
    const today = dateKey();
    return Object.values(state.progress).filter((progress) => progress.lastSeen === today).length;
  }

  function updateStreak() {
    const today = dateKey();
    if (state.streak.lastDate === today) return;
    state.streak.current = state.streak.lastDate === yesterdayKey() ? state.streak.current + 1 : 1;
    state.streak.best = Math.max(state.streak.best, state.streak.current);
    state.streak.lastDate = today;
  }

  function addActivity(correct) {
    const today = dateKey();
    const activity = state.activity[today] || { answers: 0, correct: 0, wrong: 0 };
    activity.answers += 1;
    activity[correct ? "correct" : "wrong"] += 1;
    state.activity[today] = activity;
  }

  function setView(viewName) {
    if (!['learn', 'roadmap', 'stats', 'words'].includes(viewName)) return;
    currentView = viewName;
    elements.views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === viewName));
    elements.navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.viewLink === viewName));
    if (viewName === "roadmap") renderRoadmap();
    if (viewName === "stats") renderStats();
    if (viewName === "words") renderWordList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectPhase(phase, returnToLearn = true) {
    state.activePhase = Math.min(10, Math.max(1, Number(phase) || 1));
    saveState();
    currentMode = "new";
    setModeButtons();
    buildSession();
    renderOverview();
    if (returnToLearn) setView("learn");
  }

  function buildSession() {
    const phaseStart = (state.activePhase - 1) * WORDS_PER_PHASE;
    const phaseWords = WORDS.slice(phaseStart, phaseStart + WORDS_PER_PHASE);
    let candidates;

    if (currentMode === "review") {
      const now = Date.now();
      candidates = WORDS
        .filter((word) => {
          const progress = getWordProgress(word.id);
          return progress.seen > 0 && !progress.mastered && (progress.wrong > 0 || progress.nextReview <= now);
        })
        .sort((a, b) => getWordProgress(a.id).nextReview - getWordProgress(b.id).nextReview);

      if (!candidates.length) {
        candidates = phaseWords
          .filter((word) => getWordProgress(word.id).seen > 0 && !getWordProgress(word.id).mastered)
          .sort((a, b) => getWordProgress(a.id).correct - getWordProgress(b.id).correct);
      }
    } else {
      const unseen = phaseWords.filter((word) => getWordProgress(word.id).seen === 0);
      const learning = phaseWords
        .filter((word) => getWordProgress(word.id).seen > 0 && !getWordProgress(word.id).mastered)
        .sort((a, b) => getWordProgress(a.id).lastSeen?.localeCompare(getWordProgress(b.id).lastSeen || "") || 0);
      const mastered = phaseWords.filter((word) => getWordProgress(word.id).mastered);
      candidates = [...unseen, ...learning, ...mastered];
    }

    session = candidates.slice(0, SESSION_SIZE);
    if (!session.length) session = phaseWords.slice(0, SESSION_SIZE);
    sessionIndex = 0;
    showCurrentWord();
  }

  function currentWord() {
    return session[sessionIndex] || null;
  }

  function showCurrentWord() {
    const word = currentWord();
    answered = false;
    hintUsed = false;
    elements.answerForm.hidden = false;
    elements.answerInput.disabled = false;
    elements.answerInput.value = "";
    elements.answerInput.classList.remove("is-correct", "is-wrong");
    elements.answerButton.textContent = "Responder";
    elements.hintButton.textContent = "◌ Mostrar dica";
    elements.hintButton.hidden = false;
    elements.soundButton.hidden = true;
    elements.feedback.textContent = "";
    elements.feedback.className = "answer-feedback";
    elements.sessionCurrent.textContent = Math.min(sessionIndex + 1, session.length || 1);
    elements.sessionTotal.textContent = session.length || SESSION_SIZE;

    if (!word) {
      elements.prompt.textContent = "Sessão concluída!";
      elements.meaningContext.textContent = "Comece uma nova sequência para continuar praticando.";
      elements.meaningContext.hidden = false;
      elements.answerForm.hidden = true;
      return;
    }

    const mainMeaning = word.pt[0] || "—";
    elements.questionLabel.textContent = currentMode === "review" ? "Revisão inteligente" : "Traduza para o inglês";
    elements.prompt.innerHTML = `Como se diz <em>“${escapeHtml(mainMeaning)}”</em> em inglês?`;
    if (word.pt.length > 1) {
      elements.meaningContext.textContent = `Também pode significar: ${word.pt.slice(1, 4).join(" • ")}`;
      elements.meaningContext.hidden = false;
    } else {
      elements.meaningContext.hidden = true;
    }
    requestAnimationFrame(() => elements.answerInput.focus({ preventScroll: true }));
  }

  function handleAnswer(event) {
    event.preventDefault();
    const word = currentWord();
    if (!word) {
      buildSession();
      return;
    }

    if (answered) {
      nextWord();
      return;
    }

    const given = normalizeAnswer(elements.answerInput.value);
    if (!given) {
      elements.feedback.textContent = "Digite uma resposta antes de continuar.";
      elements.feedback.className = "answer-feedback is-wrong";
      elements.answerInput.focus();
      return;
    }

    const correct = given === normalizeAnswer(word.en);
    recordAnswer(word, correct);
    answered = true;
    elements.answerInput.disabled = true;
    elements.answerInput.classList.add(correct ? "is-correct" : "is-wrong");
    elements.answerButton.textContent = sessionIndex === session.length - 1 ? "Finalizar sessão" : "Próxima";
    elements.hintButton.hidden = true;
    elements.soundButton.hidden = false;
    elements.feedback.className = `answer-feedback ${correct ? "is-correct" : "is-wrong"}`;
    elements.feedback.innerHTML = correct
      ? `Muito bem! <strong>${escapeHtml(word.en)}</strong> é a resposta certa.${hintUsed ? " Você usou uma dica — tente lembrar sem ela na próxima revisão." : ""}`
      : `A resposta esperada era <strong>${escapeHtml(word.en)}</strong>. Ela entrou na sua fila de revisão.`;
    speak(word.en);
    renderOverview();
  }

  function recordAnswer(word, correct) {
    const progress = getWordProgress(word.id);
    progress.seen += 1;
    progress.lastSeen = dateKey();
    if (correct) {
      progress.correct += 1;
      progress.streak += 1;
      const intervals = [1, 3, 7, 14, 30];
      const days = intervals[Math.min(progress.streak - 1, intervals.length - 1)];
      progress.nextReview = Date.now() + days * 86400000;
      const attempts = progress.correct + progress.wrong;
      progress.mastered = progress.correct >= 3 && progress.streak >= 2 && progress.correct / attempts >= 0.75;
      state.xp += hintUsed ? 8 : 12;
    } else {
      progress.wrong += 1;
      progress.streak = 0;
      progress.mastered = false;
      progress.nextReview = Date.now() + 10 * 60 * 1000;
      state.xp += 2;
    }
    state.progress[word.id] = progress;
    updateStreak();
    addActivity(correct);
    saveState();
  }

  function nextWord() {
    sessionIndex += 1;
    if (sessionIndex >= session.length) {
      showToast("Sessão concluída! Uma nova sequência foi preparada.");
      buildSession();
      return;
    }
    showCurrentWord();
  }

  function showHint() {
    const word = currentWord();
    if (!word || answered) return;
    hintUsed = true;
    const answer = word.en;
    const first = answer[0];
    const words = answer.split(" ").length;
    elements.hintButton.textContent = `${first.toUpperCase()}… · ${answer.length} letras${words > 1 ? ` · ${words} palavras` : ""}`;
    elements.answerInput.focus();
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      showToast("A pronúncia por voz não está disponível neste navegador.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    const preferredVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("en-us"));
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  }

  function setMode(mode) {
    currentMode = mode === "review" ? "review" : "new";
    setModeButtons();
    buildSession();
  }

  function setModeButtons() {
    $$(".mode-button").forEach((button) => button.classList.toggle("is-active", button.dataset.mode === currentMode));
  }

  function renderOverview() {
    const allTotals = totals();
    const activeStats = phaseStats(state.activePhase);
    const dailyDone = dailyDoneCount();
    const dailyPercent = Math.min(100, Math.round((dailyDone / state.dailyGoal) * 100));

    elements.headerXp.textContent = formatNumber(state.xp);
    elements.headerStreak.textContent = state.streak.current;
    elements.headerAccuracy.textContent = allTotals.accuracy === null ? "—" : `${allTotals.accuracy}%`;
    elements.phaseNumber.textContent = state.activePhase;
    elements.phaseName.textContent = PHASES[state.activePhase - 1].name;
    elements.phaseFocus.textContent = PHASES[state.activePhase - 1].focus;
    elements.dailyDone.textContent = dailyDone;
    elements.dailyGoal.textContent = state.dailyGoal;
    elements.dailyFill.style.width = `${dailyPercent}%`;
    elements.reviewCount.textContent = reviewWordsCount();
    elements.phaseProgressFill.style.width = `${activeStats.percent}%`;
    elements.phaseProgressLabel.textContent = `${activeStats.studied}/300`;
    renderPhaseRoute();
  }

  function renderPhaseRoute() {
    elements.phaseRoute.innerHTML = PHASES.map((phase, index) => {
      const phaseNumber = index + 1;
      const stats = phaseStats(phaseNumber);
      const classes = ["phase-node"];
      if (phaseNumber === state.activePhase) classes.push("is-current");
      if (stats.studied === WORDS_PER_PHASE) classes.push("is-complete");
      return `
        <button class="${classes.join(" ")}" type="button" data-phase="${phaseNumber}" aria-label="Fase ${phaseNumber}: ${escapeHtml(phase.name)}, ${stats.percent}% estudada">
          <span>${stats.studied === WORDS_PER_PHASE ? "✓" : phaseNumber}</span>
          <small>${stats.percent}%</small>
        </button>`;
    }).join("");

    if (window.matchMedia("(max-width: 780px)").matches) {
      requestAnimationFrame(() => {
        const currentNode = elements.phaseRoute.querySelector(".is-current");
        if (!currentNode) return;

        const viewportStart = elements.phaseRoute.scrollLeft;
        const viewportEnd = viewportStart + elements.phaseRoute.clientWidth;
        const nodeStart = currentNode.offsetLeft;
        const nodeEnd = nodeStart + currentNode.offsetWidth;

        if (nodeStart < viewportStart || nodeEnd > viewportEnd) {
          const centeredPosition = nodeStart - (elements.phaseRoute.clientWidth - currentNode.offsetWidth) / 2;
          elements.phaseRoute.scrollTo({ left: Math.max(0, centeredPosition), behavior: "smooth" });
        }
      });
    }
  }

  function renderRoadmap() {
    elements.phaseGrid.innerHTML = PHASES.map((phase, index) => {
      const phaseNumber = index + 1;
      const stats = phaseStats(phaseNumber);
      return `
        <article class="phase-card ${phaseNumber === state.activePhase ? "is-current" : ""}">
          <div class="phase-card-number">${phaseNumber}</div>
          <div>
            <h2>${escapeHtml(phase.name)}</h2>
            <p>${escapeHtml(phase.focus)} · ${stats.studied}/300 estudadas · ${stats.mastered} dominadas</p>
            <div class="phase-card-progress">
              <span class="progress-track"><i style="width:${stats.percent}%"></i></span>
              <span>${stats.percent}%</span>
            </div>
          </div>
          <button class="secondary-button compact" type="button" data-study-phase="${phaseNumber}">${stats.studied ? "Continuar" : "Começar"}</button>
        </article>`;
    }).join("");
  }

  function renderStats() {
    const allTotals = totals();
    const cards = [
      ["✦", formatNumber(state.xp), "XP acumulado"],
      ["▱", formatNumber(allTotals.studied), "palavras estudadas"],
      ["★", formatNumber(allTotals.mastered), "palavras dominadas"],
      ["◎", allTotals.accuracy === null ? "—" : `${allTotals.accuracy}%`, "precisão geral"],
    ];
    elements.statGrid.innerHTML = cards.map(([icon, value, label]) => `
      <article class="stat-card"><span>${icon}</span><strong>${value}</strong><small>${label}</small></article>`).join("");

    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = dateKey(date);
      const activity = state.activity[key] || { answers: 0 };
      days.push({
        key,
        label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
        answers: activity.answers || 0,
      });
    }
    const maxAnswers = Math.max(1, ...days.map((day) => day.answers));
    elements.weeklyTotal.textContent = `${days.reduce((sum, day) => sum + day.answers, 0)} respostas`;
    elements.weeklyChart.innerHTML = days.map((day) => `
      <div class="chart-day">
        <div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(2, Math.round((day.answers / maxAnswers) * 100))}%"><span>${day.answers}</span></div></div>
        <strong>${escapeHtml(day.label)}</strong>
      </div>`).join("");

    elements.phasePerformance.innerHTML = PHASES.map((phase, index) => {
      const stats = phaseStats(index + 1);
      return `
        <div class="performance-row">
          <div><h3>Fase ${index + 1} · ${escapeHtml(phase.name)}</h3><small>${stats.mastered} dominadas</small></div>
          <span class="progress-track"><i style="width:${stats.percent}%"></i></span>
          <span>${stats.studied}/300 · ${stats.accuracy === null ? "sem respostas" : `${stats.accuracy}% de precisão`}</span>
        </div>`;
    }).join("");
  }

  function filteredWords() {
    const query = normalizeAnswer(elements.wordSearch.value);
    const phase = elements.phaseFilter.value;
    const status = elements.statusFilter.value;
    return WORDS.filter((word) => {
      const wordPhase = Math.ceil(word.id / WORDS_PER_PHASE);
      const matchesQuery = !query || normalizeAnswer(word.en).includes(query) || normalizeAnswer(word.pt.join(" ")).includes(query);
      const matchesPhase = phase === "all" || wordPhase === Number(phase);
      const matchesStatus = status === "all" || wordStatus(word) === status;
      return matchesQuery && matchesPhase && matchesStatus;
    });
  }

  function renderWordList() {
    const words = filteredWords();
    const pageCount = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
    wordPage = Math.min(pageCount, Math.max(1, wordPage));
    const pageWords = words.slice((wordPage - 1) * PAGE_SIZE, wordPage * PAGE_SIZE);
    const statusLabels = { new: "Não estudada", learning: "Aprendendo", mastered: "Dominada" };
    elements.wordTableBody.innerHTML = pageWords.length ? pageWords.map((word) => {
      const status = wordStatus(word);
      const phase = Math.ceil(word.id / WORDS_PER_PHASE);
      return `
        <tr>
          <td>${word.id}</td>
          <td>${escapeHtml(word.en)}</td>
          <td>${escapeHtml(word.pt.slice(0, 3).join(" · "))}</td>
          <td>${phase}</td>
          <td><span class="status-pill ${status}">${statusLabels[status]}</span></td>
          <td><button class="sound-icon-button" type="button" data-speak="${escapeHtml(word.en)}" aria-label="Ouvir ${escapeHtml(word.en)}">◖</button></td>
        </tr>`;
    }).join("") : `<tr><td colspan="6">Nenhuma palavra encontrada.</td></tr>`;
    elements.wordResultsLabel.textContent = `${formatNumber(words.length)} ${words.length === 1 ? "palavra" : "palavras"}`;
    elements.pageLabel.textContent = `${wordPage}/${pageCount}`;
    elements.previousPage.disabled = wordPage <= 1;
    elements.nextPage.disabled = wordPage >= pageCount;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3300);
  }

  function exportBackup() {
    const payload = {
      app: "Inglês em Fases",
      exportedAt: new Date().toISOString(),
      data: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ingles-em-fases-backup-${dateKey()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Backup exportado.");
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const imported = payload.data || payload;
      if (imported.version !== 1 || typeof imported.progress !== "object") throw new Error("invalid");
      state = {
        ...defaultState(),
        ...imported,
        streak: { ...defaultState().streak, ...(imported.streak || {}) },
        progress: imported.progress || {},
        activity: imported.activity || {},
      };
      saveState();
      buildSession();
      renderOverview();
      renderStats();
      renderRoadmap();
      renderWordList();
      showToast("Backup importado com sucesso.");
    } catch {
      showToast("Este arquivo não é um backup válido do aplicativo.");
    }
  }

  function resetProgress() {
    state = defaultState();
    saveState();
    currentMode = "new";
    setModeButtons();
    buildSession();
    renderOverview();
    renderStats();
    renderRoadmap();
    renderWordList();
    showToast("Seu progresso foi zerado.");
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const viewLink = event.target.closest("[data-view-link]");
      if (viewLink) setView(viewLink.dataset.viewLink);

      const phaseNode = event.target.closest("[data-phase]");
      if (phaseNode) selectPhase(phaseNode.dataset.phase, false);

      const studyPhase = event.target.closest("[data-study-phase]");
      if (studyPhase) selectPhase(studyPhase.dataset.studyPhase, true);

      const modeButton = event.target.closest("[data-mode]");
      if (modeButton) setMode(modeButton.dataset.mode);

      const speakButton = event.target.closest("[data-speak]");
      if (speakButton) speak(speakButton.dataset.speak);
    });

    elements.answerForm.addEventListener("submit", handleAnswer);
    elements.hintButton.addEventListener("click", showHint);
    elements.soundButton.addEventListener("click", () => currentWord() && speak(currentWord().en));

    $("#edit-goal-button").addEventListener("click", () => {
      elements.goalInput.value = state.dailyGoal;
      elements.goalDialog.showModal();
    });
    $("#save-goal").addEventListener("click", () => {
      state.dailyGoal = Math.min(500, Math.max(5, Number(elements.goalInput.value) || 215));
      saveState();
      elements.goalDialog.close();
      renderOverview();
      showToast("Meta diária atualizada.");
    });

    $("#export-button").addEventListener("click", exportBackup);
    $("#import-input").addEventListener("change", (event) => {
      importBackup(event.target.files?.[0]);
      event.target.value = "";
    });
    $("#reset-button").addEventListener("click", () => elements.confirmDialog.showModal());
    elements.confirmDialog.addEventListener("close", () => {
      if (elements.confirmDialog.returnValue === "confirm") resetProgress();
    });

    [elements.wordSearch, elements.phaseFilter, elements.statusFilter].forEach((input) => {
      input.addEventListener("input", () => {
        wordPage = 1;
        renderWordList();
      });
    });
    elements.previousPage.addEventListener("click", () => { wordPage -= 1; renderWordList(); });
    elements.nextPage.addEventListener("click", () => { wordPage += 1; renderWordList(); });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") return;
      if (currentView === "learn" && event.key.toLowerCase() === "h" && document.activeElement !== elements.answerInput) showHint();
    });
  }

  function initialize() {
    if (WORDS.length !== 3000) {
      document.body.innerHTML = `<main style="padding:40px;color:white;font-family:system-ui"><h1>Não foi possível carregar as 3.000 palavras.</h1><p>Confirme se a pasta <code>data</code> foi publicada junto com o arquivo principal.</p></main>`;
      return;
    }
    for (let phase = 1; phase <= 10; phase += 1) {
      const option = document.createElement("option");
      option.value = String(phase);
      option.textContent = `Fase ${phase}`;
      elements.phaseFilter.append(option);
    }
    bindEvents();
    renderOverview();
    buildSession();
    renderRoadmap();
    renderStats();
    renderWordList();
  }

  initialize();
})();
