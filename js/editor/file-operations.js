/**
 * NoppoAIHub File Operations Module
 * ファイル作成、削除、右クリックメニュー機能
 * UX最優先で実装
 */

import { cloudinaryManager } from './cloudinary-manager.js';
import { setEditorValue } from './monaco-setup.js';
import { inspectFile } from './explorer.js';

/**
 * ファイルコンテキストメニュー（右クリック）
 */
export class FileContextMenu {
    constructor() {
        this.menu = null;
        this.currentFile = null;
        this.currentFileElement = null;
    }

    /**
     * コンテキストメニューを初期化（lucideアイコンのみ使用）
     */
    init() {
        // メニューHTMLを作成
        const menuHTML = `
            <div id="file-context-menu" class="file-context-menu" style="display: none; position: fixed; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; min-width: 220px;">
                <button class="context-menu-item" data-action="open">
                    <i data-lucide="folder-open" style="width: 16px; height: 16px; margin-right: 10px; color: #64748b;"></i> 開く
                </button>
                <button class="context-menu-item" data-action="download">
                    <i data-lucide="download" style="width: 16px; height: 16px; margin-right: 10px; color: #64748b;"></i> ダウンロード
                </button>
                <button class="context-menu-item" data-action="duplicate">
                    <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 10px; color: #64748b;"></i> 複製
                </button>
                <div style="height: 1px; background: #e2e8f0; margin: 6px 0;"></div>
                <button class="context-menu-item" data-action="rename" style="color: #f59e0b;">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px; margin-right: 10px; color: #f59e0b;"></i> 名前変更
                </button>
                <button class="context-menu-item" data-action="delete" style="color: #ef4444;">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px; margin-right: 10px; color: #ef4444;"></i> 削除
                </button>
            </div>
            <style>
                .file-context-menu {
                    padding: 4px 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                
                .context-menu-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 10px 14px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    text-align: left;
                    color: #0f172a;
                    transition: all 0.12s;
                }
                
                .context-menu-item:hover {
                    background: #f1f5f9;
                }
                
                .context-menu-item:active {
                    background: #e2e8f0;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', menuHTML);
        this.menu = document.getElementById('file-context-menu');

        // イベントリスナー設定
        this.setupEventListeners();
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // コンテキストメニューボタン
        this.menu.querySelectorAll('.context-menu-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.getAttribute('data-action');
                this.handleAction(action);
                this.hide();
            });
        });

        // 外側クリックでメニュー閉じる
        document.addEventListener('click', () => this.hide());

        // ファイルリスト右クリック
        document.addEventListener('contextmenu', (e) => {
            const fileElement = e.target.closest('[data-file-id]');
            if (fileElement) {
                e.preventDefault();
                this.currentFile = fileElement.getAttribute('data-file-id');
                this.currentFileElement = fileElement;
                this.show(e.clientX, e.clientY);
            }
        });
    }

    /**
     * メニューを表示
     */
    show(x, y) {
        if (!this.menu) return;
        this.menu.style.display = 'block';
        this.menu.style.left = Math.min(x, window.innerWidth - 250) + 'px';
        this.menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';

        // lucideアイコン再描画
        if (window.lucide) {
            setTimeout(() => lucide.createIcons({ elements: this.menu.querySelectorAll('i') }), 10);
        }
    }

    /**
     * メニューを非表示
     */
    hide() {
        if (!this.menu) return;
        this.menu.style.display = 'none';
    }

    /**
     * コンテキストメニューアクション処理
     */
    async handleAction(action) {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');

        switch (action) {
            case 'open':
                await this.openFile();
                break;
            case 'download':
                await this.downloadFile();
                break;
            case 'duplicate':
                await this.duplicateFile(projectId);
                break;
            case 'rename':
                this.renameFile();
                break;
            case 'delete':
                await this.deleteFile(projectId);
                break;
        }
    }

    /**
     * ファイルを開く
     */
    async openFile() {
        if (this.currentFileElement) {
            const fileUrl = this.currentFileElement.getAttribute('data-file-url');
            const fileName = this.currentFileElement.getAttribute('data-file-name');
            
            if (fileUrl) {
                try {
                    const response = await fetch(fileUrl);
                    const text = await response.text();
                    
                    // エディタに読み込み
                    setEditorValue(text, fileName);
                    
                    // インスペクター表示
                    inspectFile({ id: this.currentFile, name: fileName, url: fileUrl });
                    
                    console.log(`✓ ファイルを開きました: ${fileName}`);
                } catch (err) {
                    console.error('ファイルの読み込みに失敗:', err);
                }
            }
        }
    }

    /**
     * ファイル拡張子から言語を判定
     */
    detectLanguage(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const langMap = {
            'py': 'python', 'js': 'javascript', 'ts': 'typescript',
            'json': 'json', 'csv': 'csv', 'txt': 'plaintext',
            'md': 'markdown', 'html': 'html', 'css': 'css'
        };
        return langMap[ext] || 'plaintext';
    }

    /**
     * ファイルをダウンロード
     */
    async downloadFile() {
        if (this.currentFileElement) {
            const fileUrl = this.currentFileElement.getAttribute('data-file-url');
            const fileName = this.currentFileElement.getAttribute('data-file-name');
            if (fileUrl) {
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName;
                a.click();
            }
        }
    }

    /**
     * ファイルを複製
     */
    async duplicateFile(projectId) {
        if (!this.currentFileElement) return;

        const fileName = this.currentFileElement.getAttribute('data-file-name');
        const fileUrl = this.currentFileElement.getAttribute('data-file-url');

        if (!fileUrl) return;

        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const newName = fileName.replace(/(\.[^.]+)$/, '_copy$1');
            const newFile = new File([blob], newName, { type: blob.type });

            // Cloudinaryにアップロード
            await cloudinaryManager.uploadFile(newFile, projectId);
            console.log(`✓ ${newName} として複製されました`);
        } catch (err) {
            alert('複製に失敗しました: ' + err.message);
        }
    }

    /**
     * ファイルを名前変更
     */
    renameFile() {
        if (!this.currentFileElement) return;

        const oldName = this.currentFileElement.getAttribute('data-file-name');
        const newName = prompt('新しいファイル名:', oldName);

        if (newName && newName !== oldName) {
            // 実装: Firebaseでメタデータ更新
            alert('名前変更機能は実装予定です');
        }
    }

    /**
     * ファイルを削除
     */
    async deleteFile(projectId) {
        if (!this.currentFileElement) return;

        const fileName = this.currentFileElement.getAttribute('data-file-name');
        if (!confirm(`${fileName} を削除しますか？`)) return;

        try {
            const fileId = this.currentFileElement.getAttribute('data-file-id');
            await cloudinaryManager.deleteFile(fileId);
            this.currentFileElement.remove();
            alert('ファイルが削除されました');
        } catch (err) {
            alert('削除に失敗しました: ' + err.message);
        }
    }
}

/**
 * ファイル作成ダイアログ
 */
export class FileCreationDialog {
    constructor() {
        this.dialog = null;
    }

    /**
     * ダイアログを初期化（自動表示させない）
     */
    init() {
        const dialogHTML = `
            <div id="file-creation-dialog" class="file-creation-dialog" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 2000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 20px 25px rgba(0,0,0,0.15); max-width: 500px; width: 90%;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
                        <i data-lucide="file-plus" style="width: 24px; height: 24px; color: #2563eb;"></i>
                        <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: #0f172a;">新規ファイル作成</h2>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #475569;">ファイル名</label>
                        <input type="text" id="new-file-name" placeholder="例: script.py" style="width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; font-family: 'JetBrains Mono'; outline: none; transition: border-color 0.2s; box-sizing: border-box;">
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #475569;">ファイルタイプ</label>
                        <select id="new-file-type" style="width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; transition: border-color 0.2s; box-sizing: border-box;">
                            <option value="py">Python (.py)</option>
                            <option value="js">JavaScript (.js)</option>
                            <option value="json">JSON (.json)</option>
                            <option value="csv">CSV (.csv)</option>
                            <option value="txt">Text (.txt)</option>
                            <option value="md">Markdown (.md)</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="btn-cancel-file" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">キャンセル</button>
                        <button id="btn-create-file" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">作成</button>
                    </div>
                </div>
            </div>
            <style>
                #file-creation-dialog {
                    display: none !important;
                    backdrop-filter: blur(4px);
                }
                #file-creation-dialog[data-open] {
                    display: flex !important;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        this.dialog = document.getElementById('file-creation-dialog');

        // イベントリスナー設定（自動トリガーなし）
        const cancelBtn = document.getElementById('btn-cancel-file');
        const createBtn = document.getElementById('btn-create-file');
        const fileNameInput = document.getElementById('new-file-name');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hide());
        }

        if (createBtn) {
            createBtn.addEventListener('click', () => this.createFile());
        }

        // Enterキーで作成、Escapeキーでキャンセル
        if (fileNameInput) {
            fileNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.createFile();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dialog && this.dialog.hasAttribute('data-open')) {
                this.hide();
            }
        });

        // lucideアイコン初期化
        if (window.lucide) {
            setTimeout(() => lucide.createIcons({ elements: this.dialog.querySelectorAll('i') }), 10);
        }
    }

    /**
     * ダイアログを表示
     */
    show() {
        if (this.dialog) {
            this.dialog.setAttribute('data-open', 'true');
            this.dialog.style.display = 'flex';
            const nameInput = document.getElementById('new-file-name');
            if (nameInput) {
                nameInput.focus();
                nameInput.value = '';
            }
        }
    }

    /**
     * ダイアログを非表示
     */
    hide() {
        if (this.dialog) {
            this.dialog.removeAttribute('data-open');
            this.dialog.style.display = 'none';
        }
    }

    /**
     * ファイルを作成
     */
    async createFile() {
        const fileName = document.getElementById('new-file-name').value.trim();
        const fileType = document.getElementById('new-file-type').value;
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');

        if (!fileName) {
            alert('ファイル名を入力してください');
            return;
        }

        if (!projectId) {
            alert('プロジェクトIDが見つかりません');
            return;
        }

        const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${fileType}`;

        try {
            // テンプレートコンテンツ
            const templates = {
                'py': '#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\ndef main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n',
                'js': '// NoppoAIHub JavaScript\n// Created with NoppoAIHub\n\nfunction main() {\n    console.log("Hello, NoppoAIHub!");\n}\n\nmain();\n',
                'json': '{\n  "name": "NoppoAIHub Project",\n  "version": "1.0.0",\n  "description": ""\n}\n',
                'csv': 'column1,column2,column3\nvalue1,value2,value3\n',
                'txt': '',
                'md': '# Title\n\n## Description\n\n'
            };

            const content = templates[fileType] || '';
            const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
            const file = new File([blob], fullFileName, { type: 'text/plain' });

            // Cloudinaryにアップロード
            const result = await cloudinaryManager.uploadFile(file, projectId);
            
            // エディタに読み込み
            setEditorValue(content, fullFileName);
            console.log(`✓ ファイルを作成しました: ${fullFileName}`);

            this.hide();
        } catch (err) {
            console.error('ファイル作成エラー:', err);
            alert('ファイル作成に失敗しました: ' + err.message);
        }
    }

    /**
     * ファイル拡張子から言語を判定
     */
    detectLanguage(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const langMap = {
            'py': 'python', 'js': 'javascript', 'ts': 'typescript',
            'json': 'json', 'csv': 'csv', 'txt': 'plaintext',
            'md': 'markdown', 'html': 'html', 'css': 'css'
        };
        return langMap[ext] || 'plaintext';
    }
}

/**
 * ファイルを作成する簡易関数（外部呼び出し用）
 */
export async function createFile(fileName, content, projectId) {
    if (!fileName || !projectId) {
        console.error('createFile: 必須パラメータが不足しています');
        return;
    }

    try {
        const fullFileName = fileName;
        const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
        const file = new File([blob], fullFileName, { type: 'text/plain' });

        // Cloudinaryにアップロード
        await cloudinaryManager.uploadFile(file, projectId);
        
        console.log(`✓ ファイルを作成しました: ${fullFileName}`);
        return true;
    } catch (err) {
        console.error('ファイル作成エラー:', err);
        throw err;
    }
}

/**
 * ファイル操作の初期化（自動トリガーなし）
 */
export function initFileOperations() {
    // コンテキストメニュー
    window.fileContextMenu = new FileContextMenu();
    window.fileContextMenu.init();

    // ファイル作成ダイアログ
    window.fileCreationDialog = new FileCreationDialog();
    window.fileCreationDialog.init();

    // ファイルアップロード
    window.fileUploadManager = new FileUploadManager();
    window.fileUploadManager.init();

    // 「新規ファイル」ボタンにイベントリスナーを追加
    const newFileBtn = document.querySelector('[data-action="new-file"]');
    if (newFileBtn) {
        newFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.fileCreationDialog.show();
        });
        console.log('✓ 新規ファイルボタンリスナー設定完了');
    }

    console.log('✓ File operations initialized');
}

/**
 * ファイルアップロード機能
 */
class FileUploadManager {
    constructor() {
        this.uploadInput = null;
        this.isUploading = false;
    }

    /**
     * アップロード機能を初期化
     */
    init() {
        // 隠しファイル入力を作成
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'file';
        hiddenInput.id = 'hidden-file-upload';
        hiddenInput.multiple = true;
        hiddenInput.style.display = 'none';
        hiddenInput.addEventListener('change', (e) => this.handleFileSelect(e));
        document.body.appendChild(hiddenInput);
        this.uploadInput = hiddenInput;
    }

    /**
     * ファイル選択ダイアログを開く
     */
    openFilePicker() {
        if (this.uploadInput) {
            this.uploadInput.click();
        }
    }

    /**
     * ファイル選択時の処理
     */
    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');

        if (!projectId) {
            console.error('プロジェクトIDが見つかりません');
            alert('プロジェクトIDが見つかりません');
            return;
        }

        try {
            this.isUploading = true;
            
            for (const file of files) {
                try {
                    await cloudinaryManager.uploadFile(file, projectId, (percent) => {
                        console.log(`アップロード進行中: ${file.name} - ${Math.round(percent)}%`);
                    });
                    console.log(`✓ アップロード完了: ${file.name}`);
                } catch (err) {
                    console.error(`アップロード失敗: ${file.name}`, err);
                    alert(`アップロード失敗: ${file.name}\n${err.message}`);
                }
            }
        } finally {
            this.isUploading = false;
            // 入力をリセット
            this.uploadInput.value = '';
        }
    }
}

// グローバルに公開
window.initFileOperations = initFileOperations;
window.FileUploadManager = FileUploadManager;
