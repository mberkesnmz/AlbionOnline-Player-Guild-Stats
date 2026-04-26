let _searchType   = 'player';
let _searchServer = 'america';
let _eventsCache  = {};

function setSearchType(type, btn) {
  _searchType = type;
  btn.parentElement.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setServer(server, btn) {
  _searchServer = server;
  btn.parentElement.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const box = document.getElementById('search-results');
  box.innerHTML = '<div class="search-loading">Searching…</div>';
  try {
    const data = await fetch(`/api/search?q=${encodeURIComponent(q)}&server=${_searchServer}`).then(r => r.json());
    renderSearchResults(data);
  } catch(e) {
    box.innerHTML = '<div class="search-error">Search failed. Try again.</div>';
  }
}

function renderSearchResults(data) {
  const box   = document.getElementById('search-results');
  const items = _searchType === 'player' ? (data.players ?? []) : (data.guilds ?? []);
  if (!items.length) {
    box.innerHTML = '<div class="search-hint-msg">No results found</div>';
    return;
  }
  const isPlayer = _searchType === 'player';
  const cards = items.slice(0, 20).map(p => {
    const id    = p.Id;
    const name  = p.Name;
    const sub   = isPlayer ? (p.GuildName ?? '') : (p.AllianceName ? `[${p.AllianceName}]` : '');
    const click = isPlayer
      ? `showPlayerDetail('${id}','${name}',this)`
      : `showGuildDetail('${id}','${name}',this)`;
    const icon  = isPlayer ? '⚔️' : '🛡️';
    return `<div class="result-card" onclick="${click}">
      <div class="result-avatar">${icon}</div>
      <div class="result-info">
        <span class="result-name">${name}</span>
        ${sub ? `<span class="result-guild">${sub}</span>` : ''}
        <div class="result-fame">
          <span class="fame-kill">⚔ ${fmtFame(p.KillFame)}</span>
          <span class="fame-death">☠ ${fmtFame(p.DeathFame)}</span>
        </div>
      </div>
    </div>`;
  }).join('');
  box.innerHTML = `<div class="search-section-label" style="margin-top:8px">Results</div><div class="result-list">${cards}</div>`;
}

async function showPlayerDetail(playerId, playerName, cardEl) {
  document.querySelectorAll('.result-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');
  const box = document.getElementById('player-detail');
  box.innerHTML = '<div class="search-loading">⏳ Loading…</div>';
  try {
    const pid  = encodeURIComponent(playerId);
    const [profile, kills, deaths] = await Promise.all([
      fetch(`/api/player/${_searchServer}/${pid}`).then(r => r.json()),
      fetch(`/api/player/${_searchServer}/${pid}/kills`).then(r => r.json()),
      fetch(`/api/player/${_searchServer}/${pid}/deaths`).then(r => r.json()),
    ]);
    _eventsCache = {};
    (kills  ?? []).forEach(ev => { _eventsCache[ev.EventId] = ev; });
    (deaths ?? []).forEach(ev => { _eventsCache[ev.EventId] = ev; });
    renderPlayerDetail(profile, kills, deaths);
  } catch(e) {
    box.innerHTML = '<div class="search-error">Failed to load player details.</div>';
  }
}

async function showGuildDetail(guildId, guildName, cardEl) {
  document.querySelectorAll('.result-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');
  const box = document.getElementById('player-detail');
  box.innerHTML = '<div class="search-loading">⏳ Loading…</div>';
  try {
    const guild = await fetch(`/api/guild/${_searchServer}/${encodeURIComponent(guildId)}`).then(r => r.json());
    renderGuildDetail(guild);
  } catch(e) {
    box.innerHTML = '<div class="search-error">Failed to load guild details.</div>';
  }
}

function renderGuildDetail(g) {
  const box     = document.getElementById('player-detail');
  const founded = g.Founded ? new Date(g.Founded).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  box.innerHTML = `
    <div class="pd-header">
      <div class="pd-avatar">🛡️</div>
      <div>
        <div class="pd-name">${g.Name}</div>
        ${g.AllianceName ? `<div class="pd-guild">🤝 ${g.AllianceName}${g.AllianceTag ? ` [${g.AllianceTag}]` : ''}</div>` : '<div class="pd-guild">No Alliance</div>'}
      </div>
    </div>
    <div class="pd-fame-row">
      <div class="pd-fame-box kill"><div class="label">⚔️ Kill Fame</div><div class="value">${fmtFame(g.killFame ?? g.KillFame)}</div></div>
      <div class="pd-fame-box death"><div class="label">💀 Death Fame</div><div class="value">${fmtFame(g.DeathFame ?? g.deathFame)}</div></div>
      <div class="pd-fame-box"><div class="label">👥 Members</div><div class="value">${g.MemberCount ?? '—'}</div></div>
    </div>
    <div class="pd-section">
      <div class="pd-section-title">🏰 Guild Info</div>
      <div class="pd-stats-grid">
        <div class="pd-stat-box"><div class="label">Founder</div><div class="value">${g.FounderName ?? '—'}</div></div>
        <div class="pd-stat-box"><div class="label">Founded</div><div class="value">${founded}</div></div>
        <div class="pd-stat-box"><div class="label">Alliance</div><div class="value">${g.AllianceName || '—'}</div></div>
        <div class="pd-stat-box"><div class="label">Members</div><div class="value">${g.MemberCount ?? '—'}</div></div>
        ${g.AttacksWon  != null ? `<div class="pd-stat-box"><div class="label">Attacks Won</div><div class="value">${g.AttacksWon}</div></div>`  : ''}
        ${g.DefensesWon != null ? `<div class="pd-stat-box"><div class="label">Defenses Won</div><div class="value">${g.DefensesWon}</div></div>` : ''}
      </div>
    </div>`;
}

function renderPlayerDetail(p, kills, deaths) {
  const box  = document.getElementById('player-detail');
  const ls   = p.LifetimeStatistics ?? {};
  const guild = p.GuildName ? (p.AllianceName ? `${p.GuildName} [${p.AllianceName}]` : p.GuildName) : 'No Guild';
  const gatherTotal = ls.Gathering?.All?.Total ?? ls.Gathering?.All ?? 0;

  const evRow = (ev, isKill) => {
    const other  = isKill ? (ev.Victim ?? {}) : (ev.Killer ?? {});
    const date   = new Date(ev.TimeStamp).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
    const fame   = fmtFame(ev.TotalVictimKillFame);
    const g      = other.GuildName ? `<span class="pd-event-guild">${other.GuildName}</span>` : '';
    const cls    = isKill ? '' : 'pd-event-death';
    const prefix = isKill ? '' : 'by ';
    const fameVal = isKill
      ? `<span class="pd-event-fame">+${fame}</span>`
      : `<span class="pd-event-fame">-${fame}</span>`;
    return `<div class="pd-event ${cls}" onclick="openEventModal(${ev.EventId})">
      <span class="pd-event-name">${prefix}${other.Name ?? '—'}</span>${g}
      <span class="pd-event-date">${date}</span>${fameVal}
    </div>`;
  };

  const killRows  = (kills  ?? []).slice(0,10).map(ev => evRow(ev, true)).join('')
    || '<div class="search-hint-msg" style="padding:10px 0;font-size:12px">No recent kills</div>';
  const deathRows = (deaths ?? []).slice(0,10).map(ev => evRow(ev, false)).join('')
    || '<div class="search-hint-msg" style="padding:10px 0;font-size:12px">No recent deaths</div>';

  box.innerHTML = `
    <div class="pd-header">
      <div class="pd-avatar">⚔️</div>
      <div>
        <div class="pd-name">${p.Name}</div>
        <div class="pd-guild">🛡️ ${guild}</div>
      </div>
    </div>
    <div class="pd-fame-row">
      <div class="pd-fame-box kill"><div class="label">⚔️ Kill Fame</div><div class="value">${fmtFame(p.KillFame)}</div></div>
      <div class="pd-fame-box death"><div class="label">💀 Death Fame</div><div class="value">${fmtFame(p.DeathFame)}</div></div>
      <div class="pd-fame-box"><div class="label">⚖️ Ratio</div><div class="value">${(p.FameRatio ?? 0).toFixed(2)}</div></div>
    </div>
    ${ls.PvE ? `
    <div class="pd-section">
      <div class="pd-section-title">📊 Lifetime Stats</div>
      <div class="pd-stats-grid">
        <div class="pd-stat-box"><div class="label">PvE Total</div><div class="value">${fmtFame(ls.PvE.Total)}</div></div>
        <div class="pd-stat-box"><div class="label">PvE Outlands</div><div class="value">${fmtFame(ls.PvE.Outlands)}</div></div>
        <div class="pd-stat-box"><div class="label">Crafting</div><div class="value">${fmtFame(ls.Crafting?.Total)}</div></div>
        <div class="pd-stat-box"><div class="label">Gathering</div><div class="value">${fmtFame(gatherTotal)}</div></div>
        <div class="pd-stat-box"><div class="label">Fishing</div><div class="value">${fmtFame(ls.FishingFame)}</div></div>
        <div class="pd-stat-box"><div class="label">Farming</div><div class="value">${fmtFame(ls.FarmingFame)}</div></div>
      </div>
    </div>` : ''}
    <div class="pd-section">
      <div class="pd-section-title">⚔️ Recent Kills</div>
      <div class="pd-event-list">${killRows}</div>
    </div>
    <div class="pd-section">
      <div class="pd-section-title">💀 Recent Deaths</div>
      <div class="pd-event-list">${deathRows}</div>
    </div>`;
}

function openEventModal(eventId) {
  const ev = _eventsCache[eventId];
  if (!ev) return;
  const killer = ev.Killer ?? {};
  const victim = ev.Victim ?? {};
  const date   = new Date(ev.TimeStamp).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const parts  = (ev.Participants ?? []).filter(p => p.Name !== killer.Name).slice(0,12);

  document.getElementById('event-modal-title').textContent = '⚔️ Kill Event';
  document.getElementById('event-modal-body').innerHTML = `
    <div class="event-meta">
      <span class="event-meta-chip">🕐 ${date}</span>
      <span class="event-meta-chip fame">+${fmtFame(ev.TotalVictimKillFame)} fame</span>
      ${ev.NumberOfParticipants > 1 ? `<span class="event-meta-chip">👥 ${ev.NumberOfParticipants} participants</span>` : ''}
    </div>
    <div class="event-combatants">
      <div class="event-combatant killer">
        <div class="ec-role kill">⚔️ Killer</div>
        <div class="ec-name">${killer.Name ?? '—'}</div>
        <div class="ec-guild">${killer.GuildName ?? ''}${killer.AllianceName ? ` [${killer.AllianceName}]` : ''}</div>
        ${killer.AverageItemPower ? `<div class="ec-ip">⚡ ${Math.round(killer.AverageItemPower)} IP</div>` : ''}
      </div>
      <div class="event-combatant victim">
        <div class="ec-role die">💀 Victim</div>
        <div class="ec-name">${victim.Name ?? '—'}</div>
        <div class="ec-guild">${victim.GuildName ?? ''}${victim.AllianceName ? ` [${victim.AllianceName}]` : ''}</div>
        ${victim.AverageItemPower ? `<div class="ec-ip">⚡ ${Math.round(victim.AverageItemPower)} IP</div>` : ''}
      </div>
    </div>
    ${parts.length ? `<div class="event-participants">
      <div class="event-participants-label">👥 Other participants</div>
      <div class="event-participants-list">${parts.map(p => `<span class="ep-tag">${p.Name}</span>`).join('')}</div>
    </div>` : ''}`;
  document.getElementById('event-modal').classList.add('open');
}

function closeEventModal() {
  document.getElementById('event-modal').classList.remove('open');
}

function fmtFame(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
