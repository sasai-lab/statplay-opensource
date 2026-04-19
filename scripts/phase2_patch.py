#!/usr/bin/env python3
"""Phase 2 patch: 2A (concrete examples), 2B (guided steps), 2C (story-bridge context)."""
import sys

path = 'index.html'
data = open(path, 'r', encoding='utf-8').read()

# ============================================================
# 2A: Concrete examples for prob, morep, dists
# ============================================================

# --- prob: Add concrete example before the Venn diagram panel ---
prob_example_ja = '''  <div class="example-box" data-lang="ja">
    <b style="color:var(--yellow)">具体例で考えてみよう</b><br>
    52枚のトランプから1枚引く。A = ハートが出る（13/52 = 0.25）、B = 絵札が出る（12/52 ≈ 0.23）。<br>
    A∩B = ハートの絵札（3/52 ≈ 0.06）。→ P(A∪B) = 0.25 + 0.23 − 0.06 = <b>0.42</b>。<br>
    <span style="color:var(--dim)">独立の例：サイコロ2個。A = 1個目が偶数、B = 2個目が3以上。1個目の結果は2個目に影響しないので独立。P(A∩B) = 1/2 × 2/3 = 1/3。</span>
  </div>'''

prob_example_en = '''  <div class="example-box" data-lang="en">
    <b style="color:var(--yellow)">Concrete example</b><br>
    Draw one card from a 52-card deck. A = heart (13/52 = 0.25), B = face card (12/52 ≈ 0.23).<br>
    A∩B = heart face card (3/52 ≈ 0.06). → P(A∪B) = 0.25 + 0.23 − 0.06 = <b>0.42</b>.<br>
    <span style="color:var(--dim)">Independence example: two dice. A = 1st is even, B = 2nd is ≥3. The 1st roll doesn't affect the 2nd, so independent. P(A∩B) = 1/2 × 2/3 = 1/3.</span>
  </div>'''

# Insert before the formula in prob section
prob_target = '  <div class="formula">P(A|B) = P(A∩B) / P(B)'
if prob_target in data:
    data = data.replace(prob_target, prob_example_ja + '\n' + prob_example_en + '\n' + prob_target)
    print('  [2A] Added concrete examples to prob')
else:
    print('  [2A] WARNING: prob formula not found', file=sys.stderr)

# --- morep: Add "when to use" callouts to each panel title ---
morep_uses = [
    ('<div class="panel-title" data-lang="ja">二項分布 B(n, p)</div>',
     '<div class="panel-title" data-lang="ja">二項分布 B(n, p)</div>\n      <div class="use-case" data-lang="ja">いつ使う？ → コイン10回で表が何回出るか、不良品検査で100個中何個不良か</div>\n      <div class="use-case" data-lang="en">When? → How many heads in 10 coin flips; how many defects in 100 items</div>'),
    ('<div class="panel-title" data-lang="ja">ポアソン分布 Poisson(λ)</div>',
     '<div class="panel-title" data-lang="ja">ポアソン分布 Poisson(λ)</div>\n      <div class="use-case" data-lang="ja">いつ使う？ → 1時間にコールセンターに来る電話の本数、1日の交通事故件数</div>\n      <div class="use-case" data-lang="en">When? → Phone calls per hour at a call center; traffic accidents per day</div>'),
    ('<div class="panel-title" data-lang="ja">指数分布 Exp(λ) — 待ち時間</div>',
     '<div class="panel-title" data-lang="ja">指数分布 Exp(λ) — 待ち時間</div>\n      <div class="use-case" data-lang="ja">いつ使う？ → 次の電話が来るまでの待ち時間、電球が切れるまでの寿命</div>\n      <div class="use-case" data-lang="en">When? → Time until next phone call; how long until a light bulb burns out</div>'),
]
for old, new in morep_uses:
    if old in data:
        data = data.replace(old, new)
        print(f'  [2A] Added use-case to morep: {old[30:60]}...')

# Improve memoryless explanation
old_memoryless = '<div class="sec-bridge" data-lang="ja">無記憶性：過去の待ち時間は将来に影響しない。</div>'
new_memoryless = '<div class="sec-bridge" data-lang="ja">無記憶性：バスを10分待っても、あと何分待つかは今来た人と同じ。過去の待ち時間は将来に影響しない。</div>'
if old_memoryless in data:
    data = data.replace(old_memoryless, new_memoryless)
    print('  [2A] Improved memoryless explanation')

# --- dists: Already has "use for" in dist-card. Add "when in practice" examples ---
dists_examples = [
    ('<b class="cy">使いどころ:</b> 母分散未知の平均検定、回帰係数の t 値。',
     '<b class="cy">使いどころ:</b> 母分散未知の平均検定、回帰係数の t 値。<br><span style="color:var(--dim);font-size:11px">例：クラス30人の平均点が全国平均と違うか調べるとき。</span>'),
    ('<b class="mg">使いどころ:</b> 分散の検定、独立性／適合度のカイ二乗検定。',
     '<b class="mg">使いどころ:</b> 分散の検定、独立性／適合度のカイ二乗検定。<br><span style="color:var(--dim);font-size:11px">例：サイコロの出目が均等か、アンケートの「はい/いいえ」に偏りがないか調べるとき。</span>'),
    ('<b class="ye">使いどころ:</b> 分散分析（ANOVA）、回帰モデルの全体 F 検定。',
     '<b class="ye">使いどころ:</b> 分散分析（ANOVA）、回帰モデルの全体 F 検定。<br><span style="color:var(--dim);font-size:11px">例：3クラスの平均点に差があるか調べるとき（一元配置分散分析）。</span>'),
]
for old, new in dists_examples:
    if old in data:
        data = data.replace(old, new)
        print(f'  [2A] Added practice example to dists: {old[10:40]}...')

# ============================================================
# 2B: Guided experiment steps for mreg
# ============================================================
mreg_guide_ja = '''  <div class="guided-steps" data-lang="ja">
    <b style="color:var(--yellow)">実験ガイド — 順番に試してみよう</b>
    <ol>
      <li><b>Step 1:</b> ノイズ σ を <b>0</b> にして再サンプリング → 推定値と真の値がぴったり一致することを確認。</li>
      <li><b>Step 2:</b> σ を <b>0.5</b> に上げる → 推定値が真の値からズレ始める。何度か再サンプリングして、推定値のバラつきを見よう。</li>
      <li><b>Step 3:</b> n を <b>10</b> にして再サンプリング → 推定が不安定。n を <b>200</b> にすると安定する。これが大数の法則。</li>
      <li><b>Step 4:</b> β₁ を <b>0</b> にする → x₁ は y に影響しない。推定 β̂₁ が 0 に近いか確認しよう。</li>
    </ol>
  </div>'''

mreg_guide_en = '''  <div class="guided-steps" data-lang="en">
    <b style="color:var(--yellow)">Experiment Guide — try these in order</b>
    <ol>
      <li><b>Step 1:</b> Set noise σ to <b>0</b> and resample → estimates match the true values exactly.</li>
      <li><b>Step 2:</b> Raise σ to <b>0.5</b> → estimates start drifting. Resample several times to see the variation.</li>
      <li><b>Step 3:</b> Set n to <b>10</b> and resample → unstable. Set n to <b>200</b> → stable. That's the law of large numbers.</li>
      <li><b>Step 4:</b> Set β₁ to <b>0</b> → x₁ has no effect on y. Check that estimated β̂₁ is close to 0.</li>
    </ol>
  </div>'''

# Insert before the mreg panel
mreg_target = '  <div class="panel" data-autorun="mGen">'
if mreg_target in data:
    data = data.replace(mreg_target, mreg_guide_ja + '\n' + mreg_guide_en + '\n' + mreg_target)
    print('  [2B] Added guided steps to mreg')

# ============================================================
# 2C: Story-bridge self-contained context via <details>
# ============================================================
# Each story-bridge gets a companion <details> for direct-landing readers
contexts = [
    # (identifier in story-bridge, ja_context, en_context)
    ('標準正規分布</span>。CLT も仮説検定も',
     '前提知識は不要です。ここが統計学の出発点。「ベルカーブ」という言葉を聞いたことがあれば十分です。',
     'No prerequisites. This is the starting point. If you\'ve heard "bell curve," you\'re ready.'),
    ('μ と σ</span> を動かして',
     '標準正規分布（N(0,1)、平均0・標準偏差1のベルカーブ）を知っていると理解しやすいです。',
     'Easier if you know the standard normal (N(0,1), bell curve with mean 0, sd 1).'),
    ('確率の基本法則</span>。加法定理',
     '正規分布の知識は不要です。高校の「場合の数と確率」の延長で読めます。',
     'No normal distribution knowledge needed. This extends high school probability.'),
    ('残りの分布</span>で道具箱',
     '正規分布の基本的な形を知っていればOK。ここでは正規分布以外の分布を3つ学びます。',
     'Just knowing the basic normal distribution shape is enough. Here we learn 3 other distributions.'),
    ('ベイズの定理</span>。検査で陽性が出た',
     '条件付き確率 P(A|B) の意味を知っていると理解しやすいです。知らなくても、スライダーを触れば直感的にわかります。',
     'Easier if you know conditional probability P(A|B). But even without it, the sliders make it intuitive.'),
    ('中心極限定理</span>が効いてくる',
     '「正規分布」と「平均」の意味がわかっていれば大丈夫です。ここでは「なぜ平均は正規分布になるのか」を体験します。',
     'If you know "normal distribution" and "mean," you\'re set. Here you\'ll see WHY the mean becomes normal.'),
    ('大数の法則</span>。CLT が「形」の話なら',
     'CLT を見ていなくても大丈夫。「コインを何万回も投げると表の割合は50%に近づく」— それがこのページのすべて。',
     'Haven\'t seen CLT? That\'s fine. "Flip a coin 10,000 times and the heads ratio approaches 50%" — that\'s this page.'),
    ('信頼区間</span>。幅を広げれば当たりやすい',
     '「標本平均」と「標準偏差」の意味がわかっていればOK。ここでは推定の不確実性を「幅」で表現する方法を学びます。',
     'If you know "sample mean" and "standard deviation," you\'re ready. Here we express estimation uncertainty as a "width."'),
    ('仮説検定</span>は「YES/NO として」',
     '信頼区間の考え方と正規分布の基本がわかると理解しやすいです。「p値」は聞いたことがあるレベルでOK。',
     'Easier with confidence intervals and basic normal distribution. Having heard of "p-value" is enough.'),
    ('t 分布</span>に化ける',
     '標準正規分布と仮説検定の基本を知っていると理解しやすいです。「母分散がわからないとき、どうするか」がテーマです。',
     'Easier with standard normal and hypothesis testing basics. The theme: "what happens when population variance is unknown."'),
    ('単回帰</span>は 2 変数に直線',
     '「平均」「標準偏差」「相関」の意味がわかればOK。中学の「y = ax + b」を思い出せれば完璧。',
     'If you know "mean," "standard deviation," and "correlation," you\'re set. Remember y = ax + b from school? Perfect.'),
    ('重回帰</span>。軸が増え',
     '単回帰（1本の直線を引く）を知っていると理解しやすいです。ここでは直線が「平面」に拡張されます。',
     'Easier if you know simple regression (fitting one line). Here the line extends to a "plane."'),
]

for identifier, ja_ctx, en_ctx in contexts:
    # Find the story-bridge containing this identifier
    idx = data.find(identifier)
    if idx < 0:
        print(f'  [2C] WARNING: identifier not found: {identifier[:30]}...', file=sys.stderr)
        continue

    # Find the end of the EN story-bridge (next line after JA)
    # The pattern is: JA story-bridge, then EN story-bridge on next line
    bridge_start = data.rfind('<div class="story-bridge"', 0, idx)
    # Find the closing of the EN bridge (the one right after)
    ja_end = data.index('</div>', idx) + len('</div>')
    # EN bridge follows
    en_bridge_start = data.find('<div class="story-bridge"', ja_end)
    if en_bridge_start < 0 or en_bridge_start > ja_end + 5:
        # Some sections have the EN bridge right after
        en_bridge_start = data.find('<div class="story-bridge" data-lang="en"', ja_end)
    if en_bridge_start >= 0 and en_bridge_start < ja_end + 200:
        en_end = data.index('</div>', en_bridge_start) + len('</div>')
        details_html = (
            f'\n  <details class="story-context" data-lang="ja"><summary>初めてこのページに来た方へ</summary>{ja_ctx}</details>'
            f'\n  <details class="story-context" data-lang="en"><summary>New here?</summary>{en_ctx}</details>'
        )
        data = data[:en_end] + details_html + data[en_end:]
        print(f'  [2C] Added story-context for: {identifier[:30]}...')
    else:
        print(f'  [2C] WARNING: EN bridge not found near: {identifier[:30]}...', file=sys.stderr)

# ============================================================
# Write back
# ============================================================
data = data.replace('\x00', '')
if not data.endswith('\n'):
    data += '\n'

open(path, 'w', encoding='utf-8').write(data)
print(f'\n  Done! Wrote {len(data)} bytes to {path}')
