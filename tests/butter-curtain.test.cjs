const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

for(const language of ['', 'zh/']) for(const file of ['index.html','index-mobile.html']) {
  test(`${language}${file}: synchronized profile content and original internship media`,()=>{
    const document=new JSDOM(fs.readFileSync(language+file,'utf8')).window.document;
    const chinese=!!language;
    assert.deepEqual([...document.querySelectorAll('.chips .chip')].map(x=>x.textContent),chinese
      ? ['图神经网络','社交网络分析','搜索、广告与推荐','排球（二传）']
      : ['Graph Neural Networks','Social Network Analysis','Search, Ads & Recommendation','Volleyball (Setter)']);
    const lists=[...document.querySelectorAll('#internship ul')];
    assert.equal(lists.length,2);
    for(const list of lists) assert.equal(list.children.length,3);
    assert.match(lists[0].textContent,/ResNet.*LightGBM/);
    assert.match(lists[0].textContent,/WebSocket/);
    assert.match(lists[1].textContent,/3,000/);
    assert.match(lists[1].textContent,/Gephi/);
    assert(!lists[0].textContent.includes('100%'));
    if(file==='index.html') {
      assert.equal(document.querySelectorAll('.nus-aiot img').length,3);
      assert(document.querySelector('[data-gallery="internship-sinolight"]'));
    }
  });
}
