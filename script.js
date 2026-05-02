(function() {
  const backToTop = document.getElementById('backToTop');
  const yearEl = document.getElementById('year');
  const resourceBase = window.location.pathname.includes('/zh/') ? '../Resources/' : 'Resources/';

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (y > 240) {
      backToTop && backToTop.classList.add('show');
    } else {
      backToTop && backToTop.classList.remove('show');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Auto-load tiled media by prefix: Resources/<prefix>-1.*, <prefix>-2.* ...
  // Supported extensions
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  function imageExists(url) {
    return new Promise(function(resolve) {
      const img = new Image();
      img.onload = function() { resolve(true); };
      img.onerror = function() { resolve(false); };
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    });
  }

  async function loadGallery(el, prefix) {
    const fragment = document.createDocumentFragment();
    let index = 1;
    let foundAny = false;
    // Iterate 1..n until a gap of consecutive misses (e.g., 2) occurs
    let misses = 0;
    while (misses < 2 && index < 100) {
      let hit = false;
      for (const ext of exts) {
        const url = resourceBase + prefix + '-' + index + ext;
        /* eslint-disable no-await-in-loop */
        if (await imageExists(url)) {
          const img = new Image();
          img.src = url;
          img.alt = prefix + ' ' + index;
          fragment.appendChild(img);
          hit = true;
          foundAny = true;
          break;
        }
      }
      if (!hit) {
        misses += 1;
      } else {
        misses = 0;
      }
      index += 1;
    }
    if (foundAny) {
      el.appendChild(fragment);
    }
  }

  function initGalleries() {
    const galleries = document.querySelectorAll('[data-gallery]');
    galleries.forEach(function(el) {
      const prefix = el.getAttribute('data-gallery');
      if (!prefix) return;
      loadGallery(el, prefix);
    });
  }

  // Auto-load skill icons from Resources/skills/<key>.(svg|png|jpg|webp|gif)
  function initSkillIcons() {
    const items = document.querySelectorAll('[data-skill]');
    items.forEach(function(li) {
      const key = li.getAttribute('data-skill');
      if (!key) return;
      const base = resourceBase + 'skills/' + key;
      const exts2 = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
      (async function tryExt() {
        for (const ext of exts2) {
          const url = base + ext;
          if (await imageExists(url)) {
            const img = new Image();
            img.src = url;
            img.alt = key;
            img.className = 'skill-icon';
            li.prepend(img);
            break;
          }
        }
      })();
    });
  }

  function initSocialIcons() {
    const links = document.querySelectorAll('[data-social]');
    links.forEach(function(a) {
      const key = a.getAttribute('data-social');
      if (!key) return;
      const base = resourceBase + 'skills/' + key; // reuse skills folder for icons
      const socialExts = ['.jpg', '.jpeg', '.png', '.svg']; // include svg for official icons
      (async function tryExt() {
        for (const ext of socialExts) {
          const url = base + ext;
          if (await imageExists(url)) {
            const img = new Image();
            img.src = url;
            img.alt = key;
            img.className = 'contact-icon';
            a.prepend(img);
            break;
          }
        }
      })();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initGalleries();
      initSkillIcons();
      initSocialIcons();
    });
  } else {
    initGalleries();
    initSkillIcons();
    initSocialIcons();
  }
})();



// 肖像
const portrait = document.getElementById("portrait-img");

// 两张头像路径（可自行替换）
const portraits = [
  resourceBase + "portrait-1.jpg",
  resourceBase + "portrait-2.jpg",
  resourceBase + "portrait-3.jpg"
];

let current = 0;

portrait.addEventListener("click", () => {
  current = (current + 1) % portraits.length;
  portrait.src = portraits[current];
});


// 语言
document.querySelectorAll('.section-skills .lang-item').forEach(item => {
  const percent = item.getAttribute('data-percent');
  const color = item.getAttribute('data-color');
  const circle = item.querySelector('circle:last-child');
  circle.style.setProperty('--percent', percent);
  circle.style.setProperty('--circle-color', color);
});