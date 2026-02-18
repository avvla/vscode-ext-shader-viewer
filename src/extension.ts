import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Visual Synth Shader Viewer is now active');

    let disposable = vscode.commands.registerCommand('visualSynthShaderViewer.preview', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        if (!document.fileName.endsWith('.frag')) {
            vscode.window.showErrorMessage('This command only works with .frag files');
            return;
        }

        ShaderPreviewPanel.createOrShow(context.extensionUri, document);
    });

    context.subscriptions.push(disposable);

    // Watch for file changes
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (document.fileName.endsWith('.frag')) {
                ShaderPreviewPanel.updateShader(document);
            }
        })
    );
}

export function deactivate() {}

class ShaderPreviewPanel {
    public static currentPanel: ShaderPreviewPanel | undefined;
    private static readonly viewType = 'shaderPreview';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentDocument: vscode.TextDocument | undefined;

    public static createOrShow(extensionUri: vscode.Uri, document: vscode.TextDocument) {
        const column = vscode.ViewColumn.Beside;

        if (ShaderPreviewPanel.currentPanel) {
            ShaderPreviewPanel.currentPanel._panel.reveal(column);
            ShaderPreviewPanel.currentPanel.updateContent(document);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ShaderPreviewPanel.viewType,
            'Shader Preview',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ShaderPreviewPanel.currentPanel = new ShaderPreviewPanel(panel, extensionUri, document);
    }

    public static updateShader(document: vscode.TextDocument) {
        if (ShaderPreviewPanel.currentPanel) {
            ShaderPreviewPanel.currentPanel.updateContent(document);
        }
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document: vscode.TextDocument) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._currentDocument = document;

        this.updateContent(document);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'error':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'log':
                        console.log('[Shader Preview]', message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private updateContent(document: vscode.TextDocument) {
        this._currentDocument = document;
        const shaderCode = document.getText();
        this._panel.title = `Preview: ${path.basename(document.fileName)}`;
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, shaderCode);
    }

    private _getHtmlForWebview(webview: vscode.Webview, shaderCode: string): string {
        const nonce = getNonce();

        // Parse JSON metadata from shader
        const jsonMatch = shaderCode.match(/\/\*\s*(\{[\s\S]*?\})\s*\*\//);
        let metadata: any = {
            author: 'Unknown',
            parameters: []
        };

        if (jsonMatch) {
            try {
                metadata = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.error('Failed to parse shader metadata:', e);
            }
        }

        // Extract shader code (remove JSON header)
        const fragmentShaderCode = shaderCode.replace(/\/\*[\s\S]*?\*\//, '').trim();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Shader Preview</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
        }
        #container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        #controls {
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            align-items: center;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .control-group label {
            font-size: 12px;
            min-width: 100px;
        }
        .control-group input[type="range"] {
            width: 150px;
        }
        .control-group input[type="color"] {
            width: 50px;
            height: 25px;
            border: none;
            cursor: pointer;
        }
        .control-group .value {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            min-width: 40px;
            text-align: right;
        }
        #canvas-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        }
        canvas {
            max-width: 100%;
            max-height: 100%;
            image-rendering: pixelated;
        }
        #info {
            background: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            justify-content: space-between;
        }
        #error {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            margin: 10px;
            display: none;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
        }
        .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 10px;
            cursor: pointer;
            font-size: 12px;
            border-radius: 2px;
        }
        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="controls">
            <div class="control-group">
                <button id="playPause" class="button">⏸ Pause</button>
                <button id="reset" class="button">↻ Reset</button>
            </div>
            <div class="control-group">
                <label>Color:</label>
                <input type="color" id="color" value="#ffffff">
            </div>
            <div class="control-group">
                <label>Alpha:</label>
                <input type="range" id="alpha" min="0" max="1" step="0.01" value="1">
                <span class="value" id="alphaValue">1.00</span>
            </div>
            <div id="customControls"></div>
        </div>
        <div id="error"></div>
        <div id="canvas-container">
            <canvas id="glCanvas"></canvas>
        </div>
        <div id="info">
            <span id="author">Author: ${metadata.author || 'Unknown'}</span>
            <span id="fps">FPS: 0</span>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        const canvas = document.getElementById('glCanvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!gl) {
            showError('WebGL not supported in your browser');
        }

        const metadata = ${JSON.stringify(metadata)};
        const fragmentShaderSource = ${JSON.stringify(fragmentShaderCode)};

        let program;
        let uniforms = {};
        let animationId;
        let startTime = Date.now();
        let isPaused = false;
        let pausedTime = 0;

        // Shader parameters
        let shaderParams = {
            time: 0,
            color: { r: 1.0, g: 1.0, b: 1.0 },
            alpha: 1.0
        };

        // Initialize custom parameters
        if (metadata.parameters) {
            metadata.parameters.forEach(param => {
                shaderParams[param.name] = param.default || 0.0;
            });
        }

        // Vertex shader (standard quad)
        const vertexShaderSource = \`#version 100
            attribute vec2 position;
            varying vec2 texCoord;
            void main() {
                texCoord = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        \`;

        function createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const error = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error('Shader compilation error: ' + error);
            }

            return shader;
        }

        function createProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const error = gl.getProgramInfoLog(program);
                gl.deleteProgram(program);
                throw new Error('Program linking error: ' + error);
            }

            return program;
        }

        function prepareVulkanShaderForWebGL(source) {
            // VS2/Vulkan shaders don't declare uniforms - we need to inject them for WebGL
            let fragSource = source;

            // Build uniform declarations for VS2 standard uniforms
            let uniformDeclarations = \`
// VS2/Vulkan uniforms (injected for WebGL compatibility)
uniform float time;
uniform vec2 resolution;
uniform vec4 color;
uniform float alpha;
varying vec2 texCoord;
\`;

            // Add custom parameter uniforms
            if (metadata.parameters) {
                metadata.parameters.forEach(param => {
                    uniformDeclarations += \`uniform float \${param.name};\\n\`;
                });
            }

            // Replace fragColor with gl_FragColor for WebGL
            fragSource = fragSource.replace(/\\bfragColor\\b/g, 'gl_FragColor');

            // Find where to inject uniforms (after precision, before first function/global var)
            // Look for the end of precision statement or #ifdef blocks
            const precisionMatch = fragSource.match(/(precision\\s+\\w+\\s+float;)/);
            if (precisionMatch) {
                const insertPos = fragSource.indexOf(precisionMatch[1]) + precisionMatch[1].length;
                fragSource = fragSource.slice(0, insertPos) + '\\n' + uniformDeclarations + fragSource.slice(insertPos);
            } else {
                // If no precision found, add after version/defines
                const lines = fragSource.split('\\n');
                let insertIndex = 0;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('#version') || line.startsWith('#ifdef') || line.startsWith('#endif') ||
                        line.startsWith('#define') || line.startsWith('precision') || line.startsWith('//') || line === '') {
                        insertIndex = i + 1;
                    } else {
                        break;
                    }
                }
                lines.splice(insertIndex, 0, uniformDeclarations);
                fragSource = lines.join('\\n');
            }

            return fragSource;
        }

        function initShader() {
            try {
                // Prepare fragment shader for WebGL (from Vulkan-compatible VS2 format)
                let fragSource = prepareVulkanShaderForWebGL(fragmentShaderSource);

                // Add version directive if not present
                if (!fragSource.includes('#version')) {
                    fragSource = '#version 100\\n' + fragSource;
                }

                // Ensure precision is set
                if (!fragSource.match(/precision\\s+\\w+\\s+float/)) {
                    fragSource = fragSource.replace('#version 100', '#version 100\\nprecision highp float;');
                }

                const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
                const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragSource);

                if (program) {
                    gl.deleteProgram(program);
                }

                program = createProgram(gl, vertexShader, fragmentShader);
                gl.useProgram(program);

                // Set up quad
                const positionBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                    -1, -1,
                     1, -1,
                    -1,  1,
                     1,  1
                ]), gl.STATIC_DRAW);

                const positionLocation = gl.getAttribLocation(program, 'position');
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

                // Get uniform locations
                uniforms = {
                    time: gl.getUniformLocation(program, 'time'),
                    resolution: gl.getUniformLocation(program, 'resolution'),
                    texCoord: gl.getUniformLocation(program, 'texCoord'),
                    color: gl.getUniformLocation(program, 'color'),
                    alpha: gl.getUniformLocation(program, 'alpha')
                };

                // Get custom parameter uniforms
                if (metadata.parameters) {
                    metadata.parameters.forEach(param => {
                        uniforms[param.name] = gl.getUniformLocation(program, param.name);
                    });
                }

                hideError();
                return true;
            } catch (error) {
                showError(error.message);
                vscode.postMessage({ command: 'error', text: error.message });
                return false;
            }
        }

        function resizeCanvas() {
            const container = canvas.parentElement;
            const displayWidth = container.clientWidth;
            const displayHeight = container.clientHeight;

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, displayWidth, displayHeight);
            }
        }

        let lastFrameTime = Date.now();
        let frameCount = 0;
        let fps = 0;

        function render() {
            if (!isPaused) {
                const currentTime = Date.now();
                frameCount++;

                if (currentTime - lastFrameTime >= 1000) {
                    fps = frameCount;
                    frameCount = 0;
                    lastFrameTime = currentTime;
                    document.getElementById('fps').textContent = \`FPS: \${fps}\`;
                }

                shaderParams.time = (currentTime - startTime) / 1000.0;
            }

            resizeCanvas();

            if (program) {
                gl.useProgram(program);

                // Set uniforms
                if (uniforms.time) gl.uniform1f(uniforms.time, shaderParams.time);
                if (uniforms.resolution) gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
                if (uniforms.color) gl.uniform4f(uniforms.color, shaderParams.color.r, shaderParams.color.g, shaderParams.color.b, 1.0);
                if (uniforms.alpha) gl.uniform1f(uniforms.alpha, shaderParams.alpha);

                // Set custom parameter uniforms
                if (metadata.parameters) {
                    metadata.parameters.forEach(param => {
                        if (uniforms[param.name]) {
                            gl.uniform1f(uniforms[param.name], shaderParams[param.name]);
                        }
                    });
                }

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            animationId = requestAnimationFrame(render);
        }

        function showError(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function hideError() {
            document.getElementById('error').style.display = 'none';
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255
            } : { r: 1, g: 1, b: 1 };
        }

        // Set up controls
        document.getElementById('color').addEventListener('input', (e) => {
            shaderParams.color = hexToRgb(e.target.value);
        });

        document.getElementById('alpha').addEventListener('input', (e) => {
            shaderParams.alpha = parseFloat(e.target.value);
            document.getElementById('alphaValue').textContent = shaderParams.alpha.toFixed(2);
        });

        document.getElementById('playPause').addEventListener('click', (e) => {
            isPaused = !isPaused;
            if (isPaused) {
                pausedTime = shaderParams.time;
                e.target.textContent = '▶ Play';
            } else {
                startTime = Date.now() - (pausedTime * 1000);
                e.target.textContent = '⏸ Pause';
            }
        });

        document.getElementById('reset').addEventListener('click', () => {
            startTime = Date.now();
            shaderParams.time = 0;
        });

        // Create custom parameter controls
        if (metadata.parameters) {
            const customControls = document.getElementById('customControls');
            metadata.parameters.forEach(param => {
                const group = document.createElement('div');
                group.className = 'control-group';

                const label = document.createElement('label');
                label.textContent = param.name + ':';
                group.appendChild(label);

                const input = document.createElement('input');
                input.type = 'range';
                input.min = param.min || 0;
                input.max = param.max || 1;
                input.step = (param.max - param.min) / 100;
                input.value = param.default || 0;
                input.addEventListener('input', (e) => {
                    shaderParams[param.name] = parseFloat(e.target.value);
                    valueSpan.textContent = parseFloat(e.target.value).toFixed(2);
                });
                group.appendChild(input);

                const valueSpan = document.createElement('span');
                valueSpan.className = 'value';
                valueSpan.textContent = (param.default || 0).toFixed(2);
                group.appendChild(valueSpan);

                customControls.appendChild(group);
            });
        }

        // Initialize and start rendering
        if (initShader()) {
            render();
        }

        // Handle window resize
        window.addEventListener('resize', resizeCanvas);
    </script>
</body>
</html>`;
    }

    public dispose() {
        ShaderPreviewPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
