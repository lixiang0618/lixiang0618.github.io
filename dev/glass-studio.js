/* Explicit local-dev or Vercel Preview build only. No URL parameter enablement. */
(function(){
  'use strict';
  const entry=document.currentScript;
  const local=entry?.dataset.glassStudio==='local' && ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  const allowedPreview=entry?.dataset.glassStudio==='vercel-preview' && location.hostname.endsWith('.vercel.app');
  if(!local && !allowedPreview)return;
  const M=window.GlassStudioModel,A=window.MomentsAppearance;if(!M||!A)return;
  const KEY='lx_glass_studio_v1',body=document.body;
  const review=window.GlassStudioReview?M.validate(window.GlassStudioReview):null;
  let config=review?M.validate(review):M.preset('suggested'),comparing=false,open=false,pending=false,profileLabel=review?'你的已确认配置':'建议版本';
  const inputs=new Map();
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function button(text,fn){const n=el('button','',text);n.type='button';n.addEventListener('click',fn);return n;}
  const panel=el('aside','glass-studio');panel.id='glass-studio';panel.setAttribute('aria-label','Glass Studio 开发调参面板');panel.hidden=true;
  const launcher=button('调参',()=>toggle(!open));launcher.className='glass-studio-launch';launcher.setAttribute('aria-controls',panel.id);launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-label','展开 Glass Studio 开发调参面板');
  const header=document.querySelector('.site-header');header.append(launcher);header.insertAdjacentElement('afterend',panel);body.classList.add('glass-studio-available');
  const top=el('div','studio-toolbar');top.append(el('h2','','Glass Studio · 调参预览'));
  const current=el('p','studio-current','建议预览 · 尚非最终设计');top.append(current);
  const actions=el('div','studio-actions');
  function preview(){return comparing?M.preset('original'):config;}
  function scope(){return window.matchMedia('(max-width:48rem)').matches?'mobile':'desktop';}
  function updateValues(){
    const active=preview()[scope()];
    for(const f of M.fields){const {range,number}=inputs.get(f.id);range.value=active[f.id];number.value=active[f.id];range.disabled=comparing;number.disabled=comparing;}
    panel.dataset.scope=scope();
  }
  function apply(){
    pending=false;A.apply(M.variables(preview(),scope()));updateValues();
    current.textContent=(comparing?'正在对比原始版（调整值已保留）':profileLabel+'（当前浏览器预览）')+' · '+(scope()==='mobile'?'手机参数':'桌面参数');
    compare.textContent=comparing?'返回当前调整':'对比原始版本';
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(apply);}}
  function selectPreset(name){comparing=false;profileLabel=name==='original'?'原始版本':'建议版本';config=M.preset(name);apply();notice.textContent=name==='original'?'已恢复 ff0ee16 原始参数与响应式布局。':'已切换建议预览：只调整布局和阅读比例，材质沿用原值。';}
  actions.append(button('恢复原始版本',()=>selectPreset('original')),button('建议版本',()=>selectPreset('suggested')));
  if(review)actions.append(button('你的已确认配置',()=>{config=M.validate(review);comparing=false;profileLabel='你的已确认配置';apply();notice.textContent='桌面精确保留你给的值；手机保留原始参数，仅将朋友圈正文增大到 17px。';}));
  const compare=button('对比原始版本',()=>{comparing=!comparing;apply();});actions.append(compare);
  function saved(){try{return M.validate(JSON.parse(localStorage.getItem(KEY)));}catch(_){return null;}}
  const restore=button('恢复上次保存',()=>{const value=saved();if(!value){notice.textContent='没有可恢复的完整设置。';return;}config=value;profileLabel='上次保存';comparing=false;apply();notice.textContent='已恢复本浏览器保存的配置。';});restore.disabled=!saved();
  actions.append(restore,button('保存到本地',()=>{try{const value=preview(),text=JSON.stringify(value);localStorage.setItem(KEY,text);if(localStorage.getItem(KEY)!==text)throw Error('storage');restore.disabled=false;notice.textContent='已保存当前完整预览（桌面＋手机），不会影响其他访客或生产默认值。';}catch(_){notice.textContent='保存失败：本地存储不可用。你仍可复制或导出配置。';}}));
  actions.append(button('收起面板',()=>toggle(false)));top.append(actions);
  const notice=el('p','studio-notice');notice.setAttribute('role','status');top.append(notice);panel.append(top);
  const intro=el('p','studio-help','参数直接作用于真实页面。可恢复原始版、建议版或你的已确认配置。缩小窗口可调手机参数；关闭面板可查看完整宽度。');panel.append(intro);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||window.matchMedia('(prefers-reduced-transparency: reduce)').matches)panel.append(el('p','studio-help','系统已请求减少动态或透明度，相关效果会优先遵从系统偏好。'));
  for(const group of M.groups){
    const section=el('details','studio-group');section.open=group==='卡片材质'||group==='布局与阅读尺寸';section.append(el('summary','',group));
    for(const f of M.fields.filter(f=>f.group===group)){
      const row=el('div','studio-field'),label=el('label','',f.label),range=el('input'),number=el('input');
      range.type='range';range.id='studio-'+f.id;range.min=f.min;range.max=f.max;range.step=f.step;range.dataset.field=f.id;label.htmlFor=range.id;
      number.type='number';number.min=f.min;number.max=f.max;number.step=f.step;number.setAttribute('aria-label',f.label+' 数值');number.dataset.number=f.id;
      const controls=el('div','studio-field-controls');controls.append(range,number,el('span','studio-unit',f.unit||'比例'));row.append(label,controls);section.append(row);inputs.set(f.id,{range,number});
      function change(source){const n=Number(source.value);if(source.value===''||!Number.isFinite(n))return;
        config[scope()][f.id]=Math.max(f.min,Math.min(f.max,n));
        if(['feedMax','leftSize','rightSize','columnGap','layoutPadding'].includes(f.id))config.legacyLayout=false;
        if(f.id==='cardPadding'){const padding=config[scope()][f.id];config[scope()].commentsInset=padding;config[scope()].mediaSpace=Math.round(padding*.8);config[scope()].actionSpace=Math.round(padding*.7);config[scope()].commentsSpace=Math.round(padding*.8);}
        profileLabel='自定义调整';comparing=false;schedule();
      }
      range.addEventListener('input',()=>change(range));number.addEventListener('input',()=>change(number));number.addEventListener('change',updateValues);
    }
    panel.append(section);
  }
  const exports=el('section','studio-export');exports.append(el('h3','','保存与导出'));
  const output=el('textarea');output.rows=8;output.readOnly=true;output.hidden=true;output.setAttribute('aria-label','完整配置导出内容');
  function exportText(kind){const value=M.validate(preview());return kind==='css'?M.css(value):JSON.stringify(value,null,2);}
  async function copy(){output.value=exportText('json');output.hidden=false;try{await navigator.clipboard.writeText(output.value);notice.textContent='已复制完整 JSON 配置（桌面＋手机）。';}catch(_){output.focus();output.select();notice.textContent='无法自动复制，请在导出框中手动复制。';}}
  function download(kind){const text=exportText(kind);output.value=text;output.hidden=false;const blob=new Blob([text],{type:kind==='css'?'text/css':'application/json'}),url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download='moments-glass-config.'+kind;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notice.textContent='已导出 '+kind.toUpperCase()+'；这只是你的配置文件，没有修改生产默认值。';}
  exports.append(button('复制完整配置',copy),button('导出 JSON',()=>download('json')),button('导出 CSS',()=>download('css')),output);panel.append(exports);
  const importer=el('details','studio-import');importer.append(el('summary','','导入完整 JSON 配置（可选）'));const input=el('textarea');input.rows=6;input.setAttribute('aria-label','导入 JSON 配置');importer.append(input,button('应用导入',()=>{try{const value=M.validate(JSON.parse(input.value));config=value;profileLabel='导入配置';comparing=false;apply();notice.textContent='已应用导入配置，仅影响当前浏览器预览。';}catch(error){notice.textContent='导入失败：'+error.message;}}));panel.append(importer);
  function updateTop(){body.style.setProperty('--glass-studio-top',header.getBoundingClientRect().height+'px');}
  function toggle(value){open=value;panel.hidden=!value;body.classList.toggle('glass-studio-open',value);launcher.setAttribute('aria-expanded',String(value));updateTop();A.refresh();document.dispatchEvent(new CustomEvent('moments:appearance-change',{detail:{keys:[]}}));if(value&&innerWidth<960)panel.scrollIntoView({block:'start',behavior:'auto'});}
  window.addEventListener('resize',()=>{apply();updateTop();},{passive:true});if(window.ResizeObserver)new ResizeObserver(updateTop).observe(header);
  apply();
  // Deliberately start collapsed; normal pages never load this file or read the key.
})();
