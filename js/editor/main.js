import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// エディタモジュール
import { setupMonaco, setEditorValue, getEditorValue, focusEditor } from './monaco-setup.js';
import { initEngine, runCode, clearTerminal } from './engine.js';
import { initChart, pushMetric, clearChart, getMetricsData } from './visualizer.js';
import { inspectFile } from './explorer.js';
import { showDatasetSelector, datasetManager } from './training-manager.js';
import { showProjectSetupWizard, projectSetup } from './project-setup.js';
import { cloudinaryManager, initNoppoDriveUI } from './cloudinary-manager.js';
import { automlEngine } from './automl-engine.js';
import { codeAssistant } from './code-assistant.js';
import { modelManager } from './model-manager.js';
import { integrationTests } from './integration-tests.js';
import { initFileOperations } from './file-operations.js';

const firebaseConfig = { projectId: "tribal-bonsai-470002-u0" };
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const APP_ID = 'noppo-drive-ultimate';

const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');

let currentFile = null;
let editorInstance = null;

/**
 * エディタの初期化メイン関数
 */
export async function initEditor(user) {
    try {
        // ユーザー情報表示
        const userNameEl = document.getElementById('user-name');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (userNameEl) userNameEl.textContent = user.userId;
        if (userAvatarEl) {
            userAvatarEl.src = user.avatar || user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.userId}`;
            userAvatarEl.onerror = () => {
                userAvatarEl.src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.userId}`;
            };
        }

        // 各モジュールの並列初期化
        const [monacoEditor, engineResult, chartInstance] = await Promise.all([
            setupMonaco(),
            initEngine(),
            initChart('liveChart')
        ]);

        editorInstance = monacoEditor;
        window.editorEngine = engineResult;

        // ファイルリストの読み込み
        loadProjectFiles();

        // UIイベントバインディング
        setupUIEvents(monacoEditor);

        // ファイル操作機能の初期化
        initFileOperations();

        // Inspector タブの初期化
        setupInspectorTabs();

        // ショートカットキー設定
        setupShortcuts();

        console.log('✓ Editor initialized successfully');
    } catch (err) {
        console.error('Editor initialization error:', err);
        alert('エディタの初期化に失敗しました。ページをリロードしてください。');
    }
}

/**
 * プロジェクトのファイルを読み込む
 */
function loadProjectFiles() {
    if (!projectId) {
        console.warn('No project ID provided');
        const fileListEl = document.getElementById('file-list');
        if (fileListEl) {
            fileListEl.innerHTML = `<div class="p-4 text-slate-400 text-xs">プロジェクトIDが必要です</div>`;
        }
        return;
    }

    console.log('Loading files for project:', projectId);

    const fileListEl = document.getElementById('file-list');
    if (!fileListEl) return;

    fileListEl.innerHTML = `
        <div class="p-4 text-center">
            <div class="spinner mx-auto mb-2"></div>
            <p class="text-[9px] text-slate-400 font-bold">ファイル読み込み中...</p>
        </div>
    `;

    try {
        const q = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'items'),
            where('parentId', '==', projectId)
        );

        onSnapshot(q, (snapshot) => {
            console.log('Files snapshot received:', snapshot.size, 'documents');
            fileListEl.innerHTML = '';

            if (snapshot.empty) {
                fileListEl.innerHTML = `
                    <div class="p-6 text-center">
                        <i data-lucide="folder-open" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
                        <p class="text-[9px] text-slate-400 font-bold">このプロジェクトにはファイルがありません</p>
                        <p class="text-[8px] text-slate-400 mt-2">projects.htmlでファイルをアップロードしてください</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            snapshot.docs.forEach(doc => {
                const file = { id: doc.id, ...doc.data() };
                console.log('Adding file:', file.name);
                addFileToList(file, fileListEl);
            });

            if (window.lucide) lucide.createIcons();
        }, (err) => {
            console.error('Error loading files:', err);
            fileListEl.innerHTML = `
                <div class="p-4">
                    <p class="text-red-500 text-xs font-bold mb-1">ファイル読み込みエラー</p>
                    <p class="text-[9px] text-slate-400">${err.message}</p>
                </div>
            `;
        });
    } catch (err) {
        console.error('Query setup error:', err);
        fileListEl.innerHTML = `
            <div class="p-4">
                <p class="text-red-500 text-xs font-bold mb-1">クエリエラー</p>
                <p class="text-[9px] text-slate-400">${err.message}</p>
            </div>
        `;
    }
}

/**
 * ファイルをリストに追加
 */
function addFileToList(file, container) {
    const div = document.createElement('div');
    div.className = 'file-entry';
    div.id = `file-${file.id}`;
    div.setAttribute('data-file-id', file.id);
    div.setAttribute('data-file-name', file.name);
    div.setAttribute('data-file-url', file.url || '');
    div.innerHTML = `
        <i data-lucide="file-code" class="file-entry-icon"></i>
        <span class="truncate">${file.name}</span>
    `;
    div.onclick = () => selectFile(file, div);
    container.appendChild(div);

    if (window.lucide) {
        const icon = div.querySelector('[data-lucide]');
        lucide.createIcons({ elements: [icon] });
    }
}

/**
 * ファイルを選択
 */
async function selectFile(file, element) {
    try {
        currentFile = file;

        // UIの選択状態を更新
        document.querySelectorAll('.file-entry').forEach(el => {
            el.classList.remove('active');
        });
        if (element) {
            element.classList.add('active');
        }

        // ファイル名を表示
        const filenameEl = document.getElementById('active-filename');
        if (filenameEl) {
            filenameEl.textContent = file.name;
        }

        // ファイルコンテンツを取得して表示
        const response = await fetch(file.url);
        const content = await response.text();
        setEditorValue(content, file.name);

        // インスペクターでプレビュー表示
        inspectFile(file);

        // エディタをフォーカス
        focusEditor();
    } catch (err) {
        console.error('Error selecting file:', err);
        alert('ファイルの読み込みに失敗しました: ' + err.message);
    }
}

/**
 * UIイベントの設定
 */
function setupUIEvents(editor) {
    // SAVE ボタン
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveFile(editor);
        });
    }

    // RUN ボタン
    const runBtn = document.getElementById('btn-run');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            await executeCode(editor);
        });
    }

    // FORMAT ボタン
    const formatBtn = document.getElementById('btn-format');
    if (formatBtn) {
        formatBtn.addEventListener('click', async () => {
            await formatCode(editor);
        });
    }

    // リサイザー（下部パネル）
    setupPanelResizer();
}

/**
 * ファイルを保存
 */
async function saveFile(editor) {
    if (!currentFile) {
        alert('ファイルを選択してください');
        return;
    }

    try {
        const content = editor.getValue();
        
        // Firestore に更新
        const fileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'items', currentFile.id);
        await updateDoc(fileRef, {
            content: content,
            updatedAt: new Date()
        });

        // UI フィードバック
        const saveBtn = document.getElementById('btn-save');
        if (saveBtn) {
            saveBtn.textContent = '✓ Saved';
            setTimeout(() => {
                saveBtn.textContent = 'Save';
            }, 2000);
        }

        console.log('✓ File saved:', currentFile.name);
    } catch (err) {
        console.error('Save error:', err);
        alert('ファイル保存に失敗しました: ' + err.message);
    }
}

/**
 * コードを実行
 */
async function executeCode(editor) {
    if (!currentFile) {
        alert('ファイルを選択してください');
        return;
    }

    try {
        const code = editor.getValue();
        const filename = currentFile.name;

        // メトリクスコールバック
        const onMetric = (metric) => {
            if (metric && typeof metric === 'object') {
                pushMetric(metric);
            }
        };

        // コード実行
        await runCode(filename, code, onMetric);

    } catch (err) {
        console.error('Execution error:', err);
    }
}

/**
 * コードをフォーマット
 */
async function formatCode(editor) {
    try {
        // Python の場合は Black ライクなフォーマット（簡易版）
        const model = editor.getModel();
        if (model && model.getLanguageId() === 'python') {
            const code = editor.getValue();
            
            // 簡易的なフォーマット
            let formatted = code
                .split('\n')
                .map((line, i) => {
                    // インデント の正規化
                    const match = line.match(/^(\s*)(.*)/);
                    if (!match[2]) return '';
                    const indent = Math.floor(match[1].length / 4) * 4;
                    return ' '.repeat(indent) + match[2];
                })
                .join('\n');

            editor.setValue(formatted);

            const formatBtn = document.getElementById('btn-format');
            if (formatBtn) {
                formatBtn.textContent = '✓ Formatted';
                setTimeout(() => {
                    formatBtn.textContent = 'Format';
                }, 2000);
            }
        }
    } catch (err) {
        console.error('Format error:', err);
    }
}

/**
 * 下部パネルのリサイザー
 */
function setupPanelResizer() {
    const resizer = document.getElementById('resizer-h');
    const bottomPanel = document.getElementById('bottom-panel');

    if (!resizer || !bottomPanel) return;

    let isResizing = false;
    const initialHeight = bottomPanel.offsetHeight;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const newHeight = window.innerHeight - e.clientY;
        
        // 最小・最大高さの制限
        if (newHeight >= 100 && newHeight <= window.innerHeight * 0.8) {
            bottomPanel.style.height = `${newHeight}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
}

/**
 * キーボードショートカット
 */
function setupShortcuts() {
    // Ctrl+S または Cmd+S: 保存
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.getElementById('btn-save');
            if (saveBtn) saveBtn.click();
        }

        // Ctrl+Enter または Cmd+Enter: 実行
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const runBtn = document.getElementById('btn-run');
            if (runBtn) runBtn.click();
        }

        // Ctrl+Shift+F または Cmd+Shift+F: フォーマット
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            const formatBtn = document.getElementById('btn-format');
            if (formatBtn) formatBtn.click();
        }
    });
}

/**
 * Inspector タブのセットアップ
 */
function setupInspectorTabs() {
    const btnFile = document.getElementById('btn-inspector-file');
    const btnDrive = document.getElementById('btn-inspector-drive');
    const btnDataset = document.getElementById('btn-inspector-dataset');
    const btnSetup = document.getElementById('btn-inspector-setup');
    const btnModels = document.getElementById('btn-inspector-models');
    const btnAutoML = document.getElementById('btn-inspector-automl');

    if (!btnFile) return;

    btnFile.addEventListener('click', () => {
        setActiveTab('file');
        const inspector = document.getElementById('inspector-content');
        if (inspector) {
            inspector.innerHTML = `
                <div class="inspector-placeholder">
                    <i data-lucide="info" class="placeholder-icon"></i>
                    <div class="placeholder-text">
                        Select a file to<br>
                        inspect its data
                    </div>
                </div>
            `;
        }
    });

    btnDrive?.addEventListener('click', () => {
        setActiveTab('drive');
        initNoppoDriveUI();
    });

    btnDataset?.addEventListener('click', () => {
        setActiveTab('dataset');
        showDatasetSelector();
    });

    btnSetup?.addEventListener('click', () => {
        setActiveTab('setup');
        showProjectSetupWizard();
    });

    btnModels?.addEventListener('click', () => {
        setActiveTab('models');
        showModelManagerUI();
    });

    btnAutoML?.addEventListener('click', () => {
        setActiveTab('automl');
        showAutoMLUI();
    });
}

/**
 * Inspector タブのアクティブ状態を設定
 */
function setActiveTab(tabName) {
    const buttons = document.querySelectorAll('.inspector-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const btnMap = {
        'file': 'btn-inspector-file',
        'drive': 'btn-inspector-drive',
        'dataset': 'btn-inspector-dataset',
        'setup': 'btn-inspector-setup',
        'models': 'btn-inspector-models',
        'automl': 'btn-inspector-automl'
    };

    const btnId = btnMap[tabName];
    if (btnId) {
        document.getElementById(btnId)?.classList.add('active');
    }
}

/**
 * モデルマネージャー UI
 */
function showModelManagerUI() {
    const inspector = document.getElementById('inspector-content');
    if (!inspector) return;

    inspector.innerHTML = `
        <div class="space-y-4">
            <p class="text-[12px] font-bold text-slate-900 mb-3">🤖 Model Manager</p>
            
            <div id="models-list" class="space-y-2 max-h-96 overflow-y-auto">
                <p class="text-[9px] text-slate-400">Loading models...</p>
            </div>

            <button onclick="window.showSaveModelDialog()" class="w-full px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700">
                💾 Save Current Model
            </button>
        </div>
    `;

    // モデルリスト読み込み
    modelManager.listModels().then(models => {
        const modelsList = document.getElementById('models-list');
        if (!modelsList) return;

        if (models.length === 0) {
            modelsList.innerHTML = '<p class="text-[9px] text-slate-400">No models yet</p>';
            return;
        }

        modelsList.innerHTML = models.map(m => `
            <div class="border border-e2e8f0 rounded p-2 space-y-1">
                <p class="text-[10px] font-bold">${m.name}</p>
                <p class="text-[8px] text-slate-400">${m.version} • ${(m.size / 1024).toFixed(1)}KB</p>
                <div class="flex gap-1">
                    <button class="flex-1 px-2 py-1 text-[8px] bg-green-500 text-white rounded" onclick="window.loadModelUI('${m.name}')">Load</button>
                    <button class="flex-1 px-2 py-1 text-[8px] bg-purple-500 text-white rounded" onclick="window.exportModelUI('${m.name}')">Export</button>
                    <button class="px-2 py-1 text-[8px] bg-red-500 text-white rounded" onclick="window.deleteModelUI('${m.name}')">✕</button>
                </div>
            </div>
        `).join('');
    });
}

/**
 * AutoML UI
 */
function showAutoMLUI() {
    const inspector = document.getElementById('inspector-content');
    if (!inspector) return;

    inspector.innerHTML = `
        <div class="space-y-4">
            <p class="text-[12px] font-bold text-slate-900 mb-3">⚡ AutoML Engine</p>
            
            <div class="space-y-3">
                <div>
                    <p class="text-[10px] font-bold text-slate-900 mb-2">Problem Type</p>
                    <select id="automl-type" class="w-full text-xs p-2 border border-e2e8f0 rounded">
                        <option value="classification">Classification</option>
                        <option value="regression">Regression</option>
                        <option value="clustering">Clustering</option>
                    </select>
                </div>

                <div>
                    <p class="text-[10px] font-bold text-slate-900 mb-2">Time Limit (seconds)</p>
                    <input type="number" id="automl-time" value="300" class="w-full text-xs p-2 border border-e2e8f0 rounded">
                </div>

                <div id="automl-progress" style="display: none;" class="space-y-2">
                    <p class="text-[9px] font-bold text-slate-900" id="automl-status">Starting...</p>
                    <div class="w-full h-2 bg-e2e8f0 rounded overflow-hidden">
                        <div id="automl-progress-bar" class="h-full bg-green-500 transition" style="width: 0%"></div>
                    </div>
                </div>

                <button onclick="window.runAutoMLUI()" class="w-full px-3 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">
                    🚀 Start AutoML
                </button>
            </div>
        </div>
    `;
}

// グローバル関数
window.showSaveModelDialog = async function() {
    const name = prompt('Model name:', 'my-model');
    if (!name) return;
    
    try {
        const result = await modelManager.saveModel(name, { /* model data */ });
        alert(result.message);
        showModelManagerUI();
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

window.loadModelUI = async function(modelName) {
    try {
        const model = await modelManager.loadModel(modelName);
        alert(`✓ Loaded: ${modelName}`);
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

window.exportModelUI = function(modelName) {
    try {
        const code = modelManager.exportModelAsCode(modelName, 'python');
        if (window.editor) {
            window.editor.setValue(code);
        }
        alert(`✓ Exported ${modelName} as Python`);
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

window.deleteModelUI = async function(modelName) {
    if (!confirm(`Delete ${modelName}?`)) return;
    
    try {
        const success = await modelManager.deleteModel(modelName);
        if (success) {
            alert(`✓ Deleted: ${modelName}`);
            showModelManagerUI();
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

window.runAutoMLUI = async function() {
    const type = document.getElementById('automl-type')?.value || 'classification';
    const timeLimit = parseInt(document.getElementById('automl-time')?.value) || 300;

    document.getElementById('automl-progress').style.display = 'block';

    // ダミーデータで AutoML 実行
    const dummyData = Array.from({ length: 100 }, (_, i) => ({
        feature1: Math.random(),
        feature2: Math.random(),
        target: i % 2
    }));

    try {
        const result = await automlEngine.runAutoML(
            dummyData,
            'target',
            { problemType: type, timeLimit }
        );

        const statusEl = document.getElementById('automl-status');
        const barEl = document.getElementById('automl-progress-bar');
        
        if (statusEl) statusEl.textContent = `✓ ${result.stage}`;
        if (barEl) barEl.style.width = '100%';

        alert(`AutoML Complete!\nBest Score: ${(result.bestModel.score * 100).toFixed(1)}%`);
    } catch (err) {
        alert('AutoML Error: ' + err.message);
    }
}