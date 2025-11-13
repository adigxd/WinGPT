let chatWindow = null;
let isVisible = false;
let zoomLevel = 1.0;

// Create chat window HTML
function createChatWindow() {
  const chatContainer = document.createElement('div');
  chatContainer.id = 'chatgpt-helper-window';
  chatContainer.innerHTML = `
    <div class="chat-header">
      <span class="chat-title">WinGPT</span>
      <div class="chat-controls">
        <button class="zoom-out-btn" title="Zoom Out">−</button>
        <button class="zoom-in-btn" title="Zoom In">+</button>
        <button class="close-btn" title="Close">×</button>
      </div>
    </div>
    <div class="chat-body">
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-container">
        <textarea id="chat-input" placeholder="Type your message..." rows="1"></textarea>
        <button id="send-btn">Send</button>
      </div>
    </div>
    <div class="resize-handle"></div>
  `;
  
  document.body.appendChild(chatContainer);
  return chatContainer;
}

// Initialize chat window
function initChatWindow() {
  if (chatWindow) return;
  
  chatWindow = createChatWindow();
  setupChatWindow();
  setupResize();
  setupDrag();
  loadSavedPosition();
  loadSavedZoom();
}

// Set zoom level
function setZoom(level) {
  zoomLevel = Math.max(0.5, Math.min(2.0, level)); // Limit between 0.5x and 2.0x
  chatWindow.style.transform = `scale(${zoomLevel})`;
  chatWindow.style.transformOrigin = 'top left';
  saveZoom();
}

// Save zoom level
function saveZoom() {
  chrome.storage.local.set({ chatWindowZoom: zoomLevel });
}

// Load saved zoom level
async function loadSavedZoom() {
  const result = await chrome.storage.local.get(['chatWindowZoom']);
  if (result.chatWindowZoom) {
    zoomLevel = result.chatWindowZoom;
    chatWindow.style.transform = `scale(${zoomLevel})`;
    chatWindow.style.transformOrigin = 'top left';
  }
}

// Setup chat window functionality
function setupChatWindow() {
  const closeBtn = chatWindow.querySelector('.close-btn');
  const zoomInBtn = chatWindow.querySelector('.zoom-in-btn');
  const zoomOutBtn = chatWindow.querySelector('.zoom-out-btn');
  const sendBtn = chatWindow.querySelector('#send-btn');
  const chatInput = chatWindow.querySelector('#chat-input');
  const chatMessages = chatWindow.querySelector('#chat-messages');

  closeBtn.addEventListener('click', () => {
    toggleChat();
  });

  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setZoom(zoomLevel + 0.1);
  });

  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setZoom(zoomLevel - 0.1);
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
  });

  // Send message on Enter (Shift+Enter for new line)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Get API key
    const result = await chrome.storage.sync.get(['apiKey']);
    if (!result.apiKey) {
      addMessage('system', 'Please set your API key in extension options (right-click extension icon > Options)');
      return;
    }

    // Show loading indicator
    const loadingId = addMessage('assistant', 'Thinking...', true);

    // Get model name and no markdown setting
    const settingsResult = await chrome.storage.sync.get(['modelName', 'noMarkdown']);
    const modelName = settingsResult.modelName || 'gpt-3.5-turbo';
    const noMarkdown = settingsResult.noMarkdown || false;

    // Build messages array
    let messages = getMessageHistory();
    
    // Add system message for no markdown mode if enabled and not already present
    if (noMarkdown) {
      const hasSystemMessage = messages.some(msg => msg.role === 'system');
      if (!hasSystemMessage) {
        messages.unshift({
          role: 'system',
          content: 'Do not use markdown formatting in your responses. Write in plain text only, using line breaks and spacing for readability instead of markdown syntax like **bold**, *italic*, # headers, code blocks, lists with - or *, etc.'
        });
      }
    }
    
    // Add user message
    messages.push({ role: 'user', content: message });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          stream: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }

      // Update loading message with actual response
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.textContent = data.choices[0].message.content;
        loadingEl.classList.remove('loading');
      }
    } catch (error) {
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.textContent = `Error: ${error.message}`;
        loadingEl.classList.remove('loading');
        loadingEl.classList.add('error');
      }
    }
  }

  function addMessage(role, content, isLoading = false) {
    const messageDiv = document.createElement('div');
    const messageId = 'msg-' + Date.now();
    messageDiv.id = messageId;
    messageDiv.className = `message ${role} ${isLoading ? 'loading' : ''}`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageId;
  }

  function getMessageHistory() {
    const messages = chatMessages.querySelectorAll('.message:not(.loading):not(.system)');
    const history = [];
    messages.forEach(msg => {
      const role = msg.classList.contains('user') ? 'user' : 'assistant';
      history.push({ role, content: msg.textContent });
    });
    return history;
  }
}

// Setup resize functionality
function setupResize() {
  const resizeHandle = chatWindow.querySelector('.resize-handle');
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    // Get actual CSS dimensions, not scaled visual dimensions
    startWidth = parseFloat(window.getComputedStyle(chatWindow).width);
    startHeight = parseFloat(window.getComputedStyle(chatWindow).height);
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
    e.stopPropagation();
  });

  function handleResize(e) {
    if (!isResizing) return;
    // Calculate delta in actual pixels, accounting for zoom level
    const deltaX = (e.clientX - startX) / zoomLevel;
    const deltaY = (e.clientY - startY) / zoomLevel;
    const width = startWidth + deltaX;
    const height = startHeight + deltaY;
    chatWindow.style.width = width + 'px';
    chatWindow.style.height = height + 'px';
    savePosition();
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }
}

// Setup drag functionality
function setupDrag() {
  const header = chatWindow.querySelector('.chat-header');
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('close-btn') || 
        e.target.classList.contains('zoom-in-btn') || 
        e.target.classList.contains('zoom-out-btn')) {
      return;
    }
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = chatWindow.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  });

  function handleDrag(e) {
    if (!isDragging) return;
    const left = startLeft + (e.clientX - startX);
    const top = startTop + (e.clientY - startY);
    const maxLeft = window.innerWidth - chatWindow.offsetWidth;
    const maxTop = window.innerHeight - chatWindow.offsetHeight;
    chatWindow.style.left = Math.max(0, Math.min(maxLeft, left)) + 'px';
    chatWindow.style.top = Math.max(0, Math.min(maxTop, top)) + 'px';
    chatWindow.style.bottom = 'auto';
    chatWindow.style.right = 'auto';
    savePosition();
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
  }
}

// Save window position and size
function savePosition() {
  if (!chatWindow) return;
  const position = {
    left: chatWindow.style.left,
    top: chatWindow.style.top,
    width: chatWindow.style.width,
    height: chatWindow.style.height
  };
  chrome.storage.local.set({ chatWindowPosition: position });
}

// Load saved position
async function loadSavedPosition() {
  const result = await chrome.storage.local.get(['chatWindowPosition']);
  if (result.chatWindowPosition && chatWindow) {
    const pos = result.chatWindowPosition;
    if (pos.left) chatWindow.style.left = pos.left;
    if (pos.top) chatWindow.style.top = pos.top;
    if (pos.width) chatWindow.style.width = pos.width;
    if (pos.height) chatWindow.style.height = pos.height;
    // Remove bottom/right if they exist
    chatWindow.style.bottom = 'auto';
    chatWindow.style.right = 'auto';
  }
}

// Toggle chat window
function toggleChat() {
  if (!chatWindow) {
    initChatWindow();
  }
  
  isVisible = !isVisible;
  if (isVisible) {
    chatWindow.style.display = 'flex';
    chatWindow.style.visibility = 'visible';
    setTimeout(() => {
      const input = chatWindow.querySelector('#chat-input');
      if (input) input.focus();
    }, 100);
  } else {
    chatWindow.style.display = 'none';
    chatWindow.style.visibility = 'hidden';
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    toggleChat();
  }
});

// Initialize on page load
if (document.body) {
  initChatWindow();
  chatWindow.style.display = 'none'; // Hidden by default
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initChatWindow();
    chatWindow.style.display = 'none';
  });
}

