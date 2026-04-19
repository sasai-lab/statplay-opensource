#!/usr/bin/env python3
"""Remove tab UI from morep section, show all panels stacked vertically."""

path = 'index.html'
data = open(path, 'r', encoding='utf-8').read()

# Remove the tab-bar for morep
tab_bar = '''    <div class="tab-bar" data-tab-group="morep">
      <button class="tab-btn active" data-tab="morep-binom"><span data-lang="ja">二項分布</span><span data-lang="en">Binomial</span></button>
      <button class="tab-btn" data-tab="morep-poisson"><span data-lang="ja">ポアソン</span><span data-lang="en">Poisson</span></button>
      <button class="tab-btn" data-tab="morep-exp"><span data-lang="ja">指数分布</span><span data-lang="en">Exponential</span></button>
    </div>'''
data = data.replace(tab_bar + '\n', '')
print('  Removed morep tab-bar')

# Unwrap tab-panel divs (remove opening and closing tags, keep content)
data = data.replace('    <div class="tab-panel active" id="morep-binom">\n    <div class="panel">', '    <div class="panel">')
data = data.replace('    </div>\n\n    <div class="tab-panel" id="morep-poisson">\n    <div class="panel">', '\n    <div class="panel">')
data = data.replace('    </div>\n\n    <div class="tab-panel" id="morep-exp">\n    <div class="panel">', '\n    <div class="panel">')

# Remove the closing </div> for the last tab-panel (morep-exp)
# After the exp panel's </div> (closing .panel), there's </div> (closing .tab-panel)
# The structure is: </div>\n    </div>\n  </div>  (panel close, tab-panel close, canvas-bg close)
# We need to remove one </div> level
data = data.replace(
    "      <div class=\"sec-bridge\" data-lang=\"en\">Memoryless: past waiting time tells you nothing about the future.</div>\n    </div>\n    </div>\n  </div>",
    "      <div class=\"sec-bridge\" data-lang=\"en\">Memoryless: past waiting time tells you nothing about the future.</div>\n    </div>\n  </div>"
)

# Also remove closing </div> for binom and poisson tab-panels
# After binom panel close, there was </div> for tab-panel
data = data.replace(
    "      <div class=\"sec-bridge\" data-lang=\"en\">As n → ∞ with np → λ, the binomial approaches Poisson.</div>\n    </div>\n    </div>",
    "      <div class=\"sec-bridge\" data-lang=\"en\">As n → ∞ with np → λ, the binomial approaches Poisson.</div>\n    </div>"
)
data = data.replace(
    "      <div class=\"sec-bridge\" data-lang=\"en\">As λ grows, Poisson approaches the normal distribution.</div>\n    </div>\n    </div>",
    "      <div class=\"sec-bridge\" data-lang=\"en\">As λ grows, Poisson approaches the normal distribution.</div>\n    </div>"
)

print('  Unwrapped all morep tab-panel divs')

# Clean up
data = data.replace('\x00', '')
if not data.endswith('\n'):
    data += '\n'

open(path, 'w', encoding='utf-8').write(data)
print(f'\n  Done! Wrote {len(data)} bytes to {path}')
