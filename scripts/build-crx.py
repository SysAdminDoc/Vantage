#!/usr/bin/env python3
"""
Vantage CRX3 packer — pure stdlib + openssl shell-outs, no pip dependencies.

CRX3 binary layout
------------------
  4  bytes  "Cr24"                  magic
  4  bytes  uint32 LE = 3           format version
  4  bytes  uint32 LE = header_size
  N  bytes  CrxFileHeader protobuf
  *  bytes  ZIP payload

CrxFileHeader protobuf
----------------------
  field 2  (repeated)  AsymmetricKeyProof  -- one per signer
  field 10000          bytes signed_header_data

AsymmetricKeyProof
------------------
  field 1  bytes public_key    -- DER SubjectPublicKeyInfo (RSA)
  field 2  bytes signature     -- RSA-PKCS1-v1_5 SHA-256 over signed_payload

SignedData (serialized into signed_header_data)
-----------------------------------------------
  field 1  bytes crx_id        -- first 16 bytes of SHA-256(public_key DER)

Signed payload (what gets signed)
---------------------------------
  b"CRX3 SignedData\x00" + uint32_LE(len(signed_header_data)) + signed_header_data + zip_bytes

Usage
-----
    python build-crx.py <unpacked_dir_or_zip> <pem_path> <output_crx>

Examples
--------
    python scripts/build-crx.py . ./Vantage-selfhost.pem dist/Vantage-v0.3.0.crx
    python scripts/build-crx.py dist/Vantage-v0.3.0.zip ./Vantage-selfhost.pem dist/Vantage-v0.3.0.crx
"""
from __future__ import annotations
import hashlib
import io
import os
import struct
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


def varint(n: int) -> bytes:
    out = bytearray()
    while n > 0x7F:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    out.append(n & 0x7F)
    return bytes(out)


def length_delimited(field_number: int, payload: bytes) -> bytes:
    # wire type 2 = length-delimited
    tag = (field_number << 3) | 2
    return varint(tag) + varint(len(payload)) + payload


def derive_public_key_der(pem_path: Path) -> bytes:
    proc = subprocess.run(
        ["openssl", "rsa", "-in", str(pem_path), "-pubout", "-outform", "DER"],
        check=True,
        capture_output=True,
    )
    return proc.stdout


def sign_with_rsa_sha256(pem_path: Path, payload: bytes) -> bytes:
    proc = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", str(pem_path)],
        input=payload,
        check=True,
        capture_output=True,
    )
    return proc.stdout


def build_zip_from_dir(src_dir: Path) -> bytes:
    """Build a deterministic ZIP from a directory tree, using forward slashes."""
    buf = io.BytesIO()
    excludes = {".git", ".github", "scripts", "dist", ".claude", "node_modules"}
    exclude_files = {"CLAUDE.md", "CODEX_CHANGELOG.md", "Vantage-selfhost.pem", "ROADMAP.md"}
    exclude_suffix = (".bak", ".pem", ".log", ".zip", ".crx")

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [d for d in dirs if d not in excludes and not d.startswith(".")]
            for f in files:
                if f in exclude_files: continue
                if f.endswith(exclude_suffix): continue
                if f.startswith("."): continue
                abs_path = Path(root) / f
                rel = abs_path.relative_to(src_dir).as_posix()  # forward slashes always
                zf.write(abs_path, rel)
    return buf.getvalue()


def pack(input_path: Path, pem_path: Path, output_path: Path) -> None:
    if input_path.is_dir():
        zip_bytes = build_zip_from_dir(input_path)
    elif input_path.suffix.lower() == ".zip":
        zip_bytes = input_path.read_bytes()
    else:
        raise SystemExit(f"input must be a directory or a .zip — got {input_path}")

    if not pem_path.is_file():
        raise SystemExit(f"private key not found: {pem_path}")

    pub_der = derive_public_key_der(pem_path)
    crx_id = hashlib.sha256(pub_der).digest()[:16]

    # SignedData protobuf: field 1 = crx_id (bytes)
    signed_header_data = length_delimited(1, crx_id)

    # Signed payload that gets RSA-SHA256-signed
    signed_payload = (
        b"CRX3 SignedData\x00"
        + struct.pack("<I", len(signed_header_data))
        + signed_header_data
        + zip_bytes
    )

    signature = sign_with_rsa_sha256(pem_path, signed_payload)

    # AsymmetricKeyProof protobuf: field 1 = public_key, field 2 = signature
    asymmetric_key_proof = (
        length_delimited(1, pub_der)
        + length_delimited(2, signature)
    )

    # CrxFileHeader protobuf: field 2 (sha256_with_rsa) + field 10000 (signed_header_data)
    # field 10000 with wire type 2 → tag = (10000 << 3) | 2 = 80002 → varint = b"\x82\xf1\x04"
    crx_file_header = (
        length_delimited(2, asymmetric_key_proof)
        + b"\x82\xf1\x04" + varint(len(signed_header_data)) + signed_header_data
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as f:
        f.write(b"Cr24")
        f.write(struct.pack("<I", 3))                       # version
        f.write(struct.pack("<I", len(crx_file_header)))    # header size
        f.write(crx_file_header)
        f.write(zip_bytes)

    # Sanity-print
    extension_id = "".join(chr(ord("a") + (b >> 4)) + chr(ord("a") + (b & 0xF)) for b in crx_id)
    sha256 = hashlib.sha256(output_path.read_bytes()).hexdigest()
    print(f"  ok  {output_path}")
    print(f"      bytes:        {output_path.stat().st_size:,}")
    print(f"      extension id: {extension_id}")
    print(f"      sha256:       {sha256}")


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(__doc__)
        return 2
    pack(Path(argv[1]).resolve(), Path(argv[2]).resolve(), Path(argv[3]).resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
