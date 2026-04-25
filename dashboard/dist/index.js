/**
 * Clean Light skin — Hermes dashboard plugin.
 *
 * Assigns deterministic pastel colours to every named entity:
 * compartments, sessions, skills, cron jobs, models, platforms.
 * The same entity name always gets the same colour — across pages,
 * reloads, and SPA navigations.
 *
 * Colours are reassignable at runtime via:
 *   window.__debug["cl-skin"].reassign("entity-name", paletteIndex)
 *   window.__debug["cl-skin"].reset("entity-name")
 *   window.__debug["cl-skin"].resetAll()
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  const PLUGINS = window.__HERMES_PLUGINS__;
  if (!SDK || !PLUGINS) return;

  // Material You tonal pairs — [bg, fg]
  const PALETTES = [
    ["#fce8e6", "#c5221f"],
    ["#e8f0fe", "#1a73e8"],
    ["#e6f4ea", "#137333"],
    ["#fef7e0", "#b05e00"],
    ["#f3e8fd", "#7b1fa2"],
    ["#e4f7fb", "#007b83"],
    ["#fbe9e7", "#bf360c"],
    ["#f0f4ff", "#3c4499"],
    ["#fff3e0", "#e65100"],
    ["#f9fbe7", "#558b2f"],
    ["#fdf2fa", "#880e4f"],
    ["#e0f7fa", "#006064"],
    ["#fff8e1", "#f57f17"],
    ["#f3e5f5", "#6a1b9a"],
    ["#e8eaf6", "#283593"],
    ["#e0f2f1", "#004d40"],
    ["#fce4ec", "#880e4f"],
    ["#e3f2fd", "#0d47a1"],
    ["#f1f8e9", "#33691e"],
    ["#ede7f6", "#4527a0"],
  ];

  // DARK mode equivalents — same index, dark-surface-friendly
  const PALETTES_DARK = [
    ["#4a1512", "#f28b82"],
    ["#1a2f5e", "#8ab4f8"],
    ["#1a3320", "#81c995"],
    ["#3d2e00", "#fdd663"],
    ["#2d1b42", "#d7aefb"],
    ["#003438", "#78d9ec"],
    ["#4a1c0a", "#ffb399"],
    ["#1c2060", "#aab0f5"],
    ["#3d2500", "#ffb974"],
    ["#243014", "#b5e48c"],
    ["#3b0c2a", "#f4b8dc"],
    ["#003035", "#79c6ce"],
    ["#3d2f00", "#fde899"],
    ["#280d42", "#d7b8f5"],
    ["#0d1540", "#9fa8da"],
    ["#00201e", "#80cbc4"],
    ["#3b0c2a", "#f48fb1"],
    ["#0d2240", "#90caf9"],
    ["#1a2e0a", "#aed581"],
    ["#1a0f42", "#b39ddb"],
  ];

  function isDark() {
    return document.documentElement.classList.contains("dark") ||
      getComputedStyle(document.documentElement).colorScheme === "dark" ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches &&
        !document.documentElement.style.colorScheme.includes("light"));
  }

  function djb2(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Math.abs(h) % PALETTES.length;
  }

  // name → palette index (overridable)
  const overrides = new Map();
  // name → [bg, fg] cache (cleared on dark/light switch)
  const cache = new Map();

  function indexFor(name) {
    return overrides.has(name) ? overrides.get(name) : djb2(name);
  }

  function colorsFor(name) {
    if (!cache.has(name)) {
      const idx = indexFor(name);
      cache.set(name, isDark() ? PALETTES_DARK[idx] : PALETTES[idx]);
    }
    return cache.get(name);
  }

  function accent(name) { return colorsFor(name)[1]; }

  // ─── Compartment coloring (data-compartment attr) ─────────────────────────

  function applyCompartmentColors() {
    document.querySelectorAll("[data-compartment]").forEach((el) => {
      const name = el.getAttribute("data-compartment") || "default";
      const [bg, fg] = colorsFor(name);
      el.style.setProperty("--cl-compartment-bg", bg);
      el.style.setProperty("--cl-compartment-fg", fg);
    });
  }

  // ─── Session row coloring ─────────────────────────────────────────────────
  // Session rows: div.flex.flex-col.sm\:flex-row... containing a <span.font-medium>
  // Expanded rows: div.border.overflow-hidden.transition-colors.border-border

  function colorSessionRows() {
    // Collapsed session list rows — must have a font-mono-ui sibling (model name)
    document.querySelectorAll(
      "div.flex.flex-col.sm\\:flex-row.sm\\:items-center"
    ).forEach((row) => {
      const title = row.querySelector("span.font-medium");
      const model = row.querySelector("span.font-mono-ui");
      if (!title || !model) return; // skip non-session rows
      const name = title.textContent.trim() || "Untitled";
      const [bg, fg] = colorsFor(name);
      if (row.dataset.clColored === name) return;
      row.dataset.clColored = name;
      row.style.borderLeft = `4px solid ${fg}`;
      row.style.paddingLeft = "calc(0.75rem - 4px)";
      row.style.background = bg + "66"; // 40% tint
    });

    // Expandable session rows (accordion style) — must contain a font-mono-ui model
    document.querySelectorAll(
      "div.border.overflow-hidden.transition-colors.border-border"
    ).forEach((row) => {
      const model = row.querySelector("span.font-mono-ui, span[class*='font-mono']");
      if (!model) return; // skip non-session accordions
      const title = row.querySelector("span.font-medium, span.font-semibold, h3");
      if (!title) return;
      const name = title.textContent.trim() || "Untitled";
      const [bg, fg] = colorsFor(name);
      if (row.dataset.clColored === name) return;
      row.dataset.clColored = name;
      row.style.borderLeft = `4px solid ${fg}`;
    });
  }

  // ─── Skill card coloring ──────────────────────────────────────────────────

  function colorSkillCards() {
    // Skill cards have a name as the first heading inside the card
    document.querySelectorAll(
      "div.border.border-border.bg-card\\/80, div.border.border-border.bg-muted\\/20"
    ).forEach((card) => {
      const heading = card.querySelector("h3, h4, span.font-medium, span.font-semibold");
      if (!heading) return;
      const name = heading.textContent.trim();
      if (!name) return;
      if (card.dataset.clColored === name) return;
      card.dataset.clColored = name;
      const [bg, fg] = colorsFor(name);
      card.style.borderLeft = `4px solid ${fg}`;
      card.style.background = bg + "55";
    });
  }

  // ─── Model badges ─────────────────────────────────────────────────────────

  function colorModelBadges() {
    document.querySelectorAll("span.font-mono-ui, code.font-mono-ui").forEach((el) => {
      const name = el.textContent.trim();
      if (!name || el.dataset.clColored === name) return;
      el.dataset.clColored = name;
      const fg = accent(name);
      el.style.color = fg;
    });
  }

  // ─── Global stylesheet for data-label and data-compartment badges ──────────

  function refreshStyleSheet() {
    const id = "cl-skin-entity-styles";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    const rules = [];
    cache.forEach(([bg, fg], name) => {
      const safe = CSS.escape ? CSS.escape(name) : name.replace(/[^\w-]/g, "_");
      rules.push(
        `[data-compartment="${safe}"] .badge,` +
        `[data-compartment="${safe}"] [data-slot="badge"]{background:${bg}!important;color:${fg}!important;}`
      );
      rules.push(
        `[data-label="${safe}"]{background:${bg}!important;color:${fg}!important;` +
        `border-radius:9999px!important;padding:2px 8px!important;` +
        `font-size:0.6875rem!important;font-weight:500!important;}`
      );
    });
    el.textContent = rules.join("\n");
  }

  // ─── Main scan ────────────────────────────────────────────────────────────

  function scan() {
    applyCompartmentColors();
    colorSessionRows();
    colorSkillCards();
    colorModelBadges();
    refreshStyleSheet();
  }

  function startObserver() {
    const obs = new MutationObserver(scan);
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-compartment", "class"],
    });
  }

  function init() {
    scan();
    startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  setInterval(scan, 3000);

  // ─── Observability + reassignment API ─────────────────────────────────────

  window.__debug = window.__debug || {};
  window.__debug["cl-skin"] = {
    palettes: PALETTES,
    palettesDark: PALETTES_DARK,
    cache,
    overrides,
    getColors: colorsFor,
    rescan: scan,
    // Reassign entity name to a different palette index (0-19)
    reassign(name, idx) {
      if (idx < 0 || idx >= PALETTES.length) throw new RangeError(`idx must be 0-${PALETTES.length - 1}`);
      overrides.set(name, idx);
      cache.delete(name);
      // Clear data-cl-colored so rows re-paint
      document.querySelectorAll(`[data-cl-colored="${name}"]`).forEach(el => {
        delete el.dataset.clColored;
      });
      scan();
    },
    // Reset an entity to its hash-derived colour
    reset(name) {
      overrides.delete(name);
      cache.delete(name);
      document.querySelectorAll(`[data-cl-colored="${name}"]`).forEach(el => {
        delete el.dataset.clColored;
      });
      scan();
    },
    resetAll() {
      overrides.clear();
      cache.clear();
      document.querySelectorAll("[data-cl-colored]").forEach(el => {
        delete el.dataset.clColored;
      });
      scan();
    },
  };

  if (PLUGINS.register) {
    PLUGINS.register("gmail-skin", () =>
      (SDK.React || window.React).createElement(
        "div",
        { style: { padding: "1rem", color: "#5f6368", fontSize: "0.875rem" } },
        "Clean Light skin active — entity colours injected.",
      ),
    );
  }

})();
