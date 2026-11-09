(async function () {
  const { CatController } = window;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cat = new CatController(
    document.querySelector("#cat-image"),
    document.querySelector("#cat-status"),
    { reducedMotion }
  );
  await cat.preload();



  let activeTouchPointer = null;

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen" ||
        (event.pointerType === "touch" && event.pointerId === activeTouchPointer)) {
      cat.onPointer(event.clientX, event.clientY);
    }
  }, { passive: true });

  window.addEventListener("pointerleave", () => cat.onPointerExit());

  const endTouch = (event) => {
    if (event.pointerId !== activeTouchPointer) return;
    activeTouchPointer = null;
    cat.onPointerExit();
  };
  window.addEventListener("pointerup", endTouch);
  window.addEventListener("pointercancel", endTouch);

  // Touch and keyboard controls use the same orientation controller as the mouse.
  document.querySelector(".hero-visual").addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    activeTouchPointer = event.pointerId;
    cat.onPointer(event.clientX, event.clientY);
  });

  window.addEventListener("keydown", (event) => {
    if (document.querySelector("#info-dialog").open) return;

    if (event.key === "ArrowLeft") cat.requestZone("left");
    if (event.key === "ArrowRight") cat.requestZone("right");
    if (event.key === "ArrowDown") {
      cat.requestZone("center");
      cat.drink();
    }
  });

  const dialog = document.querySelector("#info-dialog");
  const content = document.querySelector("#dialog-content");
  const drinks = {
    espresso: {
      name: "Espresso",
      price: "$4.50",
      description: "A concentrated little spark, with a rich golden crema."
    },
    cappuccino: {
      name: "Cappuccino",
      price: "$5.50",
      description: "Velvety milk and a soft espresso heart."
    }
  };
  let picked = "cappuccino";

  function orderHTML() {
    const item = drinks[picked];
    const choices = Object.entries(drinks).map(([key, drink]) =>
      '<button type="button" data-choose="' + key + '" aria-pressed="' +
      (key === picked) + '"><span>' + drink.name + '</span><b>' +
      drink.price + '</b></button>'
    ).join("");

    return '<span class="dialog-kicker">YOUR COFFEE MOMENT</span>' +
      '<h2 id="dialog-title">Make it a good one.</h2>' +
      '<p>Choose your favorite. This preview saves your pick on this device; ' +
      'no payment or order is submitted.</p>' +
      '<div class="dialog-menu">' + choices + '</div>' +
      '<p id="drink-detail">' + item.description + '</p>' +
      '<button class="dialog-action" id="save-pick">Save my pick</button>' +
      '<p id="pick-result" role="status"></p>';
  }

  function panelHTML(panel) {
    if (panel === "menu") {
      const items = Object.entries(drinks).map(([key, drink]) =>
        '<button type="button" data-open-order="' + key + '"><span>' +
        drink.name + ' · ' + drink.description + '</span><b>' +
        drink.price + '</b></button>'
      ).join("");

      return '<span class="dialog-kicker">CRAFTED FOR CURIOUS PEOPLE</span>' +
        '<h2 id="dialog-title">Our little menu.</h2>' +
        '<p>Great coffee, a little whimsy, and a lot of warmth.</p>' +
        '<div class="dialog-menu">' + items + '</div>';
    }

    return orderHTML();
  }

  function openPanel(panel, product) {
    if (product && drinks[product]) picked = product;
    content.innerHTML = panelHTML(panel);
    if (!dialog.open) dialog.showModal();
  }

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-panel]");
    if (opener) {
      event.preventDefault();
      openPanel(opener.dataset.panel, opener.dataset.product);
      return;
    }

    const choice = event.target.closest("[data-choose]");
    if (choice) {
      picked = choice.dataset.choose;
      content.innerHTML = orderHTML();
      return;
    }

    const order = event.target.closest("[data-open-order]");
    if (order) {
      openPanel("order", order.dataset.openOrder);
      return;
    }

    if (event.target.id === "save-pick") {
      const result = document.querySelector("#pick-result");
      try {
        localStorage.setItem("purr-brew-pick", picked);
        result.textContent = drinks[picked].name + " saved as your coffee pick.";
      } catch {
        result.textContent = drinks[picked].name + " selected for this visit.";
      }
    }
  });

  document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => console.error("Image failed to load:", image.src));
  });
})().catch((error) => console.error("Purr & Brew initialization failed:", error));
