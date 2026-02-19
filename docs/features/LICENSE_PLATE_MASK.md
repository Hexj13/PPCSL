# License Plate Mask Overlay on Upload

Automatic license plate masking on uploaded listing photos. A white rectangle with branded text ("kupito.club") is overlaid on detected plates server-side during the upload pipeline.

## Overview

When a user uploads a photo with the "hide plates" checkbox enabled, the backend detects license plates via a YOLO-based model and overlays a branded mask on each detected plate. Photos are added to the listing **only after successful processing**. Failed processing results in a toast notification — no error cards in the gallery.

**Key decisions:**

- No blur — white rectangle with `kupito.club` text
- Processing is synchronous within the upload request (Phase 1) or async via BullMQ queue (Phase 2)
- Failed photos are silently excluded from the listing with a toast error
- Checkbox default: **ON**

---

## Table of Contents

1. [Current State](#current-state)
2. [UX Requirements](#ux-requirements)
3. [High-Level Flow](#high-level-flow)
4. [API Changes](#api-changes)
5. [Database Changes](#database-changes)
6. [Storage](#storage)
7. [Image Processing Pipeline](#image-processing-pipeline)
8. [Mask Overlay Spec](#mask-overlay-spec)
9. [Frontend Changes](#frontend-changes)
10. [Translation Keys](#translation-keys)
11. [Publish Validation](#publish-validation)
12. [Edge Cases](#edge-cases)
13. [Phased Implementation Plan](#phased-implementation-plan)
14. [Files to Modify](#files-to-modify)
15. [Dependencies](#dependencies)
16. [Testing](#testing)
17. [Implementation Checklist (Phase 1)](#implementation-checklist-phase-1)

---

## Current State

### Upload Flow (as-is)

```
Frontend (PhotosSection) → uploadApi.uploadImage(file) →
POST /api/upload/image → UploadService.saveFile() →
validate → resize(1920) → watermark → webp(75) → S3 →
return { url, path }
```

The frontend adds the returned URL to `formData.images[]` immediately.

### Key Files

| Layer    | File                                                         | Role                          |
| -------- | ------------------------------------------------------------ | ----------------------------- |
| Frontend | `components/ListingForm/PhotosSection.tsx`                   | Photo upload UI               |
| Frontend | `components/ListingForm/useListingForm.ts`                   | Upload logic (`handleFileUpload`) |
| Frontend | `lib/api/api.ts` → `uploadApi.uploadImage`                   | API client                    |
| Backend  | `src/upload/upload.controller.ts`                            | `POST /api/upload/image`      |
| Backend  | `src/upload/upload.service.ts`                               | Sharp processing, S3, watermark |
| Backend  | `src/listings/entities/listing.entity.ts`                    | `images: string[]` field      |
| Backend  | `src/listings/presentation/dto/create-listing.dto.ts`        | Validation: 2–20 images       |

### Current Processing Pipeline (UploadService.saveFile)

1. Validate file signature (magic numbers)
2. Read metadata via Sharp
3. Resize to max 1920px width
4. Apply watermark (logo + domain text via SVG composite)
5. Convert to WebP quality 75
6. Upload to S3 (`uploads/{uuid}.webp`)
7. Return path

---

## UX Requirements

### Checkbox

**Location:** Create/Edit Listing → Photos section (`PhotosSection.tsx`) → under the "Fotografii" heading, before the upload button.

**Label (translations):**

| Language | Text                                              |
| -------- | ------------------------------------------------- |
| RO       | Ascunde plăcuțele de înmatriculare pe fotografii  |
| RU       | Скрыть номерные знаки на фотографиях              |

**Helper text:**

| Language | Text                                         |
| -------- | -------------------------------------------- |
| RO       | Vom acoperi automat plăcuțele cu o mască.    |
| RU       | Мы автоматически закроем номера маской.       |

**Default:** ON

**Behavior:**

- When ON → every uploaded photo goes through plate detection + masking
- When OFF → photos are saved as-is (current behavior)
- Toggling the checkbox affects **only new uploads**, not already uploaded photos

### Error Handling UX

When plate masking processing fails:

- Show a **toast notification** via `react-hot-toast`
- Photo is **not added** to the listing gallery
- Successfully processed photos continue to appear normally
- **No error cards** in the photo grid

**Toast text (RU):**

> Не удалось обработать фото. Попробуйте загрузить его снова или отключите скрытие номерных знаков.

**Toast text (RO):**

> Nu am reușit să procesăm fotografia. Încercați din nou sau dezactivați ascunderea plăcuțelor.

---

## High-Level Flow

### Phase 1: Synchronous (MVP)

```
Frontend → POST /api/upload/image { file, hidePlates: true } →
UploadService.saveFile():
  1. Validate file
  2. Normalize EXIF orientation
  3. Resize max 2048px
  4. IF hidePlates:
     a. Run plate detection (YOLO/ONNX)
     b. For each detected plate bbox → apply mask overlay
  5. Apply watermark
  6. Convert to WebP quality 85
  7. Upload to S3
  8. Return { url, path, plateMaskResult }
```

### Phase 2: Async via Queue (future)

```
Frontend → POST /api/upload/image { file, hidePlates: true } →
  Save to temp storage → Enqueue BullMQ job →
  Return { uploadId, status: "processing" }

Worker picks up job:
  1. Download from temp
  2. Process (detect + mask + watermark + optimize)
  3. Save to processed bucket
  4. Update photo_uploads table → status: ready
  5. Delete temp file

Frontend polls GET /api/photo-uploads/{uploadId}
```

Phase 2 is documented here for future reference but **Phase 1 (synchronous) is the initial implementation**.

---

## API Changes

### Phase 1: Extend Existing Endpoint

**`POST /api/upload/image`**

FormData fields:

| Field       | Type    | Required | Description                  |
| ----------- | ------- | -------- | ---------------------------- |
| `file`      | binary  | yes      | Image file                   |
| `hidePlates`| string  | no       | `"true"` or `"false"` (FormData string) |

Response (success):

```json
{
  "url": "https://cdn.kupito.club/uploads/abc123.webp",
  "path": "/uploads/abc123.webp",
  "plateMaskResult": "mask_applied"
}
```

`plateMaskResult` values:

| Value          | Meaning                             |
| -------------- | ----------------------------------- |
| `mask_applied` | Plates detected and masked          |
| `not_found`    | No plates detected (not an error)   |
| `null`         | `hidePlates` was false/not sent     |

Response (processing error — plate detection failed):

The backend throws an exception with a translatable message key. The existing `handleUploadError()` util and global exception filter produce a standard NestJS error shape:

```json
{
  "statusCode": 400,
  "message": "errors.plateMaskFailed"
}
```

For timeout:

```json
{
  "statusCode": 400,
  "message": "errors.plateDetectionTimeout"
}
```

This follows the project's existing error convention (`BadRequestException` with i18n key). No new `errorCode` field is introduced in Phase 1. The frontend `catch` block does not inspect the response — it shows a dedicated toast based on the `hidePlates` state.

Frontend behavior: show `listings.plateMaskError` toast and do not add the photo to `formData.images`.

### Phase 2: New Endpoints (future)

```
POST   /api/listings/{listingId}/photo-uploads   → async upload
GET    /api/photo-uploads/{uploadId}              → poll status
POST   /api/photo-uploads/{uploadId}/retry        → retry failed
```

`listingId` is used intentionally to match the current backend model where images are stored in `Listing.images` and there is no separate draft table.

---

## Database Changes

### Phase 1: No Schema Changes

In Phase 1, processing is synchronous. The existing `listing.images: string[]` field is sufficient. No new tables needed.

### Phase 2: New Table `photo_uploads`

```sql
CREATE TABLE photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  result VARCHAR(20),
  hide_plates_requested BOOLEAN NOT NULL DEFAULT false,
  temp_object_key VARCHAR(500),
  processed_object_key VARCHAR(500),
  detections JSONB,
  model_version VARCHAR(50),
  error_code VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: 'processing' | 'ready' | 'failed'
-- result: 'mask_applied' | 'not_found' | 'error'
```

Project adaptation for current architecture:

- `Listing.images` remains the source of truth for final photo URLs.
- `photo_uploads` stores processing lifecycle only.
- A photo URL is appended to `Listing.images` only when `status='ready'`.
- Failed uploads are never appended.

TypeORM entity (Phase 2):

```typescript
@Entity('photo_uploads')
export class PhotoUpload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  listing_id: string;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'varchar', length: 20, default: 'processing' })
  status: 'processing' | 'ready' | 'failed';

  @Column({ type: 'varchar', length: 20, nullable: true })
  result: 'mask_applied' | 'not_found' | 'error' | null;

  @Column({ type: 'boolean', default: false })
  hide_plates_requested: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  temp_object_key: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  processed_object_key: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detections: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model_version: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  error_code: string | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

## Storage

### Phase 1: Single Bucket (current)

All images go to the existing S3 bucket (`kupito-uploads`) under `uploads/{uuid}.webp`. No changes needed.

### Phase 2: Dual Bucket

| Bucket        | Access  | Lifecycle          | Purpose         |
| ------------- | ------- | ------------------ | --------------- |
| `kupito-temp` | private | Auto-delete 24h    | Unprocessed     |
| `kupito-uploads` | public via CDN | —           | Processed final |

Original images are never exposed to the client.

---

## Image Processing Pipeline

### Integration Point

The plate masking step is added **inside `UploadService.saveFile()`**, after resize and before watermark.

### Updated Pipeline (Phase 1)

```
1. Validate file signature
2. Read metadata
3. Auto-rotate (EXIF) ← NEW: sharp.rotate() without args
4. Resize max side to 2048px ← CHANGED: was 1920px
5. IF hidePlates:
   a. Run plate detector (YOLO v8 nano via @ppcsl/plate-detector or onnxruntime-node)
   b. Filter detections: ignore plates with width < 40px
   c. For each valid detection bbox → generate mask SVG → composite
6. Apply watermark (existing logic)
7. Convert to WebP quality 85 ← CHANGED: was 75
8. Upload to S3
9. Return result
```

### Plate Detection

**Option A: ONNX Runtime (recommended for Phase 1)**

The ONNX session must be loaded **once** at service initialization (singleton) and reused across requests. Loading the model takes ~1-2s, so it must not happen per-request.

```typescript
@Injectable()
export class PlateDetectorService implements OnModuleInit {
  private session: ort.InferenceSession;

  async onModuleInit() {
    const modelPath = path.join(process.cwd(), 'assets', 'plate-mask', 'plate-detector.onnx');
    this.session = await ort.InferenceSession.create(modelPath);
  }

  async detect(imageBuffer: Buffer, width: number, height: number): Promise<PlateDetection[]> {
    const inputTensor = preprocessImage(imageBuffer, 640, 640);
    const results = await this.session.run({ images: inputTensor });
    return postprocessResults(results, width, height);
  }
}
```

**Option B: External microservice (Phase 2)**

Call a Python/FastAPI service running YOLOv8 for better accuracy and model flexibility.

### Detection Result Format

```typescript
interface PlateDetection {
  x: number;      // top-left x
  y: number;      // top-left y
  width: number;  // bbox width
  height: number; // bbox height
  confidence: number; // 0..1
}
```

Filtering rules (applied in `postprocessResults`):

- Ignore detections with `confidence < 0.4`
- Ignore detections with `width < 40px`

These thresholds minimize false positives while catching most real plates.

```
```

---

## Mask Overlay Spec

**We do NOT blur plates. We overlay a white rectangle with branded text.**

### For Each Detected Bbox

#### Rectangle

```
fill: #FFFFFF
size: bbox expanded by 8% padding on each side
cornerRadius: 0 (sharp rectangle)
```

#### Text

```
text: "kupito.club"
color: #1a4534 (primary-900 from theme/colors.ts)
align: center (horizontal + vertical within the rectangle)
font: Inter (bundled as .ttf with the worker/backend)
```

#### Font Size

```
fontSize = clamp(plateHeight * 0.55, 10, 64)
```

If computed text width > rectangle width → iteratively reduce font size until text fits.

#### Multiple Plates

Apply the overlay to **every** detected bbox independently.

### Implementation via Sharp + SVG

```typescript
function createPlateMaskSvg(
  bbox: PlateDetection,
  padding: number,
): Buffer {
  const rectW = bbox.width + padding * 2;
  const rectH = bbox.height + padding * 2;
  const fontSize = Math.max(10, Math.min(64, bbox.height * 0.55));

  const svg = `
    <svg width="${rectW}" height="${rectH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${rectW}" height="${rectH}" fill="#FFFFFF"/>
      <text
        x="50%" y="50%"
        font-family="Inter, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="#1a4534"
        text-anchor="middle"
        dominant-baseline="central"
      >kupito.club</text>
    </svg>
  `;

  return Buffer.from(svg);
}

// Usage within Sharp pipeline:
const composites = detections.map(det => {
  const padding = Math.round(det.height * 0.08);
  return {
    input: createPlateMaskSvg(det, padding),
    top: det.y - padding,
    left: det.x - padding,
  };
});

processedImage = processedImage.composite(composites);
```

---

## Frontend Changes

### PhotosSection.tsx

Add `hidePlates` and `onHidePlatesChange` as dedicated props (following the existing pattern for `uploading`/`onFileUpload` — they are passed separately, not through `sectionProps`).

Add a `Checkbox` component from `@/ui` between the heading and the upload button:

```tsx
import { Checkbox } from '@/ui';

// Inside PhotosSection, after the <h2> and before the upload <input>:
<Checkbox
  checked={hidePlates}
  onChange={onHidePlatesChange}
  label={
    <div>
      <span>{t('listings.hidePlates')}</span>
      <span className="block text-xs text-text-secondary mt-0.5">
        {t('listings.hidePlatesHelper')}
      </span>
    </div>
  }
/>
```

### ListingForm.tsx

Pass `hidePlates` and `setHidePlates` to `PhotosSection` explicitly (same pattern as `uploading` and `onFileUpload`):

```tsx
<PhotosSection
  {...sectionProps}
  uploading={uploading}
  onFileUpload={handleFileUpload}
  hidePlates={hidePlates}
  onHidePlatesChange={setHidePlates}
/>
```

### useListingForm.ts

Add `hidePlates` state, pass it to the upload function, and export it:

```typescript
const [hidePlates, setHidePlates] = useState(true);

const handleFileUpload = useCallback(async (file: File) => {
  setUploading(true);
  try {
    const response = await uploadApi.uploadImage(file, hidePlates);
    let imageUrl = response.data.url;
    if (isBrowser && window.location.protocol === 'https:' && imageUrl.startsWith('http://')) {
      imageUrl = imageUrl.replace('http://', 'https://');
    }
    setFormData((prev) => ({ ...prev, images: [...prev.images, imageUrl] }));
    toast.success(t('listings.photoUploaded'));
  } catch {
    if (hidePlates) {
      toast.error(t('listings.plateMaskError'));
    } else {
      toast.error(t('listings.photoUploadError'));
    }
  } finally {
    setUploading(false);
  }
}, [t, hidePlates]);
```

### uploadApi (lib/api/api.ts)

Extend to pass `hidePlates`:

```typescript
export const uploadApi = {
  uploadImage: (file: File, hidePlates?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (hidePlates !== undefined) {
      formData.append('hidePlates', String(hidePlates));
    }
    return api.post<{ url: string; path: string; plateMaskResult?: string }>(
      '/api/upload/image',
      formData,
    );
  },
};
```

### Photo Tile States

Since failed processing results in a toast (not an error card), the photo grid only shows successful photos. No new visual states needed in the grid.

States during upload:

| State      | Visual                                    |
| ---------- | ----------------------------------------- |
| uploading  | Upload button shows loading text          |
| success    | Photo appears in grid                     |
| failed     | Toast notification, photo not added       |

---

## Translation Keys

### Frontend (locales/ro.json, locales/ru.json, core/frontend/lib/locales/en.json)

Add under `listings.*`:

| Key                           | RO                                                                                                     | RU                                                                                                             | EN (fallback)                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `listings.hidePlates`         | Ascunde plăcuțele de înmatriculare pe fotografii                                                       | Скрыть номерные знаки на фотографиях                                                                           | Hide license plates on photos                                                                      |
| `listings.hidePlatesHelper`   | Vom acoperi automat plăcuțele cu o mască.                                                              | Мы автоматически закроем номера маской.                                                                         | We will automatically cover the plates with a mask.                                                |
| `listings.plateMaskError`     | Nu am reușit să procesăm fotografia. Încercați din nou sau dezactivați ascunderea plăcuțelor.           | Не удалось обработать фото. Попробуйте загрузить его снова или отключите скрытие номерных знаков.                | Failed to process photo. Try uploading again or disable license plate hiding.                       |

Note: `en.json` exists at `core/frontend/lib/locales/en.json` and is used as a fallback. It is NOT copied from root `locales/` (there is no root `locales/en.json`). Add the EN keys directly to `core/frontend/lib/locales/en.json`.

### Backend (locales/backend/ro.json, ru.json, en.json)

| Key                              | EN                                     | RO                                              | RU                                                 |
| -------------------------------- | -------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `errors.plateMaskFailed`         | Failed to process plate masking        | Nu am reușit procesarea măștii plăcuțelor         | Не удалось обработать маскировку номеров             |
| `errors.plateDetectionTimeout`   | Plate detection timed out              | Detectarea plăcuțelor a expirat                   | Время обнаружения номеров истекло                    |

After updating translation files in the platform root, run:

```bash
npm run prepare:build
```

This copies:

- `locales/ro.json`, `locales/ru.json` → `core/frontend/lib/locales/`
- `locales/backend/*.json` → `core/backend/src/common/i18n/`

---

## Publish Validation

Current validation (in `CreateListingDto`):

```
@ArrayMinSize(2) images[]
@ArrayMaxSize(20) images[]
```

This remains unchanged. The `images[]` array only contains URLs of successfully processed photos. Photos that failed plate masking are never added to this array.

No privacy confirmation step is needed.

---

## Edge Cases

The processing pipeline must handle:

| Case                     | Handling                                                  |
| ------------------------ | --------------------------------------------------------- |
| Rotated images (EXIF)    | `sharp.rotate()` without args auto-rotates                |
| Multiple cars            | Detect and mask all plates found                          |
| Tiny distant plates      | Ignore detections with `bbox.width < 40px`                |
| Corrupted images         | Return 400 error (existing validation catches this)       |
| Detection timeout        | Set 10s timeout; on timeout return error to frontend      |
| No plates found          | `result: "not_found"` — photo is added normally           |
| hidePlates=false         | Skip detection entirely, use existing pipeline            |
| ONNX model load failure  | Return `PLATE_MASK_FAILED` when `hidePlates=true`; do not save photo |

---

## Phased Implementation Plan

### Phase 1: Synchronous Processing (MVP)

**Scope:**
- Add `hidePlates` checkbox to `PhotosSection`
- Extend `POST /api/upload/image` to accept `hidePlates` field
- Add plate detection + mask overlay in `UploadService.saveFile()`
- Bundle YOLO ONNX model with backend
- Bundle Inter font for SVG text rendering
- Add translations
- Toast on error

**No new tables, no queues, no polling.**

**Tradeoff:** Upload time increases by ~1-3s per photo when `hidePlates=true`. Acceptable for MVP.

**Estimated effort:** 3-5 days

### Phase 2: Async Processing via BullMQ

**Scope:**
- Add `photo_uploads` table
- Add BullMQ queue (`photo-processing`)
- Create worker service
- Add temp S3 bucket with lifecycle
- New API endpoints (upload, poll, retry)
- Frontend polling with status indicators
- Redis-based job status tracking

**Trigger:** When upload times become problematic or user volume increases.

**Estimated effort:** 5-8 days

### Phase 3: Advanced Features

- Rotation-aware mask placement
- Confidence threshold UI (admin setting)
- Batch upload optimization
- Model version management and A/B testing
- Analytics: detection rate, mask accuracy

---

## Files to Modify

### Phase 1

**Frontend:**

| File                                              | Change                                        |
| ------------------------------------------------- | --------------------------------------------- |
| `components/ListingForm/PhotosSection.tsx`         | Add `Checkbox` for hidePlates                 |
| `components/ListingForm/useListingForm.ts`         | Add `hidePlates` state, update `handleFileUpload`, export |
| `components/ListingForm.tsx`                        | Pass `hidePlates` and `onHidePlatesChange` to `PhotosSection` |
| `components/ListingForm/types.ts`                  | Add `hidePlates` and `onHidePlatesChange` props |
| `lib/api/api.ts`                                   | Extend `uploadApi.uploadImage` signature       |
| `locales/ro.json`                                  | Add translation keys                          |
| `locales/ru.json`                                  | Add translation keys                          |
| `core/frontend/lib/locales/en.json`                | Add EN fallback keys (edit directly, not copied) |

**Backend:**

| File                                              | Change                                        |
| ------------------------------------------------- | --------------------------------------------- |
| `src/upload/upload.controller.ts`                  | Parse `hidePlates` from FormData              |
| `src/upload/upload.service.ts`                     | Add plate detection + mask overlay step        |
| `src/upload/plate-detector.service.ts`             | **NEW**: ONNX inference wrapper               |
| `src/upload/plate-mask.service.ts`                 | **NEW**: SVG mask generation                  |
| `src/upload/upload.module.ts`                      | Register new services                         |
| `locales/backend/ro.json`                          | Add error keys                                |
| `locales/backend/ru.json`                          | Add error keys                                |
| `locales/backend/en.json`                          | Add error keys                                |

**Assets:**

| File                          | Purpose                        |
| ----------------------------- | ------------------------------ |
| `core/backend/assets/plate-mask/plate-detector.onnx` | YOLO v8 nano ONNX model |
| `core/backend/assets/plate-mask/Inter-SemiBold.ttf`  | Font for mask text      |

Asset packaging notes:

- Keep model and font in `core/backend/assets/plate-mask/` so they are deployed with backend runtime.
- Do not place them in root platform `assets/` unless a copy step is explicitly added to `prepare:build`.
- Ensure Docker/CI includes this directory in the backend image.

---

## Dependencies

### New npm Packages (Backend)

| Package            | Purpose                    | Note                              |
| ------------------ | -------------------------- | --------------------------------- |
| `onnxruntime-node` | ONNX model inference       | ~50MB, native bindings            |

### Existing (no changes)

| Package | Already used in           |
| ------- | ------------------------- |
| `sharp` | `upload.service.ts`       |
| `uuid`  | `upload.service.ts`       |

### Phase 2 Additional

| Package          | Purpose                  |
| ---------------- | ------------------------ |
| `@nestjs/bullmq` | Queue management        |
| `bullmq`         | Queue implementation     |

---

## Testing

### Backend Unit Tests

| Test file                                    | What to test                                                |
| -------------------------------------------- | ----------------------------------------------------------- |
| `src/upload/plate-detector.service.spec.ts`  | Mock ONNX session; verify `detect()` returns filtered bboxes |
| `src/upload/plate-mask.service.spec.ts`      | Verify SVG output: dimensions, text, color, font size clamp  |
| `src/upload/upload.service.spec.ts`          | Verify `saveFile()` calls plate detector when `hidePlates=true` and skips when `false` |
| `src/upload/upload.controller.spec.ts`       | Verify `hidePlates` parsed from FormData and passed to service |

### Frontend Unit Tests

| Test file                                    | What to test                                                |
| -------------------------------------------- | ----------------------------------------------------------- |
| `components/ListingForm.test.tsx`            | Checkbox renders, default ON, toggling state, upload passes `hidePlates` |

All test descriptions and assertions must be in English (per project rule `tests-english.mdc`).

### Manual QA

1. Upload photo with checkbox ON, plate visible → plate masked on resulting image
2. Upload photo with checkbox ON, no plate → photo saved normally
3. Upload photo with checkbox OFF → photo saved without detection (fast)
4. Toggle checkbox OFF after uploading masked photos → old photos unaffected
5. Upload corrupt file with checkbox ON → standard upload error toast
6. Simulate detection failure → `listings.plateMaskError` toast, photo not in grid
7. Verify minimum 2 photos validation still works when some uploads fail

---

## Implementation Checklist (Phase 1)

### Backend

- [ ] Install `onnxruntime-node` in `core/backend`
- [ ] Add `core/backend/assets/plate-mask/plate-detector.onnx` (YOLO v8 nano model)
- [ ] Add `core/backend/assets/plate-mask/Inter-SemiBold.ttf` (font file)
- [ ] Create `src/upload/plate-detector.service.ts`
  - [ ] Load ONNX session once in `onModuleInit()`
  - [ ] `detect(buffer, width, height)` → `PlateDetection[]`
  - [ ] Filter: confidence < 0.4 → discard
  - [ ] Filter: width < 40px → discard
  - [ ] 10s timeout on inference; throw on timeout
- [ ] Create `src/upload/plate-mask.service.ts`
  - [ ] `createMaskOverlays(detections, imageWidth, imageHeight)` → Sharp composite inputs
  - [ ] SVG: white rect, `kupito.club` text, color `#1a4534`, Inter font
  - [ ] Font size: `clamp(plateHeight * 0.55, 10, 64)`; shrink if text overflows rect
  - [ ] Padding: bbox expanded by 8%
- [ ] Register both services in `src/upload/upload.module.ts`
- [ ] Update `src/upload/upload.controller.ts`
  - [ ] Parse `hidePlates` string from FormData body
  - [ ] Pass boolean to `saveFile(file, hidePlates)`
- [ ] Update `src/upload/upload.service.ts`
  - [ ] Accept `hidePlates` parameter in `saveFile()`
  - [ ] Add `sharp.rotate()` (EXIF auto-rotation) before resize
  - [ ] Change max width from 1920 to 2048
  - [ ] After resize, if `hidePlates`: call `PlateDetectorService.detect()`, then `PlateMaskService.createMaskOverlays()`, then `sharp.composite()`
  - [ ] On detection/mask error when `hidePlates=true`: throw `BadRequestException('errors.plateMaskFailed')`
  - [ ] Change WebP quality from 75 to 85
- [ ] Add backend translations: `locales/backend/ro.json`, `ru.json`, `en.json`
  - [ ] `errors.plateMaskFailed`
  - [ ] `errors.plateDetectionTimeout`
- [ ] Write unit tests for `PlateDetectorService` and `PlateMaskService`
- [ ] Verify Docker/CI includes `core/backend/assets/plate-mask/` directory

### Frontend

- [ ] Update `locales/ro.json` — add `listings.hidePlates`, `listings.hidePlatesHelper`, `listings.plateMaskError`
- [ ] Update `locales/ru.json` — same keys
- [ ] Update `core/frontend/lib/locales/en.json` — same keys (EN fallback, edit directly)
- [ ] Run `npm run prepare:build` to copy translations
- [ ] Update `components/ListingForm/types.ts` — add `hidePlates?: boolean` and `onHidePlatesChange?: (v: boolean) => void` to `ListingFormSectionProps`
- [ ] Update `components/ListingForm/useListingForm.ts`
  - [ ] Add `const [hidePlates, setHidePlates] = useState(true)`
  - [ ] Update `handleFileUpload` to pass `hidePlates` to `uploadApi.uploadImage`
  - [ ] In `catch`: show `listings.plateMaskError` when `hidePlates=true`, else `listings.photoUploadError`
  - [ ] Export `hidePlates` and `setHidePlates`
- [ ] Update `components/ListingForm.tsx` — pass `hidePlates={hidePlates}` and `onHidePlatesChange={setHidePlates}` to `<PhotosSection>`
- [ ] Update `components/ListingForm/PhotosSection.tsx`
  - [ ] Import `Checkbox` from `@/ui`
  - [ ] Add `Checkbox` between heading and upload button
  - [ ] Wire to `hidePlates` / `onHidePlatesChange` props
- [ ] Update `lib/api/api.ts` — extend `uploadApi.uploadImage(file, hidePlates?)` to append `hidePlates` to FormData
- [ ] Update/add test cases in `components/ListingForm.test.tsx`

### Verification

- [ ] Upload with checkbox ON + plate visible → plate masked
- [ ] Upload with checkbox ON + no plate → photo saved (result: `not_found`)
- [ ] Upload with checkbox OFF → fast upload, no detection
- [ ] Detection failure → toast shown, photo not in grid
- [ ] Checkbox toggle does not affect already uploaded photos
- [ ] `npm run lint:fix && npm run format` passes (both frontend and backend)
- [ ] `npm run test` passes (both frontend and backend)

---

## Related Documentation

- [`IMAGE_PREVIEW.md`](./IMAGE_PREVIEW.md) — Image preview and viewer system
- [`LOADING_STATES.md`](./LOADING_STATES.md) — Loading states patterns
- [`UI_COMPONENTS.md`](./UI_COMPONENTS.md) — Checkbox and other UI components
- [`BACKEND_LAYERS.md`](../architecture/BACKEND_LAYERS.md) — Backend architecture layers

---

**Last Updated:** 2026-02-19
**Version:** 1.1 (Dev-ready spec with implementation checklist, testing section, error format aligned with codebase)
