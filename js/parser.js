/**
 * Modular OP-COM CSV Parser
 * Supports:
 * 1) OP-COM LiveData logs ([PROGVER], [MODELINFO], [ECUINFO], Time + Units + Rows)
 * 2) OP-COM Measuring Blocks Snapshots (Date and time>, Selected model>, Control Unit:, Measuring blocks information:)
 * 3) Slash-separated multi-sample cells (e.g. "1 046 / 1 043 / 1 027") expanded into time series or stats
 */

const PALETTE = [
  "#f7c600", "#38bdf8", "#22c55e", "#f97316", "#a855f7",
  "#ec4899", "#14b8a6", "#eab308", "#ef4444", "#6366f1",
  "#84cc16", "#06b6d4", "#f43f5e", "#8b5cf6", "#10b981"
];

function decodeBufferSmart(arrayBuffer) {
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  if (utf8Text.includes("\uFFFD")) {
    try {
      return new TextDecoder("windows-1250").decode(arrayBuffer);
    } catch (_) {
      return new TextDecoder("windows-1252").decode(arrayBuffer);
    }
  }
  return utf8Text;
}

function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseNumericToken(tok) {
  if (tok === undefined || tok === null) return NaN;
  const cleaned = String(tok).trim().replace(/\s+/g, "").replace(",", ".");
  if (!cleaned || !/^[-+]?\d+(?:\.\d+)?$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

function parseSlashSeries(cell) {
  if (typeof cell !== "string" || !cell.includes("/")) return null;
  const parts = cell.split("/").map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const nums = parts.map(parseNumericToken);
  if (nums.some(n => Number.isNaN(n))) return null;
  return nums;
}

function convertPressureString(str, targetUnit) {
  if (targetUnit !== "bar" || typeof str !== "string") return str;
  return str.replace(/([-+]?\d+(?:\.\d+)?)(\s*)kPa\b/gi, (_, numStr, sp) => {
    const val = parseFloat(numStr);
    if (Number.isNaN(val)) return _;
    return `${(val / 100).toFixed(2)}${sp}bar`;
  });
}

function parseOpcomFile(text, fileName) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const isLiveData = lines.slice(0, 15).some(l => l.startsWith("[PROGVER]") || l.startsWith("[MODELINFO]") || l.startsWith("[MBLOCKSINFORMATION]"));
  if (isLiveData) {
    return parseLiveDataCsv(lines, fileName);
  }
  return parseSnapshotCsv(lines, fileName);
}

function parseLiveDataCsv(lines, fileName) {
  const meta = {
    type: "livedata",
    fileName,
    progVer: "",
    timestamp: "",
    workshop: "",
    year: "",
    model: "",
    module: "",
    subModule: "",
    ecuInfo: {}
  };

  let headerIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("[PROGVER],")) {
      meta.progVer = line.slice(10).replace(/,+$/, "");
    } else if (line.startsWith("[TIMESTAMP],")) {
      meta.timestamp = line.slice(12).replace(/,+$/, "");
    } else if (line.startsWith("[WSINFO],")) {
      meta.workshop = line.slice(9).replace(/,+$/, "");
    } else if (line.startsWith("[MODELINFO],")) {
      const parts = splitCsvLine(line.slice(12));
      meta.year = parts[0] || "";
      meta.model = parts[1] || "";
      meta.module = parts[2] || "";
      meta.subModule = parts[3] || "";
    } else if (line.startsWith("[ECUINFO],")) {
      const parts = splitCsvLine(line.slice(10));
      parts.forEach(p => {
        const colon = p.indexOf(":");
        if (colon > 0) {
          const k = p.slice(0, colon).trim();
          const v = p.slice(colon + 1).trim();
          if (k && v && !/^\uFFFD+$/.test(v)) {
            meta.ecuInfo[k] = v;
          }
        }
      });
    } else if (line.startsWith("Time,") || /^Time\s*,/i.test(line)) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1 || headerIdx + 2 >= lines.length) {
    throw new Error("Could not locate Time header row in LiveData CSV.");
  }

  const rawHeaders = splitCsvLine(lines[headerIdx]);
  const rawUnits = splitCsvLine(lines[headerIdx + 1]);

  while (rawHeaders.length > 0 && rawHeaders[rawHeaders.length - 1] === "") {
    rawHeaders.pop();
    rawUnits.pop();
  }

  const colCount = rawHeaders.length;
  const rawTimes = [];
  const rawColumns = Array.from({ length: colCount }, () => []);

  for (let r = headerIdx + 2; r < lines.length; r++) {
    const line = lines[r].trim();
    if (!line) continue;
    const cells = splitCsvLine(line);
    const t = parseNumericToken(cells[0]);
    if (Number.isNaN(t)) continue;
    rawTimes.push(t);
    for (let c = 1; c < colCount; c++) {
      rawColumns[c].push(cells[c] !== undefined ? cells[c] : "");
    }
  }

  // Detect columns containing slash-separated multi-sample arrays (e.g. "1 046 / 1 043 / 1 027")
  const slashColInfo = {};
  let maxSubSamples = 1;

  for (let c = 1; c < colCount; c++) {
    let slashRows = 0;
    let maxLen = 1;
    for (let i = 0; i < rawColumns[c].length; i++) {
      const arr = parseSlashSeries(rawColumns[c][i]);
      if (arr) {
        slashRows++;
        if (arr.length > maxLen) maxLen = arr.length;
      }
    }
    if (slashRows > 0 && slashRows >= rawColumns[c].length * 0.25) {
      slashColInfo[c] = { maxLen };
      if (maxLen > maxSubSamples) maxSubSamples = maxLen;
    }
  }

  // Expand time axis when slash-separated sub-samples exist so rapid oscillations are plotted smoothly
  let times = rawTimes;
  let expandedColumns = rawColumns;

  if (maxSubSamples > 1 && rawTimes.length > 1) {
    const expTimes = [];
    const expCols = Array.from({ length: colCount }, () => []);

    for (let i = 0; i < rawTimes.length; i++) {
      const tStart = rawTimes[i];
      const nextT = i < rawTimes.length - 1 ? rawTimes[i + 1] : tStart + (rawTimes[i] - rawTimes[i - 1] || 0.1);

      const rowSubArrays = {};
      let rowFactor = 1;
      for (let c = 1; c < colCount; c++) {
        if (slashColInfo[c]) {
          const arr = parseSlashSeries(rawColumns[c][i]);
          if (arr && arr.length > 0) {
            rowSubArrays[c] = arr;
            if (arr.length > rowFactor) rowFactor = arr.length;
          }
        }
      }

      const stepCount = rowFactor > 1 ? rowFactor : 1;
      const stepDt = rowFactor > 1 ? Math.max(0.001, (nextT - tStart) / stepCount) : 0;

      for (let s = 0; s < stepCount; s++) {
        expTimes.push(rowFactor > 1 ? tStart + s * stepDt : tStart);
        for (let c = 1; c < colCount; c++) {
          if (rowSubArrays[c]) {
            const arr = rowSubArrays[c];
            const idx = Math.min(arr.length - 1, Math.floor((s * arr.length) / stepCount));
            expCols[c].push(String(arr[idx]));
          } else {
            expCols[c].push(rawColumns[c][i]);
          }
        }
      }
    }

    times = expTimes;
    expandedColumns = expCols;
  }

  const nameCounts = {};
  rawHeaders.forEach(h => { nameCounts[h] = (nameCounts[h] || 0) + 1; });

  const channels = [];
  for (let c = 1; c < colCount; c++) {
    const baseName = rawHeaders[c] || `Block_${c}`;
    const unit = (rawUnits[c] || "").trim();
    const displayName = (nameCounts[baseName] > 1 && unit) ? `${baseName} [${unit}]` : baseName;

    const colVals = expandedColumns[c];
    let numCount = 0;
    let strCount = 0;
    const distinctStrings = new Set();

    for (let i = 0; i < colVals.length; i++) {
      const v = colVals[i];
      if (v === "") continue;
      const n = parseNumericToken(v);
      if (!Number.isNaN(n)) {
        numCount++;
      } else {
        strCount++;
        distinctStrings.add(v);
      }
    }

    const isNumeric = numCount >= strCount && numCount > 0;
    const values = new Float64Array(times.length);
    const rawText = isNumeric ? null : colVals;
    const stateMap = {};

    if (isNumeric) {
      let min = Infinity, max = -Infinity, sum = 0, valid = 0;
      for (let i = 0; i < times.length; i++) {
        const n = parseNumericToken(colVals[i]);
        if (!Number.isNaN(n)) {
          values[i] = n;
          if (n < min) min = n;
          if (n > max) max = n;
          sum += n;
          valid++;
        } else {
          values[i] = NaN;
        }
      }
      channels.push({
        id: `ch_${c}`,
        name: displayName,
        baseName,
        unit: unit || "—",
        isNumeric: true,
        isVirtual: false,
        isMultiSample: Boolean(slashColInfo[c]),
        values,
        min: valid ? min : 0,
        max: valid ? max : 0,
        avg: valid ? sum / valid : 0,
        color: PALETTE[(c - 1) % PALETTE.length]
      });
    } else {
      const states = Array.from(distinctStrings);
      states.forEach((s, idx) => {
        if (/^(active|on|yes|open|true|1)$/i.test(s)) stateMap[s] = 1;
        else if (/^(inactive|off|no|closed|false|0|okay|system ok|normal)$/i.test(s)) stateMap[s] = 0;
        else stateMap[s] = idx;
      });
      let min = Infinity, max = -Infinity, sum = 0;
      for (let i = 0; i < times.length; i++) {
        const mapped = stateMap[colVals[i]] !== undefined ? stateMap[colVals[i]] : 0;
        values[i] = mapped;
        if (mapped < min) min = mapped;
        if (mapped > max) max = mapped;
        sum += mapped;
      }
      const previewStates = states.slice(0, 4).join(" / ") + (states.length > 4 ? ` (+${states.length - 4})` : "");
      channels.push({
        id: `ch_${c}`,
        name: displayName,
        baseName,
        unit: unit || "state",
        isNumeric: false,
        isVirtual: false,
        isMultiSample: false,
        values,
        rawText,
        stateLabels: previewStates,
        min: Number.isFinite(min) ? min : 0,
        max: Number.isFinite(max) ? max : 1,
        avg: times.length ? sum / times.length : 0,
        color: PALETTE[(c - 1) % PALETTE.length]
      });
    }
  }

  const virtualChannels = buildVirtualChannels(channels, times.length);
  return { meta, times, channels: [...channels, ...virtualChannels] };
}

function buildVirtualChannels(channels, len) {
  const virtuals = [];
  const findCh = (regex, unitFilter = null) =>
    channels.find(ch => ch.isNumeric && regex.test(ch.name) && (!unitFilter || ch.unit.toLowerCase() === unitFilter.toLowerCase()));

  const boostCmd = findCh(/Boost Pressure Command/i, "kPa");
  const boostAct = findCh(/^Boost Pressure \[kPa\]$|^Boost Pressure$/i, "kPa");
  if (boostCmd && boostAct) {
    const vals = new Float64Array(len);
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < len; i++) {
      const d = boostAct.values[i] - boostCmd.values[i];
      vals[i] = d;
      if (d < min) min = d;
      if (d > max) max = d;
      sum += d;
    }
    virtuals.push({
      id: "virt_boost_err",
      name: "Calc: Boost Deviation (Actual - Cmd)",
      baseName: "Boost Deviation",
      unit: "kPa",
      isNumeric: true,
      isVirtual: true,
      values: vals,
      min, max, avg: sum / len,
      color: "#fb7185"
    });
  }

  const baro = findCh(/Barometric Pressure/i, "kPa");
  if (boostAct && baro) {
    const vals = new Float64Array(len);
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < len; i++) {
      const d = boostAct.values[i] - baro.values[i];
      vals[i] = d;
      if (d < min) min = d;
      if (d > max) max = d;
      sum += d;
    }
    virtuals.push({
      id: "virt_rel_boost",
      name: "Calc: Relative Boost (Gauge)",
      baseName: "Relative Boost",
      unit: "kPa",
      isNumeric: true,
      isVirtual: true,
      values: vals,
      min, max, avg: sum / len,
      color: "#34d399"
    });
  }

  const railCmd = findCh(/Desired Common Rail Fuel Pressure/i, "MPa");
  const railAct = findCh(/^Common Rail Fuel Pressure/i, "MPa");
  if (railCmd && railAct) {
    const vals = new Float64Array(len);
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < len; i++) {
      const d = railAct.values[i] - railCmd.values[i];
      vals[i] = d;
      if (d < min) min = d;
      if (d > max) max = d;
      sum += d;
    }
    virtuals.push({
      id: "virt_rail_err",
      name: "Calc: Rail Pressure Error (Actual - Desired)",
      baseName: "Rail Pressure Error",
      unit: "MPa",
      isNumeric: true,
      isVirtual: true,
      values: vals,
      min, max, avg: sum / len,
      color: "#c084fc"
    });
  }

  const mafCalc = findCh(/Calculated Air Flow/i, "kg/h");
  const mafAct = findCh(/Mass Air Flow Sensor/i, "kg/h");
  if (mafCalc && mafAct) {
    const vals = new Float64Array(len);
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < len; i++) {
      const d = mafAct.values[i] - mafCalc.values[i];
      vals[i] = d;
      if (d < min) min = d;
      if (d > max) max = d;
      sum += d;
    }
    virtuals.push({
      id: "virt_maf_err",
      name: "Calc: MAF Deviation (Sensor - Calc)",
      baseName: "MAF Deviation",
      unit: "kg/h",
      isNumeric: true,
      isVirtual: true,
      values: vals,
      min, max, avg: sum / len,
      color: "#38bdf8"
    });
  }

  return virtuals;
}

function parseSnapshotCsv(lines, fileName) {
  const meta = {
    type: "snapshot",
    fileName,
    progVer: lines[0] ? lines[0].trim() : "OP-COM",
    timestamp: "",
    year: "",
    model: "",
    module: "",
    subModule: "",
    ecuInfo: {}
  };

  const blocks = [];
  let section = "header";
  const nameSeen = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("Date and time>,")) {
      meta.timestamp = line.slice(15).trim();
    } else if (line.startsWith("Selected model>,")) {
      const parts = splitCsvLine(line.slice(16));
      meta.year = parts[0] || "";
      meta.model = parts[1] || "";
      meta.module = parts[2] || "";
      meta.subModule = parts[3] || "";
    } else if (line.startsWith("Control Unit:")) {
      section = "ecu";
    } else if (line.startsWith("Measuring blocks information:")) {
      section = "blocks";
    } else if (section === "ecu") {
      const colon = line.indexOf(":");
      if (colon > 0) {
        const k = line.slice(0, colon).trim();
        const v = line.slice(colon + 1).trim();
        if (k && v && !/^\uFFFD+$/.test(v)) meta.ecuInfo[k] = v;
      }
    } else if (section === "blocks") {
      const comma = line.lastIndexOf(",");
      if (comma > 0) {
        const rawName = line.slice(0, comma).trim();
        const rawVal = line.slice(comma + 1).trim();
        const slashArr = parseSlashSeries(rawVal);
        let formattedVal = rawVal;
        if (slashArr) {
          const min = Math.min(...slashArr);
          const max = Math.max(...slashArr);
          const avg = slashArr.reduce((a, b) => a + b, 0) / slashArr.length;
          formattedVal = `${avg.toFixed(1)} avg (${min}–${max}, n=${slashArr.length})`;
        }
        const unitMatch = rawVal.match(/[-+]?\d+(?:\.\d+)?\s+([^/]+)$/);
        const unit = unitMatch ? unitMatch[1].trim() : "";
        nameSeen[rawName] = (nameSeen[rawName] || 0) + 1;
        const key = nameSeen[rawName] > 1 && unit ? `${rawName} [${unit}]` : rawName;
        blocks.push({ key, name: rawName, value: formattedVal, unit });
      }
    }
  }

  return { meta, blocks };
}
