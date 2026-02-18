# VS Code Visual Synth Shader Viewer Extension

A Visual Studio Code extension for previewing and debugging Visual Synth 2 fragment shader (.frag) files with live WebGL rendering.

## Features

- **Live Shader Preview**: Real-time WebGL rendering of your fragment shaders
- **Parameter Controls**: Interactive sliders for custom shader parameters defined in JSON metadata
- **Auto-Reload**: Automatically updates the preview when you save your shader file
- **Color & Alpha Controls**: Adjust color and alpha values in real-time
- **Playback Controls**: Play/pause and reset the shader animation
- **FPS Counter**: Monitor shader performance
- **Error Display**: Clear error messages for shader compilation issues

## Installation

### From Source

1. Clone or download this repository
2. Open the folder in VS Code
3. Run `npm install` to install dependencies
4. Run `npm run compile` to build the extension
5. Press `F5` to open a new VS Code window with the extension loaded

### From VSIX

1. Build the extension: `npm run vscode:prepublish`
2. Package it: `vsce package` (requires `npm install -g @vscode/vsce`)
3. Install the `.vsix` file: Extensions → ⋯ → Install from VSIX

## Usage

1. Open any `.frag` shader file in VS Code
2. Use one of these methods to preview:
   - Click the preview icon in the editor title bar
   - Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
   - Right-click in the editor and select "Preview Shader"
   - Open the command palette (`Ctrl+Shift+P`) and run "Visual Synth: Preview Shader"

3. The preview panel will open beside your editor with:
   - Live shader rendering
   - Interactive controls for all parameters
   - Play/pause and reset buttons
   - FPS counter

## Shader Format

The extension expects Visual Synth 2 compatible shaders with JSON metadata:

```glsl
/*
{
  "author": "Your Name",
  "color": "white",
  "movement": true,
  "parameters": [
    {
      "name": "Speed",
      "type": "float",
      "default": 1.0,
      "min": 0.1,
      "max": 5.0
    }
  ],
  "url": "",
  "uuid": "unique-id-here"
}
*/

#ifdef GL_ES
precision highp float;
#endif

// Your shader code here
void main() {
    vec2 fragCoord = texCoord * resolution;
    // ... shader implementation
    fragColor = vec4(color, alpha);
}
```

## Available Uniforms

The extension automatically provides these uniforms (matching Visual Synth 2):

- `float time` - Current time in seconds
- `vec2 resolution` - Canvas resolution in pixels
- `vec2 texCoord` - Texture coordinates (0.0 to 1.0)
- `vec4 color` - Color value (controllable via UI)
- `float alpha` - Alpha value (controllable via UI)
- Custom parameters defined in JSON metadata

## Keyboard Shortcuts

- `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) - Preview shader

## Troubleshooting

### Shader doesn't render
- Check the error message displayed in the preview panel
- Ensure your shader has a valid `main()` function
- Verify that all uniforms are correctly declared

### Parameters don't appear
- Make sure your JSON metadata is properly formatted
- Parameters must be defined in the JSON header
- Check that parameter names match the uniform names in your shader

### Preview doesn't update on save
- Ensure the file has a `.frag` extension
- Try manually triggering the preview command again

## Development

To contribute or modify the extension:

```bash
# Install dependencies
npm install

# Watch mode (auto-recompile on changes)
npm run watch

# Compile
npm run compile

# Test in development
# Press F5 in VS Code to launch Extension Development Host
```

## Requirements

- Visual Studio Code 1.75.0 or higher
- WebGL-capable browser engine (included in VS Code)

## License

MIT

## Author
Lisa Wagner (@avvla.music)
Created for Visual Synth 2 shader development workflow.
