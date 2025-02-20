let floatingUI = null;

function createFloatingUI() {
  const div = document.createElement('div');
  div.className = 'truth-guardian-floating-ui';
  div.innerHTML = `
    <div class="tg-header">
      <div class="tg-logo">Truth Guardian</div>
      <button class="tg-close">×</button>
    </div>
    <div class="tg-content">
      <div class="tg-loader">
        <div class="tg-spinner"></div>
        <p>Analyzing content...</p>
      </div>
      <div class="tg-results hidden">
        <div class="tg-credibility-meter"></div>
        <div class="tg-explanation"></div>
        <div class="tg-warnings"></div>
        <div class="tg-sources"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(div);
  return div;
}

async function analyzeContent(text) {
  const response = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text })
  });
  return await response.json();
}

function updateFloatingUI(result) {
  const resultsDiv = floatingUI.querySelector('.tg-results');
  const loaderDiv = floatingUI.querySelector('.tg-loader');
  
  const meter = resultsDiv.querySelector('.tg-credibility-meter');
  meter.style.setProperty('--credibility', `${result.credibility}%`);
  meter.innerHTML = `
    <div class="tg-meter-label">Credibility Score: ${result.credibility}%</div>
    <div class="tg-meter-bar">
      <div class="tg-meter-fill"></div>
    </div>
  `;

  resultsDiv.querySelector('.tg-explanation').textContent = result.explanation;
  
  const warningsHtml = result.warnings.map(w => `<li>${w}</li>`).join('');
  resultsDiv.querySelector('.tg-warnings').innerHTML = `
    <h3>Potential Issues</h3>
    <ul>${warningsHtml}</ul>
  `;

  loaderDiv.classList.add('hidden');
  resultsDiv.classList.remove('hidden');
}

document.addEventListener('mouseup', async (event) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText.length > 50) {
    if (!floatingUI) {
      floatingUI = createFloatingUI();
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    floatingUI.style.top = `${window.scrollY + rect.bottom + 10}px`;
    floatingUI.style.left = `${rect.left}px`;
    floatingUI.classList.add('visible');

    try {
      const result = await analyzeContent(selectedText);
      updateFloatingUI(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }
});

// Close button handler
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tg-close')) {
    floatingUI?.classList.remove('visible');
  }
}); 