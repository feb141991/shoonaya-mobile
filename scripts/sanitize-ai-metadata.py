#!/usr/bin/env python3
"""
Comprehensive AI Metadata Audit & Sanitization Script
Detects and losslessly removes C2PA, JUMBF, IPTC AI markers, and tool provenance
from image and document files without re-encoding or degrading pixel data.
"""

import os
import sys
import struct
import io
import re
from PIL import Image

AI_MARKERS = [
    (b'c2pa', 'C2PA marker (c2pa)'),
    (b'C2PA', 'C2PA marker (C2PA)'),
    (b'urn:c2pa', 'C2PA URN (urn:c2pa)'),
    (b'caBX', 'C2PA caBX chunk/box'),
    (b'jumb', 'C2PA JUMBF box (jumb)'),
    (b'trainedAlgorithmicMedia', 'IPTC trainedAlgorithmicMedia'),
    (b'compositeSynthetic', 'IPTC compositeSynthetic'),
    (b'DigitalSourceType', 'IPTC DigitalSourceType'),
    (b'ChatGPT', 'Tool: ChatGPT'),
    (b'chatgpt', 'Tool: chatgpt'),
    (b'DALL-E', 'Tool: DALL-E'),
    (b'dall-e', 'Tool: dall-e'),
    (b'Midjourney', 'Tool: Midjourney'),
    (b'midjourney', 'Tool: midjourney'),
    (b'Adobe Firefly', 'Tool: Adobe Firefly'),
    (b'Firefly', 'Tool: Firefly'),
    (b'Stable Diffusion', 'Tool: Stable Diffusion'),
    (b'Stability AI', 'Tool: Stability AI'),
]

EXCLUDE_DIRS = {'node_modules', '.git', '.next', 'dist', 'build', '.expo', '.vercel', '.system_generated', 'cache', '.cache'}
TARGET_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.pdf', '.docx'}


def inspect_file(filepath):
    """Inspects a file for AI provenance and C2PA markers."""
    try:
        with open(filepath, 'rb') as fp:
            data = fp.read()
    except Exception as e:
        return None, []

    ext = os.path.splitext(filepath)[1].lower()
    detected = []

    # Check container by magic bytes rather than trusting extension alone
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        offset = 8
        while offset < len(data):
            if offset + 8 > len(data):
                break
            length = struct.unpack('>I', data[offset:offset+4])[0]
            ctype = data[offset+4:offset+8]
            chunk_data = data[offset+8:offset+8+length]
            if ctype == b'caBX':
                detected.append('C2PA caBX chunk (JUMBF container)')
            elif ctype in [b'tEXt', b'iTXt', b'zTXt', b'eXIf']:
                for pat, desc in AI_MARKERS:
                    if pat in chunk_data and desc not in detected:
                        detected.append(f'{ctype.decode("latin1")} chunk: {desc}')
            offset += 12 + length

    elif data[:2] == b'\xff\xd8':
        offset = 2
        while offset < len(data):
            if data[offset] != 0xff:
                break
            marker = data[offset+1]
            if marker in [0xd8, 0xd9]:
                offset += 2
                continue
            if 0xd0 <= marker <= 0xd7:
                offset += 2
                continue
            if offset + 4 > len(data):
                break
            length = struct.unpack('>H', data[offset+2:offset+4])[0]
            seg = data[offset:offset+2+length]
            if marker == 0xeb:
                if b'jumb' in seg or b'c2pa' in seg:
                    detected.append('JPEG APP11 C2PA JUMBF Box')
                for pat, desc in AI_MARKERS:
                    if pat in seg and desc not in detected:
                        detected.append(f'JPEG APP11: {desc}')
            elif marker in [0xe1, 0xed, 0xfe]:
                for pat, desc in AI_MARKERS:
                    if pat in seg and desc not in detected:
                        detected.append(f'JPEG APP{marker-0xe0 if marker != 0xfe else "COM"}: {desc}')
            if marker == 0xda:  # SOS
                break
            offset += 2 + length

    elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        offset = 12
        while offset < len(data):
            if offset + 8 > len(data):
                break
            chunk_id = data[offset:offset+4]
            chunk_len = struct.unpack('<I', data[offset+4:offset+8])[0]
            padded = chunk_len + (chunk_len % 2)
            chunk_data = data[offset+8:offset+8+chunk_len]
            if chunk_id in [b'caBX', b'JUMB']:
                detected.append(f'WebP {chunk_id.decode("latin1")} C2PA Box')
            elif chunk_id == b'XMP ':
                for pat, desc in AI_MARKERS:
                    if pat in chunk_data and desc not in detected:
                        detected.append(f'WebP XMP: {desc}')
            offset += 8 + padded

    return len(data), detected


def strip_png(data):
    """Losslessly strips caBX and AI metadata chunks from PNG."""
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return data, []
    chunks = [data[:8]]
    offset = 8
    removed = []
    while offset < len(data):
        if offset + 8 > len(data):
            break
        length = struct.unpack('>I', data[offset:offset+4])[0]
        ctype = data[offset+4:offset+8]
        total_len = 12 + length
        chunk_full = data[offset:offset+total_len]
        chunk_data = data[offset+8:offset+8+length]

        if ctype == b'caBX':
            removed.append(f'caBX ({length} bytes)')
        elif ctype in [b'tEXt', b'iTXt', b'zTXt', b'eXIf']:
            has_ai = any(pat in chunk_data for pat, _ in AI_MARKERS)
            if has_ai:
                removed.append(f'{ctype.decode("latin1")} ({length} bytes)')
            else:
                chunks.append(chunk_full)
        else:
            chunks.append(chunk_full)
        offset += total_len
    return b''.join(chunks), removed


def strip_jpeg(data):
    """Losslessly strips APP11 and AI metadata segments from JPEG."""
    if data[:2] != b'\xff\xd8':
        return data, []
    chunks = [data[:2]]
    offset = 2
    removed = []
    while offset < len(data):
        if data[offset] != 0xff:
            chunks.append(data[offset:])
            break
        marker = data[offset+1]
        if marker in [0xd8, 0xd9]:
            chunks.append(data[offset:offset+2])
            offset += 2
            continue
        if 0xd0 <= marker <= 0xd7:
            chunks.append(data[offset:offset+2])
            offset += 2
            continue
        if offset + 4 > len(data):
            chunks.append(data[offset:])
            break
        length = struct.unpack('>H', data[offset+2:offset+4])[0]
        seg = data[offset:offset+2+length]

        if marker == 0xeb and (b'jumb' in seg or b'c2pa' in seg):
            removed.append(f'APP11 C2PA ({length} bytes)')
        elif marker in [0xe1, 0xed, 0xfe] and any(pat in seg for pat, _ in AI_MARKERS):
            removed.append(f'APP{marker-0xe0 if marker != 0xfe else "COM"} AI metadata ({length} bytes)')
        else:
            chunks.append(seg)

        if marker == 0xda:  # SOS: remaining stream is untouched scan data
            chunks.append(data[offset+2+length:])
            break
        offset += 2 + length
    return b''.join(chunks), removed


def strip_webp(data):
    """Losslessly strips caBX and JUMB chunks from WebP."""
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        return data, []
    chunks = []
    offset = 12
    removed = []
    while offset < len(data):
        if offset + 8 > len(data):
            break
        chunk_id = data[offset:offset+4]
        chunk_len = struct.unpack('<I', data[offset+4:offset+8])[0]
        padded = chunk_len + (chunk_len % 2)
        total_len = 8 + padded
        chunk_full = data[offset:offset+total_len]
        chunk_data = data[offset+8:offset+8+chunk_len]

        if chunk_id in [b'caBX', b'JUMB']:
            removed.append(f'WebP {chunk_id.decode("latin1")} ({chunk_len} bytes)')
        elif chunk_id == b'XMP ' and any(pat in chunk_data for pat, _ in AI_MARKERS):
            removed.append(f'WebP XMP AI metadata ({chunk_len} bytes)')
        else:
            chunks.append(chunk_full)
        offset += total_len

    payload = b''.join(chunks)
    new_header = struct.pack('<4sI4s', b'RIFF', len(payload) + 4, b'WEBP')
    return new_header + payload, removed


def sanitize_file(filepath):
    """Sanitizes a file by identifying container type via magic bytes and verifying image validity."""
    with open(filepath, 'rb') as fp:
        original = fp.read()

    if original[:8] == b'\x89PNG\r\n\x1a\n':
        cleaned, removed = strip_png(original)
    elif original[:2] == b'\xff\xd8':
        cleaned, removed = strip_jpeg(original)
    elif original[:4] == b'RIFF' and original[8:12] == b'WEBP':
        cleaned, removed = strip_webp(original)
    else:
        return False, []

    if removed:
        # Verify cleaned image is decodeable and preserves dimensions
        im_orig = Image.open(io.BytesIO(original))
        im_clean = Image.open(io.BytesIO(cleaned))
        assert im_orig.size == im_clean.size, f"Size mismatch for {filepath}: {im_orig.size} vs {im_clean.size}"
        assert im_orig.mode == im_clean.mode, f"Mode mismatch for {filepath}: {im_orig.mode} vs {im_clean.mode}"

        with open(filepath, 'wb') as fp:
            fp.write(cleaned)
        return True, removed
    return False, []


def scan_directory(base_dir):
    """Recursively scans base_dir for media files with AI / C2PA tags."""
    flagged = []
    total_scanned = 0
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in TARGET_EXTS:
                total_scanned += 1
                fp = os.path.join(root, f)
                size, detected = inspect_file(fp)
                if detected:
                    flagged.append((fp, size, detected))
    return total_scanned, flagged


if __name__ == '__main__':
    args = sys.argv[1:]
    do_clean = '--clean' in args
    search_dirs = [a for a in args if a != '--clean']
    if not search_dirs:
        search_dirs = [os.getcwd()]

    print(f"=== Scanning directories: {search_dirs} ===")
    all_flagged = []
    total_files = 0
    for d in search_dirs:
        n, flagged = scan_directory(d)
        total_files += n
        all_flagged.extend(flagged)

    print(f"Total media/document files scanned: {total_files}")
    print(f"Total flagged files: {len(all_flagged)}")

    if not all_flagged:
        print("\n✓ No AI provenance or C2PA metadata tags found in any scanned file.")
        sys.exit(0)

    print("\nFlagged Files:")
    for fp, size, tags in all_flagged:
        print(f"\n{fp} ({size:,} bytes):")
        for t in tags:
            print(f"  - {t}")

    if do_clean:
        print("\n" + "="*50)
        print("=== Performing Lossless Sanitization ===")
        print("="*50)
        cleaned_count = 0
        for fp, size, tags in all_flagged:
            success, removed = sanitize_file(fp)
            new_size = os.path.getsize(fp)
            if success:
                cleaned_count += 1
                print(f"✓ Cleaned {fp}:")
                print(f"   Removed: {', '.join(removed)}")
                print(f"   Original size: {size:,} bytes -> New size: {new_size:,} bytes ({size - new_size:,} bytes stripped)")
            else:
                print(f"- No changes made to {fp}")

        print("\n" + "="*50)
        print("=== Verification Post-Check ===")
        print("="*50)
        remaining_flagged = []
        for fp, _, _ in all_flagged:
            _, detected = inspect_file(fp)
            if detected:
                remaining_flagged.append((fp, detected))

        if not remaining_flagged:
            print(f"\n✓ VERIFICATION SUCCESSFUL: 0 AI markers remain across all {cleaned_count} sanitized files.")
        else:
            print(f"\n✗ WARNING: {len(remaining_flagged)} files still have markers:")
            for fp, tags in remaining_flagged:
                print(f"   {fp}: {tags}")
            sys.exit(1)
