# 🍳 レシピ管理アプリ（React + TypeScript）

## 概要

このアプリは、料理のレシピと材料を簡単に登録・管理できるフロントエンドアプリケーションです。  
ローカルストレージ（IndexedDB）を利用してオフラインでも動作可能で、今後はクラウド同期にも対応予定です。

---

## ✍ デモURL

https://reciplandb.web.app/

---

## 使用技術

- **React 19**
- **TypeScript**
- **Chakra UI**（UIライブラリ）
- **Dexie.js**（IndexedDBラッパー）
- **uuid**（ID生成）
- **PlantUML**（設計図表記）

---

## 機能一覧（現時点）

- レシピの登録・一覧・削除
- 材料の登録・一覧・削除
- 類義語（シノニム）の登録と、材料との自動マッピング
- 入力補助（前回入力値保持・入力欄のEnterキー追加機能など）
- シーケンス図・クラス図（PlantUML）による設計ドキュメント

---

## 今後の追加予定機能

- 🛒 **材料購入画面**  
  指定日に店舗で購入した材料の数量と価格を記録

- 📝 **献立記録画面**  
  指定日に作る料理の献立を登録（過去～現在日まで指定可能）

- 📊 **チャート画面**  
  指定期間内の消費食材、合計金額などをチャートと表で出力  
  ※過去日～未来日まで指定可能、献立データに基づいて自動算出

- ☁️ **Firebase Firestore + IndexedDB のハイブリッド同期**  
  オフラインでも動作し、接続時にFirestoreと同期

- 🔐 **ユーザー認証（Firebase Auth）**  
  ユーザーごとにデータを管理し、マルチデバイス対応へ

- 🚀 **CI/CD構成の導入**  
  GitHub Actions + Firebase Hosting による自動ビルド＆デプロイ

---

## セットアップ手順

```bash
git clone https://github.com/your-username/recipe-app.git
cd recipe-app
npm install
npm run dev
