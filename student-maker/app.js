const form = document.getElementById("form");
const preview = document.getElementById("preview");
const jsonEl = document.getElementById("json");
const downloadBtn = document.getElementById("download");
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
form.addEventListener("input", update);
downloadBtn.addEventListener("click", download);

function build() {
  const f = name => form.elements[name].value || "";

  const depth = Number(f("reflectionDepth") || 5);

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

  const reflections = {};

  terms.forEach((term, index) => {
    reflections[term] = [];

    for (let i = 0; i < depth; i++) {
      reflections[term].push(generateReflection(term, i, f));
    }
  });

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
          terms: terms
        }
      ],
      reflectionDepth: depth
    },

    reflections: reflections
  };
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
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "student.json";
  a.click();

  URL.revokeObjectURL(url);
}
function generateReflection(term, stage, f) {
  const tones = [
    `I used to think ${term.toLowerCase()} was simple, but now I see it depends on context.`,
    `${term} feels different depending on experience, not just facts.`,
    `The more I think about ${term.toLowerCase()}, the harder it is to define clearly.`,
    `${term} seems stable at first, but changes when perspective shifts.`,
    `${term} connects to how people interpret the same situation differently.`
  ];

  const motions = [
    `I want to track how ${term.toLowerCase()} shows up in my daily decisions this week.`,
    `I could compare how different people define ${term.toLowerCase()}.`,
    `I want to test if my understanding of ${term.toLowerCase()} holds in real situations.`,
    `I could ask others how they experience ${term.toLowerCase()} differently.`,
    `I want to challenge my assumptions about ${term.toLowerCase()} and see what changes.`
  ];

  return {
    text: tones[stage % tones.length],
    importance: Math.floor(Math.random() * 3) + 2, // 2–4 range
    motion: motions[stage % motions.length]
  };
}
update();
