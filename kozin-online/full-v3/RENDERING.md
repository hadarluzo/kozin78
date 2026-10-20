# Kozin78 multiplayer rendering (clean v4)

The normal standalone game in `index.html` is untouched and remains the canonical source of character art, costumes, stage backgrounds and game controls. `online.html` loads it as a same-origin iframe.

## One frame owner

The original iframe runs an independent requestAnimationFrame simulation + render loop. Multiplayer must NOT run that standalone simulation and render a second time concurrently. After the sprite assets are loaded, `setupFrame()` intercepts only the original `frame` callback, and starts `startCleanRenderer()`.

`startCleanRenderer()` schedules one animation callback owned by the multiplayer UI. Rendering is capped at 30fps on touch devices or 45fps on desktop, rather than doubling scene renders; FPS is a ceiling, not a guarantee. The original renderer still paints maps, food, obstacles, chaser, cosmetics and hero actions.

## Player snapshots and cosmetics

The WebSocket room produces authoritative physics and outcome snapshots at 20 Hz. `updateGame()` applies snapshots to the original game object without modifying the standalone game file. Only draw-space movement is predicted locally, briefly, with short corrections. The server still owns collisions, purchases, powers, level progression and winners.

The remote character is always attempted once per rendered frame with its own `hero`, `gear`, player movement, combat and special power. A name and cyan fallback silhouette are drawn even if the original character atlas is not ready. Nearby overlapping players remain at **identical server world coordinates**; the remote sprite is offset by 104 pixels **only for drawing**. If out of view, a direction label is displayed.

## Mobile reliability

Keep the original mobile control coordinates: Run at bottom-left; Jump bottom-right; special, kick and punch cluster right-middle. The buttons stay visible during the 3-2-1 intro, with a waiting hint, not hidden. The original index.html's account, cosmetics ownership, game economy and local saves are not overwritten by multiplayer.

Reduced mobile canvas pixel budget (~260,000) aims to reduce GPU load. The lower resolution is intentionally traded for smoother frame pacing.

## Tests and known limitations

- `browser-controls-test.mjs`: Chromium checks real touch hitboxes.
- `browser-game-render-test.mjs`: Loads the real 16 MB original game with its real sprite atlases and checks that the teammate and label render at overlapping start positions.
- `client-test.mjs`: Client-side single-draw, fallback rendering, guest room creation, countdown and jump logic.
- `live-test.mjs`: Two actual WebSocket participants; also runs against the public production server.
- `test.mjs`: Server-world game behavior and simultaneous starts.
- `perf.mjs`: Server-world and serialization benchmark.

A green Chrome test on a Linux runner is **not** a substitute for testing sustained FPS on two iPhones. The production Render service may still run old physics/timing: deployment status must be verified independently before claiming network-latency improvements.

**Regression rule:** never silently add another independent `requestAnimationFrame`, another full-world copy per render, or a canvas blur without measuring and updating tests.
