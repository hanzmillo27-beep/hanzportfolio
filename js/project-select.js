/* A manual arcade selector: every project remains visible and available. */
(() => {
  "use strict";

  const initializeProjectSelect = () => {
    const selector = document.getElementById("project-select");
    if (!selector) return;

    const cards = [...selector.querySelectorAll("[data-project-card]")];
    if (!cards.length) return;
    const label = document.getElementById("project-selection-label");
    let selectedIndex = Math.max(0, cards.findIndex((card) => card.classList.contains("is-selected")));

    const selectCard = (index) => {
      selectedIndex = index;
      cards.forEach((card, position) => card.classList.toggle("is-selected", position === index));
      const title = cards[index].querySelector("h3")?.textContent.trim() || "Project";
      if (label && label.textContent !== title) label.textContent = title;
    };

    cards.forEach((card, index) => {
      card.addEventListener("pointerenter", () => selectCard(index));
      card.addEventListener("focusin", () => selectCard(index));
      card.addEventListener("pointerdown", () => selectCard(index));
    });

    selector.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const focusedIndex = cards.findIndex((card) => card.contains(document.activeElement));
      const currentIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex;
      let nextIndex;

      switch (event.key) {
        case "ArrowLeft":
          nextIndex = (currentIndex - 1 + cards.length) % cards.length;
          break;
        case "ArrowRight":
          nextIndex = (currentIndex + 1) % cards.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = cards.length - 1;
          break;
        default:
          return;
      }

      const previewButton = cards[nextIndex].querySelector("button[data-preview]");
      if (!previewButton) return;
      event.preventDefault();
      selectCard(nextIndex);
      previewButton.focus();
    });

    // Normalize the initial highlight without moving keyboard focus.
    selectCard(selectedIndex);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeProjectSelect, { once: true });
  } else {
    initializeProjectSelect();
  }
})();
