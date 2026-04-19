#!/usr/bin/env python3
"""Phase 3: Fix 5 remaining beginner-tester pain points."""

path = 'index.html'
data = open(path, 'r', encoding='utf-8').read()

# ============================================================
# 1. 「確率密度」の説明不足 — term-gloss を追加
# ============================================================
old1 = 'φ(z) はその位置での曲線の高さ（確率密度）。'
new1 = 'φ(z) はその位置での曲線の高さ（<span class="term-gloss" title="確率密度：その値が出やすい「濃さ」。高いほどその付近の値が出やすい。面積にすると確率になる">確率密度</span>）。'
if old1 in data:
    data = data.replace(old1, new1)
    print('  [1] Added term-gloss for 確率密度 in stdnorm JA')

old1e = 'z = "how many standard deviations from the mean." φ(z) = height of the curve there.'
new1e = 'z = "how many standard deviations from the mean." φ(z) = height of the curve there (the <span class="term-gloss" title="Probability density: how \'concentrated\' the probability is at that point. Higher = more likely to see values nearby. Integrate (sum the area) to get actual probability">density</span>).'
if old1e in data:
    data = data.replace(old1e, new1e)
    print('  [1] Added term-gloss for density in stdnorm EN')

# ============================================================
# 2. t 分布の「作り方」数式に formula-explain がない
# ============================================================
# JA dist-card for t
old2 = '''        <b class="cy">クセ:</b> 正規より裾が重い（外れ値に優しい）。df→∞ で N(0,1)。
      </div>
      <div class="dist-card" data-lang="en">'''
new2 = '''        <b class="cy">クセ:</b> 正規より裾が重い（外れ値に優しい）。df→∞ で N(0,1)。
        <div class="formula-explain" style="margin-top:4px">ざっくり言うと：母集団の σ を知らず標本から推定するので、その分だけ不確実性が増えて裾が厚くなった正規分布。サンプルが増えれば（df→∞）正規分布に戻る。</div>
      </div>
      <div class="dist-card" data-lang="en">'''
if old2 in data:
    data = data.replace(old2, new2)
    print('  [2] Added formula-explain to t dist JA')

old2e = '''        <b class="cy">Flavor:</b> heavier tails than N(0,1); matches N(0,1) as df→∞.
      </div>'''
new2e = '''        <b class="cy">Flavor:</b> heavier tails than N(0,1); matches N(0,1) as df→∞.
        <div class="formula-explain" style="margin-top:4px">In short: since you estimate σ from your sample instead of knowing it, extra uncertainty makes the tails fatter. More data (df→∞) and it becomes the normal.</div>
      </div>'''
# Need to match only the first occurrence (t dist, not chi or F)
idx2 = data.find(old2e)
if idx2 >= 0:
    data = data[:idx2] + new2e + data[idx2 + len(old2e):]
    print('  [2] Added formula-explain to t dist EN')

# ============================================================
# 3. 日本語版の操作 Tip 欠如 — normal と test に追加
# ============================================================
# 3a: normal — EN has tip about dragging, JA doesn't
old3a = "    <br><i style=\"color:var(--dim)\">Tip: drag directly on the graph to move the <code>a</code>/<code>b</code> bounds — whichever handle is closest follows your finger.</i>\n  </p>"
new3a = "    <br><i style=\"color:var(--dim)\">Tip: drag directly on the graph to move the <code>a</code>/<code>b</code> bounds — whichever handle is closest follows your finger.</i>\n  </p>"

# Actually let's add a JA tip to the JA sec-desc for normal
# Find the JA sec-desc closing that's right before the EN one
old3a_ja = '    偏差値、テストの点、測定誤差——だいたい正規で近似できるものは、<b>ぜんぶこの面積計算</b>で「〜%の人がこの範囲」が求まる。\n  </p>'
new3a_ja = '    偏差値、テストの点、測定誤差——だいたい正規で近似できるものは、<b>ぜんぶこの面積計算</b>で「〜%の人がこの範囲」が求まる。\n    <br><i style="color:var(--dim)">Tip: グラフ上を直接ドラッグすると、近い方の <code>a</code>/<code>b</code> の境界を動かせる。</i>\n  </p>'
if old3a_ja in data:
    data = data.replace(old3a_ja, new3a_ja)
    print('  [3a] Added drag tip to normal JA')

# 3b: test — EN has tip about dragging critical boundary, JA doesn't
# The EN tip is inside the errors panel (②), add JA equivalent
old3b_ja = '      "間違いを減らすと見逃しが増える"というトレードオフが見える。\n    </p>'
new3b_ja = '      "間違いを減らすと見逃しが増える"というトレードオフが見える。\n      <br><i style="color:var(--dim)">Tip: グラフ上を左右にドラッグすると、臨界値（α の境界）を直接動かせる。</i>\n    </p>'
if old3b_ja in data:
    data = data.replace(old3b_ja, new3b_ja)
    print('  [3b] Added drag tip to test errors panel JA')

# ============================================================
# 4. カイ二乗検定「E で割る理由」の説明
# ============================================================
old4_ja = '    <span class="text-sub">どちらも χ²分布に従う統計量を使い、右裾の面積が p 値になる。自由度は適合度なら k−1、独立性なら (r−1)(c−1)。</span>'
new4_ja = '    <span class="text-sub">なぜ E で割る？ → 「期待10人に対して2人のズレ」と「期待1000人に対して2人のズレ」は重みが違う。E で割ることで<b>相対的なズレ</b>に揃えている。<br>どちらも χ²分布に従う統計量を使い、右裾の面積が p 値になる。自由度は適合度なら k−1、独立性なら (r−1)(c−1)。</span>'
if old4_ja in data:
    data = data.replace(old4_ja, new4_ja)
    print('  [4] Added E-division explanation to chitest JA')

old4_en = '    <span class="text-sub">Both use a χ²-distributed statistic; the p-value is the right-tail area. df = k−1 for goodness-of-fit, (r−1)(c−1) for independence.</span>'
new4_en = '    <span class="text-sub">Why divide by E? → A deviation of 2 from an expected 10 matters more than 2 from an expected 1,000. Dividing by E turns raw gaps into <b>relative</b> ones.<br>Both use a χ²-distributed statistic; the p-value is the right-tail area. df = k−1 for goodness-of-fit, (r−1)(c−1) for independence.</span>'
if old4_en in data:
    data = data.replace(old4_en, new4_en)
    print('  [4] Added E-division explanation to chitest EN')

# ============================================================
# 5. 重回帰 3D グラフの回転軸の不明確さ — 軸ラベル強化
# ============================================================
old5 = '      <span style="color:var(--dim);font-family:\'Courier New\',monospace;font-size:11px"><span data-lang="ja">ドラッグで回転</span><span data-lang="en">Drag to rotate</span></span>'
new5 = '      <span style="color:var(--dim);font-family:\'Courier New\',monospace;font-size:11px"><span data-lang="ja">↔↕ ドラッグで回転（軸: <span style="color:var(--cyan)">x₁</span> · <span style="color:var(--magenta)">x₂</span> · <span style="color:var(--yellow)">y</span>）</span><span data-lang="en">↔↕ Drag to rotate (axes: <span style="color:var(--cyan)">x₁</span> · <span style="color:var(--magenta)">x₂</span> · <span style="color:var(--yellow)">y</span>)</span></span>'
if old5 in data:
    data = data.replace(old5, new5)
    print('  [5] Enhanced 3D rotation label with axis names')

# ============================================================
# Write back
# ============================================================
data = data.replace('\x00', '')
if not data.endswith('\n'):
    data += '\n'

open(path, 'w', encoding='utf-8').write(data)
print(f'\n  Done! Wrote {len(data)} bytes to {path}')
