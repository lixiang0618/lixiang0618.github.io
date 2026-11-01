const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const fixture=fs.readFileSync('tests/fixtures/markdown-gfm.md','utf8');

function setup(language='en') {
  const prefix=language==='zh'?'zh/':'';
  const dom=new JSDOM(`<!doctype html><html lang="${language}"><body><article id="content"></article><span id="year"></span></body></html>`,
    {url:`https://preview.example/${prefix}blog-post.html?p=fixture`,runScripts:'outside-only'});
  const w=dom.window;
  for(const file of ['js/blog.js','js/vendor/marked.js','js/vendor/katex/katex.min.js','js/blog-markdown.js','js/blog-reading.js'])w.eval(fs.readFileSync(file,'utf8'));
  const content=w.document.getElementById('content');
  const render=source=>{content.innerHTML=w.BlogMarkdown.render(source,new URL('https://preview.example/blogs/fixture.md'));return content;};
  return{w,content,render,close:()=>w.close()};
}

for(const language of ['en','zh']) {
  test(`${language}: GFM table semantics, alignment, inline markup and a keyboard-scrollable container`,()=>{
    const p=setup(language);try{
      const {body}=p.w.BlogMarkdown.parseDocument(fixture),root=p.render(body);
      assert.equal(root.querySelectorAll('table').length,1);
      assert.equal(root.querySelectorAll('thead th').length,6);
      assert.equal(root.querySelectorAll('tbody td').length,6);
      assert.equal(root.querySelector('thead th').textContent,'海量物品');
      assert.equal(root.querySelectorAll('thead th')[1].getAttribute('align'),'right');
      assert.equal(root.querySelectorAll('thead th')[2].getAttribute('align'),'center');
      const scroll=root.querySelector('.markdown-table-scroll');
      assert.equal(scroll.tabIndex,0);assert.equal(scroll.getAttribute('role'),'region');
      assert(scroll.getAttribute('aria-label').includes(language==='zh'?'表格':'table'));
      assert.equal(root.querySelector('strong').textContent,'bold');
      assert.equal(root.querySelector('em').textContent,'emphasis');
      assert.equal(root.querySelector('del').textContent,'deleted text');
      assert.equal(root.querySelector('p code').textContent,'inline <code>');
      assert(root.querySelector('p br'));
    }finally{p.close();}
  });

  test(`${language}: tasks are read-only checkboxes; paragraphs, nested and ordered lists remain distinct`,()=>{
    const p=setup(language);try{
      const root=p.render(p.w.BlogMarkdown.parseDocument(fixture).body);
      const tasks=[...root.querySelectorAll('input[type="checkbox"]')];
      assert.equal(tasks.length,3);assert.deepEqual(tasks.map(input=>input.checked),[true,false,true]);
      assert(tasks.every(input=>input.disabled));
      assert.equal(root.querySelectorAll('.task-list-item').length,3);
      assert(root.querySelector('.task-list-item ul .task-list-item'));
      assert(root.querySelector('ol[start="3"] > li > ul'));
      assert.equal(root.querySelector('ol[start="3"]').children.length,2);
      assert(root.querySelector('ol > li > p'));
      assert.equal(root.querySelectorAll('hr').length,1);
      const experiment=root.querySelector('hr').nextElementSibling;
      assert.equal(experiment.tagName,'UL');assert.equal(experiment.querySelector(':scope > li > ul > li').textContent,'分层实验');
      assert.equal(experiment.nextElementSibling.textContent,'After the list.');
      assert.equal(root.lastElementChild.textContent,'Final paragraph.');
      assert.equal(root.querySelectorAll('blockquote > p').length,2);
      assert(root.querySelector('blockquote ul'));
    }finally{p.close();}
  });

  test(`${language}: headings 1–6 feed stable TOC anchors and code cannot create headings or tables`,()=>{
    const p=setup(language);try{
      const root=p.render(p.w.BlogMarkdown.parseDocument(fixture).body);
      const headings=p.w.BlogReading.headings(root,'Markdown regression fixture');
      assert.equal(headings.length,9);
      assert.deepEqual([...new Set(Array.from(headings,h=>h.tagName))],['H2','H3','H4','H5','H6']);
      assert(!Array.from(headings,h=>h.textContent).some(text=>text.includes('This is code')));
      const ids=Array.from(headings,h=>h.id);assert.equal(new Set(ids).size,ids.length);
      assert.deepEqual(Array.from(p.w.BlogReading.headings(root,'Markdown regression fixture'),h=>h.id),ids);
      const code=root.querySelector('code.language-c\\+\\+');
      assert(code.textContent.includes('<script>not executable</script>'));
      assert(code.textContent.includes('// | not | a table |'));
      assert.equal(root.querySelectorAll('pre code').length,2);
    }finally{p.close();}
  });
}

test('BOM/CRLF front matter is removed before parsing; paragraph and code whitespace is preserved',()=>{
  const p=setup();try{
    const doc=p.w.BlogMarkdown.parseDocument('\uFEFF---\r\ntitle: "A: title"\r\npdf: \'Python.pdf\'\r\ncategories:\r\n  - notes\r\n---\r\n\r\nFirst.\r\n\r\nSecond.\r\n');
    assert.equal(doc.frontMatter.title,'A: title');assert.equal(doc.frontMatter.pdf,'Python.pdf');
    assert.deepEqual(Array.from(doc.frontMatter.categories),['notes']);
    assert.equal(p.render(doc.body).querySelectorAll('p').length,2);
    const code=p.render('```text\n  leading indentation\n\ntrailing spaces  \n```').querySelector('code');
    assert.equal(code.textContent,'  leading indentation\n\ntrailing spaces  \n');
    const plain='---\n\nA paragraph.\n\n---\n';assert.equal(p.w.BlogMarkdown.parseDocument(plain).body,plain);
    const literal=p.render('Before.\n\n--- A/B测试\n--- 分层实验');
    assert.equal(literal.querySelectorAll('hr').length,0);assert(literal.textContent.includes('--- A/B测试'));
  }finally{p.close();}
});

test('relative media and links resolve from blogs/ in either language; external URLs and fragments remain valid',()=>{
  const bodies=[];
  for(const language of ['en','zh']) {
    const p=setup(language);try{
      const root=p.render(p.w.BlogMarkdown.parseDocument(fixture).body);
      assert.equal(root.querySelector('img').src,'https://preview.example/blogs/Hot100_files/image_1.png');
      assert.equal(root.querySelector('img').title,'Image title');
      assert.equal(root.querySelector('a').href,'https://preview.example/blogs/Python.pdf');
      assert.equal(root.querySelector('a').title,'PDF title');
      bodies.push(root.textContent);
      p.render('![remote](https://example.com/image.png)\n\n[fragment](#section-topic)');
      assert.equal(p.content.querySelector('img').src,'https://example.com/image.png');
      assert.equal(p.content.querySelector('a').getAttribute('href'),'#section-topic');
    }finally{p.close();}
  }
  assert.equal(bodies[0],bodies[1]);
});

test('GFM keeps the DOM sanitizer: no active HTML, unsafe protocols, arbitrary styles or editable inputs',()=>{
  const p=setup();try{
    const root=p.render('[bad](javascript:alert%281%29)\n\n![bad](javascript:bad)\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n<input type="text" autofocus><input type="checkbox" onclick="alert(1)">\n\n<iframe src="https://example.com"></iframe>\n\n<table style="position:fixed"><tr><td align="right" onclick="alert(1)">safe</td></tr></table>');
    assert(!root.querySelector('script,iframe,style,form,input[type="text"],[onclick],[onerror],[style],[autofocus]'));
    assert([...root.querySelectorAll('a[href],img[src]')].every(el=>!el.getAttribute(el.tagName==='A'?'href':'src').startsWith('javascript:')));
    assert(root.querySelector('input[type="checkbox"]').disabled);
    assert.equal(root.querySelector('td').getAttribute('align'),'right');
  }finally{p.close();}
});

test('all six existing article bodies retain every parsed heading, code block and local image',()=>{
  const p=setup();try{
    for(const file of fs.readdirSync('blogs').filter(file=>file.endsWith('.md'))) {
      const {body}=p.w.BlogMarkdown.parseDocument(fs.readFileSync('blogs/'+file,'utf8'));
      const root=p.render(body),tokens=p.w.marked.lexer(body,{gfm:true}),code=[],images=[],headings=[];
      p.w.marked.walkTokens(tokens,token=>{
        if(token.type==='code')code.push(token.text?token.text.replace(/\n$/,'')+'\n':'');
        if(token.type==='image')images.push(new URL(token.href,'https://preview.example/blogs/'+file).href);
        if(token.type==='heading')headings.push(token.depth);
      });
      assert.deepEqual([...root.querySelectorAll('pre code')].map(el=>el.textContent),code,file+' code');
      assert.deepEqual([...root.querySelectorAll('img')].map(el=>el.src),images,file+' images');
      assert.deepEqual([...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(el=>Number(el.tagName[1])),headings,file+' headings');
      assert(!root.querySelector('p > ul,p > ol,p > table,p > pre'),file+' valid block structure');
    }
  }finally{p.close();}
});

for(const language of ['en','zh'])test(`${language}: math delimiters, commands, lists and tables use KaTeX`,()=>{
  const p=setup(language);try{
    const root=p.render(fs.readFileSync('tests/fixtures/markdown-math.md','utf8'));
    assert.equal(root.querySelectorAll('.katex').length,10);
    assert.equal(root.querySelectorAll('.katex-error').length,0);
    assert.equal(root.querySelectorAll('.blog-math-display').length,4);
    assert.equal(root.querySelectorAll('li .katex').length,2);
    assert.equal(root.querySelectorAll('td .katex').length,2);
    assert(root.querySelector('.mfrac'));assert(root.querySelector('.msupsub'));
    assert.equal(root.querySelectorAll('math annotation').length,10);
    assert([...root.querySelectorAll('.blog-math-display')].every(el=>el.tabIndex===0));
    assert(!root.textContent.includes('blog-math-'));
    const headings=p.w.BlogReading.headings(root,'Fixture');assert.equal(headings.length,2);
  }finally{p.close();}
});

test('code, escaped dollars, currency and unclosed delimiters stay literal; unsafe TeX stays inert',()=>{
  const p=setup();try{
    const root=p.render(String.raw`Code \`$x$\` and escaped \$y\$; costs $5 and $10. Unclosed $z.

\`\`\`tex
$$\frac{1}{2}$$
\`\`\`

$\href{javascript:alert(1)}{bad}$ $\htmlClass{evil}{x}$ $\notACommand{x}$`.replaceAll('\\`','`'));
    assert.equal(root.querySelector('p code').textContent,'$x$');
    assert.equal(root.querySelector('pre code').textContent,'$$\\frac{1}{2}$$\n');
    assert(root.textContent.includes('$5 and $10'));assert(root.textContent.includes('$y$'));
    assert(!root.querySelector('a[href^="javascript:"],.evil,script,[onclick]'));
    assert(p.render('$\\frac{$').querySelector('.katex-error'));
    assert.equal(p.render('$x$').querySelectorAll('.katex').length,1);
  }finally{p.close();}
});
