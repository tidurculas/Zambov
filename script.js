(() => {
  "use strict";

  const PHOTO_FILES = [
    'assets/photo-01.jpg',
    'assets/photo-02.jpg',
    'assets/photo-03.jpg',
    'assets/photo-04.jpg',
    'assets/photo-05.jpg',
    'assets/photo-06.jpg',
    'assets/photo-07.jpg',
    'assets/photo-08.jpg',
    'assets/photo-09.jpg',
    'assets/photo-10.jpg',
    'assets/photo-11.jpg',
    'assets/photo-12.jpg',
    'assets/photo-13.jpg',
    'assets/photo-14.jpg',
    'assets/photo-15.jpg',
    'assets/photo-16.jpg',
    'assets/photo-17.jpg',
    'assets/photo-18.jpg',
    'assets/photo-19.jpg',
    'assets/photo-20.jpg',
    'assets/photo-21.jpg',
    'assets/photo-22.jpg',
    'assets/photo-23.jpg',
    'assets/photo-24.jpg'
  ];
  const PHOTO_HOLD_MS = 3000;
  const PHOTO_FADE_MS = 1000;

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
  const photoBack = document.getElementById("photoBack");
  const photoFront = document.getElementById("photoFront");
  const statusToast = document.getElementById("statusToast");
  const eightSlide = document.querySelector(".eight-slide");
  const finalSlide = document.querySelector(".final-slide");

  let introIndex = 0;
  let poemIndex = 0;
  let mode = "intro";
  let wheelLocked = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let toastTimer;
  let activePhotoLayer = 0;
  let currentPhotoIndex = 0;
  let photoTimer = null;
  let photoTransitioning = false;
  let slideshowStarted = false;
  let freezeRequested = false;
  let finalLocked = false;
  let finalUiTimer = null;
  let eightTransformTimer = null;
  let afterthoughtTimer = null;
  let afterthoughtRemainingMs = 180000;
  let afterthoughtVisibleStartedAt = null;

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
    introBack.disabled = isReadySlide;
    introNext.disabled = isReadySlide;
    if (announce) introSlides[introIndex].setAttribute("aria-live", "polite");
  }

  function resetEight() {
    window.clearTimeout(eightTransformTimer);
    eightSlide.classList.remove("is-infinity");
  }

  function playEightTransition() {
    resetEight();
    eightTransformTimer = window.setTimeout(() => {
      eightSlide.classList.add("is-infinity");
    }, 750);
  }

  function clearAfterthoughtTimer(reset = false) {
    window.clearTimeout(afterthoughtTimer);
    afterthoughtTimer = null;
    afterthoughtVisibleStartedAt = null;

    if (reset) {
      afterthoughtRemainingMs = 180000;
      finalSlide.classList.remove("show-afterthought");
    }
  }

  function showAfterthought() {
    clearAfterthoughtTimer(false);
    afterthoughtRemainingMs = 0;
    finalSlide.classList.add("show-afterthought");
  }

  function scheduleAfterthought() {
    if (!finalLocked || finalSlide.classList.contains("show-afterthought")) return;
    if (document.hidden) return;

    window.clearTimeout(afterthoughtTimer);
    afterthoughtVisibleStartedAt = performance.now();
    afterthoughtTimer = window.setTimeout(showAfterthought, afterthoughtRemainingMs);
  }

  function pauseAfterthoughtCountdown() {
    if (!afterthoughtTimer || afterthoughtVisibleStartedAt === null) return;

    const elapsed = performance.now() - afterthoughtVisibleStartedAt;
    afterthoughtRemainingMs = Math.max(0, afterthoughtRemainingMs - elapsed);
    window.clearTimeout(afterthoughtTimer);
    afterthoughtTimer = null;
    afterthoughtVisibleStartedAt = null;
  }

  function maybeFreezeAtFinal(index) {
    const isFinal = index === poemSlides.length - 1;
    if (!isFinal) return;
    finalLocked = true;
    freezeRequested = true;
    clearAfterthoughtTimer(true);
    scheduleAfterthought();
    clearTimeout(photoTimer);
    if (!photoTransitioning) {
      stopSlideshow();
    }
    clearTimeout(finalUiTimer);
    finalUiTimer = window.setTimeout(() => {
      poemExperience.classList.add("is-ending");
    }, 900);
  }

  function updatePoem(index) {
    const previousPoemIndex = poemIndex;
    poemIndex = Math.max(0, Math.min(index, poemSlides.length - 1));

    const eightIndex = poemSlides.indexOf(eightSlide);
    if (poemIndex === eightIndex && previousPoemIndex !== eightIndex) {
      playEightTransition();
    } else if (poemIndex !== eightIndex && previousPoemIndex === eightIndex) {
      resetEight();
    }

    updateSlides(poemSlides, poemIndex);
    poemProgress.style.width = `${((poemIndex + 1) / poemSlides.length) * 100}%`;
    poemCounter.textContent = `${String(poemIndex + 1).padStart(2, "0")} / ${String(poemSlides.length).padStart(2, "0")}`;
    maybeFreezeAtFinal(poemIndex);
  }

  function next() {
    if (mode === "intro") {
      if (introIndex < introSlides.length - 1) updateIntro(introIndex + 1, true);
      return;
    }
    if (mode === "poem" && !finalLocked && poemIndex < poemSlides.length - 1) updatePoem(poemIndex + 1);
  }

  function previous() {
    if (mode === "intro") {
      if (introIndex > 0) updateIntro(introIndex - 1, true);
      return;
    }
    if (mode === "poem" && !finalLocked && poemIndex > 0) updatePoem(poemIndex - 1);
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

  function getLayers() {
    return activePhotoLayer === 0 ? [photoBack, photoFront] : [photoFront, photoBack];
  }

  function setLayerImage(layer, src) {
    layer.style.backgroundImage = `url('${src}')`;
  }

  function preloadPhotos() {
    PHOTO_FILES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  function stopSlideshow() {
    clearTimeout(photoTimer);
    photoTimer = null;
    slideshowStarted = false;
    photoTransitioning = false;
  }

  function scheduleNextPhoto(delay = PHOTO_HOLD_MS) {
    if (freezeRequested || finalLocked) return;
    clearTimeout(photoTimer);
    photoTimer = window.setTimeout(advancePhoto, delay);
  }

  function initializeSlideshow() {
    currentPhotoIndex = Math.floor(Math.random() * PHOTO_FILES.length);
    const initial = PHOTO_FILES[currentPhotoIndex];
    setLayerImage(photoBack, initial);
    setLayerImage(photoFront, initial);
    photoBack.classList.add("is-visible");
    photoFront.classList.remove("is-visible");
    activePhotoLayer = 0;
    freezeRequested = false;
    finalLocked = false;
    slideshowStarted = true;
    preloadPhotos();
    scheduleNextPhoto(PHOTO_HOLD_MS);
  }

  function advancePhoto() {
    if (freezeRequested || finalLocked) return stopSlideshow();
    if (!PHOTO_FILES.length) return;

    photoTransitioning = true;
    const [activeLayer, incomingLayer] = getLayers();
    const nextIndex = (currentPhotoIndex + 1) % PHOTO_FILES.length;
    const nextSrc = PHOTO_FILES[nextIndex];
    setLayerImage(incomingLayer, nextSrc);

    requestAnimationFrame(() => {
      incomingLayer.classList.add("is-visible");
      activeLayer.classList.remove("is-visible");
    });

    window.setTimeout(() => {
      activePhotoLayer = activePhotoLayer === 0 ? 1 : 0;
      currentPhotoIndex = nextIndex;
      photoTransitioning = false;
      if (freezeRequested || finalLocked) {
        stopSlideshow();
        return;
      }
      scheduleNextPhoto(PHOTO_HOLD_MS);
    }, PHOTO_FADE_MS + 40);
  }

  async function playMedia() {
    audio.volume = 0;
    const audioPromise = audio.play();
    if (!slideshowStarted) initializeSlideshow();
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
      showToast("The music file could not be played.");
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
    window.setTimeout(() => { introDeck.style.display = "none"; }, 1250);
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
      } catch (_) { showToast("The music file could not be played."); }
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
    if (horizontal) { dx < 0 ? next() : previous(); }
    else { dy < 0 ? next() : previous(); }
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
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); next(); }
    if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); previous(); }
    if (event.key === "Enter" && mode === "intro" && introIndex === introSlides.length - 1) beginExperience();
  });

  document.addEventListener("wheel", handleWheel, { passive: true });
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(photoTimer);
      pauseAfterthoughtCountdown();
      if (!audio.paused) audio.pause();
      return;
    }

    if (mode === "poem" && !finalLocked) {
      scheduleNextPhoto(900);
    }

    if (finalLocked && afterthoughtRemainingMs > 0) {
      scheduleAfterthought();
    }
  });
})();
