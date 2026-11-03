// survol.js — interactions au passage de la souris (novembre 2026) :
// tuiles actives (fond, motif, lueur, inclinaison 3D), accueil qui suit la
// souris, boutons aimantés. Fichier additif et
// indépendant de effects.js / refonte.js : pour tout annuler, retirer ce
// fichier, survol.css et les balises correspondantes.
//
// Rien ne s'active au toucher (seulement souris ou clavier). En mode
// « réduire les animations », seules les couleurs changent : pas
// d'inclinaison, ni d'aimant.
(function () {
  "use strict";

  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fine = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // -----------------------------------------------------------------
  // 1) Tuiles : classes posées ici pour ne pas alourdir le HTML.
  // -----------------------------------------------------------------
  var groupes = [
    { sel: ".grid-cards-3 > div", classes: ["iat-tuile--sombre"], motifs: ["points", "colonnes", "grille"], incline: true },
    { sel: ".iat-exemple", classes: ["iat-tuile--sombre"], motifs: ["hachures"], incline: true },
    { sel: ".iat-card--sable", classes: ["iat-tuile--douce"], motifs: ["points-sombre"] },
    { sel: ".iat-avap", classes: ["iat-tuile--douce"], motifs: ["hachures-sombre"] },
    { sel: 'main > div[style*="background: var(--iat-petrole)"]', classes: ["iat-tuile--bandeau", "iat-bandeau"], motifs: ["diagonales"] }
  ];

  var tuiles = [];
  groupes.forEach(function (g) {
    Array.prototype.forEach.call(document.querySelectorAll(g.sel), function (el, i) {
      el.classList.add("iat-tuile");
      g.classes.forEach(function (c) { el.classList.add(c); });
      el.setAttribute("data-motif", g.motifs[i % g.motifs.length]);
      if (g.incline && !reduce) el.classList.add("iat-incline");
      tuiles.push({ el: el, incline: !!g.incline && !reduce });
    });
  });

  function lier(t) {
    var el = t.el;
    var raf = null;
    var dernier = null;

    function appliquer() {
      raf = null;
      var e = dernier;
      if (!e) return;
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      el.style.setProperty("--mx", x + "px");
      el.style.setProperty("--my", y + "px");
      if (t.incline) {
        var px = clamp(x / r.width, 0, 1) - 0.5;
        var py = clamp(y / r.height, 0, 1) - 0.5;
        el.style.setProperty("--ry", (px * 5).toFixed(2) + "deg");
        el.style.setProperty("--rx", (py * -4).toFixed(2) + "deg");
        el.style.setProperty("--ix", (px * -16).toFixed(1) + "px");
      }
    }

    el.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "mouse") el.classList.add("iat-actif");
    });
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      dernier = e;
      if (!raf) raf = window.requestAnimationFrame(appliquer);
    });
    el.addEventListener("pointerleave", function () {
      el.classList.remove("iat-actif");
      if (t.incline) {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--ix", "0px");
      }
    });
    // Clavier : même rendu quand un lien ou un bouton de la tuile a le focus.
    el.addEventListener("focusin", function () { el.classList.add("iat-actif"); });
    el.addEventListener("focusout", function (e) {
      if (!el.contains(e.relatedTarget)) el.classList.remove("iat-actif");
    });
  }
  tuiles.forEach(lier);

  // -----------------------------------------------------------------
  // 2) Accueil : parallaxe du visuel, trame et lueur sous le curseur,
  //    inclinaison douce du visuel.
  // -----------------------------------------------------------------
  var hero = document.querySelector(".iat-hero");
  var visuel = document.querySelector(".iat-hero__visuel");
  if (hero && fine) {
    var heroRaf = null;
    var heroEvt = null;
    var calculer = function () {
      heroRaf = null;
      var e = heroEvt;
      if (!e) return;
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--hx", e.clientX - r.left + "px");
      hero.style.setProperty("--hy", e.clientY - r.top + "px");
      if (!reduce && visuel) {
        var v = visuel.getBoundingClientRect();
        var px = clamp((e.clientX - v.left) / v.width, -0.3, 1.3);
        var py = clamp((e.clientY - v.top) / v.height, -0.3, 1.3);
        var cx = (px - 0.5) * 2;
        var cy = (py - 0.5) * 2;
        visuel.style.setProperty("--px", cx.toFixed(3));
        visuel.style.setProperty("--py", cy.toFixed(3));
        visuel.style.setProperty("--ry", clamp(cx * 4, -4, 4).toFixed(2) + "deg");
        visuel.style.setProperty("--rx", clamp(cy * -3, -3, 3).toFixed(2) + "deg");
      }
    };
    hero.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "mouse") {
        hero.classList.add("iat-actif");
        if (visuel && !reduce) visuel.classList.add("iat-incline");
      }
    });
    hero.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      heroEvt = e;
      if (!heroRaf) heroRaf = window.requestAnimationFrame(calculer);
    });
    hero.addEventListener("pointerleave", function () {
      hero.classList.remove("iat-actif");
      if (visuel) {
        visuel.style.setProperty("--px", "0");
        visuel.style.setProperty("--py", "0");
        visuel.style.setProperty("--rx", "0deg");
        visuel.style.setProperty("--ry", "0deg");
      }
    });
  }

  // -----------------------------------------------------------------
  // 3) Boutons aimantés : ils se rapprochent un peu du curseur quand il
  //    est à proximité, puis reviennent.
  // -----------------------------------------------------------------
  if (fine && !reduce) {
    var aimants = Array.prototype.slice.call(
      document.querySelectorAll(".iat-button--primary, .iat-hero__actions a, .iat-pour-qui a")
    );
    aimants = aimants.filter(function (el, i) { return aimants.indexOf(el) === i; });
    aimants.forEach(function (el) { el.classList.add("iat-magnet"); });

    var aimRaf = null;
    var aimEvt = null;
    var bouger = function () {
      aimRaf = null;
      var e = aimEvt;
      if (!e) return;
      aimants.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var portee = Math.max(r.width, r.height) / 2 + 70;
        if (Math.abs(dx) < r.width / 2 + 70 && Math.abs(dy) < r.height / 2 + 70 && Math.hypot(dx, dy) < portee + 40) {
          el.style.setProperty("--tx", clamp(dx * 0.28, -14, 14).toFixed(1) + "px");
          el.style.setProperty("--ty", clamp(dy * 0.35, -10, 10).toFixed(1) + "px");
        } else {
          el.style.setProperty("--tx", "0px");
          el.style.setProperty("--ty", "0px");
        }
      });
    };
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      aimEvt = e;
      if (!aimRaf) aimRaf = window.requestAnimationFrame(bouger);
    }, { passive: true });
    document.addEventListener("pointerleave", function () {
      aimants.forEach(function (el) {
        el.style.setProperty("--tx", "0px");
        el.style.setProperty("--ty", "0px");
      });
    });
  }
})();
