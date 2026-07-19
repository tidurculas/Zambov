(() => {
  "use strict";

  const introDeck = document.getElementById("introDeck");
  const introSlides = [...document.querySelectorAll("[data-slide]")];
  const introBack = document.getElementById("introBack");
  const introNext = document.getElementById("introNext");
  const introHint = document.getElementById("introHint");
  const introProgress = document.getElementById("introProgress");
  const startButton = document.getElementById("startButton");

  const poemExperience = document.getElementById("poemExperience");
  const poemSlides = [...document.querySelectorAll("[data-poem-slide]")];
  const poemBack = document.getElementById("poemBack");
  const poemNext = document.getElementById("poemNext");
  const poemProgress = document.getElementById("poemProgress");
  const poemCounter = document.getElementById("poemCounter");

  const audio = document.getElementById("audio");
  const audioControl = document.getElementById("audioControl");
  const videoBack = document.getElementById("videoBack");
  const videoFront = document.getElementById("videoFront");
  const mediaBackground = document.querySelector(".media-background");
  const statusToast = document.getElementById("statusToast");

  let introIndex = 0;
  let poemIndex = 0;
  let mode = "intro";
  let wheelLocked = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let toastTimer;

  function splitWords() {
    document.querySelectorAll('[data-reveal="words"] p').forEach((paragraph) => {
      if (paragraph.dataset.prepared === "true") return;

      const words = paragraph.textContent.trim().split(/\s+/);
      paragraph.textContent = "";

      words.forEach((word, index) => {
        const span = document.createElement("span");
        span.className = "word";
        span.style.setProperty("--word-index", index);
        span.textContent = word;
        paragraph.append(span);
        if (index < words.length - 1) paragraph.append(" ");
      });

      paragraph.dataset.prepared = "true";
    });
  }

  function preparePoemLines() {
    poemSlides.forEach((slide) => {
      const lines = [...slide.querySelectorAll("p")];
      lines.forEach((line, index) => line.style.setProperty("--line-index", index));
    });
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    statusToast.textContent = message;
    statusToast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => statusToast.classList.remove("is-visible"), 2400);
  }

  function updateSlides(slides, index) {
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === index);
      slide.classList.toggle("is-before", slideIndex < index);
    });
  }

  function updateIntro(index, announce = false) {
    introIndex = Math.max(0, Math.min(index, introSlides.length - 1));
    const isReadySlide = introIndex === introSlides.length - 1;

    updateSlides(introSlides, introIndex);
    introProgress.style.width = `${((introIndex + 1) / introSlides.length) * 100}%`;
    introHint.style.opacity = isReadySlide ? "0" : "";
    introDeck.classList.toggle("is-ready", isReadySlide);

    /*
      The invisible left/right navigation layers cover most of the viewport.
      Disable them on the final intro slide so they cannot sit above Start.
      Swipe, keyboard, and the Start button continue to work normally.
    */
    introBack.disabled = isReadySlide;
    introNext.disabled = isReadySlide;

    if (announce) {
      introSlides[introIndex].setAttribute("aria-live", "polite");
    }
  }

  function updatePoem(index) {
    poemIndex = Math.max(0, Math.min(index, poemSlides.length - 1));
    updateSlides(poemSlides, poemIndex);
    poemProgress.style.width = `${((poemIndex + 1) / poemSlides.length) * 100}%`;
    poemCounter.textContent = `${String(poemIndex + 1).padStart(2, "0")} / ${String(poemSlides.length).padStart(2, "0")}`;
  }

  function next() {
    if (mode === "intro") {
      if (introIndex < introSlides.length - 1) updateIntro(introIndex + 1, true);
      return;
    }

    if (mode === "poem" && poemIndex < poemSlides.length - 1) {
      updatePoem(poemIndex + 1);
    }
  }

  function previous() {
    if (mode === "intro") {
      if (introIndex > 0) updateIntro(introIndex - 1, true);
      return;
    }

    if (mode === "poem" && poemIndex > 0) {
      updatePoem(poemIndex - 1);
    }
  }

  function fadeAudio(target, duration = 1600) {
    const start = audio.volume;
    const startedAt = performance.now();

    function frame(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      audio.volume = start + (target - start) * eased;
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  async function playMedia() {
    audio.volume = 0;

    /*
      Start audio immediately inside the user's click event. This is important
      on iPhone/Safari, where playback may be blocked after an awaited promise.
    */
    const audioPromise = audio.play();

    [videoBack, videoFront].forEach((video) => {
      video.play()
        .then(() => mediaBackground.classList.add("has-video"))
        .catch(() => {
          // The fallback background remains visible if the video is absent or blocked.
        });
    });

    try {
      await audioPromise;
      audioControl.classList.remove("is-paused");
      audioControl.setAttribute("aria-label", "Pause music");
      audioControl.setAttribute("aria-pressed", "false");
      fadeAudio(0.42, 1900);
    } catch (_) {
      audioControl.classList.add("is-paused");
      audioControl.setAttribute("aria-label", "Play music");
      audioControl.setAttribute("aria-pressed", "true");
      showToast("Add assets/audio.mp3 to enable the music.");
    }
  }

  async function beginExperience() {
    if (mode !== "intro") return;

    mode = "transition";
    startButton.disabled = true;
    introDeck.classList.add("is-leaving");

    await playMedia();

    window.setTimeout(() => {
      poemExperience.classList.add("is-active");
      poemExperience.setAttribute("aria-hidden", "false");
      updatePoem(0);
      mode = "poem";
    }, 420);

    window.setTimeout(() => {
      introDeck.style.display = "none";
    }, 1250);
  }

  async function toggleAudio() {
    if (audio.paused) {
      try {
        audio.volume = Math.min(audio.volume || 0.18, 0.42);
        await audio.play();
        audioControl.classList.remove("is-paused");
        audioControl.setAttribute("aria-label", "Pause music");
        audioControl.setAttribute("aria-pressed", "false");
        fadeAudio(0.42, 700);
      } catch (_) {
        showToast("The music file could not be played.");
      }
    } else {
      audio.pause();
      audioControl.classList.add("is-paused");
      audioControl.setAttribute("aria-label", "Play music");
      audioControl.setAttribute("aria-pressed", "true");
    }
  }

  function handleWheel(event) {
    if (wheelLocked || Math.abs(event.deltaY) < 15) return;
    wheelLocked = true;
    event.deltaY > 0 ? next() : previous();
    window.setTimeout(() => { wheelLocked = false; }, 720);
  }

  function handleTouchStart(event) {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(event) {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const distance = horizontal ? Math.abs(dx) : Math.abs(dy);

    if (distance < 45) return;

    if (horizontal) {
      dx < 0 ? next() : previous();
    } else {
      dy < 0 ? next() : previous();
    }
  }

  splitWords();
  preparePoemLines();
  updateIntro(0);
  updatePoem(0);

  introNext.addEventListener("click", next);
  introBack.addEventListener("click", previous);
  poemNext.addEventListener("click", next);
  poemBack.addEventListener("click", previous);
  startButton.addEventListener("click", beginExperience);
  audioControl.addEventListener("click", toggleAudio);

  document.addEventListener("keydown", (event) => {
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      next();
    }
    if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      previous();
    }
    if (event.key === "Enter" && mode === "intro" && introIndex === introSlides.length - 1) {
      beginExperience();
    }
  });

  document.addEventListener("wheel", handleWheel, { passive: true });
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });

  videoBack.addEventListener("loadeddata", () => mediaBackground.classList.add("has-video"));
  videoBack.addEventListener("error", () => mediaBackground.classList.remove("has-video"));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      [videoBack, videoFront].forEach((video) => video.pause());
      if (!audio.paused) audio.pause();
    } else if (mode === "poem") {
      [videoBack, videoFront].forEach((video) => video.play().catch(() => {}));
    }
  });
})();
