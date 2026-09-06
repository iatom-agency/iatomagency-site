// Consentement cookies (Google Analytics) — IATom Agency
// Tant que le visiteur n'a pas cliqué "Accepter", aucun script Google
// Analytics n'est chargé et aucun cookie de mesure n'est déposé.
(function () {
  var GA_ID = 'G-16FWMHCT91';
  var STORAGE_KEY = 'iat-cookie-consent';

  function loadGA() {
    if (window.__iatGALoaded) return;
    window.__iatGALoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }
  function showBanner() {
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.hidden = false;
  }
  function hideBanner() {
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.hidden = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var consent = getConsent();
    if (consent === 'accepted') {
      loadGA();
    } else if (consent !== 'refused') {
      showBanner();
    }

    var acceptBtn = document.getElementById('cookie-accept');
    var refuseBtn = document.getElementById('cookie-refuse');
    var manageLink = document.getElementById('cookie-manage');

    if (acceptBtn) acceptBtn.addEventListener('click', function () {
      setConsent('accepted');
      loadGA();
      hideBanner();
    });
    if (refuseBtn) refuseBtn.addEventListener('click', function () {
      setConsent('refused');
      hideBanner();
    });
    if (manageLink) manageLink.addEventListener('click', function (e) {
      e.preventDefault();
      showBanner();
    });
  });
})();
