/* Shared article pipeline. Marked 18.1.2 supplies CommonMark/GFM parsing;
   BlogUI's DOM allowlist remains the security boundary before insertion. */
(function () {
  'use strict';
  const zh=document.documentElement.lang.startsWith('zh');
  const parser=new window.marked.Marked({gfm:true,breaks:false,pedantic:false,async:false});
  // Tokens protect TeX backslashes from Markdown escaping. Only generated
  // placeholders survive the unchanged HTML sanitizer; KaTeX runs afterwards.
  let formulas, mathPrefix;
  function mathToken(src,block) {
    const pairs=block?[['$$','$$'],['\\[','\\]']]:[['$$','$$'],['\\[','\\]'],['\\(','\\)'],['$','$']];
    for(const [open,close] of pairs) {
      if(!src.startsWith(open))continue;
      if(open==='$'&&(src[1]==='$'||/\s/.test(src[1]||'')))continue;
      let end=open.length;
      while((end=src.indexOf(close,end))!==-1) {
        let slashes=0;for(let i=end-1;i>=0&&src[i]==='\\';i--)slashes++;
        if(slashes%2){end+=close.length;continue;}
        const text=src.slice(open.length,end);
        if(!text.trim()||(open==='$'&&(/\s$/.test(text)||/\n/.test(text)||/\d/.test(src[end+1]||''))))return;
        const raw=src.slice(0,end+close.length);
        if(block&&!/^(?:[ \t]*(?:\n|$))/.test(src.slice(raw.length)))return;
        return{type:block?'blogMathBlock':'blogMathInline',raw,text,display:open!=='$'&&open!=='\\('};
      }
    }
  }
  function placeholder(token,block) {
    const key=mathPrefix+formulas.length;formulas.push({key,...token});
    return block?'<pre><code>'+key+'</code></pre>\n':'<code>'+key+'</code>';
  }
  parser.use({extensions:[{
    name:'blogMathBlock',level:'block',
    tokenizer(src){return mathToken(src,true);},
    renderer(token){return placeholder(token,true);}
  },{
    name:'blogMathInline',level:'inline',
    start(src){const at=src.search(/\$|\\[([]/);return at<0?undefined:at;},
    tokenizer(src){return mathToken(src,false);},
    renderer(token){return placeholder(token,false);}
  }]});
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
    formulas=[];mathPrefix='blog-math-'+crypto.randomUUID()+'-';
    const template=document.createElement('template');
    template.innerHTML=window.BlogUI.sanitizeMarkdown(parser.parse(normalize(body)));
    const generated=new Map(formulas.map(formula=>[formula.key,formula]));
    for(const code of template.content.querySelectorAll('code')) {
      const formula=generated.get(code.textContent);if(!formula)continue;
      const block=code.parentElement.tagName==='PRE';
      const math=document.createElement(block?'div':'span');
      math.className=formula.display?'blog-math-display':'blog-math-inline';
      if(formula.display){math.tabIndex=0;math.setAttribute('role','region');math.setAttribute('aria-label',zh?'数学公式，可横向滚动':'Mathematical formula, horizontally scrollable');}
      window.katex.render(formula.text,math,{displayMode:formula.display,throwOnError:false,trust:false,strict:'warn',maxExpand:1000});
      (block?code.parentElement:code).replaceWith(math);
    }
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
