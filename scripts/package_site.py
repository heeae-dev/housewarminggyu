"""Copy only the public invitation assets into dist, leaving private files out."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
FILES = ('index.html', 'styles.css', 'app.js', 'invitation-letter.js', 'assets/favicon.svg',
         'assets/images/byeonggyu-photo-welcome.png', 'assets/images/byeonggyu-photo-shy.png',
         'assets/images/byeonggyu-photo-schedule.png', 'assets/images/byeonggyu-photo-bad.png',
         'assets/images/byeonggyu-photo-happy.png', 'assets/images/byeonggyu-photo-food.png')
destination = ROOT / 'dist'
for name in FILES:
    source, target = ROOT / name, destination / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
(destination / '.nojekyll').touch()
actual = {p.relative_to(destination).as_posix() for p in destination.rglob('*') if p.is_file()}
expected = set(FILES) | {'.nojekyll'}
if actual != expected:
    raise SystemExit('Unexpected files in dist; review its contents before publishing.')
print(f'Packaged {len(actual)} public files in dist/. No credentials or source photos included.')
