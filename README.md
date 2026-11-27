# OP-COM Visualizer Suite (`OP-COM-Visualizer-by-FlopyHU`)

A modular, zero-dependency, 100% client-side **OP-COM LiveData & Measuring Blocks Snapshot Visualizer** designed for Opel / Vauxhall diagnostics and ECU calibration analysis.

Companion open-source project to [Opel Generator Suite](https://github.com/FlopyHU/Opel-Generator-Suite-by-FlopyHU) by **FlopyHU** (Csönkös Csaba).

---

## Features

- **100% Module-Agnostic:** Works with any OP-COM control unit export — Engine (`Z17DTH`, `Z19DTH`, `Z16XEP`, etc.), ABS/ESP, CIM, REC, Instrument Cluster, or Transmission.
- **Dual Format Support:**
  - **LiveData Telemetry Logs (`[PROGVER]` / `[MODELINFO]` / `[ECUINFO]`):** Full time-series plotting with automatic Windows-1250/1252 degree-symbol decoding (`°C`) and duplicate-sensor disambiguation (e.g. `Boost Pressure [kPa]` vs `Boost Pressure [V]`).
  - **Measuring Blocks Snapshots:** Drop multiple snapshot CSVs simultaneously to generate an automatic side-by-side comparison diff table highlighting changed parameters.
- **Multi-Unit Overlay Engine:** Overlay any combination of parameters onto one interactive canvas with automatic multi-Y-axis grouping (`kPa`, `RPM`, `%`, `MPa`, `°C`, `V`) and LTTB downsampling for smooth 60 FPS zooming on 100,000+ row logs.
- **Calculated Virtual Math Channels:** Automatically derives **Boost Deviation** (`Actual - Commanded`), **Relative Boost (Gauge)** (`Boost - Barometric`), **Rail Pressure Error**, and **MAF Deviation** whenever matching sensors exist in the log.
- **Two-Point Delta Cursors (`Δt` & `Δy`):** Click any two timestamps on the graph to measure exact spool-up duration and parameter deltas.
- **VIN Privacy Masking & PNG Export:** One-click VIN masking before exporting clean PNG screenshots for forums, tuning logs, or bug reports.
- **Bilingual UI:** Instant English (`EN`) and Hungarian (`HU`) interface toggle.

---

## Deploying to GitHub Pages

1. Push this repository to GitHub (`FlopyHU/OP-COM-Visualizer-by-FlopyHU`).
2. Open **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment → Source**, select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)` folder, then click **Save**.
5. Your live visualizer will be available at `https://flopyhu.github.io/OP-COM-Visualizer-by-FlopyHU/`.

---

## Repository Structure

```text
OP-COM-Visualizer-by-FlopyHU/
├── index.html          # Main application UI & inline Opel Blitz branding
├── css/
│   └── style.css       # OEM-plus dark theme & responsive data tables
├── js/
│   ├── i18n.js         # EN / HU localization strings
│   ├── parser.js       # OP-COM LiveData & Snapshot CSV parser + virtual math channels
│   ├── chart.js        # LTTB-accelerated multi-Y-axis canvas telemetry renderer
│   └── app.js          # UI state, smart presets, snapshot diff table, PNG export
├── samples/            # Anonymized Z17DTH sample logs for instant demo mode
├── LICENSE             # Open-source non-commercial attribution license
└── README.md
```

---

## License & Attribution

Created by **FlopyHU** (Csönkös Csaba).  
Free for personal, educational, and automotive enthusiast use. Forks and contributor pull requests are welcome; uncredited copies or commercial redistribution without explicit permission are prohibited.
