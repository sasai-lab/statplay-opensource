#!/usr/bin/env python3
"""Phase 2D: Wrap morep and dists panels in tab UI."""
import sys

path = 'index.html'
data = open(path, 'r', encoding='utf-8').read()

# ============================================================
# morep: Wrap 3 panels in tab container
# ============================================================

# Find the canvas-bg wrapper in morep
morep_canvas_bg_start = data.find('<div class="canvas-bg">', data.find('id="morep"'))
if morep_canvas_bg_start < 0:
    print('[2D] ERROR: morep canvas-bg not found', file=sys.stderr)
    sys.exit(1)

morep_canvas_bg_end_tag = '</div>\n  </div>'  # closing canvas-bg + closing of its parent wrapping
# Actually let's find the closing </div> of canvas-bg more carefully
# canvas-bg contains 3 panels, each panel has sub-elements
# Find the 3rd panel's closing, then the canvas-bg closing

# Let's use a different approach: find canvas-bg content and wrap panels
# The structure is:
#   <div class="canvas-bg">
#     <div class="panel"> ... binomial ... </div>
#     <div class="panel"> ... poisson ... </div>
#     <div class="panel"> ... exponential ... </div>
#   </div>

# We need to:
# 1. Add tab bar before the first panel (inside canvas-bg)
# 2. Wrap each panel in a .tab-panel div

# Find content after <div class="canvas-bg">
after_cb = morep_canvas_bg_start + len('<div class="canvas-bg">')

# Insert tab bar
tab_bar_morep = '''
    <div class="tab-bar" data-tab-group="morep">
      <button class="tab-btn active" data-tab="morep-binom"><span data-lang="ja">二項分布</span><span data-lang="en">Binomial</span></button>
      <button class="tab-btn" data-tab="morep-poisson"><span data-lang="ja">ポアソン</span><span data-lang="en">Poisson</span></button>
      <button class="tab-btn" data-tab="morep-exp"><span data-lang="ja">指数分布</span><span data-lang="en">Exponential</span></button>
    </div>'''

data = data[:after_cb] + tab_bar_morep + data[after_cb:]

# Now wrap each panel in tab-panel divs
# Panel 1: binomial
data = data.replace(
    '<div class="panel-title" data-lang="ja">二項分布 B(n, p)</div>',
    '<div class="tab-panel active" id="morep-binom">\n      <div class="panel-title" data-lang="ja">二項分布 B(n, p)</div>'
)

# Close binom tab-panel and open poisson
data = data.replace(
    '      <div class="sec-bridge" data-lang="en">As n → ∞ with np → λ, the binomial approaches Poisson.</div>\n    </div>\n\n    <div class="panel">',
    '      <div class="sec-bridge" data-lang="en">As n → ∞ with np → λ, the binomial approaches Poisson.</div>\n    </div>\n    </div>\n\n    <div class="tab-panel" id="morep-poisson">\n    <div class="panel">'
)

# Close poisson tab-panel and open exp
data = data.replace(
    '      <div class="sec-bridge" data-lang="en">As λ grows, Poisson approaches the normal distribution.</div>\n    </div>\n\n    <div class="panel">',
    '      <div class="sec-bridge" data-lang="en">As λ grows, Poisson approaches the normal distribution.</div>\n    </div>\n    </div>\n\n    <div class="tab-panel" id="morep-exp">\n    <div class="panel">'
)

# Close exp tab-panel (before closing canvas-bg)
# Find the memoryless line, then close tab-panel after its panel closes
memoryless_en = 'Memoryless: past waiting time tells you nothing about the future.</div>'
idx = data.find(memoryless_en)
if idx > 0:
    # Find the next </div> (closing panel), then next </div> (closing ?)
    panel_close = data.find('</div>', idx + len(memoryless_en))
    if panel_close > 0:
        insert_pos = panel_close + len('</div>')
        data = data[:insert_pos] + '\n    </div>' + data[insert_pos:]
        print('  [2D] Wrapped morep panels in tabs')

# ============================================================
# dists: Wrap 3 panels in tab container inside dist-stack
# ============================================================

dist_stack_start = data.find('<div class="dist-stack">')
if dist_stack_start < 0:
    print('[2D] ERROR: dist-stack not found', file=sys.stderr)
    sys.exit(1)

after_ds = dist_stack_start + len('<div class="dist-stack">')

tab_bar_dists = '''
    <div class="tab-bar" data-tab-group="dists">
      <button class="tab-btn active" data-tab="dists-t" style="color:var(--cyan)"><span data-lang="ja">t 分布</span><span data-lang="en">t dist.</span></button>
      <button class="tab-btn" data-tab="dists-chi" style="color:var(--magenta)"><span data-lang="ja">χ² 分布</span><span data-lang="en">χ² dist.</span></button>
      <button class="tab-btn" data-tab="dists-f" style="color:var(--yellow)"><span data-lang="ja">F 分布</span><span data-lang="en">F dist.</span></button>
    </div>'''

data = data[:after_ds] + tab_bar_dists + data[after_ds:]

# Wrap t-distribution panel
data = data.replace(
    '    <div class="panel">\n      <h3 style="color:var(--cyan);font-family:\'Courier New\',monospace;margin-bottom:6px">▶ t distribution</h3>',
    '    <div class="tab-panel active" id="dists-t">\n    <div class="panel">\n      <h3 style="color:var(--cyan);font-family:\'Courier New\',monospace;margin-bottom:6px">▶ t distribution</h3>'
)

# Close t tab-panel, open chi
data = data.replace(
    '      </div>\n    </div>\n    <div class="panel">\n      <h3 style="color:var(--magenta);font-family:\'Courier New\',monospace;margin-bottom:6px">▶ χ² distribution</h3>',
    '      </div>\n    </div>\n    </div>\n    <div class="tab-panel" id="dists-chi">\n    <div class="panel">\n      <h3 style="color:var(--magenta);font-family:\'Courier New\',monospace;margin-bottom:6px">▶ χ² distribution</h3>'
)

# Close chi tab-panel, open F
data = data.replace(
    '      </div>\n    </div>\n    <div class="panel">\n      <h3 style="color:var(--yellow);font-family:\'Courier New\',monospace;margin-bottom:6px">▶ F distribution</h3>',
    '      </div>\n    </div>\n    </div>\n    <div class="tab-panel" id="dists-f">\n    <div class="panel">\n      <h3 style="color:var(--yellow);font-family:\'Courier New\',monospace;margin-bottom:6px">▶ F distribution</h3>'
)

# Close F tab-panel (before closing dist-stack)
# Find last share-row in dists F panel
f_share = data.find('data-title="F分布"')
if f_share > 0:
    f_share_end = data.find('</div>', data.find('</div>', f_share) + 1)
    # Find the panel close
    panel_close = data.find('</div>', f_share_end + 1)
    if panel_close > 0:
        insert_pos = panel_close + len('</div>')
        data = data[:insert_pos] + '\n    </div>' + data[insert_pos:]
        print('  [2D] Wrapped dists panels in tabs')

# ============================================================
# Add tab JS at the bottom (before closing </body> or before script)
# ============================================================
tab_js = '''
<script>
document.querySelectorAll('.tab-bar').forEach(bar=>{
  bar.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const group=bar.dataset.tabGroup;
      const target=btn.dataset.tab;
      bar.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const container=bar.parentElement;
      container.querySelectorAll('.tab-panel').forEach(p=>{
        p.classList.toggle('active',p.id===target);
      });
      // Trigger resize for canvas inside newly shown tab
      const activePanel=container.querySelector('.tab-panel.active');
      if(activePanel){
        activePanel.querySelectorAll('canvas').forEach(c=>{
          c.dispatchEvent(new Event('resize'));
        });
        window.dispatchEvent(new Event('resize'));
      }
    });
  });
});
</script>'''

data = data.replace('<script type="module" src="js/main.js"></script>', tab_js + '\n<script type="module" src="js/main.js"></script>')
print('  [2D] Added tab JS')

# ============================================================
# Write back
# ============================================================
data = data.replace('\x00', '')
if not data.endswith('\n'):
    data += '\n'

open(path, 'w', encoding='utf-8').write(data)
print(f'\n  Done! Wrote {len(data)} bytes to {path}')
