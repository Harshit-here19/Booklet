import * as pdfjsLib from "./lib/pdf.min.mjs";

// ============================================================
// PDF.JS WORKER
// ============================================================

pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdf.worker.min.mjs";

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

const progress = document.getElementById("progress");

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

const pageSize = document.getElementById("pageSize");

const orientation = document.getElementById("orientation");

const margin = document.getElementById("margin");

// ============================================================
// PDF DRAG & DROP
// ============================================================

const pdfDropZone = document.getElementById("pdfDropZone");

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
// IMAGE DROP ZONE
// ============================================================

const imageDropZone = document.getElementById("imageDropZone");

// ============================================================
// STATE
// ============================================================

let selectedPdf = null;

let selectedImages = [];

let draggedIndex = null;

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

  progress.value = 0;

  try {
    status.textContent = "Reading PDF...";

    const arrayBuffer = await selectedPdf.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    const totalPages = pdf.numPages;

    const scale = parseFloat(scaleSelect.value);

    status.textContent = `Converting ${totalPages} pages...`;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      status.textContent = `Converting page ${pageNumber} of ${totalPages}...`;

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

      createPdfImageCard(pageNumber, imageURL);

      progress.value = (pageNumber / totalPages) * 100;

      await sleep(10);
    }

    status.textContent = `✅ Finished! ${totalPages} pages converted to PNG images.`;
  } catch (error) {
    console.error(error);

    status.textContent = "❌ Error converting PDF: " + error.message;
  } finally {
    convertBtn.disabled = false;
  }
}

// ============================================================
// CREATE PDF IMAGE OUTPUT CARD
// ============================================================

function createPdfImageCard(pageNumber, imageURL) {
  const pageDiv = document.createElement("div");

  pageDiv.className = "page";

  const title = document.createElement("div");

  title.className = "page-title";

  title.textContent = `Page ${pageNumber}`;

  const img = document.createElement("img");

  img.src = imageURL;

  img.alt = `Page ${pageNumber}`;

  const download = document.createElement("a");

  download.className = "download";

  download.href = imageURL;

  download.download = `page-${String(pageNumber).padStart(3, "0")}.png`;

  download.textContent = "Download PNG";

  pageDiv.appendChild(title);

  pageDiv.appendChild(img);

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

  progress.value = 0;

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

    // ======================================================
    // CARD
    // ======================================================

    const card = document.createElement("div");

    card.className = "image-card";

    card.draggable = true;

    card.dataset.index = index;

    // ======================================================
    // IMAGE
    // ======================================================

    const img = document.createElement("img");

    const objectURL = URL.createObjectURL(file);

    img.src = objectURL;

    img.alt = file.name;

    img.style.transform = `rotate(${rotation}deg)`;

    img.style.transition = "transform 0.2s ease";

    img.onload = () => {
      URL.revokeObjectURL(objectURL);
    };

    // ======================================================
    // INFO BAR
    // ======================================================

    const info = document.createElement("div");

    info.className = "image-info";

    // ======================================================
    // NUMBER
    // ======================================================

    const number = document.createElement("span");

    number.className = "image-number";

    number.textContent = `#${index + 1}`;

    // ======================================================
    // FILE NAME
    // ======================================================

    const name = document.createElement("span");

    name.className = "image-name";

    name.title = file.name;

    name.textContent = file.name;

    // ======================================================
    // ROTATION LABEL
    // ======================================================

    const rotationLabel = document.createElement("span");

    rotationLabel.className = "rotation-label";

    rotationLabel.textContent = `${rotation}°`;

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

    // ======================================================
    // BUILD INFO BAR
    // ======================================================

    info.appendChild(number);

    info.appendChild(name);

    info.appendChild(rotationLabel);

    info.appendChild(rotate);

    info.appendChild(remove);

    card.appendChild(img);

    card.appendChild(info);

    addReorderDragEvents(card);

    imageList.appendChild(card);
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

  renderImageList();

  const rotation = selectedImages[index].rotation;

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
  // Only process clipboard images
  // while Images → PDF is active.

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
// CREATE PDF FROM IMAGES
// ============================================================

createPdfBtn.addEventListener("click", createPdfFromImages);

async function createPdfFromImages() {
  if (selectedImages.length === 0) {
    return;
  }

  createPdfBtn.disabled = true;

  try {
    imagePdfStatus.textContent = "Preparing PDF...";

    const { jsPDF } = window.jspdf;

    if (!jsPDF) {
      throw new Error("jsPDF is not loaded.");
    }

    let pdf = null;

    for (let i = 0; i < selectedImages.length; i++) {
      const imageData = selectedImages[i];

      const file = imageData.file;

      const rotation = imageData.rotation;

      imagePdfStatus.textContent = `Adding image ${i + 1} of ${selectedImages.length}...`;

      // Load original image

      const image = await loadImage(file);

      // Store rotation

      image.rotation = rotation;

      // Calculate page dimensions

      const dimensions = calculatePageDimensions(image);

      // Create PDF

      if (i === 0) {
        pdf = new jsPDF({
          orientation: dimensions.orientation,

          unit: "mm",

          format: dimensions.format,
        });
      } else {
        pdf.addPage(dimensions.format, dimensions.orientation);
      }

      // Add image

      await addImageToPage(pdf, image, dimensions);

      await sleep(10);
    }

    imagePdfStatus.textContent = "Creating download...";

    pdf.save("images-to-pdf.pdf");

    imagePdfStatus.textContent = `✅ PDF created successfully from ${selectedImages.length} image(s).`;
  } catch (error) {
    console.error(error);

    imagePdfStatus.textContent = "❌ Error creating PDF: " + error.message;
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

  // A 90° or 270° rotation swaps
  // the effective width and height.

  const isRotated90 = rotation === 90 || rotation === 270;

  const effectiveWidth = isRotated90 ? image.naturalHeight : image.naturalWidth;

  const effectiveHeight = isRotated90
    ? image.naturalWidth
    : image.naturalHeight;

  // ==========================================================
  // ORIGINAL SIZE
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

      pageWidth: width,

      pageHeight: height,
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

  // Fallback

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
  // CREATE ROTATED IMAGE
  // ==========================================================

  const rotatedImage = await createRotatedImage(image, rotation);

  // ==========================================================
  // EFFECTIVE DIMENSIONS
  // ==========================================================

  const imageWidth = rotatedImage.width;

  const imageHeight = rotatedImage.height;

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

  // ==========================================================
  // CENTER IMAGE
  // ==========================================================

  const x = (pageWidth - width) / 2;

  const y = (pageHeight - height) / 2;

  // ==========================================================
  // ADD TO PDF
  // ==========================================================

  pdf.addImage(
    rotatedImage.dataURL,

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
// CREATE ROTATED IMAGE
// ============================================================

function createRotatedImage(image, rotation) {
  return new Promise((resolve, reject) => {
    // ------------------------------------------------------
    // No rotation
    // ------------------------------------------------------

    if (rotation === 0) {
      resolve({
        dataURL: image.dataURL,

        width: image.naturalWidth,

        height: image.naturalHeight,
      });

      return;
    }

    const sourceImage = new Image();

    sourceImage.onload = () => {
      try {
        const canvas = document.createElement("canvas");

        const context = canvas.getContext("2d");

        const isSideways = rotation === 90 || rotation === 270;

        // ------------------------------------------------
        // Swap canvas dimensions for 90/270 degrees
        // ------------------------------------------------

        if (isSideways) {
          canvas.width = sourceImage.naturalHeight;

          canvas.height = sourceImage.naturalWidth;
        } else {
          canvas.width = sourceImage.naturalWidth;

          canvas.height = sourceImage.naturalHeight;
        }

        // ------------------------------------------------
        // Move origin to center
        // ------------------------------------------------

        context.translate(canvas.width / 2, canvas.height / 2);

        // ------------------------------------------------
        // Rotate
        // ------------------------------------------------

        context.rotate((rotation * Math.PI) / 180);

        // ------------------------------------------------
        // Draw image centered
        // ------------------------------------------------

        context.drawImage(
          sourceImage,

          -sourceImage.naturalWidth / 2,

          -sourceImage.naturalHeight / 2,

          sourceImage.naturalWidth,

          sourceImage.naturalHeight,
        );

        // ------------------------------------------------
        // Convert to PNG
        // ------------------------------------------------

        const dataURL = canvas.toDataURL("image/png");

        resolve({
          dataURL: dataURL,

          width: canvas.width,

          height: canvas.height,
        });
      } catch (error) {
        reject(error);
      }
    };

    sourceImage.onerror = () => {
      reject(new Error("Unable to rotate image."));
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
// jsPDF IMAGE FORMAT
// ============================================================

function getJsPdfImageFormat(mimeType) {
  switch (mimeType) {
    case "image/png":
      return "PNG";

    case "image/webp":
      return "WEBP";

    case "image/jpeg":
    case "image/jpg":
    default:
      return "JPEG";
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
});

// ============================================================
// HELPER
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
