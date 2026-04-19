#!/usr/bin/env python3
"""Phase 1 patch: Apply all 4 improvements to index.html safely.
1A: (reg.js handled separately)
1B: Add hint text to all sliders
1C: Add formula-explain blocks after each formula
1D: Add term-gloss CSS class (CSS handled separately)
"""
import re, sys

path = 'index.html'
data = open(path, 'r', encoding='utf-8').read()

# ============================================================
# 1C: Formula explanations — insert after each <div class="formula">
# ============================================================
formula_explains = {
    'z = (x − μ) / σ  ,   φ(z) = (1/√(2π)) · exp( −z²/2 )': (
        '<div class="formula-explain" data-lang="ja">z は「平均から標準偏差何個分離れたか」。φ(z) はその位置での曲線の高さ（確率密度）。exp は山型を作る関数で、覚えなくてOK。</div>\n'
        '  <div class="formula-explain" data-lang="en">z = "how many standard deviations from the mean." φ(z) = height of the curve there. exp creates the bell shape — no need to memorize it.</div>'
    ),
    'f(x) = (1 / √(2πσ²)) · exp( −(x−μ)² / 2σ² )': (
        '<div class="formula-explain" data-lang="ja">さっきの φ(z) の一般版。μ が中心位置、σ が広がり。x が μ から離れるほど確率密度が下がる、と言っているだけ。</div>\n'
        '  <div class="formula-explain" data-lang="en">The general version of φ(z). μ sets the center, σ the spread. It just says: the farther x is from μ, the lower the density.</div>'
    ),
    'P(A|B) = P(A∩B) / P(B)  ,  P(A∪B) = P(A) + P(B) − P(A∩B)': (
        '<div class="formula-explain" data-lang="ja">左：「Bが起きた世界で、Aも起きている割合」。右：「AかBの少なくとも片方が起きる確率」＝足して重複を引く。</div>\n'
        '  <div class="formula-explain" data-lang="en">Left: "given B happened, what fraction also had A." Right: "probability of at least one" = add both, subtract the overlap.</div>'
    ),
    'x̄ ± z<sub>α/2</sub> · σ/√n': (
        '<div class="formula-explain" data-lang="ja">日本語で読むと：標本平均 ± 信頼度に応じた係数 × 標準誤差（バラつき÷√サンプル数）。この幅の「網」で真値を捕まえる。</div>\n'
        '  <div class="formula-explain" data-lang="en">In words: sample mean ± confidence multiplier × standard error (spread ÷ √sample size). This "net" catches the true value.</div>'
    ),
    'ŷ = β₀ + β₁x ,  β₁ = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²': (
        '<div class="formula-explain" data-lang="ja">β₁ の分子は「x と y が一緒に動く量」、分母は「x のバラつき」。割り算で「x が1増えたら y はいくつ動くか」が出る。</div>\n'
        '  <div class="formula-explain" data-lang="en">Numerator of β₁ = "how much x and y move together." Denominator = "how much x varies." The ratio = "y\'s change per unit x."</div>'
    ),
    'ŷ = β₀ + β₁x₁ + β₂x₂ ,   β̂ = (XᵀX)⁻¹Xᵀy': (
        '<div class="formula-explain" data-lang="ja">行列で書くと一行だが、やっていることは「全変数を同時に考慮した最小二乗法」。手計算は不要——コンピュータがやる部分。</div>\n'
        '  <div class="formula-explain" data-lang="en">Compact matrix notation, but it\'s just "OLS considering all variables at once." No hand calculation needed — the computer handles this.</div>'
    ),
}

for formula_text, explain_html in formula_explains.items():
    target = f'<div class="formula">{formula_text}</div>'
    if target in data:
        data = data.replace(target, f'{target}\n  {explain_html}')
        print(f'  [1C] Added formula-explain for: {formula_text[:40]}...')
    else:
        print(f'  [1C] WARNING: formula not found: {formula_text[:40]}...', file=sys.stderr)

# ============================================================
# 1B: Slider hints — insert after specific <input> elements
# ============================================================
# Format: (input_id, ja_hint, en_hint)
hints = [
    # stdnorm panel 1
    ('snK', '1.0 なら平均から左右1σ分。1.96 にすると「両側5%」の臨界値。検定と信頼区間の出発点。',
     '1.0 = ±1σ from the mean. Set to 1.96 for the famous "two-tail 5%" critical value.'),
    # stdnorm panel 2
    ('snMu', 'この正規分布の中心位置。標準化すると 0 に移動する。',
     'Center of this normal distribution. Standardization moves it to 0.'),
    ('snSd', '広がり具合。大きいほど山が平たく広がる。標準化すると 1 になる。',
     'Spread. Larger = flatter bell. Standardization rescales it to 1.'),
    ('snT', '0% = 元のまま、100% = 標準化完了。途中経過を観察できる。',
     '0% = original, 100% = fully standardized. Watch the transformation in slow motion.'),
    # normal
    ('nMu', '曲線の中心位置。身長なら170、テスト点なら60のように設定する。',
     'Center of the curve. Set to 170 for height, 60 for test scores, etc.'),
    ('nSd', '広がり具合。大きいほどバラつきが大きい。σ=6 なら「ほとんどの人が ±12 の範囲」。',
     'Spread. Larger = more variation. σ=6 means "most people within ±12."'),
    ('nA', '確率を計算したい範囲の左端。b と合わせて「この範囲に入る割合」がピンクの面積で出る。',
     'Left edge of the probability range. Together with b, the pink area shows the fraction inside.'),
    ('nB', '範囲の右端。a より大きい値に設定する。',
     'Right edge of the range. Should be greater than a.'),
    # prob
    ('probPA', '事象 A が起きる確率。0.40 = 40%。ベン図の左の円の大きさが変わる。',
     'Probability of event A. 0.40 = 40%. Changes the size of the left circle.'),
    ('probPB', '事象 B が起きる確率。ベン図の右の円の大きさが変わる。',
     'Probability of event B. Changes the size of the right circle.'),
    ('probPAB', 'A と B が同時に起きる確率。円の重なり部分。独立なら P(A)×P(B) になる。',
     'Probability of both A and B. The overlap. If independent, equals P(A)×P(B).'),
    # morep - binomial
    ('binomN', 'コインを何回投げるか。n を増やすと山が正規分布に近づいていく。',
     'How many coin flips. As n grows, the shape approaches the normal.'),
    ('binomP', '1回の試行で成功する確率。0.5 = 公正なコイン、0.1 = 不良品率10%。',
     'Probability of success per trial. 0.5 = fair coin, 0.1 = 10% defect rate.'),
    # morep - poisson
    ('poisL', '単位時間あたりの平均発生回数。例：1時間に平均3本の電話 → λ=3。',
     'Average events per unit time. Example: 3 calls per hour → λ=3.'),
    # morep - exponential
    ('expL', '単位時間あたりの平均発生回数。大きいほど待ち時間が短くなる。',
     'Average events per unit time. Larger λ = shorter wait times.'),
    # clt
    ('cltN', '1回の標本で何個取るか。大きいほど標本平均の山がシュッと細くなる（SE = σ/√n）。',
     'How many values per sample. Larger n = tighter bell for the sample mean (SE = σ/√n).'),
    # lln
    ('llnP', '表が出る確率。0.5 なら公正なコイン。0.7 にすると「偏ったコイン」。それでも大数の法則は成り立つ。',
     'Probability of heads. 0.5 = fair coin. Try 0.7 for a biased coin — the law still holds.'),
    # ci
    ('ciN', '1回の標本サイズ。大きいほど区間が狭くなる（精度が上がる）。',
     'Sample size per interval. Larger n = narrower interval (higher precision).'),
    ('ciLvl', '何%の区間が真値を捕まえるか。95% なら100本中約5本がピンク（外れ）になる。',
     'What % of intervals catch the true value. At 95%, about 5 of 100 bars turn pink (miss).'),
    # test panel 1
    ('tZ', 'データから計算した検定統計量。棄却域（赤い領域）に入れば H₀ を棄却する。',
     'Test statistic from the data. If it lands in the red rejection region, reject H₀.'),
    ('tA', '有意水準。「冤罪リスクをどこまで許容するか」。通常は 0.05（5%）を使う。',
     'Significance level. "How much false-alarm risk you accept." Usually 0.05 (5%).'),
    # test panel 2
    ('eD', '効果量 = 本当の差の大きさ。「薬がどれくらい効くか」の指標。大きいほど検出しやすい。',
     'Effect size = true difference magnitude. "How much the drug actually works." Larger = easier to detect.'),
    ('eA', 'α を厳しく（小さく）すると冤罪は減るが、見逃し（β）が増える。このトレードオフを観察しよう。',
     'Tighter α reduces false alarms but increases misses (β). Watch the trade-off.'),
    # dists
    ('tdDf', '自由度 ≒ サンプル数−1。小さいと裾が重い（外れ値に備える）。大きくすると正規分布に一致。',
     'Degrees of freedom ≈ sample size − 1. Small = heavy tails. Large = matches the normal.'),
    ('chiDf', '独立な標準正規変数の個数。平均 = df、分散 = 2×df。大きくすると左右対称に近づく。',
     'Number of independent standard normals squared. Mean = df, variance = 2×df.'),
    ('fDf1', '分子の自由度（グループ数−1）。分散分析ならグループ数で決まる。',
     'Numerator df (number of groups − 1). In ANOVA, determined by the number of groups.'),
    ('fDf2', '分母の自由度（全データ数−グループ数）。大きいほど分布が安定する。',
     'Denominator df (total observations − number of groups). Larger = more stable distribution.'),
    # mreg
    ('mB1', '「正解」の β₁。推定値 β̂₁ と比べて、どれだけ正確に当てられるか確認しよう。',
     'The "true" β₁. Compare with the estimated β̂₁ to see how close the estimate gets.'),
    ('mB2', '「正解」の β₂。β₁ と独立に設定できる。片方を 0 にすると「影響なし」になる。',
     'The "true" β₂. Set independently from β₁. Setting to 0 means "no effect."'),
    ('mS', 'ノイズの大きさ。0 にすると完璧にフィット。大きくすると推定がブレやすくなる。',
     'Noise magnitude. 0 = perfect fit. Larger = noisier estimates.'),
    ('mN', 'サンプル数。多いほど推定が安定する（大数の法則）。10→200 で変化を見よう。',
     'Sample size. More = more stable estimates (law of large numbers). Try 10 vs. 200.'),
    # chitest
    ('gofA', '帰無仮説を棄却する基準。0.05 = 「5%以下の確率でしか起きないなら偶然ではない」。',
     'Threshold for rejecting H₀. 0.05 = "if this would happen less than 5% by chance, it\'s not random."'),
    ('indA', '独立性検定の有意水準。小さいほど慎重な判定になる。',
     'Significance level for the independence test. Smaller = more conservative.'),
]

for input_id, ja_hint, en_hint in hints:
    # Find the input tag and insert hint after the closing </div> of its .ctrl container
    # Pattern: find input with this id, then insert hint after it
    pattern = f'id="{input_id}"'
    if pattern not in data:
        print(f'  [1B] WARNING: input #{input_id} not found', file=sys.stderr)
        continue

    # Check if hint already exists for this slider (avoid duplicates)
    idx = data.index(pattern)
    # Look ahead ~300 chars for existing hint
    lookahead = data[idx:idx+400]
    if 'class="hint"' in lookahead:
        print(f'  [1B] Hint already exists for #{input_id}, skipping')
        continue

    # Find the end of the input tag
    input_start = data.rfind('<input', 0, idx)
    input_end = data.index('>', idx) + 1

    # Insert hint right after the input tag
    hint_html = (
        f'\n        <div class="hint" data-lang="ja">{ja_hint}</div>'
        f'\n        <div class="hint" data-lang="en">{en_hint}</div>'
    )
    data = data[:input_end] + hint_html + data[input_end:]
    print(f'  [1B] Added hint for #{input_id}')

# ============================================================
# 1D: Term glossary — wrap first occurrence of key terms
# ============================================================
# We add a CSS-only tooltip via title attribute + a subtle style class
term_glosses = [
    # (section_id, term_ja, tooltip_ja, term_en, tooltip_en)
    # Only annotate terms that appear WITHOUT explanation
]
# 1D is handled via CSS class addition + selective HTML wrapping
# For now, we add the key annotations inline

# SE annotation in CLT section
data = data.replace(
    '（SE = σ/√n）',
    '（<span class="term-gloss" title="標準誤差（Standard Error）：標本平均のバラつきの大きさ。σ をサンプル数の平方根で割ったもの">SE</span> = σ/√n）'
)
data = data.replace(
    '(SE = σ/√n)',
    '(<span class="term-gloss" title="Standard Error: how much the sample mean varies. Population σ divided by √sample size">SE</span> = σ/√n)'
)
print('  [1D] Annotated SE in CLT')

# 点推定 in CI section
data = data.replace(
    '点推定の<b>周りに網を張って</b>',
    '<span class="term-gloss" title="点推定：1つの数値で母数を推定すること（例：標本平均で母平均を推定）">点推定</span>の<b>周りに網を張って</b>'
)
print('  [1D] Annotated 点推定 in CI')

# 効果量 in test section (first occurrence in sec-desc)
data = data.replace(
    '効果量 δ（本当の差の大きさ）',
    '<span class="term-gloss" title="効果量：処理の効き目を標準偏差で測った指標。0.2=小、0.5=中、0.8=大が目安">効果量</span> δ（本当の差の大きさ）'
)
print('  [1D] Annotated 効果量 in test')

# N(0,1) in dists
data = data.replace(
    '全部 N(0,1) の子孫',
    '全部 <span class="term-gloss" title="N(0,1)：平均0・標準偏差1の標準正規分布。すべての正規分布の基準">N(0,1)</span> の子孫'
)
print('  [1D] Annotated N(0,1) in dists')

# 帰無仮説 / 対立仮説 in test section
data = data.replace(
    '「<code>H₀</code>：この薬は効かない（＝無罪）」',
    '「<code>H₀</code>（<span class="term-gloss" title="帰無仮説：「効果なし」「差なし」という控えめな仮説。まずこれを正しいと仮定して検定する">帰無仮説</span>）：この薬は効かない（＝無罪）」'
)
print('  [1D] Annotated 帰無仮説 in test')

# 自由度 in dists explanation
data = data.replace(
    '<span class="text-sub">自由度 df を動かすと',
    '<span class="text-sub"><span class="term-gloss" title="自由度（df）：自由に値を決められるデータの個数。だいたい「サンプル数−1」。少ないほど不確実性が大きく、分布の裾が広がる">自由度</span> df を動かすと'
)
print('  [1D] Annotated 自由度 in dists')

# ============================================================
# Write back
# ============================================================
# Safety: check no null bytes
data = data.replace('\x00', '')
if not data.endswith('\n'):
    data += '\n'

open(path, 'w', encoding='utf-8').write(data)
print(f'\n  Done! Wrote {len(data)} bytes to {path}')
