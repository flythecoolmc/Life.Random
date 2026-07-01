const CAT_BG = {
  adventure:'adventure', chill:'rain', fun:'fun',
  romantic:'romantic', party:'party', crazy:'crazy',
  selfimprovement:'selfimprovement', summer:'summer', scary:'scary', nostalgic:'nostalgic'
};
let card_isAnimating=false;

/* ─── PAYWALL ────────────────────────────────── */
const FREE_CATS = ['adventure','chill','fun'];
const PREMIUM_CATS = ['romantic','party','crazy','selfimprovement','summer','scary','nostalgic'];

let isPro = false;
try { isPro = localStorage.getItem('ij_pro') === 'true'; } catch(e){}

function requiresPro(catKey){ return PREMIUM_CATS.includes(catKey); }
function showPaywall(){ document.getElementById('paywallOverlay').classList.add('show'); }
function closePaywall(){ document.getElementById('paywallOverlay').classList.remove('show'); }
function unlockPro(){
  isPro=true;
  try{ localStorage.setItem('ij_pro','1'); }catch(e){}
  updateProBadge();
  renderFilters();
  renderCats();
  showToast('Pro unlocked! 🎉');
  document.getElementById('paywallOverlay').classList.remove('show');
}
function bypassPaywall(){
  isPro = true;
  try{ localStorage.setItem('ij_pro','true'); }catch(e){}
  closePaywall();
  renderCats();
  renderFilters();
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
  {key:'category', id:'fCategory', opts:['Adventure','Chill','Fun','Romantic','Party','Summer','Crazy','Self Improvement','Scary Sh*t','Nostalgic']},
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
  const now = ctx.currentTime;
  const dur = 0.18;

  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const t = i/data.length;
    // Fade in very fast, then smooth decay — like air rushing past a page
    data[i] = (Math.random()*2-1) * (t < 0.08 ? t/0.08 : Math.pow(1-t, 1.4));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Bandpass swept from mid-high to low — air/paper texture
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.setValueAtTime(2200, now);
  bpf.frequency.exponentialRampToValueAtTime(320, now + dur);
  bpf.Q.value = 1.2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.38, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);

  src.connect(bpf); bpf.connect(g); g.connect(ctx.destination);
  src.start(now); src.stop(now + dur);
}

function playHaptic(pattern){
  if(navigator.vibrate) navigator.vibrate(pattern);
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
      d.className='fopt'+(activeFilters[key].includes(opt)?' sel':'')+(isProCatOpt && !isPro?' fopt-locked':'');
      d.textContent = (isProCatOpt && !isPro) ? '🔒 '+opt : opt;
      d.setAttribute('data-pro-opt', isProCatOpt ? '1' : '0');
      d.onclick=()=>{
        if(isProCatOpt && !isPro){ showPaywall(); return; }
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
    const isPremiumCat=PREMIUM_CATS.includes(key);
    const card=document.createElement('div');
    card.className='cat-card'+(sel?' sel':'')+(locked?' premium-locked':'');
    card.style.background=`linear-gradient(145deg,${cat.c1},${cat.c2})`;
    if(locked){ card.style.opacity='0.45'; card.style.filter='blur(0.4px)'; }
    else { card.style.opacity=''; card.style.filter=''; }
    card.innerHTML=`
      <div class="cat-glow" style="background:${cat.glow}"></div>
      <div class="cat-emoji">${cat.emoji}</div>
      <div class="cat-info">
        <div class="cat-name">${cat.label}</div>
        <div class="cat-count">${locked ? '🔒 Pro' : count+' idea'+(count!==1?'s':'')}</div>
      </div>
      ${isPremiumCat ? '<div class="premium-badge">PRO</div>' : '<i class="ti ti-chevron-right cat-arrow"></i>'}`;
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

  // Coming soon teaser
  const teaser = document.createElement('div');
  teaser.style.cssText = 'text-align:center;padding:18px 0 8px;';
  teaser.innerHTML = `<span style="font-size:12px;font-weight:600;color:#6b5fd4;letter-spacing:1.5px;text-transform:uppercase;">✦ More categories and ideas coming soon! ✦</span>`;
  list.appendChild(teaser);
}

/* ─── LABEL → KEY MAP ───────────────────────────── */
const LABEL_TO_KEY = {};
Object.keys(CATS).forEach(k => { LABEL_TO_KEY[CATS[k].label] = k; });

// Category name → tag name mapping (for cross-category search)
const CAT_TAG_MAP = {
  'adventure':'Adventure','chill':'Chill','fun':'Fun','romantic':'Romantic',
  'party':'Party','summer':'Summer','crazy':'Crazy','selfimprovement':'Self Improvement',
  'scary':'Scary Sh*t','nostalgic':'Nostalgic'
};

/* ─── IDEA DISPLAY ────────────────────────────── */
function pickNextIdeaData(){
  const catFilters = activeFilters.category || [];

  if(selectedCat){
    const result = nextIdea(selectedCat);
    return result;
  }

  if(catFilters.length > 0){
    const selectedTags = catFilters;
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

    activeFilters.category = savedCatFilter;
    if(!pool.length) return null;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  const allKeys = Object.keys(CATS).filter(k => {
    if(!isPro && PREMIUM_CATS.includes(k)) return false;
    return getFiltered(k).length > 0;
  });
  if(!allKeys.length) return null;
  const catKey = allKeys[Math.floor(Math.random()*allKeys.length)];
  return nextIdea(catKey);
}

function newIdea(){
  const result = pickNextIdeaData();
  if(!result){ showToast('No ideas match your filters'); return; }
  playWhoosh();
  showIdea(result.catKey, result.idea);
}

function buildCardHTML(catKey, idea){
  const cat=CATS[catKey];
  const CAT_NAMES = Object.values(CATS).map(c=>c.label);
  const catTags = idea.tags.filter(t => CAT_NAMES.includes(t) && t !== cat.label);
  const normalTags = idea.tags.filter(t => !CAT_NAMES.includes(t));

  const catTagsHTML = catTags.map(t => {
    const k = Object.keys(CATS).find(k => CATS[k].label === t);
    const c = k ? CATS[k] : null;
    return `<span class="idea-cat-tag" style="background:${c?c.c1:'#888'}">${c?c.emoji:''} ${t}</span>`;
  }).join('');

  const tagsHTML = normalTags.map(t=>`<span class="idea-tag">${t}</span>`).join('');

  const ideaId = catKey+'-'+cat.ideas.indexOf(idea);
  const isSaved = !!liked[ideaId];
  const isDone = !!done[ideaId];

  return `
      <div class="idea-card-header">
        <div class="idea-card-brand">IDEA JAR</div>
        <button class="idea-dismiss" onclick="dismissIdea()">×</button>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:14px;min-height:26px">
          <div class="idea-badge" style="background:${cat.c1};color:#fff">${cat.emoji} ${cat.label}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${catTagsHTML}</div>
        </div>
        <div class="idea-title">${idea.t}</div>
        ${idea.s ? `<div class="idea-sub">${idea.s}</div>` : ''}
      </div>
      <div class="idea-card-body">
        <div class="idea-tags">${tagsHTML}</div>
        <div class="idea-btns">
          <div class="idea-btn-wrap">
            <button class="idea-btn-share" onclick="shareIdea()">📤</button>
            <span class="idea-btn-label">Share</span>
          </div>
          <div class="idea-btn-wrap">
            <button class="idea-btn-done${isDone?' done':''}" onclick="toggleDone()"><span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:20px;line-height:1">🎉</span></button>
            <span class="idea-btn-label">Did it!</span>
          </div>
          <div class="idea-btn-wrap">
            <button class="idea-btn-save${isSaved?' saved':''}" onclick="toggleSave()"><span style="font-size:20px">${isSaved?'❤️':'🤍'}</span></button>
            <span class="idea-btn-label">Save</span>
          </div>
        </div>
      </div>`;
}

const SLOTS=['A','B','C'];
let slotOrder=['A','B','C']; // slotOrder[0]=top, [1]=middle, [2]=back
let slotData={A:null,B:null,C:null}; // {catKey, idea} per slot

function getSlotEl(slot){ return document.getElementById('ideaCard'+slot); }
function topSlotName(){ return slotOrder[0]; }

function layoutSlots(){
  slotOrder.forEach((slot,i)=>{
    const el=getSlotEl(slot);
    el.classList.remove('pos-0','pos-1','pos-2');
    el.classList.add('pos-'+i);
  });
}

function assignCardLook(el, depth){
  // depth: 0=top (always flat), 1=mid, 2=back
  if(depth===0){
    const r=(Math.random()*2.4-1.2).toFixed(2);
    el.style.setProperty('--r', r+'deg');
    el.style.setProperty('--s', '1');
    el.style.setProperty('--y', '0px');
  } else if(depth===1){
    const r=((Math.random()<0.5?-1:1)*(2+Math.random()*2)).toFixed(2); // ±2 to ±4
    const y=(6+Math.random()*4).toFixed(1);
    el.style.setProperty('--r', r+'deg');
    el.style.setProperty('--s', '0.985');
    el.style.setProperty('--y', y+'px');
  } else {
    const r=((Math.random()<0.5?-1:1)*(3+Math.random()*2)).toFixed(2); // ±3 to ±5
    const y=(10+Math.random()*4).toFixed(1);
    el.style.setProperty('--r', r+'deg');
    el.style.setProperty('--s', '0.97');
    el.style.setProperty('--y', y+'px');
  }
}

function showIdea(catKey, idea){
  currentIdeaId=catKey+'-'+CATS[catKey].ideas.indexOf(idea);

  const topSlot=slotOrder[0], midSlot=slotOrder[1], backSlot=slotOrder[2];
  const topEl=getSlotEl(topSlot), midEl=getSlotEl(midSlot), backEl=getSlotEl(backSlot);

  [topEl,midEl,backEl].forEach(el=>{ el.getAnimations().forEach(a=>a.cancel()); el.style.opacity=''; });

  slotData[topSlot]={catKey,idea};
  topEl.innerHTML = buildCardHTML(catKey, idea);
  assignCardLook(topEl, 0);

  slotData[midSlot]=pickNextIdeaData();
  midEl.innerHTML = slotData[midSlot] ? buildCardHTML(slotData[midSlot].catKey, slotData[midSlot].idea) : '';
  assignCardLook(midEl, 1);

  slotData[backSlot]=pickNextIdeaData();
  backEl.innerHTML = slotData[backSlot] ? buildCardHTML(slotData[backSlot].catKey, slotData[backSlot].idea) : '';
  assignCardLook(backEl, 2);

  layoutSlots();
  topEl.classList.remove('animate-in');
  void topEl.offsetWidth;
  topEl.classList.add('animate-in');

  const overlay=document.getElementById('overlay');
  overlay.classList.add('show');

  initCardDrag();
}

function showSingleCard(catKey, idea){
  // Show one card without the full deck/generator — used from Saved/Done tabs
  currentIdeaId = catKey+'-'+CATS[catKey].ideas.indexOf(idea);
  const topEl = getSlotEl(slotOrder[0]);
  const midEl = getSlotEl(slotOrder[1]);
  const backEl = getSlotEl(slotOrder[2]);

  // Hide mid and back cards
  midEl.style.opacity='0';
  midEl.style.pointerEvents='none';
  backEl.style.opacity='0';
  backEl.style.pointerEvents='none';

  topEl.getAnimations().forEach(a=>a.cancel());
  topEl.style.transform='';
  topEl.style.opacity='';
  topEl.className='idea-card pos-0';
  assignCardLook(topEl, 0);
  topEl.innerHTML = buildCardHTML(catKey, idea);
  topEl.classList.remove('animate-in');
  void topEl.offsetWidth;
  topEl.classList.add('animate-in');

  singleCardMode = true;
  document.getElementById('overlay').classList.add('show');
  // Don't init drag — single card mode, no swiping to next
}

function restoreDeck(){
  // Restore mid and back visibility when dismissing single card view
  getSlotEl(slotOrder[1]).style.opacity='';
  getSlotEl(slotOrder[1]).style.pointerEvents='';
  getSlotEl(slotOrder[2]).style.opacity='';
  getSlotEl(slotOrder[2]).style.pointerEvents='';
}

function refreshTopCardButtons(){
  const topSlot=slotOrder[0];
  const data=slotData[topSlot];
  if(!data) return;
  getSlotEl(topSlot).innerHTML = buildCardHTML(data.catKey, data.idea);
}

function initCardDrag(){
  SLOTS.forEach(slot=>{
    const card=getSlotEl(slot);
    if(card.dataset.dragInit) return;
    card.dataset.dragInit='1';

    let startX=0,startY=0,curX=0,curY=0,dragging=false;

    function isTop(){ return topSlotName()===slot; }

    function onStart(x,y,target){
      if(!isTop() || card_isAnimating) return;
      if(target && target.closest('button')) return;
      dragging=true;
      startX=x; startY=y; curX=x; curY=y;
      card.style.transition='none';
    }
    function onMove(x,y){
      if(!dragging || !isTop() || card_isAnimating) return;
      curX=x; curY=y;
      const dx=curX-startX, dy=curY-startY;
      const rot=dx*0.06;
      card.style.transform=`translate(${dx}px,${dy*0.4}px) rotate(${rot}deg)`;
      card.style.opacity=String(Math.max(1-Math.max(Math.abs(dx)-200,0)/150,0.15));
    }
    function onEnd(){
      if(!dragging) return;
      dragging=false;
      if(!isTop()) return;
      const dx=curX-startX, dy=curY-startY;
      if(Math.abs(dx)>90 && !card_isAnimating){
        cardExitAndNext(dx>0?'right':'left', dx, dy);
      } else {
        card.style.transition='transform .3s cubic-bezier(.34,1.4,.64,1), opacity .3s ease';
        card.style.transform='';
        card.style.opacity='';
      }
    }

    card.addEventListener('mousedown',e=>onStart(e.clientX,e.clientY,e.target));
    window.addEventListener('mousemove',e=>onMove(e.clientX,e.clientY));
    window.addEventListener('mouseup',onEnd);

    card.addEventListener('touchstart',e=>{
      const t=e.touches[0];
      onStart(t.clientX,t.clientY,e.target);
    },{passive:true});
    card.addEventListener('touchmove',e=>{
      const t=e.touches[0];
      onMove(t.clientX,t.clientY);
    },{passive:true});
    card.addEventListener('touchend',onEnd);
  });
}

function cardExitAndNext(direction, startDx, startDy){
  if(card_isAnimating) return;
  const midSlot=slotOrder[1];
  if(!slotData[midSlot]){ showToast('No ideas match your filters'); return; }
  card_isAnimating=true;

  const oldTopSlot=slotOrder[0];
  const oldTopEl=getSlotEl(oldTopSlot);

  oldTopEl.style.transition='none';

  const fromX = startDx!==undefined ? startDx : 0;
  const fromY = startDx!==undefined ? startDy*0.4 : 0;
  const fromRot = startDx!==undefined ? startDx*0.06 : 0;

  const toX = direction==='left' ? -420 : 420;
  const toRot = direction==='left' ? -22 : 22;

  playWhoosh();

  // Promote mid->top and back->mid by class only — their fixed --r/--s/--y look stays exactly the same
  slotOrder = [slotOrder[1], slotOrder[2], slotOrder[0]];
  const newTopSlot=slotOrder[0], newMidSlot=slotOrder[1];
  const newTopEl=getSlotEl(newTopSlot);
  newTopEl.classList.remove('pos-0','pos-1','pos-2');
  newTopEl.classList.add('pos-0');
  getSlotEl(newMidSlot).classList.remove('pos-0','pos-1','pos-2');
  getSlotEl(newMidSlot).classList.add('pos-1');

  currentIdeaId = slotData[slotOrder[0]].catKey+'-'+CATS[slotData[slotOrder[0]].catKey].ideas.indexOf(slotData[slotOrder[0]].idea);

  const startOpacity = Math.max(1-Math.max(Math.abs(fromX)-200,0)/150,0.15);

  const anim = oldTopEl.animate([
    { transform:`translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: startOpacity },
    { transform:`translate(${fromX + (toX-fromX)*0.7}px, ${fromY + (-30-fromY)*0.7}px) rotate(${fromRot + (toRot-fromRot)*0.7}deg)`, opacity: startOpacity * 0.9 },
    { transform:`translate(${toX}px, -30px) rotate(${toRot}deg)`, opacity: 0 }
  ], { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });

  setTimeout(()=>{
    oldTopEl.getAnimations().forEach(a=>a.cancel());
    oldTopEl.style.transition='';
    oldTopEl.style.transform='';
    oldTopEl.style.opacity='';
    oldTopEl.classList.remove('pos-0','pos-1','pos-2');
    oldTopEl.classList.add('pos-2');

    // This card becomes the new back of the deck — give it fresh content and a fresh fixed look
    const newBackSlot=slotOrder[2];
    const newBackEl=getSlotEl(newBackSlot);
    slotData[newBackSlot]=pickNextIdeaData();
    newBackEl.style.opacity='0';
    newBackEl.innerHTML = slotData[newBackSlot] ? buildCardHTML(slotData[newBackSlot].catKey, slotData[newBackSlot].idea) : '';
    assignCardLook(newBackEl, 2);
    void newBackEl.offsetWidth;
    newBackEl.style.transition='opacity .35s ease';
    newBackEl.style.opacity='1';

    card_isAnimating=false;
  }, 300);
}

let singleCardMode = false;

function dismissIdea(){
  playDismiss();
  if(singleCardMode){
    restoreDeck();
    singleCardMode = false;
  }
  document.getElementById('overlay').classList.remove('show');
}


function toggleDone(){
  if(!currentIdeaId) return;
  const [catKey,idxStr]=currentIdeaId.split('-');
  const idea=CATS[catKey].ideas[+idxStr];
  if(done[currentIdeaId]){
    delete done[currentIdeaId];
    showToast('Unmarked');
  } else {
    done[currentIdeaId]={catKey,idx:+idxStr,title:idea.t,date:new Date().toISOString().slice(0,10)};
    playHeart();
    showToast('Nice work! ✅');
  }
  saveDone();
  refreshTopCardButtons();
}
function shareIdea(){
  if(!currentIdeaId) return;
  const [catKey, idxStr] = currentIdeaId.split('-');
  const idea = CATS[catKey].ideas[+idxStr];
  const cat = CATS[catKey];

  // Generate share card on canvas
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient from category colors
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, cat.c1);
  grad.addColorStop(1, cat.c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // White card
  const cx = W/2, cardW = 860, cardH = 760, cardX = (W-cardW)/2, cardY = (H-cardH)/2 - 30;
  const r = 56;
  ctx.beginPath();
  ctx.moveTo(cardX+r, cardY);
  ctx.lineTo(cardX+cardW-r, cardY);
  ctx.quadraticCurveTo(cardX+cardW, cardY, cardX+cardW, cardY+r);
  ctx.lineTo(cardX+cardW, cardY+cardH-r);
  ctx.quadraticCurveTo(cardX+cardW, cardY+cardH, cardX+cardW-r, cardY+cardH);
  ctx.lineTo(cardX+r, cardY+cardH);
  ctx.quadraticCurveTo(cardX, cardY+cardH, cardX, cardY+cardH-r);
  ctx.lineTo(cardX, cardY+r);
  ctx.quadraticCurveTo(cardX, cardY, cardX+r, cardY);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.textBaseline = 'top';

  // Pre-calculate layout heights for vertical centering
  const titleSize = idea.t.length > 50 ? 52 : idea.t.length > 30 ? 62 : 72;
  ctx.font = `800 ${titleSize}px -apple-system, system-ui, sans-serif`;
  const words = idea.t.split(' ');
  const maxW = cardW - 100;
  let lines = [], line = '';
  words.forEach(w => {
    const test = line ? line+' '+w : w;
    if(ctx.measureText(test).width > maxW){ lines.push(line); line=w; }
    else line = test;
  });
  if(line) lines.push(line);

  const brandH = 26;
  const badgeH = 54;
  const titleH = lines.length * (titleSize + 12) - 12;
  const subH = idea.s ? 46 : 0;
  // Brand + badge fixed near top
  const startY = cardY + 52;
  // Title + subtitle centered in card
  const titleBlockH = titleH + (idea.s ? subH + 28 : 0);
  const titleY_offset = cardY + (cardH - titleBlockH) / 2 + 40;

  // Clip to card so text can't overflow
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX + 10, cardY + 10, cardW - 20, cardH - 20, 46);
  ctx.clip();

  // IDEA JAR brand
  ctx.fillStyle = '#cccccc';
  ctx.font = '600 26px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IDEA JAR', cx, startY);

  // Badge
  const badgeY = startY + brandH + 28;
  const badgeText = cat.emoji + ' ' + cat.label.toUpperCase();
  ctx.font = 'bold 26px -apple-system, system-ui, sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 48;
  const badgeX = cx - badgeW/2;
  ctx.fillStyle = cat.c1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 27);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(badgeText, cx, badgeY + 14);

  // Title
  ctx.fillStyle = '#111111';
  ctx.font = `800 ${titleSize}px -apple-system, system-ui, sans-serif`;
  const titleY = titleY_offset;
  lines.forEach((l,i) => ctx.fillText(l, cx, titleY + i*(titleSize+12)));

  // Subtitle
  if(idea.s){
    ctx.fillStyle = '#999999';
    ctx.font = `italic 500 36px Georgia, serif`;
    const subWords = idea.s.split(' ');
    let subLines = [], subLine = '';
    subWords.forEach(w => {
      const test = subLine ? subLine+' '+w : w;
      if(ctx.measureText(test).width > cardW - 120){ subLines.push(subLine); subLine=w; }
      else subLine = test;
    });
    if(subLine) subLines.push(subLine);
    subLines = subLines.slice(0,2);
    if(subLines.length===2 && ctx.measureText(subLines[1]).width > cardW-120) subLines[1]=subLines[1].slice(0,-3)+'…';
    const subStartY = titleY + lines.length*(titleSize+12) + 60;
    subLines.forEach((sl,i) => ctx.fillText(sl, cx, subStartY + i*46));
  }

  ctx.restore();

  // Bottom branding
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Idea Jar — fight boredom', cx, cardY + cardH + 48);

  // Share
  canvas.toBlob(async blob => {
    if(!blob) return;
    const file = new File([blob], 'idea-jar.png', { type: 'image/png' });
    if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      try {
        await navigator.share({ files:[file], title: idea.t, text: 'via Idea Jar 🫙' });
      } catch(e){}
    } else if(navigator.share){
      // Fallback: share text only
      navigator.share({ title:'Idea Jar', text: `${cat.emoji} ${idea.t}\n\nvia Idea Jar 🫙` }).catch(()=>{});
    } else {
      // Desktop: download the image
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'idea-jar.png';
      a.click();
      showToast('Image downloaded!');
    }
  }, 'image/png');
}

function toggleSave(){
  if(!currentIdeaId) return;
  const [catKey,idxStr]=currentIdeaId.split('-');
  const idea=CATS[catKey].ideas[+idxStr];
  if(liked[currentIdeaId]){
    delete liked[currentIdeaId];
    showToast('Removed');
  } else {
    liked[currentIdeaId]={catKey,idx:+idxStr,title:idea.t};
    playHeart();
    playHaptic([12, 40, 8]); // double tap feel
    showToast('Saved ♥');
  }
  saveLiked();
  refreshTopCardButtons();
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
      if(idea){ playWhoosh(); showSingleCard(item.catKey,idea); }
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
      if(idea){ playWhoosh(); showSingleCard(item.catKey,idea); }
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

  const overlay = document.getElementById('overlay');
  if(overlay.classList.contains('show') && !card_isAnimating){
    cardExitAndNext('left');
    return;
  }
  newIdea();
}

/* ─── INIT ──────────────────────────────────── */
document.getElementById('fab').disabled = false;
document.getElementById('app-title-text').textContent = TITLES[Math.floor(Math.random()*TITLES.length)];
updateProBadge();
renderFilters();
renderCats();

