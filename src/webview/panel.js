// @ts-nocheck
(function () {
  const vscode = acquireVsCodeApi();

  const CIRCUMFERENCE = 2 * Math.PI * 80; // 502.65

  // DOM refs
  const arcProgress    = document.getElementById('arc-progress');
  const timeMm         = document.getElementById('time-mm');
  const timeSs         = document.getElementById('time-ss');
  const phaseLabel     = document.getElementById('phase-label');
  const sessionText    = document.getElementById('session-text');
  const infoLabel      = document.getElementById('info-label');
  const dailyCount     = document.getElementById('daily-count');
  const sessionDots    = document.getElementById('session-indicator');
  const modeSelect     = document.getElementById('mode-select');
  const settingsBtn    = document.getElementById('settings-btn');
  const soundBtn       = document.getElementById('sound-btn');
  const taskInput      = document.getElementById('task-input');
  const taskWrap       = document.getElementById('task-wrap');
  const btnStart       = document.getElementById('btn-start');
  const btnPause       = document.getElementById('btn-pause');
  const btnReset       = document.getElementById('btn-reset');
  const btnSkip        = document.getElementById('btn-skip');
  const skipWrap       = document.getElementById('skip-wrap');
  const pauseBadge     = document.getElementById('pause-badge');
  const customSettings = document.getElementById('custom-settings');
  const inpSession     = document.getElementById('inp-session');
  const inpBreak       = document.getElementById('inp-break');
  const inpLongBreak   = document.getElementById('inp-long-break');
  const inpSessions    = document.getElementById('inp-sessions');
  const errSession     = document.getElementById('err-session');
  const errBreak       = document.getElementById('err-break');
  const errLongBreak   = document.getElementById('err-long-break');
  const errSessions    = document.getElementById('err-sessions');
  const btnApply       = document.getElementById('btn-apply');
  const audioPlayer    = document.getElementById('audio-player');

  let lastMode = 'CLASSIC';
  let lastPhase = null;
  let lastSnapshot = null;

  // ── Layout detection ──────────────────────────────────────────
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const body = document.body;
      body.classList.remove('layout-compact', 'layout-vertical', 'layout-horizontal');
      if (width < 160 || height < 160) {
        body.classList.add('layout-compact');
      } else if (height >= width) {
        body.classList.add('layout-vertical');
      } else {
        body.classList.add('layout-horizontal');
      }
      // Re-evaluate custom settings visibility after layout change
      if (lastSnapshot) {
        const isCustom = lastSnapshot.settings.mode === 'CUSTOM';
        const isCompact = body.classList.contains('layout-compact');
        customSettings.style.display = isCustom && !isCompact ? '' : 'none';
        taskWrap.style.display = isCompact ? 'none' : '';
      }
    }
  });
  ro.observe(document.body);

  // ── Message handler ───────────────────────────────────────────
  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.type === 'timerUpdate') {
      applySnapshot(msg.payload);
    } else if (msg.type === 'playSound') {
      playSound(msg.uri);
    }
  });

  function applySnapshot(snap) {
    const prevPhase = lastPhase;
    lastSnapshot = snap;
    const { state, phase, timeDisplay: td, progress, currentSession, settings, dailyCount: dc, soundEnabled, taskLabel } = snap;

    // Time display — split MM:SS to animate the colon separately
    const [mm, ss] = td.split(':');
    timeMm.textContent = mm;
    timeSs.textContent = ss;

    // Arc progress
    arcProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    // Phase transition — trigger pulse animation
    if (prevPhase !== null && prevPhase !== phase) {
      arcProgress.classList.remove('phase-pulse');
      // Force reflow to restart animation
      void arcProgress.offsetWidth;
      arcProgress.classList.add('phase-pulse');
    }
    lastPhase = phase;

    // Phase class on body
    document.body.classList.remove('phase-work', 'phase-break', 'phase-long-break');
    if (phase === 'WORK')             document.body.classList.add('phase-work');
    else if (phase === 'BREAK')       document.body.classList.add('phase-break');
    else if (phase === 'LONG_BREAK')  document.body.classList.add('phase-long-break');

    // State class on body for colon blink + paused styles
    document.body.classList.remove('state-idle', 'state-running', 'state-paused');
    document.body.classList.add(`state-${state.toLowerCase()}`);

    // Phase label
    const phaseText = phase === 'WORK' ? 'Work' : phase === 'BREAK' ? 'Break' : 'Long Break';
    phaseLabel.textContent = phaseText;

    // Session text
    sessionText.textContent = phase === 'WORK'
      ? `Session ${currentSession} / ${settings.sessionsPerRound}`
      : '';

    // Pause badge
    pauseBadge.style.display = state === 'PAUSED' ? '' : 'none';

    // Info bar
    const modeName = settings.mode.charAt(0) + settings.mode.slice(1).toLowerCase().replace('_', ' ');
    infoLabel.textContent = `${modeName} · ${settings.sessionMinutes}m/${settings.breakMinutes}m`;
    dailyCount.textContent = dc > 0 ? `🍅 ${dc} today` : '';

    // Session dots
    renderDots(currentSession, settings.sessionsPerRound, phase, state);

    // Buttons
    if (state === 'RUNNING') {
      btnStart.style.display = 'none';
      btnPause.style.display = '';
    } else {
      btnStart.style.display = '';
      btnPause.style.display = 'none';
    }

    // Skip break button
    const isBreak = phase === 'BREAK' || phase === 'LONG_BREAK';
    skipWrap.style.display = isBreak ? '' : 'none';

    // Sound button icon
    const soundIcon = soundBtn.querySelector('i');
    if (soundEnabled) {
      soundIcon.className = 'codicon codicon-bell';
      soundBtn.title = 'Sound on — click to mute';
      soundBtn.setAttribute('aria-label', 'Mute sound');
    } else {
      soundIcon.className = 'codicon codicon-bell-slash';
      soundBtn.title = 'Sound off — click to unmute';
      soundBtn.setAttribute('aria-label', 'Unmute sound');
    }

    // Mode select sync (avoid spurious change events)
    if (modeSelect.value !== settings.mode) {
      modeSelect.value = settings.mode;
      lastMode = settings.mode;
    }

    // Custom settings panel visibility
    const isCustom = settings.mode === 'CUSTOM';
    const isCompact = document.body.classList.contains('layout-compact');
    customSettings.style.display = isCustom && !isCompact ? '' : 'none';
    taskWrap.style.display = isCompact ? 'none' : '';

    // Sync custom inputs only when mode first switches to CUSTOM
    if (isCustom && lastMode !== 'CUSTOM') {
      inpSession.value = settings.sessionMinutes;
      inpBreak.value   = settings.breakMinutes;
      inpLongBreak.value = settings.longBreakMinutes;
      inpSessions.value = settings.sessionsPerRound;
    }
    lastMode = settings.mode;

    // Task input — sync value only if it differs (avoid clobbering mid-type)
    if (taskInput.value !== taskLabel) {
      taskInput.value = taskLabel;
    }
  }

  function renderDots(currentSession, total, phase, state) {
    sessionDots.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const dot = document.createElement('span');
      dot.className = 'session-dot';
      dot.setAttribute('role', 'listitem');
      if (i < currentSession) {
        dot.classList.add('done');
        dot.setAttribute('aria-label', `Session ${i} complete`);
      } else if (i === currentSession && phase === 'WORK') {
        dot.classList.add('current');
        dot.setAttribute('aria-label', `Session ${i} in progress`);
      } else {
        dot.setAttribute('aria-label', `Session ${i} pending`);
      }
      sessionDots.appendChild(dot);
    }
  }

  function playSound(uri) {
    audioPlayer.src = uri;
    audioPlayer.play().catch(() => {});
  }

  // ── Button handlers ───────────────────────────────────────────
  btnStart.addEventListener('click',    () => vscode.postMessage({ type: 'start' }));
  btnPause.addEventListener('click',    () => vscode.postMessage({ type: 'pause' }));
  btnReset.addEventListener('click',    () => vscode.postMessage({ type: 'reset' }));
  btnSkip.addEventListener('click',     () => vscode.postMessage({ type: 'skipBreak' }));
  settingsBtn.addEventListener('click', () => vscode.postMessage({ type: 'openSettings' }));
  soundBtn.addEventListener('click',    () => vscode.postMessage({ type: 'toggleSound' }));

  modeSelect.addEventListener('change', () => {
    vscode.postMessage({ type: 'applyMode', mode: modeSelect.value });
  });

  // Task input — debounced to avoid firing on every keystroke
  let taskDebounce;
  taskInput.addEventListener('input', () => {
    clearTimeout(taskDebounce);
    taskDebounce = setTimeout(() => {
      vscode.postMessage({ type: 'setTask', label: taskInput.value });
    }, 400);
  });

  // ── Custom settings ───────────────────────────────────────────
  function validateCustom() {
    let valid = true;

    const session = parseInt(inpSession.value, 10);
    if (isNaN(session) || session < 1 || session > 120) {
      inpSession.classList.add('invalid');
      errSession.textContent = '1–120';
      valid = false;
    } else {
      inpSession.classList.remove('invalid');
      errSession.textContent = '';
    }

    const brk = parseInt(inpBreak.value, 10);
    if (isNaN(brk) || brk < 1 || brk > 60) {
      inpBreak.classList.add('invalid');
      errBreak.textContent = '1–60';
      valid = false;
    } else {
      inpBreak.classList.remove('invalid');
      errBreak.textContent = '';
    }

    const longBrk = parseInt(inpLongBreak.value, 10);
    if (isNaN(longBrk) || longBrk < 5 || longBrk > 60) {
      inpLongBreak.classList.add('invalid');
      errLongBreak.textContent = '5–60';
      valid = false;
    } else {
      inpLongBreak.classList.remove('invalid');
      errLongBreak.textContent = '';
    }

    const sessions = parseInt(inpSessions.value, 10);
    if (isNaN(sessions) || sessions < 1 || sessions > 10) {
      inpSessions.classList.add('invalid');
      errSessions.textContent = '1–10';
      valid = false;
    } else {
      inpSessions.classList.remove('invalid');
      errSessions.textContent = '';
    }

    return valid ? { session, brk, longBrk, sessions } : null;
  }

  [inpSession, inpBreak, inpLongBreak, inpSessions].forEach(inp => {
    inp.addEventListener('input', () => inp.classList.remove('invalid'));
  });

  btnApply.addEventListener('click', () => {
    const vals = validateCustom();
    if (!vals) return;
    vscode.postMessage({
      type: 'applyCustomSettings',
      sessionMinutes:  vals.session,
      breakMinutes:    vals.brk,
      longBreakMinutes: vals.longBrk,
      sessionsPerRound: vals.sessions,
    });
  });
})();
