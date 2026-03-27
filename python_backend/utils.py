import os
import fitz  # PyMuPDF
from PIL import Image

def resize_image(original_path, target_path, min_kb=None, max_kb=None, width_cm=None, height_cm=None):
    if not os.path.exists(original_path):
        return None
        
    img = Image.open(original_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
        
    width_px, height_px = img.size
    
    # Standard resolution 300 DPI -> 1 cm = ~118 pixels
    dpcm = 118
    if width_cm and height_cm:
        width_px = int(float(width_cm) * dpcm)
        height_px = int(float(height_cm) * dpcm)
        img = img.resize((width_px, height_px), Image.Resampling.LANCZOS)
    
    quality = 95
    step = 5
    
    # Target size loops
    while quality > 10:
        img.save(target_path, "JPEG", quality=quality)
        size_kb = os.path.getsize(target_path) / 1024.0
        
        if max_kb and size_kb > float(max_kb):
            quality -= step
            continue
            
        if min_kb and size_kb < float(min_kb):
            # If it's too small, we might have over-compressed. 
            # If highest quality is still too small, nothing we can do but accept it.
            if quality >= 95:
                break
            # Try to bump up quality slightly, or pad. Padding is complex. We accept smaller usually if quality is maxed.
        
        break
        
    # If still too big, scale dimension down
    while max_kb and os.path.getsize(target_path) / 1024.0 > float(max_kb) and width_px > 100:
        width_px = int(width_px * 0.9)
        height_px = int(height_px * 0.9)
        img = img.resize((width_px, height_px), Image.Resampling.LANCZOS)
        img.save(target_path, "JPEG", quality=quality)
        
    return target_path

def resize_pdf(original_path, target_path, min_kb=None, max_kb=None):
    if not os.path.exists(original_path):
        return None
        
    doc = fitz.open(original_path)
    
    # Try different garbage collection / compression strategies
    # fitz.PDF_SAVE_GARBAGE has level 1 to 4
    # fitz.PDF_SAVE_DEFLATE compresses streams
    
    doc.save(target_path, garbage=4, deflate=True)
    size_kb = os.path.getsize(target_path) / 1024.0
    
    if max_kb and size_kb > float(max_kb):
        # We need dramatic reduction. We'll rasterize pages at lower DPI and create a new PDF
        new_doc = fitz.open()
        dpi_target = 150
        while dpi_target > 50:
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=dpi_target)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Save temp jpg to compress
                temp_jpg = f"{target_path}_tmp_{page_num}.jpg"
                img.save(temp_jpg, "JPEG", quality=70)
                
                # Add back to PDF
                new_page = new_doc.new_page(width=pix.width, height=pix.height)
                new_page.insert_image(new_page.rect, filename=temp_jpg)
                os.remove(temp_jpg)
            
            new_doc.save(target_path, garbage=4, deflate=True)
            new_size_kb = os.path.getsize(target_path) / 1024.0
            
            if new_size_kb <= float(max_kb):
                break
            
            dpi_target -= 30
            
    return target_path
