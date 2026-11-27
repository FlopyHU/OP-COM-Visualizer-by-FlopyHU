/**
 * OP-COM Visualizer Suite — Main Application Controller
 */

const state = {
  liveData: null,
  snapshots: [],
  selectedChannels: new Set(),
  showVirtual: true,
  maskVin: false,
  activeTab: "livedata",
  cursorIdx: -1
};

// DOM Elements
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const btnLoadSample = document.getElementById("btnLoadSample");
const btnMaskVin = document.getElementById("btnMaskVin");
const btnExportPng = document.getElementById("btnExportPng");
const btnLang = document.getElementById("btnLang");

const ecuCard = document.getElementById("ecuCard");
const modeTabs = document.getElementById("modeTabs");
const viewLivedata = document.getElementById("viewLivedata");
const viewSnapshots = document.getElementById("viewSnapshots");

const chart = new TelemetryChart(
  document.getElementById("telemetryCanvas"),
  document.getElementById("chartTooltip"),
  handleCursorMove,
  handleDeltaCursors
);

// Event Listeners
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

btnLoadSample.addEventListener("click", loadBuiltInSample);

btnMaskVin.addEventListener("click", () => {
  state.maskVin = !state.maskVin;
  btnMaskVin.classList.toggle("active-mask", state.maskVin);
  btnMaskVin.querySelector("span:last-child").textContent = state.maskVin
    ? I18N[currentLang].showVin
    : I18N[currentLang].hideVin;
  renderEcuCard();
});

btnExportPng.addEventListener("click", () => {
  const link = document.createElement("a");
  const model = state.liveData?.meta?.model || "OP-COM";
  const mod = state.liveData?.meta?.subModule || state.liveData?.meta?.module || "Telemetry";
  link.download = `${model}_${mod}_Telemetry.png`.replace(/\s+/g, "_");
  link.href = document.getElementById("telemetryCanvas").toDataURL("image/png");
  link.click();
});

btnLang.addEventListener("click", () => {
  setLanguage(currentLang === "en" ? "hu" : "en");
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.getElementById("btnResetZoom").addEventListener("click", () => chart.resetZoom());
document.getElementById("btnClearCursors").addEventListener("click", () => chart.clearCursors());
document.getElementById("btnClearAll").addEventListener("click", () => {
  state.selectedChannels.clear();
  syncChartAndTable();
});

document.getElementById("btnToggleVirtual").addEventListener("click", (e) => {
  state.showVirtual = !state.showVirtual;
  e.currentTarget.classList.toggle("active", state.showVirtual);
  if (!state.showVirtual) {
    for (const id of Array.from(state.selectedChannels)) {
      if (id.startsWith("virt_")) state.selectedChannels.delete(id);
    }
  }
  renderChannelTable();
  syncChartAndTable();
});

document.getElementById("channelSearch").addEventListener("input", () => renderChannelTable());
document.getElementById("snapSearch").addEventListener("input", () => renderSnapshotsTable());
document.getElementById("chkOnlyDiff").addEventListener("change", () => renderSnapshotsTable());

async function loadBuiltInSample() {
  try {
    const urls = [
      "samples/Sample_Livedata_Astra-H_Z17DTH.csv",
      "samples/Sample_Snapshot_1_ColdWarmup.csv",
      "samples/Sample_Snapshot_2_OperatingTemp.csv"
    ];
    const results = await Promise.all(urls.map(async (u) => {
      const res = await fetch(u);
      const buf = await res.arrayBuffer();
      const text = decodeBufferSmart(buf);
      return parseOpcomFile(text, u.split("/").pop());
    }));
    ingestParsedFiles(results);
  } catch (err) {
    alert("Could not load sample files (if opening locally via file://, use a local server or upload your CSV directly): " + err.message);
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  const parsed = [];
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const text = decodeBufferSmart(buf);
    try {
      parsed.push(parseOpcomFile(text, file.name));
    } catch (err) {
      console.error(`Failed to parse ${file.name}:`, err);
      alert(`Error parsing ${file.name}: ${err.message}`);
    }
  }
  if (parsed.length) ingestParsedFiles(parsed);
}

function ingestParsedFiles(parsedList) {
  const newLive = parsedList.find(p => p.meta.type === "livedata");
  const newSnaps = parsedList.filter(p => p.meta.type === "snapshot");

  if (newLive) {
    state.liveData = newLive;
    state.selectedChannels.clear();
    autoSelectDefaultChannels(newLive.channels);
  }
  if (newSnaps.length) {
    // Append or replace snapshots
    state.snapshots = newLive ? newSnaps : [...state.snapshots, ...newSnaps];
  }

  dropZone.classList.add("compact");
  ecuCard.classList.remove("hidden");
  modeTabs.classList.remove("hidden");
  document.getElementById("snapCount").textContent = state.snapshots.length;

  renderEcuCard();

  if (state.liveData) {
    buildSmartPresets(state.liveData.channels);
    renderChannelTable();
    syncChartAndTable();
    btnExportPng.disabled = false;
  }
  if (state.snapshots.length) {
    renderSnapshotsTable();
  }

  switchTab(state.liveData ? "livedata" : "snapshots");
}

function autoSelectDefaultChannels(channels) {
  // Automatically pick interesting primary channels regardless of module type
  const priorityPatterns = [
    /Engine Speed/i,
    /Boost Pressure Command/i,
    /^Boost Pressure \[kPa\]$|^Boost Pressure$/i,
    /Vehicle Speed$/i,
    /Calculated Pedal Position/i
  ];

  priorityPatterns.forEach(rx => {
    const match = channels.find(c => c.isNumeric && rx.test(c.name));
    if (match) state.selectedChannels.add(match.id);
  });

  // Fallback for non-Engine modules (e.g. ABS, CIM, Transmission): pick first 3 numeric channels with variance
  if (state.selectedChannels.size === 0) {
    const varying = channels.filter(c => c.isNumeric && c.max !== c.min).slice(0, 3);
    const fallback = varying.length ? varying : channels.slice(0, 3);
    fallback.forEach(c => state.selectedChannels.add(c.id));
  }
}

function buildSmartPresets(channels) {
  const container = document.getElementById("presetButtons");
  container.innerHTML = "";

  const presetDefs = [
    {
      label: "Turbo & VNT",
      patterns: [/Engine Speed/i, /Boost Pressure Command/i, /^Boost Pressure \[kPa\]$|^Boost Pressure$/i, /Pulse Ratio Boost/i, /Boost Deviation/i]
    },
    {
      label: "Common Rail Fuel",
      patterns: [/Engine Speed/i, /Desired Common Rail/i, /^Common Rail Fuel Pressure \[MPa\]$|^Common Rail Fuel Pressure$/i, /Fuel Metering Solenoid Valve PWM/i, /Rail Pressure Error/i]
    },
    {
      label: "Airflow & EGR",
      patterns: [/Calculated Air Flow/i, /Mass Air Flow Sensor/i, /EGR Position Commanded/i, /EGR Pulse Ratio/i, /Intake Air Temperature \[°C\]/i]
    },
    {
      label: "Pedal & Switches",
      patterns: [/Calculated Pedal Position/i, /APP Sensor 1/i, /APP at Idle/i, /Brake Switch 1/i, /Clutch Switch/i]
    },
    {
      label: "Thermal & Charging",
      patterns: [/Coolant Temperature \[°C\]/i, /Intake Air Temperature \[°C\]/i, /Battery Voltage/i, /A\/C Pressure \[kPa\]/i]
    }
  ];

  presetDefs.forEach(preset => {
    const matchedIds = [];
    preset.patterns.forEach(rx => {
      const ch = channels.find(c => rx.test(c.name));
      if (ch) matchedIds.push(ch.id);
    });

    if (matchedIds.length >= 2) {
      const btn = document.createElement("button");
      btn.className = "btn btn-small btn-outline";
      btn.textContent = preset.label;
      btn.addEventListener("click", () => {
        state.selectedChannels.clear();
        matchedIds.forEach(id => state.selectedChannels.add(id));
        syncChartAndTable();
      });
      container.appendChild(btn);
    }
  });
}

function renderEcuCard() {
  const source = state.liveData || state.snapshots[0];
  if (!source) return;
  const { meta } = source;

  document.getElementById("metaModel").textContent = `${meta.year} ${meta.model}`.trim() || "Unknown Model";
  document.getElementById("metaModule").textContent = [meta.module, meta.subModule].filter(Boolean).join(" • ") || "ECU";
  document.getElementById("metaTimestamp").textContent = meta.timestamp || meta.fileName;

  if (state.liveData) {
    const dur = state.liveData.times.length ? state.liveData.times[state.liveData.times.length - 1] : 0;
    document.getElementById("metaDuration").textContent = `Duration: ${dur.toFixed(1)}s`;
    document.getElementById("metaSamples").textContent = `Rows: ${state.liveData.times.length.toLocaleString()}`;
    document.getElementById("metaChannels").textContent = `Blocks: ${state.liveData.channels.filter(c => !c.isVirtual).length}`;
  } else {
    document.getElementById("metaDuration").textContent = `Snapshots: ${state.snapshots.length}`;
    document.getElementById("metaSamples").textContent = "";
    document.getElementById("metaChannels").textContent = `Blocks: ${source.blocks.length}`;
  }

  const grid = document.getElementById("ecuGrid");
  grid.innerHTML = "";
  Object.entries(meta.ecuInfo || {}).forEach(([k, v]) => {
    let displayVal = v;
    if (state.maskVin && /VIN/i.test(k)) {
      displayVal = v.slice(0, 6) + "XXXXXXXXXXX";
    }
    const div = document.createElement("div");
    div.className = "ecu-item";
    div.innerHTML = `<span>${k}</span><span>${displayVal}</span>`;
    grid.appendChild(div);
  });
}

function renderChannelTable() {
  if (!state.liveData) return;
  const tbody = document.getElementById("channelTableBody");
  const query = document.getElementById("channelSearch").value.toLowerCase().trim();
  tbody.innerHTML = "";

  state.liveData.channels.forEach(ch => {
    if (ch.isVirtual && !state.showVirtual) return;
    if (query && !ch.name.toLowerCase().includes(query) && !ch.unit.toLowerCase().includes(query)) return;

    const checked = state.selectedChannels.has(ch.id);
    const tr = document.createElement("tr");
    if (checked) tr.classList.add("row-selected");

    const badge = ch.isVirtual
      ? `<span class="tag-virtual">CALC</span>`
      : (!ch.isNumeric ? `<span class="tag-state">${ch.stateLabels}</span>` : "");

    const fmt = (n) => ch.isNumeric ? n.toFixed(Math.abs(n) >= 100 ? 1 : 2) : Math.round(n);

    tr.innerHTML = `
      <td><input type="checkbox" data-chid="${ch.id}" ${checked ? "checked" : ""} /></td>
      <td><span class="legend-dot" style="display:inline-block;background:${ch.color}"></span></td>
      <td><strong>${ch.name}</strong>${badge}</td>
      <td class="mono">${ch.unit}</td>
      <td class="mono" id="cur_${ch.id}">—</td>
      <td class="mono">${fmt(ch.min)}</td>
      <td class="mono">${fmt(ch.avg)}</td>
      <td class="mono">${fmt(ch.max)}</td>
    `;

    tr.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) state.selectedChannels.add(ch.id);
      else state.selectedChannels.delete(ch.id);
      syncChartAndTable();
    });

    tbody.appendChild(tr);
  });
}

function syncChartAndTable() {
  if (!state.liveData) return;
  chart.setData(state.liveData.times, state.liveData.channels, state.selectedChannels);

  // Sync checkboxes & row highlights
  document.querySelectorAll("#channelTableBody input[type=checkbox]").forEach(cb => {
    const isSel = state.selectedChannels.has(cb.dataset.chid);
    cb.checked = isSel;
    cb.closest("tr").classList.toggle("row-selected", isSel);
  });

  // Render active legend chips above chart
  const legend = document.getElementById("activeLegend");
  legend.innerHTML = "";
  state.liveData.channels.filter(c => state.selectedChannels.has(c.id)).forEach(ch => {
    const chip = document.createElement("div");
    chip.className = "legend-chip";
    chip.title = "Click to remove from graph";
    chip.innerHTML = `
      <span class="legend-dot" style="background:${ch.color}"></span>
      <span>${ch.name}</span>
      <span class="legend-val">(${ch.unit})</span>
      <span style="color:#94a3b8;margin-left:2px;">×</span>
    `;
    chip.addEventListener("click", () => {
      state.selectedChannels.delete(ch.id);
      syncChartAndTable();
    });
    legend.appendChild(chip);
  });
}

function handleCursorMove(idx) {
  state.cursorIdx = idx;
  if (!state.liveData || idx < 0) return;
  state.liveData.channels.forEach(ch => {
    const cell = document.getElementById(`cur_${ch.id}`);
    if (!cell) return;
    cell.textContent = ch.isNumeric
      ? ch.values[idx].toFixed(2)
      : ch.rawText[idx];
  });
}

function handleDeltaCursors(idxA, idxB) {
  const bar = document.getElementById("deltaBar");
  const txt = document.getElementById("deltaText");
  if (idxA === null) {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  const tA = state.liveData.times[idxA];
  if (idxB === null) {
    txt.textContent = `Cursor A set at t = ${tA.toFixed(2)}s — click a second point on the chart to set Cursor B.`;
    return;
  }
  const tB = state.liveData.times[idxB];
  const dt = tB - tA;
  const active = state.liveData.channels.filter(c => state.selectedChannels.has(c.id) && c.isNumeric).slice(0, 4);
  const diffs = active.map(ch => {
    const dv = ch.values[idxB] - ch.values[idxA];
    const sign = dv >= 0 ? "+" : "";
    return `${ch.baseName}: ${sign}${dv.toFixed(2)} ${ch.unit}`;
  });
  txt.textContent = `tA=${tA.toFixed(2)}s → tB=${tB.toFixed(2)}s | Δt = ${dt >= 0 ? "+" : ""}${dt.toFixed(2)}s` + (diffs.length ? `  •  ${diffs.join("  |  ")}` : "");
}

function renderSnapshotsTable() {
  const thead = document.getElementById("snapshotThead");
  const tbody = document.getElementById("snapshotTbody");
  const onlyDiff = document.getElementById("chkOnlyDiff").checked;
  const query = document.getElementById("snapSearch").value.toLowerCase().trim();

  thead.innerHTML = "";
  tbody.innerHTML = "";
  if (!state.snapshots.length) return;

  // Header row
  const trHead = document.createElement("tr");
  trHead.innerHTML = `<th>Measuring Block</th>` + state.snapshots.map((s, idx) =>
    `<th>Snapshot #${idx + 1}<br><span class="muted" style="font-weight:400">${s.meta.timestamp || s.meta.fileName}</span></th>`
  ).join("");
  thead.appendChild(trHead);

  // Collect union of all measuring block keys across snapshots
  const allKeys = [];
  const seen = new Set();
  state.snapshots.forEach(s => {
    s.blocks.forEach(b => {
      if (!seen.has(b.key)) { seen.add(b.key); allKeys.push(b.key); }
    });
  });

  allKeys.forEach(key => {
    if (query && !key.toLowerCase().includes(query)) return;
    const vals = state.snapshots.map(s => {
      const found = s.blocks.find(b => b.key === key);
      return found ? found.value : "—";
    });
    const isDiff = new Set(vals).size > 1;
    if (onlyDiff && !isDiff) return;

    const tr = document.createElement("tr");
    if (isDiff) tr.classList.add("row-diff");
    tr.innerHTML = `<td><strong>${key}</strong></td>` + vals.map(v => `<td class="mono">${v}</td>`).join("");
    tbody.appendChild(tr);
  });
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  viewLivedata.classList.toggle("hidden", tab !== "livedata");
  viewSnapshots.classList.toggle("hidden", tab !== "snapshots");
  if (tab === "livedata") chart.resize();
}
