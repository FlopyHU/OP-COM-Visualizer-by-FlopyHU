/**
 * High-Performance Multi-Axis Canvas Telemetry Renderer
 * - LTTB (Largest-Triangle-Three-Buckets) downsampling for smooth 60fps zoom/pan on 100k+ row logs
 * - Automatic Y-axis grouping by measurement unit (e.g., kPa, RPM, %, °C, V)
 * - Two-point delta cursor measurement (Δt, Δy)
 */

class TelemetryChart {
  constructor(canvas, tooltipEl, onCursorUpdate, onDeltaUpdate) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.tooltipEl = tooltipEl;
    this.onCursorUpdate = onCursorUpdate;
    this.onDeltaUpdate = onDeltaUpdate;

    this.times = [];
    this.channels = [];
    this.selectedIds = new Set();

    // Viewport X range in seconds
    this.viewMinT = 0;
    this.viewMaxT = 10;
    this.dataMinT = 0;
    this.dataMaxT = 10;

    // Interaction state
    this.isDragging = false;
    this.dragMoved = false;
    this.dragStartX = 0;
    this.dragStartMinT = 0;
    this.dragStartMaxT = 0;
    this.hoverIdx = -1;

    // Delta cursors (A and B)
    this.cursorA = null;
    this.cursorB = null;

    this.padding = { top: 22, bottom: 34, left: 64, right: 64 };
    this.bindEvents();
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(240, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  setData(times, channels, selectedIds) {
    this.times = times;
    this.channels = channels;
    this.selectedIds = selectedIds;
    this.dataMinT = times.length ? times[0] : 0;
    this.dataMaxT = times.length ? times[times.length - 1] : 10;
    if (this.dataMaxT <= this.dataMinT) this.dataMaxT = this.dataMinT + 1;
    this.resetZoom();
  }

  resetZoom() {
    this.viewMinT = this.dataMinT;
    this.viewMaxT = this.dataMaxT;
    this.render();
  }

  clearCursors() {
    this.cursorA = null;
    this.cursorB = null;
    if (this.onDeltaUpdate) this.onDeltaUpdate(null, null);
    this.render();
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());

    this.canvas.addEventListener("wheel", (e) => {
      if (!this.times.length) return;
      e.preventDefault();
      const plotW = this.getPlotBounds().w;
      const mouseX = e.offsetX - this.padding.left;
      const ratio = Math.max(0, Math.min(1, mouseX / plotW));
      const focusT = this.viewMinT + ratio * (this.viewMaxT - this.viewMinT);

      const zoomFactor = e.deltaY < 0 ? 0.78 : 1.28;
      let newSpan = (this.viewMaxT - this.viewMinT) * zoomFactor;
      const totalSpan = this.dataMaxT - this.dataMinT;
      newSpan = Math.max(0.2, Math.min(totalSpan, newSpan));

      let newMin = focusT - ratio * newSpan;
      let newMax = newMin + newSpan;
      if (newMin < this.dataMinT) {
        newMin = this.dataMinT;
        newMax = newMin + newSpan;
      }
      if (newMax > this.dataMaxT) {
        newMax = this.dataMaxT;
        newMin = Math.max(this.dataMinT, newMax - newSpan);
      }
      this.viewMinT = newMin;
      this.viewMaxT = newMax;
      this.render();
    }, { passive: false });

    this.canvas.addEventListener("mousedown", (e) => {
      if (!this.times.length) return;
      this.isDragging = true;
      this.dragMoved = false;
      this.dragStartX = e.offsetX;
      this.dragStartMinT = this.viewMinT;
      this.dragStartMaxT = this.viewMaxT;
    });

    window.addEventListener("mouseup", (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (!this.dragMoved && e.target === this.canvas && this.hoverIdx >= 0) {
        // Place Delta Cursor A or B
        if (this.cursorA === null || (this.cursorA !== null && this.cursorB !== null)) {
          this.cursorA = this.hoverIdx;
          this.cursorB = null;
        } else {
          this.cursorB = this.hoverIdx;
        }
        if (this.onDeltaUpdate) this.onDeltaUpdate(this.cursorA, this.cursorB);
        this.render();
      }
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.times.length) return;
      const plot = this.getPlotBounds();

      if (this.isDragging) {
        const dx = e.offsetX - this.dragStartX;
        if (Math.abs(dx) > 4) this.dragMoved = true;
        const span = this.dragStartMaxT - this.dragStartMinT;
        const dt = -(dx / plot.w) * span;
        let newMin = this.dragStartMinT + dt;
        let newMax = this.dragStartMaxT + dt;
        if (newMin < this.dataMinT) {
          newMin = this.dataMinT;
          newMax = newMin + span;
        }
        if (newMax > this.dataMaxT) {
          newMax = this.dataMaxT;
          newMin = newMax - span;
        }
        this.viewMinT = newMin;
        this.viewMaxT = newMax;
        this.render();
        return;
      }

      const relX = e.offsetX - plot.x;
      if (relX < 0 || relX > plot.w) {
        this.hoverIdx = -1;
        this.tooltipEl.classList.add("hidden");
        this.render();
        return;
      }

      const targetT = this.viewMinT + (relX / plot.w) * (this.viewMaxT - this.viewMinT);
      this.hoverIdx = this.findNearestIndex(targetT);
      if (this.onCursorUpdate) this.onCursorUpdate(this.hoverIdx);
      this.updateTooltip(e.offsetX, e.offsetY);
      this.render();
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoverIdx = -1;
      this.tooltipEl.classList.add("hidden");
      this.render();
    });
  }

  getPlotBounds() {
    const activeUnits = this.getUnitGroups().length;
    this.padding.left = activeUnits >= 3 ? 115 : 66;
    this.padding.right = activeUnits >= 2 ? 66 : 24;
    return {
      x: this.padding.left,
      y: this.padding.top,
      w: Math.max(100, this.width - this.padding.left - this.padding.right),
      h: Math.max(100, this.height - this.padding.top - this.padding.bottom)
    };
  }

  findNearestIndex(t) {
    let lo = 0, hi = this.times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.times[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  getActiveChannels() {
    return this.channels.filter(c => this.selectedIds.has(c.id));
  }

  getUnitGroups() {
    const active = this.getActiveChannels();
    const map = new Map();
    active.forEach(ch => {
      const u = ch.unit || "—";
      if (!map.has(u)) map.set(u, []);
      map.get(u).push(ch);
    });
    return Array.from(map.entries()).map(([unit, chs]) => ({ unit, channels: chs }));
  }

  downsampleLTTB(startIdx, endIdx, values, threshold) {
    const total = endIdx - startIdx + 1;
    if (total <= threshold || threshold < 3) {
      const pts = [];
      for (let i = startIdx; i <= endIdx; i++) {
        if (!Number.isNaN(values[i])) pts.push(i);
      }
      return pts;
    }

    const sampled = [startIdx];
    const bucketSize = (total - 2) / (threshold - 2);
    let a = startIdx;

    for (let i = 0; i < threshold - 2; i++) {
      const avgRangeStart = Math.floor((i + 1) * bucketSize) + startIdx + 1;
      const avgRangeEnd = Math.min(endIdx, Math.floor((i + 2) * bucketSize) + startIdx + 1);
      let avgX = 0, avgY = 0, avgCount = 0;
      for (let j = avgRangeStart; j < avgRangeEnd; j++) {
        if (!Number.isNaN(values[j])) {
          avgX += this.times[j];
          avgY += values[j];
          avgCount++;
        }
      }
      if (avgCount > 0) { avgX /= avgCount; avgY /= avgCount; }

      const rangeOffs = Math.floor(i * bucketSize) + startIdx + 1;
      const rangeTo = Math.min(endIdx, Math.floor((i + 1) * bucketSize) + startIdx + 1);
      const pointAX = this.times[a];
      const pointAY = Number.isNaN(values[a]) ? 0 : values[a];

      let maxArea = -1;
      let nextA = rangeOffs;
      for (let j = rangeOffs; j < rangeTo; j++) {
        if (Number.isNaN(values[j])) continue;
        const area = Math.abs((pointAX - avgX) * (values[j] - pointAY) - (pointAX - this.times[j]) * (avgY - pointAY));
        if (area > maxArea) {
          maxArea = area;
          nextA = j;
        }
      }
      sampled.push(nextA);
      a = nextA;
    }
    sampled.push(endIdx);
    return sampled;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const groups = this.getUnitGroups();
    const plot = this.getPlotBounds();

    // Background grid
    ctx.strokeStyle = "#1c2433";
    ctx.lineWidth = 1;
    const hLines = 5;
    for (let i = 0; i <= hLines; i++) {
      const y = plot.y + (plot.h * i) / hLines;
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.w, y);
      ctx.stroke();
    }

    // X-Axis Time Ticks
    const vLines = 8;
    ctx.fillStyle = "#64748b";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= vLines; i++) {
      const x = plot.x + (plot.w * i) / vLines;
      const tVal = this.viewMinT + ((this.viewMaxT - this.viewMinT) * i) / vLines;
      ctx.beginPath();
      ctx.moveTo(x, plot.y);
      ctx.lineTo(x, plot.y + plot.h);
      ctx.stroke();
      ctx.fillText(`${tVal.toFixed(1)}s`, x, plot.y + plot.h + 18);
    }

    if (!this.times.length || !groups.length) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Select one or more measuring blocks below to plot telemetry", plot.x + plot.w / 2, plot.y + plot.h / 2);
      return;
    }

    const startIdx = Math.max(0, this.findNearestIndex(this.viewMinT) - 1);
    const endIdx = Math.min(this.times.length - 1, this.findNearestIndex(this.viewMaxT) + 1);
    const maxPts = Math.max(400, Math.floor(plot.w * 1.5));

    // Render each unit group with its own Y scale
    groups.forEach((group, gIdx) => {
      let minVal = Infinity, maxVal = -Infinity;
      group.channels.forEach(ch => {
        for (let i = startIdx; i <= endIdx; i++) {
          const v = ch.values[i];
          if (!Number.isNaN(v)) {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          }
        }
      });

      if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) { minVal = 0; maxVal = 1; }
      if (minVal === maxVal) {
        minVal -= 1;
        maxVal += 1;
      } else {
        const pad = (maxVal - minVal) * 0.08;
        minVal -= pad;
        maxVal += pad;
      }

      // Draw Y-Axis labels for first 3 unit groups
      if (gIdx < 3) {
        const axisColor = group.channels[0].color;
        ctx.fillStyle = axisColor;
        ctx.font = "11px 'JetBrains Mono', monospace";
        let axisX, align;
        if (gIdx === 0) { axisX = plot.x - 8; align = "right"; }
        else if (gIdx === 1) { axisX = plot.x + plot.w + 8; align = "left"; }
        else { axisX = plot.x - 62; align = "right"; }

        ctx.textAlign = align;
        ctx.fillText(`[${group.unit}]`, axisX, plot.y - 6);
        for (let i = 0; i <= hLines; i++) {
          const y = plot.y + (plot.h * i) / hLines;
          const val = maxVal - ((maxVal - minVal) * i) / hLines;
          ctx.fillText(val.toFixed(Math.abs(val) >= 100 ? 0 : 1), axisX, y + 4);
        }
      }

      // Plot each channel in this unit group
      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.x, plot.y, plot.w, plot.h);
      ctx.clip();

      group.channels.forEach(ch => {
        const indices = this.downsampleLTTB(startIdx, endIdx, ch.values, maxPts);
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = ch.isVirtual ? 2 : 1.8;
        if (ch.isVirtual) ctx.setLineDash([5, 4]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        let started = false;
        for (let k = 0; k < indices.length; k++) {
          const idx = indices[k];
          const v = ch.values[idx];
          if (Number.isNaN(v)) { started = false; continue; }
          const x = plot.x + ((this.times[idx] - this.viewMinT) / (this.viewMaxT - this.viewMinT)) * plot.w;
          const y = plot.y + plot.h - ((v - minVal) / (maxVal - minVal)) * plot.h;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else {
            if (!ch.isNumeric) {
              // Step waveform for discrete states
              const prevIdx = indices[k - 1];
              const prevY = plot.y + plot.h - ((ch.values[prevIdx] - minVal) / (maxVal - minVal)) * plot.h;
              ctx.lineTo(x, prevY);
            }
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.restore();
    });

    // Draw Delta Cursors A & B
    [this.cursorA, this.cursorB].forEach((cIdx, idx) => {
      if (cIdx === null || cIdx < 0 || cIdx >= this.times.length) return;
      const t = this.times[cIdx];
      if (t < this.viewMinT || t > this.viewMaxT) return;
      const x = plot.x + ((t - this.viewMinT) / (this.viewMaxT - this.viewMinT)) * plot.w;
      ctx.strokeStyle = idx === 0 ? "#38bdf8" : "#f7c600";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, plot.y);
      ctx.lineTo(x, plot.y + plot.h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = idx === 0 ? "#38bdf8" : "#f7c600";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillText(idx === 0 ? "A" : "B", x + 4, plot.y + 13);
    });

    // Draw Hover Crosshair
    if (this.hoverIdx >= 0 && this.hoverIdx < this.times.length) {
      const t = this.times[this.hoverIdx];
      const x = plot.x + ((t - this.viewMinT) / (this.viewMaxT - this.viewMinT)) * plot.w;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, plot.y);
      ctx.lineTo(x, plot.y + plot.h);
      ctx.stroke();
    }
  }

  updateTooltip(mouseX, mouseY) {
    if (this.hoverIdx < 0) return;
    const active = this.getActiveChannels();
    if (!active.length) {
      this.tooltipEl.classList.add("hidden");
      return;
    }

    const t = this.times[this.hoverIdx];
    let html = `<div class="tt-time">t = ${t.toFixed(2)} s</div>`;
    active.slice(0, 12).forEach(ch => {
      const raw = ch.isNumeric
        ? `${ch.values[this.hoverIdx].toFixed(2)} ${ch.unit !== "—" ? ch.unit : ""}`
        : `${ch.rawText[this.hoverIdx]}`;
      html += `<div class="tt-row"><span style="color:${ch.color}">● ${ch.name}</span><span class="tt-val">${raw}</span></div>`;
    });
    this.tooltipEl.innerHTML = html;
    this.tooltipEl.classList.remove("hidden");

    // Flip tooltip side if cursor is near right edge
    if (mouseX > this.width * 0.62) {
      this.tooltipEl.style.right = "auto";
      this.tooltipEl.style.left = `${this.padding.left + 12}px`;
    } else {
      this.tooltipEl.style.left = "auto";
      this.tooltipEl.style.right = `${this.padding.right + 12}px`;
    }
  }
}
