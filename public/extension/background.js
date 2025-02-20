let serverUrl = 'http://localhost:3000';

// Test server connection on startup
async function testServer() {
  try {
    const response = await fetch(`${serverUrl}/api/analyze`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        content: 'Test connection' 
      })
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Server test response:', data);
    return true;

  } catch (error) {
    console.error('Server connection error:', error.message);
    return false;
  }
}

// Handle API requests with retry mechanism
async function makeAPIRequest(text, retryCount = 0) {
  try {
    const response = await fetch(`${serverUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: text })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Retrying request (${retryCount + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return makeAPIRequest(text, retryCount + 1);
    }
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'analyze-text',
    title: 'Analyze with Truth Guardian',
    contexts: ['selection']
  });

  await testServer();
});

// Handle API requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'analyzeText') {
    makeAPIRequest(request.text)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('API Error:', error);
        sendResponse({ 
          success: false, 
          error: error.message
        });
      });

    return true; // Will respond asynchronously
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyze-text') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzeSelection',
      text: info.selectionText
    });
  }
});

// Keep server connection alive
setInterval(testServer, 30000); // Test connection every 30 seconds 