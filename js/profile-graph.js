/* Progressive homepage layout. The existing HTML remains the content source. */
(() => {
  'use strict';
  const html = document.documentElement;
  const hero = document.querySelector('.hero');
  if (!hero || !document.querySelector('.profile-home')) return;
  const zh = html.lang.startsWith('zh');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const text = zh ? {close: '关闭', previous: '← 上一项', next: '下一项 →', replay: '重播开场 ⟳', skip: '跳过开场', portrait: '切换照片'} :
    {close: 'Close', previous: '← Previous', next: 'Next →', replay: 'Replay intro ⟳', skip: 'Skip intro', portrait: 'Change portrait'};
  const resource = file => '/Resources/' + file;
  const artKeys = {research: ['cchan', 'sna', 'or'], internship: ['wellife', 'graphrag'], projects: ['learngo', 'recommender']};
  const media = {
    cchan: ['research-gnn-2.png'], sna: ['research-sna-2.png'], or: ['research-asrs-1.png'],
    wellife: ['internship-nus-1.png', 'internship-nus-2.jpg', 'internship-nus-3.jpg'],
    graphrag: ['internship-sinolight-1.png'], learngo: ['project-learnGo-1.gif', 'project-learnGo-2.gif', 'project-learnGo-3.gif'],
    recommender: ['project-igo-1.png']
  };
  const arts = window.ProfileProjectArt?.[zh ? 'zh' : 'en'] || {};
  const records = [];
  const element = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const thumbnail = src => {
    const name = new URL(src, location.href).pathname.split('/').pop();
    return /^(portrait-[123]|sports-\d+)\.jpg$/.test(name) ? '/assets/homepage/' + name : src;
  };
  function recordButton(record, mode) {
    const index = records.push(record) - 1;
    const button = element('button', 'graph-record');
    button.type = 'button';
    button.dataset.profileRecord = String(index);
    if (mode === 'project') {
      const art = element('div', 'graph-record-art');
      const graphic = element('div', 'gallery-art');
      graphic.dataset.galleryArt = record.key;
      graphic.setAttribute('aria-hidden', 'true');
      graphic.innerHTML = arts[record.key] || '';
      // The source SVG is reused, but every instance owns its fragment IDs.
      const ids = [...graphic.querySelectorAll('[id]')].map(n => n.id);
      for (const id of ids) {
        for (const node of graphic.querySelectorAll('*')) {
          for (const attribute of [...node.attributes]) {
            if (attribute.name === 'id' && attribute.value === id) node.id = 'profile-' + index + '-' + id;
            else if (attribute.value.includes('#' + id)) node.setAttribute(attribute.name, attribute.value.replaceAll('#' + id, '#profile-' + index + '-' + id));
          }
        }
      }
      art.append(graphic, element('span', 'graph-record-arrow', '↗'));
      if (record.images.length && !['cchan', 'sna'].includes(record.key)) {
        const preview = element('img', 'graph-hover-image');
        preview.alt = '';
        const load = () => { if (!preview.hasAttribute('src')) preview.src = thumbnail(record.images[0].src); };
        button.addEventListener('pointerenter', load, {once: true});
        button.addEventListener('focus', load, {once: true});
        art.append(preview);
      }
      button.append(art);
    }
    button.append(element('span', 'graph-record-title', record.title));
    if (record.meta) button.append(element('span', 'graph-record-meta', record.meta));
    button.addEventListener('click', () => openDetails(records, index, button));
    return button;
  }
  // Leave unrelated mobile-only sections, such as Skills, intact.
  for (const id of ['education', 'research', 'internship', 'projects']) {
    const section = document.getElementById(id);
    if (!section) continue;
    const heading = section.querySelector('h2');
    const rows = [...section.querySelectorAll('h3')].map(h3 => {
      let row = h3.parentElement;
      while (row.parentElement && row.parentElement !== section) row = row.parentElement;
      return {row, h3};
    });
    const grid = element('div', 'graph-record-grid' + (id === 'education' ? ' graph-education' : rows.length === 2 ? ' graph-two' : ''));
    rows.forEach(({row, h3}, i) => {
      const body = row.querySelector('.row-text')?.cloneNode(true) || element('div');
      body.querySelector('h3')?.remove();
      body.querySelector('.meta-inline')?.remove();
      const key = artKeys[id]?.[i];
      const images = [...row.querySelectorAll('img')].map(image => ({src: image.getAttribute('src'), alt: image.alt || h3.textContent.trim()}));
      for (const file of media[key] || []) if (!images.some(image => new URL(image.src, location.href).pathname.endsWith('/' + file))) images.push({src: resource(file), alt: h3.textContent.trim()});
      const record = {section: heading.textContent.trim(), title: h3.textContent.trim(), meta: row.querySelector('.meta-inline')?.textContent.trim() || '', body: body.innerHTML, images, key};
      if (id === 'education') {
        const card = element('article', 'graph-education-item');
        card.append(element('span', 'graph-education-date', record.meta));
        const school = element('h3', '', record.title);
        card.append(school);
        const major = body.querySelector('li')?.textContent.trim();
        if (major) card.append(element('p', 'graph-education-major', major));
        grid.append(card);
      } else grid.append(recordButton(record, 'project'));
    });
    section.replaceChildren(heading, grid);
  }
  const awardSection = document.getElementById('awards');
  if (awardSection) {
    const heading = awardSection.querySelector('h2');
    const grid = element('div', 'graph-awards');
    awardSection.querySelectorAll('.timeline-item').forEach(item => {
      const card = element('article', 'graph-award');
      card.append(element('span', 'graph-award-date', item.querySelector('.timeline-date').textContent.trim()), element('h3', '', item.querySelector('.timeline-content').textContent.trim()));
      grid.append(card);
    });
    awardSection.replaceChildren(heading, grid);
  }
  const wall = document.querySelector('.photo-wall');
  if (wall) {
    const photos = [...wall.querySelectorAll('img')].map(image => ({section: document.querySelector('#sports h2').textContent.trim(), title: image.alt, meta: '', body: '', images: [{src: image.getAttribute('src'), alt: image.alt}]}));
    const buttons = [...wall.querySelectorAll('img')].map((image, i) => {
      const button = element('button', 'graph-photo');
      button.type = 'button';
      button.setAttribute('aria-label', image.alt);
      image.src = thumbnail(image.getAttribute('src'));
      image.loading = 'lazy';
      button.append(image);
      button.addEventListener('click', () => openDetails(photos, i, button));
      return button;
    });
    wall.replaceChildren(...buttons);
  }
  // Use the original social logo markup and links; only layout changes.
  const name = document.querySelector('.hero-text h1');
  const names = name.textContent.split('/').map(value => value.trim());
  name.replaceChildren(element('span', 'graph-name-zh', names[0]), element('span', 'graph-name-separator', ' / '), element('span', 'graph-name-en', 'Li Xiang'));
  const heroInner = hero.querySelector('.hero-inner');
  name.classList.add('graph-identity');
  const heroText = hero.querySelector('.hero-text');
  heroText.prepend(name);
  const statement = element('div', 'graph-statement');
  statement.lang = 'en';
  statement.append(element('span', 'graph-statement-first', 'The world happens '), element('em', 'graph-statement-between', 'in between.'));
  const translation = element('p', 'graph-statement-zh', '我从万物的联系中，看见世界。');
  translation.lang = 'zh-CN';
  name.after(statement, translation);
  const email = hero.querySelector('.profile-contact');
  const locationWrap = hero.querySelector('.profile-location-wrap');
  if (email) heroText.append(email);
  const portraitColumn = element('div', 'graph-portrait-column');
  const portraitMedia = hero.querySelector('.hero-media');
  heroInner.append(portraitColumn);
  portraitColumn.append(portraitMedia);
  if (locationWrap) portraitColumn.append(locationWrap);
  const contacts = element('div', 'graph-contacts');
  contacts.append(heroText.querySelector('.social-links'));
  if (email) contacts.append(email);
  heroText.append(contacts);
  const mobileHero = matchMedia('(max-width: 700px)');
  function arrangeHero() {
    if (mobileHero.matches) {
      heroText.prepend(name);
      if (locationWrap) portraitColumn.append(locationWrap);
      heroInner.append(contacts);
    } else {
      heroText.prepend(name);
      if (locationWrap) portraitColumn.append(locationWrap);
      heroText.append(contacts);
    }
  }
  mobileHero.addEventListener('change', arrangeHero);
  arrangeHero();
  const interests = heroText.querySelector('.chips');
  if (interests) interests.remove();
  const ambient = element('canvas', 'graph-ambient');
  ambient.setAttribute('aria-hidden', 'true');
  hero.prepend(ambient);
  const ambientContext = ambient.getContext('2d');
  let ambientWidth = 0, ambientHeight = 0, ambientFrame = 0, ambientTime = 0, ambientLast = 0;
  let ambientVisible = true;
  const pointer = {x: 0, y: 0, strength: 0, target: 0};
  const particles = Array.from({length: 180}, (_, i) => ({x: ((i * .61803398875) % 1), y: (Math.sin(i * 127.1 + 31.7) * 43758.5453 + 43759) % 1, phase: i * 2.39, depth: .35 + (i % 7) / 10}));
  function resizeAmbient() {
    const rect = hero.getBoundingClientRect();
    ambientWidth = rect.width; ambientHeight = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    ambient.width = Math.round(rect.width * ratio); ambient.height = Math.round(rect.height * ratio);
    ambientContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function paintAmbient(timestamp) {
    ambientFrame = 0;
    const dt = Math.min((timestamp - (ambientLast || timestamp)) / 1000, .04);
    ambientLast = timestamp;
    if (!motion.matches) ambientTime += dt;
    const ctx = ambientContext, w = ambientWidth, h = ambientHeight, t = ambientTime;
    ctx.clearRect(0, 0, w, h);
    const bounds = hero.getBoundingClientRect();
    const phrase = statement.getBoundingClientRect();
    const narrow = w < 701;
    const textRight = Math.max(...[...statement.children].map(line => {
      const range = document.createRange(); range.selectNodeContents(line);
      return range.getBoundingClientRect().right;
    }));
    const photoLeft = portraitMedia.getBoundingClientRect().left;
    const gap = Math.max(0, photoLeft - textRight);
    const locationBounds = locationWrap?.getBoundingClientRect();
    const textBounds = heroText.getBoundingClientRect();
    const mobileRadius = Math.min(54, textBounds.width * .29);
    const center = narrow ? {
      x: textBounds.left - bounds.left + textBounds.width / 2,
      y: Math.max(translation.getBoundingClientRect().bottom + mobileRadius + 14, (locationBounds?.top || phrase.bottom) + (locationBounds?.height || 80) / 2) - bounds.top
    } : {x: (textRight + photoLeft) / 2 - bounds.left, y: phrase.top - bounds.top + phrase.height * .58};
    pointer.strength += (pointer.target - pointer.strength) * .045;
    const reach = Math.max(0, 1 - Math.hypot(pointer.x - center.x, pointer.y - center.y) / 240) * pointer.strength;
    const beat = Math.pow((1 + Math.cos(t * 1.05)) / 2, 5);
    const offset = {x: (pointer.x - center.x) * reach * .22, y: (pointer.y - center.y) * reach * .22};
    const constellation = Array.from({length: 13}, (_,i) => {
      const outer = i < 8;
      const angle = i * Math.PI * 2 / (outer ? 8 : 5) + t * (outer ? .18 : -.29);
      const radius = (narrow ? mobileRadius : Math.min(145, Math.max(55, gap * .43))) * (outer ? 1 : .43) * (.9 + .1 * Math.sin(t * .65 + i*1.7));
      return {x:center.x+Math.cos(angle)*radius+offset.x*(.5+i/24),y:center.y+Math.sin(angle)*radius*.95+Math.sin(t*.8+i)*9+offset.y*(.5+i/24)};
    });
    // Clip the atmosphere around actual content, including the path between points.
    const quietAreas = [name, statement, translation, contacts, portraitMedia, locationWrap].filter(Boolean).map(node => node.getBoundingClientRect());
    ctx.save();
    ctx.beginPath(); ctx.rect(0,0,w,h);
    for (const area of quietAreas) ctx.rect(area.left-bounds.left-12,area.top-bounds.top-9,area.width+24,area.height+18);
    ctx.clip('evenodd');
    const field = particles.slice(0, narrow ? 65 : 180).map(p => {
      let x = ((p.x*w + t*(3+p.depth*5)) % (w+70))-35 + Math.sin(t*.24+p.phase)*24;
      let y = ((p.y*h + t*(1+p.depth*2)) % (h+60))-30 + Math.cos(t*.19+p.phase)*28;
      const distance = Math.hypot(x-pointer.x,y-pointer.y);
      const influence = Math.max(0,1-distance/160)*pointer.strength;
      x += (x-pointer.x)*influence*.22; y += (y-pointer.y)*influence*.22;
      return {x,y,depth:p.depth,alpha:.22+p.depth*.26+influence*.16};
    });
    for (let i=0;i<field.length;i++) {
      const p=field[i];
      for (let j=i+1;j<field.length;j++) {
        const q=field[j], distance=Math.hypot(p.x-q.x,p.y-q.y);
        const limit=narrow?72:105;
        if (distance>limit) continue;
        ctx.strokeStyle=`rgba(152,109,70,${(1-distance/limit)*.23})`; ctx.lineWidth=.65;
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
      }
      ctx.fillStyle=`rgba(153,100,57,${p.alpha})`;
      ctx.beginPath();ctx.arc(p.x,p.y,.7+p.depth*1.15,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    const hue = 24 + Math.sin(t * .53) * 12;
    constellation.forEach((p,i) => {
      const neighbours = i < 8 ? [(i+1)%8,8+i%5] : [8+(i-7)%5];
      if (i < 4 && Math.sin(t*.4+i) > .2) neighbours.push(i+4);
      neighbours.forEach(j => {
        const q=constellation[j];
        ctx.strokeStyle=`hsla(${i%3===0?165:24+i*2},65%,43%,${j>=8?.52:.34})`; ctx.lineWidth=j>=8?1.1:.85;
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+q.x)/2+Math.sin(t+i)*8,(p.y+q.y)/2+Math.cos(t+j)*8,q.x,q.y);ctx.stroke();
        const u=(t*.3+i*.19)%1;
        ctx.fillStyle=`hsla(${i%3===0?165:28},85%,48%,${Math.sin(u*Math.PI)*.95})`;
        ctx.beginPath();ctx.arc(p.x+(q.x-p.x)*u,p.y+(q.y-p.y)*u,1.6,0,Math.PI*2);ctx.fill();
      });
      const color = i%4===0 ? 165 : i%3===0 ? 43 : hue;
      const glow = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,18);
      glow.addColorStop(0, `hsla(${color},85%,50%,.4)`); glow.addColorStop(1,`hsla(${color},85%,50%,0)`);
      ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(p.x,p.y,18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = `hsl(${color},80%,${i%4===0?38:49}%)`;
      ctx.beginPath(); ctx.arc(p.x,p.y,(i>=8?3.5:2.8) + beat*.7,0,Math.PI*2); ctx.fill();
    });
    if (ambientVisible && !document.hidden && !motion.matches) ambientFrame = requestAnimationFrame(paintAmbient);
  }
  function resumeAmbient() {
    cancelAnimationFrame(ambientFrame); ambientLast = 0;
    if (ambientVisible && !document.hidden) ambientFrame = requestAnimationFrame(paintAmbient);
  }
  hero.addEventListener('pointermove', event => { if (event.pointerType === 'touch') return; const rect = hero.getBoundingClientRect(); pointer.x=event.clientX-rect.left; pointer.y=event.clientY-rect.top; pointer.target=1; });
  hero.addEventListener('pointerleave', () => { pointer.target=0; });
  new ResizeObserver(() => { resizeAmbient(); resumeAmbient(); }).observe(hero);
  new IntersectionObserver(entries => { ambientVisible=entries[0].isIntersecting; resumeAmbient(); }).observe(hero);
  document.addEventListener('visibilitychange', resumeAmbient);
  motion.addEventListener('change', resumeAmbient);
  // Run the Lab illustrations only when visible; SNA cycles through its lenses.
  const illustrations = [...document.querySelectorAll('.graph-record-art .gallery-art')];
  const visibleArt = new Set();
  let lensTimer = 0, lensIndex = 0;
  const sna = illustrations.find(art => art.dataset.galleryArt === 'sna' && art.querySelector('.sna-lens'));
  const lenses = ['all', '1', '2', '3', '4', 'core', 'bridge'];
  function updateArt() {
    illustrations.forEach(art => { art.classList.add('is-enhanced'); art.classList.toggle('is-running', !motion.matches && !document.hidden && visibleArt.has(art)); });
    clearInterval(lensTimer);
    if (sna && !motion.matches && !document.hidden && visibleArt.has(sna)) lensTimer = setInterval(() => {
      lensIndex = (lensIndex + 1) % lenses.length;
      const value = lenses[lensIndex];
      sna.dataset.lens = value;
      const nodes = [...sna.querySelectorAll('.sna-gallery-node')];
      const matches = node => value === 'core' ? node?.dataset.core === 'true' : value === 'bridge' ? node?.dataset.bridge === 'true' : node?.dataset.community === value;
      sna.querySelectorAll('[data-gallery-edge]').forEach(edge => {
        const [a, b] = edge.dataset.galleryEdge.split('-').map(Number);
        edge.classList.toggle('is-lens-edge', value !== 'all' && (value === 'bridge' ? matches(nodes[a]) || matches(nodes[b]) : matches(nodes[a]) && matches(nodes[b])));
      });
    }, 1800);
  }
  const artObserver = new IntersectionObserver(entries => { entries.forEach(entry => entry.isIntersecting ? visibleArt.add(entry.target) : visibleArt.delete(entry.target)); updateArt(); }, {threshold: .15});
  illustrations.forEach(art => artObserver.observe(art));
  document.addEventListener('visibilitychange', updateArt);
  motion.addEventListener('change', updateArt);
  window.addEventListener('pagehide', () => clearInterval(lensTimer));
  window.addEventListener('pageshow', updateArt);
  const portrait = document.getElementById('portrait-img') || document.querySelector('.hero-img');
  if (portrait) {
    let selected = 0;
    portrait.srcset = '/assets/homepage/portrait-1.jpg';
    portrait.tabIndex = 0;
    portrait.setAttribute('role', 'button');
    portrait.setAttribute('aria-label', text.portrait);
    const cycle = () => {
      selected = (selected + 1) % 3;
      portrait.src = resource('portrait-' + (selected + 1) + '.jpg');
      portrait.srcset = '/assets/homepage/portrait-' + (selected + 1) + '.jpg';
    };
    portrait.addEventListener('click', event => { event.stopImmediatePropagation(); cycle(); }, true);
    portrait.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cycle(); } });
  }
  const dialog = element('dialog', 'graph-dialog');
  dialog.setAttribute('aria-labelledby', 'profile-detail-title');
  dialog.innerHTML = '<div class="graph-dialog-bar"><span class="graph-dialog-section"></span><button type="button" class="graph-dialog-close"></button></div><div class="graph-dialog-scroll"><h2 id="profile-detail-title"></h2><div class="graph-dialog-meta"></div><div class="graph-dialog-copy"></div><div class="graph-dialog-images"></div></div><div class="graph-dialog-controls"><button type="button" class="graph-dialog-prev"></button><span></span><button type="button" class="graph-dialog-next"></button></div>';
  document.body.append(dialog);
  const close = dialog.querySelector('.graph-dialog-close');
  const previous = dialog.querySelector('.graph-dialog-prev');
  const next = dialog.querySelector('.graph-dialog-next');
  close.textContent = text.close + ' ×';
  close.setAttribute('aria-label', text.close);
  previous.textContent = text.previous;
  next.textContent = text.next;
  let collection = [], current = 0, opener;
  function fillDetails() {
    const record = collection[current];
    dialog.querySelector('.graph-dialog-section').textContent = record.section;
    dialog.querySelector('h2').textContent = record.title;
    dialog.querySelector('.graph-dialog-meta').textContent = record.meta;
    dialog.querySelector('.graph-dialog-copy').innerHTML = record.body;
    dialog.querySelector('.graph-dialog-images').replaceChildren(...record.images.map(source => {
      const image = element('img');
      image.src = source.src;
      image.alt = source.alt;
      image.decoding = 'async';
      return image;
    }));
    dialog.querySelectorAll('a[target="_blank"]').forEach(a => a.rel = 'noopener');
    previous.disabled = current === 0;
    next.disabled = current === collection.length - 1;
    dialog.querySelector('.graph-dialog-controls > span').textContent = (current + 1) + ' / ' + collection.length;
    dialog.querySelector('.graph-dialog-scroll').scrollTop = 0;
  }
  function openDetails(list, index, button) {
    if (dialog.open) return;
    finishOpening();
    collection = list;
    current = index;
    opener = button;
    fillDetails();
    html.classList.add('graph-modal-open');
    dialog.showModal();
    close.focus();
  }
  let closing = false, closeTimer;
  function closeDetails() {
    if (!dialog.open || closing) return;
    if (motion.matches) { dialog.close(); return; }
    closing = true;
    dialog.classList.add('is-closing');
    closeTimer = setTimeout(() => dialog.close(), 420);
  }
  close.addEventListener('click', closeDetails);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDetails(); });
  dialog.addEventListener('animationend', event => { if (closing && event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { clearTimeout(closeTimer); closing = false; dialog.classList.remove('is-closing'); html.classList.remove('graph-modal-open'); opener?.focus({preventScroll: true}); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDetails();
  });
  previous.addEventListener('click', () => { if (current > 0) { current--; fillDetails(); } });
  next.addEventListener('click', () => { if (current < collection.length - 1) { current++; fillDetails(); } });
  // One finite intro. Never animate a returning history entry or a section link.
  const controls = element('div', 'graph-hero-controls');
  const replay = element('button', 'graph-replay', text.replay);
  const skip = element('button', 'graph-skip', text.skip);
  replay.type = skip.type = 'button';
  controls.append(replay);
  hero.append(controls);
  document.body.append(skip);
  html.classList.add('graph-ready');
  const canvas = element('canvas', 'graph-opening');
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  let width = 0, height = 0, targets = [], logoTargets = [], nameTargets = [], started = 0, frame = 0, active = false;
  const points = Array.from({length: matchMedia('(max-width: 700px)').matches ? 3800 : 6200}, (_, i) => ({angle: i * 2.39996323, u: ((i * 73) % 997) / 997, z: ((i * 43) % 983) / 983}));
  const ease = value => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };
  function measureOpening() {
    if (!active) return;
    width = innerWidth;
    height = innerHeight;
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const pen = mask.getContext('2d');
    pen.font = '500 ' + Math.floor(Math.min(width * .205, height * .34)) + 'px Georgia';
    pen.textAlign = 'center';
    pen.textBaseline = 'middle';
    pen.fillText('XIANG', width / 2, height * .45, width * .88);
    const pixels = pen.getImageData(0, 0, width, height).data;
    targets = [];
    for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) if (pixels[(y * width + x) * 4 + 3] > 100) targets.push({x, y});
    if (!targets.length) targets = [{x: width / 2, y: height / 2}];
    const sample = () => {
      const bytes = pen.getImageData(0, 0, width, height).data, result = [];
      for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) if (bytes[(y * width + x) * 4 + 3] > 90) result.push({x, y});
      return result;
    };
    pen.clearRect(0, 0, width, height);
    const logoImage = document.querySelector('.site-brand-logo'), logoBox = logoImage.getBoundingClientRect();
    if (logoImage.complete && logoImage.naturalWidth) pen.drawImage(logoImage, logoBox.left, logoBox.top, logoBox.width, logoBox.height);
    logoTargets = sample();
    if (!logoTargets.length) logoTargets = [{x: logoBox.left + logoBox.width / 2, y: logoBox.top + logoBox.height / 2}];
    pen.clearRect(0, 0, width, height);
    const englishName = document.querySelector('.graph-name-en'), box = englishName.getBoundingClientRect(), style = getComputedStyle(englishName);
    pen.font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    if ('letterSpacing' in pen) pen.letterSpacing = style.letterSpacing;
    pen.textAlign = 'left'; pen.textBaseline = 'alphabetic';
    const metrics = pen.measureText(englishName.textContent);
    const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const actualWidth = metrics.width;
    pen.fillText(englishName.textContent, box.left + (box.width - actualWidth) / 2, box.top + (box.height - actualHeight) / 2 + metrics.actualBoundingBoxAscent);
    nameTargets = sample();
    if (!nameTargets.length) nameTargets = [{x: box.left + box.width / 2, y: box.top + box.height / 2}];
  }
  function finishOpening() {
    active = false;
    cancelAnimationFrame(frame);
    canvas.remove();
    html.classList.remove('profile-entry-running');
    const siteHeader = document.querySelector('.site-header');
    siteHeader.style.removeProperty('opacity');
    document.querySelector('.hero-inner').style.removeProperty('opacity');
    siteHeader.inert = false;
    document.querySelector('.hero-inner').inert = false;
  }
  function paintOpening(now) {
    if (!active) return;
    const t = (now - started) / 1000;
    if (t >= 5.5) { finishOpening(); return; }
    const gather = ease((t - .6) / 1.5), dock = ease((t - 3.25) / 1.9), fade = ease((t - 4.85) / .6);
    document.querySelector('.site-header').style.opacity = String(ease((t - 4.8) / .6));
    document.querySelector('.hero-inner').style.opacity = String(ease((t - 4.8) / .6));
    canvas.style.backgroundColor = 'rgba(241,237,228,' + (1 - ease((t - 4.6) / .8)) + ')';
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < points.length; i++) {
      const p = points[i], target = targets[i % targets.length], angle = p.angle + t * .18 * (1 - gather), radius = (.15 + p.u * .95) * width;
      const x0 = width * .5 + Math.cos(angle) * radius, y0 = height * .45 + Math.sin(angle) * radius * .65;
      const x1 = target.x + (x0 - target.x) * (1 - gather), y1 = target.y + (y0 - target.y) * (1 - gather);
      const destinations = i % 5 < 2 ? logoTargets : nameTargets;
      const end = destinations[i % destinations.length], lag = (1 - dock) * dock;
      const x = x1 + (end.x - x1) * dock + Math.sin(p.angle) * lag * 35;
      const y = y1 + (end.y - y1) * dock - Math.sin(dock * Math.PI) * height * .16 * p.z + Math.cos(p.angle) * lag * 20;
      context.globalAlpha = (.65 + p.z * .35) * (1 - fade);
      context.fillStyle = i % 5 === 0 ? '#73533d' : i % 3 === 0 ? '#503c2f' : '#332922';
      const size = (.9 + p.z * 1.5) * (1 - dock * .5);
      context.fillRect(x, y, size, size);
    }
    context.globalAlpha = 1;
    frame = requestAnimationFrame(paintOpening);
  }
  function startOpening() {
    if (motion.matches || !context) return;
    finishOpening();
    window.scrollTo({top: 0, behavior: 'instant'});
    active = true;
    document.body.append(canvas);
    html.classList.add('profile-entry-running');
    document.querySelector('.site-header').inert = true;
    document.querySelector('.hero-inner').inert = true;
    measureOpening();
    started = performance.now();
    frame = requestAnimationFrame(paintOpening);
  }
  replay.addEventListener('click', startOpening);
  skip.addEventListener('click', finishOpening);
  window.addEventListener('resize', measureOpening, {passive: true});
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) finishOpening(); });
  motion.addEventListener('change', () => { if (motion.matches) finishOpening(); });
  window.addEventListener('pagehide', finishOpening);
  window.addEventListener('pageshow', event => { if (event.persisted) finishOpening(); });
  const historyVisit = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem('lx_profile_intro_seen') === '1';
    sessionStorage.setItem('lx_profile_intro_seen', '1');
  } catch { /* Navigation still works when storage is unavailable. */ }
  if (window.shouldPlayProfileIntro({referrer: document.referrer, seen: alreadySeen, hash: location.hash, history: historyVisit, scroll: scrollY})) startOpening();
  if (location.hash) window.addEventListener('load', () => requestAnimationFrame(() => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    document.getElementById(id)?.scrollIntoView({behavior: 'instant', block: 'start'});
  }), {once: true});
})();
