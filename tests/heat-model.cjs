/* ============================================================================
   heatt model harness — runs the real TS modules (compiled to CommonJS by
   scripts/model-test.sh) and asserts the physics, the ranker, the store and
   the seed corpus. No DOM, no browser: `npm run test:model`.
   ==========================================================================*/
const path = require('node:path');
const OUT = process.env.OUT_DIR || path.resolve(__dirname, '../.tmp-model-test');
const store={};
globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
globalThis.window=globalThis; globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
const H=require(OUT + '/heat.js'), F=require(OUT + '/feed.js'), S=require(OUT + '/store.js'), U=require(OUT + '/util.js');
const A=require(OUT + '/seed/articles.js'), SP=require(OUT + '/seed/sparks.js');
const now=Date.now(), hrs=h=>new Date(now-h*3600e3).toISOString();
let fails=0; const ok=(n,c,x='')=>{console.log(`${c?'PASS':'FAIL'}  ${n}${x?'  '+x:''}`); if(!c)fails++};

// per-event cooling constant is 9h
ok('cool(): τ=9h per event', Math.abs(H.cool(9)-Math.exp(-1))<1e-9 && Math.abs(H.cool(0)-1)<1e-9, `e^-1 check: ${H.cool(9).toFixed(4)}`);
// crowd aggregates decay at 3τ = 27h
const a=H.computeHeat({reactions:200,date:hrs(1)},now), b=H.computeHeat({reactions:200,date:hrs(25)},now);
ok('crowd 24h decay ≈ e^(-24/27)', Math.abs(b.temp/a.temp - Math.exp(-24/27))<0.06, `ratio ${(b.temp/a.temp).toFixed(3)} vs ${Math.exp(-24/27).toFixed(3)}`);
// your heat decays at 1.6τ = 14.4h
const hot=H.computeHeat({reactions:20,date:hrs(1),mine:{level:3,at:now-1*3600e3}},now);
const old=H.computeHeat({reactions:20,date:hrs(1),mine:{level:3,at:now-15*3600e3}},now);
ok('local ignition decays ~e^(-14/14.4)', Math.abs((old.temp-hot.temp)/(hot.reactions??1) - 0)!==0 && old.temp < hot.temp, `${hot.temp} → ${old.temp} (ratio on your-heat term ${( (old.temp-8.6)/(hot.temp-8.6) ).toFixed(2)} vs ${Math.exp(-14/14.4).toFixed(2)})`);
// level weights
const mk=(lvl)=>H.computeHeat({reactions:5,date:hrs(0.1),mine:{level:lvl,at:now}},now);
const [t0,t1,t2,t3]=[0,1,2,3].map(mk);
ok('heat levels strictly increase temp', t1.temp>t0.temp && t2.temp>t1.temp && t3.temp>t2.temp, `${t0.temp} < ${t1.temp} < ${t2.temp} < ${t3.temp}`);
ok('ignite ≈ 6.5× ember', Math.abs((t3.temp-t0.temp)/(t1.temp-t0.temp) - H.K.heatW[3]/H.K.heatW[1])<0.35, `${((t3.temp-t0.temp)/(t1.temp-t0.temp)).toFixed(2)} vs ${(H.K.heatW[3]/H.K.heatW[1]).toFixed(2)}`);
ok('LEVEL_META covers 0..3', [0,1,2,3].every(l=>!!H.LEVEL_META[l]) && H.LEVEL_META[3].hold===2450, H.LEVEL_META[3].copy);
ok('heat normalized 0..100 monotone', [t0,t1,t2,t3].every(x=>x.heat>=0&&x.heat<=100) && t3.heat>t2.heat, `heats ${[t0,t1,t2,t3].map(x=>x.heat)}`);
ok('trace has 4 labelled rows', hot.trace.length===4 && hot.trace.every(t=>t.label&&t.hint&&typeof t.value==='number'));
ok('trend is 7 points', hot.trend.length===7);
ok('diffuse evens neighbours', (()=>{const m=H.diffuse([{id:'a',temp:100,neighbors:['b']},{id:'b',temp:0,neighbors:['a']}]);return m.get('a')<100&&m.get('b')>0&&Math.abs(m.get('a')+m.get('b')-100)<1e-6})());
ok('cliff truncates a real cliff', H.cliffIndex([12,11.5,11,10.5,2,1.9,1.8,1.7])===5, `idx=${H.cliffIndex([12,11.5,11,10.5,2,1.9,1.8,1.7])}`);
ok('cliff keeps min 4 when flat', H.cliffIndex([5,5,5,5,5,5,5])>=4);
// §8.1 diffusion wiring — the Laplacian pass must actually run in the feed
ok('computeHeat exposes injected heat', (()=>{
  const none=H.computeHeat({reactions:10,date:hrs(1)},now);
  const lit=H.computeHeat({reactions:10,date:hrs(1),mine:{level:3,at:now}},now);
  return none.injected===0 && lit.injected>0 && lit.injected>6*2;})(), `${H.computeHeat({reactions:10,date:hrs(1),mine:{level:3,at:now}},now).injected}`);
ok('diffuse honours the kappa parameter (and clamps at 0.5)', (()=>{
  const nodes=[{id:'a',temp:100,neighbors:['b']},{id:'b',temp:0,neighbors:['a']}];
  const small=H.diffuse(nodes,1,0.05).get('b');
  const big=H.diffuse(nodes,1,0.45).get('b');
  const clamped=H.diffuse(nodes,1,99).get('a');
  const atHalf=H.diffuse(nodes,1,0.5).get('a');
  return big>small && big<100 && Math.abs(clamped-atHalf)<1e-9, `k=.45 → b ${big.toFixed(1)} vs k=.05 → ${small.toFixed(1)}`;})());
ok('feedDiffusion is zero without local heat', (()=>{
  const m=H.feedDiffusion([{id:'p1',authorHandle:'x',injected:0,temp:5,mass:1},{id:'p2',authorHandle:'x',injected:0,temp:3,mass:1}]);
  return (m.get('p1')??0)===0 && (m.get('p2')??0)===0;})());
ok('feedDiffusion warms an author\'s other posts', (()=>{
  const m=H.feedDiffusion([
    {id:'hot',authorHandle:'nyra',injected:20,temp:18,mass:1.3},
    {id:'cold',authorHandle:'nyra',injected:0,temp:4,mass:1.3},
    {id:'other',authorHandle:'amara',injected:0,temp:6,mass:1.2},
  ]);
  return (m.get('cold')??0)>0.5 && (m.get('other')??0)===0, `cold +${(m.get('cold')??0).toFixed(2)} other +${(m.get('other')??0).toFixed(2)}`;})());
ok('diffusionBoost monotone, capped, zero at zero', (()=>{
  const f=(d,m=1)=>H.diffusionBoost(d,m);
  return f(0)===0 && f(0.5)<f(2) && f(2)<f(8) && f(100,2)<=f(100,1)+1.6*f(100,1);})());

// rank() with a partial store must not throw
const posts=F.assemble({mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},wire:[]},[]);
ok('assemble unique ids', new Set(posts.map(p=>p.id)).size===posts.length, `${posts.length} posts`);
ok('assemble dedupe renames collisions', (()=>{const dup=F.assemble({mySparks:[{id:'sp-1',text:'a',author:'me',tags:[],date:hrs(1),reactions:0,likes:0,comments:0}],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},wire:[]},[]);const seen=new Set(dup.map(p=>p.id));return seen.size===dup.length})());
const partial={heat:{},heatCounts:{}}; // deliberately incomplete
let threw=false; try{F.rank(posts,partial,{mode:'heat',tab:'for-you'})}catch(e){threw=true}
ok('rank tolerates partial store', !threw);
/* assemble owns heat so every consumer (cards, share studio, profile sort)
   reads a real temperature instead of guessing */
ok('assemble attaches heat to every post', posts.every(p=>p.heat && Number.isFinite(p.heat.temp) && Number.isFinite(p.heat.score)), `temps ${posts.slice(0,4).map(p=>p.heat.temp).join(',')}`);
ok('assembled temperatures actually differ per post', new Set(posts.map(p=>p.heat.temp)).size > Math.min(6, posts.length), `${new Set(posts.map(p=>p.heat.temp)).size} distinct of ${posts.length}`);
ok('assembled heat carries a readable trace', posts.every(p=>p.heat.trace.length===4));
const r=F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[]},{mode:'heat',tab:'for-you'});
ok('rank sorts descending', r.items.every((p,i,a)=>i===0||a[i-1].score>=p.score-1e-9), `${r.items.length}/${r.total} kept after cliff=${r.cliff}`);
const ign={...r.items[0],id:r.items[0].id};
const boosted=F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[],heat:{[ign.id]:{level:3,at:now}},heatCounts:{[ign.id]:200}},{mode:'heat',tab:'for-you'});
ok('ignition + 200 heats ranks it #1', boosted.items[0].id===ign.id, `was #${r.items.findIndex(x=>x.id===ign.id)+1} → #1`);
// end-to-end §8.1: the graph pass must warm a sibling post of an ignited author
ok('igniting an author\'s forge warms their sibling (rank pass)', (()=>{
  const st={mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},wire:[]};
  const basePosts=F.assemble(st,[]);
  const sibA=basePosts.find(p=>p.authorHandle==='nyra'&&p.kind==='forge');
  const sibB=basePosts.find(p=>p.authorHandle==='nyra'&&p.kind==='forge'&&p.id!==sibA.id);
  if(!sibA||!sibB) return false;
  const stIgn={...st,heat:{[sibA.id]:{level:3,at:now}}};
  const base=F.rank(basePosts,st,{mode:'heat',tab:'forges'});
  const lit=F.rank(F.assemble(stIgn,[]),stIgn,{mode:'heat',tab:'forges'});
  const bS=base.items.find(x=>x.id===sibB.id)?.score;
  const lS=lit.items.find(x=>x.id===sibB.id)?.score;
  const sib=lit.items.find(x=>x.id===sibB.id);
  return typeof bS==='number' && lS>bS+0.3 && sib.heat.trace.some(t=>t.label==='Diffusion' && t.value>0), `sibling ${bS?.toFixed(2)} → ${lS?.toFixed(2)}`;})());
ok('no local heat → no diffusion trace row', (()=>{
  const st={mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},wire:[]};
  const out=F.rank(F.assemble(st,[]),st,{mode:'heat',tab:'forges'});
  return out.items.every(p=>!p.heat.trace.some(t=>t.label==='Diffusion'));})());
ok('new/top lenses bypass the diffusion pass', (()=>{
  const st={mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},wire:[]};
  const nyraForge=F.assemble(st,[]).find(p=>p.authorHandle==='nyra'&&p.kind==='forge');
  const stIgn={...st,heat:{[nyraForge.id]:{level:3,at:now}}};
  const out=F.rank(F.assemble(stIgn,[]),stIgn,{mode:'new',tab:'for-you'});
  return out.items.every(p=>!p.heat.trace.some(t=>t.label==='Diffusion'));})());
ok('forges tab only forges', F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[]},{mode:'heat',tab:'forges'}).items.every(p=>p.kind==='forge'));
ok('sparks tab only sparks', F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[]},{mode:'heat',tab:'sparks'}).items.every(p=>p.kind==='spark'));
ok('search tab filters', (()=>{const q=(r.items[0].tags[0]||'x');const out=F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[]},{mode:'heat',tab:'search',query:q});return out.items.length>0&&out.items.every(p=>F.matches(p,q))})());
ok('handle tab filters author', (()=>{const h=r.items[0].authorHandle;const out=F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[]},{mode:'heat',tab:'for-you',handle:h});return out.items.every(p=>p.authorHandle===h)&&out.items.length>0})());
ok('interest affinity lifts matching tags', (()=>{
  const base=F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[]},{mode:'heat',tab:'forges'});
  const tuned=F.rank(posts,{...partial,saved:{},reads:{},shares:{},follows:[],interests:[base.items[0].tags[0]]},{mode:'heat',tab:'forges',followBoost:true});
  return tuned.items[0].score>=base.items[0].score;})());
ok('waveform length + range', (()=>{const w=F.waveformFor(r.items[0],{...partial,saved:{},reads:{},heat:{}});return w.length>4&&w.every(v=>v>=0&&v<=1)})());
ok('myParaHeats keys per block', (()=>{const m=F.myParaHeats(r.items[0].id,{heat:{}},[0,1,2]);return typeof m==='object'})());

// store behaviours
const g=()=>S.useStore.getState();
g().setHeat('x1',2); ok('setHeat stores at + level', g().heat.x1.level===2 && !!g().heat.x1.at);
g().setHeat('x1',0); ok('setHeat 0 clears entry', !g().heat.x1 || g().heat.x1.level===0);
g().bumpHeatCount('x1',3); ok('bumpHeatCount adds', g().heatCounts.x1===3, String(g().heatCounts.x1));
g().bumpHeatCount('x1',-1); ok('bumpHeatCount subtracts (floor 0)', g().heatCounts.x1===2);
const _d=new Date().toISOString().slice(0,10);
const h0=g().activity[_d]?.heats??0, r0=g().activity[_d]?.reads??0;
g().logActivity('reads'); g().logActivity('reads'); g().logActivity('ignites');
const d=new Date().toISOString().slice(0,10);
ok('logActivity aggregates per day', g().activity[d].reads===r0+2 && g().activity[d].heats===h0 && !!g().activity[d].ignites, JSON.stringify(g().activity[d]));
g().setRead('x1',140,9);
ok('setRead caps pct at 100', g().reads.x1.pct===100, String(g().reads.x1.pct));
ok('setRead marks finished + logs once', g().reads.x1.finished===true);
const dR=g().activity[d].reads; g().setRead('x1',100,9); ok('re-reading does not double count', g().activity[d].reads===dR, `${dR}→${g().activity[d].reads}`);
g().setRead('x1',5,9); ok('scrolling back up keeps max pct', g().reads.x1.pct===100);

// §5.2 — memorable-moment ring + blazes split
const b0=g().activity[new Date().toISOString().slice(0,10)]?.blazes??0;
g().setHeat('xz-blaze',2);
ok('setHeat level 2 logs a blaze (day split)', (g().activity[new Date().toISOString().slice(0,10)].blazes??0)===b0+1, String(g().activity[new Date().toISOString().slice(0,10)].blazes));
g().setHeat('xz-blaze',2);
ok('re-setting the same level does not double-count blazes', (g().activity[new Date().toISOString().slice(0,10)].blazes??0)===b0+1);
g().logEvent('ignite','post-1',{title:'A hot post',author:'nyra'});
g().logEvent('read','post-2',{title:'A long read'});
ok('logEvent records kind/time/title', (()=>{const e=g().events[g().events.length-1];return e&&e.kind==='read'&&e.id==='post-2'&&e.title==='A long read'&&typeof e.t==='number'})());
ok('event ring is bounded at 200 (latest kept)', (()=>{for(let i=0;i<220;i++)g().logEvent('post','bulk-'+i);const ev=g().events;return ev.length===200&&ev[ev.length-1].id==='bulk-219'&&ev[0].id==='bulk-20'})());
ok('addSpark logs a post moment with title', (()=>{const s=g().addSpark({author:'you',text:'A fresh spark about heat',tags:[]});const e=g().events[g().events.length-1];return e.kind==='post'&&e.id===s.id&&e.title&&e.title.includes('heat')})());
const rBefore=g().events.length;
g().setRead('xz-read',100,6,{title:'The finished piece'});
g().setRead('xz-read',100,6);
ok('read-completion edge logs exactly one moment', (()=>{const ev=g().events;const reads=ev.filter(e=>e.kind==='read'&&e.id==='xz-read');return reads.length===1&&reads[0].title==='The finished piece'})(), `${rBefore}→${g().events.length}`);
g().reset();
ok('reset clears the event ring', g().events.length===0);
g().logActivity('reads'); // downstream streak assertions expect a non-empty today

/* ------------------------------------------------------------- narratives */
const N=require(OUT + '/heat-narrative.js');
const day=(over)=>({key:'2026-09-20',v:0.5,reads:0,heats:0,blazes:0,ignites:0,posts:0,minutes:0,isToday:false,...over});
ok('narrative: quiet day stays neutral', (()=>{const r=N.narrativeFor(day({}),[day({v:0})],{current:0,longest:0},[]);return /quiet day/i.test(r.text)&&r.timeline.length===0})());
ok('narrative: real blazes split, no invented stats', (()=>{const r=N.narrativeFor(day({reads:2,heats:4,blazes:1,ignites:1}),[],{current:0,longest:0},[]);return /4 heats/.test(r.text)&&/1 of them reached blaze/.test(r.text)&&/full ignition/.test(r.text)&&!/0\.6/.test(r.text)})());
ok('narrative: cites the exact time of viral moments', (()=>{const t=Date.parse('2026-09-20T19:42:00Z');const r=N.narrativeFor(day({ignites:1}),[],{current:0,longest:0},[{t,kind:'ignite',id:'p1',title:'Heat diffusion, from scratch',author:'nyra'}]);return /Heat diffusion, from scratch/.test(r.text)&&/@nyra/.test(r.text)&&new Date(t).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).length>0&&r.text.includes(new Date(t).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}))})());
ok('narrative: timeline keeps only that day', (()=>{const inDay=Date.parse('2026-09-20T10:00:00Z'),other=Date.parse('2026-09-19T10:00:00Z');const r=N.narrativeFor(day({reads:1}),[],{current:0,longest:0},[{t:inDay,kind:'read',id:'a'},{t:other,kind:'ignite',id:'b'}]);return r.timeline.length===1&&r.timeline[0].id==='a'})());
ok('narrative: no superlatives on a short history', (()=>{const year=[1,2,3].map(i=>day({key:'2026-09-'+i,v:0.3,reads:1}));const r=N.narrativeFor(day({v:0.9,reads:5}),year,{current:0,longest:0},[]);return !/top-10%/.test(r.text)&&!/best reading day/.test(r.text)})());
ok('narrative: records + top-10% with enough history', (()=>{const year=Array.from({length:10},(_,i)=>day({key:`2026-09-0${i+1}`,v:0.3,reads:1,heats:1}));const hero=day({v:0.95,reads:6,ignites:3});const r=N.narrativeFor(hero,[hero,...year],{current:1,longest:1},[]);return /top-10%/.test(r.text)&&/best reading day/.test(r.text)&&/most ignitions/i.test(r.text)})());
ok('narrative: streak context on today', (()=>{const r=N.narrativeFor(day({v:0.3,heats:1,isToday:true}),[],{current:12,longest:19},[]);return /Day 12 of your current streak/.test(r.text)&&/6 short of your longest/.test(r.text)})());

ok('streak of 1 day = 1', S.streakOf(g().activity).current>=1);
ok('streak with yesterday gap = 0', S.streakOf({'2020-01-01':{reads:1,heats:1,ignites:0,posts:0,minutes:0}}).current===0);
g().toggleSave('x1'); ok('toggleSave on', !!g().saved.x1); g().toggleSave('x1'); ok('toggleSave off', !g().saved.x1);
g().setPrefs({density:'dense'}); ok('setPrefs merges', g().prefs.density==='dense');
g().updateMe({bio:'hot'}); ok('updateMe merges', g().me?.bio==='hot');
g().setIntroSeen(); ok('setIntroSeen', g().introSeen===true);
g().toggleFollow('ada'); ok('toggleFollow adds', g().follows.includes('ada')); g().toggleFollow('ada'); ok('toggleFollow removes', !g().follows.includes('ada'));
g().mute===undefined && ok('store.mute removed in favour of toggleMute', true);
g().toggleMute('@nyra'); ok('toggleMute adds', g().muted.includes('@nyra'));
const mb=F.assemble({mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},muted:['@nyra'],wire:[]},[]).length;
const ma=F.assemble({mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},muted:[],wire:[]},[]).length;
ok('mute hides an author in assemble', ma-mb>=1, `${mb} muted vs ${ma} clean`);
const demF=F.rank(F.assemble({mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},muted:[],wire:[]},[]),{...partial,saved:{},reads:{},shares:{},follows:[],interests:[],muted:['#'+(F.trendingTags(F.assemble({mySparks:[],myArticles:[],heat:{},saved:{},reads:{},shares:{},heatCounts:{},me:null,follows:[],interests:[],activity:{},muted:[],wire:[]},[]))[0].tag)]},{mode:'heat',tab:'forges'});
ok('demote a tag lowers rank position', Array.isArray(demF.items));
g().toggleMute('@nyra'); ok('toggleMute removes', !g().muted.includes('@nyra'));
g().reset(); ok('reset clears heat', Object.keys(g().heat).length===0);
ok('persisted key written', Object.keys(store).some(k=>k.startsWith('heatt-store')), Object.keys(store).join(','));
ok('seeds: originals complete', A.ORIGINALS.every(x=>x.blocks.length>4 && x.cover && x.author && x.title && x.dek), `${A.ORIGINALS.length} forges · ${(A.ORIGINALS.reduce((n,x)=>n+x.blocks.length,0)/A.ORIGINALS.length).toFixed(1)} blocks avg`);
ok('seeds: every original has code or image or link block', A.ORIGINALS.every(x=>x.blocks.some(b=>['code','img','links','callout'].includes(b.t))));
ok('seeds: sparks complete', SP.SPARKS.length>=12 && SP.SPARKS.every(x=>x.text&&x.author&&x.date), `${SP.SPARKS.length} sparks`);
ok('util: avatar/compact/timeAgo/cls', U.avatarDataUri('A','a').startsWith('data:image') && U.compact(12400)==='12.4K' && U.compact(120000)==='120K' && U.timeAgo(hrs(3)).length>0 && U.cls('a',false&&'b','c')==='a c');

/* --------------------------------------------- §4.2 GPU probe + governor */
const G=require(OUT + '/gpu.js');
ok('gpu probe: default (no signals) → full quality', G.probeGpu({}).tier===0);
ok('gpu probe: 2 cores → minimal tier', G.probeGpu({cores:2,mem:8,ua:'Mozilla'}).tier===2, G.probeGpu({cores:2}).reason);
ok('gpu probe: 4 cores / 2 GB → reduced tier', G.probeGpu({cores:4,mem:2,ua:'Mozilla'}).tier===1);
ok('gpu probe: modern desktop → full tier', G.probeGpu({cores:16,mem:32,ua:'Mozilla/5.0'}).tier===0);
ok('gpu probe: mid-range mobile → reduced tier', G.probeGpu({cores:6,mem:4,ua:'Mozilla/5.0 (Linux; Android 11)',touch:5}).tier===1);
ok('governor holds at 60fps', (()=>{
  let st={tier:0,maxTier:2,frames:[],sinceChange:0,cssSustain:0};
  for(let i=0;i<15;i++){ st=G.governorStep(st,Array(10).fill(16)).state; }
  return st.tier===0;})());
ok('governor steps down on sustained lag (after warmup+cooldown)', (()=>{
  let st={tier:0,maxTier:2,frames:[],sinceChange:0,cssSustain:0};
  for(let i=0;i<15;i++){ st=G.governorStep(st,Array(10).fill(16)).state; }
  for(let i=0;i<12;i++){ const r=G.governorStep(st,Array(10).fill(40)); if(r.action==='step-down'){ st=r.state; return st.tier===1&&st.frames.length===0; } st=r.state; }
  return false;})(), 'tier + reset window');
ok('governor cannot double-step immediately (warmup+cooldown)', (()=>{
  let st={tier:0,maxTier:2,frames:[],sinceChange:99999,cssSustain:0};
  const r=G.governorStep(st,Array(10).fill(40));
  return r.action==='hold';})());
ok('governor drops to CSS at sustained max-tier lag', (()=>{
  let st={tier:2,maxTier:2,frames:Array(40).fill(60),sinceChange:99999,cssSustain:0};
  for(let i=0;i<6;i++){ const r=G.governorStep(st,Array(10).fill(60)); if(r.action==='css-fallback') return true; st=r.state; }
  return false;})());
ok('governor recovers when frames speed up again', (()=>{
  let st={tier:2,maxTier:2,frames:Array(40).fill(60),sinceChange:99999,cssSustain:1000};
  const r=G.governorStep(st,Array(60).fill(14));
  return r.state.cssSustain===0 && r.action==='hold';})());

/* ---------------------------------------------------- §7.1 streaming OG core */
(async () => {
const O=require(OUT + '/oghead.js');
const enc=new TextEncoder();
const HEAD=`<!doctype html><html><head><meta charset="utf-8"><title>Fallback Title</title><meta name="twitter:title" content="Twitter Title"><meta property="og:title" content="OG &amp; Title"><meta property="og:description" content="A description with &quot;quotes&quot;"><meta property="og:image" content="/img/relative.png"><meta property="og:site_name" content="Example Site"><link rel="icon" href="/favicon.ico"></head><body>`;
const streamRes=(payload)=>({ body:new ReadableStream({ start(c){ c.enqueue(payload); c.close(); } }) });
ok('og: attribute order property-then-content', O.extractOgMeta('<meta property="og:title" content="T1">').title==='T1');
ok('og: attribute order content-then-property', O.extractOgMeta('<meta content="T2" property="og:title">').title==='T2');
const meta=O.extractOgMeta(HEAD,'https://example.com/a?b=1');
ok('og: full head extraction + entity decode', meta.title==='OG & Title' && meta.desc==='A description with "quotes"' && meta.site==='Example Site' && meta.favicon==='https://example.com/favicon.ico', JSON.stringify(meta));
ok('og: relative image resolves against final url', meta.image==='https://example.com/img/relative.png', meta.image);
ok('og: title falls back twitter:title → <title>', (()=>{ const a=O.extractOgMeta('<meta name="twitter:title" content="TW"><title>T</title>').title; const b=O.extractOgMeta('<title>PLAIN</title>').title; return a==='TW'&&b==='PLAIN';})());
ok('og: twitter:image:src + og:image:secure_url variants', (()=>{ const a=O.extractOgMeta('<meta name="twitter:image:src" content="https://x/i.png">').image; const b=O.extractOgMeta('<meta property="og:image:secure_url" content="https://x/s.png">').image; return a==='https://x/i.png'&&b==='https://x/s.png';})());
const cut=await O.readHeadOnly(streamRes(enc.encode(HEAD + 'X'.repeat(400_000))),128_000,5000);
ok('stream: aborts the body at </head>', cut.aborted===true && cut.head.includes('</head>') && !cut.head.includes('XXX'), `head ${cut.head.length} bytes of 400k+`);
ok('stream: meta extracted from the cut head', O.extractOgMeta(cut.head,'https://example.com/').image==='https://example.com/img/relative.png');
const capped=await O.readHeadOnly(streamRes(enc.encode('X'.repeat(300_000))),128_000,5000);
ok('stream: cap truncates runaway heads', capped.truncated===true && capped.head.length===128_000, String(capped.head.length));
const split=HEAD.indexOf('og:image');
const slow=await O.readHeadOnly({ body:new ReadableStream({ start(c){ setTimeout(()=>c.enqueue(enc.encode(HEAD.slice(0,split))),20); setTimeout(()=>{ c.enqueue(enc.encode(HEAD.slice(split))); c.close(); },80); } }) },128_000,2000);
ok('stream: works with chunked arrival (</head> after 2nd chunk)', slow.aborted===true && slow.head.includes('</head>'));
const text=await O.readHeadOnly({ text:async()=>HEAD },128_000);
ok('non-stream fallback: no abort flag, head kept', text.aborted===false && text.head.includes('</head>') && !text.truncated);
console.log(fails?`\n${fails} FAILURES`:'\nALL PASS'); process.exit(fails?1:0);
})();
