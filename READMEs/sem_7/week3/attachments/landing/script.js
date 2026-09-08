/* PiConstruct — лендинг: тема, мобильное меню, появление секций, форма заявки. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ── Тема ──
     По умолчанию тема следует системной (CSS @media prefers-color-scheme).
     Кнопка фиксирует выбор атрибутом data-theme="light"|"dark" и хранит
     его в localStorage до сброса. */
  var THEME_KEY = "piconstruct-theme";
  var themeToggle = document.getElementById("theme-toggle");

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function currentTheme() {
    return root.getAttribute("data-theme") || systemTheme();
  }

  function applyTheme(theme, persist) {
    if (persist) {
      root.setAttribute("data-theme", theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* приватный режим */ }
    } else {
      root.removeAttribute("data-theme");
    }
  }

  try {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) { /* приватный режим */ }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }

  /* ── Мобильное меню ── */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("site-nav");

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ── Появление блоков при скролле ── */
  var revealed = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px" });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ── FAQ: плавное раскрытие карточек ──
     Нативное мгновенное переключение <details> заменяем анимацией высоты:
     перехватываем клик по summary (preventDefault), сами открываем/закрываем
     details и анимируем высоту и нижний паддинг тела. Без JS детали
     работают как обычные <details>. */
  var FAQ_DURATION = 300;
  var FAQ_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

  document.querySelectorAll(".faq-item").forEach(function (item) {
    var summary = item.querySelector("summary");
    var body = item.querySelector(".faq-body");
    if (!summary || !body) return;

    summary.addEventListener("click", function (e) {
      e.preventDefault();
      if (item.dataset.animating) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        item.open = !item.open;
        return;
      }

      var opening = !item.open;
      if (opening) item.open = true; // контент в DOM, иначе не измерить
      var pad = parseFloat(getComputedStyle(body).paddingBottom);
      var fullH = body.offsetHeight; // вся высота с паддингом: box-sizing border-box

      item.dataset.animating = "1";
      if (!opening) item.classList.add("is-closing");

      body.style.overflow = "hidden";
      body.style.height = opening ? "0px" : fullH + "px";
      body.style.paddingBottom = opening ? "0px" : pad + "px";
      void body.offsetHeight; // фиксируем стартовые значения до перехода
      body.style.transition =
        "height " + FAQ_DURATION + "ms " + FAQ_EASING + ", padding-bottom " + FAQ_DURATION + "ms " + FAQ_EASING;
      body.style.height = opening ? fullH + "px" : "0px";
      body.style.paddingBottom = opening ? pad + "px" : "0px";

      var done = false;
      function finish() {
        if (done) return;
        done = true;
        if (!opening) item.open = false;
        delete item.dataset.animating;
        item.classList.remove("is-closing");
        body.style.height = "";
        body.style.overflow = "";
        body.style.paddingBottom = "";
        body.style.transition = "";
      }
      body.addEventListener("transitionend", function onEnd(ev) {
        if (ev.target !== body || ev.propertyName !== "height") return;
        body.removeEventListener("transitionend", onEnd);
        finish();
      });
      setTimeout(finish, FAQ_DURATION + 80); // transitionend может не прийти
    });
  });

  /* ── Форма заявки: собираем письмо и открываем почтовый клиент ── */
  var APPLY_EMAIL = "hello@piconstruct.ru"; // TODO(команда): заменить на реальный адрес
  var form = document.getElementById("apply-form");
  var status = document.getElementById("form-status");

  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var contact = String(data.get("contact") || "").trim();
      var message = String(data.get("message") || "").trim();

      var subject = "Заявка с лендинга PiConstruct — " + name;
      var body =
        "Имя: " + name + "\n" +
        "Контакт: " + contact + "\n" +
        (message ? "Комментарий: " + message + "\n" : "") +
        "\n— отправлено с лендинга PiConstruct";

      window.location.href =
        "mailto:" + APPLY_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      status.classList.add("visible");
    });
  }
})();
