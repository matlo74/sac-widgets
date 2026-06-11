/**
 * Validation Flow Widget — Builder Panel
 * Version : 1.2.0
 * Vendor  : emineo
 *
 * Panel de configuration affiché dans le sidebar SAC (onglet "Générateur").
 * Sections :
 *   1. Apparence  — titre, colonnes, afficher projet
 *   2. Mapping    — 14 champs texte pour mapper les IDs de dimension SAC
 *   3. Palette    — référence visuelle des statuts (informatif)
 */
(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION DES 14 FEEDS
  // ─────────────────────────────────────────────────────────────────────────
  const FEED_LABELS = [
    // ── Infos générales ──────────────────────────────────────────
    { id: "demande",           label: "Demande",               group: "Infos générales", ph: "ex: NumeroDemande" },
    { id: "statutGlobal",      label: "Statut Global",         group: "Infos générales", ph: "ex: Category" },
    { id: "currentUser",       label: "Utilisateur courant",   group: "Infos générales", ph: "ex: Current User" },
    { id: "nomProjet",         label: "Nom du Projet",         group: "Infos générales", ph: "ex: Nom du Projet" },
    { id: "responsableProjet", label: "Resp. Projet",          group: "Infos générales", ph: "ex: Responsable Projet" },
    { id: "statutAction",      label: "Code étape (A3…B1)",    group: "Infos générales", ph: "ex: Statut Action" },
    { id: "responsableAction", label: "Resp. action courante", group: "Infos générales", ph: "ex: Resp. Action En cours" },
    // ── Responsables approbation ─────────────────────────────────
    { id: "respA3", label: "A3 · Ctrl Département", group: "Responsables approbation", ph: "ex: Resp. Contrôle Dpt" },
    { id: "respA4", label: "A4 · Val Département",  group: "Responsables approbation", ph: "" },
    { id: "respA5", label: "A5 · Ctrl Section",     group: "Responsables approbation", ph: "ex: Resp. Contrôle Section" },
    { id: "respA6", label: "A6 · Val Section",      group: "Responsables approbation", ph: "" },
    { id: "respA7", label: "A7 · Ctrl Décanat",     group: "Responsables approbation", ph: "ex: Resp. Contrôle Décanat" },
    { id: "respA8", label: "A8 · Val Décanat",      group: "Responsables approbation", ph: "" },
    { id: "respB1", label: "B1 · Val Rectorat",     group: "Responsables approbation", ph: "" }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // SHADOW DOM TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────
  const tpl = document.createElement("template");
  tpl.innerHTML = /* html */`
    <style>
      :host {
        display: block;
        width: 100%;
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        font-size: 13px;
        color: #1e293b;
        box-sizing: border-box;
      }
      *, *::before, *::after { box-sizing: border-box; }

      .bp-section {
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
      }
      .bp-section:last-child { border-bottom: none; }

      .bp-section-title {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.7px;
        margin: 0 0 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .bp-section-title svg { flex-shrink: 0; opacity: 0.7; }

      .bp-field { margin-bottom: 13px; }
      .bp-field:last-child { margin-bottom: 0; }

      .bp-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 6px;
      }

      .bp-input {
        width: 100%;
        padding: 7px 10px;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        font-size: 13px;
        font-family: inherit;
        color: #0f172a;
        background: #f8fafc;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .bp-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        background: #fff;
      }

      .bp-segmented { display: flex; gap: 4px; }
      .bp-seg-btn {
        flex: 1;
        padding: 6px 0;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        color: #475569;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.14s, border-color 0.14s, color 0.14s;
        text-align: center;
      }
      .bp-seg-btn:hover:not(.active) { background: #f1f5f9; border-color: #cbd5e1; }
      .bp-seg-btn.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
        box-shadow: 0 1px 4px rgba(59,130,246,0.35);
      }

      .bp-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .bp-toggle-label { font-size: 12.5px; color: #334155; font-weight: 500; flex: 1; }
      .bp-toggle { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
      .bp-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .bp-track {
        position: absolute; inset: 0; border-radius: 11px;
        background: #cbd5e1; cursor: pointer; transition: background 0.2s;
      }
      .bp-track::after {
        content: ""; position: absolute;
        width: 16px; height: 16px; border-radius: 50%;
        background: #fff; top: 3px; left: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform 0.2s;
      }
      .bp-toggle input:checked ~ .bp-track { background: #3b82f6; }
      .bp-toggle input:checked ~ .bp-track::after { transform: translateX(16px); }
      .bp-toggle input:focus ~ .bp-track { box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }

      /* ── Mapping ───────────────────────────────────────────────── */
      .bp-map-info {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11.5px;
        color: #0369a1;
        line-height: 1.5;
        margin-bottom: 12px;
      }
      .bp-map-group-lbl {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #94a3b8;
        margin: 10px 0 5px;
        padding-top: 8px;
        border-top: 1px dashed #e2e8f0;
      }
      .bp-map-group-lbl:first-child { margin-top: 0; padding-top: 0; border-top: none; }
      .bp-map-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 6px;
        align-items: center;
        margin-bottom: 4px;
      }
      .bp-map-lbl {
        font-size: 11.5px;
        font-weight: 600;
        color: #475569;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bp-map-input {
        padding: 5px 8px;
        border: 1.5px solid #e2e8f0;
        border-radius: 6px;
        font-size: 11px;
        font-family: inherit;
        color: #0f172a;
        background: #f8fafc;
        outline: none;
        transition: border-color 0.15s;
        min-width: 0;
        width: 100%;
      }
      .bp-map-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
        background: #fff;
      }
      .bp-map-input::placeholder { color: #cbd5e1; font-style: italic; font-size: 10.5px; }
      .bp-map-input.filled { background: #f0fdf4; border-color: #bbf7d0; }

      /* ── Palette ───────────────────────────────────────────────── */
      .bp-palette { display: flex; flex-direction: column; gap: 5px; }
      .bp-palette-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #475569; }
      .bp-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
      .bp-palette-kw { color: #94a3b8; font-size: 11px; margin-left: auto; text-align: right; }
    </style>

    <div class="bp-root">

      <!-- ════ Section 1 : Apparence ════ -->
      <div class="bp-section">
        <p class="bp-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          Apparence
        </p>
        <div class="bp-field">
          <label class="bp-label" for="bpTitle">Titre du widget</label>
          <input id="bpTitle" class="bp-input" type="text"
                 placeholder="Flux de Validation" maxlength="80" />
        </div>
        <div class="bp-field">
          <span class="bp-label">Colonnes</span>
          <div class="bp-segmented" id="bpColsGroup">
            <button class="bp-seg-btn" data-col="1">1</button>
            <button class="bp-seg-btn" data-col="2">2</button>
            <button class="bp-seg-btn active" data-col="3">3</button>
            <button class="bp-seg-btn" data-col="4">4</button>
            <button class="bp-seg-btn" data-col="5">5</button>
          </div>
        </div>
        <div class="bp-field">
          <div class="bp-toggle-row">
            <span class="bp-toggle-label">Afficher le nom du projet</span>
            <label class="bp-toggle">
              <input id="bpShowProject" type="checkbox" checked />
              <span class="bp-track"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- ════ Section 2 : Mapping des dimensions ════ -->
      <div class="bp-section">
        <p class="bp-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Mapping des dimensions
        </p>
        <div class="bp-map-info">
          Saisissez l'<strong>ID technique</strong> de chaque dimension SAC.<br/>
          <em>Trouvez-les dans votre modèle → onglet Dimensions.</em>
        </div>
        <div id="bpMappingFields"><!-- généré --></div>
      </div>

      <!-- ════ Section 3 : Palette statuts ════ -->
      <div class="bp-section">
        <p class="bp-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
          </svg>
          Palette de statuts
        </p>
        <div class="bp-palette">
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#22c55e"></span>
            <span>Validé</span>
            <span class="bp-palette-kw">Validé · Approuvé · Terminé</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#3b82f6"></span>
            <span>En cours</span>
            <span class="bp-palette-kw">En cours</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#f59e0b"></span>
            <span>Attente</span>
            <span class="bp-palette-kw">Attente · Soumis</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#94a3b8"></span>
            <span>Passé</span>
            <span class="bp-palette-kw">Étape franchie sans resp.</span>
          </div>
        </div>
      </div>

    </div>
  `;

  // ─────────────────────────────────────────────────────────────────────────
  // WEB COMPONENT — BUILDER PANEL
  // ─────────────────────────────────────────────────────────────────────────
  class ValidationFlowWidgetBuilder extends HTMLElement {

    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
      this._root.appendChild(tpl.content.cloneNode(true));
      this._props = {
        title:           "Flux de Validation",
        maxColumns:      3,
        showProjectName: true,
        feedMapping:     {}
      };
      this._ready  = false;
      this._timers = {};
    }

    connectedCallback() {
      this._renderMappingFields();
      this._attachListeners();
      this._ready = true;
      this._syncUI();
    }

    // ── SAC Lifecycle ──────────────────────────────────────────────
    onCustomWidgetBeforeUpdate(changed) {
      this._props = Object.assign({}, this._props, changed);
    }
    onCustomWidgetAfterUpdate() {
      if (this._ready) this._syncUI();
    }

    // ── Génération des champs de mapping ──────────────────────────
    _renderMappingFields() {
      const container = this._root.getElementById("bpMappingFields");
      if (!container) return;
      let currentGroup = null;
      let html = "";
      FEED_LABELS.forEach(({ id, label, group, ph }) => {
        if (group !== currentGroup) {
          currentGroup = group;
          html += `<div class="bp-map-group-lbl">${group}</div>`;
        }
        html += `
          <div class="bp-map-row">
            <span class="bp-map-lbl" title="${label}">${label}</span>
            <input class="bp-map-input"
                   data-feed-id="${id}"
                   placeholder="${ph}"
                   type="text"
                   autocomplete="off"
                   spellcheck="false" />
          </div>`;
      });
      container.innerHTML = html;
    }

    // ── Listeners ─────────────────────────────────────────────────
    _attachListeners() {
      const r = this._root;

      // Titre
      const titleInput = r.getElementById("bpTitle");
      titleInput.addEventListener("input", () => {
        this._debounce("title", 350, () => {
          this._dispatch("title", titleInput.value.trim() || "Flux de Validation");
        });
      });

      // Colonnes
      r.getElementById("bpColsGroup").addEventListener("click", (e) => {
        const btn = e.target.closest(".bp-seg-btn");
        if (!btn) return;
        const col = parseInt(btn.dataset.col, 10);
        this._setActiveCol(col);
        this._dispatch("maxColumns", col);
      });

      // Toggle projet
      r.getElementById("bpShowProject").addEventListener("change", (e) => {
        this._dispatch("showProjectName", e.target.checked);
      });

      // Mapping inputs — dispatch groupé avec debounce
      r.getElementById("bpMappingFields").addEventListener("input", (e) => {
        const input = e.target.closest(".bp-map-input");
        if (!input) return;
        const feedId = input.dataset.feedId;
        if (!feedId) return;
        input.classList.toggle("filled", input.value.trim().length > 0);
        this._debounce("map_" + feedId, 400, () => {
          const newMap = Object.assign({}, this._props.feedMapping || {});
          newMap[feedId] = input.value.trim();
          this._props.feedMapping = newMap;
          this._dispatch("feedMapping", newMap);
        });
      });
    }

    // ── Synchronise l'UI ──────────────────────────────────────────
    _syncUI() {
      const r = this._root;

      const titleInput = r.getElementById("bpTitle");
      if (titleInput && document.activeElement !== titleInput) {
        titleInput.value = this._props.title || "Flux de Validation";
      }

      this._setActiveCol(parseInt(this._props.maxColumns, 10) || 3);

      const cb = r.getElementById("bpShowProject");
      if (cb) cb.checked = this._props.showProjectName !== false;

      const mapping = this._props.feedMapping || {};
      FEED_LABELS.forEach(({ id }) => {
        const input = r.querySelector(`.bp-map-input[data-feed-id="${id}"]`);
        if (!input || document.activeElement === input) return;
        input.value = mapping[id] || "";
        input.classList.toggle("filled", (mapping[id] || "").trim().length > 0);
      });
    }

    _setActiveCol(col) {
      this._root.querySelectorAll(".bp-seg-btn").forEach((btn) => {
        btn.classList.toggle("active", parseInt(btn.dataset.col, 10) === col);
      });
    }

    _debounce(key, ms, fn) {
      clearTimeout(this._timers[key]);
      this._timers[key] = setTimeout(fn, ms);
    }

    _dispatch(key, value) {
      this._props[key] = value;
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        detail: { properties: { [key]: value } }
      }));
    }
  }

  if (!customElements.get("validation-flow-widget-builder")) {
    customElements.define("validation-flow-widget-builder", ValidationFlowWidgetBuilder);
  }

})();
