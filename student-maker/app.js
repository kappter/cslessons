const form = document.getElementById("form");
const preview = document.getElementById("preview");
const jsonEl = document.getElementById("json");
const downloadBtn = document.getElementById("download");

form.addEventListener("input", update);
downloadBtn.addEventListener("click", download);

const TOK_TERMS = [
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

const SLOT_LABELS_BY_DEPTH = {
  2: ["concrete", "history"],
  3: ["abstract", "concrete", "history"],
  4: ["amalgam", "abstract", "concrete", "history"],
  5: ["motion", "amalgam", "abstract", "concrete", "history"]
};

function build() {
  const f = name => String(form.elements[name]?.value || "").trim();
  const depth = Math.max(2, Math.min(5, Number(f("reflectionDepth") || 5)));
  const reflections = buildDayReflections(depth);

  return {
    version: 2,
    studentProfile: {
      firstName: f("firstName"),
      lastInitial: f("lastInitial"),
      gradeLevel: Number(f("gradeLevel") || 11),
      period: f("period"),
      bio: {
        communicationStyle: f("communicationStyle"),
        personalStrength: f("personalStrength"),
        hobby1: f("hobby1"),
        futureInterest: f("futureInterest"),
        worldviewPhrase: f("worldviewPhrase"),
        learningStyle: f("learningStyle"),
        challengeArea: f("challengeArea")
      },
      tokStance: {
        trustsMore: f("trustsMore"),
        trustsLess: f("trustsLess")
      }
    },
    spiral: {
      segments: [
        {
          listId: "tok-spiral",
          listName: "TOK Spiral",
          listHue: 260,
          terms: TOK_TERMS
        }
      ],
      shuffledTerms: TOK_TERMS.map((term, index) => ({
        term,
        listId: "tok-spiral",
        listHue: 260,
        originalIndex: index
      })),
      currentDay: 1,
      startDate: new Date().toISOString().slice(0, 10),
      mode: "sequential",
      reflectionDepth: depth
    },
    reflections
  };
}

function buildDayReflections(depth) {
  const reflections = {};
  const totalDays = TOK_TERMS.length + depth - 1;
  const activeSlots = SLOT_LABELS_BY_DEPTH[depth];

  for (let day = 1; day <= totalDays; day++) {
    const dayKey = `day-${day}`;
    const dayEntry = {};

    const activeTerms = TOK_TERMS.slice(
      Math.max(0, day - depth),
      Math.min(day, TOK_TERMS.length)
    );

    const daySlots = activeSlots.slice(activeSlots.length - activeTerms.length);

    for (let i = 0; i < activeTerms.length; i++) {
      const term = activeTerms[i];
      const slot = daySlots[i];
      dayEntry[slot] = generateReflection(term, slot, day, i);
    }

    reflections[dayKey] = dayEntry;
    reflections[String(day)] = dayEntry;
  }

  return reflections;
}

function generateReflection(term, slot, day, indexInDay) {
  const text = generateText(term, slot);
  const rating = generateRating(term, slot, day, indexInDay);
  return { text, rating };
}

function generateText(term, slot) {
  const t = term.toLowerCase();

  const bank = {
    history: [
      `I used to think ${t} was simpler than it really is. The more I sit with it, the more it feels like something that changes depending on context, experience, and what a person is trying to understand.`,
      `At first, ${t} sounded like a stable idea, almost like it should mean the same thing to everyone. Now it feels more like a concept people keep revisiting because life keeps giving it new pressure.`,
      `Earlier, I treated ${t} like a definition to memorize. Now it feels more like a long human conversation that keeps changing as people test what holds up and what does not.`
    ],
    concrete: [
      `I can see ${t} in real life when a person has to make a judgment and then live with the result. It stops being abstract when it affects trust, choices, or how someone reads a situation.`,
      `${term} becomes more real when I think about ordinary moments like disagreement, pressure, mistakes, or changing my mind. That is where the idea stops being academic and starts becoming personal.`,
      `In actual experience, ${t} shows up when one person feels certain and another sees the same thing differently. That makes me think ${t} is not just about facts, but about how people meet facts.`
    ],
    abstract: [
      `What makes ${t} difficult is that it seems important partly because it resists being reduced to one clean meaning. The concept keeps opening into bigger questions about how people know, judge, and interpret.`,
      `${term} feels deeper the longer I think about it because it seems tied to larger questions about reality, meaning, and the limits of human perspective.`,
      `At an abstract level, ${t} does not feel like an isolated idea. It feels connected to the structure of knowledge itself and to the tension between what is real and what can actually be justified.`
    ],
    amalgam: [
      `When ${t} is placed next to other TOK ideas, it gets more interesting instead of less. It seems to change shape when it mixes with perspective, interpretation, evidence, or doubt.`,
      `${term} does not seem strong enough on its own. It becomes more meaningful when it interacts with other concepts, because that is where the tension and the usefulness both appear.`,
      `I do not think ${t} stands alone very well. It starts to matter more when it is put in conversation with the other ways people build meaning, trust, and explanation.`
    ],
    motion: [
      `A real next step would be to test how ${t} changes in practice by comparing my first judgment of a situation with what I think after more context, another viewpoint, or stronger evidence enters.`,
      `I would turn ${t} into action by tracking one moment each day this week where it actually shows up, then seeing whether my first interpretation survives reflection.`,
      `To move on from just thinking about ${t}, I would use it as a lens on something real: a conversation, a disagreement, a claim online, or a memory, then record what changed once I questioned my first reaction.`
    ]
  };

  const options = bank[slot] || [`${term} matters.`];
  return options[Math.floor(Math.random() * options.length)];
}

function generateRating(term, slot, day, indexInDay) {
  const patterns = {
    history: [3, 4, 2, 4, 3],
    concrete: [4, 3, 4, 2, 3],
    abstract: [3, 4, 4, 2, 3],
    amalgam: [2, 3, 4, 3, 4],
    motion: [4, 3, 2, 4, 3]
  };

  const seq = patterns[slot] || [3];
  return seq[(day + indexInDay) % seq.length];
}

function buildBio(data) {
  const p = data.studentProfile;
  const b = p.bio;
  const s = p.tokStance;

  return `I'm a ${p.gradeLevel}th grade student who comes across as ${b.communicationStyle || "quiet"}, but I'm actually ${b.personalStrength || "thoughtful"}. I care about ${b.hobby1 || "things I enjoy"} and want to explore ${b.futureInterest || "my future"}. I think life makes sense when ${b.worldviewPhrase || "things connect"}. I learn best when things are ${b.learningStyle || "clear"}. I trust ${s.trustsMore || "evidence"} more than ${s.trustsLess || "confidence"}. I'm working on ${b.challengeArea || "improving myself"}.`;
}

function update() {
  const data = build();
  preview.textContent = buildBio(data);
  jsonEl.textContent = JSON.stringify(data, null, 2);
}

function download() {
  const data = build();
  const first = data.studentProfile.firstName || "student";
  const last = data.studentProfile.lastInitial || "x";
  const depth = data.spiral.reflectionDepth;
  const filename = `${first.toLowerCase()}_${last.toLowerCase()}_${depth}term_10tok.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

update();
