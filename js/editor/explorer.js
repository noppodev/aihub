/**
 * NoppoAIHub Data Explorer
 * AI開発向けのファイルブラウザ、プレビュー、データ検査機能
 */

/**
 * エクスプローラー初期化
 */
export function initExplorer(db, onFileSelect, onFileDelete) {
    console.log('✓ File Explorer initialized');
}

/**
 * ファイルタイプを判定
 */
export function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
        // Code files
        'py': { type: 'code', icon: 'file-code', color: '#3b82f6', name: 'Python' },
        'js': { type: 'code', icon: 'file-code', color: '#f59e0b', name: 'JavaScript' },
        'ts': { type: 'code', icon: 'file-code', color: '#3b82f6', name: 'TypeScript' },
        'json': { type: 'code', icon: 'file-code', color: '#ec4899', name: 'JSON' },
        'yml': { type: 'code', icon: 'file-code', color: '#8b5cf6', name: 'YAML' },
        
        // Data files
        'csv': { type: 'data', icon: 'table-2', color: '#10b981', name: 'CSV' },
        'json': { type: 'data', icon: 'database', color: '#06b6d4', name: 'JSON Data' },
        'parquet': { type: 'data', icon: 'database', color: '#06b6d4', name: 'Parquet' },
        'feather': { type: 'data', icon: 'database', color: '#06b6d4', name: 'Feather' },
        
        // Images
        'png': { type: 'image', icon: 'image', color: '#ef4444', name: 'PNG' },
        'jpg': { type: 'image', icon: 'image', color: '#ef4444', name: 'JPEG' },
        'jpeg': { type: 'image', icon: 'image', color: '#ef4444', name: 'JPEG' },
        'gif': { type: 'image', icon: 'image', color: '#ef4444', name: 'GIF' },
        'webp': { type: 'image', icon: 'image', color: '#ef4444', name: 'WebP' },
        
        // Models
        'pkl': { type: 'model', icon: 'package', color: '#8b5cf6', name: 'Pickle' },
        'h5': { type: 'model', icon: 'package', color: '#8b5cf6', name: 'H5 Model' },
        'pt': { type: 'model', icon: 'package', color: '#8b5cf6', name: 'PyTorch' },
        'onnx': { type: 'model', icon: 'package', color: '#8b5cf6', name: 'ONNX' },
        
        // Others
        'txt': { type: 'text', icon: 'file-text', color: '#64748b', name: 'Text' },
        'md': { type: 'text', icon: 'file-text', color: '#64748b', name: 'Markdown' }
    };
    
    return typeMap[ext] || { type: 'unknown', icon: 'file', color: '#94a3b8', name: 'File' };
}

/**
 * ファイルをインスペクターに表示
 */
export async function inspectFile(file) {
    const container = document.getElementById('inspector-content');
    if (!container) return;

    container.innerHTML = '<div class="flex items-center justify-center py-8"><div class="spinner"></div></div>';

    try {
        const fileInfo = getFileType(file.name);
        const ext = file.name.split('.').pop().toLowerCase();
        
        // 画像ファイル
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            await previewImage(container, file, fileInfo);
        }
        // CSVファイル
        else if (ext === 'csv') {
            await previewCSV(container, file, fileInfo);
        }
        // JSONファイル
        else if (ext === 'json') {
            await previewJSON(container, file, fileInfo);
        }
        // テキストファイル
        else if (['txt', 'md', 'py', 'js', 'ts'].includes(ext)) {
            await previewText(container, file, fileInfo);
        }
        // その他
        else {
            showFileInfo(container, file, fileInfo);
        }
    } catch (err) {
        container.innerHTML = `
            <div class="data-preview">
                <div class="text-red-500 text-center">
                    <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
                    <p class="text-xs font-bold">プレビューエラー</p>
                    <p class="text-[9px] text-gray-400 mt-1">${err.message}</p>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

/**
 * 画像プレビュー
 */
async function previewImage(container, file, fileInfo) {
    const img = new Image();
    
    img.onload = () => {
        container.innerHTML = `
            <div class="data-preview space-y-3">
                <img src="${file.url}" class="preview-image w-full h-auto rounded-lg border border-e2e8f0">
                <div>
                    <p class="text-[11px] font-bold text-slate-900 truncate">${file.name}</p>
                    <p class="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Image Data · ${img.width}x${img.height}px</p>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-2">
                    <div class="bg-slate-50 p-2 rounded-lg border border-e2e8f0">
                        <p class="text-[8px] text-slate-400 font-bold uppercase">Dimensions</p>
                        <p class="text-[10px] font-bold text-slate-900">${img.width}×${img.height}</p>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg border border-e2e8f0">
                        <p class="text-[8px] text-slate-400 font-bold uppercase">Type</p>
                        <p class="text-[10px] font-bold text-slate-900">${fileInfo.name}</p>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    };
    
    img.src = file.url;
}

/**
 * CSV プレビュー
 */
async function previewCSV(container, file, fileInfo) {
    const response = await fetch(file.url);
    const text = await response.text();
    const lines = text.split('\n').slice(0, 8);
    
    // CSV をパース
    const rows = lines
        .filter(line => line.trim())
        .map(line => {
            // 簡易パース（クォートを考慮しない）
            return line.split(',').map(cell => cell.trim().substring(0, 20));
        });
    
    if (rows.length === 0) {
        showFileInfo(container, file, fileInfo);
        return;
    }

    let tableHTML = '<table class="preview-table"><thead>';
    
    // ヘッダー行
    tableHTML += '<tr>';
    rows[0].forEach(cell => {
        tableHTML += `<th>${escapeHtml(cell)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // データ行
    rows.slice(1).forEach(row => {
        tableHTML += '<tr>';
        row.forEach(cell => {
            tableHTML += `<td>${escapeHtml(cell)}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';

    container.innerHTML = `
        <div class="data-preview space-y-3">
            <div class="overflow-x-auto max-h-48 border border-e2e8f0 rounded-lg bg-white">
                ${tableHTML}
            </div>
            <div>
                <p class="text-[11px] font-bold text-slate-900 truncate">${file.name}</p>
                <p class="text-[9px] text-slate-400 uppercase tracking-wider font-bold">CSV Dataset · ${rows.length} rows</p>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2">
                <div class="bg-slate-50 p-2 rounded-lg border border-e2e8f0">
                    <p class="text-[8px] text-slate-400 font-bold uppercase">Rows</p>
                    <p class="text-[10px] font-bold text-slate-900">${rows.length}</p>
                </div>
                <div class="bg-slate-50 p-2 rounded-lg border border-e2e8f0">
                    <p class="text-[8px] text-slate-400 font-bold uppercase">Columns</p>
                    <p class="text-[10px] font-bold text-slate-900">${rows[0].length}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * JSON プレビュー
 */
async function previewJSON(container, file, fileInfo) {
    const response = await fetch(file.url);
    const json = await response.json();
    
    const preview = JSON.stringify(json, null, 2).substring(0, 500);
    
    container.innerHTML = `
        <div class="data-preview space-y-3">
            <pre class="text-[8px] bg-slate-50 p-2 rounded border border-e2e8f0 overflow-x-auto max-h-32 font-mono text-slate-700">${escapeHtml(preview)}${preview.length >= 500 ? '...' : ''}</pre>
            <div>
                <p class="text-[11px] font-bold text-slate-900 truncate">${file.name}</p>
                <p class="text-[9px] text-slate-400 uppercase tracking-wider font-bold">JSON Data</p>
            </div>
            <div class="bg-slate-50 p-2 rounded-lg border border-e2e8f0">
                <p class="text-[8px] text-slate-400 font-bold uppercase">Size</p>
                <p class="text-[10px] font-bold text-slate-900">${formatBytes(JSON.stringify(json).length)}</p>
            </div>
        </div>
    `;
}

/**
 * テキストプレビュー
 */
async function previewText(container, file, fileInfo) {
    const response = await fetch(file.url);
    const text = await response.text();
    
    const preview = text.substring(0, 300);
    const lines = text.split('\n').length;
    
    container.innerHTML = `
        <div class="data-preview space-y-3">
            <pre class="text-[8px] bg-slate-50 p-2 rounded border border-e2e8f0 overflow-x-auto max-h-32 font-mono text-slate-700">${escapeHtml(preview)}${preview.length >= 300 ? '...' : ''}</pre>
            <div>
                <p class="text-[11px] font-bold text-slate-900 truncate">${file.name}</p>
                <p class="text-[9px] text-slate-400 uppercase tracking-wider font-bold">${fileInfo.name} · ${lines} lines</p>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2">
                <div class="bg-slate-50 p-2 rounded-lg border border-e2e8f0">
                    <p class="text-[8px] text-slate-400 font-bold uppercase">Lines</p>
                    <p class="text-[10px] font-bold text-slate-900">${lines}</p>
                </div>
                <div class="bg-slate-50 p-2 rounded-lg border border-e2e8f0">
                    <p class="text-[8px] text-slate-400 font-bold uppercase">Size</p>
                    <p class="text-[10px] font-bold text-slate-900">${formatBytes(text.length)}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * ファイル情報表示
 */
function showFileInfo(container, file, fileInfo) {
    container.innerHTML = `
        <div class="data-preview space-y-3 text-center py-6">
            <div class="text-4xl mb-3">${getEmoji(fileInfo.type)}</div>
            <div>
                <p class="text-[11px] font-bold text-slate-900 truncate">${file.name}</p>
                <p class="text-[9px] text-slate-400 uppercase tracking-wider font-bold">${fileInfo.name}</p>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border border-e2e8f0">
                <p class="text-[8px] text-slate-400 font-bold uppercase mb-1">File Type</p>
                <p class="text-[10px] font-bold text-slate-900">${fileInfo.name}</p>
                <p class="text-[9px] text-slate-400 mt-2">${getTypeDescription(fileInfo.type)}</p>
            </div>
        </div>
    `;
}

/**
 * ユーティリティ関数
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getEmoji(type) {
    const emojis = {
        'code': '📝',
        'data': '📊',
        'image': '🖼️',
        'model': '🤖',
        'text': '📄',
        'unknown': '📦'
    };
    return emojis[type] || '📦';
}

function getTypeDescription(type) {
    const descriptions = {
        'code': 'コードファイル - エディタで編集可能',
        'data': 'データセット - インスペクターで確認可能',
        'image': '画像ファイル - プレビュー表示可能',
        'model': 'ML モデルファイル',
        'text': 'テキストファイル',
        'unknown': 'その他のファイル'
    };
    return descriptions[type] || 'ファイル';
}