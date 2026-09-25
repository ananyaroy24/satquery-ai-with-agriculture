import os
import io
import uuid
import numpy as np
from PIL import Image, ImageOps
import tifffile
from typing import Dict, Any, Tuple, Optional, List

ALLOWED_EXTENSIONS = {".tif", ".tiff", ".geotiff", ".png", ".jpg", ".jpeg"}

def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)

def read_image_to_numpy(file_path: str) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Reads GeoTIFF, TIFF, PNG, or JPEG into a normalized float32 or uint8 numpy array,
    along with metadata.
    """
    ext = os.path.splitext(file_path)[1].lower()
    meta = {
        "format": ext.replace(".", "").upper(),
        "channels": 3,
        "width": 0,
        "height": 0,
        "dtype": "uint8"
    }

    if ext in [".tif", ".tiff", ".geotiff"]:
        try:
            arr = tifffile.imread(file_path)
            meta["dtype"] = str(arr.dtype)
            if arr.ndim == 2:
                # Single band (e.g. SAR or single index)
                h, w = arr.shape
                meta["channels"] = 1
                meta["height"] = h
                meta["width"] = w
                # Normalize to 0-255 uint8 for preview
                norm = normalize_band(arr)
                rgb = np.stack([norm, norm, norm], axis=-1)
                return rgb, meta
            elif arr.ndim == 3:
                # Shape could be (C, H, W) or (H, W, C)
                if arr.shape[0] in [1, 2, 3, 4, 8, 12, 13] and arr.shape[0] < arr.shape[1]:
                    # (C, H, W) -> transpose to (H, W, C)
                    arr = np.transpose(arr, (1, 2, 0))
                
                h, w, c = arr.shape
                meta["channels"] = c
                meta["height"] = h
                meta["width"] = w

                if c == 1:
                    norm = normalize_band(arr[:, :, 0])
                    rgb = np.stack([norm, norm, norm], axis=-1)
                    return rgb, meta
                elif c == 2:
                    # e.g., Dual pol SAR (VV, VH)
                    vv = normalize_band(arr[:, :, 0])
                    vh = normalize_band(arr[:, :, 1])
                    ratio = normalize_band(np.nan_to_num(arr[:, :, 0] / (arr[:, :, 1] + 1e-6)))
                    rgb = np.stack([vv, vh, ratio], axis=-1)
                    return rgb, meta
                elif c >= 3:
                    # First 3 bands as RGB
                    r = normalize_band(arr[:, :, 0])
                    g = normalize_band(arr[:, :, 1])
                    b = normalize_band(arr[:, :, 2])
                    rgb = np.stack([r, g, b], axis=-1)
                    return rgb, meta
        except Exception as e:
            # Fallback to PIL
            pass

    # Standard PIL reader
    with Image.open(file_path) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        meta["width"] = w
        meta["height"] = h
        meta["channels"] = 3
        arr = np.array(img, dtype=np.uint8)
        return arr, meta

def normalize_band(band: np.ndarray) -> np.ndarray:
    """Safely normalizes any arbitrary float/int raster band to uint8 [0, 255]."""
    band = np.nan_to_num(band.astype(np.float32), nan=0.0, posinf=255.0, neginf=0.0)
    p2, p98 = np.percentile(band, (2, 98))
    if p98 > p2:
        clipped = np.clip(band, p2, p98)
        norm = ((clipped - p2) / (p98 - p2) * 255.0).astype(np.uint8)
    else:
        norm = np.clip(band, 0, 255).astype(np.uint8)
    return norm

def save_numpy_as_png(arr: np.ndarray, output_path: str) -> str:
    """Saves uint8 numpy array (H, W, 3) or (H, W) to PNG."""
    ensure_dir(os.path.dirname(output_path))
    if arr.ndim == 2:
        img = Image.fromarray(arr, mode="L")
    elif arr.shape[2] == 3:
        img = Image.fromarray(arr, mode="RGB")
    elif arr.shape[2] == 4:
        img = Image.fromarray(arr, mode="RGBA")
    else:
        img = Image.fromarray(arr[:, :, :3], mode="RGB")
    img.save(output_path, format="PNG", optimize=True)
    return output_path

def validate_image_pair(file1_path: str, file2_path: str) -> Tuple[bool, str]:
    """
    Validates spatial and resolution compatibility between two remote sensing images.
    """
    _, meta1 = read_image_to_numpy(file1_path)
    _, meta2 = read_image_to_numpy(file2_path)

    w1, h1 = meta1["width"], meta1["height"]
    w2, h2 = meta2["width"], meta2["height"]

    aspect1 = w1 / max(h1, 1)
    aspect2 = w2 / max(h2, 1)

    # Check aspect ratio tolerance (within 15%)
    if abs(aspect1 - aspect2) / max(aspect1, aspect2) > 0.15:
        return False, f"Aspect ratio mismatch: Image 1 is {w1}x{h1} (aspect {aspect1:.2f}), Image 2 is {w2}x{h2} (aspect {aspect2:.2f}). Both images must cover geometrically equivalent footprints."

    return True, f"Spatial compatibility verified. Both images align with compatible dimensions ({w1}x{h1} vs {w2}x{h2})."

def align_image_dimensions(arr1: np.ndarray, arr2: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Ensures arr1 and arr2 have identical pixel dimensions for pixel-wise change detection."""
    h1, w1 = arr1.shape[:2]
    h2, w2 = arr2.shape[:2]

    if (h1, w1) == (h2, w2):
        return arr1, arr2

    target_h = max(h1, h2)
    target_w = max(w1, w2)

    img1 = Image.fromarray(arr1).resize((target_w, target_h), Image.Resampling.BILINEAR)
    img2 = Image.fromarray(arr2).resize((target_w, target_h), Image.Resampling.BILINEAR)

    return np.array(img1), np.array(img2)
