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

let state = [];

fileInput.addEventListener("change", handleFiles);
loadDemoBtn.addEventListener("click", loadDemoBatch);
clearBtn.addEventListener("click", clearAll);

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
  const demoFiles = Array.from({ length: 6 }, (_, i) => {
    const period = i < 3 ? "2A" : "3B";
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
  const slotMap = {
    5: ["motion", "amalgam", "abstract", "concrete", "history"]
  };

  for (let day = 1; day <= totalDays; day++) {
    const activeTerms = terms.slice(Math.max(0, day - depth), Math.min(day, terms.length));
    const slots = slotMap[depth].slice(slotMap[depth].length - activeTerms.length);
    const dayEntry = {};

    for (let i = 0; i < activeTerms.length; i++) {
      const term = activeTerms[i];
      const slot = slots[i];
      dayEntry[slot] = {
        text: demoText(term, slot),
        rating: demoRating(term, slot, day)
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

function demoText(term, slot) {
  const t = term.toLowerCase();

  const bank = {
    history: `I used to think ${t} was simpler than it really is, but now it feels like something that changes depending on context and experience.`,
    concrete: `${term} becomes real when it affects a decision, a disagreement, or how someone reads a situation.`,
    abstract: `${term} opens into larger questions about how people know, justify, and interpret what seems true.`,
    amalgam: `${term} gets more interesting when it interacts with other TOK ideas instead of standing alone.`,
    motion: `A real next step would be to test how ${t} changes when I compare my first reaction with stronger evidence or another point of view.`
  };

  return bank[slot];
}

function demoRating(term, slot, day) {
  const map = {
    history: [3, 4, 2, 4],
    concrete: [4, 3, 4, 2],
    abstract: [3, 4, 4, 2],
    amalgam: [2, 3, 4, 3],
    motion: [4, 3, 2, 4]
  };
  const arr = map[slot] || [3];
  return arr[day % arr.length];
}

function analyzeStudentFile(data) {
  if (!data || typeof data !== "object") {
    return { valid: false };
  }

  const terms = data?.spiral?.segments?.[0]?.terms;
  const depth = Number(data?.spiral?.reflectionDepth || 0);
  const reflections = data?.reflections;

  if (!Array.isArray(terms) || !terms.length || !reflections || !depth) {
    return { valid: false };
  }

  const dayKeys = Object.keys(reflections)
    .filter(k => /^day-\d+$/.test(k))
    .sort((a, b) => getDayNum(a) - getDayNum(b));

  if (!dayKeys.length) {
    return { valid: false };
  }

  const allEntries = [];
  const termEntries = {};

  for (const key of dayKeys) {
    const day = getDayNum(key);
    const dayRef = reflections[key] || {};

    const activeTerms = terms.slice(
      Math.max(0, day - depth),
      Math.min(day, terms.length)
    );

    const activeSlots = SLOT_OLDEST_TO_NEWEST.slice(
      SLOT_OLDEST_TO_NEWEST.length - activeTerms.length
    );

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

  if (!allEntries.length) {
    return { valid: false };
  }

  const avgRating = allEntries.reduce((sum, e) => sum + e.rating, 0) / allEntries.length;

  const topTermRows = Object.entries(termEntries)
    .map(([term, entries]) => {
      const avg = entries.reduce((sum, e) => sum + e.rating, 0) / entries.length;
      const max = Math.max(...entries.map(e => e.rating));
      const bestEntry = entries.slice().sort((a, b) => b.rating - a.rating || b.text.length - a.text.length)[0];
      return {
        term,
        avg,
        max,
        bestSlot: bestEntry.slotLabel
      };
    })
    .sort((a, b) => b.avg - a.avg || b.max - a.max || a.term.localeCompare(b.term));

  const motionStats = classifyMotion(allEntries.filter(e => e.slot === "motion"));
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
    motionStats,
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

    if (t.includes("compare") || t.includes("another point of view") || t.includes("different point of view") || t.includes("another viewpoint")) {
      counts.Comparative++;
    } else if (t.includes("test") || t.includes("track") || t.includes("experiment") || t.includes("audit")) {
      counts.Experimental++;
    } else if (t.includes("observe") || t.includes("journal") || t.includes("log") || t.includes("record")) {
      counts.Observational++;
    } else if (t.includes("apply") || t.includes("use it") || t.includes("real next step") || t.includes("next step")) {
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

    allTopReflections.push(...item.analysis.topReflections.map(r => ({
      ...r,
      studentLabel: item.analysis.studentLabel
    })));
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
  promptCardsEl.innerHTML = promptSeeds.map(seed => `
    <article class="prompt-card">
      <h3>${escapeHtml(seed.title)}</h3>
      <p>${escapeHtml(seed.body)}</p>
      <div class="quote">“${escapeHtml(seed.snippet)}”</div>
      <div class="meta">${escapeHtml(seed.studentLabel)} · ${escapeHtml(seed.term)} · ${escapeHtml(seed.slotLabel)}</div>
    </article>
  `).join("");
}

function renderRoster(valid) {
  if (!valid.length) {
    rosterCardsEl.innerHTML = `<div class="roster-card"><h3>No files loaded</h3><p>Import valid student files to see a roster preview.</p></div>`;
    return;
  }

  rosterCardsEl.innerHTML = valid.map(item => {
    const analysis = item.analysis;
    return `
      <article class="roster-card">
        <h3>${escapeHtml(analysis.studentLabel)}</h3>
        <p><strong>Period:</strong> ${escapeHtml(analysis.period)}</p>
        <p><strong>Reflections:</strong> ${analysis.reflectionCount}</p>
        <p><strong>Average rating:</strong> ${analysis.avgRating.toFixed(2)}</p>
        <p><strong>Top concepts:</strong> ${escapeHtml(analysis.topTerms.map(t => t.term).join(", "))}</p>
      </article>
    `;
  }).join("");
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

  reflectionCardsEl.innerHTML = top.map(ref => `
    <article class="reflection-card">
      <h3>${escapeHtml(ref.term)}</h3>
      <div class="meta">${escapeHtml(ref.studentLabel)} · ${escapeHtml(ref.slotLabel)} · Day ${ref.day} · Rating ${ref.rating}</div>
      <div class="quote">“${escapeHtml(ref.text)}”</div>
    </article>
  `).join("");
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
    return {
      text: value.text,
      rating: Number(value.rating || 0)
    };
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
