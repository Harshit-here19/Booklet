import * as pdfjsLib from "./lib/pdf.min.mjs";

// ============================================================
// PDF.JS WORKER
// ============================================================

pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdf.worker.min.mjs";

const A4_RATIO = 210 / 297;
const LETTER_RATIO = 215.9 / 279.4;

// ============================================================
// ELEMENTS
// ============================================================

// Tabs

const pdfToImagesTab = document.getElementById("pdfToImagesTab");

const imagesToPdfTab = document.getElementById("imagesToPdfTab");

// Sections

const pdfToImagesSection = document.getElementById("pdfToImagesSection");

const imagesToPdfSection = document.getElementById("imagesToPdfSection");

// ============================================================
// PDF → IMAGES
// ============================================================

const pdfFile = document.getElementById("pdfFile");

const pdfFileName = document.getElementById("pdfFileName");

const scaleSelect = document.getElementById("scale");

const convertBtn = document.getElementById("convertBtn");

const clearBtn = document.getElementById("clearBtn");

const progressBar = document.getElementById("progressBar");

const progressLabel = document.getElementById("progressLabel");

const progressPercent = document.getElementById("progressPercent");

const status = document.getElementById("status");

const output = document.getElementById("output");

// ============================================================
// IMAGES → PDF
// ============================================================

const imageFiles = document.getElementById("imageFiles");

const imageFileName = document.getElementById("imageFileName");

const imageList = document.getElementById("imageList");

const imageCount = document.getElementById("imageCount");

const createPdfBtn = document.getElementById("createPdfBtn");

const clearImagesBtn = document.getElementById("clearImagesBtn");

const imagePdfStatus = document.getElementById("imagePdfStatus");
const imageProgressBar = document.getElementById("imageProgressBar");
const imageProgressLabel = document.getElementById("imageProgressLabel");
const imageProgressPercent = document.getElementById("imageProgressPercent");
const imageProgressStatus = document.getElementById("imageProgressStatus");

const pageSize = document.getElementById("pageSize");

const orientation = document.getElementById("orientation");

const margin = document.getElementById("margin");

// ============================================================
// PDF PREVIEW
// ============================================================

const pdfResultSection = document.getElementById("pdfResultSection");

const pdfViewer = document.getElementById("pdfViewer");

const downloadPdfButton = document.getElementById("downloadPdfButton");

const editPdfButton = document.getElementById("editPdfButton");

const resultDescription = document.getElementById("resultDescription");

let generatedPdfBytes = null;

let generatedPdfUrl = null;

// ============================================================
// DROP ZONES
// ============================================================

const pdfDropZone = document.getElementById("pdfDropZone");

const imageDropZone = document.getElementById("imageDropZone");

// ============================================================
// STATE
// ============================================================

let selectedPdf = null;

let selectedImages = [];

let draggedIndex = null;

// Currently edited crop

let cropEditorIndex = null;

// ============================================================
// SUPPORTED IMAGE TYPES
// ============================================================

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ============================================================
// TAB SWITCHING
// ============================================================

pdfToImagesTab.addEventListener("click", () => {
  pdfToImagesTab.classList.add("active");

  imagesToPdfTab.classList.remove("active");

  pdfToImagesSection.classList.remove("hidden");

  imagesToPdfSection.classList.add("hidden");
});

imagesToPdfTab.addEventListener("click", () => {
  imagesToPdfTab.classList.add("active");

  pdfToImagesTab.classList.remove("active");

  imagesToPdfSection.classList.remove("hidden");

  pdfToImagesSection.classList.add("hidden");
});

// ============================================================
// PDF DRAG & DROP
// ============================================================

if (pdfDropZone) {
  ["dragenter", "dragover"].forEach((eventName) => {
    pdfDropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      pdfDropZone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    pdfDropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      pdfDropZone.classList.remove("drag-over");
    });
  });

  pdfDropZone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    const file = files[0];

    if (file.type !== "application/pdf") {
      selectedPdf = null;

      convertBtn.disabled = true;

      pdfFileName.textContent = "Invalid file";

      status.textContent = "❌ Please drop a PDF file.";

      return;
    }

    selectedPdf = file;

    convertBtn.disabled = false;

    pdfFileName.textContent = file.name;

    status.textContent = `Selected: ${file.name}`;
  });
}

// ============================================================
// PDF FILE SELECTION
// ============================================================

pdfFile.addEventListener("change", () => {
  selectedPdf = pdfFile.files[0] || null;

  if (!selectedPdf) {
    convertBtn.disabled = true;

    pdfFileName.textContent = "No PDF selected";

    status.textContent = "Select a PDF to begin.";

    return;
  }

  if (selectedPdf.type !== "application/pdf") {
    selectedPdf = null;

    convertBtn.disabled = true;

    pdfFileName.textContent = "Invalid file";

    status.textContent = "Please select a PDF file.";

    return;
  }

  convertBtn.disabled = false;

  pdfFileName.textContent = selectedPdf.name;

  status.textContent = `Selected: ${selectedPdf.name}`;
});

// ============================================================
// PDF → IMAGES
// ============================================================

convertBtn.addEventListener("click", convertPdfToImages);

async function convertPdfToImages() {
  if (!selectedPdf) {
    return;
  }

  convertBtn.disabled = true;

  output.innerHTML = "";

  updateProgress(0, "Reading PDF...");

  try {
    status.textContent = "Preparing your PDF...";

    const arrayBuffer = await selectedPdf.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    const totalPages = pdf.numPages;

    const scale = parseFloat(scaleSelect.value);

    status.textContent = `Preparing ${totalPages} page${
      totalPages === 1 ? "" : "s"
    }...`;

    updateProgress(0, "Starting conversion");

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const percentBefore = ((pageNumber - 1) / totalPages) * 100;

      updateProgress(
        percentBefore,
        `Rendering page ${pageNumber} of ${totalPages}`,
      );

      status.innerHTML = `
        <span class="rendering-status">
          <span class="rendering-dot"></span>
          Rendering page ${pageNumber} of ${totalPages}...
        </span>
      `;

      const page = await pdf.getPage(pageNumber);

      const viewport = page.getViewport({
        scale: scale,
      });

      const canvas = document.createElement("canvas");

      const context = canvas.getContext("2d");

      canvas.width = Math.floor(viewport.width);

      canvas.height = Math.floor(viewport.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const imageURL = canvas.toDataURL("image/png");

      createPdfImageCard(pageNumber, imageURL, totalPages);

      const percentAfter = (pageNumber / totalPages) * 100;

      updateProgress(
        percentAfter,
        pageNumber === totalPages
          ? "Conversion complete"
          : `Rendered ${pageNumber} of ${totalPages} pages`,
      );

      await sleep(30);
    }

    updateProgress(100, "Conversion complete");

    status.innerHTML = `
      <span class="success-status">
        <span class="success-icon">✓</span>
        ${totalPages} page${totalPages === 1 ? "" : "s"} converted successfully
      </span>
    `;

    output.classList.add("conversion-complete");

    setTimeout(() => {
      output.classList.remove("conversion-complete");
    }, 800);
  } catch (error) {
    console.error(error);

    updateProgress(0, "Conversion failed");

    status.innerHTML = `
      <span class="error-status">
        ❌ Error converting PDF:
        ${error.message}
      </span>
    `;
  } finally {
    convertBtn.disabled = false;
  }
}

// ============================================================
// CREATE PDF IMAGE OUTPUT CARD
// ============================================================

function createPdfImageCard(pageNumber, imageURL, totalPages) {
  const pageDiv = document.createElement("div");

  pageDiv.className = "pdf-page-card";

  pageDiv.style.setProperty(
    "--animation-delay",
    `${Math.min((pageNumber - 1) * 70, 500)}ms`,
  );

  const preview = document.createElement("div");

  preview.className = "pdf-page-preview";

  const badge = document.createElement("div");

  badge.className = "pdf-page-badge";

  badge.textContent = `PAGE ${String(pageNumber).padStart(2, "0")}`;

  const img = document.createElement("img");

  img.src = imageURL;

  img.alt = `Page ${pageNumber}`;

  img.loading = "lazy";

  const overlay = document.createElement("div");

  overlay.className = "pdf-page-overlay";

  overlay.innerHTML = `<span>Page ${pageNumber}</span>`;

  preview.appendChild(img);

  preview.appendChild(badge);

  preview.appendChild(overlay);

  const info = document.createElement("div");

  info.className = "pdf-page-info";

  const title = document.createElement("div");

  title.className = "pdf-page-title";

  title.innerHTML = `
    <span class="page-check">✓</span>
    <span>Page ${pageNumber}</span>
  `;

  const subtitle = document.createElement("div");

  subtitle.className = "pdf-page-subtitle";

  subtitle.textContent = `PNG • ${pageNumber} of ${totalPages}`;

  info.appendChild(title);

  info.appendChild(subtitle);

  const download = document.createElement("a");

  download.className = "pdf-download";

  download.href = imageURL;

  download.download = `page-${String(pageNumber).padStart(3, "0")}.png`;

  download.innerHTML = `
    <span>↓</span>
    Download PNG
  `;

  pageDiv.appendChild(preview);

  pageDiv.appendChild(info);

  pageDiv.appendChild(download);

  output.appendChild(pageDiv);
}

// ============================================================
// CLEAR PDF → IMAGES
// ============================================================

clearBtn.addEventListener("click", () => {
  pdfFile.value = "";

  selectedPdf = null;

  output.innerHTML = "";

  updateProgress(0, "Ready to convert");

  pdfFileName.textContent = "No PDF selected";

  status.textContent = "Select a PDF to begin.";

  convertBtn.disabled = true;
});

// ============================================================
// IMAGE FILE SELECTION
// ============================================================

imageFiles.addEventListener("change", () => {
  const files = Array.from(imageFiles.files);

  addImagesToSelection(files, "selected");
});

// ============================================================
// ADD IMAGES TO SELECTION
// ============================================================

function addImagesToSelection(files, source = "selected") {
  const validImages = files.filter((file) =>
    SUPPORTED_IMAGE_TYPES.includes(file.type),
  );

  if (validImages.length === 0) {
    imagePdfStatus.textContent = "❌ Please select JPG, PNG, or WebP images.";

    return;
  }

  const newImages = validImages.map((file) => ({
    file: file,

    rotation: 0,

    crop: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
  }));

  selectedImages = [...selectedImages, ...newImages];

  renderImageList();

  imageFileName.textContent = `${selectedImages.length} image(s) selected`;

  if (source === "pasted") {
    imagePdfStatus.textContent = `${validImages.length} pasted image(s) added.`;
  } else if (source === "dropped") {
    imagePdfStatus.textContent = `${validImages.length} image(s) added. Drag to arrange their order.`;
  } else {
    imagePdfStatus.textContent = `${selectedImages.length} image(s) selected.`;
  }
}

// ============================================================
// RENDER IMAGE LIST
// ============================================================

function renderImageList() {
  imageList.innerHTML = "";

  imageCount.textContent = selectedImages.length;

  createPdfBtn.disabled = selectedImages.length === 0;

  if (selectedImages.length === 0) {
    imageList.innerHTML = `
      <div class="empty-images">
        No images selected.
      </div>
    `;

    return;
  }

  selectedImages.forEach((imageData, index) => {
    const file = imageData.file;

    const rotation = imageData.rotation;

    const card = document.createElement("div");

    card.className = "image-card";

    card.draggable = true;

    card.dataset.index = index;

    const img = document.createElement("img");

    const objectURL = URL.createObjectURL(file);

    img.src = objectURL;

    img.alt = file.name;

    img.style.transform = `rotate(${rotation}deg)`;

    img.style.transition = "transform 0.2s ease";

    img.onload = () => {
      URL.revokeObjectURL(objectURL);
    };

    const info = document.createElement("div");

    info.className = "image-info";

    const number = document.createElement("span");

    number.className = "image-number";

    number.textContent = `#${index + 1}`;

    const name = document.createElement("span");

    name.className = "image-name";

    name.title = file.name;

    name.textContent = file.name;

    const rotationLabel = document.createElement("span");

    rotationLabel.className = "rotation-label";

    rotationLabel.textContent = `${rotation}°`;

    // ======================================================
    // CROP BUTTON
    // ======================================================

    const crop = document.createElement("button");

    crop.className = "crop-image";

    crop.type = "button";

    crop.textContent = "Crop";

    crop.title = "Crop image";

    crop.addEventListener("click", (event) => {
      event.preventDefault();

      event.stopPropagation();

      openCropEditor(index);
    });

    // ======================================================
    // ROTATE BUTTON
    // ======================================================

    const rotate = document.createElement("button");

    rotate.className = "rotate-image";

    rotate.type = "button";

    rotate.textContent = "↻";

    rotate.title = "Rotate image 90°";

    rotate.addEventListener("click", (event) => {
      event.preventDefault();

      event.stopPropagation();

      rotateImage(index);
    });

    // ======================================================
    // REMOVE BUTTON
    // ======================================================

    const remove = document.createElement("button");

    remove.className = "remove-image";

    remove.type = "button";

    remove.textContent = "×";

    remove.title = "Remove image";

    remove.addEventListener("click", (event) => {
      event.preventDefault();

      event.stopPropagation();

      removeImage(index);
    });

    info.appendChild(number);

    info.appendChild(name);

    info.appendChild(rotationLabel);

    info.appendChild(crop);

    info.appendChild(rotate);

    info.appendChild(remove);

    card.appendChild(img);

    card.appendChild(info);

    addReorderDragEvents(card);

    imageList.appendChild(card);
  });
}

// ============================================================
// CROP EDITOR
// ============================================================

function openCropEditor(index) {
  if (!selectedImages[index]) {
    return;
  }

  cropEditorIndex = index;

  const imageData = selectedImages[index];

  const file = imageData.file;

  const modal = document.createElement("div");

  modal.className = "crop-modal";

  modal.innerHTML = `
    <div class="crop-dialog">

      <div class="crop-header">

        <div>
          <h2>Crop Image</h2>

          <p>
            Drag the crop area or drag its
            corners and sides to resize it.
          </p>
        </div>

        <button
          type="button"
          class="crop-close"
          aria-label="Close"
        >
          ×
        </button>

      </div>


      <div class="crop-workspace">

  <div class="crop-pdf-controls">
    <div class="crop-pdf-title">Crop for PDF</div>

    <label>
      <input
        type="radio"
        name="crop-mode"
        value="free"
        checked
      />
      Free Crop
    </label>

    <label>
      <input
        type="radio"
        name="crop-mode"
        value="a4"
      />
      A4
    </label>

    <label>
      <input
        type="radio"
        name="crop-mode"
        value="letter"
      />
      Letter
    </label>

    <label>
      <input
        type="radio"
        name="crop-mode"
        value="original"
      />
      Original
    </label>

    <button
      type="button"
      class="secondary crop-fit-button"
    >
      Fit to A4
    </button>
  </div>

  <div class="crop-image-container">

          <img
            class="crop-source-image"
            alt="Crop preview"
          />

          <div class="crop-selection">

            <div
              class="crop-handle crop-nw"
              data-handle="nw"
            ></div>

            <div
              class="crop-handle crop-n"
              data-handle="n"
            ></div>

            <div
              class="crop-handle crop-ne"
              data-handle="ne"
            ></div>

            <div
              class="crop-handle crop-e"
              data-handle="e"
            ></div>

            <div
              class="crop-handle crop-se"
              data-handle="se"
            ></div>

            <div
              class="crop-handle crop-s"
              data-handle="s"
            ></div>

            <div
              class="crop-handle crop-sw"
              data-handle="sw"
            ></div>

            <div
              class="crop-handle crop-w"
              data-handle="w"
            ></div>

          </div>

        </div>

      </div>


      <div class="crop-footer">

        <span class="crop-help">
          Drag corners/sides to resize
        </span>

        <div>

          <button
            type="button"
            class="secondary crop-cancel"
          >
            Cancel
          </button>

          <button
            type="button"
            class="primary crop-apply"
          >
            Apply Crop
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const sourceImage = modal.querySelector(".crop-source-image");

  const selection = modal.querySelector(".crop-selection");
  let cropMode = "free";

  const cropContainer = modal.querySelector(".crop-image-container");

  const cropModeInputs = modal.querySelectorAll('input[name="crop-mode"]');

  const fitToA4Button = modal.querySelector(".crop-fit-button");

  cropModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      cropMode = input.value;

      const fixedRatio = getCropAspectRatio();

      cropContainer.classList.toggle("crop-fixed-ratio", Boolean(fixedRatio));

      if (cropMode === "a4") {
        fitCropToAspectRatio(fixedRatio);
        return;
      }

      if (cropMode === "letter") {
        fitCropToAspectRatio(fixedRatio);
        return;
      }
    });
  });

  fitToA4Button.addEventListener("click", () => {
    cropMode = "a4";

    const a4Radio = modal.querySelector('input[name="crop-mode"][value="a4"]');

    if (a4Radio) {
      a4Radio.checked = true;
    }

    cropContainer.classList.add("crop-fixed-ratio");

    fitCropToAspectRatio(getCropAspectRatio());
  });

  function fitCropToAspectRatio(aspectRatio) {
    if (!aspectRatio) {
      return;
    }

    const rect = cropContainer.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    let width;
    let height;

    // Start with a crop that fits inside the image.
    if (rect.width / rect.height > aspectRatio) {
      height = rect.height * 0.9;
      width = height * aspectRatio;
    } else {
      width = rect.width * 0.9;
      height = width / aspectRatio;
    }

    // Safety check.
    width = Math.min(width, rect.width);
    height = Math.min(height, rect.height);

    const left = (rect.width - width) / 2;
    const top = (rect.height - height) / 2;

    selection.style.left = `${left}px`;
    selection.style.top = `${top}px`;
    selection.style.width = `${width}px`;
    selection.style.height = `${height}px`;
  }

  function getCropAspectRatio() {
    if (cropMode === "a4") {
      return orientation.value === "landscape" ? 297 / 210 : A4_RATIO;
    }

    if (cropMode === "letter") {
      return orientation.value === "landscape" ? 279.4 / 215.9 : LETTER_RATIO;
    }

    return null;
  }

  const objectURL = URL.createObjectURL(file);

  sourceImage.src = objectURL;

  sourceImage.onload = () => {
    const crop = imageData.crop || {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };

    selection.style.left = `${crop.x * 100}%`;
    selection.style.top = `${crop.y * 100}%`;
    selection.style.width = `${crop.width * 100}%`;
    selection.style.height = `${crop.height * 100}%`;
  };

  // ==========================================================
  // CLOSE
  // ==========================================================

  function closeModal() {
    URL.revokeObjectURL(objectURL);

    modal.remove();

    cropEditorIndex = null;
  }

  modal.querySelector(".crop-close").addEventListener("click", closeModal);

  modal.querySelector(".crop-cancel").addEventListener("click", closeModal);

  // ==========================================================
  // APPLY
  // ==========================================================

  modal.querySelector(".crop-apply").addEventListener("click", () => {
    const container = modal.querySelector(".crop-image-container");

    const containerRect = container.getBoundingClientRect();

    const selectionRect = selection.getBoundingClientRect();

    imageData.crop = {
      x: (selectionRect.left - containerRect.left) / containerRect.width,

      y: (selectionRect.top - containerRect.top) / containerRect.height,

      width: selectionRect.width / containerRect.width,

      height: selectionRect.height / containerRect.height,
    };

    imagePdfStatus.textContent = `Crop applied to image ${index + 1}.`;

    closeModal();
  });

  // ==========================================================
  // DRAG / RESIZE
  // ==========================================================

  let operation = null;

  let startX = 0;
  let startY = 0;

  let startLeft = 0;
  let startTop = 0;

  let startWidth = 0;
  let startHeight = 0;

  const container = modal.querySelector(".crop-image-container");

  selection.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    const handle = event.target.closest(".crop-handle");

    if (handle) {
      operation = handle.dataset.handle;
    } else {
      operation = "move";
    }

    const containerRect = container.getBoundingClientRect();

    const selectionRect = selection.getBoundingClientRect();

    startX = event.clientX;

    startY = event.clientY;

    startLeft = selectionRect.left - containerRect.left;

    startTop = selectionRect.top - containerRect.top;

    startWidth = selectionRect.width;

    startHeight = selectionRect.height;

    selection.setPointerCapture(event.pointerId);
  });

  selection.addEventListener("pointermove", (event) => {
    if (!operation) {
      return;
    }

    const rect = container.getBoundingClientRect();

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    // ======================================================
    // MOVE — DO NOT TOUCH WIDTH OR HEIGHT
    // ======================================================

    if (operation === "move") {
      let left = startLeft + dx;
      let top = startTop + dy;

      // Keep inside container
      left = Math.max(0, Math.min(left, rect.width - startWidth));

      top = Math.max(0, Math.min(top, rect.height - startHeight));

      // ONLY position changes here.
      selection.style.left = `${left}px`;
      selection.style.top = `${top}px`;

      return;
    }

    // ======================================================
    // RESIZING STARTS HERE
    // ======================================================

    let left = startLeft;
    let top = startTop;
    let width = startWidth;
    let height = startHeight;

    const minSize = 30;

    const isShiftPressed = event.shiftKey;
    const isCorner =
      operation === "nw" ||
      operation === "ne" ||
      operation === "sw" ||
      operation === "se";

    // ======================================================
    // WEST
    // ======================================================

    if (operation.includes("w")) {
      const newLeft = Math.max(
        0,
        Math.min(startLeft + dx, startLeft + startWidth - minSize),
      );

      width = startWidth + (startLeft - newLeft);
      left = newLeft;
    }

    // ======================================================
    // EAST
    // ======================================================

    if (operation.includes("e")) {
      width = Math.max(
        minSize,
        Math.min(startWidth + dx, rect.width - startLeft),
      );
    }

    // ======================================================
    // NORTH
    // ======================================================

    if (operation.includes("n")) {
      const newTop = Math.max(
        0,
        Math.min(startTop + dy, startTop + startHeight - minSize),
      );

      height = startHeight + (startTop - newTop);
      top = newTop;
    }

    // ======================================================
    // SOUTH
    // ======================================================

    if (operation.includes("s")) {
      height = Math.max(
        minSize,
        Math.min(startHeight + dy, rect.height - startTop),
      );
    }

    // ======================================================
    // A4 / LETTER LOCK + SHIFT CENTER RESIZE
    // ======================================================

    const fixedAspectRatio = getCropAspectRatio();

    if (fixedAspectRatio && isCorner) {
      // ====================================================
      // SHIFT + CORNER
      // Resize symmetrically from the center while keeping
      // the A4 / Letter aspect ratio.
      // ====================================================

      if (isShiftPressed) {
        const centerX = startLeft + startWidth / 2;
        const centerY = startTop + startHeight / 2;

        // Determine the size requested by the pointer.
        let newWidth;

        if (operation.includes("w")) {
          newWidth = startWidth - dx * 2;
        } else {
          newWidth = startWidth + dx * 2;
        }

        let newHeight;

        if (operation.includes("n")) {
          newHeight = startHeight - dy * 2;
        } else {
          newHeight = startHeight + dy * 2;
        }

        // Choose whichever movement produces the larger
        // proportional resize.
        if (
          Math.abs(newWidth - startWidth) >= Math.abs(newHeight - startHeight)
        ) {
          width = Math.max(minSize, newWidth);
          height = width / fixedAspectRatio;
        } else {
          height = Math.max(minSize, newHeight);
          width = height * fixedAspectRatio;
        }

        // Re-center the crop.
        left = centerX - width / 2;
        top = centerY - height / 2;

        // ==================================================
        // Keep centered crop inside the container.
        // ==================================================

        if (width > rect.width) {
          width = rect.width;
          height = width / fixedAspectRatio;
        }

        if (height > rect.height) {
          height = rect.height;
          width = height * fixedAspectRatio;
        }

        left = centerX - width / 2;
        top = centerY - height / 2;

        // If it exceeds the left/right boundaries,
        // shift the whole crop back inside.
        if (left < 0) {
          left = 0;
        }

        if (left + width > rect.width) {
          left = rect.width - width;
        }

        if (top < 0) {
          top = 0;
        }

        if (top + height > rect.height) {
          top = rect.height - height;
        }
      } else {
        // ==================================================
        // NORMAL A4 / LETTER CORNER RESIZE
        // ==================================================

        const originalRight = startLeft + startWidth;
        const originalBottom = startTop + startHeight;

        if (
          operation === "nw" ||
          operation === "ne" ||
          operation === "sw" ||
          operation === "se"
        ) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            height = width / fixedAspectRatio;
          } else {
            width = height * fixedAspectRatio;
          }

          if (operation.includes("w")) {
            left = originalRight - width;
          }

          if (operation.includes("n")) {
            top = originalBottom - height;
          }
        }

        if (operation === "e" || operation === "w") {
          height = width / fixedAspectRatio;

          if (operation === "w") {
            left = originalRight - width;
          }
        }

        if (operation === "n" || operation === "s") {
          width = height * fixedAspectRatio;

          if (operation === "n") {
            top = originalBottom - height;
          }
        }

        // Keep inside container
        if (left < 0) {
          left = 0;
          width = originalRight;
          height = width / fixedAspectRatio;
        }

        if (top < 0) {
          top = 0;
          height = originalBottom;
          width = height * fixedAspectRatio;
        }

        if (left + width > rect.width) {
          width = rect.width - left;
          height = width / fixedAspectRatio;
        }

        if (top + height > rect.height) {
          height = rect.height - top;
          width = height * fixedAspectRatio;
        }
      }
    } else if (isShiftPressed && isCorner) {
      // ====================================================
      // SHIFT + CORNER — FREE CROP
      // Resize from the center without aspect-ratio lock.
      // ====================================================

      const centerX = startLeft + startWidth / 2;
      const centerY = startTop + startHeight / 2;

      let newWidth = startWidth + (operation.includes("w") ? -dx * 2 : dx * 2);

      let newHeight =
        startHeight + (operation.includes("n") ? -dy * 2 : dy * 2);

      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);

      // Don't allow the crop to exceed the available
      // space around its center.
      newWidth = Math.min(
        newWidth,
        2 * Math.min(centerX, rect.width - centerX),
      );

      newHeight = Math.min(
        newHeight,
        2 * Math.min(centerY, rect.height - centerY),
      );

      width = newWidth;
      height = newHeight;

      left = centerX - width / 2;
      top = centerY - height / 2;
    }

    // ======================================================
    // APPLY RESIZE
    // ======================================================

    selection.style.left = `${left}px`;
    selection.style.top = `${top}px`;
    selection.style.width = `${width}px`;
    selection.style.height = `${height}px`;
  });

  selection.addEventListener("pointerup", () => {
    operation = null;
  });

  selection.addEventListener("pointercancel", () => {
    operation = null;
  });
}

// ============================================================
// ROTATE IMAGE
// ============================================================

function rotateImage(index) {
  if (!selectedImages[index]) {
    return;
  }

  selectedImages[index].rotation += 90;

  if (selectedImages[index].rotation >= 360) {
    selectedImages[index].rotation = 0;
  }

  const rotation = selectedImages[index].rotation;

  renderImageList();

  imagePdfStatus.textContent = `Image ${index + 1} rotated to ${rotation}°.`;
}

// ============================================================
// REMOVE IMAGE
// ============================================================

function removeImage(index) {
  selectedImages.splice(index, 1);

  renderImageList();

  imageFileName.textContent = selectedImages.length
    ? `${selectedImages.length} image(s) selected`
    : "No images selected";

  imagePdfStatus.textContent = selectedImages.length
    ? "Drag images to arrange their order."
    : "Select images to begin.";
}

// ============================================================
// REORDER IMAGES
// ============================================================

function addReorderDragEvents(card) {
  card.addEventListener("dragstart", () => {
    draggedIndex = Number(card.dataset.index);

    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");

    draggedIndex = null;
  });

  card.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  card.addEventListener("drop", (event) => {
    event.preventDefault();

    event.stopPropagation();

    const targetIndex = Number(card.dataset.index);

    if (draggedIndex === null || draggedIndex === targetIndex) {
      return;
    }

    const movedImage = selectedImages.splice(draggedIndex, 1)[0];

    selectedImages.splice(targetIndex, 0, movedImage);

    renderImageList();

    imagePdfStatus.textContent = "Images reordered successfully.";
  });
}

// ============================================================
// IMAGE UPLOAD DRAG & DROP
// ============================================================

if (imageDropZone) {
  ["dragenter", "dragover"].forEach((eventName) => {
    imageDropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      event.stopPropagation();

      imageDropZone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    imageDropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      event.stopPropagation();

      imageDropZone.classList.remove("drag-over");
    });
  });

  imageDropZone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer.files);

    addImagesToSelection(files, "dropped");
  });
}

// ============================================================
// CLIPBOARD IMAGE PASTE
// ============================================================

document.addEventListener("paste", handleClipboardPaste);

function handleClipboardPaste(event) {
  if (imagesToPdfSection.classList.contains("hidden")) {
    return;
  }

  if (!event.clipboardData) {
    return;
  }

  const items = Array.from(event.clipboardData.items);

  const pastedImages = [];

  for (const item of items) {
    if (item.kind !== "file") {
      continue;
    }

    if (!item.type.startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile();

    if (!file) {
      continue;
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      continue;
    }

    const extension = getExtensionFromMimeType(file.type);

    const filename = `pasted-image-${Date.now()}-${pastedImages.length + 1}.${extension}`;

    const renamedFile = new File([file], filename, {
      type: file.type,
      lastModified: Date.now(),
    });

    pastedImages.push(renamedFile);
  }

  if (pastedImages.length === 0) {
    return;
  }

  event.preventDefault();

  addImagesToSelection(pastedImages, "pasted");
}

// ============================================================
// MIME TYPE → EXTENSION
// ============================================================

function getExtensionFromMimeType(mimeType) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "png";
  }
}

// ============================================================
// CREATE PDF
// ============================================================

createPdfBtn.addEventListener("click", createPdfFromImages);

async function createPdfFromImages() {
  if (selectedImages.length === 0) {
    return;
  }

  createPdfBtn.disabled = true;

  clearGeneratedResult();

  const totalImages = selectedImages.length;

  updateImagePdfProgress(0, "Preparing PDF...", "Preparing your images...");

  try {
    imagePdfStatus.textContent = "Preparing PDF...";

    const { jsPDF } = window.jspdf;

    if (!jsPDF) {
      throw new Error("jsPDF is not loaded.");
    }

    let pdf = null;

    for (let i = 0; i < totalImages; i++) {
      const imageData = selectedImages[i];

      const file = imageData.file;

      const rotation = imageData.rotation || 0;

      // Progress before processing current image
      const percentBefore = (i / totalImages) * 100;

      updateImagePdfProgress(
        percentBefore,
        `Processing image ${i + 1} of ${totalImages}`,
        `Loading image ${i + 1} of ${totalImages}...`,
      );

      imagePdfStatus.innerHTML = `
        <span class="rendering-status">
          <span class="rendering-dot"></span>
          Processing image ${i + 1} of ${totalImages}...
        </span>
      `;

      const image = await loadImage(file);

      image.rotation = rotation;

      image.crop = imageData.crop || {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      };

      const dimensions = calculatePageDimensions(image);

      if (i === 0) {
        pdf = new jsPDF({
          orientation: dimensions.orientation,
          unit: "mm",
          format: dimensions.format,
        });
      } else {
        pdf.addPage(dimensions.format, dimensions.orientation);
      }

      await addImageToPage(pdf, image, dimensions);

      // Progress after processing current image
      const percentAfter = ((i + 1) / totalImages) * 100;

      updateImagePdfProgress(
        percentAfter,
        i === totalImages - 1
          ? "Generating PDF..."
          : `Processed ${i + 1} of ${totalImages} images`,
        i === totalImages - 1
          ? "Finalizing your PDF..."
          : `Added image ${i + 1} of ${totalImages} to the PDF.`,
      );

      await sleep(30);
    }

    updateImagePdfProgress(
      95,
      "Generating PDF...",
      "Creating the final PDF...",
    );

    imagePdfStatus.textContent = "Generating PDF preview...";

    const bytes = pdf.output("arraybuffer");

    generatedPdfBytes = new Uint8Array(bytes);

    updateImagePdfProgress(
      100,
      "Conversion complete",
      "PDF created successfully.",
    );

    imagePdfStatus.innerHTML = `
      <span class="success-status">
        <span class="success-icon">✓</span>
        PDF created successfully from ${totalImages}
        image${totalImages === 1 ? "" : "s"}
      </span>
    `;

    createPreview(generatedPdfBytes);
  } catch (error) {
    console.error(error);

    updateImagePdfProgress(0, "Conversion failed", "Unable to create the PDF.");

    imagePdfStatus.innerHTML = `
      <span class="error-status">
        ❌ Error creating PDF: ${error.message}
      </span>
    `;
  } finally {
    createPdfBtn.disabled = false;
  }
}

// ============================================================
// PAGE DIMENSIONS
// ============================================================

function calculatePageDimensions(image) {
  const selectedPageSize = pageSize.value;

  const selectedOrientation = orientation.value;

  const rotation = image.rotation || 0;

  const isRotated90 = rotation === 90 || rotation === 270;

  const effectiveWidth = isRotated90 ? image.naturalHeight : image.naturalWidth;

  const effectiveHeight = isRotated90
    ? image.naturalWidth
    : image.naturalHeight;

  // ==========================================================
  // ORIGINAL
  // ==========================================================

  if (selectedPageSize === "original") {
    const mmPerPixel = 25.4 / 96;

    const width = effectiveWidth * mmPerPixel;

    const height = effectiveHeight * mmPerPixel;

    let finalOrientation;

    if (selectedOrientation === "auto") {
      finalOrientation = width > height ? "landscape" : "portrait";
    } else {
      finalOrientation = selectedOrientation;
    }

    return {
      format: [width, height],

      orientation: finalOrientation,

      pageWidth:
        finalOrientation === "landscape"
          ? Math.max(width, height)
          : Math.min(width, height),

      pageHeight:
        finalOrientation === "landscape"
          ? Math.min(width, height)
          : Math.max(width, height),
    };
  }

  // ==========================================================
  // A4
  // ==========================================================

  if (selectedPageSize === "a4") {
    let width = 210;

    let height = 297;

    let finalOrientation;

    if (selectedOrientation === "auto") {
      finalOrientation =
        effectiveWidth > effectiveHeight ? "landscape" : "portrait";
    } else {
      finalOrientation = selectedOrientation;
    }

    if (finalOrientation === "landscape") {
      [width, height] = [height, width];
    }

    return {
      format: "a4",

      orientation: finalOrientation,

      pageWidth: width,

      pageHeight: height,
    };
  }

  // ==========================================================
  // LETTER
  // ==========================================================

  if (selectedPageSize === "letter") {
    let width = 215.9;

    let height = 279.4;

    let finalOrientation;

    if (selectedOrientation === "auto") {
      finalOrientation =
        effectiveWidth > effectiveHeight ? "landscape" : "portrait";
    } else {
      finalOrientation = selectedOrientation;
    }

    if (finalOrientation === "landscape") {
      [width, height] = [height, width];
    }

    return {
      format: "letter",

      orientation: finalOrientation,

      pageWidth: width,

      pageHeight: height,
    };
  }

  return {
    format: "a4",

    orientation: "portrait",

    pageWidth: 210,

    pageHeight: 297,
  };
}

// ============================================================
// ADD IMAGE TO PDF PAGE
// ============================================================

async function addImageToPage(pdf, image, dimensions) {
  const marginValue = parseFloat(margin.value) || 0;

  const pageWidth = dimensions.pageWidth;

  const pageHeight = dimensions.pageHeight;

  const availableWidth = pageWidth - marginValue * 2;

  const availableHeight = pageHeight - marginValue * 2;

  const rotation = image.rotation || 0;

  // ==========================================================
  // APPLY CROP + ROTATION
  // ==========================================================

  const processedImage = await createProcessedImage(image, rotation);

  const imageWidth = processedImage.width;

  const imageHeight = processedImage.height;

  const imageRatio = imageWidth / imageHeight;

  const pageRatio = availableWidth / availableHeight;

  let width;

  let height;

  if (imageRatio > pageRatio) {
    width = availableWidth;

    height = width / imageRatio;
  } else {
    height = availableHeight;

    width = height * imageRatio;
  }

  const x = (pageWidth - width) / 2;

  const y = (pageHeight - height) / 2;

  pdf.addImage(
    processedImage.dataURL,
    "PNG",
    x,
    y,
    width,
    height,
    undefined,
    "FAST",
  );
}

// ============================================================
// CREATE PROCESSED IMAGE
// ============================================================

function createProcessedImage(image, rotation) {
  return new Promise((resolve, reject) => {
    const sourceImage = new Image();

    sourceImage.onload = () => {
      try {
        const crop = image.crop || {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        };

        // ==================================================
        // CROP COORDINATES
        // ==================================================

        const sx = Math.round(crop.x * sourceImage.naturalWidth);

        const sy = Math.round(crop.y * sourceImage.naturalHeight);

        const sw = Math.round(crop.width * sourceImage.naturalWidth);

        const sh = Math.round(crop.height * sourceImage.naturalHeight);

        const isSideways = rotation === 90 || rotation === 270;

        const canvas = document.createElement("canvas");

        if (isSideways) {
          canvas.width = sh;

          canvas.height = sw;
        } else {
          canvas.width = sw;

          canvas.height = sh;
        }

        const context = canvas.getContext("2d");

        context.translate(canvas.width / 2, canvas.height / 2);

        context.rotate((rotation * Math.PI) / 180);

        context.drawImage(
          sourceImage,

          sx,
          sy,
          sw,
          sh,

          -sw / 2,
          -sh / 2,
          sw,
          sh,
        );

        const dataURL = canvas.toDataURL("image/png");

        resolve({
          dataURL,

          width: canvas.width,

          height: canvas.height,
        });
      } catch (error) {
        reject(error);
      }
    };

    sourceImage.onerror = () => {
      reject(new Error("Unable to process image."));
    };

    sourceImage.src = image.dataURL;
  });
}

// ============================================================
// LOAD IMAGE
// ============================================================

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        resolve({
          dataURL: reader.result,

          naturalWidth: image.naturalWidth,

          naturalHeight: image.naturalHeight,

          fileType: file.type,
        });
      };

      image.onerror = () => {
        reject(new Error("Unable to load image."));
      };

      image.src = reader.result;
    };

    reader.onerror = () => {
      reject(new Error("Unable to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

// ============================================================
// PREVIEW
// ============================================================

function createPreview(bytes) {
  if (generatedPdfUrl) {
    URL.revokeObjectURL(generatedPdfUrl);
  }

  const blob = new Blob([bytes], {
    type: "application/pdf",
  });

  generatedPdfUrl = URL.createObjectURL(blob);

  pdfViewer.innerHTML = "";

  const iframe = document.createElement("iframe");

  iframe.className = "generated-pdf";

  iframe.src = generatedPdfUrl;

  iframe.title = "Generated PDF preview";

  pdfViewer.appendChild(iframe);

  resultDescription.textContent =
    `${selectedImages.length} image${
      selectedImages.length === 1 ? "" : "s"
    } converted to PDF. ` + `Check the arrangement before downloading.`;

  pdfResultSection.classList.remove("hidden");

  pdfResultSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ============================================================
// DOWNLOAD
// ============================================================

downloadPdfButton.addEventListener("click", () => {
  if (!generatedPdfBytes) {
    return;
  }

  const originalName = selectedImages[0]?.file?.name || "images-to-pdf.pdf";

  const dot = originalName.lastIndexOf(".");

  const base = dot > 0 ? originalName.substring(0, dot) : originalName;

  const filename = `${base}-converted.pdf`;

  const blob = new Blob([generatedPdfBytes], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
});

// ============================================================
// MAKE CHANGES
// ============================================================

editPdfButton.addEventListener("click", () => {
  pdfResultSection.classList.add("hidden");

  imagesToPdfSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

// ============================================================
// CLEAR GENERATED RESULT
// ============================================================

function clearGeneratedResult() {
  generatedPdfBytes = null;

  if (generatedPdfUrl) {
    URL.revokeObjectURL(generatedPdfUrl);

    generatedPdfUrl = null;
  }

  if (pdfViewer) {
    pdfViewer.innerHTML = "";
  }

  if (pdfResultSection) {
    pdfResultSection.classList.add("hidden");
  }
}

// ============================================================
// CLEAR IMAGES
// ============================================================

clearImagesBtn.addEventListener("click", () => {
  imageFiles.value = "";

  selectedImages = [];

  draggedIndex = null;

  renderImageList();

  imageFileName.textContent = "No images selected";

  imagePdfStatus.textContent = "Select images to begin.";

  createPdfBtn.disabled = true;

  clearGeneratedResult();
});

// ============================================================
// HELPER
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function updateProgress(percent, label = "") {
  const safePercent = Math.max(0, Math.min(100, percent));

  progressBar.style.width = `${safePercent}%`;

  progressPercent.textContent = `${Math.round(safePercent)}%`;

  if (label) {
    progressLabel.textContent = label;
  }
}

function updateImagePdfProgress(percent, label = "", message = "") {
  const safePercent = Math.max(0, Math.min(100, percent));

  imageProgressBar.style.width = `${safePercent}%`;
  imageProgressPercent.textContent = `${Math.round(safePercent)}%`;

  if (label) {
    imageProgressLabel.textContent = label;
  }

  if (message) {
    imageProgressStatus.textContent = message;
  }
}
