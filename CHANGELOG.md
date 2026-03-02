# Changelog

All notable changes to the Visual Synth Shader Viewer extension will be documented in this file.

## [0.2.0] - 2026-03-01

### Added
- **GLSL syntax highlighting** — full TextMate grammar for `.frag`, `.vert`, `.glsl` and related shader files; colorizes types, builtin types, builtin variables, builtin functions, keywords, storage qualifiers, precision qualifiers, operators, preprocessor directives, and comments
- **VS2-aware GLSL linting** — integrates with `glslangValidator` to report real shader errors as inline diagnostics; VS2 runtime uniforms (`time`, `resolution`, `color`, `alpha`, `texCoord`, `fragColor`) and all custom JSON parameters are injected as a preamble so they are never flagged as false positives
- **Language configuration** — bracket matching, auto-close pairs, `//` line comment toggle (Ctrl+/), and auto-indent rules for `{` blocks
- `visualSynthShaderViewer.glslangValidatorPath` setting to configure a custom path to `glslangValidator` (defaults to system PATH)

### Technical
- New `src/diagnostics.ts` — `GlslDiagnosticProvider` class; debounced 600 ms on open/change, precise line-number mapping accounts for injected preamble and optional `#version 100` insertion, silently no-ops if `glslangValidator` is not installed
- New `syntaxes/glsl.tmLanguage.json` — TextMate grammar with scopes for `storage.type`, `storage.modifier`, `keyword.control`, `keyword.operator`, `support.function`, `variable.language`, `constant.numeric`, `constant.language.boolean`, `comment`, and `keyword.control.preprocessor`
- New `language-configuration.json` — bracket pairs, comment delimiters, indentation rules

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
