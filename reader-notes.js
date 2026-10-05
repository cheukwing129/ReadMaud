/* One body-level annotation popup for scrolling and paged reading. */
(()=>{
 const popup=document.createElement('div');
 popup.id='reader-note';popup.className='reader-note';popup.hidden=true;popup.tabIndex=0;popup.setAttribute('role','status');
 const term=document.createElement('strong'),explanation=document.createElement('span');
 popup.append(term,explanation);document.body.append(popup);
 let active=null;
 function bounds(){
  const v=window.visualViewport;
  return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||window.innerWidth,height:v?.height||window.innerHeight};
 }
 function positionFor(rect,width,height,viewport,margin=16){
  const left=viewport.left+margin,top=viewport.top+margin;
  const right=Math.max(left,viewport.left+viewport.width-margin-width);
  const bottom=Math.max(top,viewport.top+viewport.height-margin-height);
  const above=rect.top-height-10,below=rect.bottom+10;
  return {left:Math.max(left,Math.min(rect.left,right)),top:Math.max(top,Math.min(below<=bottom?below:above>=top?above:below,bottom))};
 }
 function close(){
  if(active)active.setAttribute('aria-expanded','false');
  active=null;popup.hidden=true;
 }
 function toggle(button,clip){
  const wasOpen=active===button&&!popup.hidden;close();if(wasOpen)return;
  const metadata=button.nextElementSibling;if(!metadata)return;
  const viewport=bounds();
  popup.style.width=Math.min(340,Math.max(1,viewport.width-32))+'px';
  popup.style.maxWidth=Math.max(1,viewport.width-32)+'px';
  popup.style.maxHeight=Math.max(1,Math.min(viewport.height*.55,viewport.height-32))+'px';
  term.textContent=button.textContent;explanation.textContent=metadata.textContent;
  popup.hidden=false;active=button;button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',popup.id);
  const rect=[...button.getClientRects()].find(r=>(!clip||r.right>clip.left&&r.left<clip.right)&&r.bottom>viewport.top&&r.top<viewport.top+viewport.height)||button.getBoundingClientRect();
  const size=popup.getBoundingClientRect(),position=positionFor(rect,size.width,size.height,viewport);
  popup.style.left=position.left+'px';popup.style.top=position.top+'px';
 }
 document.addEventListener('click',event=>{if(!event.target.closest('.annotated-word,.reader-note'))close()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden){const button=active;const restore=popup.contains(document.activeElement);close();if(restore)button?.focus();event.stopImmediatePropagation()}},{capture:true});
 ['readerarticlechange','readerlayoutchange','readerviewchange'].forEach(name=>document.addEventListener(name,close));
 window.addEventListener('resize',close);
 window.addEventListener('scroll',close,{passive:true});
 window.visualViewport?.addEventListener('resize',close);
 window.visualViewport?.addEventListener('scroll',close);
 window.ReaderNotes={toggle,close,positionFor};
})();
