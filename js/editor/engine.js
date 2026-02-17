/**
 * NoppoAIHub Execution Engine
 * Python/JS/Node.js コードをブラウザ環境で実行、ターミナル入力対応
 */

let pyodide = null;
let term = null;
let isRunning = false;
let commandBuffer = '';
let commandHistory = [];
let historyIndex = -1;
const OUTPUT_HISTORY = [];
const MAX_HISTORY = 1000;

/**
 * 実行エンジンの初期化
 */
export async function initEngine() {
    const container = document.getElementById('terminal-container');
    
    // xterm.jsのロード確認
    if (typeof Terminal === 'undefined') {
        await new Promise(r => setTimeout(r, 500));
    }

    try {
        // ターミナル初期化
        term = new Terminal({
            theme: {
                background: '#0d1117',
                foreground: '#c9d1d9',
                cursor: '#58a6ff',
                cursorAccent: '#0d1117',
                selection: 'rgba(88, 166, 255, 0.4)',
                white: '#c9d1d9',
                red: '#f85149',
                green: '#3fb950',
                yellow: '#d29922',
                blue: '#58a6ff',
                magenta: '#bc8ef0',
                cyan: '#79c0ff',
                brightBlack: '#484f58'
            },
            fontFamily: "'JetBrains Mono', 'Monaco', monospace",
            fontSize: 12,
            lineHeight: 1.4,
            convertEol: true,
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 500,
            disableStdin: false,
            allowTransparencyForNextFrame: true
        });

        // 画面サイズ自動調整用アドオン
        try {
            // FitAddon.js から FitAddon クラスをインポート
            if (typeof window.FitAddon !== 'undefined') {
                const fitAddon = new window.FitAddon.FitAddon();
                term.loadAddon(fitAddon);
                fitAddon.fit();
                window.addEventListener('resize', () => {
                    try { fitAddon.fit(); } catch (e) {}
                });
                console.log('✓ FitAddon loaded successfully');
            } else if (typeof FitAddon !== 'undefined') {
                // バックアップ: グローバルスコープから直接
                const fitAddon = new FitAddon();
                term.loadAddon(fitAddon);
                fitAddon.fit();
                window.addEventListener('resize', () => {
                    try { fitAddon.fit(); } catch (e) {}
                });
                console.log('✓ FitAddon loaded from global scope');
            } else {
                console.warn('FitAddon not available, terminal will not auto-fit');
                // 手動フィッティング
                const rows = Math.floor(container.clientHeight / 20);
                const cols = Math.floor(container.clientWidth / 8);
                term.resize(cols, rows);
            }
        } catch (err) {
            console.warn('FitAddon initialization failed:', err.message);
            // フォールバック: 基本的なサイズ設定
            const rows = Math.floor(container.clientHeight / 20);
            const cols = Math.floor(container.clientWidth / 8);
            term.resize(cols, rows);
        }

        term.open(container);
        
        writeTerminal('\x1b[1;34m╔════════════════════════════════════════╗\x1b[0m', true);
        writeTerminal('\x1b[1;34m║   NoppoAIHub Execution Engine Ready    ║\x1b[0m', true);
        writeTerminal('\x1b[1;34m╚════════════════════════════════════════╝\x1b[0m', true);

        // ターミナル入力イベント
        setupTerminalInput();

        // Pyodideの非同期ロード
        loadPyodideAsync();

        return { terminal: term, engine: { run: runCode, isRunning: () => isRunning } };
    } catch (err) {
        writeTerminal(`\x1b[31m✘ Engine initialization error: ${err.message}\x1b[0m`, true);
        throw err;
    }
}

/**
 * ターミナル入力のセットアップ
 */
function setupTerminalInput() {
    if (!term) return;

    term.onData((data) => {
        // Ctrl+C: 実行中止
        if (data === '\x03') {
            isRunning = false;
            writeTerminal('^C', true);
            showPrompt();
            return;
        }

        // Enter: コマンド実行
        if (data === '\r' || data === '\n') {
            term.writeln('');
            executeTerminalCommand(commandBuffer);
            commandBuffer = '';
            historyIndex = -1;
            return;
        }

        // Backspace
        if (data === '\x7f') {
            if (commandBuffer.length > 0) {
                commandBuffer = commandBuffer.slice(0, -1);
                term.write('\x1b[D\x1b[K');
            }
            return;
        }

        // 上矢印: コマンド履歴
        if (data === '\x1b[A') {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                const historyCmd = commandHistory[commandHistory.length - 1 - historyIndex];
                // 現在の行をクリア
                term.write('\x1b[2K\x1b[0G');
                term.write(`\x1b[1;32mnoppo@aihub:~/project$ \x1b[0m${historyCmd}`);
                commandBuffer = historyCmd;
            }
            return;
        }

        // 下矢印: コマンド履歴
        if (data === '\x1b[B') {
            if (historyIndex > 0) {
                historyIndex--;
                const historyCmd = commandHistory[commandHistory.length - 1 - historyIndex];
                term.write('\x1b[2K\x1b[0G');
                term.write(`\x1b[1;32mnoppo@aihub:~/project$ \x1b[0m${historyCmd}`);
                commandBuffer = historyCmd;
            } else if (historyIndex === 0) {
                historyIndex = -1;
                term.write('\x1b[2K\x1b[0G');
                term.write('\x1b[1;32mnoppo@aihub:~/project$ \x1b[0m');
                commandBuffer = '';
            }
            return;
        }

        // 通常入力
        if (data.charCodeAt(0) >= 32 && data.charCodeAt(0) <= 126) {
            commandBuffer += data;
            term.write(data);
        }
    });
}

/**
 * ターミナルコマンド実行
 */
async function executeTerminalCommand(command) {
    command = command.trim();
    
    if (!command) {
        showPrompt();
        return;
    }

    // コマンド履歴に追加
    commandHistory.push(command);

    const parts = command.split(/\s+/);
    const cmd = parts[0];

    try {
        if (cmd === 'python' || cmd === 'python3') {
            await runPythonCommand(parts.slice(1));
        } else if (cmd === 'node' || cmd === 'npm') {
            await runNodeCommand(cmd, parts.slice(1));
        } else if (cmd === 'ls' || cmd === 'dir') {
            handleListDir();
        } else if (cmd === 'pwd') {
            writeTerminal('/home/noppo/projects/current', true);
        } else if (cmd === 'clear' || cmd === 'cls') {
            term.clear();
        } else if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
            showHelp();
        } else {
            writeTerminal(`\x1b[33m⚠ Command not found or not supported: ${cmd}\x1b[0m`, true);
            writeTerminal('Type "help" for available commands', true);
        }
    } catch (err) {
        writeTerminal(`\x1b[31m✘ Error: ${err.message}\x1b[0m`, true);
    }

    showPrompt();
}

/**
 * Python コマンド実行（-c, -m オプション対応）
 */
async function runPythonCommand(args) {
    if (!pyodide) {
        writeTerminal('\x1b[31m✘ Python not ready\x1b[0m', true);
        return;
    }

    if (args.length === 0) {
        writeTerminal('\x1b[33m>>> (Python REPL not fully supported)\x1b[0m', true);
        return;
    }

    const flag = args[0];
    
    if (flag === '-c' && args.length > 1) {
        // python -c "code"
        const code = args.slice(1).join(' ');
        await runPythonCode(code, 'terminal', null);
    } else if (flag === '-m' && args.length > 1) {
        // python -m module
        const moduleName = args[1];
        writeTerminal(`\x1b[33m⚠ Module execution not supported: ${moduleName}\x1b[0m`, true);
    } else if (flag.endsWith('.py')) {
        // python file.py
        writeTerminal(`\x1b[33m⚠ File execution requires file upload\x1b[0m`, true);
    } else {
        writeTerminal('\x1b[31m✘ Invalid Python command\x1b[0m', true);
    }
}

/**
 * Node.js/npm コマンド実行（シミュレーション）
 */
async function runNodeCommand(cmd, args) {
    if (cmd === 'npm') {
        if (args.length === 0) {
            writeTerminal('\x1b[33mnpm ERR! missing script\x1b[0m', true);
            return;
        }

        const subcmd = args[0];
        
        if (subcmd === 'list' || subcmd === 'ls') {
            writeTerminal('\x1b[36m📦 Installed packages:\x1b[0m', true);
            writeTerminal('numpy@1.24.0', true);
            writeTerminal('pandas@2.0.0', true);
            writeTerminal('pyodide@0.25.0', true);
        } else if (subcmd === 'install' || subcmd === 'i') {
            const pkg = args[1] || 'packages';
            writeTerminal(`\x1b[33m⏳ Installing ${pkg}...\x1b[0m`, true);
            await new Promise(r => setTimeout(r, 1000));
            writeTerminal(`\x1b[32m✔ ${pkg} installed\x1b[0m`, true);
        } else if (subcmd === 'run') {
            const script = args[1];
            writeTerminal(`\x1b[33m▶ Running script: ${script}\x1b[0m`, true);
            writeTerminal('\x1b[31mℹ Script not found in package.json\x1b[0m', true);
        } else {
            writeTerminal(`\x1b[33m⚠ npm ${subcmd} not fully supported\x1b[0m`, true);
        }
    } else if (cmd === 'node') {
        if (args.length === 0) {
            writeTerminal('Node.js v18.0.0', true);
            writeTerminal('(Node REPL not supported)', true);
        } else {
            writeTerminal(`\x1b[33m⚠ File execution: node ${args.join(' ')}\x1b[0m`, true);
        }
    }
}

/**
 * ディレクトリリスト表示
 */
function handleListDir() {
    writeTerminal('\x1b[36m📁 Project files:\x1b[0m', true);
    writeTerminal('  model.py               2.5 KB', true);
    writeTerminal('  data.csv               1.2 MB', true);
    writeTerminal('  train.py               3.1 KB', true);
    writeTerminal('  config.json            512 B', true);
}

/**
 * ヘルプ表示
 */
function showHelp() {
    writeTerminal('\x1b[1;36m=== NoppoAIHub Terminal Help ===\x1b[0m', true);
    writeTerminal('', true);
    writeTerminal('\x1b[33mPython Commands:\x1b[0m', true);
    writeTerminal('  python -c "code"           Run Python code', true);
    writeTerminal('  python -m module           Run Python module', true);
    writeTerminal('  python file.py             Execute Python file', true);
    writeTerminal('', true);
    writeTerminal('\x1b[33mNode.js/npm Commands:\x1b[0m', true);
    writeTerminal('  npm list                   List installed packages', true);
    writeTerminal('  npm install [pkg]          Install package', true);
    writeTerminal('  npm run [script]           Run npm script', true);
    writeTerminal('  node file.js               Execute JavaScript file', true);
    writeTerminal('', true);
    writeTerminal('\x1b[33mUtility Commands:\x1b[0m', true);
    writeTerminal('  ls                         List files', true);
    writeTerminal('  pwd                        Print working directory', true);
    writeTerminal('  clear                      Clear screen', true);
    writeTerminal('  help                       Show this help', true);
}

/**
 * Pyodideを非同期でロード
 */
async function loadPyodideAsync() {
    try {
        writeTerminal('\x1b[1;33m⏳ Loading Python environment...\x1b[0m', true);
        
        // グローバルスコープからloadPyodideを取得
        const loadPyodideFunc = typeof window.loadPyodide !== 'undefined' ? window.loadPyodide : null;
        
        if (!loadPyodideFunc) {
            throw new Error('Pyodide library not loaded. Check if CDN is accessible.');
        }
        
        pyodide = await loadPyodideFunc({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
        });

        // よく使用するパッケージの事前ロード
        const packages = ['numpy', 'pandas', 'micropip'];
        writeTerminal(`\x1b[1;33m⏳ Pre-loading packages: ${packages.join(', ')}\x1b[0m`, true);
        
        await pyodide.loadPackage(packages);
        
        // matplotlib/scikit-learnはオンデマンドロード
        pyodide.runPython('import sys; print(f"Python {sys.version}")');
        
        writeTerminal('\x1b[32m✔ Python 3 kernel ready\x1b[0m', true);
        writeTerminal('\x1b[36m▶ Type your Python code or click RUN\x1b[0m', true);
        writeTerminal('', true);
        
        // プロンプト表示
        showPrompt();
    } catch (err) {
        writeTerminal(`\x1b[31m✘ Failed to load Python: ${err.message}\x1b[0m`, true);
        writeTerminal('\x1b[33mℹ JavaScript execution still available\x1b[0m', true);
        console.error('Pyodide loading error:', err);
    }
}

/**
 * ターミナルへの書き込み
 */
function writeTerminal(text, addHistory = true) {
    if (term) {
        term.writeln(text);
        if (addHistory && text.trim()) {
            OUTPUT_HISTORY.push(text);
            if (OUTPUT_HISTORY.length > MAX_HISTORY) {
                OUTPUT_HISTORY.shift();
            }
        }
    }
}

/**
 * プロンプト表示
 */
function showPrompt() {
    if (term) {
        term.write('\x1b[1;32mnoppo@aihub:~/project$ \x1b[0m');
    }
}

/**
 * コード実行メイン関数
 */
export async function runCode(filename, code, onMetric = null) {
    if (isRunning) {
        writeTerminal('\x1b[33m⚠ Code is already running\x1b[0m', true);
        return;
    }

    isRunning = true;
    const runBtn = document.getElementById('btn-run');
    if (runBtn) {
        runBtn.classList.add('running');
        runBtn.disabled = true;
    }

    try {
        writeTerminal('', true);
        writeTerminal(`\x1b[1;36m▶ Executing: ${filename}\x1b[0m`, true);
        writeTerminal('─'.repeat(50), true);
        
        const ext = filename.split('.').pop().toLowerCase();
        
        if (ext === 'py' && pyodide) {
            await runPythonCode(code, filename, onMetric);
        } else if (['js', 'javascript'].includes(ext)) {
            await runJavaScriptCode(code, onMetric);
        } else {
            writeTerminal(`\x1b[31m✘ Unsupported file type: .${ext}\x1b[0m`, true);
        }
        
        writeTerminal('─'.repeat(50), true);
        writeTerminal('\x1b[32m✔ Execution completed\x1b[0m', true);
    } catch (err) {
        writeTerminal(`\x1b[31m✘ Error: ${err.message}\x1b[0m`, true);
    } finally {
        isRunning = false;
        if (runBtn) {
            runBtn.classList.remove('running');
            runBtn.disabled = false;
        }
        showPrompt();
    }
}

/**
 * Python コード実行
 */
async function runPythonCode(code, filename, onMetric) {
    if (!pyodide) {
        writeTerminal('\x1b[31m✘ Python engine not ready\x1b[0m', true);
        return;
    }

    try {
        // ファイルを仮想FSに保存
        pyodide.FS.writeFile(filename, code, { encoding: 'utf8' });

        // print出力をキャプチャ
        const capturedOutput = [];
        
        pyodide.setStdout({
            batched: (output) => {
                const lines = output.split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        writeTerminal(line, true);
                        capturedOutput.push(line);
                        
                        // メトリクスのパースと抽出
                        if (onMetric) {
                            parseAndNotifyMetrics(line, onMetric);
                        }
                    }
                });
            }
        });

        pyodide.setStderr({
            batched: (output) => {
                writeTerminal(`\x1b[31m${output}\x1b[0m`, true);
            }
        });

        // パッケージの自動インストール機能
        const imports = extractImports(code);
        for (const pkg of imports) {
            if (!['sys', 'os', 'math', 'random', 're', 'json', 'datetime', 'collections', 'itertools'].includes(pkg)) {
                try {
                    if (!pyodide.loadedPackages.includes(pkg)) {
                        writeTerminal(`\x1b[1;33m⏳ Installing ${pkg}...\x1b[0m`, true);
                        await pyodide.loadPackage(pkg);
                    }
                } catch (e) {
                    // パッケージが見つからない場合はスキップ
                }
            }
        }

        // コード実行
        await pyodide.runPythonAsync(`
import sys
import traceback

try:
    with open("${filename}", "r") as f:
        exec(f.read(), {'__name__': '__main__', 'sys': sys})
except Exception as e:
    traceback.print_exc()
        `);

    } catch (err) {
        writeTerminal(`\x1b[31m${err}\x1b[0m`, true);
    }
}

/**
 * JavaScript コード実行
 */
async function runJavaScriptCode(code, onMetric) {
    try {
        // コンソールを乗っ取ってターミナルに出力
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
            const output = args.map(arg => {
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg, null, 2); }
                    catch { return String(arg); }
                }
                return String(arg);
            }).join(' ');
            writeTerminal(output, true);
            if (onMetric) parseAndNotifyMetrics(output, onMetric);
        };

        console.error = (...args) => {
            const output = args.map(String).join(' ');
            writeTerminal(`\x1b[31m${output}\x1b[0m`, true);
        };

        // evalで実行（スコープの制限あり）
        eval(code);
        
        console.log = originalLog;
        console.error = originalError;
    } catch (err) {
        writeTerminal(`\x1b[31m${err.message}\x1b[0m`, true);
    }
}

/**
 * メトリクスのパースと通知
 */
function parseAndNotifyMetrics(output, callback) {
    // 複数のパターンにマッチさせる
    const patterns = [
        /loss[\s:]*([0-9.]+)/gi,
        /accuracy[\s:]*([0-9.]+)/gi,
        /epoch[\s:]*([0-9]+)/gi,
        /val_loss[\s:]*([0-9.]+)/gi,
        /f1[\s:]*([0-9.]+)/gi
    ];

    patterns.forEach(pattern => {
        const match = output.match(pattern);
        if (match) {
            const value = parseFloat(match[0].split(/[\s:]+/).pop());
            if (!isNaN(value)) {
                callback({
                    type: match[0].split(/[\s:]+/)[0].toLowerCase(),
                    value: value,
                    timestamp: Date.now()
                });
            }
        }
    });
}

/**
 * importステートメントを抽出
 */
function extractImports(code) {
    const imports = new Set();
    const importRegex = /^\s*(?:from\s+(\w+)|import\s+(\w+))/gm;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
        const pkg = match[1] || match[2];
        if (pkg && pkg !== '__future__') {
            imports.add(pkg);
        }
    }
    return Array.from(imports);
}

/**
 * 実行状態を取得
 */
export function getIsRunning() {
    return isRunning;
}

/**
 * ターミナルをクリア
 */
export function clearTerminal() {
    if (term) {
        term.clear();
    }
    OUTPUT_HISTORY.length = 0;
}

/**
 * ターミナル出力履歴を取得
 */
export function getTerminalHistory() {
    return [...OUTPUT_HISTORY];
}