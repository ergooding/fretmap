// Exhaustive settings audit: drills (every scale, mode, key, position, chord, pattern, subdivision, chord step, and ending),
// chord voicings, quiz questions, explore dots, text in both layouts, and a timed playback run. Takes a few minutes.
const {JSDOM}=require('jsdom');
const goMode=(d,ck,m)=>{if(m==='name'||m==='find'){ck(d.querySelector('[data-mode=quiz]')); const b=d.querySelector(`[data-act=quiz][data-v=${m}]`); if(b&&b.getAttribute('aria-pressed')!=='true') ck(b);} else ck(d.querySelector(`[data-mode=${m}]`));};
const html=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
function mk(wide){
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=()=>({matches:wide,addEventListener(){}});
  const node=()=>({connect(){},start(){},stop(){},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},type:''});
  w.AudioContext=function(){const t0=Date.now();return {get currentTime(){return (Date.now()-t0)/1000},state:'running',destination:{},createOscillator:node,createGain:node,createBiquadFilter:node,resume(){}}};
 }});
 dom.window.addEventListener('error',e=>{errors.push(e.message)});
 return dom;
}
const errors=[], fails={}; const fail=(k,msg)=>{fails[k]=(fails[k]||0)+1; if(fails[k]<=3) console.log('FAIL',k,msg);};
const OPEN=[4,9,2,7,11,4]; const pc=(s,f)=>(OPEN[s]+f)%12;
const dom=mk(true), w=dom.window, d=w.document;
setTimeout(async()=>{
 const X=w.__fretDebug, click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const setSel=(id,v)=>{const s=d.getElementById(id);s.value=String(v);s.dispatchEvent(new w.Event('change'));};
 const famKeys=['major','pent','blues','harm','mel','chrom'];
 const pats=['updown','strings','thirds','g3','g4','arp','enclose','walk'];
 let nDrill=0,nVoice=0,nNoVoice=0,nQuiz=0;
 click(d.querySelector('[data-mode=drill]'));
 for(const fam of famKeys){ setSel('selFam',fam);
  const nModes=d.getElementById('selMode').options.length;
  for(let m=0;m<nModes;m++){ setSel('selMode',m);
   for(const key of [0,4,10]){ setSel('selKey',key);
    const pos=[...d.getElementById('selPos').options].map(o=>+o.value).filter(v=>v>=0);
    for(const p of pos){ setSel('selPos',p);
     for(const sev of [true,false]){ X.D.sev=sev; X.refresh();
      const C=X.cur;
      for(let c=0;c<C.chords.length;c++){ X.D.chord=c; X.refresh(); const cur=X.cur; const ch=cur.chord;
       if(/\?|undefined|NaN/.test(ch.name+ch.roman)||!ch.roman) fail('chordname',ch.name+' '+ch.roman);
       // voicing
       const v=cur.voicing;
       if(v){nVoice++;
         const played=v.frets.map((f,s)=>f===null?null:pc(s,f)).filter(x=>x!==null);
         if(played[0]!==ch.root) fail('voicing-bass',ch.name);
         if(played.some(x=>!cur.chordPcs.has(x))) fail('voicing-tone',ch.name);
         if(v.frets.some(f=>f!==null&&f!==0&&(f<cur.lo-1||f>cur.hi))) fail('voicing-range',ch.name+' '+v.frets+' box '+cur.lo);
         if(v.frets.some(f=>f===0)&&cur.lo>1) fail('voicing-open',ch.name);
         const missing=[...cur.chordPcs].filter(x=>!played.includes(x)).map(x=>(x-ch.root+12)%12);
         if(missing.some(r=>!(ch.rel.length===4&&r>=6&&r<=8))) fail('voicing-missing',ch.name+' '+missing);
       } else nNoVoice++;
       for(const pat of pats) for(const sub of [1,2,3,4]) for(const pad of [false,true]) for(const res of ['key','chord']){
        if(sub!==2&&pad===false) continue;
        Object.assign(X.D,{pattern:pat,sub,pad,resolve:res});
        const seq=X.genSeq(); nDrill++;
        const tag=`${fam}/${m}/${key}/${p}/${ch.name}/${pat}/s${sub}/${pad}/${res}`;
        if(!seq.length){fail('empty',tag);continue;}
        if(seq.some(x=>!x)){fail('undefined-step',tag);continue;}
        const notes=seq.filter(x=>!x.chord&&!x.rest);
        if(notes.some(n=>n.f<cur.lo||n.f>cur.hi)) fail('note-outside-box',tag);
        if(notes.some(n=>!cur.set.has((pc(n.s,n.f)-cur.key+12)%12))) fail('note-not-in-scale',tag);
        const home=res==='chord'?ch.root:cur.key; const last=notes[notes.length-1];
        const hasHome=X.boxNotes().some(n=>pc(n.s,n.f)===home);
        if(hasHome&&pc(last.s,last.f)!==home) fail('no-resolve',tag);
        if(hasHome&&pc(notes[0].s,notes[0].f)!==home) fail('no-start-root',tag);
        if(pad&&v){
          const bar=4*sub;
          if(seq.length%bar) fail('pad-length',tag);
          seq.forEach((x,i)=>{ if((i%bar===0)!==!!x.chord) fail('pad-position',tag); });
        }
        if(pad&&!v&&seq.some(x=>x.chord)) fail('pad-without-voicing',tag);
       }
      }}}}}}
 console.log(`drill combos: ${nDrill}, chords with voicing: ${nVoice}, without: ${nNoVoice}`);
 // ---- quizzes and explore
 X.D.pad=false; X.D.sub=2;
 for(const fam of famKeys){ setSel('selFam',fam);
  const nModes=d.getElementById('selMode').options.length;
  for(let m=0;m<nModes;m++){ setSel('selMode',m);
   for(const key of [-1,0,7]){ setSel('selKey',key);
    const pos=[-1,...[...d.getElementById('selPos').options].map(o=>+o.value).filter(v=>v>=0)];
    for(const p of pos){ setSel('selPos',p);
     const cur=X.cur;
     click(d.querySelector('[data-mode=explore]'));
     if(key>=0){ const dots=d.querySelectorAll('.cell .dot').length;
       let expect=0; for(let s=0;s<6;s++)for(let f=0;f<=12;f++) if(cur.set.has((pc(s,f)-cur.key+12)%12)) expect++;
       if(dots!==expect) fail('explore-dots',`${fam}/${m}/${key}/${p} ${dots} vs ${expect}`); }
     for(const mode of ['name','find']){ goMode(d,click,mode);
      for(let k=0;k<6;k++){ const q=X.st.q; nQuiz++;
       const tag=`${mode} ${fam}/${m}/${key}/${p}`;
       if(!q||!q.root||!q.target){fail('quiz-missing',tag);break;}
       if(pc(q.root.s,q.root.f)!==q.key) fail('quiz-root',tag);
       if(!cur.whole&&(q.root.f<cur.lo||q.root.f>cur.hi||q.target.f<cur.lo||q.target.f>cur.hi)) fail('quiz-outside',tag);
       if((pc(q.target.s,q.target.f)-q.key+12)%12!==q.iv) fail('quiz-target',tag);
       if(!cur.set.has(q.iv)||q.iv===0) fail('quiz-iv',tag);
       if(mode==='name'){ const n=d.querySelectorAll('[data-act=answer]').length; if(n!==cur.allowed.length) fail('answer-count',tag);
         click(d.querySelector(`[data-act=answer][data-i="${q.iv}"]`)); if(!d.querySelector('.ans.right')) fail('answer-mark',tag);}
       else { const t=d.querySelector(`.cell[data-s="${q.target.s}"][data-f="${q.target.f}"]`); click(t); if(!q.answered) fail('find-answer',tag); }
       click(d.querySelector('[data-act=next]'));
      }}
    }}}}
 console.log('quiz questions checked:',nQuiz);
 // ---- locked Explore: click each note of the scale in every position; each chord listed must hold it and come from the key,
 // and each shape must play only its notes, the clicked note among them, root in the bass, inside the position
 { let nLk=0,nLkV=0; X.saved.lkSev=true; click(d.querySelector('[data-mode=explore]'));
  for(const fam of famKeys){ setSel('selFam',fam); const nModes=d.getElementById('selMode').options.length;
   for(let m=0;m<nModes;m++){ setSel('selMode',m);
    for(const key of [0,7]){ setSel('selKey',key);
     for(const p of [-1,...[...d.getElementById('selPos').options].map(o=>+o.value).filter(v=>v>=0)]){ setSel('selPos',p);
      const cur=X.cur, S=cur.set, lo=cur.whole?0:cur.lo, hi=cur.whole?12:cur.hi, seen=new Set();
      for(let s=0;s<6;s++) for(let f=lo;f<=hi;f++){ const q=pc(s,f), iv=(q-cur.key+12)%12; if(!S.has(iv)||seen.has(q)) continue; seen.add(q);
       X.st.lkSel=null; click(d.querySelector(`.cell[data-s="${s}"][data-f="${f}"]`)); nLk++;
       const tag=`${fam}/${m}/${key}/${p} ${q}`; if(X.lkSel()!==q||X.F.key!==key){fail('lk-sel',tag); continue;}
       const W=X.lkWin(), L=X.lkChords();
       if(fam!=='chrom'&&S.size===7&&L.filter(x=>!x.sev).length!==3) fail('lk-three',tag);
       for(const x of L){ const c=x.ch, tones=c.rel.map(r=>(c.root+r)%12);
        if(!tones.includes(q)||(S.size===7&&c.tones.some(t=>!S.has(t)))) fail('lk-chord',`${tag} ${c.name}`);
        if(!x.v){fail('lk-no-shape',`${tag} ${c.name}`); continue;} nLkV++;
        const fr=x.v.frets, pl=fr.map((g,t)=>g===null?null:pc(t,g)).filter(z=>z!==null);
        if(pl.some(z=>!tones.includes(z))||!pl.includes(q)||pl[0]!==c.root) fail('lk-shape',`${tag} ${c.name} ${fr}`);
        if(fr.some(g=>g!==null&&(g===0?W.lo>1:(g<Math.max(1,W.lo-1)||g>W.hi)))) fail('lk-shape-outside',`${tag} ${c.name} ${fr}`);}
       for(const [r,t] of X.lkPairs()) if(pc(r.s,r.f)!==cur.key||pc(t.s,t.f)!==q||!X.shapeFits(iv,r,t)) fail('lk-line',tag);
       if(/undefined|NaN|\[object/.test(d.querySelector('.app').textContent)) fail('lk-text',tag);
      }}}}}
  X.st.lkSel=null; X.saved.lkSev=false; console.log('locked explore notes:',nLk,'shapes:',nLkV); }
 // ---- text sanity across modes and layouts
 for(const wide of [true,false]){ const dm=mk(wide), dd=dm.window.document; await new Promise(r=>setTimeout(r,50));
   const ck=el=>el.dispatchEvent(new dm.window.MouseEvent('click',{bubbles:true}));
   for(const mode of ['explore','name','find','drill']){ goMode(dd,ck,mode); if(mode==='drill') ck(dd.querySelector('.cell[data-s="1"][data-f="3"]'));
     const txt=dd.querySelector('.app').textContent; if(/undefined|NaN|\[object/.test(txt)) fail('text',`${wide?'wide':'phone'} ${mode}`);}
 }
 // ---- playback: tempo, sub change mid-play, walk+pad, ramp
 {const DX=X; click(d.querySelector('[data-mode=drill]')); setSel('selFam','major'); setSel('selMode',0); setSel('selKey',0); setSel('selPos',8);
  Object.assign(DX.D,{pattern:'walk',pad:true,sub:2,ramp:8,click:true,notes:true}); DX.saved.bpm=240; click(d.querySelector('[data-act=faster]'));
  click(d.querySelector('[data-act=play]'));
  const bpm0=DX.saved.bpm; let chordOnDownbeat=true, sawChord=false;
  const iv=setInterval(()=>{const i=DX.st.idx; if(i>=0){const x=DX.st.seq[i]; if(x&&x.chord){sawChord=true; if(i%(4*DX.D.sub)) chordOnDownbeat=false;}}},10);
  await new Promise(r=>setTimeout(r,3000));
  click(d.querySelector('[data-act=sheet]'));
  const sub=d.querySelector('[data-set=sub]'); sub.value='3'; sub.dispatchEvent(new w.Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,5000)); clearInterval(iv);
  if(!sawChord) fail('play-chord','never saw chord step'); if(!chordOnDownbeat) fail('play-downbeat','chord off the downbeat');
  if(DX.saved.bpm<=bpm0) fail('play-ramp','tempo never ramped');
  click(d.querySelector('[data-act=play]')); if(DX.st.playing) fail('play-stop','did not stop');
  console.log('playback: bpm',bpm0,'->',DX.saved.bpm);
 }
 console.log('errors:',errors.length?errors.slice(0,5):'none');
 console.log('failures:',Object.keys(fails).length?fails:'none');
 process.exit();
},100);
