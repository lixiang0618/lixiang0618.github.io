/* Anonymous, token-authorized comments. No dependency on the likes visitor UUID. */
(function () {
  'use strict';
  const API = 'https://api.lxiang.cc/api/comments';
  const zh = document.documentElement.lang.startsWith('zh');
  const words = zh ? {
    comments:'评论', loading:'正在加载评论…', retry:'重试', error:'请求未完成，请重试。',
    add:'发表评论', edit:'编辑评论', remove:'删除评论', nickname:'昵称', body:'评论正文', token:'删除凭证',
    cancel:'取消', send:'发送', save:'保存修改', confirm:'确认删除', close:'关闭', done:'完成', copy:'复制凭证',
    copied:'已复制', success:'评论发表成功！请妥善保存以下删除凭证。', backup:'此凭证用于未来修改或删除评论。更换设备、清除浏览器数据或丢失凭证后，可能无法修改或删除。请自行备份，本地保存不能替代备份。',
    invalid:'昵称须为 1–30 个字符，正文须为 1–500 个字符。', invalidToken:'请输入 64 位十六进制删除凭证。',
    storage:'无法安全保存请求记录，请允许本地存储后再操作。', pending:'上次提交结果尚待确认。重试将使用相同内容和凭证，不会创建新的提交。',
    uncertain:'结果尚待确认，请使用原操作重试。', conflict:'评论可能已被其他操作修改。请关闭并重新打开编辑，检查最新内容后再保存。',
    hidden:'评论已不可见。', still:'评论仍然存在，删除未确认。请检查凭证后重试。', edited:'已编辑',
    deleteWarning:'确认删除这条评论？此操作无法撤销。', menu:'评论操作', copyFailed:'复制失败，请手动选择并复制凭证。'
  } : {
    comments:'Comments', loading:'Loading comments…', retry:'Retry', error:'Request could not be completed. Please retry.',
    add:'Post a comment', edit:'Edit comment', remove:'Delete comment', nickname:'Nickname', body:'Comment', token:'Deletion token',
    cancel:'Cancel', send:'Send', save:'Save changes', confirm:'Confirm deletion', close:'Close', done:'Done', copy:'Copy token',
    copied:'Copied', success:'Comment posted! Keep the deletion token below safe.', backup:'This token lets you edit or delete this comment. Changing devices, clearing site data or losing the token may prevent future changes. Back it up yourself; browser storage is only a convenience.',
    invalid:'Nickname must be 1–30 characters; comment must be 1–500 characters.', invalidToken:'Enter a 64-character hexadecimal deletion token.',
    storage:'Unable to safely save this request. Allow local storage before continuing.', pending:'A previous submission is awaiting confirmation. Retry uses the same content and token, without creating a new submission.',
    uncertain:'The result is uncertain. Retry the original operation.', conflict:'This comment may have changed. Close and reopen the editor to review the latest version before saving.',
    hidden:'Comment is no longer visible.', still:'The comment is still visible; deletion is unconfirmed. Check the token and retry.', edited:'Edited',
    deleteWarning:'Delete this comment? This cannot be undone.', menu:'Comment actions', copyFailed:'Copy failed. Select and copy the token manually.'
  };
  function el(tag, className, text) {
    const node = document.createElement(tag); if (className) node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  }
  function button(text, fn, className) {
    const b = el('button', className, text); b.type = 'button'; b.addEventListener('click', fn); return b;
  }
  const uuid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
    const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  };
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b=>b.toString(16).padStart(2,'0')).join('');
  const key = (kind, type, id) => 'lx_comments_'+kind+':'+type+':'+id;
  function read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }
  function write(k, value) {
    const json = JSON.stringify(value); localStorage.setItem(k,json);
    if(localStorage.getItem(k)!==json) throw Error('storage');
  }
  function forget(k) { try { localStorage.removeItem(k); } catch (_) {} }
  async function request(method, path, payload) {
    const controller = new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(API+path,{method,mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal,
        ...(payload ? {headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)} : {})});
      let data; try { data=await response.json(); } catch (_) { throw Error('response'); }
      if(!response.ok || data.success!==true) {
        const error=Error('request'); error.code=data.code || data.error?.code || data.error; error.status=response.status; throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }
  function commentId(c) { return String(c.id ?? c.comment_id ?? ''); }
  function visible(c) { return c.status!=='deleted' && !c.deleted_at; }
  function parsedDate(value) {
    if (!value) return null;
    // D1/SQLite timestamps are UTC, including on Safari.
    const normalized=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)?value.replace(' ','T')+'Z':value;
    const d=new Date(normalized); return isNaN(d) ? null : d;
  }
  function date(value) {
    const d=parsedDate(value); return d ? d.toLocaleString(zh?'zh-CN':'en-US') : '';
  }
  function relativeDate(value) {
    const d=parsedDate(value); if (!d) return '';
    const seconds=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));
    if (seconds<60) return zh?'刚刚':'now';
    if (seconds<3600) return Math.floor(seconds/60)+(zh?'分钟前':'m');
    if (seconds<86400) return Math.floor(seconds/3600)+(zh?'小时前':'h');
    if (seconds<7*86400) return Math.floor(seconds/86400)+(zh?'天前':'d');
    return d.toLocaleDateString(zh?'zh-CN':'en-US',{
      month:zh?'numeric':'short',day:'numeric',
      ...(d.getFullYear()!==new Date(Date.now()).getFullYear()?{year:'numeric'}:{})
    });
  }
  function avatar(nickname) {
    const name=String(nickname || '?').trim().normalize('NFC') || '?';
    const node=el('span','comment-avatar'); node.setAttribute('aria-hidden','true');
    const first=typeof Intl.Segmenter==='function'
      ? new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(name)[Symbol.iterator]().next().value.segment
      : Array.from(name)[0];
    node.textContent=first.toLocaleUpperCase();
    let hash=0; for (const ch of name) hash=(Math.imul(hash,31)+ch.codePointAt(0))|0;
    const hue=(hash>>>0)%360;
    node.style.backgroundColor='hsl('+hue+', 30%, 92%)';
    node.style.color='hsl('+hue+', 24%, 32%)';
    return node;
  }
  const dialog=el('dialog','comments-dialog'); dialog.setAttribute('aria-labelledby','comments-dialog-title');
  const panel=el('div','comments-dialog-panel'); dialog.append(panel); document.body.append(dialog);
  let busy=false, returnFocus, onClose;
  function close() {
    if(busy) return;
    dialog.close(); panel.replaceChildren(); if(onClose) onClose(); onClose=null;
    if(returnFocus?.isConnected) returnFocus.focus();
  }
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  function open(title, origin, callback) {
    if(dialog.open) { if(busy) return false; close(); }
    returnFocus=origin; onClose=callback; panel.replaceChildren();
    const heading=el('h2','',title); heading.id='comments-dialog-title'; panel.append(heading);
    const x=button('×',close,'comments-close'); x.setAttribute('aria-label',words.close); panel.append(x);
    dialog.showModal(); return true;
  }
  function field(label, value, multiline, max) {
    const wrap=el('label','comments-field'); wrap.append(el('span','',label));
    const input=el(multiline?'textarea':'input'); input.value=value || ''; if(max) input.maxLength=max;
    if(multiline) input.rows=5; else input.type='text';
    input.autocomplete='off'; wrap.append(input); panel.append(wrap); return input;
  }
  function status() { const p=el('p','comments-status');p.setAttribute('role','status');panel.append(p);return p; }
  function lock(value) {
    busy=value; dialog.setAttribute('aria-busy',String(value));
    panel.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=value);
  }
  function showSuccess(record, pendingKey, s, origin) {
    lock(false);
    open(words.success,origin,()=>{ s.load(); });
    panel.append(el('p','',words.backup));
    const backup=field(words.token,record.payload.deletion_token,false); backup.readOnly=true;
    const notice=status();
    panel.append(button(words.copy,async()=>{
      try { await navigator.clipboard.writeText(backup.value); notice.textContent=words.copied; }
      catch (_) { backup.focus();backup.select();notice.textContent=words.copyFailed; }
    }));
    panel.append(button(words.done,()=>{forget(pendingKey);close();})); backup.focus();
  }
  function compose(s, origin, c, mode='POST') {
    const pendingKey=key(mode,s.type,mode==='POST'?s.id:commentId(c));
    let record=read(pendingKey);
    if(mode==='POST' && record?.completed) { showSuccess(record,pendingKey,s,origin);return; }
    if(!open(mode==='POST'?words.add:mode==='PATCH'?words.edit:words.remove,origin)) return;
    const tokenKey=c?key('token',s.type,commentId(c)):null;
    let nickname,body,credential;
    if(mode!=='DELETE') {
      nickname=field(words.nickname,record?.payload.nickname ?? c?.nickname,false,60);
      body=field(words.body,record?.payload.body ?? c?.body,true,1000);
    } else panel.append(el('p','',words.deleteWarning));
    if(mode!=='POST') credential=field(words.token,record?.payload.deletion_token || read(tokenKey)?.token,false,64);
    if(record) {
      panel.append(el('p','',mode==='POST'?words.pending:words.uncertain));
      [nickname,body,credential].filter(Boolean).forEach(n=>n.readOnly=true);
    }
    const message=status();
    const submit=button(mode==='POST'?words.send:mode==='PATCH'?words.save:words.confirm,async()=>{
      if(busy) return;
      const name=nickname?.value.trim(), content=body?.value.trim();
      if(mode!=='DELETE' && (!name || [...name].length>30 || !content || [...content].length>500)) {message.textContent=words.invalid;return;}
      if(credential && !/^[0-9a-f]{64}$/i.test(credential.value.trim())) {message.textContent=words.invalidToken;return;}
      try {
        if(!record) record=read(pendingKey);
        if(!record) {
          const payload=mode==='POST'?{content_type:s.type,content_id:s.id,nickname:name,body:content,request_id:uuid(),deletion_token:token()}:
            {deletion_token:credential.value.trim(),operation_id:uuid(),...(mode==='PATCH'?{nickname:name,body:content,expected_edit_count:c.edit_count}: {})};
          if(mode==='PATCH' && !Number.isInteger(c.edit_count)) { message.textContent=words.conflict;return; }
          record={payload};
        }
        write(pendingKey,record); // Persist before any network side effect.
      } catch (_) {message.textContent=words.storage;return;}
      [nickname,body,credential].filter(Boolean).forEach(n=>n.readOnly=true);
      let preventRetry=false;
      lock(true);message.textContent=words.loading;
      try {
        const result=await request(mode,mode==='POST'?'':'/'+encodeURIComponent(commentId(c)),record.payload);
        if(mode==='POST') {
          const created=result.comment;
          if(!created || typeof created.id!=='string' || !created.id) throw Error('Missing comment ID');
          const id=created.id;
          // Keep the original pending record if either storage write fails.
          write(key('token',s.type,id),{token:record.payload.deletion_token});
          record.completed=true;record.commentId=id;write(pendingKey,record);
          showSuccess(record,pendingKey,s,origin);
        } else {
          if(mode==='DELETE') forget(tokenKey); else write(tokenKey,{token:record.payload.deletion_token});
          forget(pendingKey); lock(false);close(); await s.load();
        }
      } catch (error) {
        if(mode==='DELETE' && (!error.status || error.code==='COMMENT_NOT_FOUND')) {
          try {
            await s.load(true);
            if(!s.comments.some(item=>commentId(item)===commentId(c))) {
              forget(pendingKey);forget(tokenKey);
              const heading=el('h2','',words.hidden);heading.id='comments-dialog-title';
              const done=button(words.done,close);panel.replaceChildren(heading,done);done.focus();return;
            }
            message.textContent=words.still;
            if(error.code==='COMMENT_NOT_FOUND') {
              forget(pendingKey);record=null;credential.readOnly=false;
            }
          } catch (_) {message.textContent=words.uncertain;}
        } else if(mode==='PATCH' && (error.status===409 || /CONFLICT|EDIT_COUNT/.test(String(error.code)))) {
          forget(pendingKey);await s.load();message.textContent=words.conflict;preventRetry=true;
        } else {
          message.textContent=error.status?words.error:words.uncertain;
          // Definitive rejection permits correcting inputs; uncertain operations retain IDs.
          if(error.status && error.status<500 && error.status!==408 && error.status!==429) {
            forget(pendingKey);record=null;[nickname,body,credential].filter(Boolean).forEach(n=>n.readOnly=false);
          }
        }
      } finally { if(busy) lock(false); if(preventRetry) submit.disabled=true; }
    },'comments-primary');
    panel.append(button(words.cancel,close),submit); (nickname || credential).focus();
  }
  function actions(s,c,origin) {
    if(!open(words.menu,origin))return;
    panel.append(button(words.edit,()=>compose(s,origin,c,'PATCH')),button(words.remove,()=>compose(s,origin,c,'DELETE')));
  }
  const mountedCards=new WeakSet();
  function mount(card,{type,id,actions:actionsRow}={}) {
    if(!type || !id || mountedCards.has(card)) return;
    mountedCards.add(card);
    if(!actionsRow) { actionsRow=card.querySelector('.moment-actions'); if(!actionsRow){actionsRow=el('div','moment-actions');card.append(actionsRow);} }
    const section=el('section','comments-section');section.setAttribute('aria-label',words.comments);
    const notice=el('p','comments-status',words.loading);notice.setAttribute('role','status');
    const list=el('div','comments-list'); section.append(notice,list);card.append(section);
    const trigger=button('',()=>compose(s,trigger),'moment-like comment-trigger');
    trigger.setAttribute('aria-label',words.add);
    // Static SVG only; all server/user text is inserted using textContent.
    trigger.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 3V11.5a10 10 0 0 1 20 0Z"/></svg>';
    const count=el('span','','—');trigger.append(count);actionsRow.append(trigger);
    const s={type,id,comments:[],version:0,load:async(throwError=false)=>{
      const version=++s.version;
      if(!section.isConnected) card.append(section);
      notice.hidden=false;notice.textContent=words.loading;
      try {
        const data=await request('GET','?type='+encodeURIComponent(type)+'&id='+encodeURIComponent(id));
        if(!Array.isArray(data.comments) || data.content_type!==type || data.content_id!==id)throw Error('Invalid comments');
        if(version!==s.version)return;
        s.comments=data.comments.filter(visible);count.textContent=String(s.comments.length);list.replaceChildren();
        notice.textContent='';
        notice.hidden=true;
        if(s.comments.length) { if(!section.isConnected) card.append(section); }
        else section.remove();
        s.comments.forEach(c=>{
          const item=el('article','comment-item');item.tabIndex=0;
          const content=el('div','comment-content');
          const meta=el('div','comment-meta');
          const time=el('time','comment-time',relativeDate(c.created_at));
          const created=parsedDate(c.created_at);
          time.hidden=!created;
          if(created) { time.dateTime=created.toISOString();time.title=date(c.created_at);time.setAttribute('aria-label',date(c.created_at)); }
          meta.append(el('strong','comment-nickname',String(c.nickname || '')),time);
          if(c.edit_count>0) {
            const edited=el('span','comment-edited',words.edited);
            edited.title=date(c.updated_at);
            edited.setAttribute('aria-label',words.edited+(edited.title?' · '+edited.title:''));meta.append(edited);
          }
          content.append(meta,el('p','comment-body',String(c.body || '')));
          const menu=button('···',()=>actions(s,c,menu),'comment-menu-button');menu.setAttribute('aria-label',words.menu);
          item.append(avatar(c.nickname),content,menu);
          item.addEventListener('contextmenu',e=>{if(e.target.closest('a,input,textarea'))return;e.preventDefault();actions(s,c,menu);});
          let timer,start;
          item.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.target.closest('button'))return;start={x:e.clientX,y:e.clientY};timer=setTimeout(()=>actions(s,c,menu),600);});
          const stop=()=>clearTimeout(timer);
          item.addEventListener('pointermove',e=>{if(start && Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)stop();});
          ['pointerup','pointercancel','pointerleave'].forEach(event=>item.addEventListener(event,stop));
          list.append(item);
        });
      } catch(error) {
        if(version===s.version){notice.hidden=false;notice.replaceChildren(document.createTextNode(words.error+' '),button(words.retry,()=>s.load()));}
        if(throwError)throw error;
      }
    }};
    s.load();return s;
  }
  function mountMoments(container,moments) {
    const cards=container.querySelectorAll('.moment-card');
    moments.forEach((m,index)=>{const card=cards[index];if(!card||!m.id)return;
      let row=card.querySelector('.moment-actions');if(!row){row=el('div','moment-actions');card.append(row);}
      mount(card,{type:'moment',id:m.id,actions:row});
    });
  }
  window.SiteComments={mount,mountMoments};
})();
