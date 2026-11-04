/* Blog-only navigation, preferences and sharing. Article data/API remain untouched. */
(function () {
  'use strict';
  const zh=document.documentElement.lang.startsWith('zh');
  const t=zh?{toc:'文章目录',tools:'阅读设置',progress:'阅读进度',dark:'深色模式',size:'字号',smaller:'缩小正文字号',larger:'放大正文字号',spacing:'行距',compact:'紧凑',standard:'标准',relaxed:'宽松',share:'分享文章',close:'关闭',wechat:'微信',qr:'用微信扫描二维码',qrUnavailable:'二维码暂不可用，请复制下方文章链接。',xhs:'小红书',paste:'已准备好分享文字，请复制后粘贴到小红书发布。',copy:'复制链接',copyMessage:'复制分享文字',copied:'已复制',failed:'无法自动复制，请选择下方文字手动复制。',link:'文章链接'}:
    {toc:'On this page',tools:'Reading settings',progress:'Reading progress',dark:'Dark mode',size:'Font size',smaller:'Decrease article font size',larger:'Increase article font size',spacing:'Line spacing',compact:'Compact',standard:'Standard',relaxed:'Relaxed',share:'Share article',close:'Close',wechat:'WeChat',qr:'Scan with WeChat',qrUnavailable:'QR code unavailable. Copy the article link below.',xhs:'Xiaohongshu',paste:'Copy this message and paste it into Xiaohongshu to publish.',copy:'Copy link',copyMessage:'Copy share message',copied:'Copied',failed:'Automatic copying is unavailable. Select and copy the text below.',link:'Article link'};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(text,fn,label)=>{const n=el('button','',text);n.type='button';if(label)n.setAttribute('aria-label',label);n.addEventListener('click',fn);return n;};
  const frame=fn=>window.requestAnimationFrame?window.requestAnimationFrame(fn):window.setTimeout(fn,16);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function getSettings(){
    try {const p=JSON.parse(localStorage.getItem('lx_blog_reading'))||{};return{scale:typeof p.scale==='number'&&Number.isFinite(p.scale)?clamp(p.scale,.875,1.375):1,spacing:['compact','standard','relaxed'].includes(p.spacing)?p.spacing:'standard'};}
    catch(_){return{scale:1,spacing:'standard'};}
  }
  function saveSettings(value){try{localStorage.setItem('lx_blog_reading',JSON.stringify(value));}catch(_){} }
  function canonical(post){
    const u=new URL(zh?'/zh/blog-post.html':'/blog-post.html','https://lxiang.cc');u.searchParams.set('p',post.file);return u.href;
  }
  function shareURLs(post){const url=canonical(post),x=new URL('https://twitter.com/intent/tweet');x.searchParams.set('text',post.title);x.searchParams.set('url',url);return{url,x:x.href,message:post.title+'\n'+url};}
  function progress(scroll,top,height,viewport,offset){
    const available=Math.max(1,viewport-offset);
    if(height<=available)return scroll+offset>=top?100:0;
    return Math.round(clamp((scroll+offset-top)/(height-available)*100,0,100));
  }
  function activeIndex(positions,scroll,offset){let active=0;positions.forEach((position,i)=>{if(position<=scroll+offset+16)active=i;});return active;}
  function headings(content,title){
    const used=new Set();
    return Array.from(content.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(h=>h.textContent.trim() && !(h.tagName==='H1' && h.textContent.trim()===title.trim())).map(h=>{
      const slug=h.textContent.trim().normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';
      let id='section-'+slug,count=1;while(used.has(id))id='section-'+slug+'-'+(++count);used.add(id);h.id=id;return h;
    });
  }
  function drawQR(url){
    const qr=window.qrcode(0,'M');qr.addData(url);qr.make();const size=qr.getModuleCount(),ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+(size+8)+' '+(size+8));svg.setAttribute('role','img');svg.setAttribute('aria-label',t.qr);svg.classList.add('reading-qr');
    const background=document.createElementNS(ns,'rect');background.setAttribute('width','100%');background.setAttribute('height','100%');background.setAttribute('fill','#fff');svg.append(background);
    let d='';for(let row=0;row<size;row++)for(let col=0;col<size;col++)if(qr.isDark(row,col))d+='M'+(col+4)+' '+(row+4)+'h1v1h-1z';
    const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill','#000');svg.append(path);return svg;
  }
  function share(post,origin){
    const links=shareURLs(post),dialog=el('dialog','reading-share');dialog.setAttribute('aria-labelledby','reading-share-title');
    const heading=el('h2','',t.share);heading.id='reading-share-title';const options=el('div','reading-share-options'),output=el('div','reading-share-output');
    const label=el('label','comments-field',t.link),link=el('input');link.type='text';link.readOnly=true;link.value=links.url;label.append(link);
    const message=el('p','reading-status');message.setAttribute('role','status');
    async function copy(value,field){try{await navigator.clipboard.writeText(value);message.textContent=t.copied;}catch(_){field.focus();field.select();message.textContent=t.failed;}}
    options.append(button(t.wechat,()=>{try{output.replaceChildren(el('p','',t.qr),drawQR(links.url));}catch(_){output.replaceChildren(el('p','',t.qrUnavailable));}}));
    const x=el('a','reading-button','X');x.href=links.x;x.target='_blank';x.rel='noopener noreferrer';options.append(x);
    options.append(button(t.xhs,()=>{const note=el('p','',t.paste),text=el('textarea');text.readOnly=true;text.rows=4;text.value=links.message;text.setAttribute('aria-label',t.xhs);output.replaceChildren(note,text,button(t.copyMessage,()=>copy(links.message,text)));}));
    options.append(button(t.copy,()=>copy(links.url,link)));const close=button(t.close,()=>dialog.close());
    dialog.append(heading,options,output,label,message,close);document.body.append(dialog);
    dialog.addEventListener('close',()=>{dialog.remove();if(origin.isConnected)origin.focus();},{once:true});dialog.showModal();close.focus();
  }
  let content,post,settings,baseSize,baseLine,toc,tools,mobile,wide,allHeadings=[],tocLinks=[],positions=[],metrics={},scheduled=false;
  const percentages=[];
  const branches=new Map(),parents=new Map();
  let activeHeading=-1,ready=false,restoring=false,saveTimer,restoreTimer,correction=null,mountVersion=0;
  const positionKey=()=> 'lx_blog_position:'+post.file;
  function scrollImmediately(top,relative=false){
    const root=document.documentElement,previous=root.style.scrollBehavior;root.style.scrollBehavior='auto';
    window[relative?'scrollBy':'scrollTo']({top,behavior:'auto'});root.style.scrollBehavior=previous;
  }
  function readPosition(){try{const value=JSON.parse(localStorage.getItem(positionKey()));return value&&typeof value.headingId==='string'&&Number.isFinite(value.offset)?value:null;}catch(_){return null;}}
  function savePosition(){
    clearTimeout(saveTimer);saveTimer=null;
    if(!ready||restoring||!content?.isConnected||!allHeadings.length)return;
    const i=activeIndex(positions,window.scrollY,metrics.offset);
    const record={headingId:allHeadings[i].id,offset:window.scrollY+metrics.offset-positions[i],updatedAt:Date.now()};
    try{localStorage.setItem(positionKey(),JSON.stringify(record));}catch(_){}
  }
  function scheduleSave(){if(ready&&!restoring&&!saveTimer)saveTimer=setTimeout(savePosition,900);}
  function setBranch(id,open,preserve=false){
    const branch=branches.get(id);if(!branch)return;branch.toggle.setAttribute('aria-expanded',String(open));if(branch.list.hidden===!open)return;
    const before=content?.getBoundingClientRect().top;
    branch.list.hidden=!open;
    if(preserve&&toc.open&&!wide.matches&&Number.isFinite(before)){
      const shift=content.getBoundingClientRect().top-before;
      if(shift){positions=positions.map(y=>y+shift);metrics.top+=shift;scrollImmediately(shift,true);}
    }
    if(content?.isConnected)frame(measure);
  }
  function reveal(id){for(let parent=parents.get(id);parent;parent=parents.get(parent))setBranch(parent,true,true);}
  function markActive(index){
    if(index===activeHeading)return;activeHeading=index;
    const current=allHeadings[index];if(!current)return;reveal(current.id);
    tocLinks.forEach((link,i)=>{if(i===index)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    // Scroll the TOC viewport only, never scroll the document from a scrollspy.
    const nav=wide.matches?toc.closest('.reading-toc-slot'):toc.querySelector('nav'),link=tocLinks[index];
    if(nav&&link&&toc.open){const a=nav.getBoundingClientRect(),b=link.getBoundingClientRect();if(b.top<a.top||b.bottom>a.bottom)nav.scrollTop+=b.top-a.top-nav.clientHeight/2;}
  }
  function hashHeading(){
    if(!location.hash)return null;
    try{const id=decodeURIComponent(location.hash.slice(1));return allHeadings.find(h=>h.id===id)||null;}catch(_){return null;}
  }
  function finishRestore(){clearTimeout(restoreTimer);correction=null;restoring=false;ready=true;document.documentElement.classList.remove('reading-restoring');measure();}
  function cancelCorrection(){if(restoring)finishRestore();}
  function correctPosition(){
    if(!correction||!content?.isConnected)return;
    const target=correction.heading,offset=correction.offset;
    const top=target?target.getBoundingClientRect().top+window.scrollY+offset-metrics.offset:0;
    scrollImmediately(Math.max(0,top));
  }
  function restoreLocation(){
    if(!window.document||!content?.isConnected)return;
    clearTimeout(saveTimer);saveTimer=null;clearTimeout(restoreTimer);ready=false;restoring=true;document.documentElement.classList.add('reading-restoring');
    const heading=hashHeading(),saved=location.hash?null:readPosition();
    const remembered=saved&&allHeadings.find(h=>h.id===saved.headingId);
    correction={heading:heading||remembered||null,offset:heading?0:remembered?clamp(saved.offset,-window.innerHeight,Math.max(content.scrollHeight,window.innerHeight)):0};
    if(correction.heading){reveal(correction.heading.id);activeHeading=-1;}
    // Unknown hashes/removed headings safely return to the article start.
    measure();correctPosition();update();
    const pending=Array.from(content.querySelectorAll('img')).some(img=>!img.complete&&(!correction.heading||Boolean(img.compareDocumentPosition(correction.heading)&Node.DOCUMENT_POSITION_FOLLOWING)));
    frame(()=>frame(()=>{if(restoring)measure();}));
    restoreTimer=setTimeout(()=>{measure();finishRestore();},pending?6000:1800);
  }
  function navigateHeading(heading){
    finishRestore();clearTimeout(saveTimer);saveTimer=null;
    const hash='#'+encodeURIComponent(heading.id);
    if(location.hash!==hash)history.pushState(null,'',hash);
    reveal(heading.id);measure();
    scrollImmediately(Math.max(0,heading.getBoundingClientRect().top+window.scrollY-metrics.offset));
    activeHeading=-1;update();scheduleSave();
  }
  function addCopyLinks(){
    const status=el('p','reading-announcement');status.setAttribute('role','status');document.body.append(status);
    for(const heading of allHeadings.filter(h=>h.tagName!=='H1')){
      const title=heading.textContent;
      const copy=button('',async()=>{
        const url=new URL(location.href);url.searchParams.set('p',post.file);url.hash=heading.id;
        let success=false;
        try{await navigator.clipboard.writeText(url.href);success=true;}catch(_){
          const field=el('textarea','reading-copy-fallback');field.value=url.href;document.body.append(field);field.select();
          try{success=document.execCommand('copy');}catch(_){}field.remove();copy.focus({preventScroll:true});
        }
        status.textContent='';status.textContent=success?t.copied:t.failed;
        copy.dataset.feedback=success?t.copied:(zh?'复制失败':'Copy failed');
        window.setTimeout(()=>{delete copy.dataset.feedback;copy.setAttribute('aria-label',(zh?'复制章节链接：':'Copy link to section: ')+title);},1800);
        copy.setAttribute('aria-label',success?t.copied:(zh?'复制章节链接：':'Copy link to section: ')+title);
        if(!success){
          const dialog=el('dialog','reading-share'),field=el('input');field.value=url.href;field.readOnly=true;field.setAttribute('aria-label',t.link);
          const close=button(t.close,()=>dialog.close());dialog.append(el('p','',t.failed),field,close);document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();copy.focus();},{once:true});dialog.showModal();field.select();
        }
      },(zh?'复制章节链接：':'Copy link to section: ')+title);
      copy.className='reading-heading-copy';copy.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      heading.append(copy);
    }
  }
  function buildTOC(){
    const nav=el('nav');nav.setAttribute('aria-label',t.toc);const list=el('ol');nav.append(list);
    const stack=[];
    for(const h of allHeadings){
      const level=Number(h.tagName[1]);while(stack.length&&stack.at(-1).level>=level)stack.pop();
      const parent=stack.at(-1);parents.set(h.id,parent?.heading.id||null);
      let target=list;
      if(parent){
        let branch=branches.get(parent.heading.id);
        if(!branch){
          const children=el('ol');children.id='toc-'+parent.heading.id;
          const toggle=button('▸',()=>setBranch(parent.heading.id,children.hidden),(zh?'展开或折叠：':'Expand or collapse: ')+parent.heading.textContent);
          toggle.className='reading-toc-toggle';toggle.setAttribute('aria-controls',children.id);
          parent.row.prepend(toggle);parent.item.append(children);branch={list:children,toggle};branches.set(parent.heading.id,branch);setBranch(parent.heading.id,parent.level<=2);
        }
        target=branch.list;
      }
      const item=el('li'),row=el('div','reading-toc-row'),link=el('a','',h.textContent);link.href='#'+encodeURIComponent(h.id);link.dataset.heading=h.id;
      link.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigateHeading(h);});
      row.append(link);item.append(row);target.append(item);tocLinks.push(link);stack.push({heading:h,item,row,level});
    }
    toc.append(nav);toc.hidden=false;
  }
  function apply(){
    content.style.setProperty('--reading-font-size',baseSize*settings.scale+'px');
    const factor={compact:1.5/1.8,standard:1,relaxed:2.1/1.8}[settings.spacing];
    content.style.setProperty('--reading-line-height',baseLine*factor);
    saveSettings(settings);
    tools.querySelectorAll('button,select').forEach(n=>n.disabled=false);
    tools.querySelector('[data-size]').textContent=Math.round(settings.scale*100)+'%';
    tools.querySelector('[data-size-down]').disabled=settings.scale<=.875;tools.querySelector('[data-size-up]').disabled=settings.scale>=1.375;
    tools.querySelector('select').value=settings.spacing;measure();
  }
  function measure(){
    if(!content)return;const rect=content.getBoundingClientRect(),header=document.querySelector('.site-header').getBoundingClientRect().height;
    document.documentElement.style.setProperty('--blog-header-height',header+'px');
    metrics={top:rect.top+window.scrollY,height:rect.height,offset:header+8,viewport:window.innerHeight};
    positions=allHeadings.map(h=>h.getBoundingClientRect().top+window.scrollY);if(restoring)correctPosition();update();
  }
  function update(){
    if(!content)return;
    const value=progress(window.scrollY,metrics.top,metrics.height,metrics.viewport,metrics.offset);
    percentages.forEach(n=>{n.setAttribute('aria-valuenow',value);n.style.setProperty('--progress',value+'%');n.querySelector('span').textContent=value+'%';});
    const active=activeIndex(positions,window.scrollY,metrics.offset);
    markActive(active);
  }
  function queue(){if(scheduled)return;scheduled=true;frame(()=>{scheduled=false;update();scheduleSave();});}
  function progressBar(cls){const n=el('div','reading-progress '+cls);n.setAttribute('role','progressbar');n.setAttribute('aria-label',t.progress);n.setAttribute('aria-valuemin','0');n.setAttribute('aria-valuemax','100');n.append(el('span','','0%'));percentages.push(n);return n;}
  function positionPanels(){
    const desktop=wide.matches;
    (desktop?document.querySelector('.reading-toc-slot'):mobile).append(toc);
    (desktop?document.querySelector('.reading-tools-slot'):mobile).append(tools);
    // Reset desktop disclosure when returning to compact mode.
    toc.open=desktop;tools.open=desktop;measure();
  }
  function init(){
    if(!document.querySelector('.reading-layout'))return;
    mobile=document.querySelector('.reading-mobile-controls');wide=window.matchMedia('(min-width: 90rem)');
    toc=el('details','reading-toc');toc.hidden=true;toc.append(el('summary','',t.toc));
    tools=el('details','reading-tools');tools.append(el('summary','',t.tools));const panel=el('div','reading-tools-panel');tools.append(panel);
    panel.append(el('p','reading-tool-label',t.progress),progressBar('reading-progress-desktop'));
    const dark=button(t.dark,()=>{const isDark=document.documentElement.dataset.blogTheme!=='dark';document.documentElement.dataset.blogTheme=isDark?'dark':'light';dark.setAttribute('aria-pressed',String(isDark));try{localStorage.setItem('lx_blog_theme',isDark?'dark':'light');}catch(_){} });
    dark.setAttribute('aria-pressed',String(document.documentElement.dataset.blogTheme==='dark'));panel.append(dark);
    const size=el('div','reading-size');size.append(el('span','reading-tool-label',t.size));
    const down=button('A−',()=>{settings.scale=Math.max(.875,Math.round((settings.scale-.0625)*10000)/10000);apply();},t.smaller);down.dataset.sizeDown='';
    const up=button('A+',()=>{settings.scale=Math.min(1.375,Math.round((settings.scale+.0625)*10000)/10000);apply();},t.larger);up.dataset.sizeUp='';const number=el('output');number.dataset.size='';size.append(down,number,up);panel.append(size);
    const label=el('label','reading-tool-label',t.spacing),spacing=el('select');
    for(const id of ['compact','standard','relaxed']){const option=el('option','',t[id]);option.value=id;spacing.append(option);}label.append(spacing);panel.append(label);
    spacing.addEventListener('change',()=>{settings.spacing=spacing.value;apply();});
    const shareButton=button(t.share,()=>{if(post)share(post,shareButton);});panel.append(shareButton);
    document.body.append(progressBar('reading-progress-mobile'));
    tools.querySelectorAll('button,select').forEach(n=>n.disabled=true);
    positionPanels();wide.addEventListener('change',positionPanels);
    [toc,tools].forEach(n=>n.addEventListener('toggle',()=>{if(wide.matches&&!n.open)n.open=true;measure();}));
    window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',measure,{passive:true});
    if('scrollRestoration' in history)history.scrollRestoration='manual';
    window.addEventListener('pageshow',event=>{if(event.persisted)restoreLocation();});
    window.addEventListener('hashchange',restoreLocation);window.addEventListener('popstate',restoreLocation);
    window.addEventListener('pagehide',savePosition);document.addEventListener('visibilitychange',()=>{if(document.hidden)savePosition();});
    for(const type of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(type,cancelCorrection,{passive:true});
  }
  function mount(value){
    if(post)return;
    const version=++mountVersion;post=value;content=document.getElementById('post-content');const computed=getComputedStyle(content);
    baseSize=parseFloat(computed.fontSize)||16;baseLine=parseFloat(computed.lineHeight)/baseSize||1.8;
    settings=getSettings();allHeadings=headings(content,post.title);tocLinks=[];
    if(allHeadings.length)buildTOC();
    addCopyLinks();
    apply();
    if(window.ResizeObserver){const observer=new ResizeObserver(measure);observer.observe(content);observer.observe(document.querySelector('.site-header'));}
    content.addEventListener('load',measure,true);
    // Markdown, anchors and TOC already exist. Wait for fonts and two paint frames
    // before restoration; subsequent image/header resizes correct for a bounded time.
    Promise.resolve(document.fonts?.ready).then(()=>frame(()=>frame(()=>{if(version===mountVersion)restoreLocation();})));
  }
  init();window.BlogReading={mount,canonical,shareURLs,progress,activeIndex,headings,getSettings};
})();
