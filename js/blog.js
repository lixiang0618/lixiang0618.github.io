/* Shared bilingual Blog presentation. IDs always come from metadata.file. */
(function () {
  'use strict';
  const zh=document.documentElement.lang.startsWith('zh');
  const labels=zh?{all:'全部',notes:'笔记',research:'研究',projects:'项目',life:'生活',read:'阅读全文 →',empty:'暂无文章',error:'加载失败，请刷新重试',likes:'赞',comments:'评论',unavailable:'暂不可用'}:
    {all:'All',notes:'Notes',research:'Research',projects:'Projects',life:'Life',read:'Read More →',empty:'No posts yet',error:'Unable to load posts. Please refresh.',likes:'likes',comments:'comments',unavailable:'unavailable'};
  const prefix=zh?'../':'./';
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const category=p=>(p.categories || []).map(c=>labels[c] || c).join(' · ');
  function safeURL(value) {try {const u=new URL(value,location.href);return ['http:','https:','mailto:'].includes(u.protocol);}catch(_){return false;}}
  function sanitizeMarkdown(html) {
    const template=document.createElement('template');template.innerHTML=html;
    const allowed=new Set(['P','BR','H1','H2','H3','H4','H5','H6','STRONG','EM','CODE','PRE','UL','OL','LI','BLOCKQUOTE','A','IMG','HR','TABLE','THEAD','TBODY','TR','TH','TD','DEL']);
    for(const item of Array.from(template.content.querySelectorAll('*'))) {
      if(!allowed.has(item.tagName)){item.replaceWith(document.createTextNode(item.textContent));continue;}
      for(const attr of Array.from(item.attributes)) {
        const permitted=(item.tagName==='A'&&attr.name==='href')||(item.tagName==='IMG'&&['src','alt','title'].includes(attr.name))||(item.tagName==='CODE'&&attr.name==='class'&&/^language-[\w-]*$/.test(attr.value));
        if(!permitted || (['src','href'].includes(attr.name)&&!safeURL(attr.value)))item.removeAttribute(attr.name);
      }
    }
    return template.innerHTML;
  }
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderTags(container,tags) {container.replaceChildren();(Array.isArray(tags)?tags:[]).forEach(t=>container.append(node('span','post-tag',t)));}
  function renderPDF(container,file) {
    container.replaceChildren();if(!file)return;
    const heading=node('div','post-pdf-header',(zh?'附件：':'Attachment: ')+file);
    const frame=node('iframe');frame.src=prefix+'blogs/'+encodeURIComponent(file);frame.title=zh?'PDF 文档':'PDF Document';
    container.append(heading,frame);
  }
  async function count(post,kind) {
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
    try {
      const headers={};if(kind==='likes')headers['X-Visitor-ID']=window.MomentsLikes.getVisitorId();
      const r=await fetch('https://api.lxiang.cc/api/'+kind+'?type=blog&id='+encodeURIComponent(post.file),{headers,mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
      if(!r.ok)throw Error('HTTP');const data=await r.json();const n=kind==='likes'?data.likes:data.count;
      if(data.success!==true || data.content_type!=='blog' || data.content_id!==post.file || !Number.isSafeInteger(n)||n<0)throw Error('count');return n;
    }finally{clearTimeout(timer);}
  }
  async function listing() {
    const container=document.getElementById('blog-posts');if(!container)return;
    const filters=document.querySelector('.blog-filters');filters.replaceChildren();
    let posts=[],selected='all';const cards=new Map();
    for(const id of ['all','notes','research','projects','life']) {
      const b=node('button','filter-btn',labels[id]);b.type='button';b.dataset.filter=id;b.setAttribute('aria-pressed',String(id==='all'));b.classList.toggle('active',id==='all');
      b.addEventListener('click',()=>{selected=id;filters.querySelectorAll('button').forEach(n=>{n.classList.toggle('active',n===b);n.setAttribute('aria-pressed',String(n===b));});render();});filters.append(b);
    }
    function render() {
      container.replaceChildren();
      const visible=posts.filter(p=>selected==='all'||(p.categories||[]).includes(selected));
      for(const post of visible)container.append(cards.get(post.file));
      if(!visible.length)container.append(node('p','blog-state',labels.empty));
    }
    try {
      const r=await fetch(prefix+'data/blog.json');if(!r.ok)throw Error('metadata');posts=await r.json();
      posts.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||new Date(b.date)-new Date(a.date));
      const jobs=[];
      posts.forEach(post=>{
        const card=node('article','blog-post');card.dataset.post=post.file;
        const meta=node('div','blog-meta');meta.append(node('span','',post.date),node('span','blog-category',category(post)));
        const title=node('h2','blog-title',(post.pinned?'📌 ':'')+post.title);card.append(meta,title);
        if(post.image&&safeURL(post.image)){const img=node('img','blog-cover');img.src=new URL(post.image,new URL(prefix,location.href)).href;img.alt='';img.loading='lazy';card.append(img);}
        card.append(node('p','blog-excerpt',post.excerpt));
        const tags=node('div','post-tags');renderTags(tags,post.tags);card.append(tags);
        const footer=node('div','blog-card-footer');const link=node('a','blog-read-more',labels.read);link.href='blog-post.html?p='+encodeURIComponent(post.file);footer.append(link);
        const stats=node('div','blog-stats');
        for(const kind of ['likes','comments']) {
          const stat=node('span','','— '+labels[kind]);stat.setAttribute('aria-label',labels[kind]+': '+labels.unavailable);stats.append(stat);
          jobs.push(async()=>{try{const value=await count(post,kind);stat.textContent=value+' '+labels[kind];stat.setAttribute('aria-label',stat.textContent);}catch(_){stat.hidden=true;}});
        }
        footer.append(stats);card.append(footer);cards.set(post.file,card);
      });
      render();
      // At most four statistics requests in flight, cached in the rendered cards.
      let next=0;await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{while(next<jobs.length)await jobs[next++]();}));
    }catch(_){container.replaceChildren(node('p','blog-state',labels.error));}
  }
  function mountArticle(post) {
    const parent=document.querySelector('.post-container');
    const heart=node('div','blog-heart');parent.append(heart);
    window.MomentsLikes.mountControl(heart,{type:'blog',id:post.file});
    const discussion=node('section','blog-discussion');parent.append(discussion);
    window.BlogComments.mount(discussion,post.file);
  }
  document.getElementById('year').textContent=new Date().getFullYear();
  window.BlogUI={category,sanitizeMarkdown,escape,renderTags,renderPDF,mountArticle};
  listing();
})();
