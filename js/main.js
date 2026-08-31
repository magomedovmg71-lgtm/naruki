// НА РУКИ — демо. Заказы и брони никуда не уходят: всё живёт в localStorage.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => n.toLocaleString('ru-RU') + ' ₽';
  const MENU = window.MENU || [];
  const byMenu = id => MENU.find(d => d.id === id);

  // Комбо — не позиция меню, а пара блюд под одним id вида combo:scramble+flat.
  // Корзина работает с ним как с обычной строкой, цена уже со скидкой.
  const COMBO_OFF = .28;
  const combo = id => {
    const [a, b] = id.slice(6).split('+').map(byMenu);
    if (!a || !b) return null;
    if (!window.COMBO_FOOD.includes(a.id) || b.cat !== 'coffee') return null;   // скидка только на пары из акции
    const sum = a.price + b.price;
    return {
      id, name: `Комбо: ${a.name} + ${b.name}`,
      price: Math.round(sum * (1 - COMBO_OFF) / 10) * 10,
      weight: `вместо ${money(sum)}`,
      photo: 'combo'                                  // у пары своего снимка нет, берём кадр из блока на главной
    };
  };
  const byId = id => id.startsWith('combo:') ? combo(id) : byMenu(id);

  /* ——— шапка ——— */
  const hdr = $('.hdr');
  addEventListener('scroll', () => hdr?.classList.toggle('is-stuck', scrollY > 8), { passive: true });

  const burger = $('.burger'), nav = $('.nav');
  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });
  $$('.nav a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    burger?.setAttribute('aria-expanded', 'false');
  }));

  /* ——— открыто / закрыто ——— */
  const status = $('.status');
  if (status) {
    const h = new Date().getHours();
    const open = h >= 8 && h < 23;
    status.classList.toggle('status--closed', !open);
    $('.status__txt', status).textContent = open ? 'Открыто до 23:00' : 'Закрыто, откроемся в 8:00';
  }

  /* ——— появление при скролле ——— */
  // считаем координаты сами: IntersectionObserver пропускает блоки при рывковой прокрутке
  let rises = [];
  const reveal = () => {
    const line = innerHeight * .88;
    rises = rises.filter(el => {
      if (el.getBoundingClientRect().top > line) return true;
      el.classList.add('is-in');
      return false;
    });
  };
  const watchRise = root => { rises.push(...$$('.rise', root)); reveal(); };
  addEventListener('scroll', () => requestAnimationFrame(reveal), { passive: true });
  addEventListener('resize', reveal);
  watchRise(document);

  /* ——— карточки блюд ——— */
  const cardHTML = d => `
    <article class="dish rise${d.out ? ' is-out' : ''}" data-cat="${d.cat}">
      <div class="ph ph--${d.cat === 'coffee' || d.cat === 'drink' ? 'dark' : 'warm'}">
        <img src="assets/img/${d.id}.webp" alt="${d.name}" width="700" height="560" loading="lazy" decoding="async">
        ${d.out ? '<span class="tag tag--out">Закончилось</span>' : d.tag ? `<span class="tag${d.tag === 'новое' ? ' tag--dark' : ''}">${d.tag}</span>` : ''}
      </div>
      <div class="dish__body">
        <h3 class="dish__name">${d.name}</h3>
        <p class="dish__desc">${d.desc}</p>
        <div class="dish__meta"><span>${d.weight}</span><span>${d.kcal} ккал</span></div>
        <div class="dish__foot">
          <span class="dish__price">${money(d.price)}</span>
          <button class="dish__add" data-add="${d.id}" aria-label="Добавить «${d.name}» в корзину">+</button>
        </div>
      </div>
    </article>`;

  const popular = $('#popular');
  if (popular) popular.innerHTML = MENU.filter(d => d.tag === 'хит' || d.tag === 'новое').slice(0, 6).map(cardHTML).join('');

  const list = $('#menu-list');
  if (list) {
    list.innerHTML = MENU.map(cardHTML).join('');
    $('#filter').innerHTML = window.CATS.map((c, i) =>
      `<button data-cat="${c.id}" aria-pressed="${i === 0}">${c.name}</button>`).join('');
    $('#filter').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#filter button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const cat = b.dataset.cat;
      $$('.dish', list).forEach(d => {
        d.hidden = cat !== 'all' && d.dataset.cat !== cat;
        if (!d.hidden) d.classList.add('is-in');   // показываем сразу: ждать прокрутки тут нечего
      });
      $('#filter').scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }
  if (popular || list) watchRise(popular || list);

  /* ——— схема или карта города ——— */
  const mapTabs = $('#map-tabs');
  if (mapTabs) {
    const showMap = live => {
      $$('#map-tabs button').forEach(x => x.setAttribute('aria-pressed', String((x.dataset.map === 'city') === live)));
      const box = $('#map-live');
      $('#map-scheme').hidden = live;
      box.hidden = !live;
      if (live && !box.firstChild) {                // iframe грузим только по требованию
        const f = document.createElement('iframe');
        f.src = box.dataset.src;
        f.title = 'Карта: Махачкала, Коркмасова, 24';
        f.loading = 'lazy';
        box.append(f);
      }
    };
    mapTabs.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) showMap(b.dataset.map === 'city');
    });
    // кнопка-метка в шапке ведёт сюда с ?map=city — открываем сразу карту
    if (new URLSearchParams(location.search).get('map') === 'city') showMap(true);
  }

  /* ——— комбо: завтрак плюс кофе ——— */
  const comboBox = $('#combo');
  if (comboBox) {
    const opts = list => list.filter(d => d && !d.out)
      .map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    const food = $('#combo-food'), drink = $('#combo-drink');
    food.innerHTML = opts(window.COMBO_FOOD.map(byMenu));
    drink.innerHTML = opts(MENU.filter(d => d.cat === 'coffee'));
    food.value = 'scramble'; drink.value = 'flat';      // пара из заголовка: 680 ₽ → 490 ₽

    const [from, till] = window.COMBO_HOURS;
    const nowH = new Date().getHours();
    const open = nowH >= from && nowH < till;

    const paintCombo = () => {
      const c = combo(`combo:${food.value}+${drink.value}`);
      $('#combo-now').textContent = money(c.price);
      $('#combo-old').textContent = money(byMenu(food.value).price + byMenu(drink.value).price);
      if (open) $('#combo-add').dataset.add = c.id;     // дальше сработает общий обработчик [data-add]
    };
    comboBox.addEventListener('change', paintCombo);
    paintCombo();

    if (!open) {
      food.disabled = drink.disabled = $('#combo-add').disabled = true;
      delete $('#combo-add').dataset.add;               // чтобы пара не ушла в корзину мимо часов акции
      $('#combo-when').textContent = `Комбо собирают с ${from}:00 до ${till}:00. Сейчас сырники, скрэмбл и кофе есть в меню по обычной цене.`;
      $('#combo-when').hidden = false;
    }
  }

  /* ——— зоны доставки ——— */
  const zonesBox = $('#zones');
  if (zonesBox) zonesBox.innerHTML = window.ZONES.map(z => `
    <div class="zone rise">
      <i class="zone__dot" style="background:${z.color}"></i>
      <div class="zone__name">${z.name}<small>${z.area}</small></div>
      <div class="zone__val">${z.time}<small>доставим за</small></div>
      <div class="zone__val">${z.price ? money(z.price) : 'бесплатно'}<small>заказ от ${money(z.min)}</small></div>
    </div>`).join('');
  if (zonesBox) watchRise(zonesBox);

  /* ——— корзина ——— */
  const KEY = 'naruki-cart';
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }

  const items = () => Object.entries(cart).map(([id, q]) => ({ d: byId(id), q })).filter(x => x.d);
  const count = () => items().reduce((s, x) => s + x.q, 0);
  const subtotal = () => items().reduce((s, x) => s + x.d.price * x.q, 0);

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} };

  function add(id) {
    cart[id] = (cart[id] || 0) + 1;
    save(); paint();
    window.track?.("add_to_cart", { id });
    const btn = $(".cart-btn");
    btn?.classList.remove('is-bump'); void btn?.offsetWidth; btn?.classList.add('is-bump');
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]');
    if (a) add(a.dataset.add);
  });

  function paint() {
    const n = count(), sum = subtotal();
    $$('.cart-btn').forEach(b => {
      b.classList.toggle('is-empty', !n);
      $('.cart-btn__count', b).textContent = n;
    });
    const bar = $('.bottombar');
    if (bar) {
      bar.classList.toggle('is-on', n > 0);
      $('.bottombar__sum').innerHTML = `${money(sum)}<small>${n} ${plural(n, 'позиция', 'позиции', 'позиций')}</small>`;
    }
    paintCart();
  }

  const plural = (n, a, b, c) => {
    const m = n % 100, k = n % 10;
    return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c;
  };

  /* ——— панель корзины ——— */
  const drawer = $('#drawer'), overlay = $('#overlay');
  let step = 1;

  const openDrawer = () => {
    drawer.classList.add('is-open'); overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('.drawer__close')?.focus();
  };
  const closeDrawer = () => {
    drawer.classList.remove('is-open'); overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (step === 3) { step = 1; paintCart(); }
  };

  $$('[data-open-cart]').forEach(b => b.addEventListener('click', openDrawer));
  $('.drawer__close')?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  addEventListener('keydown', e => { if (e.key === 'Escape' && drawer?.classList.contains('is-open')) closeDrawer(); });

  function paintCart() {
    if (!drawer) return;
    const body = $('.drawer__body'), foot = $('.drawer__foot');
    const its = items();

    if (step === 3) return;

    if (!its.length) {
      body.innerHTML = `<div class="cart-empty">
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/></svg>
        <p>Пока пусто</p><p class="note">Загляните в меню — там 22 позиции</p></div>`;
      foot.innerHTML = `<a class="btn btn--wide btn--ghost" href="menu.html">Открыть меню</a>`;
      $('.steps-head')?.setAttribute('hidden', '');
      return;
    }

    $('.steps-head')?.removeAttribute('hidden');
    $$('.steps-head i').forEach((i, n) => i.classList.toggle('is-on', n < step));

    if (step === 1) {
      body.innerHTML = its.map(({ d, q }) => `
        <div class="cart-line">
          <div class="cart-line__ph"><img src="assets/img/${d.photo || d.id}.webp" alt="" width="56" height="56" loading="lazy"></div>
          <div>
            <div class="cart-line__name">${d.name}</div>
            <div class="cart-line__price">${money(d.price)} · ${d.weight}</div>
          </div>
          <div class="qty">
            <button data-q="-1" data-id="${d.id}" aria-label="Убрать одну порцию «${d.name}»">−</button>
            <b>${q}</b>
            <button data-q="1" data-id="${d.id}" aria-label="Добавить порцию «${d.name}»">+</button>
          </div>
        </div>`).join('');
      foot.innerHTML = `
        <div class="sum sum--total"><span>Итого</span><span>${money(subtotal())}</span></div>
        <button class="btn btn--accent btn--wide" id="to-step2">Оформить заказ</button>`;
      $('#to-step2').onclick = () => { step = 2; paintCart(); };
      return;
    }

    // шаг 2 — способ получения и оплата
    body.innerHTML = `
      <div class="form">
        <div>
          <label class="field"><span class="sr">Способ получения</span></label>
          <div class="chips" id="how">
            <label class="chip"><input type="radio" name="how" value="delivery" checked><span>Доставка</span></label>
            <label class="chip"><input type="radio" name="how" value="pickup"><span>Самовывоз</span></label>
            <label class="chip"><input type="radio" name="how" value="here"><span>В зале</span></label>
          </div>
        </div>
        <div class="row2">
          <div class="field"><label for="c-name">Имя</label><input id="c-name" required><span class="err">Как к вам обращаться?</span></div>
          <div class="field"><label for="c-tel">Телефон</label><input id="c-tel" type="tel" inputmode="tel" placeholder="+7 (___) ___-__-__" required><span class="err">Нужны все 11 цифр</span></div>
        </div>
        <div id="how-fields"></div>
        <div>
          <label class="field"><span class="sr">Оплата</span></label>
          <div class="chips" id="pay"></div>
        </div>
        <div class="field"><label for="c-note">Комментарий</label><textarea id="c-note" placeholder="Домофон не работает, звоните"></textarea></div>
        <input class="hp" tabindex="-1" autocomplete="off" id="c-hp" aria-hidden="true">
      </div>`;

    const howFields = $('#how-fields'), payBox = $('#pay');

    const PAYS = {
      delivery: [['Картой онлайн', 'card'], ['СБП', 'sbp'], ['Курьеру картой', 'courier-card'], ['Наличными', 'cash']],
      pickup:   [['Картой онлайн', 'card'], ['СБП', 'sbp'], ['На кассе', 'counter']],
      here:     [['На кассе', 'counter'], ['СБП', 'sbp']]
    };

    function drawHow(how) {
      if (how === 'delivery') {
        howFields.innerHTML = `
          <div class="field"><label for="c-zone">Район</label>
            <select id="c-zone">${window.ZONES.map((z, i) => `<option value="${i}">${z.name} — ${z.time}</option>`).join('')}</select></div>
          <div class="row2" style="margin-top:16px">
            <div class="field"><label for="c-addr">Улица и дом</label><input id="c-addr" required><span class="err">Без адреса курьер не доедет</span></div>
            <div class="field"><label for="c-flat">Кв. / офис</label><input id="c-flat"></div>
          </div>`;
        $('#c-zone').onchange = total;
      } else if (how === 'pickup') {
        howFields.innerHTML = `<div class="field"><label for="c-time">Ко скольки подготовить</label>
          <select id="c-time">${['через 20 минут', 'через 40 минут', 'через час', 'к 12:00', 'к 18:00'].map(t => `<option>${t}</option>`).join('')}</select></div>
          <p class="note" style="margin-top:10px">Заберёте на Коркмасова, 24. Отдельная касса для самовывоза, очереди нет.</p>`;
      } else {
        howFields.innerHTML = `<div class="row2">
            <div class="field"><label for="c-guests">Гостей</label><select id="c-guests">${[1,2,3,4,5,6].map(n => `<option>${n}</option>`).join('')}</select></div>
            <div class="field"><label for="c-tbl">Стол</label><select id="c-tbl"><option>Любой свободный</option><option>У окна</option><option>На террасе</option></select></div>
          </div>`;
      }
      payBox.innerHTML = PAYS[how].map((p, i) =>
        `<label class="chip"><input type="radio" name="pay" value="${p[1]}"${i ? '' : ' checked'}><span>${p[0]}</span></label>`).join('');
      total();
    }

    function total() {
      const how = $('input[name=how]:checked').value;
      const sub = subtotal();
      const z = how === 'delivery' ? window.ZONES[+($('#c-zone')?.value || 0)] : null;
      const ship = z ? (sub >= z.min ? 0 : z.price) : 0;
      const low = z && sub < z.min;
      const off = how === 'pickup' ? Math.round(sub * .1) : 0;   // скидка за самовывоз
      foot.innerHTML = `
        <div class="sum"><span>Заказ</span><span>${money(sub)}</span></div>
        ${z ? `<div class="sum"><span>Доставка</span><span>${ship ? money(ship) : 'бесплатно'}</span></div>` : ''}
        ${off ? `<div class="sum" style="color:var(--accent)"><span>Скидка за самовывоз, 10%</span><span>−${money(off)}</span></div>` : ''}
        <div class="sum sum--total"><span>Итого</span><span>${money(sub + ship - off)}</span></div>
        ${low ? `<p class="note" style="margin-bottom:12px;color:var(--accent)">Бесплатная доставка в этот район от ${money(z.min)} — добавьте ещё на ${money(z.min - sub)}</p>` : ''}
        <button class="btn btn--accent btn--wide" id="send">Подтвердить заказ</button>
        <button class="btn btn--ghost btn--wide" id="back" style="margin-top:8px">Назад к корзине</button>`;
      $('#back').onclick = () => { step = 1; paintCart(); };
      $("#send").onclick = () => submitOrder(sub + ship - off);
    }

    $('#how').addEventListener('change', e => drawHow(e.target.value));
    $('#c-tel').addEventListener('input', maskTel);
    drawHow('delivery');
  }

  drawer?.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (!q) return;
    const id = q.dataset.id;
    cart[id] = (cart[id] || 0) + +q.dataset.q;
    if (cart[id] < 1) delete cart[id];
    save(); paint();
  });

  /* ——— телефон ——— */
  function maskTel(e) {
    let v = e.target.value.replace(/\D/g, '').replace(/^8/, '7').replace(/^([09])/, '7$1').slice(0, 11);
    if (!v) { e.target.value = ''; return; }
    const p = ['+7 (', v.slice(1, 4), ') ', v.slice(4, 7), '-', v.slice(7, 9), '-', v.slice(9, 11)];
    e.target.value = p.join('').replace(/[-\s(]+$/, '').replace(/\)$/, ')');
  }
  const telOk = v => v.replace(/\D/g, '').length === 11;

  function bad(el, is) { el.setAttribute('aria-invalid', String(is)); return !is; }

  /* ——— отправка заказа (демо) ——— */
  function submitOrder(sum) {
    const name = $('#c-name'), tel = $('#c-tel'), addr = $('#c-addr');
    let ok = bad(name, !name.value.trim());
    ok = bad(tel, !telOk(tel.value)) && ok;
    if (addr) ok = bad(addr, !addr.value.trim()) && ok;
    if ($('#c-hp').value) return;                     // honeypot: бот заполнил скрытое поле
    if (!ok) { $('[aria-invalid="true"]')?.focus(); return; }

    step = 3;
    const no = 1000 + Math.floor(Math.random() * 900);
    window.track?.("order_done", { sum });
    const how = $('input[name=how]:checked').value;
    const when = { delivery: 'Курьер выедет в течение 10 минут', pickup: 'Заберёте на Коркмасова, 24', here: 'Стол придержим 15 минут' }[how];
    $('.drawer__body').innerHTML = `
      <div class="done">
        <div class="done__mark"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
        <h3>Заказ принят</h3>
        <div class="done__no">№ ${no}</div>
        <p class="muted">${when}. На ${money(sum)}.</p>
        <p class="note" style="margin-top:22px">Это демонстрационный сайт. Заказ никуда не отправлен — на рабочем проекте здесь стоит отправка в Telegram, на почту или в вашу систему учёта.</p>
      </div>`;
    $('.drawer__foot').innerHTML = `<button class="btn btn--wide" id="done-ok">Хорошо</button>`;
    $('#done-ok').onclick = () => { cart = {}; save(); step = 1; paint(); closeDrawer(); };
    $$('.steps-head i').forEach(i => i.classList.add('is-on'));
  }

  /* ——— бронь стола ——— */
  const bookForm = $('#book');
  if (bookForm) {
    const dateEl = $('#b-date');
    const today = new Date().toISOString().slice(0, 10);
    dateEl.min = today; dateEl.value = today;
    $('#b-tel').addEventListener('input', maskTel);

    // столы: занятость зависит от времени — чтобы демо выглядело живым
    const tables = [['Стол 1', 'у окна, 2'], ['Стол 4', 'у окна, 4'], ['Стол 7', 'зал, 4'], ['Стол 9', 'зал, 6'], ['Стол 12', 'терраса, 4'], ['Стол 14', 'терраса, 6']];
    const paintTables = () => {
      const h = parseInt($('#b-time').value, 10);
      $('#tables').innerHTML = tables.map((t, i) => {
        const busy = (h + i) % 4 === 0;
        return `<label class="table-pick"><input type="radio" name="table" value="${t[0]}"${busy ? ' disabled' : ''}${!busy && i === 1 ? ' checked' : ''}>
          <span><b>${t[0]}</b>${busy ? 'занят' : t[1]}</span></label>`;
      }).join('');
    };
    $('#b-time').addEventListener('change', paintTables);
    paintTables();

    bookForm.addEventListener('submit', e => {
      e.preventDefault();
      if ($('#b-hp').value) return;
      const n = $('#b-name'), t = $('#b-tel');
      let ok = bad(n, !n.value.trim());
      ok = bad(t, !telOk(t.value)) && ok;
      if (!ok) { $('[aria-invalid="true"]', bookForm)?.focus(); return; }

      const tbl = $('input[name=table]:checked')?.value || 'любой свободный';
      window.track?.('booking_done');
      bookForm.innerHTML = `<div class="done">
        <div class="done__mark"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
        <h3>Стол забронирован</h3>
        <p class="muted">${tbl}, ${$('#b-date').value.split('-').reverse().join('.')} в ${$('#b-time').value}, гостей: ${$('#b-guests').value}.<br>Придержим 15 минут после времени брони.</p>
        <p class="note" style="margin-top:22px">Это демонстрационный сайт. Бронь никуда не отправлена — на рабочем проекте отсюда уходит уведомление администратору.</p>
      </div>`;
    });
  }

  paint();
})();
