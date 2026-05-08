// Automata Shader Framework (ASF) — gpu/asf.js
// Sets up window.ASF. Load before app.js.
// WebGL 2 GPU pipeline: kernel convolution → growth → integrate → display.

(function () {
  'use strict';

  // ─── WebGL helpers ────────────────────────────────────────────────────────

  function createGL(canvas) {
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    if (!gl.getExtension('EXT_color_buffer_float')) return null;
    gl.getExtension('OES_texture_float_linear'); // optional, for bilinear state display
    return gl;
  }

  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Shader: ' + err + '\n---\n' + src.split('\n').map((l,i)=>`${i+1}: ${l}`).join('\n'));
    }
    return s;
  }

  function linkProgram(gl, vertSrc, fragSrc) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error('Link: ' + err);
    }
    return prog;
  }

  function makeQuad(gl) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    return buf;
  }

  function drawFullscreen(gl, prog, quad, uniforms) {
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    if (uniforms) uniforms(prog);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Cache uniform locations on the program object
  function ul(gl, prog, name) {
    if (!prog._u) prog._u = {};
    if (!(name in prog._u)) prog._u[name] = gl.getUniformLocation(prog, name);
    return prog._u[name];
  }

  function setUniforms(gl, prog, obj) {
    for (const [k, v] of Object.entries(obj)) {
      const loc = ul(gl, prog, k);
      if (loc === null) continue;
      if (typeof v === 'number') gl.uniform1f(loc, v);
      else if (Number.isInteger(v)) gl.uniform1i(loc, v);
      else if (Array.isArray(v) && v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else if (Array.isArray(v) && v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      else if (Array.isArray(v) && v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }
  }

  // ─── PingPong framebuffer ─────────────────────────────────────────────────

  class PingPong {
    constructor(gl, W, H) {
      this.gl = gl; this.W = W; this.H = H;
      this._t = [this._tex(), this._tex()];
      this._f = this._t.map(t => this._fbo(t));
      this._i = 0;
    }
    _tex() {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.W, this.H, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      return t;
    }
    _fbo(tex) {
      const gl = this.gl;
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('FBO incomplete: ' + st);
      return f;
    }
    get readTex() { return this._t[this._i]; }
    get writeFBO() { return this._f[1 - this._i]; }
    swap() { this._i ^= 1; }
    upload(data) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this._t[this._i]);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.W, this.H, gl.RGBA, gl.FLOAT, data);
    }
    readPixels() {
      const gl = this.gl;
      const buf = new Float32Array(this.W * this.H * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._f[this._i]);
      gl.readPixels(0, 0, this.W, this.H, gl.RGBA, gl.FLOAT, buf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return buf;
    }
    dispose() {
      const gl = this.gl;
      this._t.forEach(t => gl.deleteTexture(t));
      this._f.forEach(f => gl.deleteFramebuffer(f));
    }
  }

  // ─── Potential texture (one per kernel) ───────────────────────────────────

  function makePotential(gl, W, H) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo };
  }

  // ─── GLSL colormaps ───────────────────────────────────────────────────────

  const COLORMAPS = {
    ocean: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 a = vec3(0.039, 0.102, 0.176);
      vec3 b = vec3(0.106, 0.396, 0.518);
      vec3 c = vec3(0.357, 0.878, 0.737);
      vec3 d = vec3(0.95, 0.98, 1.00);
      if (t < 0.33) return mix(a, b, t / 0.33);
      if (t < 0.66) return mix(b, c, (t - 0.33) / 0.33);
      return mix(c, d, (t - 0.66) / 0.34);
    }`,
    organelle: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 void_c    = vec3(0.02, 0.02, 0.07);
      vec3 membrane  = vec3(0.00, 0.50, 0.90);
      vec3 cytoplasm = vec3(0.04, 0.76, 0.50);
      vec3 granule   = vec3(0.82, 0.70, 0.06);
      vec3 nucleus   = vec3(1.00, 0.90, 0.55);
      if (t < 0.10) return mix(void_c, membrane, t / 0.10);
      if (t < 0.35) return mix(membrane, cytoplasm, (t - 0.10) / 0.25);
      if (t < 0.65) return mix(cytoplasm, granule, (t - 0.35) / 0.30);
      return mix(granule, nucleus, (t - 0.65) / 0.35);
    }`,
    neon: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 glow  = vec3(0.00, 1.00, 0.55) * pow(t, 0.55);
      vec3 core  = vec3(1.00, 0.05, 0.90) * pow(t, 2.8);
      vec3 halo  = vec3(0.20, 0.40, 1.00) * pow(t, 0.25) * 0.28;
      return clamp(glow + core + halo, 0.0, 1.0);
    }`,
    lava: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 dark  = vec3(0.02, 0.01, 0.02);
      vec3 ember = vec3(0.55, 0.04, 0.01);
      vec3 fire  = vec3(0.97, 0.32, 0.02);
      vec3 hot   = vec3(1.00, 0.88, 0.28);
      vec3 white = vec3(1.00, 0.98, 0.92);
      if (t < 0.20) return mix(dark,  ember, t / 0.20);
      if (t < 0.50) return mix(ember, fire,  (t - 0.20) / 0.30);
      if (t < 0.78) return mix(fire,  hot,   (t - 0.50) / 0.28);
      return mix(hot, white, (t - 0.78) / 0.22);
    }`,
    viridis: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c = vec3(0.2777, 0.0054, 0.3341)
             + t*(vec3(0.1052, 1.4046, 1.3842)
             + t*(vec3(-0.3308, 0.2148, -0.5098)
             + t*(vec3(-4.634, -5.7996, -1.9768)
             + t*(vec3(6.2281, 14.179, 4.4859)
             + t*(vec3(4.7763, -13.745, -1.1671)
             + t*vec3(-5.4352, 4.6459, -0.6041))))));
      return clamp(c, 0.0, 1.0);
    }`,
    plasma: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c = vec3(0.0504, 0.0298, 0.5280)
             + t*(vec3(2.4046, 0.4068, 0.2218)
             + t*(vec3(-4.7426, -0.5464, -3.5532)
             + t*(vec3(13.644, 3.0019, 14.521)
             + t*(vec3(-20.953, -5.4697, -24.377)
             + t*(vec3(14.691, 4.5004, 18.504)
             + t*vec3(-4.0824, -1.3744, -5.000))))));
      return clamp(c, 0.0, 1.0);
    }`,
    magma: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c = vec3(0.0016, 0.0016, 0.0139)
             + t*(vec3(0.4485, 0.099, 0.8508)
             + t*(vec3(2.1756, 0.7591, -3.105)
             + t*(vec3(-4.4747, 2.5974, 13.293)
             + t*(vec3(5.1354, -5.5695, -22.49)
             + t*(vec3(-3.2041, 4.0566, 17.395)
             + t*vec3(0.926, -1.396, -5.17))))));
      return clamp(c, 0.0, 1.0);
    }`,
    twilight: `vec3 colormap(float t) {
      t = clamp(t, 0.0, 1.0);
      float u = t < 0.5 ? t * 2.0 : (1.0 - t) * 2.0;
      vec3 dark = vec3(0.20, 0.20, 0.35);
      vec3 pink = vec3(0.85, 0.55, 0.65);
      vec3 pale = vec3(0.95, 0.90, 0.75);
      return u < 0.5 ? mix(dark, pink, u*2.0) : mix(pink, pale, (u-0.5)*2.0);
    }`,
    grayscale: `vec3 colormap(float t) { return vec3(clamp(t,0.,1.)); }`,
  };

  // ─── GLSL vertex shader (shared) ──────────────────────────────────────────

  const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUV;
void main() { vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  // ─── Kernel pass shader generators ────────────────────────────────────────

  function channelSelector(ch) {
    return ch === 1 ? 's.g' : ch === 2 ? 's.b' : ch === 3 ? 's.a' : 's.r';
  }

  function makeRingKernelFrag(kernel) {
    const R = kernel.radius | 0;
    const fromCh = channelSelector(kernel.fromChannel || 0);
    return `#version 300 es
precision highp float;
#define KR ${R}
uniform sampler2D uState;
uniform vec2 uRes;
uniform float uInner;   // inner radius fraction [0,1)
uniform float uAlpha;   // kernel smoothness (4.0 typical)
in vec2 vUV; out vec4 fragPot;

float kw(float r) {
  if (r <= uInner || r >= 1.0) return 0.0;
  float u = (r - uInner) / (1.0 - uInner + 1e-6);
  return exp(uAlpha * (1.0 - 1.0 / (4.0*u*(1.0-u) + 1e-6)));
}

void main() {
  float pot = 0.0, ws = 0.0;
  for (int dy = -KR; dy <= KR; dy++) {
    for (int dx = -KR; dx <= KR; dx++) {
      float r = length(vec2(float(dx), float(dy))) / float(KR);
      float w = kw(r);
      if (w <= 0.0) continue;
      vec4 s = texture(uState, fract(vUV + vec2(float(dx), float(dy)) / uRes));
      pot += w * ${fromCh};
      ws  += w;
    }
  }
  fragPot = vec4(ws > 0.0 ? pot / ws : 0.0, 0.0, 0.0, 1.0);
}`;
  }

  function makeDiskKernelFrag(kernel) {
    const R = kernel.radius | 0;
    const fromCh = channelSelector(kernel.fromChannel || 0);
    return `#version 300 es
precision highp float;
#define KR ${R}
uniform sampler2D uState;
uniform vec2 uRes;
in vec2 vUV; out vec4 fragPot;
void main() {
  float pot = 0.0, ws = 0.0;
  for (int dy = -KR; dy <= KR; dy++) {
    for (int dx = -KR; dx <= KR; dx++) {
      if (float(dx)*float(dx) + float(dy)*float(dy) > float(KR*KR)) continue;
      vec4 s = texture(uState, fract(vUV + vec2(float(dx), float(dy)) / uRes));
      pot += ${fromCh};
      ws  += 1.0;
    }
  }
  fragPot = vec4(ws > 0.0 ? pot / ws : 0.0, 0.0, 0.0, 1.0);
}`;
  }

  function makeLaplacianKernelFrag(kernel) {
    const fromCh = channelSelector(kernel.fromChannel || 0);
    return `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uRes;
in vec2 vUV; out vec4 fragPot;
float ch(vec2 uv) { vec4 s = texture(uState, fract(uv)); return ${fromCh}; }
void main() {
  vec2 d = 1.0 / uRes;
  float lap = 0.05*(ch(vUV+vec2( d.x, d.y)) + ch(vUV+vec2(-d.x, d.y))
                  + ch(vUV+vec2( d.x,-d.y)) + ch(vUV+vec2(-d.x,-d.y)))
            + 0.20*(ch(vUV+vec2( d.x, 0.0)) + ch(vUV+vec2(-d.x, 0.0))
                  + ch(vUV+vec2( 0.0, d.y)) + ch(vUV+vec2( 0.0,-d.y)))
            - ch(vUV);
  fragPot = vec4(lap, 0.0, 0.0, 1.0);
}`;
  }

  function kernelFragSrc(kernel) {
    switch ((kernel.type || 'ring').toLowerCase()) {
      case 'laplacian': return makeLaplacianKernelFrag(kernel);
      case 'disk':      return makeDiskKernelFrag(kernel);
      default:          return makeRingKernelFrag(kernel);
    }
  }

  // ─── Growth + integrate shader generators ─────────────────────────────────

  const GROWTH_HELPERS = `
float leniaBell(float u, float mu, float sigma) {
  float x = (u - mu) / (sigma + 1e-6);
  return 2.0 * exp(-x * x) - 1.0;
}
float sigmoidSmooth(float x, float a, float alpha) {
  return 1.0 / (1.0 + exp(-(x - a) * 4.0 / (alpha + 1e-6)));
}`;

  function makeGrowthFrag(spec) {
    const nPots = spec.kernels.length;
    const potDecls = Array.from({length: nPots}, (_,i) => `uniform sampler2D uPot${i};`).join('\n');
    const potReads = Array.from({length: nPots}, (_,i) => `  vec4 pot${i} = texture(uPot${i}, vUV);`).join('\n');
    const g = spec.growth;

    let bodyGlsl = '';
    switch (g.type) {
      case 'lenia-bell': {
        const ch = g.params.channel || 0;
        const outMask = ['r','g','b','a'];
        bodyGlsl = `
  float pot = pot0.r;
  float growth = leniaBell(pot, uMu, uSigma);
  vec4 s2 = state;
  s2.${outMask[ch]} = clamp(state.${outMask[ch]} + uDt * growth, 0.0, 1.0);
  fragNext = s2;`;
        break;
      }
      case 'smoothlife': {
        bodyGlsl = `
  float inner = pot0.r;
  float outer = pot1.r;
  float alphaN = uSigmaN, alphaM = uSigmaM;
  float b1 = uB1, b2 = uB2, d1 = uD1, d2 = uD2;
  float sm = sigmoidSmooth(inner, 0.5, alphaM);
  float sc = mix(b1, d1, sm);
  float sw = mix(b2, d2, sm);
  float alive = sigmoidSmooth(outer, sc, alphaN) * (1.0 - sigmoidSmooth(outer, sc + sw, alphaN));
  float growth = 2.0 * alive - 1.0;
  fragNext = vec4(clamp(state.r + uDt * growth, 0.0, 1.0), state.g, state.b, state.a);`;
        break;
      }
      case 'gray-scott': {
        bodyGlsl = `
  float A = state.r, B = state.g;
  float lapA = pot0.r, lapB = pot1.r;
  float dA = uDa * lapA - A * B * B + uF * (1.0 - A);
  float dB = uDb * lapB + A * B * B - (uF + uK) * B;
  fragNext = vec4(clamp(A + uDt * dA, 0.0, 1.0), clamp(B + uDt * dB, 0.0, 1.0), state.b, state.a);`;
        break;
      }
      case 'glsl': {
        // pot is a vec4 whose .r is pot0.r, .g is pot1.r, etc.
        const potAggr = nPots > 0
          ? `  vec4 pot = vec4(${Array.from({length:4},(_,i)=>i<nPots?`pot${i}.r`:'0.0').join(',')});`
          : '  vec4 pot = vec4(0.0);';
        bodyGlsl = `
${potAggr}
  {
    ${g.glsl}
  }`;
        break;
      }
      default:
        bodyGlsl = '  fragNext = state;';
    }

    return `#version 300 es
precision highp float;
uniform sampler2D uState;
${potDecls}
uniform float uMu, uSigma, uDt;
uniform float uDa, uDb, uF, uK;
uniform float uB1, uB2, uD1, uD2, uSigmaN, uSigmaM;
uniform float uFracCR, uFracCI;
in vec2 vUV;
out vec4 fragNext;
${GROWTH_HELPERS}
void main() {
  vec4 state = texture(uState, vUV);
${potReads}
${bodyGlsl}
}`;
  }

  // ─── Display shader generator ─────────────────────────────────────────────

  function makeDisplayFrag(spec) {
    const d = spec.display || {};
    const colormap = d.colormap || 'ocean';
    let cmapDecl = '';
    let colorBodyGlsl;
    if (colormap === 'rgb') {
      colorBodyGlsl = `fragColor = vec4(state.r, state.g, state.b, 1.0);`;
    } else if (colormap === 'custom' && d.glsl) {
      colorBodyGlsl = d.glsl;
    } else {
      cmapDecl = COLORMAPS[colormap] || COLORMAPS.ocean;
      colorBodyGlsl = `fragColor = vec4(colormap(state.r), 1.0);`;
    }
    return `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform sampler2D uPaint;
uniform vec2 uCanvas, uWorld, uCamera;
uniform float uZoom;
uniform float uEdgeStr;
uniform float uFracCR, uFracCI;
in vec2 vUV; out vec4 fragColor;
${cmapDecl}

// ── Catmull-Rom bicubic — sharp, smooth upscaling with no bilinear smear ──
vec4 _crW(float t) {
  float t2 = t*t, t3 = t2*t;
  return 0.5 * vec4(-t3+2.0*t2-t, 3.0*t3-5.0*t2+2.0, -3.0*t3+4.0*t2+t, t3-t2);
}
vec4 sampleBicubic(sampler2D tex, vec2 uv) {
  vec2 px = uv * uWorld - 0.5;
  vec2 f  = fract(px);
  vec2 b  = floor(px);
  vec4 wx = _crW(f.x), wy = _crW(f.y);
  vec4 c  = vec4(0.0);
  for (int j = 0; j < 4; j++)
    for (int i = 0; i < 4; i++)
      c += wx[i] * wy[j] *
           texture(tex, fract((b + vec2(float(i)-1.0, float(j)-1.0) + 0.5) / uWorld));
  return c;
}

void main() {
  vec2 worldPos = (vUV * uCanvas - uCanvas * 0.5) / uZoom + uCamera;
  vec2 uv = fract(worldPos / uWorld);

  // Bicubic state (artifact-free upscale) + bilinear paint overlay
  vec4 state = clamp(sampleBicubic(uState, uv), 0.0, 1.0);
  vec4 paint  = texture(uPaint, uv);
  float r0 = state.r + paint.r * (1.0 - state.r);
  r0 = r0 * (1.0 - paint.g);
  state = vec4(clamp(r0, 0.0, 1.0), state.g, state.b, state.a);
  ${colorBodyGlsl}

  // Gradient via 2-texel bilinear taps — cheap and sufficient for normals
  vec2 tx = 2.0 / uWorld;
  float gx = texture(uState, fract(uv + vec2(tx.x, 0.0))).r
           - texture(uState, fract(uv - vec2(tx.x, 0.0))).r;
  float gy = texture(uState, fract(uv + vec2(0.0, tx.y))).r
           - texture(uState, fract(uv - vec2(0.0, tx.y))).r;

  // Surface normal from state gradient → 3D depth on every organism
  vec3 nrm    = normalize(vec3(gx, gy, 0.28));
  vec3 litDir = normalize(vec3(0.55, 0.85, 1.8));
  float diff  = max(0.0, dot(nrm, litDir));
  float spec  = pow(max(0.0, dot(reflect(-litDir, nrm), vec3(0.0, 0.0, 1.0))), 30.0);
  fragColor.rgb = fragColor.rgb * (0.42 + 0.68 * diff)
                + vec3(0.88, 0.94, 1.0) * spec * 0.38;

  // Edge / membrane highlight — reuses computed gradient, zero extra samples
  if (uEdgeStr > 0.001) {
    float edge = length(vec2(gx, gy)) * uEdgeStr;
    fragColor.rgb += vec3(0.45, 0.75, 1.0) * edge;
  }

  fragColor = clamp(fragColor, 0.0, 1.0);
}`;
  }

  // ─── GPU paint shaders ────────────────────────────────────────────────────

  const PAINT_CIRCLE_FRAG = `#version 300 es
precision highp float;
uniform vec2 uBrushPt;
uniform float uBrushR;
uniform float uBrushV;
uniform vec2 uWorld;
in vec2 vUV;
out vec4 fragPaint;
void main() {
  vec2 px = vUV * uWorld;
  vec2 d = px - uBrushPt;
  float dist = length(d);
  float s = max(0.0, 1.0 - dist / max(uBrushR, 0.5));
  s = s * s;
  if (s < 0.001) discard;
  fragPaint = vec4(max(0.0, uBrushV) * s, max(0.0, -uBrushV) * s, 0.0, 1.0);
}`;

  const MERGE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform sampler2D uPaint;
in vec2 vUV;
out vec4 fragNext;
void main() {
  vec4 state = texture(uState, vUV);
  vec4 paint  = texture(uPaint, vUV);
  float r = state.r + paint.r * (1.0 - state.r);
  r = r * (1.0 - paint.g);
  fragNext = vec4(clamp(r, 0.0, 1.0), state.g, state.b, state.a);
}`;

  // ─── Pipeline ─────────────────────────────────────────────────────────────

  class Pipeline {
    constructor(gl, gpuCanvas, spec) {
      this.gl = gl;
      this.gpuCanvas = gpuCanvas;
      this.spec = spec;
      this.W = spec.world.width;
      this.H = spec.world.height;
      this._quad = makeQuad(gl);
      this._state = new PingPong(gl, this.W, this.H);
      this._pots = spec.kernels.map(() => makePotential(gl, this.W, this.H));
      this._kProgs = spec.kernels.map(k => linkProgram(gl, VERT, kernelFragSrc(k)));
      this._gProg = linkProgram(gl, VERT, makeGrowthFrag(spec));
      this._dProg = linkProgram(gl, VERT, makeDisplayFrag(spec));
      // Growth params (hot-updatable)
      this.mu    = (spec.growth.params && spec.growth.params.mu)    || 0.135;
      this.sigma = (spec.growth.params && spec.growth.params.sigma) || 0.015;
      this.dt    = (spec.integration && spec.integration.dt)        || 0.1;
      // Reaction-diffusion params
      this.Da = (spec.growth.params && spec.growth.params.Da) || 0.2097;
      this.Db = (spec.growth.params && spec.growth.params.Db) || 0.1050;
      this.F  = (spec.growth.params && spec.growth.params.F)  || 0.0545;
      this.K  = (spec.growth.params && spec.growth.params.K)  || 0.0620;
      // SmoothLife params
      this.b1 = (spec.growth.params && spec.growth.params.b1) || 0.278;
      this.b2 = (spec.growth.params && spec.growth.params.b2) || 0.365;
      this.d1 = (spec.growth.params && spec.growth.params.d1) || 0.267;
      this.d2 = (spec.growth.params && spec.growth.params.d2) || 0.445;
      this.sigmaN = (spec.growth.params && spec.growth.params.sigmaN) || 0.028;
      this.sigmaM = (spec.growth.params && spec.growth.params.sigmaM) || 0.147;
      // Display params (hot-updatable)
      this.edgeStr = 0.0;
      // Fractal substrate params (for fractal-lenia)
      this.fracCR = (spec.fractal && spec.fractal.cr) != null ? spec.fractal.cr : -0.7269;
      this.fracCI = (spec.fractal && spec.fractal.ci) != null ? spec.fractal.ci : 0.1889;
      // Paint buffer
      this._paintTex  = this._makePaintTex();
      this._paintFBO  = this._makePaintFBO(this._paintTex);
      this._paintProg = linkProgram(gl, VERT, PAINT_CIRCLE_FRAG);
      this._mergeProg = linkProgram(gl, VERT, MERGE_FRAG);
      this._hasPaint  = false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._paintFBO);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    _makePaintTex() {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.W, this.H, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      return t;
    }

    _makePaintFBO(tex) {
      const gl = this.gl;
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return f;
    }

    _mergePaint() {
      const gl = this.gl;
      gl.viewport(0, 0, this.W, this.H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._state.writeFBO);
      drawFullscreen(gl, this._mergeProg, this._quad, (p) => {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._state.readTex);
        gl.uniform1i(ul(gl, p, 'uState'), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._paintTex);
        gl.uniform1i(ul(gl, p, 'uPaint'), 1);
      });
      this._state.swap();
    }

    _clearPaint() {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._paintFBO);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    step() {
      const gl = this.gl;
      gl.viewport(0, 0, this.W, this.H);
      const substeps = this.spec.substeps || 1;

      // Merge pending paint once before all substeps
      if (this._hasPaint) {
        this._mergePaint();
        this._clearPaint();
        this._hasPaint = false;
      }

      for (let sub = 0; sub < substeps; sub++) {
        // ── Kernel passes ──
        for (let i = 0; i < this._kProgs.length; i++) {
          const prog = this._kProgs[i];
          const pot = this._pots[i];
          const kernel = this.spec.kernels[i];
          gl.bindFramebuffer(gl.FRAMEBUFFER, pot.fbo);
          drawFullscreen(gl, prog, this._quad, (p) => {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._state.readTex);
            setUniforms(gl, p, {
              uState: 0,
              uRes: [this.W, this.H],
              uInner: (kernel.innerFrac || 0.0),
              uAlpha: (kernel.alpha || 4.0),
            });
          });
        }

        // ── Growth + integrate pass ──
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._state.writeFBO);
        drawFullscreen(gl, this._gProg, this._quad, (p) => {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, this._state.readTex);
          for (let i = 0; i < this._pots.length; i++) {
            gl.activeTexture(gl.TEXTURE1 + i);
            gl.bindTexture(gl.TEXTURE_2D, this._pots[i].tex);
            gl.uniform1i(ul(gl, p, `uPot${i}`), 1 + i);
          }
          setUniforms(gl, p, {
            uState: 0,
            uMu: this.mu, uSigma: this.sigma, uDt: this.dt,
            uDa: this.Da, uDb: this.Db, uF: this.F, uK: this.K,
            uB1: this.b1, uB2: this.b2, uD1: this.d1, uD2: this.d2,
            uSigmaN: this.sigmaN, uSigmaM: this.sigmaM,
            uFracCR: this.fracCR, uFracCI: this.fracCI,
          });
        });
        this._state.swap();
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    blit(ctx, canvasW, canvasH, cameraX, cameraY, zoom) {
      const gl = this.gl;
      if (this.gpuCanvas.width !== canvasW || this.gpuCanvas.height !== canvasH) {
        this.gpuCanvas.width = canvasW;
        this.gpuCanvas.height = canvasH;
      }
      gl.viewport(0, 0, canvasW, canvasH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      drawFullscreen(gl, this._dProg, this._quad, (p) => {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._state.readTex);
        gl.uniform1i(ul(gl, p, 'uState'), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._paintTex);
        gl.uniform1i(ul(gl, p, 'uPaint'), 1);
        setUniforms(gl, p, {
          uCanvas:  [canvasW, canvasH],
          uWorld:   [this.W, this.H],
          uCamera:  [cameraX, cameraY],
          uZoom:    zoom,
          uEdgeStr: this.edgeStr,
          uFracCR:  this.fracCR,
          uFracCI:  this.fracCI,
        });
      });
      ctx.drawImage(this.gpuCanvas, 0, 0);
    }

    upload(data) {
      this._state.upload(data);
    }

    readPixels() {
      return this._state.readPixels();
    }

    paintAt(wx, wy, radius, value) {
      const gl = this.gl;
      const brushV = value > 0.5 ? 1.0 : -1.0;
      // Toroidal wrap so brush at edge paints the correct world cell
      const px = ((wx % this.W) + this.W) % this.W;
      const py = ((wy % this.H) + this.H) % this.H;
      gl.viewport(0, 0, this.W, this.H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._paintFBO);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
      drawFullscreen(gl, this._paintProg, this._quad, (p) => {
        setUniforms(gl, p, {
          uBrushPt: [px, py],
          uBrushR:  radius,
          uBrushV:  brushV,
          uWorld:   [this.W, this.H],
        });
      });
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this._hasPaint = true;
    }

    dispose() {
      const gl = this.gl;
      this._state.dispose();
      this._pots.forEach(p => { gl.deleteTexture(p.tex); gl.deleteFramebuffer(p.fbo); });
      this._kProgs.forEach(p => gl.deleteProgram(p));
      [this._gProg, this._dProg, this._paintProg, this._mergeProg].forEach(p => gl.deleteProgram(p));
      gl.deleteTexture(this._paintTex);
      gl.deleteFramebuffer(this._paintFBO);
      gl.deleteBuffer(this._quad);
    }
  }

  // ─── Built-in specs ───────────────────────────────────────────────────────

  const SPECS = {
    lenia: {
      id: 'lenia', name: 'Lenia', category: 'continuous',
      world: { width: 512, height: 512, channels: 1, boundary: 'torus' },
      kernels: [{ type: 'ring', radius: 13, fromChannel: 0, innerFrac: 0.0, alpha: 4.0 }],
      growth: { type: 'lenia-bell', params: { mu: 0.135, sigma: 0.015 } },
      integration: { method: 'euler', dt: 0.1 },
      display: { colormap: 'ocean' },
      simScale: 3,
    },
    smoothlife: {
      id: 'smoothlife', name: 'SmoothLife', category: 'continuous',
      world: { width: 512, height: 512, channels: 1, boundary: 'torus' },
      kernels: [
        { type: 'disk', radius: 3,  fromChannel: 0 },
        { type: 'ring', radius: 12, fromChannel: 0, innerFrac: 0.33, alpha: 4.0 },
      ],
      growth: { type: 'smoothlife', params: { b1: 0.278, b2: 0.365, d1: 0.267, d2: 0.445, sigmaN: 0.028, sigmaM: 0.147 } },
      integration: { method: 'euler', dt: 0.05 },
      display: { colormap: 'viridis' },
      simScale: 3,
    },
    'gray-scott': {
      id: 'gray-scott', name: 'Gray-Scott', category: 'reaction-diffusion',
      world: { width: 512, height: 512, channels: 2, boundary: 'torus' },
      kernels: [
        { type: 'laplacian', fromChannel: 0 },
        { type: 'laplacian', fromChannel: 1 },
      ],
      growth: { type: 'gray-scott', params: { Da: 0.2097, Db: 0.1050, F: 0.0545, K: 0.0620 } },
      integration: { method: 'euler', dt: 1.0 },
      substeps: 12,
      display: {
        colormap: 'custom',
        glsl: `
          float B = state.g, A = state.r;
          float b = clamp(B * 5.5, 0.0, 1.0);
          float dep = clamp((1.0 - A) * 2.5, 0.0, 1.0);
          vec3 bg   = vec3(0.03, 0.05, 0.14);
          vec3 cyan = vec3(0.00, 0.85, 0.95);
          vec3 gold = vec3(0.92, 0.72, 0.04);
          vec3 col  = mix(bg, cyan, b);
          col = mix(col, gold, dep);
          fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);`,
      },
    },
    'lenia-mc2': {
      id: 'lenia-mc2', name: 'Lenia 2-species', category: 'continuous',
      world: { width: 512, height: 512, channels: 2, boundary: 'torus' },
      kernels: [
        { type: 'ring', radius: 13, fromChannel: 0, innerFrac: 0.0, alpha: 4.0 },
        { type: 'ring', radius: 21, fromChannel: 1, innerFrac: 0.0, alpha: 4.0 },
        { type: 'ring', radius: 7,  fromChannel: 0, innerFrac: 0.3, alpha: 4.0 },
      ],
      growth: {
        type: 'glsl',
        glsl: `
          float g0 = leniaBell(pot.r, 0.135, 0.015);
          float g1 = leniaBell(pot.g - 0.15 * pot.b, 0.120, 0.018);
          fragNext = vec4(
            clamp(state.r + uDt * g0, 0.0, 1.0),
            clamp(state.g + uDt * g1, 0.0, 1.0),
            state.b, state.a
          );`,
      },
      integration: { method: 'euler', dt: 0.1 },
      display: {
        colormap: 'custom',
        glsl: `
          float A = state.r, B = state.g;
          vec3 col = vec3(A * 0.357 + B * 0.10, A * 0.439 + B * 0.05, B * 0.737 + A * 0.2);
          fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);`,
      },
      simScale: 3,
    },
    'fractal-lenia': {
      id: 'fractal-lenia', name: 'Fractal Lenia', category: 'fractal',
      world: { width: 512, height: 512, channels: 1, boundary: 'torus' },
      kernels: [{ type: 'ring', radius: 13, fromChannel: 0, innerFrac: 0.0, alpha: 4.0 }],
      growth: {
        type: 'glsl',
        // Julia field modulates mu — organisms colonise the fractal boundary
        glsl: `
          vec2 fc = vUV * 4.0 - vec2(2.0);
          vec2 fz = fc;
          float fIter = 0.0;
          for (int fi = 0; fi < 64; fi++) {
            fz = vec2(fz.x*fz.x - fz.y*fz.y + uFracCR,  2.0*fz.x*fz.y + uFracCI);
            if (dot(fz, fz) > 4.0) break;
            fIter += 1.0;
          }
          float fField  = fIter / 64.0;
          // Habitat band peaks at fField=0.85 (Julia boundary), dies inside & outside
          float mu_eff  = uMu + abs(fField - 0.85) * 0.28;
          float g = leniaBell(pot.r, mu_eff, uSigma);
          fragNext = vec4(clamp(state.r + uDt * g, 0.0, 1.0), 0.0, 0.0, 0.0);
        `,
      },
      integration: { method: 'euler', dt: 0.1 },
      display: {
        colormap: 'custom',
        // Fractal background + bioluminescent organisms
        glsl: `
          vec2 fc2 = uv * 4.0 - vec2(2.0);
          vec2 fz2 = fc2;
          float fI2 = 0.0;
          float mO = 1e5, mR = 1e5, mI = 1e5;
          for (int fi2 = 0; fi2 < 48; fi2++) {
            fz2 = vec2(fz2.x*fz2.x - fz2.y*fz2.y + uFracCR,  2.0*fz2.x*fz2.y + uFracCI);
            if (dot(fz2, fz2) > 4.0) break;
            fI2  += 1.0;
            mO    = min(mO, length(fz2));
            mR    = min(mR, abs(fz2.x));
            mI    = min(mI, abs(fz2.y));
          }
          float ff2 = fI2 / 48.0;
          // Smooth escape coloring for background
          float logfz = log(max(dot(fz2, fz2), 1.001)) * 0.5;
          float fnu   = (ff2 < 1.0 && logfz > 0.01)
                        ? log(logfz / 0.6931472) / 0.6931472 : 0.0;
          float fsn   = fI2 + 1.0 - fnu;
          float ft    = fract(fsn * 0.07);
          // Deep-space fractal palette: near-black teal/indigo
          vec3 fracBg = (ff2 >= 1.0)
            ? vec3(0.0, 0.0, 0.02)
            : vec3(0.04, 0.07, 0.18) + vec3(0.03, 0.05, 0.12) * ft * 2.5;
          // Subtle orbit-trap shimmer on boundary
          float boundary = clamp(1.0 - abs(ff2 - 0.85) * 8.0, 0.0, 1.0);
          vec3 glimmer  = vec3(0.0, 0.18, 0.35) * boundary * 0.4;
          fracBg += glimmer;
          // Organism: bioluminescent teal → warm gold core
          float A = state.r;
          vec3 bioCol = vec3(0.05, 0.92, 0.52) * pow(A, 0.45)
                      + vec3(0.92, 0.62, 0.08) * pow(A, 2.8);
          float orgMask = smoothstep(0.0, 0.12, A);
          fragColor = vec4(mix(fracBg, fracBg * 0.4 + bioCol, orgMask), 1.0);
        `,
      },
      fractal: { cr: -0.7269, ci: 0.1889 },
      simScale: 3,
    },
  };

  // ─── Creature library ─────────────────────────────────────────────────────

  function orbiumSeed(W, H) {
    // Compact ring-shaped blob — converges to Orbium unicaudatus under Lenia params
    const data = new Float32Array(W * H * 4);
    const cx = W * 0.5 | 0, cy = H * 0.5 | 0;
    const OR = 9, IR = 3;
    for (let dy = -OR; dy <= OR; dy++) {
      for (let dx = -OR; dx <= OR; dx++) {
        const r = Math.sqrt(dx*dx + dy*dy);
        if (r < IR || r > OR) continue;
        const rn = (r - IR) / (OR - IR);
        const v = Math.sin(Math.PI * rn) * 0.9;
        const x = ((cx + dx) % W + W) % W;
        const y = ((cy + dy) % H + H) % H;
        data[(y * W + x) * 4] = v;
      }
    }
    return data;
  }

  function geminiumSeed(W, H) {
    // Two orbium seeds offset by 30 cells — self-organizes into Geminium
    const data = new Float32Array(W * H * 4);
    const placeDisk = (cx, cy) => {
      const OR = 9, IR = 3;
      for (let dy = -OR; dy <= OR; dy++) {
        for (let dx = -OR; dx <= OR; dx++) {
          const r = Math.sqrt(dx*dx + dy*dy);
          if (r < IR || r > OR) continue;
          const rn = (r - IR) / (OR - IR);
          const x = ((cx + dx) % W + W) % W;
          const y = ((cy + dy) % H + H) % H;
          data[(y * W + x) * 4] = Math.sin(Math.PI * rn) * 0.9;
        }
      }
    };
    placeDisk((W/2 - 15)|0, H/2|0);
    placeDisk((W/2 + 15)|0, H/2|0);
    return data;
  }

  function scatterSeed(W, H, density = 0.12, minR = 0.0, maxR = 1.0) {
    const data = new Float32Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      if (Math.random() < density) {
        data[i * 4] = minR + Math.random() * (maxR - minR);
      }
    }
    return data;
  }

  // Place N ring-shaped seeds that match the orbium profile the Lenia kernel was designed for.
  // Pure pixel scatter dies in <10 steps (average potential ≈ 0.06, bell at mu=0.135).
  function leniaNoiseSeed(W, H) {
    const data = new Float32Array(W * H * 4);
    const n = Math.max(20, Math.round(W * H / 10000));
    for (let i = 0; i < n; i++) {
      const cx = (Math.random() * W) | 0;
      const cy = (Math.random() * H) | 0;
      const OR = 7 + ((Math.random() * 5) | 0);  // outer radius 7-11
      const IR = 2 + ((Math.random() * 3) | 0);  // inner radius 2-4
      const amp = 0.6 + Math.random() * 0.3;
      for (let dy = -OR; dy <= OR; dy++) {
        for (let dx = -OR; dx <= OR; dx++) {
          const r = Math.sqrt(dx*dx + dy*dy);
          if (r < IR || r > OR) continue;
          const v  = amp * Math.sin(Math.PI * (r - IR) / (OR - IR)) * (0.8 + Math.random() * 0.2);
          const x  = ((cx + dx) % W + W) % W;
          const y  = ((cy + dy) % H + H) % H;
          data[(y * W + x) * 4] = Math.min(1, data[(y * W + x) * 4] + v);
        }
      }
    }
    return data;
  }

  // Two-channel ring seeds — alternates species so both start populated.
  function leniaMC2Seed(W, H) {
    const data = new Float32Array(W * H * 4);
    const n = Math.max(30, Math.round(W * H / 8000));
    for (let i = 0; i < n; i++) {
      const cx  = (Math.random() * W) | 0;
      const cy  = (Math.random() * H) | 0;
      const ch  = i % 2;
      const OR  = 7 + ((Math.random() * 9) | 0);  // 7-15 (kernel 1 has radius 21)
      const IR  = 2 + ((Math.random() * 4) | 0);
      const amp = 0.6 + Math.random() * 0.3;
      for (let dy = -OR; dy <= OR; dy++) {
        for (let dx = -OR; dx <= OR; dx++) {
          const r = Math.sqrt(dx*dx + dy*dy);
          if (r < IR || r > OR) continue;
          const v = amp * Math.sin(Math.PI * (r - IR) / (OR - IR)) * (0.8 + Math.random() * 0.2);
          const x = ((cx + dx) % W + W) % W;
          const y = ((cy + dy) % H + H) % H;
          data[(y * W + x) * 4 + ch] = Math.min(1, data[(y * W + x) * 4 + ch] + v);
        }
      }
    }
    return data;
  }

  // Dense disk blobs for SmoothLife — ring kernel edges land in the survival band [0.28, 0.68].
  function smoothlifeBlobSeed(W, H) {
    const data = new Float32Array(W * H * 4);
    const n = Math.max(20, Math.round(W * H / 5000));
    for (let i = 0; i < n; i++) {
      const cx  = (Math.random() * W) | 0;
      const cy  = (Math.random() * H) | 0;
      const R   = 12 + Math.random() * 20;
      const amp = 0.65 + Math.random() * 0.3;
      const ri  = Math.ceil(R);
      for (let dy = -ri; dy <= ri; dy++) {
        for (let dx = -ri; dx <= ri; dx++) {
          if (dx*dx + dy*dy > R*R) continue;
          const x = ((cx + dx) % W + W) % W;
          const y = ((cy + dy) % H + H) % H;
          data[(y * W + x) * 4] = Math.min(1, amp * (0.85 + Math.random() * 0.15));
        }
      }
    }
    return data;
  }

  function grayScottSeed(W, H) {
    const data = new Float32Array(W * H * 4);
    // A = 1 everywhere; sparse random B noise to break symmetry at boundaries
    for (let i = 0; i < W * H; i++) {
      data[i * 4]     = 1.0;
      data[i * 4 + 1] = Math.random() < 0.008 ? Math.random() * 0.04 : 0;
    }
    // Dense seed patches scaled to viewport — ~25–35% area coverage
    const patches = Math.max(25, Math.round(W * H / 12000));
    const R       = Math.max(25, Math.floor(Math.min(W, H) / 18));
    for (let p = 0; p < patches; p++) {
      const cx = Math.floor(Math.random() * W);
      const cy = Math.floor(Math.random() * H);
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          if (dx*dx + dy*dy > R*R) continue;
          const x   = ((cx + dx) % W + W) % W;
          const y   = ((cy + dy) % H + H) % H;
          const idx = (y * W + x) * 4;
          data[idx]     = 0.5  + (Math.random() - 0.5) * 0.05;
          data[idx + 1] = 0.25 + (Math.random() - 0.5) * 0.05;
        }
      }
    }
    return data;
  }

  const CREATURES = [
    {
      id: 'orbium', name: 'Orbium', specId: 'lenia',
      desc: 'The canonical Lenia glider. A self-sustaining ring that locomotes diagonally.',
      seed: orbiumSeed,
    },
    {
      id: 'geminium', name: 'Geminium', specId: 'lenia',
      desc: 'Two coupled orbiums. Forms a stable rotating pair under standard Lenia.',
      seed: geminiumSeed,
    },
    {
      id: 'scatter', name: 'Random Scatter', specId: 'lenia',
      desc: 'Ring-blob initialization. Self-organizes into multiple organisms.',
      seed: leniaNoiseSeed,
    },
    {
      id: 'scatter-dense', name: 'Dense Field', specId: 'lenia',
      desc: 'Dense ring-blob field. Produces a complex turbulent ecosystem.',
      seed: (W, H) => {
        const d = leniaNoiseSeed(W, H);
        // second pass — double the blobs for a denser ecosystem
        const extra = leniaNoiseSeed(W, H);
        for (let i = 0; i < W * H; i++) d[i * 4] = Math.min(1, d[i * 4] + extra[i * 4]);
        return d;
      },
    },
    {
      id: 'smooth-scatter', name: 'SmoothLife Scatter', specId: 'smoothlife',
      desc: 'Blob-based seed for SmoothLife. Blob edges land in the survival band.',
      seed: smoothlifeBlobSeed,
    },
    {
      id: 'gs-coral', name: 'Gray-Scott: Coral', specId: 'gray-scott',
      desc: 'Classic Gray-Scott coral/fingerprint patterns. F=0.0545, k=0.0620.',
      seed: grayScottSeed,
      specOverrides: { growth: { params: { F: 0.0545, K: 0.0620 } } },
    },
    {
      id: 'gs-mitosis', name: 'Gray-Scott: Mitosis', specId: 'gray-scott',
      desc: 'Replicating spots — mitosis-like cell division.',
      seed: grayScottSeed,
      specOverrides: { growth: { params: { F: 0.0367, K: 0.0649 } } },
    },
    {
      id: 'gs-maze', name: 'Gray-Scott: Maze', specId: 'gray-scott',
      desc: 'Labyrinthine maze channels.',
      seed: grayScottSeed,
      specOverrides: { growth: { params: { F: 0.029, K: 0.057 } } },
    },
    {
      id: 'lenia2-scatter', name: 'Lenia 2-species', specId: 'lenia-mc2',
      desc: 'Two coupled Lenia fields. Ring seeds alternate between species.',
      seed: leniaMC2Seed,
    },
  ];

  // ─── Public API ───────────────────────────────────────────────────────────

  let _pipeline = null;
  let _gpuCanvas = null;
  let _gl = null;
  let _activeSpecId = null;
  let _ready = false;
  let _canvasW = 0;
  let _canvasH = 0;
  let _userSimScale = null; // null = use spec default

  function activateSpec(specId, creatureId, canvasW, canvasH) {
    const spec = SPECS[specId];
    if (!spec) { console.error('[ASF] Unknown spec:', specId); return false; }

    // Tear down previous pipeline
    if (_pipeline) { _pipeline.dispose(); _pipeline = null; }
    if (!_gpuCanvas) {
      _gpuCanvas = document.createElement('canvas');
      _gl = createGL(_gpuCanvas);
      if (!_gl) {
        console.error('[ASF] WebGL 2 not available');
        _gpuCanvas = null;
        return false;
      }
    }

    // Deep-merge creature spec overrides if applicable
    let finalSpec = spec;
    if (creatureId) {
      const creature = CREATURES.find(c => c.id === creatureId);
      if (creature && creature.specOverrides) {
        finalSpec = deepMerge(spec, creature.specOverrides);
      }
    }

    // Compute world size from raw canvas dims ÷ effective simScale
    if (canvasW && canvasH) {
      _canvasW = canvasW;
      _canvasH = canvasH;
      const scale = _userSimScale ?? finalSpec.simScale ?? 1;
      const W = Math.max(1, Math.round(canvasW / scale));
      const H = Math.max(1, Math.round(canvasH / scale));
      finalSpec = Object.assign({}, finalSpec, {
        world: Object.assign({}, finalSpec.world, { width: W, height: H }),
      });
    }

    try {
      _pipeline = new Pipeline(_gl, _gpuCanvas, finalSpec);
      _activeSpecId = specId;
    } catch (e) {
      console.error('[ASF] Pipeline compilation failed:', e);
      _pipeline = null;
      return false;
    }

    // Initialize world
    const creature = CREATURES.find(c => c.id === (creatureId || specId + '-scatter') && c.specId === specId)
      || CREATURES.find(c => c.specId === specId);
    if (creature) {
      _pipeline.upload(creature.seed(finalSpec.world.width, finalSpec.world.height));
    } else {
      _pipeline.upload(scatterSeed(finalSpec.world.width, finalSpec.world.height));
    }

    _ready = true;
    return true;
  }

  function deepMerge(base, override) {
    const result = Object.assign({}, base);
    for (const key of Object.keys(override)) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = deepMerge(base[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }

  window.ASF = {
    SPECS,
    CREATURES,
    COLORMAPS: Object.keys(COLORMAPS),

    isGPUMode(mode) { return mode in SPECS; },

    activate(specId, creatureId, W, H) {
      return activateSpec(specId, creatureId, W, H);
    },

    deactivate() {
      if (_pipeline) { _pipeline.dispose(); _pipeline = null; }
      _activeSpecId = null;
      _ready = false;
    },

    step() {
      if (_ready && _pipeline) _pipeline.step();
    },

    blit(ctx, canvasW, canvasH, cameraX, cameraY, zoom) {
      if (_ready && _pipeline) _pipeline.blit(ctx, canvasW, canvasH, cameraX, cameraY, zoom);
    },

    paintAt(wx, wy, radius, value) {
      if (_ready && _pipeline) _pipeline.paintAt(wx, wy, radius, value);
    },

    randomize(density) {
      if (!_ready || !_pipeline) return;
      const W = _pipeline.W, H = _pipeline.H;
      switch (_activeSpecId) {
        case 'gray-scott':    _pipeline.upload(grayScottSeed(W, H));       break;
        case 'lenia':         _pipeline.upload(leniaNoiseSeed(W, H));      break;
        case 'smoothlife':    _pipeline.upload(smoothlifeBlobSeed(W, H));  break;
        case 'lenia-mc2':     _pipeline.upload(leniaMC2Seed(W, H));        break;
        case 'fractal-lenia': _pipeline.upload(leniaNoiseSeed(W, H));      break;
        default:              _pipeline.upload(scatterSeed(W, H, density || 0.15)); break;
      }
    },

    // Additively blend fresh seeds into the live state — existing organisms are preserved.
    // Used by adaptive control so reseeds never flash or erase running creatures.
    injectLife() {
      if (!_ready || !_pipeline) return;
      const W = _pipeline.W, H = _pipeline.H;
      let fresh;
      switch (_activeSpecId) {
        case 'lenia':         fresh = leniaNoiseSeed(W, H);      break;
        case 'lenia-mc2':     fresh = leniaMC2Seed(W, H);        break;
        case 'smoothlife':    fresh = smoothlifeBlobSeed(W, H);  break;
        case 'fractal-lenia': fresh = leniaNoiseSeed(W, H);      break;
        default: return; // gray-scott handled separately
      }
      const current = _pipeline.readPixels();
      const ch = _activeSpecId === 'lenia-mc2' ? 2 : 1;
      for (let i = 0; i < W * H; i++) {
        for (let c = 0; c < ch; c++) {
          const idx = i * 4 + c;
          current[idx] = Math.max(current[idx], fresh[idx]);
        }
      }
      _pipeline.upload(current);
    },

    clear() {
      if (!_ready || !_pipeline) return;
      const W = _pipeline.W, H = _pipeline.H;
      const data = new Float32Array(W * H * 4);
      if (_activeSpecId === 'gray-scott') {
        // Resting state for GS: A=1 everywhere, B=0
        for (let i = 0; i < W * H; i++) data[i * 4] = 1.0;
      }
      // For all others: all-zero = empty world
      _pipeline.upload(data);
      _pipeline._clearPaint();
    },

    spawnCreature(creatureId, wx, wy) {
      if (!_ready || !_pipeline) return;
      const creature = CREATURES.find(c => c.id === creatureId);
      if (!creature || creature.specId !== _activeSpecId) return;
      const W = _pipeline.W, H = _pipeline.H;
      // seedData is always generated centered at (W/2, H/2)
      const seedData = creature.seed(W, H);
      const current = _pipeline.readPixels();
      const halfW = W >> 1, halfH = H >> 1;
      // offsetX/Y = how much to shift the seed's center to (wx, wy)
      const offX = Math.round(wx) - halfW;
      const offY = Math.round(wy) - halfH;
      for (let sy = 0; sy < H; sy++) {
        for (let sx = 0; sx < W; sx++) {
          const sv = seedData[(sy * W + sx) * 4];
          if (sv <= 0.01) continue;
          const dx = ((sx + offX) % W + W) % W;
          const dy = ((sy + offY) % H + H) % H;
          current[(dy * W + dx) * 4] = Math.min(1, current[(dy * W + dx) * 4] + sv);
        }
      }
      _pipeline.upload(current);
    },

    setParam(key, value) {
      if (!_pipeline) return;
      if (key in _pipeline) _pipeline[key] = value;
    },

    getParam(key) {
      return _pipeline ? _pipeline[key] : undefined;
    },

    getWorldSize() {
      if (!_pipeline) return [512, 512];
      return [_pipeline.W, _pipeline.H];
    },

    getSimScale(specId) {
      const id = specId || _activeSpecId;
      return _userSimScale ?? (id && SPECS[id]?.simScale) ?? 1;
    },

    setSimScale(n) {
      _userSimScale = (n && n > 0) ? n : null;
      if (_activeSpecId && _canvasW && _canvasH) {
        activateSpec(_activeSpecId, null, _canvasW, _canvasH);
      }
    },

    setFractalC(cr, ci) {
      if (_pipeline) { _pipeline.fracCR = cr; _pipeline.fracCI = ci; }
    },

    getActiveSpecId() { return _activeSpecId; },
    isReady() { return _ready && _pipeline !== null; },

    recompileDisplay(colormap) {
      if (!_ready || !_pipeline) return;
      _pipeline.spec.display = _pipeline.spec.display || {};
      _pipeline.spec.display.colormap = colormap;
      try {
        const gl = _gl;
        if (_pipeline._dProg) gl.deleteProgram(_pipeline._dProg);
        _pipeline._dProg = linkProgram(gl, VERT, makeDisplayFrag(_pipeline.spec));
      } catch(e) { console.error('[ASF] Display recompile failed:', e); }
    },

    setKernelParam(idx, key, val) {
      if (!_pipeline) return;
      const k = _pipeline.spec.kernels[idx];
      if (!k) return;
      k[key] = val;
      if (key === 'radius') {
        const gl = _gl;
        gl.deleteProgram(_pipeline._kProgs[idx]);
        _pipeline._kProgs[idx] = linkProgram(gl, VERT, kernelFragSrc(k));
      }
    },

    getKernelParams(idx) {
      if (!_pipeline) return null;
      const k = _pipeline.spec.kernels[idx];
      if (!k) return null;
      return { type: k.type || 'ring', radius: k.radius || 13, innerFrac: k.innerFrac || 0, alpha: k.alpha || 4 };
    },

    getKernelCount() {
      return _pipeline ? _pipeline.spec.kernels.length : 0;
    },

    recompileGrowth(glslBody) {
      if (!_pipeline) return { ok: false, error: 'No active pipeline' };
      _pipeline.spec.growth = { type: 'glsl', glsl: glslBody };
      try {
        const gl = _gl;
        gl.deleteProgram(_pipeline._gProg);
        _pipeline._gProg = linkProgram(gl, VERT, makeGrowthFrag(_pipeline.spec));
        return { ok: true };
      } catch(e) {
        return { ok: false, error: e.message };
      }
    },

    getGrowthGlsl() {
      if (!_pipeline) return null;
      const g = _pipeline.spec.growth;
      return g.type === 'glsl' ? g.glsl : null;
    },

    estimateDensity() {
      if (!_ready || !_pipeline) return 0;
      const S = 64;
      const buf = new Float32Array(S * S * 4);
      const gl = _gl;
      const W = _pipeline.W, H = _pipeline.H;
      const ox = (W - S) >> 1, oy = (H - S) >> 1;
      gl.bindFramebuffer(gl.FRAMEBUFFER, _pipeline._state._f[_pipeline._state._i]);
      gl.readPixels(ox, oy, S, S, gl.RGBA, gl.FLOAT, buf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      let sum = 0;
      for (let i = 0; i < S * S; i++) sum += buf[i * 4];
      return sum / (S * S);
    },
  };
})();
