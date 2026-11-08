/* Copie pour iatomagency.fr (3 nov. 2026) du moteur écrit pour la page d'Adeline (team-page-generator/vendor/particules). Seule modification : l'option nuageDroit(r, g, b), qui décide quelles particules forment le nuage de droite. */
/* Sculpture de particules (maquette de la section d'accueil, 2026-10-25).
   Moteur écrit pour la page d'Adeline, sans bibliothèque : une image découpée (la flamme, les lettres iAD…) est
   recomposée en dizaines de milliers de particules. Au repos, l'image nette s'affiche ; le curseur (ou le doigt)
   rend la matière liquide là où il passe, puis elle reprend sa forme. Les particules peuvent aussi passer d'une
   forme à une autre (piste 2 : lettres iAD → flamme → poussière → filigrane).
   Sans WebGL, ou si l'appareil demande moins d'animations, rien ne se lance : les images fixes de la page restent. */
(function () {
  'use strict';

  var VS_POINTS = [
    'attribute vec4 aP;',          // x, y (px CSS), alpha, taille et éclat (partie entière = taille × 20, partie décimale = éclat)
    'attribute vec3 aC;',          // couleur
    'uniform vec2 uRes;',
    'uniform float uTaille;',
    'varying vec4 vC;',
    'varying float vEclat;',
    'void main(){',
    '  vec2 c = aP.xy / uRes * 2.0 - 1.0;',
    '  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);',
    '  gl_PointSize = uTaille * floor(aP.w) / 20.0;',
    '  vC = vec4(aC, aP.z);',
    '  vEclat = fract(aP.w);',
    '}'
  ].join('\n');

  var FS_POINTS = [
    'precision mediump float;',
    'varying vec4 vC;',
    'varying float vEclat;',
    'void main(){',
    '  float r = length(gl_PointCoord - 0.5);',
    '  float a = smoothstep(0.5, 0.3, r) * vC.a;',
    '  if (a < 0.01) discard;',
    '  vec3 c = mix(vC.rgb, min(vC.rgb * 1.2 + 0.09, vec3(1.0)), vEclat);',   // la matière rapide prend la lumière
    '  gl_FragColor = vec4(c * a, a);',
    '}'
  ].join('\n');

  var VS_IMAGE = [
    'attribute vec2 aQ;',
    'uniform vec2 uRes;',
    'uniform vec4 uRect;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aQ;',
    '  vec2 p = uRect.xy + aQ * uRect.zw;',
    '  vec2 c = p / uRes * 2.0 - 1.0;',
    '  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FS_IMAGE = [
    'precision mediump float;',
    'uniform sampler2D uImg;',
    'uniform sampler2D uMasque;',
    'uniform float uVis;',
    'varying vec2 vUv;',
    'void main(){',
    '  float m = texture2D(uMasque, vUv).r;',                  // là où la matière bouge, l'image nette s'efface
    '  float montre = (1.0 - smoothstep(0.03, 0.35, m)) * uVis;',
    '  gl_FragColor = texture2D(uImg, vUv) * montre;',
    '}'
  ].join('\n');

  var CHENE = [196, 162, 122];
  // Ouverture « nuages » : deux nuages de particules (noir à gauche, bleu à droite) arrivent des bords de l'écran, épars sur les bords,
  // de plus en plus denses vers le centre où ils s'enlacent en rubans fluides, puis se détachent pour former la phrase.
  var NUAGES_ARRIVEE = 1.9, NUAGES_LIBRE = 2.7;
  // Version 3D (« phrase3d ») : la phrase est posée sur un plan d'abord incliné dans l'espace, qui pivote pour faire face au visiteur
  // pendant que les particules (noires depuis la gauche, bleues depuis la droite) arrivent du fond de la scène sur des trajectoires courbes,
  // passent parfois tout près, puis se posent sur leur lettre. Quand le plan est de face, chaque particule est exactement à sa place.
  var P3_FACE = 2.9;   // le plan de la phrase fait face au visiteur à 2,9 s
  // Chemin suivi par le nuage noir (en unités du centre de la phrase) : il vient de loin à gauche, passe au-dessus du centre et s'y enroule ;
  // le nuage bleu suit le chemin symétrique (venu de droite, il passe dessous) : les deux boucles s'enlacent.
  var POINTS_NOIR = [[-3.4, 0.3], [-2.4, 0.18], [-1.5, 0.02], [-0.8, -0.28], [-0.15, -0.42], [0.4, -0.25], [0.48, 0.12], [0.12, 0.34], [-0.32, 0.18], [-0.3, -0.12], [0.15, -0.16], [0.75, 0.05]];
  function chemin(pts, M) {
    var brut = [];
    for (var k = 0; k < pts.length - 1; k++) {
      var p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
      for (var j = 0; j < 30; j++) {
        var t = j / 30, t2 = t * t, t3 = t2 * t;
        brut.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                   0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    brut.push(pts[pts.length - 1]);
    var cum = [0];
    for (var a = 1; a < brut.length; a++) { cum.push(cum[a - 1] + Math.hypot(brut[a][0] - brut[a - 1][0], brut[a][1] - brut[a - 1][1])); }
    var tot = cum[cum.length - 1], X = new Float32Array(M), Y = new Float32Array(M), NX = new Float32Array(M), NY = new Float32Array(M), q = 0;
    for (var m = 0; m < M; m++) {
      var d = m / (M - 1) * tot;
      while (q < cum.length - 2 && cum[q + 1] < d) { q++; }
      var f = (d - cum[q]) / Math.max(1e-6, cum[q + 1] - cum[q]);
      X[m] = brut[q][0] + (brut[q + 1][0] - brut[q][0]) * f; Y[m] = brut[q][1] + (brut[q + 1][1] - brut[q][1]) * f;
    }
    for (var n = 0; n < M; n++) {   // normale au chemin (pour répartir les particules de part et d'autre)
      var a1 = Math.max(0, n - 1), b1 = Math.min(M - 1, n + 1), tx = X[b1] - X[a1], ty = Y[b1] - Y[a1], l = Math.hypot(tx, ty) || 1;
      NX[n] = -ty / l; NY[n] = tx / l;
    }
    return { x: X, y: Y, nx: NX, ny: NY, M: M };
  }
  var CHEMIN_NOIR = chemin(POINTS_NOIR, 400);
  var CHEMIN_BLEU = chemin(POINTS_NOIR.map(function (p) { return [-p[0], -p[1]]; }), 400);
  var FLUX_G = [53, 168, 220], FLUX_D = [196, 162, 122];   // flux de gauche : bleu ciel du logo ; flux de droite : doré chêne
  var GRILLE = 72;   // finesse du masque (cases sur la largeur d'une forme)

  function lisse(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function charger(src) {
    return new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = ko; i.src = src; });
  }

  // Une particule par point « plein » d'une grille posée sur l'image ; la grille est choisie pour obtenir environ « cible » points.
  function echantillonner(img, cible) {
    var w0 = 160, h0 = Math.max(1, Math.round(w0 * img.naturalHeight / img.naturalWidth));
    var c = document.createElement('canvas'); c.width = w0; c.height = h0;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w0, h0);
    var d = x.getImageData(0, 0, w0, h0).data, plein = 0;
    for (var i = 3; i < d.length; i += 4) { if (d[i] > 128) { plein++; } }
    var couv = Math.max(0.02, plein / (w0 * h0));
    var gw = Math.max(40, Math.min(1400, Math.round(Math.sqrt(cible * img.naturalWidth / (img.naturalHeight * couv)))));
    var gh = Math.max(1, Math.round(gw * img.naturalHeight / img.naturalWidth));
    c.width = gw; c.height = gh;
    x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, gw, gh);
    d = x.getImageData(0, 0, gw, gh).data;
    var u = [], v = [], col = [];
    for (var y = 0; y < gh; y++) {
      for (var xx = 0; xx < gw; xx++) {
        var k = (y * gw + xx) * 4, a = d[k + 3] / 255;
        if (a < 0.15) { continue; }
        if (a < 0.6 && Math.random() > a / 0.6) { continue; }
        u.push((xx + 0.5 + (Math.random() - 0.5) * 0.7) / gw);
        v.push((y + 0.5 + (Math.random() - 0.5) * 0.7) / gh);
        col.push(d[k], d[k + 1], d[k + 2]);
      }
    }
    return { u: u, v: v, col: col, n: u.length, gw: gw };
  }

  function compiler(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p)); }
    return p;
  }

  /* options : hero (élément qui reçoit le curseur), canvas, formes [{src, el, opacite}], particules (nombre visé sur ordinateur),
     intro ('braises', 'flux', 'nuages' ou rien), forme (forme de départ) */
  function Sculpture(o) {
    this.o = o;
    this.hero = o.hero;
    this.canvas = o.canvas;
    this.pret = false;
  }

  Sculpture.prototype.demarrer = function () {
    var self = this, o = this.o;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return Promise.resolve(false); }
    var gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) { return Promise.resolve(false); }
    this.gl = gl;
    var tactile = window.matchMedia('(pointer: coarse)').matches;
    var petit = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.cible = Math.round((o.particules || 60000) * (tactile || petit ? 0.35 : 1));
    this.dprMax = tactile ? 1.5 : 2;
    return Promise.all(o.formes.map(function (f) { return charger(f.src); })).then(function (imgs) {
      try { self._construire(imgs); } catch (e) { return false; }
      self._ecouter();
      self.pret = true;
      self.hero.classList.add('scene-active');
      self.redemarrer();
      return true;
    }).catch(function () { return false; });
  };

  Sculpture.prototype._construire = function (imgs) {
    var gl = this.gl, self = this;
    this.pPts = compiler(gl, VS_POINTS, FS_POINTS);
    this.pImg = compiler(gl, VS_IMAGE, FS_IMAGE);
    this.ech = imgs.map(function (img) { return echantillonner(img, self.cible); });
    var N = 0;
    this.ech.forEach(function (e) { N = Math.max(N, e.n); });
    this.N = N;
    var S = imgs.length;
    // Pour chaque forme : position d'arrivée (u, v), couleur et case du masque de chaque particule.
    // La particule i va vers le point « au même rang » de chaque forme : les flux restent ordonnés pendant les passages d'une forme à l'autre.
    this.hu = []; this.hv = []; this.hc = []; this.hcase = []; this.gw = []; this.gh = [];
    for (var s = 0; s < S; s++) {
      var e = this.ech[s], hu = new Float32Array(N), hv = new Float32Array(N), hc = new Uint8Array(N * 3), hk = new Int32Array(N);
      var gw = GRILLE, gh = Math.max(8, Math.round(GRILLE * imgs[s].naturalHeight / imgs[s].naturalWidth));
      for (var i = 0; i < N; i++) {
        var j = Math.min(e.n - 1, Math.floor(i * e.n / N));
        hu[i] = e.u[j]; hv[i] = e.v[j];
        hc[i * 3] = e.col[j * 3]; hc[i * 3 + 1] = e.col[j * 3 + 1]; hc[i * 3 + 2] = e.col[j * 3 + 2];
        hk[i] = Math.min(gh - 1, Math.floor(hv[i] * gh)) * gw + Math.min(gw - 1, Math.floor(hu[i] * gw));
      }
      this.hu.push(hu); this.hv.push(hv); this.hc.push(hc); this.hcase.push(hk); this.gw.push(gw); this.gh.push(gh);
    }
    // État de chaque particule
    this.px = new Float32Array(N); this.py = new Float32Array(N); this.vx = new Float32Array(N); this.vy = new Float32Array(N);
    this.sh = new Int8Array(N); this.suiv = new Int8Array(N); this.delai = new Float32Array(N); this.raideur = new Float32Array(N);
    this.cDe = new Float32Array(N * 3); this.cT0 = new Float32Array(N); this.coul = new Float32Array(N * 3);
    for (var k = 0; k < N; k++) { this.raideur[k] = 0.6 + Math.random() * 0.8; }
    // Tampons WebGL
    this.bufP = gl.createBuffer(); this.donP = new Float32Array(N * 4);
    this.bufC = gl.createBuffer(); this.donC = new Uint8Array(N * 3);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufP); gl.bufferData(gl.ARRAY_BUFFER, this.donP.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufC); gl.bufferData(gl.ARRAY_BUFFER, this.donC.byteLength, gl.DYNAMIC_DRAW);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    // Textures : image nette (pré-multipliée) et masque de mouvement, par forme
    this.tex = []; this.texM = []; this.masque = [];
    for (var t = 0; t < S; t++) {
      this.tex.push(this._texture(imgs[t], gl.RGBA, gl.RGBA));
      this.masque.push(new Uint8Array(this.gw[t] * this.gh[t]));
      this.texM.push(this._texture(null, gl.LUMINANCE, gl.LUMINANCE, this.gw[t], this.gh[t]));
    }
    this.visImg = new Float32Array(S); this.visCible = new Float32Array(S);
    this.opacite = this.o.formes.map(function (f) { return f.opacite == null ? 1 : f.opacite; });
  };

  Sculpture.prototype._texture = function (img, interne, format, w, h) {
    var gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, img ? true : false);
    if (img) { gl.texImage2D(gl.TEXTURE_2D, 0, interne, format, gl.UNSIGNED_BYTE, img); }
    else { gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, interne, w, h, 0, format, gl.UNSIGNED_BYTE, null); }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };

  Sculpture.prototype._ecouter = function () {
    var self = this, h = this.hero;
    this.cible_x = -9999; this.cible_y = -9999; this.mx = -9999; this.my = -9999; this.mvx = 0; this.mvy = 0;
    this.presence = 0; this.presenceCible = 0; this.relache = 0;
    var placer = function (cx, cy) {
      var r = self.canvas.getBoundingClientRect();
      var x = cx - r.left, y = cy - r.top;
      if (self.mx < -9000) { self.mx = x; self.my = y; }
      self.cible_x = x; self.cible_y = y; self.presenceCible = 1; self.relache = 0;
      self.reveiller();
    };
    h.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') { placer(e.clientX, e.clientY); } });
    h.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') { self.presenceCible = 0; } });
    // Au doigt : on remue la matière sans empêcher le défilement de la page
    h.addEventListener('touchstart', function (e) { var t = e.touches[0]; self.mx = -9999; placer(t.clientX, t.clientY); }, { passive: true });
    h.addEventListener('touchmove', function (e) { var t = e.touches[0]; placer(t.clientX, t.clientY); }, { passive: true });
    h.addEventListener('touchend', function () { self.relache = performance.now() + 300; }, { passive: true });
    var redim = function () { self._dimensionner(); self.reveiller(); };
    if (window.ResizeObserver) { new ResizeObserver(redim).observe(h); } else { window.addEventListener('resize', redim); }
    this._dimensionner();
    this.visible = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) { self.reveiller(); } }).observe(h);
    }
  };

  Sculpture.prototype._dimensionner = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, this.dprMax);
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.dpr = dpr;
    var w = Math.round(this.W * dpr), h = Math.round(this.H * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  };

  Sculpture.prototype._rects = function () {
    var c = this.canvas.getBoundingClientRect();
    return this.o.formes.map(function (f) {
      var r = f.el.getBoundingClientRect();
      return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
    });
  };

  // Reprend depuis le début : intro « braises » (les étincelles montent puis s'assemblent, du bas vers le haut) ou forme posée directement.
  Sculpture.prototype.redemarrer = function () {
    if (!this.pret) { return; }
    var N = this.N, s0 = this.o.forme || 0, R = this._rects()[s0];
    this.T = 0; this.trans = null; this.attente = 0;
    for (var i = 0; i < N; i++) {
      this.sh[i] = s0; this.suiv[i] = -1;
      var hx = R.x + this.hu[s0][i] * R.w, hy = R.y + this.hv[s0][i] * R.h;
      for (var c = 0; c < 3; c++) { this.coul[i * 3 + c] = this.cDe[i * 3 + c] = this.hc[s0][i * 3 + c]; }
      this.cT0[i] = -10;
      if (this.o.intro === 'braises') {
        this.px[i] = hx + (Math.random() - 0.5) * R.w * 1.5;
        this.py[i] = R.y + R.h * (0.75 + Math.random() * 0.75);
        this.vx[i] = (Math.random() - 0.5) * 0.6; this.vy[i] = -0.3 - Math.random() * 1.1;
        this.delai[i] = 0.15 + (1 - this.hv[s0][i]) * 1.1 + Math.random() * 0.35;   // le bas s'allume d'abord, l'étoile en dernier
        this.attente++;
      } else if (this.o.intro === 'nuages' || this.o.intro === 'phrase3d') {
        // deux nuages : les particules des lettres bleues (« vous ressemble ») forment le nuage bleu, qui arrive de droite ;
        // celles des lettres bleu nuit forment le nuage noir, qui arrive de gauche. Elles gardent leur couleur jusqu'à la phrase.
        if (!this.trT) { this.trT = new Float32Array(N); this.trB = new Int8Array(N); this.trJ = new Float32Array(N); this.trK = new Float32Array(N); this.trL = new Float32Array(N); this.trS = new Float32Array(N); }
        this.trL[i] = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; this.trS[i] = 1;
        var bleu = this.o.nuageDroit ? this.o.nuageDroit(this.hc[s0][i * 3], this.hc[s0][i * 3 + 1], this.hc[s0][i * 3 + 2]) : (this.hc[s0][i * 3 + 2] - this.hc[s0][i * 3] > 90);   // IATom : critère du nuage « de droite » réglable (option nuageDroit)
        this.trB[i] = bleu ? 1 : 0;
        this.trT[i] = Math.pow(Math.random(), 0.55);                                  // plus de particules vers le centre (rubans denses)
        this.trJ[i] = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;      // écart au chemin, en cloche
        this.trK[i] = Math.random() - 0.5;                                              // petit décalage le long du chemin (pas d'alignement en traits)
        this.px[i] = bleu ? this.W + 40 : -40; this.py[i] = this.H / 2;
        this.vx[i] = 0; this.vy[i] = 0;
        if (this.o.intro === 'phrase3d') {
          this.trT[i] = 0.05 + Math.random() * 0.8;                  // départ échelonné
          this.trS[i] = 1.5 + Math.random() * 0.5;                   // durée du vol
          this.delai[i] = Math.max(this.trT[i] + this.trS[i], P3_FACE) + 0.02;
        } else {
          this.delai[i] = NUAGES_LIBRE + Math.random() * 0.7;   // les particules se détachent peu à peu des rubans pour rejoindre leur lettre
        }
        this.attente++;
      } else if (this.o.intro === 'flux') {
        // deux flux entrent par les bords gauche et droit de l'écran : bleu ciel d'un côté, doré chêne de l'autre
        var gauche = Math.random() < 0.5;
        this.px[i] = gauche ? -20 - Math.random() * this.W * 0.3 : this.W + 20 + Math.random() * this.W * 0.3;
        this.py[i] = this.H * 0.5 + (Math.random() - 0.5) * this.H * 0.3;
        this.vx[i] = (gauche ? 1 : -1) * (5 + Math.random() * 5); this.vy[i] = (Math.random() - 0.5) * 1.5;
        var cf = gauche ? FLUX_G : FLUX_D;
        for (var c2 = 0; c2 < 3; c2++) { this.coul[i * 3 + c2] = this.cDe[i * 3 + c2] = cf[c2]; }
        this.delai[i] = 1.5 + Math.random() * 1.0;     // après la rencontre et le tourbillon, chaque particule rejoint sa lettre
        this.attente++;
      } else {
        this.px[i] = hx; this.py[i] = hy; this.vx[i] = 0; this.vy[i] = 0; this.delai[i] = 0;
      }
    }
    var avecIntro = this.o.intro === 'braises' || this.o.intro === 'flux' || this.o.intro === 'nuages' || this.o.intro === 'phrase3d';
    this.modeParticules = avecIntro ? 1 : 0;
    this.modeCible = this.modeParticules;
    for (var s = 0; s < this.visImg.length; s++) { this.visImg[s] = 0; this.visCible[s] = 0; }
    if (!avecIntro) { this.visImg[s0] = this.visCible[s0] = 1; }
    this.couleursAJour = true;
    this.reveiller();
  };

  /* Passage vers une autre forme. options : etalement (s, départs échelonnés), poussiere (la matière passe par le doré chêne) */
  Sculpture.prototype.vers = function (s, opt) {
    if (!this.pret) { return; }
    opt = opt || {};
    var N = this.N, et = opt.etalement == null ? 0.8 : opt.etalement;
    for (var i = 0; i < N; i++) {
      this.suiv[i] = s;
      this.delai[i] = this.T + (opt.ordre === 'bas' ? (1 - this.hv[s][i]) * et : Math.random() * et);
    }
    this.attente = N;
    this.trans = { cible: s, poussiere: !!opt.poussiere };
    this.modeCible = 1;
    for (var k = 0; k < this.visCible.length; k++) { this.visCible[k] = 0; }
    this.reveiller();
  };

  Sculpture.prototype.reveiller = function () {
    if (!this.pret || this.tourne || !this.visible) { return; }
    this.tourne = true;
    this.dernier = performance.now();
    var self = this;
    requestAnimationFrame(function f(t) { self._image(t, f); });
  };

  Sculpture.prototype._image = function (now, f) {
    var dtms = Math.min(50, now - this.dernier);
    this.dernier = now;
    var dt = Math.max(0.25, dtms / 16.667), ds = dtms / 1000;
    this.T += ds;
    // curseur adouci, vitesse du curseur, présence (apparition rapide, disparition lente)
    if (this.relache && now > this.relache) { this.presenceCible = 0; this.relache = 0; }
    var ex = 1 - Math.pow(1 - 0.25, dt);
    var nx = this.mx + (this.cible_x - this.mx) * ex, ny = this.my + (this.cible_y - this.my) * ex;
    this.mvx += ((nx - this.mx) / dt - this.mvx) * 0.5; this.mvy += ((ny - this.my) / dt - this.mvy) * 0.5;
    this.mx = nx; this.my = ny;
    var pk = this.presenceCible > this.presence ? 0.12 : 0.04;
    this.presence += (this.presenceCible - this.presence) * (1 - Math.pow(1 - pk, dt));
    if (this.presence < 0.002 && this.presenceCible === 0) { this.presence = 0; }

    var bouge = this._simuler(dt, ds);

    // fin d'un passage : toutes les particules sont arrivées et presque immobiles → l'image nette reprend
    if (this.attente === 0 && bouge < this.N * 0.004 && this.modeCible === 1) {
      this.modeCible = 0;
      var cible = this.trans ? this.trans.cible : this.sh[0];
      this.visCible[cible] = 1;
      this.trans = null;
      if (this.o.surArrivee) { this.o.surArrivee(cible); }
    }
    var rapide = 1 - Math.pow(1 - 0.08, dt);
    this.modeParticules += (this.modeCible - this.modeParticules) * rapide;
    var calme = true;
    for (var s = 0; s < this.visImg.length; s++) {
      this.visImg[s] += (this.visCible[s] - this.visImg[s]) * rapide;
      if (Math.abs(this.visCible[s] - this.visImg[s]) > 0.004) { calme = false; } else { this.visImg[s] = this.visCible[s]; }
    }
    if (Math.abs(this.modeCible - this.modeParticules) > 0.004) { calme = false; } else { this.modeParticules = this.modeCible; }

    this._dessiner();
    var actif = this.presence > 0 || bouge > 0 || this.attente > 0 || !calme || this.couleursAJour;
    if (actif && this.visible) { requestAnimationFrame(f); } else { this.tourne = false; }
  };

  Sculpture.prototype._simuler = function (dt, ds) {
    var N = this.N, R = this._rects(), T = this.T, self = this;
    var mx = this.mx, my = this.my, pres = this.presence, mvx = this.mvx, mvy = this.mvy;
    var rayon = 70 + 0.16 * Math.min(R[0].w, R[0].h), R2 = rayon * rayon;
    var bouge = 0, attente = 0, couleurs = false;
    var masques = this.masque;
    for (var m = 0; m < masques.length; m++) { masques[m].fill(0); }
    var P = this.donP, C = this.donC;
    for (var i = 0; i < N; i++) {
      // changement de forme échelonné
      if (this.suiv[i] >= 0) {
        if (T >= this.delai[i]) {
          for (var c0 = 0; c0 < 3; c0++) { this.cDe[i * 3 + c0] = this.coul[i * 3 + c0]; }
          this.cT0[i] = T; this.sh[i] = this.suiv[i]; this.suiv[i] = -1;
          this.vx[i] += (Math.random() - 0.5) * 4; this.vy[i] += (Math.random() - 0.5) * 4;
        } else { attente++; }
      }
      var s = this.sh[i], Rs = R[s];
      var hx = Rs.x + this.hu[s][i] * Rs.w, hy = Rs.y + this.hv[s][i] * Rs.h;
      var px = this.px[i], py = this.py[i], vx = this.vx[i], vy = this.vy[i];
      var flux = this.o.intro === 'flux', nuages = this.o.intro === 'nuages', n3 = this.o.intro === 'phrase3d';
      var enAttente = (this.o.intro === 'braises' || flux || nuages || n3) && this.cT0[i] < -5 && T < this.delai[i];
      var alpha, eclat, taille = -1;
      if (enAttente) {
        attente++;
        if (n3) {
          var R3 = R[this.o.forme || 0], c3x = R3.x + R3.w / 2, c3y = R3.y + R3.h / 2, Wv = this.W;
          var lx = hx - c3x, ly = hy - c3y;
          // le plan de la phrase pivote (d'abord tourné de côté et penché) jusqu'à faire face au visiteur
          var face = lisse(0.4, P3_FACE, T), ay3 = 0.95 * (1 - face), ax3 = -0.38 * (1 - face);
          var ca = Math.cos(ay3), sa = Math.sin(ay3), cb = Math.cos(ax3), sb = Math.sin(ax3);
          var hX = lx * ca, hZ0 = -lx * sa, hY = ly * cb - hZ0 * sb, hZ = ly * sb + hZ0 * cb;
          // départ : loin sur le côté (gauche pour le noir, droite pour le bleu), à une profondeur au hasard
          var side = this.trB[i] ? 1 : -1;
          var sX = side * (Wv * 0.65 + (this.trK[i] + 0.5) * Wv * 0.45), sY = this.trJ[i] * this.H * 0.45, sZ = (this.trL[i] * 1.2 + 0.3) * Wv * 0.6;
          // point de passage : vers le centre et vers le visiteur (certaines particules frôlent l'écran)
          var mX = (sX + hX) * 0.35, mY = (sY + hY) * 0.5 - this.trK[i] * this.H * 0.25, mZ = -Wv * (0.15 + 0.45 * Math.abs(this.trL[i]));
          var pr = lisse(this.trT[i], this.trT[i] + this.trS[i], T), uu = 1 - pr;
          var X3 = uu * uu * sX + 2 * uu * pr * mX + pr * pr * hX;
          var Y3 = uu * uu * sY + 2 * uu * pr * mY + pr * pr * hY;
          var Z3 = uu * uu * sZ + 2 * uu * pr * mZ + pr * pr * hZ;
          var foc = Wv * 0.9, persp = Math.min(3, Math.max(0.25, foc / Math.max(1, foc + Z3)));
          var xk3 = c3x + X3 * persp, yk3 = c3y + Y3 * persp;
          vx = (xk3 - px) / dt; vy = (yk3 - py) / dt;
          px = xk3; py = yk3;
          taille = Math.min(3.4, Math.max(0.45, Math.pow(persp, 1.5)));
          alpha = (0.35 + 0.65 * lisse(0.3, 1.1, persp)) * lisse(0, 0.25, T - this.trT[i] + 0.25);   // le fond est voilé, le premier plan net
          eclat = lisse(1.2, 2.2, persp) * 0.6;
        } else if (nuages) {
          // chaque nuage glisse le long de son chemin : épars sur les bords de l'écran, dense et fluide au centre où il croise l'autre
          var Rn = R[this.o.forme || 0], cxn = Rn.x + Rn.w / 2, cyn = Rn.y + Rn.h / 2, Lw = Math.min(Rn.w * 0.5, this.W * 0.4);
          var b = this.trB[i], tt = this.trT[i], ch = b ? CHEMIN_BLEU : CHEMIN_NOIR;
          var avance = lisse(0, NUAGES_ARRIVEE, T);
          var sv = tt * avance + 0.015 * Math.sin(T * 1.6 + tt * 9) + this.trK[i] * (0.008 + 0.06 * Math.pow(1 - tt, 2));   // la matière continue de couler doucement
          sv = Math.min(1, Math.max(0, sv));
          var fk = sv * (ch.M - 1), k = Math.min(ch.M - 2, Math.floor(fk)), fr = fk - k;
          var cxk = ch.x[k] + (ch.x[k + 1] - ch.x[k]) * fr, cyk = ch.y[k] + (ch.y[k + 1] - ch.y[k]) * fr;
          // ruban de soie qui vrille : sa largeur varie le long du chemin (il se tord sur lui-même), et la poussière s'étale sur les bords
          var vrille = 0.3 + 0.7 * Math.abs(Math.cos(sv * 16 + T * 1.4 + (b ? 1.3 : 0)));
          var ecart = (34 * vrille + 120 * Math.pow(1 - tt, 2.2)) * this.trJ[i] * (1 + 0.2 * Math.sin(T * 2.1 + tt * 13));
          var xk = cxn + Lw * cxk + ch.nx[k] * ecart, yk = cyn + Lw * cyk + ch.ny[k] * ecart;
          vx = (xk - px) / dt; vy = (yk - py) / dt;            // vitesse gardée pour le moment où la particule se libère
          px = xk; py = yk;
          alpha = 0.3 + 0.7 * tt;                              // poussière légère sur les bords, matière pleine au centre
          eclat = (i % 17 === 0) ? 0.9 : 0;                   // quelques grains plus gros et plus clairs, comme des perles
        } else if (flux) {
          // les deux flux sont aimantés l'un par l'autre : attirés vers le centre de la phrase, ils s'y enroulent en tourbillon et se mélangent
          var Rf = R[this.o.forme || 0], cx = Rf.x + Rf.w / 2, cy = Rf.y + Rf.h / 2;
          var dx = cx - px, dy = cy - py, dd = Math.sqrt(dx * dx + dy * dy) + 1;
          vx += (dx / dd * 0.55 - dy / dd * 0.42 * Math.min(1, 260 / dd)) * dt;
          vy += (dy / dd * 0.55 + dx / dd * 0.42 * Math.min(1, 260 / dd)) * dt;
          vx += Math.sin(py * 0.02 + T * 2) * 0.12 * dt; vy += Math.cos(px * 0.02 - T * 1.7) * 0.12 * dt;
          vx *= Math.pow(0.965, dt); vy *= Math.pow(0.965, dt);
          px += vx * dt; py += vy * dt;
          alpha = 0.8; eclat = lisse(2, 12, Math.sqrt(vx * vx + vy * vy));
        } else {
          // braise qui monte doucement, en vacillant
          vx += Math.sin(T * 2.3 + i) * 0.03 * dt; vy -= 0.01 * dt;
          vx *= Math.pow(0.97, dt); vy *= Math.pow(0.97, dt);
          px += vx * dt; py += vy * dt;
          alpha = 0.35 + 0.35 * Math.sin(T * 6 + i * 1.7); eclat = 0.6;
        }
      } else {
        if (this.cT0[i] < -5 && this.o.intro === 'braises') { this.cT0[i] = -1; }
        if (this.cT0[i] < -5 && flux) { this.cT0[i] = T; }   // la couleur du flux glisse vers celle de la lettre
        if (this.cT0[i] < -5 && (nuages || n3)) { this.cT0[i] = -1; }
        var ox = px - hx, oy = py - hy, d2off = ox * ox + oy * oy;
        var ax = 0, ay = 0;
        var rx = px - mx, ry = py - my, r2 = rx * rx + ry * ry;
        var fo = pres > 0 && r2 < R2 * 9 ? Math.exp(-r2 / R2) * pres : 0;
        if (fo > 0.001) {
          var inv = 1 / Math.sqrt(r2 + 1);
          ax += rx * inv * fo * 2.1 - ry * inv * fo * 2.6 + mvx * fo * 0.14;    // poussée, tourbillon, sillage du curseur
          ay += ry * inv * fo * 2.1 + rx * inv * fo * 2.6 + mvy * fo * 0.14;
        }
        var e = Math.min(1, fo + Math.sqrt(d2off) / 140);
        if ((nuages || n3) && T < 7) { e *= 0.12; }
        if (e > 0.01) {
          // remous : un champ de courants qui évolue dans le temps
          ax += (Math.sin(py * 0.012 + T * 1.1) + 0.6 * Math.sin((px + py) * 0.021 - T * 1.7)) * e * 0.32;
          ay += (Math.cos(px * 0.011 - T * 0.9) + 0.6 * Math.cos((px - py) * 0.019 + T * 1.3)) * e * 0.32;
        }
        var k = 0.02 * this.raideur[i];
        ax -= ox * k; ay -= oy * k;
        vx += ax * dt; vy += ay * dt;
        var amort = Math.pow(0.85 + 0.07 * e, dt);
        vx *= amort; vy *= amort;
        px += vx * dt; py += vy * dt;
        var off = Math.sqrt((px - hx) * (px - hx) + (py - hy) * (py - hy));
        var vit = Math.sqrt(vx * vx + vy * vy);
        if (off < 0.25 && vit < 0.03) { px = hx; py = hy; vx = 0; vy = 0; off = 0; vit = 0; } else { bouge++; }
        alpha = Math.max(this.modeParticules, Math.min(1, off / 2.5));
        eclat = lisse(1.5, 10, vit);
        // le masque : là où la matière s'est déplacée, l'image nette laisse la place aux particules
        var mk = this.hcase[s][i], mv = Math.min(255, off * 60) | 0;
        if (mv > masques[s][mk]) { masques[s][mk] = mv; }
      }
      this.px[i] = px; this.py[i] = py; this.vx[i] = vx; this.vy[i] = vy;
      var op = this.opacite[s];
      if (taille < 0) { taille = 1 + eclat * 0.35; }
      P[i * 4] = px; P[i * 4 + 1] = py; P[i * 4 + 2] = alpha * op; P[i * 4 + 3] = Math.floor(taille * 20) + Math.min(0.99, eclat);
      // couleur : glisse vers celle de la nouvelle forme (en passant par le doré chêne si « poussière »)
      var age = T - this.cT0[i];
      if (age >= 0 && age < 1.4) {
        couleurs = true;
        var p = lisse(0, 1.2, age), bosse = this.trans && this.trans.poussiere ? Math.sin(Math.PI * p) * 0.85 : 0;
        for (var c1 = 0; c1 < 3; c1++) {
          var v = this.cDe[i * 3 + c1] + (this.hc[s][i * 3 + c1] - this.cDe[i * 3 + c1]) * p;
          v = v + (CHENE[c1] - v) * bosse;
          this.coul[i * 3 + c1] = v;
        }
      }
      C[i * 3] = this.coul[i * 3]; C[i * 3 + 1] = this.coul[i * 3 + 1]; C[i * 3 + 2] = this.coul[i * 3 + 2];
    }
    this.attente = attente;
    this.couleursAJour = couleurs;
    this.R = R;
    return bouge;
  };

  Sculpture.prototype._dessiner = function () {
    var gl = this.gl, R = this.R || this._rects();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // 1. images nettes, effacées là où la matière bouge
    gl.useProgram(this.pImg);
    var aQ = gl.getAttribLocation(this.pImg, 'aQ');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(aQ); gl.vertexAttribPointer(aQ, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(this.pImg, 'uRes'), this.W, this.H);
    gl.uniform1i(gl.getUniformLocation(this.pImg, 'uImg'), 0);
    gl.uniform1i(gl.getUniformLocation(this.pImg, 'uMasque'), 1);
    for (var s = 0; s < this.visImg.length; s++) {
      var vis = this.visImg[s] * this.opacite[s];
      if (vis < 0.003) { continue; }
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texM[s]);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.gw[s], this.gh[s], gl.LUMINANCE, gl.UNSIGNED_BYTE, this.masque[s]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[s]);
      gl.uniform4f(gl.getUniformLocation(this.pImg, 'uRect'), R[s].x, R[s].y, R[s].w, R[s].h);
      gl.uniform1f(gl.getUniformLocation(this.pImg, 'uVis'), vis);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disableVertexAttribArray(aQ);
    // 2. particules
    gl.useProgram(this.pPts);
    var aP = gl.getAttribLocation(this.pPts, 'aP'), aC = gl.getAttribLocation(this.pPts, 'aC');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufP); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.donP);
    gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufC); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.donC);
    gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC, 3, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.uniform2f(gl.getUniformLocation(this.pPts, 'uRes'), this.W, this.H);
    var sc = this.sh[0], esp = R[sc].w / this.ech[sc].gw;   // taille des particules : celle de la forme en cours
    gl.uniform1f(gl.getUniformLocation(this.pPts, 'uTaille'), Math.max(1.5, esp * 1.7 * this.dpr));
    gl.drawArrays(gl.POINTS, 0, this.N);
    gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aC);
  };

  window.Sculpture = Sculpture;
})();
