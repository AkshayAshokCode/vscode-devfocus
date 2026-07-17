// @ts-nocheck
(function () {
  const history = window.__DEVFOCUS_HISTORY__ || [];
  const grid = document.getElementById('history-grid');
  const totalEl = document.getElementById('history-total');

  function formatFocus(ms) {
    const totalMin = Math.floor(ms / 60000);
    if (totalMin < 60) return `${totalMin}m`;
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  }

  if (history.length === 0) {
    totalEl.textContent = 'No data yet';
    const empty = document.createElement('div');
    empty.id = 'history-empty';
    empty.textContent = 'Complete a session to start building history.';
    grid.appendChild(empty);
    return;
  }

  const byDate = {};
  let maxSessions = 1;
  let totalSessions = 0;
  let totalFocusMs = 0;
  history.forEach(r => {
    byDate[r.date] = r;
    maxSessions = Math.max(maxSessions, r.sessions);
    totalSessions += r.sessions;
    totalFocusMs += r.focusMs;
  });

  totalEl.textContent =
    `${totalSessions} session${totalSessions === 1 ? '' : 's'} · ${formatFocus(totalFocusMs)} focused · since ${history[0].date}`;

  // Walk from the Sunday on/before the first recorded day through today
  const first = new Date(history[0].date + 'T00:00:00Z');
  const today = new Date();
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const days = [];
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  weeks.forEach(week => {
    const col = document.createElement('div');
    col.className = 'history-week';

    const firstOfMonth = week.find(d => d.getUTCDate() === 1);
    if (firstOfMonth) {
      const label = document.createElement('div');
      label.className = 'history-month-label';
      label.textContent = firstOfMonth.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      col.appendChild(label);
    }

    week.forEach(d => {
      const iso = d.toISOString().split('T')[0];
      const rec = byDate[iso];
      const sessions = rec ? rec.sessions : 0;
      const cell = document.createElement('div');
      const level = sessions === 0 ? 0 : Math.min(4, Math.ceil((sessions / maxSessions) * 4));
      cell.className = `history-cell l${level}`;
      const focusText = rec ? formatFocus(rec.focusMs) : '0m';
      const taskText = rec && rec.tasksPlanned ? `, ${rec.tasksDone || 0}/${rec.tasksPlanned} tasks done` : '';
      cell.title = `${iso} — ${sessions} session${sessions === 1 ? '' : 's'}, ${focusText} focused${taskText}`;
      col.appendChild(cell);
    });

    grid.appendChild(col);
  });
})();
