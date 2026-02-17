/**
 * NoppoAIHub Cloudinary Integration
 * NoppoDrive ファイル管理システム
 *
 * Firebase + Cloudinary統合
 * projects.htmlと同じ構造でファイル管理
 */

import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

// Firebase初期化 (既存のappインスタンスを使用)
const app = getApps().length
  ? getApp()
  : initializeApp({ projectId: "tribal-bonsai-470002-u0" });
const db = getFirestore(app);
const APP_ID = "noppo-drive-ultimate";

// Cloudinary Config (クライアント側)
// NOTE: Unsigned uploadを使用、upload_presetはnoppo_presetを設定
const CLOUDINARY_CONFIG = {
  cloud_name: "daiywtxmw",
  upload_preset: "noppo_preset", 
  // APIキーなしで直接アップロード可能（セキュリティ要件に応じて）
};

// デバッグ用: 設定確認
console.log("📋 Cloudinary Config:", {
  cloud_name: CLOUDINARY_CONFIG.cloud_name,
  upload_preset: CLOUDINARY_CONFIG.upload_preset || "(空 - フォールバック)",
});

/**
 * Cloudinary ストレージマネージャー
 * NoppoDrive + Firebase との統合
 */
export const cloudinaryManager = {
  /**
   * ファイルアップロード (Cloudinary + Firebase同期)
   * @param {File} file ファイルオブジェクト
   * @param {string} parentId 親フォルダのFirebase ID
   * @param {Function} onProgress 進捗コールバック
   */
  async uploadFile(file, parentId, onProgress = null) {
    try {
      // Step 1: Cloudinaryにアップロード
      const cloudinaryResult = await this.uploadToCloudinary(file, onProgress);

      // Step 2: FirebaseにメタデータをDBに記録
      const userId = await this.getCurrentUserId();
      const fileMetadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        parentId: parentId,
        ownerId: userId,
        url: cloudinaryResult.url,
        public_id: cloudinaryResult.public_id,
        storageProvider: "cloudinary",
        createdAt: serverTimestamp(),
        metadata: cloudinaryResult.metadata,
      };

      const docRef = await addDoc(
        collection(db, "artifacts", APP_ID, "public", "data", "items"),
        fileMetadata,
      );

      return {
        ...cloudinaryResult,
        id: docRef.id,
      };
    } catch (err) {
      console.error("Upload error:", err);
      throw err;
    }
  },

  /**
   * Cloudinaryにファイルをアップロード
   * 署名なし(unsigned)アップロードを使用
   */
  async uploadToCloudinary(file, onProgress = null) {
    // upload_preset が未設定の場合はエラーを発生させる
    if (!CLOUDINARY_CONFIG.upload_preset) {
      const errorMsg =
        `❌ Cloudinary upload_preset が未設定です。\n\n` +
        `修正手順:\n` +
        `1. Cloudinary ダッシュボード → Settings → Upload\n` +
        `2. Upload Presets で unsigned preset を作成\n` +
        `3. js/editor/cloudinary-manager.js の upload_preset を更新`;

      console.error(errorMsg);
      throw new Error("Cloudinary upload_preset が設定されていません");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.upload_preset);
    // resource_type と folder は noppodrive.html に合わせて削除 (Unsigned Upload の設定依存)

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          console.log("✓ Cloudinary アップロード成功:", file.name);
          const response = JSON.parse(xhr.responseText);
          resolve(this.parseCloudinaryResponse(response));
        } else if (xhr.status === 401) {
          const errorMsg =
            `❌ Cloudinary 401 Unauthorized\n\n` +
            `原因: upload_preset「${CLOUDINARY_CONFIG.upload_preset}」の設定が誤っています\n` +
            `解決策:\n` +
            `1. Cloudinary Dashboard > Settings > Upload > Upload presets\n` +
            `2. 「${CLOUDINARY_CONFIG.upload_preset}」の 「Signing Mode」 を **"Unsigned"** に変更してください。\n` +
            `3. 保存して再試行してください`;

          console.error(errorMsg);
          console.error("Response:", xhr.responseText);
          reject(
            new Error(
              "Cloudinary認証エラー (401): upload_preset が正しくありません",
            ),
          );
        } else if (xhr.status === 400) {
          const errorMsg =
            `❌ Cloudinary 400 Bad Request\n\n` +
            `原因: リクエストフォーマットが無効です`;

          console.error(errorMsg);
          console.error("Response:", xhr.responseText);
          reject(new Error("Cloudinary エラー (400): リクエストが無効です"));
        } else {
          console.error("Cloudinary Error:", xhr.status, xhr.responseText);
          reject(
            new Error(`アップロード失敗: ${xhr.status} ${xhr.statusText}`),
          );
        }
      };

      xhr.onerror = () => {
        console.error("XHR Error", xhr);
        reject(new Error("ネットワークエラー: Cloudinary に接続できません"));
      };

      // Cloudinary Upload APIエンドポイント
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/auto/upload`;
      console.log("📤 Cloudinary にアップロード中:", {
        url: uploadUrl,
        file: file.name,
        preset: CLOUDINARY_CONFIG.upload_preset,
      });

      xhr.open("POST", uploadUrl);
      xhr.send(formData);
    });
  },

  /**
   * ファイルタイプに基づいてリソースタイプを取得
   */
  getResourceType(mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "auto";
    return "raw"; // CSV, JSON, Python等
  },

  /**
   * Cloudinary レスポンスをパース
   */
  parseCloudinaryResponse(response) {
    return {
      public_id: response.public_id,
      url: response.secure_url,
      name: response.original_filename || response.public_id.split("/").pop(),
      size: response.bytes,
      type: response.resource_type,
      uploadedAt: new Date(response.created_at),
      folder: response.folder || "",
      metadata: {
        width: response.width || null,
        height: response.height || null,
        format: response.format || null,
        duration: response.duration || null, // for videos
      },
    };
  },

  /**
   * ファイルリスト取得 (Firebase)
   * projects.htmlと同じクエリを使用してファイルを取得
   */
  async listFiles(parentId) {
    try {
      const q = query(
        collection(db, "artifacts", APP_ID, "public", "data", "items"),
        where("parentId", "==", parentId),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error("List files error:", err);
      return [];
    }
  },

  /**
   * リアルタイムファイルリスナー
   * projects.htmlで使用されるonSnapshotと同じ
   */
  onFilesChange(parentId, callback) {
    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", "items"),
      where("parentId", "==", parentId),
    );
    return onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(files);
    });
  },

  /**
   * ファイル削除 (Firebase + Cloudinary)
   */
  async deleteFile(fileId) {
    try {
      // Firebase から削除
      await deleteDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "items", fileId),
      );
      return { success: true, fileId };
    } catch (err) {
      console.error("Delete error:", err);
      throw err;
    }
  },

  /**
   * 画像 URL の最適化
   */
  optimizeImageUrl(url, options = {}) {
    const {
      width = 400,
      height = 300,
      quality = 80,
      format = "auto",
    } = options;

    // Cloudinary 変換 URL の生成
    return url.replace(
      "/upload/",
      `/upload/w_${width},h_${height},q_${quality},f_${format}/`,
    );
  },

  /**
   * CSV ファイルを直接 URL から読み込み
   */
  async loadCSVFromUrl(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      return this.parseCSV(text);
    } catch (err) {
      console.error("CSV load error:", err);
      throw err;
    }
  },

  /**
   * CSV パース
   */
  parseCSV(csvText) {
    const lines = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return headers.reduce((obj, header, idx) => {
        obj[header] = values[idx] || "";
        return obj;
      }, {});
    });

    return { headers, rows };
  },

  /**
   * JSON ファイルを URL から読み込み
   */
  async loadJSONFromUrl(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (err) {
      console.error("JSON load error:", err);
      throw err;
    }
  },

  /**
   * テキストファイルを URL から読み込み
   */
  async loadTextFromUrl(url) {
    try {
      const response = await fetch(url);
      return await response.text();
    } catch (err) {
      console.error("Text load error:", err);
      throw err;
    }
  },

  /**
   * 画像 URL の最適化
   */
  optimizeImageUrl(url, options = {}) {
    const {
      width = 400,
      height = 300,
      quality = 80,
      format = "auto",
    } = options;

    // Cloudinary 変換 URL の生成
    return url.replace(
      "/upload/",
      `/upload/w_${width},h_${height},q_${quality},f_${format}/`,
    );
  },

  /**
   * ファイルを使用 (エディタに読み込みコード挿入)
   */
  async useFile(public_id, url) {
    if (window.editor) {
      const code = generateCloudinaryLoadCode({
        public_id,
        url,
        name: url.split("/").pop(),
      });
      window.editor.setValue(code);
    }
  },

  /**
   * 現在のユーザーID取得
   */
  async getCurrentUserId() {
    // auth.jsから取得
    try {
      const cached = localStorage.getItem("noppo_user");
      if (cached) {
        return JSON.parse(cached).userId;
      }
      return "anonymous";
    } catch (err) {
      console.warn("Could not get user ID:", err);
      return "anonymous";
    }
  },
};

/**
 * NoppoDrive ファイルマネージャー UI
 */
export function initNoppoDriveUI() {
  const inspector = document.getElementById("inspector-content");
  if (!inspector) return;

  inspector.innerHTML = `
        <div class="space-y-4">
            <div>
                <p class="text-[12px] font-bold text-slate-900 mb-3">☁️ NoppoDrive Files</p>
            </div>

            <!-- ファイルアップロードセクション -->
            <div class="border border-e2e8f0 rounded p-3 space-y-2">
                <p class="text-[10px] font-bold text-slate-900">Upload Dataset</p>
                
                <div id="upload-drop-zone" class="border-2 border-dashed border-cbd5e1 rounded p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                    <p class="text-[11px] text-slate-600">
                        📤 Drag files here or click to upload
                    </p>
                    <input type="file" id="file-upload-input" accept=".csv,.json,.png,.jpg,.pkl,.h5,.pt" style="display: none;">
                </div>

                <div id="upload-progress" style="display: none;" class="space-y-1">
                    <p class="text-[9px] font-bold text-slate-900">Uploading...</p>
                    <div class="w-full h-2 bg-e2e8f0 rounded overflow-hidden">
                        <div id="upload-progress-bar" class="h-full bg-blue-500 transition" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <!-- ファイルリスト -->
            <div class="border border-e2e8f0 rounded p-3 space-y-2">
                <p class="text-[10px] font-bold text-slate-900 mb-2">Recent Files</p>
                <div id="noppo-drive-file-list" class="space-y-1 max-h-64 overflow-y-auto">
                    <p class="text-[9px] text-slate-400">No files uploaded yet</p>
                </div>
            </div>
        </div>
    `;

  setupNoppoDriveEvents();
}

/**
 * NoppoDrive イベントハンドラー
 */
function setupNoppoDriveEvents() {
  const dropZone = document.getElementById("upload-drop-zone");
  const fileInput = document.getElementById("file-upload-input");
  const uploadProgress = document.getElementById("upload-progress");
  const progressBar = document.getElementById("upload-progress-bar");

  if (!dropZone || !fileInput) return;

  // クリックでファイル選択
  dropZone.addEventListener("click", () => fileInput.click());

  // ドラッグアンドドロップ
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#2563eb";
    dropZone.style.backgroundColor = "#eff6ff";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#cbd5e1";
    dropZone.style.backgroundColor = "transparent";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#cbd5e1";
    dropZone.style.backgroundColor = "transparent";

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => uploadNoppoDriveFile(file));
  });

  // ファイル選択
  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => uploadNoppoDriveFile(file));
  });
}

/**
 * NoppoDrive ファイルアップロード
 */
async function uploadNoppoDriveFile(file) {
  const uploadProgress = document.getElementById("upload-progress");
  const progressBar = document.getElementById("upload-progress-bar");
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");

  if (!uploadProgress || !progressBar || !projectId) {
    alert("❌ Project ID is required");
    return;
  }

  try {
    uploadProgress.style.display = "block";

    const result = await cloudinaryManager.uploadFile(
      file,
      projectId, // Firebase parentId を使用
      (percent) => {
        progressBar.style.width = percent + "%";
      },
    );

    uploadProgress.style.display = "none";

    // ファイルリストに追加
    addFileToNoppoDriveList(result);

    // エディタに自動読み込みコード生成
    if (window.editor) {
      const loadCode = generateCloudinaryLoadCode(result);
      window.editor.setValue(loadCode);
    }

    alert(`✓ Uploaded: ${result.name}`);
  } catch (err) {
    console.error("Upload failed:", err);
    alert(`❌ Upload failed: ${err.message}`);
    uploadProgress.style.display = "none";
  }
}

/**
 * NoppoDrive ファイルリストに追加
 */
function addFileToNoppoDriveList(fileInfo) {
  const fileList = document.getElementById("noppo-drive-file-list");
  if (!fileList) return;

  // 既存の「No files」メッセージを削除
  const noFiles = fileList.querySelector("p:only-child");
  if (noFiles) noFiles.remove();

  const fileElement = document.createElement("div");
  fileElement.className =
    "border border-e2e8f0 rounded p-2 hover:bg-f1f5f9 cursor-pointer transition";
  fileElement.innerHTML = `
        <div class="flex items-center gap-2 justify-between">
            <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-slate-900 truncate">${fileInfo.name}</p>
                <p class="text-[8px] text-slate-400">${(fileInfo.size / 1024).toFixed(2)} KB</p>
            </div>
            <div class="flex gap-1">
                <button class="px-2 py-1 text-[8px] bg-blue-500 text-white rounded hover:bg-blue-600" 
                        onclick="window.cloudinaryManager.useFile('${fileInfo.public_id}', '${fileInfo.url}')">
                    Use
                </button>
                <button class="px-2 py-1 text-[8px] bg-red-500 text-white rounded hover:bg-red-600"
                        onclick="window.cloudinaryManager.deleteFile('${fileInfo.id}')">
                    ✕
                </button>
            </div>
        </div>
    `;

  fileList.appendChild(fileElement);
}

/**
 * Cloudinary ロードコード生成
 */
function generateCloudinaryLoadCode(fileInfo) {
  const fileName = fileInfo.name;
  const fileUrl = fileInfo.url;
  const fileType = fileInfo.type;

  if (fileType === "image") {
    return `# Load image from Cloudinary
import requests
from PIL import Image
from io import BytesIO
import matplotlib.pyplot as plt

# Download image
url = "${fileUrl}"
response = requests.get(url)
img = Image.open(BytesIO(response.content))

# Display
plt.figure(figsize=(10, 8))
plt.imshow(img)
plt.axis('off')
plt.title("${fileName}")
plt.tight_layout()
plt.show()

print(f"Image shape: {img.size}")
`;
  } else if (fileName.endsWith(".csv")) {
    return `# Load CSV from Cloudinary
import pandas as pd

# Load from URL
url = "${fileUrl}"
df = pd.read_csv(url)

print(f"Shape: {df.shape}")
print(f"\\nColumns: {list(df.columns)}")
print(f"\\nFirst 5 rows:")
print(df.head())

print(f"\\nBasic statistics:")
print(df.describe())
`;
  } else if (fileName.endsWith(".json")) {
    return `# Load JSON from Cloudinary
import json
import requests

url = "${fileUrl}"
response = requests.get(url)
data = response.json()

print("Data loaded:")
print(json.dumps(data, indent=2)[:500])
`;
  } else {
    return `# File from Cloudinary: ${fileName}
url = "${fileUrl}"
print(f"File URL: {url}")
`;
  }
}

// グローバルに公開
window.cloudinaryManager = cloudinaryManager;
window.initNoppoDriveUI = initNoppoDriveUI;
