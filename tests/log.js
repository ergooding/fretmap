// Practice log: drill, progression and quiz logging on a fake clock, short runs dropped, sessions split after a 20-minute gap,
// clean marks and best tempo, manual entries, merge and import without losing anything, and gist sync between two devices
// against a fake GitHub API. Also checks the Practice views for missing text in both layouts.
const {JSDOM}=require('jsdom');
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
  const mode=m=>click(d.querySelector(`[data-mode=${m}]`));
  const advance=(secs)=>{w.__clock+=secs*1000; const end=w.__now+secs; while(w.__now<end){w.__now=Math.min(end,w.__now+0.02); if(X.st.playing&&X.st.mode==='drill') X.schedule();}};
  return {w,d,X,click,mode,advance};
}
const entries=X=>X.LOG.sessions.flatMap(s=>s.entries);
(async()=>{
  const A=await device(true); const {w,d,X,click,mode,advance}=A;
  ok(!d.querySelector('[data-mode=practice]').hidden,'nav');
  // drill: a 60 s run on a box is logged with its passes
  mode('drill'); click(d.querySelector('.cell[data-s="0"][data-f="5"]')); X.saved.bpm=120;
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
  // the path is built from the focus: A minor pentatonic starts at the root position, frets 5–9
  Object.assign(X.F,{key:9,fam:'pent',mode:1,pos:-1}); X.refresh();
  mode('practice'); ok(!/undefined|NaN|\[object/.test(d.querySelector('.app').textContent),'path-text');
  ok([...d.querySelectorAll('.psteps [data-act=step][data-id^=s]')].map(e=>e.dataset.id).join(' ')==='s5 s8 s3 s0','path-scale-order');
  ok(d.querySelector('.pnext [data-act=step]').dataset.id==='s5','path-next-s5');
  click(d.querySelector('.pnext [data-act=step]'));
  ok(X.st.mode==='drill'&&X.F.key===9&&X.F.fam==='pent'&&X.F.mode===1&&X.F.pos===5&&X.D.line==='scale'&&X.D.pattern==='thirds','step-setup',[X.st.mode,X.F.key,X.F.fam,X.F.mode,X.F.pos,X.D.line,X.D.pattern].join(' '));
  ok(/Frets 5–9, from the root · goal 80/.test(d.getElementById('panel').textContent),'path-note');
  const runClean=(bpm,secs)=>{X.saved.bpm=bpm; click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(secs); click(d.querySelector('[data-act=play]')); const c=d.querySelector('[data-act=clean]'); ok(c,'clean-chip-'+bpm); if(c) click(c);};
  runClean(70,20); ok(!X.stepState(X.STEP_BY.s5).done,'step-not-done-below-goal');
  runClean(80,20); ok(X.stepState(X.STEP_BY.s5).done,'step-done-at-goal');
  click(d.querySelector('[data-act=topath]')); ok(X.st.mode==='practice'&&d.querySelector('[data-act=step][data-id=s5]').classList.contains('done'),'path-shows-done');
  ok(d.querySelector('.pnext [data-act=step]').dataset.id==='s8','path-next-s8');
  // a chord step keeps the pentatonic focus and borrows Aeolian's chords
  click(d.querySelector('[data-act=step][data-id=c5]'));
  ok(X.F.fam==='pent'&&X.F.mode===1&&X.D.line==='prog'&&X.D.prog==='one'&&X.D.plan==='both'&&X.R.pat==='quarters'&&X.cur.prog&&X.cur.prog.length===1&&X.cur.prog[0].ch.name==='Am','chord-step',[X.F.fam,X.D.line,X.D.prog,X.D.plan,X.R.pat].join(' '));
  ok(/comes? from A Aeolian/.test(d.getElementById('panel').textContent),'borrowed-chords-hint');
  runClean(80,20); ok(X.stepState(X.STEP_BY.c5).done,'chord-step-done');
  click(d.querySelector('[data-act=topath]'));
  ok(X.stepWhat(X.STEP_BY.p145)==='Am Dm Em Am, without leaving frets 5–9.','prog-step-text',X.stepWhat(X.STEP_BY.p145));
  click(d.querySelector('[data-act=step][data-id=r5]'));
  ok(X.R.swing===true&&X.D.plan==='strum'&&X.F.key===9&&X.F.fam==='pent'&&X.F.pos===5&&X.cur.prog.map(p=>p.ch.name).join(' ')==='Am Dm Em Am','rhythm-step-follows-focus',[X.F.key,X.F.fam,X.F.mode,X.F.pos,X.cur.prog.map(p=>p.ch.name)].join(' '));
  runClean(80,20); ok(X.stepState(X.STEP_BY.r5).done,'rhythm-step-done');
  // a new focus rebuilds the path; rhythm runs count in any key, scale runs don't
  Object.assign(X.F,{key:0,fam:'major',mode:0,pos:-1}); X.refresh();
  mode('practice'); ok(/C Ionian \(major\), position by position/.test(d.querySelector('.path').textContent),'path-follows-focus');
  ok(X.stepWhat(X.STEP_BY.r1)==='C F, a bar each. Keep the hand moving down and up.','rhythm-what',X.stepWhat(X.STEP_BY.r1));
  ok(X.stepState(X.STEP_BY.r5).done&&!X.stepState(X.PATH[0].steps[0]).done,'done-per-focus');
  click(d.querySelector('.pnext [data-act=step]')); ok(X.F.key===0&&X.F.fam==='major'&&X.F.mode===0,'step-keeps-focus');
  // songs: add from the form, rate, and play its changes
  mode('practice'); click(d.querySelector('[data-act=songform]'));
  d.getElementById('sgName').value='Wish You Were Here'; d.getElementById('sgArtist').value='Pink Floyd';
  d.getElementById('sgLink').value='https://www.songsterr.com/a/wsa/pink-floyd-wish-you-were-here-tab-s49'; d.getElementById('sgKey').value='7'; d.getElementById('sgProg').value='145';
  click(d.querySelector('[data-act=songadd]'));
  const song=Object.entries(X.LOG.skills).find(([id,s])=>s.kind==='song'); ok(song&&song[1].link.startsWith('https://www.songsterr.com')&&song[1].key===7&&song[1].prog==='145','song',JSON.stringify(song));
  click(d.querySelector('[data-act=songform]')); d.getElementById('sgName').value='Bad link'; d.getElementById('sgLink').value='javascript:alert(1)'; click(d.querySelector('[data-act=songadd]'));
  ok(!Object.values(X.LOG.skills).some(s=>s.link&&!s.link.startsWith('https://')),'link-sanitized');
  click(d.querySelector(`[data-act=rate][data-id="${song[0]}"][data-v="4"]`)); ok(X.LOG.skills[song[0]].rating===4,'song-rated');
  const older={v:1,sessions:[],skills:{[song[0]]:{...X.LOG.skills[song[0]],rating:2,updated:1}}};
  ok(X.mergeLogs(X.LOG,older).skills[song[0]].rating===4,'older-rating-loses');
  click(d.querySelector(`[data-act=songplay][data-id="${song[0]}"]`));
  ok(X.st.mode==='drill'&&X.F.key===7&&X.F.mode===0&&X.D.line==='prog'&&X.D.prog==='145'&&X.F.pos===0,'song-play',[X.F.key,X.F.mode,X.D.prog,X.F.pos].join(' '));
  ok(/Wish You Were Here: play the changes/.test(d.getElementById('panel').textContent),'song-path-note');
  // a song with its own typed chords
  const pc=X.parseChords('(A, E6, Dmaj7) x 2, A, E6, D, A');
  ok(pc.chords.join(' ')==='A E6 Dmaj7 A E6 Dmaj7 A E6 D A'&&!pc.bad.length,'parse-chords',JSON.stringify(pc));
  ok(X.parseChords('F#m7 Bb C/G Gsus4 x2 Bm7b5').chords.join(' ')==='F♯m7 B♭ C Gsus4 Gsus4 Bm7♭5','parse-chords-2',X.parseChords('F#m7 Bb C/G Gsus4 x2 Bm7b5').chords.join(' '));
  mode('practice'); click(d.querySelector('[data-act=songform]'));
  d.getElementById('sgName').value='Here'; d.getElementById('sgArtist').value='Pavement'; d.getElementById('sgChords').value='(A, E6, Dmaj7) x2, A, Q7, D, A';
  click(d.querySelector('[data-act=songadd]')); ok(/can't read “Q7”/.test(d.querySelector('.path').textContent)&&!X.LOG.skills['song:here-pavement'],'chords-bad-token');
  d.getElementById('sgChords').value='(A, E6, Dmaj7) x2, A, E6, D, A'; click(d.querySelector('[data-act=songadd]'));
  const here=X.LOG.skills['song:here-pavement']; ok(here&&here.key===9&&!here.minor&&here.chords.length===10,'song-chords',JSON.stringify(here));
  click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]'));
  ok(X.D.prog==='song:here-pavement'&&X.F.key===9&&X.cur.prog.length===10&&X.cur.prog.map(p=>p.ch.roman).slice(0,3).join(' ')==='I V6 IVmaj7'&&X.cur.prog.every(p=>p.voicing),'song-chords-drill',X.cur.prog.map(p=>p.ch.roman+(p.voicing?'':'!')).join(' '));
  ok(/Here: A E6 Dmaj7/.test(d.querySelector('[data-set=prog]').textContent),'song-in-prog-menu');
  click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); advance(30); click(d.querySelector('[data-act=play]'));
  ok(entries(X).slice(-1)[0].skill.includes(':song:here-pavement:'),'song-chords-logged',entries(X).slice(-1)[0].skill);
  // edit keeps it in place
  mode('practice'); click(d.querySelector('[data-act=songedit][data-id="song:here-pavement"]'));
  ok(d.getElementById('sgChords').value==='(A, E6, Dmaj7) x2, A, E6, D, A','song-edit-prefill');
  d.getElementById('sgChords').value='A E6 Dmaj7'; click(d.querySelector('[data-act=songadd]'));
  ok(X.LOG.skills['song:here-pavement'].chords.length===3&&!d.getElementById('sgChords'),'song-edit-saved');
  // a song can set its own voicing for a chord
  click(d.querySelector('[data-act=songedit][data-id="song:here-pavement"]'));
  const vin=d.querySelector('[data-voice="Dmaj7"]'); ok(vin&&vin.placeholder==='xx0222','voicing-row',vin&&vin.placeholder);
  const ta=d.getElementById('sgChords'); ta.value='A E6 Dmaj7 Bm'; ta.dispatchEvent(new w.Event('input',{bubbles:true}));
  ok(d.querySelector('[data-voice="Bm"]')&&d.querySelector('[data-voice="Dmaj7"]'),'voicing-rows-follow');
  d.querySelector('[data-voice="Dmaj7"]').value='0 0 0 2 2 1 9'; click(d.querySelector('[data-act=songadd]'));
  ok(/needs six strings/.test(d.getElementById('sgMsg').textContent),'voicing-bad');
  d.querySelector('[data-voice="Dmaj7"]').value='000220'; click(d.querySelector('[data-act=songadd]'));
  ok(X.LOG.skills['song:here-pavement'].voicings.Dmaj7==='000220','voicing-saved',JSON.stringify(X.LOG.skills['song:here-pavement'].voicings));
  click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]'));
  const dm=X.cur.prog.find(p=>p.ch.name==='Dmaj7'); ok(dm&&dm.voicing.own&&dm.voicing.frets.join()==='0,0,0,2,2,0','voicing-in-drill',dm&&JSON.stringify(dm.voicing));
  // the strum pattern edited while playing a song is kept with the song
  ok(/saved with Here/.test(d.getElementById('panel').textContent),'song-strum-hint');
  click(d.querySelector('[data-act=rstep][data-i="1"]'));
  const sp=X.LOG.skills['song:here-pavement'].strum; ok(sp&&sp.pat==='custom'&&sp.custom.steps===X.R.custom.steps,'song-strum-saved',JSON.stringify(sp));
  const stepsNow=X.R.custom.steps; X.R.pat='faithful'; X.R.custom={res:8,steps:'x.......'};
  mode('practice'); click(d.querySelector('[data-act=songplay][data-id="song:here-pavement"]'));
  ok(X.R.pat==='custom'&&X.R.custom.steps===stepsNow,'song-strum-restored',X.R.pat+' '+X.R.custom.steps+' want '+stepsNow+' saved '+JSON.stringify(X.LOG.skills['song:here-pavement'].strum));
  ok(/Here: play the changes/.test(d.getElementById('panel').textContent),'song-strum-pathnote');
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
