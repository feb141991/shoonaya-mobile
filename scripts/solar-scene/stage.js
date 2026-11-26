/* Solar Day 3D scene: the picture only. Every fact (times, windows, heights) is shown
   by the native screen; this page draws the sky, the Sun, the light and the world for
   the minute the screen sends, and reports drags back as minutes.

   Messages in  (window.solarScene.receive): {type:'day', geo, windows:[{start,end,color}]},
                {type:'time', minutes}, {type:'motion', on}
   Messages out (ReactNativeWebView.postMessage): {type:'ready'}, {type:'unsupported'},
                {type:'drag', deltaMinutes} */
(function () {
  'use strict';
  var post = function (message) {
    try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message)); } catch (_) {}
  };
  var TAU = Math.PI * 2, RAD = Math.PI / 180;
  var SQ = 0.5; // east-west squeeze so sunrise and sunset stay in view: a picture, not a map
  // three r155+ lights are physically based. These factors keep the prototype's look:
  // pi for sun and sky light, and a distance allowance for the small oil lamps.
  var LIGHT = Math.PI, LAMP_SCALE = 30;
  var G = window.SolarGeometry;
  THREE.ColorManagement.enabled = false; // the prototype converts its own colours with sRGB()

  var stage = document.getElementById('stage');
  var renderer = null;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (_) { renderer = null; }
  if (!renderer) { post({ type: 'unsupported' }); return; }

  var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(84, 1.6, 0.5, 400);
  var sRGB = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };
  var geo = null, windows = [], minutes = 720, facing = Math.PI, motionOn = false;
  var sunLight, hemi, sunCore, sunGlow, skyU, ground, hillMat, stars, arcGroup, labelEls = [];

  function wrapPi(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  // Real compass bearing -> bearing in the scene, where straight ahead is the side the
  // Sun culminates on (south from most of India, north south of the tropic).
  function sceneAz(az) { return Math.PI + wrapPi(az - facing) * SQ * (facing === Math.PI ? 1 : -1); }
  function dirFrom(altRad, az) {
    var s = sceneAz(az);
    return new THREE.Vector3(Math.cos(altRad) * Math.sin(s - Math.PI), Math.sin(altRad), -Math.cos(altRad) * Math.cos(s - Math.PI));
  }
  function sunDir(m) { return dirFrom(G.sunAltitudeDeg(m, geo) * RAD, G.sunAzimuthRad(m, geo)); }

  var STOPS = [[-18, '#070B22', '#101A3A'], [-9, '#141C45', '#3B3F78'], [-3, '#3A3F7E', '#E07A5F'], [2, '#6D8FD0', '#F6B26B'],
    [10, '#7FB2E8', '#F9DDB0'], [30, '#6FB0EE', '#CFE6F8'], [90, '#5EA3EA', '#BFE0F7']];
  function palette(alt) {
    var i = 0; while (i < STOPS.length - 2 && alt > STOPS[i + 1][0]) i++;
    var A = STOPS[i], B = STOPS[i + 1], t = Math.max(0, Math.min(1, (alt - A[0]) / (B[0] - A[0])));
    return { top: new THREE.Color(A[1]).lerp(new THREE.Color(B[1]), t), hor: new THREE.Color(A[2]).lerp(new THREE.Color(B[2]), t) };
  }

  /*WORLD*/

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  stage.appendChild(renderer.domElement);
  camera.position.set(0, 1.5, 6); camera.rotation.order = 'YXZ'; camera.rotation.x = 0.15;
  scene.fog = new THREE.Fog(0xffffff, 50, 170);

  skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top;uniform vec3 hor;varying vec3 vP;void main(){float h=clamp(vP.y,0.,1.);gl_FragColor=vec4(mix(hor,top,pow(h,.5)),1.);}'
  })));

  (function () { // decorative stars, not a star map
    var r = rng(7), p = [];
    for (var i = 0; i < 420; i++) { var az = r() * TAU, el = Math.asin(0.05 + r() * 0.95); p.push(150 * Math.cos(el) * Math.sin(az), 150 * Math.sin(el), -150 * Math.cos(el) * Math.cos(az)); }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(stars);
  })();

  ground = new THREE.Mesh(riverGroundGeometry(), new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  hillMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true });
  (function () {
    var r = rng(11);
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * TAU + r() * 0.2, R = 62 + r() * 10, w = 9 + r() * 10, h = 3 + r() * 5;
      var m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, TAU, 0, Math.PI / 2), hillMat);
      m.scale.set(w, h, w * 0.8); m.position.set(R * Math.sin(a), 0, -R * Math.cos(a)); scene.add(m);
    }
  })();

  buildWorld();

  sunCore = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }));
  scene.add(sunCore);
  (function () {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,230,160,.95)'); g.addColorStop(0.25, 'rgba(255,200,110,.4)'); g.addColorStop(1, 'rgba(255,180,90,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    scene.add(sunGlow);
  })();
  sunLight = new THREE.DirectionalLight(0xfff1dc, 2 * LIGHT); sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 140 }); sunLight.shadow.bias = -0.0006;
  sunLight.target.position.set(0, 0, -18); scene.add(sunLight, sunLight.target);
  hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8c7a5a, 0.6 * LIGHT); scene.add(hemi);
  arcGroup = new THREE.Group(); scene.add(arcGroup);

  function makeLabels() {
    var box = document.getElementById('labels'); box.innerHTML = ''; labelEls = [];
    var names = facing === Math.PI ? ['East', 'South', 'West'] : ['West', 'North', 'East'];
    var bearings = facing === Math.PI ? [90, 180, 270] : [270, 0, 90];
    names.forEach(function (t, i) { var e = document.createElement('div'); e.className = 'lab'; e.textContent = t; box.appendChild(e); labelEls.push({ e: e, az: bearings[i] * RAD }); });
  }

  function rebuildArc() {
    while (arcGroup.children.length) { var o = arcGroup.children.pop(); if (o.geometry) o.geometry.dispose(); }
    var path = function (a, b) {
      var out = [], e = b < a ? b + 1440 : b;
      for (var m = a; m <= e; m += 4) { var mm = m % 1440; if (G.sunAltitudeDeg(mm, geo) >= 0) out.push(sunDir(mm).multiplyScalar(56)); }
      return out;
    };
    var full = path(0, 1439);
    if (full.length > 1) {
      var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(full), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1.2, gapSize: 1.2, transparent: true, opacity: 0.55, fog: false }));
      l.computeLineDistances(); arcGroup.add(l);
    }
    windows.forEach(function (w) {
      var p = path(w.start, w.end); if (p.length < 2) return;
      arcGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), Math.max(4, p.length * 2), 0.55, 8, false),
        new THREE.MeshBasicMaterial({ color: sRGB(w.color), fog: false })));
    });
  }

  function draw() {
    if (!geo) return;
    var a = G.sunAltitudeDeg(minutes, geo), k = Math.max(0, Math.min(1, (a + 2) / 12)), pal = palette(a);
    skyU.top.value.copy(pal.top); skyU.hor.value.copy(pal.hor); scene.fog.color.copy(pal.hor).convertSRGBToLinear();
    var d = sunDir(minutes), P = d.clone().multiplyScalar(56);
    sunCore.position.copy(P); sunGlow.position.copy(P);
    var vis = a > -4; sunCore.visible = vis; sunGlow.visible = vis;
    var low = Math.max(0, Math.min(1, 1 - (a - 2) / 24));
    sunCore.material.color.set(new THREE.Color('#FFE08A').lerp(new THREE.Color('#FF8A3D'), low));
    sunGlow.scale.setScalar(26 + 30 * low); sunGlow.material.opacity = Math.max(0, Math.min(1, (a + 4) / 10));
    sunLight.position.copy(d.clone().multiplyScalar(60)).add(sunLight.target.position);
    sunLight.intensity = 1.5 * LIGHT * k;
    sunLight.color.copy(new THREE.Color('#FFB878').lerp(new THREE.Color('#FFF6E4'), 1 - low)).convertSRGBToLinear();
    hemi.intensity = (0.18 + 0.45 * k) * LIGHT; hemi.color.copy(pal.hor).convertSRGBToLinear(); hemi.groundColor.copy(sRGB('#7A6A4C'));
    var dayK = Math.max(0, Math.min(1, (a + 7) / 18));
    ground.material.color.copy(new THREE.Color('#1F283B').lerp(new THREE.Color('#B3A47E'), dayK)).convertSRGBToLinear();
    hillMat.color.copy(new THREE.Color('#161D2D').lerp(new THREE.Color('#8E8F68'), dayK)).convertSRGBToLinear();
    stars.material.opacity = Math.max(0, Math.min(1, (-a - 5) / 10));
    riverUpdate(a, d); lampUpdate(a);
    renderer.render(scene, camera);
    var w = stage.clientWidth, h = stage.clientHeight, v = new THREE.Vector3();
    labelEls.forEach(function (l) {
      var s = sceneAz(l.az);
      v.set(Math.sin(s - Math.PI), 0.02, -Math.cos(s - Math.PI)).multiplyScalar(56).project(camera);
      l.e.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * w) + 'px,' + ((-v.y * 0.5 + 0.5) * h + 6) + 'px) translate(-50%,0)';
    });
  }

  function resize() {
    var w = stage.clientWidth || 360, h = stage.clientHeight || Math.round(w / 1.6);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);

  // Breeze, flames and water move only while motion is on (the screen turns it off for reduced motion).
  var animId = 0, lastAnim = 0;
  function anim(ts) {
    animId = 0; if (!motionOn || document.hidden) return;
    animId = requestAnimationFrame(anim); if (ts - lastAnim < 33) return; lastAnim = ts;
    windU.value = ts / 1000; worldTick(ts / 1000); draw();
  }
  function setMotion(on) { motionOn = !!on; if (motionOn && !animId) animId = requestAnimationFrame(anim); else draw(); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && motionOn && !animId) animId = requestAnimationFrame(anim); });

  // Drag left or right to move the time: one stage width is the whole day.
  var dragging = false, lastX = 0;
  stage.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; try { stage.setPointerCapture(e.pointerId); } catch (_) {} });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return; var dx = e.clientX - lastX; lastX = e.clientX;
    if (dx) post({ type: 'drag', deltaMinutes: (dx / (stage.clientWidth || 1)) * 1440 });
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { stage.addEventListener(n, function () { dragging = false; }); });

  window.solarScene = {
    receive: function (msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'day' && msg.geo) {
        geo = msg.geo; windows = Array.isArray(msg.windows) ? msg.windows : [];
        var noonAz = G.sunAzimuthRad(geo.noonMinutes, geo);
        facing = Math.cos(noonAz) > 0 ? 0 : Math.PI;
        makeLabels(); rebuildArc(); resize();
      } else if (msg.type === 'time' && typeof msg.minutes === 'number' && isFinite(msg.minutes)) {
        minutes = ((msg.minutes % 1440) + 1440) % 1440; if (!motionOn) draw();
      } else if (msg.type === 'motion') {
        setMotion(msg.on);
      }
    }
  };
  post({ type: 'ready' });
})();
