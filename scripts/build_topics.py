#!/usr/bin/env python3
"""Route A: split index.html into per-topic pages (JA + EN).

Generates:
  topics/<slug>.html         (JA)     - 13 files
  en/topics/<slug>.html      (EN)     - 13 files
  sitemap.xml                          - root + 22 topic URLs
  robots.txt                           - sitemap pointer

Each topic page has:
  - unique <title> / meta description / keywords
  - og:type=article, og:url, og:image, og:locale
  - canonical (pre-domain placeholder, replaced via env var)
  - hreflang ja / en / x-default pairs
  - JSON-LD LearningResource + BreadcrumbList
  - minimal nav (back to hub + language switcher)
  - single-language content (data-lang filtered at build time)
  - prev/next topic navigation
  - full footer

Usage:
  python3 scripts/build_topics.py [--domain=https://example.com]
  (domain defaults to https://statplay.sasailab.com)
"""
from __future__ import annotations
import os, re, sys, json, pathlib, argparse
from bs4 import BeautifulSoup, NavigableString

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = ROOT / 'index.html'
PKG  = ROOT / 'package.json'
CONTENT_JSON = ROOT / 'content' / 'topics.json'

def get_version() -> str:
    pkg = json.loads(PKG.read_text(encoding='utf-8'))
    return pkg.get('version', '0.0.0')

def load_content() -> tuple[list[dict], list[dict]]:
    data = json.loads(CONTENT_JSON.read_text(encoding='utf-8'))
    return data['topics'], data['columns']

# --- Topic / column metadata (loaded from content/topics.json) ----------------
TOPICS, COLUMNS = load_content()

# --- CLI ----------------------------------------------------------------------
def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument('--domain', default='https://statplay.sasailab.com',
                    help='Absolute URL base (default: statplay.sasailab.com)')
    ap.add_argument('--ga-id', default=os.environ.get('GA_MEASUREMENT_ID', 'G-KSDDV3KMKL'),
                    help='Google Analytics Measurement ID (e.g. G-XXXXXXXXXX)')
    return ap.parse_args()

# --- HTML helpers -------------------------------------------------------------
def strip_lang(soup: BeautifulSoup, keep: str) -> None:
    """Remove all elements carrying data-lang=<other>; drop data-lang attrs we keep."""
    drop = 'en' if keep == 'ja' else 'ja'
    for el in soup.select(f'[data-lang="{drop}"]'):
        el.decompose()
    for el in soup.select(f'[data-lang="{keep}"]'):
        del el['data-lang']

def rel_asset(depth: int, rel: str) -> str:
    """Rewrite './foo' / 'foo' to work from a page 'depth' levels deep."""
    if rel.startswith(('http://','https://','//','#','mailto:','tel:','data:')):
        return rel
    if rel.startswith('./'):
        rel = rel[2:]
    prefix = '../' * depth
    return prefix + rel

def to_plain(html_str: str) -> str:
    """Strip tags; compress whitespace; used for JSON-LD teaches text fallback."""
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html_str)).strip()

# --- Page builder -------------------------------------------------------------
CSS_ADDON = """
<style>
/* Topic page overrides: slim nav, readable centered column */
body.topic-page #mainNav .nav-links a,
body.topic-page #mainNav .nav-links button { font-size: 12px; }
body.topic-page section { padding-top: 0; }
body.topic-page .topic-breadcrumb {
  max-width: 1180px; margin: 48px auto 4px; padding: 0 32px;
  font-family:'Courier New', monospace; font-size: 12px; color: var(--dim);
}
body.topic-page .topic-breadcrumb a { color: var(--cyan); text-decoration: none; }
body.topic-page .topic-breadcrumb a:hover { text-decoration: underline; }
body.topic-page .topic-breadcrumb .sep { margin: 0 8px; opacity: .5; }
body.topic-page main { padding-top: 4px; }
body.topic-page .topic-h1 {
  max-width: 1180px; margin: 0 auto 8px; padding: 0 32px;
  font-family:'Courier New', monospace; font-size: 28px; line-height:1.35;
  color: var(--text); letter-spacing: .02em;
}
body.topic-page .topic-lead {
  max-width: 1180px; margin: 0 auto 32px; padding: 0 32px;
  color: var(--dim); font-size: 14px; line-height: 1.85;
}
body.topic-page nav.topic-nav {
  max-width: 1180px; margin: 48px auto 80px; padding: 24px 32px;
  display: flex; justify-content: space-between; gap: 16px;
  border-top: 1px dashed rgba(255,255,255,.1);
}
body.topic-page nav.topic-nav a {
  color: var(--cyan); text-decoration: none;
  font-family:'Courier New', monospace; font-size: 13px;
  padding: 8px 14px; border: 1px solid rgba(0,243,255,.3);
}
body.topic-page nav.topic-nav a:hover { background: rgba(0,243,255,.08); }
body.topic-page nav.topic-nav a.empty { visibility: hidden; pointer-events: none; }
body.topic-page .topic-hub-link {
  max-width: 1180px; margin: 0 auto 20px; padding: 0 32px;
  font-size: 12px;
}
body.topic-page .topic-hub-link a {
  color: var(--magenta); text-decoration: none;
  font-family:'Courier New', monospace;
}
</style>
"""

def build_page(topic_idx: int, lang: str, domain: str, section_soup, head_extras: dict, ga_id: str = ''):
    t = TOPICS[topic_idx]
    prev_t = TOPICS[topic_idx - 1] if topic_idx > 0 else None
    next_t = TOPICS[topic_idx + 1] if topic_idx + 1 < len(TOPICS) else None
    slug = t['slug']

    title = t[f'{lang}_title']
    desc  = t[f'{lang}_desc']
    kw    = t[f'{lang}_kw']
    html_lang = 'ja' if lang == 'ja' else 'en'
    og_locale = 'ja_JP' if lang == 'ja' else 'en_US'
    alt_locale = 'en_US' if lang == 'ja' else 'ja_JP'

    # Paths — JA lives in topics/; EN in en/topics/ so depth is 2 for EN, 1 for JA
    depth = 1 if lang == 'ja' else 2
    canonical_path = (f'/topics/{slug}.html' if lang == 'ja'
                      else f'/en/topics/{slug}.html')
    alt_path_ja = f'/topics/{slug}.html'
    alt_path_en = f'/en/topics/{slug}.html'

    # Clone section, strip opposite-language nodes
    sec_clone = BeautifulSoup(str(section_soup), 'html.parser')
    strip_lang(sec_clone, lang)
    # Remove any hub-only cross-link (.topic-deep-link) — topic pages shouldn't link to themselves
    for dl in sec_clone.select('.topic-deep-link'):
        dl.decompose()
    # Topic pages have a single section; pre-activate reveal so content is visible immediately
    for el in sec_clone.select('.reveal'):
        el['class'] = [c for c in el.get('class', []) if c != 'reveal'] + ['reveal', 'in']
    # Translate data-title attributes for EN pages
    if lang == 'en':
        title_map = {
            '標準正規分布': 'Standard Normal',
            '標準化モーフ': 'Standardization Morph',
            '中心極限定理': 'Central Limit Theorem',
            '正規分布': 'Normal Distribution',
            '大数の法則': 'Law of Large Numbers',
            '信頼区間': 'Confidence Interval',
            '仮説検定': 'Hypothesis Test',
            'α・β・検出力': 'α · β · Power',
            't分布': 't-Distribution',
            'χ²分布': 'χ² Distribution',
            'F分布': 'F-Distribution',
            '二項分布': 'Binomial',
            'ポアソン分布': 'Poisson',
            '指数分布': 'Exponential',
            '単回帰分析': 'Simple Regression',
            'カイ二乗検定': 'Chi-Squared Test',
            '重回帰分析': 'Multiple Regression',
            'ベイズの定理': "Bayes' Theorem",
        }
        for el in sec_clone.select('[data-title]'):
            ja_title = el.get('data-title', '')
            if ja_title in title_map:
                el['data-title'] = title_map[ja_title]

    # Build prev/next
    def nav_link(tt, arrow):
        if not tt: return '<a class="empty" aria-hidden="true">—</a>'
        label = tt[f'{lang}_title'].split(' — ')[0]
        href = f'./{tt["slug"]}.html'
        if arrow == 'prev':
            return f'<a href="{href}" rel="prev">← {label}</a>'
        else:
            return f'<a href="{href}" rel="next">{label} →</a>'

    prev_html = nav_link(prev_t, 'prev')
    next_html = nav_link(next_t, 'next')

    # Breadcrumb label
    bc_hub = 'StatPlay'
    bc_topics = 'トピック' if lang == 'ja' else 'Topics'
    bc_title = title.split(' — ')[0]

    # JSON-LD
    ld = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'LearningResource',
                'name': title,
                'description': desc,
                'inLanguage': html_lang,
                'educationalLevel': 'intermediate',
                'learningResourceType': 'interactive visualization',
                'teaches': t['teaches'],
                'isPartOf': {
                    '@type': 'WebSite',
                    'name': 'StatPlay',
                    'url': f'{domain}/',
                },
                'url': f'{domain}{canonical_path}',
                'image': f'{domain}/stat_cyber_og.png',
                'author': {'@type':'Organization','name':'Sasai Lab'},
                'license': 'https://creativecommons.org/licenses/by-nc/4.0/',
            },
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    {'@type':'ListItem','position':1,'name':bc_hub,'item':f'{domain}/'},
                    {'@type':'ListItem','position':2,'name':bc_topics,'item':f'{domain}/topics/'},
                    {'@type':'ListItem','position':3,'name':bc_title},
                ],
            }
        ]
    }

    # Assets (rewritten for depth)
    css_href      = rel_asset(depth, 'css/stat_cyber.css')
    js_src        = rel_asset(depth, 'js/main.js')
    manifest_href = rel_asset(depth, 'manifest.webmanifest')
    icon_192      = rel_asset(depth, 'icons/icon-192.png')
    og_image      = rel_asset(depth, 'stat_cyber_og.png')
    hub_href      = rel_asset(depth, 'index.html')
    topics_index  = rel_asset(depth, 'topics/')

    # Cross-language URL
    if lang == 'ja':
        switch_href = f'../en/topics/{slug}.html'
        switch_label = 'EN'
    else:
        switch_href = f'../../topics/{slug}.html'
        switch_label = '日本語'

    footer_ja = head_extras['footer_ja_html'] if lang == 'ja' else None
    footer_en = head_extras['footer_en_html'] if lang == 'en' else None
    footer_html = footer_ja or footer_en

    if ga_id:
        ga_snippet = (f'<!-- Google Analytics -->\n'
                      f'<script async src="https://www.googletagmanager.com/gtag/js?id={ga_id}"></script>\n'
                      f'<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag(\'js\',new Date());gtag(\'config\',\'{ga_id}\');</script>')
    else:
        ga_snippet = ''

    html = f'''<!DOCTYPE html>
<html lang="{html_lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{ga_snippet}
<meta name="description" content="{desc}">
<meta name="keywords" content="{kw}">
<meta name="author" content="Sasai Lab">
<meta name="robots" content="index, follow, max-image-preview:large">
<title>{title} — StatPlay</title>

<link rel="canonical" href="{domain}{canonical_path}">
<link rel="alternate" hreflang="ja" href="{domain}{alt_path_ja}">
<link rel="alternate" hreflang="en" href="{domain}{alt_path_en}">
<link rel="alternate" hreflang="x-default" href="{domain}{alt_path_ja}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="StatPlay">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{domain}{canonical_path}">
<meta property="og:image" content="{domain}/stat_cyber_og.png">
<meta property="og:image:alt" content="StatPlay — {bc_title}">
<meta property="og:locale" content="{og_locale}">
<meta property="og:locale:alternate" content="{alt_locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{domain}/stat_cyber_og.png">

<link rel="manifest" href="{manifest_href}">
<meta name="theme-color" content="#00f3ff">
<link rel="apple-touch-icon" href="{icon_192}">
<link rel="icon" href="{icon_192}" type="image/png">

<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; img-src 'self' data: https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com">
<link rel="stylesheet" href="{css_href}">
{CSS_ADDON}

<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=2)}
</script>
</head>
<body class="topic-page">
<a href="#main-content" class="skip-to-main">{'メインコンテンツへスキップ' if lang=='ja' else 'Skip to main content'}</a>

<nav id="mainNav">
  <a class="logo" href="{hub_href}" title="Back to hub">StatPlay</a>
  <div class="nav-links" id="navLinks">
    <a href="{hub_href}">← {bc_hub}</a>
    <a href="{switch_href}" hreflang="{'en' if lang=='ja' else 'ja'}" rel="alternate">{switch_label}</a>
    <button class="lang-toggle theme-toggle" id="themeToggle" type="button" aria-pressed="false" aria-label="Switch to light theme" title="Switch to light theme">LIGHT</button>
  </div>
</nav>

<div class="topic-breadcrumb" aria-label="{'パンくず' if lang=='ja' else 'Breadcrumb'}">
  <a href="{hub_href}">{bc_hub}</a><span class="sep">›</span>
  <a href="{hub_href}#{slug}">{bc_topics}</a><span class="sep">›</span>
  <span>{bc_title}</span>
</div>

<main id="main-content">
  <h1 class="topic-h1"><a href="{hub_href}" style="color:inherit;text-decoration:none">{title}</a></h1>
  <p class="topic-lead">{desc}</p>
  {str(sec_clone)}
</main>

<nav class="topic-nav" aria-label="{'前後のトピック' if lang=='ja' else 'Previous / Next topic'}">
  {prev_html}
  {next_html}
</nav>

{footer_html}

<script type="module" src="{js_src}"></script>
</body>
</html>
'''
    return html

# --- sitemap / robots ---------------------------------------------------------
def build_sitemap(domain: str) -> str:
    urls = ['/']  # hub
    urls += [f'/topics/{t["slug"]}.html' for t in TOPICS]
    urls += [f'/en/topics/{t["slug"]}.html' for t in TOPICS]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
             '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for u in urls:
        lines.append('  <url>')
        lines.append(f'    <loc>{domain}{u}</loc>')
        if u.startswith('/topics/') or u.startswith('/en/topics/'):
            slug = u.rsplit('/',1)[-1].replace('.html','')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="ja" href="{domain}/topics/{slug}.html"/>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{domain}/en/topics/{slug}.html"/>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{domain}/topics/{slug}.html"/>')
            lines.append('    <changefreq>monthly</changefreq>')
            lines.append('    <priority>0.8</priority>')
        else:
            lines.append(f'    <xhtml:link rel="alternate" hreflang="ja" href="{domain}/"/>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{domain}/?lang=en"/>')
            lines.append('    <changefreq>weekly</changefreq>')
            lines.append('    <priority>1.0</priority>')
        lines.append('  </url>')
    for col in COLUMNS:
        for path in (col['ja_path'], col['en_path']):
            lines.append('  <url>')
            lines.append(f'    <loc>{domain}{path}</loc>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="ja" href="{domain}{col["ja_path"]}"/>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{domain}{col["en_path"]}"/>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{domain}{col["ja_path"]}"/>')
            lines.append('    <changefreq>monthly</changefreq>')
            lines.append('    <priority>0.7</priority>')
            lines.append('  </url>')
    lines.append('</urlset>')
    return '\n'.join(lines) + '\n'

def build_robots(domain: str) -> str:
    return (
        'User-agent: *\n'
        'Allow: /\n'
        '\n'
        f'Sitemap: {domain}/sitemap.xml\n'
    )

# --- Main ---------------------------------------------------------------------
def main():
    args = parse_args()
    domain = args.domain.rstrip('/')

    src_html = SRC.read_text(encoding='utf-8')

    # Inject version from package.json before parsing
    version = get_version()
    src_html = re.sub(r'(id="app-version(?:-en)?">)v[\d.]+', rf'\1v{version}', src_html)

    soup = BeautifulSoup(src_html, 'html.parser')

    # Extract footer as two variants (JA-only and EN-only)
    footer_el = soup.find('footer')
    if not footer_el:
        print('ERROR: no <footer> found'); sys.exit(1)
    footer_ja_soup = BeautifulSoup(str(footer_el), 'html.parser')
    footer_en_soup = BeautifulSoup(str(footer_el), 'html.parser')
    strip_lang(footer_ja_soup, 'ja')
    strip_lang(footer_en_soup, 'en')

    # Find each section by id
    sec_by_slug = {}
    for t in TOPICS:
        el = soup.find('section', id=t['slug'])
        if not el:
            print(f'ERROR: <section id="{t["slug"]}"> not found'); sys.exit(1)
        sec_by_slug[t['slug']] = el

    # Ensure output dirs
    (ROOT / 'topics').mkdir(exist_ok=True)
    (ROOT / 'en' / 'topics').mkdir(parents=True, exist_ok=True)

    extras = dict(
        footer_ja_html=str(footer_ja_soup),
        footer_en_html=str(footer_en_soup),
    )

    count = 0
    for i, t in enumerate(TOPICS):
        sec = sec_by_slug[t['slug']]
        for lang in ('ja','en'):
            page = build_page(i, lang, domain, sec, extras, ga_id=args.ga_id)
            out = (ROOT / 'topics' / f'{t["slug"]}.html' if lang == 'ja'
                   else ROOT / 'en' / 'topics' / f'{t["slug"]}.html')
            out.write_text(page, encoding='utf-8')
            count += 1

    # Update column page footers from the shared footer
    col_count = 0
    for col in COLUMNS:
        for lang, footer_html in (('ja', str(footer_ja_soup)), ('en', str(footer_en_soup))):
            path_key = 'ja_path' if lang == 'ja' else 'en_path'
            col_file = ROOT / col[path_key].lstrip('/')
            if not col_file.exists():
                continue
            col_html = col_file.read_text(encoding='utf-8')
            col_soup = BeautifulSoup(col_html, 'html.parser')
            old_footer = col_soup.find('footer')
            if old_footer:
                new_footer = BeautifulSoup(footer_html, 'html.parser')
                old_footer.replace_with(new_footer)
                col_file.write_text(str(col_soup), encoding='utf-8')
                col_count += 1
    # Also update column pages not in COLUMNS list
    for col_dir in ((ROOT / 'columns'), (ROOT / 'en' / 'columns')):
        if not col_dir.exists():
            continue
        lang = 'en' if 'en' in col_dir.parts else 'ja'
        footer_html = str(footer_en_soup) if lang == 'en' else str(footer_ja_soup)
        for col_file in col_dir.glob('*.html'):
            rel = '/' + col_file.relative_to(ROOT).as_posix()
            already = any(
                col[('en_path' if lang == 'en' else 'ja_path')] == rel
                for col in COLUMNS
            )
            if already:
                continue
            col_html = col_file.read_text(encoding='utf-8')
            col_soup = BeautifulSoup(col_html, 'html.parser')
            old_footer = col_soup.find('footer')
            if old_footer:
                new_footer = BeautifulSoup(footer_html, 'html.parser')
                old_footer.replace_with(new_footer)
                col_file.write_text(str(col_soup), encoding='utf-8')
                col_count += 1

    # sitemap + robots
    (ROOT / 'sitemap.xml').write_text(build_sitemap(domain), encoding='utf-8')
    (ROOT / 'robots.txt').write_text(build_robots(domain), encoding='utf-8')

    # Inject version + GA snippet into hub index.html
    hub = src_html
    if args.ga_id:
        ga_tag = (f'<script async src="https://www.googletagmanager.com/gtag/js?id={args.ga_id}"></script>\n'
                  f'<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag(\'js\',new Date());gtag(\'config\',\'{args.ga_id}\');</script>')
    else:
        ga_tag = ''
    hub = hub.replace('<!-- __GA_SNIPPET__ -->', ga_tag)
    SRC.write_text(hub, encoding='utf-8')

    print(f'Built {count} topic pages (JA+EN), {col_count} column footers, sitemap.xml, robots.txt - domain={domain}')
    if args.ga_id:
        print(f'GA Measurement ID: {args.ga_id}')

if __name__ == '__main__':
    main()
