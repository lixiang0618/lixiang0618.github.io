const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

for(const language of ['', 'zh/']) test(`${language || 'en/'}Profile initializes real media, portrait cycling and language indicators`,async()=>{
  const dom=new JSDOM(fs.readFileSync(language+'index.html','utf8'),{url:'https://example.com/'+language+'index.html',runScripts:'outside-only'});
  try {
    await new Promise(resolve=>dom.window.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    const {document}=dom.window;
    dom.window.eval(fs.readFileSync('script.js','utf8'));
    const expected=['research-gnn-2.png','research-sna-2.png','research-asrs-1.png','internship-sinolight-1.png','project-igo-1.png'];
    const images=[...document.querySelectorAll('[data-gallery] img')];
    assert.deepEqual(images.map(img=>new URL(img.src).pathname),expected.map(file=>'/Resources/'+file));
    assert.equal(document.querySelectorAll('[data-gallery]').length,images.length);
    for(const file of expected) assert(fs.existsSync('Resources/'+file));
    const portrait=document.getElementById('portrait-img');
    for(const number of [2,3,1]) {portrait.click();assert.equal(new URL(portrait.src).pathname,`/Resources/portrait-${number}.jpg`);}
    assert.equal(document.getElementById('year').textContent,String(new Date().getFullYear()));
    for(const item of document.querySelectorAll('.section-skills .lang-item'))
      assert.equal(item.querySelector('circle:last-child').style.getPropertyValue('--percent'),item.dataset.percent);
  } finally {dom.window.close();}
});
