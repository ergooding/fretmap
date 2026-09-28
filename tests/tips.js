// Checks that every button and menu has a tooltip, and that no tooltip shows missing text, in both layouts.
const {JSDOM}=require('jsdom');
const html=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
let bad=0,count=0; const seen=new Set();
async function run(wide){
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:wide,addEventListener(){}});}});
 const w=dom.window,d=w.document; w.addEventListener('error',e=>{console.log('ERR',e.message);bad++;});
 await new Promise(r=>setTimeout(r,60));
 const X=w.__fretDebug, click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const check=(label)=>{
   const els=[...d.querySelectorAll(X.TIP_SEL)].filter(e=>!e.closest('[hidden]'));
   for(const el of els){ const t=X.tipFor(el); count++;
     const key=(el.id||el.className||el.tagName)+(el.dataset.act||el.dataset.set||el.dataset.mode||'');
     if(!t||/undefined|NaN|\[object/.test(t)){bad++; if(bad<10) console.log('BAD',label,key,JSON.stringify(t));}
     else seen.add(key);
   }
   // untipped interactive controls
   [...d.querySelectorAll('button,select')].filter(e=>!e.closest('[hidden]')&&!e.matches(X.TIP_SEL)&&!e.closest(X.TIP_SEL)).forEach(e=>{console.log('NO TIP',label,e.outerHTML.slice(0,90));bad++;});
 };
 for(const m of ['explore','name','find','drill']){
   click(d.querySelector(`[data-mode=${m}]`)); check(m);
   if(m==='name'){click(d.querySelector('[data-act=answer]')); check('name answered');}
   if(m==='drill'){click(d.querySelector('.cell[data-s="0"][data-f="5"]')); check('drill box');
     click(d.querySelector('[data-act=tog][data-k=pad]')); check('drill pad'); click(d.querySelector('[data-act=move]')); check('drill pick');}
 }
 // sample some content
 click(d.querySelector('[data-mode=drill]')); click(d.querySelector('.cell[data-s="0"][data-f="5"]'));
 console.log(wide?'wide':'phone','samples:');
 for(const sel of ['.cell[data-s="2"][data-f="5"]','.tcol[data-j="0"]','.tcol[data-j="3"]','#selMode','[data-act=chord]','.fchip','[data-rn]']){const e=d.querySelector(sel); if(e) console.log('  ',sel,'→',X.tipFor(e).replace(/<[^>]+>/g,''));}
}
(async()=>{await run(true); await run(false); console.log('tips checked',count,'bad',bad); process.exit();})();
