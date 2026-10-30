"""Create one photographic gesture variant through GMS; reuse cached results."""
import argparse
import base64
import io
import json
import urllib.error
import urllib.request
from PIL import Image
from generate_welcome import ROOT, ENDPOINT, settings, image_blocks
from edit_photo import restore_head

POSES = {
    'food': 'Add a cute opaque pastel pink cooking apron over his existing pink pajamas. The apron has MANY generous layered pink-and-white ruffles: wide frilly shoulder straps, a frilled bib edge, multiple fluffy ruffle tiers around the skirt, delicate lace trim, and a small ribbon bow at the waist. It is whimsical, sweet, modest, fully clothed, and realistically made from cotton fabric. Change his arms so he holds a round serving plate full of crispy golden Korean fried chicken with BOTH hands at upper-chest level, just below the collarbone, visibly presenting the chicken toward the camera. Keep the plate entirely below his chin, never cover the face. The chicken and ruffled apron must be unmistakable. Natural hands and realistic food.',
    'happy': 'Change ONLY his arms and hands into a joyful welcoming gesture: both forearms open outward at chest height with open palms, as if warmly welcoming a friend to the party. Keep both hands away from the face and head. His original smile must remain unchanged. Keep all background furniture, lighting and the pajamas identical.',
    'bad': 'Fold his arms across his chest in a quiet, dramatically disappointed pose. Preserve the same actual face and expression. Turn the apartment lighting dim and moody, muted plum and charcoal with a subtle red glow from the side, as a humorous dark visual novel ending. Keep the same room layout and all head/body positions. No violence, no weapons, no supernatural face changes.',
    'shy': 'Change ONLY the arms and hands to a modest, bashful gesture: both hands gently clasped together just below the collarbone, elbows close to the torso. Hands must remain entirely below the chin, never cover the face or hair. A sweet, slightly awkward host sharing a private secret. Keep the actual facial expression unchanged.',
    'schedule': 'Change ONLY the arms and hands to an inviting explaining gesture: the hand on the right side of the image is raised beside his shoulder, one index finger gently pointing upward as if announcing a party time, palm and fingers anatomically natural. The other arm stays relaxed. Keep the raised finger beside the head, never over the face or hair. Keep the actual facial expression unchanged.',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pose', choices=POSES)
    parser.add_argument('--composite', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    local = ROOT / '.local'
    local.mkdir(exist_ok=True)
    output = ROOT / f'assets/images/byeonggyu-photo-{args.pose}.png'
    raw_path = local / f'byeonggyu-{args.pose}-edit.png'
    cache = local / f'gms-{args.pose}-response.json'
    if args.composite:
        restore_head(raw_path, output)
        return
    if output.exists() or raw_path.exists():
        print('Variant already exists; no API call. Use --composite for local head restoration.')
        return
    config = settings()
    if config.get('GMS_IMAGE_ENDPOINT') != ENDPOINT or not config.get('GMS_API_KEY') or not config.get('GMS_IMAGE_MODEL'):
        raise ValueError('Review GMS settings; credentials are never printed.')
    prompt = ('Edit the attached real photograph, NOT a new portrait. Preserve the exact same adult man, identical head position, face, hairstyle, facial expression, head size, camera angle, body position, framing, pink pajamas, slippers, lighting, and apartment background. '
              'The original head pixels will be pasted back at the same location, so the head, neck and shoulders must NOT shift. No face retouching, no head tilting, no person redesign, no anime or illustration. '
              + POSES[args.pose] + ' Keep the exact source composition, 9:16, full body head to toe. The room must stay identical. Only arms and hands may change. No added objects, text, UI, hearts, logos, watermarks, or other people. Return one edited photograph.')
    if args.pose == 'bad':
        prompt = ('Edit this real photograph into a humorous dark visual novel ending. Keep the exact same adult man, actual face, facial expression, hairstyle, head location and size, neck and shoulders alignment, camera angle, full-body stance, pink pajamas and room layout. The original head pixels will be composited back afterward, so never move or redesign the head. '
                  + POSES['bad'] + ' Photorealistic, not anime or illustration. Portrait 9:16, head to toe, no cropping. Return exactly one edited photograph. No text, logos, UI, or watermark.')
    if args.pose == 'food':
        prompt = ('Edit the attached real photograph into a cute housewarming food presentation. Keep the SAME actual adult man, original facial features, hairstyle, facial expression, EXACT head location and size, neck location, body scale, camera angle, full-body standing position, pink pajamas, slippers, living room and lighting. The original head pixels will be pasted back at the exact same location, so NEVER move, tilt, enlarge or redesign his head. '
                  + POSES['food'] + ' Preserve the room and the full 9:16 framing. Photorealistic everyday photograph, NOT anime, illustration or 3D art. Return exactly one image. No other people, text, labels, logos, UI or watermark.')
    if args.dry_run:
        assert (ROOT / 'assets/images/byeonggyu-photo-welcome.png').is_file()
        print(f'Pose {args.pose} validated. No API call.')
        return
    if cache.exists():
        result = json.loads(cache.read_text(encoding='utf-8'))
        print('Using cached response. No API call.')
    else:
        with Image.open(ROOT / 'assets/images/byeonggyu-photo-welcome.png') as photo:
            buffer = io.BytesIO()
            photo.convert('RGB').save(buffer, format='JPEG', quality=95)
        content = [{'type':'text','text':prompt}, {'type':'image','mime_type':'image/jpeg','data':base64.b64encode(buffer.getvalue()).decode('ascii')}]
        request = urllib.request.Request(ENDPOINT, data=json.dumps({'model':config['GMS_IMAGE_MODEL'],'input':content}).encode(), headers={'Content-Type':'application/json','x-goog-api-key':config['GMS_API_KEY']}, method='POST')
        print(f'Requesting one real-photo gesture variant: {args.pose}.', flush=True)
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise ValueError(f'GMS HTTP {error.code}. No automatic retry.') from None
        cache.write_text(json.dumps(result).replace(config['GMS_API_KEY'],'[REDACTED]'), encoding='utf-8')
    blocks = list(image_blocks(result))
    if not blocks:
        raise ValueError('No inline image; response cached. Do not repeat the API request.')
    with Image.open(io.BytesIO(base64.b64decode(blocks[-1]['data'], validate=True))) as photo:
        photo.save(raw_path, format='PNG')
        print(f'Saved {args.pose} edit for alignment review: {photo.size}.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(str(error))
