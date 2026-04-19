#!/usr/bin/env python3
"""Remove tab UI from dists section, show all panels stacked vertically."""

path = 'index.html'
data = open(path, 'r', encoding='utf-8').read()

# Remove the tab-bar for dists
tab_bar = '''    <div class="tab-bar" data-tab-group="dists">
      <button class="tab-btn active" data-tab="dists-t" style="color:var(--cyan)"><span data-lang="ja">t 分布</span><span data-lang="en">t dist.</span></button>
      <button class="tab-btn" data-tab="dists-chi" style="color:var(--magenta)"><span data-lang="ja">χ² 分布</span><span data-lang="en">χ² dist.</span></button>
      <button class="tab-btn" data-tab="dists-f" style="color:var(--yellow)"><span data-lang="ja">F 分布</span><span data-lang="en">F dist.</span></button>
    </div>'''
data = data.replace(tab_bar + '\n', '')
print('  Removed dists tab-bar')

# Unwrap tab-panel for t (first one, has "active")
data = data.replace(
    '    <div class="tab-panel active" id="dists-t">\n    <div class="panel">',
    '    <div class="panel">'
)

# Close of t panel: </div>\n    </div>\n    <div class="tab-panel" id="dists-chi">
# Remove closing </div> of tab-panel and opening of next tab-panel
data = data.replace(
    '    </div>\n    </div>\n    <div class="tab-panel" id="dists-chi">\n    <div class="panel">',
    '    </div>\n\n    <div class="panel">'
)

# Close of chi panel: </div>\n    </div>\n    <div class="tab-panel" id="dists-f">
data = data.replace(
    '    </div>\n    </div>\n    <div class="tab-panel" id="dists-f">\n    <div class="panel">',
    '    </div>\n\n    <div class="panel">'
)

# Close of F panel: the last tab-panel closing </div> needs to be removed
# Current structure ends with: </div>\n  </div>\n    </div>
# The </div> after </div>\n  </div> is the tab-panel close
# Find the F distribution share row end, then fix closing divs
# Structure: ...fCanvas share-row...</div>\n    </div>\n  </div>\n    </div>
#   panel close, ?, dist-stack close, tab-panel close
# We need to remove the extra </div> for tab-panel

# The F panel ends with:
#     </div>        <- panel close
#   </div>          <- this was tab-panel close, needs removal
#     </div>        <- ???
# Let me match the exact pattern
data = data.replace(
    '    </div>\n  </div>\n    </div>',
    '    </div>\n  </div>',
    1  # only first occurrence
)

print('  Unwrapped all dists tab-panel divs')

# Also remove the tab JS script block if it's no longer needed
# Check if any tab-bar remains
if 'class="tab-bar"' not in data:
    # Remove the tab JS script
    tab_js_start = data.find("<script>\ndocument.querySelectorAll('.tab-bar')")
    if tab_js_start >= 0:
        tab_js_end = data.find('</script>', tab_js_start) + len('</script>')
        data = data[:tab_js_start] + data[tab_js_end:]
        print('  Removed tab JS (no more tab-bars)')

    # Also remove tab CSS classes if desired (optional, they won't hurt)

# Clean up
data = data.replace('\x00', '')
if not data.endswith('\n'):
    data += '\n'

open(path, 'w', encoding='utf-8').write(data)
print(f'\n  Done! Wrote {len(data)} bytes to {path}')
