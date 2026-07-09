// @ts-nocheck
(function () {
  const vscode = acquireVsCodeApi();

  const CIRCUMFERENCE = 2 * Math.PI * 80; // 502.65

  // Gentle break suggestions — one is picked each time a break starts
  const BREAK_TIPS = [
    'Step away from the screen — your code will wait.',
    'Look at something 20 feet away for 20 seconds.',
    'Stand up and stretch. Shoulders first.',
    'Refill your water. Hydration is a feature.',
    'Unclench your jaw, drop your shoulders, breathe.',
  ];
  const LONG_BREAK_TIPS = [
    'Round complete. Really step away — you\'ve earned it.',
    'A short walk now beats a slow evening later.',
    'Leave the desk. The next round will thank you.',
  ];
  const MICRO_TIPS = [
    'The agent\'s working — rest your eyes while it does.',
    'Look 20 feet away for 20 seconds. The diff will wait.',
    'Stand and stretch. You\'ll review better for it.',
    'Shoulders down, jaw unclenched, one slow breath.',
  ];

  // DOM refs
  const arcProgress    = document.getElementById('arc-progress');
  const timeMm         = document.getElementById('time-mm');
  const timeSs         = document.getElementById('time-ss');
  const phaseLabel     = document.getElementById('phase-label');
  const infoLabel      = document.getElementById('info-label');
  const dailyCount     = document.getElementById('daily-count');
  const sessionDots    = document.getElementById('session-indicator');
  const modeSelect     = document.getElementById('mode-select');
  const settingsBtn    = document.getElementById('settings-btn');
  const soundBtn       = document.getElementById('sound-btn');
  const taskWrap       = document.getElementById('task-wrap');
  const taskInput      = document.getElementById('task-input');
  const intentDone     = document.getElementById('intent-done');
  const btnStart       = document.getElementById('btn-start');
  const btnStartLabel  = document.getElementById('btn-start-label');
  const btnPause       = document.getElementById('btn-pause');
  const btnReset       = document.getElementById('btn-reset');
  const btnSkip        = document.getElementById('btn-skip');
  const btnMicro       = document.getElementById('btn-micro');
  const btnMicroEnd    = document.getElementById('btn-micro-end');
  const skipNote       = document.getElementById('skip-note');
  const dsStats        = document.getElementById('ds-stats');
  const dsTriage       = document.getElementById('ds-triage');
  const planCount      = document.getElementById('plan-count');
  const planList       = document.getElementById('plan-list');
  const planAdd        = document.getElementById('plan-add');
  const laterWrap      = document.getElementById('later-wrap');
  const laterToggle    = document.getElementById('later-toggle');
  const laterChevron   = document.getElementById('later-chevron');
  const laterLabel     = document.getElementById('later-label');
  const laterClear     = document.getElementById('later-clear');
  const laterList      = document.getElementById('later-list');
  const rhythmWrap     = document.getElementById('rhythm-wrap');
  const rhythmBars     = document.getElementById('rhythm-bars');
  const rhythmTotal    = document.getElementById('rhythm-total');
  const pauseBadge     = document.getElementById('pause-badge');
  const breakTitle     = document.getElementById('break-title');
  const breakSub       = document.getElementById('break-sub');
  const customToggle   = document.getElementById('custom-toggle');
  const customChevron  = document.getElementById('custom-chevron');
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

  let lastMode = null;
  let lastPhase = null;
  let lastScreen = null;
  let lastSnapshot = null;
  let customExpanded = false;

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

  // One state, one screen
  function screenFor(snap) {
    if (snap.firstRun) return 'setup';
    if (snap.microBreakActive) return 'micro';
    if (snap.phase !== 'WORK') return 'break';
    if (snap.state === 'IDLE') return 'idle';
    return 'focus';
  }

  function applySnapshot(snap) {
    lastSnapshot = snap;
    const prevPhase = lastPhase;
    const { state, phase, timeDisplay: td, progress, currentSession, settings, dailyCount: dc, dailyGoal, focusMsToday, breaksSkippedToday, windDown, history, planTasks, activeTaskId, laterTasks, soundEnabled, taskLabel } = snap;
    const screen = screenFor(snap);
    const body = document.body;

    // Screen / phase / state classes on body — CSS does the showing and hiding
    body.classList.remove('screen-setup', 'screen-idle', 'screen-focus', 'screen-break', 'screen-micro');
    body.classList.add(`screen-${screen}`);

    body.classList.remove('phase-work', 'phase-break', 'phase-long-break');
    if (phase === 'WORK')             body.classList.add('phase-work');
    else if (phase === 'BREAK')       body.classList.add('phase-break');
    else if (phase === 'LONG_BREAK')  body.classList.add('phase-long-break');

    body.classList.remove('state-idle', 'state-running', 'state-paused');
    body.classList.add(`state-${state.toLowerCase()}`);

    body.classList.toggle('mode-custom', settings.mode === 'CUSTOM');
    body.classList.toggle('sound-off', !soundEnabled);

    // Time display — split MM:SS to animate the colon separately
    const [mm, ss] = td.split(':');
    timeMm.textContent = mm;
    timeSs.textContent = ss;

    // Arc progress
    arcProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    // Phase transition — pulse the arc, refresh the break tip
    if (prevPhase !== null && prevPhase !== phase) {
      arcProgress.classList.remove('phase-pulse');
      void arcProgress.offsetWidth; // force reflow to restart animation
      arcProgress.classList.add('phase-pulse');
      if (phase === 'BREAK' || phase === 'LONG_BREAK') {
        pickBreakTip(phase);
      }
    }
    if (prevPhase === null && (phase === 'BREAK' || phase === 'LONG_BREAK')) {
      pickBreakTip(phase); // panel opened mid-break
    }
    lastPhase = phase;

    // Labels inside the arc — only when the number needs naming: FOCUS while
    // focusing, RESTING while a micro-break counts up. Idle shows the bare
    // contract; the segments carry round progress.
    phaseLabel.textContent = screen === 'micro' ? 'Resting' : screen === 'focus' ? 'Focus' : '';

    // Break / micro heading
    if (screen === 'break') {
      breakTitle.textContent = phase === 'LONG_BREAK' ? 'Long break' : 'Break time';
    } else if (screen === 'micro') {
      breakTitle.textContent = 'Micro-break';
      if (lastScreen !== 'micro') {
        breakSub.textContent = MICRO_TIPS[Math.floor(Math.random() * MICRO_TIPS.length)];
      }
    }
    lastScreen = screen;

    // Pause badge
    pauseBadge.style.display = state === 'PAUSED' ? '' : 'none';

    // Info bar (idle screen) — today's facts; the dropdown already names the mode
    infoLabel.textContent = focusMsToday > 0 ? `${formatFocus(focusMsToday)} focused` : 'Ready when you are.';
    const countPart = dailyGoal > 0 ? `${dc}/${dailyGoal}` : `${dc}`;
    dailyCount.textContent = dc > 0 ? `${countPart} today` : '';

    // Day summary (idle screen during wind-down) — only when there is a day to wrap up
    const openCount = (planTasks || []).filter(t => !t.done).length;
    const hasWrapUp = dc > 0 || focusMsToday > 0 || openCount > 0;
    body.classList.toggle('wind-down', !!windDown && hasWrapUp);
    if (windDown && hasWrapUp) {
      const parts = [
        dailyGoal > 0 ? `${dc} of ${dailyGoal} sessions` : `${dc} session${dc === 1 ? '' : 's'}`,
        `${formatFocus(focusMsToday)} focused`,
      ];
      if (breaksSkippedToday > 0) {
        parts.push(`${breaksSkippedToday} break${breaksSkippedToday === 1 ? '' : 's'} skipped`);
      }
      dsStats.textContent = parts.join(' · ');
    }

    // Skip-break friction: make the cost of skipping visible, gently
    skipNote.textContent = breaksSkippedToday > 0
      ? `${breaksSkippedToday} break${breaksSkippedToday === 1 ? '' : 's'} skipped today — try to honor this one`
      : '';

    // Weekly rhythm strip (idle screen)
    renderRhythm(history || [], dc, focusMsToday);

    // Day plan (idle screen)
    renderPlan(planTasks || [], activeTaskId || null, laterTasks || []);

    // Wind-down triage: sweep open tasks to Later in one click
    if (windDown && openCount > 0) {
      dsTriage.textContent = `Move ${openCount} open task${openCount === 1 ? '' : 's'} to Later`;
      dsTriage.style.display = '';
    } else {
      dsTriage.style.display = 'none';
    }

    // Session dots — during a break, the just-finished session counts as done
    const doneThrough = phase === 'WORK' ? currentSession - 1 : currentSession;
    renderDots(doneThrough, currentSession, settings.sessionsPerRound, phase);

    // Start / Resume / Pause buttons
    if (state === 'RUNNING') {
      btnStart.style.display = 'none';
      btnPause.style.display = '';
    } else {
      btnStart.style.display = '';
      btnPause.style.display = 'none';
      btnStartLabel.textContent = state === 'PAUSED' ? 'Resume' : 'Start';
    }

    // Reset is noise when there is nothing to reset
    const nothingToReset = screen === 'idle' && progress === 0 && currentSession === 1;
    btnReset.style.display = nothingToReset ? 'none' : '';

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
    }

    // Sync custom inputs only when mode first switches to CUSTOM
    if (settings.mode === 'CUSTOM' && lastMode !== 'CUSTOM') {
      inpSession.value = settings.sessionMinutes;
      inpBreak.value   = settings.breakMinutes;
      inpLongBreak.value = settings.longBreakMinutes;
      inpSessions.value = settings.sessionsPerRound;
    }
    lastMode = settings.mode;

    // Intent input — sync value only if it differs (avoid clobbering mid-type)
    if (taskInput.value !== taskLabel) {
      taskInput.value = taskLabel;
    }

    // Mid-session completion: the active task is checkable right on the intent
    // line — which then reads as a task row (check + left text), not a centered line
    const showIntentDone = screen === 'focus' && !!activeTaskId;
    intentDone.style.display = showIntentDone ? '' : 'none';
    taskWrap.classList.toggle('has-check', showIntentDone);
    if (showIntentDone) {
      const doneTitle = `Mark "${taskLabel}" done`;
      intentDone.title = doneTitle;
      intentDone.setAttribute('aria-label', doneTitle);
    }
  }

  function formatFocus(ms) {
    const totalMin = Math.floor(ms / 60000);
    if (totalMin < 60) return `${totalMin}m`;
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  }

  // ── Weekly rhythm strip ───────────────────────────────────────
  let rhythmKey = '';

  function renderRhythm(history, todaySessions, todayFocusMs) {
    // Skip the DOM rebuild unless something visible changed
    const key = JSON.stringify([history, todaySessions, Math.floor(todayFocusMs / 60000)]);
    if (key === rhythmKey) return;
    rhythmKey = key;

    // An all-empty strip reads as a glitch, not a feature — wait for data
    const hasData = todaySessions > 0 || history.some(r => r.sessions > 0);
    rhythmWrap.style.display = hasData ? '' : 'none';
    if (!hasData) return;

    const byDate = {};
    history.forEach(r => { byDate[r.date] = r; });

    // Dates use UTC to match the extension's day-rollover convention
    const days = [];
    let maxSessions = 1;
    let weekMs = 0;
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().split('T')[0];
      const rec = i === 0
        ? { sessions: todaySessions, focusMs: todayFocusMs }
        : (byDate[iso] || { sessions: 0, focusMs: 0 });
      maxSessions = Math.max(maxSessions, rec.sessions);
      weekMs += rec.focusMs;
      days.push({ d, rec, today: i === 0 });
    }

    rhythmBars.innerHTML = '';
    for (const { d, rec, today } of days) {
      const col = document.createElement('div');
      col.className = today ? 'rhythm-col today' : 'rhythm-col';
      col.title = `${today ? 'Today' : d.toUTCString().slice(0, 3)}: `
        + `${rec.sessions} session${rec.sessions === 1 ? '' : 's'} · ${formatFocus(rec.focusMs)}`;

      const bar = document.createElement('div');
      bar.className = rec.sessions === 0 ? 'rhythm-bar empty' : 'rhythm-bar';
      bar.style.height = rec.sessions === 0
        ? '3px'
        : `${Math.max(6, Math.round((rec.sessions / maxSessions) * 30))}px`;

      const label = document.createElement('span');
      label.className = 'rhythm-day';
      label.textContent = 'SMTWTFS'[d.getUTCDay()];

      col.appendChild(bar);
      col.appendChild(label);
      rhythmBars.appendChild(col);
    }

    // A fact, not a chain: rest days can't break a weekly total
    rhythmTotal.textContent = weekMs > 0 ? `${formatFocus(weekMs)} this week` : '';
  }

  function pickBreakTip(phase) {
    const tips = phase === 'LONG_BREAK' ? LONG_BREAK_TIPS : BREAK_TIPS;
    breakSub.textContent = tips[Math.floor(Math.random() * tips.length)];
  }

  function renderDots(doneThrough, currentSession, total, phase) {
    sessionDots.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const dot = document.createElement('span');
      dot.className = 'session-dot';
      dot.setAttribute('role', 'listitem');
      let stateText;
      if (i <= doneThrough) {
        dot.classList.add('done');
        stateText = 'done';
      } else if (i === currentSession && phase === 'WORK') {
        dot.classList.add('current');
        stateText = 'in progress';
      } else {
        stateText = 'pending';
      }
      const desc = `Session ${i} of ${total} — ${stateText}`;
      dot.setAttribute('aria-label', desc);
      dot.title = desc;
      sessionDots.appendChild(dot);
    }
  }

  function playSound(uri) {
    audioPlayer.src = uri;
    audioPlayer.play().catch(() => {});
  }

  // ── Day plan (Today + Later) ──────────────────────────────────
  const PLAN_MAX = 5;
  const STALE_DAYS = 7;
  let planKey = '';
  let laterExpanded = false;

  function staleCutoffIso() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - STALE_DAYS);
    return d.toISOString().split('T')[0];
  }

  function iconBtn(className, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'task-act';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    const icon = document.createElement('i');
    icon.className = `codicon ${className}`;
    btn.appendChild(icon);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderPlan(plan, activeId, later) {
    const key = JSON.stringify([plan, activeId, later, laterExpanded]);
    if (key === planKey) return;
    planKey = key;

    // Header count: the running score of the day
    const doneCount = plan.filter(t => t.done).length;
    planCount.textContent = plan.length > 0 ? `${doneCount}/${plan.length}` : '';

    // Today rows — open tasks first, wins sink struck-through to the bottom
    planList.innerHTML = '';
    const sorted = [...plan.filter(t => !t.done), ...plan.filter(t => t.done)];
    for (const t of sorted) {
      const row = document.createElement('li');
      row.className = 'task-row' + (t.done ? ' done' : '') + (t.id === activeId ? ' active' : '');

      const check = document.createElement('button');
      check.className = 'task-check';
      check.title = t.done ? 'Mark as not done' : 'Mark done';
      check.setAttribute('aria-label', check.title);
      const checkIcon = document.createElement('i');
      checkIcon.className = t.done ? 'codicon codicon-pass-filled' : 'codicon codicon-circle-large-outline';
      check.appendChild(checkIcon);
      check.addEventListener('click', () => vscode.postMessage({ type: 'toggleTaskDone', id: t.id }));
      row.appendChild(check);

      const label = document.createElement('button');
      label.className = 'task-label';
      label.textContent = t.label;
      if (!t.done) {
        label.title = 'Make this the active task';
        label.addEventListener('click', () => vscode.postMessage({ type: 'setActiveTask', id: t.id }));
      }
      row.appendChild(label);

      if (t.sessions > 0) {
        const sess = document.createElement('span');
        sess.className = 'task-sess';
        sess.textContent = `S${t.sessions}`;
        sess.title = `${t.sessions} session${t.sessions === 1 ? '' : 's'} on this task`;
        row.appendChild(sess);
      }

      if (!t.done) {
        row.appendChild(iconBtn('codicon-arrow-down', 'Move to Later',
          () => vscode.postMessage({ type: 'demoteTask', id: t.id })));
      }

      planList.appendChild(row);
    }

    planAdd.style.display = plan.length >= PLAN_MAX ? 'none' : '';

    // Later tray — collapsed by default, hidden when empty
    laterWrap.style.display = later.length > 0 ? '' : 'none';
    laterLabel.textContent = `Later (${later.length})`;
    laterChevron.className = laterExpanded
      ? 'codicon codicon-chevron-down'
      : 'codicon codicon-chevron-right';
    laterToggle.setAttribute('aria-expanded', String(laterExpanded));
    laterList.style.display = laterExpanded ? '' : 'none';

    const cutoff = staleCutoffIso();
    laterClear.style.display = laterExpanded && later.some(t => t.addedDate < cutoff) ? '' : 'none';

    laterList.innerHTML = '';
    if (laterExpanded) {
      const planFull = plan.length >= PLAN_MAX;
      for (const t of later) {
        const row = document.createElement('li');
        row.className = 'task-row' + (t.addedDate < cutoff ? ' stale' : '');

        const up = iconBtn('codicon-arrow-up', planFull ? "Today's plan is full" : 'Add to today',
          () => vscode.postMessage({ type: 'promoteTask', id: t.id }));
        up.disabled = planFull;
        row.appendChild(up);

        const label = document.createElement('span');
        label.className = 'task-label';
        label.textContent = t.label;
        row.appendChild(label);

        row.appendChild(iconBtn('codicon-close', 'Delete',
          () => vscode.postMessage({ type: 'deleteLaterTask', id: t.id })));

        laterList.appendChild(row);
      }
    }
  }

  // ── Setup screen ──────────────────────────────────────────────
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      if (mode === 'CUSTOM') {
        // Land on the idle screen with the timings form already open
        setCustomExpanded(true);
      }
      vscode.postMessage({ type: 'applyMode', mode });
    });
  });

  // ── Button handlers ───────────────────────────────────────────
  btnStart.addEventListener('click',    () => vscode.postMessage({ type: 'start' }));
  btnPause.addEventListener('click',    () => vscode.postMessage({ type: 'pause' }));
  btnReset.addEventListener('click',    () => vscode.postMessage({ type: 'reset' }));
  btnSkip.addEventListener('click',     () => vscode.postMessage({ type: 'skipBreak' }));
  btnMicro.addEventListener('click',    () => vscode.postMessage({ type: 'microBreak' }));
  btnMicroEnd.addEventListener('click', () => vscode.postMessage({ type: 'microBreak' }));
  settingsBtn.addEventListener('click', () => vscode.postMessage({ type: 'openSettings' }));
  soundBtn.addEventListener('click',    () => vscode.postMessage({ type: 'toggleSound' }));

  modeSelect.addEventListener('change', () => {
    vscode.postMessage({ type: 'applyMode', mode: modeSelect.value });
  });

  // Day plan handlers
  planAdd.addEventListener('keydown', e => {
    if (e.key === 'Enter' && planAdd.value.trim()) {
      vscode.postMessage({ type: 'addTask', label: planAdd.value });
      planAdd.value = '';
    }
  });
  laterToggle.addEventListener('click', () => {
    laterExpanded = !laterExpanded;
    planKey = ''; // force re-render
    if (lastSnapshot) {
      renderPlan(lastSnapshot.planTasks || [], lastSnapshot.activeTaskId || null, lastSnapshot.laterTasks || []);
    }
  });
  laterClear.addEventListener('click', () => vscode.postMessage({ type: 'clearOldLater' }));
  intentDone.addEventListener('click', () => {
    if (lastSnapshot && lastSnapshot.activeTaskId) {
      vscode.postMessage({ type: 'toggleTaskDone', id: lastSnapshot.activeTaskId });
    }
  });
  dsTriage.addEventListener('click', () => vscode.postMessage({ type: 'triageOpenTasks' }));

  // Intent input — debounced to avoid firing on every keystroke
  let taskDebounce;
  taskInput.addEventListener('input', () => {
    clearTimeout(taskDebounce);
    taskDebounce = setTimeout(() => {
      vscode.postMessage({ type: 'setTask', label: taskInput.value });
    }, 400);
  });

  // ── Custom timings disclosure ─────────────────────────────────
  function setCustomExpanded(expanded) {
    customExpanded = expanded;
    customSettings.style.display = expanded ? '' : 'none';
    customToggle.setAttribute('aria-expanded', String(expanded));
    customChevron.className = expanded
      ? 'codicon codicon-chevron-down'
      : 'codicon codicon-chevron-right';
  }

  customToggle.addEventListener('click', () => setCustomExpanded(!customExpanded));

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
