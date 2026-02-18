# Vulkan/Visual Synth 2 Compatibility

## Overview

This extension is designed to preview Visual Synth 2 shaders which use Vulkan-compatible GLSL. Since VSCode's webview uses WebGL (not Vulkan), the extension automatically translates Vulkan-style shaders to WebGL-compatible format.

## Key Differences Handled

### 1. Uniform Declarations

**Vulkan/VS2 Format (implicit uniforms):**
```glsl
// No uniform declarations needed - VS2 provides them automatically
void main() {
    float t = time;  // Used directly
    vec2 uv = texCoord * resolution;
}
```

**WebGL Format (explicit uniforms required):**
```glsl
// Extension automatically injects these:
uniform float time;
uniform vec2 resolution;
uniform vec4 color;
uniform float alpha;
uniform float Speed;  // Custom parameters from JSON
varying vec2 texCoord;

void main() {
    float t = time;
    vec2 uv = texCoord * resolution;
}
```

### 2. Fragment Output

**Vulkan/VS2 Format:**
```glsl
fragColor = vec4(finalColor, alpha);
```

**WebGL Format:**
```glsl
gl_FragColor = vec4(finalColor, alpha);  // Automatically converted
```

### 3. Standard VS2 Uniforms

The extension provides all Visual Synth 2 standard uniforms:

- `float time` - Animation time in seconds
- `vec2 resolution` - Canvas resolution in pixels
- `vec2 texCoord` - Texture coordinates (0.0 to 1.0)
- `vec4 color` - Base color (controllable via UI)
- `float alpha` - Alpha transparency (controllable via UI)

### 4. Custom Parameters

Parameters defined in the JSON metadata are automatically:
1. Parsed from the header
2. Declared as uniforms
3. Added to the UI as interactive sliders
4. Passed to the shader

**Example JSON:**
```json
{
  "parameters": [
    {
      "name": "Speed",
      "type": "float",
      "default": 1.0,
      "min": 0.1,
      "max": 5.0
    }
  ]
}
```

This creates: `uniform float Speed;` and a UI slider.

## Shader Processing Pipeline

1. **Parse JSON** - Extract metadata and parameters
2. **Strip JSON header** - Remove comment block
3. **Inject uniforms** - Add VS2 standard uniforms + custom parameters
4. **Replace fragColor** - Convert to gl_FragColor
5. **Ensure precision** - Add precision qualifiers if missing
6. **Compile** - Standard WebGL shader compilation

## Testing VS2 Shaders

The extension has been tested with:
- ✅ Octagrams.frag (raymarching, 2 parameters)
- ✅ Fractal Wave.frag (procedural, 3 parameters)
- ✅ Exploding Stars.frag (particle system, 2 parameters)

All shaders use the Vulkan-compatible format with:
- No uniform declarations in source
- `fragColor` as output
- Custom parameters from JSON
- `#ifdef GL_ES` precision guards

## Known Limitations

1. **WebGL vs Vulkan** - Some Vulkan-specific features may not work
2. **GLSL Version** - Currently supports GLSL 100 ES (WebGL 1.0)
3. **Performance** - WebGL performance may differ from native Vulkan
4. **Precision** - WebGL precision handling differs slightly

## Debugging Tips

If a shader doesn't render:

1. **Check the error panel** - Compilation errors are displayed
2. **Verify JSON format** - Ensure valid JSON in header comment
3. **Check uniform names** - Parameter names must match shader code
4. **Review precision** - Some devices require explicit precision
5. **Test incrementally** - Comment out complex parts to isolate issues

## Future Enhancements

Potential improvements:
- [ ] GLSL 300 ES support (WebGL 2.0)
- [ ] Texture input support
- [ ] Multi-pass rendering
- [ ] Performance profiling
- [ ] SPIR-V cross-compilation
