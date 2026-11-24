/**
 * Spotify Developer Dashboard
 * 1. Create an app and enable Web API + Web Playback SDK.
 * 2. Add Redirect URIs that match how you open this page, for example:
 *      http://127.0.0.1:8000/
 *      http://localhost:8000/
 *      http://localhost:5500/
 *      http://127.0.0.1:5500/
 * 3. Client ID is public in PKCE apps; do not put a Client Secret here.
 *
 * Leave SPOTIFY_REDIRECT_URI empty to use the current page URL automatically.
 * Set it only if the Dashboard URI must be an exact override.
 */
export const SPOTIFY_CLIENT_ID = "5ac2b6c52d4d467a85b32dbe322851b1";
export const SPOTIFY_REDIRECT_URI = "";
export const SPOTIFY_PLAYER_NAME = "Cultural Canvas Player";
