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
      </div>
    </div>
  `;
  
  document.body.appendChild(div);
  return div;
}

async function analyzeContent(text) {
  try {
    // Show loading state first
    if (floatingUI) {
      const loaderDiv = floatingUI.querySelector('.tg-loader');
      const resultsDiv = floatingUI.querySelector('.tg-results');
      loaderDiv.style.display = 'block';
      resultsDiv.classList.add('hidden');
    }

    // Send message to background script with retry
    const response = await new Promise((resolve) => {
      const sendMessageWithRetry = (retryCount = 0) => {
        chrome.runtime.sendMessage(
          { 
            type: 'analyzeText', 
            text: text.trim().substring(0, 1000)
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Runtime error:', chrome.runtime.lastError);
              if (retryCount < 3) {
                setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000);
              } else {
                resolve({ 
                  success: false, 
                  error: 'Failed to connect to extension background script'
                });
              }
            } else {
              resolve(response);
            }
          }
        );
      };
      
      sendMessageWithRetry();
    });

    console.log('Background script response:', response);

    if (!response.success) {
      throw new Error(response.error || 'Failed to analyze');
    }

    return {
      credibility: response.data.credibility || 0,
      explanation: response.data.explanation || 'No explanation provided',
      warnings: response.data.warnings || []
    };

  } catch (error) {
    console.error('Analysis error:', error);
    return {
      credibility: 0,
      explanation: `Error: ${error.message}. Please check if the server is running at https://auth-guardian-backend.vercel.app/`,
      warnings: ['Connection failed - Please try again']
    };
  }
}

function updateFloatingUI(result) {
  if (!floatingUI) return;

  const resultsDiv = floatingUI.querySelector('.tg-results');
  const loaderDiv = floatingUI.querySelector('.tg-loader');
  const meterDiv = floatingUI.querySelector('.tg-credibility-meter');
  const explanationDiv = floatingUI.querySelector('.tg-explanation');
  const warningsDiv = floatingUI.querySelector('.tg-warnings');

  // Hide loader and show results
  loaderDiv.style.display = 'none';
  resultsDiv.classList.remove('hidden');

  // Update credibility meter
  meterDiv.innerHTML = `
    <div class="meter-label">Credibility Score</div>
    <div class="meter-value">${result.credibility}%</div>
  `;

  // Update explanation
  explanationDiv.textContent = result.explanation || 'No explanation available';

  // Update warnings
  if (result.warnings && result.warnings.length > 0) {
    warningsDiv.innerHTML = `
      <h3>Warnings</h3>
      <ul>
        ${result.warnings.map(warning => `<li>${warning}</li>`).join('')}
      </ul>
    `;
  } else {
    warningsDiv.innerHTML = '';
  }
}

function positionPopup(rect) {
  if (!floatingUI) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popupWidth = 400;
  const popupHeight = floatingUI.offsetHeight;

  let left = rect.left;
  let top = window.scrollY + rect.bottom + 10;

  // Keep popup within horizontal bounds
  if (left + popupWidth > viewportWidth - 20) {
    left = viewportWidth - popupWidth - 20;
  }
  if (left < 20) left = 20;

  // If popup would go below viewport, show it above the selection
  if (top + popupHeight > window.scrollY + viewportHeight - 20) {
    top = window.scrollY + rect.top - popupHeight - 10;
  }

  floatingUI.style.left = `${left}px`;
  floatingUI.style.top = `${top}px`;
}

// Handle text selection
document.addEventListener('mouseup', async (event) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText.length > 50) {
    if (!floatingUI) {
      floatingUI = createFloatingUI();
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    positionPopup(rect);
    floatingUI.classList.add('visible');

    // Show loading state
    const loaderDiv = floatingUI.querySelector('.tg-loader');
    const resultsDiv = floatingUI.querySelector('.tg-results');
    loaderDiv.style.display = 'block';
    resultsDiv.classList.add('hidden');

    try {
      const result = await analyzeContent(selectedText);
      updateFloatingUI(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      updateFloatingUI({
        credibility: 0,
        explanation: 'Analysis failed. Please try again.',
        warnings: ['Service error occurred']
      });
    }
  }
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeSelection') {
    const selection = window.getSelection();
    const selectedText = request.text || selection.toString().trim();
    
    if (selectedText.length > 0) {
      if (!floatingUI) {
        floatingUI = createFloatingUI();
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      positionPopup(rect);
      floatingUI.classList.add('visible');
      
      analyzeContent(selectedText).then(updateFloatingUI);
    }
  }
});

// Close button handler
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tg-close')) {
    floatingUI?.classList.remove('visible');
  }
});

// Close popup when clicking outside
document.addEventListener('mousedown', (e) => {
  if (floatingUI && !floatingUI.contains(e.target)) {
    floatingUI.classList.remove('visible');
  }
});

// Handle viewport resizing
window.addEventListener('resize', () => {
  if (floatingUI && floatingUI.classList.contains('visible')) {
    const selection = window.getSelection();
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    positionPopup(rect);
  }
}); 