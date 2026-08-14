"""Generates one QR code per table, pointing at the current tunnel URL.

Setup (once):
    cd scripts/qr-codes
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt      # Windows: .venv\\Scripts\\pip install -r requirements.txt

Usage (every time the tunnel URL changes -- it's different on every restart):
    .venv/bin/python3 generate_table_qrs.py https://your-tunnel-url.trycloudflare.com

Saves the QR images to ./qrs/mesa-<numero>.png

If tables are ever added/removed/recreated, refresh TABLES below by
querying the DB: RestaurantTable.table_number and .public_code.
"""

import sys
from pathlib import Path

if len(sys.argv) != 2:
    print("Uso: python3 generate_table_qrs.py <url-do-tunel>")
    sys.exit(1)

base_url = sys.argv[1].rstrip("/")

import qrcode

out_dir = Path(__file__).parent / "qrs"
out_dir.mkdir(exist_ok=True)

TABLES = [
    (1, "7ae2a1e1-2c63-4407-8bc1-300ab8cdd354"),
    (2, "8c382fda-8a6c-462c-be54-82d42669e60f"),
    (3, "5ac5e437-68a6-42ed-b0d1-2f89838742b2"),
    (4, "7099870a-bc9c-4841-8fdd-b51dbd94c38b"),
    (5, "1384c47e-055d-44e2-add3-2d568dc90c6d"),
    (6, "fe258d02-f0d0-439a-b744-3487e4a40293"),
    (7, "6c4fe22e-d60e-4d7d-9c8f-95160ad28446"),
    (8, "07abdfa6-e26b-457b-b311-adc190298dd5"),
    (9, "c60da7ac-317e-4411-963e-bf4554c4580a"),
    (10, "9c70bb77-4521-446c-9205-5c0d0d6e5f99"),
]

for number, code in TABLES:
    url = f"{base_url}/table/{code}"
    img = qrcode.make(url, box_size=10, border=4)
    path = out_dir / f"mesa-{number}.png"
    img.save(path)
    print(f"Mesa {number}: {url} -> {path}")
