/* Reading pages use native text columns, so words and punctuation stay intact. */
(()=>{
 const app=window.ReadMaudApp;if(!app)throw new Error('ReadMaudApp is unavailable');
 const {safeGet,safeSet,esc,isReady,activeArticle,renderOriginal}=app;
 const reader=document.querySelector('#reader'),article=document.querySelector('#article');
 const toggle=document.querySelector('#reading-mode-toggle');
 const scrollToggle=document.querySelector('#scroll-mode-toggle');
 const settingsKey='readmaud-page-mode-v1';
 let enabled=safeGet(settingsKey)==='pages',current=null,spread=0,columns=1,total=1,step=0,offset=0;
 let anchor={paragraph:0,character:0},frame=0,pointer=null,touchPointer=null,suppressSwipeClickUntil=0;
 const pane=document.createElement('div');
 pane.className='paged-reader';pane.hidden=true;
 pane.innerHTML='<div class="page-heading"><h3></h3><span></span></div><div class="page-window"><div class="page-flow"></div></div><div class="page-footer"><button type="button" class="page-prev" aria-label="上一頁">‹</button><button type="button" class="page-next" aria-label="下一頁">›</button><span class="page-counter" aria-live="polite" aria-atomic="true"></span></div>';
 reader.append(pane);
 const flow=pane.querySelector('.page-flow'),viewport=pane.querySelector('.page-window');
 const previous=pane.querySelector('.page-prev'),next=pane.querySelector('.page-next');
 const counter=pane.querySelector('.page-counter');
 const debugPages=new URLSearchParams(location.search).get('debugPages')==='1';
 const closeNote=()=>window.ReaderNotes.close();
 function textNodes(paragraph){
  const root=paragraph.querySelector('.page-original')||paragraph;
  const nodes=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('.note-bubble')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  while(walker.nextNode())nodes.push(walker.currentNode);
  return nodes;
 }
 function characterX(paragraph,character){
  const nodes=textNodes(paragraph);let remaining=character;
  for(const node of nodes){
   if(remaining<node.length){const range=document.createRange();range.setStart(node,remaining);range.setEnd(node,remaining+1);const rect=range.getBoundingClientRect();return rect.left-viewport.getBoundingClientRect().left+offset+viewport.scrollLeft}
   remaining-=node.length;
  }
  return 0;
 }
 function visibleParagraphs(){
  const left=viewport.getBoundingClientRect().left;
  return [...flow.querySelectorAll('.page-paragraph')].filter(p=>[...p.getClientRects()].some(rect=>rect.right>left+1&&rect.left<left+viewport.clientWidth-1));
 }
 function rememberAnchor(preferred){
  const p=preferred||visibleParagraphs()[0];if(!p)return;
  const length=textNodes(p).reduce((n,node)=>n+node.length,0);let lo=0,hi=length;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(characterX(p,mid)<offset-1)lo=mid+1;else hi=mid}
  anchor={paragraph:Number(p.dataset.paragraph),character:Math.min(lo,Math.max(0,length-1))};
 }
 function updateSpread(animate=false){
  const oldOffset=offset;
  flow.getAnimations().forEach(animation=>animation.cancel());
  spread=Math.max(0,Math.min(spread,Math.ceil(total/columns)-1));
  if(!animate)flow.classList.add('reflowing');
  viewport.scrollLeft=0;viewport.scrollTop=0;offset=spread*columns*step;flow.style.transform=`translateX(${-offset}px)`;
  previous.disabled=spread===0;next.disabled=(spread+1)*columns>=total;
  const start=spread*columns+1,end=Math.min(total,start+columns-1);
  counter.innerHTML=`第 <strong>${start===end?start:start+'–'+end}</strong> / ${total} 頁`;
  if(debugPages)counter.append(document.createTextNode(` [vp ${viewport.clientWidth}×${viewport.clientHeight} | flow ${flow.clientWidth}×${flow.clientHeight} | sc ${flow.scrollWidth}×${flow.scrollHeight}]`));
  document.querySelector('#progress-bar').style.width=(end/total*100)+'%';
  rememberAnchor();
  const bounds=viewport.getBoundingClientRect();
  flow.querySelectorAll('.annotated-word').forEach(button=>{const visible=[...button.getClientRects()].some(rect=>rect.right>bounds.left&&rect.left<bounds.right);button.tabIndex=visible?0:-1});
  if(animate&&oldOffset!==offset)flow.animate([{transform:`translateX(${-oldOffset}px)`},{transform:`translateX(${-offset}px)`}],{duration:200,easing:'cubic-bezier(.2,.7,.3,1)'});
  requestAnimationFrame(()=>flow.classList.remove('reflowing'));
 }
 function contentExtent(){
  const left=flow.getBoundingClientRect().left;let right=left;
  const walker=document.createTreeWalker(flow,NodeFilter.SHOW_TEXT,{acceptNode:node=>node.parentElement?.closest('.note-bubble')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const range=document.createRange();
  while(walker.nextNode()){
   const node=walker.currentNode;if(!node.data.trim())continue;
   range.selectNodeContents(node);
   for(const rect of range.getClientRects())if(rect.width>0)right=Math.max(right,rect.right);
  }
  return Math.max(flow.scrollWidth,right-left);
 }
 function layout(){
  frame=0;if(!enabled||!current||pane.hidden||document.querySelector('#today-view').hidden)return;
  closeNote();
  flow.getAnimations().forEach(animation=>animation.cancel());
  const savedAnchor={...anchor};
  columns=window.innerWidth>window.innerHeight?2:1;
  const gap=window.innerWidth<700?24:40;
  flow.classList.add('reflowing');flow.style.setProperty('--page-gap',gap+'px');flow.style.columnCount='auto';flow.style.columnGap=gap+'px';flow.style.columnFill='auto';
  viewport.scrollLeft=0;viewport.scrollTop=0;offset=0;flow.style.transform='translateX(0)';
  const toolbar=reader.querySelector('.reader-toolbar');
  const top=parseFloat(getComputedStyle(toolbar).top)||0;
  const mobile=document.querySelector('.mobile-nav');
  const bottom=getComputedStyle(mobile).display==='none'?0:mobile.getBoundingClientRect().height;
  const chrome=top+toolbar.getBoundingClientRect().height+pane.querySelector('.page-heading').getBoundingClientRect().height+pane.querySelector('.page-footer').getBoundingClientRect().height+72+bottom;
  viewport.style.height=Math.max(120,window.innerHeight-chrome)+'px';
  const width=viewport.clientWidth,height=viewport.clientHeight;
  const columnWidth=Math.floor((width-gap*(columns-1))/columns);
  flow.style.width=width+'px';flow.style.height=height+'px';flow.style.columnWidth=columnWidth+'px';
  step=columnWidth+gap;
  total=Math.max(1,Math.ceil(Math.max(0,contentExtent()-1)/step));
  const p=flow.querySelector(`[data-paragraph="${savedAnchor.paragraph}"]`);
  spread=p?Math.floor(Math.max(0,characterX(p,savedAnchor.character))/step/columns):0;
  updateSpread();
 }
 function scheduleLayout(){if(!frame)frame=requestAnimationFrame(layout)}
 function build(a){
  if(!isReady(a)||!Array.isArray(a.paragraphs)){current=null;closeNote();flow.innerHTML='';applyMode();return}
  current=a;spread=0;offset=0;anchor={paragraph:0,character:0};closeNote();
  flow.getAnimations().forEach(animation=>animation.cancel());
  flow.style.transform='translateX(0)';
  flow.dataset.type=a.type;
  pane.querySelector('.page-heading h3').textContent=a.title;
  pane.querySelector('.page-heading span').textContent=a.author;
  flow.innerHTML=isReady(a)?a.paragraphs.map((p,i)=>{
   const original=renderOriginal(p,i,a.id,'paged',a.type==='vernacular').replaceAll('<button class="annotated-word"','<span class="annotated-word" role="button" tabindex="0"').replaceAll(' type="button"','').replaceAll('</button>','</span>');
   const translation=p.translation?(a.type==='classical'?'<details class="translation page-translation"><summary>顯示這一段的譯文</summary><p>'+esc(p.translation)+'</p></details>':'<p class="quote page-translation">譯文｜'+esc(p.translation)+'</p>'):'';
   return `<section class="page-paragraph" data-paragraph="${i}"><span class="page-tag">${String(i+1).padStart(2,'0')}</span><p class="page-original">${original}</p>${translation}<details class="insight page-insight"><summary>這段說了甚麼？</summary><p>${esc(p.summary)}</p></details><details class="insight page-insight"><summary>深入分析</summary><p>${esc(p.analysis)}</p></details></section>`;
  }).join(''):'';

  applyMode();
 }
 function applyMode(){
  const ready=Boolean(current&&isReady(current));
  document.body.classList.toggle('paged-mode',enabled&&ready);
  pane.hidden=!enabled||!ready;article.hidden=enabled&&ready;
  toggle.checked=enabled;scrollToggle.checked=!enabled;
  toggle.closest('.reader-mode-option').classList.toggle('is-selected',enabled);
  scrollToggle.closest('.reader-mode-option').classList.toggle('is-selected',!enabled);
  toggle.disabled=!ready;scrollToggle.disabled=!ready;
  if(enabled&&ready)scheduleLayout();
 }
 function turn(direction){
  const target=spread+direction;if(target<0||target>=Math.ceil(total/columns))return;
  closeNote();spread=target;updateSpread(!matchMedia('(prefers-reduced-motion: reduce)').matches);
 }
 const changeMode=nextEnabled=>{
  if(!current||!isReady(current)||nextEnabled===enabled)return;
  if(nextEnabled){
   const originals=[...article.querySelectorAll('.para')];
   const top=reader.querySelector('.reader-toolbar').getBoundingClientRect().bottom;
   const index=originals.findIndex(p=>p.getBoundingClientRect().bottom>top);
   anchor={paragraph:Math.max(0,index),character:0};
  }
  enabled=nextEnabled;safeSet(settingsKey,enabled?'pages':'scroll');closeNote();applyMode();
  reader.scrollIntoView({behavior:'auto',block:'start'});
  if(!enabled){const target=article.querySelectorAll('.para')[anchor.paragraph];if(target)requestAnimationFrame(()=>{
   const toolbar=reader.querySelector('.reader-toolbar');window.scrollTo({top:window.scrollY+target.getBoundingClientRect().top-toolbar.getBoundingClientRect().bottom-12,behavior:'auto'});
  })}
 };
 scrollToggle.addEventListener('change',()=>{if(scrollToggle.checked)changeMode(false)});
 toggle.addEventListener('change',()=>{if(toggle.checked)changeMode(true)});
 previous.addEventListener('click',()=>turn(-1));next.addEventListener('click',()=>turn(1));
 flow.addEventListener('click',event=>{if(Date.now()<suppressSwipeClickUntil){suppressSwipeClickUntil=0;event.preventDefault();event.stopPropagation();return}const summary=event.target.closest('.page-paragraph details>summary');if(summary){rememberAnchor(summary.closest('.page-paragraph'));closeNote()}const button=event.target.closest('.annotated-word');if(button)window.ReaderNotes.toggle(button,viewport.getBoundingClientRect())});
 flow.addEventListener('toggle',event=>{if(event.target.matches('.page-translation,.page-insight'))scheduleLayout()},true);
 flow.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('.annotated-word')){event.preventDefault();event.target.closest('.annotated-word').click()}});
 document.addEventListener('keydown',event=>{
  if(!enabled||pane.hidden||document.querySelector('#today-view').hidden)return;
  if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable],.annotated-word'))return;
  const visible=reader.getBoundingClientRect();if(visible.top>window.innerHeight||visible.bottom<0)return;
  if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();turn(1)}
  if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();turn(-1)}
 },{capture:true});
 viewport.addEventListener('pointerdown',event=>{
  if(suppressSwipeClickUntil)suppressSwipeClickUntil=0;
  if(event.pointerType!=='touch'||!event.isPrimary||event.target.closest('button')||('ontouchstart'in window))return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 viewport.addEventListener('pointerup',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5&&window.getSelection()?.isCollapsed){if(event.cancelable)event.preventDefault();suppressSwipeClickUntil=Date.now()+350;turn(dx<0?1:-1)}
 });
 viewport.addEventListener('pointercancel',()=>{pointer=null});
 viewport.addEventListener('touchstart',event=>{
  if(event.touches.length!==1){touchPointer=null;return}
  const touch=event.changedTouches[0];if(!touch)return;
  if(suppressSwipeClickUntil)suppressSwipeClickUntil=0;
  if(event.target.closest('button')){touchPointer=null;return}
  touchPointer={id:touch.identifier,x:touch.clientX,y:touch.clientY};
 },{passive:true});
 viewport.addEventListener('touchmove',event=>{
  if(!touchPointer||event.touches.length!==1)return;
  const touch=Array.from(event.touches).find(item=>item.identifier===touchPointer.id);if(!touch)return;
  const dx=touch.clientX-touchPointer.x,dy=touch.clientY-touchPointer.y;
  if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.5&&window.getSelection()?.isCollapsed&&event.cancelable)event.preventDefault();
 },{passive:false});
 viewport.addEventListener('touchend',event=>{
  if(!touchPointer)return;
  const touch=Array.from(event.changedTouches).find(item=>item.identifier===touchPointer.id);if(!touch)return;
  const start=touchPointer;touchPointer=null;
  const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5&&window.getSelection()?.isCollapsed){if(event.cancelable)event.preventDefault();suppressSwipeClickUntil=Date.now()+350;turn(dx<0?1:-1)}
 },{passive:false});
 viewport.addEventListener('touchcancel',()=>{touchPointer=null},{passive:true});
 document.addEventListener('readerarticlechange',event=>build(event.detail));
 document.addEventListener('readerlayoutchange',scheduleLayout);
 document.addEventListener('readerviewchange',()=>{closeNote();scheduleLayout()});
 window.addEventListener('resize',scheduleLayout);
 window.addEventListener('scroll',closeNote,{passive:true});
 new ResizeObserver(scheduleLayout).observe(reader.querySelector('.reader-toolbar'));
 if(document.fonts)document.fonts.ready.then(scheduleLayout);
 const initial=activeArticle();if(initial)build(initial);else toggle.disabled=true;
})();
