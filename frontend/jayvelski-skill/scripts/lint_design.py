#!/usr/bin/env python3
"""Jayvelski-skill linter: flags 'AI tell' patterns in HTML/CSS/TSX/JSX/Vue/Svelte files.

Usage: python lint_design.py <file-or-dir> [--strict]
Exit code 1 if any finding (so it can gate CI). Use `# jayvelski-ignore` or
`jayvelski-ignore` in the same line to allow a deliberate exception.
"""
import re, sys, pathlib

EXT = {'.html', '.css', '.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte', '.astro', '.md'}
SKIP = {'node_modules', 'dist', 'build', '.git', '.next'}

RULES = [
    ('pill-shape', r'rounded-full|border-radius:\s*(9999px|999px|50px|100px|100vw)', 'Fully rounded shape. Allowed only for avatars/dots; buttons use 10px radius, chips get removed.'),
    ('badge-class', r'\bbadge\b|\bchip\b|\bpill\b|badge-(dark|soft)', 'Badge/chip/pill element. Replace with plain muted text or an italic serif numeral.'),
    ('pulse-dot', r'animate-pulse|pulseDot|@keyframes\s+pulse|live-dot|status-dot', 'Pulsing status dot. Remove, or write one honest sentence instead.'),
    ('glass', r'backdrop-blur|backdrop-filter', 'Glassmorphism. Use a flat bar.'),
    ('sparkle', r'✨|⚡|🚀|🎉|💡|Sparkle|sparkles|wand|magic-wand', 'Sparkle/emoji/wand icon.'),
    ('ai-copy', r'AI[- ]powered|AI[- ]first|accelerated by AI|AI Summary|Powered by AI|Supercharge|Unlock the|Elevate your|Seamless|Revolutioni[sz]e|fast-paced world', 'AI/hype copy.'),
    ('popular-ribbon', r'Most popular|Best value|Recommended\b(?!\s*\))', 'Ribbon on pricing. Use the dark card for the featured plan.'),
    ('check-bullets', r'[✓✔☑]', 'Checkmark bullet. Use plain list, en dash, or italic numerals.'),
    ('glow', r'blur-(2xl|3xl)|blur\(\s*(6|8|10)\d+px|glow', 'Glow/blur blob.'),
    ('gradient-text', r'bg-clip-text|background-clip:\s*text', 'Gradient text. Allowed ONLY on the footer wordmark.'),
    ('purple-pink', r'from-(purple|violet|fuchsia|pink|indigo)-|to-(purple|violet|fuchsia|pink)-|#(a855f7|8b5cf6|ec4899|d946ef)', 'Generic purple/pink AI gradient. Use the single blue accent.'),
    ('em-dash-copy', r'>[^<{]*—[^<{]*<', 'Em dash in UI copy. Use a comma or period.'),
    ('serif-heading', r'<h[1-3][^>]*font-serif|h[1-3]\s*\{[^}]*Instrument Serif', 'Serif on a heading. The serif is italic accents only.'),
]

def scan(path):
    out = []
    try:
        lines = path.read_text(encoding='utf-8', errors='ignore').splitlines()
    except Exception:
        return out
    for i, line in enumerate(lines, 1):
        if 'jayvelski-ignore' in line:
            continue
        for name, rx, msg in RULES:
            if name == 'gradient-text' and ('Footer' in path.name or 'f-word' in line or '#word' in line):
                continue
            if name == 'pill-shape' and ('avatar' in line.lower() or 'h-1 w-1' in line or 'h-2 w-2' in line or 'f-social i' in line or 'border-radius:50%' in line.replace(' ', '')):
                continue
            if re.search(rx, line):
                out.append((str(path), i, name, msg, line.strip()[:110]))
    return out

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    root = pathlib.Path(sys.argv[1])
    files = [root] if root.is_file() else [p for p in root.rglob('*') if p.is_file() and p.suffix in EXT and not (set(p.parts) & SKIP)]
    findings = []
    for f in files:
        findings += scan(f)
    for f, ln, name, msg, src in findings:
        print(f'{f}:{ln}  [{name}] {msg}\n    {src}')
    print(f'\n{len(findings)} finding(s) in {len(files)} file(s).')
    sys.exit(1 if findings else 0)

if __name__ == '__main__':
    main()
