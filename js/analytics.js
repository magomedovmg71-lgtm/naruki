// Аналитика. Впишите номера счётчиков — код подключится сам.
// Пустые значения = ничего не грузится и не отправляется.
window.YM_ID = '';   // Яндекс Метрика, номер счётчика: 98765432
window.GA_ID = '';   // Google Analytics: G-XXXXXXXXXX

(() => {
  const { YM_ID, GA_ID } = window;

  if (YM_ID) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = +new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    ym(YM_ID, 'init', { webvisor: true, clickmap: true, accurateTrackBounce: true, trackLinks: true });
  }

  if (GA_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  // Единая точка: main.js зовёт track('order_done', { sum: 840 })
  window.track = (goal, params) => {
    if (YM_ID && window.ym) ym(YM_ID, 'reachGoal', goal, params);
    if (GA_ID && window.gtag) gtag('event', goal, params);
  };

  // Клики по телефону, мессенджерам и картам — без ручной разметки ссылок
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const h = a.getAttribute('href');
    if (h.startsWith('tel:')) track('click_phone');
    else if (h.includes('wa.me')) track('click_whatsapp');
    else if (h.includes('t.me')) track('click_telegram');
    else if (h.includes('2gis') || h.includes('yandex.ru/maps')) track('click_map');
  });
})();
