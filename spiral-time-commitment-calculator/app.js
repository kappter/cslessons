const termCountInput = document.getElementById("termCount");
const minutesPerReflectionInput = document.getElementById("minutesPerReflection");
const resultsBody = document.getElementById("resultsBody");
const summaryText = document.getElementById("summaryText");
const quickButtons = document.querySelectorAll("[data-terms]");

const models = [2, 3, 4, 5];

termCountInput.addEventListener("input", render);
minutesPerReflectionInput.addEventListener("input", render);

quickButtons.forEach(button => {
  button.addEventListener("click", () => {
    termCountInput.value = button.dataset.terms;
    render();
  });
});

function render() {
  const terms = Math.max(1, Number(termCountInput.value) || 1);
  const minutesPerReflection = Math.max(1, Number(minutesPerReflectionInput.value) || 1);

  resultsBody.innerHTML = models.map(depth => {
    const reflections = terms * depth;
    const totalMinutes = reflections * minutesPerReflection;
    const totalHours = totalMinutes / 60;

    return `
      <tr>
        <td><strong>${depth}-${minutesPerReflection}min. Reflections (${terms} Terms)</strong></td>
        <td>${reflections}</td>
        <td>${totalMinutes}</td>
        <td>${totalHours.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  summaryText.textContent = `${terms} terms × ${minutesPerReflection} minute reflections`;
}

render();
