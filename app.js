const CAT_BG = {
  adventure:'adventure', chill:'rain', fun:'fun',
  romantic:'romantic', party:'party', crazy:'crazy',
  selfimprovement:'selfimprovement', summer:'summer', scary:'scary', nostalgic:'nostalgic'
};

/* ─── PAYWALL ────────────────────────────────── */
const FREE_CATS = ['adventure','chill','fun'];
const PREMIUM_CATS = ['romantic','party','crazy','selfimprovement','summer','scary','nostalgic'];

let isPro = false;
try { isPro = localStorage.getItem('ij_pro') === 'true'; } catch(e){}

function requiresPro(catKey){ return PREMIUM_CATS.includes(catKey); }
function showPaywall(){ document.getElementById('paywallOverlay').classList.add('show'); }
function closePaywall(){ document.getElementById('paywallOverlay').classList.remove('show'); }
function unlockPro(){ showToast('Payment coming soon!'); }
function bypassPaywall(){
  isPro = true;
  try{ localStorage.setItem('ij_pro','true'); }catch(e){}
  closePaywall();
  renderCats();
  updateProBadge();
  showToast('Welcome, tester! 🎉');
}

function updateProBadge(){
  ['proBadge','proBadge2','proBadge3'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('show', isPro);
  });
}


const TITLES = [
  "What's the vibe today?","What mood are we feeling?","What kind of memory are we making today?",
  "So... what are we doing?","Let's find today's story.","What sounds fun right now?",
  "What's today's adventure?","Ready to fight boredom?","Bored? Let's fix that.",
  "Life's too short to scroll all day.","Let's make today slightly more interesting.",
  "Your boredom ends here.","One random idea could change your whole day.",
  "Are you here to chill or to party?","What's the move today?","Time to touch grass.",
  "Time to cause a little chaos.","Let's roll the dice.","Today's excuse to leave the house?",
  "Seize the day with a new idea.","Future you will thank you for this.",
  "Your next favorite memory starts here.","Life happens outside your comfort zone.",
  "Today's a good day for a side quest.","Make today worth remembering.",
  "Still scrolling? How about something else?","Your couch is getting attached to you.",
  "Main character moment incoming.","Character development awaits.","Your future self is watching."
];

/* ─── STATE ─────────────────────────────────── */
let selectedCat = null;
let currentIdeaId = null;
let filtersOpen = false;
let liked = {};
let done = {};
try { done = JSON.parse(localStorage.getItem('ij_done')||'{}'); } catch(e){}
let queues = {};
let activeFilters = {category:[],people:[],location:[],cost:[],duration:[],energy:[]};

try { liked = JSON.parse(localStorage.getItem('ij_liked')||'{}'); } catch(e){}
try { queues = JSON.parse(localStorage.getItem('ij_queues')||'{}'); } catch(e){}

const FILTER_DEFS = [
  {key:'category', id:'fCategory', opts:['Adventure','Chill','Fun','Romantic','Party','Summer','Crazy','Self Improvement','Scary','Nostalgic']},
  {key:'people',   id:'fPeople',   opts:['Solo','Couple','Friends','Family']},
  {key:'location', id:'fLocation', opts:['Home','Indoors','Outdoors','City','Nature','Road Trip']},
  {key:'cost',     id:'fCost',     opts:['Free','Under €10','Under €20','Under €50','Expensive','Varies']},
  {key:'duration', id:'fDuration', opts:['15min','30min','1 hour','Half day','Full day','Evening','Multiple days','Ongoing','Varies']},
  {key:'energy',   id:'fEnergy',   opts:['Lazy','Chill','Active','High Energy']}
];

/* ─── AUDIO ─────────────────────────────────── */
const AC = window.AudioContext || window.webkitAudioContext;
let ac = null;

function getAC(){
  if(!ac){ try{ ac = new AC(); }catch(e){} }
  return ac;
}

function playPop(){
  const ctx = getAC(); if(!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(520, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.06);
  g.gain.setValueAtTime(0.18, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  o.start(ctx.currentTime);
  o.stop(ctx.currentTime + 0.15);
}

function playWhoosh(){
  const ctx = getAC(); if(!ctx) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-(i/data.length),2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.18);
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  src.connect(filter); filter.connect(g); g.connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + 0.18);
}

function playHeart(){
  const ctx = getAC(); if(!ctx) return;
  // two quick pops like a heartbeat
  [0, 0.1].forEach((delay, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(i===0?300:260, ctx.currentTime + delay);
    g.gain.setValueAtTime(0.15, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + 0.1);
  });
}

function playDismiss(){
  const ctx = getAC(); if(!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(400, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.12);
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  o.start(ctx.currentTime);
  o.stop(ctx.currentTime + 0.12);
}

/* ─── PERSIST ───────────────────────────────── */
function saveLiked(){ try{ localStorage.setItem('ij_liked', JSON.stringify(liked)); }catch(e){} }
function saveDone(){ try{ localStorage.setItem('ij_done', JSON.stringify(done)); }catch(e){} }
function saveQueues(){ try{ localStorage.setItem('ij_queues', JSON.stringify(queues)); }catch(e){} }

/* ─── FILTERS ───────────────────────────────── */
function getFiltered(catKey){
  const ideas = CATS[catKey].ideas;
  const f = activeFilters;
  const any = Object.values(f).some(a=>a.length>0);
  if(!any) return ideas;
  return ideas.filter(idea=>{
    for(const [k,arr] of Object.entries(f)){
      if(!arr.length) continue;
      // If "Varies" is selected in cost or duration, skip that filter entirely
      if((k==='cost' || k==='duration') && arr.includes('Varies')) continue;
      if(!arr.some(v=>idea.tags.includes(v))) return false;
    }
    return true;
  });
}

function filterCount(){ return Object.values(activeFilters).reduce((s,a)=>s+a.length,0); }

function renderFilters(){
  FILTER_DEFS.forEach(({key,id,opts})=>{
    const el = document.getElementById(id);
    el.innerHTML='';
    opts.forEach(opt=>{
      const d = document.createElement('div');
      const isProCatOpt = key==='category' && PREMIUM_CATS.map(k=>CATS[k]?.label).includes(opt);
      const isLocked = isProCatOpt && !isPro;
      d.className='fopt'+(activeFilters[key].includes(opt)?' sel':'')+(isLocked?' fopt-locked':'');
      d.textContent = isLocked ? '🔒 '+opt : opt;
      d.onclick=()=>{
        if(isLocked){ showPaywall(); return; }
        const arr=activeFilters[key];
        const i=arr.indexOf(opt);
        i>-1?arr.splice(i,1):arr.push(opt);
        d.classList.toggle('sel',arr.includes(opt));
        playPop();
        refreshBadge();
      };
      el.appendChild(d);
    });
  });
  refreshBadge();
}

function refreshBadge(){
  const n=filterCount();
  const badge=document.getElementById('filterBadge');
  const toggle=document.getElementById('filterToggle');
  badge.textContent=n;
  badge.classList.toggle('show',n>0);
  toggle.classList.toggle('has-filters',n>0);
  renderCats();
}

function toggleFilters(){
  filtersOpen=!filtersOpen;
  document.getElementById('filterPanel').classList.toggle('open',filtersOpen);
  document.getElementById('filterChevron').classList.toggle('open',filtersOpen);
  playPop();
}

function closeFilters(){
  filtersOpen=false;
  document.getElementById('filterPanel').classList.remove('open');
  document.getElementById('filterChevron').classList.remove('open');
  renderCats();
}

function clearFilters(){
  Object.keys(activeFilters).forEach(k=>activeFilters[k]=[]);
  renderFilters();
  renderCats();
}

/* ─── QUEUE ─────────────────────────────────── */
function shuffleArr(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function queueKey(catKey){ return catKey+'::'+JSON.stringify(activeFilters); }

function nextIdea(catKey){
  const ideas = getFiltered(catKey);
  if(!ideas.length) return null;
  const qk = queueKey(catKey);
  if(!queues[qk] || queues[qk].length===0){
    queues[qk] = shuffleArr(ideas.map((_,i)=>i));
  }
  const idx = queues[qk].shift();
  queues[qk].push(idx);
  saveQueues();
  return {idea:ideas[idx], catKey};
}

/* ─── CATEGORIES ─────────────────────────────── */
function renderCats(){
  const list=document.getElementById('catList');
  list.innerHTML='';
  Object.keys(CATS).forEach((key)=>{
    const cat=CATS[key];
    const count=getFiltered(key).length;
    const sel=selectedCat===key;
    const locked=!isPro && PREMIUM_CATS.includes(key);
    const card=document.createElement('div');
    card.className='cat-card'+(sel?' sel':'')+(locked?' premium-locked':'');
    card.style.background=`linear-gradient(145deg,${cat.c1},${cat.c2})`;
    if(locked){ card.style.opacity='0.45'; card.style.filter='blur(0.4px)'; }
    card.innerHTML=`
      <div class="cat-glow" style="background:${cat.glow}"></div>
      <div class="cat-emoji">${cat.emoji}</div>
      <div class="cat-info">
        <div class="cat-name">${cat.label}</div>
        <div class="cat-count">${locked ? '🔒 Pro' : count+' idea'+(count!==1?'s':'')}</div>
      </div>
      ${locked ? '<div class="premium-badge">PRO</div>' : '<i class="ti ti-chevron-right cat-arrow"></i>'}`;
    card.onclick=()=>{
      if(locked){ playPop(); showPaywall(); return; }
      if(selectedCat===key){
        selectedCat=null;
        if(window.setBgMode) window.setBgMode('default');
      } else {
        selectedCat=key;
        if(window.setBgMode) window.setBgMode(CAT_BG[key]||'rain');
      }
      document.getElementById('fab').disabled=false;
      playPop();
      renderCats();
    };
    list.appendChild(card);
  });
}

/* ─── LABEL → KEY MAP ───────────────────────────── */
const LABEL_TO_KEY = {};
Object.keys(CATS).forEach(k => { LABEL_TO_KEY[CATS[k].label] = k; });

// Category name → tag name mapping (for cross-category search)
const CAT_TAG_MAP = {
  'adventure':'Adventure','chill':'Chill','fun':'Fun','romantic':'Romantic',
  'party':'Party','summer':'Summer','crazy':'Crazy','selfimprovement':'Self Improvement',
  'scary':'Scary','nostalgic':'Nostalgic'
};

/* ─── IDEA DISPLAY ────────────────────────────── */
function newIdea(){
  const catFilters = activeFilters.category || [];

  if(selectedCat){
    // Category selected on card — just use it
    const result = nextIdea(selectedCat);
    if(!result){ showToast('No ideas match your filters'); return; }
    playWhoosh(); showIdea(result.catKey, result.idea);
    return;
  }

  if(catFilters.length > 0){
    const selectedTags = catFilters; // e.g. ['Adventure', 'Fun', 'Party']

    // Temporarily clear category filter so getFiltered doesn't block ideas
    const savedCatFilter = activeFilters.category;
    activeFilters.category = [];

    const pool = [];
    Object.keys(CATS).forEach(catKey => {
      if(!isPro && PREMIUM_CATS.includes(catKey)) return;
      const filtered = getFiltered(catKey);
      filtered.forEach(idea => {
        if(selectedTags.some(tag => idea.tags.includes(tag))) {
          pool.push({idea, catKey});
        }
      });
    });

    activeFilters.category = savedCatFilter; // restore

    if(!pool.length){ showToast('No ideas match your filters'); return; }
    const pick = pool[Math.floor(Math.random()*pool.length)];
    playWhoosh(); showIdea(pick.catKey, pick.idea);
    return;
  }

  // Random mode — pick from all unlocked categories
  const allKeys = Object.keys(CATS).filter(k => {
    if(!isPro && PREMIUM_CATS.includes(k)) return false;
    return getFiltered(k).length > 0;
  });
  if(!allKeys.length){ showToast('No ideas match your filters'); return; }
  const catKey = allKeys[Math.floor(Math.random()*allKeys.length)];
  const result = nextIdea(catKey);
  if(!result){ showToast('No ideas match your filters'); return; }
  playWhoosh(); showIdea(result.catKey, result.idea);
}

function showIdea(catKey, idea){
  const cat=CATS[catKey];
  const fullIdx=cat.ideas.indexOf(idea);
  currentIdeaId=catKey+'-'+fullIdx;

  document.getElementById('ideaBadge').textContent=cat.emoji+' '+cat.label;
  document.getElementById('ideaBadge').style.cssText=`background:${cat.c1};color:#fff;`;
  document.getElementById('ideaTitle').textContent=idea.t;

  const sub=document.getElementById('ideaSub');
  sub.textContent=idea.s||'';
  sub.style.display=idea.s?'':'none';

  // All known category names
  const CAT_NAMES = Object.values(CATS).map(c=>c.label);
  const catTags = idea.tags.filter(t => CAT_NAMES.includes(t) && t !== cat.label);
  const normalTags = idea.tags.filter(t => !CAT_NAMES.includes(t));

  // Category tags next to badge
  const catTagsEl = document.getElementById('ideaCatTags');
  catTagsEl.innerHTML = catTags.map(t => {
    const catKey = Object.keys(CATS).find(k => CATS[k].label === t);
    const c = catKey ? CATS[catKey] : null;
    return `<span class="idea-cat-tag" style="background:${c?c.c1:'#888'}">${c?c.emoji:''} ${t}</span>`;
  }).join('');

  // Normal tags only
  document.getElementById('ideaTags').innerHTML=normalTags.map(t=>`<span class="idea-tag">${t}</span>`).join('');

  const saveBtn=document.getElementById('ideaSaveBtn');
  saveBtn.classList.toggle('saved',!!liked[currentIdeaId]);
  document.getElementById('saveIcon').textContent = liked[currentIdeaId] ? '❤️' : '🤍';
  const doneBtn=document.getElementById('ideaDoneBtn');
  if(doneBtn){
    doneBtn.classList.toggle('done',!!done[currentIdeaId]);
    document.getElementById('doneIcon').textContent = '🎉';
  }

  const overlay=document.getElementById('overlay');
  overlay.classList.add('show');

  const card=document.getElementById('ideaCard');
  card.style.animation='none';
  void card.offsetWidth;
  card.style.animation='ideaIn .4s cubic-bezier(.34,1.4,.64,1) both';
}

function dismissIdea(){
  playDismiss();
  document.getElementById('overlay').classList.remove('show');
}


function toggleDone(){
  if(!currentIdeaId) return;
  const [catKey,idxStr]=currentIdeaId.split('-');
  const idea=CATS[catKey].ideas[+idxStr];
  const btn=document.getElementById('ideaDoneBtn');
  const icon=document.getElementById('doneIcon');
  if(done[currentIdeaId]){
    delete done[currentIdeaId];
    btn.classList.remove('done');
    icon.textContent='🎉';
    showToast('Unmarked');
  } else {
    done[currentIdeaId]={catKey,idx:+idxStr,title:idea.t,date:new Date().toISOString().slice(0,10)};
    btn.classList.add('done');
    icon.textContent='🎉';
    playHeart();
    showToast('Nice work! ✅');

  }
  saveDone();
}
function shareIdea(){
  if(!currentIdeaId) return;
  const [catKey, idxStr] = currentIdeaId.split('-');
  const idea = CATS[catKey].ideas[+idxStr];
  const cat = CATS[catKey];
  const text = `${cat.emoji} ${idea.t}${idea.s ? '\n"'+idea.s+'"' : ''}\n\nvia Idea Jar — fight boredom 👉 ${window.location.href}`;
  if(navigator.share){
    navigator.share({ title:'Idea Jar', text }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).then(()=> showToast('Copied to clipboard!')).catch(()=> showToast('Share not supported'));
  }
}

function toggleSave(){
  if(!currentIdeaId) return;
  const [catKey,idxStr]=currentIdeaId.split('-');
  const idea=CATS[catKey].ideas[+idxStr];
  const btn=document.getElementById('ideaSaveBtn');
  if(liked[currentIdeaId]){
    delete liked[currentIdeaId];
    btn.classList.remove('saved');
    document.getElementById('saveIcon').textContent='🤍';
    showToast('Removed');
  } else {
    liked[currentIdeaId]={catKey,idx:+idxStr,title:idea.t};
    btn.classList.add('saved');
    document.getElementById('saveIcon').textContent='❤️';
    playHeart();
    showToast('Saved ♥');
  }
  saveLiked();
  // update My Ideas live if visible
  if(document.getElementById('savedScr').style.display !== 'none') renderSaved();
}

/* ─── SAVED SCREEN ────────────────────────────── */
function renderSaved(){
  const list=document.getElementById('savedList');
  const keys=Object.keys(liked);
  if(!keys.length){
    list.innerHTML=`<div class="empty"><div class="empty-emoji">💭</div><div class="empty-title">Nothing saved yet</div><div class="empty-sub">Go create some future nostalgia.</div></div>`;
    return;
  }
  list.innerHTML='';
  keys.forEach((id,i)=>{
    const item=liked[id];
    const cat=CATS[item.catKey];
    if(!cat) return;
    const isDone = !!done[id];
    const el=document.createElement('div');
    el.className='saved-item'+(isDone?' done':'');
    el.style.animationDelay=(i*0.04)+'s';
    el.innerHTML=`
      <div class="saved-emoji">${cat.emoji}</div>
      <div class="saved-body">
        <div class="saved-title">${item.title}</div>
        <div class="saved-cat">${cat.label}</div>
      </div>
      <button class="saved-done-btn${isDone?' done':''}" aria-label="Mark done">${isDone?'✅':''}</button>
      <button class="saved-del" aria-label="Remove"><i class="ti ti-x" style="font-size:14px"></i></button>`;
    el.querySelector('.saved-done-btn').onclick=e=>{
      e.stopPropagation();
      const btn = e.currentTarget;
      const titleEl = el.querySelector('.saved-title');
      if(done[id]){
        delete done[id];
        btn.classList.remove('done');
        btn.textContent = '';
        el.classList.remove('done');
        titleEl.style.textDecoration = '';
        titleEl.style.color = '';
      } else {
        done[id]={catKey:item.catKey,idx:item.idx,title:item.title,date:new Date().toISOString().slice(0,10)};
        btn.classList.add('done');
        btn.textContent = '✅';
        el.classList.add('done');
        titleEl.style.textDecoration = 'line-through';
        titleEl.style.color = '#4a4668';
      }
      saveDone();
    };
    el.querySelector('.saved-del').onclick=e=>{
      e.stopPropagation();
      playDismiss();
      delete liked[id];
      saveLiked();
      renderSaved();
    };
    el.onclick=()=>{
      const idea=cat.ideas[item.idx];
      if(idea){ playWhoosh(); showIdea(item.catKey,idea); }
    };
    list.appendChild(el);
  });
}

function renderDone(){
  const list=document.getElementById('doneList');
  const keys=Object.keys(done);

  if(!keys.length){
    list.innerHTML=`<div class="empty"><div class="empty-emoji">✅</div><div class="empty-title">Nothing done yet</div><div class="empty-sub">Complete an idea and it'll show up here.</div></div>`;
    return;
  }

  list.innerHTML='';

  // Render done items
  keys.forEach((id,i)=>{
    const item=done[id];
    const cat=CATS[item.catKey];
    if(!cat) return;
    const el=document.createElement('div');
    el.className='saved-item done';
    el.style.animationDelay=(i*0.04)+'s';
    const dateStr = item.date ? new Date(item.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '';
    el.innerHTML=`
      <div class="saved-emoji">${cat.emoji}</div>
      <div class="saved-body">
        <div class="saved-title">${item.title}</div>
        <div class="saved-cat">${cat.label}${dateStr?' · '+dateStr:''}</div>
      </div>
      <span style="font-size:18px;flex-shrink:0">✅</span>
      <button class="saved-del" aria-label="Remove"><i class="ti ti-x" style="font-size:14px"></i></button>`;
    el.querySelector('.saved-del').onclick=e=>{
      e.stopPropagation();
      playDismiss();
      delete done[id];
      saveDone();
      renderDone();
    };
    el.onclick=()=>{
      const idea=cat.ideas[item.idx];
      if(idea){ playWhoosh(); showIdea(item.catKey,idea); }
    };
    list.appendChild(el);
  });
}

/* ─── TABS ──────────────────────────────────── */
function showTab(tab){
  const home = tab==='home';
  const saved = tab==='saved';
  const doneTab = tab==='done';
  playPop();

  // When leaving saved tab, remove done items from liked
  const leavingSaved = document.getElementById('savedScr').style.display === 'block' && !saved;
  if(leavingSaved){
    Object.keys(liked).forEach(id => {
      if(done[id]){ delete liked[id]; }
    });
    saveLiked();
  }

  document.getElementById('homeScr').style.display = home ? '' : 'none';
  document.getElementById('savedScr').style.display = saved ? 'block' : 'none';
  document.getElementById('doneScr').style.display = doneTab ? 'block' : 'none';
  document.getElementById('fabWrap').style.display = home ? '' : 'none';
  document.getElementById('navHome').classList.toggle('active', home);
  document.getElementById('navSaved').classList.toggle('active', saved);
  document.getElementById('navDone').classList.toggle('active', doneTab);
  if(saved) renderSaved();
  if(doneTab) renderDone();
}

/* ─── TOAST ─────────────────────────────────── */
function showToast(msg){
  const t=document.getElementById('toast');
  t.innerHTML=`<i class="ti ti-sparkles" style="font-size:14px;color:#7c5cff"></i> ${msg}`;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('show'),1800);
}

/* ─── FAB CLICK WITH FLASH ───────────────────── */
function fabClick(){
  const inner = document.getElementById('fabInner');
  inner.classList.add('flash');
  setTimeout(()=>inner.classList.remove('flash'), 200);
  newIdea();
}

/* ─── INIT ──────────────────────────────────── */
document.getElementById('fab').disabled = false;
document.getElementById('app-title-text').textContent = TITLES[Math.floor(Math.random()*TITLES.length)];
updateProBadge();
renderFilters();
renderCats();

