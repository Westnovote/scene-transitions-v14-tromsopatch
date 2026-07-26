const MODULE_ID = "scene-transitions-v14-tromsopatch";
const FLAG_SCOPE = "scene-transitions";
const FLAG_KEY = "transitionData";

function getTransitionData(scene) {
  return scene.getFlag(FLAG_SCOPE, FLAG_KEY) || {};
}

async function setTransitionData(scene, data) {
  await scene.update({
    flags: {
      [FLAG_SCOPE]: {
        [FLAG_KEY]: data
      }
    }
  });
}

async function playFade() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "black";
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "9999";
  document.body.appendChild(overlay);

  await overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" }).finished;
  await new Promise(r => setTimeout(r, 200));
  await overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" }).finished;

  document.body.removeChild(overlay);
}

function injectSceneConfig(app, html) {
  const scene = app.object;
  const data = getTransitionData(scene);

  const form = html.find("form");
  const block = $(`
    <div class="form-group">
      <label>Scene Transition</label>
      <div class="form-fields">
        <select name="flags.${FLAG_SCOPE}.${FLAG_KEY}.type">
          <option value="">None</option>
          <option value="fade">Fade</option>
        </select>
      </div>
      <p class="notes">Transition played when this scene becomes active.</p>
    </div>
  `);

  block.find("select").val(data.type || "");
  form.append(block);

  const original = app._onSubmit;
  app._onSubmit = async function (event) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const expanded = foundry.utils.expandObject(Object.fromEntries(fd));

    const transitionData =
      expanded.flags &&
      expanded.flags[FLAG_SCOPE] &&
      expanded.flags[FLAG_SCOPE][FLAG_KEY]
        ? expanded.flags[FLAG_SCOPE][FLAG_KEY]
        : {};

    if (expanded.flags && expanded.flags[FLAG_SCOPE]) {
      delete expanded.flags[FLAG_SCOPE][FLAG_KEY];
      if (Object.keys(expanded.flags[FLAG_SCOPE]).length === 0) {
        delete expanded.flags[FLAG_SCOPE];
      }
    }

    await scene.update(expanded);
    await setTransitionData(scene, transitionData);

    this.close();
  };
}

Hooks.on("renderSceneConfig", (app, html) => {
  injectSceneConfig(app, html);
});

Hooks.on("canvasReady", async () => {
  const scene = canvas.scene;
  const data = getTransitionData(scene);
  if (data.type === "fade") await playFade();
});

Hooks.on("updateScene", async (scene, changed, options, userId) => {
  if (!changed.active) return;
  if (userId !== game.user.id) return;

  const data = getTransitionData(scene);
  if (data.type === "fade") await playFade();
});
