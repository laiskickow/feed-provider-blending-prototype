/* ============================================================
   APP — Feed Provider Blending & Integration Platform (prototype)
   Vanilla JS, no build step. All writes are in-memory only.
   ============================================================ */

const ICONS = {
  chevron:  `<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>`,
  check:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>`,
  x:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  edit:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  trash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6h12z"/></svg>`,
  history:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4L10 14M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>`,
  alert:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  info:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  more:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>`,
  search:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
};

function relTime(iso){
  const d = new Date(iso); const diffMs = now - d; const abs = Math.abs(diffMs);
  const mins = Math.round(abs/60000), hrs = Math.round(abs/3600000), days = Math.round(abs/86400000);
  let s;
  if (mins < 60) s = `${mins}m`; else if (hrs < 24) s = `${hrs}h`; else s = `${days}d`;
  return diffMs >= 0 ? `${s} ago` : `in ${s}`;
}
function fmtDate(d){ return new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
function fmtMoney(n){ return '£' + n.toLocaleString('en-GB',{maximumFractionDigits:0}); }
function fmtNum(n){ return n.toLocaleString('en-GB'); }
function providerChip(id, opts={}){
  if (!id) return `<span class="provider-chip inherited">Not set</span>`;
  const p = providerById(id); if(!p) return '';
  const cls = opts.override ? 'provider-chip override' : (opts.inherited ? 'provider-chip inherited' : 'provider-chip');
  return `<span class="${cls}"><span class="swatch" style="background:${p.color}"></span>${p.name}${opts.suffix?` · ${opts.suffix}`:''}</span>`;
}
function statusBadge(status){
  return status === 'in-play'
    ? `<span class="badge badge-red"><span class="dot"></span>In-Play</span>`
    : `<span class="badge badge-blue"><span class="dot"></span>Pre-Match</span>`;
}
function healthBadge(status){
  const map = { operational:['badge-green','Operational'], degraded:['badge-yellow','Degraded'], down:['badge-red','Down'] };
  const [cls,label] = map[status];
  return `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
}
function toast(kind, title, body, ms=4200){
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `<div style="flex:1;"><strong>${title}</strong><p>${body||''}</p></div><span class="toast-close">${ICONS.x}</span>`;
  el.querySelector('.toast-close').onclick = () => el.remove();
  stack.appendChild(el);
  setTimeout(()=>el.remove(), ms);
}
function openOverlay(id){ document.getElementById(id).classList.add('open'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>closeOverlay(el.dataset.close));
document.querySelectorAll('.overlay').forEach(ov=>ov.addEventListener('click', e=>{ if(e.target===ov) closeOverlay(ov.id); }));
function openDrawer(id){ document.getElementById(id).classList.add('open'); }
function closeDrawer(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close-drawer]').forEach(el=>el.onclick=()=>closeDrawer(el.dataset.closeDrawer));

function logAudit(area, action, detail){
  AUDIT_LOG.unshift({ ts:new Date().toISOString(), user:'m.tato', area, action, detail });
  if (document.getElementById('view-audit-log').classList.contains('active')) renderAuditLog();
}
function refreshMappingCounts(){
  document.getElementById('unmapped-count').textContent = UNMAPPED_ITEMS.length;
  document.getElementById('mapping-nav-badge').textContent = UNMAPPED_ITEMS.length;
  document.getElementById('unmapped-tab-badge').textContent = UNMAPPED_ITEMS.length;
  const notif = document.getElementById('notif-btn');
  if (UNMAPPED_ITEMS.length === 0){ notif.querySelector('.badge-count').style.display='none'; } else { notif.querySelector('.badge-count').style.display='flex'; }
}

/* ============================================================
   NAV / VIEW SWITCHING
   ============================================================ */
const VIEW_LABELS = {
  'blending-config':'Blending Configuration', 'event-overrides':'Event Overrides',
  'automation':'Automation & Blending', 'analytics':'Provider Analytics',
  'mappings':'Provider Mappings', 'audit-log':'Audit Log'
};
document.querySelectorAll('.nav-item[data-view]').forEach(item=>{
  item.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    item.classList.add('active');
    const view = item.dataset.view;
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+view).classList.add('active');
    document.getElementById('ai-context').textContent = 'Context: ' + VIEW_LABELS[view];
    if (view === 'audit-log') renderAuditLog();
  });
});
document.querySelectorAll('.tabs').forEach(tabbar=>{
  tabbar.querySelectorAll('.tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabbar.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const panelWrap = tabbar.parentElement;
      panelWrap.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      panelWrap.querySelector('#tab-'+tab.dataset.tab).classList.add('active');
    });
  });
});

/* Theme toggle */
document.getElementById('theme-toggle').addEventListener('click', ()=>{
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  renderRevenueChart(); renderBetsChart(); // re-render svg charts w/ theme-aware colors
});

document.getElementById('notif-btn').addEventListener('click', ()=>{
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelector('.nav-item[data-view="mappings"]').classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-mappings').classList.add('active');
});

/* ============================================================
   LEVEL 1 — BLENDING CONFIGURATION (hierarchy tree)
   ============================================================ */
const pendingHierarchy = {}; // key -> providerId|null
const openTreeNodes = new Set(); // persists expand/collapse state across re-renders

function effectiveMatchTypeProvider(sport, comp, matchType){
  const key = `${comp.id}:${matchType}`;
  if (key in pendingHierarchy) return { value:pendingHierarchy[key], source:'pending' };
  if (MATCHTYPE_DEFAULTS[key]) return { value:MATCHTYPE_DEFAULTS[key], source:'own' };
  const compKey = `comp:${comp.id}`;
  const compProvider = (compKey in pendingHierarchy) ? pendingHierarchy[compKey] : comp.defaultProvider;
  if (compProvider) return { value:compProvider, source:'competition' };
  const sportKey = `sport:${sport.id}`;
  const sportProvider = (sportKey in pendingHierarchy) ? pendingHierarchy[sportKey] : sport.defaultProvider;
  return { value:sportProvider, source:'sport' };
}
function effectiveCompProvider(sport, comp){
  const compKey = `comp:${comp.id}`;
  if (compKey in pendingHierarchy) return { value:pendingHierarchy[compKey], source:'pending' };
  if (comp.defaultProvider) return { value:comp.defaultProvider, source:'own' };
  const sportKey = `sport:${sport.id}`;
  const sportProvider = (sportKey in pendingHierarchy) ? pendingHierarchy[sportKey] : sport.defaultProvider;
  return { value:sportProvider, source:'sport' };
}

function providerOptions(selectedId, includeInherit, inheritLabel){
  let html = includeInherit ? `<option value="">${inheritLabel}</option>` : '';
  PROVIDERS.forEach(p=>{ html += `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.name}</option>`; });
  return html;
}

function renderHierarchyTree(){
  const root = document.getElementById('hierarchy-tree');
  root.innerHTML = SPORTS.map(sport=>{
    const sportKey = `sport:${sport.id}`;
    const sportVal = (sportKey in pendingHierarchy) ? pendingHierarchy[sportKey] : sport.defaultProvider;
    const isPending = sportKey in pendingHierarchy;
    const sportOpen = openTreeNodes.has('sport-'+sport.id);
    return `
    <div class="tree-node" data-sport="${sport.id}">
      <div class="tree-row ${sportOpen?'open':''}" data-toggle="sport-${sport.id}" style="${isPending?'background:var(--bg-warning);':''}">
        ${ICONS.chevron}
        <span class="name">${sport.name}</span>
        <span class="count">${sport.competitions.length} competitions</span>
        <div class="tree-row__meta" onclick="event.stopPropagation()">
          <select class="select input-sm" style="width:150px;" onchange="onHierarchyChange('${sportKey}', this.value)">
            ${providerOptions(sportVal, false, '')}
          </select>
          ${isPending?'<span class="badge badge-yellow">unsaved</span>':''}
        </div>
      </div>
      <div class="tree-children tree-lvl2 ${sportOpen?'open':''}" id="sport-${sport.id}">
        ${sport.competitions.map(comp=>{
          const compKey = `comp:${comp.id}`;
          const eff = effectiveCompProvider(sport, comp);
          const isPendingComp = compKey in pendingHierarchy;
          const mapped = isMapped(eff.value, comp.id);
          const compOpen = openTreeNodes.has('comp-'+comp.id);
          return `
          <div class="tree-node" data-comp="${comp.id}">
            <div class="tree-row ${compOpen?'open':''}" data-toggle="comp-${comp.id}" style="${isPendingComp?'background:var(--bg-warning);':''}">
              ${ICONS.chevron}
              <span class="name">${comp.name}</span>
              <span class="count">${comp.events} events</span>
              <div class="tree-row__meta" onclick="event.stopPropagation()">
                ${!mapped?`<span title="Provider not mapped to GTH for this competition">${ICONS.alert.replace('<svg ', '<svg style="width:14px;height:14px;color:var(--fg-error)" ')}</span>`:''}
                <select class="select input-sm" style="width:170px;" onchange="onHierarchyChange('${compKey}', this.value)">
                  ${providerOptions(compKey in pendingHierarchy ? pendingHierarchy[compKey] : comp.defaultProvider, true, `Inherit from ${sport.name} (${providerById(sportVal)?.name||'none'})`)}
                </select>
                ${isPendingComp?'<span class="badge badge-yellow">unsaved</span>':''}
              </div>
            </div>
            <div class="tree-children tree-lvl3 ${compOpen?'open':''}" id="comp-${comp.id}">
              ${['prematch','inplay'].map(mt=>{
                const key = `${comp.id}:${mt}`;
                const label = mt==='prematch' ? 'Pre-Match' : 'In-Play';
                const eff2 = effectiveMatchTypeProvider(sport, comp, mt);
                const isPendingMt = key in pendingHierarchy;
                const mtMapped = isMapped(eff2.value, comp.id, mt);
                const inheritedName = eff2.source !== 'own' && eff2.source !== 'pending' ? (providerById(eff.value)?.name || providerById(sportVal)?.name || 'none') : null;
                return `
                <div class="tree-row" style="${isPendingMt?'background:var(--bg-warning);':''}">
                  <span style="width:12px;"></span>
                  <span class="name" style="font-weight:500;">${label}</span>
                  <div class="tree-row__meta">
                    ${!mtMapped?`<span title="Provider not mapped to GTH">${ICONS.alert.replace('<svg ', '<svg style="width:13px;height:13px;color:var(--fg-error)" ')}</span>`:''}
                    <select class="select input-sm" style="width:190px;" onchange="onHierarchyChange('${key}', this.value)">
                      ${providerOptions(key in pendingHierarchy ? pendingHierarchy[key] : (MATCHTYPE_DEFAULTS[key]||''), true, `Inherit (${providerById(eff2.value)?.name || 'none'})`)}
                    </select>
                    ${isPendingMt?'<span class="badge badge-yellow">unsaved</span>':''}
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  root.querySelectorAll('[data-toggle]').forEach(row=>{
    row.addEventListener('click', ()=>{
      const id = row.dataset.toggle;
      if (openTreeNodes.has(id)) openTreeNodes.delete(id); else openTreeNodes.add(id);
      row.classList.toggle('open');
      document.getElementById(id).classList.toggle('open');
    });
  });
  updatePendingBar();
}

function onHierarchyChange(key, value){
  pendingHierarchy[key] = value || null;
  renderHierarchyTree();
}
function updatePendingBar(){
  const n = Object.keys(pendingHierarchy).length;
  document.getElementById('bc-save').disabled = n===0;
  document.getElementById('bc-pending-alert').style.display = n>0 ? 'block' : 'none';
  document.getElementById('bc-pending-count').textContent = ` ${n}`;
}
document.getElementById('bc-expand-all').addEventListener('click', ()=>{
  SPORTS.forEach(s=>{ openTreeNodes.add('sport-'+s.id); s.competitions.forEach(c=>openTreeNodes.add('comp-'+c.id)); });
  renderHierarchyTree();
});

document.getElementById('bc-save').addEventListener('click', ()=>{
  // validate every pending change against GTH mapping
  const unmapped = [];
  Object.entries(pendingHierarchy).forEach(([key, providerId])=>{
    if (!providerId) return;
    if (key.startsWith('sport:')){
      const sportId = key.split(':')[1];
      // sport-level: check across all its competitions for a representative unmapped signal
      const sport = SPORTS.find(s=>s.id===sportId);
      sport.competitions.forEach(c=>{ if(!isMapped(providerId, c.id)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${sport.name} → ${c.name}`}); });
    } else if (key.startsWith('comp:')){
      const compId = key.split(':')[1];
      const comp = SPORTS.flatMap(s=>s.competitions).find(c=>c.id===compId);
      if (!isMapped(providerId, compId)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${comp.name}`});
    } else {
      const [compId, mt] = key.split(':');
      const comp = SPORTS.flatMap(s=>s.competitions).find(c=>c.id===compId);
      if (!isMapped(providerId, compId, mt)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${comp.name} → ${mt==='prematch'?'Pre-Match':'In-Play'}`});
    }
  });
  if (unmapped.length){
    document.getElementById('validation-unmapped-items').innerHTML = unmapped.map(u=>`
      <div class="alert alert-warning" style="margin-bottom:8px;">
        ${ICONS.alert} <div><strong>${u.path}</strong>No confirmed mapping to internal GTH hierarchy.</div>
      </div>`).join('');
    openOverlay('overlay-validation');
    return;
  }
  const count = Object.keys(pendingHierarchy).length;
  Object.entries(pendingHierarchy).forEach(([key,val])=>{
    logAudit('Level 1 — Blending Config', 'Default provider changed', `${key} → ${val?providerById(val).name:'(inherit)'}`);
    if (key.startsWith('sport:')){
      SPORTS.find(s=>s.id===key.split(':')[1]).defaultProvider = val;
    } else if (key.startsWith('comp:')){
      SPORTS.flatMap(s=>s.competitions).find(c=>c.id===key.split(':')[1]).defaultProvider = val;
    } else if (val){
      MATCHTYPE_DEFAULTS[key] = val;
    } else {
      delete MATCHTYPE_DEFAULTS[key];
    }
  });
  Object.keys(pendingHierarchy).forEach(k=>delete pendingHierarchy[k]);
  renderHierarchyTree();
  toast('success', 'Configuration saved', `${count} level(s) updated. New events under these nodes will auto-assign to the selected provider.`);
});
document.getElementById('validation-goto-mappings').addEventListener('click', ()=>{
  closeOverlay('overlay-validation');
  document.querySelector('.nav-item[data-view="mappings"]').click();
});

/* ============================================================
   LEVEL 2 — EVENT OVERRIDES
   ============================================================ */
let selectedEvents = new Set();

function populateEventFilters(){
  const sportSel = document.getElementById('eo-filter-sport');
  SPORTS.forEach(s=> sportSel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
  sportSel.addEventListener('change', ()=>{
    const compSel = document.getElementById('eo-filter-competition');
    compSel.innerHTML = '<option value="">All competitions</option>';
    const sport = SPORTS.find(s=>s.id===sportSel.value);
    if (sport) sport.competitions.forEach(c=> compSel.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    renderEventsTable();
  });
  ['eo-filter-competition','eo-filter-status','eo-filter-range','eo-filter-override'].forEach(id=>{
    document.getElementById(id).addEventListener('change', renderEventsTable);
  });
}

function filteredEvents(){
  const sport = document.getElementById('eo-filter-sport').value;
  const comp = document.getElementById('eo-filter-competition').value;
  const status = document.getElementById('eo-filter-status').value;
  const range = document.getElementById('eo-filter-range').value;
  const hasOverride = document.getElementById('eo-filter-override').value;
  return EVENTS.filter(e=>{
    if (sport && e.sport !== sport) return false;
    if (comp && e.competition !== comp) return false;
    if (status && e.status !== status) return false;
    if (range !== 'custom'){
      const maxH = parseInt(range,10)*24;
      const diffH = (e.start - now)/3600000;
      if (diffH > maxH || diffH < -6) return false;
    }
    if (hasOverride === 'yes' && !e.override) return false;
    if (hasOverride === 'no' && e.override) return false;
    return true;
  }).sort((a,b)=>a.start-b.start);
}

function competitionName(id){ return SPORTS.flatMap(s=>s.competitions).find(c=>c.id===id)?.name || id; }

function renderEventsTable(){
  const rows = filteredEvents();
  document.getElementById('eo-result-count').textContent = `${rows.length} event${rows.length!==1?'s':''}`;
  document.getElementById('events-tbody').innerHTML = rows.map(e=>{
    const preOverridden = e.override && e.override.type==='pre-match';
    const inOverridden = e.override && e.override.type==='in-play';
    return `
    <tr data-evt="${e.id}" class="${selectedEvents.has(e.id)?'selected':''}">
      <td><div class="checkbox ${selectedEvents.has(e.id)?'checked':''}" onclick="toggleEventSelect('${e.id}')">${selectedEvents.has(e.id)?ICONS.check:''}</div></td>
      <td><strong>${e.name}</strong><br><span class="mono">${e.id}</span></td>
      <td>${competitionName(e.competition)}</td>
      <td>${fmtDate(e.start)}<br><span class="muted" style="font-size:11px;">${relTime(e.start)}</span></td>
      <td>${statusBadge(e.status)}</td>
      <td>${providerChip(e.preMatchProvider, {override:preOverridden})}</td>
      <td>${providerChip(e.inPlayProvider, {override:inOverridden})}</td>
      <td><span class="icon-btn" style="width:24px;height:24px;" onclick="openOverrideDrawer('${e.id}')">${ICONS.more}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="8"><div class="empty-state">No events match these filters.</div></td></tr>`;
}
function toggleEventSelect(id){
  if (selectedEvents.has(id)) selectedEvents.delete(id); else selectedEvents.add(id);
  renderEventsTable();
  const bar = document.getElementById('eo-bulk-bar');
  bar.style.display = selectedEvents.size>0 ? 'flex' : 'none';
  document.getElementById('eo-selected-count').textContent = `${selectedEvents.size} selected`;
}
document.getElementById('eo-bulk-clear').addEventListener('click', ()=>{ selectedEvents.clear(); renderEventsTable(); document.getElementById('eo-bulk-bar').style.display='none'; });

function openOverrideDrawer(eventId, bulkIds){
  const isBulk = Array.isArray(bulkIds) && bulkIds.length>1;
  const e = isBulk ? null : EVENTS.find(ev=>ev.id===eventId);
  document.getElementById('override-drawer-title').textContent = isBulk ? `Bulk override — ${bulkIds.length} events` : `Override — ${e.name}`;
  document.getElementById('override-drawer-subtitle').textContent = isBulk ? 'Applies the selected provider(s) to every selected event.' : `${e.id} · ${competitionName(e.competition)}`;
  document.getElementById('override-drawer-body').innerHTML = `
    <div class="field">
      <label>Pre-Match provider</label>
      <select class="select" id="ov-prematch">
        <option value="">Use default (no override)</option>
        ${PROVIDERS.map(p=>`<option value="${p.id}" ${!isBulk && e.preMatchProvider===p.id && e.override?.type==='pre-match' ?'selected':''}>${p.name}</option>`).join('')}
      </select>
      <div class="hint" id="ov-prematch-hint"></div>
    </div>
    <div class="field">
      <label>In-Play provider</label>
      <select class="select" id="ov-inplay">
        <option value="">Use default (no override)</option>
        ${PROVIDERS.map(p=>`<option value="${p.id}" ${!isBulk && e.inPlayProvider===p.id && e.override?.type==='in-play' ?'selected':''}>${p.name}</option>`).join('')}
      </select>
      <div class="hint" id="ov-inplay-hint"></div>
    </div>
    ${!isBulk && e.override ? `<div class="alert alert-info"><span>${ICONS.info}</span><div><strong>Existing override</strong>${e.override.type==='pre-match'?'Pre-Match':'In-Play'} → ${providerById(e.override.provider).name}, applied ${fmtDate(e.override.at)} by ${e.override.by}.</div></div>` : ''}
  `;
  const checkConflict = (selectId, hintId, compId, mt) => {
    document.getElementById(selectId).addEventListener('change', function(){
      const val = this.value;
      const hint = document.getElementById(hintId);
      if (val && !isMapped(val, compId, mt)){
        hint.innerHTML = `<span style="color:var(--fg-error);">${providerById(val).name} isn't mapped to this competition yet — override will be flagged as a conflict.</span>`;
      } else hint.textContent = '';
    });
  };
  if (!isBulk){ checkConflict('ov-prematch','ov-prematch-hint', e.competition, 'prematch'); checkConflict('ov-inplay','ov-inplay-hint', e.competition, 'inplay'); }

  document.getElementById('override-apply').onclick = () => {
    const pre = document.getElementById('ov-prematch').value;
    const inp = document.getElementById('ov-inplay').value;
    const targets = isBulk ? bulkIds.map(id=>EVENTS.find(ev=>ev.id===id)) : [e];
    targets.forEach(ev=>{
      if (pre){ ev.preMatchProvider = pre; ev.override = {type:'pre-match', provider:pre, at:new Date().toISOString(), by:'m.tato'}; logAudit('Level 2 — Event Overrides','Override applied',`${ev.id}: Pre-Match → ${providerById(pre).name}`); }
      if (inp){ ev.inPlayProvider = inp; ev.override = {type:'in-play', provider:inp, at:new Date().toISOString(), by:'m.tato'}; logAudit('Level 2 — Event Overrides','Override applied',`${ev.id}: In-Play → ${providerById(inp).name}`); }
    });
    closeDrawer('drawer-override');
    renderEventsTable();
    toast('success', isBulk ? 'Bulk override applied' : 'Override applied', isBulk?`${bulkIds.length} events updated.`:`${e.name} updated.`);
    if (isBulk){ selectedEvents.clear(); document.getElementById('eo-bulk-bar').style.display='none'; }
  };
  openDrawer('drawer-override');
}
document.getElementById('eo-bulk-override').addEventListener('click', ()=> openOverrideDrawer(null, Array.from(selectedEvents)));

/* ============================================================
   LEVEL 3 — AUTOMATION & BLENDING
   ============================================================ */
function renderBlendingRules(){
  document.getElementById('blending-rules-list').innerHTML = BLENDING_RULES.map(r=>`
    <div class="card card-pad" style="margin-bottom:10px;">
      <div class="flex-between">
        <div class="flex-gap-2">
          <strong style="font-size:13px;">${SPORTS.find(s=>s.id===r.sport)?.name} → ${r.competition}</strong>
        </div>
        <div>${providerChip(r.default, {suffix:'default'})}</div>
      </div>
      ${r.blend.length ? r.blend.map(b=>`
        <div class="flex-gap-2" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-subtle);">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--fg-muted);"><path d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/></svg>
          ${providerChip(b.provider)}
          <span class="badge badge-gray">${b.scope}</span>
          <span class="muted" style="font-size:12px;">${b.reason}</span>
        </div>`).join('') : `<div class="muted" style="font-size:12px;margin-top:6px;">No active blending — default provider covers 100% of assigned content.</div>`}
    </div>
  `).join('');
}
function renderProviderHealth(){
  document.getElementById('provider-health-cards').innerHTML = PROVIDERS.map(p=>{
    const h = PROVIDER_HEALTH[p.id];
    return `<div class="card card-pad">
      <div class="flex-between"><strong style="font-size:13px;">${p.name}</strong>${healthBadge(h.status)}</div>
      <div class="kpi__value" style="font-size:20px;margin-top:10px;">${h.uptime30d}%</div>
      <div class="kpi__sub">uptime, last 30 days</div>
    </div>`;
  }).join('');
  document.getElementById('alerts-timeline').innerHTML = ALERTS.slice().sort((a,b)=>new Date(b.ts)-new Date(a.ts)).map(a=>{
    const typeMap = { outage:['badge-red','Outage triggered'], fallback:['badge-blue','Fallback activated'], recovered:['badge-green','Provider recovered'], degraded:['badge-yellow','Degraded'], 'gap-fill':['badge-blue','Gap coverage'] };
    const [cls,label] = typeMap[a.type];
    return `<div class="flex-gap-3" style="padding:10px 14px;border-bottom:1px solid var(--border-subtle);align-items:flex-start;">
      <span class="badge ${cls}" style="flex:none;margin-top:2px;">${label}</span>
      <div style="flex:1;">
        <div style="font-size:12px;">${a.text}</div>
        <div class="muted" style="font-size:11px;margin-top:2px;">${providerById(a.provider).name} · ${fmtDate(a.ts)} · ${relTime(a.ts)}</div>
      </div>
    </div>`;
  }).join('');
}
function gaugeSvg(pct, color){
  const r=26, c=2*Math.PI*r, off = c*(1-pct/100);
  return `<svg width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--bg-muted)" stroke-width="6"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
  </svg>`;
}
function renderCoverage(){
  document.getElementById('coverage-gauges').innerHTML = COVERAGE.map(c=>{
    const p = providerById(c.provider);
    return `<div style="text-align:center;">
      <div class="gauge">${gaugeSvg(c.pct, p.color)}<div class="gauge__label">${c.pct}%</div></div>
      <div style="font-size:12px;font-weight:600;margin-top:6px;">${p.name}</div>
      <div class="muted" style="font-size:11px;">${c.servedEvents}/${c.assignedEvents} events</div>
    </div>`;
  }).join('');
  document.getElementById('coverage-gaps-list').innerHTML = COVERAGE_GAPS.map(g=>`
    <div class="alert alert-${g.severity==='error'?'error':'warning'}" style="margin-bottom:8px;">
      ${ICONS.alert}<div><strong>${g.sport} — ${g.competition}</strong>${g.issue}</div>
    </div>`).join('') || `<div class="empty-state">No coverage gaps detected.</div>`;
}

/* ============================================================
   PROVIDER MAPPINGS (GTH)
   ============================================================ */
function gthFlatList(){
  const list = [];
  SPORTS.forEach(s=>{
    list.push(s.name);
    s.competitions.forEach(c=>{ list.push(`${s.name} → ${c.name}`); list.push(`${s.name} → ${c.name} → Pre-Match`); list.push(`${s.name} → ${c.name} → In-Play`); });
  });
  return list;
}
function renderUnmapped(){
  const wrap = document.getElementById('unmapped-list');
  if (!UNMAPPED_ITEMS.length){ wrap.innerHTML = `<div class="empty-state">${ICONS.check.replace('<svg ','<svg style="width:32px;height:32px;" ')}<div>All provider hierarchy items are mapped.</div></div>`; return; }
  wrap.innerHTML = UNMAPPED_ITEMS.map(u=>`
    <div class="card card-pad" style="margin-bottom:10px;" data-unmapped="${u.id}">
      <div class="flex-between">
        <div>
          <span class="badge badge-gray">${providerById(u.provider).name}</span>
          <div style="margin-top:6px;font-size:13px;font-weight:600;">${u.path}</div>
        </div>
      </div>
      ${u.suggestedGTH ? `
      <div class="flex-gap-3" style="margin-top:12px;background:var(--bg-info);border:1px solid var(--border-info);border-radius:6px;padding:10px 12px;">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:600;color:var(--blue-fg);margin-bottom:3px;">AI SUGGESTION</div>
          <div style="font-size:13px;">${u.suggestedGTH}</div>
          <div class="flex-gap-2" style="margin-top:6px;">
            <div class="confidence-bar"><div class="confidence-bar__fill" style="width:${u.confidence}%;background:${u.confidence>=85?'var(--green-solid)':'var(--yellow-solid)'};"></div></div>
            <span style="font-size:11px;font-weight:600;">${u.confidence}% confidence</span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="acceptSuggestion('${u.id}')">Accept</button>
      </div>` : `<div class="alert alert-warning" style="margin-top:12px;">${ICONS.alert}<div>No confident AI match found — search manually.</div></div>`}
      <div class="flex-gap-2" style="margin-top:10px;">
        <button class="btn btn-secondary btn-sm" onclick="openGthSearch('${u.id}')">Search GTH manually</button>
        <button class="btn btn-tertiary btn-sm" onclick="openReject('${u.id}')">Reject (Do Not Map)</button>
      </div>
    </div>
  `).join('');
}
function acceptSuggestion(id){
  const idx = UNMAPPED_ITEMS.findIndex(u=>u.id===id);
  const u = UNMAPPED_ITEMS[idx];
  ACTIVE_MAPPINGS.unshift({ provider:u.provider, providerPath:u.path, gthPath:u.suggestedGTH, updated:new Date().toISOString().slice(0,10), by:'m.tato' });
  UNMAPPED_ITEMS.splice(idx,1);
  markMapped(u);
  logAudit('Provider Mappings','Mapping confirmed',`${u.path} mapped to ${u.suggestedGTH} (AI suggested, accepted)`);
  renderUnmapped(); renderActiveMappings(); refreshMappingCounts(); renderHierarchyTree(); renderEventsTable();
  toast('success','Mapping confirmed', `${u.path} → ${u.suggestedGTH}`);
}
let rejectTargetId = null;
function openReject(id){ rejectTargetId = id; document.getElementById('reject-other-field').style.display='none'; document.getElementById('reject-reason').value='Deprecated'; openOverlay('overlay-reject'); }
document.getElementById('reject-reason').addEventListener('change', function(){ document.getElementById('reject-other-field').style.display = this.value==='Other'?'block':'none'; });
document.getElementById('reject-confirm').addEventListener('click', ()=>{
  const idx = UNMAPPED_ITEMS.findIndex(u=>u.id===rejectTargetId);
  if (idx<0) return closeOverlay('overlay-reject');
  const u = UNMAPPED_ITEMS[idx];
  const reason = document.getElementById('reject-reason').value;
  REJECTED_MAPPINGS.unshift({ provider:u.provider, providerPath:u.path, reason, by:'m.tato', at:new Date().toISOString().slice(0,10) });
  UNMAPPED_ITEMS.splice(idx,1);
  logAudit('Provider Mappings','Mapping rejected',`${u.path} marked Do Not Map (${reason})`);
  closeOverlay('overlay-reject');
  renderUnmapped(); renderRejectedMappings(); refreshMappingCounts();
  toast('default','Marked as Do Not Map', u.path);
});
let gthSearchTargetId = null;
function openGthSearch(id){
  gthSearchTargetId = id;
  const u = UNMAPPED_ITEMS.find(x=>x.id===id) || {path:'this item'};
  document.getElementById('search-gth-subtitle').textContent = `Mapping: ${u.path}`;
  document.getElementById('gth-search-input').value='';
  renderGthResults('');
  openOverlay('overlay-search-gth');
}
function renderGthResults(query){
  const results = gthFlatList().filter(g=>g.toLowerCase().includes(query.toLowerCase())).slice(0,8);
  document.getElementById('gth-search-results').innerHTML = results.map(r=>`
    <div class="flex-between" style="padding:8px 4px;border-bottom:1px solid var(--border-subtle);font-size:13px;">
      <span>${r}</span>
      <button class="btn btn-sm btn-secondary" onclick="confirmGthMatch('${r.replace(/'/g,"\\'")}')">Select</button>
    </div>`).join('') || `<div class="muted" style="font-size:12px;padding:8px 4px;">No matches.</div>`;
}
document.getElementById('gth-search-input').addEventListener('input', function(){ renderGthResults(this.value); });
function confirmGthMatch(gthPath){
  const idx = UNMAPPED_ITEMS.findIndex(u=>u.id===gthSearchTargetId);
  if (idx>=0){
    const u = UNMAPPED_ITEMS[idx];
    ACTIVE_MAPPINGS.unshift({ provider:u.provider, providerPath:u.path, gthPath, updated:new Date().toISOString().slice(0,10), by:'m.tato' });
    UNMAPPED_ITEMS.splice(idx,1);
    markMapped(u);
    logAudit('Provider Mappings','Mapping confirmed',`${u.path} manually mapped to ${gthPath}`);
    renderUnmapped(); refreshMappingCounts(); renderHierarchyTree(); renderEventsTable();
    toast('success','Mapping confirmed', `${u.path} → ${gthPath}`);
  } else {
    toast('success','Mapping updated', `Re-mapped to ${gthPath}`);
  }
  renderActiveMappings();
  closeOverlay('overlay-search-gth');
}
document.getElementById('gth-create-new').addEventListener('click', ()=>{
  closeOverlay('overlay-search-gth');
  toast('default','Opening GTH', 'Would open the GTH hierarchy editor in a new tab (mocked) so you can create the missing entry, then return here to map it.');
});
function renderActiveMappings(){
  document.getElementById('active-mappings-tbody').innerHTML = ACTIVE_MAPPINGS.map((m,i)=>`
    <tr>
      <td><span class="badge badge-gray">${providerById(m.provider).name}</span></td>
      <td>${m.providerPath}</td>
      <td>${m.gthPath}</td>
      <td>${m.updated} <span class="muted">· ${m.by}</span></td>
      <td>
        <div class="flex-gap-1">
          <span class="icon-btn" style="width:24px;height:24px;" title="Edit" onclick="openGthSearch(null); gthSearchTargetId=null; document.getElementById('search-gth-subtitle').textContent='Re-mapping: ${m.providerPath.replace(/'/g,"\\'")}'; window.__editIdx=${i};">${ICONS.edit}</span>
          <span class="icon-btn" style="width:24px;height:24px;" title="History" onclick="showHistory('${m.providerPath.replace(/'/g,"\\'")}')">${ICONS.history}</span>
          <span class="icon-btn" style="width:24px;height:24px;" title="Delete" onclick="deleteMapping(${i})">${ICONS.trash}</span>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="5"><div class="empty-state">No active mappings yet.</div></td></tr>`;
}
function showHistory(path){ toast('default','Mapping history', `${path} — 1 change on record (initial mapping). Full audit trail lives in the Audit Log screen.`); }
function deleteMapping(i){
  const m = ACTIVE_MAPPINGS[i];
  document.getElementById('confirm-title').textContent = 'Unmap this item?';
  document.getElementById('confirm-subtitle').textContent = 'It will return to Unmapped and can no longer be used in defaults or blending until re-mapped.';
  document.getElementById('confirm-body').innerHTML = `<div class="alert alert-error">${ICONS.alert}<div><strong>${m.providerPath}</strong>currently mapped to ${m.gthPath}</div></div>`;
  document.getElementById('confirm-ok').onclick = () => {
    ACTIVE_MAPPINGS.splice(i,1);
    UNMAPPED_ITEMS.push({ id:'u'+Date.now(), provider:m.provider, path:m.providerPath, suggestedGTH:m.gthPath, confidence:97 });
    logAudit('Provider Mappings','Mapping deleted',`${m.providerPath} unmapped (was ${m.gthPath})`);
    renderActiveMappings(); renderUnmapped(); refreshMappingCounts();
    closeOverlay('overlay-confirm');
    toast('danger','Mapping removed', m.providerPath);
  };
  openOverlay('overlay-confirm');
}
function renderRejectedMappings(){
  document.getElementById('rejected-mappings-tbody').innerHTML = REJECTED_MAPPINGS.map(r=>`
    <tr>
      <td><span class="badge badge-gray">${providerById(r.provider).name}</span></td>
      <td>${r.providerPath}</td>
      <td><span class="badge badge-yellow">${r.reason}</span></td>
      <td>${r.by}</td>
      <td>${r.at}</td>
      <td></td>
    </tr>`).join('') || `<tr><td colspan="6"><div class="empty-state">Nothing rejected.</div></td></tr>`;
}

/* ============================================================
   PROVIDER ANALYTICS
   ============================================================ */
let activeProviderFilter = new Set(PROVIDERS.map(p=>p.id));
let compareMode = false;
function renderProviderFilterChips(){
  document.getElementById('an-provider-filter').innerHTML = PROVIDERS.map(p=>`
    <span class="ai-suggestion-chip" style="border-color:${activeProviderFilter.has(p.id)?p.color:'var(--border)'};${activeProviderFilter.has(p.id)?`background:${p.color}22;`:''}" onclick="toggleProviderFilter('${p.id}')">
      <span class="swatch" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.name}
    </span>`).join('');
}
function toggleProviderFilter(id){
  if (activeProviderFilter.has(id)) activeProviderFilter.delete(id); else activeProviderFilter.add(id);
  if (activeProviderFilter.size===0) activeProviderFilter.add(id);
  renderProviderFilterChips(); renderAnalytics();
}
function renderKpiRow(){
  const ids = Array.from(activeProviderFilter);
  const sum = f => ids.reduce((a,id)=>a+ANALYTICS_SUMMARY[id][f],0);
  const avg = f => sum(f)/ids.length;
  const kpis = [
    {label:'Gross revenue', value: fmtMoney(sum('revenue')), sub:`across ${ids.length} provider(s)`},
    {label:'Bets placed', value: fmtNum(sum('bets')), sub:'volume, selected period'},
    {label:'Market coverage', value: avg('coveragePct').toFixed(1)+'%', sub:'avg. of selected'},
    {label:'Provider uptime', value: avg('uptimePct').toFixed(2)+'%', sub:'avg. of selected'},
    {label:'Avg. latency', value: Math.round(avg('latencyMs'))+' ms', sub:'price update → bet placed'},
    {label:'Margin impact', value: avg('marginPct').toFixed(1)+'%', sub:'avg. margin on priced bets'},
  ];
  document.getElementById('an-kpi-row').innerHTML = kpis.map(k=>`
    <div class="kpi"><div class="kpi__label">${k.label}</div><div class="kpi__value">${k.value}</div><div class="kpi__sub">${k.sub}</div></div>`).join('');
}
function renderAnTable(){
  document.getElementById('an-table-tbody').innerHTML = Array.from(activeProviderFilter).map(id=>{
    const p = providerById(id), a = ANALYTICS_SUMMARY[id];
    return `<tr>
      <td><span class="provider-chip"><span class="swatch" style="background:${p.color}"></span>${p.name}</span></td>
      <td class="num">${fmtMoney(a.revenue)}</td>
      <td class="num">${fmtNum(a.bets)}</td>
      <td class="num">${a.coveragePct}%</td>
      <td class="num">${a.uptimePct}%</td>
      <td class="num">${a.latencyMs} ms</td>
      <td class="num">${a.marginPct}%</td>
    </tr>`;
  }).join('');
}
function svgLineChart(el, series, opts={}){
  const w=560,h=180,pad=8;
  const allVals = Object.values(series).flat();
  const max = Math.max(...allVals)*1.1, min=0;
  const n = Object.values(series)[0]?.length || 14;
  const x = i => pad + i*((w-2*pad)/(n-1));
  const y = v => h-pad - ((v-min)/(max-min))*(h-2*pad);
  let svg = '';
  Object.entries(series).forEach(([id, vals])=>{
    const p = providerById(id);
    const pts = vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${p.color}" stroke-width="2"/>`;
    vals.forEach((v,i)=>{ if(i===vals.length-1) svg += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${p.color}"/>`; });
  });
  el.innerHTML = svg;
}
function renderRevenueChart(){
  const series = {}; activeProviderFilter.forEach(id=> series[id]=REVENUE_TIMESERIES[id]);
  svgLineChart(document.getElementById('an-revenue-chart'), series);
  document.getElementById('an-revenue-legend').innerHTML = Array.from(activeProviderFilter).map(id=>{
    const p = providerById(id);
    return `<span class="flex-gap-1" style="font-size:11px;"><span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block;"></span>${p.name}</span>`;
  }).join('');
}
function renderBetsChart(){
  const el = document.getElementById('an-bets-chart');
  const ids = Array.from(activeProviderFilter);
  const max = Math.max(...ids.map(id=>ANALYTICS_SUMMARY[id].bets))*1.15;
  const w=560,h=180, bw = (w/ids.length)*0.5, gap=(w/ids.length);
  let svg='';
  ids.forEach((id,i)=>{
    const p = providerById(id), val = ANALYTICS_SUMMARY[id].bets;
    const barH = (val/max)*(h-30);
    const x = gap*i + (gap-bw)/2;
    svg += `<rect x="${x}" y="${h-20-barH}" width="${bw}" height="${barH}" fill="${p.color}" rx="3"/>`;
    svg += `<text x="${x+bw/2}" y="${h-6}" text-anchor="middle" font-size="10" fill="var(--fg-muted)">${p.short}</text>`;
    svg += `<text x="${x+bw/2}" y="${h-24-barH}" text-anchor="middle" font-size="10" fill="var(--fg-title)" font-weight="600">${fmtNum(val)}</text>`;
  });
  el.innerHTML = svg;
}
function renderAnalytics(){ renderKpiRow(); renderAnTable(); renderRevenueChart(); renderBetsChart(); }
document.getElementById('an-compare').addEventListener('click', function(){
  compareMode = !compareMode;
  this.classList.toggle('btn-secondary', compareMode);
  toast('default', compareMode?'Comparison mode on':'Comparison mode off', compareMode?'KPI cards below now represent each selected provider independently rather than an aggregate.':'');
  if (compareMode){
    document.getElementById('an-kpi-row').innerHTML = Array.from(activeProviderFilter).map(id=>{
      const p = providerById(id), a = ANALYTICS_SUMMARY[id];
      return `<div class="kpi" style="border-top:2px solid ${p.color};">
        <div class="kpi__label">${p.name}</div>
        <div class="kpi__value" style="font-size:18px;">${fmtMoney(a.revenue)}</div>
        <div class="kpi__sub">${fmtNum(a.bets)} bets · ${a.coveragePct}% coverage · ${a.uptimePct}% uptime</div>
      </div>`;
    }).join('');
  } else renderKpiRow();
});
document.getElementById('an-export').addEventListener('click', ()=> toast('default','Export started', 'Generating CSV for the selected range and providers (mocked).'));

/* ============================================================
   AUDIT LOG
   ============================================================ */
function renderAuditLog(){
  const areaF = document.getElementById('al-filter-area').value;
  const userF = document.getElementById('al-filter-user').value.toLowerCase();
  const rows = AUDIT_LOG.filter(a=> (!areaF || a.area===areaF) && (!userF || a.user.toLowerCase().includes(userF)) );
  document.getElementById('audit-tbody').innerHTML = rows.map(a=>`
    <tr>
      <td>${fmtDate(a.ts)}</td>
      <td>${a.user}</td>
      <td><span class="badge badge-gray">${a.area}</span></td>
      <td>${a.action}</td>
      <td class="muted">${a.detail}</td>
    </tr>`).join('') || `<tr><td colspan="5"><div class="empty-state">No matching audit entries.</div></td></tr>`;
}
document.getElementById('al-filter-area').addEventListener('change', renderAuditLog);
document.getElementById('al-filter-user').addEventListener('input', renderAuditLog);
document.getElementById('al-export').addEventListener('click', ()=> toast('default','Export started','Generating CSV of the audit log (mocked).'));

/* ============================================================
   AI ASSISTANT (rule-based demo NLU)
   ============================================================ */
const aiMessages = document.getElementById('ai-messages');
function aiSay(text, from='agent'){
  const div = document.createElement('div');
  div.className = `ai-msg ${from}`;
  div.innerHTML = `${text}<span class="ts">${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>`;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}
function aiConfirmCard(title, lines, onYes){
  const div = document.createElement('div');
  div.className = 'ai-msg agent';
  div.innerHTML = `<div class="ai-confirm-card">
      <div class="ai-confirm-card__title">${title}</div>
      <ul>${lines.map(l=>`<li>${l}</li>`).join('')}</ul>
      <div class="actions">
        <button class="btn btn-primary btn-sm" data-yes>Yes, confirm</button>
        <button class="btn btn-tertiary btn-sm" data-no>Cancel</button>
      </div>
    </div><span class="ts">${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>`;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  div.querySelector('[data-yes]').onclick = () => { div.querySelector('.actions').innerHTML = '<span class="muted" style="font-size:11px;">Confirmed</span>'; onYes(); };
  div.querySelector('[data-no]').onclick = () => { div.querySelector('.actions').innerHTML = '<span class="muted" style="font-size:11px;">Cancelled</span>'; aiSay('No problem — cancelled, nothing changed.'); };
}
function findSportByName(name){
  name = name.toLowerCase();
  return SPORTS.find(s=> s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase().split(' ')[0]));
}
function findProviderByName(name){
  name = name.toLowerCase();
  return PROVIDERS.find(p=> p.name.toLowerCase()===name || p.short.toLowerCase()===name || name.includes(p.name.toLowerCase()));
}
function handleAiInput(raw){
  const text = raw.trim(); if(!text) return;
  aiSay(text, 'user');
  const lower = text.toLowerCase();

  // "set X as default for Y"
  let m = lower.match(/set (.+?) as default for (.+?)(\.|$)/);
  if (m){
    const provider = findProviderByName(m[1].trim());
    const sport = findSportByName(m[2].trim());
    if (!provider){ aiSay(`I don't recognise a provider called "${m[1].trim()}". Try BetRadar, BetGenious, Inspired or Highlight.`); return; }
    if (!sport){ aiSay(`I couldn't find a sport matching "${m[2].trim()}" in scope for this demo (Soccer Virtuals, European Basketball, Cricket, F1, eBasketball).`); return; }
    setTimeout(()=> aiSay(`Should I apply this to both Pre-Match and In-Play for ${sport.name}? (Yes / No)`), 300);
    const yesHandler = () => {
      setTimeout(()=> aiConfirmCard(`Confirm: set ${provider.name} as default for ${sport.name}`, [
        `Sport: ${sport.name}`, `Match types: Pre-Match and In-Play`, `Provider: ${provider.name}`,
        isMapped(provider.id, sport.competitions[0].id) ? 'GTH mapping: OK' : '⚠ Some competitions under this sport are not yet mapped — save will be blocked until resolved.'
      ], ()=>{
        pendingHierarchy[`sport:${sport.id}`] = provider.id;
        renderHierarchyTree();
        aiSay(`Done — queued as a pending change on the Blending Configuration screen. <a onclick="document.querySelector('.nav-item[data-view=blending-config]').click(); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Open Blending Configuration</a> to review and save.`);
      }), 300);
    };
    pendingAiYes = yesHandler;
    return;
  }

  // simple yes/no continuation
  if (/^(yes|yeah|yep|confirm)\.?$/.test(lower) && pendingAiYes){ const h = pendingAiYes; pendingAiYes=null; h(); return; }
  if (/^(no|cancel)\.?$/.test(lower) && pendingAiYes){ pendingAiYes=null; aiSay('Cancelled — nothing changed.'); return; }

  // "map A's B to our B"
  if (/^map /.test(lower)){
    aiSay(`I found 1 close match in Provider Mappings for that description. <a onclick="document.querySelector('.nav-item[data-view=mappings]').click(); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Review it in Provider Mappings</a> — I'll act on it there so you can double-check the AI suggestion before confirming.`);
    return;
  }

  // "override event X to use Y for in-play/pre-match"
  m = lower.match(/override (?:event )?([a-z0-9-]+) to use (.+?) for (in-play|pre-match|prematch|inplay)/);
  if (m){
    const evt = EVENTS.find(e=>e.id.toLowerCase()===m[1].toLowerCase());
    const provider = findProviderByName(m[2].trim());
    const mt = m[3].includes('pre') ? 'pre-match' : 'in-play';
    if (!evt){ aiSay(`I can't find event "${m[1]}". Double-check the event ID (e.g. EVT-30070).`); return; }
    if (!provider){ aiSay(`I don't recognise that provider.`); return; }
    aiConfirmCard(`Confirm: override ${evt.id} — ${mt==='pre-match'?'Pre-Match':'In-Play'} → ${provider.name}`, [
      evt.name, `${mt==='pre-match'?'Pre-Match':'In-Play'} provider → ${provider.name}`,
      isMapped(provider.id, evt.competition, mt.replace('-','')) ? 'GTH mapping: OK' : '⚠ Not mapped for this competition — will be flagged as a conflict but still applied.'
    ], ()=>{
      if (mt==='pre-match'){ evt.preMatchProvider = provider.id; evt.override = {type:'pre-match', provider:provider.id, at:new Date().toISOString(), by:'m.tato'}; }
      else { evt.inPlayProvider = provider.id; evt.override = {type:'in-play', provider:provider.id, at:new Date().toISOString(), by:'m.tato'}; }
      logAudit('Level 2 — Event Overrides','Override applied (via AI Assistant)',`${evt.id}: ${mt} → ${provider.name}`);
      renderEventsTable();
      aiSay(`Applied. <a onclick="document.querySelector('.nav-item[data-view=event-overrides]').click(); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Open Event Overrides</a> to see it.`);
    });
    return;
  }

  // Queries
  m = lower.match(/which provider is default for (.+?)(\s+pre-match|\s+in-play)?\??$/);
  if (m){
    const sport = findSportByName(m[1].trim());
    if (!sport){ aiSay(`I couldn't match that to an in-scope sport.`); return; }
    aiSay(`<strong>${sport.name}</strong> default provider: ${providerById(sport.defaultProvider)?.name || 'not set'} (Sport level). Competitions may override this — check the tree in Blending Configuration for specifics.`);
    return;
  }
  if (lower.includes('unmapped') && lower.includes('for')){
    m = lower.match(/for (.+?)\??$/);
    const provider = m ? findProviderByName(m[1].trim()) : null;
    const items = provider ? UNMAPPED_ITEMS.filter(u=>u.provider===provider.id) : UNMAPPED_ITEMS;
    aiSay(items.length ? `${items.length} unmapped item(s)${provider?` for ${provider.name}`:''}:<ul>${items.map(i=>`<li>${i.path}</li>`).join('')}</ul>` : `No unmapped items${provider?` for ${provider.name}`:''} 🎉`);
    return;
  }
  m = lower.match(/uptime.*for (.+?)( last month)?\??$/);
  if (m){
    const provider = findProviderByName(m[1].trim());
    if (!provider){ aiSay(`I don't recognise that provider.`); return; }
    aiSay(`${provider.name} uptime, last 30 days: <strong>${PROVIDER_HEALTH[provider.id].uptime30d}%</strong> (currently ${PROVIDER_HEALTH[provider.id].status}).`);
    return;
  }

  aiSay(`I didn't quite catch that. Try one of the suggestions below, or phrase it like "Set BetRadar as default for Cricket" or "What's the uptime % for Inspired last month?"`);
}
let pendingAiYes = null;
document.getElementById('ai-send').addEventListener('click', ()=>{
  const input = document.getElementById('ai-input');
  if (input.value.trim()) handleAiInput(input.value);
  input.value='';
});
document.getElementById('ai-input').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('ai-send').click(); });
document.getElementById('ai-fab').addEventListener('click', ()=> document.getElementById('ai-panel').classList.add('open'));
document.getElementById('ai-close').addEventListener('click', ()=> document.getElementById('ai-panel').classList.remove('open'));
document.getElementById('ai-suggestions').innerHTML = AI_SUGGESTIONS.map(s=>`<span class="ai-suggestion-chip" onclick="document.getElementById('ai-input').value='${s.replace(/'/g,"\\'")}'; document.getElementById('ai-send').click();">${s}</span>`).join('');

/* ============================================================
   INIT
   ============================================================ */
function init(){
  aiSay(`Hi — I can configure providers or answer questions in plain language. Try: "Set BetRadar as default for Tennis" (Journey 6 from the PRD) or one of the suggestions below.`);
  populateEventFilters();
  renderHierarchyTree();
  renderEventsTable();
  renderBlendingRules();
  renderProviderHealth();
  renderCoverage();
  renderUnmapped();
  renderActiveMappings();
  renderRejectedMappings();
  refreshMappingCounts();
  renderProviderFilterChips();
  renderAnalytics();
  renderAuditLog();
}
init();
