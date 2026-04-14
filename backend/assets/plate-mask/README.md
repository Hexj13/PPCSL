# License plate mask assets

Place the following files here for the plate masking feature to work:

- **plate-detector.onnx** — **Required:** `yolo-v9-s-608-license-plate-end2end` from [open-image-models](https://github.com/ankandrew/open-image-models) (release asset: `yolo-v9-s-608-license-plates-end2end.onnx`). The backend accepts **only** this spatial size (`608`×`608`); other weights (e.g. YOLOv9-T) are rejected at startup. Output: `[N, 7]` (batch_idx, x1, y1, x2, y2, class_id, score). NMS is built into the model.

  Download from the **repository root** (`kupito.club/`, parent of `core/`):
  ```bash
  mkdir -p core/backend/assets/plate-mask
  curl -L -o core/backend/assets/plate-mask/plate-detector.onnx \
    "https://github.com/ankandrew/open-image-models/releases/download/assets/yolo-v9-s-608-license-plates-end2end.onnx"
  ```

  If your shell is already in **`core/backend/`**, use:
  ```bash
  mkdir -p assets/plate-mask
  curl -L -o assets/plate-mask/plate-detector.onnx \
    "https://github.com/ankandrew/open-image-models/releases/download/assets/yolo-v9-s-608-license-plates-end2end.onnx"
  ```

- **Inter-SemiBold.ttf** — (Optional) Inter font for mask text. If missing, SVG falls back to Arial.

If `plate-detector.onnx` is missing, uploads with "hide plates" enabled will fail with a user-facing error (by design: we do not save unprocessed photos when masking was requested).
