"""Edit the source photo through GMS, cache the response, then restore its actual head pixels."""

import argparse
import base64
import io
import json
from pathlib import Path
import urllib.error
import urllib.request

from PIL import Image, ImageDraw, ImageFilter, ImageOps
from generate_welcome import ENDPOINT, ROOT, image_blocks, settings


def source_photo():
    with Image.open(ROOT / 'assets/references/byunggyu4.jpg') as source:
        return ImageOps.exif_transpose(source).convert('RGB').resize((864, 1536), Image.Resampling.LANCZOS)


def restore_head(edited_path, output):
    original = source_photo()
    with Image.open(edited_path) as edited:
        edited = edited.convert('RGB').resize(original.size, Image.Resampling.LANCZOS)
        # Coordinates follow the head contour on the 1152x2048 reference preview.
        contour = [(568,588),(606,589),(633,602),(649,626),(655,651),
                   (652,685),(653,707),(642,742),(625,767),(603,783),
                   (579,789),(554,782),(532,770),(516,750),(505,725),
                   (496,705),(485,682),(484,657),(489,632),(509,610),(538,595)]
        mask = Image.new('L', original.size)
        ImageDraw.Draw(mask).polygon([(round(x*.75), round(y*.75)) for x,y in contour], fill=255)
        feathered = mask.filter(ImageFilter.GaussianBlur(1.5))
        # Keep the interior exactly original; feather only the outside seam.
        core = mask.filter(ImageFilter.MinFilter(9))
        feathered.paste(255, mask=core)
        final = Image.composite(original, edited, feathered)
        output.parent.mkdir(parents=True, exist_ok=True)
        final.save(output)
        # Verify every fully protected head pixel against the resized source.
        a, b, m = original.tobytes(), final.tobytes(), core.tobytes()
        count = sum(bool(v) for v in m)
        assert all(a[i*3:i*3+3] == b[i*3:i*3+3] for i,v in enumerate(m) if v == 255)
        print(f'Saved {output.relative_to(ROOT)}; protected head pixels verified: {count}.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--composite', action='store_true', help='Restore source head locally; never calls API')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    original = source_photo()
    local = ROOT / '.local'
    local.mkdir(exist_ok=True)
    edited_path = local / 'byeonggyu-photo-edit.png'
    if args.composite:
        restore_head(edited_path, ROOT / 'assets/images/byeonggyu-photo-welcome.png')
        return
    config = settings()
    if config.get('GMS_IMAGE_ENDPOINT') != ENDPOINT or not config.get('GMS_API_KEY') or not config.get('GMS_IMAGE_MODEL'):
        raise ValueError('Review GMS settings in .env; credentials are never printed.')
    cache = local / 'gms-photo-edit-response.json'
    if args.dry_run:
        print('Photo edit locally validated: one reference photo, 864x1536; no API call.')
        return
    if edited_path.exists():
        print('Edited photo already exists. No API call.')
        return
    if cache.exists():
        result = json.loads(cache.read_text(encoding='utf-8'))
        print('Reusing saved response. No API call.')
    else:
        buffer = io.BytesIO()
        original.save(buffer, format='JPEG', quality=95)
        content = [{'type':'text', 'text': (ROOT / 'PHOTO_EDIT_REQUEST.txt').read_text(encoding='utf-8')},
                   {'type':'image', 'mime_type':'image/jpeg', 'data':base64.b64encode(buffer.getvalue()).decode('ascii')}]
        payload = {'model':config['GMS_IMAGE_MODEL'], 'input':content}
        request = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(),
                  headers={'Content-Type':'application/json','x-goog-api-key':config['GMS_API_KEY']}, method='POST')
        print('Sending one photographic clothing/background edit to GMS.', flush=True)
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise ValueError(f'GMS HTTP {error.code}; no automatic retry. Response body withheld.') from None
        cache.write_text(json.dumps(result).replace(config['GMS_API_KEY'],'[REDACTED]'), encoding='utf-8')
    blocks = list(image_blocks(result))
    if not blocks:
        raise ValueError('No inline image. Response cached; do not repeat the API request.')
    raw = base64.b64decode(blocks[-1]['data'], validate=True)
    with Image.open(io.BytesIO(raw)) as result_image:
        result_image.load()
        result_image.save(edited_path, format='PNG')
        print(f'Saved local edit for alignment review: {result_image.size}. Original head restoration pending.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(str(error))
