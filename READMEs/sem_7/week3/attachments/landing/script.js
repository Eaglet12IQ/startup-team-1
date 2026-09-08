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
