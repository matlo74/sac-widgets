/**
 * Validation Flow Widget — Builder Panel
 * Version : 1.1.0
 * Vendor  : emineo
 *
 * Panneau de configuration affiché dans le sidebar SAC en mode design.
 * Permet de modifier en temps réel :
 *   - Titre du widget
 *   - Nombre de colonnes (1 à 5)
 *   - Afficher / masquer le nom du projet
 *
 * Chaque modification dispatche un événement "propertiesChanged" qui
 * met à jour immédiatement le widget principal sur le canvas.
 */
(function () {
  "use strict";

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

      /* ── Conteneur principal ───────────────────────────────────── */
      .bp-root {
        padding: 0;
      }

      /* ── Section ───────────────────────────────────────────────── */
      .bp-section {
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
      }
      .bp-section:last-child {
        border-bottom: none;
      }

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
      .bp-section-title svg {
        flex-shrink: 0;
        opacity: 0.7;
      }

      /* ── Field ─────────────────────────────────────────────────── */
      .bp-field {
        margin-bottom: 13px;
      }
      .bp-field:last-child {
        margin-bottom: 0;
      }

      .bp-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 6px;
      }

      /* ── Text input ────────────────────────────────────────────── */
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

      /* ── Segmented control (colonnes) ──────────────────────────── */
      .bp-segmented {
        display: flex;
        gap: 4px;
      }
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
      .bp-seg-btn:hover:not(.active) {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
      .bp-seg-btn.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
        box-shadow: 0 1px 4px rgba(59,130,246,0.35);
      }

      /* ── Toggle switch ─────────────────────────────────────────── */
      .bp-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .bp-toggle-label {
        font-size: 12.5px;
        color: #334155;
        font-weight: 500;
        flex: 1;
      }

      .bp-toggle {
        position: relative;
        width: 38px;
        height: 22px;
        flex-shrink: 0;
      }
      .bp-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }
      .bp-track {
        position: absolute;
        inset: 0;
        border-radius: 11px;
        background: #cbd5e1;
        cursor: pointer;
        transition: background 0.2s;
      }
      .bp-track::after {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        top: 3px;
        left: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        transition: transform 0.2s;
      }
      .bp-toggle input:checked ~ .bp-track {
        background: #3b82f6;
      }
      .bp-toggle input:checked ~ .bp-track::after {
        transform: translateX(16px);
      }
      .bp-toggle input:focus ~ .bp-track {
        box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
      }

      /* ── Palette de statuts (informative) ──────────────────────── */
      .bp-palette {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .bp-palette-row {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        color: #475569;
      }
      .bp-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .bp-palette-kw {
        color: #94a3b8;
        font-size: 11px;
        margin-left: auto;
        text-align: right;
      }

      /* ── Hint ───────────────────────────────────────────────────── */
      .bp-hint {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        padding: 9px 11px;
        font-size: 11.5px;
        color: #0369a1;
        line-height: 1.5;
      }
      .bp-hint strong {
        font-weight: 700;
      }
    </style>

    <div class="bp-root">

      <!-- ════ Section 1 : Apparence ════ -->
      <div class="bp-section">
        <p class="bp-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
               stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          Apparence
        </p>

        <!-- Titre -->
        <div class="bp-field">
          <label class="bp-label" for="bpTitle">Titre du widget</label>
          <input id="bpTitle" class="bp-input" type="text"
                 placeholder="Flux de Validation" maxlength="80" />
        </div>

        <!-- Colonnes -->
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

        <!-- Afficher projet -->
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

      <!-- ════ Section 2 : Palette statuts ════ -->
      <div class="bp-section">
        <p class="bp-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
               stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4l2 2"/>
          </svg>
          Palette de statuts (automatique)
        </p>
        <div class="bp-palette">
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#22c55e"></span>
            <span>Positif</span>
            <span class="bp-palette-kw">Validé · Approuvé · Terminé</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#3b82f6"></span>
            <span>En cours</span>
            <span class="bp-palette-kw">En cours</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#f59e0b"></span>
            <span>En attente</span>
            <span class="bp-palette-kw">En attente · Soumis</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#8b5cf6"></span>
            <span>Nouveau</span>
            <span class="bp-palette-kw">Nouveau · Ouvert</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#ef4444"></span>
            <span>Rejeté</span>
            <span class="bp-palette-kw">Rejeté · Refusé</span>
          </div>
          <div class="bp-palette-row">
            <span class="bp-dot" style="background:#f97316"></span>
            <span>Bloqué</span>
            <span class="bp-palette-kw">Bloqué</span>
          </div>
        </div>
      </div>

      <!-- ════ Section 3 : Feeds de données ════ -->
      <div class="bp-section">
        <p class="bp-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
               stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Données
        </p>
        <div class="bp-hint">
          <strong>14 feeds à remplir</strong> dans l'onglet "Données" :<br/><br/>
          <strong>Infos générales (7)</strong><br/>
          Demande · Statut Global · Utilisateur courant · Nom du projet ·
          Responsable projet · Statut action (code étape) · Responsable action<br/><br/>
          <strong>Responsables approbation (7)</strong><br/>
          A3 Ctrl Dpt · A4 Val Dpt · A5 Ctrl Section · A6 Val Section ·
          A7 Ctrl Décanat · A8 Val Décanat · B1 Val Rectorat
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
        showProjectName: true
      };
      this._ready = false;
    }

    connectedCallback() {
      this._attachListeners();
      this._ready = true;
      this._syncUI();
    }

    // ── SAC Lifecycle ──────────────────────────────────────────────
    onCustomWidgetBeforeUpdate(changed) {
      this._props = Object.assign({}, this._props, changed);
    }

    onCustomWidgetAfterUpdate(changed) {
      if (this._ready) this._syncUI();
    }

    // ── Listeners ─────────────────────────────────────────────────
    _attachListeners() {
      const r = this._root;

      // Titre — debounce 350 ms pour ne pas spammer SAC à chaque frappe
      const titleInput = r.getElementById("bpTitle");
      let titleTimer = null;
      titleInput.addEventListener("input", () => {
        clearTimeout(titleTimer);
        titleTimer = setTimeout(() => {
          this._dispatch("title", titleInput.value.trim() || "Flux de Validation");
        }, 350);
      });

      // Colonnes — segmented control
      const colsGroup = r.getElementById("bpColsGroup");
      colsGroup.addEventListener("click", (e) => {
        const btn = e.target.closest(".bp-seg-btn");
        if (!btn) return;
        const col = parseInt(btn.dataset.col, 10);
        this._setActiveCol(col);
        this._dispatch("maxColumns", col);
      });

      // Toggle afficher projet
      const showProjectCb = r.getElementById("bpShowProject");
      showProjectCb.addEventListener("change", () => {
        this._dispatch("showProjectName", showProjectCb.checked);
      });
    }

    // ── Synchronise l'UI avec les props courantes ──────────────────
    _syncUI() {
      const r = this._root;

      // Titre
      const titleInput = r.getElementById("bpTitle");
      if (titleInput && document.activeElement !== titleInput) {
        titleInput.value = this._props.title || "Flux de Validation";
      }

      // Colonnes
      const cols = parseInt(this._props.maxColumns, 10) || 3;
      this._setActiveCol(cols);

      // Toggle
      const showProjectCb = r.getElementById("bpShowProject");
      if (showProjectCb) {
        showProjectCb.checked = this._props.showProjectName !== false;
      }
    }

    _setActiveCol(col) {
      const r = this._root;
      r.querySelectorAll(".bp-seg-btn").forEach((btn) => {
        btn.classList.toggle("active", parseInt(btn.dataset.col, 10) === col);
      });
    }

    // ── Dispatch vers le widget principal ──────────────────────────
    _dispatch(key, value) {
      this._props[key] = value;
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        detail: { properties: { [key]: value } }
      }));
    }
  }

  // ── Enregistrement ────────────────────────────────────────────────
  if (!customElements.get("validation-flow-widget-builder")) {
    customElements.define("validation-flow-widget-builder", ValidationFlowWidgetBuilder);
  }

})();
