/* Expanded two-level Blog discussion; shares Moments' request/token conventions. */
(function(){
  'use strict';
  const C=window.SiteComments.core;
  const {el,button,key,read,write,forget,request,commentId,relativeDate,date,avatar,words}=C;
  const zh=document.documentElement.lang.startsWith('zh');
  const t=zh?{
    title:'评论',order:'讨论最多',reply:'回复',replyTo:'回复 @',cancelReply:'取消回复',all:n=>'查看全部 '+n+' 条回复',collapse:'收起回复',
    deletedRoot:'该评论已被发布者删除',deletedReply:'该回复已被发布者删除',guidelines:'评论须知',
    rules:[['自由讨论：','欢迎畅所欲言，理性交流，尊重不同观点。'],['管理原则：','站长不会因观点不同而删评，仅对涉及违法的内容进行处理。'],['编辑与删除：','每条评论及回复都有独立 Token，浏览器会自动保存。请自行备份，丢失后可能无法恢复权限。'],['发言提醒：','请确认内容后再发布，为自己的言论负责。']],
    recover:'恢复管理凭证',id:'评论 ID',use:'使用凭证',restored:'凭证已载入，操作权限仍由服务器验证。',notFound:'未找到此评论。',empty:'还没有评论，欢迎参与讨论。'
  }:{title:'Comments',order:'Most Discussed',reply:'Reply',replyTo:'Reply to @',cancelReply:'Cancel reply',all:n=>'View all '+n+' replies',collapse:'Collapse replies',
    deletedRoot:'This comment was deleted by its poster.',deletedReply:'This reply was deleted by its poster.',guidelines:'Comment Guidelines',
    rules:[['Open Discussion:','Share freely, stay respectful, and welcome different opinions.'],['Moderation:','The site owner will not remove comments over differing opinions, only unlawful content.'],['Edit & Delete:','Each comment and reply has its own token, saved locally in your browser. Keep a backup; lost tokens may mean lost access.'],['Before Posting:','Think before you post and take responsibility for your words.']],
    recover:'Recover management token',id:'Comment ID',use:'Use token',restored:'Token loaded; the server still verifies authorization.',notFound:'Comment not found.',empty:'No comments yet. Join the discussion.'};
  const paths=['M21 11a9 9 0 0 1-9 9H5l-4 3V11a10 10 0 0 1 20 0Z','M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6','M15 7a5 5 0 1 1-3 9l-7 6H2v-4l7-7a5 5 0 0 1 6-4ZM17 6h.01','M12 8v5m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'];
  function guidelines(){
    const box=el('aside','blog-guidelines');box.append(el('h3','',t.guidelines));const list=el('ul');
    t.rules.forEach(([title,body],i)=>{
      const item=el('li');const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');const path=document.createElementNS(icon.namespaceURI,'path');path.setAttribute('d',paths[i]);icon.append(path);
      const content=el('span');content.append(el('strong','',title),document.createTextNode(' '+body));item.append(icon,content);list.append(item);
    });box.append(list);return box;
  }
  function field(form,title,multi=false){const label=el('label','comments-field');label.append(el('span','',title));const input=el(multi?'textarea':'input');if(multi){input.rows=4;input.maxLength=1000;}else{input.type='text';input.maxLength=60;}label.append(input);form.append(label);return input;}
  function mount(container,id){
    if(container.dataset.mounted)return;container.dataset.mounted='true';
    const heading=el('h2','',t.title);const total=el('span','blog-comment-total','—');heading.append(document.createTextNode(' '),total);
    const order=el('p','blog-thread-order',t.order);container.append(heading,guidelines());
    const form=el('form','blog-comment-form');const target=el('p','blog-reply-target');target.hidden=true;
    const nickname=field(form,words.nickname),body=field(form,words.body,true);form.prepend(target);
    const cancelReply=button(t.cancelReply,()=>setReply(null),'blog-text-button');cancelReply.hidden=true;
    const send=el('button','comments-primary',words.send);send.type='submit';const message=el('p','comments-status');message.setAttribute('role','status');
    const backup=el('div','blog-token-backup');backup.hidden=true;form.append(cancelReply,send,message,backup);
    const status=el('p','comments-status');status.setAttribute('role','status');const threads=el('div','blog-threads');container.append(form,order,status,threads);
    const pendingKey=key('POST','blog',id);let record=read(pendingKey),replyTarget=null,busy=false,version=0,all=[];const expanded=new Set();
    const s={type:'blog',id,comments:[],load};
    function setReply(comment){
      if(record)return;
      replyTarget=comment;target.hidden=!comment;target.textContent=comment?t.replyTo+comment.nickname:'';cancelReply.hidden=!comment;
      if(comment){body.focus();form.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
    }
    function freeze(){nickname.readOnly=!!record;body.readOnly=!!record;cancelReply.disabled=!!record;}
    function showBackup(){
      backup.hidden=false;backup.replaceChildren(el('h3','',words.success),el('p','',words.backup));
      const saved=field(backup,words.token);saved.value=record.payload.deletion_token;saved.maxLength=64;saved.readOnly=true;
      backup.append(button(words.copy,async()=>{try{await navigator.clipboard.writeText(saved.value);message.textContent=words.copied;}catch(_){saved.focus();saved.select();message.textContent=words.copyFailed;}}),button(words.done,()=>{
        forget(pendingKey);record=null;nickname.value='';body.value='';backup.hidden=true;backup.replaceChildren();message.textContent='';freeze();setReply(null);send.disabled=false;
      }));send.disabled=true;saved.focus();
    }
    if(record?.payload){nickname.value=record.payload.nickname;body.value=record.payload.body;freeze();message.textContent=record.completed?'':words.pending;
      if(record.payload.reply_to_id){target.hidden=false;target.textContent=t.reply+' · '+record.payload.reply_to_id;}
      if(record.completed)showBackup();
    }
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||record?.completed)return;
      const name=nickname.value.trim(),text=body.value.trim();
      if(!name||[...name].length>30||!text||[...text].length>500){message.textContent=words.invalid;return;}
      try{
        record=record||read(pendingKey);
        if(!record)record={payload:{content_type:'blog',content_id:id,nickname:name,body:text,request_id:C.uuid(),deletion_token:C.token(),...(replyTarget?{reply_to_id:commentId(replyTarget)}:{})}};
        write(pendingKey,record);
      }catch(_){message.textContent=words.storage;return;}
      freeze();busy=true;send.disabled=true;message.textContent=words.loading;
      try{
        const result=await request('POST','',record.payload);const c=result.comment;
        if(!c||!c.id)throw Error('response');
        write(key('token','blog',commentId(c)),{token:record.payload.deletion_token});record.completed=true;record.commentId=commentId(c);write(pendingKey,record);
        if(c.parent_id)expanded.add(String(c.parent_id));
        if(replyTarget)expanded.add(String(replyTarget.parent_id||commentId(replyTarget)));
        showBackup();message.textContent='';await load();
      }catch(error){
        message.textContent=error.status?words.error:words.uncertain;
        if(error.status&&error.status<500&&![408,429].includes(error.status)){forget(pendingKey);record=null;freeze();}
      }finally{busy=false;send.disabled=!!record?.completed;}
    });
    async function load(throwError=false){
      const current=++version;status.textContent=words.loading;
      try{
        const data=await request('GET','?type=blog&id='+encodeURIComponent(id));
        if(!Array.isArray(data.comments)||data.content_type!=='blog'||data.content_id!==id)throw Error('response');
        if(current!==version)return;
        all=data.comments.flatMap(c=>{const {replies,...root}=c;return [root,...(Array.isArray(replies)?replies:[])];});
        s.comments=all.filter(C.visible);total.textContent=String(Number.isSafeInteger(data.count)&&data.count>=0?data.count:s.comments.length);render();status.textContent=all.length?'':t.empty;
      }catch(error){status.replaceChildren(document.createTextNode(words.error+' '),button(words.retry,()=>load()));if(throwError)throw error;}
    }
    function renderItem(c,isReply){
      const item=el('article',isReply?'blog-comment blog-reply':'blog-comment');
      if(!C.visible(c)){
        const placeholder=el('p','blog-deleted',(isReply?t.deletedReply:t.deletedRoot));placeholder.prepend(el('span','', '⊘ '));item.append(placeholder);return item;
      }
      const content=el('div','blog-comment-content'),meta=el('div','comment-meta');
      const time=el('time','comment-time',relativeDate(c.created_at));time.title=date(c.created_at);time.setAttribute('aria-label',time.title);
      meta.append(el('strong','comment-nickname',c.nickname),time);
      if(c.edit_count>0){const edited=el('span','comment-edited',words.edited);edited.title=date(c.updated_at);meta.append(edited);}
      content.append(meta);
      if(isReply&&c.reply_to_id){const target=all.find(x=>commentId(x)===String(c.reply_to_id));if(target&&C.visible(target))content.append(el('p','blog-reply-label',t.replyTo+target.nickname));}
      content.append(el('p','comment-body',c.body));const controls=el('div','blog-comment-controls');
      controls.append(button(t.reply,()=>setReply(c),'blog-text-button'));
      if(read(key('token','blog',commentId(c)))?.token){
        const menu=el('details','blog-comment-menu');const summary=el('summary','','···');summary.setAttribute('aria-label',words.menu);menu.append(summary);
        menu.append(button(words.edit,()=>window.SiteComments.manage(s,summary,c,'PATCH'),'blog-text-button'),button(words.remove,()=>window.SiteComments.manage(s,summary,c,'DELETE'),'blog-text-button'));controls.append(menu);
      }
      content.append(controls);item.append(avatar(c.nickname),content);return item;
    }
    function render(){
      threads.replaceChildren();const roots=all.filter(c=>!c.parent_id);
      // Retain server root order (most discussed, then newest). Never sort it here.
      for(const root of roots){
        const replies=all.filter(c=>String(c.parent_id)===commentId(root));
        if(!C.visible(root)&&!replies.some(C.visible))continue;
        const thread=el('div','blog-thread');thread.append(renderItem(root,false));
        const list=el('div','blog-replies');const open=expanded.has(commentId(root));
        (open?replies:replies.slice(0,3)).forEach(c=>list.append(renderItem(c,true)));thread.append(list);
        if(replies.length>3)thread.append(button(open?t.collapse:t.all(replies.filter(C.visible).length),()=>{open?expanded.delete(commentId(root)):expanded.add(commentId(root));render();},'blog-text-button blog-expand'));
        threads.append(thread);
      }
    }
    const recovery=el('details','blog-recovery');recovery.append(el('summary','',t.recover));const recoveryForm=el('div');
    const recoveryId=field(recoveryForm,t.id),credential=field(recoveryForm,words.token);recoveryId.maxLength=100;credential.maxLength=64;
    const recoveryStatus=el('p','comments-status');recoveryStatus.setAttribute('role','status');recoveryForm.append(button(t.use,()=>{
      const c=all.find(x=>commentId(x)===recoveryId.value.trim()&&C.visible(x));
      if(!c){recoveryStatus.textContent=t.notFound;return;}
      if(!/^[0-9a-f]{64}$/i.test(credential.value.trim())){recoveryStatus.textContent=words.invalidToken;return;}
      try{write(key('token','blog',commentId(c)),{token:credential.value.trim()});credential.value='';recoveryStatus.textContent=t.restored;render();}catch(_){recoveryStatus.textContent=words.storage;}
    }),recoveryStatus);recovery.append(recoveryForm);container.append(recovery);load();return s;
  }
  window.BlogComments={mount};
})();
