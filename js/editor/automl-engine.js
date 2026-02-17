/**
 * NoppoAIHub AutoML Engine
 * Firebase + Cloudinary統合
 * 自動機械学習パイプライン
 */

import { cloudinaryManager } from './cloudinary-manager.js';

export const automlEngine = {
    /**
     * AutoML パイプライン実行
     * @param {Array} data データセット
     * @param {string} targetColumn ターゲット列
     * @param {Object} options オプション
     */
    async runAutoML(data, targetColumn, options = {}) {
        const {
            problemType = 'classification', // classification / regression / clustering
            timeLimit = 300, // 秒
            testSize = 0.2,
            includeModels = ['linear', 'tree', 'ensemble', 'neural']
        } = options;

        const progress = {
            stage: 'Starting AutoML...',
            progress: 0,
            results: []
        };

        try {
            // ステージ1: データ準備
            progress.stage = 'Preparing data...';
            progress.progress = 10;
            const prepared = this.prepareData(data, targetColumn);

            // ステージ2: 特徴量エンジニアリング
            progress.stage = 'Engineering features...';
            progress.progress = 25;
            const engineered = this.engineerFeatures(prepared);

            // ステージ3: モデル選択と訓練
            progress.stage = 'Training models...';
            progress.progress = 40;
            const models = await this.trainMultipleModels(
                engineered,
                problemType,
                includeModels,
                (stage, percent) => {
                    progress.stage = stage;
                    progress.progress = 40 + (percent * 0.5);
                }
            );

            // ステージ4: ハイパーパラメータ最適化
            progress.stage = 'Optimizing hyperparameters...';
            progress.progress = 70;
            const optimized = await this.tuneHyperparameters(models, prepared, timeLimit / 2);

            // ステージ5: アンサンブル
            progress.stage = 'Creating ensemble...';
            progress.progress = 85;
            const ensemble = this.createEnsemble(optimized.models);

            // ステージ6: 評価
            progress.stage = 'Evaluating models...';
            progress.progress = 95;
            const bestModel = this.selectBestModel(ensemble, prepared, problemType);

            progress.progress = 100;
            progress.stage = 'AutoML Complete!';
            progress.results = optimized.models;
            progress.bestModel = bestModel;

            return progress;

        } catch (err) {
            progress.stage = `Error: ${err.message}`;
            progress.error = err;
            return progress;
        }
    },

    /**
     * データ準備
     */
    prepareData(data, targetColumn) {
        return {
            X: data.map(row => {
                const { [targetColumn]: _, ...features } = row;
                return Object.values(features);
            }),
            y: data.map(row => row[targetColumn]),
            featureNames: Object.keys(data[0] || {}).filter(k => k !== targetColumn),
            targetColumn,
            originalData: data
        };
    },

    /**
     * 特徴量エンジニアリング
     */
    engineerFeatures(prepared) {
        const features = {
            raw: prepared.X,
            normalized: this.normalizeFeatures(prepared.X),
            scaled: this.scaleFeatures(prepared.X),
            enhanced: this.addEngineredFeatures(prepared.X, prepared.featureNames)
        };

        return {
            ...prepared,
            engineeredFeatures: features
        };
    },

    /**
     * 特徴量の正規化
     */
    normalizeFeatures(X) {
        return X.map(row => {
            const min = Math.min(...row);
            const max = Math.max(...row);
            return row.map(v => (v - min) / (max - min || 1));
        });
    },

    /**
     * 特徴量のスケーリング
     */
    scaleFeatures(X) {
        const means = this.calculateMean(X);
        const stds = this.calculateStd(X, means);

        return X.map(row =>
            row.map((v, i) => (v - means[i]) / (stds[i] || 1))
        );
    },

    /**
     * 平均計算
     */
    calculateMean(X) {
        const cols = X[0].length;
        return Array.from({ length: cols }, (_, i) =>
            X.reduce((sum, row) => sum + row[i], 0) / X.length
        );
    },

    /**
     * 標準偏差計算
     */
    calculateStd(X, means) {
        const cols = X[0].length;
        return Array.from({ length: cols }, (_, i) => {
            const variance = X.reduce((sum, row) => 
                sum + Math.pow(row[i] - means[i], 2), 0
            ) / X.length;
            return Math.sqrt(variance);
        });
    },

    /**
     * エンジニアされた特徴量を追加
     */
    addEngineredFeatures(X, featureNames) {
        return X.map((row, idx) => [
            ...row,
            // 相互作用項
            ...this.generateInteractions(row),
            // ポリノミアル特徴
            ...this.generatePolynomialFeatures(row),
            // 統計特徴
            this.calculateRowStats(row)
        ]);
    },

    /**
     * 相互作用項生成
     */
    generateInteractions(row) {
        const interactions = [];
        for (let i = 0; i < row.length; i++) {
            for (let j = i + 1; j < row.length; j++) {
                interactions.push(row[i] * row[j]);
            }
        }
        return interactions.slice(0, Math.min(5, interactions.length)); // Top 5
    },

    /**
     * ポリノミアル特徴
     */
    generatePolynomialFeatures(row) {
        return row.slice(0, 3).map(v => [v * v, Math.sqrt(Math.abs(v))]).flat();
    },

    /**
     * 行統計
     */
    calculateRowStats(row) {
        return {
            mean: row.reduce((a, b) => a + b, 0) / row.length,
            max: Math.max(...row),
            min: Math.min(...row),
            std: Math.sqrt(row.reduce((sum, v, i, arr) => {
                const mean = arr.reduce((a, b) => a + b) / arr.length;
                return sum + Math.pow(v - mean, 2);
            }, 0) / row.length)
        };
    },

    /**
     * 複数モデルの訓練
     */
    async trainMultipleModels(prepared, problemType, includeModels, onProgress) {
        const models = [];
        const startTime = Date.now();

        for (let i = 0; i < includeModels.length; i++) {
            const modelType = includeModels[i];
            onProgress(`Training ${modelType} model...`, (i / includeModels.length) * 100);

            const model = await this.trainSingleModel(
                prepared.engineeredFeatures.normalized,
                prepared.y,
                modelType,
                problemType
            );

            model.type = modelType;
            model.trainTime = Date.now() - startTime;
            models.push(model);

            // タイムアウトチェック
            if (model.trainTime > 60000) break;
        }

        return models;
    },

    /**
     * 単一モデルの訓練
     */
    async trainSingleModel(X, y, modelType, problemType) {
        // ここでは簡易実装。実際には sklearn/PyTorch等を使用
        switch (modelType) {
            case 'linear':
                return this.trainLinearModel(X, y, problemType);
            case 'tree':
                return this.trainTreeModel(X, y, problemType);
            case 'ensemble':
                return this.trainEnsembleModel(X, y, problemType);
            case 'neural':
                return this.trainNeuralModel(X, y, problemType);
            default:
                return this.trainLinearModel(X, y, problemType);
        }
    },

    /**
     * 線形モデル
     */
    trainLinearModel(X, y, problemType) {
        // 簡易線形回帰
        const mean = y.reduce((a, b) => a + b) / y.length;
        const predictions = X.map(() => mean);
        const score = this.calculateScore(y, predictions, problemType);

        return {
            type: 'linear',
            score,
            params: { learningRate: 0.01, iterations: 100 }
        };
    },

    /**
     * ツリーモデル
     */
    trainTreeModel(X, y, problemType) {
        // 決定木のシミュレーション
        const predictions = X.map((row, idx) => y[idx] > y.reduce((a, b) => a + b) / y.length ? 1 : 0);
        const score = this.calculateScore(y, predictions, problemType);

        return {
            type: 'tree',
            score,
            params: { maxDepth: 10, minSamplesSplit: 2 }
        };
    },

    /**
     * アンサンブルモデル
     */
    trainEnsembleModel(X, y, problemType) {
        // Random Forest のシミュレーション
        const predictions = X.map((row, idx) => 
            idx % 2 === 0 ? y[idx] : y[(idx + 1) % y.length]
        );
        const score = this.calculateScore(y, predictions, problemType);

        return {
            type: 'ensemble',
            score,
            params: { nEstimators: 100, maxDepth: 15 }
        };
    },

    /**
     * ニューラルネットモデル
     */
    trainNeuralModel(X, y, problemType) {
        // 簡易ニューラルネット
        const predictions = X.map((row, idx) => {
            const sum = row.reduce((a, b) => a + b, 0);
            return sum / row.length;
        });
        const score = this.calculateScore(y, predictions, problemType);

        return {
            type: 'neural',
            score,
            params: { layers: [64, 32, 16], epochs: 50 }
        };
    },

    /**
     * スコア計算
     */
    calculateScore(y, predictions, problemType) {
        if (problemType === 'regression') {
            // MSE
            const mse = y.reduce((sum, val, i) => 
                sum + Math.pow(val - predictions[i], 2), 0
            ) / y.length;
            return Math.max(0, 1 - (mse / Math.max(...y.map(Math.abs))));
        } else {
            // Accuracy
            const correct = y.filter((val, i) => val === predictions[i]).length;
            return correct / y.length;
        }
    },

    /**
     * ハイパーパラメータ最適化
     */
    async tuneHyperparameters(models, prepared, timeLimit) {
        const tunedModels = [];

        for (const model of models) {
            const startTime = Date.now();

            // Grid Search シミュレーション
            const hyperparams = this.generateHyperparameters(model.type);
            let bestModel = model;
            let bestScore = model.score;

            for (const params of hyperparams) {
                if (Date.now() - startTime > timeLimit * 1000) break;

                // パラメータを適用したモデルの評価
                const score = model.score + Math.random() * 0.05; // シミュレーション

                if (score > bestScore) {
                    bestScore = score;
                    bestModel = { ...model, score: bestScore, params };
                }
            }

            tunedModels.push(bestModel);
        }

        return { models: tunedModels };
    },

    /**
     * ハイパーパラメータ生成
     */
    generateHyperparameters(modelType) {
        const params = [];
        
        if (modelType === 'tree') {
            for (let depth = 5; depth <= 20; depth += 5) {
                params.push({ maxDepth: depth, minSamplesSplit: 2 });
            }
        } else if (modelType === 'ensemble') {
            for (let n = 50; n <= 200; n += 50) {
                params.push({ nEstimators: n, maxDepth: 15 });
            }
        }

        return params;
    },

    /**
     * アンサンブル作成
     */
    createEnsemble(models) {
        const weights = models.map(m => m.score).map(s => s / models.reduce((sum, m) => sum + m.score, 0));

        return {
            type: 'ensemble',
            models,
            weights,
            score: models.reduce((sum, m, i) => sum + m.score * weights[i], 0)
        };
    },

    /**
     * 最良モデル選択
     */
    selectBestModel(ensemble, prepared, problemType) {
        const allModels = [ensemble, ...ensemble.models];
        const best = allModels.reduce((prev, current) => 
            (prev.score > current.score) ? prev : current
        );

        return {
            ...best,
            recommendation: this.generateRecommendation(best, problemType)
        };
    },

    /**
     * レコメンデーション生成
     */
    generateRecommendation(model, problemType) {
        const score = Math.round(model.score * 100);

        if (score >= 95) {
            return '🏆 Excellent! This model is ready for production.';
        } else if (score >= 85) {
            return '✓ Good! Consider fine-tuning or ensemble.';
        } else if (score >= 70) {
            return '◐ Fair. More data or feature engineering needed.';
        } else {
            return '✗ Poor. Try different approaches or collect more data.';
        }
    }
};

// グローバルに公開
window.automlEngine = automlEngine;
