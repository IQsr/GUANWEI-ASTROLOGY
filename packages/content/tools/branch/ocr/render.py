"""
原書 PDF → 一頁一張 PNG（灰階 150 dpi），俾 ocr.ps1 做 OCR。

用法：
  python render.py "<PDF 路徑>" <輸出資料夾>
例：
  python render.py "%USERPROFILE%/Downloads/《中州派紫微斗数深造讲义》—王亭之.pdf" "%LOCALAPPDATA%/guanwei/b5/png"

要 PyMuPDF（pip install --user pymupdf）。PDF 冇文字層（字型冇 ToUnicode），所以一定要轉圖再 OCR。
"""
import os
import sys

import fitz  # PyMuPDF

pdf, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
doc = fitz.open(pdf)
for i, page in enumerate(doc, 1):
    pix = page.get_pixmap(dpi=150, colorspace=fitz.csGRAY)
    pix.save(os.path.join(out, f'p{i:03d}.png'))
print(f'{len(doc)} 頁 → {out}')
