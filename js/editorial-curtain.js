/* Progressive enhancement for the existing multi-document site. No fetched HTML
   replacement: the browser loads the destination and captures both documents. */
(() => {
  'use strict';
  const key = 'lx_editorial_navigation';
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches: true};
  const supported = 'onpageswap' in window && 'onpagereveal' in window && 'navigation' in window &&
    CSS.supports('selector(:active-view-transition-type(editorial))');
  let pending = null;
  let busy = false;
  let timeout;
  const read = name => { try { return sessionStorage.getItem(name); } catch { return null; } };
  const write = (name, value) => { try { sessionStorage.setItem(name, value); return true; } catch { return false; } };
  const forget = () => { try { sessionStorage.removeItem(key); } catch { /* Private storage. */ } };
  function page(url) {
    if (url.origin !== location.origin || url.search || url.hash) return null;
    const match = url.pathname.match(/^(.*\/)(index(?:-mobile)?\.html|blog\.html|moments\.html)?$/);
    if (!match) return null;
    return {base: match[1], title: !match[2] || match[2].startsWith('index') ? 'PROFILE.' : match[2] === 'blog.html' ? 'BLOG.' : 'MOMENTS.'};
  }
  function clean() {
    document.querySelector('.editorial-curtain')?.remove();
    busy = false;
    pending = null;
    clearTimeout(timeout);
  }
  function curtain(title, transition) {
    const element = document.createElement('div');
    element.className = 'editorial-curtain';
    element.setAttribute('aria-hidden', 'true');
    const text = document.createElement('strong');
    text.textContent = title;
    element.append(text);
    document.body.append(element);
    transition.types.add('editorial');
    // Keep the named element alive until the browser releases its snapshot.
    // Removing it at `ready` can cancel the generated pseudo-element animation.
    transition.finished.finally(clean).catch(() => {});
  }
  document.addEventListener('DOMContentLoaded', () => {
    // Match the site's existing mobile entrypoints without an intermediate redirect.
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      document.querySelectorAll('.site-nav a, a.brand').forEach(link => {
        const url = new URL(link.href);
        if (url.origin === location.origin && /\/index\.html$/.test(url.pathname)) {
          url.pathname = url.pathname.replace(/index\.html$/, 'index-mobile.html');
          link.href = url.href;
        }
      });
    }
  });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    const target = page(url), current = page(new URL(location.href));
    if (!target || !current || target.base !== current.base || target.title === current.title) return;
    if (busy) { event.preventDefault(); return; }
    if (!supported || motion.matches) return;
    if (current.title === 'PROFILE.') write('lx_profile_scroll:' + current.base, String(scrollY));
    pending = {url: url.href, title: target.title, from: navigation.currentEntry.key, time: Date.now()};
    // Without storage the destination cannot coordinate; use ordinary navigation.
    if (!write(key, JSON.stringify(pending))) { pending = null; return; }
    busy = true;
    timeout = setTimeout(() => { forget(); clean(); }, 120000);
    // Keep the anchor's native navigation, error handling, SEO and history.
  });
  window.addEventListener('pageswap', event => {
    if (!event.viewTransition || !pending || motion.matches || event.activation?.navigationType !== 'push' || event.activation.entry.url !== pending.url) return;
    curtain(pending.title, event.viewTransition);
  });
  window.addEventListener('pagereveal', event => {
    let intent;
    try { intent = JSON.parse(read(key)); } catch { /* Invalid/stale intent. */ }
    forget();
    if (!event.viewTransition || motion.matches || !intent || intent.url !== location.href || Date.now() - intent.time > 120000 || navigation.activation?.navigationType !== 'push' || navigation.activation.from?.key !== intent.from) { clean(); return; }
    const target = page(new URL(location.href));
    if (!target || target.title !== intent.title) { clean(); return; }
    if (target.title === 'PROFILE.') {
      const position = Number(read('lx_profile_scroll:' + target.base));
      if (Number.isFinite(position) && position > 0) window.scrollTo({top: position, behavior: 'instant'});
    }
    busy = true;
    curtain(target.title, event.viewTransition);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) { forget(); clean(); } });
  window.navigation?.addEventListener('navigateerror', () => { forget(); clean(); });
  window.navigation?.addEventListener('navigate', event => {
    const intent = pending;
    event.signal.addEventListener('abort', () => {
      if (intent && pending === intent) { forget(); clean(); }
    }, {once: true});
  });
})();
