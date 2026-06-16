/* =========================================================
   MELHOR AUMIGO — interações
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* =========================================================
     GAMIFICAÇÃO — Missão Aumigo (carinho → passeio → banho)
     ========================================================= */
  const floatPoints = (txt, x, y) => {
    const el = document.createElement('span'); el.className = 'gmf-float'; el.textContent = txt;
    const hud = $('#gmfHud'); const r = hud ? hud.getBoundingClientRect() : null;
    el.style.left = (x != null ? x : (r ? r.left + r.width / 2 : window.innerWidth / 2)) + 'px';
    el.style.top = (y != null ? y : (r ? r.top : window.innerHeight - 70)) + 'px';
    document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
  };
  const GAME = {
    pts: 0,
    pointsFor: { carinho: 5, passeio: 5, transformacao: 5, banho: 10 },
    done: { carinho: false, passeio: false, transformacao: false, banho: false },
    award(task, x, y) {
      if (!(task in this.done) || this.done[task]) return;
      this.done[task] = true;
      this.pts += this.pointsFor[task];
      const p = $('#gmfPts'); if (p) p.textContent = this.pts;
      const t = $('.gmf-task[data-task="' + task + '"]'); if (t) t.classList.add('done');
      floatPoints('+' + this.pointsFor[task] + ' pts', x, y);
      Tour.notify(task);
      if (Object.values(this.done).every(Boolean)) this.complete();
    },
    complete() {
      const hud = $('#gmfHud'); if (hud) hud.classList.add('win');
      const claim = $('#gmfClaim'); if (claim) claim.hidden = false;
      setTimeout(openReward, 1300);
    }
  };

  /* ===== Orquestração de popups + setas guiadas ===== */
  const FLOW = { participated: false };
  let _openPromo = function () {};

  const Tour = {
    active: false, idx: 0, el: null, raf: 0,
    steps: [
      { task: 'carinho', sel: '#luxArch', label: 'Aperte o Aumigo até ele latir! 🔊' },
      { task: 'passeio', sel: '#walkScene', label: 'Arraste o cãozinho até a loja! 🦮' },
      { task: 'transformacao', sel: '#baSlider', label: 'Arraste e deixe o pet lindo! ✨' },
      { task: 'banho', sel: '#bathCanvas', label: 'Esfregue pra dar banho! 🛁' }
    ],
    start() {
      this.el = $('#tourArrow'); if (!this.el) return;
      this.active = true; this.idx = 0; this.goto(0);
      if (!this.raf) this.loop();
    },
    goto(i) {
      this.idx = i;
      if (i >= this.steps.length) { this.finish(); return; }
      // NÃO rola a página — o cliente desce sozinho e acha a próxima brincadeira
    },
    notify(task) {
      if (!this.active) return;
      const s = this.steps[this.idx];
      if (s && s.task === task) this.goto(this.idx + 1);
    },
    finish() { this.active = false; if (this.el) this.el.classList.remove('show'); },
    loop() {
      this.raf = requestAnimationFrame(() => this.loop());
      if (!this.active || !this.el) return;
      const s = this.steps[this.idx]; if (!s) return;
      const t = $(s.sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const vh = window.innerHeight;
      const lbl = $('.tour-label', this.el);
      const onScreen = r.top < vh * 0.8 && r.bottom > vh * 0.15;
      if (onScreen) {
        // atividade visível: aponta a setinha pra ela
        if (lbl) lbl.textContent = s.label;
        let x = r.left + r.width / 2;
        let y = r.top - 14;
        if (y < 96) y = Math.min(r.bottom + 64, vh - 70);
        x = Math.max(90, Math.min(window.innerWidth - 90, x));
        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
        this.el.classList.add('show');
      } else if (r.top >= vh * 0.8) {
        // atividade ainda abaixo: convida a descer (sem rolar sozinho)
        if (lbl) lbl.textContent = '👇 Role para baixo e ache a próxima!';
        this.el.style.left = (window.innerWidth / 2) + 'px';
        this.el.style.top = (vh * 0.84) + 'px';
        this.el.classList.add('show');
      } else {
        // já passou da atividade — esconde
        this.el.classList.remove('show');
      }
    }
  };

  /* ---- Som do latido: latido REAL amplificado (Web Audio) + fallbacks ---- */
  let _ac, _barkBuf = null, _barkStart = 0, _barkEl = null, _barkElOk = false;
  const _ensureAc = () => {
    if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (_ac && _ac.state === 'suspended') _ac.resume();
    return _ac;
  };
  // acha o início do primeiro latido forte (o arquivo é longo)
  const _findBarkOnset = (b) => {
    try {
      const d = b.getChannelData(0); const sr = b.sampleRate;
      const skip = Math.floor(0.05 * sr); // ignora 50ms iniciais
      for (let i = skip; i < d.length; i += 32) {
        if (Math.abs(d[i]) > 0.3) return Math.max(0, i / sr - 0.03);
      }
    } catch (e) {}
    return 0;
  };
  (function loadBarkBuffer() {
    const tryFetch = (src) => fetch(src).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); });
    tryFetch('assets/media/bark.mp3').catch(() => tryFetch('assets/media/bark.ogg'))
      .then(buf => { const ac = _ensureAc(); return ac.decodeAudioData(buf.slice(0)); })
      .then(b => { _barkBuf = b; _barkStart = _findBarkOnset(b); })
      .catch(() => {
        _barkEl = new Audio('assets/media/bark.ogg'); _barkEl.preload = 'auto';
        _barkEl.addEventListener('canplaythrough', () => { _barkElOk = true; }, { once: true });
        _barkEl.load();
      });
  })();
  const _playBuf = (dur, gain, when) => {
    const ac = _ensureAc(); if (!ac || !_barkBuf) return;
    const src = ac.createBufferSource(); src.buffer = _barkBuf;
    const g = ac.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(ac.destination);
    const off = Math.min(_barkStart, Math.max(0, _barkBuf.duration - dur));
    src.start(ac.currentTime + (when || 0), off, dur);
  };
  const playBark = (big) => {
    try {
      if (_barkBuf) {
        if (big) { _playBuf(0.5, 1.5, 0); _playBuf(0.5, 1.4, 0.22); _playBuf(0.55, 1.4, 0.46); }
        else { _playBuf(0.5, 1.5, 0); }
        return;
      }
      if (_barkElOk && _barkEl) {
        _barkEl.volume = 1; _barkEl.currentTime = 0;
        const pr = _barkEl.play(); if (pr && pr.catch) pr.catch(() => {});
        clearTimeout(_barkEl._t);
        _barkEl._t = setTimeout(() => { try { _barkEl.pause(); _barkEl.currentTime = 0; } catch (e) {} }, big ? 1300 : 480);
        return;
      }
      const ac = _ensureAc(); if (!ac) return;
      const yip = (delay) => {
        const t = ac.currentTime + delay;
        const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.9; o.type = 'sawtooth';
        o.frequency.setValueAtTime(560, t);
        o.frequency.exponentialRampToValueAtTime(300, t + 0.07);
        o.frequency.exponentialRampToValueAtTime(480, t + 0.13);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
        o.connect(f); f.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + 0.2);
      };
      yip(0); if (big) { yip(0.18); yip(0.36); }
    } catch (e) {}
  };

  /* ---- Confete reutilizável ---- */
  const confettiBurst = (container, n) => {
    const colors = ['#C9A227', '#0B0B0D', '#E7C766', '#FFCC00', '#fff'];
    for (let i = 0; i < (n || 50); i++) {
      const c = document.createElement('span'); c.className = 'confetti-pc';
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.3 + Math.random() * 1.5) + 's';
      c.style.animationDelay = (Math.random() * 0.3) + 's';
      container.appendChild(c); setTimeout(() => c.remove(), 3200);
    }
  };

  /* ---- Pop-up de prêmio ---- */
  const openReward = () => {
    const ov = $('#rewardOverlay'); if (!ov) return;
    ov.classList.add('show'); ov.setAttribute('aria-hidden', 'false');
    const m = $('.reward-modal'); if (m) confettiBurst(m, 60);
  };
  const rewardOv = $('#rewardOverlay');
  if (rewardOv) {
    const closeR = () => { rewardOv.classList.remove('show'); rewardOv.setAttribute('aria-hidden', 'true'); };
    $('#rewardClose').addEventListener('click', closeR);
    rewardOv.addEventListener('click', (e) => { if (e.target === rewardOv) closeR(); });
    $('#rewardReveal').addEventListener('click', () => {
      const msg = 'Completei%20a%20Miss%C3%A3o%20Aumigo%20no%20site%20e%20quero%20resgatar%20meu%20pr%C3%AAmio%3A%20Hidrata%C3%A7%C3%A3o%20gr%C3%A1tis%20no%201%C2%BA%20banho!%20%F0%9F%90%BE';
      $('#rewardStage').innerHTML =
        '<div class="reward-prize"><span class="rp-emoji">💧</span><b>Hidratação grátis<br>no 1º banho!</b>' +
        '<p>Um mimo pra estrear o cuidado do seu pet com a gente. Cite a Missão Aumigo ao agendar.</p>' +
        '<a class="btn btn-primary btn-block" href="https://wa.me/5561991592662?text=' + msg + '" target="_blank" rel="noopener">Resgatar no WhatsApp 🎁</a></div>';
      const m = $('.reward-modal'); if (m) confettiBurst(m, 40);
    });
  }
  const gmfClaimBtn = $('#gmfClaim');
  if (gmfClaimBtn) gmfClaimBtn.addEventListener('click', openReward);

  /* ---------- Header scroll ---------- */
  const header = $('#header');
  const toTop = $('#toTop');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 20);
    toTop.classList.toggle('show', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Menu mobile ---------- */
  const mm = $('#mobileMenu');
  const openMenu = () => { mm.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeMenu = () => { mm.classList.remove('open'); document.body.style.overflow = ''; };
  $('#burger').addEventListener('click', openMenu);
  $('#mmClose').addEventListener('click', closeMenu);
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Contador (stats hero) ---------- */
  const countEls = $$('[data-count]');
  const fmt = (n) => n >= 1000 ? Math.round(n / 1000) + 'mil' : n;
  const animCount = (el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const raw = el.dataset.raw;
    const dur = 1600; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(target * eased);
      el.textContent = (raw ? val.toLocaleString('pt-BR') : fmt(val)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const ioCount = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animCount(e.target); ioCount.unobserve(e.target); } });
  }, { threshold: 0.6 });
  countEls.forEach(el => ioCount.observe(el));

  /* ---------- Before / After slider (gamificado) ---------- */
  const slider = $('#baSlider');
  if (slider) {
    const after = $('#baAfter');
    const handle = $('#baHandle');
    const baHint = $('#baHint');
    let dragging = false, transformed = false;
    // a "linha" começa no lado (antes mostrado); arrasta p/ direita revela o depois
    const apply = (p) => {
      p = Math.max(2, Math.min(98, p));
      after.style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)';
      handle.style.left = p + '%';
      if (p >= 90 && !transformed) {
        transformed = true;
        if (baHint) baHint.textContent = '✨ Que transformação! Ficou um arraso!';
        confettiBurst(slider, 30);
        const r = slider.getBoundingClientRect();
        GAME.award('transformacao', r.left + r.width / 2, r.top + 24);
      }
    };
    const setPos = (clientX) => {
      const r = slider.getBoundingClientRect();
      apply(((clientX - r.left) / r.width) * 100);
    };
    const start = () => dragging = true;
    const end = () => dragging = false;
    const move = (e) => { if (!dragging) return; setPos(e.touches ? e.touches[0].clientX : e.clientX); };
    handle.addEventListener('mousedown', start);
    handle.addEventListener('touchstart', start, { passive: true });
    slider.addEventListener('mousedown', (e) => { start(); setPos(e.clientX); });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    apply(6); // estado inicial: "antes" mostrado, linha no lado esquerdo
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq-item').forEach(item => {
    const q = $('.faq-q', item);
    const a = $('.faq-a', item);
    q.addEventListener('click', () => {
      const open = item.classList.contains('open');
      $$('.faq-item').forEach(i => { i.classList.remove('open'); $('.faq-a', i).style.maxHeight = null; });
      if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ---------- Quiz / Assistente ---------- */
  const quiz = $('#quiz');
  if (quiz) {
    const bar = $('#quizBar');
    const steps = $$('.quiz-step', quiz);
    const result = $('#quizResult');
    const recTitle = $('#recTitle');
    const recText = $('#recText');
    const recCta = $('#recCta');
    const answers = [];

    const RECS = {
      beleza: { t: 'Banho + Tosa + Hidratação', d: 'Pro seu pet sair lindo, brilhando e perfumado como um pet de revista. ✨', wa: 'Quero%20Banho%20%2B%20Tosa%20%2B%20Hidrata%C3%A7%C3%A3o' },
      relax: { t: 'Banho Terapêutico + SPA Pet', d: 'Cuidado calmo, sem estresse e com massagem relaxante — perfeito pra pets ansiosos ou idosos. 💆', wa: 'Quero%20Banho%20Terap%C3%AAutico%20%2B%20SPA' },
      saude: { t: 'Banho Hipoalergênico + Hidratação', d: 'Produtos suaves Hydra pra pele sensível, com hidratação que fortalece o pelo. 🩺', wa: 'Quero%20Banho%20Hipoalerg%C3%AAnico%20%2B%20Hidrata%C3%A7%C3%A3o' },
      pratico: { t: 'Banho Completo + Taxi Dog', d: 'A gente busca, cuida e devolve seu pet cheiroso. Praticidade total pra sua rotina. 🚕', wa: 'Quero%20Banho%20Completo%20%2B%20Taxi%20Dog' }
    };
    const keyFor = (label) => {
      if (/beleza|cheirinho/i.test(label)) return 'beleza';
      if (/relax|bem-estar/i.test(label)) return 'relax';
      if (/sa%C3%BAde|saúde|pele|pelo/i.test(label)) return 'saude';
      return 'pratico';
    };

    const goStep = (n) => {
      steps.forEach(s => s.classList.toggle('active', +s.dataset.step === n));
      bar.style.width = (n / 3 * 100) + '%';
    };

    $$('.quiz-opt', quiz).forEach(opt => {
      opt.addEventListener('click', () => {
        answers.push(opt.textContent.trim());
        if (opt.dataset.next) {
          goStep(+opt.dataset.next);
        } else if (opt.hasAttribute('data-result')) {
          const rec = RECS[keyFor(opt.textContent.trim())];
          recTitle.textContent = rec.t;
          recText.textContent = rec.d;
          recCta.href = `https://wa.me/5561991592662?text=Ol%C3%A1!%20Fiz%20o%20teste%20e%20${rec.wa}%20para%20meu%20pet%20%F0%9F%90%BE`;
          steps.forEach(s => s.classList.remove('active'));
          bar.style.width = '100%';
          result.classList.add('show');
        }
      });
    });

    $('#quizRestart').addEventListener('click', () => {
      answers.length = 0;
      result.classList.remove('show');
      goStep(1);
    });
  }

  /* ---------- Pop-up promoção (20s) ---------- */
  const promoOverlay = $('#promoOverlay');
  if (promoOverlay) {
    const ring = $('#promoRing');
    const countEl = $('#promoCount');
    const closeBtn = $('#promoClose');
    const CIRC = 2 * Math.PI * 19; // ~119.4
    let timer = null, left = 20, dismissed = false;

    const closePromo = () => {
      promoOverlay.classList.remove('show');
      promoOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      clearInterval(timer);
      dismissed = true;
      try { sessionStorage.setItem('aumigoPromo', '1'); } catch (e) {}
    };

    const tick = () => {
      left--;
      countEl.textContent = left;
      ring.style.strokeDashoffset = (CIRC * (1 - left / 20)).toFixed(1);
      if (left <= 0) { clearInterval(timer); countEl.textContent = '0'; setTimeout(closePromo, 600); }
    };

    const openPromo = () => {
      if (dismissed) return;
      try { if (sessionStorage.getItem('aumigoPromo')) return; } catch (e) {}
      promoOverlay.classList.add('show');
      promoOverlay.setAttribute('aria-hidden', 'false');
      ring.style.strokeDasharray = CIRC.toFixed(1);
      ring.style.strokeDashoffset = '0';
      left = 20; countEl.textContent = '20';
      clearInterval(timer);
      timer = setInterval(tick, 1000);
    };

    closeBtn.addEventListener('click', closePromo);
    promoOverlay.addEventListener('click', (e) => { if (e.target === promoOverlay) closePromo(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && promoOverlay.classList.contains('show')) closePromo(); });

    $$('.promo-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const promo = btn.dataset.promo || 'a promoção de boas-vindas';
        const msg = `Oi, Melhor Aumigo! 🐾 Vim pelo site e quero garantir: *${promo}*. Pode me ajudar a agendar?`;
        window.open('https://wa.me/5561991592662?text=' + encodeURIComponent(msg), '_blank');
        closePromo();
      });
    });

    // o desconto NÃO abre sozinho — a orquestração decide (só p/ quem não participou)
    _openPromo = openPromo;
  }

  /* ---------- Orquestração: convite ao jogo x popup de desconto ---------- */
  const _played = () => { try { return sessionStorage.getItem('aumigoChoice') === 'played'; } catch (e) { return false; } };
  const scheduleDiscount = () => {
    setTimeout(() => { if (!FLOW.participated && !_played()) _openPromo(); }, 11000);
  };
  const optin = $('#optinOverlay');
  if (optin) {
    const closeO = () => { optin.classList.remove('show'); optin.setAttribute('aria-hidden', 'true'); };
    const accept = () => {
      FLOW.participated = true; closeO();
      try { sessionStorage.setItem('aumigoChoice', 'played'); } catch (e) {}
      Tour.start();
    };
    const decline = () => {
      closeO();
      try { sessionStorage.setItem('aumigoChoice', 'declined'); } catch (e) {}
      scheduleDiscount();
    };
    const showO = () => {
      let ch = null; try { ch = sessionStorage.getItem('aumigoChoice'); } catch (e) {}
      if (ch === 'played') { FLOW.participated = true; return; }
      if (ch === 'declined') { scheduleDiscount(); return; }
      optin.classList.add('show'); optin.setAttribute('aria-hidden', 'false');
    };
    $('#optinYes').addEventListener('click', accept);
    $('#optinNo').addEventListener('click', decline);
    $('#optinClose').addEventListener('click', decline);
    optin.addEventListener('click', (e) => { if (e.target === optin) decline(); });
    let shown = false;
    const fireO = () => { if (!shown) { shown = true; showO(); } };
    setTimeout(fireO, 6000);
    const heroEl2 = $('#hero');
    if (heroEl2) {
      const io2 = new IntersectionObserver((ents) => {
        ents.forEach(en => { if (!en.isIntersecting && scrollY > 500) { fireO(); io2.disconnect(); } });
      }, { threshold: 0 });
      io2.observe(heroEl2);
    }
  }

  /* ---------- Ativação: "Dê um banho no Aumigo" ---------- */
  const bathCanvas = $('#bathCanvas');
  if (bathCanvas && bathCanvas.getContext) {
    const stage = bathCanvas.closest('.game-stage');
    const hint = $('#gameHint');
    const win = $('#gameWin');
    const gmFill = $('#gmFill');
    const gmPct = $('#gmPct');
    const resetBtn = $('#gameReset');

    // camada limpa (atrás)
    const clean = document.createElement('canvas');
    clean.style.zIndex = '1';
    bathCanvas.style.zIndex = '2';
    stage.insertBefore(clean, bathCanvas);
    const cctx = clean.getContext('2d');
    const dctx = bathCanvas.getContext('2d');

    let W = 0, H = 0, dpr = 1, won = false, started = false, lastSample = 0, lastBubble = 0;

    const drawClean = () => {
      cctx.clearRect(0, 0, W, H);
      // fundo claro com brilho
      const g = cctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#EAF6FF'); g.addColorStop(1, '#CFEBFF');
      cctx.fillStyle = g; cctx.fillRect(0, 0, W, H);
      // raios de brilho
      cctx.save();
      cctx.translate(W * 0.5, H * 0.42);
      for (let i = 0; i < 12; i++) {
        cctx.rotate(Math.PI / 6);
        cctx.fillStyle = 'rgba(255,204,0,.10)';
        cctx.fillRect(0, -7, Math.max(W, H), 14);
      }
      cctx.restore();
      // sparkles
      cctx.fillStyle = 'rgba(255,255,255,.9)';
      const sparkles = [[0.2, 0.25], [0.8, 0.3], [0.72, 0.7], [0.25, 0.72], [0.5, 0.16]];
      cctx.font = `${Math.round(H * 0.09)}px serif`;
      cctx.textAlign = 'center'; cctx.textBaseline = 'middle';
      sparkles.forEach(s => cctx.fillText('✨', W * s[0], H * s[1]));
      // cãozinho feliz, limpo
      cctx.font = `${Math.round(H * 0.5)}px serif`;
      cctx.fillText('🐶', W * 0.5, H * 0.52);
    };

    const drawDirt = () => {
      dctx.globalCompositeOperation = 'source-over';
      dctx.clearRect(0, 0, W, H);
      // lama
      const g = dctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#8a6a3a'); g.addColorStop(1, '#6f5230');
      dctx.fillStyle = g; dctx.fillRect(0, 0, W, H);
      // textura de blobs mais escuros
      for (let i = 0; i < 90; i++) {
        const x = ((i * 97) % 100) / 100 * W;
        const y = ((i * 57) % 100) / 100 * H;
        const r = 8 + ((i * 13) % 22);
        dctx.fillStyle = i % 2 ? 'rgba(60,42,20,.5)' : 'rgba(120,92,52,.5)';
        dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill();
      }
      // silhueta do cãozinho (pra dar pista do que tem embaixo)
      dctx.font = `${Math.round(H * 0.5)}px serif`;
      dctx.textAlign = 'center'; dctx.textBaseline = 'middle';
      dctx.fillStyle = 'rgba(40,28,14,.45)';
      dctx.fillText('🐶', W * 0.5, H * 0.52);
    };

    const setup = () => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      [clean, bathCanvas].forEach(c => {
        c.width = W * dpr; c.height = H * dpr;
        c.style.width = W + 'px'; c.style.height = H + 'px';
      });
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawClean();
      drawDirt();
      won = false; started = false;
      win.classList.remove('show');
      hint.classList.remove('hide');
      gmFill.style.width = '0%'; gmPct.textContent = '0%';
    };

    const sampleProgress = () => {
      try {
        const img = dctx.getImageData(0, 0, bathCanvas.width, bathCanvas.height).data;
        let clear = 0; const total = img.length / 4;
        for (let i = 3; i < img.length; i += 40) { if (img[i] < 40) clear++; }
        const checked = img.length / 40;
        return Math.min(100, Math.round((clear / checked) * 100));
      } catch (e) { return 0; }
    };

    const bubbleAt = (x, y) => {
      const now = performance.now();
      if (now - lastBubble < 70) return;
      lastBubble = now;
      const b = document.createElement('span');
      b.className = 'bubble';
      const sz = 10 + Math.random() * 22;
      b.style.width = sz + 'px'; b.style.height = sz + 'px';
      b.style.left = (x - sz / 2) + 'px'; b.style.top = (y - sz / 2) + 'px';
      stage.appendChild(b);
      setTimeout(() => b.remove(), 1100);
    };

    const confetti = () => {
      const colors = ['#FFCC00', '#0E0E10', '#E0A800', '#FFE17A', '#fff'];
      for (let i = 0; i < 70; i++) {
        const c = document.createElement('span');
        c.className = 'confetti-pc';
        c.style.left = Math.random() * 100 + '%';
        c.style.background = colors[i % colors.length];
        c.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
        c.style.animationDelay = (Math.random() * 0.4) + 's';
        stage.appendChild(c);
        setTimeout(() => c.remove(), 3400);
      }
    };

    const triggerWin = () => {
      won = true;
      // limpa o resto da lama com fade
      bathCanvas.style.transition = 'opacity .6s ease';
      bathCanvas.style.opacity = '0';
      gmFill.style.width = '100%'; gmPct.textContent = '100%';
      confetti();
      setTimeout(() => win.classList.add('show'), 350);
      const r = bathCanvas.getBoundingClientRect();
      GAME.award('banho', r.left + r.width / 2, r.top + 30);
    };

    const scrub = (x, y) => {
      if (won) return;
      if (!started) { started = true; hint.classList.add('hide'); }
      dctx.globalCompositeOperation = 'destination-out';
      dctx.beginPath();
      dctx.arc(x, y, Math.max(22, W * 0.05), 0, Math.PI * 2);
      dctx.fill();
      bubbleAt(x, y);
      const now = performance.now();
      if (now - lastSample > 140) {
        lastSample = now;
        const p = sampleProgress();
        gmFill.style.width = p + '%'; gmPct.textContent = p + '%';
        if (p >= 90) triggerWin();
      }
    };

    let drawing = false;
    const pos = (e) => {
      const r = bathCanvas.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      return { x: cx, y: cy };
    };
    const down = (e) => { drawing = true; const p = pos(e); scrub(p.x, p.y); };
    const moveS = (e) => { if (!drawing) return; const p = pos(e); scrub(p.x, p.y); };
    const up = () => {
      drawing = false;
      if (won || !started) return;
      const p = sampleProgress();
      gmFill.style.width = p + '%'; gmPct.textContent = p + '%';
      if (p >= 90) triggerWin();
    };

    bathCanvas.addEventListener('mousedown', down);
    bathCanvas.addEventListener('mousemove', moveS);
    window.addEventListener('mouseup', up);
    bathCanvas.addEventListener('touchstart', (e) => { down(e); }, { passive: true });
    bathCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveS(e); }, { passive: false });
    bathCanvas.addEventListener('touchend', up);

    resetBtn.addEventListener('click', () => { bathCanvas.style.opacity = '1'; setup(); });

    // init quando visível + on resize (debounce)
    let inited = false;
    const ioGame = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting && !inited) { inited = true; setup(); } });
    }, { threshold: 0.25 });
    ioGame.observe(stage);
    let rt;
    window.addEventListener('resize', () => { if (!inited) return; clearTimeout(rt); rt = setTimeout(() => { bathCanvas.style.opacity = '1'; setup(); }, 250); });
  }

  /* ---------- Mini-game: leve o pet ao Aumigo ---------- */
  const walkScene = $('#walkScene');
  if (walkScene) {
    const dog = $('#walkDog');
    const hint = $('#walkHint');
    const winEl = $('#walkWin');
    const prints = $('#walkPrints');
    let dragging = false, won = false, startX = 0, dogX = 0;

    const sceneW = () => walkScene.getBoundingClientRect().width;
    const setX = (x) => {
      const max = sceneW() - 120;
      dogX = Math.max(0, Math.min(max, x));
      dog.style.left = (10 + dogX) + 'px';
      // trilha de patinhas
      const n = Math.round(dogX / 36);
      prints.innerHTML = Array.from({ length: n }, (_, i) => `<span style="position:absolute;left:${14 + i * 36}px">🐾</span>`).join('');
      if (!won && dogX >= max - 8) triggerWin();
    };
    const triggerWin = () => {
      won = true; dog.classList.remove('walking');
      winEl.classList.add('show');
      const r = winEl.getBoundingClientRect();
      GAME.award('passeio', r.left + r.width / 2, r.top + 30);
    };
    const start = (e) => {
      if (won) return;
      dragging = true; dog.classList.add('walking');
      hint.classList.add('hide');
      startX = (e.touches ? e.touches[0].clientX : e.clientX) - dogX;
    };
    const move = (e) => {
      if (!dragging || won) return;
      const cx = (e.touches ? e.touches[0].clientX : e.clientX);
      setX(cx - startX);
    };
    const end = () => { dragging = false; if (!won) dog.classList.remove('walking'); };
    dog.addEventListener('mousedown', start);
    dog.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', (e) => { if (dragging) e.preventDefault(); move(e); }, { passive: false });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);

    const resetWalk = () => {
      won = false; dragging = false; dogX = 0;
      dog.style.left = '10px'; dog.classList.remove('walking');
      prints.innerHTML = '';
      winEl.classList.remove('show');
      hint.classList.remove('hide');
    };
    const walkRestart = $('#walkRestart');
    if (walkRestart) walkRestart.addEventListener('click', resetWalk);
  }

  /* ---------- Bastidores: vídeos reais ou cards de marca ---------- */
  const reelsGrid = $('#reelsGrid');
  if (reelsGrid) {
    // Fotos da internet (provisórias, Unsplash). Se não carregarem, cai no card de marca.
    const uns = (id, faces) => 'https://images.unsplash.com/photo-' + id + '?w=600&h=820&fit=crop&q=72&auto=format' + (faces ? '&crop=faces,center' : '');
    const fallback = [
      { img: uns('1647002380358-fc70ed2f04e0'), emoji: '🛁', grad: 'linear-gradient(160deg,#1b1b1f,#2c2c33)', cap: 'Banho terapêutico', tag: 'Com produtos premium' },
      { img: uns('1583534778255-5d67d3dcf95d'), emoji: '💧', grad: 'linear-gradient(160deg,#C9A227,#8a6f18)', cap: 'Banho tranquilo', tag: 'Sem estresse' },
      { img: uns('1522276498395-f4f68f7f8454', true), emoji: '💛', grad: 'linear-gradient(160deg,#21212a,#3a3a45)', cap: 'Famílias felizes', tag: 'O carinho que une' },
      { img: uns('1632498301446-5f78baad40d0', true), emoji: '🐾', grad: 'linear-gradient(160deg,#8a6f18,#C9A227)', cap: 'Clientes apaixonados', tag: 'Amor de verdade' }
    ];
    const renderFallback = () => {
      reelsGrid.innerHTML = fallback.map((r, i) => `
        <div class="reel-card reveal${i ? ' d' + (i % 3) : ''}" style="background:${r.grad}">
          <img src="${r.img}" alt="${r.cap}" loading="lazy">
          <span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
          <div class="reel-cap"><small>${r.tag}</small>${r.cap}</div>
        </div>`).join('');
      $$('.reel-card', reelsGrid).forEach((card, i) => {
        const im = $('img', card);
        im.addEventListener('error', () => {
          im.remove();
          card.insertAdjacentHTML('afterbegin', '<span class="reel-emoji">' + fallback[i].emoji + '</span>');
        });
      });
      $$('.reveal', reelsGrid).forEach(el => io.observe(el));
    };
    fetch('assets/media/media.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(items => {
        if (!Array.isArray(items) || !items.length) return renderFallback();
        reelsGrid.innerHTML = items.slice(0, 4).map((m, i) => `
          <div class="reel-card reveal${i ? ' d' + (i % 3) : ''}">
            ${m.video
              ? `<video src="assets/media/${m.video}" muted loop playsinline preload="metadata" ${m.poster ? `poster="assets/media/${m.poster}"` : ''}></video>`
              : `<img src="assets/media/${m.img}" alt="${m.cap || 'Bastidor Melhor Aumigo'}" loading="lazy">`}
            <span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
            <div class="reel-cap"><small>${m.tag || 'Bastidores'}</small>${m.cap || ''}</div>
          </div>`).join('');
        $$('.reel-card video', reelsGrid).forEach(v => {
          v.closest('.reel-card').addEventListener('mouseenter', () => v.play().catch(() => {}));
          v.closest('.reel-card').addEventListener('mouseleave', () => { v.pause(); });
        });
        $$('.reveal', reelsGrid).forEach(el => io.observe(el));
      })
      .catch(renderFallback);
  }

  /* ---------- Hero: mini-game "Aperte o Aumigo" (carinho) ---------- */
  const luxArch = $('#luxArch'), luxMascot = $('#luxMascot');
  if (luxArch && luxMascot) {
    const bark = document.createElement('span'); bark.className = 'lux-bark'; bark.textContent = 'Au au! 🐾'; luxArch.appendChild(bark);
    const meter = $('#luxMeterFill'); const energyBar = $('.lux-energy', luxArch); const hint = $('#luxHint');
    let energy = 0, squish = 0, mdx = 0, mdy = 0, jumping = false, won = false, lastHeart = 0;
    const spawnHeart = (x, y, force) => {
      const now = performance.now(); if (!force && now - lastHeart < 150) return; lastHeart = now;
      const h = document.createElement('span'); h.className = 'lux-heart'; h.textContent = Math.random() < 0.5 ? '🐾' : '❤️';
      h.style.left = x + 'px'; h.style.top = y + 'px'; luxArch.appendChild(h); setTimeout(() => h.remove(), 1000);
    };
    const doJump = () => {
      jumping = true; won = true; energy = 100;
      bark.textContent = 'AU AU AU! 🎉'; bark.classList.add('show');
      playBark(true);
      luxMascot.classList.remove('jump'); void luxMascot.offsetWidth; luxMascot.classList.add('jump');
      confettiBurst(luxArch, 36);
      if (hint) hint.textContent = '🏆 Você fez o Aumigo pular de alegria!';
      const r = luxArch.getBoundingClientRect();
      GAME.award('carinho', r.left + r.width / 2, r.top + 16);
      setTimeout(() => {
        jumping = false; luxMascot.classList.remove('jump'); energy = 0;
        if (energyBar) energyBar.classList.remove('active');
        bark.classList.remove('show'); bark.textContent = 'Au au! 🐾';
        if (hint) hint.textContent = '👆 Aperte o Aumigo até ele pular!';
      }, 1800);
    };
    const press = () => {
      if (jumping) return;
      if (energyBar) energyBar.classList.add('active');
      energy = Math.min(100, energy + 16); squish = 1;
      bark.textContent = energy > 65 ? 'AU AU! 🐾' : 'Au! 🐾'; bark.classList.add('show');
      playBark(false);
      const r = luxArch.getBoundingClientRect();
      spawnHeart(r.width * (0.38 + Math.random() * 0.24), r.height * 0.55, true);
      if (energy >= 100) doJump();
    };
    luxArch.addEventListener('mousemove', (e) => {
      const r = luxArch.getBoundingClientRect();
      mdx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      mdy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      spawnHeart(e.clientX - r.left, e.clientY - r.top);
    });
    luxArch.addEventListener('mouseenter', () => bark.classList.add('show'));
    luxArch.addEventListener('mouseleave', () => { if (!won) bark.classList.remove('show'); mdx = 0; mdy = 0; });
    luxArch.addEventListener('mousedown', press);
    luxArch.addEventListener('touchstart', () => press(), { passive: true });
    const loop = () => {
      if (!jumping && energy > 0) energy = Math.max(0, energy - 1.1);
      if (won && energy <= 0) won = false;
      if (squish > 0) squish = Math.max(0, squish - 0.12);
      if (meter) meter.style.width = energy + '%';
      if (!jumping) {
        const rise = -(energy / 100) * 46;
        luxMascot.style.transform = 'translate(' + (mdx * 9) + 'px,' + (rise + mdy * 5) + 'px) rotate(' + (mdx * 6) + 'deg) scaleY(' + (1 - squish * 0.12) + ') scaleX(' + (1 + squish * 0.09) + ')';
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Mídia real: auto-detecta hero/antes/depois ---------- */
  const tryImg = (src, cb) => { const im = new Image(); im.onload = () => cb(); im.src = src; };
  const arch = $('.lux-arch');
  if (arch) tryImg('assets/media/hero.jpg', () => {
    arch.style.background = "url('assets/media/hero.jpg') center/cover no-repeat";
    const m = arch.querySelector('img'); if (m) m.style.display = 'none';
  });
  const baBefore = $('.ba-before'), baAfter = $('.ba-after');
  if (baBefore) tryImg('assets/media/antes.jpg', () => { baBefore.style.background = "url('assets/media/antes.jpg') center/cover"; baBefore.textContent = ''; });
  if (baAfter) tryImg('assets/media/depois.jpg', () => { baAfter.style.background = "url('assets/media/depois.jpg') center/cover"; baAfter.textContent = ''; });

  /* ---------- Blog: carrega últimos posts ---------- */
  const blogGrid = $('#blogGrid');
  if (blogGrid) {
    const emoji = { 'Banho': '🛁', 'Tosa': '✂️', 'Saúde': '🩺', 'Produtos': '🧴', 'Nutrição': '🍖', 'Comportamento': '🐾', 'Cuidados': '💛' };
    const grad = ['linear-gradient(135deg,#FFCC00,#E0A800)', 'linear-gradient(135deg,#0E0E10,#2A2A33)', 'linear-gradient(135deg,#FFE17A,#FFCC00)'];
    fetch('blog/posts.json')
      .then(r => r.json())
      .then(posts => {
        const top = posts.slice(0, 3);
        blogGrid.innerHTML = top.map((p, i) => `
          <a class="post-card reveal${i ? ' d' + i : ''}" href="blog/posts/${p.slug}.html">
            <div class="post-thumb" style="background:${grad[i % 3]}">
              <span class="cat">${p.categoria}</span>
              ${emoji[p.categoria] || '🐾'}
            </div>
            <div class="post-body">
              <span class="meta">${p.data} · ${p.tempoLeitura}</span>
              <h3>${p.titulo}</h3>
              <p>${p.resumo}</p>
              <span class="serv-link">Ler matéria <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </div>
          </a>`).join('');
        $$('.reveal', blogGrid).forEach(el => io.observe(el));
      })
      .catch(() => {
        blogGrid.innerHTML = '<p style="color:var(--tx-soft)">Em breve, nossas primeiras matérias. 🐾</p>';
      });
  }
})();
