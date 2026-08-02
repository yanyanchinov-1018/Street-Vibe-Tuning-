/* ═══════════════════════════════════════════════════════════
   STREET VIBE TUNING — поведение страницы
   Локализация · модальная запись · галерея · мобильная навигация.
   Всё на transform/opacity, всё уважает prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const calm  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const light = window.matchMedia('(hover: hover) and (pointer: fine)').matches; // тяжёлые эффекты — только для мыши
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ═══════════════════ ЛОКАЛИЗАЦИЯ (i18n) ═══════════════════ */
  const DICT = window.SVT_I18N;
  const LANGS = ['ru', 'uz', 'en'];
  const STORE_KEY = 'svt.lang';

  const detectLang = () => {
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* приватный режим */ }
    if (LANGS.includes(saved)) return saved;
    const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return LANGS.includes(nav) ? nav : 'ru';
  };

  let lang = detectLang();
  const t = (key) => (DICT[lang] && DICT[lang][key]) || DICT.ru[key] || '';

  function applyLang(next, { save = true } = {}) {
    if (!LANGS.includes(next)) return;
    lang = next;

    // Текст, разметка, плейсхолдеры, aria-подписи
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });

    // Документ целиком
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    $('#metaDesc').setAttribute('content', t('meta.desc'));

    // Состояния, зависящие от языка
    $$('.lang__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $$('.card__toggle').forEach(syncToggleLabel);
    burger.setAttribute('aria-label', t(mobnav.hidden ? 'a11y.menuOpen' : 'a11y.menuClose'));
    formStatus.textContent = '';

    fitHero();
    if (save) { try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* игнорируем */ } }
  }

  $('#lang').addEventListener('click', (e) => {
    const btn = e.target.closest('.lang__btn');
    if (btn) applyLang(btn.dataset.lang);
  });

  /* ── Герой: кегль подгоняется под ширину контейнера ─────────
     «Искусство» / «Benuqsonlik» / «The art of» — разной длины,
     поэтому размер считается, а не задаётся клампом.            */
  const heroWords = $$('.hero__word');
  const heroInner = $('.hero__inner');
  function fitHero() {
    if (!heroInner) return;
    const avail = heroInner.clientWidth;
    if (!avail) return;
    heroWords.forEach((el) => {
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize);
      const range = document.createRange();
      range.selectNodeContents(el);
      const ink = range.getBoundingClientRect().width;
      if (!ink) return;
      // Потолок не даёт коротким словам («san'ati») раздуться до баннера
      const size = Math.min(base * (avail / ink), avail * 0.145);
      el.style.fontSize = size.toFixed(2) + 'px';
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHero);

  /* ═══════════════════ МОБИЛЬНАЯ НАВИГАЦИЯ ══════════════════ */
  const burger = $('#burger');
  const mobnav = $('#mobnav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', t(open ? 'a11y.menuClose' : 'a11y.menuOpen'));
    mobnav.hidden = !open;
    document.body.classList.toggle('is-locked', open);
    if (open) mobnav.querySelector('a').focus({ preventScroll: true });
  };
  burger.addEventListener('click', () => setMenu(mobnav.hidden));
  mobnav.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) setMenu(false);
  });

  /* ═══════════════════ ПОЯВЛЕНИЕ БЛОКОВ ═════════════════════ */
  $$('.reveal').forEach((el) => el.style.setProperty('--d', el.dataset.d || 0));
  if (calm) {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8%' });
    $$('.reveal').forEach((el) => io.observe(el));
  }

  /* ═══════════════════ СКРОЛЛ: ХЕДЕР + ПАРАЛЛАКС ════════════ */
  const hdr = $('#hdr');
  const stage = $('.hero__stage');
  const parallax = !calm && light;           // на тач-устройствах параллакс выключен
  let ticking = false;

  const frame = () => {
    ticking = false;
    hdr.classList.toggle('is-stuck', window.scrollY > 40);
    if (stage && parallax) {
      const y = Math.min(window.scrollY, window.innerHeight);
      stage.style.transform = `translate3d(0, ${y * 0.22}px, 0) scale(${1 + (y / window.innerHeight) * 0.06})`;
    }
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }, { passive: true });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; fitHero(); });
  }, { passive: true });

  /* ═══════════════════ СВЕТ И БЛИКИ (только мышь) ═══════════ */
  if (light && !calm) {
    document.body.classList.add('pointer');

    const rig = $('.hexrig__glow');
    let px = 0, py = 0, rigRaf = 0;
    window.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      if (rigRaf) return;
      rigRaf = requestAnimationFrame(() => {
        rigRaf = 0;
        rig.style.setProperty('--mx', px + 'px');
        rig.style.setProperty('--my', py + 'px');
      });
    }, { passive: true });

    // «Жидкий металл»: блик следует за курсором внутри элемента
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest('.btn, .card, .rev, .chip, .card__link, .card__toggle');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--bx', `${e.clientX - r.left}px`);
      el.style.setProperty('--by', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ═══════════════════ ВИДЕО В ГЕРОЕ ════════════════════════
     Положите ролик в assets/ и укажите путь ниже. На тач-устройствах
     и при экономии движения видео не грузится вовсе — мобильный
     трафик и батарея важнее эффекта.                            */
  const HERO_VIDEO = null; // например: 'assets/hero.mp4'
  const video = $('#heroVideo');
  if (video && HERO_VIDEO && !calm && light) {
    video.src = HERO_VIDEO;
    video.addEventListener('canplay', () => video.classList.add('is-live'), { once: true });
    video.play().catch(() => {});
  }

  /* ═══════════════════ КАРТОЧКИ УСЛУГ: ДЕТАЛИ ═══════════════ */
  function syncToggleLabel(btn) {
    const open = btn.getAttribute('aria-expanded') === 'true';
    $('.card__toggle-txt', btn).textContent = t(open ? 'services.less' : 'services.more');
  }

  $$('.card__toggle').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      syncToggleLabel(btn);
    });
  });

  /* ═══════════════════ ГАЛЕРЕЯ: ФИЛЬТРЫ ═════════════════════ */
  const chips = $$('.chip');
  const shots = $$('.shot');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      const f = chip.dataset.filter;
      shots.forEach((shot) => {
        const show = f === 'all' || shot.dataset.tags.split(' ').includes(f);
        shot.classList.toggle('is-hidden', !show);
        shot.setAttribute('aria-hidden', String(!show));
      });
    });
  });

  /* ═══════════════════ ГАЛЕРЕЯ: ДО / ПОСЛЕ ══════════════════ */
  $$('[data-ba]').forEach((fig) => {
    const handle = $('[data-handle]', fig);
    const set = (pct) => {
      const v = Math.min(96, Math.max(4, pct));
      fig.style.setProperty('--split', v + '%');
      handle.setAttribute('aria-valuenow', String(Math.round(v)));
    };
    set(50);

    const fromX = (clientX) => {
      const r = fig.getBoundingClientRect();
      set(((clientX - r.left) / r.width) * 100);
    };

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const drag = (ev) => fromX(ev.clientX);
      const stop = () => {
        handle.removeEventListener('pointermove', drag);
        handle.removeEventListener('pointerup', stop);
        handle.removeEventListener('pointercancel', stop);
      };
      handle.addEventListener('pointermove', drag);
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
    });

    handle.addEventListener('keydown', (e) => {
      const now = Number(handle.getAttribute('aria-valuenow'));
      if (e.key === 'ArrowLeft')  { e.preventDefault(); set(now - 4); }
      if (e.key === 'ArrowRight') { e.preventDefault(); set(now + 4); }
    });
  });

  /* ═══════════════════ МОДАЛЬНОЕ ОКНО ЗАПИСИ ════════════════ */
  const modal = $('#bookingModal');
  const form = $('#bookingForm');
  const formStatus = $('#formStatus');
  const submitBtn = $('#submitBtn');
  const viewForm = $('[data-view="form"]', modal);
  const viewDone = $('[data-view="done"]', modal);
  let lastFocused = null;

  const showView = (done) => {
    viewForm.hidden = done;
    viewDone.hidden = !done;
  };

  function openModal(service) {
    lastFocused = document.activeElement;
    showView(false);
    formStatus.textContent = '';
    if (service) form.elements.service.value = service;
    modal.showModal();                       // <dialog> сам держит фокус внутри и закрывается по Esc
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 120);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    const finish = () => {
      modal.close();
      document.body.classList.remove('is-locked');
      if (lastFocused) lastFocused.focus({ preventScroll: true });
    };
    if (calm) finish(); else setTimeout(finish, 260);
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-booking]');
    if (!opener) return;
    e.preventDefault();
    if (!mobnav.hidden) setMenu(false);
    openModal(opener.dataset.service);
  });

  $('#modalClose').addEventListener('click', closeModal);
  $('#doneClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modal.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });

  /* ── Валидация ─────────────────────────────────────────────── */
  const rules = {
    name:  (v) => (v.trim().length >= 2 ? '' : 'err.name'),
    phone: (v) => (/^\+?[\d\s()-]{9,20}$/.test(v.trim()) ? '' : 'err.phone'),
    car:   (v) => (v.trim().length >= 2 ? '' : 'err.car'),
  };

  const validate = () => {
    let ok = true;
    Object.entries(rules).forEach(([name, check]) => {
      const input = form.elements[name];
      const key = check(input.value);
      input.closest('.field').classList.toggle('is-bad', Boolean(key));
      input.setAttribute('aria-invalid', String(Boolean(key)));
      $(`[data-err="${name}"]`).textContent = key ? t(key) : '';
      if (key) ok = false;
    });
    return ok;
  };

  /**
   * Отправляет заявку в канал, где её увидят.
   * ────────────────────────────────────────────────────────────
   * TODO (решение за вами): сейчас работает демо-режим — заявка
   * логируется, и форма показывает экран успеха. Подключите канал:
   *   • Telegram Bot API — sendMessage в чат ателье;
   *   • serverless-функция (Vercel) с записью в CRM/таблицу;
   *   • сторонний форм-сервис.
   * Токен бота нельзя держать в этом файле — он публичный.
   *
   * @param {{name:string, phone:string, car:string, service:string, note:string, lang:string}} payload
   * @returns {Promise<void>} успех — resolve, отказ — reject(Error)
   */
  async function deliverBooking(payload) {
    console.info('[SVT] заявка:', payload);
    await new Promise((r) => setTimeout(r, 700));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formStatus.textContent = '';
    if (!validate()) {
      formStatus.textContent = t('err.form');
      const bad = form.querySelector('.is-bad input');
      if (bad) bad.focus();
      return;
    }

    const payload = Object.assign(Object.fromEntries(new FormData(form).entries()), { lang });
    submitBtn.disabled = true;
    submitBtn.textContent = t('form.sending');

    try {
      await deliverBooking(payload);
      form.reset();
      showView(true);
      $('#doneClose').focus({ preventScroll: true });
    } catch (err) {
      formStatus.textContent = t('fail');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t('form.submit');
    }
  });

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field && field.classList.contains('is-bad')) validate();
  });

  /* ═══════════════════ СТАРТ ════════════════════════════════ */
  applyLang(lang, { save: false });
  frame();
})();
