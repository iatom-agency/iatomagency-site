// effects.js — améliorations UI "site moderne" (validé par Thomas le
// 24/09/2026). Fichier indépendant de nav.js (menu burger, inchangé) et
// de consent.js (bandeau cookies, inchangé). Suppression sans risque :
// retirer ce fichier + la balise <script> correspondante dans
// build_site.py (page_shell) + effects.css.
(function () {
  "use strict";

  var reduceMotion = !!(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // -----------------------------------------------------------------
  // 1) En-tête : masquage au scroll vers le bas, réapparition au scroll
  //    vers le haut. L'effet visuel n'existe qu'en dessous de 900px
  //    (cf. effects.css) : ce script peut tourner à toutes les largeurs
  //    sans rien casser au-dessus de ce seuil.
  // -----------------------------------------------------------------
  var header = document.querySelector(".site-header");
  if (header) {
    // position: fixed sur <=900px (cf. effects.css) sort l'en-tête du flux
    // normal : on compense en poussant <main> vers le bas d'exactement sa
    // hauteur réelle, recalculée au chargement et au redimensionnement
    // (la hauteur du logo/texte peut varier selon la largeur d'écran).
    function syncHeaderHeight() {
      document.documentElement.style.setProperty(
        "--iat-header-h",
        header.offsetHeight + "px"
      );
    }
    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);

    var lastY = window.scrollY;
    var headerTicking = false;

    function onHeaderScroll() {
      var y = window.scrollY;
      header.classList.toggle("site-header--scrolled", y > 4);
      if (y > lastY && y > header.offsetHeight) {
        header.classList.add("site-header--hidden");
      } else {
        header.classList.remove("site-header--hidden");
      }
      lastY = y;
      headerTicking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!headerTicking) {
          window.requestAnimationFrame(onHeaderScroll);
          headerTicking = true;
        }
      },
      { passive: true }
    );
  }

  // -----------------------------------------------------------------
  // 2) Apparition progressive au scroll. Les cartes (.iat-card) sont
  //    observées individuellement, avec un léger décalage en cascade ;
  //    les autres blocs directs de <main> sont observés comme un tout
  //    (sauf ceux qui contiennent déjà des cartes, pour éviter un
  //    double effet visuel sur la même zone).
  // -----------------------------------------------------------------
  var main = document.querySelector("main");
  if (main && "IntersectionObserver" in window) {
    var targets = [];

    var cards = main.querySelectorAll(".iat-card");
    Array.prototype.forEach.call(cards, function (card, i) {
      card.classList.add("iat-reveal");
      card.style.setProperty("--iat-reveal-order", i % 6);
      targets.push(card);
    });

    Array.prototype.forEach.call(main.children, function (child) {
      if (!child.querySelector(".iat-card")) {
        child.classList.add("iat-reveal");
        targets.push(child);
      }
    });

    if (reduceMotion) {
      targets.forEach(function (el) {
        el.classList.add("iat-reveal--visible");
      });
    } else {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("iat-reveal--visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
      );
      targets.forEach(function (el) {
        observer.observe(el);
      });
    }
  }

  // -----------------------------------------------------------------
  // 3) Barre de progression de lecture.
  // -----------------------------------------------------------------
  var bar = document.getElementById("scrollProgress");
  if (bar) {
    var barTicking = false;

    function onProgressScroll() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
      barTicking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!barTicking) {
          window.requestAnimationFrame(onProgressScroll);
          barTicking = true;
        }
      },
      { passive: true }
    );
    onProgressScroll();
  }

  // -----------------------------------------------------------------
  // 4) Formulaire de contact : retour visuel pendant l'envoi. Le
  //    formulaire est un POST natif Netlify Forms (pas d'AJAX) : on se
  //    contente de désactiver le bouton et de changer son texte avant
  //    que le navigateur ne quitte la page vers /merci.html.
  // -----------------------------------------------------------------
  var contactForm = document.querySelector('form[name="contact"]');
  if (contactForm) {
    contactForm.addEventListener("submit", function () {
      var btn = contactForm.querySelector(".iat-button--primary");
      if (btn && !btn.disabled) {
        btn.disabled = true;
        btn.classList.add("iat-button--loading");
        btn.textContent = "Envoi en cours…";
      }
    });
  }
})();
