import numpy as np
from ultralytics import YOLO

MODEL_PATH = "app/ml/weights/fire_yolov8.pt"
CONFIDENCE_THRESHOLD = 0.5

_model = None


def get_model():
    global _model
    if _model is None:
        _model = YOLO(MODEL_PATH)
        _model.to("cpu")  # force CPU — WSL2 CUDA passthrough is unreliable, and
                           # a nano model doesn't need GPU for this use case anyway
    return _model


def detect_fire(frame: np.ndarray):
    model = get_model()
    results = model(frame, verbose=False, device="cpu")[0]

    best = None
    for box in results.boxes:
        conf = float(box.conf[0])
        if conf >= CONFIDENCE_THRESHOLD:
            if best is None or conf > best["confidence"]:
                class_id = int(box.cls[0])
                best = {
                    "confidence": conf,
                    "bbox": box.xyxy[0].tolist(),
                    "class_id": class_id,
                    "label": model.names[class_id],
                }
    return best
