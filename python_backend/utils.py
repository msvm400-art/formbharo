import os
import fitz  # PyMuPDF
from PIL import Image

def process_file(original_path, target_path, reqs=None, is_photo=False):
    """
    Master function to process file according to requirements.
    reqs: { min_kb, max_kb, width, height, unit }
    is_photo: True for JPG, False for PDF (document)
    """
    if not os.path.exists(original_path):
        return None
        
    ext = original_path.lower().split('.')[-1]
    
    if is_photo:
        # Target is JPG
        if ext == 'pdf':
            # Extract first page of PDF as image
            doc = fitz.open(original_path)
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            temp_img = original_path.replace('.pdf', '_temp.jpg')
            img.save(temp_img, "JPEG", quality=95)
            original_path = temp_img
        
        return resize_image(original_path, target_path, 
                            min_kb=reqs.get('min_kb'), 
                            max_kb=reqs.get('max_kb'), 
                            target_width=reqs.get('width'), 
                            target_height=reqs.get('height'), 
                            unit=reqs.get('unit', 'px'))
    else:
        # Target is PDF
        if ext in ['jpg', 'jpeg', 'png']:
            # Convert image to PDF first
            img = Image.open(original_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            temp_pdf = original_path.replace(ext, 'pdf')
            img.save(temp_pdf, "PDF", resolution=100.0)
            original_path = temp_pdf
            
        return resize_pdf(original_path, target_path, 
                          min_kb=reqs.get('min_kb'), 
                          max_kb=reqs.get('max_kb'))

def resize_image(original_path, target_path, min_kb=None, max_kb=None, target_width=None, target_height=None, unit='px'):
    if not os.path.exists(original_path):
        return None
        
    img = Image.open(original_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
        
    width_px, height_px = img.size
    
    # Unit conversion to pixels
    # 1 inch = 2.54 cm = 25.4 mm
    # Standard 300 DPI: 1 cm = 118 px, 1 mm = 11.8 px
    dpi = 300
    dpmm = 11.811
    dpcm = 118.11
    
    if target_width and target_height:
        if unit == 'cm':
            width_px = int(float(target_width) * dpcm)
            height_px = int(float(target_height) * dpcm)
        elif unit == 'mm':
            width_px = int(float(target_width) * dpmm)
            height_px = int(float(target_height) * dpmm)
        else: # px
            width_px = int(target_width)
            height_px = int(target_height)
            
        img = img.resize((width_px, height_px), Image.Resampling.LANCZOS)
    
    quality = 95
    step = 5
    
    # Ensure target path has .jpg or .jpeg extension
    if not target_path.lower().endswith(('.jpg', '.jpeg')):
        target_path += '.jpg'

    # Target size loops
    while quality > 10:
        img.save(target_path, "JPEG", quality=quality)
        size_kb = os.path.getsize(target_path) / 1024.0
        
        if max_kb and size_kb > float(max_kb):
            quality -= step
            continue
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
    
    if not target_path.lower().endswith('.pdf'):
        target_path += '.pdf'

    doc = fitz.open(original_path)
    doc.save(target_path, garbage=4, deflate=True)
    size_kb = os.path.getsize(target_path) / 1024.0
    
    if max_kb and size_kb > float(max_kb):
        new_doc = fitz.open()
        dpi_target = 150
        while dpi_target > 50:
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=dpi_target)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                temp_jpg = f"{target_path}_tmp_{page_num}.jpg"
                img.save(temp_jpg, "JPEG", quality=70)
                
                new_page = new_doc.new_page(width=pix.width, height=pix.height)
                new_page.insert_image(new_page.rect, filename=temp_jpg)
                os.remove(temp_jpg)
            
            new_doc.save(target_path, garbage=4, deflate=True)
            new_size_kb = os.path.getsize(target_path) / 1024.0
            
            if new_size_kb <= float(max_kb):
                break
            dpi_target -= 30
            
    return target_path
