"""
=============================================================================
  CAQR - Generador de Códigos QR
  Backend API con FastAPI
  
  Funcionalidades:
    1. Generar QR a partir de una URL
    2. Subir archivos (PDF, DOCX) y generar QR con el enlace público
    3. Subir imágenes (JPG, PNG) y generar QR con el enlace público
  
  Seguridad:
    - Límite de tamaño de archivo: 5MB
    - Extensiones permitidas: pdf, jpg, jpeg, png, docx
    - Nombres de archivo saneados con UUID para evitar colisiones
=============================================================================
"""

import os
import uuid
import io
import base64
from pathlib import Path
from datetime import datetime

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# =============================================================================
# Configuración
# =============================================================================

# Tamaño máximo de archivo permitido: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB en bytes

# Extensiones permitidas (en minúsculas)
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "docx"}

# Directorio base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent

# Directorio donde se guardan los archivos subidos
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Directorio del frontend
FRONTEND_DIR = BASE_DIR / "frontend"

# =============================================================================
# Inicialización de la app
# =============================================================================

app = FastAPI(
    title="CAQR - Generador de Códigos QR",
    description="API para generar códigos QR desde enlaces, archivos e imágenes",
    version="1.0.0",
)

# Middleware CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Funciones auxiliares
# =============================================================================

def validate_file_extension(filename: str) -> str:
    """
    Valida que la extensión del archivo esté en la lista de permitidas.
    Retorna la extensión en minúsculas si es válida, o lanza HTTPException.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extensión '.{ext}' no permitida. Extensiones válidas: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return ext


def generate_qr_base64(data: str) -> str:
    """
    Genera un código QR a partir de un string (URL o texto) y lo retorna
    como una imagen PNG codificada en Base64.
    
    Se usa RoundedModuleDrawer para un estilo más moderno y redondeado.
    """
    qr = qrcode.QRCode(
        version=None,  # Auto-detect
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Generar la imagen QR con módulos redondeados
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        fill_color="#1a1a2e",
        back_color="#ffffff",
    )

    # Convertir a PNG en memoria y codificar en Base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return img_base64


def get_safe_filename(original_filename: str, ext: str) -> str:
    """
    Genera un nombre de archivo seguro usando UUID + extensión original.
    Esto previene ataques de path traversal y colisiones de nombres.
    """
    unique_id = uuid.uuid4().hex[:12]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_name = f"{timestamp}_{unique_id}.{ext}"
    return safe_name


# =============================================================================
# Rutas de la API
# =============================================================================

@app.post("/api/generate-qr-url")
async def generate_qr_from_url(request: Request):
    """
    Endpoint: Genera un código QR a partir de una URL proporcionada.
    
    Body (JSON): { "url": "https://ejemplo.com" }
    Respuesta: { "qr_image": "data:image/png;base64,..." }
    """
    body = await request.json()
    url = body.get("url", "").strip()

    if not url:
        raise HTTPException(status_code=400, detail="La URL no puede estar vacía.")

    # Validación básica de URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Generar el QR
    qr_base64 = generate_qr_base64(url)

    return JSONResponse({
        "success": True,
        "qr_image": f"data:image/png;base64,{qr_base64}",
        "target_url": url,
    })


@app.post("/api/upload-file")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """
    Endpoint: Sube un archivo (PDF, DOCX, JPG, PNG), lo guarda en /uploads
    y genera un código QR con la URL pública de ese archivo.
    
    Body (multipart/form-data): file
    Respuesta: {
        "qr_image": "data:image/png;base64,...",
        "file_url": "http://host/uploads/archivo.ext",
        "filename": "archivo.ext"
    }
    """
    # 1. Validar extensión del archivo
    ext = validate_file_extension(file.filename)

    # 2. Leer el contenido y validar tamaño
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"El archivo excede el tamaño máximo permitido de {MAX_FILE_SIZE // (1024*1024)}MB."
        )

    # 3. Generar nombre seguro y guardar el archivo
    safe_name = get_safe_filename(file.filename, ext)
    file_path = UPLOAD_DIR / safe_name
    
    with open(file_path, "wb") as f:
        f.write(content)

    # 4. Construir la URL pública del archivo
    #    Se usa el host de la petición para generar una URL accesible
    host = request.headers.get("host", "localhost:8000")
    scheme = request.headers.get("x-forwarded-proto", "http")
    file_url = f"{scheme}://{host}/uploads/{safe_name}"

    # 5. Generar el código QR con la URL del archivo
    qr_base64 = generate_qr_base64(file_url)

    return JSONResponse({
        "success": True,
        "qr_image": f"data:image/png;base64,{qr_base64}",
        "file_url": file_url,
        "filename": safe_name,
        "original_name": file.filename,
        "size_kb": round(len(content) / 1024, 1),
    })


# =============================================================================
# Servir archivos estáticos
# =============================================================================

# Servir los archivos subidos desde /uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Servir el frontend desde /static (CSS, JS)
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def serve_index():
    """Sirve la página principal del frontend."""
    return FileResponse(str(FRONTEND_DIR / "index.html"))


# =============================================================================
# Punto de entrada
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n  [*] CAQR Server iniciando...")
    print(f"  [+] Directorio de uploads: {UPLOAD_DIR}")
    print(f"  [>] Abre tu navegador en: http://localhost:8000\n")
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
