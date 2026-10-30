/* Runs before Blog styles to avoid a theme flash; never affects other pages. */
(function () {
  try { document.documentElement.dataset.blogTheme=localStorage.getItem('lx_blog_theme')==='dark'?'dark':'light'; }
  catch (_) { document.documentElement.dataset.blogTheme='light'; }
})();
