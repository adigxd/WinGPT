// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check if content script can run on this page
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
    return; // Can't inject content scripts on these pages
  }
  chrome.tabs.sendMessage(tab.id, { action: 'toggle' }).catch(() => {
    // Content script not loaded, try to inject it
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).then(() => {
      // Wait a bit for script to initialize, then send message
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle' }).catch(() => {});
      }, 100);
    }).catch(() => {});
  });
});

// Handle hotkey command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-chat') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const tab = tabs[0];
        // Check if content script can run on this page
        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
          return; // Can't inject content scripts on these pages
        }
        chrome.tabs.sendMessage(tab.id, { action: 'toggle' }).catch(() => {
          // Content script not loaded, try to inject it
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).then(() => {
            // Wait a bit for script to initialize, then send message
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'toggle' }).catch(() => {});
            }, 100);
          }).catch(() => {});
        });
      }
    });
  }
});

