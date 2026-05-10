# Changelog

All notable changes to the Visual Synthesizer Shader Viewer extension will be documented in this file.

## [0.2.3] - 2026-05-09

### Changed
- Renamed extension ID to `visual-synthesizer-shader-viewer` and display name to "Visual Synthesizer Shader Viewer" for Marketplace republish.

## [0.2.2] - 2026-05-02

### Fixed
- Shader preview now compiles using GLSL ES 3.00 (`#version 300 es` / WebGL 2) instead of GLSL ES 1.00. This resolves compilation failures in shaders that use non-constant loop bounds (e.g. a `for` loop driven by a custom parameter uniform), which VS2 exports legally for its Vulkan pipeline but WebGL 1.0 rejects at compile time.
- Global variable declarations initialized from uniforms or other globals (e.g. `float x = myUniform;`) are now automatically lifted to the top of `main()` at preview time. GLSL ES 3.00 requires global initializers to be constant expressions; VS2 shaders use this pattern routinely and it is handled transparently without modifying the source file.
- Parameter sliders for VS2-exported shaders now move smoothly across their full range. Parameters without explicit `min`/`max` values in the JSON metadata were producing a `NaN` step size, causing the slider to snap only to 0 or 1.
- Alpha slider now correctly affects shader opacity. The WebGL context was created with `premultipliedAlpha: true` (the default), which causes the compositing math to cancel out the alpha channel entirely over a black background. Switching to `premultipliedAlpha: false` makes alpha correctly scale the output brightness.

### Added
- **Speed control** — a Speed slider (0–5×, default 1.00) is now shown in the preview controls for all shaders, matching the global Speed parameter available in Visual Synthesizer 2. It scales how fast the `time` uniform advances and can be adjusted mid-playback without causing discontinuities.

### Changed
- GLSL linting preamble updated to match GLSL ES 3.00: `varying` replaced with `in`, `gl_FragColor` macro replaced with an `out vec4 fragColor` declaration. The linter now validates shaders under the same GLSL version the preview compiles them with, eliminating false-positive warnings on global uniform initializers and dynamic loop bounds in VS2 shaders.
- Linter no longer reports `global variable initializers must be constant expressions` as an error, as this is a false positive for VS2 shaders where the preview handles the pattern via automatic lifting.

## [0.2.1] - 2026-04-30

### Changed
- Renamed command title to "Visual Synth: Preview Shader" for consistency across the context menu and command palette
- Clarified "custom uniforms" wording in the Troubleshooting section of README
- Removed WebGL references from README description and Requirements section
- Added CLI install option (`code --install-extension`) to the From VSIX installation section
- Minor consistency and accuracy updates to `README.md` and `QUICKSTART.md`

### Removed
- `VULKAN_COMPATIBILITY.md` from the repository (kept as local reference only)

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
