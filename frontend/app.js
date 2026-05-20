/**
 * =============================================================================
 *  CAQR — Generador de Códigos QR
 *  Frontend Application Logic (Vanilla JavaScript)
 * 
 *  Responsabilidades:
 *    - Gestión de pestañas (tabs)
 *    - Validación del lado del cliente
 *    - Drag & drop para archivos e imágenes
 *    - Comunicación con la API (fetch)
 *    - Visualización y descarga del QR generado
 *    - Toasts para notificaciones
 * =============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar iconos de Lucide
    lucide.createIcons();

    // =========================================================================
    // Referencias al DOM
    // =========================================================================

    // Tabs
    const tabs = document.querySelectorAll(".tab");
    const panels = document.querySelectorAll(".panel");
    const tabIndicator = document.getElementById("tab-indicator");

    // Panel Enlace
    const urlInput = document.getElementById("url-input");
    const btnClearUrl = document.getElementById("btn-clear-url");
    const btnGenerateUrl = document.getElementById("btn-generate-url");

    // Panel Archivo
    const dropZoneFile = document.getElementById("drop-zone-file");
    const fileInputDoc = document.getElementById("file-input-doc");
    const filePreviewDoc = document.getElementById("file-preview-doc");
    const fileNameDoc = document.getElementById("file-name-doc");
    const fileSizeDoc = document.getElementById("file-size-doc");
    const btnRemoveDoc = document.getElementById("btn-remove-doc");
    const btnGenerateFile = document.getElementById("btn-generate-file");

    // Panel Imagen
    const dropZoneImage = document.getElementById("drop-zone-image");
    const fileInputImg = document.getElementById("file-input-img");
    const imagePreviewBox = document.getElementById("image-preview-box");
    const imagePreviewThumb = document.getElementById("image-preview-thumb");
    const fileNameImg = document.getElementById("file-name-img");
    const fileSizeImg = document.getElementById("file-size-img");
    const btnRemoveImg = document.getElementById("btn-remove-img");
    const btnGenerateImage = document.getElementById("btn-generate-image");

    // Resultado QR
    const qrResult = document.getElementById("qr-result");
    const qrImage = document.getElementById("qr-image");
    const qrTargetUrl = document.getElementById("qr-target-url");
    const btnDownloadQr = document.getElementById("btn-download-qr");
    const btnNewQr = document.getElementById("btn-new-qr");

    // Loading & Toasts
    const loadingOverlay = document.getElementById("loading-overlay");
    const loaderText = document.getElementById("loader-text");
    const toastContainer = document.getElementById("toast-container");

    // Estado
    let selectedDocFile = null;
    let selectedImgFile = null;


    // =========================================================================
    // Sistema de Pestañas (Tabs)
    // =========================================================================

    /**
     * Mueve el indicador visual al tab activo.
     */
    function moveIndicator(tabEl) {
        const tabsNav = document.getElementById("tabs-nav");
        const navRect = tabsNav.getBoundingClientRect();
        const tabRect = tabEl.getBoundingClientRect();
        const offsetLeft = tabRect.left - navRect.left;
        tabIndicator.style.transform = `translateX(${offsetLeft - 8}px)`;
        tabIndicator.style.width = `${tabRect.width}px`;
    }

    /**
     * Activa un tab específico por su data-tab.
     */
    function activateTab(tabName) {
        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle("active", isActive);
            tab.setAttribute("aria-selected", isActive);
            if (isActive) moveIndicator(tab);
        });

        panels.forEach(panel => {
            const panelName = panel.id.replace("panel-", "");
            panel.classList.toggle("active", panelName === tabName);
        });
    }

    // Inicializar indicador
    setTimeout(() => moveIndicator(document.querySelector(".tab.active")), 50);

    // Event listeners para tabs
    tabs.forEach(tab => {
        tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    });

    // Re-posicionar indicador en resize
    window.addEventListener("resize", () => {
        const activeTab = document.querySelector(".tab.active");
        if (activeTab) moveIndicator(activeTab);
    });


    // =========================================================================
    // Utilidades
    // =========================================================================

    /**
     * Formatea un tamaño en bytes a una cadena legible (KB / MB).
     */
    function formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Obtiene la extensión de un archivo en minúsculas.
     */
    function getExtension(filename) {
        return filename.split(".").pop().toLowerCase();
    }

    /**
     * Valida el tamaño del archivo (máx. 5MB).
     */
    function validateFileSize(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            showToast("El archivo excede el tamaño máximo de 5MB", "error");
            return false;
        }
        return true;
    }

    /**
     * Valida la extensión del archivo.
     */
    function validateExtension(file, allowedExts) {
        const ext = getExtension(file.name);
        if (!allowedExts.includes(ext)) {
            showToast(`Extensión .${ext} no permitida. Usa: ${allowedExts.join(", ")}`, "error");
            return false;
        }
        return true;
    }


    // =========================================================================
    // Toast Notifications
    // =========================================================================

    /**
     * Muestra un toast notification.
     * @param {string} message - Mensaje a mostrar.
     * @param {"success"|"error"|"info"} type - Tipo de toast.
     * @param {number} duration - Duración en ms (default: 4000).
     */
    function showToast(message, type = "info", duration = 4000) {
        const iconMap = {
            success: "check-circle-2",
            error: "alert-circle",
            info: "info",
        };

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i data-lucide="${iconMap[type]}" class="toast-icon"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);
        lucide.createIcons({ nodes: [toast] });

        // Auto-remove
        setTimeout(() => {
            toast.classList.add("toast-out");
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }


    // =========================================================================
    // Loading Overlay
    // =========================================================================

    function showLoading(text = "Generando código QR...") {
        loaderText.textContent = text;
        loadingOverlay.classList.remove("hidden");
    }

    function hideLoading() {
        loadingOverlay.classList.add("hidden");
    }


    // =========================================================================
    // Panel Enlace — Lógica
    // =========================================================================

    // Mostrar/ocultar botón de limpiar
    urlInput.addEventListener("input", () => {
        btnClearUrl.classList.toggle("visible", urlInput.value.length > 0);
    });

    // Limpiar campo
    btnClearUrl.addEventListener("click", () => {
        urlInput.value = "";
        btnClearUrl.classList.remove("visible");
        urlInput.focus();
    });

    // Generar QR desde URL (click)
    btnGenerateUrl.addEventListener("click", generateQrFromUrl);

    // Generar QR desde URL (Enter)
    urlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") generateQrFromUrl();
    });

    async function generateQrFromUrl() {
        const url = urlInput.value.trim();
        if (!url) {
            showToast("Por favor, ingresa una URL", "error");
            urlInput.focus();
            return;
        }

        showLoading("Generando QR para tu enlace...");

        try {
            const response = await fetch("/api/generate-qr-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Error al generar el QR");
            }

            showQrResult(data.qr_image, data.target_url);
            showToast("¡QR generado exitosamente!", "success");

        } catch (err) {
            showToast(err.message || "Error de conexión con el servidor", "error");
        } finally {
            hideLoading();
        }
    }


    // =========================================================================
    // Panel Archivo — Drag & Drop
    // =========================================================================

    const docExtensions = ["pdf", "docx"];

    setupDropZone(dropZoneFile, fileInputDoc, docExtensions, (file) => {
        selectedDocFile = file;
        fileNameDoc.textContent = file.name;
        fileSizeDoc.textContent = formatSize(file.size);
        dropZoneFile.classList.add("hidden");
        filePreviewDoc.classList.remove("hidden");
    });

    // Quitar archivo
    btnRemoveDoc.addEventListener("click", () => {
        selectedDocFile = null;
        fileInputDoc.value = "";
        filePreviewDoc.classList.add("hidden");
        dropZoneFile.classList.remove("hidden");
    });

    // Generar QR desde archivo
    btnGenerateFile.addEventListener("click", () => uploadAndGenerate(selectedDocFile, "archivo"));


    // =========================================================================
    // Panel Imagen — Drag & Drop
    // =========================================================================

    const imgExtensions = ["jpg", "jpeg", "png"];

    setupDropZone(dropZoneImage, fileInputImg, imgExtensions, (file) => {
        selectedImgFile = file;
        fileNameImg.textContent = file.name;
        fileSizeImg.textContent = formatSize(file.size);

        // Mostrar vista previa de la imagen
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreviewThumb.src = e.target.result;
            dropZoneImage.classList.add("hidden");
            imagePreviewBox.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    });

    // Quitar imagen
    btnRemoveImg.addEventListener("click", () => {
        selectedImgFile = null;
        fileInputImg.value = "";
        imagePreviewThumb.src = "";
        imagePreviewBox.classList.add("hidden");
        dropZoneImage.classList.remove("hidden");
    });

    // Generar QR desde imagen
    btnGenerateImage.addEventListener("click", () => uploadAndGenerate(selectedImgFile, "imagen"));


    // =========================================================================
    // Drag & Drop — Setup genérico
    // =========================================================================

    /**
     * Configura un drop zone con validación de archivos.
     * @param {HTMLElement} zone - El elemento drop zone.
     * @param {HTMLInputElement} input - Input file asociado.
     * @param {string[]} allowedExts - Extensiones permitidas.
     * @param {Function} onFileSelected - Callback al seleccionar un archivo válido.
     */
    function setupDropZone(zone, input, allowedExts, onFileSelected) {
        // Drag events
        ["dragenter", "dragover"].forEach(evt => {
            zone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add("drag-over");
            });
        });

        ["dragleave", "drop"].forEach(evt => {
            zone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.remove("drag-over");
            });
        });

        // Drop
        zone.addEventListener("drop", (e) => {
            const file = e.dataTransfer.files[0];
            if (file) processFile(file, allowedExts, onFileSelected);
        });

        // File input change
        input.addEventListener("change", () => {
            const file = input.files[0];
            if (file) processFile(file, allowedExts, onFileSelected);
        });

        // Keyboard accessibility
        zone.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                input.click();
            }
        });
    }

    /**
     * Valida y procesa un archivo seleccionado.
     */
    function processFile(file, allowedExts, onFileSelected) {
        if (!validateExtension(file, allowedExts)) return;
        if (!validateFileSize(file)) return;
        onFileSelected(file);
    }


    // =========================================================================
    // Subir archivo y generar QR
    // =========================================================================

    /**
     * Sube un archivo al backend y muestra el QR generado.
     * @param {File|null} file - Archivo seleccionado.
     * @param {string} type - Tipo ("archivo" o "imagen").
     */
    async function uploadAndGenerate(file, type) {
        if (!file) {
            showToast(`Selecciona un ${type} primero`, "error");
            return;
        }

        showLoading(`Subiendo ${type} y generando QR...`);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload-file", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Error al subir el archivo");
            }

            showQrResult(data.qr_image, data.file_url);
            showToast(`¡${type.charAt(0).toUpperCase() + type.slice(1)} subido y QR generado!`, "success");

        } catch (err) {
            showToast(err.message || "Error de conexión con el servidor", "error");
        } finally {
            hideLoading();
        }
    }


    // =========================================================================
    // Mostrar Resultado QR
    // =========================================================================

    function showQrResult(imgSrc, targetUrl) {
        qrImage.src = imgSrc;
        qrTargetUrl.textContent = targetUrl;
        qrTargetUrl.title = targetUrl;

        // Ocultar la tarjeta principal, mostrar resultado
        document.getElementById("main-card").classList.add("hidden");
        qrResult.classList.remove("hidden");

        // Re-trigger animation
        qrResult.style.animation = "none";
        // Force reflow
        void qrResult.offsetHeight;
        qrResult.style.animation = "";

        // Re-init icons
        lucide.createIcons({ nodes: [qrResult] });
    }


    // =========================================================================
    // Descargar QR como PNG
    // =========================================================================

    btnDownloadQr.addEventListener("click", () => {
        const link = document.createElement("a");
        link.download = "CAQR_codigo_qr.png";
        link.href = qrImage.src;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("QR descargado correctamente", "success");
    });


    // =========================================================================
    // Nuevo QR
    // =========================================================================

    btnNewQr.addEventListener("click", () => {
        // Resetear estado
        qrResult.classList.add("hidden");
        document.getElementById("main-card").classList.remove("hidden");

        // Limpiar campos
        urlInput.value = "";
        btnClearUrl.classList.remove("visible");

        // Reset file panels
        selectedDocFile = null;
        selectedImgFile = null;
        fileInputDoc.value = "";
        fileInputImg.value = "";
        filePreviewDoc.classList.add("hidden");
        dropZoneFile.classList.remove("hidden");
        imagePreviewBox.classList.add("hidden");
        dropZoneImage.classList.remove("hidden");
        imagePreviewThumb.src = "";

        // Volver a la primera pestaña
        activateTab("link");
    });

});
