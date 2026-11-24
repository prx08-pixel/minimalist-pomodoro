/**
 * Spotify Authorization Code + PKCE and Web Playback SDK.
 * Premium is required for in-app Connect playback; otherwise the fallback card stays.
 */

import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_PLAYER_NAME,
  SPOTIFY_REDIRECT_URI,
} from "./spotifyConfig.js";

const TOKEN_KEY = "pomodoro.spotify.token";
const VERIFIER_KEY = "pomodoro.spotify.verifier";
const STATE_KEY = "pomodoro.spotify.state";
const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

let player = null;
let deviceId = null;
let sdkReadyPromise = null;

function redirectUri() {
  if (SPOTIFY_REDIRECT_URI) {
    return SPOTIFY_REDIRECT_URI;
  }
  return `${window.location.origin}${window.location.pathname}`;
}

function randomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  const bytes = new Uint8Array(digest);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function readToken() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOKEN_KEY) || "");
    if (!parsed || !parsed.access_token) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

function writeToken(token) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function tokenIsFresh(token, skewMs = 30_000) {
  return Boolean(token && token.expires_at && token.expires_at - skewMs > Date.now());
}

async function exchangeToken(body) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!response.ok) {
    throw new Error("Spotify token exchange failed");
  }
  const data = await response.json();
  const stored = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || readToken()?.refresh_token || "",
    expires_at: Date.now() + data.expires_in * 1000,
  };
  writeToken(stored);
  return stored;
}

async function refreshAccessToken(token) {
  if (!token?.refresh_token || !SPOTIFY_CLIENT_ID) {
    return null;
  }
  try {
    return await exchangeToken({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    });
  } catch (error) {
    clearToken();
    return null;
  }
}

export async function getAccessToken() {
  let token = readToken();
  if (tokenIsFresh(token)) {
    return token.access_token;
  }
  token = await refreshAccessToken(token);
  return token?.access_token || null;
}

export async function beginSpotifyLogin() {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error("missing-client-id");
  }
  const verifier = randomString(64);
  const state = randomString(24);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  const challenge = await sha256Base64Url(verifier);
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", SPOTIFY_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");
  window.location.assign(url.toString());
}

export async function consumeAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");
  if (!code && !error) {
    return false;
  }

  window.history.replaceState({}, document.title, window.location.pathname);

  if (error) {
    return false;
  }
  if (state !== sessionStorage.getItem(STATE_KEY)) {
    return false;
  }

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!verifier || !SPOTIFY_CLIENT_ID) {
    return false;
  }

  await exchangeToken({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  return true;
}

export async function fetchSpotifyProfile(accessToken) {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401) {
    clearToken();
    return null;
  }
  if (!response.ok) {
    throw new Error("profile-failed");
  }
  return response.json();
}

export function hasSpotifyClient() {
  return Boolean(SPOTIFY_CLIENT_ID);
}

export function disconnectSpotify() {
  if (player) {
    player.disconnect();
    player = null;
  }
  deviceId = null;
  clearToken();
}

function loadPlaybackSdk() {
  if (window.Spotify) {
    return Promise.resolve();
  }
  if (sdkReadyPromise) {
    return sdkReadyPromise;
  }
  sdkReadyPromise = new Promise((resolve, reject) => {
    const previous = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (typeof previous === "function") {
        previous();
      }
      resolve();
    };
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("sdk-load-failed"));
    document.head.append(script);
  });
  return sdkReadyPromise;
}

async function api(path, options = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("no-token");
  }
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`spotify-api-${response.status}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function transferPlaybackHere(play = false) {
  if (!deviceId) {
    return;
  }
  await api("/me/player", {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
}

export async function createSpotifyPlayer(handlers) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("no-token");
  }

  await loadPlaybackSdk();

  if (player) {
    player.disconnect();
    player = null;
  }

  player = new window.Spotify.Player({
    name: SPOTIFY_PLAYER_NAME,
    getOAuthToken: async (callback) => {
      const fresh = await getAccessToken();
      callback(fresh || "");
    },
    volume: 0.72,
  });

  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    handlers.onReady?.({ deviceId: device_id, name: SPOTIFY_PLAYER_NAME });
    transferPlaybackHere(false).catch(() => {});
  });

  player.addListener("not_ready", () => {
    handlers.onNotReady?.();
  });

  player.addListener("player_state_changed", (state) => {
    handlers.onState?.(state);
  });

  player.addListener("initialization_error", ({ message }) => {
    handlers.onError?.("init", message);
  });

  player.addListener("authentication_error", ({ message }) => {
    clearToken();
    handlers.onError?.("auth", message);
  });

  player.addListener("account_error", ({ message }) => {
    handlers.onError?.("premium", message);
  });

  player.addListener("playback_error", ({ message }) => {
    handlers.onError?.("playback", message);
  });

  const connected = await player.connect();
  if (!connected) {
    throw new Error("connect-failed");
  }
  return player;
}

export function getSpotifyPlayer() {
  return player;
}

export { SPOTIFY_PLAYER_NAME };
