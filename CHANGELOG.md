# Changelog

All notable changes to the Visual Synth Shader Viewer extension will be documented in this file.

## [0.1.0] - 2026-02-15

### Added
- Initial release
- Live WebGL shader preview for .frag files
- Support for Visual Synth 2 shader format with JSON metadata
- Interactive controls for shader parameters
- Color and alpha adjustment controls
- Play/pause and reset functionality
- FPS counter
- Auto-reload on file save
- Shader compilation error display
- Keyboard shortcut (Ctrl+Shift+V / Cmd+Shift+V)
- Editor toolbar preview button
- Context menu integration

### Features
- Real-time shader rendering using WebGL
- Automatic parsing of JSON metadata headers
- Dynamic UI generation for custom shader parameters
- Full support for Visual Synth 2 uniforms (time, resolution, texCoord, color, alpha)
- Responsive canvas with automatic resizing
- Error reporting with detailed shader compilation messages

### Technical
- TypeScript-based VSCode extension
- WebGL 1.0/2.0 compatibility
- Support for both GLSL 100 and 300 ES shaders
- CSP-compliant webview implementation
