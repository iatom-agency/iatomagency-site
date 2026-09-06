// Menu mobile (burger) — IATom Agency
(function () {
  var burger = document.querySelector('.nav-burger');
  var nav = document.querySelector('.site-nav');
  var backdrop = document.querySelector('.nav-backdrop');
  if (!burger || !nav) return;

  function closeNav() {
    nav.classList.remove('site-nav--open');
    burger.classList.remove('nav-burger--open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  function toggleNav() {
    var open = nav.classList.toggle('site-nav--open');
    burger.classList.toggle('nav-burger--open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('nav-open', open);
  }

  burger.addEventListener('click', toggleNav);
  if (backdrop) backdrop.addEventListener('click', closeNav);
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  // Si la fenêtre repasse en largeur desktop, on s'assure que le menu
  // mobile n'est pas resté ouvert par inadvertance.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeNav();
  });
})();
