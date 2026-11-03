// refonte.js — animations de la vague "refonte accueil" (novembre 2026) :
// titre mot par mot + soulignement, chiffres qui défilent, avant/après
// interactif, étapes de la méthode qui s'allument. Fichier additif,
// indépendant de effects.js / nav.js / consent.js : pour tout annuler,
// retirer ce fichier, refonte.css et les balises correspondantes.
(function () {
  "use strict";

  var reduceMotion = !!(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  var hasIO = "IntersectionObserver" in window;

  // Active les états "atténués" de refonte.css (sans JS, tout reste visible).
  document.documentElement.classList.add("iat-js");

  // -----------------------------------------------------------------
  // 1) Titre d'accueil : un mot après l'autre, puis soulignement tracé
  //    sous « part humaine ». Le texte lu par les lecteurs d'écran reste
  //    celui du <h1> d'origine (aria-label), les mots découpés sont
  //    masqués (aria-hidden).
  // -----------------------------------------------------------------
  var titre = document.querySelector(".iat-heading--display");
  if (titre && !reduceMotion) {
    var texte = titre.textContent.replace(/\s+/g, " ").trim();
    var mots = texte.split(" ");
    var debutSouligne = mots.indexOf("part");
    titre.setAttribute("aria-label", texte);
    titre.classList.add("iat-titre-anime");
    titre.textContent = "";

    var groupe = null;
    mots.forEach(function (mot, i) {
      var span = document.createElement("span");
      span.className = "iat-mot";
      span.setAttribute("aria-hidden", "true");
      span.style.setProperty("--i", i);
      span.textContent = mot;
      if (/^humaine/.test(mot)) span.classList.add("iat-calli");

      if (debutSouligne !== -1 && i >= debutSouligne) {
        if (!groupe) {
          groupe = document.createElement("span");
          groupe.className = "iat-souligne";
          titre.appendChild(groupe);
        }
        if (i > debutSouligne) groupe.appendChild(document.createTextNode(" "));
        groupe.appendChild(span);
      } else {
        titre.appendChild(span);
        if (i < mots.length - 1) titre.appendChild(document.createTextNode(" "));
      }
    });

    if (groupe) {
      var ns = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(ns, "svg");
      svg.setAttribute("class", "iat-souligne__trait");
      svg.setAttribute("viewBox", "0 0 200 12");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      var path = document.createElementNS(ns, "path");
      path.setAttribute("d", "M2 8 C 38 2, 84 12, 128 6 S 186 4, 198 7");
      path.setAttribute("pathLength", "1");
      svg.appendChild(path);
      svg.style.setProperty("--t", 180 + mots.length * 110 + 250 + "ms");
      groupe.appendChild(svg);
    }
  }

  // -----------------------------------------------------------------
  // 2) Chiffres qui défilent (exemples concrets). Le HTML contient déjà
  //    la valeur finale ; on repart de la valeur de départ et on compte
  //    jusqu'à la valeur finale quand le bloc devient visible.
  // -----------------------------------------------------------------
  var chiffres = document.querySelectorAll("[data-fin]");
  if (chiffres.length && hasIO && !reduceMotion) {
    var compter = function (el) {
      var depart = parseFloat(el.getAttribute("data-depart"));
      var fin = parseFloat(el.getAttribute("data-fin"));
      var duree = 1500;
      var t0 = null;
      function pas(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / duree);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(depart + (fin - depart) * e);
        if (p < 1) window.requestAnimationFrame(pas);
      }
      window.requestAnimationFrame(pas);
    };
    var obsChiffres = new IntersectionObserver(
      function (entrees) {
        entrees.forEach(function (entree) {
          if (entree.isIntersecting) {
            compter(entree.target);
            obsChiffres.unobserve(entree.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    Array.prototype.forEach.call(chiffres, function (el) {
      el.textContent = el.getAttribute("data-depart");
      obsChiffres.observe(el);
    });
  }

  // -----------------------------------------------------------------
  // 3) Avant / après : curseur accessible (touches fléchées), glisser au
  //    doigt ou à la souris, et un aller-retour d'invitation (avant →
  //    après → avant) la première fois que le bloc apparaît, annulé dès
  //    la 1re interaction. Les barres démarrent sur « avant » (t = 0).
  // -----------------------------------------------------------------
  var comparateur = document.querySelector(".iat-avap");
  if (comparateur) {
    var curseur = comparateur.querySelector(".iat-avap__curseur");
    var zone = comparateur.querySelector(".iat-avap__zone");
    var pistes = comparateur.querySelectorAll(".iat-avap__piste");
    var barres = comparateur.querySelectorAll(".iat-avap__barre");
    var interagi = false;
    var anim = null;

    var placer = function (pct) {
      pct = Math.max(0, Math.min(100, pct));
      comparateur.style.setProperty("--t", pct / 100);
      Array.prototype.forEach.call(barres, function (b) {
        b.style.setProperty("--t", pct / 100);
      });
      comparateur.classList.toggle("iat-avap--apres", pct >= 50);
      if (curseur) curseur.value = Math.round(pct);
    };
    var arreter = function () {
      interagi = true;
      if (anim) window.cancelAnimationFrame(anim);
    };

    if (curseur) {
      curseur.addEventListener("input", function () {
        arreter();
        placer(parseFloat(curseur.value));
      });
    }

    if (zone && pistes.length) {
      var depuisPointeur = function (e) {
        var r = pistes[0].getBoundingClientRect();
        placer(((e.clientX - r.left) / r.width) * 100);
      };
      var glisse = false;
      zone.addEventListener("pointerdown", function (e) {
        glisse = true;
        arreter();
        try { zone.setPointerCapture(e.pointerId); } catch (err) {}
        depuisPointeur(e);
      });
      zone.addEventListener("pointermove", function (e) {
        if (glisse) depuisPointeur(e);
      });
      var fin = function () { glisse = false; };
      zone.addEventListener("pointerup", fin);
      zone.addEventListener("pointercancel", fin);
    }

    if (hasIO && !reduceMotion) {
      var obsComp = new IntersectionObserver(
        function (entrees) {
          entrees.forEach(function (entree) {
            if (!entree.isIntersecting) return;
            obsComp.disconnect();
            if (interagi) return;
            var trajet = [0, 100, 0];
            var segment = 0;
            var t0 = null;
            var duree = 1400;
            var de = trajet[0];
            function pas(t) {
              if (interagi) return;
              if (t0 === null) t0 = t;
              var p = Math.min(1, (t - t0) / duree);
              var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              placer(de + (trajet[segment + 1] - de) * e);
              if (p < 1) {
                anim = window.requestAnimationFrame(pas);
              } else if (segment < trajet.length - 2) {
                segment += 1;
                de = trajet[segment];
                t0 = null;
                anim = window.requestAnimationFrame(pas);
              }
            }
            anim = window.requestAnimationFrame(pas);
          });
        },
        { threshold: 0.6 }
      );
      obsComp.observe(comparateur);
    }
  }

  // -----------------------------------------------------------------
  // 4) Méthode : chaque étape s'allume (définitivement) quand elle entre
  //    dans la moitié haute de l'écran.
  // -----------------------------------------------------------------
  var etapes = document.querySelectorAll(".grid-methode-step");
  if (etapes.length) {
    if (!hasIO || reduceMotion) {
      Array.prototype.forEach.call(etapes, function (el) {
        el.classList.add("iat-etape--active");
      });
    } else {
      var obsEtapes = new IntersectionObserver(
        function (entrees) {
          entrees.forEach(function (entree) {
            if (entree.isIntersecting) {
              entree.target.classList.add("iat-etape--active");
              obsEtapes.unobserve(entree.target);
            }
          });
        },
        { threshold: 0, rootMargin: "0px 0px -42% 0px" }
      );
      Array.prototype.forEach.call(etapes, function (el) {
        obsEtapes.observe(el);
      });
    }
  }
})();
