/* ============================================================================
   1. ФОРМАТИРОВАНИЕ ЧИСЕЛ, LO-FI РЕЛАКС-МУЗЫКА И ПРОСТРАНСТВЕННЫЙ 3D-ЗВУК ЗОН
   ============================================================================ */
function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 1000) return Math.floor(n).toString();
  const s = ['', ' Тыс', ' Млн', ' Млрд', ' Трлн', ' Квдр', ' Квнт', ' Скст', ' Септ'];
  const t = Math.min(s.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
  const v = n / Math.pow(10, t * 3);
  return v.toFixed(v < 10 ? 2 : (v < 100 ? 1 : 0)) + s[t];
}

let actx = null, soundOn = true, musicOn = true, musicStarted = false;
let chordStep = 0;
let spatialNodes = null;

const RELAX_CHORDS = [
  [174.61, 220.00, 261.63, 329.63, 392.00],
  [146.83, 220.00, 261.63, 349.23, 392.00],
  [110.00, 164.81, 220.00, 246.94, 329.63],
  [130.81, 196.00, 246.94, 293.66, 392.00]
];
const PENTA_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

function initAudioContext() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  if (!musicStarted) {
    musicStarted = true;
    scheduleRelaxMusic();
    initSpatialAudioEngine();
  }
}

function scheduleRelaxMusic() {
  setInterval(() => {
    if (!musicOn || !actx || actx.state !== 'running') return;
    const now = actx.currentTime;
    const chord = RELAX_CHORDS[chordStep % RELAX_CHORDS.length];
    chordStep++;

    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, now);
    filter.connect(actx.destination);

    chord.forEach((freq) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.016, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.9);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + 4.0);
    });

    [0.6, 1.8, 2.9].forEach((delay) => {
      if (Math.random() < 0.72) {
        const note = PENTA_NOTES[Math.floor(Math.random() * PENTA_NOTES.length)];
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(note, now + delay);
        g.gain.setValueAtTime(0.0001, now + delay);
        g.gain.linearRampToValueAtTime(0.012, now + delay + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.4);
        o.connect(g); g.connect(filter);
        o.start(now + delay); o.stop(now + delay + 1.45);
      }
    });
  }, 4000);
}

function initSpatialAudioEngine() {
  if (!actx || spatialNodes) return;
  try {
    const bufSize = actx.sampleRate * 3;
    const noiseBuf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const out = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    function makeNoiseLoop() {
      const src = actx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      src.start();
      return src;
    }

    const seaSrc = makeNoiseLoop();
    const seaFilter = actx.createBiquadFilter();
    seaFilter.type = 'lowpass'; seaFilter.frequency.value = 320;
    const seaGain = actx.createGain(); seaGain.gain.value = 0.0001;
    seaSrc.connect(seaFilter); seaFilter.connect(seaGain); seaGain.connect(actx.destination);

    const roadSrc = makeNoiseLoop();
    const roadFilter = actx.createBiquadFilter();
    roadFilter.type = 'bandpass'; roadFilter.frequency.value = 420; roadFilter.Q.value = 1.2;
    const roadGain = actx.createGain(); roadGain.gain.value = 0.0001;
    roadSrc.connect(roadFilter); roadFilter.connect(roadGain); roadGain.connect(actx.destination);

    const facSrc = makeNoiseLoop();
    const facFilter = actx.createBiquadFilter();
    facFilter.type = 'lowpass'; facFilter.frequency.value = 190;
    const facOsc = actx.createOscillator();
    facOsc.type = 'triangle'; facOsc.frequency.value = 62;
    const facOscGain = actx.createGain(); facOscGain.gain.value = 0.25;
    facOsc.start();
    const facGain = actx.createGain(); facGain.gain.value = 0.0001;
    facSrc.connect(facFilter); facFilter.connect(facGain);
    facOsc.connect(facOscGain); facOscGain.connect(facFilter);
    facGain.connect(actx.destination);

    const railSrc = makeNoiseLoop();
    const railFilter = actx.createBiquadFilter();
    railFilter.type = 'bandpass'; railFilter.frequency.value = 260; railFilter.Q.value = 2.5;
    const railGain = actx.createGain(); railGain.gain.value = 0.0001;
    railSrc.connect(railFilter); railFilter.connect(railGain); railGain.connect(actx.destination);

    spatialNodes = { seaFilter, seaGain, roadFilter, roadGain, facFilter, facGain, railFilter, railGain, lastCarPass: 0, lastChatter: 0 };
  } catch (e) {}
}

function updateSpatialAudio(t) {
  if (!spatialNodes || !actx || actx.state !== 'running') return;
  const now = actx.currentTime;

  if (!soundOn) {
    spatialNodes.seaGain.gain.setTargetAtTime(0.0001, now, 0.2);
    spatialNodes.roadGain.gain.setTargetAtTime(0.0001, now, 0.2);
    spatialNodes.facGain.gain.setTargetAtTime(0.0001, now, 0.2);
    spatialNodes.railGain.gain.setTargetAtTime(0.0001, now, 0.2);
    document.getElementById('spatialStatus').innerText = '🔇 3D-Звук: Выкл';
    return;
  }

  const W = window.innerWidth, H = window.innerHeight;
  const viewCenterX = W / 2, viewCenterY = H * 0.38;
  const originX = W / 2 + camX, originY = H * 0.19 + camY;

  const dx = (viewCenterX - originX) / (TW * zoom);
  const dy = (viewCenterY - originY) / (TH * zoom);
  const focusGx = (dx + dy) * 0.5;
  const focusGy = (dy - dx) * 0.5;

  const zoomFactor = Math.max(0.15, Math.min(1.0, (zoom - 0.55) / 0.85));

  const distSea = Math.abs(focusGy - 21.0);
  const distRoad = Math.abs(focusGy - 16.8);
  const distRail = Math.abs(focusGy - 1.0);
  const distFac = Math.hypot(focusGx - 11.5, focusGy - 7.5);

  const wSea = Math.max(0, 1 - distSea / 6.5) * zoomFactor;
  const wRoad = Math.max(0, 1 - distRoad / 5.5) * zoomFactor;
  const wRail = Math.max(0, 1 - distRail / 5.5) * zoomFactor * ((G.bldg.rail || 0) > 0 ? 1 : 0.2);
  const wFac = Math.max(0, 1 - distFac / 9.5) * zoomFactor;

  const rainBoost = isRainingNow() ? 0.018 : 0;
  const waveCycle = 0.55 + 0.45 * Math.sin(t * 1.4);
  spatialNodes.seaFilter.frequency.setTargetAtTime(190 + waveCycle * 280 + (rainBoost ? 220 : 0), now, 0.15);
  spatialNodes.seaGain.gain.setTargetAtTime(0.0001 + wSea * waveCycle * 0.048 + rainBoost, now, 0.2);

  const trafficWave = 0.65 + 0.35 * Math.sin(t * 2.3 + 1.1);
  spatialNodes.roadFilter.frequency.setTargetAtTime(340 + Math.sin(t * 3.1) * 120, now, 0.15);
  spatialNodes.roadGain.gain.setTargetAtTime(0.0001 + wRoad * trafficWave * 0.038, now, 0.2);

  if (wRoad > 0.38 && t - spatialNodes.lastCarPass > 2.4 && Math.random() < 0.08) {
    spatialNodes.lastCarPass = t;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine';
    const baseF = 110 + Math.random() * 60;
    o.frequency.setValueAtTime(baseF * 1.18, now);
    o.frequency.exponentialRampToValueAtTime(baseF * 0.82, now + 0.9);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(wRoad * 0.012, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    o.connect(g); g.connect(actx.destination);
    o.start(now); o.stop(now + 1.0);
  }
  if (wRoad > 0.42 && t - spatialNodes.lastChatter > 1.8 && Math.random() < 0.07) {
    spatialNodes.lastChatter = t;
    const o = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain();
    o.type = 'triangle';
    const pitch = 190 + Math.random() * 95;
    o.frequency.setValueAtTime(pitch, now);
    o.frequency.linearRampToValueAtTime(pitch * (0.92 + Math.random() * 0.16), now + 0.35);
    f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 3.0;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(wRoad * 0.008, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.connect(f); f.connect(g); g.connect(actx.destination);
    o.start(now); o.stop(now + 0.42);
  }

  const pumpBeat = 0.7 + 0.3 * Math.sin(t * 3.8);
  spatialNodes.facFilter.frequency.setTargetAtTime(140 + pumpBeat * 80, now, 0.15);
  spatialNodes.facGain.gain.setTargetAtTime(0.0001 + wFac * 0.032, now, 0.2);

  const trainNear = (trainPos > -2 && trainPos < 25) ? Math.max(0.25, 1 - Math.abs(focusGx - trainPos) / 14) : 0.15;
  const railRhythm = Math.pow(Math.max(0, Math.sin(t * 11)), 4);
  spatialNodes.railFilter.frequency.setTargetAtTime(220 + railRhythm * 180, now, 0.08);
  spatialNodes.railGain.gain.setTargetAtTime(0.0001 + wRail * trainNear * (0.015 + railRhythm * 0.045), now, 0.1);

  const maxW = Math.max(wSea, wRoad, wRail, wFac);
  let zoneName = '🎧 Зона: Общий план';
  if (maxW > 0.28) {
    if (maxW === wSea) zoneName = '🌊 Звук: Морской прибой';
    else if (maxW === wRoad) zoneName = '🛣️ Звук: Трасса и тротуар';
    else if (maxW === wRail) zoneName = '🚂 Звук: ЖД-магистраль';
    else if (maxW === wFac) zoneName = '🏭 Звук: Завод и качалки';
  }
  document.getElementById('spatialStatus').innerText = zoneName;
}

function toggleRelaxMusic() {
  initAudioContext();
  musicOn = !musicOn;
  const btn = document.getElementById('btnMusic');
  btn.innerText = musicOn ? '🎵 РЕЛАКС: ВКЛ' : '🎵 РЕЛАКС: ВЫКЛ';
  btn.classList.toggle('cyan-ring', musicOn);
}

function sfx(type) {
  initAudioContext();
  if (!soundOn || !actx) return;
  try {
    const now = actx.currentTime;
    if (type === 'upg') {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(f, now + i * 0.04);
        g.gain.setValueAtTime(0.07, now + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.24);
        o.connect(g); g.connect(actx.destination);
        o.start(now + i * 0.04); o.stop(now + i * 0.04 + 0.24);
      });
    } else if (type === 'web') {
      [587.3, 880, 1174.6, 1567.9].forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, now + i * 0.045);
        g.gain.setValueAtTime(0.08, now + i * 0.045);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.28);
        o.connect(g); g.connect(actx.destination);
        o.start(now + i * 0.045); o.stop(now + i * 0.045 + 0.28);
      });
    } else if (type === 'moto') {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(125, now);
      o.frequency.linearRampToValueAtTime(295, now + 0.24);
      g.gain.setValueAtTime(0.09, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      o.connect(g); g.connect(actx.destination); o.start(now); o.stop(now + 0.28);
    } else if (type === 'tap') {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(420, now);
      o.frequency.exponentialRampToValueAtTime(140, now + 0.035);
      g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      o.connect(g); g.connect(actx.destination); o.start(now); o.stop(now + 0.04);
    }
  } catch (e) {}
}

function toggleAudio() {
  initAudioContext();
  soundOn = !soundOn;
  document.getElementById('btnSound').innerText = soundOn ? '🔊 3D-ЗВУК: ВКЛ' : '🔇 3D-ЗВУК: ВЫКЛ';
  sfx('tap');
}

/* ============================================================================
   2. БАЗА ДАННЫХ: 16 ЦЕХОВ, 25 УЗЛОВ ПАУТИНЫ, 16 LOW-POLY МАШИН И АВИАЦИИ
   ============================================================================ */
const SECTORS = [
  { id: 'pumpjacks', name: '1. Куст Станков-Качалок ПШГН', cost: 45, inc: 10, desc: 'Детализированные качалки с А-рамой, балансиром, кривошипом и штоком' },
  { id: 'fence', name: '2. Забор, Тротуары и КПП', cost: 110, inc: 20, desc: 'Периметр с вышками охраны, шлагбаумами, фонарями и брусчаткой' },
  { id: 'derricks', name: '3. Буровые Вышки «Уралмаш»', cost: 260, inc: 45, desc: 'Ажурные решетчатые вышки глубокого бурения недр' },
  { id: 'pipes', name: '4. Нефтепровод и Насосные', cost: 580, inc: 95, desc: 'Магистральные трубы с фланцами, задвижками и манометрами' },
  { id: 'elou', name: '5. Установка ЭЛОУ-АВТ', cost: 1300, inc: 200, desc: 'Горизонтальные сепараторы первичной очистки нефти' },
  { id: 'distill', name: '6. Колонны Крекинга НПЗ', cost: 2900, inc: 440, desc: 'Текстурированные ректификационные башни с дымом и лестницами' },
  { id: 'flares', name: '7. Факельное Хозяйство', cost: 6500, inc: 920, desc: 'Факельные мачты с колебанием пламени от ветра и искрами' },
  { id: 'coolers', name: '8. Гиперболические Градирни', cost: 15000, inc: 2100, desc: 'Бетонные башни охлаждения с физическими частицами белого пара' },
  { id: 'tanks', name: '9. Товарный Парк РВС-20000', cost: 34000, inc: 4600, desc: 'Белые резервуары со стальными швами, лестницами и снегом зимой' },
  { id: 'spheres', name: '10. Шаровые Газгольдеры', cost: 78000, inc: 10200, desc: 'Сферические резервуары СПГ под высоким давлением' },
  { id: 'power', name: '11. Энергоцентр ТЭЦ и ЛЭП', cost: 180000, inc: 23000, desc: 'Подстанция, солнечные панели и опоры ЛЭП с проводами' },
  { id: 'station', name: '12. Флагманская АЗС «Роснефть»', cost: 420000, inc: 52000, desc: 'Светящийся 2.5D-навес, колонки Pulsar и стела с живыми ценниками' },
  { id: 'zerno', name: '13. Кафе «Зерно» и Автомойка', cost: 950000, inc: 115000, desc: 'Кофейня с верандой, светящимися окнами и лазерной мойкой' },
  { id: 'rail', name: '14. ЖД-Виадук и Составы РЖД', cost: 2200000, inc: 260000, desc: 'Железнодорожная ветка со шпалами, прожектором и цистернами' },
  { id: 'port', name: '15. Морской Порт и Шельф «Беркут»', cost: 5500000, inc: 620000, desc: 'Контейнерный причал, краны, танкеры с дымом и морская буровая' },
  { id: 'hq', name: '16. Кампус НИИ, Парк и Спортзал', cost: 14000000, inc: 1500000, desc: 'Стеклянные башни НИИ, сквер с лавочками и зал «Энергия»' }
];

const WEB_TREE = [
  { id: 'w0', x: 50, y: 55, ico: '👑', name: 'Ядро Империи', max: 5, cost: 10, mult: 0.25, req: [] },
  { id: 'w1_l', x: 20, y: 165, ico: '📡', name: '3D Сейсморазведка', max: 5, cost: 20, mult: 0.30, req: ['w0'] },
  { id: 'w1_c', x: 50, y: 165, ico: '⚗️', name: 'Куб Перегонки', max: 5, cost: 20, mult: 0.30, req: ['w0'] },
  { id: 'w1_r', x: 80, y: 165, ico: '🛣️', name: 'Тротуары и Трасса М5', max: 5, cost: 20, mult: 0.30, req: ['w0'] },
  { id: 'w2_l', x: 20, y: 285, ico: '💎', name: 'Алмазные Долота', max: 5, cost: 45, mult: 0.35, req: ['w1_l'] },
  { id: 'w2_c', x: 50, y: 285, ico: '🔥', name: 'Бензин Pulsar 100', max: 5, cost: 50, mult: 0.40, req: ['w1_l', 'w1_c', 'w1_r'] },
  { id: 'w2_r', x: 80, y: 285, ico: '🚧', name: 'Периметр и КПП', max: 5, cost: 45, mult: 0.35, req: ['w1_r'] },
  { id: 'w3_l', x: 20, y: 405, ico: '📐', name: 'Наклонное Бурение', max: 5, cost: 100, mult: 0.45, req: ['w2_l', 'w2_c'] },
  { id: 'w3_c', x: 50, y: 405, ico: '🏫', name: 'Роснефть-Класс', max: 5, cost: 110, mult: 0.50, req: ['w2_c'] },
  { id: 'w3_r', x: 80, y: 405, ico: '☕', name: 'Сеть Кафе «Зерно»', max: 5, cost: 100, mult: 0.45, req: ['w2_c', 'w2_r'] },
  { id: 'w4_l', x: 20, y: 525, ico: '💧', name: 'Гидроразрыв Пласта', max: 5, cost: 220, mult: 0.60, req: ['w3_l'] },
  { id: 'w4_c', x: 50, y: 525, ico: '🛢️', name: 'Масла RN Magnum', max: 5, cost: 240, mult: 0.65, req: ['w3_l', 'w3_c', 'w3_r'] },
  { id: 'w4_r', x: 80, y: 525, ico: '🏍️', name: 'Harrier & Минск Клуб', max: 5, cost: 220, mult: 0.60, req: ['w3_r'] },
  { id: 'w5_l', x: 20, y: 645, ico: '🎓', name: 'Самарский ТехВУЗ', max: 5, cost: 480, mult: 0.80, req: ['w4_l', 'w4_c'] },
  { id: 'w5_c', x: 50, y: 645, ico: '⚡', name: 'Энергосеть ЛЭП', max: 5, cost: 520, mult: 0.85, req: ['w4_c'] },
  { id: 'w5_r', x: 80, y: 645, ico: '🏋️', name: 'Спортзал «Энергия»', max: 5, cost: 480, mult: 0.80, req: ['w4_c', 'w4_r'] },
  { id: 'w6_l', x: 20, y: 765, ico: '⚓', name: 'Шельф «Беркут»', max: 5, cost: 1100, mult: 1.10, req: ['w5_l'] },
  { id: 'w6_c', x: 50, y: 765, ico: '🧬', name: 'Глубокий Крекинг', max: 5, cost: 1200, mult: 1.20, req: ['w5_l', 'w5_c', 'w5_r'] },
  { id: 'w6_r', x: 80, y: 765, ico: '🏎️', name: 'LADA Sport RN', max: 5, cost: 1100, mult: 1.10, req: ['w5_r'] },
  { id: 'w7_l', x: 25, y: 885, ico: '✈️', name: 'Флот Лайнеров Ил-96', max: 5, cost: 2600, mult: 1.50, req: ['w6_l', 'w6_c'] },
  { id: 'w7_r', x: 75, y: 885, ico: '⚛️', name: 'Квантовый Синтез', max: 5, cost: 2600, mult: 1.50, req: ['w6_c', 'w6_r'] },
  { id: 'w8_l', x: 20, y: 1005, ico: '🧊', name: 'Флот «Восток Ойл»', max: 3, cost: 6000, mult: 2.20, req: ['w7_l'] },
  { id: 'w8_c', x: 50, y: 1005, ico: '💎', name: 'Медиа-Ядро @slu1pik', max: 3, cost: 7500, mult: 3.00, req: ['w7_l', 'w7_r'] },
  { id: 'w8_r', x: 80, y: 1005, ico: '🌍', name: 'Мировой Синдикат', max: 3, cost: 6000, mult: 2.20, req: ['w7_r'] }
];

const FLEET_LIST = [
  { id: 'v_kalina', ico: '🚗', name: 'LADA Kalina (Серая)', cost: 350, bonus: 0.12, desc: 'Серый хэтчбек с округлым кузовом и раскосыми фарами на трассе М-5' },
  { id: 'v_vesta_blk', ico: '🖤', name: 'LADA Vesta (Чёрная)', cost: 650, bonus: 0.16, desc: 'Черный седан с фирменными серебристыми Х-молдингами на боковинах' },
  { id: 'v_minsk', ico: '🏍️', name: 'Минск ММВЗ-3.112 Stunt', cost: 1100, bonus: 0.20, desc: 'Классический красный мотоцикл со спицами, фарой и вилли на заднем колесе!' },
  { id: 'v_harrier', ico: '🚙', name: 'Toyota Harrier VIP', cost: 1900, bonus: 0.25, desc: 'Темно-бордовый купе-кроссовер с панорамной крышей и LED-полосой стопов' },
  { id: 'v_zil', ico: '🚚', name: 'Бензовоз ЗИЛ-130', cost: 3200, bonus: 0.30, desc: 'Классический голубой капотный бензовоз с оранжевой цистерной' },
  { id: 'v_kamaz', ico: '🚛', name: 'КАМАЗ-54901 Цистерна', cost: 6500, bonus: 0.38, desc: 'Тяжелый трехосный тягач с полуприцепом-цистерной «Роснефть»' },
  { id: 'v_lada', ico: '🏁', name: 'LADA Vesta Sport RN', cost: 14000, bonus: 0.45, desc: 'Гоночный желто-черный седан с красной линией и антикрылом' },
  { id: 'v_bmw', ico: '🔷', name: 'BMW M5 F90 Competition', cost: 28000, bonus: 0.55, desc: 'Спортивный седан с фирменными «ноздрями» решетки и 4 трубами выхлопа' },
  { id: 'v_gelik', ico: '🚓', name: 'G-Class Охрана КПП', cost: 52000, bonus: 0.65, desc: 'Черный квадратный внедорожник службы безопасности периметра' },
  { id: 'v_ferrari', ico: '🏎️', name: 'Ferrari F8 Tributo', cost: 110000, bonus: 0.85, desc: 'Алый итальянский суперкар Rosso Corsa со стеклянным кокпитом' },
  { id: 'v_lambo', ico: '⚡', name: 'Lamborghini Huracán', cost: 240000, bonus: 1.10, desc: 'Низкий клиновидный суперкар с воздухозаборниками и широким антикрылом' },
  { id: 'v_jet', ico: '✈️', name: 'Авиалайнер «Роснефть-Авиа»', cost: 480000, bonus: 1.35, desc: 'Двухмоторный реактивный самолет — летает по кругу над островом!' },
  { id: 'v_mi8', ico: '🚁', name: 'Вертолет Ми-8МТВ', cost: 950000, bonus: 1.60, desc: 'Облетает изометрический остров по малому кругу над НИИ' },
  { id: 'v_train', ico: '🚂', name: 'ЖД-Состав «Сибирь»', cost: 2100000, bonus: 1.90, desc: 'Ускоряет железнодорожные составы с цистернами на северном виадуке' },
  { id: 'v_tanker', ico: '🚢', name: 'Супертанкер «Звезда»', cost: 5200000, bonus: 2.30, desc: 'Крупнотоннажный нефтеналивной танкер в южной акватории' },
  { id: 'v_berkut', ico: '⚓', name: 'Морская Платформа «Беркут»', cost: 14000000, bonus: 3.00, desc: 'Гигантский шельфовый буровой комплекс в открытом море!' }
];

const REGIONS_LIST = [
  { id: 1, name: 'Оренбургнефть (Бузулукский р-н)', cost: 0, mult: 1.0, grass: '#2f855a', earth: '#5c4033', winter: false },
  { id: 2, name: 'Самаранефтегаз (Поволжье)', cost: 25000, mult: 2.5, grass: '#38a169', earth: '#6b4636', winter: false },
  { id: 3, name: 'Башнефть (Уфа / Урал)', cost: 150000, mult: 6.5, grass: '#2c7a7b', earth: '#4a5568', winter: false },
  { id: 4, name: 'Юганскнефтегаз (ХМАО Тайга)', cost: 950000, mult: 16.0, grass: '#b8d4e3', earth: '#3b4252', winter: true },
  { id: 5, name: 'Ванкорнефть (Енисейский Север)', cost: 6500000, mult: 45.0, grass: '#cbd5e1', earth: '#2d3748', winter: true },
  { id: 6, name: 'Туапсинский Морской Хаб', cost: 48000000, mult: 120.0, grass: '#276749', earth: '#5c4033', winter: false },
  { id: 7, name: 'Сахалин-1 (Охотский Шельф)', cost: 380000000, mult: 340.0, grass: '#d1e5f0', earth: '#334155', winter: true },
  { id: 8, name: 'Восток Ойл (Арктический Таймыр)', cost: 3200000000, mult: 950.0, grass: '#f1f5f9', earth: '#475569', winter: true }
];

const SECRETS_LIST = [
  { id: 'sec_plane', ico: '✈️', name: '1. Борт №1 «Роснефть-Авиа»', desc: 'Купи самолет и тапни прямо по нему в небе!' },
  { id: 'sec_worker', ico: '👷', name: '2. Премия Лучшему Нефтянику', desc: 'Тапни по любому шагающему человечку в каске или на тротуаре!' },
  { id: 'sec_harrier', ico: '🚙', name: '3. Перехват Toyota Harrier', desc: 'Тапни по темно-бордовому кроссоверу Harrier на трассе М-5!' },
  { id: 'sec_minsk', ico: '🏍️', name: '4. Вилли на Минске 3.112', desc: 'Тапни по красному мотоциклу Минск на шоссе, чтобы он встал на заднее колесо!' },
  { id: 'sec_bor', ico: '🌲', name: '5. Хранитель Бузулукского Бора', desc: 'Тапни по соснам и березам в заповедной зоне острова!' },
  { id: 'sec_slu1pik', ico: '💎', name: '6. Медиа-Монолит @slu1pik', desc: 'Тапни по неоновому небоскребу @slu1pik в центре карты!' }
];

const defaultSave = {
  money: 2500,
  sci: 35,
  rep: 50,
  region: 1,
  unlockedRegions: [1],
  bldg: { pumpjacks: 3, fence: 2, derricks: 2, pipes: 2, elou: 1, distill: 2, flares: 1, coolers: 1, tanks: 2, spheres: 1, power: 1, station: 1, zerno: 1, rail: 1, port: 1, hq: 1 },
  web: { w0: 1 },
  fleet: {},
  secrets: {},
  bgTheme: 0,
  timeMode: 0,    // 0: Авто, 1: Рассвет, 2: День, 3: Сумерки, 4: Ночь
  weatherMode: 0, // 0: Авто, 1: Ясно, 2: Дождь, 3: Снег
  boostTime: 0,
  promoUsed: false
};

let G = JSON.parse(localStorage.getItem('rosneft_25d_v12_save')) || JSON.parse(JSON.stringify(defaultSave));
if (!G.web) G.web = { w0: 1 };
if (!G.fleet) G.fleet = {};
if (G.timeMode === undefined) G.timeMode = 0;
if (G.weatherMode === undefined) G.weatherMode = 0;
let buyMult = 1;

/* ============================================================================
   3. МАТЕМАТИКА ДОХОДА И ЗАКУПОК
   ============================================================================ */
function getSingleCost(id, lvl) {
  const b = SECTORS.find(x => x.id === id);
  return Math.floor(b.cost * Math.pow(1.18, lvl));
}
function getBulkBuy(id) {
  const cur = G.bldg[id] || 0;
  let count = buyMult === 'MAX' ? 0 : buyMult;
  let total = 0;
  if (buyMult === 'MAX') {
    let m = G.money, c = getSingleCost(id, cur);
    while (m >= c && cur + count < 250) {
      m -= c; total += c; count++;
      c = getSingleCost(id, cur + count);
    }
    if (count === 0) { count = 1; total = getSingleCost(id, cur); }
  } else {
    for (let i = 0; i < count; i++) total += getSingleCost(id, cur + i);
  }
  return { count, total };
}
function getMilestoneMult(lvl) {
  let m = 1;
  if (lvl >= 10) m *= 2;
  if (lvl >= 25) m *= 2.5;
  if (lvl >= 50) m *= 3;
  if (lvl >= 100) m *= 4;
  return m;
}
function getTotalIncome() {
  let sum = 0;
  SECTORS.forEach(s => {
    const l = G.bldg[s.id] || 0;
    if (l > 0) sum += s.inc * l * getMilestoneMult(l);
  });
  let webMult = 1;
  WEB_TREE.forEach(n => {
    const l = G.web[n.id] || 0;
    if (l > 0) webMult *= (1 + n.mult * l);
  });
  let fleetMult = 1;
  FLEET_LIST.forEach(v => { if (G.fleet[v.id]) fleetMult += v.bonus; });
  const reg = REGIONS_LIST.find(r => r.id === G.region) || REGIONS_LIST[0];
  let res = sum * webMult * fleetMult * reg.mult;
  if (G.boostTime > 0) res *= 2;
  return Math.max(25, Math.round(res));
}
function getSciPerSec() {
  const totalWeb = Object.values(G.web).reduce((a, b) => a + b, 0);
  return +((G.bldg.hq || 1) * 1.4 + totalWeb * 0.6).toFixed(1);
}

/* ============================================================================
   4. ПАКЕТ 1: ДИНАМИЧЕСКИЕ СУТКИ, ПОГОДА, ЛУЖИ, ЧАСТИЦЫ ПАРА/ДЫМА И ВЕТЕР
   ============================================================================ */
const TIME_MODES = [
  { label: '🕒 СУТКИ: АВТО' },
  { label: '🌅 РАССВЕТ' },
  { label: '☀️ ДЕНЬ' },
  { label: '🌆 СУМЕРКИ' },
  { label: '🌙 НОЧЬ' }
];
const WEATHER_MODES = [
  { label: '🌦️ ПОГОДА: АВТО' },
  { label: '☀️ ЯСНО' },
  { label: '🌧️ ДОЖДЬ' },
  { label: '❄️ СНЕГ' }
];

function cycleTimeMode() {
  sfx('tap');
  G.timeMode = ((G.timeMode || 0) + 1) % TIME_MODES.length;
  document.getElementById('btnDayCycle').innerText = TIME_MODES[G.timeMode].label;
}
function cycleWeatherMode() {
  sfx('tap');
  G.weatherMode = ((G.weatherMode || 0) + 1) % WEATHER_MODES.length;
  document.getElementById('btnWeather').innerText = WEATHER_MODES[G.weatherMode].label;
}

// Возвращает фазу суток [0..1): 0.0-0.22 Рассвет, 0.22-0.55 День, 0.55-0.75 Сумерки, 0.75-1.0 Ночь
function getDayCyclePhase() {
  if (G.timeMode === 1) return 0.10; // Рассвет
  if (G.timeMode === 2) return 0.38; // День
  if (G.timeMode === 3) return 0.65; // Сумерки
  if (G.timeMode === 4) return 0.88; // Ночь
  return (time * 0.018) % 1.0;       // Плавный цикл ~55 секунд
}

// Возвращает параметры освещения: nightLights (вкл ли фары/фонари/окна), darkness (0..1), tintRGBA, phaseName
function getLightingState() {
  const ph = getDayCyclePhase();
  if (ph < 0.22) {
    // Рассвет
    const k = 1 - Math.abs(ph - 0.11) / 0.11;
    return {
      phaseName: '🌅 Рассвет',
      nightLights: ph < 0.13,
      lightIntensity: ph < 0.13 ? 0.75 : 0.3,
      darkness: 0.22,
      ambientTint: `rgba(255, 140, 66, ${0.14 + k * 0.08})`
    };
  } else if (ph < 0.55) {
    // День
    return {
      phaseName: '☀️ День',
      nightLights: false,
      lightIntensity: 0.0,
      darkness: 0.0,
      ambientTint: null
    };
  } else if (ph < 0.75) {
    // Сумерки
    const p = (ph - 0.55) / 0.20;
    return {
      phaseName: '🌆 Сумерки',
      nightLights: true,
      lightIntensity: 0.55 + p * 0.45,
      darkness: 0.25 + p * 0.35,
      ambientTint: `rgba(139, 92, 246, 0.18)`
    };
  } else {
    // Ночь
    return {
      phaseName: '🌙 Ночь',
      nightLights: true,
      lightIntensity: 1.0,
      darkness: 0.62,
      ambientTint: `rgba(6, 11, 28, 0.46)`
    };
  }
}

function isWinterNow() {
  if (G.weatherMode === 3) return true;
  if (G.weatherMode === 1 || G.weatherMode === 2) return false;
  const reg = REGIONS_LIST.find(r => r.id === G.region) || REGIONS_LIST[0];
  return !!reg.winter;
}

function isRainingNow() {
  if (G.weatherMode === 2) return true;
  if (G.weatherMode === 1 || G.weatherMode === 3) return false;
  if (isWinterNow()) return false;
  // В режиме АВТО дождь идет периодически
  return Math.sin(time * 0.08) > 0.25;
}

// Динамический ветер (влияет на факельный огонь, пар градирен, дым труб, дождь и снег)
let windX = 0.6;
let puddleWetness = 0.35; // 0..1 влажность луж на асфальте

// Зеркальные лужи на трассе М-5 и бетонной плите завода
const PUDDLES_LIST = [
  { gx: 4.5, gy: 16.25, rx: 16, ry: 7 },
  { gx: 9.8, gy: 17.35, rx: 19, ry: 8 },
  { gx: 14.2, gy: 16.30, rx: 17, ry: 7.5 },
  { gx: 18.8, gy: 17.40, rx: 21, ry: 8.5 },
  { gx: 6.2, gy: 11.45, rx: 15, ry: 7 },
  { gx: 13.5, gy: 7.75, rx: 18, ry: 8 },
  { gx: 17.0, gy: 13.90, rx: 20, ry: 8.5 }
];

// Частицы пара из градирен, дыма из труб и искр факела
const envParticles = [];
// Капли дождя, круги на лужах и снежинки
const weatherDrops = [];
const rainRipples = [];

for (let i = 0; i < 95; i++) {
  weatherDrops.push({
    x: Math.random(),
    y: Math.random(),
    len: 12 + Math.random() * 10,
    speed: 0.65 + Math.random() * 0.45,
    sz: 1.5 + Math.random() * 2.2,
    drift: Math.random() * 6.28
  });
}

function spawnEnvParticles(dt) {
  // 1. Пар из гиперболических градирен (белые густые клубы)
  const coolCount = Math.min(3, G.bldg.coolers || 1);
  for (let i = 0; i < coolCount; i++) {
    if (Math.random() < dt * 7.5) {
      envParticles.push({
        gx: 8.9 + i * 1.65 + (Math.random() - 0.5) * 0.25,
        gy: 5.65 + (Math.random() - 0.5) * 0.25,
        gz: 19.5,
        vx: windX * (0.45 + Math.random() * 0.25),
        vy: (Math.random() - 0.5) * 0.12,
        vz: 3.8 + Math.random() * 1.6,
        r: 4.5 + Math.random() * 2.5,
        grow: 3.2,
        alpha: 0.52,
        life: 0,
        maxLife: 2.4 + Math.random() * 0.8,
        kind: 'steam'
      });
    }
  }

  // 2. Дым из колонн крекинга НПЗ и ТЭЦ
  const distCount = Math.min(8, G.bldg.distill || 2);
  for (let i = 0; i < distCount; i += 2) {
    if (Math.random() < dt * 4.5) {
      const cx = 9.0 + (i % 4) * 1.15;
      const cy = 2.8 + Math.floor(i / 4) * 1.35;
      const topZ = 28.5 + (i % 3) * 5;
      envParticles.push({
        gx: cx,
        gy: cy,
        gz: topZ,
        vx: windX * (0.55 + Math.random() * 0.3),
        vy: (Math.random() - 0.5) * 0.1,
        vz: 4.2 + Math.random() * 1.5,
        r: 3.0 + Math.random() * 1.8,
        grow: 2.6,
        alpha: 0.42,
        life: 0,
        maxLife: 2.2 + Math.random() * 0.7,
        kind: 'smoke'
      });
    }
  }

  // 3. Дым из трубы супертанкера «Звезда»
  if (((G.bldg.port || 0) > 0 || G.fleet.v_tanker) && shipPos > -2 && shipPos < 24 && Math.random() < dt * 5.0) {
    envParticles.push({
      gx: shipPos + 2.35,
      gy: 19.95,
      gz: 17.5,
      vx: windX * 0.5 + 0.35,
      vy: (Math.random() - 0.5) * 0.1,
      vz: 3.2 + Math.random() * 1.2,
      r: 2.8,
      grow: 2.4,
      alpha: 0.40,
      life: 0,
      maxLife: 1.9,
      kind: 'smoke'
    });
  }

  // 4. Искры от факельного хозяйства по ветру
  const flareCount = Math.min(2, Math.max(1, G.bldg.flares || 1));
  for (let f = 0; f < flareCount; f++) {
    if (Math.random() < dt * 9.0) {
      envParticles.push({
        gx: 12.8 + f * 1.2,
        gy: 2.5,
        gz: 34.0,
        vx: windX * (0.85 + Math.random() * 0.5),
        vy: (Math.random() - 0.5) * 0.25,
        vz: 5.5 + Math.random() * 3.0,
        r: 1.3 + Math.random() * 1.0,
        grow: -0.3,
        alpha: 0.95,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.5,
        kind: 'spark'
      });
    }
  }

  // Обновление частиц
  for (let i = envParticles.length - 1; i >= 0; i--) {
    const p = envParticles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      envParticles.splice(i, 1);
      continue;
    }
    p.gx += p.vx * dt;
    p.gy += p.vy * dt;
    p.gz += p.vz * dt;
    p.r = Math.max(0.5, p.r + p.grow * dt);
  }
}

/* ============================================================================
   5. ГИГАНТСКАЯ 2.5D КАРТА 24x24 С ЧЕСТНЫМ Z-БУФЕРОМ И LOW-POLY 3D ОБЪЕКТАМИ
   ============================================================================ */
const canvas = document.getElementById('isoCanvas');
const ctx = canvas.getContext('2d');

const MAP_N = 24;
const TW = 20, TH = 10;

let camX = 0, camY = -55, zoom = 0.86;
let targetCamX = 0, targetCamY = -55, targetZoom = 0.86;
let isDragging = false, dragX = 0, dragY = 0, tapX = 0, tapY = 0;
let time = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function iso(gx, gy, gz = 0) {
  const cx = window.innerWidth / 2 + camX;
  const cy = window.innerHeight * 0.19 + camY;
  return {
    x: cx + (gx - gy) * TW * zoom,
    y: cy + (gx + gy) * TH * zoom - gz * zoom
  };
}

canvas.addEventListener('pointerdown', (e) => {
  initAudioContext();
  isDragging = true;
  dragX = e.clientX - targetCamX;
  dragY = e.clientY - targetCamY;
  tapX = e.clientX; tapY = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  targetCamX = e.clientX - dragX;
  targetCamY = e.clientY - dragY;
});
window.addEventListener('pointerup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  if (Math.hypot(e.clientX - tapX, e.clientY - tapY) < 7) {
    handleIsoTap(e.clientX, e.clientY);
  }
});
canvas.addEventListener('wheel', (e) => {
  initAudioContext();
  targetZoom = Math.max(0.48, Math.min(2.2, targetZoom - e.deltaY * 0.0012));
});
function zoomIso(d) { sfx('tap'); targetZoom = Math.max(0.48, Math.min(2.2, targetZoom + d)); }
function resetIsoCam() { sfx('tap'); targetCamX = 0; targetCamY = -55; targetZoom = 0.86; }

/* --- ПЕРЕЛИВАЮЩИЕСЯ ШЕЙДЕРНЫЕ ФОНЫ С УЧЕТОМ ВРЕМЕНИ СУТОК --- */
const BG_THEMES = [
  { name: '🎨 ФОН: ЖЕЛТО-ЧЕРНЫЙ', mode: 'gold_black' },
  { name: '🎨 ФОН: Ч/Б ПЕРЕЛИВ', mode: 'bw_shimmer' },
  { name: '🌅 ФОН: ЗОЛОТОЙ ЗАКАТ', mode: 'sunset' },
  { name: '💜 ФОН: PURPLE RGB', mode: 'purple' }
];

function cycleShaderTheme() {
  sfx('tap');
  G.bgTheme = ((G.bgTheme || 0) + 1) % BG_THEMES.length;
  document.getElementById('btnShader').innerText = BG_THEMES[G.bgTheme].name;
}

function renderShimmeringBackground(c, W, H, t, lightState) {
  const mode = BG_THEMES[G.bgTheme || 0].mode;
  const shiftX = Math.sin(t * 0.55) * W * 0.25;
  const shiftY = Math.cos(t * 0.42) * H * 0.2;
  const grad = c.createLinearGradient(W * 0.2 + shiftX, shiftY, W * 0.8 - shiftX, H - shiftY);

  const ph = getDayCyclePhase();
  if (ph < 0.22) {
    // Небо рассвета
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.48, '#7c2d12');
    grad.addColorStop(0.75, '#f97316');
    grad.addColorStop(1, '#1e1b4b');
  } else if (ph >= 0.55 && ph < 0.75) {
    // Небо сумерек
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.45, '#4c1d95');
    grad.addColorStop(0.75, '#be185d');
    grad.addColorStop(1, '#090d16');
  } else if (ph >= 0.75) {
    // Глубокое ночное небо
    grad.addColorStop(0, '#02040a');
    grad.addColorStop(0.5, '#091124');
    grad.addColorStop(1, '#020409');
  } else if (mode === 'gold_black') {
    const p1 = 0.25 + Math.sin(t * 0.7) * 0.12;
    const p2 = 0.65 + Math.cos(t * 0.6) * 0.12;
    grad.addColorStop(0, '#050608');
    grad.addColorStop(p1, '#3d2800');
    grad.addColorStop(0.5, '#ffcc00');
    grad.addColorStop(p2, '#1f1605');
    grad.addColorStop(1, '#060709');
  } else if (mode === 'bw_shimmer') {
    const p1 = 0.28 + Math.sin(t * 0.65) * 0.14;
    const p2 = 0.72 + Math.cos(t * 0.55) * 0.14;
    grad.addColorStop(0, '#050608');
    grad.addColorStop(p1, '#272c36');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(p2, '#181c24');
    grad.addColorStop(1, '#040507');
  } else if (mode === 'sunset') {
    grad.addColorStop(0, '#130924');
    grad.addColorStop(0.5, '#591c3b');
    grad.addColorStop(1, '#090d16');
  } else {
    grad.addColorStop(0, '#0d031c');
    grad.addColorStop(0.5, '#4c1d95');
    grad.addColorStop(1, '#070312');
  }

  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  // Звезды ночью и в сумерках
  if (lightState.nightLights) {
    c.fillStyle = `rgba(255, 255, 255, ${0.45 * lightState.lightIntensity})`;
    for (let s = 0; s < 28; s++) {
      const sx = ((s * 137.5) % W);
      const sy = ((s * 73.1) % (H * 0.45));
      const tw = 0.6 + 0.6 * Math.sin(t * 3 + s);
      c.beginPath(); c.arc(sx, sy, tw * 1.3, 0, Math.PI * 2); c.fill();
    }
  }

  c.save();
  c.strokeStyle = mode === 'gold_black' ? 'rgba(255, 204, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
  c.lineWidth = 2;
  const step = 36;
  const offset = (t * 18) % step;
  for (let i = -H; i < W + H; i += step) {
    c.beginPath();
    c.moveTo(i + offset, 0);
    c.lineTo(i - H * 0.6 + offset, H);
    c.stroke();
  }
  c.restore();
}

/* --- БАЗОВЫЕ И LOW-POLY 2.5D ПРИМИТИВЫ --- */
function drawShadow(c, gx, gy, rx, ry) {
  const p = iso(gx, gy, 0.1);
  const g = c.createRadialGradient(p.x, p.y, 1, p.x, p.y, rx * zoom);
  g.addColorStop(0, 'rgba(0,0,0,0.46)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(p.x, p.y, rx * zoom, ry * zoom, 0, 0, Math.PI * 2); c.fill();
}

function drawGlow(c, gx, gy, gz, rad, colRGBA) {
  const p = iso(gx, gy, gz);
  const r = rad * zoom;
  const g = c.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
  g.addColorStop(0, colRGBA);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
}

function drawPrism(c, gx, gy, gz, w, d, h, topC, leftC, rightC, strokeC = 'rgba(255,255,255,0.08)') {
  const p00 = iso(gx, gy, gz + h), p10 = iso(gx + w, gy, gz + h);
  const p11 = iso(gx + w, gy + d, gz + h), p01 = iso(gx, gy + d, gz + h);
  const b10 = iso(gx + w, gy, gz), b11 = iso(gx + w, gy + d, gz), b01 = iso(gx, gy + d, gz);

  c.fillStyle = leftC;
  c.beginPath(); c.moveTo(p01.x, p01.y); c.lineTo(p11.x, p11.y); c.lineTo(b11.x, b11.y); c.lineTo(b01.x, b01.y); c.closePath(); c.fill();
  if (strokeC) { c.strokeStyle = strokeC; c.lineWidth = 0.6; c.stroke(); }

  c.fillStyle = rightC;
  c.beginPath(); c.moveTo(p10.x, p10.y); c.lineTo(p11.x, p11.y); c.lineTo(b11.x, b11.y); c.lineTo(b10.x, b10.y); c.closePath(); c.fill();
  if (strokeC) { c.strokeStyle = strokeC; c.lineWidth = 0.6; c.stroke(); }

  c.fillStyle = topC;
  c.beginPath(); c.moveTo(p00.x, p00.y); c.lineTo(p10.x, p10.y); c.lineTo(p11.x, p11.y); c.lineTo(p01.x, p01.y); c.closePath(); c.fill();
  if (strokeC) { c.strokeStyle = strokeC; c.lineWidth = 0.6; c.stroke(); }
}

function drawIsoPoly(c, pts3d, fillCol, strokeCol = null, lw = 0.6) {
  c.beginPath();
  pts3d.forEach((pt, idx) => {
    const p = iso(pt[0], pt[1], pt[2]);
    if (idx === 0) c.moveTo(p.x, p.y);
    else c.lineTo(p.x, p.y);
  });
  c.closePath();
  if (fillCol) { c.fillStyle = fillCol; c.fill(); }
  if (strokeCol) { c.strokeStyle = strokeCol; c.lineWidth = lw * zoom; c.stroke(); }
}

function drawIsoLine(c, p1, p2, col, lw = 1.2) {
  const a = iso(p1[0], p1[1], p1[2]);
  const b = iso(p2[0], p2[1], p2[2]);
  c.strokeStyle = col;
  c.lineWidth = lw * zoom;
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
}

/* --- ПРОРАБОТАННЫЙ СТАНОК-КАЧАЛКА (ПШГН) --- */
function drawDetailedPumpjack(c, gx, gy, phaseOffset) {
  drawShadow(c, gx, gy, 17, 9);
  drawPrism(c, gx - 0.52, gy - 0.24, 0.3, 1.04, 0.48, 1.6, isWinterNow() ? '#e2e8f0' : '#94a3b8', '#64748b', '#475569', 'rgba(255,204,0,0.4)');

  const wellX = gx + 0.36;
  drawPrism(c, wellX - 0.08, gy - 0.08, 1.9, 0.16, 0.16, 4.5, '#ef4444', '#dc2626', '#991b1b', null);
  const vp = iso(wellX + 0.08, gy + 0.08, 4.2);
  c.strokeStyle = '#ffcc00'; c.lineWidth = 1.3 * zoom;
  c.beginPath(); c.arc(vp.x, vp.y, 2.2 * zoom, 0, Math.PI * 2); c.stroke();

  const rearX = gx - 0.36;
  drawPrism(c, rearX - 0.12, gy - 0.16, 1.9, 0.28, 0.32, 4.8, '#0284c7', '#0369a1', '#075985', null);
  drawPrism(c, rearX - 0.06, gy - 0.12, 6.7, 0.22, 0.24, 3.8, '#475569', '#334155', '#1e293b', null);

  const pivX = gx, pivY = gy, pivZ = 15.5;
  const legCol = '#cbd5e1', braceCol = '#64748b';
  drawIsoLine(c, [gx - 0.20, gy - 0.16, 1.9], [pivX, pivY - 0.05, pivZ], legCol, 2.0);
  drawIsoLine(c, [gx + 0.20, gy - 0.16, 1.9], [pivX, pivY - 0.05, pivZ], legCol, 2.0);
  drawIsoLine(c, [gx - 0.20, gy + 0.16, 1.9], [pivX, pivY + 0.05, pivZ], '#94a3b8', 2.2);
  drawIsoLine(c, [gx + 0.20, gy + 0.16, 1.9], [pivX, pivY + 0.05, pivZ], '#94a3b8', 2.2);
  drawIsoLine(c, [gx - 0.13, gy + 0.11, 7.5], [gx + 0.13, gy + 0.11, 7.5], braceCol, 1.2);
  drawIsoLine(c, [gx - 0.08, gy + 0.08, 11.5], [gx + 0.08, gy + 0.08, 11.5], braceCol, 1.2);
  drawIsoLine(c, [gx - 0.13, gy + 0.11, 7.5], [gx + 0.08, gy + 0.08, 11.5], braceCol, 1.0);

  const ang = time * 3.2 + phaseOffset;
  const tilt = Math.sin(ang) * 4.2;
  const rearTipX = gx - 0.35, rearTipZ = pivZ - tilt;
  const frontTipX = gx + 0.36, frontTipZ = pivZ + tilt;

  const crankX = rearX + Math.cos(ang) * 0.13;
  const crankZ = 8.5 + Math.sin(ang) * 3.0;
  drawIsoLine(c, [rearX, gy + 0.14, 8.5], [crankX, gy + 0.14, crankZ], '#f97316', 2.6);
  const cwP = iso(crankX, gy + 0.14, crankZ);
  c.fillStyle = '#ffcc00'; c.strokeStyle = '#1e293b'; c.lineWidth = 1.2 * zoom;
  c.beginPath(); c.arc(cwP.x, cwP.y, 3.6 * zoom, 0, Math.PI * 2); c.fill(); c.stroke();

  drawIsoLine(c, [crankX, gy + 0.12, crankZ], [rearTipX, gy + 0.04, rearTipZ], '#e2e8f0', 1.6);

  drawIsoPoly(c, [
    [rearTipX, gy, rearTipZ + 1.3],
    [frontTipX - 0.04, gy, frontTipZ + 1.5],
    [frontTipX - 0.04, gy, frontTipZ - 1.1],
    [rearTipX, gy, rearTipZ - 1.1]
  ], '#ffcc00', '#b45309', 0.9);

  const pivP = iso(pivX, pivY, pivZ);
  c.fillStyle = '#1e293b';
  c.beginPath(); c.arc(pivP.x, pivP.y, 2.2 * zoom, 0, Math.PI * 2); c.fill();

  drawIsoPoly(c, [
    [frontTipX - 0.06, gy, frontTipZ + 2.8],
    [frontTipX + 0.09, gy, frontTipZ + 1.6],
    [frontTipX + 0.11, gy, frontTipZ - 1.4],
    [frontTipX - 0.02, gy, frontTipZ - 3.0],
    [frontTipX - 0.08, gy, frontTipZ - 1.2]
  ], '#ff7300', '#1e293b', 0.9);
  drawIsoLine(c, [frontTipX - 0.03, gy, frontTipZ + 1.5], [frontTipX + 0.07, gy, frontTipZ - 1.0], '#0f172a', 1.8);

  drawIsoLine(c, [wellX, gy, frontTipZ - 2.4], [wellX, gy, 5.5], '#f8fafc', 1.4);
  const rodP = iso(wellX, gy, 6.2);
  c.fillStyle = '#fde047';
  c.fillRect(rodP.x - 1.8 * zoom, rodP.y - 1.5 * zoom, 3.6 * zoom, 3.0 * zoom);
}

/* --- АЖУРНАЯ РЕШЕТЧАТАЯ БУРОВАЯ ВЫШКА «УРАЛМАШ» --- */
function drawDetailedDerrick(c, gx, gy) {
  drawShadow(c, gx, gy, 18, 9);
  drawPrism(c, gx - 0.42, gy - 0.42, 0.3, 0.84, 0.84, 4.5, isWinterNow() ? '#f1f5f9' : '#cbd5e1', '#64748b', '#475569', '#ffcc00');
  const topZ = 35;
  const b00 = [gx - 0.32, gy - 0.32, 4.8], b10 = [gx + 0.32, gy - 0.32, 4.8];
  const b11 = [gx + 0.32, gy + 0.32, 4.8], b01 = [gx - 0.32, gy + 0.32, 4.8];
  const t00 = [gx - 0.12, gy - 0.12, topZ], t10 = [gx + 0.12, gy - 0.12, topZ];
  const t11 = [gx + 0.12, gy + 0.12, topZ], t01 = [gx - 0.12, gy + 0.12, topZ];

  drawIsoLine(c, b00, t00, '#eab308', 1.6);
  drawIsoLine(c, b10, t10, '#f59e0b', 1.8);
  drawIsoLine(c, b01, t01, '#f59e0b', 1.8);
  drawIsoLine(c, b11, t11, '#ffcc00', 2.2);

  for (let k = 0; k < 5; k++) {
    const f1 = k / 5, f2 = (k + 1) / 5;
    const z1 = 4.8 + f1 * (topZ - 4.8), z2 = 4.8 + f2 * (topZ - 4.8);
    const w1 = 0.32 * (1 - f1 * 0.62), w2 = 0.32 * (1 - f2 * 0.62);
    drawIsoLine(c, [gx - w2, gy + w2, z2], [gx + w2, gy + w2, z2], '#ff7300', 1.2);
    drawIsoLine(c, [gx + w2, gy - w2, z2], [gx + w2, gy + w2, z2], '#ff7300', 1.2);
    drawIsoLine(c, [gx - w1, gy + w1, z1], [gx + w2, gy + w2, z2], 'rgba(255,204,0,0.75)', 1.0);
    drawIsoLine(c, [gx + w1, gy + w1, z1], [gx - w2, gy + w2, z2], 'rgba(255,204,0,0.75)', 1.0);
  }
  drawPrism(c, gx - 0.16, gy - 0.16, topZ, 0.32, 0.32, 3.0, '#ef4444', '#dc2626', '#991b1b', null);
  const blockZ = 14 + Math.sin(time * 2.5 + gy) * 7;
  drawIsoLine(c, [gx, gy, topZ], [gx, gy, 4.8], '#94a3b8', 1.5);
  drawPrism(c, gx - 0.09, gy - 0.09, blockZ, 0.18, 0.18, 3.2, '#ffcc00', '#ea580c', '#9a3412', null);
}

/* --- ФАКЕЛЬНАЯ МАЧТА С КОЛЕБАНИЕМ ПЛАМЕНИ ОТ ВЕТРА --- */
function drawWindFlareStack(c, gx, gy) {
  drawShadow(c, gx, gy, 12, 6);
  // Бетонная опора и стальная решетчатая труба факела
  drawPrism(c, gx - 0.22, gy - 0.22, 0.3, 0.44, 0.44, 3.5, '#64748b', '#475569', '#334155', '#ffcc00');
  drawPrism(c, gx - 0.09, gy - 0.09, 3.8, 0.18, 0.18, 29.0, '#cbd5e1', '#94a3b8', '#475569', null);
  // Оголовок горелки
  drawPrism(c, gx - 0.13, gy - 0.13, 32.5, 0.26, 0.26, 2.2, '#ef4444', '#dc2626', '#7f1d1d', null);

  // Динамическое колебание пламени по ветру (windX)
  const tipBase = iso(gx, gy, 34.8);
  const gust = windX * 14 * zoom + Math.sin(time * 17 + gx * 3) * 4.5 * zoom;
  const flameH = (20 + Math.sin(time * 23) * 4) * zoom;

  c.save();
  // Внешний язык пламени (ярко-оранжевый/красный)
  const fg = c.createLinearGradient(tipBase.x, tipBase.y, tipBase.x + gust * 1.3, tipBase.y - flameH);
  fg.addColorStop(0, 'rgba(255, 230, 100, 0.98)');
  fg.addColorStop(0.5, 'rgba(255, 115, 0, 0.92)');
  fg.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
  c.fillStyle = fg;
  c.beginPath();
  c.moveTo(tipBase.x - 4.5 * zoom, tipBase.y);
  c.quadraticCurveTo(tipBase.x + gust * 0.4, tipBase.y - flameH * 0.65, tipBase.x + gust * 1.35, tipBase.y - flameH);
  c.quadraticCurveTo(tipBase.x + gust * 0.7 + 5 * zoom, tipBase.y - flameH * 0.35, tipBase.x + 4.5 * zoom, tipBase.y);
  c.closePath();
  c.fill();

  // Внутреннее раскаленное бело-желтое ядро пламени
  c.fillStyle = 'rgba(255, 255, 220, 0.95)';
  c.beginPath();
  c.moveTo(tipBase.x - 2.4 * zoom, tipBase.y);
  c.quadraticCurveTo(tipBase.x + gust * 0.3, tipBase.y - flameH * 0.35, tipBase.x + gust * 0.7, tipBase.y - flameH * 0.55);
  c.quadraticCurveTo(tipBase.x + gust * 0.4 + 2.4 * zoom, tipBase.y - flameH * 0.2, tipBase.x + 2.4 * zoom, tipBase.y);
  c.closePath();
  c.fill();
  c.restore();
}

/* --- СТЕЛА АЗС «РОСНЕФТЬ» С ДИНАМИЧЕСКИМИ ЦЕННИКАМИ ТОПЛИВА --- */
function drawGasStationStele(c, gx, gy, lightState) {
  drawShadow(c, gx + 0.15, gy + 0.15, 14, 7);
  // Бетонный подиум и черно-золотой корпус стелы
  drawPrism(c, gx - 0.12, gy - 0.12, 0.3, 0.58, 0.52, 2.2, isWinterNow() ? '#f8fafc' : '#cbd5e1', '#64748b', '#475569', null);
  drawPrism(c, gx, gy, 2.5, 0.36, 0.30, 24.5, '#ffcc00', '#0f172a', '#1e293b', '#ffcc00');
  // Светящаяся золотая шапка стелы с логотипом РН
  drawPrism(c, gx - 0.02, gy - 0.02, 27.0, 0.40, 0.34, 4.2, '#fde047', '#ffcc00', '#f59e0b', '#ffffff');

  // Экранное положение лицевой панели стелы для отрисовки цифровых ценников
  const topP = iso(gx + 0.18, gy + 0.30, 25.2);
  const botP = iso(gx + 0.18, gy + 0.30, 6.5);
  const panelW = 24 * zoom;
  const panelH = Math.max(20 * zoom, botP.y - topP.y);
  const px = topP.x - panelW * 0.5;
  const py = topP.y;

  c.save();
  // Темное табло с золотой неоновой рамкой
  c.fillStyle = 'rgba(7, 11, 20, 0.94)';
  c.strokeStyle = lightState.nightLights ? '#00e5ff' : '#ffcc00';
  c.lineWidth = 1.2 * zoom;
  c.beginPath();
  c.roundRect(px, py, panelW, panelH, 3 * zoom);
  c.fill();
  c.stroke();

  // Шапка «РОСНЕФТЬ»
  c.fillStyle = '#ffcc00';
  c.fillRect(px + 1.5 * zoom, py + 1.5 * zoom, panelW - 3 * zoom, 4.2 * zoom);
  c.fillStyle = '#050811';
  c.font = `900 ${Math.max(4, 3.6 * zoom)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('РОСНЕФТЬ', px + panelW * 0.5, py + 4.8 * zoom);

  // Живые динамические котировки топлива (плавно колеблются от спроса и прокачки)
  const wave = Math.sin(time * 0.85);
  const wave2 = Math.cos(time * 0.62);
  const p100 = (76.90 + wave * 0.45).toFixed(2);
  const p95  = (60.40 + wave2 * 0.30).toFixed(2);
  const p92  = (54.80 + wave * 0.25).toFixed(2);
  const pDT  = (66.50 - wave2 * 0.35).toFixed(2);

  const rows = [
    { lbl: '100', val: p100, col: '#00e5ff' },
    { lbl: '95',  val: p95,  col: '#00e676' },
    { lbl: '92',  val: p92,  col: '#fde047' },
    { lbl: 'ДТ',  val: pDT,  col: '#ff7300' }
  ];

  c.font = `800 ${Math.max(4.5, 3.8 * zoom)}px monospace`;
  rows.forEach((r, idx) => {
    const ry = py + (9.2 + idx * 4.6) * zoom;
    c.textAlign = 'left';
    c.fillStyle = '#cbd5e1';
    c.fillText(r.lbl, px + 2.0 * zoom, ry);
    c.textAlign = 'right';
    c.fillStyle = r.col;
    c.fillText(r.val, px + panelW - 1.8 * zoom, ry);
  });
  c.restore();
}

// Здание с этажами, светящимися ночью окнами и снежной крышей зимой
function drawDetailedBuilding(c, gx, gy, gz, w, d, h, topC, leftC, rightC, winCol, floors = 5, hasSolar = false, lightState = null) {
  drawShadow(c, gx + w / 2, gy + d / 2, 22, 11);
  const winter = isWinterNow();
  const roofCol = winter ? '#f8fafc' : topC;
  drawPrism(c, gx, gy, gz, w, d, h, roofCol, leftC, rightC, 'rgba(255,255,255,0.2)');

  // Снежная шапка по кромке крыши в зимнем режиме
  if (winter) {
    drawPrism(c, gx - 0.03, gy - 0.03, gz + h, w + 0.06, d + 0.06, 0.9, '#ffffff', '#e2e8f0', '#cbd5e1', null);
  }

  const isNight = lightState && lightState.nightLights;
  c.save();
  if (isNight) {
    c.shadowColor = winCol;
    c.shadowBlur = 6 * zoom;
  }
  for (let f = 1; f <= floors; f++) {
    const fz = gz + (h / (floors + 1)) * f;
    for (let k = 0.18; k < 0.85; k += 0.26) {
      // Включаем яркое теплое/неоновое свечение окон в сумерках и ночью
      const litWindow = isNight ? ((Math.floor(f * 7 + k * 13 + gx) % 5) !== 0) : false;
      c.fillStyle = litWindow ? '#fef08a' : winCol;
      const wl = iso(gx + w * k, gy + d, fz);
      c.fillRect(wl.x - 1.9 * zoom, wl.y - 1.9 * zoom, 3.2 * zoom, 2.8 * zoom);
      c.fillStyle = litWindow ? winCol : 'rgba(148, 163, 184, 0.45)';
      const wr = iso(gx + w, gy + d * k, fz);
      c.fillRect(wr.x - 1.9 * zoom, wr.y - 1.9 * zoom, 3.2 * zoom, 2.8 * zoom);
    }
  }
  c.restore();

  if (hasSolar) {
    drawPrism(c, gx + 0.2, gy + 0.2, gz + h + (winter ? 0.9 : 0), w - 0.4, d - 0.4, 1.2, '#0284c7', '#1e293b', '#0f172a', '#38bdf8');
  }
}

// Цилиндрический резервуар / градирня с металлическими поясами, лестницей и СНЕЖНОЙ ШАПКОЙ зимой
function drawDetailedTank(c, gx, gy, gz, rPx, hPx, cL, cM, cR, topC, stripeC = null, isCooler = false) {
  drawShadow(c, gx, gy, rPx * 1.2, rPx * 0.6);
  const base = iso(gx, gy, gz), top = iso(gx, gy, gz + hPx);
  const rx = rPx * zoom, ry = rx * 0.5;
  const topRx = isCooler ? rx * 0.76 : rx;
  const topRy = topRx * 0.5;

  const grad = c.createLinearGradient(base.x - rx, 0, base.x + rx, 0);
  grad.addColorStop(0, cL); grad.addColorStop(0.38, cM); grad.addColorStop(1, cR);

  c.fillStyle = grad;
  c.beginPath();
  c.ellipse(base.x, base.y, rx, ry, 0, 0, Math.PI);
  c.lineTo(top.x - topRx, top.y);
  c.ellipse(top.x, top.y, topRx, topRy, 0, Math.PI, 0, true);
  c.closePath(); c.fill();

  if (stripeC) {
    const midY = (base.y + top.y) / 2;
    const midRx = (rx + topRx) * 0.5;
    c.beginPath(); c.ellipse(base.x, midY, midRx, midRx * 0.45, 0, 0, Math.PI);
    c.lineWidth = 2.8 * zoom; c.strokeStyle = stripeC; c.stroke();
  }
  c.strokeStyle = 'rgba(30, 41, 59, 0.75)';
  c.lineWidth = 1.2 * zoom;
  c.beginPath(); c.moveTo(base.x + rx * 0.45, base.y + ry * 0.4); c.lineTo(top.x + topRx * 0.45, top.y + topRy * 0.4); c.stroke();

  c.fillStyle = topC;
  c.beginPath(); c.ellipse(top.x, top.y, topRx, topRy, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 0.8; c.stroke();

  // Зимняя снежная шапка на крыше резервуаров РВС-20000 и башен
  if (isWinterNow() && !isCooler) {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(top.x, top.y - 1.4 * zoom, topRx * 0.96, topRy * 0.96, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e2e8f0';
    c.beginPath();
    c.ellipse(top.x, top.y - 0.5 * zoom, topRx * 1.02, topRy * 0.55, 0, 0, Math.PI);
    c.fill();
  }
}

/* --- РАЗНООБРАЗНЫЕ ДЕТАЛИЗИРОВАННЫЕ ДЕРЕВЬЯ (С ЗИМНИМ ИНЕЕМ/СНЕГОМ) --- */
const forestTrees = [];
for (let gy = 1.2; gy < 14.4; gy += 1.35) {
  forestTrees.push({ gx: 0.75 + (gy % 0.45), gy, kind: gy % 3 < 1 ? 'birch' : 'pine', sc: 0.9 + (gy % 0.35) });
  forestTrees.push({ gx: 22.85 + (gy % 0.45), gy, kind: gy % 2 < 1 ? 'oak' : 'pine', sc: 0.9 + (gy % 0.35) });
}
[3.2, 6.2, 10.5, 13.5, 19.5, 21.5].forEach(gx => {
  forestTrees.push({ gx, gy: 14.9, kind: 'oak', sc: 0.85 });
});

function drawTreeDetailed(c, t) {
  drawShadow(c, t.gx, t.gy, 9 * t.sc, 4.5 * t.sc);
  const winter = isWinterNow();
  if (t.kind === 'birch') {
    drawPrism(c, t.gx - 0.07, t.gy - 0.07, 0, 0.14, 0.14, 9 * t.sc, '#f8fafc', '#e2e8f0', '#cbd5e1', '#1e293b');
    const p = iso(t.gx, t.gy, 12 * t.sc);
    c.fillStyle = winter ? '#e2e8f0' : '#4ade80';
    c.beginPath(); c.arc(p.x, p.y, 7.5 * t.sc * zoom, 0, Math.PI * 2); c.fill();
    c.fillStyle = winter ? '#ffffff' : '#86efac';
    c.beginPath(); c.arc(p.x - 2.5 * zoom, p.y - 2.5 * zoom, 5 * t.sc * zoom, 0, Math.PI * 2); c.fill();
  } else if (t.kind === 'oak') {
    drawPrism(c, t.gx - 0.09, t.gy - 0.09, 0, 0.18, 0.18, 7 * t.sc, '#5c4033', '#4a3222', '#382417', null);
    const p = iso(t.gx, t.gy, 10 * t.sc);
    c.fillStyle = winter ? '#cbd5e1' : '#15803d';
    c.beginPath(); c.arc(p.x + 3 * zoom, p.y + 1 * zoom, 6.5 * t.sc * zoom, 0, Math.PI * 2); c.fill();
    c.fillStyle = winter ? '#e2e8f0' : '#16a34a';
    c.beginPath(); c.arc(p.x - 3 * zoom, p.y, 6.5 * t.sc * zoom, 0, Math.PI * 2); c.fill();
    c.fillStyle = winter ? '#ffffff' : '#22c55e';
    c.beginPath(); c.arc(p.x, p.y - 3.5 * zoom, 7 * t.sc * zoom, 0, Math.PI * 2); c.fill();
  } else {
    drawPrism(c, t.gx - 0.08, t.gy - 0.08, 0, 0.16, 0.16, 7 * t.sc, '#78350f', '#5c4033', '#3d2b22', null);
    const cols = winter ? ['#ffffff', '#e0f2fe', '#bae6fd'] : ['#34d399', '#10b981', '#047857'];
    [7, 12.5, 18].forEach((z, idx) => {
      const p = iso(t.gx, t.gy, z * t.sc);
      const r = (9 - idx * 2) * t.sc * zoom;
      c.fillStyle = cols[idx];
      c.beginPath();
      c.moveTo(p.x, p.y - r * 1.45);
      c.lineTo(p.x + r, p.y + r * 0.4);
      c.lineTo(p.x - r, p.y + r * 0.4);
      c.closePath(); c.fill();
    });
  }
}

/* --- ЖИВЫЕ ЧЕЛОВЕЧКИ БЕЗ ХОЖДЕНИЯ СКВОЗЬ ДОМА (8 НА ЗАВОДЕ + 14 НА ТРОТУАРАХ) --- */
const people = [];
for (let i = 0; i < 14; i++) {
  const onNorth = i % 2 === 0;
  people.push({
    gx: 1.5 + (i * 1.55) % 21,
    gy: onNorth ? 15.28 : 18.45,
    dir: i % 3 === 0 ? 1 : -1,
    min: 1.2, max: 22.8,
    speed: 0.72 + (i % 4) * 0.12,
    phase: i * 1.1,
    role: 'pedestrian',
    hat: null,
    shirt: ['#38bdf8', '#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#f8fafc'][i % 6],
    pants: '#1e293b',
    item: i % 3 === 0 ? 'coffee' : 'bag'
  });
}
for (let i = 0; i < 8; i++) {
  const isEng = i % 2 === 0;
  const onUpperWalkway = i < 4;
  people.push({
    gx: 3.5 + i * 2.1,
    gy: onUpperWalkway ? 7.75 : 11.45,
    dir: i % 2 === 0 ? 1 : -1,
    min: 3.2, max: 20.4,
    speed: 0.62 + (i % 3) * 0.1,
    phase: i * 1.7,
    role: isEng ? 'engineer' : 'worker',
    hat: isEng ? '#ffffff' : '#ffcc00',
    shirt: isEng ? '#0284c7' : '#ff7300',
    pants: '#0f172a',
    item: isEng ? 'tablet' : 'wrench'
  });
}

function drawDetailedPerson(c, h) {
  const p = iso(h.gx, h.gy, 0.35);
  const s = zoom;
  const swing = Math.sin(h.phase) * 2.4 * s;

  c.fillStyle = 'rgba(0, 0, 0, 0.42)';
  c.beginPath(); c.ellipse(p.x, p.y, 3.2 * s, 1.6 * s, 0, 0, Math.PI * 2); c.fill();

  c.strokeStyle = h.pants;
  c.lineWidth = 1.6 * s;
  c.beginPath();
  c.moveTo(p.x - 1 * s, p.y - 4.2 * s); c.lineTo(p.x - 1 * s + swing, p.y);
  c.moveTo(p.x + 1 * s, p.y - 4.2 * s); c.lineTo(p.x + 1 * s - swing, p.y);
  c.stroke();

  c.fillStyle = h.shirt;
  c.fillRect(p.x - 2.2 * s, p.y - 8.8 * s, 4.4 * s, 4.8 * s);
  if (h.role === 'worker') {
    c.fillStyle = '#fde047';
    c.fillRect(p.x - 2.2 * s, p.y - 6.5 * s, 4.4 * s, 1.1 * s);
  }

  c.strokeStyle = h.shirt;
  c.lineWidth = 1.4 * s;
  c.beginPath();
  c.moveTo(p.x - 2.2 * s, p.y - 8.2 * s); c.lineTo(p.x - 3.2 * s - swing * 0.7, p.y - 4.5 * s);
  c.moveTo(p.x + 2.2 * s, p.y - 8.2 * s); c.lineTo(p.x + 3.2 * s + swing * 0.7, p.y - 4.5 * s);
  c.stroke();

  if (h.item === 'coffee') {
    c.fillStyle = '#ffffff';
    c.fillRect(p.x + 2.6 * s + swing * 0.6, p.y - 5.5 * s, 1.8 * s, 2.2 * s);
  } else if (h.item === 'tablet') {
    c.fillStyle = '#38bdf8';
    c.fillRect(p.x + 2.5 * s, p.y - 6.0 * s, 2.2 * s, 2.8 * s);
  }

  c.fillStyle = '#fed7aa';
  c.beginPath(); c.arc(p.x, p.y - 10.4 * s, 1.9 * s, 0, Math.PI * 2); c.fill();

  if (h.hat) {
    c.fillStyle = h.hat;
    c.beginPath(); c.arc(p.x, p.y - 11.0 * s, 2.2 * s, Math.PI, 0); c.fill();
    c.fillRect(p.x - 2.5 * s, p.y - 11.2 * s, 5.0 * s, 0.8 * s);
  } else {
    c.fillStyle = '#1e293b';
    c.beginPath(); c.arc(p.x, p.y - 11.1 * s, 1.9 * s, Math.PI, 0); c.fill();
  }
}

/* ============================================================================
   6. LOW-POLY 3D АВТОМОБИЛИ, СПОРТКАРЫ, ГРУЗОВИКИ И МОТОЦИКЛ МИНСК 3.112 + ФАРЫ
   ============================================================================ */
let vehicles = [
  { pos: 1.0, lane: 1, speed: 3.1, type: 'kalina_grey', name: 'LADA Kalina Серая' },
  { pos: 5.5, lane: 1, speed: 3.1, type: 'harrier', name: 'Toyota Harrier VIP' },
  { pos: 10.2, lane: 1, speed: 3.1, type: 'kamaz', name: 'КАМАЗ-54901 Цистерна' },
  { pos: 15.6, lane: 1, speed: 3.1, type: 'vesta_black', name: 'LADA Vesta Чёрная' },
  { pos: 20.4, lane: 1, speed: 3.1, type: 'zil', name: 'ЗИЛ-130 Бензовоз' },

  { pos: 2.8, lane: 2, speed: 4.5, type: 'bmw', name: 'BMW M5 Competition' },
  { pos: 7.5, lane: 2, speed: 4.5, type: 'minsk', name: 'Минск ММВЗ-3.112', wheelie: 0 },
  { pos: 12.8, lane: 2, speed: 4.5, type: 'lambo', name: 'Lamborghini Huracán' },
  { pos: 17.5, lane: 2, speed: 4.5, type: 'ferrari', name: 'Ferrari F8 Tributo' },
  { pos: 22.0, lane: 2, speed: 4.5, type: 'vesta_sport', name: 'LADA Vesta Sport RN' },

  { pos: 3.5, lane: 3, speed: 4.2, type: 'ferrari', name: 'Ferrari 488 GTB' },
  { pos: 9.0, lane: 3, speed: 4.2, type: 'bmw', name: 'BMW M5 F90' },
  { pos: 14.5, lane: 3, speed: 4.2, type: 'harrier', name: 'Toyota Harrier' },
  { pos: 20.0, lane: 3, speed: 4.2, type: 'lambo', name: 'Lamborghini Aventador' },

  { pos: 1.8, lane: 4, speed: 2.9, type: 'euro_truck', name: 'Магистральная Фура' },
  { pos: 8.2, lane: 4, speed: 2.9, type: 'vesta_black', name: 'LADA Vesta Чёрная' },
  { pos: 14.0, lane: 4, speed: 2.9, type: 'kamaz', name: 'КАМАЗ Роснефть' },
  { pos: 19.5, lane: 4, speed: 2.9, type: 'kalina_grey', name: 'LADA Kalina Серая' }
];

function getVehicleGy(lane) {
  if (lane === 1) return 16.02;
  if (lane === 2) return 16.48;
  if (lane === 3) return 17.16;
  return 17.62;
}

// Световые конусы фар и свечение стоп-сигналов в сумерках/ночью
function drawVehicleNightLights(c, gx, gy, dir, lightState, isMoto = false) {
  if (!lightState || !lightState.nightLights) return;
  const alpha = 0.34 * lightState.lightIntensity;
  const beamLen = isMoto ? 1.8 : 2.35;
  const frontX = gx + (isMoto ? 0.25 : 0.48) * dir;
  const rearX = gx - (isMoto ? 0.22 : 0.48) * dir;

  c.save();
  c.globalCompositeOperation = 'screen';
  // 3D-конус дальнего света фар на полотне дороги
  drawIsoPoly(c, [
    [frontX, gy - (isMoto ? 0.05 : 0.16), 0.35],
    [frontX + beamLen * dir, gy - (isMoto ? 0.28 : 0.46), 0.22],
    [frontX + beamLen * dir, gy + (isMoto ? 0.28 : 0.46), 0.22],
    [frontX, gy + (isMoto ? 0.05 : 0.16), 0.35]
  ], `rgba(254, 240, 138, ${alpha})`, null);

  // Красный отсвет стоп-сигналов позади автомобиля
  drawGlow(c, rearX - 0.12 * dir, gy, 1.2, isMoto ? 6 : 10, `rgba(255, 23, 68, ${alpha * 1.15})`);
  c.restore();
}

function drawWheel3D(c, gx, gy, gz, rPx, rimCol = '#cbd5e1') {
  const p = iso(gx, gy, gz);
  const r = rPx * zoom;
  c.fillStyle = '#0f172a';
  c.beginPath(); c.ellipse(p.x, p.y, r * 0.95, r * 0.85, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = rimCol;
  c.beginPath(); c.ellipse(p.x, p.y, r * 0.48, r * 0.42, 0, 0, Math.PI * 2); c.fill();
}

function drawLowPolyCarMesh(c, gx, gy, dir, cfg, lightState) {
  const L = cfg.len || 0.88;
  const W = cfg.wid || 0.40;
  const z0 = 1.0;
  const zMid = z0 + (cfg.chasH || 2.8);
  const zTop = zMid + (cfg.cabH || 2.6);

  drawShadow(c, gx, gy, L * 18, W * 16);
  drawVehicleNightLights(c, gx, gy, dir, lightState, false);

  const pt = (lx, ly, lz) => [gx + lx * dir, gy + ly, lz];

  const xRear = -L * 0.5;
  const xFront = L * 0.5;
  const xCabRear = xRear + (cfg.trunkLen ?? L * 0.22);
  const xCabFront = xFront - (cfg.hoodLen ?? L * 0.28);
  const xRoofRear = xCabRear + L * 0.08;
  const xRoofFront = xCabFront - L * 0.10;
  const yL = -W * 0.5, yR = W * 0.5;

  if (dir === 1) {
    drawIsoPoly(c, [pt(xCabFront, yL, zMid), pt(xFront, yL, zMid - 0.5), pt(xFront, yR, zMid - 0.5), pt(xCabFront, yR, zMid)], cfg.colTop, 'rgba(255,255,255,0.15)');
    drawIsoPoly(c, [pt(xRear, yL, zMid), pt(xCabRear, yL, zMid), pt(xCabRear, yR, zMid), pt(xRear, yR, zMid)], cfg.colTop, null);
    drawIsoPoly(c, [pt(xFront, yL, zMid - 0.5), pt(xFront, yR, zMid - 0.5), pt(xFront, yR, z0), pt(xFront, yL, z0)], cfg.colFront, null);

    if (cfg.kidneyGrille) {
      drawIsoPoly(c, [pt(xFront + 0.01, -0.09, zMid - 0.8), pt(xFront + 0.01, -0.01, zMid - 0.8), pt(xFront + 0.01, -0.01, z0 + 0.6), pt(xFront + 0.01, -0.09, z0 + 0.6)], '#090d16', '#cbd5e1', 0.7);
      drawIsoPoly(c, [pt(xFront + 0.01, 0.01, zMid - 0.8), pt(xFront + 0.01, 0.09, zMid - 0.8), pt(xFront + 0.01, 0.09, z0 + 0.6), pt(xFront + 0.01, 0.01, z0 + 0.6)], '#090d16', '#cbd5e1', 0.7);
    } else {
      drawIsoPoly(c, [pt(xFront + 0.01, -0.10, zMid - 0.9), pt(xFront + 0.01, 0.10, zMid - 0.9), pt(xFront + 0.01, 0.10, z0 + 0.5), pt(xFront + 0.01, -0.10, z0 + 0.5)], '#0f172a', null);
    }
    drawIsoPoly(c, [pt(xFront + 0.01, yL + 0.02, zMid - 0.6), pt(xFront + 0.01, yL + 0.09, zMid - 0.6), pt(xFront + 0.01, yL + 0.09, zMid - 1.4), pt(xFront + 0.01, yL + 0.02, zMid - 1.4)], '#fef08a', null);
    drawIsoPoly(c, [pt(xFront + 0.01, yR - 0.09, zMid - 0.6), pt(xFront + 0.01, yR - 0.02, zMid - 0.6), pt(xFront + 0.01, yR - 0.02, zMid - 1.4), pt(xFront + 0.01, yR - 0.09, zMid - 1.4)], '#fef08a', null);
  } else {
    drawIsoPoly(c, [pt(xRear, yL, zMid), pt(xCabRear, yL, zMid), pt(xCabRear, yR, zMid), pt(xRear, yR, zMid)], cfg.colTop, 'rgba(255,255,255,0.15)');
    drawIsoPoly(c, [pt(xCabFront, yL, zMid), pt(xFront, yL, zMid - 0.5), pt(xFront, yR, zMid - 0.5), pt(xCabFront, yR, zMid)], cfg.colTop, null);
    drawIsoPoly(c, [pt(xRear, yL, zMid), pt(xRear, yR, zMid), pt(xRear, yR, z0), pt(xRear, yL, z0)], cfg.colFront, null);
    if (cfg.lightBar) {
      drawIsoPoly(c, [pt(xRear - 0.01, yL + 0.02, zMid - 0.3), pt(xRear - 0.01, yR - 0.02, zMid - 0.3), pt(xRear - 0.01, yR - 0.02, zMid - 1.0), pt(xRear - 0.01, yL + 0.02, zMid - 1.0)], '#ff1744', null);
    } else {
      drawIsoPoly(c, [pt(xRear - 0.01, yL + 0.02, zMid - 0.3), pt(xRear - 0.01, yL + 0.10, zMid - 0.3), pt(xRear - 0.01, yL + 0.10, zMid - 1.1), pt(xRear - 0.01, yL + 0.02, zMid - 1.1)], '#ef4444', null);
      drawIsoPoly(c, [pt(xRear - 0.01, yR - 0.10, zMid - 0.3), pt(xRear - 0.01, yR - 0.02, zMid - 0.3), pt(xRear - 0.01, yR - 0.02, zMid - 1.1), pt(xRear - 0.01, yR - 0.10, zMid - 1.1)], '#ef4444', null);
    }
  }

  drawIsoPoly(c, [
    pt(xRear, yR, zMid),
    pt(xCabFront, yR, zMid),
    pt(xFront, yR, zMid - 0.5),
    pt(xFront, yR, z0),
    pt(xRear, yR, z0)
  ], cfg.colSide, 'rgba(255,255,255,0.18)');

  if (cfg.xTrim) {
    drawIsoLine(c, pt(xFront - 0.12, yR + 0.01, zMid - 0.3), pt(xCabFront - 0.12, yR + 0.01, z0 + 0.7), '#cbd5e1', 1.2);
    drawIsoLine(c, pt(xCabRear + 0.10, yR + 0.01, zMid - 0.3), pt(xRear + 0.12, yR + 0.01, z0 + 0.7), '#cbd5e1', 1.2);
  }
  if (cfg.sportLine) {
    drawIsoLine(c, pt(xRear, yR + 0.01, z0 + 0.4), pt(xFront, yR + 0.01, z0 + 0.4), '#ef4444', 1.4);
  }
  if (cfg.sideIntake) {
    drawIsoPoly(c, [pt(-0.08, yR + 0.01, zMid - 0.2), pt(0.10, yR + 0.01, zMid - 0.5), pt(-0.08, yR + 0.01, z0 + 0.6)], '#090d16', null);
  }

  drawIsoPoly(c, [
    pt(xCabRear, yR, zMid),
    pt(xRoofRear, yR - 0.03, zTop),
    pt(xRoofFront, yR - 0.03, zTop),
    pt(xCabFront, yR, zMid)
  ], cfg.glassCol || '#0f172a', '#64748b', 0.8);

  if (dir === 1) {
    drawIsoPoly(c, [
      pt(xCabFront, yL, zMid),
      pt(xCabFront, yR, zMid),
      pt(xRoofFront, yR - 0.03, zTop),
      pt(xRoofFront, yL + 0.03, zTop)
    ], '#1e293b', '#38bdf8', 0.7);
  } else {
    drawIsoPoly(c, [
      pt(xCabRear, yL, zMid),
      pt(xCabRear, yR, zMid),
      pt(xRoofRear, yR - 0.03, zTop),
      pt(xRoofRear, yL + 0.03, zTop)
    ], '#1e293b', '#475569', 0.7);
  }

  drawIsoPoly(c, [
    pt(xRoofRear, yL + 0.03, zTop),
    pt(xRoofFront, yL + 0.03, zTop),
    pt(xRoofFront, yR - 0.03, zTop),
    pt(xRoofRear, yR - 0.03, zTop)
  ], cfg.roofBlack ? '#0f172a' : cfg.colTop, 'rgba(255,255,255,0.2)');

  if (cfg.spoiler) {
    drawIsoLine(c, pt(xRear + 0.06, yL + 0.06, zMid), pt(xRear + 0.04, yL + 0.06, zMid + 1.6), '#0f172a', 1.4);
    drawIsoLine(c, pt(xRear + 0.06, yR - 0.06, zMid), pt(xRear + 0.04, yR - 0.06, zMid + 1.6), '#0f172a', 1.4);
    drawIsoPoly(c, [
      pt(xRear, yL, zMid + 1.6),
      pt(xRear + 0.11, yL, zMid + 1.4),
      pt(xRear + 0.11, yR, zMid + 1.4),
      pt(xRear, yR, zMid + 1.6)
    ], cfg.spoilerCol || '#0f172a', null);
  }

  drawWheel3D(c, gx + (xFront - L * 0.20) * dir, gy + yR + 0.02, z0 + 0.9, 2.3, cfg.rimCol || '#cbd5e1');
  drawWheel3D(c, gx + (xRear + L * 0.20) * dir, gy + yR + 0.02, z0 + 0.9, 2.3, cfg.rimCol || '#cbd5e1');
}

function drawDetailedMinskMoto(c, gx, gy, dir, wheelieTicks, lightState) {
  drawShadow(c, gx, gy, 11, 5);
  drawVehicleNightLights(c, gx, gy, dir, lightState, true);
  const liftZ = wheelieTicks > 0 ? 5.2 : 0;

  const rearX = gx - 0.22 * dir;
  const frontX = gx + 0.24 * dir;
  const frontZ = 1.9 + liftZ;

  drawWheel3D(c, rearX, gy, 1.9, 2.5, '#e2e8f0');
  drawWheel3D(c, frontX, gy, frontZ, 2.5, '#e2e8f0');

  drawIsoLine(c, [rearX - 0.06 * dir, gy + 0.04, 1.8], [gx + 0.05 * dir, gy + 0.04, 2.0 + liftZ * 0.3], '#cbd5e1', 1.8);
  drawPrism(c, gx - 0.07, gy - 0.06, 2.0 + liftZ * 0.3, 0.15, 0.12, 2.8, '#94a3b8', '#64748b', '#475569', '#e2e8f0');
  drawIsoLine(c, [rearX, gy, 4.2], [gx - 0.02 * dir, gy, 4.5 + liftZ * 0.45], '#0f172a', 2.8);

  drawIsoPoly(c, [
    [gx - 0.03 * dir, gy - 0.07, 4.6 + liftZ * 0.45],
    [gx + 0.15 * dir, gy - 0.07, 5.2 + liftZ * 0.65],
    [gx + 0.15 * dir, gy + 0.07, 5.2 + liftZ * 0.65],
    [gx - 0.03 * dir, gy + 0.07, 4.6 + liftZ * 0.45]
  ], '#ef4444', '#dc2626', 0.8);

  drawIsoLine(c, [frontX, gy, frontZ], [gx + 0.14 * dir, gy, 6.8 + liftZ * 0.8], '#e2e8f0', 1.6);

  const headP = iso(gx + 0.19 * dir, gy, 6.0 + liftZ * 0.75);
  c.fillStyle = '#fef08a';
  c.beginPath(); c.arc(headP.x, headP.y, 1.9 * zoom, 0, Math.PI * 2); c.fill();

  drawIsoLine(c, [gx - 0.04 * dir, gy, 4.6 + liftZ * 0.45], [gx + 0.03 * dir, gy, 2.5 + liftZ * 0.3], '#1e3a8a', 1.8);
  drawIsoLine(c, [gx - 0.05 * dir, gy, 4.8 + liftZ * 0.45], [gx + 0.02 * dir, gy, 8.6 + liftZ * 0.7], '#1e293b', 2.6);
  drawIsoLine(c, [gx + 0.01 * dir, gy, 8.2 + liftZ * 0.7], [gx + 0.14 * dir, gy, 6.8 + liftZ * 0.8], '#334155', 1.4);
  const helmP = iso(gx + 0.03 * dir, gy, 9.8 + liftZ * 0.75);
  c.fillStyle = '#f8fafc';
  c.beginPath(); c.arc(helmP.x, helmP.y, 2.2 * zoom, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0ea5e9';
  c.fillRect(helmP.x + (dir > 0 ? 0.3 : -2.0) * zoom, helmP.y - 0.8 * zoom, 1.8 * zoom, 1.2 * zoom);
}

function drawDetailedTruck3D(c, gx, gy, dir, kind, lightState) {
  drawShadow(c, gx, gy, 24, 9);
  drawVehicleNightLights(c, gx, gy, dir, lightState, false);
  const pt = (lx, ly, lz) => [gx + lx * dir, gy + ly, lz];

  if (kind === 'zil') {
    drawPrism(c, gx - 0.55, gy - 0.21, 1.0, 1.10, 0.42, 1.2, '#1e293b', '#0f172a', '#090d16', null);
    const tankX = gx - 0.18 * dir;
    drawPrism(c, tankX - 0.34, gy - 0.21, 2.2, 0.68, 0.42, 5.2, '#ff7300', '#ea580c', '#c2410c', '#ffcc00');
    const cabX = gx + 0.28 * dir;
    drawPrism(c, cabX - 0.16, gy - 0.20, 2.2, 0.32, 0.40, 5.0, '#38bdf8', '#0284c7', '#0369a1', '#e0f2fe');
    const hoodX = gx + 0.48 * dir;
    drawPrism(c, hoodX - 0.12, gy - 0.18, 2.2, 0.24, 0.36, 3.0, '#38bdf8', '#0284c7', '#f8fafc', null);
    drawWheel3D(c, gx - 0.35 * dir, gy + 0.22, 1.9, 2.6, '#94a3b8');
    drawWheel3D(c, gx + 0.02 * dir, gy + 0.22, 1.9, 2.6, '#94a3b8');
    drawWheel3D(c, gx + 0.44 * dir, gy + 0.22, 1.9, 2.6, '#94a3b8');
    return;
  }

  const isKamaz = kind === 'kamaz';
  drawPrism(c, gx - 0.72, gy - 0.23, 1.0, 1.44, 0.46, 1.3, '#1e293b', '#0f172a', '#090d16', null);

  const trX = gx - 0.22 * dir;
  if (isKamaz) {
    drawPrism(c, trX - 0.48, gy - 0.23, 2.3, 0.96, 0.46, 6.4, '#ffcc00', '#f59e0b', '#d97706', '#1e293b');
    drawIsoLine(c, pt(-0.68, 0.24, 5.2), pt(0.22, 0.24, 5.2), '#0f172a', 2.4);
    drawIsoLine(c, pt(-0.62, 0, 8.9), pt(0.18, 0, 8.9), '#475569', 1.8);
  } else {
    drawPrism(c, trX - 0.48, gy - 0.23, 2.3, 0.96, 0.46, 7.2, '#f8fafc', '#cbd5e1', '#94a3b8', '#475569');
  }

  const cabX = gx + 0.48 * dir;
  drawPrism(c, cabX - 0.20, gy - 0.22, 2.3, 0.40, 0.44, 7.0,
    isKamaz ? '#ff7300' : '#0284c7',
    isKamaz ? '#ea580c' : '#0369a1',
    isKamaz ? '#c2410c' : '#075985',
    'rgba(255,255,255,0.25)'
  );
  const frontFaceX = cabX + 0.20 * dir;
  drawIsoPoly(c, [
    [frontFaceX, gy - 0.19, 8.2],
    [frontFaceX, gy + 0.19, 8.2],
    [frontFaceX, gy + 0.19, 5.8],
    [frontFaceX, gy - 0.19, 5.8]
  ], '#0f172a', '#38bdf8', 0.8);
  drawIsoPoly(c, [
    [frontFaceX, gy - 0.16, 5.2],
    [frontFaceX, gy + 0.16, 5.2],
    [frontFaceX, gy + 0.16, 2.6],
    [frontFaceX, gy - 0.16, 2.6]
  ], '#111827', '#94a3b8', 0.7);

  drawWheel3D(c, gx - 0.52 * dir, gy + 0.24, 1.9, 2.7, '#cbd5e1');
  drawWheel3D(c, gx - 0.22 * dir, gy + 0.24, 1.9, 2.7, '#cbd5e1');
  drawWheel3D(c, gx + 0.46 * dir, gy + 0.24, 1.9, 2.7, '#cbd5e1');
}

function drawVehicleEntity(c, v, lightState) {
  const gy = getVehicleGy(v.lane);
  const dir = v.lane <= 2 ? 1 : -1;
  const gx = v.pos;

  if (v.type === 'minsk') {
    if (v.wheelie > 0) v.wheelie--;
    drawDetailedMinskMoto(c, gx, gy, dir, v.wheelie, lightState);
  } else if (v.type === 'kamaz' || v.type === 'zil' || v.type === 'euro_truck') {
    drawDetailedTruck3D(c, gx, gy, dir, v.type, lightState);
  } else if (v.type === 'kalina_grey') {
    drawLowPolyCarMesh(c, gx, gy, dir, {
      len: 0.78, wid: 0.38, chasH: 2.7, cabH: 2.6, hoodLen: 0.24, trunkLen: 0.10,
      colTop: '#94a3b8', colSide: '#64748b', colFront: '#475569', glassCol: '#0f172a', rimCol: '#e2e8f0'
    }, lightState);
  } else if (v.type === 'vesta_black') {
    drawLowPolyCarMesh(c, gx, gy, dir, {
      len: 0.88, wid: 0.40, chasH: 2.7, cabH: 2.5, hoodLen: 0.26, trunkLen: 0.20,
      colTop: '#1e293b', colSide: '#0f172a', colFront: '#090d16', glassCol: '#1e293b', rimCol: '#cbd5e1',
      xTrim: true
    }, lightState);
  } else if (v.type === 'vesta_sport') {
    drawLowPolyCarMesh(c, gx, gy, dir, {
      len: 0.90, wid: 0.40, chasH: 2.6, cabH: 2.5, hoodLen: 0.27, trunkLen: 0.20,
      colTop: '#ffcc00', colSide: '#eab308', colFront: '#1e293b', glassCol: '#090d16', rimCol: '#0f172a',
      xTrim: true, sportLine: true, spoiler: true, spoilerCol: '#0f172a', roofBlack: true
    }, lightState);
  } else if (v.type === 'harrier') {
    drawLowPolyCarMesh(c, gx, gy, dir, {
      len: 0.94, wid: 0.43, chasH: 3.3, cabH: 2.7, hoodLen: 0.28, trunkLen: 0.14,
      colTop: '#9f1239', colSide: '#881337', colFront: '#4c0519', glassCol: '#0f172a', rimCol: '#f1f5f9',
      roofBlack: true, lightBar: true
    }, lightState);
  } else if (v.type === 'bmw') {
    drawLowPolyCarMesh(c, gx, gy, dir, {
      len: 0.94, wid: 0.42, chasH: 2.6, cabH: 2.4, hoodLen: 0.30, trunkLen: 0.20,
      colTop: '#1d4ed8', colSide: '#1e3a8a', colFront: '#172554', glassCol: '#090d16', rimCol: '#94a3b8',
      kidneyGrille: true, spoiler: true, roofBlack: true
    }, lightState);
  } else if (v.type === 'lambo') {
    drawLowPolyCarMesh(c, gx, gy, dir, {
      len: 0.92, wid: 0.44, chasH: 2.1, cabH: 1.9, hoodLen: 0.32, trunkLen: 0.16,
      colTop: '#84cc16', colSide: '#65a30d', colFront: '#3f6212', glassCol: '#090d16', rimCol: '#0f172a',
      sideIntake: true, spoiler: true, spoilerCol: '#090d16'
    }, lightState);
  } else if (v.type === 'ferrari') {
    drawLowPolyCarMesh(c, gx, gy, dir, {
      len: 0.92, wid: 0.43, chasH: 2.2, cabH: 1.9, hoodLen: 0.31, trunkLen: 0.18,
      colTop: '#ef4444', colSide: '#dc2626', colFront: '#991b1b', glassCol: '#090d16', rimCol: '#fde047',
      sideIntake: true, spoiler: true, spoilerCol: '#dc2626', roofBlack: true
    }, lightState);
  }
}

/* --- ДВУХМОТОРНЫЙ САМОЛЕТ ПО ПОЛНОМУ 360° КРУГУ --- */
let planeAngle = 0;
let planeTrail = [];

function drawCircularAirplane(c) {
  if (!G.fleet.v_jet) return;
  const cx = 12.0, cy = 11.0, radius = 9.5, alt = 64;
  const gx = cx + Math.cos(planeAngle) * radius;
  const gy = cy + Math.sin(planeAngle) * radius;

  const tx = -Math.sin(planeAngle);
  const ty = Math.cos(planeAngle);

  const pNow = iso(gx, gy, alt);
  const pNext = iso(gx + tx * 0.5, gy + ty * 0.5, alt);
  const screenAngle = Math.atan2(pNext.y - pNow.y, pNext.x - pNow.x);

  drawShadow(c, gx, gy, 24, 12);

  if (Math.random() < 0.7) {
    planeTrail.push({ x: pNow.x, y: pNow.y, r: 3.5 * zoom, alpha: 0.55 });
    if (planeTrail.length > 42) planeTrail.shift();
  }
  planeTrail.forEach(pt => {
    pt.alpha *= 0.96;
    pt.r += 0.08 * zoom;
    c.fillStyle = `rgba(255, 255, 255, ${pt.alpha})`;
    c.beginPath(); c.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); c.fill();
  });

  c.save();
  c.translate(pNow.x, pNow.y);
  c.rotate(screenAngle);
  const s = zoom * 1.15;

  c.fillStyle = '#e2e8f0';
  c.beginPath();
  c.moveTo(4 * s, 0);
  c.lineTo(-6 * s, -22 * s);
  c.lineTo(-11 * s, -22 * s);
  c.lineTo(-5 * s, 0);
  c.lineTo(-11 * s, 22 * s);
  c.lineTo(-6 * s, 22 * s);
  c.closePath();
  c.fill();
  c.strokeStyle = '#94a3b8'; c.lineWidth = 0.8 * s; c.stroke();

  c.fillStyle = '#ffcc00';
  c.fillRect(-3 * s, -12 * s, 7 * s, 3.2 * s);
  c.fillRect(-3 * s, 8.8 * s, 7 * s, 3.2 * s);

  c.fillStyle = '#ff7300';
  c.beginPath();
  c.moveTo(-14 * s, 0);
  c.lineTo(-21 * s, -9 * s);
  c.lineTo(-24 * s, -9 * s);
  c.lineTo(-19 * s, 0);
  c.lineTo(-24 * s, 9 * s);
  c.lineTo(-21 * s, 9 * s);
  c.closePath();
  c.fill();

  const fusGrad = c.createLinearGradient(0, -4 * s, 0, 4 * s);
  fusGrad.addColorStop(0, '#ffffff');
  fusGrad.addColorStop(0.65, '#f1f5f9');
  fusGrad.addColorStop(1, '#94a3b8');
  c.fillStyle = fusGrad;
  c.beginPath();
  c.roundRect(-22 * s, -3.6 * s, 40 * s, 7.2 * s, 4 * s);
  c.fill();

  c.fillStyle = '#ffcc00';
  c.fillRect(-18 * s, -0.8 * s, 31 * s, 1.6 * s);
  c.fillStyle = '#0284c7';
  c.beginPath(); c.arc(14 * s, 0, 2.2 * s, -1.1, 1.1); c.fill();

  c.fillStyle = '#ffcc00';
  c.beginPath();
  c.moveTo(-16 * s, 0); c.lineTo(-23 * s, -4 * s); c.lineTo(-20 * s, 0); c.closePath(); c.fill();

  if (Math.sin(time * 14) > 0) {
    c.fillStyle = '#ff1744'; c.beginPath(); c.arc(-8 * s, -22 * s, 2.2 * s, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#00e676'; c.beginPath(); c.arc(-8 * s, 22 * s, 2.2 * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

let trainPos = -3;
let shipPos = 22;
let heliAngle = 0;
let popups = [];

/* ============================================================================
   7. ГЛАВНЫЙ РЕНДЕР МИРА С ЧЕСТНЫМ Z-БУФЕРОМ, ПОГОДОЙ И ОСВЕЩЕНИЕМ СУТОК
   ============================================================================ */
function renderIsoWorld() {
  const W = window.innerWidth, H = window.innerHeight;
  const reg = REGIONS_LIST.find(r => r.id === G.region) || REGIONS_LIST[0];
  const lightState = getLightingState();
  const winter = isWinterNow();
  const raining = isRainingNow();

  // 1. Шейдерный фон с учетом фазы суток
  renderShimmeringBackground(ctx, W, H, time, lightState);

  // 2. СЛОЙ 0 (ЗЕМЛЯ, ДОРОГИ, ЛУЖИ, ТРОТУАРЫ, ВОДА):
  const grassCol = winter ? '#e2e8f0' : reg.grass;
  drawPrism(ctx, 0, 0, -28, MAP_N, MAP_N, 20, '#1e293b', '#1e293b', '#0f172a', null);
  drawPrism(ctx, 0, 0, -8, MAP_N, MAP_N, 8, grassCol, reg.earth, '#2d1e17', 'rgba(255,255,255,0.12)');

  // Подземная нефтяная линза на срезе острова
  drawPrism(ctx, 2.0, 23.85, -24, 9.5, 0.2, 10, '#090d16', '#f59e0b', '#090d16', '#ffcc00');
  for (let p = 0; p < 6; p++) {
    drawPrism(ctx, 2.8 + p * 1.4, 23.82, -18, 0.14, 0.2, 18, '#94a3b8', '#cbd5e1', '#64748b', null);
  }

  // Бетонная плита завода (gx: 2..22, gy: 2..14.5)
  drawPrism(ctx, 2, 2, 0.1, 20, 12.5, 0.2, winter ? '#94a3b8' : '#475569', '#334155', '#1e293b', 'rgba(255,255,255,0.12)');
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.lineWidth = 0.8 * zoom;
  for (let gx = 2; gx <= 22; gx += 2) {
    const p1 = iso(gx, 2, 0.3), p2 = iso(gx, 14.5, 0.3);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  for (let gy = 2; gy <= 14; gy += 2) {
    const p1 = iso(2, gy, 0.3), p2 = iso(22, gy, 0.3);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }

  // Свободные пешеходные дорожки внутри завода
  drawPrism(ctx, 2.2, 7.4, 0.31, 19.6, 0.72, 0.12, '#64748b', '#475569', '#334155', 'rgba(255,204,0,0.3)');
  drawPrism(ctx, 2.2, 11.1, 0.31, 19.6, 0.72, 0.12, '#64748b', '#475569', '#334155', 'rgba(255,204,0,0.3)');

  // Северный и Южный тротуары с плиткой
  drawPrism(ctx, 0, 14.8, 0.2, MAP_N, 0.95, 0.32, winter ? '#cbd5e1' : '#94a3b8', '#64748b', '#475569', null);
  drawPrism(ctx, 0, 18.05, 0.2, MAP_N, 0.95, 0.32, winter ? '#cbd5e1' : '#94a3b8', '#64748b', '#475569', null);
  for (let gx = 0.5; gx < MAP_N; gx += 1.0) {
    const s1 = iso(gx, 14.8, 0.52), s2 = iso(gx, 15.75, 0.52);
    ctx.strokeStyle = 'rgba(30,41,59,0.32)';
    ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
  }

  // 4-полосное федеральное шоссе М-5
  drawPrism(ctx, 0, 15.75, 0.05, MAP_N, 2.3, 0.15, raining ? '#111827' : '#1e2633', '#334155', '#1e293b', null);
  drawPrism(ctx, 0, 16.80, 0.21, MAP_N, 0.08, 0.05, '#ffcc00', '#ffcc00', '#ffcc00', null);
  for (let gx = 0.4; gx < MAP_N; gx += 1.6) {
    drawPrism(ctx, gx, 16.25, 0.21, 0.75, 0.05, 0.04, '#cbd5e1', '#cbd5e1', '#cbd5e1', null);
    drawPrism(ctx, gx, 17.38, 0.21, 0.75, 0.05, 0.04, '#cbd5e1', '#cbd5e1', '#cbd5e1', null);
  }
  [8.0, 16.0].forEach(zx => {
    for (let s = 0; s < 5; s++) {
      drawPrism(ctx, zx, 15.90 + s * 0.42, 0.22, 0.65, 0.22, 0.06, '#f8fafc', '#e2e8f0', '#cbd5e1', null);
    }
  });

  // ПРОЦЕДУРНЫЕ ЛУЖИ НА АСФАЛЬТЕ М-5 И БЕТОНЕ ЗАВОДА (с отражением неба и неоновых огней)
  if (puddleWetness > 0.05 && !winter) {
    ctx.save();
    PUDDLES_LIST.forEach((pd, idx) => {
      const p = iso(pd.gx, pd.gy, 0.25);
      const rx = pd.rx * puddleWetness * zoom;
      const ry = pd.ry * puddleWetness * zoom;
      const pg = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, rx);
      if (lightState.nightLights) {
        pg.addColorStop(0, `rgba(56, 189, 248, ${0.42 * puddleWetness})`);
        pg.addColorStop(0.6, `rgba(255, 204, 0, ${0.24 * puddleWetness})`);
        pg.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else {
        pg.addColorStop(0, `rgba(125, 211, 252, ${0.38 * puddleWetness})`);
        pg.addColorStop(0.7, `rgba(30, 58, 138, ${0.25 * puddleWetness})`);
        pg.addColorStop(1, 'rgba(15, 23, 42, 0)');
      }
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(186, 230, 253, ${0.22 * puddleWetness})`;
      ctx.lineWidth = 0.8 * zoom;
      ctx.stroke();
    });
    ctx.restore();
  }

  // Морской залив на юге (gy: 19.0..24.0)
  drawPrism(ctx, 0, 19.0, -7, MAP_N, 5.0, 6.2, '#0284c7', '#0369a1', '#075985', null);
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
  ctx.lineWidth = 1.5 * zoom;
  for (let w = 0; w < 16; w++) {
    const wx = ((w * 3.3 + time * 1.15) % 22) + 0.8;
    const wy = 19.45 + (w % 5) * 0.88;
    const wp1 = iso(wx, wy, -0.7), wp2 = iso(wx + 1.05, wy, -0.7);
    ctx.beginPath(); ctx.moveTo(wp1.x, wp1.y); ctx.lineTo(wp2.x, wp2.y); ctx.stroke();
  }

  // Расходящиеся круги на лужах и воде от капель дождя
  if (raining) {
    if (Math.random() < 0.65) {
      const onPuddle = Math.random() < 0.55 && PUDDLES_LIST.length > 0;
      const pd = PUDDLES_LIST[Math.floor(Math.random() * PUDDLES_LIST.length)];
      rainRipples.push({
        gx: onPuddle ? pd.gx + (Math.random() - 0.5) * 0.7 : 1 + Math.random() * 22,
        gy: onPuddle ? pd.gy + (Math.random() - 0.5) * 0.3 : 16.0 + Math.random() * 6.5,
        gz: onPuddle ? 0.26 : (Math.random() < 0.5 ? 0.22 : -0.65),
        r: 1.0,
        alpha: 0.75
      });
      if (rainRipples.length > 35) rainRipples.shift();
    }
    ctx.save();
    rainRipples.forEach(rp => {
      rp.r += 0.26;
      rp.alpha *= 0.93;
      const p = iso(rp.gx, rp.gy, rp.gz);
      ctx.strokeStyle = `rgba(224, 242, 254, ${rp.alpha})`;
      ctx.lineWidth = 0.9 * zoom;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rp.r * zoom, rp.r * 0.5 * zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  // ЖД-насыпь и шпалы на севере
  if ((G.bldg.rail || 0) > 0) {
    drawPrism(ctx, 0, 0.4, 0, MAP_N, 0.8, 2.5, winter ? '#cbd5e1' : '#64748b', '#475569', '#334155', null);
    for (let gx = 0.2; gx < MAP_N; gx += 0.6) {
      drawPrism(ctx, gx, 0.5, 2.5, 0.22, 0.6, 0.3, '#78350f', '#451a03', '#451a03', null);
    }
  }

  /* ==========================================================================
     3. ЕДИНАЯ ОЧЕРЕДЬ 3D-ОБЪЕКТОВ С СОРТИРОВКОЙ ПО ГЛУБИНЕ (Z-BUFFER QUEUE)
     ========================================================================== */
  const q = [];
  const addObj = (cx, cy, drawFn) => q.push({ depth: cx + cy, draw: drawFn });

  // а) Вагоны и локомотив поезда на ЖД-ветке (с прожектором ночью!)
  if ((G.bldg.rail || 0) > 0 && trainPos > -4 && trainPos < 25) {
    addObj(trainPos + 0.7, 0.75, () => {
      if (lightState.nightLights) {
        drawIsoPoly(ctx, [
          [trainPos + 1.4, 0.62, 5.5],
          [trainPos + 4.4, 0.15, 2.8],
          [trainPos + 4.4, 1.35, 2.8],
          [trainPos + 1.4, 0.88, 5.5]
        ], `rgba(254, 240, 138, ${0.38 * lightState.lightIntensity})`, null);
      }
      drawPrism(ctx, trainPos, 0.48, 2.8, 1.4, 0.55, 10, '#ef4444', '#dc2626', '#991b1b');
      drawPrism(ctx, trainPos + 1.1, 0.52, 9.5, 0.3, 0.46, 2.5, lightState.nightLights ? '#fef08a' : '#38bdf8', '#0284c7', '#0369a1');
    });
    for (let c = 1; c <= 5; c++) {
      const cx = trainPos - c * 1.45;
      if (cx > -1 && cx < 23.5) {
        addObj(cx + 0.6, 0.75, () => {
          drawPrism(ctx, cx, 0.5, 2.8, 1.25, 0.5, 8.5, winter ? '#fef08a' : '#ffcc00', '#eab308', '#1e293b');
        });
      }
    }
  }

  // б) Опоры высоковольтной ЛЭП (gy = 1.4)
  if ((G.bldg.power || 0) > 0) {
    [3, 8, 13, 18, 21].forEach((px, idx) => {
      addObj(px + 0.13, 1.53, () => {
        drawPrism(ctx, px, 1.4, 0, 0.26, 0.26, 26, '#e2e8f0', '#94a3b8', '#64748b', null);
        drawPrism(ctx, px - 0.35, 1.4, 23, 0.95, 0.18, 1.6, '#ffcc00', '#eab308', '#ca8a04', null);
        if (idx > 0) {
          const prevX = [3, 8, 13, 18, 21][idx - 1];
          const p1 = iso(prevX, 1.4, 24), p2 = iso(px, 1.4, 24);
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
          ctx.lineWidth = 1.2 * zoom;
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 + 10 * zoom, p2.x, p2.y);
          ctx.stroke();
        }
      });
    });
  }

  // в) Деревья смешанного леса и парковой аллеи
  forestTrees.forEach(t => {
    addObj(t.gx, t.gy, () => drawTreeDetailed(ctx, t));
  });

  // г) Посегментный Забор Безопасности и КПП + ночные прожекторы на вышках охраны
  if ((G.bldg.fence || 0) > 0) {
    for (let gx = 2; gx < 22; gx += 2) {
      addObj(gx + 1.0, 2.08, () => drawPrism(ctx, gx, 2.0, 0.3, 2.0, 0.16, 6.2, '#ffcc00', '#64748b', '#475569', null));
    }
    for (let gy = 2; gy < 14; gy += 2) {
      addObj(2.08, gy + 1.0, () => drawPrism(ctx, 2.0, gy, 0.3, 0.16, 2.0, 6.2, '#ffcc00', '#64748b', '#475569', null));
      addObj(21.92, gy + 1.0, () => drawPrism(ctx, 21.84, gy, 0.3, 0.16, 2.0, 6.2, '#ffcc00', '#64748b', '#475569', null));
    }
    [[2.0, 2.8], [4.8, 2.7], [9.5, 2.8], [12.3, 2.7], [17.0, 2.5], [19.5, 2.5]].forEach(([fx, fw]) => {
      addObj(fx + fw * 0.5, 14.58, () => drawPrism(ctx, fx, 14.5, 0.3, fw, 0.16, 6.2, '#ffcc00', '#64748b', '#475569', null));
    });
    const gateLift = Math.sin(time * 2.2) > 0 ? 6.5 : 0;
    addObj(8.5, 14.58, () => drawPrism(ctx, 7.6, 14.5, 4 + gateLift, 1.8, 0.12, 1.4, '#ef4444', '#ffffff', '#ef4444', null));
    addObj(16.0, 14.58, () => drawPrism(ctx, 15.1, 14.5, 4 + gateLift, 1.8, 0.12, 1.4, '#ef4444', '#ffffff', '#ef4444', null));
    [[2.0, 2.0], [21.6, 2.0], [2.0, 14.3], [21.6, 14.3]].forEach(([wx, wz]) => {
      addObj(wx + 0.21, wz + 0.21, () => {
        drawPrism(ctx, wx, wz, 0.3, 0.42, 0.42, 16, '#ffcc00', '#334155', '#1e293b');
        if (lightState.nightLights) {
          drawGlow(ctx, wx + 0.21, wz + 0.21, 16.5, 22, `rgba(254, 240, 138, ${0.45 * lightState.lightIntensity})`);
        }
      });
    });
  }

  // д) Уличные фонарные столбы и лавочки на северном тротуаре (включаются в сумерках и ночью!)
  for (let gx = 4; gx <= 20; gx += 4) {
    addObj(gx, 15.0, () => {
      drawPrism(ctx, gx, 14.95, 0.52, 0.1, 0.1, 11, '#f8fafc', '#475569', '#1e293b', null);
      const lampP = iso(gx + 0.05, 15.08, 11.6);
      ctx.fillStyle = lightState.nightLights ? '#fef08a' : '#cbd5e1';
      ctx.beginPath(); ctx.arc(lampP.x, lampP.y, 2.3 * zoom, 0, Math.PI * 2); ctx.fill();
      if (lightState.nightLights) {
        drawGlow(ctx, gx + 0.05, 15.08, 11.6, 18, `rgba(254, 240, 138, ${0.55 * lightState.lightIntensity})`);
        drawGlow(ctx, gx + 0.05, 15.25, 0.55, 24, `rgba(255, 204, 0, ${0.32 * lightState.lightIntensity})`);
      }
    });
    addObj(gx + 0.5, 15.05, () => drawPrism(ctx, gx + 0.3, 15.0, 0.52, 0.55, 0.22, 2.2, '#d97706', '#92400e', '#78350f', null));
  }

  // е) РАЙОН 1: Ажурные буровые вышки «Уралмаш» и Проработанные Станки-Качалки ПШГН
  const dCount = Math.min(5, G.bldg.derricks || 1);
  const derrickY = [2.9, 4.3, 5.7, 9.1, 10.4];
  for (let i = 0; i < dCount; i++) {
    const dy = derrickY[i];
    addObj(3.0, dy, () => drawDetailedDerrick(ctx, 3.0, dy));
  }

  const pCount = Math.min(9, G.bldg.pumpjacks || 2);
  const pumpRowsY = [3.1, 4.8, 6.4];
  for (let i = 0; i < pCount; i++) {
    const px = 4.35 + (i % 3) * 1.40;
    const py = pumpRowsY[Math.floor(i / 3)];
    addObj(px, py, () => drawDetailedPumpjack(ctx, px, py, i * 1.3));
  }

  // ж) РАЙОН 2: Трубопровод, Колонны Крекинга, Градирни и Факельное хозяйство с ветром
  if ((G.bldg.pipes || 0) > 0) {
    for (let s = 0; s < 5; s++) {
      const sx = 7.5 + s * 2.0;
      addObj(sx + 1.0, 6.8, () => {
        drawPrism(ctx, sx, 6.65, 1.8, 2.0, 0.18, 2.4, '#ffcc00', '#d97706', '#b45309', null);
        drawPrism(ctx, sx, 6.95, 1.8, 2.0, 0.18, 2.4, '#00e5ff', '#0284c7', '#0369a1', null);
      });
    }
  }
  const distCount = Math.min(8, G.bldg.distill || 2);
  for (let i = 0; i < distCount; i++) {
    const cx = 9.0 + (i % 4) * 1.15;
    const cy = 2.8 + Math.floor(i / 4) * 1.35;
    const isGold = (G.bldg.distill || 1) >= 12;
    addObj(cx, cy, () => {
      drawDetailedTank(ctx, cx, cy, 0.3, 8.5, 28 + (i % 3) * 5,
        isGold ? '#b45309' : '#64748b',
        isGold ? '#fde047' : '#f8fafc',
        isGold ? '#92400e' : '#334155',
        '#ffcc00', '#ef4444', false
      );
    });
  }
  // Факельные мачты с колебанием пламени от ветра
  const flareCount = Math.min(2, Math.max(1, G.bldg.flares || 1));
  for (let f = 0; f < flareCount; f++) {
    const fx = 12.8 + f * 1.2, fy = 2.5;
    addObj(fx, fy, () => drawWindFlareStack(ctx, fx, fy));
  }

  const coolCount = Math.min(3, G.bldg.coolers || 1);
  for (let i = 0; i < coolCount; i++) {
    const cx = 8.9 + i * 1.65, cy = 5.65;
    addObj(cx, cy, () => drawDetailedTank(ctx, cx, cy, 0.3, 12.0, 19, '#64748b', '#cbd5e1', '#475569', '#1e293b', '#ffcc00', true));
  }

  // з) РАЙОН 3: Товарный парк резервуаров РВС-20000 (со снегом зимой) и Шаровые газгольдеры
  const tCount = Math.min(9, G.bldg.tanks || 2);
  for (let i = 0; i < tCount; i++) {
    const tx = 15.5 + (i % 3) * 1.65;
    const ty = 2.8 + Math.floor(i / 3) * 1.45;
    addObj(tx, ty, () => drawDetailedTank(ctx, tx, ty, 0.3, 12.0, 16, '#94a3b8', '#ffffff', '#64748b', '#f8fafc', '#ffcc00', false));
  }
  const sCount = Math.min(4, G.bldg.spheres || 1);
  for (let i = 0; i < sCount; i++) {
    const sx = 15.5 + i * 1.4, sy = 9.2;
    addObj(sx, sy, () => {
      const p = iso(sx, sy, 10);
      drawShadow(ctx, sx, sy, 11, 5.5);
      const g = ctx.createRadialGradient(p.x - 3 * zoom, p.y - 3 * zoom, 1, p.x, p.y, 10 * zoom);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#e2e8f0'); g.addColorStop(1, '#475569');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 10 * zoom, 0, Math.PI * 2); ctx.fill();
      if (winter) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 2 * zoom, 8.2 * zoom, Math.PI * 1.08, Math.PI * 1.92);
        ctx.fill();
      }
    });
  }

  // и) РАЙОН 4: Кампус НИИ, Спортзал «Энергия» и Небоскреб @slu1pik (со светящимися окнами ночью!)
  const hqH = Math.min(36, 20 + Math.floor(Math.log2((G.bldg.hq || 1) + 1) * 4));
  addObj(9.2 + 0.75, 9.0 + 0.65, () => drawDetailedBuilding(ctx, 9.2, 9.0, 0.3, 1.5, 1.3, hqH, '#ffcc00', '#1e3a5f', '#0f2342', '#fde047', 6, true, lightState));
  addObj(7.2 + 0.65, 9.0 + 0.60, () => drawDetailedBuilding(ctx, 7.2, 9.0, 0.3, 1.3, 1.2, 15, '#c084fc', '#4c1d95', '#2e1065', '#e879f9', 3, true, lightState));
  addObj(11.6 + 0.70, 9.0 + 0.70, () => drawDetailedBuilding(ctx, 11.6, 9.0, 0.3, 1.4, 1.4, 42, '#00e5ff', '#0c2d48', '#051626', '#00e5ff', 8, false, lightState));

  // к) РАЙОН 5: Флагманская АЗС «Роснефть», Кафе «Зерно», 2.5D-Навес и Стела с живыми ценниками
  addObj(16.0 + 1.0, 12.0 + 0.55, () => drawDetailedBuilding(ctx, 16.0, 12.0, 0.3, 2.0, 1.1, 14, '#ffcc00', '#1e293b', '#0f172a', '#38bdf8', 2, true, lightState));
  if ((G.bldg.zerno || 0) > 0) {
    addObj(18.4 + 0.6, 12.0 + 0.55, () => drawDetailedBuilding(ctx, 18.4, 12.0, 0.3, 1.2, 1.1, 13, '#00e5ff', '#0369a1', '#075985', '#fef08a', 2, false, lightState));
  }
  addObj(17.2, 13.55, () => {
    drawPrism(ctx, 16.2, 13.4, 0.3, 0.2, 0.2, 21, '#fff', '#cbd5e1', '#94a3b8', null);
    drawPrism(ctx, 18.2, 13.4, 0.3, 0.2, 0.2, 21, '#fff', '#cbd5e1', '#94a3b8', null);
    drawPrism(ctx, 15.8, 12.9, 21, 2.8, 1.3, 4.5, winter ? '#f8fafc' : '#ffcc00', '#ff7300', '#d97706', '#ffffff');
    if (lightState.nightLights) {
      drawGlow(ctx, 17.2, 13.55, 19, 32, `rgba(254, 249, 195, ${0.48 * lightState.lightIntensity})`);
    }
  });
  // Стела АЗС с динамическими ценниками топлива!
  addObj(20.38, 13.78, () => drawGasStationStele(ctx, 20.2, 13.6, lightState));

  // л) Все живые человечки
  people.forEach(h => {
    addObj(h.gx, h.gy, () => drawDetailedPerson(ctx, h));
  });

  // м) Все 18 Low-Poly 3D автомобилей и мотоциклов на 4-полосной трассе М-5 (с фарами ночью)
  vehicles.forEach(v => {
    const vGy = getVehicleGy(v.lane);
    addObj(v.pos, vGy, () => drawVehicleEntity(ctx, v, lightState));
  });

  // н) МОРСКОЙ ПОРТ, СУПЕРТАНКЕР «ЗВЕЗДА» И ПЛАТФОРМА «БЕРКУТ»
  if ((G.bldg.port || 0) > 0 || G.fleet.v_berkut || G.fleet.v_tanker) {
    addObj(13.6, 18.45, () => drawPrism(ctx, 13.0, 18.2, 0.5, 1.2, 0.45, 5, '#ef4444', '#dc2626', '#991b1b', null));
    addObj(14.9, 18.45, () => drawPrism(ctx, 14.3, 18.2, 0.5, 1.2, 0.45, 5, '#0284c7', '#0369a1', '#075985', null));
    addObj(16.0, 18.45, () => drawPrism(ctx, 15.8, 18.2, 0.5, 0.4, 0.4, 22, '#ffcc00', '#eab308', '#ca8a04', null));

    if (shipPos > -3 && shipPos < 25) {
      addObj(shipPos + 1.4, 20.0, () => {
        const bowP = iso(shipPos, 20.35, -0.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2 * zoom;
        ctx.beginPath(); ctx.arc(bowP.x, bowP.y, 6 * zoom, 0, Math.PI); ctx.stroke();

        drawPrism(ctx, shipPos, 19.65, -0.8, 2.9, 0.78, 6.8, '#991b1b', '#dc2626', '#7f1d1d', '#fca5a5');
        drawPrism(ctx, shipPos + 0.25, 19.75, 6.0, 1.5, 0.58, 1.8, '#475569', '#334155', '#1e293b', '#ffcc00');
        drawPrism(ctx, shipPos + 2.0, 19.73, 6.0, 0.65, 0.62, 7.5, '#f8fafc', '#e2e8f0', '#cbd5e1', lightState.nightLights ? '#fef08a' : '#38bdf8');
        drawPrism(ctx, shipPos + 2.25, 19.85, 13.5, 0.22, 0.32, 3.8, '#ffcc00', '#ea580c', '#9a3412', null);
      });
    }

    addObj(5.2, 22.3, () => {
      drawPrism(ctx, 4.3, 21.7, -5, 0.35, 0.35, 11, '#94a3b8', '#64748b', '#475569', null);
      drawPrism(ctx, 5.7, 21.7, -5, 0.35, 0.35, 11, '#94a3b8', '#64748b', '#475569', null);
      drawPrism(ctx, 4.3, 22.7, -5, 0.35, 0.35, 11, '#94a3b8', '#64748b', '#475569', null);
      drawPrism(ctx, 5.7, 22.7, -5, 0.35, 0.35, 11, '#94a3b8', '#64748b', '#475569', null);
      drawPrism(ctx, 4.1, 21.5, 6, 2.1, 1.5, 5.5, winter ? '#f8fafc' : '#ff7300', '#eab308', '#ca8a04', '#fde047');
      drawDetailedDerrick(ctx, 5.15, 22.25);
    });
  }

  // СОРТИРОВКА ВСЕХ ОБЪЕКТОВ ОТ ЗАДНЕГО ПЛАНА К ПЕРЕДНЕМУ И ОТРИСОВКА
  q.sort((a, b) => a.depth - b.depth);
  q.forEach(item => item.draw());

  // 4. ФИЗИЧЕСКАЯ СИСТЕМА ЧАСТИЦ ПАРА ИЗ ГРАДИРЕН, ДЫМА ИЗ ТРУБ И ИСКР ФАКЕЛА
  envParticles.forEach(pt => {
    const p = iso(pt.gx, pt.gy, pt.gz);
    const prog = pt.life / pt.maxLife;
    const a = pt.alpha * (1 - prog);
    if (pt.kind === 'steam') {
      ctx.fillStyle = `rgba(248, 250, 252, ${a})`;
    } else if (pt.kind === 'smoke') {
      ctx.fillStyle = `rgba(148, 163, 184, ${a})`;
    } else {
      ctx.fillStyle = `rgba(253, 224, 71, ${a})`;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, pt.r * zoom, 0, Math.PI * 2);
    ctx.fill();
  });

  // 5. СЛОЙ ВОЗДУШНОГО ПРОСТРАНСТВА
  if (G.fleet.v_mi8) {
    heliAngle += 0.024;
    const hx = 10.5 + Math.cos(heliAngle) * 3.5;
    const hy = 9.0 + Math.sin(heliAngle) * 2.5;
    drawShadow(ctx, hx, hy, 14, 7);
    drawPrism(ctx, hx, hy, 48, 0.9, 0.44, 6, '#ffcc00', '#f59e0b', '#0284c7');
    const hp = iso(hx + 0.42, hy + 0.22, 55);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    const rot = time * 20;
    ctx.beginPath();
    ctx.moveTo(hp.x - Math.cos(rot) * 20 * zoom, hp.y - Math.sin(rot) * 10 * zoom);
    ctx.lineTo(hp.x + Math.cos(rot) * 20 * zoom, hp.y + Math.sin(rot) * 10 * zoom);
    ctx.stroke();
  }

  drawCircularAirplane(ctx);

  // 6. АТМОСФЕРНЫЙ ФИЛЬТР СУТОК + BLOOM-СВЕЧЕНИЕ ФАКЕЛОВ, МОНОЛИТА И АЗС
  if (lightState.ambientTint) {
    ctx.fillStyle = lightState.ambientTint;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const flRad = 30 + Math.sin(time * 16) * 6;
  drawGlow(ctx, 12.8 + windX * 0.25, 2.5, 36, flRad, 'rgba(255, 120, 0, 0.88)');
  drawGlow(ctx, 12.8 + windX * 0.25, 2.5, 37, flRad * 0.45, 'rgba(255, 255, 190, 0.95)');
  drawGlow(ctx, 12.2, 9.6, 44, 42, 'rgba(0, 229, 255, 0.75)');
  drawGlow(ctx, 17.2, 13.5, 14, 44, 'rgba(255, 204, 0, 0.55)');
  drawGlow(ctx, 20.3, 13.7, 18, 26, 'rgba(255, 204, 0, 0.48)');
  ctx.restore();

  // 7. ЭКРАННЫЕ ОСАДКИ: ДОЖДЬ С НАКЛОНОМ ПО ВЕТРУ ИЛИ ЗИМНИЙ СНЕГОПАД
  if (raining) {
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.52)';
    ctx.lineWidth = 1.2;
    const slantX = windX * 14;
    weatherDrops.forEach(d => {
      d.y += d.speed * 0.028;
      d.x += (windX * 0.006);
      if (d.y > 1) { d.y = -0.05; d.x = Math.random(); }
      if (d.x > 1) d.x -= 1;
      if (d.x < 0) d.x += 1;
      const sx = d.x * W, sy = d.y * H;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + slantX, sy + d.len);
      ctx.stroke();
    });
    ctx.restore();
  } else if (winter) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    weatherDrops.forEach(d => {
      d.y += d.speed * 0.0055;
      d.x += Math.sin(time * 1.5 + d.drift) * 0.0012 + windX * 0.0018;
      if (d.y > 1) { d.y = -0.03; d.x = Math.random(); }
      if (d.x > 1) d.x -= 1;
      if (d.x < 0) d.x += 1;
      ctx.beginPath();
      ctx.arc(d.x * W, d.y * H, d.sz, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 8. Всплывающие бабблы доходов
  for (let i = popups.length - 1; i >= 0; i--) {
    const pp = popups[i];
    pp.gz += 0.42; pp.life--;
    const p = iso(pp.gx, pp.gy, pp.gz);
    ctx.fillStyle = 'rgba(10, 14, 22, 0.92)';
    ctx.strokeStyle = pp.col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(p.x - 55, p.y - 11, 110, 19, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pp.col;
    ctx.font = '800 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pp.txt, p.x, p.y + 2);
    if (pp.life <= 0) popups.splice(i, 1);
  }
}

function addPopup(gx, gy, txt, col = '#ffcc00') {
  popups.push({ gx, gy, gz: 28, txt, col, life: 55 });
}

function handleIsoTap(cx, cy) {
  if (G.fleet.v_jet) {
    const px = 12.0 + Math.cos(planeAngle) * 9.5;
    const py = 11.0 + Math.sin(planeAngle) * 9.5;
    const sp = iso(px, py, 64);
    if (Math.hypot(cx - sp.x, cy - sp.y) < 42 * zoom) {
      sfx('web');
      const bonus = getTotalIncome() * 18;
      G.money += bonus;
      unlockSecret('sec_plane', `✈️ БОРТ №1 «РОСНЕФТЬ-АВИА»! +${fmt(bonus)} ₽`);
      addPopup(px, py, `✈️ +${fmt(bonus)} ₽`, '#00e5ff');
      return;
    }
  }

  for (let h of people) {
    const hp = iso(h.gx, h.gy, 5);
    if (Math.hypot(cx - hp.x, cy - hp.y) < 22 * zoom) {
      sfx('upg');
      const bonus = getTotalIncome() * 8;
      G.money += bonus;
      unlockSecret('sec_worker', `👷 ПРЕМИЯ НЕФТЯНИКУ! +${fmt(bonus)} ₽`);
      addPopup(h.gx, h.gy, `👷 +${fmt(bonus)} ₽`, '#00e676');
      return;
    }
  }

  for (let v of vehicles) {
    const gy = getVehicleGy(v.lane);
    const p = iso(v.pos, gy, 4);
    if (Math.hypot(cx - p.x, cy - p.y) < 30 * zoom) {
      const bonus = getTotalIncome() * 12;
      G.money += bonus;
      if (v.type === 'minsk') {
        sfx('moto');
        v.wheelie = 85;
        unlockSecret('sec_minsk', `🏍️ МИНСК 3.112 ВИЛЛИ! +${fmt(bonus)} ₽`);
      } else if (v.type === 'harrier') {
        sfx('upg');
        unlockSecret('sec_harrier', `🚙 TOYOTA HARRIER VIP! +${fmt(bonus)} ₽`);
      } else {
        sfx('tap');
        notify(`🏎️ ${v.name}`, `Бонус трафика М-5: +${fmt(bonus)} ₽`);
      }
      addPopup(v.pos, gy, `+${fmt(bonus)} ₽`, '#00e676');
      return;
    }
  }

  const slp = iso(12.2, 9.6, 25);
  if (Math.hypot(cx - slp.x, cy - slp.y) < 42 * zoom) {
    sfx('web');
    unlockSecret('sec_slu1pik', '💎 Активирован монолит @slu1pik!');
    openModal('tgModal');
    return;
  }

  const tp = iso(0.8, 6.0, 10);
  if (Math.hypot(cx - tp.x, cy - tp.y) < 50 * zoom) {
    sfx('upg');
    G.rep += 45;
    unlockSecret('sec_bor', '🌲 Бузулукский сосновый бор: +45 Репутации!');
    return;
  }

  sfx('tap');
  const gain = Math.max(25, Math.round(getTotalIncome() * 0.5));
  G.money += gain;
  addPopup(12, 10, `+${fmt(gain)} ₽`, '#ffcc00');
}

/* ============================================================================
   8. ОТРИСОВКА КАРТОЧЕК И МОБИЛЬНОЙ ВЕТКИ-ПАУТИНКИ
   ============================================================================ */
function drawCardThumbnails() {
  SECTORS.forEach((s, idx) => {
    const can = document.getElementById('thumb_' + s.id);
    if (!can) return;
    const c = can.getContext('2d');
    c.clearRect(0, 0, 52, 52);
    const cols = [
      ['#ffcc00', '#ea580c', '#9a3412'],
      ['#38bdf8', '#0284c7', '#075985'],
      ['#34d399', '#059669', '#065f46'],
      ['#c084fc', '#9333ea', '#581c87']
    ][idx % 4];
    c.fillStyle = '#334155';
    c.beginPath(); c.moveTo(26, 34); c.lineTo(44, 42); c.lineTo(26, 49); c.lineTo(8, 42); c.closePath(); c.fill();
    c.fillStyle = cols[0];
    c.beginPath(); c.moveTo(26, 10); c.lineTo(38, 16); c.lineTo(26, 22); c.lineTo(14, 16); c.closePath(); c.fill();
    c.fillStyle = cols[1];
    c.beginPath(); c.moveTo(14, 16); c.lineTo(26, 22); c.lineTo(26, 40); c.lineTo(14, 34); c.closePath(); c.fill();
    c.fillStyle = cols[2];
    c.beginPath(); c.moveTo(38, 16); c.lineTo(26, 22); c.lineTo(26, 40); c.lineTo(38, 34); c.closePath(); c.fill();
  });
}

function isWebUnlocked(node) {
  if (node.req.length === 0) return true;
  return node.req.some(rId => (G.web[rId] || 0) > 0);
}
function getWebCost(node) {
  const l = G.web[node.id] || 0;
  return Math.round(node.cost * Math.pow(1.65, l));
}
function buyWebNode(id) {
  const n = WEB_TREE.find(x => x.id === id);
  if (!n) return;
  const l = G.web[n.id] || 0;
  if (l >= n.max || !isWebUnlocked(n)) return;
  const cost = getWebCost(n);
  if (G.sci >= cost) {
    G.sci -= cost;
    G.web[n.id] = l + 1;
    G.rep += 20;
    sfx('web');
    renderMobileWeb();
    notify(`🕸️ УЗЕЛ ПРОКАЧАН: ${n.name}`, `Уровень ${G.web[n.id]}/${n.max} (+${Math.round(n.mult * 100)}% к доходу)`);
  } else {
    notify('🔬 НЕДОСТАТОЧНО НАУКИ', `Нужно ${fmt(cost)} очков науки 🔬`);
  }
}

function renderMobileWeb() {
  const wrap = document.getElementById('mobileWebWrap');
  const svg = document.getElementById('webSvgLines');
  const layer = document.getElementById('webNodesLayer');
  const W = wrap.clientWidth || 360;

  let linesHtml = '';
  WEB_TREE.forEach(node => {
    const nx = (node.x / 100) * W, ny = node.y;
    node.req.forEach(reqId => {
      const p = WEB_TREE.find(x => x.id === reqId);
      if (!p) return;
      const px = (p.x / 100) * W, py = p.y;
      const pLvl = G.web[p.id] || 0, nLvl = G.web[node.id] || 0;
      const lit = pLvl > 0 && nLvl > 0;
      const avail = pLvl > 0 && nLvl === 0;
      const col = lit ? '#00e676' : (avail ? '#00e5ff' : '#334155');
      const w = lit ? 3 : 2;
      const midY = (py + ny) / 2;
      linesHtml += `<path d="M ${px} ${py} C ${px} ${midY}, ${nx} ${midY}, ${nx} ${ny}" fill="none" stroke="${col}" stroke-width="${w}" />`;
    });
  });
  svg.innerHTML = linesHtml;

  layer.innerHTML = WEB_TREE.map(node => {
    const l = G.web[node.id] || 0;
    const isMax = l >= node.max;
    const unl = isWebUnlocked(node);
    const cost = getWebCost(node);
    let cls = 'locked';
    if (isMax) cls = 'maxed';
    else if (l > 0) cls = 'partial';
    else if (unl) cls = 'ready';

    return `<div class="mw-node ${cls}" style="left:${node.x}%; top:${node.y}px;">
      <div class="mwn-ico">${node.ico}</div>
      <div class="mwn-title">${node.name}</div>
      <div class="mwn-bonus">Ур. ${l}/${node.max} • +${Math.round(node.mult * 100)}%</div>
      <button class="mwn-btn ${isMax ? 'done' : ''}" ${(!unl || isMax) ? 'disabled' : ''} onclick="buyWebNode('${node.id}')">
        ${isMax ? '✓ МАКС' : (unl ? `🔬 ${fmt(cost)}` : '🔒')}
      </button>
    </div>`;
  }).join('');
}

function renderCards() {
  document.getElementById('bldgList').innerHTML = SECTORS.map(s => {
    const lvl = G.bldg[s.id] || 0;
    const { count, total } = getBulkBuy(s.id);
    const nextM = lvl < 10 ? 10 : (lvl < 25 ? 25 : (lvl < 50 ? 50 : 100));
    const pct = Math.min(100, Math.round((lvl / nextM) * 100));
    return `<div class="iso-card">
      <canvas id="thumb_${s.id}" class="iso-thumb" width="52" height="52"></canvas>
      <div class="ic-body">
        <div class="ic-row1"><span class="ic-title">${s.name}</span><span class="ic-lvl">Ур. ${lvl}</span></div>
        <div class="ic-desc">${s.desc}</div>
        <div class="ic-prog-bg"><div class="ic-prog-fill" style="width:${pct}%"></div></div>
        <div class="ic-stats"><span>Веха х2: Ур.${nextM}</span><b>+${fmt(s.inc * Math.max(1, lvl) * getMilestoneMult(lvl))} ₽/с</b></div>
      </div>
      <button class="ic-buy-btn" id="btn_s_${s.id}" onclick="buySector('${s.id}')">СТРОИТЬ +${count}<br><span>${fmt(total)} ₽</span></button>
    </div>`;
  }).join('');

  document.getElementById('fleetList').innerHTML = FLEET_LIST.map(v => {
    const owned = !!G.fleet[v.id];
    return `<div class="iso-card">
      <div class="iso-thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;">${v.ico}</div>
      <div class="ic-body">
        <div class="ic-row1"><span class="ic-title">${v.name}</span><span class="ic-lvl">${owned ? 'В СТРОЮ' : 'АНГАР'}</span></div>
        <div class="ic-desc">${v.desc}</div>
        <div class="ic-stats"><span>Бонус ко всей империи:</span><b>+${Math.round(v.bonus * 100)}%</b></div>
      </div>
      <button class="ic-buy-btn" ${owned ? 'disabled' : ''} onclick="buyFleet('${v.id}', ${v.cost})">${owned ? 'КУПЛЕНО' : `КУПИТЬ<br>${fmt(v.cost)} ₽`}</button>
    </div>`;
  }).join('');

  document.getElementById('regList').innerHTML = REGIONS_LIST.map(r => {
    const unl = G.unlockedRegions.includes(r.id);
    const cur = G.region === r.id;
    return `<div class="iso-card">
      <div class="iso-thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;">${r.winter ? '❄️' : '🌍'}</div>
      <div class="ic-body">
        <div class="ic-row1"><span class="ic-title">${r.id}. ${r.name}</span><span class="ic-lvl">Доход х${r.mult}</span></div>
        <div class="ic-desc">${r.winter ? '❄️ Зимний регион со снегом на резервуарах' : 'Солнечный/континентальный климат'} • Доход х${r.mult}</div>
        <div class="ic-stats"><span>Статус:</span><b>${unl ? 'Открыт ✅' : 'Лицензия РФ'}</b></div>
      </div>
      <button class="ic-buy-btn" ${cur ? 'disabled' : ''} onclick="selectReg(${r.id}, ${r.cost})">${cur ? 'АКТИВЕН' : (unl ? 'ПЕРЕЙТИ' : `ОТКРЫТЬ<br>${fmt(r.cost)} ₽`)}</button>
    </div>`;
  }).join('');

  document.getElementById('secList').innerHTML = SECRETS_LIST.map(s => {
    const done = !!G.secrets[s.id];
    return `<div class="iso-card">
      <div class="iso-thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;">${done ? '🏆' : s.ico}</div>
      <div class="ic-body">
        <div class="ic-row1"><span class="ic-title">${s.name}</span><span class="ic-lvl">${done ? 'НАЙДЕНО' : 'СЕКРЕТ'}</span></div>
        <div class="ic-desc">${s.desc}</div>
        <div class="ic-stats"><span>Награда:</span><b>+Наука и Репутация</b></div>
      </div>
    </div>`;
  }).join('') + `<div class="iso-card">
    <div class="iso-thumb" style="display:flex;align-items:center;justify-content:center;font-size:22px;">🔄</div>
    <div class="ic-body"><div class="ic-row1"><span class="ic-title">Сброс сохранения</span><span class="ic-lvl">Система</span></div><div class="ic-desc">Начать строительство с 1 уровня и пустого ангара</div></div>
    <button class="ic-buy-btn" style="background:#ef4444;color:#fff;" onclick="hardReset()">СБРОС</button>
  </div>`;

  drawCardThumbnails();
  renderMobileWeb();
}

function notify(title, desc) {
  const b = document.getElementById('mobileToast');
  document.getElementById('tTitle').innerText = title;
  document.getElementById('tDesc').innerText = desc;
  b.style.display = 'block';
  clearTimeout(window._ntT);
  window._ntT = setTimeout(() => b.style.display = 'none', 3000);
}

function buySector(id) {
  const { count, total } = getBulkBuy(id);
  if (G.money >= total && count > 0) {
    G.money -= total;
    G.bldg[id] = (G.bldg[id] || 0) + count;
    G.rep += count * 3;
    const s = SECTORS.find(x => x.id === id);
    sfx('upg');
    renderCards();
    addPopup(11, 9, `${s.name} -> Ур.${G.bldg[id]}`, '#00e676');
    notify(`🏗️ ${s.name} -> Ур. ${G.bldg[id]}`, s.desc);
  }
}

function buyFleet(id, cost) {
  if (G.money >= cost && !G.fleet[id]) {
    G.money -= cost;
    G.fleet[id] = true;
    G.rep += 30;
    sfx('upg');
    renderCards();
    const item = FLEET_LIST.find(x => x.id === id);
    notify(`🏎️ КУПЛЕНО: ${item ? item.name : 'Техника'}`, 'Добавлено в корпоративный флот империи!');
  }
}

function selectReg(id, cost) {
  if (G.unlockedRegions.includes(id)) {
    G.region = id;
  } else if (G.money >= cost) {
    G.money -= cost;
    G.unlockedRegions.push(id);
    G.region = id;
    G.rep += 100;
  } else {
    notify('💰 НЕДОСТАТОЧНО КАПИТАЛА', `Нужно ${fmt(cost)} ₽`);
    return;
  }
  sfx('web');
  renderCards();
}

function unlockSecret(id, msg) {
  if (!G.secrets[id]) {
    G.secrets[id] = true;
    G.sci += 45;
    G.rep += 60;
    renderCards();
  }
  notify('🕵️ ПАСХАЛКА НАЙДЕНА!', msg);
}

function setBuyMult(m, btn) {
  sfx('tap');
  buyMult = m;
  document.querySelectorAll('.mp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCards();
}
function switchTab(id, btn) {
  sfx('tap');
  document.querySelectorAll('.sheet-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('phoneSheet').classList.remove('minimized');
  document.getElementById('sheetToggleBtn').innerText = '▼';
  if (id === 'pageWeb') setTimeout(renderMobileWeb, 40);
}
function toggleSheet() {
  sfx('tap');
  const s = document.getElementById('phoneSheet');
  s.classList.toggle('minimized');
  document.getElementById('sheetToggleBtn').innerText = s.classList.contains('minimized') ? '▲' : '▼';
}
function manualTurboTap() {
  sfx('moto');
  const g = getTotalIncome() * 5;
  G.money += g;
  const minsk = vehicles.find(v => v.type === 'minsk');
  if (minsk) minsk.wheelie = 85;
  addPopup(12, 12, `⚡ ФОРСАЖ +${fmt(g)} ₽`, '#00e5ff');
}
function claimPromo() {
  if (document.getElementById('promoInp').value.trim().toUpperCase() === 'SLU1PIK' && !G.promoUsed) {
    G.promoUsed = true;
    G.money += 50000;
    G.sci += 250;
    G.boostTime = 180;
    sfx('web');
    closeModal('tgModal');
    renderCards();
    notify('💎 ГРАНТ @SLU1PIK ПОЛУЧЕН!', '+50 000 ₽ и +250 Науки для Ветки-Паутинки!');
  } else alert('Промокод уже активирован!');
}
function startVipBoost() { G.boostTime = 180; sfx('web'); closeModal('tgModal'); }
function openModal(id) { sfx('tap'); document.getElementById(id).classList.add('show'); }
function closeModal(id) { sfx('tap'); document.getElementById(id).classList.remove('show'); }
function hardReset() {
  if (confirm('Начать карьеру с 1 уровня и пустого ангара?')) {
    localStorage.removeItem('rosneft_25d_v12_save');
    localStorage.removeItem('rosneft_25d_v11_save');
    location.reload();
  }
}

setInterval(() => localStorage.setItem('rosneft_25d_v12_save', JSON.stringify(G)), 2000);

/* ============================================================================
   9. ГЛАВНЫЙ 60 FPS ИГРОВОЙ ЦИКЛ
   ============================================================================ */
let lastT = performance.now();

function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  time += dt;

  // Плавная динамика ветра и влажности луж
  windX = 0.65 + Math.sin(time * 0.45) * 0.55 + Math.cos(time * 1.3) * 0.2;
  if (isRainingNow()) {
    puddleWetness = Math.min(1.0, puddleWetness + dt * 0.12);
  } else {
    puddleWetness = Math.max(0.22, puddleWetness - dt * 0.04);
  }

  spawnEnvParticles(dt);

  const inc = getTotalIncome();
  G.money += inc * dt;
  G.sci += getSciPerSec() * dt;
  if (G.boostTime > 0) G.boostTime = Math.max(0, G.boostTime - dt);

  camX += (targetCamX - camX) * 0.14;
  camY += (targetCamY - camY) * 0.14;
  zoom += (targetZoom - zoom) * 0.14;

  updateSpatialAudio(time);

  planeAngle = (planeAngle + dt * 0.38) % (Math.PI * 2);

  people.forEach(h => {
    h.gx += h.dir * h.speed * dt;
    h.phase += dt * h.speed * 11;
    if (h.gx > h.max) { h.gx = h.max; h.dir = -1; }
    if (h.gx < h.min) { h.gx = h.min; h.dir = 1; }
  });

  vehicles.forEach(v => {
    const dir = v.lane <= 2 ? 1 : -1;
    v.pos += dir * dt * v.speed;
    if (dir > 0 && v.pos > 25.0) {
      v.pos = -1.8;
      if (v.type === 'minsk' && Math.random() < 0.55) v.wheelie = 75;
    }
    if (dir < 0 && v.pos < -1.8) v.pos = 25.0;
  });

  const trainSpeed = G.fleet.v_train ? 5.2 : 3.4;
  trainPos += dt * trainSpeed;
  if (trainPos > 27) trainPos = -5;

  shipPos -= dt * 1.6;
  if (shipPos < -4) shipPos = 25;

  const reg = REGIONS_LIST.find(r => r.id === G.region) || REGIONS_LIST[0];
  const lState = getLightingState();
  const wLabel = isWinterNow() ? '❄️ Зима' : (isRainingNow() ? '🌧️ Дождь' : '☀️ Ясно');
  document.getElementById('uiRegion').innerText = `📍 ${G.region}/8: ${reg.name} • ${lState.phaseName} • ${wLabel}`;
  document.getElementById('uiMoney').innerText = fmt(G.money) + ' ₽';
  document.getElementById('uiIncome').innerText = `+${fmt(inc)} ₽/с`;
  document.getElementById('uiSci').innerText = `🔬 ${fmt(G.sci)}`;
  document.getElementById('uiRep').innerText = `⭐ ${fmt(G.rep)}`;

  SECTORS.forEach(s => {
    const btn = document.getElementById('btn_s_' + s.id);
    if (btn) btn.disabled = G.money < getBulkBuy(s.id).total;
  });

  renderIsoWorld();
  requestAnimationFrame(loop);
}

document.getElementById('btnShader').innerText = BG_THEMES[G.bgTheme || 0].name;
document.getElementById('btnDayCycle').innerText = TIME_MODES[G.timeMode || 0].label;
document.getElementById('btnWeather').innerText = WEATHER_MODES[G.weatherMode || 0].label;
renderCards();
requestAnimationFrame(loop);

/* ============================================================================
   10. ПОДДЕРЖКА APK / WEBVIEW / PWA (GitHub Pages & Android)
   ============================================================================ */
document.addEventListener('contextmenu', e => e.preventDefault());

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
