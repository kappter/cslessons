const fileInput = document.getElementById("fileInput");
const loadDemoBtn = document.getElementById("loadDemoBtn");
const clearBtn = document.getElementById("clearBtn");

const filesLoadedEl = document.getElementById("filesLoaded");
const validCountEl = document.getElementById("validCount");
const rejectedCountEl = document.getElementById("rejectedCount");
const periodCountEl = document.getElementById("periodCount");

const topConceptsEl = document.getElementById("topConcepts");
const motionSummaryEl = document.getElementById("motionSummary");
const promptCardsEl = document.getElementById("promptCards");
const rosterCardsEl = document.getElementById("rosterCards");
const reflectionCardsEl = document.getElementById("reflectionCards");

const SLOT_OLDEST_TO_NEWEST = ["motion", "amalgam", "abstract", "concrete", "history"];
const COLORS = ["#1f4f82", "#c9a44c", "#4f6f9a", "#8c7442", "#7f95b0", "#a8c686"];

let state = [];
let chartDataState = null;

fileInput.addEventListener("change", handleFiles);
loadDemoBtn.addEventListener("click", loadDemoBatch);
clearBtn.addEventListener("click", clearAll);

window.addEventListener("resize", () => {
  if (chartDataState) renderCharts(chartDataState);
});

async function handleFiles(e) {
  const files = Array.from(e.target.files || []);
  const parsed = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const analyzed = analyzeStudentFile(data);
      parsed.push({
        fileName: file.name,
        data,
        valid: analyzed.valid,
        analysis: analyzed
      });
    } catch {
      parsed.push({
        fileName: file.name,
        data: null,
        valid: false,
        analysis: null
      });
    }
  }

  state = parsed;
  render();
}

function clearAll() {
  state = [];
  fileInput.value = "";
  render();
}

function loadDemoBatch() {
  const demoFiles = Array.from({ length: 18 }, (_, i) => {
    const period = i < 6 ? "2A" : i < 12 ? "3B" : "4A";
    const name = `Student${i + 1}`;
    const file = buildDemoStudentFile(name, period);
    return {
      fileName: `${name.toLowerCase()}_${period}.json`,
      data: file,
      valid: true,
      analysis: analyzeStudentFile(file)
    };
  });

  state = demoFiles;
  render();
}

function buildDemoStudentFile(firstName, period) {
  const terms = [
    "Knowledge",
    "Belief",
    "Truth",
    "Justification",
    "Doubt",
    "Evidence",
    "Interpretation",
    "Perspective",
    "Meaning",
    "Information"
  ];

  const depth = 5;
  const reflections = {};
  const totalDays = terms.length + depth - 1;
  const slots = ["motion", "amalgam", "abstract", "concrete", "history"];

  for (let day = 1; day <= totalDays; day++) {
    const activeTerms = terms.slice(Math.max(0, day - depth), Math.min(day, terms.length));
    const activeSlots = slots.slice(slots.length - activeTerms.length);
    const dayEntry = {};

    for (let i = 0; i < activeTerms.length; i++) {
      const term = activeTerms[i];
      const slot = activeSlots[i];
      dayEntry[slot] = {
        text: demoText(term, slot, day, period),
        rating: demoRating(term, slot, day, period)
      };
    }

    reflections[`day-${day}`] = dayEntry;
    reflections[String(day)] = dayEntry;
  }

  return {
    version: 2,
    studentProfile: {
      firstName,
      lastInitial: "D",
      gradeLevel: 11,
      period,
      bio: {},
      tokStance: {}
    },
    spiral: {
      segments: [
        {
          listId: "tok-spiral",
          listName: "TOK Spiral",
          listHue: 260,
          terms
        }
      ],
      reflectionDepth: depth
    },
    reflections
  };
}

function demoText(term, slot, day, period) {
  const t = term.toLowerCase();
  const toneShift =
    period === "2A"
      ? "through correction"
      : period === "3B"
      ? "through comparison"
      : "through testing";

  const bank = {
    history: `I used to think ${t} was simpler than it really is, but now it feels like something that changes depending on context and experience.`,
    concrete: `${term} becomes real when it affects a decision, a disagreement, or how someone reads a situation.`,
    abstract: `${term} opens into larger questions about how people know, justify, and interpret what seems true.`,
    amalgam: `${term} gets more interesting when it mixes with perspective, evidence, and interpretation instead of standing alone.`,
    motion: `A real next step would be to explore ${t} ${toneShift} by comparing my first reaction with what remains after more context or stronger evidence enters.`
  };

  return bank[slot];
}

function demoRating(term, slot, day, period) {
  const periodBias = period === "2A" ? 0 : period === "3B" ? 1 : 0;

  const map = {
    history: [3, 4, 2, 4],
    concrete: [4, 3, 4, 2],
    abstract: [3, 4, 4, 2],
    amalgam: [2, 3, 4, 3],
    motion: [4, 3, 2, 4]
  };

  const arr = map[slot] || [3];
  return Math.min(4, Math.max(1, arr[(day + periodBias) % arr.length]));
}

function analyzeStudentFile(data) {
  if (!data || typeof data !== "object") return { valid: false };

  const terms = data?.spiral?.segments?.[0]?.terms;
  const depth = Number(data?.spiral?.reflectionDepth || 0);
  const reflections = data?.reflections;

  if (!Array.isArray(terms) || !terms.length || !reflections || !depth) {
    return { valid: false };
  }

  const dayKeys = Object.keys(reflections)
    .filter(k => /^day-\d+$/.test(k))
    .sort((a, b) => getDayNum(a) - getDayNum(b));

  if (!dayKeys.length) return { valid: false };

  const allEntries = [];
  const termEntries = {};

  for (const key of dayKeys) {
    const day = getDayNum(key);
    const dayRef = reflections[key] || {};
    const activeTerms = terms.slice(Math.max(0, day - depth), Math.min(day, terms.length));
    const activeSlots = SLOT_OLDEST_TO_NEWEST.slice(SLOT_OLDEST_TO_NEWEST.length - activeTerms.length);

    activeTerms.forEach((term, i) => {
      const slot = activeSlots[i];
      const entry = normalizeEntry(dayRef[slot]);
      if (!entry) return;

      const record = {
        day,
        term,
        slot,
        slotLabel: capitalize(slot),
        text: entry.text,
        rating: entry.rating
      };

      allEntries.push(record);
      if (!termEntries[term]) termEntries[term] = [];
      termEntries[term].push(record);
    });
  }

  if (!allEntries.length) return { valid: false };

  const avgRating =
    allEntries.reduce((sum, e) => sum + e.rating, 0) / allEntries.length;

  const topTermRows = Object.entries(termEntries)
    .map(([term, entries]) => {
      const avg = entries.reduce((sum, e) => sum + e.rating, 0) / entries.length;
      const max = Math.max(...entries.map(e => e.rating));
      const bestEntry = entries
        .slice()
        .sort((a, b) => b.rating - a.rating || b.text.length - a.text.length)[0];

      return {
        term,
        avg,
        max,
        bestSlot: bestEntry.slotLabel
      };
    })
    .sort((a, b) => b.avg - a.avg || b.max - a.max || a.term.localeCompare(b.term));

  const topReflections = allEntries
    .slice()
    .sort((a, b) => b.rating - a.rating || b.text.length - a.text.length || a.day - b.day)
    .slice(0, 6);

  return {
    valid: true,
    studentLabel: buildStudentLabel(data.studentProfile),
    period: data.studentProfile?.period || "—",
    avgRating,
    reflectionCount: allEntries.length,
    topTerms: topTermRows.slice(0, 3),
    topReflections,
    motionStats: classifyMotion(allEntries.filter(e => e.slot === "motion")),
    allEntries
  };
}

function classifyMotion(entries) {
  const counts = {
    Passive: 0,
    Observational: 0,
    Comparative: 0,
    Experimental: 0,
    Applied: 0
  };

  entries.forEach(entry => {
    const t = entry.text.toLowerCase();

    if (t.includes("compare") || t.includes("another point of view") || t.includes("viewpoint")) {
      counts.Comparative++;
    } else if (t.includes("test") || t.includes("track") || t.includes("experiment") || t.includes("audit")) {
      counts.Experimental++;
    } else if (t.includes("observe") || t.includes("journal") || t.includes("log") || t.includes("record")) {
      counts.Observational++;
    } else if (t.includes("apply") || t.includes("next step") || t.includes("real next step") || t.includes("use it")) {
      counts.Applied++;
    } else {
      counts.Passive++;
    }
  });

  return counts;
}

function render() {
  const total = state.length;
  const valid = state.filter(x => x.valid && x.analysis);
  const rejected = total - valid.length;
  const periods = new Set(valid.map(x => x.analysis.period));

  filesLoadedEl.textContent = String(total);
  validCountEl.textContent = String(valid.length);
  rejectedCountEl.textContent = String(rejected);
  periodCountEl.textContent = String(periods.size);

  renderOverview(valid);
  renderRoster(valid);
  renderReflections(valid);
  renderChartsFromValid(valid);
}

function renderOverview(valid) {
  if (!valid.length) {
    topConceptsEl.innerHTML = `<span class="chip">Load files to see strongest concepts</span>`;
    motionSummaryEl.innerHTML = `<span class="chip">Load files to see motion profile</span>`;
    promptCardsEl.innerHTML = `<div class="prompt-card"><h3>No prompt seeds yet</h3><p>Import valid student files to build class-level TOK / EE prompt seeds.</p></div>`;
    return;
  }

  const conceptTotals = {};
  const motionTotals = {
    Passive: 0,
    Observational: 0,
    Comparative: 0,
    Experimental: 0,
    Applied: 0
  };
  const allTopReflections = [];

  valid.forEach(item => {
    item.analysis.topTerms.forEach(termRow => {
      if (!conceptTotals[termRow.term]) {
        conceptTotals[termRow.term] = { count: 0, totalAvg: 0 };
      }
      conceptTotals[termRow.term].count++;
      conceptTotals[termRow.term].totalAvg += termRow.avg;
    });

    Object.keys(motionTotals).forEach(key => {
      motionTotals[key] += item.analysis.motionStats[key] || 0;
    });

    allTopReflections.push(
      ...item.analysis.topReflections.map(r => ({
        ...r,
        studentLabel: item.analysis.studentLabel
      }))
    );
  });

  const conceptRows = Object.entries(conceptTotals)
    .map(([term, row]) => ({
      term,
      avg: row.totalAvg / row.count,
      count: row.count
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 8);

  topConceptsEl.innerHTML = conceptRows
    .map(row => `<span class="chip">${escapeHtml(row.term)} · avg ${row.avg.toFixed(2)}</span>`)
    .join("");

  motionSummaryEl.innerHTML = Object.entries(motionTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => `<span class="chip">${escapeHtml(label)} · ${value}</span>`)
    .join("");

  const promptSeeds = buildPromptSeeds(allTopReflections);

  promptCardsEl.innerHTML = promptSeeds
    .map(seed => `
      <article class="prompt-card">
        <h3>${escapeHtml(seed.title)}</h3>
        <p>${escapeHtml(seed.body)}</p>
        <div class="quote">“${escapeHtml(seed.snippet)}”</div>
        <div class="meta">${escapeHtml(seed.studentLabel)} · ${escapeHtml(seed.term)} · ${escapeHtml(seed.slotLabel)}</div>
      </article>
    `)
    .join("");
}

function renderRoster(valid) {
  if (!valid.length) {
    rosterCardsEl.innerHTML = `<div class="roster-card"><h3>No files loaded</h3><p>Import valid student files to see a roster preview.</p></div>`;
    return;
  }

  rosterCardsEl.innerHTML = valid
    .map(item => {
      const a = item.analysis;
      return `
        <article class="roster-card">
          <h3>${escapeHtml(a.studentLabel)}</h3>
          <p><strong>Period:</strong> ${escapeHtml(a.period)}</p>
          <p><strong>Reflections:</strong> ${a.reflectionCount}</p>
          <p><strong>Average rating:</strong> ${a.avgRating.toFixed(2)}</p>
          <p><strong>Top concepts:</strong> ${escapeHtml(a.topTerms.map(t => t.term).join(", "))}</p>
        </article>
      `;
    })
    .join("");
}

function renderReflections(valid) {
  if (!valid.length) {
    reflectionCardsEl.innerHTML = `<div class="reflection-card"><h3>No reflections yet</h3><p>Import valid files to see top reflections across the class.</p></div>`;
    return;
  }

  const merged = [];
  valid.forEach(item => {
    item.analysis.topReflections.forEach(ref => {
      merged.push({
        ...ref,
        studentLabel: item.analysis.studentLabel
      });
    });
  });

  const top = merged
    .sort((a, b) => b.rating - a.rating || b.text.length - a.text.length || a.day - b.day)
    .slice(0, 8);

  reflectionCardsEl.innerHTML = top
    .map(ref => `
      <article class="reflection-card">
        <h3>${escapeHtml(ref.term)}</h3>
        <div class="meta">${escapeHtml(ref.studentLabel)} · ${escapeHtml(ref.slotLabel)} · Day ${ref.day} · Rating ${ref.rating}</div>
        <div class="quote">“${escapeHtml(ref.text)}”</div>
      </article>
    `)
    .join("");
}

function renderChartsFromValid(valid) {
  if (!valid.length) {
    chartDataState = null;
    clearCanvases();
    return;
  }

  const conceptTotals = {};
  const motionTotals = {
    Passive: 0,
    Observational: 0,
    Comparative: 0,
    Experimental: 0,
    Applied: 0
  };
  const slotTotals = {
    History: 0,
    Concrete: 0,
    Abstract: 0,
    Amalgam: 0,
    Motion: 0
  };
  const ratingTotals = {
    1: 0,
    2: 0,
    3: 0,
    4: 0
  };
  const perStudent = [];
  const periods = {};

  valid.forEach(item => {
    const a = item.analysis;
    perStudent.push({ label: a.studentLabel, value: a.avgRating });

    if (!periods[a.period]) periods[a.period] = { count: 0, avgTotal: 0 };
    periods[a.period].count++;
    periods[a.period].avgTotal += a.avgRating;

    a.topTerms.forEach(termRow => {
      if (!conceptTotals[termRow.term]) {
        conceptTotals[termRow.term] = { count: 0, totalAvg: 0 };
      }
      conceptTotals[termRow.term].count++;
      conceptTotals[termRow.term].totalAvg += termRow.avg;
    });

    Object.keys(a.motionStats).forEach(key => {
      motionTotals[key] += a.motionStats[key] || 0;
    });

    a.allEntries.forEach(entry => {
      slotTotals[entry.slotLabel] = (slotTotals[entry.slotLabel] || 0) + 1;
      const rounded = Math.max(1, Math.min(4, Math.round(entry.rating)));
      ratingTotals[rounded] += 1;
    });
  });

  const conceptSeries = Object.entries(conceptTotals)
    .map(([label, row]) => ({
      label,
      value: row.totalAvg / row.count
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const motionSeries = Object.entries(motionTotals).map(([label, value]) => ({ label, value }));
  const studentSeries = perStudent.sort((a, b) => b.value - a.value).slice(0, 20);
  const slotSeries = Object.entries(slotTotals).map(([label, value]) => ({ label, value }));
  const periodSeries = Object.entries(periods)
    .map(([label, row]) => ({
      label,
      value: row.avgTotal / row.count
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const ratingSeries = Object.entries(ratingTotals).map(([label, value]) => ({
    label: `Rating ${label}`,
    value
  }));

  chartDataState = {
    conceptSeries,
    motionSeries,
    studentSeries,
    slotSeries,
    periodSeries,
    ratingSeries
  };

  renderCharts(chartDataState);
}

function renderCharts(data) {
  drawBarChart("conceptChart", data.conceptSeries, {
    maxValue: 4,
    horizontal: true
  });

  drawBarChart("motionChart", data.motionSeries, {
    maxValue: Math.max(1, ...data.motionSeries.map(x => x.value)),
    horizontal: false
  });

  drawBarChart("studentChart", data.studentSeries, {
    maxValue: 4,
    horizontal: true,
    compact: true
  });

  drawBarChart("slotChart", data.slotSeries, {
    maxValue: Math.max(1, ...data.slotSeries.map(x => x.value)),
    horizontal: false
  });

  drawBarChart("periodChart", data.periodSeries, {
    maxValue: 4,
    horizontal: false
  });

  drawBarChart("ratingChart", data.ratingSeries, {
    maxValue: Math.max(1, ...data.ratingSeries.map(x => x.value)),
    horizontal: false
  });
}

function clearCanvases() {
  ["conceptChart", "motionChart", "studentChart", "slotChart", "periodChart", "ratingChart"].forEach(id => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function drawBarChart(canvasId, items, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !items?.length) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, rect.width || 600);
  const height = Math.max(260, rect.height || Number(canvas.getAttribute("height")) || 300);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const ink = "#142235";
  const muted = "#5d6b80";
  const line = "#d7e0ea";

  ctx.font = "12px Arial";
  ctx.textBaseline = "middle";
  const maxValue = options.maxValue || Math.max(...items.map(i => i.value)) || 1;

  if (options.horizontal) {
    const left = width < 520 ? 96 : 130;
    const right = 20;
    const top = 18;
    const rowH = options.compact ? 18 : 24;
    const gap = options.compact ? 8 : 12;
    const innerW = width - left - right;

    items.forEach((item, i) => {
      const y = top + i * (rowH + gap);

      ctx.fillStyle = muted;
      ctx.textAlign = "left";
      ctx.fillText(item.label, 8, y + rowH / 2);

      ctx.fillStyle = line;
      roundRect(ctx, left, y, innerW, rowH, 10, true, false);

      ctx.fillStyle = COLORS[i % COLORS.length];
      roundRect(ctx, left, y, Math.max(12, innerW * (item.value / maxValue)), rowH, 10, true, false);

      ctx.fillStyle = ink;
      ctx.textAlign = "right";
      const valueText = maxValue === 4 ? item.value.toFixed(2) : item.value.toFixed(0);
      ctx.fillText(valueText, width - 4, y + rowH / 2);
    });

    ctx.textAlign = "start";
    return;
  }

  const left = 42;
  const right = 18;
  const top = 16;
  const bottom = 62;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const band = innerW / Math.max(items.length, 1);
  const barW = band * 0.62;

  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + innerH);
  ctx.lineTo(left + innerW, top + innerH);
  ctx.stroke();

  const steps = Math.max(1, Math.ceil(maxValue));
  for (let g = 0; g <= steps; g++) {
    const y = top + innerH - (g / steps) * innerH;
    ctx.strokeStyle = line;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + innerW, y);
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.fillText(String(g), 12, y);
  }

  items.forEach((item, i) => {
    const x = left + i * band + (band - barW) / 2;
    const h = (item.value / maxValue) * innerH;
    const y = top + innerH - h;

    ctx.fillStyle = COLORS[i % COLORS.length];
    roundRect(ctx, x, y, barW, h, 8, true, false);

    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    const valueText = maxValue === 4 ? item.value.toFixed(2) : item.value.toFixed(0);
    ctx.fillText(valueText, x + barW / 2, y - 10);

    ctx.save();
    ctx.translate(x + barW / 2, top + innerH + 20);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = "right";
    ctx.fillStyle = muted;
    ctx.fillText(item.label, 0, 0);
    ctx.restore();
  });

  ctx.textAlign = "start";
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function buildPromptSeeds(reflections) {
  const usedTerms = new Set();
  const prompts = [];

  for (const ref of reflections.sort((a, b) => b.rating - a.rating || b.text.length - a.text.length)) {
    if (usedTerms.has(ref.term)) continue;
    usedTerms.add(ref.term);

    const built = buildPromptFromEntry(ref);

    prompts.push({
      title: built.title,
      body: built.body,
      snippet: shorten(ref.text, 170),
      studentLabel: ref.studentLabel,
      term: ref.term,
      slotLabel: ref.slotLabel
    });

    if (prompts.length >= 6) break;
  }

  return prompts;
}

function buildPromptFromEntry(entry) {
  const text = entry.text.toLowerCase();
  const hasContrast = text.includes("but") || text.includes("however") || text.includes("yet");
  const hasAction = text.includes("test") || text.includes("track") || text.includes("next step") || text.includes("compare");
  const hasConnection = text.includes("connect") || text.includes("interacts") || text.includes("placed next to") || text.includes("mixes with");

  if (hasContrast) {
    return {
      title: `To what extent can ${entry.term} hold when competing interpretations exist?`,
      body: `This wording suggests a genuine tension. Develop it into a TOK question by asking what survives when two serious perspectives collide.`
    };
  }

  if (hasAction) {
    return {
      title: `How does applying ${entry.term} in lived situations change its meaning?`,
      body: `This reflection points beyond theory. Use it to ask whether a concept becomes clearer, weaker, or more complex when it is actually tested.`
    };
  }

  if (hasConnection) {
    return {
      title: `How does ${entry.term} change when it is placed beside other TOK concepts?`,
      body: `This reflection is already relational. Push it further by asking how one concept depends on or destabilizes another.`
    };
  }

  return {
    title: `What determines whether ${entry.term} becomes reliable knowledge?`,
    body: `Use the student’s strongest phrasing to ask what makes this concept trustworthy, limited, or open to revision.`
  };
}

function normalizeEntry(value) {
  if (!value) return null;
  if (typeof value === "string") return { text: value, rating: 0 };
  if (typeof value === "object" && typeof value.text === "string") {
    return { text: value.text, rating: Number(value.rating || 0) };
  }
  return null;
}

function buildStudentLabel(profile) {
  const first = profile?.firstName || "Student";
  const last = profile?.lastInitial ? ` ${profile.lastInitial}.` : "";
  return `${first}${last}`;
}

function getDayNum(key) {
  return Number(String(key).replace("day-", ""));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function shorten(text, n) {
  return text.length <= n ? text : text.slice(0, n - 1).trimEnd() + "…";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
