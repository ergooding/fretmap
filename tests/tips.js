// Checks that every button and menu has a tooltip, and that no tooltip shows missing text, in both layouts.
const {JSDOM}=require('jsdom');
const goMode=(d,ck,m)=>{if(m==='name'||m==='find'){ck(d.querySelector('[data-mode=quiz]')); const b=d.querySelector(`[data-act=quiz][data-v=${m}]`); if(b&&b.getAttribute('aria-pressed')!=='true') ck(b);} else ck(d.querySelector(`[data-mode=${m}]`));};
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
 for(const m of ['explore','name','find','drill','practice','songs']){
   goMode(d,click,m); check(m);
   if(m==='name'){click(d.querySelector('[data-act=answer]')); check('name answered');}
   if(m==='drill'){click(d.querySelector('.cell[data-s="0"][data-f="5"]')); check('drill box');
     click(d.querySelector('[data-act=sheet]')); check('drill settings');
     click(d.querySelector('[data-act=tog][data-k=pad]')); check('drill pad'); click(d.querySelector('[data-act=sheetclose]')); check('drill settings closed');
     click(d.querySelector('[data-act=chord][aria-pressed=true]')); check('drill chord heard');
     X.F.pos=-1; X.refresh(); click(d.querySelector('[data-mode=explore]')); click(d.querySelector('[data-mode=drill]')); check('drill pick');}
   if(m==='practice'){d.querySelector('.psync').open=true; check('path sync open');
     click(d.querySelector('[data-act=songform]')); check('song form');
     d.getElementById('sgName').value='Wish You Were Here'; d.getElementById('sgLink').value='https://www.songsterr.com/x'; d.getElementById('sgChords').value='C D Am G'; click(d.querySelector('[data-act=songadd]')); check('song added');
     click(d.querySelector('[data-act=rate][data-v="3"]')); check('song rated');
     click(d.querySelector('[data-act=vpick]')); check('song voicing picker');
     click(d.querySelector('[data-act=vset]')); check('song voicing set');
     click(d.querySelector('[data-act=partadd]')); check('song part added');
     click(d.querySelector('[data-act=sgstep][data-i="1"]')); check('song strum custom');
     click(d.querySelector('[data-act=songform]')); check('second song form');
     goMode(d,click,'practice'); check('path with song');
     click(d.querySelector('[data-fm=song]')); check('focus on song'); goMode(d,click,'drill'); check('drill focused on song');
     {const sk=X.LOG.skills[X.saved.fsong]; X.saveParts(X.saved.fsong,[{name:'Verse',text:'C D'},{name:'Chorus',text:'Am G'}]); goMode(d,click,'explore'); goMode(d,click,'drill'); check('drill song parts');
      const sp=d.querySelector('[data-act=spart][data-v="1"]'); if(sp){click(sp); check('drill song chorus');} else {bad++; console.log('NO PART SEG');}
      click(d.querySelector('[data-act=spown]')); check('drill part own strum'); click(d.querySelector('[data-act=spart][data-v="-1"]')); check('drill whole song with part strum');
      X.saveParts(X.saved.fsong,[{name:'Verse',text:'[C G] D'},{name:'Chorus',text:'Am [G . . F]'}]); goMode(d,click,'explore'); goMode(d,click,'drill'); check('drill split bars');
      X.st.newSong=false; X.st.song=X.saved.fsong; goMode(d,click,'songs'); check('songs part strum'); click(d.querySelector('[data-act=pown]')); check('songs part strum on');}
     goMode(d,click,'explore'); check('explore song'); click(d.querySelector('.cchips [data-act=exch]:last-child')); check('explore song chord');
     click(d.querySelector('[data-act=exlab][data-v=key]')); check('explore song key labels'); click(d.querySelector('.cell[data-s="1"][data-f="3"]')); check('explore song tap'); click(d.querySelector('[data-fm=key]')); goMode(d,click,'practice'); check('focus back on key');
     click(d.querySelector('.pnext [data-act=step]')); check('drill from path');
     click(d.querySelector('[data-act=topath]')); check('back to path');
     click(d.querySelector('[data-act=step][data-id=r3]')); check('rhythm step from path');
     click(d.querySelector('[data-act=topath]'));
     click(d.querySelector('[data-act=songplay]')); check('song changes in drill');}
   if(m==='drill'){click(d.querySelector('.cell[data-s="0"][data-f="5"]'));
     click(d.querySelector('[data-act=line][data-v=prog]')); check('drill prog');
     click(d.querySelector('.rstep[data-i="1"]')); check('prog custom');
     click(d.querySelector('[data-act=rres][data-v="16"]')); check('prog custom 16');
     const sel=d.querySelector('[data-set=rpat]'); sel.value='shuffle'; sel.dispatchEvent(new w.Event('change',{bubbles:true})); check('prog shuffle');
     for(const id of X.PROGS.map(p=>p[0])){const ps=d.querySelector('[data-set=prog]'); ps.value=id; ps.dispatchEvent(new w.Event('change',{bubbles:true})); check('prog '+id);}
     click(d.querySelector('[data-act=sheet]')); check('prog settings');
     for(const v of ['strum','arp','both']){click(d.querySelector(`[data-act=plan][data-v=${v}]`)); check('plan '+v);}
     const pc=d.querySelector('[data-pci="1"]'); if(pc){click(pc); check('prog chord preview');}
     d.getElementById('selFam').value='pent'; d.getElementById('selFam').dispatchEvent(new w.Event('change',{bubbles:true})); check('prog pentatonic');
     d.getElementById('selFam').value='major'; d.getElementById('selFam').dispatchEvent(new w.Event('change',{bubbles:true}));
     click(d.querySelector('[data-act=line][data-v=scale]')); check('back to scale lines');}
 }
 // sample some content
 click(d.querySelector('[data-mode=drill]')); click(d.querySelector('.cell[data-s="0"][data-f="5"]'));
 console.log(wide?'wide':'phone','samples:');
 click(d.querySelector('[data-act=line][data-v=prog]'));
 for(const sel of ['[data-set=prog]','.tcol[data-j="0"]','.tcol[data-j="3"]','.tcol[data-j="9"]','[data-pci]']){const e=d.querySelector(sel); if(e) console.log('  ',sel,'→',X.tipFor(e).replace(/<[^>]+>/g,''));}
 click(d.querySelector('[data-act=line][data-v=scale]'));
 for(const sel of ['.cell[data-s="2"][data-f="5"]','.tcol[data-j="0"]','.tcol[data-j="3"]','#selMode','[data-act=chord]','.fchip','[data-rn]']){const e=d.querySelector(sel); if(e) console.log('  ',sel,'→',X.tipFor(e).replace(/<[^>]+>/g,''));}
}
(async()=>{await run(true); await run(false); console.log('tips checked',count,'bad',bad); process.exit();})();
