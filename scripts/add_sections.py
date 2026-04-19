#!/usr/bin/env python3
"""
Add 5 new sections + 4 category headers + updated nav to index.html.
Binary-safe read/write to avoid truncation (CLAUDE.md §6.1).
"""
import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(BASE, 'index.html')

# ── New nav HTML ─────────────────────────────────────────────────
NEW_NAV = '''  <div class="nav-links" id="navLinks">
    <div class="nav-category">
      <span class="nav-cat-label">DATA</span>
      <a href="#descriptive"><span data-lang="ja">記述統計</span><span data-lang="en">Descriptive</span></a>
      <a href="#corr"><span data-lang="ja">相関</span><span data-lang="en">Correlation</span></a>
    </div>
    <div class="nav-category">
      <span class="nav-cat-label">PROB</span>
      <a href="#prob"><span data-lang="ja">確率</span><span data-lang="en">Probability</span></a>
      <a href="#stdnorm"><span data-lang="ja">標準正規</span><span data-lang="en">Std Normal</span></a>
      <a href="#normal"><span data-lang="ja">正規分布</span><span data-lang="en">Normal</span></a>
      <a href="#morep"><span data-lang="ja">離散分布</span><span data-lang="en">Discrete</span></a>
      <a href="#dists">t/χ²/F</a>
    </div>
    <div class="nav-category">
      <span class="nav-cat-label">INFER</span>
      <a href="#clt"><span data-lang="ja">中心極限</span><span data-lang="en">CLT</span></a>
      <a href="#lln"><span data-lang="ja">大数法則</span><span data-lang="en">LLN</span></a>
      <a href="#ci"><span data-lang="ja">信頼区間</span><span data-lang="en">CI</span></a>
      <a href="#test"><span data-lang="ja">仮説検定</span><span data-lang="en">z-Test</span></a>
      <a href="#chitest"><span data-lang="ja">χ²検定</span><span data-lang="en">χ² Test</span></a>
      <a href="#anova"><span data-lang="ja">分散分析</span><span data-lang="en">ANOVA</span></a>
    </div>
    <div class="nav-category">
      <span class="nav-cat-label">MODEL</span>
      <a href="#reg"><span data-lang="ja">単回帰</span><span data-lang="en">Regression</span></a>
      <a href="#mreg"><span data-lang="ja">重回帰</span><span data-lang="en">Multi Reg</span></a>
      <a href="#bayes"><span data-lang="ja">ベイズ</span><span data-lang="en">Bayes</span></a>
    </div>
    <button class="lang-toggle theme-toggle" id="themeToggle" type="button" aria-pressed="false" aria-label="Switch to light theme" title="Switch to light theme">LIGHT</button>
    <button class="lang-toggle" id="langToggle" type="button" title="Switch language">EN</button>
  </div>'''

# ── Topic-deep-link template ────────────────────────────────────
def topic_link(slug):
    return (f'  <div class="topic-deep-link" style="margin:8px 0 -4px;font-family:\'Courier New\',monospace;font-size:12px">'
            f'<a data-lang="ja" href="topics/{slug}.html" style="color:var(--magenta);text-decoration:none">▸ このトピックの専用ページへ</a>'
            f'<a data-lang="en" href="topics/{slug}.html" style="color:var(--magenta);text-decoration:none">▸ Dedicated page for this topic</a></div>')

# ── Category headers ─────────────────────────────────────────────
CAT_DATA = '''
<!-- ============ CATEGORY: DATA ============ -->
<div class="category-header reveal" id="cat-data">
  <div class="cat-tag">DATA</div>
  <p class="cat-desc" data-lang="ja">統計のすべてはデータを見ることから始まる</p>
  <p class="cat-desc" data-lang="en">Everything starts with looking at the data</p>
</div>
'''

CAT_PROB = '''
<!-- ============ CATEGORY: PROBABILITY ============ -->
<div class="category-header reveal" id="cat-probability">
  <div class="cat-tag">PROBABILITY</div>
  <p class="cat-desc" data-lang="ja">確率と分布 — 不確実性を数式にする</p>
  <p class="cat-desc" data-lang="en">Probability &amp; Distributions — quantifying uncertainty</p>
</div>
'''

CAT_INFER = '''
<!-- ============ CATEGORY: INFERENCE ============ -->
<div class="category-header reveal" id="cat-inference">
  <div class="cat-tag">INFERENCE</div>
  <p class="cat-desc" data-lang="ja">推測統計 — サンプルから母集団を知る</p>
  <p class="cat-desc" data-lang="en">Statistical Inference — learning about populations from samples</p>
</div>
'''

CAT_MODEL = '''
<!-- ============ CATEGORY: MODELING ============ -->
<div class="category-header reveal" id="cat-modeling">
  <div class="cat-tag">MODELING</div>
  <p class="cat-desc" data-lang="ja">モデリング — 関係を見つけ、予測する</p>
  <p class="cat-desc" data-lang="en">Modeling — finding relationships and making predictions</p>
</div>
'''

# ── New sections ─────────────────────────────────────────────────
SEC_DESCRIPTIVE = f'''
<!-- ============ DESCRIPTIVE STATISTICS ============ -->
<section id="descriptive" class="reveal">
  {topic_link('descriptive')}
  <div class="sec-tag">D.01 / DESCRIPTIVE STATS</div>
  <h2 class="sec-title" data-lang="ja">記述統計 — データの<span style="color:var(--yellow)">全体像</span>を掴む</h2>
  <h2 class="sec-title" data-lang="en">Descriptive Stats — See the <span style="color:var(--yellow)">Big Picture</span></h2>
  <p class="sec-desc" data-lang="ja">
    平均、中央値、分散、標準偏差、四分位数 — これらは<b>データを一言で要約する道具</b>。
    推測統計に入る前に、まずデータそのものを「見る」感覚を掴もう。<br>
    <b style="color:var(--cyan)">スライダーでサンプルサイズを変え</b>、<b style="color:var(--magenta)">歪度を操作する</b>と、
    平均と中央値の関係、箱ひげ図の読み方が体感で分かる。
  </p>
  <p class="sec-desc" data-lang="en">
    Mean, median, variance, standard deviation, quartiles — these are <b>tools for summarizing data in a single glance</b>.
    Before diving into inference, let's build intuition for the data itself.<br>
    <b style="color:var(--cyan)">Change the sample size</b> and <b style="color:var(--magenta)">tweak the skewness</b> to see
    how mean vs. median shift, and how to read a box plot.
  </p>
  <div class="formula">x̄ = (1/n) Σxᵢ  ,  s² = (1/(n−1)) Σ(xᵢ − x̄)²</div>
  <div class="panel">
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="ja">▶ ヒストグラム＋箱ひげ図でデータを読む</h3>
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="en">▶ Read Data with Histogram + Box Plot</h3>
    <div class="controls">
      <div class="ctrl"><label><span data-lang="ja">サンプルサイズ n</span><span data-lang="en">Sample size n</span> = <span class="val" id="descNVal">30</span></label>
        <input id="descN" min="10" max="100" step="1" type="range" value="30"/>
      </div>
      <div class="ctrl"><label><span data-lang="ja">歪度</span><span data-lang="en">Skewness</span> = <span class="val" id="descSkewVal">0.0</span></label>
        <input id="descSkew" min="-2" max="2" step="0.1" type="range" value="0"/>
      </div>
      <button class="btn" id="descGen"><span data-lang="ja">▶ 新しいサンプル</span><span data-lang="en">▶ New Sample</span></button>
    </div>
    <canvas id="descCanvas" aria-label="記述統計の可視化：ヒストグラムと箱ひげ図" aria-busy="true" height="280"></canvas>
    <div class="info">
      <div><span data-lang="ja">平均</span><span data-lang="en">Mean</span><strong id="descMean">—</strong></div>
      <div><span data-lang="ja">中央値</span><span data-lang="en">Median</span><strong id="descMedian">—</strong></div>
      <div><span data-lang="ja">最頻値</span><span data-lang="en">Mode</span><strong id="descMode">—</strong></div>
      <div><span data-lang="ja">分散</span><span data-lang="en">Variance</span><strong id="descVar">—</strong></div>
      <div><span>SD</span><strong id="descSD">—</strong></div>
      <div>Q1<strong id="descQ1">—</strong></div>
      <div>Q3<strong id="descQ3">—</strong></div>
      <div>IQR<strong id="descIQR">—</strong></div>
    </div>
    <div class="share-row">
      <button class="share-btn dl" data-kind="dl" data-share="descCanvas" data-title="記述統計"><span>💾 画像保存</span></button>
    </div>
  </div>
  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>2変数の関係を散布図で見る <span class="story-arrow">▸</span> <a href="#corr">D.02 相関係数</a></div>
  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>see relationships in scatter plots <span class="story-arrow">▸</span> <a href="#corr">D.02 Correlation</a></div>
</section>
'''

SEC_CORR = f'''
<!-- ============ CORRELATION ============ -->
<section id="corr" class="reveal">
  {topic_link('corr')}
  <div class="sec-tag">D.02 / CORRELATION</div>
  <h2 class="sec-title" data-lang="ja">相関係数 — 2変数の<span style="color:var(--cyan)">関係の強さ</span>を測る</h2>
  <h2 class="sec-title" data-lang="en">Correlation — Measuring the <span style="color:var(--cyan)">Strength</span> of Relationships</h2>
  <p class="sec-desc" data-lang="ja">
    散布図を見て「なんとなく関係がありそう」を<b>数値化</b>したのがピアソンの相関係数 r。
    −1 ≤ r ≤ +1 で、0 に近いほど関係が弱い。<br>
    <b style="color:var(--magenta)">でも r が同じでも散布図はまったく違うことがある</b>（アンスコムの四重奏）。
    数値だけでなく「目で見る」習慣が大事。
  </p>
  <p class="sec-desc" data-lang="en">
    The Pearson correlation coefficient r <b>quantifies</b> the "looks like there's a relationship" in a scatter plot.
    It ranges from −1 to +1, with 0 meaning no linear relationship.<br>
    <b style="color:var(--magenta)">But the same r can hide very different patterns</b> (Anscombe's quartet).
    Always look at the plot, not just the number.
  </p>
  <div class="formula">r = Σ(xᵢ − x̄)(yᵢ − ȳ) / √[ Σ(xᵢ − x̄)² · Σ(yᵢ − ȳ)² ]</div>
  <div class="panel">
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="ja">▶ 散布図をクリックして点を追加</h3>
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="en">▶ Click the scatter plot to add points</h3>
    <div class="controls">
      <div class="ctrl"><label><span data-lang="ja">目標 r</span><span data-lang="en">Target r</span> = <span class="val" id="corrRVal">0.70</span></label>
        <input id="corrR" min="-0.99" max="0.99" step="0.01" type="range" value="0.7"/>
      </div>
      <div class="ctrl"><label>n = <span class="val" id="corrNVal">50</span></label>
        <input id="corrN" min="10" max="200" step="1" type="range" value="50"/>
      </div>
      <button class="btn" id="corrGen"><span data-lang="ja">▶ 生成</span><span data-lang="en">▶ Generate</span></button>
      <button class="btn yellow" id="corrClear"><span data-lang="ja">✕ クリア</span><span data-lang="en">✕ Clear</span></button>
    </div>
    <canvas id="corrCanvas" aria-label="相関係数と散布図の可視化" aria-busy="true" height="300" style="cursor:crosshair"></canvas>
    <div class="info">
      <div>r<strong id="corrRval">—</strong></div>
      <div>R²<strong id="corrR2val">—</strong></div>
      <div>n<strong id="corrNval">—</strong></div>
      <div>Cov<strong id="corrCov">—</strong></div>
    </div>
    <div class="share-row">
      <button class="share-btn dl" data-kind="dl" data-share="corrCanvas" data-title="相関係数"><span>💾 画像保存</span></button>
    </div>
  </div>
  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>確率の基本法則を学ぶ <span class="story-arrow">▸</span> <a href="#prob">P.01 確率の基本</a></div>
  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>learn the basic rules of probability <span class="story-arrow">▸</span> <a href="#prob">P.01 Probability Rules</a></div>
</section>
'''

SEC_PROB = f'''
<!-- ============ PROBABILITY RULES ============ -->
<section id="prob" class="reveal">
  {topic_link('prob')}
  <div class="sec-tag">P.01 / PROBABILITY RULES</div>
  <h2 class="sec-title" data-lang="ja">確率の基本法則 — <span style="color:var(--magenta)">ベン図</span>で直感をつかむ</h2>
  <h2 class="sec-title" data-lang="en">Probability Rules — Build Intuition with <span style="color:var(--magenta)">Venn Diagrams</span></h2>
  <p class="sec-desc" data-lang="ja">
    加法定理、乗法定理、条件付き確率 — 公式を暗記する前に、面積で「見て」しまおう。<br>
    <b style="color:var(--cyan)">P(A∪B) = P(A) + P(B) − P(A∩B)</b> は「2つの円を重ねた面積から、重なりを引く」だけ。
    条件付き確率 P(A|B) は「B の円の中で A が占める割合」。<br>
    <b style="color:var(--yellow)">独立ボタン</b>を押すと P(A∩B) = P(A)·P(B) に自動調整 — 独立ってこういうこと。
  </p>
  <p class="sec-desc" data-lang="en">
    Addition rule, multiplication rule, conditional probability — see them as areas before memorizing formulas.<br>
    <b style="color:var(--cyan)">P(A∪B) = P(A) + P(B) − P(A∩B)</b> is just "area of two circles minus the overlap."
    Conditional probability P(A|B) is "the fraction of B's circle occupied by A."<br>
    Press the <b style="color:var(--yellow)">Independence button</b> to snap P(A∩B) = P(A)·P(B) — that's what independence means.
  </p>
  <div class="formula">P(A|B) = P(A∩B) / P(B)  ,  P(A∪B) = P(A) + P(B) − P(A∩B)</div>
  <div class="panel">
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="ja">▶ インタラクティブ・ベン図</h3>
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="en">▶ Interactive Venn Diagram</h3>
    <div class="controls">
      <div class="ctrl"><label>P(A) = <span class="val" id="probPAVal">0.40</span></label>
        <input id="probPA" min="0.05" max="0.95" step="0.01" type="range" value="0.4"/>
      </div>
      <div class="ctrl"><label>P(B) = <span class="val" id="probPBVal">0.30</span></label>
        <input id="probPB" min="0.05" max="0.95" step="0.01" type="range" value="0.3"/>
      </div>
      <div class="ctrl"><label>P(A∩B) = <span class="val" id="probPABVal">0.12</span></label>
        <input id="probPAB" min="0" max="0.30" step="0.01" type="range" value="0.12"/>
      </div>
      <button class="btn yellow" id="probIndep"><span data-lang="ja">独立にする</span><span data-lang="en">Set Independent</span></button>
    </div>
    <canvas id="probCanvas" aria-label="確率の基本法則：ベン図による可視化" aria-busy="true" height="320"></canvas>
    <div class="info">
      <div>P(A∪B)<strong id="probUnion">—</strong></div>
      <div>P(A|B)<strong id="probCondAB">—</strong></div>
      <div>P(B|A)<strong id="probCondBA">—</strong></div>
      <div><span data-lang="ja">独立？</span><span data-lang="en">Independent?</span><strong id="probIndepCheck">—</strong></div>
    </div>
    <div class="share-row">
      <button class="share-btn dl" data-kind="dl" data-share="probCanvas" data-title="確率の基本法則"><span>💾 画像保存</span></button>
    </div>
  </div>
  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>すべての起源、標準正規分布 <span class="story-arrow">▸</span> <a href="#stdnorm">P.02 標準正規分布</a></div>
  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>the origin of everything: standard normal <span class="story-arrow">▸</span> <a href="#stdnorm">P.02 Standard Normal</a></div>
</section>
'''

SEC_CHITEST = f'''
<!-- ============ CHI-SQUARED TEST ============ -->
<section id="chitest" class="reveal">
  {topic_link('chitest')}
  <div class="sec-tag">I.05 / CHI-SQUARED TEST</div>
  <h2 class="sec-title" data-lang="ja">カイ二乗検定 — <span style="color:var(--magenta)">クロス集計表</span>から独立性を問う</h2>
  <h2 class="sec-title" data-lang="en">Chi-Squared Test — Testing <span style="color:var(--magenta)">Independence</span> in Cross Tables</h2>
  <p class="sec-desc" data-lang="ja">
    「性別と購入の有無は関係あるか？」 — そんな質問に答えるのがカイ二乗独立性検定。<br>
    <b style="color:var(--cyan)">2×2 のクロス集計表</b>を作り、「もし独立なら期待される頻度」と「実際の頻度」のズレを
    χ² 統計量で測る。ズレが大きすぎれば、「独立ではない＝関係がある」と判断する。
  </p>
  <p class="sec-desc" data-lang="en">
    "Is gender related to purchasing behavior?" — the chi-squared test of independence answers this.<br>
    Build a <b style="color:var(--cyan)">2×2 contingency table</b>, compute expected frequencies under independence,
    and measure the gap with a χ² statistic. If it's too large, conclude "not independent = related."
  </p>
  <div class="formula">χ² = Σ (Oᵢⱼ − Eᵢⱼ)² / Eᵢⱼ  ,  df = (r−1)(c−1)</div>
  <div class="panel">
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="ja">▶ 2×2 クロス集計表を編集して検定</h3>
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="en">▶ Edit the 2×2 table and run the test</h3>
    <div class="controls">
      <div class="ctrl"><label>α = <span class="val" id="chitestAVal">0.05</span></label>
        <input id="chitestA" min="0.01" max="0.1" step="0.01" type="range" value="0.05"/>
      </div>
      <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:4px;font-family:'Courier New',monospace;font-size:12px;margin:8px 0">
        <span></span><span style="text-align:center;color:var(--cyan)">Col 1</span><span style="text-align:center;color:var(--cyan)">Col 2</span>
        <span style="color:var(--magenta)">Row 1</span>
        <input id="chitestC00" type="number" min="1" max="999" value="40" style="width:60px;background:rgba(0,0,0,.3);border:1px solid var(--cyan);color:var(--text);text-align:center;padding:4px"/>
        <input id="chitestC01" type="number" min="1" max="999" value="10" style="width:60px;background:rgba(0,0,0,.3);border:1px solid var(--cyan);color:var(--text);text-align:center;padding:4px"/>
        <span style="color:var(--magenta)">Row 2</span>
        <input id="chitestC10" type="number" min="1" max="999" value="20" style="width:60px;background:rgba(0,0,0,.3);border:1px solid var(--cyan);color:var(--text);text-align:center;padding:4px"/>
        <input id="chitestC11" type="number" min="1" max="999" value="30" style="width:60px;background:rgba(0,0,0,.3);border:1px solid var(--cyan);color:var(--text);text-align:center;padding:4px"/>
      </div>
      <button class="btn" id="chitestRandom"><span data-lang="ja">▶ ランダム生成</span><span data-lang="en">▶ Random Table</span></button>
    </div>
    <canvas id="chitestCanvas" aria-label="カイ二乗検定の可視化：観測値 vs 期待値とχ²分布" aria-busy="true" height="320"></canvas>
    <div class="info">
      <div>χ²<strong id="chitestStat">—</strong></div>
      <div>df<strong id="chitestDf">—</strong></div>
      <div>p<strong id="chitestP">—</strong></div>
      <div><span data-lang="ja">判定</span><span data-lang="en">Result</span><strong id="chitestResult">—</strong></div>
    </div>
    <div class="share-row">
      <button class="share-btn dl" data-kind="dl" data-share="chitestCanvas" data-title="カイ二乗検定"><span>💾 画像保存</span></button>
    </div>
  </div>
  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>3群以上の平均を比べる <span class="story-arrow">▸</span> <a href="#anova">I.06 分散分析</a></div>
  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>comparing means across 3+ groups <span class="story-arrow">▸</span> <a href="#anova">I.06 ANOVA</a></div>
</section>
'''

SEC_ANOVA = f'''
<!-- ============ ANOVA ============ -->
<section id="anova" class="reveal">
  {topic_link('anova')}
  <div class="sec-tag">I.06 / ANOVA</div>
  <h2 class="sec-title" data-lang="ja">分散分析 — <span style="color:var(--yellow)">群間差</span>と群内ばらつきの<span style="color:var(--cyan)">綱引き</span></h2>
  <h2 class="sec-title" data-lang="en">ANOVA — The <span style="color:var(--cyan)">Tug of War</span> Between <span style="color:var(--yellow)">Group Differences</span> and Within-Group Noise</h2>
  <p class="sec-desc" data-lang="ja">
    t検定は「2群の平均を比べる」。じゃあ<b style="color:var(--yellow)">3群以上</b>ならどうする？<br>
    分散分析（ANOVA）は「<b style="color:var(--cyan)">群間の分散</b>」と「<b style="color:var(--magenta)">群内の分散</b>」の比（F統計量）で判断する。
    群間差が大きく、群内のばらつきが小さいほど、F値が大きくなり「有意」になる。
  </p>
  <p class="sec-desc" data-lang="en">
    The t-test compares 2 group means. What about <b style="color:var(--yellow)">3 or more groups</b>?<br>
    ANOVA uses the ratio of <b style="color:var(--cyan)">between-group variance</b> to <b style="color:var(--magenta)">within-group variance</b> (the F statistic).
    The bigger the group differences and the smaller the noise, the larger F gets — and the stronger the evidence.
  </p>
  <div class="formula">F = MSB / MSW = [SSB/(k−1)] / [SSW/(N−k)]</div>
  <div class="panel">
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="ja">▶ 群間差 vs ばらつきの綱引き</h3>
    <h3 style="color:var(--cyan);font-family:'Courier New',monospace;margin-bottom:10px;font-size:13px;letter-spacing:2px" data-lang="en">▶ Effect size vs. noise tug of war</h3>
    <div class="controls">
      <div class="ctrl"><label><span data-lang="ja">群数 k</span><span data-lang="en">Groups k</span> = <span class="val" id="anovaKVal">3</span></label>
        <input id="anovaK" min="2" max="5" step="1" type="range" value="3"/>
      </div>
      <div class="ctrl"><label><span data-lang="ja">効果量</span><span data-lang="en">Effect</span> = <span class="val" id="anovaEffectVal">1.5</span></label>
        <input id="anovaEffect" min="0" max="5" step="0.1" type="range" value="1.5"/>
      </div>
      <div class="ctrl"><label><span data-lang="ja">群内SD</span><span data-lang="en">Within SD</span> = <span class="val" id="anovaWithinVal">1.5</span></label>
        <input id="anovaWithin" min="0.5" max="5" step="0.1" type="range" value="1.5"/>
      </div>
      <div class="ctrl"><label><span data-lang="ja">群あたりn</span><span data-lang="en">n per group</span> = <span class="val" id="anovaNkVal">15</span></label>
        <input id="anovaNk" min="5" max="50" step="1" type="range" value="15"/>
      </div>
      <button class="btn" id="anovaGen"><span data-lang="ja">▶ データ再生成</span><span data-lang="en">▶ Regenerate</span></button>
    </div>
    <canvas id="anovaCanvas" aria-label="分散分析の可視化：群間比較とF分布" aria-busy="true" height="320"></canvas>
    <div class="info">
      <div>F<strong id="anovaF">—</strong></div>
      <div>df(B)<strong id="anovaDfB">—</strong></div>
      <div>df(W)<strong id="anovaDfW">—</strong></div>
      <div>p<strong id="anovaP">—</strong></div>
      <div>SSB<strong id="anovaSSB">—</strong></div>
      <div>SSW<strong id="anovaSSW">—</strong></div>
      <div><span data-lang="ja">判定</span><span data-lang="en">Result</span><strong id="anovaResult">—</strong></div>
    </div>
    <div class="share-row">
      <button class="share-btn dl" data-kind="dl" data-share="anovaCanvas" data-title="分散分析"><span>💾 画像保存</span></button>
    </div>
  </div>
  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>関係を直線で捕まえる <span class="story-arrow">▸</span> <a href="#reg">M.01 単回帰分析</a></div>
  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>catching a relationship with a line <span class="story-arrow">▸</span> <a href="#reg">M.01 Simple Regression</a></div>
</section>
'''


def main():
    data = open(INDEX, 'rb').read()
    text = data.decode('utf-8')

    # 1. Replace nav
    nav_start = text.find('<div class="nav-links" id="navLinks">')
    nav_end = text.find('</div>\n</nav>', nav_start)
    if nav_start < 0 or nav_end < 0:
        print('ERROR: Could not find nav-links block')
        return
    nav_end += len('</div>')  # include the closing </div> of nav-links
    text = text[:nav_start] + NEW_NAV + text[nav_end:]
    print('  nav replaced')

    # 2. Insert category headers + new sections
    # Insert DATA category + descriptive + corr BEFORE the positioning section
    pos_marker = '<!-- ============ POSITIONING'
    idx = text.find(pos_marker)
    if idx < 0:
        print('ERROR: Could not find POSITIONING marker')
        return
    insert_data = CAT_DATA + SEC_DESCRIPTIVE + SEC_CORR
    text = text[:idx] + insert_data + '\n' + text[idx:]
    print('  DATA sections inserted')

    # Insert PROBABILITY category BEFORE stdnorm
    sn_marker = '<!-- ============ STANDARD NORMAL'
    idx = text.find(sn_marker)
    if idx < 0:
        print('ERROR: Could not find STANDARD NORMAL marker')
        return
    # Insert prob section + category header before stdnorm
    insert_prob = CAT_PROB + SEC_PROB
    text = text[:idx] + insert_prob + '\n' + text[idx:]
    print('  PROBABILITY sections inserted')

    # Insert INFERENCE category BEFORE clt
    clt_marker = '<!-- ============ CLT'
    idx = text.find(clt_marker)
    if idx < 0:
        # Try alternate
        clt_marker = '<!-- ============ CENTRAL LIMIT'
        idx = text.find(clt_marker)
    if idx < 0:
        print('ERROR: Could not find CLT marker')
        return
    text = text[:idx] + CAT_INFER + '\n' + text[idx:]
    print('  INFERENCE header inserted')

    # Find where dists/test section ends and insert chitest + anova
    # chitest goes after dists section, anova after chitest
    # Find the morep section's story-next which leads to reg
    morep_next = "href=\"#reg\">07 単回帰分析"
    if morep_next not in text:
        morep_next = "href=\"#reg\">08 単回帰分析"
    # Find end of morep section
    morep_end_marker = '</section>\n\n<!-- ============ SIMPLE'
    idx = text.find(morep_end_marker)
    if idx < 0:
        morep_end_marker = '</section>\n<!-- ============ SIMPLE'
        idx = text.find(morep_end_marker)
    if idx < 0:
        # Try finding the reg section marker
        reg_marker = '<!-- ============ SIMPLE REGRESSION'
        if reg_marker not in text:
            reg_marker = '<!-- ============ REG'
        idx = text.find(reg_marker)
        if idx < 0:
            print('ERROR: Could not find reg section marker')
            return
        # Insert chitest + anova before reg
        insert_tests = SEC_CHITEST + SEC_ANOVA + CAT_MODEL + '\n'
        text = text[:idx] + insert_tests + text[idx:]
        print('  CHITEST + ANOVA + MODEL header inserted before reg')
    else:
        idx += len('</section>\n')
        insert_tests = '\n' + SEC_CHITEST + SEC_ANOVA + CAT_MODEL + '\n'
        text = text[:idx] + insert_tests + text[idx:]
        print('  CHITEST + ANOVA + MODEL header inserted')

    # 3. Update sec-tag numbers for existing sections
    replacements = [
        ('00 / STANDARD NORMAL', 'P.02 / STANDARD NORMAL'),
        ('01 / CENTRAL LIMIT THEOREM', 'I.01 / CENTRAL LIMIT THEOREM'),
        ('02 / NORMAL DISTRIBUTION', 'P.03 / NORMAL DISTRIBUTION'),
        ('03 / LAW OF LARGE NUMBERS', 'I.02 / LAW OF LARGE NUMBERS'),
        ('04 / CONFIDENCE INTERVAL', 'I.03 / CONFIDENCE INTERVAL'),
        ('05 / HYPOTHESIS TESTING', 'I.04 / HYPOTHESIS TESTING'),
        ('06 / t \xb7 \u03c7\xb2 \xb7 F DISTRIBUTIONS', 'P.05 / t \xb7 \u03c7\xb2 \xb7 F DISTRIBUTIONS'),
        ('07 / SIMPLE REGRESSION', 'M.01 / SIMPLE REGRESSION'),
        ('08 / MULTIPLE REGRESSION', 'M.02 / MULTIPLE REGRESSION'),
        ('09 / BAYES THEOREM', 'M.03 / BAYES THEOREM'),
    ]
    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
            print(f'  renumbered: {repr(old)}')

    # Also update story-next references to include new numbering
    story_updates = [
        ('01 中心極限定理', 'I.01 中心極限定理'),
        ('01 Central Limit Theorem', 'I.01 Central Limit Theorem'),
        ('02 正規分布', 'P.03 正規分布'),
        ('02 Normal distribution', 'P.03 Normal distribution'),
        ('03 大数の法則', 'I.02 大数の法則'),
        ('03 Law of large numbers', 'I.02 Law of large numbers'),
        ('04 信頼区間', 'I.03 信頼区間'),
        ('04 Confidence interval', 'I.03 Confidence interval'),
        ('05 仮説検定', 'I.04 仮説検定'),
        ('05 Hypothesis testing', 'I.04 Hypothesis testing'),
        ('06 t・χ²・F', 'P.05 t・χ²・F'),
        ('06 t, χ², F', 'P.05 t, χ², F'),
        ('07 単回帰分析', 'M.01 単回帰分析'),
        ('07 Simple regression', 'M.01 Simple regression'),
        ('08 単回帰分析', 'M.01 単回帰分析'),
        ('08 Simple regression', 'M.01 Simple regression'),
        ('08 重回帰分析', 'M.02 重回帰分析'),
        ('08 Multiple regression', 'M.02 Multiple regression'),
        ('09 ベイズ定理', 'M.03 ベイズ定理'),
        ("09 Bayes' theorem", "M.03 Bayes' theorem"),
    ]
    for old, new in story_updates:
        if old in text:
            text = text.replace(old, new)

    # 4. Update morep sec-tag if it exists
    morep_tags = [
        ('06B / MORE DISTRIBUTIONS', 'P.04 / MORE DISTRIBUTIONS'),
        ('06B / MORE PROB', 'P.04 / MORE PROB'),
        ('07B / DISCRETE + EXPONENTIAL', 'P.04 / DISCRETE + EXPONENTIAL'),
    ]
    for old, new in morep_tags:
        if old in text:
            text = text.replace(old, new)
            print(f'  renumbered: {repr(old)}')

    # Write back
    clean = text.encode('utf-8')
    if not clean.endswith(b'\n'):
        clean += b'\n'
    open(INDEX, 'wb').write(clean)

    # Verify file is valid (not truncated)
    verify = open(INDEX, 'rb').read().decode('utf-8')
    if '</html>' in verify:
        print(f'  SUCCESS: index.html updated ({len(verify)} chars, ends with </html>)')
    else:
        print('  WARNING: </html> not found — file may be truncated!')

if __name__ == '__main__':
    main()
