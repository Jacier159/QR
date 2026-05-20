# 🔲 CAQR — Generador de Códigos QR

Aplicación web para generar códigos QR a partir de **enlaces (URLs)**, **documentos** y **archivos de imagen**.

## 📁 Estructura del Proyecto

```
CAQR/
├── backend/
│   ├── __init__.py          # Paquete Python
│   └── app.py               # API FastAPI (lógica principal)
├── frontend/
│   ├── index.html           # Página principal
│   ├── style.css            # Estilos (diseño premium)
│   └── app.js               # Lógica del frontend
├── uploads/                 # 📂 Archivos subidos (se crea automáticamente)
├── requirements.txt         # Dependencias Python
└── README.md                # Este archivo
```

## 🛠️ Dependencias

| Librería          | Versión  | Uso                              |
|--------------------|----------|----------------------------------|
| `fastapi`          | 0.115.0  | Framework web (API REST)         |
| `uvicorn`          | 0.30.6   | Servidor ASGI                    |
| `python-multipart` | 0.0.9    | Manejo de uploads multipart      |
| `qrcode[pil]`      | 7.4.2    | Generación de códigos QR         |
| `Pillow`           | 10.4.0   | Procesamiento de imágenes        |

## 🚀 Instrucciones de Ejecución

### 1. Requisitos previos
- **Python 3.9+** instalado
- **pip** actualizado

### 2. Instalar dependencias

```bash
cd CAQR
pip install -r requirements.txt
```

### 3. Iniciar el servidor

```bash
python -m backend.app
```

### 4. Abrir en el navegador

Navega a: **http://localhost:8000**

## 🔒 Seguridad

- ✅ Tamaño máximo de archivo: **5 MB**
- ✅ Extensiones permitidas: `pdf`, `jpg`, `jpeg`, `png`, `docx`
- ✅ Nombres de archivo saneados con UUID (previene path traversal)
- ✅ Validación en frontend y backend
- ✅ CORS configurado

## 🎨 Características

- 🎯 **Tres modos**: Enlace, Archivo, Imagen
- 🖱️ **Drag & Drop** para archivos e imágenes
- 📱 **Diseño responsivo** (mobile-first)
- ✨ **Animaciones suaves** y micro-interacciones
- 🌙 **Tema oscuro premium** con glassmorphism
- 📥 **Descarga QR** en formato PNG
- 🔔 **Notificaciones toast** para feedback visual
