"""
Legacy YOLOv8 inference engine for H5 weights (kept as fallback).
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class Yolov8Detector:
    """Stub for legacy H5 model — kept for backward compatibility."""
    
    def __init__(self, h5_path: str, conf_threshold: float = 0.5, iou_threshold: float = 0.45):
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.weights = {}
        logger.warning("Legacy H5 detector loaded — limited accuracy")
    
    def detect(self, image, input_size: int = 640) -> List[Dict]:
        return []
