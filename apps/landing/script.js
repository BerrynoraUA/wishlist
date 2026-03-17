/* ============================
   WISHLY LANDING — script.js
   ============================ */

(function () {
  "use strict";

  // ---------- Navbar scroll effect ----------
  const nav = document.getElementById("nav");
  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Mobile menu ----------
  const burger = document.getElementById("navBurger");
  const mobileMenu = document.getElementById("mobileMenu");

  burger.addEventListener("click", () => {
    burger.classList.toggle("active");
    mobileMenu.classList.toggle("open");
  });

  // Close menu on link click
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      burger.classList.remove("active");
      mobileMenu.classList.remove("open");
    });
  });

  // ---------- Smooth scroll for anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        const offsetTop =
          target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: offsetTop, behavior: "smooth" });
      }
    });
  });

  // ---------- Intersection Observer — fade-in animations ----------
  const animatedElements = document.querySelectorAll("[data-animate]");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || "0", 10);
          setTimeout(() => {
            entry.target.classList.add("visible");
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  );

  animatedElements.forEach((el) => observer.observe(el));

  // ---------- Animated counters ----------
  const counters = document.querySelectorAll("[data-count]");
  let counterAnimated = false;

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !counterAnimated) {
          counterAnimated = true;
          animateCounters();
          counterObserver.disconnect();
        }
      });
    },
    { threshold: 0.3 },
  );

  if (counters.length > 0) {
    counterObserver.observe(counters[0].closest(".stats-bar"));
  }

  function animateCounters() {
    counters.forEach((counter) => {
      const target = parseInt(counter.dataset.count, 10);
      const duration = 2000;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);

        counter.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          counter.textContent = target.toLocaleString();
        }
      }

      requestAnimationFrame(update);
    });
  }

  // ---------- Interactive demo: color picker ----------
  const demoColors = document.querySelectorAll(".demo-color");
  demoColors.forEach((color) => {
    color.addEventListener("click", () => {
      demoColors.forEach((c) => c.classList.remove("demo-color--active"));
      color.classList.add("demo-color--active");
    });
  });

  // ---------- Interactive demo: privacy toggle ----------
  const privacyOptions = document.querySelectorAll(".demo-privacy__option");
  privacyOptions.forEach((option) => {
    option.addEventListener("click", () => {
      privacyOptions.forEach((o) =>
        o.classList.remove("demo-privacy__option--active"),
      );
      option.classList.add("demo-privacy__option--active");
    });
  });

  // ---------- Interactive demo: reserve heart toggle ----------
  const reserveBtns = document.querySelectorAll(".demo-reserve-item__btn");
  reserveBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const isActive = btn.classList.toggle("demo-reserve-item__btn--active");
      btn.textContent = isActive ? "❤️" : "🤍";
      btn.style.transform = "scale(1.3)";
      setTimeout(() => {
        btn.style.transform = "";
      }, 200);
    });
  });
})();
