# Quick Start Guide

## Setup (First Time)

1. **Navigate to the extension directory:**
   ```bash
   cd d:\Your-Proj-Dir\vscode-shader-viewer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```

## Building and Packaging the Extension

### Quick Commands Reference

**Compile (for development):**
```bash
npm run compile
```

**Package the extension:**
```bash
# First-time only: Install the VS Code Extension CLI
npm install -g @vscode/vsce

# Create a .vsix package file
vsce package
```

**Install the packaged extension:**
```bash
# Option 1: Command line
code --install-extension visual-synth-shader-viewer-0.1.0.vsix

# Option 2: VS Code GUI
# - Open VS Code
# - Go to Extensions view (Ctrl+Shift+X)
# - Click "..." (Views and More Actions)
# - Select "Install from VSIX..."
# - Choose the generated .vsix file
```

**Complete build and install workflow:**
```bash
# 1. Compile the TypeScript
npm run compile

# 2. Package into .vsix
vsce package

# 3. Install in VS Code
code --install-extension visual-synth-shader-viewer-0.1.0.vsix
```

## Testing the Extension

### Method 1: Debug Mode (Recommended for Development)

1. Open the `vscode-shader-viewer` folder in VS Code
2. Press `F5` - this will:
   - Compile the extension
   - Open a new VS Code window with the extension loaded
3. In the new window, open your shader file (e.g., `Octagrams.frag`)
4. Press `Ctrl+Shift+V` or click the preview icon in the editor toolbar

### Method 2: Install as VSIX

1. Install the packaging tool (one-time):
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

3. Install the generated `.vsix` file:
   - In VS Code: Extensions → ⋯ (More Actions) → Install from VSIX
   - Select the `.vsix` file

## Using the Preview

Once you open a `.frag` file:

1. **Open Preview:**
   - Click the preview icon (top right of editor)
   - Or press `Ctrl+Shift+V`
   - Or right-click → "Preview Shader"

2. **Controls:**
   - **Play/Pause**: Freeze/resume animation
   - **Reset**: Reset time to 0
   - **Color Picker**: Change base color
   - **Alpha Slider**: Adjust transparency
   - **Custom Parameters**: Any parameters defined in your shader's JSON metadata will appear as sliders

3. **Live Editing:**
   - Make changes to your shader
   - Save the file (`Ctrl+S`)
   - Preview updates automatically!

## Troubleshooting

**"Cannot find module 'vscode'"**
- Run `npm install` in the extension folder

**Preview doesn't open**
- Make sure the file has a `.frag` extension
- Check VS Code's Output panel (View → Output → Visual Synth Shader Viewer)

**Shader compilation error**
- Error messages will appear in the preview panel
- Check your GLSL syntax
- Ensure all uniforms are properly declared

**Changes don't update**
- Save the file (`Ctrl+S`)
- If still not updating, close and reopen the preview

## Next Steps

- Test with your existing shaders
- Modify the extension code in `src/extension.ts` if needed
- Submit issues or improvements!

