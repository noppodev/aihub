/**
 * NoppoAIHub Visualizer
 * 学習メトリクスをリアルタイムでグラフ化、多数のチャートタイプをサポート
 */

let chart = null;
const MAX_DATA_POINTS = 100;

// メトリクス管理
const metricsData = {
    loss: [],
    accuracy: [],
    val_loss: [],
    val_accuracy: [],
    f1: [],
    epochs: []
};

export async function initChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Canvas with id "${canvasId}" not found`);
        return null;
    }

    const ctx = canvas.getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Training Loss',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: '#ef4444',
                    fill: true,
                    order: 1
                },
                {
                    label: 'Validation Loss',
                    data: [],
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.08)',
                    borderWidth: 2.5,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: '#f97316',
                    fill: false,
                    order: 2
                },
                {
                    label: 'Accuracy',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: '#10b981',
                    fill: true,
                    yAxisID: 'y1',
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            animation: {
                duration: 200
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#64748b',
                        font: { size: 11, weight: 'bold', family: "'JetBrains Mono', monospace" },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(4);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(71, 85, 105, 0.1)',
                        drawTicks: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 },
                        maxRotation: 0
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(71, 85, 105, 0.1)',
                        drawTicks: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 },
                        callback: (value) => value.toFixed(2)
                    },
                    title: {
                        display: true,
                        text: 'Loss',
                        color: '#64748b',
                        font: { weight: 'bold', size: 11 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#10b981',
                        font: { size: 10 },
                        callback: (value) => (value * 100).toFixed(0) + '%'
                    },
                    title: {
                        display: true,
                        text: 'Accuracy',
                        color: '#10b981',
                        font: { weight: 'bold', size: 11 }
                    }
                }
            }
        }
    });

    return chart;
}

/**
 * メトリクスを追加（任意のタイプ）
 */
export function pushMetric(metricData) {
    if (!metricData) return;

    // メトリクスオブジェクトまたは単純な値
    if (typeof metricData === 'number') {
        metricData = { type: 'loss', value: metricData };
    }

    const { type = 'loss', value } = metricData;

    if (typeof value !== 'number' || isNaN(value)) return;

    // メトリクスデータに追加
    if (metricsData[type] !== undefined) {
        metricsData[type].push(value);
    }

    updateChartData();
}

/**
 * チャートデータの更新
 */
function updateChartData() {
    if (!chart) return;

    const maxLen = Math.max(
        metricsData.loss.length,
        metricsData.val_loss.length,
        metricsData.accuracy.length
    );

    chart.data.labels = Array.from({ length: maxLen }, (_, i) => `Epoch ${i + 1}`);
    chart.data.datasets[0].data = metricsData.loss.slice(-MAX_DATA_POINTS);
    chart.data.datasets[1].data = metricsData.val_loss.slice(-MAX_DATA_POINTS);
    chart.data.datasets[2].data = metricsData.accuracy.slice(-MAX_DATA_POINTS);

    chart.update('none');
}

export function clearChart() {
    if (chart) {
        chart.data.labels = [];
        chart.data.datasets.forEach(ds => ds.data = []);
        chart.update();
    }
    
    Object.keys(metricsData).forEach(key => {
        metricsData[key] = [];
    });
}

/**
 * メトリクスデータを取得
 */
export function getMetricsData() {
    return { ...metricsData };
}