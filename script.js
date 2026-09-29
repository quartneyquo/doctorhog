const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W = canvas.width;
const H = canvas.height;
const assets = {
  doctor: new Image(),
  office: new Image(),
  bug: new Image(),
  code: new Image()
};
assets.doctor.src = './doctor-hog.png';
assets.office.src = './office-gmi.png';
assets.bug.src = './bug-gmi.png';
assets.code.src = './code-terminal-gmi.png';
const music = typeof Audio === 'function' ? new Audio('./lofi-jazz-gmi.mp3') : null;
if (music) { music.loop = true; music.volume = .2; music.preload = 'none'; }

const levels = [
  {
    name: 'THE EVENT ROOM',
    title: 'The missing event',
    description: 'Catch falling bugs to restore event capture.',
    code: "01  function collectSnack() {\n02    posthog.capture('snack_taken')\n03  }",
    preview: "01  function collectSnack() {\n02    ???\n03  }",
    wave: 6, interval: 1.25, speed: 128
  },
  {
    name: 'THE IDENTITY LAB',
    title: 'Hoglet has no name',
    description: 'Keep bugs away while you reconnect the user.',
    code: "01  function onLogin(user) {\n02    posthog.identify(user.id)\n03  }",
    preview: "01  function onLogin(user) {\n02    ???\n03  }",
    wave: 8, interval: 1.05, speed: 166
  },
  {
    name: 'THE FLAG WARD',
    title: 'A sleepy feature flag',
    description: 'Protect the last ward and wake the snack shelf.',
    code: "01  const canOpen =\n02    posthog.isFeatureEnabled(\n03      'snack-shelf'\n04    )",
    preview: "01  const canOpen =\n02    ???",
    wave: 10, interval: .87, speed: 205
  }
];
function makeLanes(width) {
  const count = Math.max(7, Math.round(width / 125));
  return Array.from({ length: count }, function(_, i) { return Math.round((i + 1) * width / (count + 1)); });
}
let lanes = makeLanes(W);
const gameStage = document.getElementById('gameStage');
const patientTypes = [
  ['🐞', 'Ladybug', 'Needs patch'], ['🐝', 'Bumblebee', 'Needs rest'],
  ['🐛', 'Caterpillar', 'Needs food'], ['🪲', 'Firefly', 'Needs debug'],
  ['🪱', 'Worm', 'Needs confidence'], ['🕷️', 'Spider', 'Needs a hug'],
  ['🦋', 'Butterfly', 'Needs wings'], ['🪲', 'Beetle', 'Needs polish'],
  ['🐞', 'Hoglet bug', 'Needs a patch'], ['🐝', 'Honey bug', 'Needs care']
];
const el = {
  stage: document.getElementById('stageLabel'),
  stageName: document.getElementById('stageName'),
  progressText: document.getElementById('timeValue'),
  overlay: document.getElementById('gameOverlay'),
  eyebrow: document.getElementById('overlayEyebrow'),
  title: document.getElementById('overlayTitle'),
  description: document.getElementById('overlayDescription'),
  start: document.getElementById('startButton'),
  toast: document.getElementById('gameToast'),
  sound: document.getElementById('soundButton'),
  pause: document.getElementById('pauseButton'),
  vitals: document.getElementById('vitalsValue'),
  hearts: document.getElementById('heartsValue'),
  bugs: document.getElementById('bugsValue'),
  progress: document.getElementById('bugProgress'),
  score: document.getElementById('scoreValue'),
  best: document.getElementById('bestValue'),
  chartCount: document.getElementById('chartCount'),
  patientRows: document.getElementById('patientRows'),
  codeStatus: document.getElementById('codeStatus'),
  codeTitle: document.getElementById('codeTitle'),
  codeDescription: document.getElementById('codeDescription'),
  snippet: document.getElementById('codeSnippet'),
  patches: document.getElementById('patchTrack')
};
const state = {
  mode: 'intro', level: 0, playerX: 450, face: 1, speed: 490,
  hearts: 3, caught: 0, spawned: 0, resolved: 0, score: 0, best: 0,
  spawnClock: 0, bugs: [], effects: [], keys: new Set(),
  held: new Set(), targetX: null, sound: true, lastTime: 0, shake: 0, lastLane: -1
};
try { state.best = Number(localStorage.getItem('doctor-hog-falling-bugs-best') || 0) || 0; } catch {}
let audioContext;
let toastTimer;

function visibleBounds() {
  const stageRect = gameStage.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  return {
    min: Math.max(0, (stageRect.left - canvasRect.left) / canvasRect.width * W),
    max: Math.min(W, (stageRect.left + stageRect.width - canvasRect.left) / canvasRect.width * W)
  };
}

function resizeGame() {
  const rect = gameStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const cropped = window.innerWidth <= 680 || window.innerWidth / window.innerHeight <= .8;
  const nextW = cropped ? 900 : Math.max(700, Math.round(rect.width / rect.height * H));
  if (nextW === W) return;
  const factor = nextW / W;
  W = nextW;
  canvas.width = W;
  canvas.height = H;
  lanes = makeLanes(W);
  state.playerX *= factor;
  state.speed = 490 * W / 900;
  if (state.targetX !== null) state.targetX *= factor;
  state.bugs.forEach(function(bug) { bug.x *= factor; bug.baseX *= factor; });
  state.effects.forEach(function(effect) { effect.x *= factor; });
  state.lastLane = -1;
}

function syncMusic() {
  if (!music) return;
  if (state.sound && state.mode === 'playing') music.play().catch(function() { toast('Music could not load. Refresh and try again.'); });
  else music.pause();
}

function tone(notes, type) {
  if (!state.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach(function(note) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = note[0];
      const t = audioContext.currentTime + note[1];
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(.07, t + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, t + note[2]);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(t);
      osc.stop(t + note[2] + .02);
    });
  } catch {}
}
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.toast.classList.remove('show'); }, 1400);
}
function overlay(eyebrow, title, description, action) {
  el.eyebrow.textContent = eyebrow;
  el.title.textContent = title;
  el.description.textContent = description;
  el.start.innerHTML = '<span>▶</span> ' + action;
  el.overlay.classList.remove('hidden');
}
function hideOverlay() { el.overlay.classList.add('hidden'); }
function saveBest() {
  if (state.score <= state.best) return;
  state.best = state.score;
  try { localStorage.setItem('doctor-hog-falling-bugs-best', String(state.best)); } catch {}
}

function startGame() {
  state.level = 0;
  state.score = 0;
  startLevel();
}
function startLevel() {
  const level = levels[state.level];
  state.mode = 'playing';
  state.playerX = W / 2;
  state.face = 1;
  state.hearts = 3;
  state.caught = 0;
  state.spawned = 0;
  state.resolved = 0;
  state.spawnClock = level.interval - .45;
  state.lastLane = -1;
  state.bugs = [];
  state.effects = [];
  state.shake = 0;
  state.targetX = null;
  state.keys.clear();
  state.held.clear();
  el.stage.textContent = 'WARD 0' + (state.level + 1);
  el.stageName.textContent = level.name;
  el.codeTitle.textContent = level.title;
  el.codeDescription.textContent = level.description;
  el.codeStatus.textContent = '● DEFEND THE CODE';
  el.pause.disabled = false;
  el.pause.innerHTML = 'Ⅱ <span>PAUSE</span>';
  hideOverlay();
  updateHud();
  syncMusic();
  toast('Incoming bugs! Catch them!');
  tone([[440, 0, .12], [590, .12, .14]]);
}
function updateHud() {
  const level = levels[state.level];
  el.progressText.textContent = state.resolved + ' / ' + level.wave;
  el.hearts.textContent = '♥ '.repeat(state.hearts) + '♡ '.repeat(3 - state.hearts);
  el.hearts.setAttribute('aria-label', state.hearts + ' code shields remaining');
  el.vitals.textContent = state.hearts === 3 ? 'PROTECTED' : state.hearts === 2 ? 'ONE LEAK' : state.hearts === 1 ? 'CRITICAL' : 'CODE CRASHED';
  el.vitals.style.color = state.hearts === 3 ? '#3a9572' : state.hearts === 2 ? '#ad823e' : '#d25f58';
  el.bugs.textContent = state.caught + ' / ' + level.wave;
  el.progress.style.width = state.caught / level.wave * 100 + '%';
  el.score.textContent = String(state.score).padStart(3, '0');
  el.best.textContent = 'BEST ' + String(state.best).padStart(3, '0');
  el.chartCount.textContent = state.caught + ' / ' + level.wave + ' rescued';
  el.patientRows.innerHTML = '';
  for (let i = 0; i < level.wave; i++) {
    const patient = patientTypes[i];
    const row = document.createElement('div');
    row.className = 'patient-row' + (i < state.caught ? ' rescued' : '');
    row.innerHTML = '<span class="patient-emoji">' + patient[0] + '</span><span class="patient-name">' + patient[1] + '</span><span class="patient-status">' + (i < state.caught ? 'Patched!' : patient[2]) + '</span><span class="patient-dots">' + (i < state.caught ? '● ● ● ●' : '○ ○ ○ ○') + '</span>';
    el.patientRows.append(row);
  }
  el.patches.innerHTML = '';
  for (let i = 0; i < level.wave; i++) {
    const part = document.createElement('span');
    if (i < state.caught) part.classList.add('done');
    el.patches.append(part);
  }
  el.snippet.textContent = state.mode === 'between' || state.mode === 'won'
    ? level.code
    : level.preview.replace('???', '???  // ' + (level.wave - state.caught) + ' patches left');
}
function completeLevel() {
  const level = levels[state.level];
  state.score += state.hearts * 75;
  saveBest();
  el.codeStatus.textContent = '● CODE SAVED!';
  el.pause.disabled = true;
  state.targetX = null;
  state.mode = state.level === levels.length - 1 ? 'won' : 'between';
  updateHud();
  syncMusic();
  tone([[523, 0, .16], [659, .14, .16], [784, .28, .25]]);
  if (state.mode === 'won') {
    overlay('✦ SHIFT COMPLETE', 'The code is safe!', 'You stopped the falling bugs across all three wards and earned ' + state.score + ' care points. Doctor Hog saved the day!', 'PLAY AGAIN');
  } else {
    overlay('✚ WARD SAVED', 'Nice catches, Doctor!', 'You kept the ' + level.name.toLowerCase() + ' safe. The next batch of bugs is on its way!', 'NEXT WARD');
  }
}
function lose() {
  state.mode = 'lost';
  state.targetX = null;
  syncMusic();
  el.pause.disabled = true;
  el.codeStatus.textContent = '● CODE CRASHED';
  tone([[300, 0, .2], [210, .17, .3]], 'triangle');
  overlay('♥ CODE NEEDS CARE', 'The bugs got through!', 'Three bugs reached the code. Take a breath and try the ward again. Doctor Hog believes in you!', 'TRY AGAIN');
}
function spawnBug() {
  const level = levels[state.level];
  const bounds = visibleBounds();
  const available = lanes.filter(function(x) { return x >= bounds.min + 10 && x <= bounds.max - 10; });
  if (!available.length) available.push(450);
  let lane = Math.floor(Math.random() * available.length);
  if (lanes.indexOf(available[lane]) === state.lastLane && available.length > 1) lane = (lane + 1) % available.length;
  const x = available[lane];
  state.lastLane = lanes.indexOf(x);
  state.bugs.push({ x, baseX: x, y: -40, age: 0, phase: Math.random() * 6, speed: level.speed * (.9 + Math.random() * .22), status: 'falling' });
  state.spawned++;
}
function catchBug(bug) {
  bug.status = 'caught';
  state.caught++;
  state.resolved++;
  state.score += 100;
  state.effects.push({ x: bug.x, y: bug.y, age: 0, kind: 'catch' });
  tone([[640, 0, .1], [850, .09, .15]]);
  toast(['Clean catch!', 'Bug patched!', 'The code says thanks!'][state.caught % 3]);
  updateHud();
}
function missBug(bug) {
  bug.status = 'missed';
  state.resolved++;
  state.hearts--;
  state.shake = .28;
  state.effects.push({ x: bug.x, y: 427, age: 0, kind: 'miss' });
  tone([[270, 0, .16], [190, .14, .24]], 'triangle');
  toast('A bug reached the code!');
  updateHud();
  if (state.hearts <= 0) lose();
}
function movePlayer(dt) {
  let direction = 0;
  if (state.keys.has('left') || state.held.has('left')) direction--;
  if (state.keys.has('right') || state.held.has('right')) direction++;
  if (direction !== 0) {
    state.targetX = null;
    state.playerX += direction * state.speed * dt;
    state.face = direction;
  } else if (state.targetX !== null) {
    const difference = state.targetX - state.playerX;
    if (Math.abs(difference) < 5) state.targetX = null;
    else {
      const step = Math.sign(difference) * Math.min(Math.abs(difference), state.speed * dt);
      state.playerX += step;
      state.face = Math.sign(step);
    }
  }
  const bounds = visibleBounds();
  const minX = bounds.min + 55;
  const maxX = bounds.max - 55;
  state.playerX = maxX > minX ? Math.max(minX, Math.min(maxX, state.playerX)) : (bounds.min + bounds.max) / 2;
}
function update(dt) {
  const level = levels[state.level];
  movePlayer(dt);
  state.spawnClock += dt;
  while (state.spawned < level.wave && state.spawnClock >= level.interval) {
    state.spawnClock -= level.interval;
    spawnBug();
  }
  for (const bug of state.bugs) {
    if (bug.status !== 'falling') continue;
    bug.age += dt;
    bug.y += bug.speed * dt;
    bug.x = bug.baseX + Math.sin(bug.age * 3.2 + bug.phase) * 16;
    if (Math.abs(bug.x - state.playerX) < 55 && Math.abs(bug.y - 341) < 43) catchBug(bug);
    else if (bug.y >= 424) missBug(bug);
    if (state.mode !== 'playing') break;
  }
  state.bugs = state.bugs.filter(function(bug) { return bug.status === 'falling'; });
  state.effects.forEach(function(effect) { effect.age += dt; });
  state.effects = state.effects.filter(function(effect) { return effect.age < .8; });
  state.shake = Math.max(0, state.shake - dt);
  if (state.mode === 'playing' && state.spawned === level.wave && state.resolved === level.wave) completeLevel();
}
function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawBackground() {
  if (assets.office.complete && assets.office.naturalWidth) {
    const scale = Math.max(W / assets.office.naturalWidth, H / assets.office.naturalHeight);
    const sourceWidth = W / scale;
    const sourceHeight = H / scale;
    ctx.drawImage(assets.office, (assets.office.naturalWidth - sourceWidth) / 2, (assets.office.naturalHeight - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, W, H);
  }
  else {
    ctx.fillStyle = '#e3f0e7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff5e4'; ctx.fillRect(0, 315, W, H - 315);
    ctx.strokeStyle = '#c7d9ca'; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 75) { ctx.beginPath(); ctx.moveTo(x, 315); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 315; y < H; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#f7cfa5'; ctx.fillRect(60, 50, 110, 120);
    ctx.fillStyle = '#faf6e9'; ctx.fillRect(75, 65, 80, 90);
    ctx.fillStyle = '#eeb38c'; ctx.fillRect(710, 72, 135, 18);
  }
  ctx.fillStyle = 'rgba(255, 222, 185, .13)';
  ctx.fillRect(0, 0, W, H);
}
function drawCode() {
  const bounds = visibleBounds();
  const terminalX = bounds.max - 177;
  ctx.fillStyle = 'rgba(86, 95, 54, .18)'; ctx.fillRect(0, 426, W, 74);
  ctx.fillStyle = '#e98978'; ctx.fillRect(0, 423, W, 4);
  ctx.fillStyle = '#513322'; ctx.font = "700 12px 'DM Mono', monospace";
  ctx.fillText('✚ PROTECT THE CODE', bounds.min + 20, 467);
  if (assets.code.complete && assets.code.naturalWidth) {
    ctx.drawImage(assets.code, terminalX, 400, 160, 96);
  } else {
    ctx.fillStyle = '#76b7c7'; ctx.strokeStyle = '#301711'; ctx.lineWidth = 4;
    roundedRect(terminalX + 26, 433, 132, 52, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d6f4d9'; ctx.font = "700 26px 'DM Mono', monospace";
    ctx.fillText('</>', terminalX + 65, 467);
  }
}
function drawFallbackBug(bug) {
  ctx.strokeStyle = '#421a11'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -14); ctx.lineTo(-18, -26); ctx.moveTo(12, -14); ctx.lineTo(18, -26);
  ctx.moveTo(-18, 0); ctx.lineTo(-30, -4); ctx.moveTo(18, 0); ctx.lineTo(30, -4);
  ctx.moveTo(-16, 12); ctx.lineTo(-27, 20); ctx.moveTo(16, 12); ctx.lineTo(27, 20);
  ctx.stroke();
  ctx.fillStyle = '#f5a66e'; ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(-7, -4, 5, 0, Math.PI * 2); ctx.arc(7, -4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2e1a15'; ctx.beginPath(); ctx.arc(-6, -3, 2, 0, Math.PI * 2); ctx.arc(8, -3, 2, 0, Math.PI * 2); ctx.fill();
}
function drawBug(bug, now) {
  ctx.save();
  ctx.translate(bug.x, bug.y + Math.sin(now * .005 + bug.phase) * 3);
  ctx.fillStyle = 'rgba(245, 223, 144, .55)';
  ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill();
  if (assets.bug.complete && assets.bug.naturalWidth) ctx.drawImage(assets.bug, -38, -38, 76, 76);
  else drawFallbackBug(bug);
  ctx.restore();
}
function drawPlayer(now) {
  ctx.save();
  ctx.fillStyle = 'rgba(60, 30, 20, .2)';
  ctx.beginPath(); ctx.ellipse(state.playerX, 402, 44, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(state.playerX, 347 + Math.sin(now * .006) * 2);
  ctx.scale(state.face, 1);
  if (assets.doctor.complete && assets.doctor.naturalWidth) ctx.drawImage(assets.doctor, -67, -67, 134, 134);
  else { ctx.font = '76px sans-serif'; ctx.fillText('🦔', -42, 25); }
  ctx.restore();
}
function drawEffects() {
  state.effects.forEach(function(effect) {
    ctx.save();
    ctx.globalAlpha = 1 - effect.age / .8;
    ctx.fillStyle = effect.kind === 'catch' ? '#d77b45' : '#e05057';
    ctx.font = "700 25px 'Space Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(effect.kind === 'catch' ? '✦ +100' : '✕ CODE HIT', effect.x, effect.y - 25 - effect.age * 55);
    ctx.restore();
  });
}
function draw(now) {
  ctx.save();
  if (state.shake > 0) ctx.translate(Math.sin(now * .07) * 7, 0);
  drawBackground();
  state.bugs.forEach(function(bug) { drawBug(bug, now); });
  drawCode();
  drawPlayer(now);
  drawEffects();
  ctx.restore();
}
function frame(now) {
  const dt = Math.min(.05, (now - (state.lastTime || now)) / 1000);
  state.lastTime = now;
  if (state.mode === 'playing') update(dt);
  draw(now);
  requestAnimationFrame(frame);
}
function togglePause() {
  if (state.mode === 'playing') {
    state.mode = 'paused';
    state.keys.clear(); state.held.clear();
    syncMusic();
    el.pause.innerHTML = '▶ <span>RESUME</span>';
    overlay('Ⅱ SHIFT PAUSED', 'Catch your breath', 'The falling bugs are paused. Resume when you are ready to protect the code.', 'RESUME SHIFT');
  } else if (state.mode === 'paused') {
    state.mode = 'playing';
    el.pause.innerHTML = 'Ⅱ <span>PAUSE</span>';
    hideOverlay();
    syncMusic();
  }
}
el.start.addEventListener('click', function() {
  if (state.mode === 'paused') togglePause();
  else if (state.mode === 'between') { state.level++; startLevel(); }
  else startGame();
});
el.pause.addEventListener('click', togglePause);
el.sound.addEventListener('click', function() {
  state.sound = !state.sound;
  el.sound.setAttribute('aria-pressed', String(state.sound));
  el.sound.setAttribute('aria-label', 'Turn music ' + (state.sound ? 'off' : 'on'));
  el.sound.innerHTML = state.sound ? '♫ <span>MUSIC ON</span>' : '♪ <span>MUSIC OFF</span>';
  if (state.sound) tone([[660, 0, .13]]);
  syncMusic();
});
const keyDirections = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
document.addEventListener('keydown', function(event) {
  if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
    if (event.key === 'Escape' && gameSidebar.classList.contains('open')) { closeChart(); return; }
    if (state.mode === 'playing' || state.mode === 'paused') togglePause();
    return;
  }
  const direction = keyDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  if (state.mode === 'playing') state.keys.add(direction);
});
document.addEventListener('keyup', function(event) {
  const direction = keyDirections[event.key];
  if (direction) state.keys.delete(direction);
});
window.addEventListener('blur', function() {
  state.keys.clear(); state.held.clear();
  if (state.mode === 'playing') togglePause();
});
document.addEventListener('visibilitychange', function() {
  if (document.hidden && state.mode === 'playing') togglePause();
});
document.querySelectorAll('[data-direction]').forEach(function(button) {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', function(event) {
    event.preventDefault();
    if (state.mode !== 'playing') return;
    state.targetX = null;
    state.held.add(direction);
    button.setPointerCapture(event.pointerId);
  });
  const release = function() { state.held.delete(direction); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});
function setTarget(event) {
  if (state.mode !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const bounds = visibleBounds();
  state.targetX = Math.max(bounds.min + 55, Math.min(bounds.max - 55, (event.clientX - rect.left) / rect.width * W));
}
canvas.addEventListener('pointerdown', function(event) {
  setTarget(event);
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', function(event) {
  if (event.buttons || event.pointerType === 'touch') setTarget(event);
});
canvas.addEventListener('pointercancel', function() { state.targetX = null; });
const gameSidebar = document.getElementById('gameSidebar');
const chartToggle = document.getElementById('chartToggle');
function closeChart() {
  gameSidebar.classList.remove('open');
  gameSidebar.setAttribute('aria-hidden', 'true');
  gameSidebar.inert = true;
  chartToggle.setAttribute('aria-expanded', 'false');
  chartToggle.focus();
}
chartToggle.addEventListener('click', function() {
  if (gameSidebar.classList.contains('open')) { closeChart(); return; }
  if (state.mode === 'playing') togglePause();
  gameSidebar.classList.add('open');
  gameSidebar.setAttribute('aria-hidden', 'false');
  gameSidebar.inert = false;
  chartToggle.setAttribute('aria-expanded', 'true');
  document.getElementById('chartClose').focus();
});
document.getElementById('chartClose').addEventListener('click', closeChart);
const fullscreenButton = document.getElementById('fullscreenButton');
fullscreenButton.addEventListener('click', function() {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function() { toast('Full-screen mode is unavailable here.'); });
  else toast('Full-screen mode is unavailable here.');
});
document.addEventListener('fullscreenchange', function() {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.innerHTML = active ? '⛶ <span>Exit full screen</span>' : '⛶ <span>Full screen</span>';
  fullscreenButton.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
  fullscreenButton.setAttribute('aria-pressed', String(active));
  requestAnimationFrame(resizeGame);
});
window.addEventListener('resize', resizeGame);
resizeGame();
updateHud();
requestAnimationFrame(frame);
