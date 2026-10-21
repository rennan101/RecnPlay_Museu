#!/usr/bin/env bash
set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATASET_DIR="$BASE_DIR/assets/dataset"

mkdir -p "$DATASET_DIR/flautista"
mkdir -p "$DATASET_DIR/peixeboi"
mkdir -p "$DATASET_DIR/hippidion"
mkdir -p "$DATASET_DIR/background"

echo "==> Otimizando fotos do Flautista..."
idx=1
find "$BASE_DIR/Fotos/flautista fotos" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | sort | while read -r file; do
  out="$DATASET_DIR/flautista/flautista_$(printf "%03d" $idx).jpg"
  sips -Z 224 "$file" --out "$out" > /dev/null 2>&1
  sips -p 224 224 --padColor 000000 "$out" > /dev/null 2>&1
  idx=$((idx + 1))
done
echo "Flautista: $((idx - 1)) fotos processadas."

echo "==> Otimizando fotos do Peixe-boi..."
idx=1
find "$BASE_DIR/Fotos/Peixe boi fotos" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | sort | while read -r file; do
  out="$DATASET_DIR/peixeboi/peixeboi_$(printf "%03d" $idx).jpg"
  sips -Z 224 "$file" --out "$out" > /dev/null 2>&1
  sips -p 224 224 --padColor 000000 "$out" > /dev/null 2>&1
  idx=$((idx + 1))
done
echo "Peixe-boi: $((idx - 1)) fotos processadas."

echo "==> Otimizando fotos do Hippidion..."
idx=1
find "$BASE_DIR/Fotos/osso hippidion" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | sort | while read -r file; do
  out="$DATASET_DIR/hippidion/hippidion_$(printf "%03d" $idx).jpg"
  sips -Z 224 "$file" --out "$out" > /dev/null 2>&1
  sips -p 224 224 --padColor 000000 "$out" > /dev/null 2>&1
  idx=$((idx + 1))
done
echo "Hippidion: $((idx - 1)) fotos processadas."

echo "==> Concluído!"
