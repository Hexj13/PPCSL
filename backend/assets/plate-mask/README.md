# License plate mask assets

Place the following files here for the plate masking feature to work:

- **plate-detector.onnx** — YOLOv9 end2end ONNX model for license plate detection from [open-image-models](https://github.com/ankandrew/open-image-models). Model: `yolo-v9-t-384-license-plate-end2end`. Input: `[1, 3, 384, 384]` float32, letterbox-preprocessed. Output: `[N, 7]` (batch_idx, x1, y1, x2, y2, class_id, score). NMS is built into the model.

  Download:
  ```bash
  curl -L -o core/backend/assets/plate-mask/plate-detector.onnx \
    "https://github.com/ankandrew/open-image-models/releases/download/assets/yolo-v9-t-384-license-plates-end2end.onnx"
  ```

- **Inter-SemiBold.ttf** — (Optional) Inter font for mask text. If missing, SVG falls back to Arial.

If `plate-detector.onnx` is missing, uploads with "hide plates" enabled will fail with a user-facing error (by design: we do not save unprocessed photos when masking was requested).
