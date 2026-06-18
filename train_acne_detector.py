"""
Acne Detection Training Script (Google Colab / Kaggle)

Trains a YOLOv8n detector on the acne bounding box dataset.
The dataset must be in YOLOv8 format with data.yaml.

Dataset structure expected:
  data-2/
    data.yaml
    train/images/*.jpg + train/labels/*.txt
    valid/images/*.jpg + valid/labels/*.txt
    test/images/*.jpg  + test/labels/*.txt

Usage in Colab:
  1. Upload data-2/ folder to Colab
  2. Run: !python train_acne_detector.py
  3. Download best.pt from runs/detect/train/weights/best.pt
  4. Place it in backend/models/acne_detector.pt
"""

import os
from ultralytics import YOLO


def train(data_yaml: str = "data-2/data.yaml", epochs: int = 100, imgsz: int = 640):
    """
    Train YOLOv8s detector.

    Args:
        data_yaml: Path to dataset YAML file
        epochs: Number of training epochs
        imgsz: Image size (640 is standard for detection)
    """
    print(f"Training YOLOv8s detector...")
    print(f"  Data: {data_yaml}")
    print(f"  Epochs: {epochs}")
    print(f"  Image size: {imgsz}")

    # Load pretrained YOLOv8n detection model (nano — fastest, good for ESP32)
    model = YOLO("yolov8n.pt")

    # Train
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=16,
        lr0=0.001,
        patience=20,
        device=0,  # GPU
        project="runs/detect",
        name="acne_detector",
        exist_ok=True,
        augment=True,
        mosaic=1.0,
        mixup=0.0,
        copy_paste=0.0,
    )

    print(f"\nTraining complete!")
    print(f"Best model: runs/detect/acne_detector/weights/best.pt")
    print(f"Last model: runs/detect/acne_detector/weights/last.pt")

    # Validate on test set
    print("\nRunning validation on test set...")
    best_model = YOLO("runs/detect/acne_detector/weights/best.pt")
    metrics = best_model.val(data=data_yaml, split="test")
    print(f"  mAP50: {metrics.box.map50:.4f}")
    print(f"  mAP50-95: {metrics.box.map:.4f}")
    print(f"  Precision: {metrics.box.mp:.4f}")
    print(f"  Recall: {metrics.box.mr:.4f}")

    return results


if __name__ == "__main__":
    # Upload your data-2/ folder to Colab first, then run this script
    train(
        data_yaml="data-2/data.yaml",
        epochs=100,
        imgsz=640,
    )

    print("\n" + "=" * 60)
    print("DONE! Download runs/detect/acne_detector/weights/best.pt")
    print("Place it at: backend/models/acne_detector.pt")
    print("=" * 60)
