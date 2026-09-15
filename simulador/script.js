/**
 * ==========================================================================
 * SIMULADOR BURSÁTIL PULSO — MOTOR DE JUEGO & VISUALIZACIÓN EN TIEMPO REAL
 * Identidad visual y técnica:
 *   - 6 casos de estudio con empresas reales del mercado colombiano (BVC)
 *   - Gráficos dinámicos con Canvas 2D interactivo (estilo TradingView / Robinhood)
 *   - Efectos sonoros sintetizados con Web Audio API (cero dependencias externas)
 *   - Sistema de puntuación y capital en COP con animación fluida
 * ==========================================================================
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. BASE DE DATOS DE NOTICIAS Y EVENTOS CORPORATIVOS
// ---------------------------------------------------------------------------
const SIMULATION_DATA = [
  {
    id: 1,
    company: 'Bancolombia',
    ticker: 'BCOL · BVC',
    sector: 'Banca & Servicios Financieros',
    basePrice: 34500,
    logo: 'assets/iconos/bancolombia.svg',
    headline: 'Bancolombia anunció la apertura de 50 nuevos corresponsales bancarios y oficinas digitales en municipios donde anteriormente no tenía cobertura.',
    expected: 'SUBE',
    marketChangeText: '+3.85% ALZA',
    justification: 'La expansión de cobertura suele interpretarse como una señal de crecimiento y mayores oportunidades de ingresos futuros.',
    pulsoInsight: 'Pulso identificó inmediatamente una señal positiva de expansión territorial, alertando a los usuarios sobre el impulso de ingresos esperado.'
  },
  {
    id: 2,
    company: 'Ecopetrol',
    ticker: 'ECOP · BVC',
    sector: 'Energía & Petróleo',
    basePrice: 2380,
    logo: 'assets/iconos/ecopetrol.svg',
    headline: 'Ecopetrol informó una falla temporal en una de sus principales refinerías, obligando a reducir la producción durante las próximas dos semanas.',
    expected: 'BAJA',
    marketChangeText: '-4.15% BAJA',
    justification: 'Una reducción de producción suele generar preocupación por posibles impactos en ingresos y rentabilidad.',
    pulsoInsight: 'Pulso procesó el incidente operativo en segundos y emitió una alerta de precaución por contracción transitoria de márgenes de refinación.'
  },
  {
    id: 3,
    company: 'Grupo Nutresa',
    ticker: 'NUT · BVC',
    sector: 'Alimentos & Consumo Masivo',
    basePrice: 46200,
    logo: 'assets/iconos/nutresa.svg',
    headline: 'Grupo Nutresa anunció la adquisición de una empresa especializada en alimentos saludables con operaciones en varios países de Latinoamérica.',
    expected: 'SUBE',
    marketChangeText: '+4.50% ALZA',
    justification: 'Las adquisiciones estratégicas suelen percibirse como oportunidades de crecimiento y expansión.',
    pulsoInsight: 'Pulso catalogó la noticia como diversificación de portafolio hacia un segmento de alto margen, anticipando apetito comprador en el mercado.'
  },
  {
    id: 4,
    company: 'ISA',
    ticker: 'ISA · BVC',
    sector: 'Infraestructura & Energía',
    basePrice: 17850,
    logo: 'assets/iconos/isa.svg',
    headline: 'ISA reportó retrasos regulatorios en un importante proyecto de transmisión energética para la región andina.',
    expected: 'BAJA',
    marketChangeText: '-3.20% BAJA',
    justification: 'Los retrasos pueden afectar plazos de ejecución, ingresos futuros y confianza del mercado.',
    pulsoInsight: 'Pulso analizó la variable de riesgo regulatorio y envió una alerta de cautela por retrasos en el calendario de flujo de caja del proyecto.'
  },
  {
    id: 5,
    company: 'Grupo Éxito',
    ticker: 'EXITO · BVC',
    sector: 'Retail & Comercio Electrónico',
    basePrice: 3120,
    logo: 'assets/iconos/exito.svg',
    headline: 'Grupo Éxito registró ventas récord durante la temporada comercial de descuentos nacionales y superó las expectativas del mercado.',
    expected: 'SUBE',
    marketChangeText: '+5.10% ALZA',
    justification: 'Ventas superiores a lo esperado suelen interpretarse positivamente por inversionistas y analistas.',
    pulsoInsight: 'Pulso detectó el beat de ventas frente al consenso de analistas, traduciéndolo en una señal de fuerte dinamismo en el consumo doméstico.'
  },
  {
    id: 6,
    company: 'Cementos Argos',
    ticker: 'ARGOS · BVC',
    sector: 'Construcción & Materiales',
    basePrice: 6940,
    logo: 'assets/iconos/argos.svg',
    headline: 'Cementos Argos informó un incremento significativo en sus costos de energía y transporte durante el último trimestre.',
    expected: 'BAJA',
    marketChangeText: '-3.75% BAJA',
    justification: 'El aumento de costos puede reducir márgenes de utilidad y afectar las expectativas financieras.',
    pulsoInsight: 'Pulso identificó presiones en la estructura de costos operativos, generando una señal de cautela ante una posible compresión del EBITDA.'
  }
];

// ---------------------------------------------------------------------------
// 2. ESTADO GLOBAL DEL SIMULADOR
// ---------------------------------------------------------------------------
const INITIAL_CAPITAL = 100000;
const DELTA_AMOUNT = 10000;

const state = {
  currentRound: 0,
  capital: INITIAL_CAPITAL,
  displayCapital: INITIAL_CAPITAL,
  answers: [], // { questionId, playerChoice, isCorrect, capitalAfter }
  isAnswerLocked: false,
  soundEnabled: true,
  autoTimer: null,
  chartAnimationId: null,
  chartProgress: 0,
  chartOutcome: null, // 'SUBE' o 'BAJA'
  chartHistoryPoints: []
};

// ---------------------------------------------------------------------------
// 3. SINTETIZADOR DE AUDIO INTEGRADO (Web Audio API)
// ---------------------------------------------------------------------------
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.initContext();
  }

  initContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    } catch (e) {
      console.warn('Web Audio no disponible:', e);
    }
  }

  ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSuccess() {
    if (!state.soundEnabled || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    // Acorde ascendente brillante (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.38);
    });
  }

  playError() {
    if (!state.soundEnabled || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    // Tono descendente suave de advertencia (F3 -> C3)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(174.61, now);
    osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.25);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  playClick() {
    if (!state.soundEnabled || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playFanfare() {
    if (!state.soundEnabled || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50];

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.65);
    });
  }
}

const soundEngine = new SoundEngine();

// ---------------------------------------------------------------------------
// 4. MOTOR DE GRÁFICOS BURSÁTILES (CANVAS 2D)
// ---------------------------------------------------------------------------
class StockChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.points = [];
    this.targetPoints = [];
    this.animFrame = null;
    this.idleTick = 0;
    this.isOutcomeActive = false;
    this.outcomeType = null; // 'SUBE' o 'BAJA'
    this.outcomeProgress = 0; // 0 a 1

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  generateBaseline(seedTrend = 0) {
    this.points = [];
    this.isOutcomeActive = false;
    this.outcomeType = null;
    this.outcomeProgress = 0;
    const numPoints = 28;
    let val = this.height * 0.52;

    for (let i = 0; i < numPoints; i++) {
      val += (Math.random() - 0.48) * 8;
      val = Math.max(this.height * 0.3, Math.min(this.height * 0.7, val));
      this.points.push(val);
    }
    this.render();
  }

  triggerOutcome(outcome) {
    this.isOutcomeActive = true;
    this.outcomeType = outcome; // 'SUBE' o 'BAJA'
    this.outcomeProgress = 0;

    const lastVal = this.points[this.points.length - 1];
    const targetVal = outcome === 'SUBE'
      ? this.height * 0.18 // Sube visualmente (menor Y)
      : this.height * 0.82; // Baja visualmente (mayor Y)

    const startTime = performance.now();
    const duration = 750; // ms

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Easing expo-out
      const ease = 1 - Math.pow(2, -10 * progress);
      this.outcomeProgress = ease;

      // Animar el último tramo de puntos hacia el destino
      const currentVal = lastVal + (targetVal - lastVal) * ease;
      this.currentAnimatedY = currentVal;
      this.render();

      if (progress < 1) {
        this.animFrame = requestAnimationFrame(animate);
      }
    };

    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.animFrame = requestAnimationFrame(animate);
  }

  render() {
    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Dibujar cuadrícula sutil
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    const gridRows = 4;
    for (let r = 1; r < gridRows; r++) {
      const y = (h / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (!this.points || this.points.length < 2) return;

    const step = (w - 30) / (this.points.length - 1);
    const pts = [...this.points];

    // Si hay resultado activo, modificar los puntos finales
    if (this.isOutcomeActive && this.currentAnimatedY !== undefined) {
      const len = pts.length;
      const diff = this.currentAnimatedY - pts[len - 1];
      pts[len - 1] = this.currentAnimatedY;
      pts[len - 2] = pts[len - 2] + diff * 0.65;
      pts[len - 3] = pts[len - 3] + diff * 0.35;
    }

    // Color del trazo y gradiente según estado
    let strokeColor = '#004DFF';
    let gradTop = 'rgba(0, 77, 255, 0.3)';
    let gradBottom = 'rgba(0, 77, 255, 0.0)';

    if (this.isOutcomeActive) {
      if (this.outcomeType === 'SUBE') {
        strokeColor = '#00D27F';
        gradTop = 'rgba(0, 210, 127, 0.35)';
        gradBottom = 'rgba(0, 210, 127, 0.0)';
      } else {
        strokeColor = '#FF5252';
        gradTop = 'rgba(255, 82, 82, 0.35)';
        gradBottom = 'rgba(255, 82, 82, 0.0)';
      }
    }

    // Dibujar relleno degradado bajo la curva
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, gradTop);
    fillGrad.addColorStop(1, gradBottom);

    ctx.beginPath();
    ctx.moveTo(15, pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const prevX = 15 + (i - 1) * step;
      const prevY = pts[i - 1];
      const curX = 15 + i * step;
      const curY = pts[i];
      const midX = (prevX + curX) / 2;
      ctx.bezierCurveTo(midX, prevY, midX, curY, curX, curY);
    }
    ctx.lineTo(15 + (pts.length - 1) * step, h);
    ctx.lineTo(15, h);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Dibujar línea principal suavizada
    ctx.beginPath();
    ctx.moveTo(15, pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const prevX = 15 + (i - 1) * step;
      const prevY = pts[i - 1];
      const curX = 15 + i * step;
      const curY = pts[i];
      const midX = (prevX + curX) / 2;
      ctx.bezierCurveTo(midX, prevY, midX, curY, curX, curY);
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    // Punto terminal pulsante
    const lastX = 15 + (pts.length - 1) * step;
    const lastY = pts[pts.length - 1];

    ctx.save();
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }
}

let stockChart = null;

// ---------------------------------------------------------------------------
// 5. ANIMACIONES DE INTERFAZ & FORMATEO DE MONEDA
// ---------------------------------------------------------------------------
function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

function animateCapitalChange(startVal, endVal, delta) {
  const capitalEl = document.getElementById('hudCapital');
  const deltaEl = document.getElementById('hudDelta');
  if (!capitalEl || !deltaEl) return;

  // Mostrar indicador delta flotante
  if (delta > 0) {
    deltaEl.textContent = `+${formatCOP(delta)}`;
    deltaEl.className = 'hud-capital-delta show-up';
  } else if (delta < 0) {
    deltaEl.textContent = `${formatCOP(delta)}`;
    deltaEl.className = 'hud-capital-delta show-down';
  }

  const duration = 650;
  const startTime = performance.now();

  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - progress, 3);
    const currentAmount = Math.round(startVal + (endVal - startVal) * ease);

    capitalEl.textContent = formatCOP(currentAmount);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      capitalEl.textContent = formatCOP(endVal);
      // Ocultar delta tras 1.5s
      setTimeout(() => {
        deltaEl.className = 'hud-capital-delta';
      }, 1500);
    }
  };

  requestAnimationFrame(update);
}

// ---------------------------------------------------------------------------
// 6. CONFETI PARA CELEBRACIÓN (Canvas Particles)
// ---------------------------------------------------------------------------
class ConfettiEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.colors = ['#004DFF', '#00D27F', '#D4AF37', '#4FC3F7', '#FF5252', '#FFFFFF'];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  launch(count = 75) {
    if (!this.canvas) return;
    this.resize();
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width * 0.5 + (Math.random() - 0.5) * 120,
        y: this.canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        life: 1,
        decay: Math.random() * 0.012 + 0.008
      });
    }

    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  }

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravedad
      p.rotation += p.rotSpeed;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

const confettiEngine = new ConfettiEngine('confettiCanvas');

// ---------------------------------------------------------------------------
// 7. CONTROLADOR DE VISTAS Y NAVEGACIÓN
// ---------------------------------------------------------------------------
function switchScreen(screenId) {
  const screens = ['screenWelcome', 'screenGame', 'screenResults'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------------------------------------------------------------------
// 8. FLUJO DEL JUEGO (LÓGICA PRINCIPAL)
// ---------------------------------------------------------------------------
function startGame() {
  soundEngine.playClick();
  state.currentRound = 0;
  state.capital = INITIAL_CAPITAL;
  state.displayCapital = INITIAL_CAPITAL;
  state.answers = [];
  state.isAnswerLocked = false;

  // Actualizar HUD
  const hudCapital = document.getElementById('hudCapital');
  if (hudCapital) hudCapital.textContent = formatCOP(INITIAL_CAPITAL);

  switchScreen('screenGame');

  if (!stockChart) {
    stockChart = new StockChart('stockChartCanvas');
  }

  loadRound(0);
}

function loadRound(roundIndex) {
  if (roundIndex >= SIMULATION_DATA.length) {
    finishGame();
    return;
  }

  state.currentRound = roundIndex;
  state.isAnswerLocked = false;

  const data = SIMULATION_DATA[roundIndex];

  // Limpiar temporizador previo
  if (state.autoTimer) {
    clearTimeout(state.autoTimer);
    state.autoTimer = null;
  }

  // 1. Actualizar barra de progreso
  const roundCurrentEl = document.getElementById('roundCurrent');
  if (roundCurrentEl) roundCurrentEl.textContent = roundIndex + 1;

  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    const pills = progressBar.querySelectorAll('.progress-step-pill');
    pills.forEach((pill, idx) => {
      pill.className = 'progress-step-pill';
      if (idx < roundIndex) {
        const prevAnswer = state.answers[idx];
        if (prevAnswer && prevAnswer.isCorrect) {
          pill.classList.add('correct');
        } else {
          pill.classList.add('incorrect');
        }
      } else if (idx === roundIndex) {
        pill.classList.add('current');
      }
    });
  }

  // 2. Cargar datos de la empresa
  const logoEl = document.getElementById('companyLogo');
  const nameEl = document.getElementById('companyName');
  const tickerEl = document.getElementById('companyTicker');
  const sectorEl = document.getElementById('companySector');
  const priceValEl = document.getElementById('marketPriceVal');
  const priceChangeEl = document.getElementById('marketPriceChange');
  const headlineEl = document.getElementById('newsHeadline');

  if (logoEl) logoEl.src = data.logo;
  if (nameEl) nameEl.textContent = data.company;
  if (tickerEl) tickerEl.textContent = data.ticker;
  if (sectorEl) sectorEl.textContent = data.sector;
  if (priceValEl) priceValEl.textContent = formatCOP(data.basePrice);
  if (priceChangeEl) {
    priceChangeEl.textContent = 'En cotización';
    priceChangeEl.className = 'market-price-change';
  }
  if (headlineEl) headlineEl.textContent = data.headline;

  // 3. Resetear gráfico de la acción
  if (stockChart) {
    stockChart.generateBaseline();
  }

  const chartBadge = document.getElementById('chartStatusBadge');
  if (chartBadge) {
    chartBadge.className = 'chart-status-badge';
  }

  // 4. Habilitar botones de decisión
  const btnSube = document.getElementById('btnSube');
  const btnBaja = document.getElementById('btnBaja');
  if (btnSube && btnBaja) {
    btnSube.disabled = false;
    btnBaja.disabled = false;
    btnSube.classList.remove('selected-choice');
    btnBaja.classList.remove('selected-choice');
  }

  // 5. Ocultar tarjeta de feedback
  const revealCard = document.getElementById('signalRevealCard');
  if (revealCard) {
    revealCard.style.display = 'none';
  }
}

function handleUserChoice(choice) {
  if (state.isAnswerLocked) return;
  state.isAnswerLocked = true;

  soundEngine.playClick();

  const roundData = SIMULATION_DATA[state.currentRound];
  const isCorrect = choice === roundData.expected;

  // Marcar visualmente el botón seleccionado
  const btnSube = document.getElementById('btnSube');
  const btnBaja = document.getElementById('btnBaja');
  if (choice === 'SUBE' && btnSube) btnSube.classList.add('selected-choice');
  if (choice === 'BAJA' && btnBaja) btnBaja.classList.add('selected-choice');
  if (btnSube) btnSube.disabled = true;
  if (btnBaja) btnBaja.disabled = true;

  // Actualizar capital
  const prevCapital = state.capital;
  const delta = isCorrect ? DELTA_AMOUNT : -DELTA_AMOUNT;
  state.capital += delta;

  // Guardar respuesta
  state.answers.push({
    round: state.currentRound + 1,
    company: roundData.company,
    headline: roundData.headline,
    playerChoice: choice,
    expected: roundData.expected,
    isCorrect: isCorrect,
    delta: delta,
    capitalAfter: state.capital,
    justification: roundData.justification,
    pulsoInsight: roundData.pulsoInsight
  });

  // Animación del gráfico hacia el resultado real del mercado
  if (stockChart) {
    stockChart.triggerOutcome(roundData.expected);
  }

  // Actualizar badge del gráfico
  const chartBadge = document.getElementById('chartStatusBadge');
  if (chartBadge) {
    chartBadge.textContent = roundData.marketChangeText;
    chartBadge.className = roundData.expected === 'SUBE'
      ? 'chart-status-badge active-bull'
      : 'chart-status-badge active-bear';
  }

  // Animación de capital en HUD
  animateCapitalChange(prevCapital, state.capital, delta);

  // Sonido de acierto o fallo
  if (isCorrect) {
    soundEngine.playSuccess();
  } else {
    soundEngine.playError();
  }

  // Mostrar tarjeta de revelación y señal Pulso
  showSignalReveal(isCorrect, delta, roundData);
}

function showSignalReveal(isCorrect, delta, roundData) {
  const card = document.getElementById('signalRevealCard');
  const statusBadge = document.getElementById('signalStatusBadge');
  const statusIcon = document.getElementById('signalStatusIcon');
  const statusTitle = document.getElementById('signalStatusTitle');
  const deltaEl = document.getElementById('signalDeltaAmount');
  const impactMsg = document.getElementById('signalImpactMsg');
  const rationaleEl = document.getElementById('signalRationale');
  const timerHint = document.getElementById('autoTimerHint');

  if (!card) return;

  if (isCorrect) {
    card.className = 'signal-reveal-card correct-signal';
    statusBadge.className = 'signal-status-badge correct';
    statusIcon.textContent = '✅';
    statusTitle.textContent = '¡Correcto!';
    deltaEl.textContent = `+${formatCOP(DELTA_AMOUNT)}`;
    deltaEl.className = 'signal-delta-amount gain';
    impactMsg.textContent = 'El mercado interpretó esta noticia como positiva para la compañía.';
  } else {
    card.className = 'signal-reveal-card incorrect-signal';
    statusBadge.className = 'signal-status-badge incorrect';
    statusIcon.textContent = '❌';
    statusTitle.textContent = 'Incorrecto';
    deltaEl.textContent = `${formatCOP(delta)}`;
    deltaEl.className = 'signal-delta-amount loss';
    impactMsg.textContent = 'El mercado reaccionó de forma diferente a tu predicción.';
  }

  if (rationaleEl) {
    rationaleEl.textContent = roundData.justification;
  }

  card.style.display = 'block';

  // Temporizador de avance automático (4 segundos con cuenta regresiva)
  let timeLeft = 4;
  if (timerHint) timerHint.textContent = `Avanzando en ${timeLeft}s...`;

  const interval = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0 && timerHint) {
      timerHint.textContent = `Avanzando en ${timeLeft}s...`;
    } else {
      clearInterval(interval);
    }
  }, 1000);

  state.autoTimer = setTimeout(() => {
    clearInterval(interval);
    advanceToNext();
  }, 4000);
}

function advanceToNext() {
  if (state.autoTimer) {
    clearTimeout(state.autoTimer);
    state.autoTimer = null;
  }
  loadRound(state.currentRound + 1);
}

// ---------------------------------------------------------------------------
// 9. PANTALLA FINAL DE RESULTADOS & CLASIFICACIÓN
// ---------------------------------------------------------------------------
function finishGame() {
  switchScreen('screenResults');

  const totalQuestions = SIMULATION_DATA.length;
  const correctCount = state.answers.filter(a => a.isCorrect).length;
  const errorCount = totalQuestions - correctCount;
  const accuracyPct = Math.round((correctCount / totalQuestions) * 100);
  const netDelta = state.capital - INITIAL_CAPITAL;
  const netPct = ((netDelta / INITIAL_CAPITAL) * 100).toFixed(1);

  // Determinar Nivel según aciertos (Especificación idea.txt)
  // 0-2 aciertos: Inversionista Novato
  // 3-4 aciertos: Analista Junior
  // 5 aciertos: Analista Intermedio
  // 6 aciertos: Gurú del Mercado
  let level = {
    icon: '🔴',
    name: 'Inversionista Novato',
    desc: 'Estás dando tus primeros pasos. El mercado financiero tiene sutilezas que pueden sorprenderte. Pulso está diseñado justamente para guiarte y darte señales claras y oportunas.'
  };

  if (correctCount >= 6) {
    level = {
      icon: '🏆',
      name: 'Gurú del Mercado',
      desc: '¡Desempeño perfecto! Lograste anticipar cada uno de los movimientos bursátiles con total precisión. Tu lectura de mercado es sobresaliente.'
    };
    confettiEngine.launch(90);
    soundEngine.playFanfare();
  } else if (correctCount === 5) {
    level = {
      icon: '🔵',
      name: 'Analista Intermedio',
      desc: '¡Excelente visión de mercado! Interpretaste la gran mayoría de las señales con agudeza. Estás listo para potenciar tus decisiones con las alertas en tiempo real de Pulso.'
    };
    confettiEngine.launch(60);
    soundEngine.playFanfare();
  } else if (correctCount >= 3) {
    level = {
      icon: '🟡',
      name: 'Analista Junior',
      desc: '¡Buen ojo financiero! Detectas varias de las tendencias principales. Con el respaldo del análisis inteligente de Pulso, podrás llevar tu consistencia al siguiente nivel.'
    };
    soundEngine.playSuccess();
  } else {
    soundEngine.playError();
  }

  // Rellenar elementos en pantalla
  const levelIconEl = document.getElementById('levelIcon');
  const levelNameEl = document.getElementById('levelName');
  const levelDescEl = document.getElementById('levelDesc');

  if (levelIconEl) levelIconEl.textContent = level.icon;
  if (levelNameEl) levelNameEl.textContent = level.name;
  if (levelDescEl) levelDescEl.textContent = level.desc;

  const resCapitalFinal = document.getElementById('resCapitalFinal');
  const resCapitalPct = document.getElementById('resCapitalPct');
  const resNetDelta = document.getElementById('resNetDelta');
  const resAciertos = document.getElementById('resAciertos');
  const resErrores = document.getElementById('resErrores');
  const resPrecision = document.getElementById('resPrecision');

  if (resCapitalFinal) resCapitalFinal.textContent = formatCOP(state.capital);
  if (resCapitalPct) resCapitalPct.textContent = `${netPct >= 0 ? '+' : ''}${netPct}%`;

  if (resNetDelta) {
    resNetDelta.textContent = `${netDelta >= 0 ? '+' : ''}${formatCOP(netDelta)}`;
    resNetDelta.className = netDelta >= 0 ? 'metric-sub positive' : 'metric-sub negative';
  }

  if (resAciertos) resAciertos.textContent = `${correctCount} de ${totalQuestions}`;
  if (resErrores) resErrores.textContent = `${errorCount} de ${totalQuestions}`;
  if (resPrecision) resPrecision.textContent = `${accuracyPct}%`;

  // Construir Desglose de Decisiones (Review List)
  renderReviewList();
}

function renderReviewList() {
  const listEl = document.getElementById('reviewList');
  if (!listEl) return;

  listEl.innerHTML = '';

  state.answers.forEach(item => {
    const card = document.createElement('div');
    card.className = 'review-item';

    card.innerHTML = `
      <div class="review-item-header">
        <span class="review-company">${item.round}. ${item.company}</span>
        <span class="review-result-badge ${item.isCorrect ? 'correct' : 'incorrect'}">
          ${item.isCorrect ? '✅ Acertaste' : '❌ Fallaste'} (${item.playerChoice})
        </span>
      </div>
      <p class="review-news-excerpt">"${item.headline}"</p>
      <p class="review-pulso-note"><strong>Mercado:</strong> ${item.expected === 'SUBE' ? '⬆ Subió' : '⬇ Bajó'}. ${item.justification}</p>
    `;

    listEl.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// 10. COMPARTIR RESULTADO & UTILIDADES
// ---------------------------------------------------------------------------
function shareResult() {
  soundEngine.playClick();
  const correctCount = state.answers.filter(a => a.isCorrect).length;
  const levelEl = document.getElementById('levelName');
  const levelName = levelEl ? levelEl.textContent : 'Inversionista';

  const shareText = `🎯 Completé el Simulador Bursátil de Pulso!\n` +
    `Nivel: ${levelName}\n` +
    `Aciertos: ${correctCount} de 6 | Capital Final: ${formatCOP(state.capital)}\n` +
    `Descubre cómo las noticias mueven el mercado y aprende con Pulso: ${window.location.href}`;

  if (navigator.share) {
    navigator.share({
      title: 'Mi Desempeño en el Simulador Bursátil de Pulso',
      text: shareText,
      url: window.location.href
    }).catch(() => copyToClipboard(shareText));
  } else {
    copyToClipboard(shareText);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('¡Resultado copiado al portapapeles!');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToast('¡Resultado copiado al portapapeles!');
  } catch (err) {
    console.error('Error copiando:', err);
  }
  document.body.removeChild(ta);
}

function showToast(msg) {
  const toast = document.getElementById('toastNotice');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ---------------------------------------------------------------------------
// 11. INICIALIZACIÓN Y EVENT LISTENERS
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Botón Comenzar
  const btnStart = document.getElementById('btnStartSim');
  if (btnStart) {
    btnStart.addEventListener('click', startGame);
  }

  // Botones de decisión
  const btnSube = document.getElementById('btnSube');
  const btnBaja = document.getElementById('btnBaja');
  if (btnSube) {
    btnSube.addEventListener('click', () => handleUserChoice('SUBE'));
  }
  if (btnBaja) {
    btnBaja.addEventListener('click', () => handleUserChoice('BAJA'));
  }

  // Botón Siguiente Noticia manual
  const btnNext = document.getElementById('btnNextQuestion');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      soundEngine.playClick();
      advanceToNext();
    });
  }

  // Botón Reiniciar
  const btnRestart = document.getElementById('btnRestart');
  if (btnRestart) {
    btnRestart.addEventListener('click', startGame);
  }

  // Botón Compartir
  const btnShare = document.getElementById('btnShare');
  if (btnShare) {
    btnShare.addEventListener('click', shareResult);
  }

  // Botón Alternar Desglose
  const btnToggleReview = document.getElementById('btnToggleReview');
  const reviewList = document.getElementById('reviewList');
  const reviewArrow = document.getElementById('reviewArrow');
  if (btnToggleReview && reviewList) {
    btnToggleReview.addEventListener('click', () => {
      soundEngine.playClick();
      const isOpen = reviewList.classList.toggle('open');
      btnToggleReview.setAttribute('aria-expanded', isOpen);
      if (reviewArrow) reviewArrow.textContent = isOpen ? '▲' : '▼';
    });
  }

  // Toggle de Sonido
  const btnToggleSound = document.getElementById('btnToggleSound');
  const soundIcon = document.getElementById('soundIcon');
  if (btnToggleSound && soundIcon) {
    btnToggleSound.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
      btnToggleSound.setAttribute('aria-label', state.soundEnabled ? 'Sonido activado' : 'Sonido silenciado');
      if (state.soundEnabled) soundEngine.playClick();
    });
  }

  // Atajos de teclado:
  // Tecla 1 o Flecha Arriba -> SUBE
  // Tecla 2 o Flecha Abajo -> BAJA
  // Espacio o Enter -> Siguiente noticia si la revelación está activa
  document.addEventListener('keydown', (e) => {
    // Si estamos en la pantalla de juego
    const gameScreen = document.getElementById('screenGame');
    if (!gameScreen || !gameScreen.classList.contains('active')) return;

    if (!state.isAnswerLocked) {
      if (e.key === '1' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleUserChoice('SUBE');
      } else if (e.key === '2' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleUserChoice('BAJA');
      }
    } else {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advanceToNext();
      }
    }
  });
});
