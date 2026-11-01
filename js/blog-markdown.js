/* Shared article pipeline. Marked 18.1.2 supplies CommonMark/GFM parsing;
   BlogUI's DOM allowlist remains the security boundary before insertion. */
(function () {
  'use strict';
  const zh=document.documentElement.lang.startsWith('zh');
  const parser=new window.marked.Marked({gfm:true,breaks:false,pedantic:false,async:false});
  const normalize=text=>String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const unquote=value=>value.replace(/^(["'])([\s\S]*)\1$/,'$2');

  function parseDocument(text) {
    const source=normalize(text);
    const match=source.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
    const frontMatter=Object.create(null);
    if(!match||!/^\w+:/m.test(match[1]))return{frontMatter,body:source};
    let currentKey;
    for(const line of match[1].split('\n')) {
      const field=line.match(/^(\w+):\s*(.*)$/);
      if(field){currentKey=field[1];frontMatter[currentKey]=field[2]?unquote(field[2]):[];}
      else if(currentKey&&Array.isArray(frontMatter[currentKey])) {
        const item=line.match(/^\s+-\s+(.+)$/);
        if(item)frontMatter[currentKey].push(unquote(item[1]));
      }
    }
    return{frontMatter,body:source.slice(match[0].length)};
  }

  function render(body,sourceURL) {
    const template=document.createElement('template');
    template.innerHTML=window.BlogUI.sanitizeMarkdown(parser.parse(normalize(body)));
    // Markdown-relative assets resolve from the source file, in both languages.
    // In-document fragments continue to target the current HTML document.
    const base=new URL(sourceURL||(zh?'../blogs/':'./blogs/'),location.href);
    for(const item of template.content.querySelectorAll('img[src],a[href]')) {
      const attr=item.tagName==='IMG'?'src':'href',value=item.getAttribute(attr);
      if(attr==='href'&&value.startsWith('#'))continue;
      try {
        const url=new URL(value,base);
        if(!['http:','https:','mailto:'].includes(url.protocol))throw Error('URL');
        item.setAttribute(attr,url.href);
      } catch (_) {item.removeAttribute(attr);}
    }
    for(const input of template.content.querySelectorAll('input[type="checkbox"]')) {
      const li=input.closest('li');
      if(li){li.classList.add('task-list-item');li.parentElement.classList.add('contains-task-list');}
    }
    // A scrollable container preserves native table semantics on narrow screens.
    for(const table of template.content.querySelectorAll('table')) {
      const wrapper=document.createElement('div');wrapper.className='markdown-table-scroll';
      wrapper.tabIndex=0;wrapper.setAttribute('role','region');
      wrapper.setAttribute('aria-label',zh?'可横向滚动的表格':'Horizontally scrollable table');
      table.replaceWith(wrapper);wrapper.append(table);
    }
    return template.innerHTML;
  }
  window.BlogMarkdown={parseDocument,render};
})();
