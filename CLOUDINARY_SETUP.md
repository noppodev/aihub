# Cloudinary セットアップガイド

## 現在の状態
- Cloud Name: `noppo-ai` ✓
- エラー: **401 Unauthorized** - upload_presetが正しく設定されていない

## 修正手順

### 1. Cloudinaryダッシュボードで Unsigned Upload Preset を作成

**アクセス:** https://cloudinary.com/console

#### ステップ1: Upload Presets に移動
1. ダッシュボード → **Settings** → **Upload**
2. **Upload presets** セクション

#### ステップ2: Unsigned Upload Preset を作成
1. 右上の **+ Add upload preset** をクリック
2. **Name:** `noppo-ai-hub` (または任意の名前)
3. **Signing Mode:** `Unsigned` ⚠️ 重要：署名なしを選択
4. **Folder:** `noppo-ai-hub` (省略可能)
5. **Save** をクリック

#### ステップ3: upload_preset を確認
作成後、presetの名前を確認します（例: `noppo-ai-hub`）

### 2. コード内の設定を更新

**ファイル:** `js/editor/cloudinary-manager.js`

```javascript
const CLOUDINARY_CONFIG = {
    cloud_name: 'noppo-ai',          // Cloudinary Dashboard から確認
    upload_preset: 'noppo-ai-hub',   // 上記で作成した preset name
};
```

### 3. セキュリティ設定（オプション）

Unsigned upload で許可する操作を制限：

- **Media restrictions:** ファイルタイプの制限（例: 画像のみ）
- **Max file size:** 最大ファイルサイズ（例: 100MB）
- **Auto-rename:** ファイル名の自動リネーム

## トラブルシューティング

### 401 Unauthorized エラーが続く場合

**原因:**
- ✗ upload_preset が `Signed mode` になっている
- ✗ preset name が間違っている
- ✗ Cloud Name が間違っている

**解決策:**
```bash
# ブラウザのコンソールで確認
console.log('Cloudinary Config:', {
    cloud_name: 'noppo-ai',
    upload_preset: 'noppo-ai-hub'
});
```

### アップロード後にファイルが表示されない

**原因:** Firebase metadata が保存されていない

**確認:**
1. Cloudinary ダッシュボード → **Media Library** で確認
2. Firebase Firestore → `artifacts/noppo-drive-ultimate/public/data/items` を確認

## リファレンス

- [Cloudinary Unsigned Uploads](https://cloudinary.com/documentation/upload_widget#unsigned_uploads)
- [Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
