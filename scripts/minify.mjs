#!/usr/bin/env node
/**
 * minify.mjs — JS (terser) + CSS (clean-css) minification
 *
 * Usage:
 *   node scripts/minify.mjs              # output to dist/
 *   node scripts/minify.mjs --clean      # remove dist/ first
 *
 * Copies the full site to dist/, then minifies JS and CSS in-place.
 * HTML and other assets are copied as-is.
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'fs';
import { resolve, join, relative } from 'path';
import { minify } from 'terser';
import CleanCSS from 'clean-css';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

const EXCLUDE_DIRS = [
  '.git', 'node_modules', 'dist', 'scripts', 'outputs',
  '.github', '.claude', '.vscode',
];
const EXCLUDE_FILES = new Set([
  'eslint.config.js', 'package.json', 'package-lock.json',
  'CLAUDE.md', 'README.md', 'test_spec.md',
  '.gitignore', '.eslintrc.json',
]);
const EXCLUDE_EXTS = new Set(['.md', '.py', '.log']);

const args = process.argv.slice(2);
const doClean = args.includes('--clean');

function walk(dir, base = dir) {
  const entries = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(base, full);
    if (entry.isDirectory()) {
      if (dir === base && EXCLUDE_DIRS.includes(entry.name)) continue;
      entries.push(...walk(full, base));
    } else {
      const ext = entry.name.slice(entry.name.lastIndexOf('.'));
      if (!EXCLUDE_FILES.has(entry.name) && !EXCLUDE_EXTS.has(ext)) entries.push(rel);
    }
  }
  return entries;
}

async function main() {
  console.log('=== StatPlay — Minify ===\n');

  // Clean dist if requested
  if (doClean && existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
    console.log('Cleaned dist/');
  }

  // Copy everything to dist/
  mkdirSync(DIST, { recursive: true });
  const files = walk(ROOT);

  let copied = 0;
  for (const rel of files) {
    const src = join(ROOT, rel);
    const dst = join(DIST, rel);
    mkdirSync(resolve(dst, '..'), { recursive: true });
    cpSync(src, dst);
    copied++;
  }
  console.log(`Copied ${copied} files to dist/\n`);

  // Minify JS
  let jsCount = 0, jsSaved = 0;
  const jsFiles = files.filter(f => f.endsWith('.js'));
  for (const rel of jsFiles) {
    const dst = join(DIST, rel);
    const code = readFileSync(dst, 'utf8');
    const origSize = Buffer.byteLength(code, 'utf8');
    try {
      const result = await minify(code, {
        module: true,
        compress: { passes: 2 },
        mangle: true,
        sourceMap: false,
      });
      if (result.code) {
        writeFileSync(dst, result.code, 'utf8');
        const newSize = Buffer.byteLength(result.code, 'utf8');
        const pct = ((1 - newSize / origSize) * 100).toFixed(1);
        console.log(`  JS  ${rel}  ${fmtKB(origSize)} → ${fmtKB(newSize)}  (−${pct}%)`);
        jsSaved += origSize - newSize;
        jsCount++;
      }
    } catch (e) {
      console.error(`  JS  ${rel}  FAILED: ${e.message}`);
    }
  }

  // Minify CSS
  let cssCount = 0, cssSaved = 0;
  const cleanCSS = new CleanCSS({ level: 2 });
  const cssFiles = files.filter(f => f.endsWith('.css'));
  for (const rel of cssFiles) {
    const dst = join(DIST, rel);
    const code = readFileSync(dst, 'utf8');
    const origSize = Buffer.byteLength(code, 'utf8');
    const result = cleanCSS.minify(code);
    if (result.errors.length === 0) {
      writeFileSync(dst, result.styles, 'utf8');
      const newSize = Buffer.byteLength(result.styles, 'utf8');
      const pct = ((1 - newSize / origSize) * 100).toFixed(1);
      console.log(`  CSS ${rel}  ${fmtKB(origSize)} → ${fmtKB(newSize)}  (−${pct}%)`);
      cssSaved += origSize - newSize;
      cssCount++;
    } else {
      console.error(`  CSS ${rel}  FAILED: ${result.errors.join(', ')}`);
    }
  }

  console.log(`\n✓ Minified ${jsCount} JS files  (saved ${fmtKB(jsSaved)})`);
  console.log(`✓ Minified ${cssCount} CSS files (saved ${fmtKB(cssSaved)})`);
  console.log(`✓ Total saved: ${fmtKB(jsSaved + cssSaved)}`);
  console.log(`\nOutput: ${DIST}`);
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

main().catch(e => { console.error(e); process.exit(1); });
