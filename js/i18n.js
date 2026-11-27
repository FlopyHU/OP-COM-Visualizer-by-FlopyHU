const I18N = {
  en: {
    subtitle: "Modular LiveData & Measuring Blocks Analyzer • By FlopyHU",
    loadSample: "Load Demo Log (Z17DTH)",
    uploadCsv: "Open OP-COM CSV(s)",
    hideVin: "Mask VIN",
    showVin: "Show VIN",
    exportPng: "PNG",
    dropTitle: "Drop OP-COM LiveData or Measuring Block Snapshot CSVs here",
    dropDesc: "Supports any module (Engine, ABS/ESP, CIM, REC, Transmission). Drop multiple snapshots at once for automatic side-by-side diff comparison.",
    tabLivedata: "LiveData Telemetry & Overlays",
    tabSnapshots: "Snapshots & Diff Table",
    presetsLabel: "Smart Overlays:",
    virtualChannels: "Virtual Math Channels",
    resetZoom: "Reset Zoom",
    clearDelta: "Clear Δ Cursors",
    chartHint: "Scroll wheel: Zoom X-axis • Drag: Pan • Click twice: Measure Δt & Δy • Multi-unit Y-axes auto-scale automatically",
    blocksListTitle: "Recorded Measuring Blocks & Statistics",
    blocksListSub: "Toggle checkboxes to overlay any parameters onto the graph above.",
    uncheckAll: "Uncheck All",
    colBlock: "Measuring Block Name",
    colUnit: "Unit",
    colCursor: "Cursor",
    colMin: "Min",
    colAvg: "Avg",
    colMax: "Max",
    snapTitle: "Measuring Blocks Snapshots Comparison",
    snapSub: "Side-by-side values across uploaded OP-COM snapshot files. Changed parameters are highlighted.",
    onlyChanged: "Show changed values only"
  },
  hu: {
    subtitle: "Moduláris LiveData & Mérőblokk Elemző • Készítette: FlopyHU",
    loadSample: "Minta Log Betöltése (Z17DTH)",
    uploadCsv: "OP-COM CSV Megnyitása",
    hideVin: "Alvázszám Elrejtése",
    showVin: "Alvázszám Mutatása",
    exportPng: "PNG",
    dropTitle: "Húzd ide az OP-COM LiveData vagy Mérőblokk Pillanatkép CSV fájlokat",
    dropDesc: "Bármilyen modult támogat (Motor, ABS/ESP, CIM, REC, Váltó). Több pillanatkép egyszerre történő behúzásakor automatikusan összehasonlítja az eltéréseket.",
    tabLivedata: "LiveData Telemetria & Grafikon",
    tabSnapshots: "Pillanatképek & Eltérések",
    presetsLabel: "Gyors Nézetek:",
    virtualChannels: "Számított Matek Csatornák",
    resetZoom: "Nagyítás Alaphelyzet",
    clearDelta: "Δ Kurzorok Törlése",
    chartHint: "Görgő: Nagyítás • Húzás: Mozgatás • Két kattintás: Δt és Δy mérés • Több mértékegység automatikus skálázása",
    blocksListTitle: "Rögzített Mérőblokkok & Statisztikák",
    blocksListSub: "Pipáld ki a paramétereket a grafikonra történő egymásra vetítéshez.",
    uncheckAll: "Összes Törlése",
    colBlock: "Mérőblokk Neve",
    colUnit: "Egység",
    colCursor: "Kurzor",
    colMin: "Min",
    colAvg: "Átlag",
    colMax: "Max",
    snapTitle: "Mérőblokk Pillanatképek Összehasonlítása",
    snapSub: "A feltöltött OP-COM pillanatképek értékei egymás mellett. A megváltozott értékek kiemelve jelennek meg.",
    onlyChanged: "Csak a változott értékek mutatása"
  }
};

let currentLang = "en";

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (I18N[lang] && I18N[lang][key]) {
      el.textContent = I18N[lang][key];
    }
  });
}
