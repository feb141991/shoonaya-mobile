#!/usr/bin/env python3
"""Verify every Panchatantra artwork path in code resolves to a local asset."""

from pathlib import Path
import re


ASSET_DIR = Path("assets/panchatantra")
ARTWORK_MAP = Path("lib/panchatantraArtwork.ts")
SUPPORTED_SUFFIXES = {".webp", ".png", ".jpg", ".jpeg"}


def asset_files() -> set[str]:
    return {
        path.name
        for path in ASSET_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
    }


def referenced_files() -> set[str]:
    content = ARTWORK_MAP.read_text(encoding="utf-8")
    return set(re.findall(r"assets/panchatantra/([^'\"]+)", content))


def main() -> None:
    assets = asset_files()
    references = referenced_files()
    missing = references - assets
    unreferenced = assets - references

    print(f"Artwork references: {len(references)}")
    print(f"Local artwork files: {len(assets)}")
    print(f"Missing referenced files: {len(missing)}")
    for name in sorted(missing):
        print(f"  - {name}")

    # Unreferenced files can be intentional source or legacy art. Report them
    # for cleanup review, but only a broken code reference fails verification.
    print(f"Unreferenced local files: {len(unreferenced)}")
    for name in sorted(unreferenced):
        print(f"  - {name}")

    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
