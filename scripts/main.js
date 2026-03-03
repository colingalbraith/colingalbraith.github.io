(() => {
  if (!window.THREE) {
    console.error("Three.js failed to load.");
    return;
  }

  const canvas = document.getElementById("bg");
  if (!canvas) {
    return;
  }

  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25));
  renderer.setClearColor(0xf5f3ef, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf5f3ef, 0.018);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.6, 22000);
  camera.position.set(0, 16, 62);
  camera.lookAt(0, 2, 0);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  function seededRand(seed) {
    let s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function buildTerrain(segments, xSpan, zSpan, heightScale, seed, peakBias) {
    const rand = seededRand(seed);
    const geo = new THREE.PlaneGeometry(xSpan, zSpan, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const ex = Math.max(0, 1 - Math.abs(x / (xSpan * 0.5)) * 1.4);
      const ez = Math.max(0, 1 - Math.abs(z / (zSpan * 0.5)) * 1.0);
      const edge = ex * ez;
      let h = 0;
      h += (rand() - 0.3) * 1.0;
      h += (rand() - 0.3) * 0.5;
      h = h * heightScale * edge;

      if (peakBias) {
        const dx = x - peakBias.cx;
        const dz = z - peakBias.cz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const infl = Math.max(0, 1 - dist / peakBias.radius);
        h += peakBias.extra * infl * infl * edge;
      }

      pos.setY(i, h);
    }

    return geo;
  }

  const farGeo = buildTerrain(24, 120, 80, 14, 42, { cx: 10, cz: -10, radius: 25, extra: 10 });
  const midGeo = buildTerrain(30, 100, 70, 18, 17, { cx: -5, cz: 5, radius: 20, extra: 14 });
  const nearGeo = buildTerrain(18, 110, 60, 8, 99, null);

  function halftoneMat(paperColor, inkColor, cellSize, opacity, ambient, diffuseStrength, contrast) {
    return new THREE.ShaderMaterial({
      extensions: { derivatives: true },
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        uPaper: { value: new THREE.Color(paperColor) },
        uInk: { value: new THREE.Color(inkColor) },
        uCellSize: { value: cellSize },
        uOpacity: { value: opacity },
        uAmbient: { value: ambient },
        uDiffuseStrength: { value: diffuseStrength },
        uContrast: { value: contrast },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uPaper;
        uniform vec3 uInk;
        uniform float uCellSize;
        uniform float uOpacity;
        uniform float uAmbient;
        uniform float uDiffuseStrength;
        uniform float uContrast;
        varying vec3 vWorldPos;

        void main() {
          vec3 faceNormal = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
          if (!gl_FrontFacing) {
            faceNormal *= -1.0;
          }

          vec3 lightDir = normalize(vec3(-0.45, 0.86, 0.23));
          float diffuse = max(dot(faceNormal, lightDir), 0.0);
          float luminance = clamp(uAmbient + diffuse * uDiffuseStrength, 0.0, 1.0);
          luminance = pow(luminance, uContrast);
          float darkness = 1.0 - luminance;

          mat2 rot = mat2(0.8660254, -0.5, 0.5, 0.8660254);
          vec2 grid = rot * (gl_FragCoord.xy / uCellSize);
          vec2 cell = fract(grid) - 0.5;
          float radial = clamp(length(cell) * 1.41421356, 0.0, 1.0);

          float inkMask = step(radial, darkness);
          vec3 color = mix(uPaper, uInk, inkMask);
          gl_FragColor = vec4(color, uOpacity);
        }
      `
    });
  }

  const farMesh = new THREE.Mesh(farGeo, halftoneMat(0xf5f3ef, 0x111111, 8.2, 0.46, 0.24, 0.68, 1.0));
  const midMesh = new THREE.Mesh(midGeo, halftoneMat(0xf5f3ef, 0x111111, 6.9, 0.57, 0.18, 0.76, 1.0));
  const nearMesh = new THREE.Mesh(nearGeo, halftoneMat(0xf5f3ef, 0x111111, 5.9, 0.68, 0.12, 0.84, 1.0));

  farMesh.position.set(0, -4, -30);
  midMesh.position.set(0, 0, -12);
  nearMesh.position.set(0, -6, 14);
  scene.add(farMesh, midMesh, nearMesh);

  const groundGeo = new THREE.PlaneGeometry(26000, 26000, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshBasicMaterial({
    color: 0xe9e5de,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });
  const groundPlane = new THREE.Mesh(groundGeo, groundMat);
  groundPlane.position.y = -6.62;
  scene.add(groundPlane);

  const gridHelper = new THREE.GridHelper(26000, 280, 0xcccccc, 0xdddddd);
  gridHelper.position.y = -6.56;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.1;
  scene.add(gridHelper);

  let scrollRaw = 0;
  let scrollSmooth = 0;
  let rafId = null;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollEase = prefersReducedMotion ? 1 : 0.14;
  const settleThreshold = 0.0004;

  function readScroll() {
    const max = document.body.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  }

  function applyScene(s) {
    const orbitTurns = prefersReducedMotion ? 0.55 : 0.9;
    const orbitAngle = s * Math.PI * 2.0 * orbitTurns;
    const orbitRadius = 72;
    const camX = Math.cos(orbitAngle) * orbitRadius;
    const camY = 16 + Math.sin(s * Math.PI * 2.0) * 1.0;
    const camZ = Math.sin(orbitAngle) * orbitRadius;
    camera.position.set(camX, camY, camZ);

    camera.lookAt(0, 2.5, 0);

    farMesh.position.z = -30;
    farMesh.rotation.y = s * 0.24;

    midMesh.position.z = -12;
    midMesh.rotation.y = -s * 0.18;

    nearMesh.position.z = 14;
    nearMesh.rotation.y = s * 0.12;

    // Re-center helper planes under the camera to create an "infinite" ground.
    const snap = 24;
    groundPlane.position.x = camera.position.x;
    groundPlane.position.z = camera.position.z;
    gridHelper.position.x = Math.round(camera.position.x / snap) * snap;
    gridHelper.position.z = Math.round(camera.position.z / snap) * snap;

    scene.fog.density = 0.018 - s * 0.004;
  }

  function renderScene() {
    applyScene(scrollSmooth);
    renderer.render(scene, camera);
  }

  function tick() {
    scrollSmooth += (scrollRaw - scrollSmooth) * scrollEase;
    if (Math.abs(scrollRaw - scrollSmooth) < settleThreshold) {
      scrollSmooth = scrollRaw;
    }

    renderScene();

    if (Math.abs(scrollRaw - scrollSmooth) > settleThreshold) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function requestTick() {
    if (rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function syncFromScroll() {
    scrollRaw = readScroll();
    requestTick();
  }

  window.addEventListener("scroll", syncFromScroll, { passive: true });
  window.addEventListener("resize", () => {
    resize();
    syncFromScroll();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }
    if (!document.hidden) {
      requestTick();
    }
  });

  scrollRaw = readScroll();
  scrollSmooth = scrollRaw;
  renderScene();
})();
