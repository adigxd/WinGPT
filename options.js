document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const modelNameInput = document.getElementById('modelName');
  const modelDropdown = document.getElementById('modelDropdown');
  const useDropdownToggle = document.getElementById('useDropdownToggle');
  const modelDropdownContainer = document.getElementById('modelDropdownContainer');
  const modelInputContainer = document.getElementById('modelInputContainer');
  const modelHelpText = document.getElementById('modelHelpText');
  const saveBtn = document.getElementById('saveBtn');
  const hotkeyBtn = document.getElementById('hotkeyBtn');
  const noMarkdownToggle = document.getElementById('noMarkdownToggle');
  const status = document.getElementById('status');

  // Load saved settings
  const result = await chrome.storage.sync.get(['apiKey', 'modelName', 'useDropdown', 'noMarkdown']);
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }
  
  // Load models.json and populate dropdown
  try {
    const response = await fetch(chrome.runtime.getURL('models.json'));
    const modelsData = await response.json();
    
    // Filter for GPT models and sort them
    const gptModels = modelsData.data
      .filter(model => model.id.startsWith('gpt-'))
      .map(model => model.id)
      .sort();
    
    // Populate dropdown
    modelDropdown.innerHTML = '<option value="">Select a model...</option>';
    gptModels.forEach(modelId => {
      const option = document.createElement('option');
      option.value = modelId;
      option.textContent = modelId;
      modelDropdown.appendChild(option);
    });
    
    // Set saved model in dropdown or input
    if (result.modelName) {
      if (result.useDropdown !== false && gptModels.includes(result.modelName)) {
        // Use dropdown (left position = unchecked)
        modelDropdown.value = result.modelName;
        useDropdownToggle.checked = false;
        modelDropdownContainer.classList.add('active');
        modelInputContainer.classList.remove('active');
        modelHelpText.textContent = 'Select a model from the dropdown';
      } else {
        // Custom input (right position = checked)
        modelNameInput.value = result.modelName;
        useDropdownToggle.checked = true;
        modelDropdownContainer.classList.remove('active');
        modelInputContainer.classList.add('active');
        modelHelpText.textContent = 'Enter the model name (e.g., gpt-3.5-turbo, gpt-4, gpt-4-turbo-preview)';
      }
    } else {
      modelDropdown.value = 'gpt-3.5-turbo'; // Default
      useDropdownToggle.checked = false; // Default to dropdown
    }
  } catch (error) {
    console.error('Error loading models:', error);
    modelDropdown.innerHTML = '<option value="">Error loading models</option>';
    // On error, default to custom input (right position = checked)
    useDropdownToggle.checked = true;
    modelDropdownContainer.classList.remove('active');
    modelInputContainer.classList.add('active');
    modelHelpText.textContent = 'Enter the model name (e.g., gpt-3.5-turbo, gpt-4, gpt-4-turbo-preview)';
    if (result.modelName) {
      modelNameInput.value = result.modelName;
    } else {
      modelNameInput.value = 'gpt-3.5-turbo'; // Default
    }
  }

  // Load no markdown setting
  if (result.noMarkdown) {
    noMarkdownToggle.checked = result.noMarkdown;
  }

  // Toggle between dropdown and custom input
  useDropdownToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      // Checked = Custom input (right side)
      modelDropdownContainer.classList.remove('active');
      modelInputContainer.classList.add('active');
      modelHelpText.textContent = 'Enter the model name (e.g., gpt-3.5-turbo, gpt-4, gpt-4-turbo-preview)';
    } else {
      // Unchecked = Use dropdown (left side)
      modelDropdownContainer.classList.add('active');
      modelInputContainer.classList.remove('active');
      modelHelpText.textContent = 'Select a model from the dropdown';
    }
  });

  // Open keyboard shortcuts page
  hotkeyBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    let modelName = '';
    // Toggle checked = custom input (right), unchecked = use dropdown (left)
    const useDropdown = !useDropdownToggle.checked;
    const noMarkdown = noMarkdownToggle.checked;
    
    if (useDropdown) {
      modelName = modelDropdown.value.trim();
    } else {
      modelName = modelNameInput.value.trim();
    }
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      showStatus('API key should start with "sk-"', 'error');
      return;
    }

    if (!modelName) {
      showStatus('Please select or enter a model name', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ apiKey, modelName, useDropdown, noMarkdown });
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
      status.className = 'status';
    }, 3000);
  }
});
