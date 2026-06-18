"""
SkinAI — YOLOv8 5-Class Skin Issue Detector Training
Dataset: Skin Issues v6 (Roboflow) — Acne, Black-heads, Large Pores, Pigmentation, Rosacea

Usage in Google Colab:
  1. Upload this script and dataset to Colab
  2. !pip install ultralytics roboflow
  3. !python train.py
"""

import os
from ultralytics import YOLO


# ── Config ──────────────────────────────────────────────────────────────
DATASET_PATH = "Skin Issues.v6i.yolov8"  # adjust if needed
MODEL_BASE = "yolov8n.pt"                # nano — fast, good for mobile/web
EPOCHS = 100
IMG_SIZE = 640
BATCH = 16
NAME = "skinai_v2_5class"
PROJECT = "runs/detect"
PATIENCE = 20                            # early stopping patience
# ────────────────────────────────────────────────────────────────────────


def main():
    data_yaml = os.path.join(DATASET_PATH, "data.yaml")

    print(f"Dataset: {DATASET_PATH}")
    print(f"Data YAML: {data_yaml}")
    print(f"Model base: {MODEL_BASE}")
    print(f"Epochs: {EPOCHS}, Batch: {BATCH}, Image size: {IMG_SIZE}")

    # Load YOLOv8 nano model (pretrained on COCO)
    model = YOLO(MODEL_BASE)

    # Train
    results = model.train(
        data=data_yaml,
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH,
        name=NAME,
        project=PROJECT,
        patience=PATIENCE,
        # Augmentation (aggressive for small dataset)
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=15.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.2,
        copy_paste=0.1,
        # Class weights to handle imbalance
        # Acne (39 train) vs Rosacea (2511 train) — heavily imbalanced
        # Use focal loss to down-weight easy negatives
        # (focal=True is default in recent ultralytics)
        # Workers and device
        workers=8,
        device=0,  # GPU
        exist_ok=True,
        pretrained=True,
        optimizer="auto",
        verbose=True,
        seed=42,
        val=True,
        plots=True,
    )

    print("\n=== Training Complete ===")
    print(f"Best model saved to: {PROJECT}/{NAME}/weights/best.pt")
    print(f"Last model saved to: {PROJECT}/{NAME}/weights/last.pt")

    # Evaluate on validation set
    print("\n=== Validation Metrics ===")
    best_model = YOLO(f"{PROJECT}/{NAME}/weights/best.pt")
    val_results = best_model.val(data=data_yaml, imgsz=IMG_SIZE, batch=BATCH)

    print(f"mAP50:      {val_results.box.map50:.4f}")
    print(f"mAP50-95:   {val_results.box.map:.4f}")
    print(f"Precision:  {val_results.box.mp:.4f}")
    print(f"Recall:     {val_results.box.mr:.4f}")

    # Per-class metrics
    names = val_results.names
    for i, (p, r, ap50, ap) in enumerate(
        zip(val_results.box.p, val_results.box.r, val_results.box.ap50, val_results.box.ap)
    ):
        print(f"  {names[i]:15s}  P={p:.3f}  R={r:.3f}  mAP50={ap50:.3f}  mAP50-95={ap:.3f}")

    # Export to ONNX for deployment (optional)
    print("\n=== Exporting to ONNX ===")
    best_model.export(format="onnx", imgsz=IMG_SIZE)
    print(f"ONNX model: {PROJECT}/{NAME}/weights/best.onnx")

    # Also export to TorchScript for mobile
    print("\n=== Exporting to TorchScript ===")
    best_model.export(format="torchscript", imgsz=IMG_SIZE)
    print(f"TorchScript model: {PROJECT}/{NAME}/weights/best.torchscript")

    print("\n✅ Done! Copy best.pt to backend/models/best.pt")


if __name__ == "__main__":
    main()
