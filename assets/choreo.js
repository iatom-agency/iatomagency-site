// choreo.js — « chorégraphie » reprise de la page d'Adeline (novembre 2026),
// adaptée à IATom : accueil en particules 3D, titres mot par mot, mots
// manuscrits qui s'écrivent, paragraphes qui montent en flou, cartes en
// cascade, photos qui se dévoilent, en-tête qui s'efface, bouton flottant,
// pied de page qui se dévoile.
//
// Différence avec la page d'Adeline : pas de bibliothèque Motion (172 Ko) ;
// tout repose sur l'API d'animation du navigateur (Web Animations), plus
// légère. Le moteur de particules (assets/particules.js) est, lui, le même.
//
// Sécurité : tout ce fichier ne démarre que si la classe « ch » est posée
// (script en tête de page : seulement si l'appareil ne demande pas de
// réduire les animations). Si quelque chose échoue, la classe est retirée
// et la page s'affiche telle quelle. Pour tout annuler : retirer ce fichier,
// choreo.css, particules.js et le script en tête de chaque page.
(function () {
  "use strict";

  var d = document.documentElement;
  if (!d.classList.contains("ch")) return;

  var DOUX = "cubic-bezier(.22,1,.36,1)";

  function abandon() {
    d.classList.remove("ch", "ouverture", "ch-pret");
    if (window.__chTimer) window.clearTimeout(window.__chTimer);
  }
  if (typeof Element.prototype.animate !== "function" || !("IntersectionObserver" in window)) {
    abandon();
    return;
  }

  try {
    demarrer();
  } catch (e) {
    abandon();
  }

  function demarrer() {
    var liste = function (sel, racine) {
      return Array.prototype.slice.call((racine || document).querySelectorAll(sel));
    };
    var main = document.querySelector("main");
    if (!main) { abandon(); return; }

    // ---------------------------------------------------------------
    // Outils
    // ---------------------------------------------------------------
    // Joue une animation puis rend l'élément à son état naturel (« ch-fait »).
    function jouer(el, keyframes, options) {
      var a = el.animate(keyframes, Object.assign({ duration: 850, easing: DOUX, fill: "both" }, options || {}));
      var fini = function () { el.classList.add("ch-fait"); try { a.cancel(); } catch (e) {} };
      a.finished.then(fini).catch(function () { el.classList.add("ch-fait"); });
      return a;
    }
    // Déclenche une fonction quand l'élément entre à l'écran (une seule fois).
    function quand(el, fn, amount, marge) {
      var obs = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (e.isIntersecting) { obs.unobserve(e.target); fn(e.target); }
        });
      }, { threshold: [0, amount || 0.15], rootMargin: marge || "0px 0px -6% 0px" });
      obs.observe(el);
    }
    // Petit décalage entre éléments qui arrivent en même temps
    var lotN = 0, lotT = null;
    function decalage() {
      var n = lotN++;
      if (lotT) window.clearTimeout(lotT);
      lotT = window.setTimeout(function () { lotN = 0; }, 140);
      return Math.min(n, 4) * 90;
    }
    function tween(de, a, ms, ease, maj, fin) {
      var t0 = null;
      function pas(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / ms);
        maj(de + (a - de) * ease(p));
        if (p < 1) window.requestAnimationFrame(pas); else if (fin) fin();
      }
      window.requestAnimationFrame(pas);
    }
    var easeInOut = function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };

    var hero = document.querySelector(".iat-hero");
    var ouverture = d.classList.contains("ouverture") && !!hero;

    // ---------------------------------------------------------------
    // 1) Titres : chaque mot monte de son masque ; les mots manuscrits
    //    (<em>) s'écrivent ensuite de gauche à droite.
    // ---------------------------------------------------------------
    function envelopper(noeud) {
      Array.prototype.slice.call(noeud.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (m) {
            if (!m) return;
            if (/^\s+$/.test(m)) { frag.appendChild(document.createTextNode(" ")); return; }
            var o = document.createElement("span"), i = document.createElement("span");
            o.className = "mot"; i.textContent = m; o.appendChild(i); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "EM") {
          envelopper(n);
        }
      });
    }
    function ecrire(em, retardMs) {
      var duree = Math.min(2400, Math.max(800, em.textContent.length * 90));
      window.setTimeout(function () {
        tween(-18, 100, duree, easeInOut, function (v) { em.style.setProperty("--r", v + "%"); }, function () {
          em.classList.remove("ecrit"); em.style.removeProperty("--r");
        });
      }, retardMs || 0);
    }

    // Le titre de l'accueil (.iat-heading--display) est géré par l'ouverture
    // (particules) ou, sinon, par refonte.js : on ne le touche pas ici.
    liste("main h1, main h2").forEach(function (h) {
      if (h.classList.contains("iat-heading--display")) return;
      envelopper(h);
      h.setAttribute("data-ch", "mots");
      h.classList.add("mots-prets");
      var ems = liste("em", h);
      ems.forEach(function (em) { em.classList.add("ecrit"); });
      quand(h, function () {
        var mots = liste(".mot > span", h);
        mots.forEach(function (m, i) {
          m.animate([{ transform: "translateY(110%)" }, { transform: "translateY(0%)" }], { duration: 900, easing: DOUX, delay: i * 45, fill: "both" });
        });
        var total = 900 + mots.length * 45;
        window.setTimeout(function () { h.classList.add("ch-fait"); }, total + 60);
        ems.forEach(function (em, k) { ecrire(em, mots.length * 45 + 150 + k * 350); });
      }, 0.4);
    });

    // ---------------------------------------------------------------
    // 2) Groupes (cartes, exemples, étapes, FAQ, formulaire) : arrivée en
    //    cascade ; blocs isolés : fondu montant ; paragraphes : montée en
    //    flou, l'un après l'autre.
    // ---------------------------------------------------------------
    var groupes = liste(".grid-cards-3, .iat-exemples-grille, .iat-faq, .iat-methode-etapes, form[name='contact']");
    groupes.forEach(function (g) {
      var enfants = Array.prototype.slice.call(g.children).filter(function (e) {
        return !e.classList.contains("iat-methode-ligne") && e.tagName !== "INPUT" && !(e.tagName === "P" && e.style.display === "none") && e.offsetParent !== null || e.classList.contains("iat-faq__item");
      });
      enfants.forEach(function (e) { e.setAttribute("data-ch", "enfant"); });
      quand(g, function () {
        enfants.forEach(function (e, i) {
          jouer(e, [
            { opacity: 0, transform: "translateY(34px) scale(.97)" },
            { opacity: 1, transform: "translateY(0) scale(1)" }
          ], { duration: 900, delay: i * 100 });
        });
      }, 0.15);
    });

    var blocs = liste(".iat-avap, .iat-booking-frame, .iat-defile, main > div[style*='var(--iat-petrole)'], .iat-card:not(.iat-exemples-grille *)");
    blocs.forEach(function (b) {
      if (b.closest("[data-ch='enfant']")) return;
      b.setAttribute("data-ch", "bloc");
      quand(b, function () {
        jouer(b, [{ opacity: 0, transform: "translateY(26px)" }, { opacity: 1, transform: "translateY(0)" }], { delay: 150 });
      }, 0.2);
    });

    var exclusP = ".iat-hero, .grid-cards-3, .iat-exemples-grille, .iat-faq, .iat-methode-etapes, .iat-avap, .iat-card, .iat-defile, form[name='contact'], .iat-note, .iat-sr, .iat-flottant, .cookie-banner";
    liste("main p").forEach(function (p) {
      if (p.closest(exclusP) || p.classList.contains("iat-note") || p.classList.contains("iat-sr")) return;
      p.setAttribute("data-ch", "p");
      quand(p, function () {
        jouer(p, [
          { opacity: 0, transform: "translateY(22px)", filter: "blur(6px)" },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" }
        ], { delay: decalage() });
      }, 0.1);
    });
    // Les notes discrètes et les éléments hors cascade gardent leur état
    // naturel (aucune animation) : ils sont déjà lisibles.

    // ---------------------------------------------------------------
    // 3) Photos : elles se dévoilent de gauche à droite, le visage glisse
    //    doucement dans le cadre.
    // ---------------------------------------------------------------
    liste(".iat-photo, .iat-offre__visuel").forEach(function (cadre) {
      var img = cadre.querySelector("img");
      cadre.setAttribute("data-ch", "photo");
      quand(cadre.parentElement || cadre, function () {
        jouer(cadre, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], { duration: 1500 });
        if (img) img.animate([{ transform: "scale(1.22) translateX(-4%)" }, { transform: "scale(1) translateX(0)" }], { duration: 2200, easing: DOUX, fill: "both" })
          .finished.then(function () { /* l'image retrouve son état naturel */ }).catch(function () {});
      }, 0.3);
    });

    // ---------------------------------------------------------------
    // 4) En-tête qui s'efface / bouton flottant
    // ---------------------------------------------------------------
    var entete = document.querySelector(".site-header");
    var pageContact = !!document.querySelector(".grid-contact-layout, [name='contact']");
    var flottant = null;
    if (entete && !pageContact && !/merci|mentions|cgv|confidentialite|plan-du-site/.test(location.pathname)) {
      flottant = document.createElement("a");
      flottant.className = "iat-button iat-button--primary iat-flottant";
      flottant.href = "contact.html";
      flottant.textContent = "Discutons de votre quotidien";
      document.body.appendChild(flottant);
    }
    var apresAccueil = !hero; // sans accueil : géré par le défilement
    if (hero) {
      new IntersectionObserver(function (entrees) {
        var e = entrees[entrees.length - 1];
        apresAccueil = !e.isIntersecting && e.boundingClientRect.bottom < 0;
        majEntete();
      }, { threshold: 0 }).observe(hero);
    }
    liste(".iat-bandeau, main > div[style*='var(--iat-petrole)']").forEach(function (b) {
      new IntersectionObserver(function (e) {
        d.classList.toggle("ch-bandeau-vu", e[e.length - 1].isIntersecting);
      }, { threshold: 0.3 }).observe(b);
    });
    var enTick = false;
    function majEntete() {
      enTick = false;
      if (!entete) return;
      var cache = entete.classList.contains("site-header--hidden");
      d.classList.toggle("ch-entete-cache", cache);
      var passe = hero ? apresAccueil : window.scrollY > 520;
      d.classList.toggle("ch-flottant", !!flottant && passe);
    }
    window.addEventListener("scroll", function () {
      if (!enTick) { enTick = true; window.requestAnimationFrame(majEntete); }
    }, { passive: true });
    window.addEventListener("resize", majEntete);

    // ---------------------------------------------------------------
    // 5) Pied de page qui se dévoile (grand écran)
    // ---------------------------------------------------------------
    var pied = main.nextElementSibling;
    if (pied && pied.tagName === "DIV" && pied.querySelector(".site-footer-top")) {
      pied.classList.add("ch-pied");
      var cale = null, vu = false;
      var large = window.matchMedia("(min-width: 900px)");
      var montrerPied = function () {
        if (vu) return;
        vu = true;
        pied.classList.add("pied-vu");
        Array.prototype.slice.call(pied.children).forEach(function (c, i) {
          c.animate([
            { opacity: 0, transform: "translateY(24px)", filter: "blur(4px)" },
            { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" }
          ], { duration: 800, easing: DOUX, delay: i * 120, fill: "backwards" });
        });
      };
      var reveler = function () {
        var h = pied.getBoundingClientRect().height;
        var ok = large.matches && h > 0 && h <= window.innerHeight * 0.85;
        if (ok && !cale) {
          cale = document.createElement("div");
          cale.className = "pied-cale";
          cale.setAttribute("aria-hidden", "true");
          pied.parentNode.insertBefore(cale, pied);
          pied.classList.add("pied-revele");
          d.classList.add("pied-actif");
        } else if (!ok && cale) {
          cale.parentNode.removeChild(cale); cale = null;
          pied.classList.remove("pied-revele");
          d.classList.remove("pied-actif");
          montrerPied();
        }
        if (cale) cale.style.height = h + "px";
      };
      // Clavier : un lien du pied encore caché derrière la page → on descend
      pied.addEventListener("focusin", function () {
        if (cale && window.scrollY < d.scrollHeight - window.innerHeight - 4) {
          window.scrollTo({ top: d.scrollHeight, behavior: "smooth" });
        }
      });
      reveler();
      if (window.ResizeObserver) new ResizeObserver(reveler).observe(pied);
      window.addEventListener("resize", reveler);
      quand(cale || pied, montrerPied, cale ? 0.3 : 0.2, "0px");
    }

    // ---------------------------------------------------------------
    // 6) Accueil immersif : particules 3D (accueil seulement, première
    //    arrivée sur le site).
    // ---------------------------------------------------------------
    var termine = false;
    var finir = function () {
      if (termine) return;
      termine = true;
      d.classList.remove("ouverture");
      document.dispatchEvent(new CustomEvent("accueil-pret"));
    };
    if (ouverture) lancerOuverture(hero, finir);

    // Tout est prêt : on affiche la page (les éléments marqués restent
    // masqués jusqu'à leur animation).
    window.__ch = true;
    if (window.__chTimer) window.clearTimeout(window.__chTimer);
    d.classList.add("ch-pret");
    majEntete();
  }

  // -------------------------------------------------------------------
  // Ouverture de l'accueil
  // -------------------------------------------------------------------
  function lancerOuverture(hero, finir) {
    var d = document.documentElement;
    var h1 = hero.querySelector("h1");
    var texte = hero.querySelector(".iat-hero__texte");
    var place = hero.querySelector("[data-forme=titre]");
    var timers = [], sc = null;
    var plusTard = function (f, ms) { timers.push(window.setTimeout(f, ms)); };
    var devoiler = function () { hero.classList.add("devoile"); };
    var ecrireMain = function () {};
    var secours = function () { hero.classList.remove("scene-active"); devoiler(); finir(); };

    if (!window.Sculpture || !h1 || !place || !texte) { devoiler(); finir(); return; }

    // Phrase dessinée une seule fois, avec les polices du site, selon les
    // lignes réelles du titre (mesurées dans une copie hors écran).
    function dessiner() {
      var cs = window.getComputedStyle(h1);
      var taille = parseFloat(cs.fontSize);
      var motsTexte = [];
      (function lire(n, em) {
        Array.prototype.forEach.call(n.childNodes, function (m) {
          if (m.nodeType === 3) {
            m.textContent.split(/\s+/).forEach(function (t) { if (t) motsTexte.push({ t: t, em: em }); });
          } else if (m.nodeType === 1) {
            lire(m, em || m.classList.contains("iat-calli") || m.tagName === "EM");
          }
        });
      })(h1, false);

      // mesure des lignes dans une copie du titre, de même largeur et même police
      var boite = document.createElement("div");
      boite.style.cssText = "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;width:" + texte.getBoundingClientRect().width + "px";
      var copie = document.createElement("h1");
      copie.className = h1.className;
      copie.style.margin = "0";
      var spans = motsTexte.map(function (m) {
        var s = document.createElement("span");
        s.textContent = m.t;
        if (m.em) s.className = "iat-calli";
        copie.appendChild(s);
        copie.appendChild(document.createTextNode(" "));
        return s;
      });
      boite.appendChild(copie);
      document.body.appendChild(boite);
      var lignes = [], top = null;
      spans.forEach(function (s, i) {
        var t = s.offsetTop;
        if (top === null || Math.abs(t - top) > taille * 0.6) { lignes.push([]); top = t; }
        lignes[lignes.length - 1].push(motsTexte[i]);
      });
      document.body.removeChild(boite);

      var sans = '600 168px "Familjen Grotesk", "Helvetica Neue", Arial, sans-serif';
      var main = '600 218px "Caveat", cursive';
      var c = document.createElement("canvas"), x = c.getContext("2d");
      var mesure = function (m) { x.font = m.em ? main : sans; return x.measureText(m.t).width; };
      var espace = function () { x.font = sans; return x.measureText(" ").width; };
      var largeur = function (l) { var w = 0; l.forEach(function (m, i) { w += mesure(m) + (i > 0 ? espace() : 0); }); return w; };
      var best = 0;
      lignes.forEach(function (l) { best = Math.max(best, largeur(l)); });
      var PAD = 24, HLIGNE = 182, BASE = 165;
      var W = Math.ceil(best + PAD * 2), H = BASE + (lignes.length - 1) * HLIGNE + 76;
      c.width = W; c.height = H; x = c.getContext("2d");
      var NUIT = "#1E2422", PETROLE = "#0F4C55", CORAIL = "#D96A47";
      var ecrit = [], trait = null;
      lignes.forEach(function (l, n) {
        var base = BASE + n * HLIGNE, px = PAD, debutSouligne = null;
        l.forEach(function (m, i) {
          if (i > 0) { x.font = sans; px += x.measureText(" ").width; }
          if (m.t === "part") debutSouligne = px;
          x.font = m.em ? main : sans;
          if (m.em) ecrit.push({ t: m.t, x: px, y: base });   // écrit à la main plus tard (SVG)
          else { x.fillStyle = NUIT; x.fillText(m.t, px, base); }
          px += x.measureText(m.t).width;
        });
        if (debutSouligne !== null) trait = { a: debutSouligne, b: px - 4, y: base + 34 };
      });
      var echelle = taille / 168;
      place.style.width = Math.min(W * echelle, texte.getBoundingClientRect().width + PAD * echelle * 2) + "px";
      place.style.aspectRatio = String(W / H);
      place.style.marginLeft = -PAD * echelle + "px";
      place.style.marginTop = -(BASE - 128) * echelle + "px";
      place.style.marginBottom = -34 * echelle + "px";
      return { src: c.toDataURL("image/png"), ratio: W / H, W: W, H: H, ecrit: ecrit, trait: trait, PETROLE: PETROLE, CORAIL: CORAIL };
    }


    // Le mot manuscrit (« humaine. ») et le trait corail ne sont pas en
    // particules : ils s'écrivent « à la main » en SVG par-dessus la phrase
    // (même repère que l'image des particules, donc même position).
    function fabriquerMain(ph) {
      var easeInOut = function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
      var tween = function (de, a, ms, ease, maj, fin) {
        var t0 = null;
        function pas(t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / ms);
          maj(de + (a - de) * ease(p));
          if (p < 1) window.requestAnimationFrame(pas); else if (fin) fin();
        }
        window.requestAnimationFrame(pas);
      };
      var NS = "http://www.w3.org/2000/svg", fait = false;
      if (!ph.ecrit.length) return function () {};
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 " + ph.W + " " + ph.H);
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none";
      var defs = document.createElementNS(NS, "defs"), cp = document.createElementNS(NS, "clipPath"), rect = document.createElementNS(NS, "rect");
      cp.setAttribute("id", "clip-humaine");
      rect.setAttribute("x", -40); rect.setAttribute("y", -40); rect.setAttribute("height", ph.H + 80); rect.setAttribute("width", 0);
      cp.appendChild(rect); defs.appendChild(cp); svg.appendChild(defs);
      var g = document.createElementNS(NS, "g"); g.setAttribute("clip-path", "url(#clip-humaine)");
      ph.ecrit.forEach(function (m) {
        var t = document.createElementNS(NS, "text");
        t.setAttribute("x", m.x); t.setAttribute("y", m.y);
        t.setAttribute("font-family", "Caveat, cursive"); t.setAttribute("font-weight", "600"); t.setAttribute("font-size", "218");
        t.setAttribute("fill", ph.PETROLE); t.textContent = m.t; g.appendChild(t);
      });
      svg.appendChild(g);
      var chemin = null;
      if (ph.trait) {
        var a = ph.trait.a, b = ph.trait.b, y0 = ph.trait.y;
        chemin = document.createElementNS(NS, "path");
        chemin.setAttribute("d", "M" + a + " " + (y0 + 2) + " C " + (a + (b - a) * 0.25) + " " + (y0 - 12) + ", " + (a + (b - a) * 0.55) + " " + (y0 + 12) + ", " + b + " " + (y0 - 2));
        chemin.setAttribute("fill", "none"); chemin.setAttribute("stroke", ph.CORAIL); chemin.setAttribute("stroke-width", "11");
        chemin.setAttribute("stroke-linecap", "round"); chemin.setAttribute("pathLength", "1");
        chemin.setAttribute("stroke-dasharray", "1"); chemin.setAttribute("stroke-dashoffset", "1");
        svg.appendChild(chemin);
      }
      place.appendChild(svg);
      return function (vite) {
        if (fait) return; fait = true;
        var x0 = ph.ecrit[0].x - 30, x1 = ph.ecrit[ph.ecrit.length - 1].x + 700;
        var fin = function () { if (chemin) tween(1, 0, vite ? 1 : 900, easeInOut, function (v) { chemin.setAttribute("stroke-dashoffset", v); }); };
        if (vite) { rect.setAttribute("width", ph.W + 80); fin(); return; }
        rect.setAttribute("x", -40);
        tween(x0, x1, 1500, easeInOut, function (v) { rect.setAttribute("width", Math.max(0, v + 40)); }, fin);
      };
    }

    var polices = document.fonts
      ? Promise.all([document.fonts.load('600 168px "Familjen Grotesk"'), document.fonts.load('600 218px "Caveat"')])
      : Promise.resolve();
    polices.catch(function () {}).then(function () {
      try {
        var ph = dessiner();
        ecrireMain = fabriquerMain(ph);
        sc = new window.Sculpture({
          hero: hero, canvas: hero.querySelector(".scene"), particules: 55000, intro: "phrase3d", forme: 0,
          formes: [{ src: ph.src, el: place }],
          nuageDroit: function (r, g, b) { return b > 68; },   // pétrole + corail = nuage de droite ; texte sombre = nuage de gauche
          surArrivee: function () { plusTard(function () { ecrireMain(false); }, 150); plusTard(finir, 350); }
        });
        plusTard(devoiler, 80);
        plusTard(function () {
          sc.demarrer().then(function (ok) { if (!ok) secours(); });
          plusTard(function () { ecrireMain(false); }, 4200); plusTard(finir, 5000);   // au plus tard, même si l'on joue avec les particules
        }, 1300);
      } catch (e) { secours(); }
    });
    plusTard(function () { if (!d.classList.contains("ouverture")) return; secours(); }, 12000);   // filet de sécurité

    var passer = document.getElementById("passer-intro");
    if (passer) {
      passer.addEventListener("click", function () {
        timers.forEach(window.clearTimeout); timers = [];
        devoiler();
        ecrireMain(true);
        if (sc && sc.pret) sc.vers(0, { etalement: 0.15 });
        finir();
      });
    }
  }
})();
