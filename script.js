document.documentElement.classList.add('js');

/* ширина окна без полосы прокрутки — для высоты блоков на десктопе */
const setVw = () => document.documentElement.style.setProperty('--vw', `${document.documentElement.clientWidth}px`);
setVw();
addEventListener('resize', setVw);

/* 0. Вытянутые заголовки: текст масштабируется по вертикали (как в макетах),
      а высота блока подгоняется, чтобы не наезжать на соседей. */
const stretched = [...document.querySelectorAll('.d')].map((el) => {
  const sx = document.createElement('span');
  sx.className = 'sx';
  while (el.firstChild) sx.appendChild(el.firstChild);
  el.appendChild(sx);
  return el;
});
const fitStretched = () => {
  stretched.forEach((el) => {
    const sy = parseFloat(getComputedStyle(el).getPropertyValue('--sy')) || 1;
    el.style.height = '';
    el.style.height = `${el.firstElementChild.offsetHeight * sy}px`;
  });
};
/* CHIHUAHUA на обложке. В макете буквы занимают ~80% строки, остальное — расстояние между ними.
   На широком экране строка длиннее, поэтому берём более широкое начертание семейства
   (Extenda 70 Peta вместо 40 Hecto), а недостающее добираем лёгким расширением букв. */
const titleSvg = document.querySelector('.cover__title svg');
const titleText = titleSvg.querySelector('text');
const titleFonts = ['Extenda', 'Extenda Wide'];
const fitTitle = () => {
  const r = titleSvg.getBoundingClientRect();
  const desk = matchMedia('(min-width: 761px)').matches;
  const w = desk && r.height ? 360 * r.width / r.height : 1795;   // ширина строки в единицах макета
  const target = w * 0.8;                                          // сколько должны занимать сами буквы
  titleText.removeAttribute('textLength');
  titleText.removeAttribute('transform');
  let best = null;
  for (const f of titleFonts) {
    titleText.style.fontFamily = `"${f}", var(--display)`;
    const n = titleText.getComputedTextLength();
    if (n > w) continue;                                           // не помещается — не годится
    const d = Math.abs(Math.log(target / n));
    if (!best || d < best.d) best = { f, n, d };
  }
  if (!best) best = { f: titleFonts[0], n: titleText.getComputedTextLength() };
  titleText.style.fontFamily = `"${best.f}", var(--display)`;
  const s = Math.min(1.25, Math.max(1, target / best.n));          // слегка расширить буквы, если надо
  titleSvg.setAttribute('viewBox', `0 0 ${Math.round(w)} 360`);
  titleText.setAttribute('transform', `scale(${s.toFixed(3)} 1)`);
  titleText.setAttribute('textLength', Math.round(w / s));
};
const fitAll = () => { fitStretched(); fitTitle(); };
document.fonts.load('400 100px "Extenda Wide"', 'CHIHUAHUA').then(() => document.fonts.ready).then(fitAll);
new ResizeObserver(fitAll).observe(document.body);


/* 1. Картинки, которых ещё нет в assets/, заменяем заглушкой (или убираем, если data-ph пустой).
      Как только файл с нужным именем появится в папке assets — он покажется сам. */
document.querySelectorAll('img.asset').forEach((img) => {
  const swap = () => {
    const label = img.dataset.ph;
    if (!label) { img.remove(); return; }
    const ph = document.createElement('div');
    ph.className = img.className.replace('asset', 'ph');
    ph.setAttribute('style', img.getAttribute('style') || '');
    ph.textContent = label;
    img.replaceWith(ph);
  };
  if (img.complete && img.naturalWidth === 0) swap();
  else img.addEventListener('error', swap, { once: true });
});

/* 2. Компактное меню после обложки */
const minibar = document.getElementById('minibar');
const cover = document.getElementById('top');
// показываем, когда обложка почти ушла вверх (проверка по прокрутке надёжнее наблюдателя на старте)
const syncMinibar = () => {
  const on = cover.getBoundingClientRect().bottom < 80;
  minibar.classList.toggle('is-on', on);
  minibar.setAttribute('aria-hidden', on ? 'false' : 'true');
};
addEventListener('scroll', syncMinibar, { passive: true });
addEventListener('resize', syncMinibar);
syncMinibar();

/* 3. Появление блоков при прокрутке */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 5) * 70}ms`;
  io.observe(el);
});

/* 4. Look of the day — листалка образов */
(() => {
  const slides = [...document.querySelectorAll('.look__slide')];
  const label = document.getElementById('lookLabel');
  const count = document.getElementById('lookCount');
  const stage = document.getElementById('lookStage');
  const sideL = document.getElementById('lookSideL');
  const sideR = document.getElementById('lookSideR');
  let i = 0;

  const setSide = (btn, src) => {
    const img = btn.querySelector('img');
    btn.dataset.want = src || '';
    if (!src) { btn.hidden = true; return; }
    const probe = new Image();
    // при быстрых кликах применяем только последний запрошенный образ
    probe.onload = () => { if (btn.dataset.want === src) { img.src = src; btn.hidden = false; } };
    probe.onerror = () => { if (btn.dataset.want === src) btn.hidden = true; };   // одежды ещё нет в assets
    probe.src = src;
  };
  sideL.addEventListener('click', () => go(-1));
  sideR.addEventListener('click', () => go(1));

  const render = (dir) => {
    slides.forEach((s, n) => {
      s.style.setProperty('--from', `${dir * 40}px`);
      s.classList.toggle('is-active', n === i);
      s.setAttribute('aria-hidden', n === i ? 'false' : 'true');
    });
    // по краям — одежда соседних образов; клик переключает на него
    setSide(sideL, i > 0 ? slides[i - 1].dataset.outfit : null);
    setSide(sideR, i < slides.length - 1 ? slides[i + 1].dataset.outfit : null);
    const text = slides[i].dataset.label;
    label.innerHTML = text ? `<span class="tag">${text}</span>` : '';
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  };
  const go = (step) => { i = (i + step + slides.length) % slides.length; render(step); };

  document.getElementById('lookPrev').addEventListener('click', () => go(-1));
  document.getElementById('lookNext').addEventListener('click', () => go(1));

  // стрелки клавиатуры, когда блок на экране
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.5 })
    .observe(document.getElementById('look'));
  document.addEventListener('keydown', (e) => {
    if (!visible) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });

  // свайп на телефоне
  let x0 = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    x0 = null;
  });

  render(1);
})();
