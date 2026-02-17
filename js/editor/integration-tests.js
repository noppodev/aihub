/**
 * NoppoAIHub - 統合テストスイート
 */

export const integrationTests = {
    /**
     * 全テストを実行
     */
    async runAllTests() {
        console.log('🧪 NoppoAIHub Integration Tests Starting...\n');

        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };

        // テストセット
        const testSuites = [
            { name: 'Cloudinary Manager', fn: this.testCloudinaryManager },
            { name: 'AutoML Engine', fn: this.testAutoMLEngine },
            { name: 'Code Assistant', fn: this.testCodeAssistant },
            { name: 'Model Manager', fn: this.testModelManager },
            { name: 'Project Setup', fn: this.testProjectSetup },
            { name: 'Training Manager', fn: this.testTrainingManager },
            { name: 'Inspector UI', fn: this.testInspectorUI }
        ];

        for (const suite of testSuites) {
            try {
                const testResults = await suite.fn.call(this);
                results.tests.push({ suite: suite.name, ...testResults });
                results.total += testResults.total;
                results.passed += testResults.passed;
                results.failed += testResults.failed;
            } catch (err) {
                console.error(`❌ ${suite.name} failed:`, err);
                results.failed += 1;
            }
        }

        this.printResults(results);
        return results;
    },

    /**
     * Cloudinary Manager テスト
     */
    async testCloudinaryManager() {
        const tests = [];

        try {
            // Test 1: Config existence
            tests.push({
                name: 'Cloudinary config loaded',
                passed: window.cloudinaryManager && window.cloudinaryManager.uploadFile
            });

            // Test 2: CSV parsing
            const csvText = 'id,name,value\n1,test,100\n2,demo,200';
            const parsed = window.cloudinaryManager.parseCSV(csvText);
            tests.push({
                name: 'CSV parsing works',
                passed: parsed.rows.length === 2 && parsed.headers.length === 3
            });

            // Test 3: Image URL optimization
            const optimizedUrl = window.cloudinaryManager.optimizeImageUrl(
                'https://res.cloudinary.com/noppo-ai/image/upload/v1/test.jpg'
            );
            tests.push({
                name: 'Image URL optimization works',
                passed: optimizedUrl.includes('w_400')
            });

        } catch (err) {
            tests.push({ name: 'Cloudinary Manager', passed: false, error: err.message });
        }

        return {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length
        };
    },

    /**
     * AutoML Engine テスト
     */
    async testAutoMLEngine() {
        const tests = [];

        try {
            // Test 1: Data preparation
            const data = [
                { x: 1, y: 2 },
                { x: 2, y: 4 },
                { x: 3, y: 6 }
            ];
            const prepared = window.automlEngine.prepareData(data, 'y');
            tests.push({
                name: 'Data preparation works',
                passed: prepared.X.length === 3 && prepared.y.length === 3
            });

            // Test 2: Feature normalization
            const normalized = window.automlEngine.normalizeFeatures([[1, 2, 3]]);
            tests.push({
                name: 'Feature normalization works',
                passed: normalized[0][0] >= 0 && normalized[0][0] <= 1
            });

            // Test 3: Score calculation
            const y = [1, 1, 0, 0];
            const predictions = [1, 1, 0, 0];
            const score = window.automlEngine.calculateScore(y, predictions, 'classification');
            tests.push({
                name: 'Score calculation works',
                passed: score === 1.0
            });

        } catch (err) {
            tests.push({ name: 'AutoML Engine', passed: false, error: err.message });
        }

        return {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length
        };
    },

    /**
     * Code Assistant テスト
     */
    async testCodeAssistant() {
        const tests = [];

        try {
            // Test 1: Python completions
            const completions = await window.codeAssistant.getCompletions('import ', 'python');
            tests.push({
                name: 'Python import completions work',
                passed: completions.length > 0
            });

            // Test 2: Error diagnosis
            const diagnosis = window.codeAssistant.diagnosisError(
                "ModuleNotFoundError: No module named 'numpy'",
                ''
            );
            tests.push({
                name: 'Error diagnosis works',
                passed: diagnosis.solutions.length > 0
            });

            // Test 3: Code analysis
            const analysis = window.codeAssistant.analyzeCode('x=1\ny=2\n' + ' '.repeat(100), 'python');
            tests.push({
                name: 'Code analysis detects long lines',
                passed: analysis.issues.length > 0
            });

            // Test 4: Test generation
            const testCode = window.codeAssistant.generateTests('def add(a, b):\n    return a + b', 'python');
            tests.push({
                name: 'Test generation works',
                passed: testCode.includes('unittest') && testCode.includes('def test_add')
            });

        } catch (err) {
            tests.push({ name: 'Code Assistant', passed: false, error: err.message });
        }

        return {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length
        };
    },

    /**
     * Model Manager テスト
     */
    async testModelManager() {
        const tests = [];

        try {
            // Test 1: Model save
            const testModel = { weights: [1, 2, 3], bias: 0.5 };
            const saveResult = await window.modelManager.saveModel('test-model', testModel, {
                accuracy: 0.95
            });
            tests.push({
                name: 'Model save works',
                passed: saveResult.success
            });

            // Test 2: Model list
            const models = await window.modelManager.listModels();
            tests.push({
                name: 'Model list works',
                passed: Array.isArray(models)
            });

            // Test 3: Model export (Python)
            const pythonCode = window.modelManager.exportModelAsCode('test-model', 'python');
            tests.push({
                name: 'Python export works',
                passed: pythonCode.includes('class') && pythonCode.includes('def forward')
            });

            // Test 4: Model delete
            const deleteResult = await window.modelManager.deleteModel('test-model');
            tests.push({
                name: 'Model delete works',
                passed: deleteResult === true
            });

        } catch (err) {
            tests.push({ name: 'Model Manager', passed: false, error: err.message });
        }

        return {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length
        };
    },

    /**
     * Project Setup テスト
     */
    testProjectSetup() {
        const tests = [];

        try {
            // Test 1: Module imports
            tests.push({
                name: 'Project setup module loaded',
                passed: window.projectSetup && window.showProjectSetupWizard
            });

            // Test 2: Template validation (would need actual implementation)
            tests.push({
                name: 'Project setup accessible',
                passed: typeof window.showProjectSetupWizard === 'function'
            });

        } catch (err) {
            tests.push({ name: 'Project Setup', passed: false, error: err.message });
        }

        return {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length
        };
    },

    /**
     * Training Manager テスト
     */
    testTrainingManager() {
        const tests = [];

        try {
            // Test 1: Module loaded
            tests.push({
                name: 'Training manager loaded',
                passed: window.showDatasetSelector && window.datasetManager
            });

            // Test 2: UI function callable
            tests.push({
                name: 'Dataset selector callable',
                passed: typeof window.showDatasetSelector === 'function'
            });

        } catch (err) {
            tests.push({ name: 'Training Manager', passed: false, error: err.message });
        }

        return {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length
        };
    },

    /**
     * Inspector UI テスト
     */
    testInspectorUI() {
        const tests = [];

        try {
            // Test 1: Inspector tabs exist
            const btnFile = document.getElementById('btn-inspector-file');
            const btnDrive = document.getElementById('btn-inspector-drive');
            const btnModels = document.getElementById('btn-inspector-models');

            tests.push({
                name: 'All inspector tabs exist',
                passed: btnFile && btnDrive && btnModels
            });

            // Test 2: Inspector content panel
            const content = document.getElementById('inspector-content');
            tests.push({
                name: 'Inspector content panel exists',
                passed: !!content
            });

            // Test 3: Tab styling
            const hasActiveClass = btnFile?.classList.contains('active');
            tests.push({
                name: 'Active tab styling works',
                passed: hasActiveClass
            });

        } catch (err) {
            tests.push({ name: 'Inspector UI', passed: false, error: err.message });
        }

        return {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length
        };
    },

    /**
     * 結果を表示
     */
    printResults(results) {
        const passRate = ((results.passed / results.total) * 100).toFixed(1);

        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Results');
        console.log('='.repeat(50));

        results.tests.forEach(test => {
            const total = test.total;
            const passed = test.passed;
            const failed = test.failed;
            const icon = failed === 0 ? '✅' : '⚠️';
            console.log(`${icon} ${test.suite}: ${passed}/${total} passed`);
        });

        console.log('='.repeat(50));
        console.log(`\n📈 Overall: ${results.passed}/${results.total} tests passed (${passRate}%)\n`);

        if (results.failed === 0) {
            console.log('🎉 All tests passed! NoppoAIHub is ready to use.\n');
        } else {
            console.log(`⚠️ ${results.failed} tests failed. Please review above.\n`);
        }
    }
};

// 自動実行フラグ
if (window.location.search.includes('test=true')) {
    window.addEventListener('load', () => {
        integrationTests.runAllTests();
    });
}

// グローバル公開
window.integrationTests = integrationTests;
