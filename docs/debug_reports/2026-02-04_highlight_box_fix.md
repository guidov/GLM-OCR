# Highlight Box Misalignment Incident Report
**Date:** 2026-02-04
**Status:** Resolved

## 1. The Issue
Users observed that yellow Highlight Boxes in the OCR results were significantly misaligned. Specifically, the boxes appeared **shifted far to the right and lower** than the actual text or image they were supposed to highlight.

## 2. Root Cause Analysis

### A. Coordinate System Mismatch
The core issue was a misunderstanding of the coordinate system returned by the MaaS (Model-as-a-Service) OCR API.

*   **Assumption:** The frontend and initial backend logic assumed the MaaS API returned **normalized coordinates** (0-1000 scale), which is a common standard.
*   **Reality:** The MaaS API returns **absolute pixel coordinates** based on the image size (e.g., typically `1700x2200` pixels @ 200 DPI).

**The Effect (Magnification):**
When the frontend received an absolute pixel value (e.g., `500` pixels) and treated it as a normalized value (0-1000):
*   **Correct Calculation:** `500 pixels / 1700 width` = **~29%** (Box should be at 29% of page width).
*   **Buggy Calculation:** `500` interpreted as `500/1000` = **50%** (Box drawn at 50% of page width).

This `50% > 29%` discrepancy caused the "Shifted Right" effect. A similar magnification caused the "Shifted Down" effect.

### B. Deployment Failure (The "Still Not Working" Phase)
After the initial code fix was applied, the issue appeared to persist.
*   **Cause:** The backend service failed to restart properly because the previous process was holding Port 8000 (`Address already in use`).
*   **Result:** The user was testing the **New Frontend** (which correctly expected normalized 0-1000 inputs) against the **Old Backend** (which was still sending raw pixel inputs). This mixed-version state reproduced the exact same misalignment symptoms, leading to confusion.

## 3. The Solution

### Backend (`layout_ocr.py`)
We implemented a strict **Normalization Layer** immediately after receiving results from the MaaS API.
```python
# Convert absolute pixels to 0-1000 scale
normalized_box = [
    int(bbox[0] / page_width * 1000),
    int(bbox[1] / page_height * 1000),
    ...
]
```
This ensures that the database always stores coordinates in a device-independent `0-1000` format.

### Frontend (`blockUtils.ts`, `FilePreview.tsx`)
We simplified the frontend to rely exclusively on this standard.
*   **Scaling Logic:** `ReviewWidth * (Coordinate / 1000)`
*   Removed complex "un-padding" logic that was added during the investigation, as it was based on the false premise of aspect-ratio padding.

### Operations
We force-killed the stuck backend process to ensure the new normalization logic was actually live.

## 4. Verification
*   **Logging:** Debug logs were added to `layout_ocr.py` to trace the coordinate transformation (Pixel -> Normalized).
*   **Result:** Yellow highlight boxes now align perfectly with the underlying content.
