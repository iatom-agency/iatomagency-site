// effects.js — améliorations UI "site moderne" (validé par Thomas le
// 24/09/2026, complété le même jour pour la FAQ en accordéon et le
// sous-menu scroll-spy d'offre.html). Complété le 25/09/2026 (3e vague,
// niveaux 1 et 2) : ligne de connexion des étapes de méthode.html et
// spinner d'envoi du formulaire de contact — la pulsation du logo, le
// soulignement de nav et la flèche des CTA sont purement CSS (voir
// effects.css) et n'ont pas besoin de logique ici. Fichier
// indépendant de nav.js (menu burger, inchangé) et de consent.js (bandeau
// cookies, inchangé). Suppression sans risque : retirer ce fichier + la
// balise <script> correspondante dans build_site.py (page_shell) +
// effects.css.
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
        if (reduceMotion) {
          btn.textContent = "Envoi en cours…";
        } else {
          // Même famille technique que la coche de merci.html (cercle SVG,
          // trait corail via currentColor) mais en rotation continue plutôt
          // qu'en tracé unique : la durée de l'envoi n'est pas connue à
          // l'avance (POST natif Netlify Forms, pas d'AJAX).
          btn.innerHTML =
            '<svg class="iat-spinner" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" ' +
            'stroke-width="3" stroke-linecap="round" stroke-dasharray="42 100"></circle>' +
            "</svg>Envoi en cours…";
        }
      }
    });
  }

  // -----------------------------------------------------------------
  // 5) FAQ en accordéon (accueil). Une seule question ouverte à la
  //    fois : au clic, on ferme les autres puis on bascule celle
  //    cliquée. L'animation d'ouverture/fermeture est entièrement en
  //    CSS (grid-template-rows) — ce script ne fait que basculer
  //    aria-expanded et une classe.
  // -----------------------------------------------------------------
  var faqButtons = document.querySelectorAll(".iat-faq__question");
  if (faqButtons.length) {
    Array.prototype.forEach.call(faqButtons, function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".iat-faq__item");
        var wasOpen = btn.getAttribute("aria-expanded") === "true";
        Array.prototype.forEach.call(faqButtons, function (other) {
          if (other !== btn) {
            other.setAttribute("aria-expanded", "false");
            other.closest(".iat-faq__item").classList.remove("iat-faq__item--open");
          }
        });
        btn.setAttribute("aria-expanded", String(!wasOpen));
        item.classList.toggle("iat-faq__item--open", !wasOpen);
      });
    });
  }

  // -----------------------------------------------------------------
  // 6) Sous-menu "scroll-spy" (offre.html uniquement) : PME / Collectivités
  //    / Syndics.
  //    a) Épinglage en haut de l'écran une fois le scroll dépassé sa
  //       position d'origine (équivalent d'un position:sticky, non
  //       utilisable ici — cf. commentaire dans effects.css, règle 10).
  //       Un "espaceur" de même hauteur évite le saut de mise en page.
  //    b) Mise en évidence de la section actuellement visible, via
  //       IntersectionObserver — indépendante de l'épinglage, ne modifie
  //       jamais le défilement lui-même.
  // -----------------------------------------------------------------
  var subnav = document.querySelector(".iat-offre-subnav");
  if (subnav) {
    var subnavSpacer = document.createElement("div");
    subnavSpacer.className = "iat-offre-subnav-spacer";
    subnavSpacer.setAttribute("aria-hidden", "true");
    subnav.parentNode.insertBefore(subnavSpacer, subnav.nextSibling);

    var subnavOriginalTop = subnav.getBoundingClientRect().top + window.scrollY;
    var subnavTicking = false;

    var siteHeader = document.querySelector(".site-header");

    function syncSubnavPin() {
      var mobile = window.matchMedia("(max-width: 900px)").matches;
      var headerOffset = 0;
      if (mobile) {
        var raw = getComputedStyle(document.documentElement).getPropertyValue(
          "--iat-header-h"
        );
        headerOffset = parseFloat(raw) || 0;
      }
      var shouldPin = window.scrollY >= subnavOriginalTop - headerOffset;
      var isPinned = subnav.classList.contains("iat-offre-subnav--pinned");
      // Sur mobile, l'en-tête peut lui-même se masquer au scroll vers le
      // bas (règle 1) : dans ce cas le sous-menu remonte à 0 plutôt que de
      // laisser un espace vide à la place de l'en-tête disparu.
      if (mobile && isPinned) {
        var headerCurrentlyHidden =
          siteHeader && siteHeader.classList.contains("site-header--hidden");
        subnav.style.top = (headerCurrentlyHidden ? 0 : headerOffset) + "px";
      } else if (!mobile) {
        // Retire toute valeur inline posée côté mobile : au-delà de 900px,
        // la règle CSS de base (top: 0) doit reprendre la main.
        subnav.style.top = "";
      }
      if (shouldPin && !isPinned) {
        subnavSpacer.style.height = subnav.offsetHeight + "px";
        subnav.classList.add("iat-offre-subnav--pinned");
      } else if (!shouldPin && isPinned) {
        subnav.classList.remove("iat-offre-subnav--pinned");
        subnavSpacer.style.height = "0px";
        subnav.style.top = "";
      }
      subnavTicking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!subnavTicking) {
          window.requestAnimationFrame(syncSubnavPin);
          subnavTicking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", syncSubnavPin);
    syncSubnavPin();

    var subnavLinks = document.querySelectorAll(".iat-offre-subnav__link");
    if (subnavLinks.length && "IntersectionObserver" in window) {
      var subnavTargets = [];
      Array.prototype.forEach.call(subnavLinks, function (link) {
        var target = document.getElementById(link.getAttribute("data-target"));
        if (target) {
          subnavTargets.push({ id: link.getAttribute("data-target"), el: target });
        }
      });

      function setActiveSubnav(id) {
        Array.prototype.forEach.call(subnavLinks, function (link) {
          var isActive = link.getAttribute("data-target") === id;
          link.classList.toggle("iat-offre-subnav__link--active", isActive);
          if (isActive) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      }

      var subnavObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var match = null;
              subnavTargets.forEach(function (t) {
                if (t.el === entry.target) {
                  match = t;
                }
              });
              if (match) {
                setActiveSubnav(match.id);
              }
            }
          });
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );

      subnavTargets.forEach(function (t) {
        subnavObserver.observe(t.el);
      });

      if (subnavTargets.length) {
        setActiveSubnav(subnavTargets[0].id);
      }
    }
  }

  // -----------------------------------------------------------------
  // 7) Méthode : ligne de connexion qui se dessine entre les 3 étapes
  //    (methode.html uniquement) au fil du scroll. La hauteur du
  //    remplissage suit la position d'un point de lecture fixé à 55% de
  //    la hauteur de la fenêtre (légèrement sous le centre) entre le
  //    milieu du premier numéro et le milieu du dernier — indépendant de
  //    l'épinglage ou de tout autre mécanisme ci-dessus.
  // -----------------------------------------------------------------
  var methodeLigne = document.querySelector(".iat-methode-ligne");
  if (methodeLigne) {
    var methodeFill = methodeLigne.querySelector(".iat-methode-ligne__remplissage");
    var methodeNums = document.querySelectorAll(".iat-methode-num");

    if (methodeFill && methodeNums.length >= 2) {
      if (reduceMotion) {
        methodeFill.style.height = "100%";
      } else {
        var firstNum = methodeNums[0];
        var lastNum = methodeNums[methodeNums.length - 1];
        var methodeTicking = false;

        function syncMethodeLigne() {
          var firstRect = firstNum.getBoundingClientRect();
          var lastRect = lastNum.getBoundingClientRect();
          var start = firstRect.top + firstRect.height / 2;
          var end = lastRect.top + lastRect.height / 2;
          var span = end - start;
          var pointDeLecture = window.innerHeight * 0.55;
          var progress = span > 0 ? (pointDeLecture - start) / span : 0;
          progress = Math.max(0, Math.min(1, progress));
          methodeFill.style.height = progress * 100 + "%";
          methodeTicking = false;
        }

        window.addEventListener(
          "scroll",
          function () {
            if (!methodeTicking) {
              window.requestAnimationFrame(syncMethodeLigne);
              methodeTicking = true;
            }
          },
          { passive: true }
        );
        window.addEventListener("resize", syncMethodeLigne);
        syncMethodeLigne();
      }
    }
  }
})();
