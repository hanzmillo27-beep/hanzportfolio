/* Small, dependency-free interactions for the portfolio. */
(() => {
  "use strict";

  const initializePortfolio = () => {
    const year = document.querySelector("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    // The card movement follows a mouse or trackpad and respects motion settings.
    const cards = [...document.querySelectorAll(".tilt-card")];
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cardStates = new Map();

    const resetCard = (card) => {
      const state = cardStates.get(card);
      if (state?.frame) window.cancelAnimationFrame(state.frame);
      if (state) state.frame = 0;
      card.style.setProperty("--rotate-x", "0deg");
      card.style.setProperty("--rotate-y", "0deg");
      card.style.setProperty("--glow-x", "50%");
      card.style.setProperty("--glow-y", "50%");
    };

    const tiltEnabled = () => finePointer.matches && !reducedMotion.matches;

    cards.forEach((card) => {
      const state = { frame: 0, x: 0.5, y: 0.5 };
      cardStates.set(card, state);

      card.addEventListener("pointermove", (event) => {
        if (!tiltEnabled() || event.pointerType === "touch") return;

        const bounds = card.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        state.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        state.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

        if (state.frame) return;
        state.frame = window.requestAnimationFrame(() => {
          state.frame = 0;
          if (!tiltEnabled()) return;
          card.style.setProperty("--rotate-x", `${((0.5 - state.y) * 10).toFixed(2)}deg`);
          card.style.setProperty("--rotate-y", `${((state.x - 0.5) * 10).toFixed(2)}deg`);
          card.style.setProperty("--glow-x", `${(state.x * 100).toFixed(1)}%`);
          card.style.setProperty("--glow-y", `${(state.y * 100).toFixed(1)}%`);
        });
      }, { passive: true });

      card.addEventListener("pointerleave", () => resetCard(card));
      card.addEventListener("pointercancel", () => resetCard(card));
      card.addEventListener("focusout", () => resetCard(card));
    });

    const resetCards = () => cards.forEach(resetCard);
    finePointer.addEventListener("change", resetCards);
    reducedMotion.addEventListener("change", resetCards);

    // Customize preview text, images, and tags with each button's data attributes.
    const dialog = document.querySelector("#preview-dialog");
    if (dialog) {
      const previewImage = dialog.querySelector("#preview-image");
      const previewCategory = dialog.querySelector("#preview-category");
      const previewTitle = dialog.querySelector("#preview-title");
      const previewDescription = dialog.querySelector("#preview-description");
      const previewTags = dialog.querySelector("#preview-tags");
      const previewFile = dialog.querySelector("#preview-file");
      let trigger = null;

      const restoreFocus = () => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        trigger = null;
      };

      const closePreview = () => {
        if (typeof dialog.close === "function") {
          dialog.close();
        } else {
          dialog.removeAttribute("open");
          restoreFocus();
        }
      };

      document.querySelectorAll("[data-preview]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          trigger = button;

          const title = button.dataset.title || "Portfolio preview";
          if (previewTitle) previewTitle.textContent = title;
          if (previewCategory) previewCategory.textContent = button.dataset.category || "";
          if (previewDescription) previewDescription.textContent = button.dataset.description || "";
          if (previewImage) {
            const source = button.dataset.image;
            previewImage.hidden = !source;
            previewImage.alt = `${title} preview`;
            if (source) previewImage.src = source;
            else previewImage.removeAttribute("src");
          }
          if (previewFile) {
            const file = button.dataset.file;
            previewFile.hidden = !file;
            previewFile.textContent = file ? button.dataset.fileLabel || "Open original file" : "";
            if (file) previewFile.href = file;
            else previewFile.removeAttribute("href");
          }
          if (previewTags) {
            previewTags.replaceChildren();
            (button.dataset.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).forEach((tag) => {
              const span = document.createElement("span");
              span.className = "tech-tag";
              span.textContent = tag;
              previewTags.append(span);
            });
          }

          if (!dialog.open) {
            if (typeof dialog.showModal === "function") dialog.showModal();
            else {
              dialog.setAttribute("open", "");
              dialog.querySelector("[data-close-dialog]")?.focus();
            }
          }
        });
      });

      dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
        button.addEventListener("click", closePreview);
      });
      dialog.addEventListener("close", restoreFocus);
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        const outside = event.clientX < bounds.left || event.clientX > bounds.right
          || event.clientY < bounds.top || event.clientY > bounds.bottom;
        if (outside) closePreview();
      });
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && typeof dialog.showModal !== "function") {
          event.preventDefault();
          closePreview();
        }
      });
    }

    // Close Bootstrap's mobile navigation after choosing a destination.
    const navigation = document.querySelector("#site-navigation");
    navigation?.querySelectorAll("a[href^='#']").forEach((link) => {
      link.addEventListener("click", () => {
        const Collapse = window.bootstrap?.Collapse;
        if (!Collapse || !navigation.classList.contains("show")) return;
        const instance = Collapse.getInstance(navigation)
          || Collapse.getOrCreateInstance?.(navigation, { toggle: false });
        instance?.hide();
      });
    });

    // Section highlighting and the scroll-to-logo effect live in navigation-motion.js.
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePortfolio, { once: true });
  } else {
    initializePortfolio();
  }
})();
