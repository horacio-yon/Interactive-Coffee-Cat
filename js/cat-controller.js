(function () {
  const CatState = Object.freeze({
    IDLE_CENTER: "IDLE_CENTER",
    LOOK_LEFT: "LOOK_LEFT",
    LOOK_RIGHT: "LOOK_RIGHT",
    DRINKING: "DRINKING",
    RETURNING: "RETURNING",
  });

  const assets = {
    center: "assets/cat/cat-center.png",
    left: "assets/cat/cat-left.png",
    right: "assets/cat/cat-right.png",
    drink: "assets/cat/cat-drink.png",
  };

  const labels = {
    center: "Ready for a little coffee break",
    left: "Oh, what's over there?",
    right: "Something caught my eye!",
    drink: "Mmm... that's the good stuff",
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class CatController {
    constructor(image, status, { reducedMotion = false, hoverDelay = 1500 } = {}) {
      this.image = image;
      this.status = status;
      this.wrap = image.parentElement;
      this.reducedMotion = reducedMotion;
      this.hoverDelay = hoverDelay;
      this.hoverTimer = null;
      this.hovered = false;
      this.sipConsumed = false;
      this.pointerX = innerWidth / 2;
      this.alphaMap = null;
      this.state = CatState.IDLE_CENTER;
      this.zone = "center";
      this.pose = "center";
      this.targetLook = 0;
      this.currentLook = 0;
      this.drinkPending = false;
      this.drinkTimer = null;
      this.poseTransitionTimer = null;
      this.ready = false;
      this.lastFrame = 0;
      this.lastLabel = "";
      this.loop = this.loop.bind(this);
    }

    async preload() {
      const results = await Promise.all(Object.entries(assets).map(([name, src]) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => resolve({ name, ok: true, image });
          image.onerror = () => {
            console.error("Unable to load cat pose:", src);
            resolve({ name, ok: false });
          };
          image.src = src;
          if (image.complete && image.naturalWidth) resolve({ name, ok: true, image });
        })
      ));

      this.available = new Set(results.filter((item) => item.ok).map((item) => item.name));
      this.poseImages = new Map(results
        .filter((item) => item.ok)
        .map((item) => [item.name, item.image]));
      this.ready = this.available.has("center");
      if (!this.ready) {
        this.image.style.visibility = "hidden";
        this.status.textContent = "Our coffee buddy is taking a break";
        return results;
      }

      this.buildAlphaMap();
      this.lastFrame = performance.now();
      requestAnimationFrame(this.loop);
      return results;
    }

    targetFromX(clientX) {
      const normalized = clamp((clientX / innerWidth - 0.5) / 0.43, -1, 1);
      const deadZone = 0.06;
      if (Math.abs(normalized) < deadZone) return 0;
      return Math.sign(normalized) * (Math.abs(normalized) - deadZone) / (1 - deadZone);
    }

    buildAlphaMap() {
      const canvas = document.createElement("canvas");
      canvas.width = this.image.naturalWidth;
      canvas.height = this.image.naturalHeight;

      try {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        for (const poseImage of this.poseImages.values()) {
          context.drawImage(poseImage, 0, 0, canvas.width, canvas.height);
        }
        this.alphaMap = context.getImageData(0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.warn("PNG alpha hit testing is unavailable; using a silhouette fallback.", error);
      }
    }

    hitTest(clientX, clientY) {
      const rect = this.image.getBoundingClientRect();
      if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right ||
          clientY < rect.top || clientY > rect.bottom) return false;

      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;

      if (this.alphaMap) {
        const px = Math.min(this.alphaMap.width - 1, Math.floor(x * this.alphaMap.width));
        const py = Math.min(this.alphaMap.height - 1, Math.floor(y * this.alphaMap.height));
        return this.alphaMap.data[(py * this.alphaMap.width + px) * 4 + 3] > 28;
      }

      // This fallback follows the visible silhouette, including ears, tail and paws.
      const ellipse = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      const leftEar = x > 0.16 && x < 0.43 && y > 0.02 && y < 0.24;
      const rightEar = x > 0.55 && x < 0.82 && y > 0.02 && y < 0.24;
      return leftEar || rightEar ||
        ellipse(0.5, 0.28, 0.36, 0.25) ||
        ellipse(0.5, 0.67, 0.33, 0.31) ||
        ellipse(0.29, 0.74, 0.18, 0.2) ||
        ellipse(0.4, 0.92, 0.13, 0.07) ||
        ellipse(0.64, 0.92, 0.13, 0.07);
    }

    onPointer(clientX, clientY) {
      this.pointerX = clientX;
      const overCat = this.hitTest(clientX, clientY);

      if (overCat) {
        if (!this.hovered) {
          this.hovered = true;
          this.setTarget(0, true);
          if (!this.sipConsumed && this.state !== CatState.DRINKING && !this.drinkPending) {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = setTimeout(() => {
              this.hoverTimer = null;

              if (this.hovered && this.state !== CatState.DRINKING && !this.drinkPending) {
                this.sipConsumed = true;
                this.drink();
              }

            }, this.hoverDelay);
          }
        }
        return;
      }

      if (this.hovered) {
        this.hovered = false;
        this.sipConsumed = false;
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }

      this.setTarget(this.targetFromX(clientX));
    }

    onPointerExit() {
      this.hovered = false;
      this.sipConsumed = false;
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
      this.setTarget(0);
    }

    setTarget(value, allowHovered = false) {
      if (!this.ready || (this.hovered && !allowHovered)) return;
      if (!allowHovered && (this.state === CatState.DRINKING || this.drinkPending)) {
        this.interruptDrink();
      }

      this.targetLook = clamp(value, -1, 1);
      const nextZone = Math.abs(this.targetLook) < 0.08
        ? "center" : this.targetLook < 0 ? "left" : "right";

      if (allowHovered && (this.state === CatState.DRINKING || this.drinkPending)) return;
      if (nextZone === this.zone) return;
      this.zone = nextZone;
      if (nextZone === "center") {
        this.state = CatState.RETURNING;
      } else {
        this.state = nextZone === "left" ? CatState.LOOK_LEFT : CatState.LOOK_RIGHT;
      }
    }

    interruptDrink() {
      const wasDrinking = this.state === CatState.DRINKING;
      this.drinkPending = false;
      clearTimeout(this.drinkTimer);
      this.drinkTimer = null;
      this.state = CatState.RETURNING;

      if (!wasDrinking) return;

      clearTimeout(this.poseTransitionTimer);
      this.image.classList.add("is-changing");
      this.showPose("center");
      this.poseTransitionTimer = setTimeout(() => {
        this.image.classList.remove("is-changing");
        this.poseTransitionTimer = null;
      }, this.reducedMotion ? 1 : 70);
    }

    requestZone(zone) {
      this.setTarget(zone === "left" ? -0.82 : zone === "right" ? 0.82 : 0);
    }

    loop(now) {
      const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
      this.lastFrame = now;

      if (this.state !== CatState.DRINKING) {
        // A spring-like response follows fast direction changes from the current orientation.
        const response = this.reducedMotion ? 1 : 1 - Math.exp(-dt / 0.075);
        this.currentLook += (this.targetLook - this.currentLook) * response;
        if (Math.abs(this.currentLook - this.targetLook) < 0.001) {
          this.currentLook = this.targetLook;
        }

        this.renderLook();
        if (this.zone === "center" && Math.abs(this.currentLook) < 0.06) {
          if (this.state === CatState.RETURNING) this.state = CatState.IDLE_CENTER;
        }

        if (this.drinkPending && Math.abs(this.currentLook) < 0.035) {
          this.startDrink();
        }
      }

      requestAnimationFrame(this.loop);
    }

    renderLook() {
      const look = this.currentLook;
      this.wrap.style.setProperty("--look-x", (look * 2).toFixed(2) + "px");

      // Hysteresis avoids repeated switches at the center. Exactly one PNG is visible.
      let next = this.pose;
      if (this.pose === "center") {
        if (look < -0.28) next = "left";
        if (look > 0.28) next = "right";
      } else if (this.pose === "left") {
        if (look > -0.12) next = "center";
      } else if (this.pose === "right" && look < 0.12) {
        next = "center";
      }

      if (next !== this.pose) this.showPose(next);
      const label = look < -0.18 ? labels.left : look > 0.18 ? labels.right : labels.center;
      if (label !== this.lastLabel) {
        this.status.textContent = label;
        this.lastLabel = label;
      }
    }

    showPose(name) {
      if (!this.available.has(name) || name === this.pose) return;
      this.image.src = assets[name];
      this.pose = name;
    }

    drink() {
      if (!this.ready || this.state === CatState.DRINKING || this.drinkPending) return;
      this.drinkPending = true;
      this.targetLook = 0;
      this.zone = "center";
      this.state = CatState.RETURNING;
    }

    startDrink() {
      if (!this.drinkPending || !this.ready) return;
      this.drinkPending = false;
      this.currentLook = 0;
      this.showPose("center");
      this.state = CatState.DRINKING;
      this.showPose("drink");
      this.status.textContent = labels.drink;
      this.lastLabel = labels.drink;
      this.drinkTimer = setTimeout(() => {
        this.drinkTimer = null;
        if (this.state !== CatState.DRINKING) return;

        this.showPose("center");
        this.state = CatState.RETURNING;
        this.status.textContent = labels.center;
        this.lastLabel = labels.center;
        if (!this.hovered) this.setTarget(this.targetFromX(this.pointerX));
      }, this.reducedMotion ? 250 : 1200);
    }
  }

  window.CatController = CatController;
})();
