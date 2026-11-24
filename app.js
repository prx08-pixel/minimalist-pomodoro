/**
 * Phase 1 — structural grid assembly.
 * Shuffled puzzle blocks of the source painting snap on at full opacity.
 * No clocks, blurs, dots, or fades in the viewport.
 */

import { getRandomArtwork } from "./artData.js";
import { initChrome } from "./chrome.js";

/* --------------------------------------------------------------------------
   Tunables
   -------------------------------------------------------------------------- */

const FOCUS_MINUTES_KEY = "pomodoro.focusMinutes";
const FOCUS_MINUTES_MIN = 10;
const FOCUS_MINUTES_MAX = 60;
const FOCUS_MINUTES_DEFAULT = 25;
const BREAK_MINUTES_KEY = "pomodoro.breakMinutes";
const BREAK_MINUTES_MIN = 2;
const BREAK_MINUTES_MAX = 15;
const BREAK_MINUTES_DEFAULT = 5;

function readStoredFocusMinutes() {
  const raw = Number(localStorage.getItem(FOCUS_MINUTES_KEY));
  if (!Number.isFinite(raw)) {
    return FOCUS_MINUTES_DEFAULT;
  }
  return Math.min(FOCUS_MINUTES_MAX, Math.max(FOCUS_MINUTES_MIN, Math.round(raw)));
}

let sessionMinutes = readStoredFocusMinutes();
let sessionDurationMs = sessionMinutes * 60 * 1000;
/** Wall-clock anchor for the active run (`Date.now()`). */
let startTime = 0;
/** Exclusive end anchor: startTime + focus length in ms. */
let endTime = 0;
/** Elapsed ms frozen while the session is paused. */
let pausedElapsedMs = 0;

function readStoredBreakMinutes() {
  const raw = Number(localStorage.getItem(BREAK_MINUTES_KEY));
  if (!Number.isFinite(raw)) {
    return BREAK_MINUTES_DEFAULT;
  }
  return Math.min(BREAK_MINUTES_MAX, Math.max(BREAK_MINUTES_MIN, Math.round(raw)));
}

let breakMinutes = readStoredBreakMinutes();

export function getFocusMinutes() {
  return sessionMinutes;
}

export function setFocusMinutes(minutes) {
  sessionMinutes = Math.min(
    FOCUS_MINUTES_MAX,
    Math.max(FOCUS_MINUTES_MIN, Math.round(minutes))
  );
  sessionDurationMs = sessionMinutes * 60 * 1000;
  localStorage.setItem(FOCUS_MINUTES_KEY, String(sessionMinutes));
  retargetClockToDuration();
}

export function getBreakMinutes() {
  return breakMinutes;
}

export function setBreakMinutes(minutes) {
  breakMinutes = Math.min(
    BREAK_MINUTES_MAX,
    Math.max(BREAK_MINUTES_MIN, Math.round(minutes))
  );
  localStorage.setItem(BREAK_MINUTES_KEY, String(breakMinutes));
}

function durationMsFromMinutes() {
  return sessionMinutes * 60 * 1000;
}

function getElapsedMs() {
  if (!startTime) {
    return pausedElapsedMs;
  }
  if (!isRunning) {
    return pausedElapsedMs;
  }
  return Math.max(0, Date.now() - startTime);
}

function getProgressFraction() {
  const totalSessionSeconds = sessionMinutes * 60;
  if (totalSessionSeconds <= 0) {
    return 0;
  }
  const elapsedSeconds = getElapsedMs() / 1000;
  return Math.min(elapsedSeconds / totalSessionSeconds, 1);
}

function bindClockFromElapsed(elapsedMs) {
  sessionDurationMs = durationMsFromMinutes();
  pausedElapsedMs = Math.max(0, Math.min(elapsedMs, sessionDurationMs));
  startTime = Date.now() - pausedElapsedMs;
  endTime = startTime + sessionDurationMs;
}

function resetClock() {
  startTime = 0;
  endTime = 0;
  pausedElapsedMs = 0;
  sessionDurationMs = durationMsFromMinutes();
}

function beginClock() {
  bindClockFromElapsed(pausedElapsedMs);
}

function freezeClock() {
  if (!startTime) {
    return;
  }
  pausedElapsedMs = Math.max(
    0,
    Math.min(durationMsFromMinutes(), Date.now() - startTime)
  );
}

function retargetClockToDuration() {
  sessionDurationMs = durationMsFromMinutes();
  if (!startTime) {
    progress = 0;
    return;
  }
  const elapsed = isRunning ? Date.now() - startTime : pausedElapsedMs;
  bindClockFromElapsed(elapsed);
  progress = getProgressFraction();
  paintNewTiles();
  if (progress >= 1 && !sessionComplete && sessionArmed) {
    finishSession();
  }
}

export async function resetGallerySession() {
  isRunning = false;
  sessionComplete = false;
  sessionArmed = false;
  resetClock();
  progress = 0;
  drawnCount = 0;
  chimePlayed = false;
  stopLoop();
  hideReveal();
  syncBreakUi();
  canvas.classList.add("is-clearing");
  await new Promise((resolve) => {
    window.setTimeout(resolve, 400);
  });
  fillWhite();
  await armSessionArtwork();
  canvas.classList.remove("is-clearing");
}

/* --------------------------------------------------------------------------
   Tunables
   -------------------------------------------------------------------------- */

const TILE_SIZE = 12 * 0.8 * 0.8;
/** Vertical stretch for the reveal wave (1.4–1.8). Higher = top/bottom finish sooner vs the sides. */
const ELLIPSE_Y_STRETCH = 1.6;
/** How far vanguard tiles can stray ahead of / behind the ellipse rim, in tile units. */
const RIM_NOISE_MULTIPLIER = 6;
const MAX_FRAME_DELTA_MS = 32;
const REVEAL_FADE_MS = 300;
const PARCHMENT_INNER = "#F7F4EB";
const PARCHMENT_MID = "#F0EBE0";
const PARCHMENT_OUTER = "#EAE5D8";

/* --------------------------------------------------------------------------
   DOM
   -------------------------------------------------------------------------- */

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d", { alpha: false });
const revealImage = document.getElementById("artwork-reveal");
const plaque = document.getElementById("plaque");
const plaqueTitle = document.getElementById("plaque-title");
const plaqueCulture = document.getElementById("plaque-culture");
const plaqueEra = document.getElementById("plaque-era");
const plaqueOrigin = document.getElementById("plaque-origin");
const plaqueCopy = document.getElementById("plaque-copy");
const plaqueClose = document.getElementById("plaque-close");
const infoBtn = document.getElementById("info-btn");

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */

let viewWidth = 0;
let viewHeight = 0;
let devicePixelRatioCurrent = 1;
let gridCols = 0;
let gridRows = 0;
let progress = 0;
let isRunning = false;
let sessionComplete = false;
let sessionArmed = false;
let lastTimestamp = 0;
let rafId = 0;

let artworkImage = null;
let artworkSrc = "";
let artworkReady = false;
let currentArtwork = null;

let cover = {
  offsetX: 0,
  offsetY: 0,
  drawWidth: 1,
  drawHeight: 1,
};

/** Shuffled draw order. Only tiles after `drawnCount` still need painting. */
/** @type {Tile[]} */
let shuffledTiles = [];
let drawnCount = 0;

let audioContext = null;
let chimePlayed = false;
let wasRunningWhenHidden = false;
let resizeTimer = 0;
let revealSettled = false;

/**
 * @typedef {object} Tile
 * @property {number} col
 * @property {number} row
 * @property {number} dx
 * @property {number} dy
 * @property {number} dw
 * @property {number} dh
 * @property {number} sx
 * @property {number} sy
 * @property {number} sw
 * @property {number} sh
 * @property {number} dist
 * @property {number} modifiedDist
 * @property {boolean} active
 */

/* --------------------------------------------------------------------------
   Math
   -------------------------------------------------------------------------- */

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * One-time rim scatter: fuzz elliptical distance, then sort.
 * Never runs inside the animation tick.
 */
function orderTilesCenterOut(list) {
  const tilePx = Math.max(4, Math.round(TILE_SIZE * devicePixelRatioCurrent));
  const spread = tilePx * RIM_NOISE_MULTIPLIER;

  for (let i = 0; i < list.length; i += 1) {
    const tile = list[i];
    const noise = (Math.random() - 0.5) * spread;
    tile.modifiedDist = tile.dist + noise;
  }

  list.sort((a, b) => a.modifiedDist - b.modifiedDist);
  return list;
}

function computeCoverLayout(image, width, height) {
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  let drawWidth;
  let drawHeight;
  let offsetX;
  let offsetY;

  if (imageRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
    offsetX = (width - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
    offsetX = 0;
    offsetY = (height - drawHeight) / 2;
  }

  return { offsetX, offsetY, drawWidth, drawHeight };
}

function fillMuseumGround(targetCtx, width, height) {
  if (!targetCtx || width < 1 || height < 1) {
    return;
  }

  const cx = width * 0.5;
  const cy = height * 0.5;
  const radius = Math.hypot(cx, cy);
  const gradient = targetCtx.createRadialGradient(
    cx,
    cy,
    radius * 0.12,
    cx,
    cy,
    radius
  );
  gradient.addColorStop(0, PARCHMENT_INNER);
  gradient.addColorStop(0.55, PARCHMENT_MID);
  gradient.addColorStop(1, PARCHMENT_OUTER);

  targetCtx.save();
  targetCtx.setTransform(1, 0, 0, 1, 0, 0);
  targetCtx.globalAlpha = 1;
  targetCtx.fillStyle = gradient;
  targetCtx.fillRect(0, 0, width, height);
  targetCtx.restore();
}

function drawImageCover(targetCtx, image, width, height) {
  const layout = computeCoverLayout(image, width, height);
  fillMuseumGround(targetCtx, width, height);
  targetCtx.drawImage(
    image,
    layout.offsetX,
    layout.offsetY,
    layout.drawWidth,
    layout.drawHeight
  );
}

function screenRectToSource(dx, dy, dw, dh) {
  const scaleX = artworkImage.width / cover.drawWidth;
  const scaleY = artworkImage.height / cover.drawHeight;
  let sx = (dx - cover.offsetX) * scaleX;
  let sy = (dy - cover.offsetY) * scaleY;
  let sw = dw * scaleX;
  let sh = dh * scaleY;

  if (sx < 0) {
    sw += sx;
    sx = 0;
  }
  if (sy < 0) {
    sh += sy;
    sy = 0;
  }
  if (sx + sw > artworkImage.width) {
    sw = artworkImage.width - sx;
  }
  if (sy + sh > artworkImage.height) {
    sh = artworkImage.height - sy;
  }

  return { sx, sy, sw, sh };
}

function visibleTileCount() {
  const allTilesArray = shuffledTiles;
  const totalBlocks = allTilesArray.length;
  if (totalBlocks === 0) {
    return 0;
  }
  const progressFraction = getProgressFraction();
  progress = progressFraction;
  if (progressFraction >= 1) {
    return totalBlocks;
  }
  return Math.floor(totalBlocks * progressFraction);
}

/* --------------------------------------------------------------------------
   Canvas — integer device-pixel grid so tiles sit flush
   -------------------------------------------------------------------------- */

function fitCanvasToWindow() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  devicePixelRatioCurrent = dpr;
  viewWidth = Math.max(1, Math.floor(cssWidth * dpr));
  viewHeight = Math.max(1, Math.floor(cssHeight * dpr));
  canvas.width = viewWidth;
  canvas.height = viewHeight;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  fillMuseumGround(ctx, viewWidth, viewHeight);
}

function fillWhite() {
  fillMuseumGround(ctx, viewWidth, viewHeight);
}

function buildGrid() {
  shuffledTiles = [];
  drawnCount = 0;

  if (!artworkReady || !artworkImage || viewWidth === 0 || viewHeight === 0) {
    return;
  }

  cover = computeCoverLayout(artworkImage, viewWidth, viewHeight);
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const tilePx = Math.max(4, Math.round(TILE_SIZE * devicePixelRatioCurrent));
  gridCols = Math.max(1, Math.ceil(viewWidth / tilePx));
  gridRows = Math.max(1, Math.ceil(viewHeight / tilePx));

  for (let row = 0; row < gridRows; row += 1) {
    const dy = Math.round((row * viewHeight) / gridRows);
    const dyNext = Math.round(((row + 1) * viewHeight) / gridRows);
    const dh = dyNext - dy;

    for (let col = 0; col < gridCols; col += 1) {
      const dx = Math.round((col * viewWidth) / gridCols);
      const dxNext = Math.round(((col + 1) * viewWidth) / gridCols);
      const dw = dxNext - dx;
      const source = screenRectToSource(dx, dy, dw, dh);

      if (source.sw < 0.5 || source.sh < 0.5) {
        continue;
      }

      const tileX = dx + dw / 2;
      const tileY = dy + dh / 2;
      const dist = Math.sqrt(
        Math.pow(tileX - centerX, 2) +
          Math.pow((tileY - centerY) * ELLIPSE_Y_STRETCH, 2)
      );

      shuffledTiles.push({
        col,
        row,
        dx,
        dy,
        dw,
        dh,
        sx: source.sx,
        sy: source.sy,
        sw: source.sw,
        sh: source.sh,
        dist,
        modifiedDist: dist,
        active: false,
      });
    }
  }

  orderTilesCenterOut(shuffledTiles);
}

function paintTile(tile) {
  ctx.globalAlpha = 1;
  ctx.drawImage(
    artworkImage,
    tile.sx,
    tile.sy,
    tile.sw,
    tile.sh,
    tile.dx,
    tile.dy,
    tile.dw,
    tile.dh
  );
}

/** Draw every newly unlocked micro-tile in this single animation frame. */
function paintNewTiles() {
  if (!artworkReady || !artworkImage) {
    return;
  }

  if (progress >= 1) {
    ctx.globalAlpha = 1;
    drawImageCover(ctx, artworkImage, viewWidth, viewHeight);
    drawnCount = shuffledTiles.length;
    for (let i = 0; i < shuffledTiles.length; i += 1) {
      shuffledTiles[i].active = true;
    }
    return;
  }

  const target = visibleTileCount();
  if (target <= drawnCount) {
    return;
  }

  ctx.globalAlpha = 1;
  for (let i = drawnCount; i < target; i += 1) {
    const tile = shuffledTiles[i];
    if (tile.active) {
      continue;
    }
    paintTile(tile);
    tile.active = true;
  }
  drawnCount = target;
}

function redrawActiveTiles() {
  fillWhite();
  if (!artworkReady || !artworkImage) {
    return;
  }

  if (progress >= 1) {
    drawImageCover(ctx, artworkImage, viewWidth, viewHeight);
    return;
  }

  const target = visibleTileCount();
  for (let i = 0; i < target; i += 1) {
    const tile = shuffledTiles[i];
    paintTile(tile);
    tile.active = true;
  }
  drawnCount = target;
}

/* --------------------------------------------------------------------------
   Reveal layer
   -------------------------------------------------------------------------- */

function hidePlaque() {
  if (!plaque) {
    return;
  }
  plaque.classList.remove("is-open");
  plaque.setAttribute("aria-hidden", "true");
}

function fillPlaque(artwork) {
  if (!plaque || !artwork) {
    return;
  }
  plaqueTitle.textContent = artwork.title || "";
  plaqueCulture.textContent = artwork.culture || "";
  plaqueEra.textContent = artwork.era || "";
  plaqueOrigin.textContent = artwork.origin || "";
  plaqueCopy.textContent = artwork.description || "";
  plaqueCulture.hidden = !artwork.culture;
  plaqueEra.hidden = !artwork.era;
  plaqueOrigin.hidden = !artwork.origin;
}

function showPlaque() {
  if (!plaque || !currentArtwork || !sessionComplete) {
    return;
  }
  fillPlaque(currentArtwork);
  plaque.setAttribute("aria-hidden", "false");
  void plaque.offsetWidth;
  plaque.classList.add("is-open");
}

function togglePlaque() {
  if (!sessionComplete) {
    return;
  }
  if (plaque.classList.contains("is-open")) {
    hidePlaque();
  } else {
    showPlaque();
  }
}

function syncBreakUi() {
  const onBreak = sessionComplete;
  if (infoBtn) {
    infoBtn.classList.toggle("is-visible", onBreak);
    infoBtn.setAttribute("aria-hidden", onBreak ? "false" : "true");
    infoBtn.tabIndex = onBreak ? 0 : -1;
  }
  if (!onBreak) {
    hidePlaque();
  }
}

function hideReveal() {
  revealSettled = false;
  revealImage.classList.add("no-transition");
  revealImage.classList.remove("is-visible");
  void revealImage.offsetWidth;
  revealImage.classList.remove("no-transition");
  hidePlaque();
}

function showFullResolutionArtwork() {
  if (!artworkSrc) {
    return;
  }

  revealImage.crossOrigin = "anonymous";
  revealImage.src = artworkSrc;
  revealImage.classList.remove("no-transition");
  requestAnimationFrame(() => {
    revealImage.classList.add("is-visible");
  });

  window.setTimeout(() => {
    revealSettled = true;
    if (progress >= 1 && artworkImage) {
      drawImageCover(ctx, artworkImage, viewWidth, viewHeight);
    }
  }, REVEAL_FADE_MS);
}

function frame() {
  rafId = 0;

  if (isRunning) {
    progress = getProgressFraction();
    paintNewTiles();
    if (progress >= 1 || (endTime > 0 && Date.now() >= endTime)) {
      finishSession();
    }
  }

  if (isRunning && !document.hidden && !sessionComplete) {
    rafId = requestAnimationFrame(frame);
  }
}

function ensureLoop() {
  if (!rafId && !document.hidden) {
    lastTimestamp = 0;
    rafId = requestAnimationFrame(frame);
  }
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  lastTimestamp = 0;
}

/* --------------------------------------------------------------------------
   Artwork
   -------------------------------------------------------------------------- */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

async function armSessionArtwork() {
  const artwork = getRandomArtwork();
  currentArtwork = artwork;
  artworkSrc = artwork.imagePath || artwork.imageUrl;
  artworkImage = await loadImage(artworkSrc);
  artworkReady = true;
  hideReveal();
  fillPlaque(artwork);
  buildGrid();
  fillWhite();
}

/* --------------------------------------------------------------------------
   Audio
   -------------------------------------------------------------------------- */

function ensureAudioContext() {
  try {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      audioContext = new Ctx();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  } catch (error) {
    return null;
  }
}

function playCompletionChime() {
  const audio = ensureAudioContext();
  if (!audio) {
    return;
  }

  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.setValueAtTime(0.2, now);
  master.connect(audio.destination);

  const voices = [
    { freq: 261.63, delay: 0.0, gain: 0.18, duration: 3.4 },
    { freq: 523.25, delay: 0.0, gain: 0.16, duration: 2.8 },
    { freq: 659.25, delay: 0.18, gain: 0.12, duration: 2.6 },
    { freq: 783.99, delay: 0.36, gain: 0.1, duration: 2.8 },
    { freq: 1046.5, delay: 0.58, gain: 0.07, duration: 2.4 },
  ];

  for (const voice of voices) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = now + voice.delay;
    const end = start + voice.duration;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(voice.freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.gain, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(end + 0.05);
  }
}

/* --------------------------------------------------------------------------
   Session
   -------------------------------------------------------------------------- */

function finishSession() {
  if (sessionComplete) {
    return;
  }

  freezeClock();
  isRunning = false;
  sessionComplete = true;
  pausedElapsedMs = durationMsFromMinutes();
  sessionDurationMs = pausedElapsedMs;
  endTime = startTime ? startTime + sessionDurationMs : Date.now();
  progress = 1;
  paintNewTiles();
  stopLoop();
  showFullResolutionArtwork();
  try {
    playCompletionChime();
  } catch (error) {
    /* The label should still appear if audio fails. */
  }
  chimePlayed = true;
  syncBreakUi();
  showPlaque();
}

async function startTimer() {
  if (isRunning) {
    return;
  }

  ensureAudioContext();

  if (sessionComplete) {
    await resetSession({ newArtwork: true });
  }

  if (!sessionArmed) {
    sessionArmed = true;
    resetClock();
    progress = 0;
    chimePlayed = false;
    hideReveal();
    await armSessionArtwork();
  }

  beginClock();
  isRunning = true;
  ensureLoop();
}

function pauseTimer() {
  if (!isRunning) {
    return;
  }
  freezeClock();
  isRunning = false;
  stopLoop();
}

async function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    await startTimer();
  }
}

async function resetSession({ newArtwork = false } = {}) {
  isRunning = false;
  sessionComplete = false;
  resetClock();
  progress = 0;
  drawnCount = 0;
  chimePlayed = false;
  stopLoop();
  hideReveal();
  syncBreakUi();

  if (newArtwork || !artworkReady) {
    sessionArmed = true;
    await armSessionArtwork();
    return;
  }

  orderTilesCenterOut(shuffledTiles);
  for (let i = 0; i < shuffledTiles.length; i += 1) {
    shuffledTiles[i].active = false;
  }
  fillWhite();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopLoop();
    return;
  }

  if (isRunning && !sessionComplete) {
    ensureLoop();
  }
});

document.addEventListener("keydown", (event) => {
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return;
  }

  if (event.code === "Space" || event.key === " ") {
    event.preventDefault();
    toggleTimer();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetSession({ newArtwork: false });
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    fitCanvasToWindow();
    if (artworkReady) {
      buildGrid();
      redrawActiveTiles();
    } else {
      fillWhite();
    }
    if (isRunning) {
      ensureLoop();
    }
  }, 80);
});

fitCanvasToWindow();
fillWhite();
initChrome({
  getFocusMinutes,
  setFocusMinutes,
  getBreakMinutes,
  setBreakMinutes,
  resetGallerySession,
});

if (plaqueClose) {
  plaqueClose.addEventListener("click", (event) => {
    event.stopPropagation();
    hidePlaque();
  });
}

if (infoBtn) {
  infoBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePlaque();
  });
}
