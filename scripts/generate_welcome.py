"""Generate one welcome sprite through GMS. Never prints credentials or raw responses."""

import argparse
import base64
import json
import io
import mimetypes
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta/interactions"


def settings():
    values = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines():
        if line.strip() and not line.lstrip().startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            values[name.strip()] = value.strip().strip("\"").strip("'")
    for name in ("GMS_API_KEY", "GMS_IMAGE_ENDPOINT", "GMS_IMAGE_MODEL"):
        if os.environ.get(name):
            values[name] = os.environ[name]
    return values


def image_blocks(value):
    if isinstance(value, dict):
        if value.get("type") == "image" and value.get("data"):
            yield value
        for child in value.values():
            yield from image_blocks(child)
    elif isinstance(value, list):
        for child in value:
            yield from image_blocks(child)


def main():
    raise ValueError('Illustration generation retired. Use scripts/edit_photo.py for the approved real-photo workflow.')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate locally without an API request")
    args = parser.parse_args()
    config = settings()
    if not config.get("GMS_API_KEY"):
        raise ValueError("GMS_API_KEY is missing in .env.")
    if config.get("GMS_IMAGE_ENDPOINT") != ENDPOINT:
        raise ValueError("Endpoint differs from the verified GMS image guide; review configuration.")
    if not config.get("GMS_IMAGE_MODEL"):
        raise ValueError("GMS_IMAGE_MODEL is missing.")
    references = sorted(p for p in (ROOT / "assets/references").glob("*")
                        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))
    if not references:
        raise ValueError("Save Byeonggyu's reference photos in assets/references/ first.")
    prompts = re.findall(r"```text\s*\n(.*?)```", (ROOT / "IMAGE_GENERATION_REQUEST.md").read_text(encoding="utf-8"), re.S)
    if len(prompts) != 3:
        raise ValueError("Expected three image prompts in IMAGE_GENERATION_REQUEST.md.")
    output = ROOT / "assets/images/byeonggyu-welcome.png"
    if output.exists():
        print("Welcome image already exists; no API request sent.")
        return
    content = [{"type": "text", "text": prompts[1].strip() +
                "\nUse the headshot for facial likeness and the full-body photo for build. "
                "Do not reproduce the badge, lanyard, clothing, or background from the photos. "
                "Generate exactly one finished character image."}]
    for path in references:
        if path.stat().st_size > 15 * 1024 * 1024:
            raise ValueError("A reference file exceeds the local 15 MB limit; resize it first.")
        # Keep original photos untouched; reduce only the in-memory API input.
        with Image.open(path) as source:
            photo = ImageOps.exif_transpose(source).convert("RGB")
            photo.thumbnail((1600, 1600))
            buffer = io.BytesIO()
            photo.save(buffer, format="JPEG", quality=90)
        content.append({"type": "image", "mime_type": "image/jpeg",
                        "data": base64.b64encode(buffer.getvalue()).decode("ascii")})
    # Match the GMS guide's minimal Interactions payload. Dimensions and PNG
    # output remain in the prompt; optional upstream fields may be unsupported.
    payload = {"model": config["GMS_IMAGE_MODEL"], "input": content}
    if args.dry_run:
        print(f"Local validation passed: {len(references)} reference image(s). No API request sent.")
        return
    request = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode("utf-8"),
                                     headers={"Content-Type": "application/json",
                                              "x-goog-api-key": config["GMS_API_KEY"]}, method="POST")
    print(f"Requesting one welcome image with {len(references)} reference image(s).", flush=True)
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            result = json.load(response)
        cache = ROOT / ".local/gms-welcome-response.json"
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(result).replace(config["GMS_API_KEY"], "[REDACTED]"), encoding="utf-8")
    except urllib.error.HTTPError as error:
        # Classify locally; never emit the server's raw body or credentials.
        response_text = error.read(65536).decode("utf-8", errors="replace")
        try:
            error_data = json.loads(response_text)
        except json.JSONDecodeError:
            error_data = {}
        message = error_data.get("message", "") if isinstance(error_data, dict) else ""
        if isinstance(error_data, dict) and isinstance(error_data.get("error"), dict):
            message = error_data["error"].get("message", message)
        if isinstance(error_data, dict) and isinstance(error_data.get("error"), str):
            message = error_data["error"]
        message = str(message).replace(config["GMS_API_KEY"], "[REDACTED]")
        message = re.sub(r"(?i)bearer\s+\S+", "Bearer [REDACTED]", message)
        details = message.lower()
        markers = {
            "quota_or_credit": ("quota", "credit", "balance", "budget", "insufficient", "\ud06c\ub808\ub527", "\uc794\uc561", "\ud55c\ub3c4"),
            "rate_limit": ("rate_limit", "rate limit", "too many requests", "resource_exhausted"),
            "auth": ("invalid api key", "expired", "unauthorized", "authentication"),
        }
        categories = [name for name, words in markers.items() if any(word in details for word in words)]
        reason = ", ".join(categories) or "unclassified"
        safe_message = json.dumps(message[:1200], ensure_ascii=True)
        retry_after = error.headers.get("Retry-After", "not provided")
        raise ValueError(f"GMS HTTP {error.code}; category: {reason}; Retry-After: {retry_after}; message: {safe_message}. No automatic retry.") from None
    except (urllib.error.URLError, TimeoutError):
        raise ValueError("GMS network request failed or timed out. Check request status before retrying; no automatic retry.") from None
    blocks = list(image_blocks(result))
    if not blocks:
        raise ValueError("Response contained no inline image. No automatic retry; inspect response format before another request.")
    block = blocks[-1]
    raw = base64.b64decode(block["data"], validate=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(raw)) as generated:
        generated.load()
        with output.open("xb") as target:
            generated.save(target, format="PNG")
        print(f"Saved {output.relative_to(ROOT)}; size={generated.size}, mode={generated.mode}. Visual and alpha checks still required.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
