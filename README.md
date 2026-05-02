# StatPlay

**JA** | 統計って、じつはめっちゃ面白い。グラフで感じて「あ、そうだったのか！」と気づく学問だ。
**EN** | Statistics is actually fascinating. It's a discipline where you look at graphs and think, "Oh, so *that's* how it works!"

インタラクティブに触って理解する、サイバーパンク調の統計学習ビジュアライザ。
A cyberpunk-themed interactive visualizer for learning statistics by doing.

- バニラ JS + Canvas 2D のみ。ランタイム依存ゼロ / Zero runtime dependencies
- 日英バイリンガル / Bilingual JA ⇄ EN
- ダーク（サイバーパンク）& ライトモード対応 / Dark & light theme
- PWA — オフラインで動作 / Works offline

## Demo

ローカル HTTP サーバを立てて `index.html` を開くだけ。ビルド不要・依存なし・ネットワーク通信なし（ES modules を使用するので `file://` 直開きではなく HTTP 配信が必要）。

Just start a local HTTP server and open `index.html`. No build step, no dependencies, no network calls. (ES modules require HTTP — `file://` won't work.)

```bash
python3 -m http.server 8080
# → http://localhost:8080/
```

GitHub Pages にそのまま置いても動作します（`Settings → Pages → main / root`）。
Also works out of the box on GitHub Pages (`Settings → Pages → main / root`).

## Topics / トピック一覧

| # | Slug | JA | EN |
|---|------|----|----|
| 1 | `stdnorm` | 標準正規分布 | Standard Normal |
| 2 | `normal` | 正規分布と標準化 | Normal Distribution & Standardization |
| 3 | `prob` | 確率の基本法則 | Probability Rules |
| 4 | `bayes` | ベイズの定理 | Bayes' Theorem |
| 5 | `morep` | 二項・ポアソン・指数分布 | Binomial, Poisson & Exponential |
| 6 | `clt` | 中心極限定理 | Central Limit Theorem |
| 7 | `lln` | 大数の法則 | Law of Large Numbers |
| 8 | `ci` | 信頼区間 | Confidence Intervals |
| 9 | `test` | 仮説検定 | Hypothesis Testing |
| 10 | `dists` | t / χ² / F 分布 | Three Test Distributions |
| 11 | `chitest` | カイ二乗検定 | Chi-Squared Test |
| 12 | `anova` | 分散分析 | One-Way ANOVA |
| 13 | `corr` | 相関係数 | Correlation |
| 14 | `reg` | 単回帰分析 | Simple Regression |
| 15 | `mreg` | 重回帰分析 | Multiple Regression (3D) |

### Columns / コラム

- **偏差値って何？** / What Is a Deviation Value?
- **誕生日のパラドックス** / The Birthday Paradox
- **標準化って何？** / What Is Standardization?
- **あなたの年収は、統計でどこまで当てられるか** / How Far Can Statistics Predict Your Income?

## Project Structure / プロジェクト構成

```
index.html                    Hub page / ハブページ
about.html                    About page (JA)
en/about.html                 About page (EN)
topics/<slug>.html            Per-topic pages (JA) × 15
en/topics/<slug>.html         Per-topic pages (EN) × 15
columns/<slug>.html           Columns (JA) × 4
en/columns/<slug>.html        Columns (EN) × 4
tables/index.html             Statistical tables (JA)
en/tables/index.html          Statistical tables (EN)
css/
  stat_cyber.css              Stylesheet (dark + light) / スタイルシート
js/
  main.js                     Entry point (type="module") / エントリポイント
  utils.js                    Shared utilities ($, TAU, normCDF, …)
  katex-render.js             KaTeX math rendering
  modules/
    ├── Topics ────────────────────────────────────
    stdnorm.js  normal.js  prob.js  bayes.js  morep.js
    clt.js  lln.js  ci.js  htest.js  dist.js  chitest.js
    corr.js  reg.js  mreg.js  errs.js  descriptive.js  anova.js
    ├── Columns ───────────────────────────────────
    deviation.js  birthday.js  income_prediction.js
    ├── UI / Infra ────────────────────────────────
    hero.js  theme.js  prefs.js  nav.js  toc.js  anchor.js
    reveal.js  autorun.js  scrolltop.js  tables.js
    a11y.js  pwa.js  version.js  lang.js
    graphDrag.js  share.js  urlParams.js
content/
  topics.json                 Master metadata for all topics & columns
scripts/
  build_topics.py             Route-A build (per-topic pages + sitemap + robots)
  bump_version.py             Version bump (package.json + version.js)
  minify.mjs                  Minify to dist/
  test_site.mjs               jsdom unit tests
  test_layout.mjs             Playwright layout tests
  test_a11y.mjs               axe-core accessibility tests
  publish_opensource.sh        Push to public repo
icons/                        PWA icons (192 / 512 / maskable)
sw.js                         Service Worker (precache)
manifest.webmanifest          PWA manifest
sitemap.xml                   Auto-generated sitemap
robots.txt                    Auto-generated robots
```

## Development / 開発

```bash
# Dev server (ES modules require HTTP)
python3 -m http.server 8080

# Lint
npm run lint

# Build (per-topic pages + sitemap + robots)
npm run build

# Test
npm run test              # jsdom unit tests
npm run test:layout       # Playwright layout tests
npm run test:a11y         # axe-core accessibility tests

# CI pipeline (lint → build → all tests)
npm run ci

# Production build (build + minify → dist/)
npm run build:prod

# Version bump
npm run bump              # auto-detect from commit message
npm run bump -- --level patch   # explicit level
```

Requires Node >= 20. Dev dependencies: eslint, jsdom, Playwright, axe-core, terser, clean-css-cli.

---

## License & Copyright

© 2026 Sasai Lab

Licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

This project was created with assistance from Anthropic Claude. Human creative direction (content structure, pedagogical approach, design, iteration, and review) is by the copyright holder.