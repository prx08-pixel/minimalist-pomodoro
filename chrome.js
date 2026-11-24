/**
 * Phase 2 chrome — bottom-left dock and glass slide-up panels.
 * The painting stays untouched; this layer lives in the corner only.
 */

import {
  beginSpotifyLogin,
  consumeAuthRedirect,
  createSpotifyPlayer,
  disconnectSpotify,
  fetchSpotifyProfile,
  getAccessToken,
  getSpotifyPlayer,
  hasSpotifyClient,
  SPOTIFY_PLAYER_NAME,
} from "./spotify.js";

const TASKS_KEY = "tasks";
const TASKS_LEGACY_KEY = "pomodoro.tasks";
const GOALS_LEGACY_KEY = "pomodoro.dailyGoals";
const FONT_KEY = "pomodoro.font";
const PANEL_SLIDE_MS = 640;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
}

export function initChrome({
  getFocusMinutes,
  setFocusMinutes,
  getBreakMinutes,
  setBreakMinutes,
  resetGallerySession,
}) {
  const chromeRoot = document.getElementById("chrome");
  const dock = document.getElementById("dock");
  const taskForm = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const taskList = document.getElementById("task-list");
  const calGrid = document.getElementById("cal-grid");
  const calTitle = document.getElementById("cal-title");
  const taskClear = document.getElementById("task-clear");
  const calNote = document.getElementById("cal-note");
  const calNoteLabel = document.getElementById("cal-note-label");
  const goalField = document.getElementById("focus-goal");
  const focusRange = document.getElementById("focus-range");
  const focusReadout = document.getElementById("focus-readout");
  const fontSerif = document.getElementById("font-serif");
  const fontMono = document.getElementById("font-mono");
  const breakRange = document.getElementById("break-range");
  const breakReadout = document.getElementById("break-readout");
  const sessionReset = document.getElementById("session-reset");

  const panels = {
    tasks: document.getElementById("panel-tasks"),
    calendar: document.getElementById("panel-calendar"),
    spotify: document.getElementById("panel-spotify"),
    settings: document.getElementById("panel-settings"),
  };

  let openPanel = null;
  let panelToken = 0;
  let panelTimer = 0;
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  let selectedDate = toDateKey(new Date());
  let noteOpen = false;

  function eventKey(dateKey) {
    return `event-${dateKey}`;
  }

  function loadTasks() {
    let parsed = readJson(TASKS_KEY, null);
    if (!Array.isArray(parsed)) {
      parsed = readJson(TASKS_LEGACY_KEY, []);
      if (Array.isArray(parsed) && parsed.length) {
        localStorage.setItem(TASKS_KEY, JSON.stringify(parsed));
      }
    }
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveTasks(tasks) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function migrateLegacyGoals() {
    const legacy = readJson(GOALS_LEGACY_KEY, null);
    if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) {
      return;
    }
    Object.keys(legacy).forEach((dateKey) => {
      const text = String(legacy[dateKey] || "").trim();
      if (text && !localStorage.getItem(eventKey(dateKey))) {
        localStorage.setItem(eventKey(dateKey), text);
      }
    });
    localStorage.removeItem(GOALS_LEGACY_KEY);
  }

  function loadEvent(dateKey) {
    return localStorage.getItem(eventKey(dateKey)) || "";
  }

  function saveEvent(dateKey, text) {
    const trimmed = text.trim();
    if (trimmed) {
      localStorage.setItem(eventKey(dateKey), trimmed);
    } else {
      localStorage.removeItem(eventKey(dateKey));
    }
  }

  function hideAllPanels() {
    Object.keys(panels).forEach((key) => {
      panels[key].classList.remove("is-open");
    });
  }

  function closePanels() {
    panelToken += 1;
    window.clearTimeout(panelTimer);
    openPanel = null;
    hideAllPanels();
    dock.querySelectorAll(".dock-btn").forEach((button) => {
      button.classList.remove("is-active");
    });
  }

  function revealPanel(name) {
    hideAllPanels();
    panels[name].classList.add("is-open");
    dock.querySelectorAll(".dock-btn").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.panel === name);
    });
    openPanel = name;

    if (name === "tasks") {
      window.setTimeout(() => taskInput.focus(), 280);
    }
    if (name === "calendar") {
      selectedDate = toDateKey(new Date());
      noteOpen = true;
      renderCalendar();
      syncGoalField();
    }
  }

  function openNamedPanel(name) {
    if (openPanel === name) {
      closePanels();
      return;
    }

    const token = (panelToken += 1);
    window.clearTimeout(panelTimer);
    dock.querySelectorAll(".dock-btn").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.panel === name);
    });

    if (openPanel) {
      hideAllPanels();
      openPanel = null;
      panelTimer = window.setTimeout(() => {
        if (token !== panelToken) {
          return;
        }
        revealPanel(name);
      }, PANEL_SLIDE_MS);
      return;
    }

    revealPanel(name);
  }

  function renderTasks() {
    const tasks = loadTasks();
    taskList.replaceChildren();

    tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = `task-item${task.done ? " is-done" : ""}`;

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "task-check";
      check.checked = Boolean(task.done);
      check.setAttribute("aria-label", task.done ? "Mark as not done" : "Mark as done");
      check.addEventListener("change", () => {
        saveTasks(
          loadTasks().map((entry) =>
            entry.id === task.id ? { ...entry, done: check.checked } : entry
          )
        );
        renderTasks();
      });

      const label = document.createElement("span");
      label.className = "task-text";
      label.textContent = task.text;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "task-delete";
      remove.setAttribute("aria-label", "Delete task");
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        saveTasks(loadTasks().filter((entry) => entry.id !== task.id));
        renderTasks();
      });

      item.append(check, label, remove);
      taskList.append(item);
    });

    taskClear.hidden = tasks.length === 0;
  }

  function renderCalendar() {
    const first = new Date(viewYear, viewMonth, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayKey = toDateKey(new Date());

    calTitle.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    calGrid.replaceChildren();

    for (let i = 0; i < startWeekday; i += 1) {
      const pad = document.createElement("span");
      pad.className = "cal-cell is-empty";
      calGrid.append(pad);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toDateKey(new Date(viewYear, viewMonth, day));
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      cell.dataset.date = key;
      cell.textContent = String(day);
      if (key === todayKey) {
        cell.classList.add("is-today");
      }
      if (key === selectedDate) {
        cell.classList.add("is-selected");
      }
      if (loadEvent(key)) {
        cell.classList.add("has-event");
      }
      cell.addEventListener("click", () => {
        selectedDate = key;
        noteOpen = true;
        renderCalendar();
        syncGoalField();
        goalField.focus();
      });
      calGrid.append(cell);
    }
  }

  function formatNoteLabel(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return `Focus · ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  }

  function syncGoalField() {
    if (!noteOpen) {
      calNote.hidden = true;
      return;
    }
    calNote.hidden = false;
    calNoteLabel.textContent = formatNoteLabel(selectedDate);
    goalField.value = loadEvent(selectedDate);
  }

  function applyFont(mode) {
    const mono = mode === "mono";
    const value = mono ? "mono" : "serif";
    document.documentElement.setAttribute("data-font", value);
    document.documentElement.setAttribute("data-font", value);
    localStorage.setItem(FONT_KEY, value);
    fontSerif.classList.toggle("is-on", !mono);
    fontMono.classList.toggle("is-on", mono);
  }

  dock.addEventListener("click", (event) => {
    const button = event.target.closest("[data-panel]");
    if (button) {
      openNamedPanel(button.dataset.panel);
    }
  });

  function closeIfOutside(event) {
    if (!openPanel) {
      return;
    }
    const panel = panels[openPanel];
    const dockBtn = dock.querySelector(`[data-panel="${openPanel}"]`);
    if (panel && panel.contains(event.target)) {
      return;
    }
    if (dockBtn && dockBtn.contains(event.target)) {
      return;
    }
    closePanels();
  }

  document.addEventListener("pointerdown", closeIfOutside, true);
  document.addEventListener("click", closeIfOutside);

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) {
      return;
    }
    const tasks = loadTasks();
    tasks.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      done: false,
    });
    saveTasks(tasks);
    taskInput.value = "";
    renderTasks();
  });

  taskClear.addEventListener("click", () => {
    saveTasks([]);
    renderTasks();
  });

  document.getElementById("cal-prev").addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  document.getElementById("cal-next").addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  goalField.addEventListener("input", () => {
    saveEvent(selectedDate, goalField.value);
    const selectedCell = calGrid.querySelector(`[data-date="${selectedDate}"]`);
    if (selectedCell) {
      selectedCell.classList.toggle("has-event", Boolean(goalField.value.trim()));
    }
  });

  const storedMinutes = getFocusMinutes();
  focusRange.value = String(storedMinutes);
  focusReadout.textContent = `${storedMinutes} min`;
  focusRange.addEventListener("input", () => {
    const minutes = Number(focusRange.value);
    focusReadout.textContent = `${minutes} min`;
    setFocusMinutes(minutes);
  });

  const storedBreak = getBreakMinutes();
  breakRange.value = String(storedBreak);
  breakReadout.textContent = `${storedBreak} min`;
  breakRange.addEventListener("input", () => {
    const minutes = Number(breakRange.value);
    breakReadout.textContent = `${minutes} min`;
    setBreakMinutes(minutes);
  });

  fontSerif.addEventListener("click", () => applyFont("serif"));
  fontMono.addEventListener("click", () => applyFont("mono"));
  applyFont(localStorage.getItem(FONT_KEY) === "mono" ? "mono" : "serif");

  sessionReset.addEventListener("click", async () => {
    closePanels();
    await resetGallerySession();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openPanel) {
      closePanels();
    }
  });

  migrateLegacyGoals();
  renderTasks();
  renderCalendar();
  syncGoalField();
  initSpotifyUi();

  async function initSpotifyUi() {
    const fallback = document.getElementById("spotify-fallback");
    const playerUi = document.getElementById("spotify-player");
    const note = document.getElementById("spotify-note");
    const connectBtn = document.getElementById("spotify-connect");
    const disconnectBtn = document.getElementById("spotify-disconnect");
    const trackEl = document.getElementById("spotify-track");
    const artistEl = document.getElementById("spotify-artist");
    const artEl = document.getElementById("spotify-art");
    const deviceEl = document.getElementById("spotify-device");
    const toggleBtn = document.getElementById("spotify-toggle");
    const prevBtn = document.getElementById("spotify-prev");
    const nextBtn = document.getElementById("spotify-next");

    function showFallback(message) {
      playerUi.hidden = true;
      fallback.hidden = false;
      if (message) {
        note.hidden = false;
        note.textContent = message;
      } else {
        note.hidden = true;
        note.textContent = "";
      }
    }

    function showPlayer() {
      fallback.hidden = true;
      playerUi.hidden = false;
    }

    function paintState(state) {
      if (!state) {
        trackEl.textContent = "Ready for playback";
        artistEl.textContent = `Choose ${SPOTIFY_PLAYER_NAME} in Spotify Connect`;
        artEl.style.backgroundImage = "";
        toggleBtn.textContent = "▶";
        toggleBtn.setAttribute("aria-label", "Play");
        return;
      }
      const current = state.track_window?.current_track;
      trackEl.textContent = current?.name || "Untitled";
      artistEl.textContent =
        current?.artists?.map((artist) => artist.name).join(", ") || "";
      const image = current?.album?.images?.[0]?.url;
      artEl.style.backgroundImage = image ? `url("${image}")` : "";
      const paused = Boolean(state.paused);
      toggleBtn.textContent = paused ? "▶" : "❚❚";
      toggleBtn.setAttribute("aria-label", paused ? "Play" : "Pause");
    }

    async function startPlayer() {
      const token = await getAccessToken();
      if (!token) {
        showFallback();
        return;
      }

      let profile;
      try {
        profile = await fetchSpotifyProfile(token);
      } catch (error) {
        showFallback("Spotify could not confirm this account. Try connecting again.");
        return;
      }

      if (!profile) {
        showFallback();
        return;
      }

      if (profile.product && profile.product !== "premium") {
        showFallback(
          "In-app playback needs Spotify Premium. Open Spotify instead, or upgrade to stream here."
        );
        return;
      }

      showPlayer();
      deviceEl.textContent = `Signing in as ${profile.display_name || "you"}…`;

      try {
        await createSpotifyPlayer({
          onReady: ({ name }) => {
            deviceEl.textContent = `${name} is available in Spotify Connect`;
          },
          onNotReady: () => {
            deviceEl.textContent = "Device went offline";
          },
          onState: paintState,
          onError: (kind) => {
            if (kind === "premium") {
              disconnectSpotify();
              showFallback(
                "In-app playback needs Spotify Premium. Open Spotify instead."
              );
              return;
            }
            if (kind === "auth") {
              disconnectSpotify();
              showFallback("Session expired. Connect with Spotify again.");
              return;
            }
            deviceEl.textContent = "Playback hiccup — try Play from Spotify.";
          },
        });
      } catch (error) {
        disconnectSpotify();
        showFallback("Could not start the studio player. Open Spotify instead.");
      }
    }

    connectBtn.addEventListener("click", async () => {
      if (!hasSpotifyClient()) {
        showFallback(
          "Add your Spotify Client ID in spotifyConfig.js and register this page as a redirect URI."
        );
        return;
      }
      try {
        await beginSpotifyLogin();
      } catch (error) {
        showFallback(
          "Add your Spotify Client ID in spotifyConfig.js and register this page as a redirect URI."
        );
      }
    });

    disconnectBtn.addEventListener("click", () => {
      disconnectSpotify();
      paintState(null);
      showFallback();
    });

    toggleBtn.addEventListener("click", () => {
      getSpotifyPlayer()?.togglePlay();
    });
    prevBtn.addEventListener("click", () => {
      getSpotifyPlayer()?.previousTrack();
    });
    nextBtn.addEventListener("click", () => {
      getSpotifyPlayer()?.nextTrack();
    });

    try {
      const fromRedirect = await consumeAuthRedirect();
      if (fromRedirect) {
        openNamedPanel("spotify");
      }
    } catch (error) {
      showFallback("Spotify sign-in did not finish. You can try again, or open Spotify.");
      return;
    }

    await startPlayer();
  }
}
