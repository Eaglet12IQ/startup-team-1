/* PiConstruct — cookie-баннер и отложенная загрузка Яндекс.Метрики.
   Счётчик (и его cookie) не подключаются, пока посетитель не согласится
   в баннере; выбор хранится в localStorage и больше не спрашивается.
   Код счётчика скопирован у Яндекса дословно — условия Метрики (п. 2.1.3)
   запрещают менять сам код; отложенным делается только момент запуска. */
(function () {
  "use strict";

  var STORAGE_KEY = "piconstruct-cookie-consent";
  var banner = document.getElementById("cookie-banner");

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* приватный режим */ }

  function loadMetrica() {
    if (window.__piconstructMetricaLoaded) return;
    window.__piconstructMetricaLoaded = true;

    /* Yandex.Metrika counter (id 112920547) — код Яндекса без изменений */
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=112920547', 'ym');

    ym(112920547, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
    /* /Yandex.Metrika counter */
  }

  if (saved === "granted") { loadMetrica(); return; }
  if (!banner || saved === "denied") return;

  banner.hidden = false;
  /* двойной rAF: браузер сначала отрисовывает стартовое состояние
     (opacity 0), иначе transition до первого кадра не сработает */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { banner.classList.add("is-visible"); });
  });

  function decide(choice) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) { /* приватный режим */ }
    banner.classList.remove("is-visible");
    setTimeout(function () { banner.hidden = true; }, 320); /* дольше transition */
    if (choice === "granted") loadMetrica();
  }

  var accept = banner.querySelector(".js-cookie-accept");
  var decline = banner.querySelector(".js-cookie-decline");
  if (accept) accept.addEventListener("click", function () { decide("granted"); });
  if (decline) decline.addEventListener("click", function () { decide("denied"); });
})();
