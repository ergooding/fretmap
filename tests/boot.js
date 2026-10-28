// Start-up with saved Drill settings: the page must load without errors whatever progression was left open,
// including an unsaved sketch or a custom progression that no longer exists.
const {JSDOM}=require('jsdom');
const html=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
let bad=0;
(async()=>{
  for(const prog of ['mine-sketch','mine-gone','pop','one']){
    const errs=[];
    const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://fretmap.test/',beforeParse(w){
      w.matchMedia=()=>({matches:true,addEventListener(){}});
      w.localStorage.setItem('fret-iv-v1',JSON.stringify({drill:{line:'prog',prog,plan:'strum'}}));
      w.addEventListener('error',e=>errs.push(e.message));}});
    await new Promise(r=>setTimeout(r,60));
    const X=dom.window.__fretDebug;
    if(errs.length||!X||!dom.window.document.querySelector('.modes button')){bad++; console.log('FAIL boot',prog,errs.join(' | '));}
    dom.window.close();
  }
  console.log('boot checks done, bad',bad); process.exit(bad?1:0);
})();
