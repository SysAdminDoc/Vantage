#!/usr/bin/env python3
"""
Vantage CRX3 packer -- pure stdlib, no pip or OpenSSL dependency.

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
import base64
import hashlib
import io
import os
import struct
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


class DerReader:
    def __init__(self, data: bytes) -> None:
        self.data = data
        self.offset = 0

    def read_tlv(self, expected_tag: int | None = None) -> bytes:
        if self.offset >= len(self.data):
            raise ValueError("unexpected end of DER")
        tag = self.data[self.offset]
        self.offset += 1
        if expected_tag is not None and tag != expected_tag:
            raise ValueError(f"unexpected DER tag 0x{tag:02x}, expected 0x{expected_tag:02x}")
        if self.offset >= len(self.data):
            raise ValueError("missing DER length")
        first = self.data[self.offset]
        self.offset += 1
        if first & 0x80:
            count = first & 0x7F
            if count == 0 or count > 4 or self.offset + count > len(self.data):
                raise ValueError("invalid DER length")
            length = int.from_bytes(self.data[self.offset:self.offset + count], "big")
            self.offset += count
        else:
            length = first
        end = self.offset + length
        if end > len(self.data):
            raise ValueError("DER value extends past end")
        payload = self.data[self.offset:end]
        self.offset = end
        return payload

    def read_sequence(self) -> "DerReader":
        return DerReader(self.read_tlv(0x30))

    def read_integer(self) -> int:
        payload = self.read_tlv(0x02)
        if not payload:
            raise ValueError("empty DER integer")
        return int.from_bytes(payload, "big", signed=False)

    def read_octet_string(self) -> bytes:
        return self.read_tlv(0x04)


def der_len(length: int) -> bytes:
    if length < 0x80:
        return bytes([length])
    raw = length.to_bytes((length.bit_length() + 7) // 8, "big")
    return bytes([0x80 | len(raw)]) + raw


def der_wrap(tag: int, payload: bytes) -> bytes:
    return bytes([tag]) + der_len(len(payload)) + payload


def der_integer(value: int) -> bytes:
    raw = value.to_bytes((value.bit_length() + 7) // 8 or 1, "big")
    if raw[0] & 0x80:
        raw = b"\x00" + raw
    return der_wrap(0x02, raw)


def der_sequence(*parts: bytes) -> bytes:
    return der_wrap(0x30, b"".join(parts))


def der_bit_string(payload: bytes) -> bytes:
    return der_wrap(0x03, b"\x00" + payload)


def load_pem_der(pem_path: Path) -> tuple[str, bytes]:
    text = pem_path.read_text(encoding="ascii")
    header = ""
    lines: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("-----BEGIN ") and line.endswith("-----"):
            header = line.removeprefix("-----BEGIN ").removesuffix("-----")
            continue
        if line.startswith("-----END "):
            break
        if header and line:
            lines.append(line)
    if not header or not lines:
        raise ValueError(f"private key PEM is malformed: {pem_path}")
    return header, base64.b64decode("".join(lines))


def parse_rsa_private_key(der: bytes) -> dict[str, int]:
    reader = DerReader(der).read_sequence()
    _version = reader.read_integer()
    fields = ["n", "e", "d", "p", "q", "dp", "dq", "qi"]
    values = {name: reader.read_integer() for name in fields}
    if values["n"] <= 0 or values["e"] <= 1 or values["d"] <= 0:
        raise ValueError("RSA private key has invalid parameters")
    return values


def load_rsa_private_key(pem_path: Path) -> dict[str, int]:
    header, der = load_pem_der(pem_path)
    if header == "RSA PRIVATE KEY":
        return parse_rsa_private_key(der)
    if header != "PRIVATE KEY":
        raise ValueError(f"unsupported PEM type: {header}")
    reader = DerReader(der).read_sequence()
    _version = reader.read_integer()
    _algorithm = reader.read_sequence()
    private_key = reader.read_octet_string()
    return parse_rsa_private_key(private_key)


def encode_public_key_der(key: dict[str, int]) -> bytes:
    rsa_public_key = der_sequence(der_integer(key["n"]), der_integer(key["e"]))
    rsa_encryption_oid = b"\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01"
    algorithm = der_sequence(rsa_encryption_oid, b"\x05\x00")
    return der_sequence(algorithm, der_bit_string(rsa_public_key))


def sign_with_rsa_sha256(key: dict[str, int], payload: bytes) -> bytes:
    digest = hashlib.sha256(payload).digest()
    digest_info = bytes.fromhex("3031300d060960864801650304020105000420") + digest
    byte_len = (key["n"].bit_length() + 7) // 8
    padding_len = byte_len - len(digest_info) - 3
    if padding_len < 8:
        raise ValueError("RSA key is too small for SHA-256 PKCS#1 v1.5 signature")
    encoded = b"\x00\x01" + (b"\xff" * padding_len) + b"\x00" + digest_info
    signature_int = pow(int.from_bytes(encoded, "big"), key["d"], key["n"])
    return signature_int.to_bytes(byte_len, "big")


def build_zip_from_dir(src_dir: Path) -> bytes:
    """Build a deterministic ZIP from a directory tree, using forward slashes."""
    buf = io.BytesIO()
    excludes = {".git", ".github", "scripts", "dist", ".claude", "node_modules"}
    exclude_files = {"Vantage-selfhost.pem", "ROADMAP.md"}
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
        raise SystemExit(f"input must be a directory or a .zip -- got {input_path}")

    if not pem_path.is_file():
        raise SystemExit(f"private key not found: {pem_path}")

    key = load_rsa_private_key(pem_path)
    pub_der = encode_public_key_der(key)
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

    signature = sign_with_rsa_sha256(key, signed_payload)

    # AsymmetricKeyProof protobuf: field 1 = public_key, field 2 = signature
    asymmetric_key_proof = (
        length_delimited(1, pub_der)
        + length_delimited(2, signature)
    )

    # CrxFileHeader protobuf: field 2 (sha256_with_rsa) + field 10000 (signed_header_data)
    # field 10000 with wire type 2 -> tag = (10000 << 3) | 2 = 80002 -> varint = b"\x82\xf1\x04"
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
