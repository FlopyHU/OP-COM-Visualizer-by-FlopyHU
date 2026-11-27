# OP-COM Visualizer Suite (`OP-COM-Visualizer-by-FlopyHU`)

[English](#english) | [Magyar](#magyar)

---

<a name="english"></a>
## English

A modular, zero-dependency, 100% client-side **OP-COM LiveData & Measuring Blocks Snapshot Visualizer** for Opel / Vauxhall diagnostics and ECU calibration analysis, created by **FlopyHU**.

Companion open-source project to [Opel Generator Suite](https://github.com/FlopyHU/Opel-Generator-Suite-by-FlopyHU).

### Key Features
- **Module-Agnostic Parser:** Works with any OP-COM export regardless of control unit or model — Engine (`Z17DTH`, `Z19DTH`, `Z16XEP`, etc.), ABS/ESP, CIM, REC, Instrument Cluster, or Transmission.
- **LiveData & Snapshot Support:**
  - **LiveData Telemetry Logs (`[PROGVER]` / `[MODELINFO]` / `[ECUINFO]`):** Full time-series visualization with automatic Windows-1250/1252 degree symbol (`°C`) decoding and duplicate header disambiguation (such as `Boost Pressure [kPa]` vs. `Boost Pressure [V]`).
  - **Measuring Blocks Snapshots:** Drop multiple snapshot CSV files at once for an automatic side-by-side comparison diff table with a changed-values-only filter.
- **Multi-Unit Overlay & Math Channels:** Overlay any channels onto one chart with automatic multi-Y-axis scaling (`kPa`, `RPM`, `%`, `MPa`, `°C`, `V`), LTTB downsampling for smooth zooming on large logs, and calculated virtual channels (*Boost Deviation*, *Relative Boost*, *Rail Pressure Error*, *MAF Deviation*).
- **Delta Cursors, Privacy & Export:** Measure `Δt` and `Δy` between two clicked points on the graph, toggle VIN masking before sharing screenshots, export the chart as PNG, and switch between **EN** and **HU** in the UI.

### GitHub Pages Setup
1. Push all files to `FlopyHU/OP-COM-Visualizer-by-FlopyHU` keeping the `css/`, `js/`, and `samples/` folders intact.
2. Go to **Settings → Pages** in the repository.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**, select the `main` branch and `/ (root)` folder, and click **Save**.
4. Open the published site at `https://flopyhu.github.io/OP-COM-Visualizer-by-FlopyHU/`.

### Project Structure
```text
OP-COM-Visualizer-by-FlopyHU/
├── index.html
├── README.md
├── LICENSE
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── chart.js
│   ├── i18n.js
│   └── parser.js
└── samples/
    ├── Sample_Livedata_Astra-H_Z17DTH.csv
    ├── Sample_Snapshot_1_ColdWarmup.csv
    ├── Sample_Snapshot_2_OperatingTemp.csv
    └── gary.txt
```

---

<a name="magyar"></a>
## Magyar

Moduláris, külső függőségek nélküli, 100%-ban böngészőben (kliensoldalon) futó **OP-COM LiveData és Mérőblokk-pillanatkép Vizualizáló** Opel / Vauxhall hibakereséshez és ECU-logok elemzéséhez, **FlopyHU** fejlesztésében.

A [FlopyHU/Opel-Generator-Suite-by-FlopyHU](https://github.com/FlopyHU/Opel-Generator-Suite-by-FlopyHU) projekt testvér-alkalmazása.

### Főbb funkciók
- **Modul-független feldolgozás:** Bármilyen vezérlőegység és típus OP-COM CSV exportját kezeli — Motor (`Z17DTH`, `Z19DTH`, `Z16XEP` stb.), ABS/ESP, CIM, REC, műszeregység vagy váltó.
- **LiveData és Pillanatkép mód:**
  - **LiveData telemetria (`[PROGVER]` / `[MODELINFO]` / `[ECUINFO]`):** Idősoros grafikon automatikus Windows-1250/1252 fokjel (`°C`) dekódolással és azonos nevű oszlopok szétválasztásával (például `Boost Pressure [kPa]` és `Boost Pressure [V]`).
  - **Mérőblokk-pillanatképek:** Több pillanatkép CSV egyszerre történő behúzásakor automatikus összehasonlító táblázatot készít, és külön szűrhető benne, mi változott.
- **Többtengelyes átfedés és matek csatornák:** Több mérőblokk egymásra vetítése automatikus mértékegység-alapú Y-tengelyekkel (`kPa`, `RPM`, `%`, `MPa`, `°C`, `V`), LTTB mintaritkítással a gyors nagyításhoz, valamint számított csatornákkal (*Boost Deviation*, *Relative Boost*, *Rail Pressure Error*, *MAF Deviation*).
- **Delta kurzorok, alvázszám-maszkolás és export:** Két kattintással mérhető `Δt` és `Δy` a grafikonon, egy kattintással maszkolható a VIN a képernyőmentések előtt, PNG-ként menthető a grafikon, a felület pedig **EN** és **HU** között váltható.

### GitHub Pages beállítása
1. Töltsd fel a fájlokat a `FlopyHU/OP-COM-Visualizer-by-FlopyHU` repóba a `css/`, `js/` és `samples/` mappák megtartásával.
2. Nyisd meg a repóban a **Settings → Pages** menüt.
3. A **Build and deployment → Source** alatt válaszd a **Deploy from a branch** lehetőséget, majd a **`main`** ágat és a **`/ (root)`** mappát, és mentsd el.
4. Az oldal a `https://flopyhu.github.io/OP-COM-Visualizer-by-FlopyHU/` címen érhető el.

---

## License & Attribution / Licenc és hivatkozás

Created by **FlopyHU**. Free for personal, educational, and enthusiast use; forks and pull requests are welcome, while uncredited copies or commercial redistribution without permission are prohibited.
