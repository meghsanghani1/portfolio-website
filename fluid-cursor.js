const DEFAULTS = {
  simResolution: 128,
  dyeResolution: 1440,
  densityDissipation: 3.5,
  velocityDissipation: 2,
  pressure: 0.1,
  pressureIterations: 20,
  curl: 3,
  splatRadius: 0.2,
  splatForce: 6000,
  shading: true,
  colorUpdateSpeed: 10,
  rainbow: true,
  color: "#ff0000",
  intensity: 0.15,
  maxDpr: 2,
  idleStopMs: 4000,
  respectReducedMotion: true,
  zIndex: 50,
  mount: document.body,
};

const noopController = () => ({
  canvas: null,
  config: { ...DEFAULTS },
  running: false,
  splat() {},
  set() {},
  destroy() {},
});

const VERTEX = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const COPY = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
void main () { gl_FragColor = texture2D(uTexture, vUv); }`;

const CLEAR = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`;

const SPLAT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;
#ifdef MANUAL_FILTERING
vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
#endif
void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
#ifdef MANUAL_FILTERING
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec4 result = texture2D(uSource, coord);
#endif
  gl_FragColor = result / (1.0 + dissipation * dt);
}`;

const DIVERGENCE = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const CURL = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

const PRESSURE = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SUBTRACT = `
precision mediump float;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

const displaySource = (shading) => `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 texelSize;
void main () {
  vec3 c = texture2D(uTexture, vUv).rgb;
  ${shading ? `
  float L = length(texture2D(uTexture, vUv - vec2(texelSize.x, 0.0)).rgb);
  float R = length(texture2D(uTexture, vUv + vec2(texelSize.x, 0.0)).rgb);
  float T = length(texture2D(uTexture, vUv + vec2(0.0, texelSize.y)).rgb);
  float B = length(texture2D(uTexture, vUv - vec2(0.0, texelSize.y)).rgb);
  vec3 n = normalize(vec3(R - L, T - B, length(texelSize)));
  float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
  c *= diffuse;
  ` : ""}
  float a = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c, a);
}`;

function convertShader(source, type, isWebGL2) {
  if (!isWebGL2) return source;
  let converted = source
    .replace(/\battribute\b/g, "in")
    .replace(/\btexture2D\b/g, "texture");
  if (type === "vertex") converted = converted.replace(/\bvarying\b/g, "out");
  else {
    converted = converted
      .replace(/\bvarying\b/g, "in")
      .replace(/\bgl_FragColor\b/g, "fragColor")
      .replace(/precision\s+(?:lowp|mediump|highp)\s+float;\s*/g, "");
  }
  return `#version 300 es\n${type === "fragment" ? "precision highp float;\nout vec4 fragColor;\n" : ""}${converted}`;
}

function hexToRgb(value) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value || "");
  return match ? match.slice(1).map((part) => parseInt(part, 16) / 255) : [1, 0, 0];
}

function hsvToRgb(h, s = 1, v = 1) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
}

export function splashCursor(options = {}) {
  const config = { ...DEFAULTS, ...options };
  if (config.respectReducedMotion && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { ...noopController(), config };
  }

  const canvas = document.createElement("canvas");
  canvas.className = "fluid-cursor-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.zIndex = String(config.zIndex);
  canvas.style.pointerEvents = "none";
  const contextOptions = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false };
  let gl = canvas.getContext("webgl2", contextOptions);
  const isWebGL2 = Boolean(gl);
  if (!gl) gl = canvas.getContext("webgl", contextOptions) || canvas.getContext("experimental-webgl", contextOptions);
  if (!gl) return { ...noopController(), config };
  config.mount.append(canvas);

  let destroyed = false;
  let frame = 0;
  let running = false;
  let lastTime = performance.now();
  let idleDeadline = lastTime + config.idleStopMs;
  let hue = Math.random();
  let lastColorTime = lastTime;
  const pointers = new Map();
  const cleanups = [];

  const halfFloat = isWebGL2 ? gl.HALF_FLOAT : gl.getExtension("OES_texture_half_float")?.HALF_FLOAT_OES;
  const supportsLinear = isWebGL2 || Boolean(gl.getExtension("OES_texture_half_float_linear"));
  if (isWebGL2) gl.getExtension("EXT_color_buffer_float");
  else gl.getExtension("EXT_color_buffer_half_float");
  if (!halfFloat) {
    canvas.remove();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ...noopController(), config };
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    const kind = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    gl.shaderSource(shader, convertShader(source, kind, isWebGL2));
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Fluid ${kind} shader failed: ${reason}`);
    }
    return shader;
  }

  class Program {
    constructor(fragment) {
      const vertex = compile(gl.VERTEX_SHADER, VERTEX);
      const pixel = compile(gl.FRAGMENT_SHADER, fragment);
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertex);
      gl.attachShader(this.program, pixel);
      gl.linkProgram(this.program);
      gl.deleteShader(vertex);
      gl.deleteShader(pixel);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
      this.uniforms = {};
      const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i += 1) {
        const name = gl.getActiveUniform(this.program, i).name;
        this.uniforms[name] = gl.getUniformLocation(this.program, name);
      }
    }
    bind() { gl.useProgram(this.program); }
    destroy() { gl.deleteProgram(this.program); }
  }

  function canRender(internalFormat, format) {
    const texture = gl.createTexture();
    const fbo = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, halfFloat, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    return complete;
  }

  let rgbaFormat;
  let rgFormat;
  let rFormat;
  if (isWebGL2) {
    rgbaFormat = [gl.RGBA16F, gl.RGBA];
    if (!canRender(rgbaFormat[0], rgbaFormat[1])) {
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return { ...noopController(), config };
    }
    rgFormat = canRender(gl.RG16F, gl.RG) ? [gl.RG16F, gl.RG] : rgbaFormat;
    rFormat = canRender(gl.R16F, gl.RED)
      ? [gl.R16F, gl.RED]
      : (canRender(gl.RG16F, gl.RG) ? [gl.RG16F, gl.RG] : rgbaFormat);
  } else {
    rgbaFormat = rgFormat = rFormat = [gl.RGBA, gl.RGBA];
    if (!canRender(rgbaFormat[0], rgbaFormat[1])) {
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return { ...noopController(), config };
    }
  }

  const programs = {
    copy: new Program(COPY),
    clear: new Program(CLEAR),
    splat: new Program(SPLAT),
    advection: new Program(`${supportsLinear ? "" : "#define MANUAL_FILTERING\n"}${ADVECTION}`),
    divergence: new Program(DIVERGENCE),
    curl: new Program(CURL),
    vorticity: new Program(VORTICITY),
    pressure: new Program(PRESSURE),
    gradient: new Program(GRADIENT_SUBTRACT),
    display: new Program(displaySource(config.shading)),
  };

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

  function setProgram(program) {
    program.bind();
    const location = gl.getAttribLocation(program.program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  }

  function resolution(base) {
    const aspect = canvas.width / canvas.height;
    return aspect >= 1
      ? { width: Math.round(base * aspect), height: base }
      : { width: base, height: Math.round(base / aspect) };
  }

  function createFBO(width, height, filtering = gl.NEAREST, formatSpec = rgbaFormat) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, formatSpec[0], width, height, 0, formatSpec[1], halfFloat, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture, fbo, width, height,
      texelSizeX: 1 / width,
      texelSizeY: 1 / height,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; },
      destroy() { gl.deleteTexture(texture); gl.deleteFramebuffer(fbo); },
    };
  }

  function createDoubleFBO(width, height, filtering, formatSpec) {
    let read = createFBO(width, height, filtering, formatSpec);
    let write = createFBO(width, height, filtering, formatSpec);
    return {
      get read() { return read; },
      get write() { return write; },
      swap() { [read, write] = [write, read]; },
      destroy() { read.destroy(); write.destroy(); },
    };
  }

  function blit(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo || null);
    gl.viewport(0, 0, target?.width || canvas.width, target?.height || canvas.height);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  let dye;
  let velocity;
  let divergence;
  let curl;
  let pressure;

  function resizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, config.maxDpr);
    const width = Math.max(2, Math.floor(innerWidth * dpr));
    const height = Math.max(2, Math.floor(innerHeight * dpr));
    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width;
    canvas.height = height;
    return true;
  }

  function copyInto(source, target) {
    programs.copy.bind();
    setProgram(programs.copy);
    gl.uniform2f(programs.copy.uniforms.texelSize, 1 / target.width, 1 / target.height);
    gl.uniform1i(programs.copy.uniforms.uTexture, source.attach(0));
    blit(target);
  }

  function initialiseFramebuffers(preserve = false) {
    const sim = resolution(config.simResolution);
    const dyeBase = supportsLinear ? config.dyeResolution : Math.min(config.dyeResolution, 256);
    const dyeSize = resolution(dyeBase);
    const filter = supportsLinear ? gl.LINEAR : gl.NEAREST;
    const oldDye = dye;
    const oldVelocity = velocity;
    dye = createDoubleFBO(dyeSize.width, dyeSize.height, filter, rgbaFormat);
    velocity = createDoubleFBO(sim.width, sim.height, filter, rgFormat);
    divergence?.destroy();
    curl?.destroy();
    pressure?.destroy();
    divergence = createFBO(sim.width, sim.height, gl.NEAREST, rFormat);
    curl = createFBO(sim.width, sim.height, gl.NEAREST, rFormat);
    pressure = createDoubleFBO(sim.width, sim.height, gl.NEAREST, rFormat);
    if (preserve && oldDye && oldVelocity) {
      copyInto(oldDye.read, dye.read);
      copyInto(oldVelocity.read, velocity.read);
    }
    oldDye?.destroy();
    oldVelocity?.destroy();
  }

  function bindTexture(program, name, fbo, unit) {
    gl.uniform1i(program.uniforms[name], fbo.attach(unit));
  }

  function splatInternal(x, y, dx, dy, color) {
    const aspect = canvas.width / canvas.height;
    programs.splat.bind();
    setProgram(programs.splat);
    gl.uniform1f(programs.splat.uniforms.aspectRatio, aspect);
    gl.uniform2f(programs.splat.uniforms.point, x, y);
    gl.uniform1f(programs.splat.uniforms.radius, config.splatRadius / 100);

    bindTexture(programs.splat, "uTarget", velocity.read, 0);
    gl.uniform3f(programs.splat.uniforms.color, dx, dy, 0);
    blit(velocity.write);
    velocity.swap();

    bindTexture(programs.splat, "uTarget", dye.read, 0);
    gl.uniform3f(programs.splat.uniforms.color, color[0], color[1], color[2]);
    blit(dye.write);
    dye.swap();
  }

  function currentColor(multiplier = 1) {
    const base = config.rainbow ? hsvToRgb(hue, 0.72, 1) : hexToRgb(config.color);
    return base.map((channel) => channel * config.intensity * multiplier);
  }

  function wake() {
    if (destroyed) return;
    idleDeadline = performance.now() + config.idleStopMs;
    if (!running) {
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(update);
    }
  }

  function publicSplat(clientX, clientY, dx, dy, color) {
    if (destroyed || !dye) return;
    const x = clientX / innerWidth;
    const y = 1 - clientY / innerHeight;
    const rgb = Array.isArray(color) ? color : color ? hexToRgb(color) : currentColor();
    splatInternal(x, y, dx, dy, rgb);
    wake();
  }

  function step(dt) {
    gl.disable(gl.BLEND);

    programs.curl.bind();
    setProgram(programs.curl);
    gl.uniform2f(programs.curl.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
    bindTexture(programs.curl, "uVelocity", velocity.read, 0);
    blit(curl);

    programs.vorticity.bind();
    setProgram(programs.vorticity);
    gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
    bindTexture(programs.vorticity, "uVelocity", velocity.read, 0);
    bindTexture(programs.vorticity, "uCurl", curl, 1);
    gl.uniform1f(programs.vorticity.uniforms.curl, config.curl);
    gl.uniform1f(programs.vorticity.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    programs.divergence.bind();
    setProgram(programs.divergence);
    gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
    bindTexture(programs.divergence, "uVelocity", velocity.read, 0);
    blit(divergence);

    programs.clear.bind();
    setProgram(programs.clear);
    gl.uniform2f(programs.clear.uniforms.texelSize, pressure.read.texelSizeX, pressure.read.texelSizeY);
    bindTexture(programs.clear, "uTexture", pressure.read, 0);
    gl.uniform1f(programs.clear.uniforms.value, config.pressure);
    blit(pressure.write);
    pressure.swap();

    programs.pressure.bind();
    setProgram(programs.pressure);
    gl.uniform2f(programs.pressure.uniforms.texelSize, pressure.read.texelSizeX, pressure.read.texelSizeY);
    bindTexture(programs.pressure, "uDivergence", divergence, 0);
    for (let i = 0; i < config.pressureIterations; i += 1) {
      bindTexture(programs.pressure, "uPressure", pressure.read, 1);
      blit(pressure.write);
      pressure.swap();
    }

    programs.gradient.bind();
    setProgram(programs.gradient);
    gl.uniform2f(programs.gradient.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
    bindTexture(programs.gradient, "uPressure", pressure.read, 0);
    bindTexture(programs.gradient, "uVelocity", velocity.read, 1);
    blit(velocity.write);
    velocity.swap();

    programs.advection.bind();
    setProgram(programs.advection);
    gl.uniform2f(programs.advection.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
    gl.uniform2f(programs.advection.uniforms.dyeTexelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
    bindTexture(programs.advection, "uVelocity", velocity.read, 0);
    bindTexture(programs.advection, "uSource", velocity.read, 1);
    gl.uniform1f(programs.advection.uniforms.dt, dt);
    gl.uniform1f(programs.advection.uniforms.dissipation, config.velocityDissipation);
    blit(velocity.write);
    velocity.swap();

    gl.uniform2f(programs.advection.uniforms.dyeTexelSize, dye.read.texelSizeX, dye.read.texelSizeY);
    bindTexture(programs.advection, "uVelocity", velocity.read, 0);
    bindTexture(programs.advection, "uSource", dye.read, 1);
    gl.uniform1f(programs.advection.uniforms.dissipation, config.densityDissipation);
    blit(dye.write);
    dye.swap();
  }

  function render() {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    programs.display.bind();
    setProgram(programs.display);
    gl.uniform2f(programs.display.uniforms.texelSize, dye.read.texelSizeX, dye.read.texelSizeY);
    bindTexture(programs.display, "uTexture", dye.read, 0);
    blit(null);
    gl.disable(gl.BLEND);
  }

  function update(now) {
    if (destroyed) return;
    if (now >= idleDeadline) {
      running = false;
      frame = 0;
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, 1 / 60);
    lastTime = now;
    if (config.rainbow && now - lastColorTime >= 1000 / config.colorUpdateSpeed) {
      hue = (hue + 0.035) % 1;
      lastColorTime = now;
    }
    step(dt);
    render();
    frame = requestAnimationFrame(update);
  }

  function onPointerMove(event) {
    if (event.pointerType === "mouse" && event.buttons === 0 && event.clientX === 0 && event.clientY === 0) return;
    const prior = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!prior) return;
    let dx = ((event.clientX - prior.x) / innerWidth) * config.splatForce;
    let dy = (-(event.clientY - prior.y) / innerHeight) * config.splatForce;
    const aspect = innerWidth / innerHeight;
    if (aspect < 1) dx *= aspect;
    if (aspect > 1) dy /= aspect;
    if (Math.abs(dx) + Math.abs(dy) < 0.01) return;
    publicSplat(event.clientX, event.clientY, dx, dy);
  }

  function onPointerDown(event) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const burst = currentColor(10);
    publicSplat(
      event.clientX,
      event.clientY,
      10 * (Math.random() - 0.5),
      30 * (Math.random() - 0.5),
      burst,
    );
  }

  function onPointerEnd(event) { pointers.delete(event.pointerId); }
  function onResize() {
    if (!resizeCanvas()) return;
    initialiseFramebuffers(true);
    wake();
  }
  function onVisibility() {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      running = false;
    } else {
      wake();
    }
  }
  function onContextLost(event) {
    event.preventDefault();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    running = false;
  }

  const on = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  };

  on(window, "pointermove", onPointerMove, { passive: true });
  on(window, "pointerdown", onPointerDown, { passive: true });
  on(window, "pointerup", onPointerEnd, { passive: true });
  on(window, "pointercancel", onPointerEnd, { passive: true });
  on(window, "resize", onResize, { passive: true });
  on(document, "visibilitychange", onVisibility);
  on(canvas, "webglcontextlost", onContextLost);

  try {
    resizeCanvas();
    initialiseFramebuffers(false);
    wake();
  } catch (error) {
    console.warn("Fluid cursor could not start:", error);
    destroy();
    return { ...noopController(), config };
  }

  function set(partial = {}) {
    const resolutionChanged = partial.simResolution !== undefined || partial.dyeResolution !== undefined || partial.maxDpr !== undefined;
    const shadingChanged = partial.shading !== undefined && partial.shading !== config.shading;
    Object.assign(config, partial);
    canvas.style.zIndex = String(config.zIndex);
    if (shadingChanged) {
      programs.display.destroy();
      programs.display = new Program(displaySource(config.shading));
    }
    if (resolutionChanged) {
      resizeCanvas();
      initialiseFramebuffers(true);
    }
    wake();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    running = false;
    cleanups.splice(0).forEach((off) => off());
    dye?.destroy();
    velocity?.destroy();
    divergence?.destroy();
    curl?.destroy();
    pressure?.destroy();
    Object.values(programs).forEach((program) => program.destroy());
    gl.deleteBuffer(position);
    gl.deleteBuffer(indices);
    canvas.remove();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    pointers.clear();
  }

  return {
    canvas,
    config,
    get running() { return running; },
    splat: publicSplat,
    set,
    destroy,
  };
}
