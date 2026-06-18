#!/usr/bin/env python3
"""Verify Vantage ZIP/XPI contents against scripts/runtime-allowlist.json."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path, PurePosixPath


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ALLOWLIST = REPO_ROOT / "scripts" / "runtime-allowlist.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path, help="ZIP/XPI package to inspect")
    parser.add_argument("--target", choices=("chromium", "firefox"), required=True)
    parser.add_argument("--allowlist", type=Path, default=DEFAULT_ALLOWLIST)
    return parser.parse_args()


def safe_relative_path(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a non-empty relative path")
    raw = value.strip().replace("\\", "/")
    posix = PurePosixPath(raw)
    if posix.is_absolute() or raw.startswith("/") or any(part in ("", ".", "..") for part in posix.parts):
        raise ValueError(f"{label} is not a safe relative path: {value!r}")
    return raw


def read_allowlist(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    items = data.get("items")
    if not isinstance(items, list):
        raise ValueError("runtime allowlist must contain an items array")
    data["items"] = [safe_relative_path(item, "allowlist item") for item in items]
    data["chromium_manifest"] = safe_relative_path(data.get("chromium_manifest"), "chromium_manifest")
    data["firefox_manifest"] = safe_relative_path(data.get("firefox_manifest"), "firefox_manifest")
    return data


def iter_runtime_files(relative_path: str) -> list[str]:
    source = (REPO_ROOT / relative_path).resolve()
    try:
        source.relative_to(REPO_ROOT)
    except ValueError as exc:
        raise ValueError(f"allowlist path escapes repo root: {relative_path}") from exc
    if not source.exists():
        raise FileNotFoundError(f"allowlist path missing: {relative_path}")
    if source.is_file():
        return [relative_path]
    return [
        child.relative_to(REPO_ROOT).as_posix()
        for child in sorted(source.rglob("*"))
        if child.is_file()
    ]


def expected_entries(allowlist: dict, target: str) -> set[str]:
    entries: list[str] = []
    if target == "firefox":
        entries.append("manifest.json")
    else:
        entries.extend(iter_runtime_files(allowlist["chromium_manifest"]))

    for item in allowlist["items"]:
        if target == "firefox" and item == allowlist["firefox_manifest"]:
            continue
        entries.extend(iter_runtime_files(item))

    if target == "firefox":
        source_manifest = (REPO_ROOT / allowlist["firefox_manifest"]).resolve()
        if not source_manifest.is_file():
            raise FileNotFoundError(f"Firefox manifest missing: {allowlist['firefox_manifest']}")

    duplicates = sorted({entry for entry in entries if entries.count(entry) > 1})
    if duplicates:
        raise ValueError(f"duplicate expected package entries: {', '.join(duplicates)}")
    return set(entries)


def package_entries(package_path: Path) -> set[str]:
    if not package_path.is_file():
        raise FileNotFoundError(f"package missing: {package_path}")
    seen: set[str] = set()
    with zipfile.ZipFile(package_path) as archive:
        for info in archive.infolist():
            name = info.filename.replace("\\", "/")
            if name.endswith("/"):
                continue
            safe_relative_path(name, "package entry")
            if name in seen:
                raise ValueError(f"duplicate package entry: {name}")
            seen.add(name)
    return seen


def main() -> int:
    args = parse_args()
    try:
        allowlist = read_allowlist(args.allowlist)
        expected = expected_entries(allowlist, args.target)
        actual = package_entries(args.package)
    except Exception as exc:
        print(f"runtime package verification failed: {exc}", file=sys.stderr)
        return 2

    missing = sorted(expected - actual)
    unexpected = sorted(actual - expected)
    if missing or unexpected:
        print("runtime package contents do not match scripts/runtime-allowlist.json", file=sys.stderr)
        if missing:
            print("missing entries:", file=sys.stderr)
            for entry in missing:
                print(f"  - {entry}", file=sys.stderr)
        if unexpected:
            print("unexpected entries:", file=sys.stderr)
            for entry in unexpected:
                print(f"  - {entry}", file=sys.stderr)
        return 1

    print(f"Runtime package OK ({args.target}): {len(actual)} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
