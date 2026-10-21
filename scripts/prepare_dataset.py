#!/usr/bin/env python3
import os
import subprocess
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "assets", "dataset")

FOLDERS = {
    "flautista": os.path.join(BASE_DIR, "Fotos", "flautista fotos"),
    "peixeboi": os.path.join(BASE_DIR, "Fotos", "Peixe boi fotos"),
    "hippidion": os.path.join(BASE_DIR, "Fotos", "osso hippidion")
}

for label, src_dir in FOLDERS.items():
    out_dir = os.path.join(DATASET_DIR, label)
    os.makedirs(out_dir, exist_ok=True)
    
    files = sorted([
        f for f in os.listdir(src_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png")) and not f.startswith(".")
    ])
    print(f"==> Processando {label}: {len(files)} arquivos encontrados.")
    
    count = 0
    for idx, fname in enumerate(files, 1):
        src_path = os.path.join(src_dir, fname)
        dest_fname = f"{label}_{idx:03d}.jpg"
        dest_path = os.path.join(out_dir, dest_fname)
        
        # 1. Redimensiona preservando proporção máxima de 224
        # 2. Preenche com bordas pretas para fechar exatamente 224x224 (padrão de entrada MobileNet)
        cmd1 = ["sips", "-Z", "224", src_path, "--out", dest_path]
        cmd2 = ["sips", "-p", "224", "224", "--padColor", "000000", dest_path]
        subprocess.run(cmd1, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        subprocess.run(cmd2, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        count += 1

    print(f"✓ {label}: {count} fotos otimizadas geradas em {out_dir}")

# Gera amostras sintéticas de fundo / ruído (dark, gray, table wood tones)
bg_dir = os.path.join(DATASET_DIR, "background")
os.makedirs(bg_dir, exist_ok=True)

# Gera catálogo em JS para inclusão estática ou fetch
catalog = {}
for label in ["flautista", "peixeboi", "hippidion"]:
    target_dir = os.path.join(DATASET_DIR, label)
    items = sorted([
        f"assets/dataset/{label}/{f}"
        for f in os.listdir(target_dir)
        if f.endswith(".jpg")
    ])
    catalog[label] = items

catalog_path = os.path.join(DATASET_DIR, "catalog.js")
with open(catalog_path, "w", encoding="utf-8") as f:
    f.write("// Catálogo de fotos otimizadas para treinamento\n")
    f.write("window.DATASET_CATALOG = ")
    json.dump(catalog, f, indent=2)
    f.write(";\n")

print(f"✓ Catálogo gerado em: {catalog_path}")
