// Smoke tests: fast checks (well under a minute) to run before every commit. The page starts cleanly from any saved
// Drill setup, every tab renders in both layouts with no errors or missing text, and the core actions work: playing a
// scale line and a progression, editing and flipping a strum step, clicking a note in Explore, answering a quiz question.
// The long, exhaustive checks are the regression suite (npm run test:regression).
const {JSDOM}=require('jsdom');
const html=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
let bad=0; const fail=(k,m)=>{bad++; console.log('FAIL',k,m===undefined?'':m);}, ok=(c,k,m)=>{if(!c) fail(k,m);};
const BAD_TEXT=/undefined|NaN|\[object/;
function mk(wide,store){
  const errs=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://fretmap.test/',beforeParse(w){
    w.matchMedia=q=>({matches:wide&&!/max-height/.test(q),addEventListener(){}}); w.__now=0;
    const node=()=>({type:'',connect(){},start(){},stop(){},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}});
    w.AudioContext=function(){return {get currentTime(){return w.__now},state:'running',destination:{},createOscillator:node,createGain:node,createBiquadFilter:node,resume(){}}};
    w.scrollTo=()=>{}; w.Element.prototype.scrollTo=function(){}; w.Element.prototype.scrollIntoView=function(){};
    if(store) w.localStorage.setItem('fret-iv-v1',JSON.stringify(store));
    w.addEventListener('error',e=>errs.push(e.message));}});
  return {dom,errs};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  // start-up from saved Drill setups, including an unsaved sketch and a deleted custom progression
  for(const prog of ['mine-sketch','mine-gone','pop','one']){
    const {dom,errs}=mk(true,{drill:{line:'prog',prog,plan:'strum'}}); await wait(60);
    ok(!errs.length&&dom.window.__fretDebug&&dom.window.document.querySelector('[data-mode=drill]'),'boot '+prog,errs.join(' | ')); dom.window.close();
  }
  for(const wide of [true,false]){
    const L=wide?'wide':'phone', {dom,errs}=mk(wide), w=dom.window, d=w.document; await wait(60);
    const X=w.__fretDebug;
    const click=el=>{if(!el){fail('missing',new Error().stack.split('\n')[2].trim()); return;} if(el.tagName==='OPTION'){el.selected=true; el.closest('select').dispatchEvent(new w.Event('change',{bubbles:true})); return;} el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));}; // a phone's builder rows are selects
    const mode=m=>click(d.querySelector(`[data-mode=${m}]`));
    const bc=(row,v)=>click(d.querySelector(`#exhead [data-act=bchip][data-row=${row}][data-v="${v}"]`));
    const text=tag=>{const t=d.querySelector('.app').textContent; ok(!BAD_TEXT.test(t),`${L} text ${tag}`,(t.match(BAD_TEXT)||[])[0]);};
    // every tab renders
    for(const m of ['explore','quiz','drill','practice','songs']){mode(m); ok(X.st.mode===m||m==='quiz'&&['name','find'].includes(X.st.mode),`${L} tab ${m}`,X.st.mode); text(m);}
    // Explore: click a note on the neck
    mode('explore'); click(d.querySelector('.neck .cell .dot')?.closest('.cell')); text('explore click');
    // Quiz: answer one question
    mode('quiz'); click(d.querySelector('.ans')); text('quiz answer');
    // Drill: a scale line plays notes
    const play=(secs)=>{click(d.querySelector('[data-act=play]')); w.clearInterval(X.met.timer); const stop=w.__now+secs; while(w.__now<stop){w.__now+=0.01; X.schedule(); X.pschedule&&X.pschedule();} click(d.querySelector('[data-act=play]'));};
    mode('drill'); bc('plan','line'); ok(X.st.seq.length>0&&X.st.seq.some(n=>!n.rest),`${L} scale line`); play(3); text('scale line');
    // Drill: a progression strums, and the strum grid edits and flips a step
    bc('prog','pop'); bc('plan','strum'); ok(X.cur.prog&&X.cur.prog.length===4&&X.st.seq.some(n=>n.chord),`${L} progression`,JSON.stringify({prog:X.D.prog,line:X.D.line,plan:X.D.plan,n:X.cur.prog&&X.cur.prog.length})); play(3); text('progression');
    if(d.getElementById('rgrid')){
      click(d.querySelector('.rstep[data-i="1"]')); ok(X.R.pat==='custom',`${L} strum edit`);
      const before=X.R.custom.steps[2]; click(d.querySelector('.rdir[data-i="2"]')); ok(X.R.custom.steps[2]!==before&&X.st.seq.find(n=>n.chord&&n.k===2).down===false,`${L} strum flip`,X.R.custom.steps);
    } else if(wide) fail('wide strum grid','not shown');
    ok(!errs.length,`${L} errors`,errs.join(' | '));
    w.close();
  }
  console.log('smoke checks done, bad',bad); process.exit(bad?1:0);
})();
