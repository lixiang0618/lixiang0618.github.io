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

  // Explicit existing files: preserve the current gallery selection and order.
  // Missing sequence numbers are intentional; do not probe other extensions.
  const galleries = {
    'research-gnn': ['research-gnn-2.png'],
    'research-sna': ['research-sna-2.png'],
    'research-asrs': ['research-asrs-1.png'],
    'internship-sinolight': ['internship-sinolight-1.png'],
    'project-igo': ['project-igo-1.png']
  };

  function initGalleries() {
    document.querySelectorAll('[data-gallery]').forEach(function(el) {
      const prefix = el.getAttribute('data-gallery');
      const fragment = document.createDocumentFragment();
      (galleries[prefix] || []).forEach(function(file) {
        const img = new Image();
        img.src = resourceBase + file;
        img.alt = prefix + ' ' + file.match(/-(\d+)\./)[1];
        fragment.appendChild(img);
      });
      el.appendChild(fragment);
    });
  }

  // Optional icons must declare their real Resources-relative filename using
  // data-icon, rather than guessing extensions. No current page declares icons.
  function initIcons(selector, className) {
    document.querySelectorAll(selector).forEach(function(el) {
      const file = el.getAttribute('data-icon');
      if (!file) return;
      const img = new Image();
      img.src = resourceBase + file;
      img.alt = el.getAttribute('data-skill') || el.getAttribute('data-social');
      img.className = className;
      el.prepend(img);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initGalleries();
      initIcons('[data-skill]', 'skill-icon');
      initIcons('[data-social]', 'contact-icon');
    });
  } else {
    initGalleries();
    initIcons('[data-skill]', 'skill-icon');
    initIcons('[data-social]', 'contact-icon');
  }

  // 肖像
  const portrait = document.getElementById("portrait-img");

  // 头像路径（与资源目录中的三个原始文件保持一致）
  const portraits = [
    resourceBase + "portrait-1.jpg",
    resourceBase + "portrait-2.jpg",
    resourceBase + "portrait-3.jpg"
  ];

  let current = 0;

  portrait?.addEventListener("click", () => {
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
})();
