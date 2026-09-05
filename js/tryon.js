/* Примерка: посетитель вписывает своё название и выбирает палитру,
   сайт перекрашивается целиком и держит выбор на всех страницах.
   Палитры — те же, что записаны запасными в :root у style.css. */

(function () {
  var KEY = 'naruki-tryon';
  var BASE = 'НА РУКИ';

  var PALETTES = [
    { id: 'Синий',    v: { '--accent': '#1d3557', '--accent-2': '#142842', '--accent-soft': '#f0a868', '--cream': '#f3f1ea', '--ink': '#14130f', '--ph-1': '#ebe5d8', '--ph-2': '#c3b7a4', '--ph-w1': '#f0a868', '--ph-w2': '#c9622c' } },
    { id: 'Кирпич',   v: { '--accent': '#d9481f', '--accent-2': '#a83617', '--accent-soft': '#e8a06a', '--cream': '#f5f0e6', '--ink': '#14110d', '--ph-1': '#e9dcc6', '--ph-2': '#c2a882', '--ph-w1': '#e8a06a', '--ph-w2': '#d9481f' } },
    { id: 'Зелёный',  v: { '--accent': '#2f6b4a', '--accent-2': '#235138', '--accent-soft': '#a8c48b', '--cream': '#f0f1e9', '--ink': '#14201a', '--ph-1': '#e4e6d6', '--ph-2': '#b6bfa0', '--ph-w1': '#d8cf9e', '--ph-w2': '#7d8c4a' } },
    { id: 'Карамель', v: { '--accent': '#a8700f', '--accent-2': '#7d5309', '--accent-soft': '#e5b143', '--cream': '#f6f3e7', '--ink': '#17160f', '--ph-1': '#ece2c8', '--ph-2': '#c9b489', '--ph-w1': '#e5b143', '--ph-w2': '#a8700f' } }
  ];

  function renameLogos(name) {
    document.querySelectorAll('.logo').forEach(function (el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue.trim()) { n.nodeValue = name; return; }
      }
    });
    // На схеме проезда у домика жёсткая ширина, а текст того же цвета, что фон схемы:
    // всё, что вылезло за прямоугольник, становится невидимым. Поэтому режем по длине.
    var short = name.length > 10 ? name.slice(0, 9).trim() + '…' : name;
    document.querySelectorAll('svg text').forEach(function (t) {
      if (t.dataset.brand || t.textContent.trim() === BASE) { t.dataset.brand = '1'; t.textContent = short; }
    });
    document.title = document.title.split(BASE).join(name);
  }

  function paint(i) {
    var v = PALETTES[i] ? PALETTES[i].v : PALETTES[0].v;
    for (var k in v) document.documentElement.style.setProperty(k, v[k]);
  }

  function read() {
    var q = new URLSearchParams(location.search);
    if (q.get('brand')) {
      var c = +q.get('c') || 0;
      return { name: q.get('brand').slice(0, 22), c: c < 0 || c >= PALETTES.length ? 0 : c, fromLink: true };
    }
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }

  function save(s) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} }

  function apply(s) {
    if (!s || !s.name) return;
    renameLogos(s.name);
    paint(s.c);
  }

  var state = read();
  if (state) {
    apply(state);
    if (state.fromLink) save({ name: state.name, c: state.c }); // чтобы цвет не слетал при переходе по сайту
  }

  var box = document.getElementById('tryon');
  if (!box) return;

  var input = box.querySelector('#tryon-name');
  var colors = box.querySelector('#tryon-colors');
  var done = box.querySelector('#tryon-done');
  var share = box.querySelector('#tryon-share');
  var picked = state ? state.c : 0;

  PALETTES.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (i === picked ? ' is-on' : '');
    b.style.background = p.v['--accent'];
    b.title = p.id;
    b.setAttribute('aria-label', 'Цвет ' + p.id);
    b.addEventListener('click', function () {
      picked = i;
      colors.querySelectorAll('.swatch').forEach(function (s) { s.classList.remove('is-on'); });
      b.classList.add('is-on');
      if (input.value.trim()) go();
    });
    colors.appendChild(b);
  });

  if (state) input.value = state.name;

  function go() {
    var name = input.value.trim();
    if (!name) { input.focus(); return; }
    var s = { name: name, c: picked };
    save(s);
    apply(s);
    done.textContent = 'Готово. Пролистайте наверх — и загляните в меню, там тоже ' + name + '.';
    done.hidden = false;
    share.hidden = false;
    if (window.track) window.track('tryon');   // название не отправляем, только сам факт
  }

  box.querySelector('#tryon-go').addEventListener('click', go);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });

  box.querySelector('#tryon-reset').addEventListener('click', function () {
    save(null);
    location.href = location.pathname;
  });

  share.addEventListener('click', function () {
    var url = location.origin + location.pathname + '?brand=' + encodeURIComponent(input.value.trim()) + '&c=' + picked;
    navigator.clipboard.writeText(url).then(function () {
      share.textContent = 'Ссылка скопирована';
      setTimeout(function () { share.textContent = 'Скопировать ссылку'; }, 2500);
    });
  });
})();
