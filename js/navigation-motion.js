/* Bottom navigation and a reversible, scroll-driven portrait-to-logo transition. */
(() => {
  "use strict";

  const initializeNavigationMotion = () => {
    const root = document.documentElement;
    const header = document.querySelector(".site-header");
    const links = [...document.querySelectorAll(".site-nav-link")];
    const sections = ["home", "projects", "about", "certificates", "contact"]
      .map((id) => document.getElementById(id)).filter(Boolean);
    const source = document.querySelector(".portrait-image");
    const origin = document.querySelector(".portrait-image-wrap");
    const destination = document.querySelector(".navbar-avatar");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clamp = (value) => Math.min(1, Math.max(0, value));
    const mix = (from, to, progress) => from + (to - from) * progress;
    let frame = 0;
    let needsMeasurement = true;
    let sectionPositions = [];
    let headerHeight = 0;
    let documentHeight = 0;
    let activeSection = "";
    let geometry = null;
    let floatingPortrait = null;
    let floatingImage = null;

    // Clone the image only for the visual transition. The hero remains the single
    // editable source; its dimensions stay reserved, so the page never jumps.
    if (source && origin && destination) {
      floatingPortrait = document.createElement("div");
      floatingPortrait.className = "scroll-portrait";
      floatingPortrait.setAttribute("aria-hidden", "true");
      floatingPortrait.hidden = true;
      floatingImage = document.createElement("img");
      floatingImage.alt = "";
      floatingImage.decoding = "async";
      floatingPortrait.append(floatingImage);
      document.body.append(floatingPortrait);
      document.body.classList.add("photo-motion-ready");
    }

    const markSection = (id) => {
      if (id === activeSection) return;
      activeSection = id;
      links.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const measure = () => {
      const scrollY = window.scrollY;
      const headerBounds = header?.getBoundingClientRect();
      headerHeight = headerBounds?.height || 0;
      documentHeight = root.scrollHeight;
      sectionPositions = sections.map((section) => ({
        id: section.id,
        top: section.getBoundingClientRect().top + scrollY,
      }));

      if (!floatingPortrait) return;
      const start = origin.getBoundingClientRect();
      const target = destination.getBoundingClientRect();
      const documentTop = start.top + scrollY;
      const headerBottom = headerBounds?.bottom || 0;
      const startScroll = Math.max(0, documentTop - headerBottom - 120);
      // On phones the photo appears below the introduction. Measure its actual
      // location rather than starting the movement before the photo is visible.
      const endScroll = Math.max(startScroll + 180, documentTop + start.height * 0.62 - headerBottom);
      geometry = {
        left: start.left,
        top: documentTop,
        width: start.width,
        height: start.height,
        radius: parseFloat(getComputedStyle(origin).borderTopLeftRadius) || 6,
        target: { left: target.left, top: target.top, width: target.width, height: target.height },
        startScroll,
        endScroll,
      };

      const imageSource = source.currentSrc || source.src;
      if (floatingImage.getAttribute("src") !== imageSource) floatingImage.src = imageSource;
      const sourceStyles = getComputedStyle(source);
      floatingImage.style.objectFit = sourceStyles.objectFit;
      floatingImage.style.objectPosition = sourceStyles.objectPosition;
    };

    const update = () => {
      frame = 0;
      if (needsMeasurement) {
        measure();
        needsMeasurement = false;
      }
      const scrollY = window.scrollY;
      const activationLine = scrollY + headerHeight + Math.min(window.innerHeight * 0.22, 150);
      let current = sectionPositions[0]?.id;
      sectionPositions.forEach((section) => {
        if (section.top <= activationLine) current = section.id;
      });
      // Short final sections should still highlight when the footer is reached.
      if (scrollY > 0 && scrollY + window.innerHeight >= documentHeight - 4) {
        current = sectionPositions[sectionPositions.length - 1]?.id;
      }
      if (current) markSection(current);

      if (!geometry || !floatingPortrait) return;
      const raw = clamp((scrollY - geometry.startScroll) / (geometry.endScroll - geometry.startScroll));
      // Reduced motion uses an immediate swap at the docking point.
      let progress = reducedMotion.matches ? (raw >= 1 ? 1 : 0) : raw * raw * (3 - 2 * raw);
      const imageReady = source.complete && source.naturalWidth > 0
        && floatingImage.complete && floatingImage.naturalWidth > 0;
      if (!imageReady) progress = 0;

      root.style.setProperty("--portrait-progress", progress.toFixed(4));
      root.style.setProperty("--portrait-scene-opacity", ((1 - progress) ** 2).toFixed(4));
      document.body.classList.toggle("portrait-in-motion", progress > 0);
      document.body.classList.toggle("portrait-docked", progress === 1);
      floatingPortrait.hidden = progress === 0;
      if (!progress) return;

      const target = geometry.target;
      const width = mix(geometry.width, target.width, progress);
      const height = mix(geometry.height, target.height, progress);
      // Shrink near the photo column first, then glide left into the brand.
      // This keeps the traveling photo clear of the large introduction text.
      const x = mix(geometry.left, target.left, progress * progress);
      const y = mix(geometry.top - scrollY, target.top, progress);
      floatingPortrait.style.width = `${width.toFixed(2)}px`;
      floatingPortrait.style.height = `${height.toFixed(2)}px`;
      floatingPortrait.style.borderRadius = `${mix(geometry.radius, target.width / 2, progress).toFixed(2)}px`;
      floatingPortrait.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    };

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    const scheduleMeasurement = () => {
      needsMeasurement = true;
      scheduleUpdate();
    };

    // Scroll work is limited to one frame, with geometry reads only on resize or
    // content changes. Scrolling back to the top runs the same path in reverse.
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleMeasurement, { passive: true });
    window.addEventListener("load", scheduleMeasurement, { once: true });
    window.addEventListener("pageshow", scheduleMeasurement);
    window.visualViewport?.addEventListener("resize", scheduleMeasurement, { passive: true });
    // Collapse can reposition the brand after its height transition has ended.
    header?.addEventListener("shown.bs.collapse", scheduleMeasurement);
    header?.addEventListener("hidden.bs.collapse", scheduleMeasurement);
    reducedMotion.addEventListener("change", scheduleMeasurement);
    source?.addEventListener("load", scheduleMeasurement);
    source?.addEventListener("error", scheduleUpdate);
    floatingImage?.addEventListener("load", scheduleUpdate);

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(scheduleMeasurement);
      [header, origin, document.querySelector("main")].filter(Boolean).forEach((element) => observer.observe(element));
    }
    if (source && "MutationObserver" in window) {
      new MutationObserver(scheduleMeasurement).observe(source, {
        attributes: true, attributeFilter: ["src", "srcset", "sizes"],
      });
    }
    document.fonts?.ready.then(scheduleMeasurement);
    scheduleUpdate();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeNavigationMotion, { once: true });
  } else {
    initializeNavigationMotion();
  }
})();
