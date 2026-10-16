// Progressions in Drill: strumming and arpeggios, scheduled against a hand-driven clock.
// Structure, for every progression and plan across keys, modes, and boxes: the chords follow the scale degrees, each voicing sits in
// the box with the root in the bass, strum bars follow the pattern, and arpeggio bars play the strummed shape one string at a time.
// Sound, for a sample: a one-bar count-in, strums on the right steps in the right direction with the right notes, ghosts silent,
// chucks heard, shuffle timing, arpeggio notes on time, and the progression repeating. Also checks pause, the grid, and both layouts.
const {JSDOM}=require('jsdom');
const html=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const OPEN=[4,9,2,7,11,4], MIDI=[40,45,50,55,59,64];
const FAM_STEPS={major:[0,2,4,5,7,9,11],harm:[0,2,3,5,7,8,11],mel:[0,2,3,5,7,9,11]};
let bad=0, checked=0, played=0; const fail=(k,m)=>{bad++; if(bad<20) console.log('FAIL',k,m);};
function mk(wide){
  const log=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.matchMedia=()=>({matches:wide,addEventListener(){}}); w.__now=0;
    const node=()=>{const n={type:'',connect(){},stop(){},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},
      gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},start(t){log.push({t,type:n.type,f:n.frequency.value});}}; return n;};
    w.AudioContext=function(){return {get currentTime(){return w.__now},state:'running',destination:{},createOscillator:node,createGain:node,createBiquadFilter:node,resume(){}}};
  }});
  dom.window.addEventListener('error',e=>fail('error',e.message));
  return {dom,log};
}
const midiOf=f=>Math.round(12*Math.log2(f/440)+69);
const pcOf=(s,f)=>(OPEN[s]+f)%12;
(async()=>{
  for(const wide of [true,false]){
    const {dom,log}=mk(wide), w=dom.window, d=w.document; await new Promise(r=>setTimeout(r,60));
    const X=w.__fretDebug, click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
    const change=(sel,v)=>{const e=d.querySelector(sel); e.value=v; e.dispatchEvent(new w.Event('change',{bubbles:true}));};
    const L=wide?'wide':'phone';
    const bc=(row,v)=>{const e=d.querySelector(`#exhead [data-act=bchip][data-row=${row}][data-v="${v}"]`); if(!e) fail('ui',`${L} no ${row} chip ${v}`); else click(e);};
    const strum=v=>{const c=d.querySelector(`#exhead [data-act=bchip][data-row=rpat][data-v="${v}"]`); if(c){click(c); return;} // a chip, or the All 21 patterns menu
      click(d.querySelector('#exhead [data-act=pmenu][data-m=rpat]')); const m=d.querySelector(`#exhead .smenu [data-row=rpat][data-v="${v}"]`); if(!m) fail('ui',`${L} no strum ${v}`); else click(m);};
    click(d.querySelector('[data-mode=drill]'));
    {const sp=d.getElementById('selPos'); sp.value='5'; sp.dispatchEvent(new w.Event('change',{bubbles:true}));}
    bc('prog','pop'); bc('plan','both');
    click(d.querySelector('[data-act=sheet]')); // Each chord and notes per beat live in Settings
    if(!d.querySelector('.sets')) fail('ui',L+' settings did not open');
    if(X.D.line!=='prog'||!d.querySelector('#exhead [data-row=prog]')) fail('ui',L+' no progression controls');
    if(d.querySelector('[data-k=pad]')||d.querySelector('#exhead [data-row=lpat]')) fail('ui',L+' scale-line controls still shown');

    // ---- structure across keys, modes, boxes, progressions, plans
    const modes=[['major',0],['major',1],['major',4],['major',5],['harm',0],['mel',0]];
    for(const key of wide?[0,7,9,4]:[0]) for(const [fam,mode] of modes){
      d.getElementById('selKey').value=key; d.getElementById('selKey').dispatchEvent(new w.Event('change',{bubbles:true}));
      d.getElementById('selFam').value=fam; d.getElementById('selFam').dispatchEvent(new w.Event('change',{bubbles:true}));
      d.getElementById('selMode').value=mode; d.getElementById('selMode').dispatchEvent(new w.Event('change',{bubbles:true}));
      const scale=FAM_STEPS[fam].map((x,i,a)=>(a[(i+mode)%7]-a[mode]+12)%12).sort((a,b)=>a-b);
      const boxes=X.cur.pos.slice(0,wide?4:2).map(p=>p.lo);
      for(const lo of boxes){
        d.getElementById('selPos').value=lo; d.getElementById('selPos').dispatchEvent(new w.Event('change',{bubbles:true}));
        for(const [pid,,degs] of X.PROGS) for(const plan of ['both','strum','arp']){
          bc('prog',pid); bc('plan',plan);
          const tag=`${L} key=${key} ${fam}/${mode} box=${lo} ${pid} ${plan}`; checked++;
          const C=X.cur, prog=C.prog;
          if(!prog||prog.length!==degs.length){fail('prog-len',tag); continue;}
          const fx=X.PROG_FIX[pid], fset=fx&&(fx[scale.includes(3)&&!scale.includes(4)?'min':'maj']||fx.maj||fx.min);
          prog.forEach((p,i)=>{
            if(fset){ // a progression named for its own chords keeps them in every mode
              const [r,tri,sev]=fset[degs[i]];
              if(p.ch.root!==(key+r)%12||!p.ch.name.endsWith(X.D.sev?sev:tri)) fail('root',`${tag} chord ${i} ${p.ch.name}`);
            }else{
              if(p.ch.root!==(key+scale[degs[i]])%12) fail('root',`${tag} chord ${i}`);
              if([...p.pcs].some(x=>!scale.includes((x-key+12)%12))) fail('outside-scale',`${tag} chord ${p.ch.name}`);
            }
            const v=p.voicing; if(!v) return;
            const played=v.frets.map((f,s)=>f===null?null:{s,f}).filter(Boolean);
            if(pcOf(played[0].s,played[0].f)!==p.ch.root) fail('bass',`${tag} ${p.ch.name} ${v.frets}`);
            if(played.some(n=>!p.pcs.has(pcOf(n.s,n.f)))) fail('voicing-notes',`${tag} ${p.ch.name}`);
            if(played.some(n=>n.f===0?lo>1:(n.f<Math.max(1,lo-1)||n.f>lo+4))) fail('voicing-box',`${tag} ${p.ch.name} ${v.frets}`);
          });
          const seq=X.st.seq, P=X.curPat(); let j=0, bar=0;
          prog.forEach((p,ci)=>{
            const want=[]; if(plan!=='arp'&&p.voicing) want.push('strum'); if(plan!=='strum'||!p.voicing) want.push('arp');
            for(const kind of want){
              const n=kind==='strum'?P.res:4*X.D.sub;
              for(let k=0;k<n;k++,j++){
                const e=seq[j]; if(!e){fail('seq-short',tag); return;}
                if(e.ci!==ci||e.bar!==bar||e.k!==k||e.n!==n) {fail('seq-shape',`${tag} step ${j}`); return;}
                if(kind==='strum'){ if(!e.chord||e.strum!==P.steps[k]) fail('strum-step',`${tag} step ${j}`); }
                else{
                  if(e.chord||e.s===undefined) {fail('arp-step',`${tag} step ${j}`); continue;}
                  if(p.voicing){ if(p.voicing.frets[e.s]!==e.f) fail('arp-off-shape',`${tag} step ${j}`); }
                  else if(!p.pcs.has(pcOf(e.s,e.f))||e.f<lo||e.f>lo+4) fail('arp-off-box',`${tag} step ${j}`);
                  if(k===0&&p.voicing&&e.s!==p.voicing.frets.findIndex(f=>f!==null)) fail('arp-start',`${tag} starts on string ${e.s}`);
                }
              }
              bar++;
            }
          });
          if(j!==seq.length) fail('seq-long',`${tag} ${seq.length} vs ${j}`);
          if(/undefined|NaN|\[object/.test(d.querySelector('.app').textContent)) fail('text',tag);
        }
      }
    }

    console.log(L,'structure done',checked);
    // ---- sound: count-in, strums, arpeggios, shuffle, repeat
    d.getElementById('selKey').value=7; d.getElementById('selKey').dispatchEvent(new w.Event('change',{bubbles:true}));
    d.getElementById('selFam').value='major'; d.getElementById('selFam').dispatchEvent(new w.Event('change',{bubbles:true}));
    const opens=X.cur.pos.find(p=>p.lo===0); d.getElementById('selPos').value=opens?0:X.cur.pos[0].lo; d.getElementById('selPos').dispatchEvent(new w.Event('change',{bubbles:true}));
    const sampleProgs=wide?X.PROGS.map(p=>p[0]):['pop','251','blues'];
    for(const pid of sampleProgs) for(const pat of ['faithful','funkchuck','shuffle','skank']) for(const swing of [false,true]) for(const sub of [2,3]){
      bc('prog',pid); bc('plan','both');
      strum(pat); X.R.swing=swing; X.D.sub=sub; change('[data-set=sub]',String(sub));
      Object.assign(X.D,{click:true,notes:true,ramp:0}); X.saved.bpm=100;
      const tag=`${L} ${pid} ${pat} swing=${swing} sub=${sub}`; played++;
      const seq=X.st.seq, prog=X.cur.prog, beat=60/100;
      log.length=0; w.__now=0;
      click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer);
      const start=X.met.next, t0=start+4*beat;
      const total=seq.reduce((a,e)=>a+beat*4/e.n,0), end=t0+total+beat*4+0.3; // one pass and the first bar of the next
      const passes=X.lg.cur?X.lg.cur.passes:0;
      while(w.__now<end){w.__now+=0.01; X.pschedule();}
      click(d.querySelector('[data-act=play]')); // pause
      if(X.st.playing) fail('pause',tag);
      const ci=log.filter(e=>e.type==='sine'&&(e.f===1760||e.f===1175)&&e.t<t0-1e-6);
      if(ci.length!==4) fail('countin',`${tag} ${ci.length}`);
      let cursor=t0;
      const stepAt=[]; for(let pass=0;pass<2;pass++) for(let j=0;j<seq.length;j++){const e=seq[j], dur=beat*4/e.n; stepAt.push({e,t:cursor+(swing&&(e.n===8||e.n===16)&&e.k%2?dur/3:0),dur}); cursor+=dur; if(pass===1&&e.bar>0) break;}
      for(const {e,t,dur} of stepAt){
        const notes=log.filter(x=>x.type==='triangle'&&x.t>=t-1e-6&&x.t<t+Math.min(0.08,dur*0.9));
        const got=notes.map(x=>midiOf(x.f));
        if(e.chord){
          const v=prog[e.ci].voicing, chuck=log.some(x=>x.type==='sine'&&x.f===150&&Math.abs(x.t-t)<1e-6);
          if(e.strum==='.'){ if(notes.length||chuck) fail('ghost-sounded',`${tag} bar ${e.bar} step ${e.k}`); continue; }
          if(e.strum==='m'){ if(!chuck) fail('chuck-missing',`${tag} bar ${e.bar} step ${e.k}`); continue; }
          const want=v.frets.map((f,s)=>f===null||(e.k%2&&s<2)?null:MIDI[s]+f).filter(x=>x!==null);
          if(got.length!==want.length||!want.every(m=>got.includes(m))) fail('strum-notes',`${tag} bar ${e.bar} step ${e.k} got ${got} want ${want}`);
          if(Math.abs(notes[0]?.t-t)>1e-6) fail('strum-time',`${tag} bar ${e.bar} step ${e.k}`);
          const first=notes.slice().sort((a,b)=>a.t-b.t)[0]; if(first){const lowFirst=midiOf(first.f)===Math.min(...got); if(lowFirst!==(e.k%2===0)) fail('strum-direction',`${tag} bar ${e.bar} step ${e.k}`);}
        }else{
          if(got.length!==1||got[0]!==MIDI[e.s]+e.f||Math.abs(notes[0].t-t)>1e-6) fail('arp-note',`${tag} bar ${e.bar} step ${e.k} got ${got} want ${MIDI[e.s]+e.f}`);
        }
      }
      if(X.lg.cur) fail('log-open',tag);
      // pausing resumes at the start of the bar that was playing
      X.st.idx=seq.findIndex(e=>e.bar===1)+2; X.met.k=X.st.idx+1; X.st.playing=true; click(d.querySelector('[data-act=play]'));
      const want=seq.findIndex(e=>e.bar===1); if(X.st.resumeK!==want) fail('resume',`${tag} ${X.st.resumeK} vs ${want}`);
      click(d.querySelector('[data-act=restart]')); w.clearInterval(X.met.timer); click(d.querySelector('[data-act=play]'));
    }
    // a pass is counted when the progression comes round again
    {
      bc('prog','two'); bc('plan','strum'); X.saved.bpm=200; log.length=0; w.__now=0;
      click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer);
      const len=X.st.seq.reduce((a,e)=>a+0.3*4/e.n,0);
      const stop=X.met.next+4*0.3+len*2.5; while(w.__now<stop){w.__now+=0.01; X.pschedule();}
      if(!X.lg.cur||X.lg.cur.passes!==2) fail('passes',X.lg.cur&&X.lg.cur.passes);
      click(d.querySelector('[data-act=play]'));
    }
    // editing the grid makes a custom pattern, rebuilds the strum bars, and cycles the step
    strum('quarters'); click(d.querySelector('.rstep[data-i="1"]'));
    if(X.R.pat!=='custom'||X.R.custom.steps!=='xxx.x.x.') fail('edit',X.R.pat+' '+X.R.custom.steps);
    if(X.st.seq.filter(e=>e.chord).slice(0,8).map(e=>e.strum).join('')!=='xxx.x.x.') fail('edit-seq','strum bar not rebuilt');
    click(d.querySelector('[data-act=rres][data-v="16"]'));
    if(X.R.custom.res!==16||X.R.custom.steps!=='x.x.x...x...x...') fail('res16',X.R.custom.steps);
    click(d.querySelector('[data-act=rres][data-v="8"]'));
    if(X.R.custom.steps!=='xxx.x.x.') fail('res8',X.R.custom.steps);
    // the strum pattern is hidden for arpeggio only
    bc('plan','arp');
    if(d.getElementById('rgrid')||d.querySelector('#exhead [data-row=rpat]')) fail('arp-ui','strum grid shown for arpeggio only');
    bc('plan','both');
    // previewing a chord shows its voicing
    bc('prog','pop');
    if(wide){ for(let i=0;i<3&&!d.querySelector('.app').classList.contains('wide');i++) click(d.getElementById('layoutBtn')); // jsdom matches every media query, so force the desktop layout
      const b=d.querySelector('[data-pci="2"]'); if(!b) fail('preview','no chord strip'); else {click(b); if(X.cur.pci!==2||X.cur.voicing!==X.cur.prog[2].voicing) fail('preview','chord not shown');} }
    // five-note scales borrow the chords of the 7-note mode they sit in, and say so
    d.getElementById('selFam').value='pent'; d.getElementById('selFam').dispatchEvent(new w.Event('change',{bubbles:true}));
    if(!X.cur.prog||X.cur.prog.length!==4||!/nearest 7-note mode/.test(d.getElementById('sheet').textContent)) fail('pent','no borrowed chords for a 5-note scale');
    if(!d.querySelector('[data-act=play]')) fail('pent','no play button for borrowed chords');
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true})); d.dispatchEvent(new w.KeyboardEvent('keyup',{key:' ',bubbles:true}));
    if(!X.st.playing) fail('pent','space did not play borrowed chords');
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true})); d.dispatchEvent(new w.KeyboardEvent('keyup',{key:' ',bubbles:true}));
    d.getElementById('selFam').value='major'; d.getElementById('selFam').dispatchEvent(new w.Event('change',{bubbles:true}));
    // space plays and pauses
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));
    if(!X.st.playing) fail('space','did not start');
    d.dispatchEvent(new w.KeyboardEvent('keyup',{key:' ',bubbles:true}));
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));
    if(X.st.playing) fail('space','did not pause');
    // back to scale lines brings the old controls back
    bc('prog','one'); bc('plan','line');
    if(!d.querySelector('#exhead [data-row=lpat]')||X.D.line!=='scale'||X.cur.prog) fail('scale','scale lines not restored');
  }
  console.log('progression combos checked',checked,'played',played,'bad',bad);
  process.exit(bad?1:0);
})();
