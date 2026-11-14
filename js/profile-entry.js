/* Resolve homepage language/device before styles or images are loaded. */
(() => {
  'use strict';
  window.shouldPlayProfileIntro = ({referrer = '', origin = location.origin, seen = false, hash = '', history = false, scroll = 0}) => {
    let internal = false;
    try { const from = referrer && new URL(referrer); internal = !!from && from.origin === origin && !/^\/(zh\/)?(index(?:-mobile)?\.html)?$/.test(from.pathname); } catch { /* Invalid referrer. */ }
    return !internal && !seen && !hash && !history && scroll < 50;
  };
  const url = new URL(location.href);
  const chinese = /^zh(?:-|$)/i.test(navigator.languages?.[0] || navigator.language || '');
  const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const explicit = url.searchParams.get('lang');
  const zh = explicit === 'zh' || (explicit !== 'en' && (url.pathname.startsWith('/zh/') || chinese));
  const device = url.searchParams.get('view') === 'mobile' || (mobile && url.searchParams.get('view') !== 'desktop');
  const path = (zh ? '/zh/' : '/') + (device ? 'index-mobile.html' : 'index.html');
  if (url.pathname !== path && !(url.pathname === (zh ? '/zh/' : '/') && !device)) {
    url.pathname = path;
    location.replace(url.href);
  }
  window.switchToDesktop = () => {
    const target = new URL(location.href);
    target.pathname = (document.documentElement.lang.startsWith('zh') ? '/zh/' : '/') + 'index.html';
    target.searchParams.set('view', 'desktop');
    if (!document.documentElement.lang.startsWith('zh')) target.searchParams.set('lang', 'en');
    location.assign(target.href);
  };
})();
