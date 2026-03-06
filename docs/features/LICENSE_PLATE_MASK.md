# License Plate Mask — Current Implementation

Automatic license plate masking on listing photo upload. When the user uploads photos with `Hide plates` enabled, the backend detects license plates with an ONNX model and overlays a gray mask with near-transparent `kupito.club` text. Processing is synchronous inside the upload request. The checkbox is disabled by default.

---

## Overview

| Aspect | Implementation |
|--------|----------------|
| Trigger | Checkbox in photo section, default: **off**. Help text is shown in `HintTooltip`. |
| Processing | In-process inside NestJS. One final `.composite()` call combines masks and watermark. |
| Output | Every accepted upload is stored as WebP. Response includes `plateMaskResult`: `mask_applied` \| `not_found` \| `null`. |
| Concurrency | Backend: 2 concurrent plate detections. Frontend: 2 concurrent uploads. |
| Animated images | Rejected with `400 errors.animatedImagesNotSupported`. |
| Failure mode | If masking was requested and cannot be completed, the photo is not saved. |

---

## Backend

### Pipeline (`UploadService.saveFile`)

1. **Validate file** — magic bytes and mimetype.
2. **Read metadata** — animated images are rejected when `metadata.pages > 1`.
3. **Rotate / normalize** — `sharp(...).rotate()` to apply EXIF orientation.
4. **Bounds check** — reject images larger than `10000 x 10000`.
5. **Resize** — cap longest side to `2048`.
6. **Plate detection** — only when `hidePlates` is true:
   - fail fast with `503 errors.serviceUnavailable` if detector is not ready;
   - reject when semaphore queue depth is over 20;
   - retry detection up to 3 times with exponential backoff;
   - timeout after 10s.
7. **Mask generation** — `PlateMaskService` returns SVG overlays for all detections.
8. **Watermark** — standard logo + domain watermark is added in the same composite pass.
9. **Encode** — final output is `webp({ quality: 85, effort: 4 })`.
10. **Save** — S3 or local `/uploads`.

### Plate detector (`PlateDetectorService`)

- **Model path:** `core/backend/assets/plate-mask/plate-detector.onnx`
- **Model family:** YOLOv9 end-to-end plate detector (`384x384`)
- **Input:** letterboxed `384x384`, RGB, float32, normalized by `/255`
- **Output:** `[N, 7]` rows with box coordinates and score
- **Thresholds:** `MIN_CONFIDENCE = 0.25`, `MIN_PLATE_WIDTH_PX = 40`
- **Startup behavior:** if the model file is missing, backend still starts, but masking requests fail when used

### Plate mask (`PlateMaskService`)

- Gray rectangle fill: `#D1D5DB`
- Rounded corners: `4px`
- Text: `kupito.club`
- Text color: `rgba(26, 69, 52, 0.22)`
- Font stack: `Inter, Arial, sans-serif`
- Detection box is slightly shrunk before drawing the mask to avoid overflowing the real plate bounds

### Concurrency and cleanup

- `ProcessingSemaphore` limits plate detection to 2 parallel jobs
- Frontend upload queue also runs 2 uploads at a time
- Freshly uploaded but not yet saved photos are deleted immediately from storage when removed from the form
- Removed already-saved photos are cleaned up in `UpdateListingUseCase` via `UploadService.deleteFile()` after the form is saved

---

## Frontend

### Photo section (`PhotosSection.tsx`)

- `Hide plates` checkbox is rendered above the uploader and defaults to `false`
- Explanatory text is inside `HintTooltip`, not inline below the checkbox
- Photo grid uses `@dnd-kit` sortable drag-and-drop
- Action buttons under each photo:
  - move up
  - delete
  - move down
- First image is marked as `Main photo`
- Clicking a card opens `ListingPageImageModal`

### Upload flow (`useListingForm.ts`)

- Files are queued with temporary preview slots
- Max 2 uploads run in parallel
- Success shows `listings.photoUploaded`
- Freshly uploaded photos use a delete token and are removed from storage immediately when deleted from the form before save
- Error handling priority:
  - backend string message
  - `503` -> `listings.serverBusyError`
  - masking enabled -> `listings.plateMaskError`
  - delete failure -> `listings.photoDeleteError`
  - fallback -> `listings.photoUploadError`

---

## API

### `POST /api/upload/image`

- `multipart/form-data`
- field: `file`
- optional field: `hidePlates` (`"true"` or `"false"`)

Success response:

- `{ url, path, plateMaskResult, deleteToken }`

`deleteToken` is returned for freshly uploaded files so the frontend can immediately delete an unsaved upload from storage if the user removes it before submitting the form.

Possible values of `plateMaskResult`:

- `mask_applied`
- `not_found`
- `null`

Main error classes:

- `400` invalid file / invalid image / animated image / detection failure / timeout
- `503` detector unavailable or queue overflow

### `DELETE /api/upload/image`

- Auth required
- Body: `{ path, deleteToken }`
- Used only for freshly uploaded files that have not yet been saved into a listing
- Token is tied to both the file path and the current user

---

## Translation keys

| Key | Usage |
|-----|--------|
| `listings.hidePlates` | Checkbox label |
| `listings.hidePlatesHelper` | Tooltip content |
| `listings.plateMaskError` | Frontend toast for masking failure |
| `listings.photoDeleteError` | Frontend toast for failed immediate delete |
| `listings.serverBusyError` | Frontend toast for 503 |
| `listings.mainPhoto` | Badge on first photo |
| `listings.moveUp` / `listings.moveDown` | Photo reorder controls |
| `errors.animatedImagesNotSupported` | Backend validation |
| `errors.plateMaskFailed` | Backend masking failure |
| `errors.plateDetectionTimeout` | Backend timeout |
| `errors.serviceUnavailable` | Backend overload / unavailable detector |

---

## Assets

- Required: `core/backend/assets/plate-mask/plate-detector.onnx`
- Optional custom font file is not required for current SVG output
- Asset setup instructions live in `core/backend/assets/plate-mask/README.md`

---

## Main files

| Area | File |
|------|------|
| Upload pipeline | `core/backend/src/upload/upload.service.ts` |
| Upload delete endpoint | `core/backend/src/upload/upload.controller.ts` |
| Detector | `core/backend/src/upload/plate-detector.service.ts` |
| Mask builder | `core/backend/src/upload/plate-mask.service.ts` |
| Detection queue | `core/backend/src/upload/processing-semaphore.ts` |
| Cleanup of removed images | `core/backend/src/listings/application/use-cases/update-listing.use-case.ts` |
| Photo UI | `core/frontend/components/ListingForm/PhotosSection.tsx` |
| Upload queue / form state | `core/frontend/components/ListingForm/useListingForm.ts` |
| Upload queue / immediate delete helper | `core/frontend/components/ListingForm/useListingFormImages.ts` |
| Upload API client | `core/frontend/lib/api/api.ts` |
