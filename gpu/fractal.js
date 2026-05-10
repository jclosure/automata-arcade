// gpu/fractal.js — GPU-accelerated fractal explorer (Mandelbrot + Julia)
// Provides window.FractalEngine. Load before app.js.

(function () {
'use strict';

// ─── Shaders ─────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// 6 cosine-palette presets: Electric / Ember / Ice / Cosmic / Neon / Void
const PAL_GLSL = `
vec3 _pal(float t, int s) {
  t = fract(t);
  vec3 a, b, c, d;
  if      (s==0){a=vec3(.5,.5,.5);  b=vec3(.5,.5,.5);  c=vec3(1.,1.,1.);   d=vec3(.00,.33,.67);}
  else if (s==1){a=vec3(.5,.2,.1);  b=vec3(.5,.25,.1); c=vec3(1.,.85,.5);  d=vec3(.00,.10,.20);}
  else if (s==2){a=vec3(.15,.3,.5); b=vec3(.2,.25,.4); c=vec3(.8,.55,1.);  d=vec3(.00,.05,.25);}
  else if (s==3){a=vec3(.5,.5,.5);  b=vec3(.5,.5,.5);  c=vec3(2.,1.,0.);   d=vec3(.50,.20,.25);}
  else if (s==4){a=vec3(.1,.5,.3);  b=vec3(.5,.4,.5);  c=vec3(1.,.7,.3);   d=vec3(.00,.15,.67);}
  else          {a=vec3(.06,0.,.16);b=vec3(.4,.1,.5);  c=vec3(.5,1.,.4);   d=vec3(.10,.00,.33);}
  return clamp(a + b * cos(6.28318 * (c * t + d)), 0., 1.);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform vec2  uCenter;
uniform float uZoom;
uniform int   uType;       // 0 = Mandelbrot, 1 = Julia
uniform vec2  uJC;         // Julia C parameter
uniform int   uMaxIter;
uniform float uShift;      // palette animation phase
uniform int   uScheme;     // palette index 0–5
uniform int   uDrawMode;   // 0 = smooth escape, 1 = orbit trap

out vec4 fragColor;

${PAL_GLSL}

void main() {
  // Screen pixel → complex plane (WebGL Y-up compensated)
  vec2 p = (gl_FragCoord.xy - uRes * 0.5) / uZoom;
  p.y = -p.y;
  p += uCenter;

  vec2 c = (uType == 0) ? p          : uJC;
  vec2 z = (uType == 0) ? vec2(0.0)  : p;

  float iter = 0.0;
  float minO = 1e6;   // orbit trap: distance to origin
  float minR = 1e6;   // orbit trap: |Re z|
  float minI = 1e6;   // orbit trap: |Im z|

  for (int i = 0; i < 1024; i++) {
    if (i >= uMaxIter) break;
    z = vec2(z.x*z.x - z.y*z.y + c.x,  2.0*z.x*z.y + c.y);
    if (dot(z, z) > 1e8) break;
    iter += 1.0;
    minO = min(minO, length(z));
    minR = min(minR, abs(z.x));
    minI = min(minI, abs(z.y));
  }

  bool inside = (iter >= float(uMaxIter));
  vec3 col;

  if (uDrawMode == 0) {
    // ── Smooth escape-time coloring ───────────────────────────────────────────
    if (inside) {
      col = vec3(0.0);
    } else {
      // Bernard/Quilez smooth-n formula
      float logr  = log(dot(z, z)) * 0.5;
      float nu    = log(logr / 0.6931472) / 0.6931472;
      float sn    = iter + 1.0 - nu;
      // 4 colour cycles across depth + animated shift
      float t = fract(sn * (4.0 / float(uMaxIter)) + uShift);
      col = _pal(t, uScheme);
      // Edge glow: brighter just outside the boundary, darker deep exterior
      float edge = clamp((float(uMaxIter) - iter) / 14.0, 0.0, 1.0);
      col = mix(col * 0.2, col, sqrt(edge));
      col = pow(col, vec3(0.82));
    }
  } else {
    // ── Orbit trap coloring: reveals internal symmetry & structure ────────────
    float t1 = fract(minO * 1.1  + uShift);
    float t2 = fract(minR * 1.6  + uShift + 0.33);
    float t3 = fract(minI * 1.6  + uShift + 0.67);
    col = _pal(t1, uScheme)               * 0.50
        + _pal(t2, (uScheme + 2) % 6)    * 0.30
        + _pal(t3, (uScheme + 4) % 6)    * 0.30;
    col = clamp(col, 0.0, 1.0);
    // Interior: very dark with faint inner structure visible
    if (inside) col *= 0.05;
  }

  // Soft vignette — keeps focus on the centre of the view
  vec2 vp = (gl_FragCoord.xy / uRes - 0.5) * 2.0;
  float vig = 1.0 - 0.35 * dot(vp, vp);
  col *= max(0.0, vig);

  fragColor = vec4(col, 1.0);
}`;

// ─── GL helpers ───────────────────────────────────────────────────────────────

function _compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('[FractalEngine] ' + err + '\n' +
      src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'));
  }
  return s;
}

function _link(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, _compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, _compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error('[FractalEngine] Link: ' + gl.getProgramInfoLog(p));
  return p;
}

function _ul(gl, prog, name) {
  if (!prog._u) prog._u = {};
  if (!(name in prog._u)) prog._u[name] = gl.getUniformLocation(prog, name);
  return prog._u[name];
}

function _su(gl, prog, name, val) {
  const loc = _ul(gl, prog, name);
  if (loc === null) return;
  if (typeof val === 'number')  gl.uniform1f(loc, val);
  else if (Number.isInteger(val)) gl.uniform1i(loc, val);
  else if (val.length === 2)    gl.uniform2f(loc, val[0], val[1]);
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _gl = null, _canvas = null, _prog = null, _quad = null;
let _cx = -0.5, _cy = 0.0, _zoom = 200;
let _type     = 0;                         // 0 = Mandelbrot, 1 = Julia
let _jcR      = -0.7269, _jcI = 0.1889;   // Julia C
let _maxIter  = 256;
let _scheme   = 0;
let _drawMode = 0;                         // 0 = smooth, 1 = orbit trap
let _shift    = 0.0;
let _animating   = false;
let _animSpeed   = 0.3;
let _animAngle   = 0.0;
let _animCR = -0.1, _animCI = 0.651, _animRadius = 0.3;
let _lastT = 0;

function _initGL() {
  if (_gl) return true;
  _canvas = document.createElement('canvas');
  const ctx = _canvas.getContext('webgl2');
  if (!ctx) { console.error('[FractalEngine] WebGL 2 not available'); return false; }
  _gl = ctx;
  try { _prog = _link(_gl, VERT, FRAG); } catch (e) { console.error(e); _gl = null; return false; }
  const buf = _gl.createBuffer();
  _gl.bindBuffer(_gl.ARRAY_BUFFER, buf);
  _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), _gl.STATIC_DRAW);
  _quad = buf;
  return true;
}

function _syncJuliaUI() {
  const fmt = (v) => v.toFixed(4);
  const s = (id, v) => { const e = document.getElementById(id); if (e) e.value = fmt(v); };
  const o = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = fmt(v); };
  s('fracJCR', _jcR); o('fracJCROut', _jcR);
  s('fracJCI', _jcI); o('fracJCIOut', _jcI);
  // Also sync fractal-lenia panel sliders
  s('asfFracCR', _jcR); o('asfFracCROut', _jcR);
  s('asfFracCI', _jcI); o('asfFracCIOut', _jcI);
}

// ─── Public API ───────────────────────────────────────────────────────────────

window.FractalEngine = {
  isReady()    { return _gl !== null; },
  isAnimating(){ return _animating; },
  getJuliaC()  { return { r: _jcR, i: _jcI }; },
  getType()    { return _type; },
  getAnimOrbit(){ return { cr: _animCR, ci: _animCI, r: _animRadius }; },

  tick(now) {
    const dt = _lastT ? Math.min((now - _lastT) / 1000, 0.1) : 0;
    _lastT = now;
    _shift += dt * 0.04;                     // slow palette drift — always on
    if (_animating && _type === 1) {
      _animAngle += dt * _animSpeed;
      _jcR = _animCR + _animRadius * Math.cos(_animAngle);
      _jcI = _animCI + _animRadius * Math.sin(_animAngle);
      _syncJuliaUI();
    }
  },

  render(ctx2d, W, H) {
    if (!_initGL()) return;
    if (_canvas.width !== W || _canvas.height !== H) {
      _canvas.width = W; _canvas.height = H;
    }
    const gl = _gl;
    gl.viewport(0, 0, W, H);
    gl.useProgram(_prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, _quad);
    const aLoc = gl.getAttribLocation(_prog, 'aPos');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    // Use explicit gl.uniform* types — _su's typeof check swallows integers as floats
    const u = (n) => _ul(gl, _prog, n);
    gl.uniform2f(u('uRes'),      W, H);
    gl.uniform2f(u('uCenter'),   _cx, _cy);
    gl.uniform1f(u('uZoom'),     _zoom);
    gl.uniform1i(u('uType'),     _type);
    gl.uniform2f(u('uJC'),       _jcR, _jcI);
    gl.uniform1i(u('uMaxIter'),  _maxIter);
    gl.uniform1f(u('uShift'),    _shift);
    gl.uniform1i(u('uScheme'),   _scheme);
    gl.uniform1i(u('uDrawMode'), _drawMode);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx2d.drawImage(_canvas, 0, 0);
  },

  // ── Controls ──────────────────────────────────────────────────────────────
  setType(t)      { _type = t; },
  setJuliaC(r, i) { _jcR = r; _jcI = i; _syncJuliaUI(); },
  setMaxIter(n)   { _maxIter = Math.max(16, n | 0); },
  setScheme(n)    { _scheme = ((n % 6) + 6) % 6; },
  setDrawMode(n)  { _drawMode = n; },
  setAnimate(on)  { _animating = on; if (!on) _animAngle = 0; },
  setAnimSpeed(s) { _animSpeed = Math.max(0.01, s); },
  setAnimOrbit(cr, ci, r) { _animCR = cr; _animCI = ci; _animRadius = Math.max(0.005, r); },

  // ── Navigation ────────────────────────────────────────────────────────────
  // dx/dy in CSS pixels, W/H are physical canvas pixels
  pan(dx, dy) {
    const dpr = window.devicePixelRatio || 1;
    _cx -= dx * dpr / _zoom;
    _cy += dy * dpr / _zoom;   // Y-inverted: drag down → see higher Im
  },

  zoomAt(sx, sy, W, H, factor) {
    const dpr = window.devicePixelRatio || 1;
    const psx = sx * dpr, psy = sy * dpr;
    const dx  = (psx - W / 2) / _zoom;
    const dy  = (psy - H / 2) / _zoom;
    _zoom  *= factor;
    _cx    += dx * (1 - 1 / factor);
    _cy    -= dy * (1 - 1 / factor);   // Y-inverted
  },

  reset() { _cx = -0.5; _cy = 0; _zoom = 200; },

  // Convert CSS screen coords → complex plane
  screenToWorld(sx, sy, W, H) {
    const dpr = window.devicePixelRatio || 1;
    return {
      r: (sx * dpr - W / 2) / _zoom + _cx,
      i: -(sy * dpr - H / 2) / _zoom + _cy,
    };
  },
};

})();
