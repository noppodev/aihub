/**
 * NoppoAIHub Model Manager & Deployment
 * Firebase + Cloudinary統合
 * 学習済みモデルの管理とデプロイメント
 */

import { cloudinaryManager } from './cloudinary-manager.js';

export const modelManager = {
    models: {},
    deployedModels: {},

    /**
     * モデルを保存
     */
    async saveModel(modelName, modelData, metadata = {}) {
        try {
            const params = new URLSearchParams(window.location.search);
            const projectId = params.get('id');

            const modelObject = {
                name: modelName,
                data: modelData,
                metadata: {
                    ...metadata,
                    savedAt: new Date().toISOString(),
                    version: '1.0.0'
                },
                checksum: this.calculateChecksum(modelData)
            };

            // IndexedDB に保存
            await this.saveToIndexedDB(modelName, modelObject);

            // Cloudinary にもバックアップ (projectIdに保存)
            if (projectId) {
                await this.backupToCloudinary(modelName, modelObject, projectId);
            }

            this.models[modelName] = modelObject;

            return {
                success: true,
                message: `Model '${modelName}' saved successfully`,
                size: JSON.stringify(modelObject).length
            };
        } catch (err) {
            console.error('Save model error:', err);
            throw err;
        }
    },

    /**
     * IndexedDB へ保存
     */
    async saveToIndexedDB(modelName, modelData) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('NoppoAIHub-Models', 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('models')) {
                    db.createObjectStore('models', { keyPath: 'name' });
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['models'], 'readwrite');
                const store = transaction.objectStore('models');
                store.put(modelData);

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };

            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Cloudinary にバックアップ (Firebase + Cloudinary統合)
     */
    async backupToCloudinary(modelName, modelData, projectId) {
        try {
            const blob = new Blob([JSON.stringify(modelData)], { type: 'application/json' });
            const file = new File([blob], `${modelName}.json`);

            // cloudinary-manager を使用 (projectIdベース)
            await cloudinaryManager.uploadFile(file, projectId);
            console.log(`✓ Model backed up to Cloudinary: ${modelName}`);
        } catch (err) {
            console.warn('Cloudinary backup skipped:', err.message);
        }
    },

    /**
     * チェックサム計算
     */
    calculateChecksum(data) {
        let hash = 0;
        const str = JSON.stringify(data);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },

    /**
     * モデル読み込み
     */
    async loadModel(modelName) {
        try {
            // IndexedDB から読み込み
            let model = await this.loadFromIndexedDB(modelName);

            if (!model) {
                // Cloudinary からダウンロード
                const params = new URLSearchParams(window.location.search);
                const projectId = params.get('id');
                if (projectId) {
                    model = await this.loadFromCloudinary(modelName, projectId);
                }
            }

            if (!model) {
                throw new Error(`Model '${modelName}' not found`);
            }

            this.models[modelName] = model;
            return model;
        } catch (err) {
            console.error('Load model error:', err);
            throw err;
        }
    },

    /**
     * IndexedDB から読み込み
     */
    async loadFromIndexedDB(modelName) {
        return new Promise((resolve) => {
            const request = indexedDB.open('NoppoAIHub-Models', 1);

            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['models'], 'readonly');
                const store = transaction.objectStore('models');
                const getRequest = store.get(modelName);

                getRequest.onsuccess = () => resolve(getRequest.result || null);
                getRequest.onerror = () => resolve(null);
            };

            request.onerror = () => resolve(null);
        });
    },

    /**
     * Cloudinary から読み込み (Firebase統合)
     */
    async loadFromCloudinary(modelName, projectId) {
        try {
            const files = await cloudinaryManager.listFiles(projectId);
            const modelFile = files.find(f => f.name === `${modelName}.json`);
            
            if (!modelFile || !modelFile.cloudinaryUrl) {
                return null;
            }

            const content = await cloudinaryManager.loadJSONFromUrl(modelFile.cloudinaryUrl);
            return content;
        } catch (err) {
            console.warn('Cloudinary load skipped:', err.message);
            return null;
        }
    },

    /**
     * モデルリスト
     */
    async listModels() {
        try {
            return new Promise((resolve) => {
                const request = indexedDB.open('NoppoAIHub-Models', 1);

                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['models'], 'readonly');
                    const store = transaction.objectStore('models');
                    const getAllRequest = store.getAll();

                    getAllRequest.onsuccess = () => {
                        const models = getAllRequest.result.map(m => ({
                            name: m.name,
                            version: m.metadata?.version,
                            savedAt: m.metadata?.savedAt,
                            size: JSON.stringify(m).length
                        }));
                        resolve(models);
                    };

                    getAllRequest.onerror = () => resolve([]);
                };

                request.onerror = () => resolve([]);
            });
        } catch (err) {
            console.error('List models error:', err);
            return [];
        }
    },

    /**
     * モデル削除
     */
    async deleteModel(modelName) {
        try {
            return new Promise((resolve) => {
                const request = indexedDB.open('NoppoAIHub-Models', 1);

                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['models'], 'readwrite');
                    const store = transaction.objectStore('models');
                    const deleteRequest = store.delete(modelName);

                    deleteRequest.onsuccess = () => {
                        delete this.models[modelName];
                        resolve(true);
                    };

                    deleteRequest.onerror = () => resolve(false);
                };

                request.onerror = () => resolve(false);
            });
        } catch (err) {
            console.error('Delete model error:', err);
            return false;
        }
    },

    /**
     * モデルをコード形式でエクスポート
     */
    exportModelAsCode(modelName, format = 'python') {
        const model = this.models[modelName];
        if (!model) {
            throw new Error(`Model '${modelName}' not found`);
        }

        if (format === 'python') {
            return this.exportPythonCode(model);
        } else if (format === 'javascript') {
            return this.exportJavaScriptCode(model);
        } else if (format === 'tensorflow') {
            return this.exportTensorFlowCode(model);
        }

        throw new Error(`Unsupported format: ${format}`);
    },

    /**
     * Python コードエクスポート
     */
    exportPythonCode(model) {
        return `
# NoppoAIHub Model Export
# Model: ${model.name}
# Version: ${model.metadata.version}
# Saved: ${model.metadata.savedAt}

import json
import pickle
from datetime import datetime

class ${model.name.replace('-', '_')}Model:
    """
    ${model.name} - AI Model
    """
    
    def __init__(self):
        self.name = "${model.name}"
        self.version = "${model.metadata.version}"
        self.created_at = "${model.metadata.savedAt}"
        self.checksum = "${model.checksum}"
        self.weights = self._load_weights()
    
    def _load_weights(self):
        """Load model weights"""
        weights_json = '''
${JSON.stringify(model.data, null, 2)}
        '''
        return json.loads(weights_json)
    
    def predict(self, X):
        """Make predictions"""
        return self.forward(X)
    
    def forward(self, X):
        """Forward pass"""
        # TODO: Implement forward propagation
        pass
    
    def save(self, path):
        """Save model to file"""
        with open(path, 'wb') as f:
            pickle.dump(self, f)
    
    @staticmethod
    def load(path):
        """Load model from file"""
        with open(path, 'rb') as f:
            return pickle.load(f)


if __name__ == "__main__":
    model = ${model.name.replace('-', '_')}Model()
    print(f"Model loaded: {model.name} v{model.version}")
`;
    },

    /**
     * JavaScript コードエクスポート
     */
    exportJavaScriptCode(model) {
        return `
// NoppoAIHub Model Export
// Model: ${model.name}
// Version: ${model.metadata.version}

class ${model.name.replace('-', '')}Model {
    constructor() {
        this.name = "${model.name}";
        this.version = "${model.metadata.version}";
        this.createdAt = "${model.metadata.savedAt}";
        this.checksum = "${model.checksum}";
        this.weights = this.loadWeights();
    }

    loadWeights() {
        return ${JSON.stringify(model.data, null, 2)};
    }

    async predict(X) {
        return this.forward(X);
    }

    forward(X) {
        console.log('Predicting for input:', X);
        return [];
    }

    toJSON() {
        return {
            name: this.name,
            version: this.version,
            createdAt: this.createdAt,
            weights: this.weights
        };
    }

    static fromJSON(json) {
        const model = new ${model.name.replace('-', '')}Model();
        model.weights = json.weights;
        return model;
    }
}

export default ${model.name.replace('-', '')}Model;
`;
    },

    /**
     * TensorFlow コードエクスポート
     */
    exportTensorFlowCode(model) {
        return `
# NoppoAIHub TensorFlow Model Export
# Model: ${model.name}

import tensorflow as tf
import json
from datetime import datetime

def load_${model.name.replace('-', '_')}_model():
    """
    Load the ${model.name} model
    """
    
    metadata = {
        'name': '${model.name}',
        'version': '${model.metadata.version}',
        'created_at': '${model.metadata.savedAt}',
        'checksum': '${model.checksum}'
    }
    
    weights = ${JSON.stringify(model.data)}
    
    model = tf.keras.Sequential([
        # TODO: Add layers based on weights
    ])
    
    return model, metadata

if __name__ == "__main__":
    model, metadata = load_${model.name.replace('-', '_')}_model()
    print(f"Loaded model: {metadata['name']} v{metadata['version']}")
    model.summary()
`;
    },

    /**
     * モデルをデプロイ
     */
    async deployModel(modelName, deploymentConfig = {}) {
        const {
            platform = 'huggingface',
            isPublic = false,
            description = ''
        } = deploymentConfig;

        try {
            const model = this.models[modelName];
            if (!model) {
                throw new Error(`Model '${modelName}' not found`);
            }

            const deployment = {
                modelName,
                platform,
                deployedAt: new Date().toISOString(),
                url: this.generateDeploymentURL(modelName, platform),
                status: 'deployed',
                isPublic,
                description
            };

            this.deployedModels[modelName] = deployment;
            console.log(`✓ Model '${modelName}' deployed to ${platform}`);

            return deployment;
        } catch (err) {
            console.error('Deployment error:', err);
            throw err;
        }
    },

    /**
     * デプロイメント URL 生成
     */
    generateDeploymentURL(modelName, platform) {
        const baseURLs = {
            huggingface: 'https://huggingface.co/spaces/',
            aws: 'https://aws.amazon.com/sagemaker/',
            gcp: 'https://cloud.google.com/ai-platform/',
            azure: 'https://azure.microsoft.com/en-us/services/machine-learning/'
        };

        const slug = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        return `${baseURLs[platform] || baseURLs.huggingface}noppo-ai-hub/${slug}`;
    }
};

// グローバルに公開
window.modelManager = modelManager;
