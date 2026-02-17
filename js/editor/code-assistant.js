/**
 * NoppoAIHub Code Assistant
 * リアルタイムコード補完と AI アシスタント
 */

export const codeAssistant = {
    /**
     * コード補完候補を取得
     */
    async getCompletions(code, language = 'python') {
        const lines = code.split('\n');
        const currentLine = lines[lines.length - 1];
        const context = lines.slice(Math.max(0, lines.length - 10)).join('\n');

        const suggestions = [];

        // 言語別の補完ロジック
        if (language === 'python') {
            suggestions.push(...this.pythonCompletions(currentLine, context));
        } else if (language === 'javascript') {
            suggestions.push(...this.javascriptCompletions(currentLine, context));
        }

        return suggestions.slice(0, 5);
    },

    /**
     * Python 補完
     */
    pythonCompletions(line, context) {
        const suggestions = [];

        // import 補完
        if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
            const imports = [
                { label: 'numpy', detail: 'Numerical computing' },
                { label: 'pandas', detail: 'Data manipulation' },
                { label: 'matplotlib.pyplot', detail: 'Plotting' },
                { label: 'sklearn', detail: 'Machine Learning' },
                { label: 'torch', detail: 'PyTorch' },
                { label: 'tensorflow', detail: 'TensorFlow' },
                { label: 'requests', detail: 'HTTP library' },
                { label: 'json', detail: 'JSON parsing' }
            ];
            return imports.map(imp => ({
                ...imp,
                insertText: imp.label,
                kind: 'Module'
            }));
        }

        // 関数補完
        if (line.includes('df.')) {
            const pandasMethods = [
                { label: 'head()', detail: 'First rows' },
                { label: 'tail()', detail: 'Last rows' },
                { label: 'describe()', detail: 'Statistics' },
                { label: 'shape', detail: 'DataFrame shape' },
                { label: 'columns', detail: 'Column names' },
                { label: 'dtypes', detail: 'Data types' },
                { label: 'fillna()', detail: 'Fill NaN values' },
                { label: 'drop()', detail: 'Drop rows/columns' },
                { label: 'groupby()', detail: 'Grouping' },
                { label: 'apply()', detail: 'Apply function' }
            ];
            return pandasMethods;
        }

        if (line.includes('np.')) {
            const numpyMethods = [
                { label: 'array()', detail: 'Create array' },
                { label: 'zeros()', detail: 'Zero array' },
                { label: 'ones()', detail: 'One array' },
                { label: 'mean()', detail: 'Mean' },
                { label: 'std()', detail: 'Standard deviation' },
                { label: 'reshape()', detail: 'Reshape array' }
            ];
            return numpyMethods;
        }

        // キーワード補完
        const keywords = [
            { label: 'def', detail: 'Define function' },
            { label: 'class', detail: 'Define class' },
            { label: 'if', detail: 'Conditional' },
            { label: 'for', detail: 'Loop' },
            { label: 'while', detail: 'While loop' },
            { label: 'try', detail: 'Exception handling' },
            { label: 'with', detail: 'Context manager' },
            { label: 'lambda', detail: 'Anonymous function' }
        ];

        return keywords;
    },

    /**
     * JavaScript 補完
     */
    javascriptCompletions(line, context) {
        const suggestions = [
            { label: 'const', detail: 'Declare constant', kind: 'Keyword' },
            { label: 'let', detail: 'Declare variable', kind: 'Keyword' },
            { label: 'function', detail: 'Define function', kind: 'Keyword' },
            { label: 'async', detail: 'Async function', kind: 'Keyword' },
            { label: 'await', detail: 'Wait promise', kind: 'Keyword' },
            { label: 'class', detail: 'Define class', kind: 'Keyword' }
        ];

        return suggestions;
    },

    /**
     * コード分析と提案
     */
    analyzeCode(code, language = 'python') {
        const issues = [];
        const suggestions = [];

        if (language === 'python') {
            // PEP 8 スタイルチェック
            const lines = code.split('\n');
            lines.forEach((line, idx) => {
                // 長すぎる行
                if (line.length > 80) {
                    issues.push({
                        line: idx + 1,
                        severity: 'warning',
                        message: 'Line too long (PEP 8: max 79 characters)'
                    });
                }

                // スペースのチェック
                if (line.match(/\s+$/)) {
                    issues.push({
                        line: idx + 1,
                        severity: 'info',
                        message: 'Trailing whitespace'
                    });
                }

                // import のチェック
                if (idx === 0 && !line.includes('#!/')) {
                    if (line.includes('import')) {
                        suggestions.push({
                            line: 1,
                            type: 'docstring',
                            suggestion: 'Add module docstring at the top'
                        });
                    }
                }
            });

            // パフォーマンス提案
            if (code.includes('for') && code.includes('append')) {
                suggestions.push({
                    type: 'performance',
                    suggestion: 'Consider using list comprehension instead of loop + append'
                });
            }

            // セキュリティ警告
            if (code.includes('eval(')) {
                issues.push({
                    severity: 'error',
                    message: '❌ Never use eval() - security risk!'
                });
            }

            if (code.includes('pickle')) {
                suggestions.push({
                    type: 'security',
                    suggestion: '⚠️ pickle can execute arbitrary code. Use joblib or dill instead.'
                });
            }
        }

        return { issues, suggestions };
    },

    /**
     * エラー診断
     */
    diagnosisError(errorMessage, code) {
        const diagnosis = {
            error: errorMessage,
            likely_cause: '',
            solutions: []
        };

        if (errorMessage.includes('ModuleNotFoundError') || errorMessage.includes('ImportError')) {
            const match = errorMessage.match(/No module named '([^']+)'/);
            if (match) {
                diagnosis.likely_cause = `Module '${match[1]}' is not installed`;
                diagnosis.solutions = [
                    { step: 1, action: `pip install ${match[1]}` },
                    { step: 2, action: 'Check spelling' },
                    { step: 3, action: 'Use pip list to verify installation' }
                ];
            }
        }

        if (errorMessage.includes('NameError')) {
            const match = errorMessage.match(/name '([^']+)' is not defined/);
            if (match) {
                diagnosis.likely_cause = `Variable or function '${match[1]}' not defined`;
                diagnosis.solutions = [
                    { step: 1, action: `Check if '${match[1]}' is spelled correctly` },
                    { step: 2, action: 'Ensure it is defined before use' },
                    { step: 3, action: 'Check indentation' }
                ];
            }
        }

        if (errorMessage.includes('TypeError')) {
            diagnosis.likely_cause = 'Incorrect argument type or number of arguments';
            diagnosis.solutions = [
                { step: 1, action: 'Check function signature' },
                { step: 2, action: 'Verify argument types match' },
                { step: 3, action: 'Use help() or ?function to see documentation' }
            ];
        }

        if (errorMessage.includes('IndexError')) {
            diagnosis.likely_cause = 'Index out of range';
            diagnosis.solutions = [
                { step: 1, action: 'Check array/list length' },
                { step: 2, action: 'Use len() to verify size' },
                { step: 3, action: 'Remember Python uses 0-based indexing' }
            ];
        }

        if (errorMessage.includes('KeyError')) {
            const match = errorMessage.match(/KeyError: '([^']+)'/);
            if (match) {
                diagnosis.likely_cause = `Key '${match[1]}' not found in dictionary`;
                diagnosis.solutions = [
                    { step: 1, action: `Check if key '${match[1]}' exists` },
                    { step: 2, action: 'Use .get() method with default value' },
                    { step: 3, action: 'Print dictionary keys to debug' }
                ];
            }
        }

        return diagnosis;
    },

    /**
     * ドキュメント生成
     */
    generateDocumentation(code, language = 'python') {
        const docs = [];

        if (language === 'python') {
            // 関数から自動ドキュメント生成
            const functionRegex = /def\s+(\w+)\s*\((.*?)\):/g;
            let match;

            while ((match = functionRegex.exec(code)) !== null) {
                const [full, funcName, params] = match;
                const paramList = params.split(',').map(p => p.trim());

                docs.push({
                    type: 'function',
                    name: funcName,
                    docstring: `"""
    ${funcName} - [Add description here]
    
    Args:
${paramList.map(p => `        ${p}: [type and description]`).join('\n')}
    
    Returns:
        [type]: [description]
    
    Examples:
        >>> ${funcName}()
    """`
                });
            }

            // クラスから自動ドキュメント生成
            const classRegex = /class\s+(\w+).*?:/g;

            while ((match = classRegex.exec(code)) !== null) {
                const [full, className] = match;
                docs.push({
                    type: 'class',
                    name: className,
                    docstring: `"""
    ${className} - [Add description here]
    
    Attributes:
        [attribute]: [type and description]
    
    Methods:
        [method]: [description]
    """`
                });
            }
        }

        return docs;
    },

    /**
     * テスト生成
     */
    generateTests(code, language = 'python') {
        if (language !== 'python') return '';

        const functionRegex = /def\s+(\w+)\s*\((.*?)\):/g;
        const tests = [];
        let match;

        tests.push('import unittest\nimport sys\n\n');

        while ((match = functionRegex.exec(code)) !== null) {
            const [full, funcName] = match;
            tests.push(`
class Test${funcName.charAt(0).toUpperCase() + funcName.slice(1)}(unittest.TestCase):
    def test_${funcName}(self):
        """Test ${funcName} function"""
        # TODO: Add test cases
        self.assertTrue(True)
`);
        }

        tests.push('\n\nif __name__ == "__main__":\n    unittest.main()');

        return tests.join('');
    }
};

// グローバルに公開
window.codeAssistant = codeAssistant;
