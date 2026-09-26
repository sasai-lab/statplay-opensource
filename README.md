# StatPlay

Current version: **v4.0.4** · [Live site / 公開サイト](https://statplay.sasailab.com/)

**JA** | 参考書の数式で止まった——そんな統計学習者のための、直感を取り戻す可視化ラボ。スライダーを動かすと、式の意味が絵で見えてくる。式が見えたら、参考書に戻ってください。
**EN** | A visualization lab for statistics learners who got stuck at the formulas in a textbook. Move a slider and the meaning behind the equation comes into view — then go back to the textbook.

インタラクティブに触って理解する、サイバーパンク調の統計学習ビジュアライザ。
A cyberpunk-themed interactive visualizer for learning statistics by doing.

- バニラ JS + Canvas 2D のみ。ランタイム依存ゼロ / Zero runtime dependencies
- 日英バイリンガル / Bilingual JA ⇄ EN
- ダーク（サイバーパンク）& ライトモード対応 / Dark & light theme
- PWA — オフラインで動作 / Works offline
- 検索エンジンが各トピックを個別にインデックスできる per-page 構成（sitemap / hreflang / JSON-LD 付き）

## v4.0.4

- 教材ガイドの日英差分を編集元として明示し、トピックページの生成元と公開HTMLを分離。
- 無変更ビルドでファイル時刻を維持し、配布版のPWA更新とアクセシビリティを実ブラウザで確認。
- 任意のオフライン資産が1件取得できなくても、Service Worker全体の更新が止まらないよう修正。

Version 4.0.4 clarifies the editable sources for topic guides and pages, keeps no-op builds stable, and strengthens offline updates and accessibility checks.

## v4.0.3

- MathPlay を StatPlay の中から開ける数学ラボとして追加。偏微分の曲面で点を動かし、2方向の坂から接平面と最小二乗法までたどれます。
- BayesPlay と MathPlay のナビゲーション・フッターを本体に合わせ、公開するラボの登録と検査を整備。
- ベイズの個別ページにあった陽性的中率の誤記を、日英とも 1.94%／92.96% に訂正。

Version 4.0.3 adds MathPlay's interactive partial-derivative lab to StatPlay.
The shared navigation now links to MathPlay. Both Bayes topic pages have corrected positive predictive values.

## v4.0.2

- BayesPlay全7ラボの重複する説明を短くし、操作とグラフを中心に読める構成へ整理。
- 指示調の文言を、山・点・区間がどう変わるかを具体的に伝える説明へ修正。数値やモデルの前提は維持。
- StatPlayのベイズのコーナーとBayesPlayを、既存の関連リンクのスタイルで相互に接続。

Version 4.0.2 streamlines the explanations across all seven BayesPlay labs and describes changes in the graphs in plain language. Related links connect BayesPlay with StatPlay’s Bayes topic.

## v4.0.0

- ベイズ統計を触って学ぶBayesPlayを、StatPlay共通ヘッダーから開ける7つのラボとして公開。
- 成功・失敗による更新、未来の予測、観測数の違い、平均・発生率の推定、縮約をグラフで比較。
- アニメーション中の操作と数値を同期し、区間図の段階表示と狭い分布の描画精度を改善。
- ラボの説明を、具体的な問いと図の変化を中心に整理。
- 公開ページの検索用情報、全依存を含むオフライン対応、CSS・JavaScriptの版管理を追加。専用UI検査と配布物検査をCIに接続。

Version 4.0.0 introduces BayesPlay: seven Japanese-language labs within StatPlay, covering Bayesian updating, prediction, and pooling. It also improves graph behavior, page descriptions, offline support, and release checks.

## v3.15.1

- 共通ヘッダーのテンプレート・ナビ定義・テーマと言語の操作を統一。
- ヘッダー直下の余白を共通化し、縦長の画面でヒーローが広がりすぎる問題を修正。
- 長いセクションが表示されない問題と、狭い画面で表やリンクがはみ出す問題を修正。
- 日英の多変量解析コラムを含め、READMEのページ一覧と開発手順を更新。

This patch unifies the shared header and page spacing, keeps hero sections compact on tall screens, fixes hidden long sections and narrow-screen overflow, and updates the documentation for all 16 topics and 7 columns.

## Demo

ローカル HTTP サーバを立てて `index.html` を開くと確認できます。起動時のビルドやパッケージのインストールは不要です（ES modules を使用するので `file://` 直開きではなく HTTP 配信が必要）。数式表示のKaTeXなど、一部のリソースは外部から読み込みます。アクセス解析については [プライバシーポリシー](privacy.html) を参照してください。

Start a local HTTP server and open `index.html`; no build or package installation is needed. ES modules require HTTP — `file://` won't work. Some resources, including KaTeX for equations, load from external services. See the [privacy policy](en/privacy.html) for analytics details.

```bash
python3 -m http.server 8080
# → http://localhost:8080/
```

GitHub Pages にそのまま置いても動作します（`Settings → Pages → main / root`）。
Also works out of the box on GitHub Pages (`Settings → Pages → main / root`).

## Topics / トピック一覧

| #  | Slug       | JA | EN |
|----|------------|----|----|
| 1  | `stdnorm`  | 標準正規分布 | Standard Normal Distribution |
| 2  | `normal`   | 正規分布と標準化（μ・σ の役割） | Normal Distribution & Standardization |
| 3  | `prob`     | 確率の基本法則（ベン図） | Probability Rules (Venn Diagrams) |
| 4  | `bayes`    | ベイズ定理（陽性的中率） | Bayes' Theorem (Positive Predictive Value) |
| 5  | `morep`    | 二項分布・ポアソン分布・指数分布 | Binomial, Poisson & Exponential Distributions |
| 6  | `clt`      | 中心極限定理 | Central Limit Theorem |
| 7  | `lln`      | 大数の法則 | Law of Large Numbers |
| 8  | `ci`       | 信頼区間（95% の意味） | Confidence Intervals (What 95% Really Means) |
| 9  | `test`     | 仮説検定（p 値・α・棄却域） | Hypothesis Testing (Reject Regions & p-values) |
| 10 | `proptest` | 母比率の検定と推定 | Proportion Testing & Estimation |
| 11 | `dists`    | t 分布・χ² 分布・F 分布 | The Three Test Distributions (t, χ², F) |
| 12 | `chitest`  | カイ二乗検定（適合度・独立性） | Chi-Squared Test (Goodness-of-Fit & Independence) |
| 13 | `anova`    | 分散分析（ANOVA） | One-Way ANOVA |
| 14 | `corr`     | 相関係数（散布図と r） | Correlation (r Through Scatter Plots) |
| 15 | `reg`      | 単回帰分析（最小二乗法） | Simple Linear Regression (OLS Visualized) |
| 16 | `mreg`     | 重回帰分析（いくつかの変数から予測する） | Multiple Regression (Predicting with Several Variables) |

### Columns / コラム

| Slug | JA | EN |
|------|----|----|
| `deviation`         | 偏差値って何？ | What Is Hensachi? — Japan's School Score Is a Rescaled z-Score |
| `birthday`          | 誕生日のパラドックス（23 人で 50% 超え？） | The Birthday Paradox — 23 People, 50%+ Chance |
| `standardization`   | 標準化って何？（「ふつう」を比べる翻訳機） | What Is Standardization? — The Universal Translator for "Normal" |
| `income_prediction` | あなたの年収は、統計でどこまで当てられるか | How Far Can Statistics Predict Your Income? |
| `error_types`       | 第一種・第二種の過誤って何が違うの？ | Type I vs Type II Errors — One 2×2 Table Sorts It Out |
| `se_vs_sd`          | 標準偏差と標準誤差の違い（1 枚の絵で見分ける） | Standard Deviation vs Standard Error — SD and SE in One Picture |
| `multivariate_analysis` | [多変量解析でできること](columns/multivariate_analysis.html) | [What Can Multivariate Analysis Do?](en/columns/multivariate_analysis.html) |

統計表（標準正規分布表 / t 表 / χ² 表 / F 表）は `tables/index.html`（JA）と `en/tables/index.html`（EN）。

### BayesPlay / ベイズ統計ラボ

成功・失敗を加えると分布はどう変わるか。更新後の不確実性は、次の結果にどう表れるか。[BayesPlay](bayesplay/README.md)では、更新・予測・縮約を7つのラボで試せます。StatPlayとヘッダー、About、テーマ設定を共有し、ラボ本文は日本語です。

[BayesPlayを開く](https://statplay.sasailab.com/bayesplay/)。ローカルでは `http://localhost:8080/bayesplay/index.html` から確認できます。Lab 07は部分プーリングの概念図で、階層モデルの事後分布を計算するものではありません。

BayesPlay is a Japanese-language set of seven labs for Bayesian updating, prediction, and shrinkage. It shares StatPlay's header and theme settings. It is available on the live site and locally. Lab 07 illustrates partial pooling; it does not fit a full hierarchical model.

## Project Structure / プロジェクト構成

```
index.html                    Hub page / ハブページ
about.html  en/about.html      About page (JA / EN)
privacy.html  en/privacy.html  Privacy policy (JA / EN)
topics/<slug>.html             Per-topic pages (JA) × 16
en/topics/<slug>.html          Per-topic pages (EN) × 16
columns/<slug>.html            Columns (JA) × 7
en/columns/<slug>.html         Columns (EN) × 7
tables/index.html              Statistical tables (JA)
en/tables/index.html           Statistical tables (EN)
bayesplay/                     Bayesian statistics labs (JA)
  index.html                   Lab overview and interactive update example
  lab-01.html … lab-07.html    Seven labs
  README.md                    Setup, features, and model assumptions
css/
  stat_cyber.css               Stylesheet (dark + light) / スタイルシート
  multivariate.css             Multivariate column styles
js/
  main.js                      Entry point (type="module") / エントリポイント
  utils.js                     Shared utilities ($, TAU, normCDF, drawGrid, …)
  katex-render.js              KaTeX math rendering
  modules/
    ├── Topics ────────────────────────────────────
    stdnorm.js  normal.js  prob.js  bayes.js  morep.js
    clt.js  lln.js  ci.js  htest.js  proptest.js
    dist.js  dist_t.js  dist_chi2.js  dist_f.js
    chitest.js  chitest_common.js  chitest_gof.js  chitest_independence.js
    anova.js  corr.js  reg.js  mreg.js  errs.js  descriptive.js
    ├── Columns ───────────────────────────────────
    deviation.js  birthday.js  income_prediction.js  error_types.js  se_vs_sd.js
    multivariate.js  multivariate-model.js  multivariate-pca.js
    multivariate-hero.js  multivariate-motion.js  multivariate-i18n.js
    ├── UI / Infra ────────────────────────────────
    hero.js  theme.js  prefs.js  nav.js  toc.js  anchor.js
    reveal.js  autorun.js  scrolltop.js  tables.js  graphDrag.js
    a11y.js  pwa.js  version.js  lang.js  share.js  urlParams.js
    site-shell.js  column-shell.js   Shared navigation, preferences, and column controls
content/
  topics.json                  Master metadata for all topics & columns (single source of truth)
  partials/                     Reusable content blocks injected at build time
    column_header.html         Shared header template for every page
scripts/
  build_topics.py              Per-topic build (pages + sitemap.xml + robots.txt + sw.js slugs)
  build_columns.py             JA / EN multivariate column build
  site_header.py               Shared header assembly from topics.json + template
  bump_version.py              Version bump (package.json + version.js)
  minify.mjs                   Minify JS/CSS into dist/
  test_routing.mjs             jsdom: routing / SEO / structure
  test_math.mjs                jsdom: math-function precision
  test_a11y_map.mjs  test_a11y_canvas.mjs  test_a11y_aria.mjs   jsdom a11y checks
  test_content_guards.mjs      jsdom: prose-tone regression guards
  test_cf_function.mjs         CloudFront viewer-request function tests
  test_site_shell.mjs          Shared navigation, language, theme, and production links
  test_multivariate_*.mjs      Multivariate math, motion, and controls
  test_seo.py                  Metadata, sitemap, and internal links
  test_layout.mjs              Playwright: computed-CSS layout tests
  test_a11y.mjs                axe-core accessibility scan
  test_e2e.mjs                 Playwright end-to-end smoke tests
  publish_opensource.sh        Push a release to the public repo
icons/                         PWA icons (192 / 512 / maskable)
sw.js                          Service Worker (precache + runtime cache)
manifest.webmanifest           PWA manifest
sitemap.xml  robots.txt        Updated by build_topics.py
```

## Development / 開発

以下は開発用リポジトリの手順です。OSSリポジトリでは表示用のソースを公開しており、ビルド・検証用スクリプトは含めていません。

The commands below apply to the development repository. The OSS repository contains the site source for local viewing, without the internal build and test scripts.

ヘッダーは `content/partials/column_header.html` と `content/topics.json` を編集し、`scripts/build_topics.py` で各ページへ反映します。ヘッダーの編集箇所は、この共通テンプレートと定義ファイルです。ヘッダーの高さと本文までの余白は `css/stat_cyber.css` の共通変数で管理します。

Edit the shared header template and metadata, then rebuild to update every page. Header height and content spacing are defined centrally in `css/stat_cyber.css`.

```bash
# Install development dependencies (not required just to view the site)
npm ci
python3 -m pip install beautifulsoup4 lxml
npx playwright install chromium

# Dev server (ES modules require HTTP)
python3 -m http.server 8080

# Lint
npm run lint

# Build (per-topic pages + sitemap + robots + content-derived SW cache)
npm run build
# If `python` is unavailable: python3 scripts/build_topics.py
python3 scripts/build_topics.py --check  # detect stale generated files without writing

# Tests
npm run test              # routing, math, a11y maps, content, shared shell, and SEO
npm run test:layout       # Playwright layout tests
npm run test:a11y         # axe-core accessibility scan
npm run test:e2e          # Playwright end-to-end smoke tests
npm run test:bayesplay    # BayesPlay math and browser checks

# Full CI pipeline (lint, build, math, layout, a11y, E2E, BayesPlay, production output)
npm run ci
# If pages were built with a specific domain, verify that exact build before deploying
npm run verify:built

# Production build (build + minify → dist/)
npm run build:prod
node scripts/test_site_shell.mjs --dist   # Check production links and draft exclusion

# Version bump
npm run bump              # auto-detect level from commit messages
npm run bump -- --level patch   # explicit level
```

Requires Node >= 20 and Python 3 for builds and SEO checks. Dev dependencies: `eslint`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `terser`, `clean-css-cli`, `beautifulsoup4`, and `lxml`.

### Adding a lesson or column

Register topics, columns, navigation and published experiences in `content/topics.json`. For bilingual content, add both paths and the corresponding HTML. Existing topic-page editorial bodies live in `content/topic_sources/{ja,en}/`; `topics/` and `en/topics/` are generated outputs. A new topic may be bootstrapped from the hub section, but if it has page-only partials, create its editable topic source with the required `@panel` slots before building. A new topic also needs a lazy widget entry in `js/main.js`; `test_catalog_contract.mjs` detects a missing entry.

Source-backed columns declare `styles`, `module`, `body_class` and `source_dependencies` in the catalog. Shared experiment guides come from the hub. Intentional page-specific guides are editable in `content/topic_guide_overrides.json` with a classification and reason; the builder applies both sources to topic pages. Do not edit generated guides in `topics/` directly. Keep shared numerical examples consistent in both languages.

Run `npm run build` and `npm run ci` before proposing a release. `scripts/public_files.mjs` defines what may enter `dist/`; an unregistered root file stops packaging. CI and deployment both test generated pages. Deployment builds with the production domain before running `verify:built`.

The Service Worker cache key follows content. Its first install requires the hub shell and eagerly imported modules, then caches other lessons independently; a failed optional asset no longer aborts the entire update. The builder stages intermediate output in memory and writes only changed final files; a no-op build must preserve `sw.js`, sitemap and page mtimes.

---

## License & Copyright

© 2026 Sasai Lab

Licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).
