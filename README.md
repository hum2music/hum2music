# Hum2Music

**鼻歌から始まる、非生成AI・音楽理論ベースの自動作編曲エンジン**

Hum2Musicは、ユーザーが入力した鼻歌からメロディーを抽出し、音楽理論・信号処理・演奏特性に基づいて、複数の楽器による楽曲を自動生成するローカルアプリケーションです。

既存の生成AIによる音楽生成とは異なり、処理を可能な限り決定的・説明可能なアルゴリズムで構築することを目指しています。

> 音楽理論で正しい音楽を作り、人間らしさで意図的に崩す。

楽譜を読めない人でも、鼻歌だけで楽曲制作を始められることを目指します。

## ドキュメント

- [PRD.md](./PRD.md) — プロダクト要求定義（コンセプト・スコープ・MVP要件）
- [docs/](./docs) — 実装レベルの詳細仕様（git submodule、[hum2music/docs](https://github.com/hum2music/docs)）
  - [docs/specs/](https://github.com/hum2music/docs/tree/main/specs) — 各エンジン（音響解析・和声・編曲・ドラム・表現・出力）の技術仕様

## プロダクト原則

1. **Non-Generative AI First** — 機械学習モデルを使用せず、信号処理・音楽理論・ルールベースの生成を基本とする
2. **Human Imperfection** — 人間の音程変化・タイミング・強弱を失わない
3. **Explainability** — 各コード・音符・演奏パターンの採用理由を説明可能にする
4. **Instrument Awareness** — 楽器ごとの演奏可能性と特性を尊重する
5. **Local First** — インターネット接続なしで主要機能が動作する
6. **Modularity** — 音響解析・和声・編曲・表現生成・レンダリングを独立させる
7. **Non-destructive** — 元の音声と抽出データは保持し、何度でも異なる編曲を生成できる

詳細は [PRD.md §1.3](./PRD.md#13-プロダクト原則) を参照してください。

## 技術スタック

- 言語：TypeScript
- ランタイム：Bun（Node.js互換性も考慮）
- 構成：Bun workspaceによるモノレポ（[docs/specs/architecture.md](https://github.com/hum2music/docs/blob/main/specs/architecture.md) 参照）

## このリポジトリの構成

```text
hum2music/
├── PRD.md       # プロダクト要求定義（正）
├── apps/        # CLI / (将来) Web UI
├── packages/    # 音響解析・音楽理論・和声・MIDI等の各パッケージ
├── fixtures/    # テスト用の合成音声生成
├── tests/       # 自動テスト
├── docs/        # 詳細仕様（submodule, public）
└── tasks/       # タスク・進捗管理（submodule, private）
```

`docs`はsubmoduleのため、`git clone`時は `--recurse-submodules` を付けるか、クローン後に `git submodule update --init` を実行してください。`tasks`は非公開リポジトリのため、権限のない環境では取得できません（アプリケーション本体の動作には不要です）。

```bash
git clone --recurse-submodules https://github.com/hum2music/hum2music.git
bun install
bun apps/cli/src/index.ts transcribe <input.wav> -o <output.mid>
```

## コントリビュート

Issueやディスカッションでのフィードバックを歓迎します。

## License

[Apache License 2.0](./LICENSE)
