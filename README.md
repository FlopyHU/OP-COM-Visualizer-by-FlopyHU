![Tech](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20JavaScript-yellow.svg)
![Target](https://img.shields.io/badge/Target-OP--COM%20LiveData%20%26%20Snapshots-orange.svg)
![License](https://img.shields.io/badge/license-Open_Source-green.svg)

# 📈 OP-COM Visualizer Suite (LiveData & Snapshots Analyzer)

[Hungarian version below / Magyar verzió lentebb]

> [!TIP]
> **Try it live here:** [https://flopyhu.github.io/OP-COM-Visualizer-by-FlopyHU/](https://flopyhu.github.io/OP-COM-Visualizer-by-FlopyHU/)

---

## 🌍 English

> [!NOTE]
> ### 📖 About the Project
> While diagnosing and tuning my own Opel, digging through raw OP-COM CSV exports in spreadsheets got messy fast—especially when comparing multiple measuring block snapshots or trying to overlay boost request, actual boost, duty cycle, and rail pressure together without unit scaling chaos.
>
> I built this modular, client-side visualizer as a companion tool to **Opel Generator Suite** so anyone can drop in OP-COM LiveData logs or measuring block snapshots from any module and inspect them cleanly in the browser without uploading files anywhere. Feel free to use it, test your logs, and share it with the community!

---

## :hungary: Magyar [HU]

> [!NOTE]
> ### 📖 A projekt célja és háttérsztorija
> Az Opel diagnosztika és hangolás során a nyers OP-COM CSV exportok táblázatos böngészése hamar átláthatatlanná válik—különösen akkor, ha több mérőblokk-pillanatképet kell összevetni, vagy egyszerre szeretnéd egymásra vetíteni a töltőnyomás-igényt, a tényleges nyomást, a vezérlési kitöltést és a rail nyomást úgy, hogy a különböző mértékegységek ne nyomják el egymást.
>
> Ezt a moduláris, böngészőben futó vizualizálót az **Opel Generator Suite** kiegészítőjeként készítettem, hogy bármilyen vezérlőegység LiveData logjait és pillanatképeit egyszerűen, szerveroldali feltöltés nélkül lehessen elemezni. Használjátok nyugodtan, és osszátok meg másokkal is!

---

## 🛠️ Features / Funkciók

- **Module-Agnostic CSV Parser / Modul-független CSV-feldolgozó:** Works with any OP-COM export regardless of control unit or model (Engine, ABS/ESP, CIM, REC, Transmission, etc.), decodes Windows-1250/1252 degree symbols (`°C`), and separates duplicate sensor headers (such as `Boost Pressure [kPa]` vs. `Boost Pressure [V]`).
- **LiveData Multi-Axis Overlays / Többtengelyes LiveData átfedés:** Overlay any combination of channels onto one chart with automatic unit-based Y-axis scaling (`kPa`, `RPM`, `%`, `MPa`, `°C`, `V`), step waveforms for discrete states, and LTTB downsampling for smooth zooming on large logs.
- **Smart Diagnostic Presets & Virtual Math Channels / Gyors nézetek és számított csatornák:** One-click presets (such as *Turbo & VNT*, *Common Rail Fuel*, *Airflow & EGR*, *Pedal & Switches*, *Thermal & Charging*) plus calculated virtual channels (*Boost Deviation*, *Relative Boost*, *Rail Pressure Error*, *MAF Deviation*).
- **Two-Point Delta Cursors (`Δt` & `Δy`) / Kétpontos delta kurzorok:** Click any two points on the graph to measure elapsed time and parameter differences.
- **Snapshot Diff Comparison / Pillanatkép-összehasonlító:** Load multiple measuring block snapshot CSVs at once to compare values side by side and filter only changed parameters.
- **VIN Masking, PNG Export & Bilingual UI / VIN-maszkolás, PNG-export és kétnyelvű felület:** Hide VINs before sharing screenshots, export the chart as PNG, and switch between English (`EN`) and Hungarian (`HU`) on the fly.

---

## 🚀 Usage / Használat

1. Open the tool in any modern web browser. / Nyisd meg az oldalt bármilyen modern böngészőben.
2. Click **Load Demo Log (Z17DTH)** or drop your OP-COM LiveData / Snapshot CSV file(s) onto the page. / Kattints a **Load Demo Log (Z17DTH)** gombra, vagy húzd az oldalra a saját OP-COM LiveData / Snapshot CSV fájljaidat.
3. Toggle measuring blocks to overlay them, use smart presets or delta cursors, compare snapshots, mask the VIN if needed, or export a PNG. / Pipáld ki a mérőblokkokat az egymásra vetítéshez, használd a gyors nézeteket vagy a delta kurzorokat, hasonlítsd össze a pillanatképeket, maszkolj VIN-t ha kell, vagy ments PNG-t.

Feel free to use it and share it with other Opel enthusiasts! / Használjátok bátran, és osszátok meg a többi Opelessel is! 🚗💨

---

## 📜 License

This project is open-source and subject to the terms outlined in the [LICENSE](https://github.com/FlopyHU/OP-COM-Visualizer-by-FlopyHU/blob/main/LICENSE) file.

[HU] A projekt nyílt forráskódú, a részletes felhasználási feltételeket és jogokat a [LICENSE](https://github.com/FlopyHU/OP-COM-Visualizer-by-FlopyHU/blob/main/LICENSE) fájl tartalmazza.
