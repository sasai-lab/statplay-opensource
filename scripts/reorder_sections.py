#!/usr/bin/env python3
"""Reorder index.html sections: PROB -> INFERENCE -> MODELING"""
import re

path = 'index.html'
data = open(path, 'rb').read()
clean = data.replace(b'\x00', b'')
html = clean.decode('utf-8')
lines = html.split('\n')

# Find section boundaries by line number (0-indexed)
# Each block = (start_line, end_line) inclusive of blank lines before next section

def find_range(lines, start_marker, end_before):
    """Find line range from start_marker comment/tag to just before end_before."""
    s = e = None
    for i, line in enumerate(lines):
        if start_marker in line and s is None:
            s = i
        if end_before in line and s is not None and i > s:
            # go back to find the blank lines
            e = i - 1
            while e > s and lines[e].strip() == '':
                e -= 1
            return s, e + 1  # end exclusive, includes one trailing blank
    # If end_before not found, search to end
    return s, len(lines)

# Define all blocks precisely by their HTML comments / section ids
# We need exact line numbers from our earlier reads

# CATEGORY HEADERS
cat_inference_start = None
cat_modeling_start = None
cat_probability_start = None

# Find all key line indices
for i, line in enumerate(lines):
    if '<!-- ============ CATEGORY: INFERENCE ============ -->' in line:
        cat_inference_start = i
    if '<!-- ============ CATEGORY: MODELING ============ -->' in line:
        cat_modeling_start = i
    if '<!-- ============ CATEGORY: PROBABILITY ============ -->' in line:
        cat_probability_start = i

print(f"cat_inference: {cat_inference_start}")
print(f"cat_modeling: {cat_modeling_start}")
print(f"cat_probability: {cat_probability_start}")

# Strategy: extract blocks by line ranges, then reassemble
# Current order in file (0-indexed line numbers from our reads, but let's find them dynamically)

section_starts = {}
for i, line in enumerate(lines):
    m = re.match(r'<section id="(\w+)"', line.strip())
    if m:
        section_starts[m.group(1)] = i

print("Section starts:", section_starts)

def extract_block(start_line, end_line):
    """Extract lines[start_line:end_line]"""
    return lines[start_line:end_line]

# Find where each section ends (line before next section/category/footer starts)
all_boundaries = []
for i, line in enumerate(lines):
    if re.match(r'\s*<section id="\w+"', line):
        all_boundaries.append(('section', i))
    elif '<!-- ============ CATEGORY:' in line:
        all_boundaries.append(('category', i))
    elif '<footer>' in line.strip():
        all_boundaries.append(('footer', i))

print("Boundaries:", all_boundaries)

def get_block_end(start_idx):
    """Given a start line, find where the block ends (before next boundary)"""
    for btype, bline in all_boundaries:
        if bline > start_idx:
            return bline
    return len(lines)

# Extract all blocks
# Category headers include their trailing blank lines up to next section
def extract_cat_header(cat_line):
    end = get_block_end(cat_line)
    return lines[cat_line:end]

def extract_section(section_id):
    start = section_starts[section_id]
    end = get_block_end(start)
    return lines[start:end]

# Also need the comment line before each section
# The comment is typically 2-3 lines before the <section> tag
def extract_section_with_comment(section_id):
    start = section_starts[section_id]
    # Look back for the HTML comment
    comment_start = start
    for j in range(start - 1, max(start - 5, 0), -1):
        if '<!-- ============' in lines[j]:
            comment_start = j
            break
        elif lines[j].strip() == '':
            continue
        else:
            break
    # Include blank lines before comment
    while comment_start > 0 and lines[comment_start - 1].strip() == '':
        comment_start -= 1

    end = get_block_end(start)
    return lines[comment_start:end]

def extract_cat_with_preceding_blanks(cat_line):
    start = cat_line
    while start > 0 and lines[start - 1].strip() == '':
        start -= 1
    end = get_block_end(cat_line)
    return lines[start:end]

# Now build the new order
# First, find the "before sections" part (everything up to first category header)
# That's: <!DOCTYPE> ... hero ... positioning section ... up to cat-inference

# Find where the positioning section ends and first category begins
first_cat = min(cat_inference_start, cat_modeling_start, cat_probability_start)

# Find the hero CTA button and everything before first category
before_sections = lines[:first_cat]

# Now extract all blocks
cat_prob = extract_cat_with_preceding_blanks(cat_probability_start)
cat_infer = extract_cat_with_preceding_blanks(cat_inference_start)
cat_model = extract_cat_with_preceding_blanks(cat_modeling_start)

sec_stdnorm = extract_section_with_comment('stdnorm')
sec_normal = extract_section_with_comment('normal')
sec_prob = extract_section_with_comment('prob')
sec_morep = extract_section_with_comment('morep')
sec_bayes = extract_section_with_comment('bayes')
sec_clt = extract_section_with_comment('clt')
sec_lln = extract_section_with_comment('lln')
sec_ci = extract_section_with_comment('ci')
sec_test = extract_section_with_comment('test')
sec_dists = extract_section_with_comment('dists')
sec_reg = extract_section_with_comment('reg')
sec_mreg = extract_section_with_comment('mreg')

# Find footer and everything after
footer_line = None
for i, line in enumerate(lines):
    if '<footer>' in line.strip():
        footer_line = i
        break

# Include blank lines before footer
footer_start = footer_line
while footer_start > 0 and lines[footer_start - 1].strip() == '':
    footer_start -= 1
after_sections = lines[footer_start:]

# Now reassemble in new order
new_lines = []
new_lines.extend(before_sections)

# CATEGORY: PROBABILITY (renamed header stays same)
new_lines.append('')
new_lines.append('')
new_lines.append('<!-- ============ CATEGORY: PROBABILITY ============ -->')
new_lines.append('<div class="category-header reveal" id="cat-probability">')
new_lines.append('  <div class="cat-tag"><span data-lang="ja">確率と分布</span><span data-lang="en">PROBABILITY</span></div>')
new_lines.append('  <p class="cat-desc" data-lang="ja">不確実性を数式にする</p>')
new_lines.append('  <p class="cat-desc" data-lang="en">Probability &amp; Distributions — quantifying uncertainty</p>')
new_lines.append('</div>')
new_lines.append('')
new_lines.append('')

# StdNorm (P.01) - FIRST section
new_lines.append('<!-- ============ STANDARD NORMAL DISTRIBUTION — intro ============ -->')
# Find and modify the section content
for line in sec_stdnorm:
    # Update sec-tag number
    line = line.replace('P.02 / STANDARD NORMAL', 'P.01 / STANDARD NORMAL')
    # Update story-bridge to be intro (no "確率の言葉が揃った" reference)
    if 'story-bridge' in line and 'data-lang="ja"' in line and '確率の言葉が揃った' in line:
        line = '  <div class="story-bridge" data-lang="ja">統計のすべてを支配する<b>あの曲線</b>から始めよう——<span class="next">標準正規分布</span>。CLT も仮説検定も信頼区間も、すべてここに帰ってくる。まずはベルカーブを<b>触って</b>みよう。</div>'
    if 'story-bridge' in line and 'data-lang="en"' in line and 'Probability rules gave us' in line:
        line = '  <div class="story-bridge" data-lang="en">Let\'s start with the <b>curve</b> that dominates all of statistics — the <span class="next">standard normal</span>. CLT, hypothesis testing, confidence intervals — everything circles back here. <b>Touch</b> the bell curve first.</div>'
    # Update story-next
    if 'story-next' in line and 'data-lang="ja"' in line and '#normal' in line:
        line = '  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>正規分布そのものを扱う <span class="story-arrow">▸</span> <a href="#normal">P.02 正規分布</a></div>'
    if 'story-next' in line and 'data-lang="en"' in line and '#normal' in line:
        line = '  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>the normal as a tool <span class="story-arrow">▸</span> <a href="#normal">P.02 Normal Distribution</a></div>'
    # Skip if it's a blank line at start and we already have blanks
    if line.strip().startswith('<!-- ============ STANDARD'):
        continue  # we already added the comment
    new_lines.append(line)

# Normal (P.02)
new_lines.append('')
new_lines.append('')
for line in sec_normal:
    line = line.replace('P.03 / NORMAL DISTRIBUTION', 'P.02 / NORMAL DISTRIBUTION')
    # Update story-next to point to prob
    if 'story-next' in line and 'data-lang="ja"' in line and '#morep' in line:
        line = '  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>確率の基本法則をベン図で <span class="story-arrow">▸</span> <a href="#prob">P.03 確率の基本法則</a></div>'
    if 'story-next' in line and 'data-lang="en"' in line and '#morep' in line:
        line = '  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>probability rules with Venn diagrams <span class="story-arrow">▸</span> <a href="#prob">P.03 Probability Rules</a></div>'
    # Update story-bridge
    if 'story-bridge' in line and 'data-lang="ja"' in line and '標準正規は μ=0' in line:
        line = '  <div class="story-bridge" data-lang="ja">標準正規は μ=0, σ=1 に固定されていた。実際のデータは<b>平均も散らばりも自由</b>。<span class="next">μ と σ</span> を動かして正規分布を道具として使いこなそう。<b>標準化</b>で Z に戻せば、どんな正規分布も標準正規と行き来できる。</div>'
    if line.strip().startswith('<!-- ============ NORMAL'):
        continue
    new_lines.append(line)

# Prob (P.03)
new_lines.append('')
new_lines.append('')
for line in sec_prob:
    line = line.replace('P.01 / PROBABILITY RULES', 'P.03 / PROBABILITY RULES')
    # Update story-bridge
    if 'story-bridge' in line and 'data-lang="ja"' in line and '回帰と推測統計の道具が揃った' in line:
        line = '  <div class="story-bridge" data-lang="ja">正規分布の形を掴んだ。ここで<b>基礎に立ち返る</b>——すべてを支える<span class="next">確率の基本法則</span>。加法定理、乗法定理、条件付き確率を<b>面積</b>で直感的に掴む。</div>'
    if 'story-bridge' in line and 'data-lang="en"' in line and 'Regression and inference' in line:
        line = '  <div class="story-bridge" data-lang="en">You\'ve got the shape of the normal. Now let\'s step back to the <b>foundations</b> — the probability rules that make all of it work. <span class="next">Addition, multiplication, and conditional probability</span> visualized as overlapping areas.</div>'
    # Update story-next to point to morep
    if 'story-next' in line and 'data-lang="ja"' in line and '#stdnorm' in line:
        line = '  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>離散分布と指数分布 <span class="story-arrow">▸</span> <a href="#morep">P.04 離散分布と指数分布</a></div>'
    if 'story-next' in line and 'data-lang="en"' in line and '#stdnorm' in line:
        line = '  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>discrete and exponential distributions <span class="story-arrow">▸</span> <a href="#morep">P.04 Discrete &amp; Exponential</a></div>'
    if line.strip().startswith('<!-- ============ PROBABILITY RULES'):
        continue
    new_lines.append(line)

# MoreP (P.04 - stays same)
new_lines.append('')
new_lines.append('')
for line in sec_morep:
    if line.strip().startswith('<!-- ============ MORE DIST'):
        continue
    new_lines.append(line)

# Bayes (P.05 - stays same)
new_lines.append('')
new_lines.append('')
for line in sec_bayes:
    if line.strip().startswith('<!-- ============ BAYES'):
        continue
    # Update story-next from bayes to CLT
    # Check if bayes has a story-next - let's see if there is one
    new_lines.append(line)

# Check if bayes section has a story-next - if not, add one
# Read the bayes section to check
bayes_has_story_next = any('story-next' in line for line in sec_bayes)
if not bayes_has_story_next:
    # Insert before the closing </section>
    # Find and replace the last line which should be </section>
    # Actually let's just add it before </section>
    # We need to go back and insert
    # Find the </section> we just added
    for i in range(len(new_lines) - 1, -1, -1):
        if '</section>' in new_lines[i]:
            new_lines.insert(i, '  <div class="story-next" data-lang="en"><span class="lbl">UP NEXT —</span>averages become normal <span class="story-arrow">▸</span> <a href="#clt">I.01 Central Limit Theorem</a></div>')
            new_lines.insert(i, '  <div class="story-next" data-lang="ja"><span class="lbl">次は —</span>平均を取ると正規分布になる？ <span class="story-arrow">▸</span> <a href="#clt">I.01 中心極限定理</a></div>')
            break

# CATEGORY: INFERENCE
new_lines.append('')
new_lines.append('')
new_lines.append('<!-- ============ CATEGORY: INFERENCE ============ -->')
new_lines.append('<div class="category-header reveal" id="cat-inference">')
new_lines.append('  <div class="cat-tag"><span data-lang="ja">推測統計</span><span data-lang="en">INFERENCE</span></div>')
new_lines.append('  <p class="cat-desc" data-lang="ja">サンプルから母集団を推測する</p>')
new_lines.append('  <p class="cat-desc" data-lang="en">Statistical Inference — learning about populations from samples</p>')
new_lines.append('</div>')
new_lines.append('')
new_lines.append('')

# CLT (I.01)
for line in sec_clt:
    # Update story-bridge
    if 'story-bridge' in line and 'data-lang="ja"' in line and 'まずはここから' in line:
        line = '  <div class="story-bridge" data-lang="ja">正規分布の基礎を掴んだ。ここからは<b>推測統計</b>。1つのデータから<b>平均</b>を取ったらどんな形になる？ ——ここで<span class="next">中心極限定理</span>が効いてくる。サイコロでもポアソンでも、出発点は何でもいい。<b>平均</b>にした瞬間、世界はあの正規曲線に吸い込まれていく。</div>'
    if 'story-bridge' in line and 'data-lang="en"' in line and 'Start here' in line:
        line = '  <div class="story-bridge" data-lang="en">Normal distribution basics down. Now for <b>statistical inference</b>. What shape does the <i>average</i> of many samples take? Here comes <span class="next">the Central Limit Theorem</span>: whatever you start with — dice, Poisson, anything — the <b>average</b> is pulled toward that same normal curve.</div>'
    if line.strip().startswith('<!-- ============ CLT'):
        continue
    new_lines.append(line)

# LLN (I.02 - stays same)
new_lines.append('')
new_lines.append('')
for line in sec_lln:
    if line.strip().startswith('<!-- ============ LLN'):
        continue
    new_lines.append(line)

# CI (I.03 - stays same)
new_lines.append('')
new_lines.append('')
for line in sec_ci:
    if line.strip().startswith('<!-- ============ CI'):
        continue
    new_lines.append(line)

# Test (I.04 - stays same)
new_lines.append('')
new_lines.append('')
for line in sec_test:
    if line.strip().startswith('<!-- ============ TEST'):
        continue
    new_lines.append(line)

# Dists (I.05 - stays same)
new_lines.append('')
new_lines.append('')
for line in sec_dists:
    if line.strip().startswith('<!-- ============ DISTS'):
        continue
    new_lines.append(line)

# CATEGORY: MODELING
new_lines.append('')
new_lines.append('')
new_lines.append('<!-- ============ CATEGORY: MODELING ============ -->')
new_lines.append('<div class="category-header reveal" id="cat-modeling">')
new_lines.append('  <div class="cat-tag"><span data-lang="ja">モデリング</span><span data-lang="en">MODELING</span></div>')
new_lines.append('  <p class="cat-desc" data-lang="ja">関係を見つけ、予測する</p>')
new_lines.append('  <p class="cat-desc" data-lang="en">Modeling — finding relationships and making predictions</p>')
new_lines.append('</div>')
new_lines.append('')
new_lines.append('')

# Reg (M.01 - stays same)
for line in sec_reg:
    if line.strip().startswith('<!-- ============ SIMPLE REG'):
        continue
    new_lines.append(line)

# MReg (M.02)
new_lines.append('')
new_lines.append('')
for line in sec_mreg:
    # Update story-next: mreg was pointing to prob, now it should be the last section
    if 'story-next' in line and 'data-lang="ja"' in line and '#prob' in line:
        continue  # Remove this story-next since mreg is now last
    if 'story-next' in line and 'data-lang="en"' in line and '#prob' in line:
        continue
    if line.strip().startswith('<!-- ============ MULTIPLE REG'):
        continue
    new_lines.append(line)

# Footer and rest
new_lines.extend(after_sections)

# Now fix the nav order
result = '\n'.join(new_lines)

# Fix nav: reorder dropdowns - probability first, then inference, then modeling
old_nav = '''    <div class="nav-dropdown">
      <a href="#cat-inference" class="nav-cat-link" data-cat="inference"><span data-lang="ja">推測統計</span><span data-lang="en">INFER</span></a>
      <div class="nav-dropdown-menu">
        <a href="#clt" data-lang="ja">中心極限定理</a><a href="#clt" data-lang="en">Central Limit Theorem</a>
        <a href="#lln" data-lang="ja">大数の法則</a><a href="#lln" data-lang="en">Law of Large Numbers</a>
        <a href="#ci" data-lang="ja">信頼区間</a><a href="#ci" data-lang="en">Confidence Intervals</a>
        <a href="#test" data-lang="ja">仮説検定</a><a href="#test" data-lang="en">Hypothesis Testing</a>
        <a href="#dists" data-lang="ja">三大検定分布</a><a href="#dists" data-lang="en">t / χ² / F Distributions</a>
      </div>
    </div>
    <div class="nav-dropdown">
      <a href="#cat-modeling" class="nav-cat-link" data-cat="modeling"><span data-lang="ja">モデリング</span><span data-lang="en">MODEL</span></a>
      <div class="nav-dropdown-menu">
        <a href="#reg" data-lang="ja">単回帰分析</a><a href="#reg" data-lang="en">Simple Regression</a>
        <a href="#mreg" data-lang="ja">重回帰分析</a><a href="#mreg" data-lang="en">Multiple Regression</a>
      </div>
    </div>
    <div class="nav-dropdown">
      <a href="#cat-probability" class="nav-cat-link" data-cat="probability"><span data-lang="ja">確率と分布</span><span data-lang="en">PROB</span></a>
      <div class="nav-dropdown-menu">
        <a href="#prob" data-lang="ja">確率の基本法則</a><a href="#prob" data-lang="en">Probability Rules</a>
        <a href="#stdnorm" data-lang="ja">標準正規分布</a><a href="#stdnorm" data-lang="en">Standard Normal</a>
        <a href="#normal" data-lang="ja">正規分布と標準化</a><a href="#normal" data-lang="en">Normal & Standardization</a>
        <a href="#morep" data-lang="ja">離散分布と指数分布</a><a href="#morep" data-lang="en">Binomial / Poisson / Exp</a>
        <a href="#bayes" data-lang="ja">ベイズの定理</a><a href="#bayes" data-lang="en">Bayes\' Theorem</a>
      </div>
    </div>'''

new_nav = '''    <div class="nav-dropdown">
      <a href="#cat-probability" class="nav-cat-link" data-cat="probability"><span data-lang="ja">確率と分布</span><span data-lang="en">PROB</span></a>
      <div class="nav-dropdown-menu">
        <a href="#stdnorm" data-lang="ja">標準正規分布</a><a href="#stdnorm" data-lang="en">Standard Normal</a>
        <a href="#normal" data-lang="ja">正規分布と標準化</a><a href="#normal" data-lang="en">Normal & Standardization</a>
        <a href="#prob" data-lang="ja">確率の基本法則</a><a href="#prob" data-lang="en">Probability Rules</a>
        <a href="#morep" data-lang="ja">離散分布と指数分布</a><a href="#morep" data-lang="en">Binomial / Poisson / Exp</a>
        <a href="#bayes" data-lang="ja">ベイズの定理</a><a href="#bayes" data-lang="en">Bayes\' Theorem</a>
      </div>
    </div>
    <div class="nav-dropdown">
      <a href="#cat-inference" class="nav-cat-link" data-cat="inference"><span data-lang="ja">推測統計</span><span data-lang="en">INFER</span></a>
      <div class="nav-dropdown-menu">
        <a href="#clt" data-lang="ja">中心極限定理</a><a href="#clt" data-lang="en">Central Limit Theorem</a>
        <a href="#lln" data-lang="ja">大数の法則</a><a href="#lln" data-lang="en">Law of Large Numbers</a>
        <a href="#ci" data-lang="ja">信頼区間</a><a href="#ci" data-lang="en">Confidence Intervals</a>
        <a href="#test" data-lang="ja">仮説検定</a><a href="#test" data-lang="en">Hypothesis Testing</a>
        <a href="#dists" data-lang="ja">三大検定分布</a><a href="#dists" data-lang="en">t / χ² / F Distributions</a>
      </div>
    </div>
    <div class="nav-dropdown">
      <a href="#cat-modeling" class="nav-cat-link" data-cat="modeling"><span data-lang="ja">モデリング</span><span data-lang="en">MODEL</span></a>
      <div class="nav-dropdown-menu">
        <a href="#reg" data-lang="ja">単回帰分析</a><a href="#reg" data-lang="en">Simple Regression</a>
        <a href="#mreg" data-lang="ja">重回帰分析</a><a href="#mreg" data-lang="en">Multiple Regression</a>
      </div>
    </div>'''

result = result.replace(old_nav, new_nav)

# Fix START button: clt -> stdnorm
result = result.replace(
    "document.getElementById('clt').scrollIntoView()",
    "document.getElementById('stdnorm').scrollIntoView()"
)

# Fix hero sub order
result = result.replace(
    '[ <span>DATA</span> → <span>PROBABILITY</span> → <span>INFERENCE</span> ]',
    '[ <span>PROBABILITY</span> → <span>INFERENCE</span> → <span>MODELING</span> ]'
)

# Write out
out = result.encode('utf-8')
if not out.endswith(b'\n'):
    out += b'\n'
open(path, 'wb').write(out)

print(f"\nDone. Output: {len(out)} bytes, {result.count(chr(10))} lines")

# Verify no null bytes
if b'\x00' in out:
    print("WARNING: null bytes found!")
else:
    print("OK: no null bytes")
