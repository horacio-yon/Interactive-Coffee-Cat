# Purr & Brew — Interactive Coffee Cat

A full-screen, desktop-first coffee landing page starring a responsive orange cat. Built for the Codea con Horacio project with static web technology only.

## Run locally

Open `interactive-coffee-cat/index.html` directly in the browser, with VS Code **Live Server**, or through any static HTTP server. The JavaScript files use ordered classic scripts, so `file://` also works. No installation, build, npm, or backend is needed.

## Files

- `index.html` — semantic page, controls, product cards, and dialog.
- `css/styles.css` — layout, responsive styling, ambient effects, and reduced-motion support.
- `js/app.js` — startup, navigation panels, and local coffee pick.
- `js/cat-controller.js` — pose preload, continuous cursor tracking, state machine, and sipping sequence.
- `assets/cat/` — master and four aligned transparent cat poses.
- `assets/coffee/` — product images.

## Cat behavior

The controller uses `IDLE_CENTER`, `LOOK_LEFT`, `LOOK_RIGHT`, `DRINKING`, and `RETURNING`. Horizontal pointer position sets a continuous target between -1 and 1. A frame-based loop approaches that target smoothly, and pose switching has hysteresis to avoid jitter. Only one complete cat PNG is displayed at a time, so center eyes cannot overlap with another face. Hovering any nontransparent part of the cat starts one sip. The pointer must leave the silhouette before another sip can trigger. Touch input and arrow keys provide alternatives to mouse movement.

## Navigation and ordering preview

Explore Menu, Order Coffee, and both product cards open working dialogs. The order dialog saves a drink preference in local storage. It does not submit a payment or a real order. The header is intentionally minimal; the footer credits Codea con Horacio.

## Replacing artwork

Replace the PNG files in `assets/cat/` using the same filenames and square 1254 × 1254 transparent canvas. Keep the character's feet, cup, and overall scale aligned between poses. Replace the coffee PNGs in `assets/coffee/` at any resolution with a similar aspect ratio.

## Known visual limit

These are generated 2D images of a 3D-styled character, not a rigged 3D model. The cup lift is a short pose transition, so it cannot show every intermediate movement continuously. The generated images remain closely aligned but have slight differences in fur and head contours. A frame sequence or real 3D rig would be needed for a perfectly continuous sip.

The fonts are fetched from Google Fonts; local sans-serif fonts are used if they are unavailable.


Desktop capture: [preview-desktop.png](preview-desktop.png).
