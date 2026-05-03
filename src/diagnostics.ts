import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * VS2 runtime uniforms — provided by Visual Synth 2 at runtime.
 * These are never declared in the shader source itself, which causes
 * false-positive "undeclared identifier" errors in generic GLSL linters.
 * We inject them as a preamble before feeding the source to glslangValidator.
 */
const VS2_UNIFORMS = [
    'uniform float time;',
    'uniform vec2 resolution;',
    'uniform vec4 color;',
    'uniform float alpha;',
    'in vec2 texCoord;',
    'out vec4 fragColor;',
];

export class GlslDiagnosticProvider {
    private readonly collection = vscode.languages.createDiagnosticCollection('vs2-glsl');
    private readonly debounce = new Map<string, ReturnType<typeof setTimeout>>();

    register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            this.collection,
            vscode.workspace.onDidOpenTextDocument(doc => this.queue(doc)),
            vscode.workspace.onDidChangeTextDocument(e => this.queue(e.document)),
            vscode.workspace.onDidCloseTextDocument(doc => {
                this.collection.delete(doc.uri);
                const t = this.debounce.get(doc.uri.toString());
                if (t) { clearTimeout(t); this.debounce.delete(doc.uri.toString()); }
            }),
        );
        // Validate files already open when the extension activates
        vscode.workspace.textDocuments.forEach(doc => this.queue(doc));
    }

    private isFragDoc(doc: vscode.TextDocument): boolean {
        return doc.fileName.endsWith('.frag') || doc.languageId === 'glsl';
    }

    private queue(doc: vscode.TextDocument): void {
        if (!this.isFragDoc(doc)) return;
        const key = doc.uri.toString();
        const existing = this.debounce.get(key);
        if (existing) clearTimeout(existing);
        this.debounce.set(key, setTimeout(() => {
            this.debounce.delete(key);
            this.lint(doc);
        }, 600));
    }

    private lint(doc: vscode.TextDocument): void {
        const config = vscode.workspace.getConfiguration('visualSynthShaderViewer');
        const glslang = config.get<string>('glslangValidatorPath', 'glslangValidator');

        const source = doc.getText();
        const customParams = this.parseCustomParams(source);
        const { patchedSource, preambleStart, preambleCount, versionLinesAdded } =
            this.buildPatchedSource(source, customParams);

        const tmp = path.join(os.tmpdir(), `vs2lint_${process.pid}_${Date.now()}.frag`);
        fs.writeFile(tmp, patchedSource, 'utf8', writeErr => {
            if (writeErr) return;
            cp.execFile(glslang, ['-S', 'frag', tmp], { timeout: 10_000 }, (err, stdout, stderr) => {
                fs.unlink(tmp, () => {});
                if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
                    // glslangValidator not installed — silently skip linting
                    return;
                }
                const diags = this.parseOutput(
                    stdout + stderr, preambleStart, preambleCount, versionLinesAdded, doc,
                );
                this.collection.set(doc.uri, diags);
            });
        });
    }

    /** Extract custom uniform names from the VS2 JSON metadata block. */
    private parseCustomParams(source: string): string[] {
        const m = source.match(/\/\*\s*(\{[\s\S]*?\})\s*\*\//);
        if (!m) return [];
        try {
            const meta = JSON.parse(m[1]);
            return ((meta.parameters ?? []) as Array<{ name?: string }>)
                .map(p => p.name ?? '')
                .filter(Boolean);
        } catch { return []; }
    }

    /**
     * Build the patched source by injecting VS2 uniforms at the right position.
     *
     * The preamble must land AFTER any `precision` declarations (required before
     * float variables can be declared). We scan past the entire "setup section":
     * the JSON comment block, #version, #ifdef GL_ES / precision / #endif, leading
     * blank lines and // comments — then insert the preamble immediately after.
     *
     * If no #version is present we prepend "#version 300 es" before everything.
     */
    private buildPatchedSource(source: string, customParams: string[]): {
        patchedSource: string;
        preambleStart: number;       // 1-indexed line in patched source where preamble begins
        preambleCount: number;       // number of injected preamble lines
        versionLinesAdded: number;   // 1 if we prepended #version 300 es, else 0
    } {
        const preambleLines = [
            ...VS2_UNIFORMS,
            ...customParams.map(n => `uniform float ${n};`),
        ];

        const srcLines = source.split('\n');

        // Find the last line of the "setup section" (0-indexed).
        // Everything up to and including this line goes BEFORE the preamble.
        // We stop at the first line that is actual shader code.
        let setupEnd = -1;   // -1 means no setup lines found
        let inBlockComment = false;

        for (let i = 0; i < srcLines.length; i++) {
            const trimmed = srcLines[i].trim();

            if (!inBlockComment && trimmed.startsWith('/*')) {
                inBlockComment = true;
            }
            if (inBlockComment) {
                if (trimmed.includes('*/')) {
                    inBlockComment = false;
                }
                setupEnd = i;
                continue;
            }

            if (
                trimmed === '' ||
                trimmed.startsWith('//') ||
                trimmed.startsWith('#version') ||
                trimmed.startsWith('#ifdef') ||
                trimmed.startsWith('#ifndef') ||
                trimmed.startsWith('#endif') ||
                trimmed.startsWith('#define') ||
                trimmed.startsWith('#extension') ||
                /^precision\s/.test(trimmed)
            ) {
                setupEnd = i;
            } else {
                break;   // first actual code line — insert preamble before this
            }
        }

        const hasVersion = srcLines.some(l => l.trim().startsWith('#version'));
        const versionLinesAdded = hasVersion ? 0 : 1;

        // Assemble the patched file:
        //   [optional '#version 100']  ← if no version present
        //   srcLines[0 .. setupEnd]    ← setup section (version, precision, JSON comment, etc.)
        //   preamble lines             ← VS2 uniforms
        //   srcLines[setupEnd+1 ..]    ← actual shader code
        const patchedLines: string[] = [];

        if (!hasVersion) {
            patchedLines.push('#version 300 es');
        }
        for (let i = 0; i <= setupEnd; i++) {
            patchedLines.push(srcLines[i]);
        }
        for (const pl of preambleLines) {
            patchedLines.push(pl);
        }
        for (let i = setupEnd + 1; i < srcLines.length; i++) {
            patchedLines.push(srcLines[i]);
        }

        // preambleStart (1-indexed) = lines before preamble + 1
        //   = versionLinesAdded + (setupEnd + 1) + 1
        const preambleStart = versionLinesAdded + setupEnd + 2;

        return {
            patchedSource: patchedLines.join('\n'),
            preambleStart,
            preambleCount: preambleLines.length,
            versionLinesAdded,
        };
    }

    /**
     * Parse glslangValidator output and map line numbers back to the original document.
     *
     * Patched file layout:
     *   lines 1 .. versionLinesAdded              → added #version 300 es (if any)
     *   lines vL+1 .. vL+setupEnd+1               → original setup lines (same as original)
     *   lines preambleStart .. preambleStart+P-1  → injected preamble (skip these)
     *   lines preambleStart+P ..                  → original code lines (shift by P + vL)
     *
     * Line mapping:
     *   before preamble → origLine1 = patchedLine - versionLinesAdded
     *   in preamble     → skip
     *   after preamble  → origLine1 = patchedLine - versionLinesAdded - preambleCount
     */
    private parseOutput(
        output: string,
        preambleStart: number,
        preambleCount: number,
        versionLinesAdded: number,
        doc: vscode.TextDocument,
    ): vscode.Diagnostic[] {
        const diags: vscode.Diagnostic[] = [];
        const preambleEnd = preambleStart + preambleCount - 1;

        for (const line of output.split('\n')) {
            // glslangValidator format: "ERROR: /path/to/file.frag:LINE: message"
            // Non-greedy (.+?) backtracks correctly for Windows paths like C:/...
            const m = line.match(/^(ERROR|WARNING):\s+(.+?):(\d+):\s+(.+)$/);
            if (!m) continue;

            const patchedLine = parseInt(m[3], 10);   // 1-indexed
            const message = m[4];
            const severity = m[1] === 'ERROR'
                ? vscode.DiagnosticSeverity.Error
                : vscode.DiagnosticSeverity.Warning;

            // Skip diagnostics that land inside the injected preamble
            if (patchedLine >= preambleStart && patchedLine <= preambleEnd) continue;

            // Suppress false positives from GLSL ES 3.00 strictness on global initializers —
            // VS2 shaders legitimately initialize globals from uniforms and other globals.
            if (message.includes('global variable initializers')) continue;

            // Map patched line → original document line (1-indexed)
            const origLine1 = patchedLine < preambleStart
                ? patchedLine - versionLinesAdded           // setup section: only version offset
                : patchedLine - versionLinesAdded - preambleCount;  // code section: full offset

            const origLine0 = origLine1 - 1;   // VS Code API is 0-indexed
            if (origLine0 < 0 || origLine0 >= doc.lineCount) continue;

            const docLine = doc.lineAt(origLine0);
            const range = new vscode.Range(origLine0, 0, origLine0, docLine.text.length);
            const diag = new vscode.Diagnostic(range, message, severity);
            diag.source = 'VS2 GLSL';
            diags.push(diag);
        }

        return diags;
    }
}
