import * as pdfjsLib from "./lib/pdf.min.mjs";

import { PDFDocument, rgb } from "./lib/pdf-lib.esm.js";

// ============================================================
// PDF.JS WORKER
// ============================================================

pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdf.worker.min.mjs";

// ============================================================
// 16-PAGE LAYOUT
// ============================================================

const LAYOUT_16_FRONT = [16, 1, 10, 7, 6, 11, 14, 3];

const LAYOUT_16_BACK = [8, 9, 2, 15, 4, 13, 12, 5];

// ============================================================
// 32-PAGE LAYOUT
//
// SHEET 1
//
// FRONT
// 32   1   30   3
// 28   5   26   7
//
// BACK
// 20  13   24   9
// 18  15   22  11
//
// SHEET 2
//
// FRONT
//  4  29    2  31
//  8  25    6  27
//
// BACK
// 10  23   14  19
// 12  21   16  17
// ============================================================

const LAYOUT_32_SHEET_1 = {
  front: [32, 1, 30, 3, 28, 5, 26, 7],

  back: [20, 13, 24, 9, 18, 15, 22, 11],

  columns: 4,
  rows: 2,
};

const LAYOUT_32_SHEET_2 = {
  front: [4, 29, 2, 31, 8, 25, 6, 27],

  back: [10, 23, 14, 19, 12, 21, 16, 17],

  columns: 4,
  rows: 2,
};

// ============================================================
// 32-PAGE · ONE A4 SHEET
//
// FRONT
//
// 30   3   32   1
// 26   7   28   5
// 22  11   24   9
// 18  15   20  13
//
// BACK
//
//  2  31    4  29
//  6  27    8  25
// 10  23   12  21
// 14  19   16  17
// ============================================================

const LAYOUT_32_ONE_SHEET = {
  front: [30, 3, 32, 1, 26, 7, 28, 5, 22, 11, 24, 9, 18, 15, 20, 13],

  back: [2, 31, 4, 29, 6, 27, 8, 25, 10, 23, 12, 21, 14, 19, 16, 17],

  columns: 4,
  rows: 4,
};

// ============================================================
// A4 LANDSCAPE
// ============================================================

const MM_TO_PT = 72 / 25.4;

const A4_WIDTH = 297 * MM_TO_PT;

const A4_HEIGHT = 210 * MM_TO_PT;

// ============================================================
// SETTINGS
// ============================================================

const CONTENT_GAP = 1.0 * MM_TO_PT;

const BORDER_WIDTH = 0.6;

// ============================================================
// FOLD GUTTER
// ============================================================

const FOLD_GUTTER = 2.0 * MM_TO_PT;

// ============================================================
// DOM
// ============================================================

const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const fileName = document.getElementById("fileName");
const pageCountSelect = document.getElementById("pageCount");
const pageCountHelp = document.getElementById("pageCountHelp");
const outputSheets = document.getElementById("outputSheets");
const generateButton = document.getElementById("generateButton");
const downloadButton = document.getElementById("downloadButton");
const status = document.getElementById("status");
const statusText = document.getElementById("statusText");
const errorBox = document.getElementById("error");
const resultSection = document.getElementById("resultSection");
const resultDescription = document.getElementById("resultDescription");
const pdfViewer = document.getElementById("pdfViewer");
const thirtyTwoMode = document.getElementById("32PageMode");
const mode32Radios = document.querySelectorAll('input[name="32Mode"]');

// ============================================================
// STATE
// ============================================================

let selectedFile = null;
let sourcePdfBytes = null;
let generatedPdfBytes = null;
let generatedPdfUrl = null;
let uploadedPageCount = 0;
let selected32Mode = "two";

mode32Radios.forEach((radio) => {
  radio.addEventListener("change", () => {
    selected32Mode = radio.value;

    updatePageCountInfo();

    clearGeneratedResult();
  });
});

const SUPPORTED_BOOKLET_SIZES = [4, 8, 16, 32];

function getAutoBookletSize(pageCount) {
  return SUPPORTED_BOOKLET_SIZES.find((size) => size >= pageCount) || null;
}

// ============================================================
// INITIAL UI
// ============================================================

updatePageCountInfo();

// ============================================================
// PAGE COUNT CHANGE
// ============================================================

pageCountSelect.addEventListener("change", () => {
  updatePageCountInfo();

  clearGeneratedResult();

  validateCurrentFile();
});

// ============================================================
// FILE INPUT
// ============================================================

pdfInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  await selectPdf(file);
});

// ============================================================
// DRAG & DROP
// ============================================================

uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault();

  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", async (event) => {
  event.preventDefault();

  uploadArea.classList.remove("dragover");

  const file = event.dataTransfer.files?.[0];

  if (!file) {
    return;
  }

  await selectPdf(file);
});

// ============================================================
// SELECT PDF
// ============================================================

async function selectPdf(file) {
  clearError();
  clearGeneratedResult();

  selectedFile = null;
  sourcePdfBytes = null;

  generateButton.disabled = true;

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    fileName.textContent = "Invalid file";
    showError("Please select a PDF file.");
    return;
  }

  fileName.textContent = "Reading PDF...";

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF.js gets its own copy
    const pdfBytesForPdfJs = new Uint8Array(bytes);

    const pdf = await pdfjsLib.getDocument({
      data: pdfBytesForPdfJs,
    }).promise;

    const pageCount = pdf.numPages;

    uploadedPageCount = pageCount;

    // ----------------------------------------------------------
    // AUTO-SELECT SMALLEST BOOKLET SIZE THAT FITS PDF
    // ----------------------------------------------------------

    const autoBookletSize = getAutoBookletSize(pageCount);

    if (!autoBookletSize) {
      selectedFile = null;
      sourcePdfBytes = null;
      uploadedPageCount = 0;

      generateButton.disabled = true;

      fileName.textContent = `${file.name} · ${pageCount} pages`;

      showError(
        `Your PDF contains ${pageCount} pages. ` +
          `The largest supported booklet size is 32 pages.`,
      );

      return;
    }

    // Store PDF
    selectedFile = file;
    sourcePdfBytes = bytes;

    fileName.textContent = `${file.name} · ${pageCount} pages`;

    // Automatically select the smallest valid booklet size
    pageCountSelect.value = String(autoBookletSize);

    // Update UI
    updatePageCountInfo();
    validateCurrentFile();
  } catch (error) {
    console.error(error);

    selectedFile = null;
    sourcePdfBytes = null;

    generateButton.disabled = true;

    fileName.textContent = "Could not read PDF";

    showError(
      "The PDF could not be opened. " +
        "It may be damaged or password protected.",
    );
  }
}

// ============================================================
// VALIDATE
// ============================================================

function validateCurrentFile() {
  if (!selectedFile || !sourcePdfBytes) {
    generateButton.disabled = true;
    return;
  }

  const selectedBookletSize = Number(pageCountSelect.value);

  /*
   * If PDF contains more pages than the selected
   * booklet size, generation is impossible.
   */
  if (uploadedPageCount > selectedBookletSize) {
    generateButton.disabled = true;

    const requiredSize = getAutoBookletSize(uploadedPageCount);

    showError(
      `Your PDF contains ${uploadedPageCount} pages, ` +
        `but you selected a ${selectedBookletSize}-page booklet. ` +
        `Please select ${requiredSize} pages or larger.`,
    );

    return;
  }

  /*
   * PDF has the same number of pages or fewer.
   * Missing pages will be padded with white pages.
   */
  clearError();
  generateButton.disabled = false;
}

// ============================================================
// PAGE COUNT INFO
// ============================================================

function updatePageCountInfo() {
  const count = Number(pageCountSelect.value);

  if (count === 32) {
    thirtyTwoMode.classList.remove("hidden");
  } else {
    thirtyTwoMode.classList.add("hidden");
  }

  // ----------------------------------------------------------
  // INVALID: PDF TOO LARGE
  // ----------------------------------------------------------

  if (uploadedPageCount > count) {
    outputSheets.textContent = "—";

    pageCountHelp.textContent =
      `❌ Your PDF has ${uploadedPageCount} pages. ` +
      `Please select a ${uploadedPageCount}-page booklet size ` +
      `or larger.`;

    return;
  }

  // ----------------------------------------------------------
  // 4
  // ----------------------------------------------------------

  if (count === 4) {
    outputSheets.textContent = "1";

    if (uploadedPageCount < count) {
      const missing = count - uploadedPageCount;

      pageCountHelp.textContent =
        `1 A4 sheet · ${missing} blank page` +
        `${missing === 1 ? "" : "s"} will be added.`;
    } else {
      pageCountHelp.textContent = "1 A4 sheet · 2 pieces · front + back.";
    }

    return;
  }

  // ----------------------------------------------------------
  // 8
  // ----------------------------------------------------------

  if (count === 8) {
    outputSheets.textContent = "1";

    const missing = count - uploadedPageCount;

    pageCountHelp.textContent =
      missing > 0
        ? `1 A4 sheet · ${missing} blank page${missing === 1 ? "" : "s"} will be added.`
        : "1 A4 sheet · 4 pieces · front + back.";

    return;
  }

  // ----------------------------------------------------------
  // 16
  // ----------------------------------------------------------

  if (count === 16) {
    outputSheets.textContent = "1";

    const missing = count - uploadedPageCount;

    pageCountHelp.textContent =
      missing > 0
        ? `1 A4 sheet · ${missing} blank page${missing === 1 ? "" : "s"} will be added.`
        : "1 A4 sheet · 8 pieces · front + back.";

    return;
  }

  // ----------------------------------------------------------
  // 32
  // ----------------------------------------------------------

  if (count === 32) {
    const missing = count - uploadedPageCount;

    if (selected32Mode === "one") {
      outputSheets.textContent = "1";

      pageCountHelp.textContent =
        missing > 0
          ? `1 A4 sheet · ${missing} blank page${missing === 1 ? "" : "s"} will be added · 4×4 front + back.`
          : "1 A4 sheet · 4×4 front + 4×4 back · compact fold.";
    } else {
      outputSheets.textContent = "2";

      pageCountHelp.textContent =
        missing > 0
          ? `2 A4 sheets · ${missing} blank page${missing === 1 ? "" : "s"} will be added · 4×2 front + back.`
          : "2 A4 sheets · 4×2 front + 4×2 back.";
    }
  }
}

// ============================================================
// GENERATE
// ============================================================

generateButton.addEventListener("click", async () => {
  if (!sourcePdfBytes) {
    return;
  }

  try {
    setBusy(true, "Loading PDF...");

    const requestedPages = Number(pageCountSelect.value);

    // ----------------------------------------------------------
    // LOAD SOURCE PDF
    // ----------------------------------------------------------

    const sourcePdf = await PDFDocument.load(new Uint8Array(sourcePdfBytes));

    const actualPages = sourcePdf.getPageCount();

    // ----------------------------------------------------------
    // SAFETY CHECK
    // ----------------------------------------------------------

    if (actualPages > requestedPages) {
      throw new Error(
        `Your PDF contains ${actualPages} pages, ` +
          `but the selected booklet size is only ${requestedPages} pages.`,
      );
    }

    // ----------------------------------------------------------
    // ADD WHITE PAGES
    // ----------------------------------------------------------

    const pagesToAdd = requestedPages - actualPages;

    if (pagesToAdd > 0) {
      setBusy(
        true,
        `Adding ${pagesToAdd} blank page${pagesToAdd === 1 ? "" : "s"}...`,
      );

      const firstPage = sourcePdf.getPage(0);

      const blankWidth = firstPage.getWidth();
      const blankHeight = firstPage.getHeight();

      for (let i = 0; i < pagesToAdd; i++) {
        const blankPage = sourcePdf.addPage([blankWidth, blankHeight]);

        blankPage.drawRectangle({
          x: 0,
          y: 0,
          width: blankWidth,
          height: blankHeight,
          color: rgb(1, 1, 1),
        });
      }
    }

    // ----------------------------------------------------------
    // PREPARE BOOKLET
    // ----------------------------------------------------------

    setBusy(true, "Preparing booklet layout...");

    const outputPdf = await PDFDocument.create();

    const sheetLayouts = getSheetLayouts(requestedPages);

    // ----------------------------------------------------------
    // EMBED PAGES
    // ----------------------------------------------------------

    setBusy(true, "Embedding PDF pages...");

    const embeddedPages = new Map();

    for (const sheet of sheetLayouts) {
      const allPages = [...sheet.front, ...sheet.back];

      for (const pageNumber of allPages) {
        if (pageNumber === null) {
          continue;
        }

        const index = pageNumber - 1;

        if (embeddedPages.has(index)) {
          continue;
        }

        const embedded = await outputPdf.embedPage(sourcePdf.getPage(index));

        embeddedPages.set(index, embedded);
      }
    }

    // ----------------------------------------------------------
    // CREATE A4 SHEETS
    // ----------------------------------------------------------

    for (let i = 0; i < sheetLayouts.length; i++) {
      const sheet = sheetLayouts[i];

      setBusy(true, `Creating sheet ${i + 1} of ${sheetLayouts.length}...`);

      // FRONT
      const frontPage = outputPdf.addPage([A4_WIDTH, A4_HEIGHT]);

      drawWhitePage(frontPage);

      drawLayout(
        frontPage,
        sheet.front,
        sheet.columns,
        sheet.rows,
        embeddedPages,
      );

      // BACK
      const backPage = outputPdf.addPage([A4_WIDTH, A4_HEIGHT]);

      drawWhitePage(backPage);

      drawLayout(
        backPage,
        sheet.back,
        sheet.columns,
        sheet.rows,
        embeddedPages,
      );
    }

    // ----------------------------------------------------------
    // SAFETY CHECK
    // ----------------------------------------------------------

    const generatedPageCount = outputPdf.getPageCount();

    if (requestedPages === 32) {
      const expectedPdfPages = selected32Mode === "one" ? 2 : 4;

      if (generatedPageCount !== expectedPdfPages) {
        throw new Error(
          `32-page booklet generation failed. ` +
            `Expected ${expectedPdfPages} PDF pages but created ${generatedPageCount}.`,
        );
      }
    }

    // ----------------------------------------------------------
    // SAVE
    // ----------------------------------------------------------

    setBusy(true, "Generating preview...");

    generatedPdfBytes = await outputPdf.save({
      useObjectStreams: true,
    });

    createPreview(generatedPdfBytes);

    setBusy(false);
  } catch (error) {
    console.error(error);

    setBusy(false);

    showError("Could not generate booklet: " + error.message);
  }
});

// ============================================================
// GET SHEET LAYOUTS
// ============================================================

function getSheetLayouts(pageCount) {
  // ==========================================================
  // 4 PAGES
  // ==========================================================

  if (pageCount === 4) {
    return [
      {
        front: [4, 1],

        back: [2, 3],

        columns: 2,

        rows: 1,
      },
    ];
  }

  // ==========================================================
  // 8 PAGES
  // ==========================================================

  if (pageCount === 8) {
    return [
      {
        front: [8, 1, 6, 3],

        back: [2, 7, 4, 5],

        columns: 2,

        rows: 2,
      },
    ];
  }

  // ==========================================================
  // 16 PAGES
  // ==========================================================

  if (pageCount === 16) {
    return [
      {
        front: [...LAYOUT_16_FRONT],

        back: [...LAYOUT_16_BACK],

        columns: 4,

        rows: 2,
      },
    ];
  }

  // ==========================================================
  // 32 PAGES
  //
  // EXACTLY TWO A4 SHEETS
  // ==========================================================

  if (pageCount === 32) {
    /* ========================================================
     ONE A4 SHEET
     ======================================================== */

    if (selected32Mode === "one") {
      return [
        {
          front: [30, 3, 32, 1, 26, 7, 28, 5, 22, 11, 24, 9, 18, 15, 20, 13],

          back: [2, 31, 4, 29, 6, 27, 8, 25, 10, 23, 12, 21, 14, 19, 16, 17],

          columns: 4,
          rows: 4,
        },
      ];
    }

    /* ========================================================
     TWO A4 SHEETS
     ======================================================== */

    return [
      {
        front: [32, 1, 30, 3, 28, 5, 26, 7],

        back: [20, 13, 24, 9, 18, 15, 22, 11],

        columns: 4,
        rows: 2,
      },

      {
        front: [4, 29, 2, 31, 8, 25, 6, 27],

        back: [10, 23, 14, 19, 12, 21, 16, 17],

        columns: 4,
        rows: 2,
      },
    ];
  }

  throw new Error("Unsupported booklet size.");
}

// ============================================================
// DRAW LAYOUT
// ============================================================

function drawLayout(destinationPage, layout, columns, rows, embeddedPages) {
  const cellWidth = A4_WIDTH / columns;

  const cellHeight = A4_HEIGHT / rows;

  for (let i = 0; i < layout.length; i++) {
    const pageNumber = layout[i];

    const column = i % columns;

    const row = Math.floor(i / columns);

    const cellX = column * cellWidth;

    const cellY = A4_HEIGHT - (row + 1) * cellHeight;

    if (pageNumber === null) {
      drawBlankCell(destinationPage, cellX, cellY, cellWidth, cellHeight);

      continue;
    }

    const embeddedPage = embeddedPages.get(pageNumber - 1);

    if (!embeddedPage) {
      throw new Error(`Could not find source page ${pageNumber}.`);
    }

    /*
     * Only 16/32 page layouts have
     * folding pairs.
     *
     * 4/8 layouts also work correctly
     * with the same logic.
     */

    const isLeftPage = column % 2 === 0;

    const isRightPage = column % 2 === 1;

    let pageX = cellX;

    let pageWidth = cellWidth;

    /*
     * Gutter only affects the inner edge.
     *
     * LEFT:
     * right side gets half gutter.
     *
     * RIGHT:
     * left side gets half gutter.
     */

    if (isLeftPage) {
      pageWidth = cellWidth - FOLD_GUTTER / 2;
    }

    if (isRightPage) {
      pageX = cellX + FOLD_GUTTER / 2;

      pageWidth = cellWidth - FOLD_GUTTER / 2;
    }

    drawPageCell(
      destinationPage,
      embeddedPage,
      pageX,
      cellY,
      pageWidth,
      cellHeight,
    );

    /*
     * Fold guide.
     *
     * Only after every LEFT page.
     */

    if (isLeftPage) {
      const foldX = cellX + cellWidth;

      destinationPage.drawLine({
        start: {
          x: foldX,
          y: cellY,
        },

        end: {
          x: foldX,
          y: cellY + cellHeight,
        },

        color: rgb(0.6, 0.6, 0.6),

        thickness: 0.35,

        dashArray: [2, 2],
      });
    }
  }
}

// ============================================================
// DRAW PDF PAGE CELL
// ============================================================

function drawPageCell(
  destinationPage,
  embeddedPage,
  cellX,
  cellY,
  cellWidth,
  cellHeight,
) {
  /*
   * Content area.
   */

  const availableWidth = cellWidth - CONTENT_GAP * 2;

  const availableHeight = cellHeight - CONTENT_GAP * 2;

  const sourceWidth = embeddedPage.width;

  const sourceHeight = embeddedPage.height;

  /*
   * Contain source page.
   */

  const scale = Math.min(
    availableWidth / sourceWidth,

    availableHeight / sourceHeight,
  );

  const width = sourceWidth * scale;

  const height = sourceHeight * scale;

  const x = cellX + (cellWidth - width) / 2;

  const y = cellY + (cellHeight - height) / 2;

  /*
   * White background.
   */

  destinationPage.drawRectangle({
    x: cellX,

    y: cellY,

    width: cellWidth,

    height: cellHeight,

    color: rgb(1, 1, 1),
  });

  /*
   * PDF page.
   */

  destinationPage.drawPage(embeddedPage, {
    x,
    y,
    width,
    height,
  });

  /*
   * Border.
   */

  destinationPage.drawRectangle({
    x: cellX,

    y: cellY,

    width: cellWidth,

    height: cellHeight,

    borderColor: rgb(0.25, 0.28, 0.32),

    borderWidth: BORDER_WIDTH,

    color: undefined,
  });
}

// ============================================================
// BLANK CELL
// ============================================================

function drawBlankCell(destinationPage, x, y, width, height) {
  destinationPage.drawRectangle({
    x,

    y,

    width,

    height,

    color: rgb(0.99, 0.99, 0.99),

    borderColor: rgb(0.75, 0.77, 0.8),

    borderWidth: BORDER_WIDTH,
  });
}

// ============================================================
// WHITE A4
// ============================================================

function drawWhitePage(page) {
  page.drawRectangle({
    x: 0,

    y: 0,

    width: A4_WIDTH,

    height: A4_HEIGHT,

    color: rgb(1, 1, 1),
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

  iframe.title = "Generated booklet preview";

  pdfViewer.appendChild(iframe);

  const pageCount = Number(pageCountSelect.value);

  let sheetCount;

  if (pageCount === 32) {
    sheetCount = selected32Mode === "one" ? 1 : 2;
  } else {
    sheetCount = 1;
  }

  const pdfPageCount = sheetCount * 2;

  resultDescription.textContent =
    `${pageCount}-page booklet · ` +
    `${sheetCount} A4 sheet${sheetCount === 1 ? "" : "s"} · ` +
    `${pdfPageCount} PDF pages ` +
    `(front + back). ` +
    `Check the arrangement before downloading.`;

  resultSection.classList.remove("hidden");

  resultSection.scrollIntoView({
    behavior: "smooth",

    block: "start",
  });
}

// ============================================================
// DOWNLOAD
// ============================================================

downloadButton.addEventListener("click", () => {
  if (!generatedPdfBytes) {
    return;
  }

  const pageCount = Number(pageCountSelect.value);

  const originalName = selectedFile?.name || "booklet.pdf";

  const dot = originalName.lastIndexOf(".");

  const base = dot > 0 ? originalName.substring(0, dot) : originalName;

  const filename = `${base}-${pageCount}page-booklet.pdf`;

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
// CLEAR RESULT
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

  if (resultSection) {
    resultSection.classList.add("hidden");
  }
}

// ============================================================
// ERROR
// ============================================================

function showError(message) {
  errorBox.textContent = message;

  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";

  errorBox.classList.add("hidden");
}

// ============================================================
// BUSY
// ============================================================

function setBusy(busy, message = "") {
  generateButton.disabled = busy || !selectedFile;

  pageCountSelect.disabled = busy;

  if (busy) {
    statusText.textContent = message;

    status.classList.remove("hidden");
  } else {
    status.classList.add("hidden");
  }
}
