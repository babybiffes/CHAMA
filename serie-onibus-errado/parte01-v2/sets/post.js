// post.js: the "hand-drawn 3-D" look of the references.
// Pass 1: colour + depth. Pass 2: view-space normals. Composite: ink lines from depth/normal edges
// (every crease and silhouette gets a line, like Blender Freestyle), a paper grain, a soft warm grade,
// and a strong fisheye barrel. Output goes to the canvas, tone-mapped and sRGB.
import * as THREE from 'three';

export function pipeline(R, W, H, { scale = 1 } = {}) {
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const depthTex = new THREE.DepthTexture(w, h); depthTex.type = THREE.UnsignedIntType;
  const color = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture: depthTex, samples: 0 });
  const normal = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
  const normalMat = new THREE.MeshNormalMaterial();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: color.texture }, tNormal: { value: normal.texture }, tDepth: { value: depthTex },
      res: { value: new THREE.Vector2(w, h) }, near: { value: 0.05 }, far: { value: 200 },
      k: { value: 0.9 }, aspect: { value: W / H }, ink: { value: 1.0 }, grain: { value: 1.0 }, time: { value: 0 },
      lineW: { value: 2.2 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tColor, tNormal, tDepth; uniform vec2 res; uniform float near, far, k, aspect, ink, grain, time, lineW;
      varying vec2 vUv;
      float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){
        // fisheye: centre magnified, corners keep their place
        vec2 d = vUv - 0.5; d.x *= aspect;
        float rc = 0.25 * aspect * aspect + 0.25;
        vec2 s = d * (1.0 + k * dot(d, d)) / (1.0 + k * rc); s.x /= aspect;
        vec2 uv = s + 0.5;
        // hand-drawn wobble on the line lookup only
        vec2 wob = (vec2(vnoise(uv * 90.0 + 3.1), vnoise(uv * 90.0 - 7.7)) - 0.5) * 1.2 / res;
        vec2 px = lineW / res;
        float dc = lin(texture2D(tDepth, uv + wob).r);
        vec3 nc = texture2D(tNormal, uv + wob).rgb;
        float dEdge = 0.0, nEdge = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = (i == 0) ? vec2(px.x, 0.0) : (i == 1) ? vec2(-px.x, 0.0) : (i == 2) ? vec2(0.0, px.y) : vec2(0.0, -px.y);
          float dn = lin(texture2D(tDepth, uv + wob + o).r);
          dEdge = max(dEdge, abs(dn - dc) / max(dc, 0.3));
          nEdge = max(nEdge, length(texture2D(tNormal, uv + wob + o).rgb - nc));
        }
        float line = max(smoothstep(0.015, 0.045, dEdge), smoothstep(0.18, 0.4, nEdge)) * ink;
        line *= smoothstep(160.0, 40.0, dc) * 0.85 + 0.15;          // far lines thin out
        vec4 c = texture2D(tColor, uv);
        // paper: fine grain + soft blotches, multiplied
        float g = hash(floor(vUv * res * 0.5) + floor(time * 12.0)) * 0.06 + vnoise(vUv * vec2(6.0, 10.0)) * 0.07;
        c.rgb *= 1.0 - grain * (g - 0.05);
        c.rgb = mix(c.rgb, vec3(0.06, 0.045, 0.05), line * 0.92);
        gl_FragColor = c;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene(); scene.add(quad);
  const ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    mat,
    render(scene3, cam3, t, o = {}) {
      mat.uniforms.near.value = cam3.near; mat.uniforms.far.value = cam3.far;
      mat.uniforms.k.value = o.k ?? 0.9; mat.uniforms.time.value = t;
      R.setRenderTarget(color); R.setClearColor(0x000000, 1); R.clear(); R.render(scene3, cam3);
      const bg = scene3.background, fog = scene3.fog;
      scene3.overrideMaterial = normalMat; scene3.background = null; scene3.fog = null;
      R.setRenderTarget(normal); R.setClearColor(0x8080ff, 1); R.clear(); R.render(scene3, cam3);
      scene3.overrideMaterial = null; scene3.background = bg; scene3.fog = fog;
      R.setRenderTarget(null); R.render(scene, ocam);
    },
  };
}
