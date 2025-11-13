# WinGPT Chrome Extension

A truly lightweight and discrete ChatGPT window.

### Features

- **Discrete Design**: Clean white background, minimal UI
- **Draggable**: Click and drag the header to move the window
- **Resizable**: Drag the bottom-right corner to resize the window
- **Toggleable**: Show / hide with configurable hotkey
- **API Integration**: Uses OpenAI's ChatGPT API (requires API key)
- **Model Selection**: Choose a model from the dropdown or enter its name manually
- **No Markdown Mode**: For if you want to copy & paste plain text without any markdown syntax

### Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select this extension directory

## Setup

1. Right-click the extension icon and select "Options"
2. Enter your OpenAI API key (get one at https://platform.openai.com/api-keys)
3. Click "Save"

## Usage

- **Toggle Window**: Press your configured hotkey or click the extension icon
- **Move Window**: Click and drag the header
- **Resize Window**: Drag the bottom-right corner (no size limits)
- **Close**: Click the `×` button in the header (same thing as toggling it with configured hotkey)

## Privacy

Your API key is stored locally in Chrome's sync storage and is never shared or transmitted anywhere except to OpenAI's API for chat requests.

