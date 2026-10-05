/* PDF output is built from article text, independently of the reading DOM. */
((root)=>{
 const closing=new Set([... '，。！？；：、）》」』】〕〉〗〙〛…,.!?;:)]}']);
 const opening=new Set([... '（《「『【〔〈〖〘〚([{']);
 function wrapText(text,font,size,width,indent=0){
  const result=[];let first=true;
  for(const explicitLine of String(text).replace(/\r\n?/g,'\n').split('\n')){
   let chars=[...explicitLine.replace(/\t/g,'    ')];
   if(!chars.length){result.push({text:'',indent:first?indent:0});first=false;continue}
   while(chars.length){
    const inset=first?indent:0,limit=width-inset;
    let count=0,candidate='';
    while(count<chars.length&&font.widthOfTextAtSize(candidate+chars[count],size)<=limit){candidate+=chars[count++];}
    if(!count)throw new Error('PDF line width is too small');
    // Keep Chinese closing punctuation with the preceding line.
    if(count<chars.length&&closing.has(chars[count])){
     if(count>1)count--;else count++;
    }
    while(count>1&&opening.has(chars[count-1]))count--;
    // Avoid splitting an English word when the line contains a useful space.
    if(count<chars.length&&/[A-Za-z0-9]/.test(chars[count-1])&&/[A-Za-z0-9]/.test(chars[count])){
     const space=chars.slice(0,count).lastIndexOf(' ');
     if(space>count*.5)count=space+1;
    }
    result.push({text:chars.splice(0,count).join(''),indent:inset});first=false;
   }
  }
  return result;
 }
 async function create(article,{PDFLib,fontkit,fontBytes}){
  if(!article?.title||!Array.isArray(article.paragraphs)||!article.paragraphs.length)throw new Error('No article text');
  const texts=[String(article.title),String(article.author||''),...article.paragraphs.map(p=>String(p.text||''))];
  const supported=new Set(fontkit.create(new Uint8Array(fontBytes)).characterSet);
  const missing=[...new Set([...texts.join('')].filter(c=>!/[\r\n\t]/.test(c)&&!supported.has(c.codePointAt(0))))];
  if(missing.length)throw new Error('匯出字體未收錄以下字元：'+missing.join(''));
  const pdf=await PDFLib.PDFDocument.create();pdf.registerFontkit(fontkit);
  // This asset is already subset to the collection. Retain its glyph IDs when embedding.
  const font=await pdf.embedFont(fontBytes,{subset:false});
  pdf.setTitle(article.title);pdf.setAuthor(article.author||'');pdf.setCreator('ReadMaud');
  const width=595.28,height=841.89,margin=54,bodySize=14,lineHeight=25,usable=width-margin*2;
  const pages=[];let page,y;
  function addPage(){page=pdf.addPage([width,height]);pages.push(page);y=height-margin-18;}
  function draw(lines,size,leading,gap=0){
   for(const line of lines){
    if(y<margin+24)addPage();
    if(line.text)page.drawText(line.text,{x:margin+line.indent,y,font,size,color:PDFLib.rgb(0.12,0.12,0.12)});
    y-=leading;
   }
   y-=gap;
  }
  addPage();
  draw(wrapText(article.title,font,21,usable),21,32,8);
  if(article.author)draw(wrapText(article.author,font,12,usable),12,22,18);
  for(const p of article.paragraphs)draw(wrapText(p.text,font,bodySize,usable,bodySize*2),bodySize,lineHeight,12);
  pages.forEach((p,index)=>{
   const label=`${index+1} / ${pages.length}`;
   p.drawText(label,{x:width-margin-font.widthOfTextAtSize(label,10),y:30,font,size:10,color:PDFLib.rgb(.4,.4,.4)});
  });
  return pdf.save();
 }
 const api={create,wrapText};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return}
 root.ReadMaudPDF=api;
 let resources,busy=false;
 function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('PDF resource failed: '+src))};document.head.append(script)})}
 function loadResources(){
  if(!resources)resources=Promise.all([
   root.PDFLib?Promise.resolve():loadScript('./vendor/pdf-lib.min.js'),
   root.fontkit?Promise.resolve():loadScript('./vendor/fontkit.min.js'),
   fetch('./assets/source-han-serif-tc.ttf').then(r=>{if(!r.ok)throw new Error('PDF font failed');return r.arrayBuffer()})
  ]).then(([, ,fontBytes])=>({PDFLib:root.PDFLib,fontkit:root.fontkit,fontBytes})).catch(error=>{resources=null;throw error});
  return resources;
 }
 const button=document.querySelector('#export-pdf'),status=document.querySelector('#pdf-status');
 button.addEventListener('click',async()=>{
  const article=activeArticle();if(busy||!article?.paragraphs?.length)return;
  busy=true;
  button.disabled=true;button.textContent='正在製作…';status.textContent='正在製作原文 PDF…';
  try{
   const bytes=await create(article,await loadResources());
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   const link=document.createElement('a');link.href=url;link.download=(article.title.replace(/[\\/:*?"<>|]/g,'_')||'ReadMaud')+'_原文.pdf';
   document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='原文 PDF 已製作完成。';
  }catch(error){console.error(error);status.textContent='PDF 匯出未完成，請稍後重試。'+(error.message.startsWith('匯出字體')?error.message:'');}
  finally{busy=false;button.disabled=!activeArticle()?.paragraphs?.length;button.textContent='匯出 PDF'}
 });
 const sync=()=>{button.disabled=busy||!activeArticle()?.paragraphs?.length;if(!busy)status.textContent=''};
 document.addEventListener('readerarticlechange',sync);sync();
})(typeof window!=='undefined'?window:globalThis);
