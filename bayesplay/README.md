# BayesPlay

BayesPlay は、ベイズ統計学を「触って更新を追う」ための StatPlay 派生コンテンツです。既存の StatPlay 本体が統計トピックを横断的に扱うのに対して、このディレクトリではベイズ統計だけに集中し、事前分布、尤度、事後分布、予測、縮約、階層ベイズの入口を段階的に可視化する。

現フェーズでは、`index.html` を目次ページとし、`lab-01.html` から `lab-07.html` までを個別ラボページとして実装している。ローカル HTTP サーバーで確認する。

## 設計資料

- [プロダクト設計](docs/product-design.md)
- [コンテンツマップ](docs/content-map.md)
- [実装計画](docs/implementation-plan.md)

## 初期方針

- 各ラボは、グラフの前に「何を見ているか」、グラフの後に「何が分かればよいか」を置く。
- 既存の `../topics/bayes.html` は、検査・陽性的中率の例として残す。
- BayesPlay では、より一般的なベイズ推定の学習導線を作る。
- フレームワークは追加せず、Vanilla JS + Canvas 2D + CSS で進める。
- 初期は日本語のみ。ただし後から日英切替できる構成を前提にする。

## 想定する公開形

初期案:

- ローカル開発: `projects/statplay/bayesplay/index.html`
- ラボページ: `projects/statplay/bayesplay/lab-01.html` から `lab-07.html`
- 将来公開: `https://statplay.sasailab.com/bayesplay/`
- StatPlay 本体からは、既存 Bayes トピックまたは関連コラムから導線を張る。

本体の `content/topics.json`、`sw.js`、`sitemap.xml` への接続は、実装が一定品質に達してから行う。

## Git 管理と公開方針

BayesPlay は StatPlay リポジトリ内で Git 管理する。ただし、正式公開までは StatPlay 本体の本番デプロイ対象に含めない。

- `scripts/minify.mjs` の `EXCLUDE_DIRS` に `bayesplay` を入れ、`dist/bayesplay/` が生成されないようにする。
- `/bayesplay/` として公開する段階でのみ、この除外を外す。
- 除外を外す前に、canonical、sitemap、robots、Service Worker、StatPlay 本体からの導線をまとめて確認する。
