# License plate mask assets

Place the following files here for the plate masking feature to work:

- **plate-detector.onnx** — YOLO v8 nano (or compatible) ONNX model for license plate detection. Input: `[1, 3, 640, 640]` Float32 NCHW. Output: `[1, 84, 8400]` or similar (4 bbox + class scores).
- **Inter-SemiBold.ttf** — (Optional) Inter font for mask text. If missing, SVG falls back to Arial.

If `plate-detector.onnx` is missing, uploads with "hide plates" enabled will fail with a user-facing error (by design: we do not save unprocessed photos when masking was requested).
