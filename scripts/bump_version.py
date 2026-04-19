#!/usr/bin/env python3
"""Auto-bump version in package.json based on git diff stats since last tag.

Rules:
  patch (0.0.x) : ≤50 changed lines
  minor (0.x.0) : 51–500 changed lines
  major (x.0.0) : >500 changed lines

Usage:
  python scripts/bump_version.py          # auto-detect bump level
  python scripts/bump_version.py --level patch   # force a specific level
  python scripts/bump_version.py --dry-run       # show what would happen
  python scripts/bump_version.py --tag           # also create a git tag
"""
from __future__ import annotations
import json, pathlib, subprocess, sys, argparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
PKG  = ROOT / 'package.json'

THRESHOLDS = {'patch': 50, 'minor': 500}


def git(*args: str) -> str:
    r = subprocess.run(['git', *args], capture_output=True, text=True, cwd=ROOT)
    return r.stdout.strip()


def last_tag() -> str | None:
    tag = git('describe', '--tags', '--abbrev=0')
    return tag if tag and not tag.startswith('fatal') else None


def changed_lines(since: str | None) -> int:
    if since:
        stat = git('diff', '--stat', f'{since}..HEAD')
    else:
        stat = git('diff', '--stat', '--cached', 'HEAD')
        if not stat:
            stat = git('log', '--stat', '--format=')
    if not stat:
        return 0
    last_line = stat.strip().splitlines()[-1]
    import re
    nums = re.findall(r'(\d+) (?:insertions?|deletions?)', last_line)
    return sum(int(n) for n in nums)


def detect_level(lines: int) -> str:
    if lines <= THRESHOLDS['patch']:
        return 'patch'
    if lines <= THRESHOLDS['minor']:
        return 'minor'
    return 'major'


def bump(version: str, level: str) -> str:
    parts = [int(x) for x in version.split('.')]
    while len(parts) < 3:
        parts.append(0)
    if level == 'major':
        parts = [parts[0] + 1, 0, 0]
    elif level == 'minor':
        parts = [parts[0], parts[1] + 1, 0]
    else:
        parts = [parts[0], parts[1], parts[2] + 1]
    return '.'.join(str(p) for p in parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--level', choices=['patch', 'minor', 'major'])
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--tag', action='store_true', help='Create git tag after bump')
    args = ap.parse_args()

    pkg = json.loads(PKG.read_text(encoding='utf-8'))
    old_ver = pkg.get('version', '0.0.0')

    tag = last_tag()
    lines = changed_lines(tag)
    level = args.level or detect_level(lines)
    new_ver = bump(old_ver, level)

    print(f'Since: {tag or "(no tag - full history)"}')
    print(f'Changed lines: {lines}')
    print(f'Level: {level}')
    print(f'Version: {old_ver} -> {new_ver}')

    if args.dry_run:
        print('(dry run - no files modified)')
        return

    pkg['version'] = new_ver
    PKG.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Updated package.json')

    if args.tag:
        git('tag', f'v{new_ver}')
        print(f'Created tag v{new_ver}')


if __name__ == '__main__':
    main()
