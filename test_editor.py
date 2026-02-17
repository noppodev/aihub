#!/usr/bin/env python3
"""
NoppoAIHub エディタテストスクリプト
ブラウザから実行したときに動作確認できるコード
"""

import numpy as np
import time

print("=" * 50)
print("NoppoAIHub Python Test")
print("=" * 50)

# 簡単な計算
print("\n[Test 1] 数値計算")
arr = np.array([1, 2, 3, 4, 5])
print(f"Array: {arr}")
print(f"Mean: {np.mean(arr)}")
print(f"Std: {np.std(arr)}")

# 学習ループシミュレーション
print("\n[Test 2] 機械学習シミュレーション")
np.random.seed(42)
X = np.random.randn(100, 10)
y = np.random.randint(0, 2, 100)

for epoch in range(1, 6):
    # 仮の loss 計算
    loss = 0.5 / epoch + np.random.randn() * 0.01
    acc = 0.5 + 0.1 * epoch + np.random.randn() * 0.02
    
    print(f"Epoch {epoch}: loss: {loss:.4f}, accuracy: {acc:.4f}")
    time.sleep(0.1)

print("\n[Test 3] データ統計")
print(f"X shape: {X.shape}")
print(f"y shape: {y.shape}")
print(f"Classes: {np.unique(y)}")

print("\n" + "=" * 50)
print("✓ All tests completed successfully!")
print("=" * 50)
