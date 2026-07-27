(function(){
"use strict";

var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromString(str){
  var h = 0;
  for(var i=0;i<str.length;i++){ h = (h<<5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}
function genBars(seedStr, n){
  var rnd = mulberry32(seedFromString(seedStr));
  var raw = [];
  for(var i=0;i<n;i++){ raw.push(0.12 + rnd()*0.88); }
  return raw.map(function(v,i){
    var a = raw[Math.max(0,i-1)], b = v, c = raw[Math.min(n-1,i+1)];
    return (a+b+b+c)/4;
  });
}
function fmtTime(sec){
  if(sec == null || isNaN(sec)) return "--:--";
  sec = Math.max(0, Math.round(sec));
  var m = Math.floor(sec/60), s = sec%60;
  return (m<10?"0":"")+m+":"+(s<10?"0":"")+s;
}
function roundRect(ctx,x,y,w,h,r){
  if(w<0){ x+=w; w=-w; }
  h = Math.max(h,1);
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

var COLOR_AMBER = "#FF3B6B", COLOR_OFF = "rgba(243,239,234,0.14)";
var COLOR_GHOST = "rgba(243,239,234,0.16)";
var ACCENT_HEX = {1:"#FF3B6B",2:"#FF3B6B",3:"#FF3B6B",4:"#FF3D1F",5:"#B9C6CE",6:"#22E6D0"};

function Waveform(canvas, bars){
  this.canvas = canvas;
  this.ctx = canvas.getContext("2d");
  this.bars = bars;
  this.dpr = Math.min(window.devicePixelRatio||1, 2);
  var self = this;
  this.onResize = null;
  this.resize();
  window.addEventListener("resize", function(){ self.resize(); });
}
Waveform.prototype.resize = function(){
  var rect = this.canvas.parentElement.getBoundingClientRect();
  this.w = rect.width; this.h = rect.height;
  this.canvas.width = Math.max(1,this.w*this.dpr);
  this.canvas.height = Math.max(1,this.h*this.dpr);
  this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  if(this.onResize) this.onResize();
};
Waveform.prototype.drawBars = function(progress, opts){
  opts = opts || {};
  var ctx=this.ctx, w=this.w, h=this.h, bars=this.bars, n=bars.length;
  ctx.clearRect(0,0,w,h);
  var gap=2, barW=(w-gap*(n-1))/n, midY=h/2;
  var onColor = opts.color || COLOR_AMBER;
  var offColor = COLOR_OFF;

  if(opts.ghost){
    ctx.save();
    ctx.setLineDash([2,3]);
    ctx.strokeStyle = COLOR_GHOST;
    ctx.lineWidth = 1;
    for(var i=0;i<n;i++){
      var barH = h*0.22;
      var x=i*(barW+gap), y=midY-barH/2;
      roundRect(ctx,x,y,barW,barH,1);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  for(var j=0;j<n;j++){
    var amp = bars[j];
    var barH = Math.max(2, amp*h*0.9);
    var x2=j*(barW+gap), y2=midY-barH/2;
    var played = (j/n) <= progress;
    ctx.fillStyle = played ? onColor : offColor;
    roundRect(ctx,x2,y2,barW,barH,1);
    ctx.fill();
  }

  var playX = progress*w;
  ctx.strokeStyle = onColor;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(playX,0); ctx.lineTo(playX,h);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
};
Waveform.prototype.drawOscilloscope = function(progress, opts){
  opts = opts || {};
  var color = opts.color || COLOR_AMBER;
  var ctx=this.ctx, w=this.w, h=this.h, bars=this.bars, n=bars.length, midY=h/2;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();
  for(var i=0;i<n;i++){
    var x = (i/(n-1))*w;
    var amp = bars[i];
    var played = (i/n) <= progress;
    var y = midY + (i%2===0?-1:1)*amp*h*0.42*(played?1:0.35);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(236,228,211,0.16)";
  ctx.lineWidth = 1;
  ctx.moveTo(0,midY); ctx.lineTo(w,midY);
  ctx.stroke();

  var playX = progress*w;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.moveTo(playX,0); ctx.lineTo(playX,h); ctx.lineWidth=1; ctx.stroke();
  ctx.globalAlpha = 1;
};

/* ============== TRACK CONTROLLER ============== */
var DEMO_SECONDS = 6.5;
var tracks = {};
var order6 = [1,2,3,4,5,6];

function buildTrack(id, mode, duration, freeze){
  var page = document.getElementById("card-"+id);
  var canvas = page.querySelector("canvas");
  var nBars = 46;
  var bars = genBars("track-"+id, nBars);
  var wf = new Waveform(canvas, bars);
  var t = {
    id:id, page:page, wf:wf, mode:mode, duration:duration, freeze:freeze,
    progress:0, playing:false, hasPlayed:false, rafId:null, startTs:0, startProgress:0,
    playBtn: page.querySelector(".mini-play"),
    curEl: page.querySelector(".cur")
  };
  wf.onResize = function(){ render(t); };
  tracks[id] = t;
  render(t);
  return t;
}

function setPlayIcon(btn, playing){
  btn.innerHTML = playing
    ? '<svg viewBox="0 0 16 16"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>'
    : '<svg viewBox="0 0 16 16"><path d="M3 1l12 7-12 7z"/></svg>';
}

function render(t){
  var opts = { color: ACCENT_HEX[t.id] || COLOR_AMBER };
  if(t.mode === "ghost"){
    t.wf.drawBars(0, {ghost:true});
  } else if(t.mode === "rebuilt"){
    t.wf.drawOscilloscope(t.progress, opts);
  } else {
    t.wf.drawBars(t.progress, opts);
  }
  if(t.curEl) t.curEl.textContent = fmtTime(t.progress*t.duration);
  updateChrome(t);
}

function stopLoop(t){
  if(t.rafId){ cancelAnimationFrame(t.rafId); t.rafId = null; }
  t.playing = false;
  setPlayIcon(t.playBtn, false);
  updateChrome(t);
  setReels(false);
}

function loop(t, ts){
  if(!t.startTs) t.startTs = ts;
  var elapsed = (ts - t.startTs)/1000;
  var virtualElapsed = t.startProgress*t.duration + elapsed*(t.duration/DEMO_SECONDS);
  var progress = Math.min(1, virtualElapsed/t.duration);
  var targetCap = (t.mode === "cut") ? t.freeze : 1;

  if(progress >= targetCap){
    t.progress = targetCap;
    render(t);
    stopLoop(t);
    return;
  }
  t.progress = progress;
  render(t);
  t.rafId = requestAnimationFrame(function(ts2){ loop(t, ts2); });
}

function startTrack(t){
  if(t.mode === "ghost"){
    t.page.classList.remove("attempting");
    void t.page.offsetWidth;
    t.page.classList.add("attempting");
    setTimeout(function(){ t.page.classList.remove("attempting"); }, 950);
    return;
  }
  stopLoop(t);
  t.progress = 0;
  t.startTs = 0;
  t.startProgress = 0;
  t.playing = true;
  setPlayIcon(t.playBtn, true);
  updateChrome(t);
  setReels(true);
  t.rafId = requestAnimationFrame(function(ts){ loop(t, ts); });
}

function setReels(spin){
  document.getElementById("reel1").classList.toggle("spin", spin);
  document.getElementById("reel2").classList.toggle("spin", spin);
}

var NAMES = {1:"Demo, 2023",2:"(sin título)",3:"(sin título)",4:"Apertura Digital",5:"Sin título — fecha por definir",6:"Cómo"};
var activeTrackId = 1;

function updateChrome(t){
  if(t.id !== activeTrackId) return;
  var trackEl = document.getElementById("lcd-track");
  var timeEl = document.getElementById("lcd-time");
  trackEl.textContent = (t.id<10?"0":"")+t.id+" — "+NAMES[t.id].toUpperCase();
  timeEl.textContent = (t.mode==="ghost") ? "--:-- / --:--" : (fmtTime(t.progress*t.duration)+" / "+fmtTime(t.duration));
  setPlayIcon(document.getElementById("btn-play"), t.playing);
}

function setCrateActive(id){
  var row = document.getElementById("crate-row");
  if(!row) return;
  row.querySelectorAll(".sleeve").forEach(function(s){
    var sid = parseInt(s.dataset.goto,10);
    if(sid === id){
      if(!s.classList.contains("active")){
        s.classList.add("active","entering");
        setTimeout(function(){ s.classList.remove("entering"); }, 460);
      }
    } else if(s.classList.contains("active")){
      s.classList.remove("active");
      s.classList.add("leaving");
      setTimeout(function(){ s.classList.remove("leaving"); }, 360);
    }
  });
}

function setActiveChrome(id){
  activeTrackId = id;
  setCrateActive(id);
  var t = tracks[id];
  if(t) updateChrome(t);
  document.body.dataset.theme = (id === 6) ? "rebuilt-active" : "";
  var accentByTrack = {0:"",1:"",2:"",3:"",4:"alarm",5:"void",6:"teal"};
  document.body.dataset.accent = accentByTrack[id] || "";
  if(window.__shapeBlur) window.__shapeBlur.setColor(ACCENT_FULL[accentByTrack[id] || "warm"]);
}

var ACCENT_FULL = { warm:"#FF3B6B", alarm:"#FF3D1F", void:"#B9C6CE", teal:"#22E6D0" };

/* ============== CARDSWAP-STYLE STACK ============== */
var STACK_IDS = [0,1,2,3,4,5,6];
var order = STACK_IDS.slice();
var cardEls = {};
var MAX_VISIBLE_DEPTH = 4;
var CARD_DIST_X = 9, CARD_DIST_Y = 13, SKEW_DEG = 3;

function slotFor(depth){
  var d = Math.min(depth, MAX_VISIBLE_DEPTH);
  return { x: d*CARD_DIST_X, y: -d*CARD_DIST_Y, z: -d*CARD_DIST_X*3, zIndex: 50-d, depth:d };
}
function applySlot(el, slot, skew, instant){
  if(instant) el.style.transition = "none";
  el.style.setProperty("--depth", slot.depth);
  el.style.zIndex = slot.zIndex;
  el.style.transform = "translate3d("+slot.x+"px,"+slot.y+"px,"+slot.z+"px) skewY("+skew+"deg)";
  if(instant){ void el.offsetWidth; el.style.transition = ""; }
}
function layoutStackInstant(){
  order.forEach(function(id, i){
    var el = cardEls[id];
    el.classList.toggle("card-front", i===0);
    var slot = slotFor(i);
    applySlot(el, slot, SKEW_DEG, true);
    el.classList.toggle("hidden-deep", i >= MAX_VISIBLE_DEPTH);
  });
}

/* ============== AUTO-AVANCE NATURAL ============== */
/* el track pasa solo, como en el CardSwap de referencia (setInterval), en vez
   de depender de que el usuario oprima "siguiente" o busque en las sleeves.
   Se reprograma en cada goTo() (manual o automático); se detiene en el track 6
   (fin de la narrativa, no hace loop) y se pausa mientras se edita el texto. */
var AUTO_DELAY = 6800;
var autoTimer = null;
var editingActive = false;

function clearAutoTimer(){ if(autoTimer){ clearTimeout(autoTimer); autoTimer = null; } }

function scheduleAuto(id){
  clearAutoTimer();
  if(editingActive) return;
  if(id === 0 || id === 6) return;
  var idx = order6.indexOf(id);
  if(idx < 0 || idx >= order6.length-1) return;
  autoTimer = setTimeout(function(){
    if(!editingActive) goTo(order6[idx+1]);
  }, AUTO_DELAY);
}

/* goTo() confirma el nuevo orden de inmediato (no espera a que termine la
   animación) — así nunca puede quedar "trabado": si una animación anterior
   se retrasa (pestaña en segundo plano, throttling del navegador), un nuevo
   goTo() igual se ejecuta sobre el estado lógico ya actualizado. Antes esto
   dependía de una bandera `swapping` que se liberaba recién a los 900ms;
   si ese timeout no llegaba a disparar nunca (tab en background) quedaba
   todo congelado para siempre — con este enfoque eso ya no puede pasar. */
/* token de secuencia: si un goTo() nuevo arranca mientras los setTimeout
   escalonados de uno anterior todavía están pendientes (dos clics rápidos,
   o una auto-avance que se solapa con un clic manual), los callbacks viejos
   se detectan a sí mismos como obsoletos y no tocan el DOM — así nunca dos
   cards quedan marcadas como "frente" a la vez. */
var transitionSeq = 0;

function goTo(targetId){
  var curFront = order[0];
  if(curFront === targetId){ return; }
  clearAutoTimer();
  var mySeq = ++transitionSeq;

  var oldFrontEl = cardEls[curFront];
  var others = order.filter(function(id){ return id!==targetId && id!==curFront; });
  var newOrder = [targetId].concat(others).concat([curFront]);
  order = newOrder;

  setActiveChrome(targetId);
  var t = tracks[targetId];
  if(t){
    if(!t.hasPlayed){ t.hasPlayed = true; setTimeout(function(){ startTrack(t); }, 260); }
  }
  if(targetId === 4){ triggerGlitch(); }

  oldFrontEl.classList.remove("card-front");
  oldFrontEl.style.transition = "transform 420ms cubic-bezier(.5,0,.85,.35)";
  oldFrontEl.style.transform = "translate3d(0px,360px,40px) skewY(0deg) scale(.94)";

  newOrder.forEach(function(id, i){
    if(id === curFront) return;
    var el = cardEls[id];
    var slot = slotFor(i);
    setTimeout(function(){
      if(mySeq !== transitionSeq) return;
      el.classList.remove("hidden-deep");
      el.style.zIndex = slot.zIndex;
      el.style.setProperty("--depth", slot.depth);
      el.style.transition = "transform 520ms cubic-bezier(.22,1.56,.4,1)";
      el.style.transform = "translate3d("+slot.x+"px,"+slot.y+"px,"+slot.z+"px) skewY("+SKEW_DEG+"deg)";
      el.classList.toggle("card-front", i===0);
    }, i*70);
  });

  var backIdx = newOrder.indexOf(curFront);
  var backSlot = slotFor(backIdx);
  setTimeout(function(){
    if(mySeq !== transitionSeq) return;
    oldFrontEl.style.zIndex = backSlot.zIndex;
    oldFrontEl.style.setProperty("--depth", backSlot.depth);
    oldFrontEl.style.transition = "transform 480ms cubic-bezier(.22,1.56,.4,1)";
    oldFrontEl.style.transform = "translate3d("+backSlot.x+"px,"+backSlot.y+"px,"+backSlot.z+"px) skewY("+SKEW_DEG+"deg)";
    if(backIdx >= MAX_VISIBLE_DEPTH) oldFrontEl.classList.add("hidden-deep");
  }, 380);

  scheduleAuto(targetId);
}

function triggerGlitch(){
  var bezel = document.getElementById("screen-bezel");
  var flash = document.getElementById("screen-flash");
  bezel.classList.add("screen-shake","glitching");
  flash.classList.add("hit");
  setTimeout(function(){ bezel.classList.remove("screen-shake","glitching"); }, 620);
  setTimeout(function(){ flash.classList.remove("hit"); }, 400);
}

function initNav(){
  document.querySelectorAll("[data-goto]").forEach(function(btn){
    btn.addEventListener("click", function(){ goTo(parseInt(btn.getAttribute("data-goto"),10)); });
  });
  document.querySelectorAll("[data-play]").forEach(function(btn){
    btn.addEventListener("click", function(){
      startTrack(tracks[parseInt(btn.getAttribute("data-play"),10)]);
    });
  });
  document.getElementById("btn-start").addEventListener("click", function(){ goTo(1); });
  document.getElementById("btn-play").addEventListener("click", function(){
    var t = tracks[activeTrackId];
    if(t) startTrack(t);
  });
  document.getElementById("btn-prev").addEventListener("click", function(){
    var idx = order6.indexOf(activeTrackId);
    goTo(idx <= 0 ? 0 : order6[idx-1]);
  });
  document.getElementById("btn-next").addEventListener("click", function(){
    var idx = order6.indexOf(activeTrackId);
    if(idx < order6.length-1) goTo(order6[idx+1]);
  });
}

/* ============== GLASSSURFACE (SVG feDisplacementMap + backdrop-filter) ============== */
function supportsSVGBackdropFilter(){
  var ua = navigator.userAgent;
  var isWebkit = /Safari/.test(ua) && !/Chrome/.test(ua);
  var isFirefox = /Firefox/.test(ua);
  if(isWebkit || isFirefox) return false;
  var div = document.createElement("div");
  div.style.backdropFilter = "url(#test-glass-filter)";
  return div.style.backdropFilter !== "";
}

function initGlassSurface(container, opts){
  opts = opts || {};
  var borderWidth = opts.borderWidth != null ? opts.borderWidth : 0.09;
  var brightness = opts.brightness != null ? opts.brightness : 46;
  var opacity = opts.opacity != null ? opts.opacity : 0.22;
  var blur = opts.blur != null ? opts.blur : 3;
  var borderRadius = opts.borderRadius != null ? opts.borderRadius : 7;
  var distortionScale = opts.distortionScale != null ? opts.distortionScale : -34;
  var redOffset = opts.redOffset != null ? opts.redOffset : 0;
  var greenOffset = opts.greenOffset != null ? opts.greenOffset : 3;
  var blueOffset = opts.blueOffset != null ? opts.blueOffset : 6;
  var mixBlendMode = opts.mixBlendMode || "difference";
  var stdDev = opts.displace != null ? opts.displace : 0.3;

  var layer = document.createElement("div");
  layer.className = "glass-layer";
  container.appendChild(layer);

  if(!supportsSVGBackdropFilter()){
    layer.classList.add("fallback");
    return { update:function(){} };
  }

  var uid = "gs" + Math.floor(Math.random()*1e9) + "-" + Math.floor(Math.random()*1e9);
  var filterId = "glass-filter-"+uid, redGradId="rg-"+uid, blueGradId="bg-"+uid;

  var svgNS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(svgNS,"svg");
  svg.setAttribute("width","0"); svg.setAttribute("height","0");
  svg.style.position = "absolute";
  var defs = document.createElementNS(svgNS,"defs");
  var filter = document.createElementNS(svgNS,"filter");
  filter.setAttribute("id", filterId);
  filter.setAttribute("color-interpolation-filters","sRGB");
  filter.setAttribute("x","0%"); filter.setAttribute("y","0%");
  filter.setAttribute("width","100%"); filter.setAttribute("height","100%");

  var feImage = document.createElementNS(svgNS,"feImage");
  feImage.setAttribute("x","0"); feImage.setAttribute("y","0");
  feImage.setAttribute("width","100%"); feImage.setAttribute("height","100%");
  feImage.setAttribute("preserveAspectRatio","none"); feImage.setAttribute("result","map");

  function dispMap(resultName){
    var d = document.createElementNS(svgNS,"feDisplacementMap");
    d.setAttribute("in","SourceGraphic"); d.setAttribute("in2","map"); d.setAttribute("result",resultName);
    d.setAttribute("xChannelSelector","R"); d.setAttribute("yChannelSelector","G");
    return d;
  }
  function colorMatrix(inName, values, resultName){
    var c = document.createElementNS(svgNS,"feColorMatrix");
    c.setAttribute("in", inName); c.setAttribute("type","matrix");
    c.setAttribute("values", values); c.setAttribute("result", resultName);
    return c;
  }
  var dispRed = dispMap("dispRed");
  var colorRed = colorMatrix("dispRed","1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0","red");
  var dispGreen = dispMap("dispGreen");
  var colorGreen = colorMatrix("dispGreen","0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0","green");
  var dispBlue = dispMap("dispBlue");
  var colorBlue = colorMatrix("dispBlue","0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0","blue");

  var blend1 = document.createElementNS(svgNS,"feBlend");
  blend1.setAttribute("in","red"); blend1.setAttribute("in2","green"); blend1.setAttribute("mode","screen"); blend1.setAttribute("result","rg");
  var blend2 = document.createElementNS(svgNS,"feBlend");
  blend2.setAttribute("in","rg"); blend2.setAttribute("in2","blue"); blend2.setAttribute("mode","screen"); blend2.setAttribute("result","output");
  var gblur = document.createElementNS(svgNS,"feGaussianBlur");
  gblur.setAttribute("in","output"); gblur.setAttribute("stdDeviation", String(stdDev));

  [feImage,dispRed,colorRed,dispGreen,colorGreen,dispBlue,colorBlue,blend1,blend2,gblur].forEach(function(n){ filter.appendChild(n); });
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);

  layer.style.backdropFilter = "url(#"+filterId+") saturate(1.3)";
  layer.style.webkitBackdropFilter = "url(#"+filterId+") saturate(1.3)";

  function updateMap(){
    var rect = container.getBoundingClientRect();
    var w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    var edge = Math.min(w,h) * (borderWidth*0.5);
    var svgStr =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'">' +
      '<defs>' +
      '<linearGradient id="'+redGradId+'" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>' +
      '<linearGradient id="'+blueGradId+'" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="black"/>' +
      '<rect x="0" y="0" width="'+w+'" height="'+h+'" rx="'+borderRadius+'" fill="url(#'+redGradId+')"/>' +
      '<rect x="0" y="0" width="'+w+'" height="'+h+'" rx="'+borderRadius+'" fill="url(#'+blueGradId+')" style="mix-blend-mode:'+mixBlendMode+'"/>' +
      '<rect x="'+edge+'" y="'+edge+'" width="'+(w-edge*2)+'" height="'+(h-edge*2)+'" rx="'+borderRadius+'" fill="hsl(0 0% '+brightness+'% / '+opacity+')" style="filter:blur('+blur+'px)"/>' +
      '</svg>';
    var dataUri = "data:image/svg+xml," + encodeURIComponent(svgStr);
    feImage.setAttribute("href", dataUri);
    feImage.setAttributeNS("http://www.w3.org/1999/xlink","href", dataUri);
    [[dispRed,redOffset],[dispGreen,greenOffset],[dispBlue,blueOffset]].forEach(function(pair){
      pair[0].setAttribute("scale", String(distortionScale + pair[1]));
    });
  }
  updateMap();
  if(window.ResizeObserver){
    var ro = new ResizeObserver(function(){ updateMap(); });
    ro.observe(container);
  } else {
    window.addEventListener("resize", updateMap);
  }
  return { update: updateMap };
}

/* ============== SHAPEBLUR (three.js, vanilla) ============== */
var SHAPEBLUR_VERT = [
"varying vec2 v_texcoord;",
"void main() {",
"  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
"  v_texcoord = uv;",
"}"
].join("\n");

var SHAPEBLUR_FRAG = [
"varying vec2 v_texcoord;",
"uniform vec2 u_mouse;",
"uniform vec2 u_resolution;",
"uniform float u_pixelRatio;",
"uniform float u_shapeSize;",
"uniform float u_roundness;",
"uniform float u_borderSize;",
"uniform float u_circleSize;",
"uniform float u_circleEdge;",
"uniform vec3 u_color;",
"#ifndef PI",
"#define PI 3.1415926535897932384626433832795",
"#endif",
"#ifndef TWO_PI",
"#define TWO_PI 6.2831853071795864769252867665590",
"#endif",
"#ifndef VAR",
"#define VAR 0",
"#endif",
"vec2 coord(in vec2 p) {",
"  p = p / u_resolution.xy;",
"  if (u_resolution.x > u_resolution.y) {",
"    p.x *= u_resolution.x / u_resolution.y;",
"    p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;",
"  } else {",
"    p.y *= u_resolution.y / u_resolution.x;",
"    p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;",
"  }",
"  p -= 0.5; p *= vec2(-1.0, 1.0);",
"  return p;",
"}",
"#define st0 coord(gl_FragCoord.xy)",
"#define mx coord(u_mouse * u_pixelRatio)",
"float sdRoundRect(vec2 p, vec2 b, float r) {",
"  vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);",
"  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;",
"}",
"float sdCircle(in vec2 st, in vec2 center) { return length(st - center) * 2.0; }",
"float sdPoly(in vec2 p, in float w, in int sides) {",
"  float a = atan(p.x, p.y) + PI;",
"  float r = TWO_PI / float(sides);",
"  float d = cos(floor(0.5 + a / r) * r - a) * length(max(abs(p) * 1.0, 0.0));",
"  return d * 2.0 - w;",
"}",
"float aastep(float threshold, float value) {",
"  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;",
"  return smoothstep(threshold - afwidth, threshold + afwidth, value);",
"}",
"float fill(in float x) { return 1.0 - aastep(0.0, x); }",
"float fill(float x, float size, float edge) { return 1.0 - smoothstep(size - edge, size + edge, x); }",
"float strokeAA(float x, float size, float w, float edge) {",
"  float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;",
"  float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + w * 0.5)",
"          - smoothstep(size - edge - afwidth, size + edge + afwidth, x - w * 0.5);",
"  return clamp(d, 0.0, 1.0);",
"}",
"void main() {",
"  vec2 st = st0 + 0.5;",
"  vec2 posMouse = mx * vec2(1., -1.) + 0.5;",
"  float size = u_shapeSize;",
"  float roundness = u_roundness;",
"  float borderSize = u_borderSize;",
"  float circleSize = u_circleSize;",
"  float circleEdge = u_circleEdge;",
"  float sdfCircle = fill(sdCircle(st, posMouse), circleSize, circleEdge);",
"  float sdf;",
"  if (VAR == 0) {",
"    sdf = sdRoundRect(st, vec2(size), roundness);",
"    sdf = strokeAA(sdf, 0.0, borderSize, sdfCircle) * 4.0;",
"  } else if (VAR == 1) {",
"    sdf = sdCircle(st, vec2(0.5));",
"    sdf = fill(sdf, 0.6, sdfCircle) * 1.2;",
"  } else if (VAR == 2) {",
"    sdf = sdCircle(st, vec2(0.5));",
"    sdf = strokeAA(sdf, 0.58, 0.02, sdfCircle) * 4.0;",
"  } else if (VAR == 3) {",
"    sdf = sdPoly(st - vec2(0.5, 0.45), 0.3, 3);",
"    sdf = fill(sdf, 0.05, sdfCircle) * 1.4;",
"  }",
"  float alpha = sdf;",
"  gl_FragColor = vec4(u_color.rgb, alpha);",
"}"
].join("\n");

function hexToVec3(hex){
  hex = hex.replace("#","");
  var r = parseInt(hex.substring(0,2),16)/255;
  var g = parseInt(hex.substring(2,4),16)/255;
  var b = parseInt(hex.substring(4,6),16)/255;
  return [r,g,b];
}

function initShapeBlur(){
  var canvas = document.getElementById("shapeblur-canvas");
  if(!window.THREE || !canvas) return null;
  var renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas:canvas, alpha:true, antialias:false, powerPreference:"low-power" });
  } catch(e){ return null; }
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera();
  camera.position.z = 1;

  var vMouse = new THREE.Vector2(window.innerWidth/2, window.innerHeight/2);
  var vMouseDamp = vMouse.clone();
  var vResolution = new THREE.Vector2();
  var uColorInit = hexToVec3(ACCENT_FULL.warm);
  var uColor = new THREE.Vector3(uColorInit[0], uColorInit[1], uColorInit[2]);
  var targetColor = uColor.clone();

  var material = new THREE.ShaderMaterial({
    vertexShader: SHAPEBLUR_VERT,
    fragmentShader: SHAPEBLUR_FRAG,
    uniforms:{
      u_mouse:{ value:vMouseDamp },
      u_resolution:{ value:vResolution },
      u_pixelRatio:{ value: Math.min(window.devicePixelRatio||1,2) },
      u_shapeSize:{ value:1.08 },
      u_roundness:{ value:0.42 },
      u_borderSize:{ value:0.09 },
      u_circleSize:{ value:0.55 },
      u_circleEdge:{ value:1.1 },
      u_color:{ value:uColor }
    },
    defines:{ VAR:0 },
    transparent:true
  });
  var quad = new THREE.Mesh(new THREE.PlaneGeometry(1,1), material);
  scene.add(quad);

  function resize(){
    var w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio||1,2);
    renderer.setSize(w,h);
    renderer.setPixelRatio(dpr);
    camera.left=-w/2; camera.right=w/2; camera.top=h/2; camera.bottom=-h/2;
    camera.updateProjectionMatrix();
    quad.scale.set(w,h,1);
    vResolution.set(w,h).multiplyScalar(dpr);
    material.uniforms.u_pixelRatio.value = dpr;
  }
  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("mousemove", function(e){ vMouse.set(e.clientX, e.clientY); });
  document.addEventListener("pointermove", function(e){ vMouse.set(e.clientX, e.clientY); });

  var lastT = 0;
  function tick(tsMs){
    var t = tsMs*0.001;
    var dt = Math.min(0.1, t-lastT || 0);
    lastT = t;
    vMouseDamp.x = THREE.MathUtils.damp(vMouseDamp.x, vMouse.x, 6, dt);
    vMouseDamp.y = THREE.MathUtils.damp(vMouseDamp.y, vMouse.y, 6, dt);
    uColor.x = THREE.MathUtils.damp(uColor.x, targetColor.x, 4, dt);
    uColor.y = THREE.MathUtils.damp(uColor.y, targetColor.y, 4, dt);
    uColor.z = THREE.MathUtils.damp(uColor.z, targetColor.z, 4, dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    setColor: function(hex){
      var c = hexToVec3(hex);
      targetColor.set(c[0], c[1], c[2]);
    }
  };
}

/* ============== DEVICE PARALLAX / DRAG-ROTATE (simula ModelViewer) ============== */
function initDeviceMotion(){
  var stage = document.getElementById("device-stage");
  var device = document.getElementById("device");
  if(!stage || !device || reduced) return;

  var tiltX = 0, tiltY = 0, velX = 0, velY = 0;
  var dragging = false, pending = false, lastX = 0, lastY = 0, downX = 0, downY = 0, downId = null, inertiaId = null;
  var DRAG_THRESHOLD = 6;

  function apply(){
    device.style.setProperty("--tiltX", tiltX.toFixed(2)+"deg");
    device.style.setProperty("--tiltY", tiltY.toFixed(2)+"deg");
    device.style.setProperty("--sheen-angle", (120 + tiltY*3).toFixed(1)+"deg");
  }

  document.addEventListener("mousemove", function(e){
    if(dragging) return;
    var rect = stage.getBoundingClientRect();
    var cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    var dx = (e.clientX - cx) / (rect.width/2 || 1);
    var dy = (e.clientY - cy) / (rect.height/2 || 1);
    tiltY = clamp(dx*7, -7, 7);
    tiltX = clamp(-dy*7, -7, 7);
    apply();
  });

  /* Solo empieza a "arrastrar para rotar" si el puntero se mueve más de
     DRAG_THRESHOLD px antes de soltar — así un clic normal en cualquier
     botón del chasis (play, sleeves, prev/next) sigue funcionando como clic. */
  device.addEventListener("pointerdown", function(e){
    if(e.pointerType === "mouse" && e.button !== 0) return;
    pending = true; dragging = false;
    if(inertiaId) cancelAnimationFrame(inertiaId);
    downX = lastX = e.clientX; downY = lastY = e.clientY;
    downId = e.pointerId;
    velX = 0; velY = 0;
  });
  device.addEventListener("pointermove", function(e){
    if(!pending || e.pointerId !== downId) return;
    if(!dragging){
      var totalDx = e.clientX - downX, totalDy = e.clientY - downY;
      if(Math.sqrt(totalDx*totalDx + totalDy*totalDy) < DRAG_THRESHOLD) return;
      dragging = true;
      device.classList.add("dragging");
      try{ device.setPointerCapture(downId); }catch(err){}
    }
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velY = dx*0.35; velX = -dy*0.35;
    tiltY = clamp(tiltY + dx*0.35, -48, 48);
    tiltX = clamp(tiltX - dy*0.35, -32, 32);
    apply();
  });
  function endDrag(e){
    if(e && e.pointerId !== downId) return;
    pending = false;
    if(!dragging) return;
    dragging = false;
    device.classList.remove("dragging");
    inertiaLoop();
  }
  device.addEventListener("pointerup", endDrag);
  device.addEventListener("pointercancel", endDrag);

  function inertiaLoop(){
    velX *= 0.92; velY *= 0.92;
    tiltY = clamp(tiltY + velY, -48, 48);
    tiltX = clamp(tiltX + velX, -32, 32);
    apply();
    if(Math.abs(velX) > 0.03 || Math.abs(velY) > 0.03){
      inertiaId = requestAnimationFrame(inertiaLoop);
    } else {
      device.style.transition = "transform 700ms cubic-bezier(.22,1,.36,1), background 1000ms ease";
      tiltX = clamp(tiltX, -7, 7); tiltY = clamp(tiltY, -7, 7);
      apply();
      setTimeout(function(){ device.style.transition = ""; }, 720);
    }
  }
  apply();
}

/* ============== MODO EDICIÓN + EXPORTAR ============== */
var EDITABLE_SELECTOR = ".t-copy p, .t-copy .tag, .t-head h2, .track-card.intro h1 .l1, .track-card.intro h1 .l2, .track-card.intro .sub, .brand b";

function initEditMode(){
  var toggleBtn = document.getElementById("btn-edit-toggle");
  var exportBtn = document.getElementById("btn-export");
  var editing = false;
  var everEdited = false;

  toggleBtn.addEventListener("click", function(){
    editing = !editing;
    editingActive = editing;
    if(editing) clearAutoTimer(); else scheduleAuto(activeTrackId);
    document.querySelectorAll(EDITABLE_SELECTOR).forEach(function(el){
      el.setAttribute("contenteditable", editing ? "true" : "false");
      el.classList.toggle("editable-active", editing);
    });
    toggleBtn.textContent = editing ? "✓ listo" : "✎ editar texto";
    toggleBtn.classList.toggle("on", editing);
    if(editing) everEdited = true;
    exportBtn.style.display = (!editing && everEdited) ? "inline-block" : "none";
  });

  exportBtn.addEventListener("click", function(){
    document.querySelectorAll(EDITABLE_SELECTOR).forEach(function(el){
      el.removeAttribute("contenteditable");
      el.classList.remove("editable-active");
    });
    var clone = document.documentElement.cloneNode(true);
    var htmlOut = "<!doctype html>\n" + clone.outerHTML;
    var blob = new Blob([htmlOut], { type:"text/html" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "discografia-incompleta-editado.html";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 400);
  });
}

/* ============== PARALLAX DEL CUARTO DE FONDO ============== */
function initRoomParallax(){
  var wraps = document.querySelectorAll(".prop-parallax");
  if(!wraps.length || reduced) return;
  document.addEventListener("mousemove", function(e){
    var dx = (e.clientX / window.innerWidth) - 0.5;
    var dy = (e.clientY / window.innerHeight) - 0.5;
    wraps.forEach(function(w){
      var depth = parseFloat(w.dataset.depth) || 0.5;
      var mx = dx * depth * 34, my = dy * depth * 22;
      w.style.transform = "translate3d("+mx.toFixed(1)+"px,"+my.toFixed(1)+"px,0)";
    });
  });
}

document.addEventListener("DOMContentLoaded", function(){
  STACK_IDS.forEach(function(id){ cardEls[id] = document.getElementById("card-"+id); });
  layoutStackInstant();

  buildTrack(1, "complete", 178, null);
  buildTrack(2, "cut", 221, 0.42);
  buildTrack(3, "cut", 252, 0.61);
  buildTrack(4, "cut", 107, 0.35);
  buildTrack(5, "ghost", null, null);
  buildTrack(6, "rebuilt", 204, null);

  initNav();
  initRoomParallax();
  initGlassSurface(document.getElementById("glass-cover"));
  window.__shapeBlur = initShapeBlur();
  initDeviceMotion();
  initEditMode();
  updateChrome(tracks[1]);
});
})();
