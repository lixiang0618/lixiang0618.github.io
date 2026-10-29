/* Shared by both language pages. UUID identifies a browser, not a login. */
(function () {
  'use strict';
  const VISITOR_KEY = 'lx_visitor_id';
  const API = 'https://api.lxiang.cc/api/likes';
  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const text = zh ? {
    like: '点赞', unlike: '取消点赞', loading: '正在加载点赞', retry: '点赞暂不可用，点击重试',
    storage: '无法保存访客标识，点赞功能已禁用。请允许本网站使用本地存储。'
  } : {
    like: 'Like', unlike: 'Unlike', loading: 'Loading likes', retry: 'Likes unavailable. Click to retry',
    storage: 'Likes disabled: allow local storage to save your visitor identity.'
  };
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const controls = new Map();
  let visitorId;
  function identity() {
    // Re-read before every request so another tab's newly saved UUID is reused.
    let id = localStorage.getItem(VISITOR_KEY);
    if (!uuidPattern.test(id || '')) {
      if (crypto.randomUUID) id = crypto.randomUUID();
      else {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        id = hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
      }
      localStorage.setItem(VISITOR_KEY, id);
      if (localStorage.getItem(VISITOR_KEY) !== id) throw new Error('Storage unavailable');
    }
    return id;
  }
  try { visitorId = identity(); } catch (_) { /* Content stays usable without storage. */ }

  function render(state) {
    const { button, count, message } = state;
    button.disabled = state.pending || !visitorId;
    button.setAttribute('aria-busy', String(state.pending));
    button.setAttribute('aria-pressed', String(state.liked));
    button.classList.toggle('is-liked', state.liked);
    count.textContent = state.known ? String(state.likes) : '—';
    const label = !visitorId ? text.storage : state.error ? text.retry :
      !state.known ? text.loading : (state.liked ? text.unlike : text.like) + ' · ' + state.likes;
    button.setAttribute('aria-label', label);
    button.title = label;
    message.textContent = !visitorId ? text.storage : state.error ? text.retry : '';
  }

  async function request(state, method) {
    if (state.pending || !visitorId) return;
    state.pending = true;
    state.error = false;
    render(state);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const id = identity();
      // If identity changed in another tab, obtain its status before any mutation.
      if (id !== visitorId) { visitorId = id; method = 'GET'; }
      const response = await fetch(API + '?type=moment&id=' + encodeURIComponent(state.id), {
        method, mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { 'X-Visitor-ID': id }, signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.success !== true || data.content_type !== 'moment' || data.content_id !== state.id ||
          !Number.isSafeInteger(data.likes) || data.likes < 0 || typeof data.liked !== 'boolean') {
        throw new Error('Invalid likes response');
      }
      state.likes = data.likes;
      state.liked = data.liked;
      state.known = true;
    } catch (_) {
      // A failed write may have reached the server. The next click only refreshes.
      state.known = false;
      state.liked = false;
      state.error = true;
    } finally {
      clearTimeout(timer);
      state.pending = false;
      render(state);
    }
  }

  function mount(container, moments) {
    const cards = container.querySelectorAll('.moment-card');
    moments.forEach((moment, index) => {
      const card = cards[index];
      if (!card || card.querySelector('.moment-actions') || !/^moment-[a-zA-Z0-9-]+$/.test(moment.id || '')) return;
      const actions = document.createElement('div');
      actions.className = 'moment-actions';
      actions.innerHTML = '<button type="button" class="moment-like" aria-pressed="false" disabled>' +
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>' +
        '<span class="moment-like-count">—</span></button><span class="moment-like-message" role="status" aria-live="polite"></span>';
      card.appendChild(actions);
      const state = { id: moment.id, button: actions.querySelector('button'),
        count: actions.querySelector('.moment-like-count'), message: actions.querySelector('.moment-like-message'),
        likes: 0, liked: false, known: false, pending: false, error: false };
      controls.set(state.id, state);
      state.button.addEventListener('click', () => request(state, state.known ? (state.liked ? 'DELETE' : 'PUT') : 'GET'));
      render(state);
      request(state, 'GET');
    });
  }
  function refresh() {
    controls.forEach(state => {
      if (state.button.isConnected) request(state, 'GET');
      else controls.delete(state.id);
    });
  }
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  window.addEventListener('storage', event => { if (event.key === VISITOR_KEY || event.key === null) refresh(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  window.MomentsLikes = { mount };
})();
