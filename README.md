# StatPlay

**JA** | 統計って、じつはめっちゃ面白い。グラフで感じて「あ、そうだったのか！」と気づく学問だ。
**EN** | Statistics is actually fascinating. It's a discipline where you look at graphs and think, "Oh, so *that's* how it works!"

インタラクティブに触って理解する、サイバーパンク調の統計学習ビジュアライザ。
A cyberpunk-themed interactive visualizer for learning statistics by doing.

## Demo

ローカル HTTP サーバを立てて `index.html` を開くだけ。ビルド不要・依存なし・ネットワーク通信なし（ES modules を使用するので `file://` 直開きではなく HTTP 配信が必要）。

Just start a local HTTP server and open `index.html`. No build step, no dependencies, no network calls. (ES modules require HTTP — `file://` won't work.)

```bash
python3 -m http.server 8080
# → http://localhost:8080/
```

GitHub Pages にそのまま置いても動作します（`Settings → Pages → main / root`）。
Also works out of the box on GitHub Pages (`Settings → Pages → main / root`).

## Project Structure / プロジェクト構成

```
index.html                 Hub page / ハブページ
css/
  stat_cyber.css           Stylesheet / スタイルシート
js/
  main.js                  Entry point (type="module") / エントリポイント
  utils.js                 Shared utilities ($, TAU, normCDF, …) / 共通ユーティリティ
  modules/
    hero.js                Hero animation / ヒーローアニメ
    clt.js                 Central Limit Theorem / 中心極限定理
    lln.js                 Law of Large Numbers / 大数の法則
    ci.js                  Confidence Intervals / 信頼区間
    reg.js                 Simple Regression / 単回帰
    mreg.js                Multiple Regression (3D) / 重回帰（3D）
    bayes.js               Bayes' Theorem / ベイズの定理
    stdnorm.js             Standardization / 標準化
    normal.js              Normal Distribution / 正規分布
    dist.js                t / χ² / F distributions / t / χ² / F 分布
    htest.js               Hypothesis Testing / 仮説検定
    errs.js                Type I / Type II Errors / 第一種 / 第二種の誤り
    graphDrag.js           Canvas drag interaction / キャンバスドラッグ操作
    share.js               URL / image / X sharing / URL / 画像 / X シェア
    urlParams.js           URL parameter restore / URL パラメータ復元
    lang.js                JA ⇄ EN toggle / 言語トグル
    autorun.js             Scroll-triggered auto-run / スクロール自動実行
    nav.js                 Hamburger menu / ハンバーガーメニュー
    reveal.js              Scroll-in animation / スクロールイン
LICENSE
README.md
```

---

## License & Copyright

© 2026 Sasai Lab

Licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).