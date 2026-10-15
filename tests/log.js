// Practice log: drill, progression and quiz logging on a fake clock, short runs dropped, sessions split after a 20-minute gap,
// clean marks and best tempo, manual entries, merge and import without losing anything, and gist sync between two devices
// against a fake GitHub API. Also checks the Practice views for missing text in both layouts.
const {JSDOM}=require('jsdom');
const goMode=(d,ck,m)=>{if(m==='name'||m==='find'){ck(d.querySelector('[data-mode=quiz]')); const b=d.querySelector(`[data-act=quiz][data-v=${m}]`); if(b&&b.getAttribute('aria-pressed')!=='true') ck(b);} else ck(d.querySelector(`[data-mode=${m}]`));};
const html=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
let bad=0; const fail=(k,m)=>{bad++; console.log('FAIL',k,m===undefined?'':m);};
const ok=(c,k,m)=>{if(!c) fail(k,m);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// a fake GitHub gist API shared by every device
const gh={gists:{},calls:[],token:'tok123'};
function fakeFetch(w){
  return async(url,opt={})=>{
    const H=opt.headers||{}, method=opt.method||'GET'; gh.calls.push(method+' '+url);
    const res=(status,body)=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
    if(H.Authorization!=='Bearer '+gh.token) return res(401,{});
    const u=new URL(url);
    if(u.pathname==='/gists'&&method==='GET') return res(200,Object.entries(gh.gists).map(([id,g])=>({id,files:Object.fromEntries(Object.keys(g.files).map(f=>[f,{filename:f}]))})));
    if(u.pathname==='/gists'&&method==='POST'){const b=JSON.parse(opt.body), id='g'+(Object.keys(gh.gists).length+1); gh.gists[id]={public:b.public,files:b.files}; return res(201,{id});}
    const m=u.pathname.match(/^\/gists\/(\w+)$/), g=m&&gh.gists[m[1]];
    if(!g) return res(404,{});
    if(method==='GET') return res(200,{id:m[1],files:Object.fromEntries(Object.entries(g.files).map(([f,v])=>[f,{content:v.content,truncated:false}]))});
    if(method==='PATCH'){const b=JSON.parse(opt.body); Object.assign(g.files,b.files); return res(200,{id:m[1]});}
    return res(400,{});
  };
}
async function device(wide=true){
  const dom=new JSDOM(html,{url:'https://ergooding.github.io/fretmap/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.matchMedia=()=>({matches:wide,addEventListener(){}}); w.__now=0; w.__clock=Date.UTC(2026,9,13,15,0,0);
    w.Date.now=()=>w.__clock; w.fetch=fakeFetch(w);
    const node=()=>({type:'',connect(){},start(){},stop(){},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}});
    w.AudioContext=function(){return {get currentTime(){return w.__now},state:'running',destination:{},createOscillator:node,createGain:node,createBiquadFilter:node,resume(){}}};
  }});
  const w=dom.window; w.addEventListener('error',e=>fail('error',e.message));
  await sleep(60);
  const d=w.document, X=w.__fretDebug, click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  const mode=m=>goMode(d,click,m);
  const advance=(secs)=>{w.__clock+=secs*1000; const end=w.__now+secs; while(w.__now<end){w.__now=Math.min(end,w.__now+0.02); if(X.st.playing&&X.st.mode==='drill') X.schedule();}};
  return {w,d,X,click,mode,advance};
}
const entries=X=>X.LOG.sessions.flatMap(s=>s.entries);
(async()=>{
  const A=await device(true); const {w,d,X,click,mode,advance}=A;
  ok(!d.querySelector('[data-mode=practice]').hidden,'nav');
  // drill: a 60 s run on a box is logged with its passes
  mode('drill'); {const sp=d.getElementById('selPos'); sp.value='5'; sp.dispatchEvent(new w.Event('change',{bubbles:true}));} X.saved.bpm=120;
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(60); click(d.querySelector('[data-act=play]'));
  let E=entries(X); ok(E.length===1,'drill-entry',E.length);
  const e0=E[0]||{}; ok(e0.secs===60&&e0.passes>=1&&e0.skill.startsWith('box:')&&e0.bpm[0]===120,'drill-fields',JSON.stringify(e0));
  ok(X.LOG.skills[e0.skill]&&/frets 5–9/.test(X.LOG.skills[e0.skill].name),'drill-skill',JSON.stringify(X.LOG.skills[e0.skill]));
  // clean chip appears after the run and sets the best tempo
  const chip=d.querySelector('[data-act=clean]'); ok(chip,'clean-chip');
  if(chip){click(chip); ok(e0.clean===120&&X.bestOf(e0.skill).bpm===120,'clean-mark'); click(d.querySelector('[data-act=clean]')); ok(!e0.clean&&!X.bestOf(e0.skill),'clean-unmark'); click(d.querySelector('[data-act=clean]'));}
  // a 10 s run is dropped
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(10); click(d.querySelector('[data-act=play]'));
  ok(entries(X).length===1,'short-dropped',entries(X).length);
  // leaving the mode mid-run logs it
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(20); mode('explore');
  ok(entries(X).length===2,'stop-on-mode-switch',entries(X).length);
  // quiz answers
  mode('name'); for(let i=0;i<5;i++){w.__clock+=4000; const q=X.st.q; click(d.querySelector(`[data-act=answer][data-i="${i%2?q.iv:(q.iv===X.cur.allowed[0]?X.cur.allowed[1]:X.cur.allowed[0])}"]`)); click(d.querySelector('[data-act=next]'));}
  const qe=entries(X).find(e=>e.skill==='iv'); ok(qe&&qe.asked===5&&qe.right===2&&Object.values(qe.miss).reduce((a,b)=>a+b,0)===3,'quiz',JSON.stringify(qe));
  // a progression run in Drill: pop progression, strum then arpeggio, in frets 5–9
  mode('drill'); click(d.querySelector('[data-act=line][data-v=prog]')); X.saved.bpm=120;
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer);
  for(let i=0;i<40;i++){advance(1); await sleep(20);} click(d.querySelector('[data-act=play]'));
  const re=entries(X).find(e=>e.skill.startsWith('prog:'));
  ok(re&&re.secs===40&&re.passes>=1&&re.prog==='pop'&&re.plan==='both'&&re.swing===false,'prog-run',JSON.stringify(re));
  ok(re&&/Pop: I V vi IV|Pop: Imaj7 V7 vi7 IVmaj7/.test(X.LOG.skills[re.skill].name)&&/frets 5–9/.test(X.LOG.skills[re.skill].name),'prog-skill',re&&JSON.stringify(X.LOG.skills[re.skill]));
  // a different strum pattern is a different skill
  const sel=d.querySelector('[data-set=rpat]'); sel.value='gallop'; sel.dispatchEvent(new w.Event('change',{bubbles:true}));
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(20); click(d.querySelector('[data-act=play]'));
  const re2=entries(X).filter(e=>e.skill.startsWith('prog:')); ok(re2.length===2&&re2[0].skill!==re2[1].skill&&re2[1].skill.endsWith(':gallop'),'prog-pattern-skill',re2.map(e=>e.skill).join(' '));
  // a gap of more than 20 minutes starts a new session
  const nS=X.LOG.sessions.length; w.__clock+=25*60e3;
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(30); click(d.querySelector('[data-act=play]'));
  ok(X.LOG.sessions.length===nS+1,'new-session',X.LOG.sessions.length);
  // the path is built from the focus: over the whole neck it goes box by box from the open strings up
  Object.assign(X.F,{key:9,fam:'pent',mode:1,pos:-1}); X.refresh();
  mode('practice'); ok(!/undefined|NaN|\[object/.test(d.querySelector('.app').textContent),'path-text');
  ok([...d.querySelectorAll('.psteps [data-act=step][data-id^=s]')].map(e=>e.dataset.id).join(' ')==='s0 s2 s5 s7 sw','path-scale-order');
  ok(d.querySelector('.pnext [data-act=step]').dataset.id==='s0','path-next-s0');
  // a position picked in the header keeps every step in it
  Object.assign(X.F,{pos:5}); X.refresh(); mode('drill'); mode('practice');
  ok([...d.querySelectorAll('.psteps [data-act=step][data-id^=s],.psteps [data-act=step][data-id^=c]')].map(e=>e.dataset.id).join(' ')==='s5 c5'&&[...X.PATH.flatMap(g=>g.steps)].every(s=>s.pos===5),'path-one-position');
  ok(d.querySelector('.pnext [data-act=step]').dataset.id==='s5','path-next-s5');
  click(d.querySelector('.pnext [data-act=step]'));
  ok(X.st.mode==='drill'&&X.F.key===9&&X.F.fam==='pent'&&X.F.mode===1&&X.F.pos===5&&X.D.line==='scale'&&X.D.pattern==='thirds','step-setup',[X.st.mode,X.F.key,X.F.fam,X.F.mode,X.F.pos,X.D.line,X.D.pattern].join(' '));
  ok(/Em shape, frets 5–9 · goal 80/.test(d.getElementById('sheet').textContent),'path-note');
  const runClean=(bpm,secs)=>{X.saved.bpm=bpm; click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(secs); click(d.querySelector('[data-act=play]')); const c=d.querySelector('[data-act=clean]'); ok(c,'clean-chip-'+bpm); if(c) click(c);};
  runClean(70,20); ok(!X.stepState(X.STEP_BY.s5).done,'step-not-done-below-goal');
  runClean(80,20); ok(X.stepState(X.STEP_BY.s5).done,'step-done-at-goal');
  click(d.querySelector('[data-act=topath]')); ok(X.st.mode==='practice'&&d.querySelector('[data-act=step][data-id=s5]').classList.contains('done'),'path-shows-done');
  ok(d.querySelector('.pnext [data-act=step]').dataset.id==='c5','path-next-c5');
  // a chord step keeps the pentatonic focus and borrows Aeolian's chords
  click(d.querySelector('[data-act=step][data-id=c5]'));
  ok(X.F.fam==='pent'&&X.F.mode===1&&X.D.line==='prog'&&X.D.prog==='one'&&X.D.plan==='both'&&X.R.pat==='quarters'&&X.cur.prog&&X.cur.prog.length===1&&X.cur.prog[0].ch.name==='Am','chord-step',[X.F.fam,X.D.line,X.D.prog,X.D.plan,X.R.pat].join(' '));
  ok(/comes? from A Aeolian/.test(d.getElementById('sheet').textContent),'borrowed-chords-hint');
  runClean(80,20); ok(X.stepState(X.STEP_BY.c5).done,'chord-step-done');
  click(d.querySelector('[data-act=topath]'));
  ok(X.stepWhat(X.STEP_BY.p145)==='Am Dm Em Am, without leaving frets 5–9.','prog-step-text',X.stepWhat(X.STEP_BY.p145));
  click(d.querySelector('[data-act=step][data-id=r5]'));
  ok(X.R.swing===true&&X.D.plan==='strum'&&X.F.key===9&&X.F.fam==='pent'&&X.F.pos===5&&X.cur.prog.map(p=>p.ch.name).join(' ')==='Am Dm Em Am','rhythm-step-follows-focus',[X.F.key,X.F.fam,X.F.mode,X.F.pos,X.cur.prog.map(p=>p.ch.name)].join(' '));
  runClean(80,20); ok(X.stepState(X.STEP_BY.r5).done,'rhythm-step-done');
  // a new focus rebuilds the path; rhythm runs count in any key, scale runs don't
  Object.assign(X.F,{key:0,fam:'major',mode:0,pos:-1}); X.refresh();
  mode('practice'); ok(/C Ionian \(major\), box by box up the neck/.test(d.querySelector('.path').textContent),'path-follows-focus');
  ok(X.stepWhat(X.STEP_BY.r1)==='C F, a bar each. Keep the hand moving down and up.','rhythm-what',X.stepWhat(X.STEP_BY.r1));
  ok(X.stepState(X.STEP_BY.r5).done&&!X.stepState(X.PATH[0].steps[0]).done,'done-per-focus');
  click(d.querySelector('.pnext [data-act=step]')); ok(X.F.key===0&&X.F.fam==='major'&&X.F.mode===0,'step-keeps-focus');
  // songs: add in the Songs tab, rate, and play its changes
  const setF=(sel,v)=>{const e=d.querySelector(sel); e.value=v; e.dispatchEvent(new w.Event('change',{bubbles:true}));};
  mode('practice'); click(d.querySelector('[data-act=songform]')); ok(X.st.mode==='songs'&&d.getElementById('sgName'),'path-add-opens-songs');
  d.getElementById('sgName').value='Wish You Were Here'; d.getElementById('sgArtist').value='Pink Floyd';
  d.getElementById('sgLink').value='https://www.songsterr.com/a/wsa/pink-floyd-wish-you-were-here-tab-s49';
  click(d.querySelector('[data-act=songadd]'));
  setF('[data-sf=key]','7'); setF('[data-sf=prog]','145');
  const song=Object.entries(X.LOG.skills).find(([id,s])=>s.kind==='song'); ok(song&&song[1].link.startsWith('https://www.songsterr.com')&&song[1].key===7&&song[1].prog==='145','song',JSON.stringify(song));
  click(d.querySelector('[data-act=songform]')); d.getElementById('sgName').value='Bad link'; d.getElementById('sgLink').value='javascript:alert(1)'; click(d.querySelector('[data-act=songadd]'));
  setF('[data-sf=link]','javascript:alert(2)'); ok(/needs to start with https/.test(d.getElementById('sfMsg').textContent),'link-refused');
  ok(!Object.values(X.LOG.skills).some(s=>s.link&&!s.link.startsWith('https://')),'link-sanitized');
  click(d.querySelector(`[data-act=songopen][data-id="${song[0]}"]`));
  click(d.querySelector(`[data-act=rate][data-id="${song[0]}"][data-v="4"]`)); ok(X.LOG.skills[song[0]].rating===4,'song-rated');
  const older={v:1,sessions:[],skills:{[song[0]]:{...X.LOG.skills[song[0]],rating:2,updated:1}}};
  ok(X.mergeLogs(X.LOG,older).skills[song[0]].rating===4,'older-rating-loses');
  mode('practice'); ok(d.querySelector(`.path [data-act=songopen][data-id="${song[0]}"]`)&&/★★★★☆/.test(d.querySelector('.path').textContent),'song-on-path');
  click(d.querySelector(`[data-act=songplay][data-id="${song[0]}"]`));
  ok(X.st.mode==='drill'&&X.F.key===7&&X.F.mode===0&&X.D.line==='prog'&&X.D.prog==='145'&&X.F.pos===0,'song-play',[X.F.key,X.F.mode,X.D.prog,X.F.pos].join(' '));
  ok(/Wish You Were Here: play the changes/.test(d.getElementById('sheet').textContent),'song-path-note');
  // a song with its own typed chords
  const pc=X.parseChords('(A, E6, Dmaj7) x 2, A, E6, D, A');
  ok(pc.chords.join(' ')==='A E6 Dmaj7 A E6 Dmaj7 A E6 D A'&&!pc.bad.length,'parse-chords',JSON.stringify(pc));
  ok(X.parseChords('F#m7 Bb C/G Gsus4 x2 Bm7b5').chords.join(' ')==='F♯m7 B♭ C/G Gsus4 Gsus4 Bm7♭5','parse-chords-2',X.parseChords('F#m7 Bb C/G Gsus4 x2 Bm7b5').chords.join(' '));
  mode('songs'); click(d.querySelector('[data-act=songform]'));
  d.getElementById('sgName').value='Here'; d.getElementById('sgArtist').value='Pavement'; d.getElementById('sgChords').value='(A, E6, Dmaj7) x2, A, Q7, D, A';
  click(d.querySelector('[data-act=songadd]')); ok(/can't read “Q7”/.test(d.getElementById('sgMsg').textContent)&&!X.LOG.skills['song:here-pavement'],'chords-bad-token');
  d.getElementById('sgChords').value='(A, E6, Dmaj7) x2, A, E6, D, A'; click(d.querySelector('[data-act=songadd]'));
  const here=X.LOG.skills['song:here-pavement']; ok(here&&here.key===9&&!here.minor&&here.chords.length===10&&X.st.song==='song:here-pavement','song-chords',JSON.stringify(here));
  ok([...d.querySelectorAll('#cchips0 .cchip b')].map(e=>e.textContent).join(' ')==='A E6 Dmaj7 D','song-chord-chips');
  click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]'));
  ok(X.D.prog==='song:here-pavement'&&X.F.key===9&&X.cur.prog.length===10&&X.cur.prog.map(p=>p.ch.roman).slice(0,3).join(' ')==='I V6 IVmaj7'&&X.cur.prog.every(p=>p.voicing),'song-chords-drill',X.cur.prog.map(p=>p.ch.roman+(p.voicing?'':'!')).join(' '));
  ok(d.querySelector('[data-set=prog] option[value="song:here-pavement"]').textContent==='Here'&&[...d.querySelectorAll('.sh-bars .nm')].slice(0,3).map(e=>e.textContent).join(' ')==='A E6 Dmaj7','song-in-prog-menu');
  ok(d.querySelectorAll('.sh-bars .bar').length===10,'song-sheet-tiles');
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(30); click(d.querySelector('[data-act=play]'));
  ok(entries(X).slice(-1)[0].skill.includes(':song:here-pavement:'),'song-chords-logged',entries(X).slice(-1)[0].skill);
  // parts: edit the verse in place, add a chorus; the song plays them one after another
  mode('songs'); ok(d.querySelector('textarea[data-part="0"]').value==='(A, E6, Dmaj7) x2, A, E6, D, A','song-edit-prefill');
  setF('textarea[data-part="0"]','A E6 Q9'); ok(/can't read “Q9”/.test(d.getElementById('pbad0').textContent)&&X.LOG.skills['song:here-pavement'].chords.length===10,'part-bad-kept');
  setF('textarea[data-part="0"]','A E6 Dmaj7'); ok(X.LOG.skills['song:here-pavement'].chords.length===3,'song-edit-saved');
  click(d.querySelector('[data-act=partadd]')); setF('textarea[data-part="1"]','D A G A');
  const hp=X.LOG.skills['song:here-pavement']; ok(hp.parts.length===2&&hp.parts[1].name==='Chorus'&&hp.chords.join(' ')==='A E6 Dmaj7 D A G A'&&hp.key===9,'song-parts',JSON.stringify(hp.parts));
  click(d.querySelector('[data-act=partdel][data-part="1"]')); ok(X.LOG.skills['song:here-pavement'].chords.length===3,'part-removed');
  // a song can set its own voicing for a chord: pick a shape, or type one
  click(d.querySelector('[data-act=vpick][data-n="Dmaj7"]'));
  const shapes=[...d.querySelectorAll('.vpop [data-act=vset]')].map(b=>b.dataset.f); ok(shapes[0]==='xx0222'&&shapes.length>=2,'voicing-shapes',shapes.join(' '));
  d.getElementById('vType').value='0 0 0 2 2 1 9'; click(d.querySelector('[data-act=vtype]'));
  ok(/needs six strings/.test(d.getElementById('vMsg').textContent)&&!(X.LOG.skills['song:here-pavement'].voicings||{}).Dmaj7,'voicing-bad');
  click(d.querySelector(`.vpop [data-act=vset][data-f="${shapes[1]}"]`)); ok(X.LOG.skills['song:here-pavement'].voicings.Dmaj7===shapes[1],'voicing-picked');
  d.getElementById('vType').value='000220'; click(d.querySelector('[data-act=vtype]'));
  ok(X.LOG.skills['song:here-pavement'].voicings.Dmaj7==='000220'&&d.querySelector('[data-act=vpick][data-n="Dmaj7"]').classList.contains('own'),'voicing-saved',JSON.stringify(X.LOG.skills['song:here-pavement'].voicings));
  click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]'));
  const dm=X.cur.prog.find(p=>p.ch.name==='Dmaj7'); ok(dm&&dm.voicing.own&&dm.voicing.frets.join()==='0,0,0,2,2,0'&&d.querySelector('.sh-bars .bar.own'),'voicing-in-drill',dm&&JSON.stringify(dm.voicing));
  // the strum pattern edited while playing a song is kept with the song
  ok(/Saved with Here/.test(d.getElementById('panel').textContent),'song-strum-hint');
  click(d.querySelector('[data-act=rstep][data-i="1"]'));
  const sp=X.LOG.skills['song:here-pavement'].strum; ok(sp&&sp.pat==='custom'&&sp.custom.steps===X.R.custom.steps,'song-strum-saved',JSON.stringify(sp));
  const stepsNow=X.R.custom.steps; X.R.pat='faithful'; X.R.custom={res:8,steps:'x.......'};
  mode('practice'); click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]'));
  ok(X.R.pat==='custom'&&X.R.custom.steps===stepsNow,'song-strum-restored',X.R.pat+' '+X.R.custom.steps+' want '+stepsNow+' saved '+JSON.stringify(X.LOG.skills['song:here-pavement'].strum));
  ok(/Here: play the changes/.test(d.getElementById('sheet').textContent),'song-strum-pathnote');
  // ...and edited in the Songs tab, which Drill then plays
  mode('songs'); ok(d.querySelector('.sbox [data-act=sgstep]')&&d.querySelectorAll('.sbox [data-act=sgstep]').length===X.R.custom.steps.length,'songs-strum-grid');
  click(d.querySelector('.sbox [data-act=sgstep][data-i="0"]')); const sp2=X.LOG.skills['song:here-pavement'].strum;
  ok(sp2.custom.steps[0]!==stepsNow[0]&&X.R.custom.steps===sp2.custom.steps,'songs-strum-edit',JSON.stringify(sp2));
  setF('[data-sg=pat]','shuffle'); ok(X.LOG.skills['song:here-pavement'].strum.pat==='shuffle'&&X.R.pat==='shuffle'&&X.R.swing,'songs-strum-menu');
  click(d.querySelector('[data-act=sgswing]')); ok(X.LOG.skills['song:here-pavement'].strum.swing===false&&!X.R.swing,'songs-strum-swing');
  // each song keeps its own "Your pattern", and the general one is left alone
  X.addSong('Song B','','','-1','0','pop','G C D',{});
  mode('drill'); setF('[data-set=prog]','pop'); click(d.querySelector('[data-act=rstep][data-i="2"]'));
  const general=X.R.custom.steps; ok(X.R.pat==='custom'&&!X.R.owner,'general-custom');
  click(d.querySelector('[data-act=line][data-v=prog]'));
  setF('[data-set=prog]','song:here-pavement'); setF('[data-set=rpat]','custom');
  const hereSteps=X.LOG.skills['song:here-pavement'].strum.custom.steps; ok(X.R.owner==='song:here-pavement'&&X.R.custom.steps===hereSteps&&hereSteps!==general,'song-own-custom',X.R.custom.steps+' '+hereSteps+' '+general);
  setF('[data-set=prog]','song:song-b'); ok(X.R.pat==='faithful'&&X.R.custom.steps!==hereSteps,'song-b-default',X.R.pat+' '+X.R.custom.steps);
  click(d.querySelector('[data-act=rstep][data-i="0"]')); const bSteps=X.LOG.skills['song:song-b'].strum.custom.steps;
  ok(X.LOG.skills['song:here-pavement'].strum.custom.steps===hereSteps&&bSteps!==hereSteps,'song-b-own',bSteps);
  setF('[data-set=prog]','pop'); ok(X.R.pat==='custom'&&X.R.custom.steps===general&&!X.R.owner,'general-restored',X.R.custom.steps+' want '+general);
  setF('[data-set=prog]','song:here-pavement'); ok(X.R.custom.steps===hereSteps&&X.R.pat==='custom','here-restored');
  setF('[data-set=prog]','song:song-b'); ok(X.R.custom.steps===bSteps&&X.R.pat==='custom','b-restored');
  click(d.querySelector('[data-act=rstep][data-i="3"]')); ok(X.LOG.skills['song:here-pavement'].strum.custom.steps===hereSteps,'here-untouched');
  // a song's tempo: Practice starts there, and it's the goal
  mode('songs'); click(d.querySelector('[data-act=songopen][data-id="song:here-pavement"]'));
  setF('[data-sf=tempo]','300'); ok(/between 30 and 260/.test(d.getElementById('sfMsg').textContent)&&!X.LOG.skills['song:here-pavement'].tempo,'tempo-bad');
  setF('[data-sf=tempo]','92'); ok(X.LOG.skills['song:here-pavement'].tempo===92,'tempo-saved');
  X.saved.bpm=60; click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]'));
  ok(X.saved.bpm===92&&/goal 92 bpm/.test(d.getElementById('sheet').textContent),'tempo-practice',X.saved.bpm+' '+d.getElementById('sheet').textContent.slice(0,120));
  // the focus bar: Key mode or Song mode
  mode('explore'); click(d.querySelector('[data-fm=key]')); Object.assign(X.F,{key:2,fam:'major',mode:1,pos:-1}); X.refresh(); mode('explore');
  click(d.querySelector('[data-fm=song]'));
  ok(X.saved.fmode==='song'&&X.F.key===X.LOG.skills[X.saved.fsong].key&&d.getElementById('focusTitle').textContent===X.LOG.skills[X.saved.fsong].name,'focus-song',X.saved.fsong+' '+d.getElementById('focusTitle').textContent);
  setF('#selSong','song:here-pavement'); ok(X.D.prog==='song:here-pavement'&&X.D.line==='prog'&&X.F.key===9&&X.saved.bpm===92&&/92 bpm/.test(d.getElementById('focusSub').textContent),'focus-song-pick');
  mode('drill'); ok(d.querySelectorAll('.sh-bars .bar').length===3,'focus-song-drill');
  setF('#selSong','song:song-b'); ok(X.D.prog==='song:song-b'&&X.F.key===7&&X.st.mode==='drill','focus-song-switch',X.F.key);
  // Explore in Song mode explains the song
  mode('explore'); setF('#selSong','song:here-pavement');
  ok(d.querySelectorAll('.cchips [data-act=exch]').length===3&&/A major/.test(d.querySelector('.ex-sum').textContent)&&/F♯ minor pentatonic/.test(d.querySelector('.ex-sum').textContent),'explore-song-chips',d.getElementById('panel').textContent.slice(0,200));
  click(d.querySelector('.cchips [data-act=exch][data-n="Dmaj7"]'));
  ok(/IVmaj7/.test(d.querySelector('.ex-head').textContent)&&/D Lydian/.test(d.querySelector('.ex-card').textContent),'explore-song-mode',d.querySelector('.ex-card').textContent.slice(0,300));
  const lbl=(s,f)=>(d.querySelector(`.cell[data-s="${s}"][data-f="${f}"] .dot`)||{}).textContent;
  ok(lbl(2,0)==='R'&&lbl(4,2)==='7'&&lbl(5,2)==='3'&&lbl(1,0)==='5','explore-song-neck',[lbl(2,0),lbl(4,2),lbl(5,2),lbl(1,0)].join(' '));
  const k0=X.F.key; click(d.querySelector('.cell[data-s="0"][data-f="3"]')); ok(X.F.key===k0&&/G/.test(d.getElementById('prompt').textContent),'explore-song-tap-keeps-key',d.getElementById('prompt').textContent);
  X.saveParts('song:here-pavement',[{name:'Verse',text:'(A, E6, Dmaj7) x2'},{name:'Chorus',text:'A C G D'}]); mode('drill'); mode('explore');
  click(d.querySelector('.cchips [data-act=exch][data-n="C"]'));
  ok(/C instead of C♯/.test(d.querySelector('.ex-card').textContent)&&/Borrowed from A minor/.test(d.querySelector('.ex-card').textContent)&&d.querySelector('.cell[data-s="1"][data-f="3"] .dot.outk'),'explore-song-outside',d.querySelector('.ex-card').textContent.slice(0,300));
  // slash chords keep their bass note
  const sl=X.parseChords('C/G, F, F, C/G').chords; ok(sl.join(' ')==='C/G F F C/G','slash-parse',sl.join(' '));
  const fv=f=>f?f.map(x=>x===null?'x':x).join(''):'none';
  ok(fv(X.autoVoicing('C/G',0))==='332010'&&fv(X.autoVoicing('D/F#',2))==='2x0232'&&fv(X.autoVoicing('Am/G',0))==='302210'&&X.chordIn('C/G',0).roman==='I/5','slash-voicing',[fv(X.autoVoicing('C/G',0)),fv(X.autoVoicing('D/F#',2)),fv(X.autoVoicing('Am/G',0)),X.chordIn('C/G',0).roman].join(' '));
  X.saveParts('song:here-pavement',[{name:'Verse',text:'A/C#, D, A'}]); mode('drill'); mode('explore');
  ok([...d.querySelectorAll('.cchips [data-act=exch]')].map(e=>e.dataset.n).join(' ')==='A/C♯ D A'&&/C♯ is its lowest note/.test(d.querySelector('.ex-card').textContent),'slash-explore',d.querySelector('.ex-card').textContent.slice(0,200));
  // note names follow the key, and the music text holds up (the accuracy audit)
  { const sk=X.LOG.skills['song:here-pavement'], keep={minor:sk.minor,key:sk.key};
    X.saveParts('song:here-pavement',[{name:'Verse',text:'Am E7 B7 F'}]); sk.minor=true; sk.key=9; mode('drill'); mode('explore');
    const card=()=>d.querySelector('.ex-card').textContent;
    click(d.querySelector('.cchips [data-act=exch][data-n="E7"]'));
    ok(/G♯ instead of G\b/.test(card())&&/harmonic minor/.test(card())&&/E Phrygian dominant/.test(card()),'audit-explore-v7',card().slice(0,400));
    click(d.querySelector('.cchips [data-act=exch][data-n="B7"]'));
    ok(/D♯ instead of D and F♯ instead of F/.test(card()),'audit-explore-b7',card().slice(0,400));
    click(d.querySelector('.cchips [data-act=exch][data-n="F"]'));
    ok(/F Lydian, and its ♯4 \(B\)/.test(card()),'audit-explore-lydian',card().slice(0,400));
    Object.assign(sk,keep); X.saveParts('song:here-pavement',[{name:'Verse',text:'A/C#, D, A'}]); mode('drill'); mode('explore'); }
  { const f0={...X.F}, sev=X.D.sev, line=X.D.line, prog=X.D.prog, fm=X.saved.fmode;
    X.saved.fmode='key'; X.D.sev=false;
    const at=(key,fam,m)=>{Object.assign(X.F,{key,fam,mode:m,pos:-1}); X.refresh(); return X.cur.chords.map(c=>c.name).join(' ');};
    ok(at(4,'major',0)==='E F♯m G♯m A B C♯m D♯°','audit-spell-e',at(4,'major',0));
    ok(at(1,'major',0)==='D♭ E♭m Fm G♭ A♭ B♭m C°','audit-spell-db',at(1,'major',0));
    ok(at(8,'major',5).startsWith('G♯m A♯° B')&&at(0,'major',2).startsWith('Cm D♭ E♭'),'audit-spell-modes',at(8,'major',5)+' / '+at(0,'major',2));
    at(0,'harm',6); ok(X.cur.chords[6].roman.startsWith('♭♭VII'),'audit-superlocrian',X.cur.chords.map(c=>c.roman).join(' '));
    const pr=(id,k,fam,m,s)=>{Object.assign(X.F,{key:k,fam,mode:m,pos:-1}); X.D.line='prog'; X.D.prog=id; X.D.sev=s; X.refresh(); return X.cur.prog.map(p=>p.ch.name).join(' ');};
    ok(pr('andalusian',9,'major',5,false)==='Am G F E','audit-andalusian',pr('andalusian',9,'major',5,false));
    ok(pr('blues',0,'major',0,true).split(' ').every(n=>/^[CFG]7$/.test(n)),'audit-blues7',pr('blues',0,'major',0,true));
    ok(pr('251',9,'major',5,true)==='Bm7♭5 E7 Am7 Am7','audit-minor-251',pr('251',9,'major',5,true));
    ok(['Bdim','Bm7b5','Gdim7','Caug'].map(n=>X.chordIn(n,0).roman).join(' ')==='vii° viiø7 v°7 I+','audit-romans',['Bdim','Bm7b5','Gdim7','Caug'].map(n=>X.chordIn(n,0).roman).join(' '));
    // the Drill neck matches its text: no dot the scale line skips, chord tones solid, the start and end note ringed
    Object.assign(X.F,{key:0,fam:'major',mode:0,pos:0}); Object.assign(X.D,{line:'scale',chord:1,resolve:'key',pattern:'updown',sev:false}); X.saved.fmode='key'; X.refresh(); mode('drill');
    const dt=(s,f)=>d.querySelector(`.cell[data-s="${s}"][data-f="${f}"] .dot`), per=(/Notes per string, low to high: ([\d ]+)\./.exec(d.getElementById('sheet').textContent)||[])[1];
    ok(!dt(3,4)&&dt(4,0)&&per==='3 3 3 2 3 3','audit-neck-unison',per);
    ok(/\bpass\b/.test(dt(4,1).className)&&/\bhome\b/.test(dt(4,1).className)&&!/\bpass\b/.test(dt(2,3).className),'audit-neck-chord-tones',dt(4,1).className+' / '+dt(2,3).className);
    // positions are the CAGED shapes of the home chord, and the whole neck runs up through all of them
    const posAt=(key,fam,m)=>{Object.assign(X.F,{key,fam,mode:m,pos:-1}); X.refresh(); return X.cur.pos.map(p=>p.label).join(' | ');};
    ok(posAt(0,'major',0)==='C shape, frets 0–4 | A shape, frets 2–6 | G shape, frets 5–9 | E shape, frets 7–11','caged-c',posAt(0,'major',0));
    ok(posAt(9,'pent',1)==='Am shape, frets 0–4 | Gm shape, frets 2–6 | Em shape, frets 5–9 | Dm shape, frets 7–11','caged-am',posAt(9,'pent',1));
    posAt(0,'major',0); Object.assign(X.D,{line:'scale',pattern:'updown'}); X.refresh(); mode('drill');
    const run=X.genSeq().filter(n=>!n.chord&&!n.rest), pcOf=n=>(n.s===undefined?-1:([4,9,2,7,11,4][n.s]+n.f)%12);
    ok(!X.st.picking&&!d.querySelector('[data-act=keepbox]')&&run.length>20&&pcOf(run[0])===0&&pcOf(run[run.length-1])===0&&Math.max(...run.map(n=>n.f))>=10&&Math.min(...run.map(n=>n.f))<=3,'whole-neck-run',run.map(n=>n.s+'/'+n.f).join(' '));
    // strumming over the whole neck starts at once, each chord in the usual shape closest to the nut
    Object.assign(X.F,{key:3,fam:'mel',mode:0,pos:-1}); Object.assign(X.D,{line:'prog',prog:'pop',sev:true}); X.refresh(); mode('drill');
    const pv=X.cur.prog.map(p=>p.voicing&&p.voicing.frets);
    ok(!d.querySelector('[data-act=keepbox]')&&d.querySelector('#tab')&&pv.every(f=>f&&Math.max(...f.filter(x=>x!==null))<=5),'whole-neck-strum',JSON.stringify(pv));
    Object.assign(X.F,{key:0,fam:'chrom',mode:0,pos:-1}); X.D.line='scale'; X.refresh(); mode('drill');
    const cr=X.genSeq().filter(n=>!n.chord&&!n.rest); ok(cr.length>40&&Math.max(...cr.map(n=>n.f))>=10,'whole-neck-chrom',cr.length);
    // patterns start on the root itself: 3rds go E♭ G♭ F A♭… in E♭ melodic minor, not a run of steps first
    Object.assign(X.F,{key:3,fam:'mel',mode:0,pos:6}); Object.assign(X.D,{line:'scale',pattern:'thirds',resolve:'key'}); X.refresh(); mode('drill');
    const th=X.genSeq().filter(n=>!n.chord&&!n.rest).slice(0,4).map(n=>([4,9,2,7,11,4][n.s]+n.f)%12);
    ok(th.join()==='3,6,5,8','thirds-from-root',th.join());
    X.D.pattern='g3'; X.refresh(); const g3=X.genSeq().filter(n=>!n.chord&&!n.rest).slice(0,4).map(n=>([4,9,2,7,11,4][n.s]+n.f)%12); ok(g3.join()==='3,5,6,5','g3-from-root',g3.join());
    X.D.pattern='updown';
    Object.assign(X.F,f0); Object.assign(X.D,{sev,line,prog}); X.saved.fmode=fm; X.refresh(); mode('drill'); mode('explore'); }
  // the browser's Back button returns to the previous tab, and closing the settings sheet doesn't leave an entry behind
  { mode('explore'); mode('drill'); const n=w.history.length; click(d.querySelector('[data-act=sheet]')); ok(X.st.sheet&&w.history.length===n+1,'back-sheet-entry',w.history.length-n);
    click(d.querySelector('[data-act=sheetclose]')); await sleep(80); ok(!X.st.sheet&&w.history.state.fm.mode==='drill'&&!w.history.state.fm.sheet,'back-sheet-close',JSON.stringify(w.history.state));
    mode('songs'); w.history.back(); await sleep(80); ok(X.st.mode==='drill'&&!X.st.sheet,'back-tab',X.st.mode);
    w.history.back(); await sleep(80); ok(X.st.mode==='explore','back-tab-2',X.st.mode);
    w.history.forward(); await sleep(80); ok(X.st.mode==='drill','forward-tab',X.st.mode); mode('explore'); }
  // practice one part of a song in Drill
  X.saveParts('song:here-pavement',[{name:'Verse',text:'(A, E6, Dmaj7) x2'},{name:'Chorus',text:'D A E A'}]); X.refresh(); mode('drill');
  ok(X.cur.prog.length===10&&d.querySelectorAll('#sheet [data-act=spart]').length===3,'part-whole',X.cur.prog.length);
  click(d.querySelector('#sheet [data-act=spart][data-v="1"]'));
  ok(X.cur.prog.map(p=>p.ch.name).join(' ')==='D A E A'&&/Chorus · 4 bars/.test(d.querySelector('#sheet .sh-sub').textContent)&&d.querySelectorAll('#sheet .sh-bars .bar').length===4,'part-chorus',X.cur.prog.map(p=>p.ch.name).join(' '));
  mode('explore'); mode('drill'); ok(X.cur.prog.length===4,'part-remembered');
  X.saveParts('song:here-pavement',[{name:'Verse',text:'(A, E6, Dmaj7) x2, A, E6, D, A'}]); X.refresh(); ok(X.cur.prog.length===10,'part-gone-falls-back',X.cur.prog.length);
  // split bars and a strum pattern per part
  const pb=X.parseChords('[C G] [C . . G] (D) x2').bars; ok(pb.length===4&&pb[0].length===2&&pb[0][1].from===0.5&&pb[1][0].to===0.75&&pb[1][1].name==='G'&&pb[3][0].name==='D','split-parse',JSON.stringify(pb.slice(0,2)));
  ok(X.parseChords('[. G]').bad.length===1&&X.parseChords('[C Q7]').bad.join()==='Q7','split-bad');
  X.saveParts('song:here-pavement',[{name:'Verse',text:'[A E] D'},{name:'Chorus',text:'G A'}]); X.saved.spart={}; X.refresh(); mode('drill');
  X.D.plan='strum'; X.refresh(); X.st.seq=X.genSeq();
  ok(X.cur.prog.length===5&&X.cur.nbars===4&&/4 bars/.test(d.querySelector('#sheet .sh-sub').textContent)&&d.querySelectorAll('#sheet .bar.split').length===2,'split-drill',X.cur.prog.length+' '+X.cur.nbars);
  {const b0=X.st.seq.filter(n=>n.bar===0), h=b0.length/2; ok(b0.slice(0,h).every(n=>n.ci===0)&&b0.slice(h).every(n=>n.ci===1)&&b0[0].head&&b0[h].head&&!b0[1].head,'split-steps',b0.map(n=>n.ci).join(''));}
  const songPatBefore=JSON.stringify(X.LOG.skills['song:here-pavement'].strum||null);
  mode('songs'); click(d.querySelector('[data-act=songopen][data-id="song:here-pavement"]')); click(d.querySelector('[data-act=pown][data-part="1"]'));
  ok(!!X.LOG.skills['song:here-pavement'].parts[1].strum&&d.querySelector('[data-sg=pat][data-sp="1"]'),'part-own-on');
  const otherPat=Object.keys(X.RPAT).find(k=>k!==X.curPat().id&&X.RPAT[k].res===16); setF('[data-sg=pat][data-sp="1"]',otherPat);
  ok(X.LOG.skills['song:here-pavement'].parts[1].strum.pat===otherPat&&JSON.stringify(X.LOG.skills['song:here-pavement'].strum||null)===songPatBefore,'part-own-pattern',otherPat);
  mode('drill'); X.st.seq=X.genSeq();
  {const ch=X.st.seq.filter(n=>n.chord&&X.cur.prog[n.ci].part===1), vs=X.st.seq.filter(n=>n.chord&&X.cur.prog[n.ci].part===0);
   ok(ch.length&&ch.every(n=>n.n===16)&&ch.map(n=>n.strum).slice(0,16).join('')===X.RPAT[otherPat].steps&&vs.every(n=>n.n===X.curPat().res),'part-own-plays',ch.slice(0,16).map(n=>n.strum).join(''));}
  click(d.querySelector('#sheet [data-act=spart][data-v="1"]')); ok(X.R.pat===otherPat&&/Saved with Chorus/.test(d.getElementById('panel').textContent),'part-own-live',X.R.pat);
  click(d.querySelector('.rstep[data-i="1"]')); ok(X.LOG.skills['song:here-pavement'].parts[1].strum.pat==='custom'&&JSON.stringify(X.LOG.skills['song:here-pavement'].strum||null)===songPatBefore,'part-own-edit');
  click(d.querySelector('[data-act=spown]')); ok(!X.LOG.skills['song:here-pavement'].parts[1].strum&&X.R.owner==='song:here-pavement','part-own-off',X.R.owner);
  click(d.querySelector('#sheet [data-act=spart][data-v="-1"]')); X.D.plan='both';
  X.saveParts('song:here-pavement',[{name:'Verse',text:'(A, E6, Dmaj7) x2, A, E6, D, A'}]); X.refresh();
  // a capo'd song
  mode('songs'); click(d.querySelector('[data-act=songopen][data-id="song:here-pavement"]')); setF('[data-sf=capo]','2');
  ok(X.LOG.skills['song:here-pavement'].capo===2&&X.capo()===2,'capo-saved');
  mode('explore'); ok(d.querySelector('.fnum').textContent==='capo 2'&&/capo on fret 2/.test(d.getElementById('panel').textContent)&&/B major/.test(d.getElementById('panel').textContent)&&/capo 2/.test(d.getElementById('focusSub').textContent),'capo-shown',d.querySelector('.fnum').textContent);
  mode('songs'); setF('[data-sf=capo]','0'); ok(!X.LOG.skills['song:here-pavement'].capo&&X.capo()===0,'capo-cleared'); mode('explore'); ok(d.querySelector('.fnum').textContent==='open','capo-open');
  setF('#selSong','song:song-b');
  mode('songs'); ok(X.st.song==='song:song-b','focus-song-opens-in-songs');
  click(d.querySelector('[data-act=songopen][data-id="song:here-pavement"]')); ok(X.saved.fsong==='song:here-pavement','songs-open-sets-focus');
  click(d.querySelector('[data-fm=key]')); ok(X.saved.fmode==='key'&&X.F.key===2&&X.F.mode===1&&X.F.pos===-1&&!/^song:/.test(X.D.prog),'focus-key-restored',[X.F.key,X.F.mode,X.F.pos,X.D.prog].join(' '));
  click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]')); ok(X.saved.fmode==='song'&&X.saved.fsong==='song:here-pavement','practice-sets-focus');
  setF('[data-set=prog]','pop'); ok(X.saved.fmode==='key'&&X.F.key===9&&X.D.prog==='pop','common-prog-leaves-song');
  // stored under its own key
  ok(JSON.parse(w.localStorage.getItem(X.LOG_KEY)).sessions.length===X.LOG.sessions.length,'stored');
  // merge: union, idempotent
  const before=entries(X).length, copy=JSON.parse(JSON.stringify(X.LOG));
  const m1=X.mergeLogs(X.LOG,copy); ok(m1.sessions.flatMap(s=>s.entries).length===before,'merge-idempotent');
  const other={v:1,sessions:[{id:'sX',start:1,end:2,entries:[{id:'eX',skill:'other:x',t:1,secs:60,manual:true}]}],skills:{'other:x':{kind:'other',name:'X'}}};
  ok(X.importLog(JSON.stringify(other))===''&&entries(X).length===before+1,'import');
  ok(X.importLog('not json')!=='','import-bad');
  // gist sync: device A creates the gist, device B finds it and merges, A then sees B's work
  w.localStorage.setItem(X.TOKEN_KEY,gh.token); await X.syncNow();
  ok(X.sync.state==='ok'&&X.LOG.gist&&gh.gists[X.LOG.gist.id],'sync-create',X.sync.msg);
  const gid=X.LOG.gist&&X.LOG.gist.id; ok(gh.gists[gid]&&gh.gists[gid].public===false,'gist-private');
  ok(!JSON.stringify(gh.gists[gid]).includes(gh.token),'token-not-in-gist');
  const B=await device(false);
  B.w.localStorage.setItem(B.X.TOKEN_KEY,gh.token);
  B.mode('drill'); B.click(B.d.querySelector('.cell[data-s="1"][data-f="3"]'));
  B.click(B.d.querySelector('[data-act=play]')); B.w.clearInterval(B.X.met.timer); B.advance(45); B.click(B.d.querySelector('[data-act=play]'));
  await B.X.syncNow(); ok(B.X.sync.state==='ok'&&B.X.LOG.gist.id===gid,'sync-find',B.X.sync.msg);
  ok(entries(B.X).length===entries(X).length+1,'sync-merge-B',entries(B.X).length+' vs '+entries(X).length);
  await X.syncNow(); ok(entries(X).length===entries(B.X).length,'sync-merge-A');
  ok(Object.keys(gh.gists).length===1,'one-gist');
  // a bad token reports, and nothing is lost
  const n=entries(X).length; w.localStorage.setItem(X.TOKEN_KEY,'wrong'); await X.syncNow();
  ok(X.sync.state==='err'&&/token/.test(X.sync.msg)&&entries(X).length===n,'sync-bad-token',X.sync.msg);
  ok(/sync failed/.test(d.getElementById('stats').textContent),'stats-sync-failed');
  // phone layout text
  B.mode('practice'); ok(!/undefined|NaN|\[object/.test(B.d.querySelector('.app').textContent),'phone-text-path');
  console.log('log checks done, bad',bad); process.exit(bad?1:0);
})();
