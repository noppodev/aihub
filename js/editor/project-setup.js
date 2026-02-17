/**
 * NoppoAIHub Project Setup Wizard
 * AI開発プロジェクトの初期設定ウィザード
 */

import { createFile } from './file-operations.js';
import { inspectFile } from './explorer.js';

/**
 * プロジェクト設定ウィザードを表示
 */
export function showProjectSetupWizard() {
    const inspector = document.getElementById('inspector-content');
    if (!inspector) return;

    inspector.innerHTML = `
        <div class="data-preview space-y-4">
            <div>
                <p class="text-[12px] font-bold text-slate-900 mb-3">⚙️ Project Setup Wizard</p>
            </div>

            <div class="border-t border-e2e8f0 pt-3 space-y-3">
                <div>
                    <p class="text-[10px] font-bold text-slate-900 mb-2">Select Template</p>
                    <div class="space-y-2">
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="template" value="basic" checked class="mt-1">
                            <div>
                                <p class="text-[10px] font-bold">Basic Data Science</p>
                                <p class="text-[8px] text-slate-400">NumPy, Pandas, Matplotlib</p>
                            </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="template" value="keras" class="mt-1">
                            <div>
                                <p class="text-[10px] font-bold">Deep Learning (Keras)</p>
                                <p class="text-[8px] text-slate-400">TensorFlow, Keras, CNN/RNN</p>
                            </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="template" value="pytorch" class="mt-1">
                            <div>
                                <p class="text-[10px] font-bold">PyTorch</p>
                                <p class="text-[8px] text-slate-400">PyTorch, Deep Learning</p>
                            </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="template" value="nlp" class="mt-1">
                            <div>
                                <p class="text-[10px] font-bold">NLP</p>
                                <p class="text-[8px] text-slate-400">Hugging Face, Transformers</p>
                            </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="template" value="cv" class="mt-1">
                            <div>
                                <p class="text-[10px] font-bold">Computer Vision</p>
                                <p class="text-[8px] text-slate-400">OpenCV, YOLOv8</p>
                            </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="radio" name="template" value="fullstack" class="mt-1">
                            <div>
                                <p class="text-[10px] font-bold">Full Stack (Python + Node.js)</p>
                                <p class="text-[8px] text-slate-400">FastAPI, React</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="border-t border-e2e8f0 pt-3">
                    <p class="text-[10px] font-bold text-slate-900 mb-2">Project Name</p>
                    <input type="text" id="project-name" placeholder="my-ml-project" value="ai-project" class="w-full text-xs p-2 border border-e2e8f0 rounded">
                </div>

                <div>
                    <p class="text-[10px] font-bold text-slate-900 mb-2">Python Version</p>
                    <select id="python-version" class="w-full text-xs p-2 border border-e2e8f0 rounded">
                        <option value="3.11">Python 3.11</option>
                        <option value="3.10">Python 3.10</option>
                        <option value="3.9">Python 3.9</option>
                    </select>
                </div>
            </div>

            <button onclick="window.projectSetup?.createProject()" class="w-full px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700">
                ✨ Create Project
            </button>
        </div>
    `;
}

/**
 * プロジェクト設定マネージャー
 */
export const projectSetup = {
    async createProject() {
        const template = document.querySelector('input[name="template"]:checked')?.value;
        const projectName = document.getElementById('project-name')?.value || 'ai-project';
        const pythonVersion = document.getElementById('python-version')?.value || '3.11';

        if (!template) {
            alert('Please select a template');
            return;
        }

        const files = generateProjectFiles(template, projectName, pythonVersion);

        // 実際にファイルを作成
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');

        if (projectId) {
            for (const file of files) {
                // 親フォルダが必要な場合は再帰的に作成するロジックが必要だが、
                // 現状はフラットに作成、またはパス名にスラッシュが含まれる場合の簡易対応
                // 注: createFileはフォルダ作成に対応していないため、単純化して「/」を「_」に置換するか、
                // あるいはフラットな構造として保存する
                const simpleName = file.name.replace(/\//g, '_');
                await createFile(simpleName, file.content, projectId);
            }
        }

        // editor に最初のファイルを表示
        if (window.editor && files.length > 0) {
            const firstFile = files.find(f => f.name.endsWith('main.py')) || files[0];
            window.editor.setValue(firstFile.content);
            
            // インスペクターも更新
             inspectFile({ 
                name: firstFile.name, 
                url: '', // ローカルコンテンツなのでURLなし
                content: firstFile.content // プレビュー用にコンテンツを渡せるようにする（要explorer.js改修）
            });
        }

        alert(`✓ Project "${projectName}" created with ${files.length} files!`);
        console.log('Created files:', files.map(f => f.name));
    }
};

/**
 * プロジェクトファイルを自動生成
 */
function generateProjectFiles(template, projectName, pythonVersion) {
    const commonFiles = [
        {
            name: 'README.md',
            content: `# ${projectName}

## Setup

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`python
python main.py
\`\`\`
`
        },
        {
            name: '.gitignore',
            content: `__pycache__/
*.py[cod]
*.egg-info/
.DS_Store
.venv/
venv/
node_modules/
dist/
build/
.env
`
        }
    ];

    let templateFiles = [];

    if (template === 'basic') {
        templateFiles = [
            {
                name: 'main.py',
                content: `#!/usr/bin/env python${pythonVersion}
"""
Basic Data Science Project
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

print("🚀 Data Science Project")

# Load data
df = pd.read_csv('data.csv')
print(f"Data shape: {df.shape}")

# Exploratory Data Analysis
print(f"\\nColumn names: {list(df.columns)}")
print(f"\\nBasic statistics:")
print(df.describe())

# Data preprocessing
# df = df.fillna(df.mean())

# Analysis
print(f"\\n✓ Analysis complete!")
`
            },
            {
                name: 'requirements.txt',
                content: `numpy>=1.24.0
pandas>=2.0.0
matplotlib>=3.7.0
scikit-learn>=1.3.0
`
            }
        ];
    } else if (template === 'keras') {
        templateFiles = [
            {
                name: 'main.py',
                content: `#!/usr/bin/env python${pythonVersion}
"""
Keras/TensorFlow Deep Learning Project
"""

import numpy as np
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

print("🚀 Keras Deep Learning Project")

# Load data
iris = load_iris()
X, y = iris.data, iris.target

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Preprocessing
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# Model
model = keras.Sequential([
    layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
    layers.Dropout(0.2),
    layers.Dense(32, activation='relu'),
    layers.Dense(len(np.unique(y)), activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

print(model.summary())

# Training
print("\\n🚀 Training...")
history = model.fit(X_train, y_train, epochs=20, batch_size=8, verbose=1)

# Evaluation
loss, accuracy = model.evaluate(X_test, y_test)
print(f"\\n✓ Test Accuracy: {accuracy:.4f}")
`
            },
            {
                name: 'requirements.txt',
                content: `numpy>=1.24.0
pandas>=2.0.0
tensorflow>=2.13.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
`
            }
        ];
    } else if (template === 'pytorch') {
        templateFiles = [
            {
                name: 'main.py',
                content: `#!/usr/bin/env python${pythonVersion}
"""
PyTorch Deep Learning Project
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

print("🚀 PyTorch Project")

# Device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Device: {device}")

# Data
iris = load_iris()
X, y = iris.data, iris.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

X_train = torch.FloatTensor(X_train)
y_train = torch.LongTensor(y_train)

# Model
class IrisNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(4, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 3)
    
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        x = self.fc3(x)
        return x

model = IrisNet().to(device)
optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

# Training
print("\\n🚀 Training...")
dataset = TensorDataset(X_train, y_train)
dataloader = DataLoader(dataset, batch_size=8, shuffle=True)

for epoch in range(20):
    for batch_x, batch_y in dataloader:
        batch_x, batch_y = batch_x.to(device), batch_y.to(device)
        
        optimizer.zero_grad()
        output = model(batch_x)
        loss = criterion(output, batch_y)
        loss.backward()
        optimizer.step()
    
    print(f"Epoch {epoch+1}/20, Loss: {loss.item():.4f}")

print("\\n✓ Training complete!")
`
            },
            {
                name: 'requirements.txt',
                content: `torch>=2.0.0
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
`
            }
        ];
    } else if (template === 'nlp') {
        templateFiles = [
            {
                name: 'main.py',
                content: `#!/usr/bin/env python${pythonVersion}
"""
NLP Project with Transformers
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

print("🚀 NLP Project")

# Model & Tokenizer
model_name = "distilbert-base-uncased-finetuned-sst-2-english"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

# Sample text
texts = [
    "This is amazing!",
    "This is terrible.",
    "I love this project!"
]

print("\\n📝 Sentiment Analysis:")
for text in texts:
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model(**inputs)
    logits = outputs.logits
    predicted_class = logits.argmax().item()
    labels = ['NEGATIVE', 'POSITIVE']
    print(f"  '{text}' -> {labels[predicted_class]}")

print("\\n✓ Analysis complete!")
`
            },
            {
                name: 'requirements.txt',
                content: `transformers>=4.30.0
torch>=2.0.0
numpy>=1.24.0
pandas>=2.0.0
`
            }
        ];
    } else if (template === 'cv') {
        templateFiles = [
            {
                name: 'main.py',
                content: `#!/usr/bin/env python${pythonVersion}
"""
Computer Vision Project
"""

import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

print("🚀 Computer Vision Project")

# Create sample image
image_array = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
img = Image.fromarray(image_array)

print(f"Image shape: {image_array.shape}")
print(f"Image size: {img.size}")

# Image processing
gray = img.convert('L')
print(f"Grayscale shape: {np.array(gray).shape}")

# YOLOv8 example (requires installation)
# from ultralytics import YOLO
# model = YOLO('yolov8n.pt')
# results = model.predict(source='image.jpg')

print("\\n✓ Computer Vision ready!")
`
            },
            {
                name: 'requirements.txt',
                content: `opencv-python>=4.8.0
pillow>=10.0.0
numpy>=1.24.0
matplotlib>=3.7.0
ultralytics>=8.0.0
torch>=2.0.0
`
            }
        ];
    } else if (template === 'fullstack') {
        templateFiles = [
            {
                name: 'backend/main.py',
                content: `#!/usr/bin/env python${pythonVersion}
"""
FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

app = FastAPI(title="ML API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "ML API Ready"}

@app.post("/predict")
def predict(data: dict):
    """Simple prediction endpoint"""
    X = np.array(data.get("data", []))
    # Your model prediction here
    return {"prediction": float(np.mean(X))}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`
            },
            {
                name: 'backend/requirements.txt',
                content: `fastapi>=0.100.0
uvicorn>=0.23.0
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
`
            },
            {
                name: 'frontend/app.js',
                content: `// React App
import React, { useState } from 'react';

export default function App() {
  const [result, setResult] = useState(null);

  const handlePredict = async () => {
    const response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [1, 2, 3, 4, 5] })
    });
    const data = await response.json();
    setResult(data.prediction);
  };

  return (
    <div>
      <h1>ML Prediction</h1>
      <button onClick={handlePredict}>Get Prediction</button>
      {result && <p>Result: {result}</p>}
    </div>
  );
}
`
            },
            {
                name: 'frontend/package.json',
                content: `{
  "name": "ml-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`
            }
        ];
    }

    return [...commonFiles, ...templateFiles];
}

// グローバルに公開
window.projectSetup = projectSetup;
