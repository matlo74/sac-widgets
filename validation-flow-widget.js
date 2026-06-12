/**
 * Validation Flow Widget — SAP Analytics Cloud Custom Widget
 * Version : 1.2.0
 * Vendor  : emineo
 *
 * Affiche un flux de validation en pipeline pour chaque demande.
 * Layout 3 bandes par card :
 *   1. En-tête  : ID demande · badge statut global · pill étape courante · projet
 *   2. Personnes : utilisateur courant · responsable projet (avatars initiales)
 *   3. Pipeline  : Département (A3·A4) › Section (A5·A6) › Décanat (A7·A8) › Rectorat (B1)
 *                  Statuts dérivés automatiquement depuis le code d'étape en cours.
 *
 * dataBinding "validationData" — 14 feeds dimension :
 *   demande | statutGlobal | currentUser | nomProjet | responsableProjet |
 *   statutAction | responsableAction |
 *   respA3 | respA4 | respA5 | respA6 | respA7 | respA8 | respB1
 *
 * properties : title (string) · maxColumns (int 1–5) · showProjectName (bool)
 * events     : onCardClick → { demandeId: string, statutGlobal: string }
 */
(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTANTES
  // ─────────────────────────────────────────────────────────────────────────

  /** Couleurs pour le statut global de la demande (badge + barre accent) */
  const STATUS_COLORS = {
    "validé":        "#22c55e",
    "approuvé":      "#22c55e",
    "terminé":       "#22c55e",
    "complété":      "#22c55e",
    "clôturé":       "#22c55e",
    "en cours":      "#3b82f6",
    "en attente":    "#f59e0b",
    "soumis":        "#f59e0b",
    "nouveau":       "#8b5cf6",
    "ouvert":        "#8b5cf6",
    "rejeté":        "#ef4444",
    "refusé":        "#ef4444",
    "bloqué":        "#f97316",
    "annulé":        "#6b7280",
    _default:        "#94a3b8"
  };

  /**
   * Configuration visuelle des statuts d'étape dérivés.
   * valide  = étape franchie avec responsable assigné
   * passe   = étape franchie sans responsable (auto-passée)
   * encours = étape active (= code dans "statutAction")
   * attente = étape future avec responsable assigné
   * nonassigne = étape future sans responsable
   */
  const STEP_CFG = {
    valide:     { bg:"#f0fdf4", bd:"solid #bbf7d0",    dot:"#22c55e", tx:"#15803d", lb:"Validé"     },
    encours:    { bg:"#eff6ff", bd:"solid #bfdbfe",    dot:"#3b82f6", tx:"#1d4ed8", lb:"En cours",  pulse:true },
    attente:    { bg:"#fffbeb", bd:"dashed #fde68a",   dot:"#f59e0b", tx:"#d97706", lb:"Attente"    },
    passe:      { bg:"#f8fafc", bd:"solid #e2e8f0",    dot:"#94a3b8", tx:"#94a3b8", lb:"Passé"      },
    nonassigne: { bg:"transparent", bd:"dashed #e2e8f0", dot:"#e2e8f0", tx:"#cbd5e1", lb:"—"        }
  };

  /** Ordre canonique des étapes d'approbation */
  const STEP_ORDER = ["A3", "A4", "A5", "A6", "A7", "A8", "B1"];

  /** Libellés courts affichés dans les boîtes d'étape */
  const STEP_LABEL = { A3:"Ctrl", A4:"Val", A5:"Ctrl", A6:"Val", A7:"Ctrl", A8:"Val", B1:"Val" };

  /** Groupes d'approbation */
  const GROUPS = [
    { label: "Département", steps: ["A3", "A4"] },
    { label: "Section",     steps: ["A5", "A6"] },
    { label: "Décanat",     steps: ["A7", "A8"] },
    { label: "Rectorat",    steps: ["B1"]        }
  ];

  /** Palette de couleurs pour les avatars (déterministe via hash du nom) */
  const AVATAR_PALETTE = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
    "#f59e0b", "#06b6d4", "#84cc16", "#f97316"
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  function getStatusColor(status) {
    if (!status) return STATUS_COLORS._default;
    return STATUS_COLORS[status.toLowerCase().trim()] || STATUS_COLORS._default;
  }

  function getInitials(name) {
    if (!name || name === "—") return "?";
    // Login SAC en majuscules sans espace (ex. AUBERTIJ) → 2 premiers chars
    if (name === name.toUpperCase() && !name.includes(" ") && name.length >= 4) {
      return name.slice(0, 2);
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarColor(name) {
    if (!name) return "#94a3b8";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  }

  /** Échappe les caractères HTML (prévention XSS) */
  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /**
   * Dérive le statut visuel d'une étape d'approbation.
   * @param {string}      stepId      Code de l'étape (A3…B1)
   * @param {string}      currentStep Code de l'étape active (depuis le feed statutAction)
   * @param {string|null} resp        Responsable assigné à cette étape (null si non lié)
   * @returns {"valide"|"encours"|"attente"|"passe"|"nonassigne"}
   */
  function deriveStepStatus(stepId, currentStep, resp) {
    const ci = STEP_ORDER.indexOf(currentStep);
    const si = STEP_ORDER.indexOf(stepId);
    // Si le code courant est inconnu, on traite toutes les étapes comme en attente
    if (ci === -1) return resp ? "attente" : "nonassigne";
    if (si < ci)   return resp ? "valide"  : "passe";
    if (si === ci) return "encours";
    return resp ? "attente" : "nonassigne";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHADOW DOM TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────
  const tpl = document.createElement("template");
  tpl.innerHTML = /* html */`
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        font-family: "72", "72full", Arial, Helvetica, sans-serif;
        overflow: auto;
        background: transparent;
      }
      *, *::before, *::after { box-sizing: border-box; }

      /* ── Racine ──────────────────────────────────────────────────── */
      .vfw-root {
        padding: 18px;
        min-height: 100%;
        background: #f1f5f9;
      }

      /* ── En-tête global ──────────────────────────────────────────── */
      .vfw-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 16px;
        gap: 8px;
        flex-wrap: wrap;
      }
      .vfw-title {
        font-size: 17px;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
        letter-spacing: -0.3px;
      }
      .vfw-count {
        font-size: 12px;
        color: #64748b;
        background: #e2e8f0;
        padding: 2px 10px;
        border-radius: 20px;
        font-weight: 500;
        white-space: nowrap;
      }

      /* ── Grille de cards ─────────────────────────────────────────── */
      .vfw-grid {
        display: grid;
        grid-template-columns: repeat(var(--cols, 3), minmax(320px, 1fr));
        gap: 14px;
        align-items: start;
      }

      /* ── Card ────────────────────────────────────────────────────── */
      .vfw-card {
        background: #ffffff;
        border-radius: 14px;
        box-shadow:
          0 1px 3px rgba(0,0,0,0.07),
          0 1px 2px rgba(0,0,0,0.04);
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .vfw-card:hover {
        transform: translateY(-3px);
        box-shadow:
          0 10px 28px rgba(0,0,0,0.11),
          0 3px 10px rgba(0,0,0,0.06);
      }
      .vfw-card:active { transform: translateY(-1px); }

      .vfw-accent {
        display: block;
        height: 4px;
        width: 100%;
      }

      /* ── Bande 1 : En-tête de card ───────────────────────────────── */
      .vfw-band-head {
        padding: 11px 14px 9px;
        border-bottom: 1px solid #f1f5f9;
      }
      .vfw-head-row {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .vfw-card-title {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }
      .vfw-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .vfw-badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }
      .vfw-step-pill {
        font-size: 11px;
        color: #475569;
        background: #f1f5f9;
        padding: 2px 7px;
        border-radius: 6px;
        font-weight: 600;
        flex-shrink: 0;
      }
      .vfw-proj {
        font-size: 12px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── Bande 2 : Personnes ─────────────────────────────────────── */
      .vfw-band-people {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 7px 14px;
        border-bottom: 1px solid #f1f5f9;
        background: #f8fafc;
      }
      .vfw-person {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .vfw-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
        line-height: 1;
      }
      .vfw-person-lbl {
        font-size: 10px;
        color: #94a3b8;
        line-height: 1.2;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .vfw-person-name {
        font-size: 12px;
        font-weight: 600;
        color: #334155;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vfw-sep {
        width: 1px;
        height: 28px;
        background: #e2e8f0;
        flex-shrink: 0;
      }

      /* ── Bande 3 : Pipeline d'approbation ───────────────────────── */
      .vfw-band-pipeline {
        padding: 10px 14px 12px;
        display: flex;
        align-items: flex-start;
        gap: 5px;
        overflow-x: auto;
      }

      /* Groupe d'étapes (ex. Département = A3+A4) */
      .vfw-grp {
        flex: 2;
        min-width: 128px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .vfw-grp.single {
        flex: 1;
        min-width: 64px;
      }
      .vfw-grp-lbl {
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
      }
      .vfw-grp-steps {
        display: flex;
        gap: 3px;
      }

      /* Boîte d'étape individuelle */
      .vfw-sbox {
        flex: 1;
        min-width: 0;
        border-radius: 6px;
        padding: 5px 6px;
        overflow: hidden;
      }
      .vfw-sbox-code {
        font-size: 10px;
        color: #94a3b8;
        font-weight: 600;
        white-space: nowrap;
      }
      .vfw-sbox-st {
        display: flex;
        align-items: center;
        gap: 3px;
        margin: 2px 0;
      }
      .vfw-sbox-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        flex-shrink: 0;
        display: inline-block;
      }
      .vfw-sbox-dot.pulse {
        animation: vfw-pulse 1.6s ease-in-out infinite;
      }
      .vfw-sbox-lb {
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vfw-sbox-resp {
        font-size: 11px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Flèche entre groupes */
      .vfw-arrow {
        display: flex;
        align-items: center;
        padding-top: 22px;
        color: #94a3b8;
        font-size: 16px;
        flex-shrink: 0;
        line-height: 1;
        user-select: none;
      }

      @keyframes vfw-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: 0.5; transform: scale(0.8); }
      }

      /* ── Empty state ─────────────────────────────────────────────── */
      .vfw-empty {
        grid-column: 1 / -1;
        text-align: center;
        padding: 52px 24px;
        color: #94a3b8;
      }
      .vfw-empty svg {
        margin: 0 auto 14px;
        opacity: 0.35;
        display: block;
      }
      .vfw-empty p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      }
      .vfw-empty small {
        font-size: 12px;
        color: #cbd5e1;
        display: block;
        margin-top: 6px;
      }
    </style>

    <div class="vfw-root">
      <div class="vfw-header">
        <h1 class="vfw-title" id="vfwTitle">Flux de Validation</h1>
        <span class="vfw-count" id="vfwCount">0 demande(s)</span>
      </div>
      <div class="vfw-grid" id="vfwGrid">
        <div class="vfw-empty">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.4"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          <p>Liez un modèle SAC pour afficher les demandes</p>
          <small>Glissez les 14 dimensions sur les feeds de données</small>
        </div>
      </div>
    </div>
  `;

  // ─────────────────────────────────────────────────────────────────────────
  // WEB COMPONENT
  // ─────────────────────────────────────────────────────────────────────────
  class ValidationFlowWidget extends HTMLElement {

    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
      this._root.appendChild(tpl.content.cloneNode(true));
      this._props = {
        title:           "Flux de Validation",
        maxColumns:      3,
        showProjectName: true,
        feedMapping:     {},
        availableDims:   ""
      };
    }

    // ── Lifecycle SAC ──────────────────────────────────────────────
    connectedCallback() {
      this._render();
    }

    onCustomWidgetBeforeUpdate(changed) {
      this._props = Object.assign({}, this._props, changed);
    }

    onCustomWidgetAfterUpdate(changed) {
      this._render();
    }

    onCustomWidgetResize() {
      // Grille CSS fluide — pas de traitement requis
    }

    onCustomWidgetDestroy() {
      // Pas de ressources externes à libérer
    }

    // ── Getters / Setters (requis par le framework SAC) ────────────
    get title()            { return this._props.title; }
    set title(v)           { this._set("title", v); }

    get maxColumns()       { return this._props.maxColumns; }
    set maxColumns(v)      { this._set("maxColumns", v); }

    get showProjectName()  { return this._props.showProjectName; }
    set showProjectName(v) { this._set("showProjectName", v); }

    get feedMapping()      { return this._props.feedMapping; }
    set feedMapping(v)     { this._set("feedMapping", v); }

    _set(key, value) {
      this._props[key] = value;
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        detail: { properties: { [key]: value } }
      }));
    }

    // ── Construit l'index : ID technique dimension → N dans dimensions_N ──
    /**
     * Lit db.metadata pour savoir quelle colonne (dimensions_N)
     * correspond à quel ID technique de dimension SAC.
     *
     * Supporte : metadata.feeds[].dimensions = ["DimId", ...] ou [{ id:"DimId" }, ...]
     *
     * @param {object} metadata  db.metadata du data binding SAC
     * @returns {Object.<string,number>}  { "NumeroDemande": 0, "Category": 1, ... }
     */
    _buildDimIndex(metadata) {
      const map = {};
      if (!metadata || !Array.isArray(metadata.feeds)) return map;
      let globalIdx = 0;
      for (const feed of metadata.feeds) {
        const dims = Array.isArray(feed.dimensions) ? feed.dimensions : [];
        for (const dim of dims) {
          const id = typeof dim === "string" ? dim
                   : (dim.id || dim.dimensionId || dim.name || null);
          if (id) map[id] = globalIdx;
          globalIdx++;
        }
      }
      return map;
    }

    // ── Normalise un ID pour comparaison souple ───────────────────
    _normId(s) {
      return String(s || "").toLowerCase().replace(/[\s_\-\.]/g, "");
    }

    // ── Lit la valeur d'une dimension/propriété via son ID ─────────
    _getValueByDimId(row, dimId, dimIndex) {
      if (!dimId) return null;
      const norm = this._normId(dimId);

      // 1. Via l'index de métadonnées (méthode principale) ──────────
      if (dimIndex) {
        // Correspondance exacte
        let idx = dimIndex[dimId];
        if (idx === undefined) {
          // Correspondance normalisée (ignore casse, espaces, tirets)
          for (const [k, v] of Object.entries(dimIndex)) {
            if (this._normId(k) === norm) { idx = v; break; }
          }
        }
        if (idx !== undefined) {
          const cell = row[`dimensions_${idx}`];
          if (cell) return cell.label || cell.description || cell.id || null;
        }
      }

      // 2. Clé exacte dans la row (certaines versions SAC)
      const c1 = row[dimId];
      if (c1 != null) return c1.label || c1.description || c1.id || String(c1) || null;

      // 3. Clé normalisée dans la row
      for (const key of Object.keys(row)) {
        if (this._normId(key) === norm) {
          const c = row[key];
          if (c != null) return c.label || c.description || c.id || String(c) || null;
        }
      }

      // 4. Scan dimensions_N — cherche une cellule dont l'id ou label correspond
      for (const key of Object.keys(row)) {
        if (!key.startsWith("dimensions_")) continue;
        const cell = row[key];
        if (cell && (this._normId(cell.id) === norm || this._normId(cell.label) === norm)) {
          return cell.label || cell.id || null;
        }
      }
      return null;
    }

    // ── Résout le feedMapping (string JSON ou objet) ───────────────
    _parseFeedMapping() {
      const fm = this._props.feedMapping;
      if (!fm) return {};
      if (typeof fm === "string") {
        try { return JSON.parse(fm); } catch (e) { return {}; }
      }
      return (typeof fm === "object") ? fm : {};
    }

    // ── Render principal ───────────────────────────────────────────
    _render() {
      const r = this._root;

      r.getElementById("vfwTitle").textContent =
        this._props.title || "Flux de Validation";

      const cols = Math.min(Math.max(parseInt(this._props.maxColumns, 10) || 3, 1), 5);
      r.getElementById("vfwGrid").style.setProperty("--cols", cols);

      try {
        const db = this.dataBindings && this.dataBindings.getDataBinding("validationData");

        // ── Met à jour availableDims pour le builder panel ─────────
        if (db && db.metadata) {
          const dimIndex = this._buildDimIndex(db.metadata);
          const dimList  = Object.keys(dimIndex).join("|");
          if (dimList !== this._props.availableDims) {
            this._props.availableDims = dimList;
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
              detail: { properties: { availableDims: dimList } }
            }));
          }
        }

        if (db && Array.isArray(db.data) && db.data.length > 0) {
          const feedMapping = this._parseFeedMapping();
          const dimIndex    = this._buildDimIndex(db.metadata);
          console.info("[ValidationFlow] dimIndex :", dimIndex,
                       "feedMapping :", feedMapping,
                       "1er row :", Object.keys(db.data[0] || {}));
          this._renderCardsByMapping(r.getElementById("vfwGrid"), db.data, feedMapping, dimIndex);
          const n = db.data.length;
          r.getElementById("vfwCount").textContent =
            `${n} demande${n > 1 ? "s" : ""}`;
          return;
        }
        if (db) {
          console.info("[ValidationFlow] binding connecté mais data vide.",
            "metadata :", db.metadata);
        }
      } catch (err) {
        console.warn("[ValidationFlowWidget] Erreur data binding :", err);
      }

      this._renderEmpty(r.getElementById("vfwGrid"));
      r.getElementById("vfwCount").textContent = "0 demande";
    }

    _renderEmpty(grid) {
      grid.innerHTML = `
        <div class="vfw-empty">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.4"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          <p>Liez un modèle SAC pour afficher les demandes</p>
          <small>Glissez les 14 dimensions sur les feeds de données</small>
        </div>`;
    }

    // ── Rendu via feedMapping (IDs techniques de dimension) ───────
    _renderCardsByMapping(grid, rows, feedMapping, dimIndex) {
      grid.innerHTML = "";
      const showProject = this._props.showProjectName !== false;

      rows.forEach((row) => {
        const g = (fId) => this._getValueByDimId(row, feedMapping[fId], dimIndex);
        const demande    = g("demande")           || "—";
        const stGlobal   = g("statutGlobal")      || "—";
        const user       = g("currentUser")       || "—";
        const projet     = g("nomProjet")         || "—";
        const respProjet = g("responsableProjet") || "—";
        const curStep    = g("statutAction")      || "";
        const respSteps  = {
          A3: g("respA3"), A4: g("respA4"),
          A5: g("respA5"), A6: g("respA6"),
          A7: g("respA7"), A8: g("respA8"),
          B1: g("respB1")
        };

        const globalColor = getStatusColor(stGlobal);
        const badgeBg     = globalColor + "1F";
        const badgeBorder = globalColor + "33";
        const avatarUser  = getAvatarColor(user);
        const avatarResp  = getAvatarColor(respProjet);

        const pipelineHTML = GROUPS.map((grp, i) => {
          const stepsHtml = grp.steps
            .map(sid => this._renderStepBox(sid, respSteps[sid], curStep))
            .join("");
          const grpClass = grp.steps.length === 1 ? "vfw-grp single" : "vfw-grp";
          const arrow    = i < GROUPS.length - 1 ? '<div class="vfw-arrow">›</div>' : "";
          return `<div class="${grpClass}">
            <div class="vfw-grp-lbl">${esc(grp.label)}</div>
            <div class="vfw-grp-steps">${stepsHtml}</div>
          </div>${arrow}`;
        }).join("");

        const card = document.createElement("div");
        card.className = "vfw-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.innerHTML = /* html */`
          <span class="vfw-accent" style="background:${globalColor}"></span>
          <div class="vfw-band-head">
            <div class="vfw-head-row">
              <span class="vfw-card-title">${esc(demande)}</span>
              <span class="vfw-badge"
                    style="background:${badgeBg};color:${globalColor};border:1px solid ${badgeBorder};">
                <span class="vfw-badge-dot"></span>${esc(stGlobal)}
              </span>
              ${curStep ? `<span class="vfw-step-pill">Étape : ${esc(curStep)}</span>` : ""}
            </div>
            ${showProject ? `<div class="vfw-proj">${esc(projet)}</div>` : ""}
          </div>
          <div class="vfw-band-people">
            <div class="vfw-person">
              <span class="vfw-avatar" style="background:${avatarUser};" title="${esc(user)}">
                ${esc(getInitials(user))}
              </span>
              <div>
                <div class="vfw-person-lbl">Utilisateur</div>
                <div class="vfw-person-name">${esc(user)}</div>
              </div>
            </div>
            <div class="vfw-sep"></div>
            <div class="vfw-person" style="flex:1;">
              <span class="vfw-avatar" style="background:${avatarResp};" title="${esc(respProjet)}">
                ${esc(getInitials(respProjet))}
              </span>
              <div style="min-width:0;">
                <div class="vfw-person-lbl">Resp. projet</div>
                <div class="vfw-person-name">${esc(respProjet)}</div>
              </div>
            </div>
          </div>
          <div class="vfw-band-pipeline">${pipelineHTML}</div>`;

        const fireClick = () => {
          this.dispatchEvent(new CustomEvent("onCardClick", {
            bubbles: false,
            detail: { demandeId: demande, statutGlobal: stGlobal }
          }));
        };
        card.addEventListener("click", fireClick);
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fireClick(); }
        });
        grid.appendChild(card);
      });
    }

    // ── Rendu d'une boîte d'étape ──────────────────────────────────
    /**
     * @param {string}      stepId       Code étape (A3…B1)
     * @param {string|null} resp         Responsable pour cette étape
     * @param {string}      currentStep  Code de l'étape active
     * @returns {string} HTML de la boîte
     */
    _renderStepBox(stepId, resp, currentStep) {
      const status = deriveStepStatus(stepId, currentStep, resp);
      const cfg    = STEP_CFG[status];
      const firstName = (resp && resp !== "—") ? (resp.split(" ")[0] || "") : "";
      const pulseClass = cfg.pulse ? " pulse" : "";

      return /* html */`
        <div class="vfw-sbox" style="background:${cfg.bg};border:1px ${cfg.bd};">
          <div class="vfw-sbox-code">${esc(stepId)} · ${STEP_LABEL[stepId]}</div>
          <div class="vfw-sbox-st">
            <span class="vfw-sbox-dot${pulseClass}" style="background:${cfg.dot};"></span>
            <span class="vfw-sbox-lb" style="color:${cfg.tx};">${cfg.lb}</span>
          </div>
          ${firstName ? `<div class="vfw-sbox-resp">${esc(firstName)}</div>` : ""}
        </div>`;
    }

    // ── Rendu de toutes les cards ──────────────────────────────────
    _renderCards(grid, rows, fieldMap) {
      grid.innerHTML = "";
      const showProject = this._props.showProjectName !== false;

      rows.forEach((row) => {
        // ── Extraction des champs ──────────────────────────────────
        const demande    = this._getValue(row, fieldMap, "demande")           || "—";
        const stGlobal   = this._getValue(row, fieldMap, "statutGlobal")      || "—";
        const user       = this._getValue(row, fieldMap, "currentUser")       || "—";
        const projet     = this._getValue(row, fieldMap, "nomProjet")         || "—";
        const respProjet = this._getValue(row, fieldMap, "responsableProjet") || "—";
        const curStep    = this._getValue(row, fieldMap, "statutAction")      || "";

        // Responsables par étape d'approbation
        const respSteps = {
          A3: this._getValue(row, fieldMap, "respA3"),
          A4: this._getValue(row, fieldMap, "respA4"),
          A5: this._getValue(row, fieldMap, "respA5"),
          A6: this._getValue(row, fieldMap, "respA6"),
          A7: this._getValue(row, fieldMap, "respA7"),
          A8: this._getValue(row, fieldMap, "respA8"),
          B1: this._getValue(row, fieldMap, "respB1")
        };

        // ── Couleurs ───────────────────────────────────────────────
        const globalColor = getStatusColor(stGlobal);
        const badgeBg     = globalColor + "1F"; // ~12% opacité
        const badgeBorder = globalColor + "33"; // ~20% opacité
        const avatarUser  = getAvatarColor(user);
        const avatarResp  = getAvatarColor(respProjet);

        // ── HTML pipeline ──────────────────────────────────────────
        const pipelineHTML = GROUPS.map((g, i) => {
          const isLast   = (i === GROUPS.length - 1);
          const stepsHtml = g.steps
            .map(sid => this._renderStepBox(sid, respSteps[sid], curStep))
            .join("");
          const grpClass  = g.steps.length === 1 ? "vfw-grp single" : "vfw-grp";
          const arrow     = isLast ? "" : '<div class="vfw-arrow">›</div>';
          return /* html */`
            <div class="${grpClass}">
              <div class="vfw-grp-lbl">${esc(g.label)}</div>
              <div class="vfw-grp-steps">${stepsHtml}</div>
            </div>${arrow}`;
        }).join("");

        // ── DOM card ───────────────────────────────────────────────
        const card = document.createElement("div");
        card.className = "vfw-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label",
          `Demande : ${demande} — Statut : ${stGlobal}`);

        card.innerHTML = /* html */`
          <span class="vfw-accent" style="background:${globalColor}"></span>

          <!-- Bande 1 : En-tête -->
          <div class="vfw-band-head">
            <div class="vfw-head-row">
              <span class="vfw-card-title">${esc(demande)}</span>
              <span class="vfw-badge"
                    style="background:${badgeBg};color:${globalColor};border:1px solid ${badgeBorder};">
                <span class="vfw-badge-dot"></span>${esc(stGlobal)}
              </span>
              ${curStep
                ? `<span class="vfw-step-pill">Étape : ${esc(curStep)}</span>`
                : ""}
            </div>
            ${showProject
              ? `<div class="vfw-proj">${esc(projet)}</div>`
              : ""}
          </div>

          <!-- Bande 2 : Personnes -->
          <div class="vfw-band-people">
            <div class="vfw-person">
              <span class="vfw-avatar"
                    style="background:${avatarUser};"
                    title="${esc(user)}">
                ${esc(getInitials(user))}
              </span>
              <div>
                <div class="vfw-person-lbl">Utilisateur</div>
                <div class="vfw-person-name">${esc(user)}</div>
              </div>
            </div>
            <div class="vfw-sep"></div>
            <div class="vfw-person" style="flex:1;">
              <span class="vfw-avatar"
                    style="background:${avatarResp};"
                    title="${esc(respProjet)}">
                ${esc(getInitials(respProjet))}
              </span>
              <div style="min-width:0;">
                <div class="vfw-person-lbl">Resp. projet</div>
                <div class="vfw-person-name">${esc(respProjet)}</div>
              </div>
            </div>
          </div>

          <!-- Bande 3 : Pipeline -->
          <div class="vfw-band-pipeline">${pipelineHTML}</div>
        `;

        // ── Événement clic ────────────────────────────────────────
        const fireClick = () => {
          this.dispatchEvent(new CustomEvent("onCardClick", {
            bubbles: false,
            detail: { demandeId: demande, statutGlobal: stGlobal }
          }));
        };
        card.addEventListener("click", fireClick);
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fireClick();
          }
        });

        grid.appendChild(card);
      });
    }
  }

  // ── Enregistrement du Web Component ──────────────────────────────
  if (!customElements.get("validation-flow-widget")) {
    customElements.define("validation-flow-widget", ValidationFlowWidget);
  }

})();
