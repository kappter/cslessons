const form = document.getElementById("form");
const preview = document.getElementById("preview");
const jsonEl = document.getElementById("json");
const downloadBtn = document.getElementById("download");

form.addEventListener("input", update);
downloadBtn.addEventListener("click", download);

function build() {
  const f = name => form.elements[name].value || "";

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
      segments: [{ terms: [] }],
      reflectionDepth: 5
    },
    reflections: {}
  };
}

function buildBio(data) {
  const p = data.studentProfile;
  const b = p.bio;
  const s = p.tokStance;

  return `I'm a ${p.gradeLevel}th grade student who comes across as ${b.communicationStyle || "quiet"}, but I'm actually ${b.personalStrength || "thoughtful"}.
I care about ${b.hobby1 || "things I enjoy"} and want to explore ${b.futureInterest || "my future"}.
I think life makes sense when ${b.worldviewPhrase || "things connect"}.
I learn best when things are ${b.learningStyle || "clear"}.
I trust ${s.trustsMore || "evidence"} more than ${s.trustsLess || "confidence"}.
I'm working on ${b.challengeArea || "improving myself"}.`;
}

function update() {
  const data = build();
  preview.textContent = buildBio(data);
  jsonEl.textContent = JSON.stringify(data, null, 2);
}

function download() {
  const data = build();
  const blob = new Blob([JSON.stringify(data, null, 2)]);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "student.json";
  a.click();
}

update();
