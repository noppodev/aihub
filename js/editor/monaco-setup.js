/**
 * NoppoAIHub Monaco Editor Setup
 * 高機能なエディタの初期化と言語機能の管理
 */

let editorInstance = null;

export async function setupMonaco() {
    return new Promise((resolve) => {
        // require が利用可能になるまで待機
        if (typeof require === 'undefined') {
            console.error('Monaco loader not loaded');
            setTimeout(() => resolve(null), 100);
            return;
        }

        // require.config は一度だけ実行（重複を回避）
        if (!window.monacoConfigured) {
            require.config({
                paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
            });
            window.monacoConfigured = true;
        }

        require(['vs/editor/editor.main'], () => {
            // エディタインスタンス作成
            editorInstance = monaco.editor.create(document.getElementById('monaco-root'), {
                value: getWelcomeText(),
                language: 'python',
                theme: 'vs-light',
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Monaco', 'Courier New', monospace",
                fontLigatures: true,
                automaticLayout: true,
                lineNumbers: 'on',
                glyphMargin: true,
                folding: true,
                minimap: { enabled: true, size: 'proportional', maxColumn: 120 },
                roundedSelection: true,
                scrollBeyondLastLine: true,
                readOnly: false,
                wordWrap: 'wordWrapColumn',
                wordWrapColumn: 120,
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                padding: { top: 16, bottom: 16 },
                formatOnPaste: true,
                formatOnType: true,
                showUnused: true,
                mouseWheelZoom: true,
                rulers: [80, 120],
                renderLineHighlight: 'line',
                renderWhitespace: 'selection',
                suggestOnTriggerCharacters: true,
                snippetSuggestions: 'top',
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                },
                acceptSuggestionOnCommitCharacter: true,
                tabSize: 4,
                insertSpaces: true,
                autoIndent: 'full'
            });

            window.editor = editorInstance;

            // Python言語機能の拡張
            registerPythonFeatures();

            // キーバインディング
            setupKeyBindings();

            // テーマカスタマイズ
            customizeTheme();

            // エディタイベント
            setupEditorEvents();

            console.log('✓ Monaco Editor initialized');
            resolve(editorInstance);
        });
    });
}

/**
 * Python用のスニペットと補完を登録
 */
function registerPythonFeatures() {
    monaco.languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.', ' '],
        provideCompletionItems: (model, position, context, token) => {
            const suggestions = getPythonSnippets();
            return { suggestions };
        }
    });

    // Python定義プロバイダー（簡易版）
    monaco.languages.registerDefinitionProvider('python', {
        provideDefinition: (model, position, token) => {
            return null; // Pyodideで実行時に解決
        }
    });

    // ホバー情報プロバイダー
    monaco.languages.registerHoverProvider('python', {
        provideHover: (model, position, token) => {
            return null;
        }
    });
}

/**
 * AIホテル開発用スニペット
 */
function getPythonSnippets() {
    return [
        // TensorFlow/Keras スニペット
        {
            label: 'keras-model',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
                'from tensorflow import keras',
                'from tensorflow.keras import layers',
                '',
                'model = keras.Sequential([',
                '    layers.Dense(128, activation="relu", input_shape=(input_size,)),',
                '    layers.Dropout(0.2),',
                '    layers.Dense(64, activation="relu"),',
                '    layers.Dense(num_classes, activation="softmax")',
                '])',
                'model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])'
            ].join('\n'),
            documentation: 'Kerasニューラルネットワークモデルのテンプレート',
            sortText: '1'
        },
        // PyTorchトレーニングループ
        {
            label: 'pytorch-train',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
                'import torch',
                'import torch.nn as nn',
                'from torch.optim import Adam',
                '',
                'criterion = nn.CrossEntropyLoss()',
                'optimizer = Adam(model.parameters(), lr=1e-3)',
                '',
                'for epoch in range(epochs):',
                '    for batch_x, batch_y in train_loader:',
                '        optimizer.zero_grad()',
                '        output = model(batch_x)',
                '        loss = criterion(output, batch_y)',
                '        loss.backward()',
                '        optimizer.step()',
                '    print(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")'
            ].join('\n'),
            documentation: 'PyTorchのトレーニングループ',
            sortText: '2'
        },
        // データ前処理
        {
            label: 'pandas-load',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
                'import pandas as pd',
                'import numpy as np',
                'from sklearn.preprocessing import StandardScaler',
                '',
                '# データ読み込み',
                'df = pd.read_csv("data.csv")',
                '',
                '# 前処理',
                'X = df.drop("target", axis=1).values',
                'y = df["target"].values',
                '',
                '# 正規化',
                'scaler = StandardScaler()',
                'X_scaled = scaler.fit_transform(X)'
            ].join('\n'),
            documentation: 'Pandasでのデータ読み込みと前処理',
            sortText: '3'
        },
        // モデル評価
        {
            label: 'eval-metrics',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
                'from sklearn.metrics import (',
                '    accuracy_score, precision_score, recall_score, f1_score,',
                '    confusion_matrix, roc_auc_score, roc_curve',
                ')',
                '',
                'predictions = model.predict(X_test)',
                'accuracy = accuracy_score(y_test, predictions)',
                'precision = precision_score(y_test, predictions, average="macro")',
                'recall = recall_score(y_test, predictions, average="macro")',
                'f1 = f1_score(y_test, predictions, average="macro")',
                '',
                'print(f"Accuracy: {accuracy:.4f}, Precision: {precision:.4f}, Recall: {recall:.4f}, F1: {f1:.4f}")'
            ].join('\n'),
            documentation: 'モデル評価メトリクスの計算',
            sortText: '4'
        },
        // 学習曲線プロット
        {
            label: 'plot-history',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
                'import matplotlib.pyplot as plt',
                '',
                'plt.figure(figsize=(12, 4))',
                '',
                'plt.subplot(1, 2, 1)',
                'plt.plot(history.history["loss"], label="train")',
                'plt.plot(history.history["val_loss"], label="val")',
                'plt.title("Loss")',
                'plt.legend()',
                'plt.grid()',
                '',
                'plt.subplot(1, 2, 2)',
                'plt.plot(history.history["accuracy"], label="train")',
                'plt.plot(history.history["val_accuracy"], label="val")',
                'plt.title("Accuracy")',
                'plt.legend()',
                'plt.grid()',
                '',
                'plt.tight_layout()',
                'plt.show()'
            ].join('\n'),
            documentation: '学習曲線をプロット',
            sortText: '5'
        },
        // GPU/CPU選択
        {
            label: 'device-check',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
                'import torch',
                '',
                'device = torch.device("cuda" if torch.cuda.is_available() else "cpu")',
                'print(f"Using device: {device}")',
                '',
                '# モデルをデバイスに移動',
                'model = model.to(device)'
            ].join('\n'),
            documentation: 'GPU利用可能性の確認',
            sortText: '6'
        }
    ];
}

/**
 * キーバインディング設定
 */
function setupKeyBindings() {
    if (!editorInstance) return;
    
    editorInstance.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
            const saveBtn = document.getElementById('btn-save');
            if (saveBtn) saveBtn.click();
        }
    );

    editorInstance.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
            const runBtn = document.getElementById('btn-run');
            if (runBtn) runBtn.click();
        }
    );

    editorInstance.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        () => {
            const formatBtn = document.getElementById('btn-format');
            if (formatBtn) formatBtn.click();
        }
    );
}

/**
 * テーマをカスタマイズ
 */
function customizeTheme() {
    monaco.editor.defineTheme('noppo-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '#2563eb', fontStyle: 'bold' },
            { token: 'string', foreground: '#16a34a' },
            { token: 'comment', foreground: '#9ca3af', fontStyle: 'italic' },
            { token: 'number', foreground: '#d97706' },
            { token: 'operator', foreground: '#7c3aed' }
        ],
        colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#1f2937',
            'editor.lineHighlightBackground': '#f3f4f6',
            'editor.selectionBackground': '#bfdbfe',
            'editorCursor.foreground': '#2563eb',
            'editorWhitespace.foreground': '#d1d5db'
        }
    });

    monaco.editor.setTheme('noppo-light');
}

/**
 * エディタイベント登録
 */
function setupEditorEvents() {
    if (!editorInstance) return;

    // コンテンツ変更時
    editorInstance.onDidChangeModelContent(() => {
        const saveBtn = document.getElementById('btn-save');
        if (saveBtn && !saveBtn.classList.contains('unsaved')) {
            saveBtn.classList.add('unsaved');
        }
    });

    // 選択内容変更時
    editorInstance.onDidChangeCursorSelection(() => {
        updateEditorStats();
    });
}

/**
 * エディタ統計情報の更新
 */
function updateEditorStats() {
    if (!editorInstance) return;
    const model = editorInstance.getModel();
    if (model) {
        const lineCount = model.getLineCount();
        const charCount = model.getValue().length;
        // 統計情報はコンソールまたは別のUIに表示可能
    }
}

/**
 * ファイルコンテンツをエディタに設定
 */
export function setEditorValue(content, filename) {
    if (!editorInstance) return;
    
    const model = editorInstance.getModel();
    if (model) {
        model.setValue(content);
    }

    // ファイル拡張子から言語を判定
    const language = detectLanguage(filename);
    if (language && model) {
        monaco.editor.setModelLanguage(model, language);
    }

    // ファイル名を更新
    const filenameEl = document.getElementById('active-filename');
    if (filenameEl) {
        filenameEl.textContent = filename;
    }
}

/**
 * ファイル名から言語を検出
 */
function detectLanguage(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const langMap = {
        'py': 'python',
        'js': 'javascript',
        'ts': 'typescript',
        'jsx': 'javascript',
        'tsx': 'typescript',
        'json': 'json',
        'csv': 'plaintext',
        'md': 'markdown',
        'html': 'html',
        'css': 'css',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rs': 'rust',
        'sql': 'sql'
    };
    return langMap[ext] || 'plaintext';
}

/**
 * ウェルカムテキスト
 */
function getWelcomeText() {
    return `# Welcome to NoppoAIHub Studio ✨
#
# 次世代AI開発環境へようこそ
#
# このエディタでは以下の機能が利用可能です：
#
# • Python, JavaScript, TypeScript等のコード編集
# • リアルタイムコード実行（Pyodide）
# • 学習メトリクスの自動可視化
# • CSVファイルのプレビュー
# • 画像データの確認
#
# 👉 チュートリアルコード：
#
# import numpy as np
# 
# # 簡単な線形回帰
# X = np.array([[1], [2], [3], [4]])
# y = np.array([2, 4, 6, 8])
# 
# # 学習
# W = np.random.randn(1, 1)
# for epoch in range(100):
#     pred = X @ W
#     loss = np.mean((pred - y) ** 2)
#     print(f"loss: {loss:.4f}")
#
# キーボードショートカット：
# • Ctrl+S: 保存
# • Ctrl+Enter: 実行
# • Ctrl+Shift+F: フォーマット
# • Ctrl+/: コメント切り替え`;
}

/**
 * エディタの値を取得
 */
export function getEditorValue() {
    if (!editorInstance) return '';
    return editorInstance.getValue();
}

/**
 * エディタを読み取り専用にする
 */
export function setEditorReadOnly(readOnly) {
    if (!editorInstance) return;
    editorInstance.updateOptions({ readOnly });
}

/**
 * エディタをフォーカス
 */
export function focusEditor() {
    if (!editorInstance) return;
    editorInstance.focus();
}