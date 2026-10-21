# Michael and Savta running animation

Assets: `michael-run.webp`, `tzippy-run.webp` in this directory.
Generated with the built-in image-generation tool from the existing character atlases, then encoded to WebP preserving alpha. Eight chronological phases, four columns by two rows. The run loader uses one constant scale per character and fixed head registration. It replaces only base running frames 0–7, leaving portraits, actions, powers and costume assets intact. Loaded before the existing game-ready signal in both solo and online.

Prompt set (identity-preserving game sprite edits):

- Michael: same young man, curly dark fringe, grey knitted kippah, olive hoodie, black cargo trousers and white sneakers. Transparent 4×2 full-body right-facing atlas; eight-phase alternating contact, passing, push-off and flight cycle, opposite arm swing, consistent proportions and face, clean alpha, no labels or scenery.
- Savta/Tzippy: same elderly smiling woman, grey-brown hair, burgundy caftan with gold embroidery and gold low shoes. Transparent 4×2 right-facing atlas; eight-phase light jog with alternating feet and counter-swinging arms, weighted modest moving hem, stable recognizable face and proportions, clean alpha, no labels or scenery.

Checks: actual browser loading, eight distinct images, head drift at most 7 atlas pixels, contact feet at ground baseline, raised flight frames, unclipped bounds, unchanged action poses and every existing outfit. Main online two-client regression test remains enabled.
