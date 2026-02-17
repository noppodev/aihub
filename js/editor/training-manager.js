/**
 * NoppoAIHub Dataset & Training Manager
 * NoppoDrive + Cloudinary統合
 * データセット選択と機械学習モデルの自動トレーニング
 */

import { cloudinaryManager } from './cloudinary-manager.js';

/**
 * データセット選択UI
 */
export function showDatasetSelector() {
    const inspector = document.getElementById('inspector-content');
    if (!inspector) return;

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    inspector.innerHTML = `
        <div class="data-preview space-y-4">
            <div>
                <p class="text-[11px] font-bold text-slate-900 mb-2">📊 NoppoDrive Datasets</p>
                <div id="dataset-list" class="space-y-2 border border-e2e8f0 rounded p-3 mb-3 max-h-48 overflow-y-auto">
                    <p class="text-[9px] text-slate-400">Loading datasets...</p>
                </div>
                <input type="file" id="dataset-input" accept=".csv,.json,.parquet" class="block w-full text-xs mb-3 p-2 border border-e2e8f0 rounded">
                <button onclick="window.datasetManager?.handleFileSelect()" class="w-full px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700">Upload Dataset</button>
            </div>

            <div class="border-t border-e2e8f0 pt-3">
                <p class="text-[10px] font-bold text-slate-900 mb-3">Training Configuration</p>
                
                <div class="space-y-2">
                    <div>
                        <label class="text-[9px] font-bold text-slate-600">Framework</label>
                        <select id="ml-framework" class="w-full text-xs p-2 border border-e2e8f0 rounded">
                            <option value="sklearn">Scikit-learn (Classification)</option>
                            <option value="keras">Keras/TensorFlow (Neural Network)</option>
                            <option value="pytorch">PyTorch (Deep Learning)</option>
                            <option value="xgboost">XGBoost (Gradient Boosting)</option>
                        </select>
                    </div>

                    <div>
                        <label class="text-[9px] font-bold text-slate-600">Task Type</label>
                        <select id="ml-task" class="w-full text-xs p-2 border border-e2e8f0 rounded">
                            <option value="classification">Classification</option>
                            <option value="regression">Regression</option>
                            <option value="clustering">Clustering</option>
                        </select>
                    </div>

                    <div>
                        <label class="text-[9px] font-bold text-slate-600">Train-Test Split</label>
                        <input type="range" id="ml-split" min="0.1" max="0.9" step="0.1" value="0.8" class="w-full">
                        <p class="text-[8px] text-slate-400"><span id="split-display">80</span>% train, <span id="split-test">20</span>% test</p>
                    </div>

                    <div>
                        <label class="text-[9px] font-bold text-slate-600">Epochs/Iterations</label>
                        <input type="number" id="ml-epochs" value="10" min="1" max="1000" class="w-full text-xs p-2 border border-e2e8f0 rounded">
                    </div>
                </div>
            </div>

            <button onclick="window.datasetManager?.startTraining()" class="w-full px-3 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">🚀 Start Training</button>
        </div>
    `;

    // スライダーのリアルタイム表示
    const splitSlider = document.getElementById('ml-split');
    if (splitSlider) {
        splitSlider.addEventListener('input', (e) => {
            const train = Math.round(e.target.value * 100);
            const test = 100 - train;
            document.getElementById('split-display').textContent = train;
            document.getElementById('split-test').textContent = test;
        });
    }

    // NoppoDriveのデータセットリストを読み込み
    if (projectId) {
        loadDatasetListFromNoppoDrive(projectId);
    }
}

/**
 * NoppoDriveからデータセットリストを読み込み
 */
async function loadDatasetListFromNoppoDrive(projectId) {
    const datasetList = document.getElementById('dataset-list');
    if (!datasetList) return;

    try {
        const files = await cloudinaryManager.listFiles(projectId);
        const datasets = files.filter(f => 
            f.name.endsWith('.csv') || 
            f.name.endsWith('.json') || 
            f.name.endsWith('.parquet')
        );

        if (datasets.length === 0) {
            datasetList.innerHTML = '<p class="text-[9px] text-slate-400">No datasets found. Upload one to get started.</p>';
            return;
        }

        datasetList.innerHTML = datasets.map(ds => `
            <div class="flex items-center justify-between p-2 border border-e2e8f0 rounded hover:bg-blue-50 cursor-pointer" 
                 onclick="window.datasetManager?.loadDatasetFromCloudinary('${ds.cloudinaryUrl}', '${ds.name}')">
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-bold text-slate-900 truncate">${ds.name}</p>
                    <p class="text-[8px] text-slate-400">${(ds.size / 1024).toFixed(1)} KB</p>
                </div>
                <i data-lucide="check-circle" class="w-4 h-4 text-green-500"></i>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading datasets:', err);
        datasetList.innerHTML = `<p class="text-[9px] text-red-500">Error loading datasets</p>`;
    }
}

/**
 * データセットマネージャー
 */
export const datasetManager = {
    currentDataset: null,
    dataContent: null,
    currentDatasetUrl: null,

    async handleFileSelect() {
        const input = document.getElementById('dataset-input');
        if (!input || !input.files.length) {
            alert('Please select a file');
            return;
        }

        const file = input.files[0];
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');

        if (!projectId) {
            alert('Project ID is required');
            return;
        }

        try {
            const result = await cloudinaryManager.uploadFile(file, projectId, (percent) => {
                console.log(`Upload progress: ${percent}%`);
            });

            this.dataContent = result;
            this.currentDataset = file.name;
            this.currentDatasetUrl = result.cloudinaryUrl;
            
            alert(`✓ Dataset uploaded: ${file.name}`);
            
            // リストを再読み込み
            loadDatasetListFromNoppoDrive(projectId);
        } catch (err) {
            console.error('Upload failed:', err);
            alert(`❌ Upload failed: ${err.message}`);
        }
    },

    async loadDatasetFromCloudinary(url, name) {
        try {
            const ext = name.split('.').pop().toLowerCase();
            let content;

            if (ext === 'csv') {
                const text = await cloudinaryManager.loadTextFromUrl(url);
                content = cloudinaryManager.parseCSV(text);
            } else if (ext === 'json') {
                content = await cloudinaryManager.loadJSONFromUrl(url);
            } else {
                content = await cloudinaryManager.loadTextFromUrl(url);
            }

            this.dataContent = content;
            this.currentDataset = name;
            this.currentDatasetUrl = url;

            alert(`✓ Loaded: ${name}`);
            console.log('Dataset content:', content);
        } catch (err) {
            console.error('Load failed:', err);
            alert(`❌ Load failed: ${err.message}`);
        }
    },

    async startTraining() {
        if (!this.dataContent) {
            alert('Please load a dataset first');
            return;
        }

        const framework = document.getElementById('ml-framework').value;
        const task = document.getElementById('ml-task').value;
        const split = parseFloat(document.getElementById('ml-split').value);
        const epochs = parseInt(document.getElementById('ml-epochs').value);

        // トレーニングコード自動生成
        const code = generateTrainingCode(this.dataContent, framework, task, split, epochs);

        // エディタに挿入
        if (window.editor) {
            window.editor.setValue(code);
        }

        // 自動実行オプション
        if (confirm('Run training code now?')) {
            const runBtn = document.getElementById('btn-run');
            if (runBtn) runBtn.click();
        }
    }
};

/**
 * トレーニングコード自動生成
 */
function generateTrainingCode(csvContent, framework, task, split, epochs) {
    const lines = csvContent.split('\n').slice(0, 2);
    const headers = lines[0].split(',');
    const nFeatures = headers.length - 1; // 最後が target
    const targetCol = headers[headers.length - 1];

    if (framework === 'sklearn') {
        return generateSklearnCode(headers, nFeatures, task, split, epochs);
    } else if (framework === 'keras') {
        return generateKerasCode(nFeatures, task, epochs);
    } else if (framework === 'pytorch') {
        return generatePyTorchCode(nFeatures, task, epochs);
    } else if (framework === 'xgboost') {
        return generateXGBoostCode(nFeatures, task, epochs);
    }

    return `# Training code for ${framework} would be generated here`;
}

function generateSklearnCode(headers, nFeatures, task, split, epochs) {
    return `
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report

# ===== Data Preparation =====
print("📊 Loading data...")

# Load your CSV here
# df = pd.read_csv('data.csv')

# For demo, creating sample data
from sklearn.datasets import load_iris
iris = load_iris()
df = pd.DataFrame(iris.data, columns=iris.feature_names)
df['target'] = iris.target

print(f"Data shape: {df.shape}")

# ===== Train-Test Split =====
X = df.drop('target', axis=1)
y = df['target']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=${1-split}, random_state=42
)

print(f"Train set: {X_train.shape}")
print(f"Test set: {X_test.shape}")

# ===== Preprocessing =====
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ===== Model Training =====
print("🚀 Training model...")

${task === 'classification' ? 
`model = RandomForestClassifier(n_estimators=${epochs}, random_state=42)` :
`model = RandomForestRegressor(n_estimators=${epochs}, random_state=42)`}

model.fit(X_train_scaled, y_train)

# ===== Evaluation =====
y_pred = model.predict(X_test_scaled)

${task === 'classification' ? 
`accuracy = accuracy_score(y_test, y_pred)
print(f"Accuracy: {accuracy:.4f}")
print(f"\\nClassification Report:")
print(classification_report(y_test, y_pred))` :
`mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
print(f"MSE: {mse:.4f}")
print(f"RMSE: {rmse:.4f}")`}

print("\\n✓ Training completed!")
`;
}

function generateKerasCode(nFeatures, task, epochs) {
    return `
import numpy as np
import pandas as pd
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# ===== Model Definition =====
model = keras.Sequential([
    layers.Dense(64, activation='relu', input_shape=(${nFeatures},)),
    layers.Dropout(0.2),
    layers.Dense(32, activation='relu'),
    layers.Dropout(0.2),
    ${task === 'classification' ? 
    `layers.Dense(10, activation='softmax')` :
    `layers.Dense(1)`}
])

# ===== Compilation =====
model.compile(
    optimizer='adam',
    ${task === 'classification' ? 
    `loss='sparse_categorical_crossentropy', metrics=['accuracy']` :
    `loss='mse', metrics=['mae']`}
)

print(model.summary())

# ===== Sample Data =====
print("📊 Creating sample data...")
X = np.random.randn(1000, ${nFeatures})
${task === 'classification' ? 
`y = np.random.randint(0, 10, 1000)` :
`y = np.random.randn(1000, 1)`}

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# ===== Training =====
print("🚀 Training model...")
history = model.fit(
    X_train, y_train,
    epochs=${epochs},
    batch_size=32,
    validation_split=0.2,
    verbose=1
)

# ===== Evaluation =====
${task === 'classification' ? 
`loss, accuracy = model.evaluate(X_test, y_test)
print(f"Test Accuracy: {accuracy:.4f}")` :
`loss, mae = model.evaluate(X_test, y_test)
print(f"Test MAE: {mae:.4f}")`}

print("\\n✓ Training completed!")
`;
}

function generatePyTorchCode(nFeatures, task, epochs) {
    return `
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np

# ===== Device Setup =====
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# ===== Model Definition =====
class CustomModel(nn.Module):
    def __init__(self, input_size, output_size):
        super().__init__()
        self.fc1 = nn.Linear(input_size, 64)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, output_size)
    
    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.fc2(x)
        x = self.relu(x)
        x = self.fc3(x)
        return x

# ===== Sample Data =====
X = torch.randn(1000, ${nFeatures})
${task === 'classification' ? 
`y = torch.randint(0, 10, (1000,))` :
`y = torch.randn(1000, 1)`}

dataset = TensorDataset(X, y)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# ===== Model & Optimizer =====
model = CustomModel(${nFeatures}, ${task === 'classification' ? '10' : '1'})
model = model.to(device)

optimizer = optim.Adam(model.parameters(), lr=0.001)
${task === 'classification' ? 
`criterion = nn.CrossEntropyLoss()` :
`criterion = nn.MSELoss()`}

# ===== Training =====
print("🚀 Training model...")
for epoch in range(${epochs}):
    total_loss = 0
    for batch_x, batch_y in dataloader:
        batch_x, batch_y = batch_x.to(device), batch_y.to(device)
        
        optimizer.zero_grad()
        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    
    avg_loss = total_loss / len(dataloader)
    print(f"Epoch {epoch+1}/${epochs}, Loss: {avg_loss:.4f}")

print("\\n✓ Training completed!")
`;
}

function generateXGBoostCode(nFeatures, task, epochs) {
    return `
import numpy as np
import xgboost as xgb
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# ===== Data Loading =====
print("📊 Loading data...")
iris = load_iris()
X = iris.data
y = iris.target

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# ===== Model Training =====
print("🚀 Training XGBoost model...")

${task === 'classification' ? `
params = {
    'objective': 'multi:softmax',
    'num_class': 10,
    'max_depth': 6,
    'eta': 0.1
}

dtrain = xgb.DMatrix(X_train, label=y_train)
dtest = xgb.DMatrix(X_test, label=y_test)

model = xgb.train(params, dtrain, num_boost_round=${epochs})

# ===== Evaluation =====
y_pred = model.predict(dtest)
accuracy = accuracy_score(y_test, y_pred)
print(f"Accuracy: {accuracy:.4f}")
print(f"\\nClassification Report:")
print(classification_report(y_test, y_pred))
` : `
params = {
    'objective': 'reg:squarederror',
    'max_depth': 6,
    'eta': 0.1
}

dtrain = xgb.DMatrix(X_train, label=y_train)
dtest = xgb.DMatrix(X_test, label=y_test)

model = xgb.train(params, dtrain, num_boost_round=${epochs})

# ===== Evaluation =====
y_pred = model.predict(dtest)
from sklearn.metrics import mean_squared_error
mse = mean_squared_error(y_test, y_pred)
print(f"MSE: {mse:.4f}")
`}

print("\\n✓ Training completed!")
`;
}

// グローバルに公開
window.datasetManager = datasetManager;
