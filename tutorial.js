// =========================================================
// BOOKLET TUTORIAL
// =========================================================

const tutorialSideLabel = document.getElementById("tutorialSideLabel");

const tutorialSheetLabel = document.getElementById("tutorialSheetLabel");

const tutorialButton = document.getElementById("tutorialButton");

const tutorialOverlay = document.getElementById("tutorialOverlay");

const closeTutorial = document.getElementById("closeTutorial");

const closeTutorialBottom = document.getElementById("closeTutorialBottom");

const tutorialPaper = document.getElementById("tutorialPaper");

const tutorialStage = document.querySelector(".tutorial-stage");

const tutorialStepTitle = document.getElementById("tutorialStepTitle");

const tutorialStepDescription = document.getElementById(
  "tutorialStepDescription",
);

const tutorialCutText = document.getElementById("tutorialCutText");

const tutorialFoldText = document.getElementById("tutorialFoldText");

const tutorialFinishText = document.getElementById("tutorialFinishText");

const tutorialSheetSelector = document.getElementById("tutorialSheetSelector");

const tutorialSheetButtons = document.querySelectorAll(".tutorial-sheet");

const sizeButtons = document.querySelectorAll(".tutorial-size");

let selectedPages = 4;

let selectedSheet = 1;

// =========================================================
// EXACT BOOKLET LAYOUTS
// =========================================================

const layouts = {
  4: [
    {
      front: [4, 1],
      back: [2, 3],
      columns: 2,
      rows: 1,
    },
  ],

  8: [
    {
      front: [8, 1, 6, 3],
      back: [2, 7, 4, 5],
      columns: 2,
      rows: 2,
    },
  ],

  16: [
    {
      front: [16, 1, 10, 7, 6, 11, 14, 3],

      back: [8, 9, 2, 15, 4, 13, 12, 5],

      columns: 4,
      rows: 2,
    },
  ],

  32: [
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
  ],
};

// =========================================================
// OPEN
// =========================================================

tutorialButton?.addEventListener("click", () => {
  tutorialOverlay.classList.add("show");

  document.body.style.overflow = "hidden";

  selectedSheet = 1;

  updateTutorial();
});

// =========================================================
// CLOSE
// =========================================================

function closeTutorialWindow() {
  tutorialOverlay.classList.remove("show");

  document.body.style.overflow = "";
}

closeTutorial?.addEventListener("click", closeTutorialWindow);

closeTutorialBottom?.addEventListener("click", closeTutorialWindow);

// =========================================================
// CLICK OUTSIDE
// =========================================================

tutorialOverlay?.addEventListener("click", (event) => {
  if (event.target === tutorialOverlay) {
    closeTutorialWindow();
  }
});

// =========================================================
// ESC
// =========================================================

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && tutorialOverlay.classList.contains("show")) {
    closeTutorialWindow();
  }
});

// =========================================================
// SIZE BUTTONS
// =========================================================

sizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedPages = Number(button.dataset.tutorialPages);

    selectedSheet = 1;

    sizeButtons.forEach((item) => item.classList.remove("active"));

    button.classList.add("active");

    updateTutorial();
  });
});

// =========================================================
// SHEET BUTTONS
// =========================================================

tutorialSheetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedSheet = Number(button.dataset.sheet);

    tutorialSheetButtons.forEach((item) => item.classList.remove("active"));

    button.classList.add("active");

    updateTutorial();
  });
});

// =========================================================
// UPDATE
// =========================================================

function updateTutorial() {
  const sheets = layouts[selectedPages];

  const sheet = sheets[selectedSheet - 1];

  if (!sheet) return;

  const is32 = selectedPages === 32;

  /* -----------------------------------------
     HEADER
  ----------------------------------------- */

  tutorialSideLabel.textContent = "FRONT";

  tutorialSheetLabel.textContent = `SHEET ${selectedSheet} OF ${sheets.length}`;

  /* -----------------------------------------
     STEP
  ----------------------------------------- */

  tutorialStepTitle.textContent = is32
    ? `Sheet ${selectedSheet} — page arrangement`
    : "Look at your printed sheet";

  tutorialStepDescription.textContent = is32
    ? `Sheet ${selectedSheet} contains these page numbers before cutting.`
    : "These numbered panels show exactly where each booklet page sits.";

  /* -----------------------------------------
     INSTRUCTIONS
  ----------------------------------------- */

  tutorialCutText.textContent = getCutText(selectedPages);

  tutorialFoldText.textContent = getFoldText(selectedPages);

  tutorialFinishText.textContent = getFinishText(selectedPages);

  /* -----------------------------------------
     SHEET SWITCHER
  ----------------------------------------- */

  if (is32) {
    tutorialSheetSelector.classList.add("show");
  } else {
    tutorialSheetSelector.classList.remove("show");
  }

  /* -----------------------------------------
     DRAW FRONT
  ----------------------------------------- */

  drawPaper(sheet.front, sheet.columns, sheet.rows);

  tutorialStage.classList.add("show-cut");
  tutorialStage.classList.add("show-fold");
}

// =========================================================
// DRAW PAPER
// =========================================================

function drawPaper(pages, columns, rows) {
  tutorialPaper.innerHTML = "";

  const cellWidth = 100 / columns;
  const cellHeight = 100 / rows;

  pages.forEach((pageNumber, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const cell = document.createElement("div");

    cell.className = "tutorial-cell";

    cell.style.left = `${column * cellWidth}%`;

    cell.style.top = `${row * cellHeight}%`;

    cell.style.width = `${cellWidth}%`;

    cell.style.height = `${cellHeight}%`;

    /* PAGE NUMBER */

    const number = document.createElement("div");

    number.className = "tutorial-page-number";

    number.textContent = pageNumber;

    const rotations = [
      "-2deg",
      "1deg",
      "-1deg",
      "2deg",
      "1deg",
      "-2deg",
      "2deg",
      "-1deg",
    ];

    number.style.setProperty("--rotation", rotations[index % rotations.length]);

    cell.appendChild(number);

    tutorialPaper.appendChild(cell);
  });

  drawCutLines(columns, rows);

  drawFoldLines(columns);
}

// =========================================================
// CUT LINES
// =========================================================

function drawCutLines(columns, rows) {
  /* -----------------------------------------
     VERTICAL CUTS
  ----------------------------------------- */

  for (let i = 1; i < columns; i++) {
    const line = document.createElement("div");

    line.className = "tutorial-cut-line tutorial-cut-vertical";

    line.style.left = `${(i / columns) * 100}%`;

    tutorialPaper.appendChild(line);
  }

  /* -----------------------------------------
     HORIZONTAL CUTS
  ----------------------------------------- */

  for (let i = 1; i < rows; i++) {
    const line = document.createElement("div");

    line.className = "tutorial-cut-line tutorial-cut-horizontal";

    line.style.top = `${(i / rows) * 100}%`;

    tutorialPaper.appendChild(line);
  }
}

// =========================================================
// FOLD LINES
// =========================================================

function drawFoldLines(columns) {
  // For every pair:
  //
  // 16 | 1
  // 10 | 7
  //
  // 6 | 11
  // 14 | 3
  //
  // etc.

  for (let i = 1; i < columns; i += 2) {
    const line = document.createElement("div");

    line.className = "tutorial-fold-line " + "tutorial-fold-vertical";

    line.style.left = `${(i / columns) * 100}%`;

    tutorialPaper.appendChild(line);
  }
}

// =========================================================
// TEXT
// =========================================================

function getCutText(pages) {
  if (pages === 4) {
    return "Cut the A4 sheet in half along the red dashed line.";
  }

  if (pages === 8) {
    return "Cut along the red dashed lines to create four physical pieces.";
  }

  if (pages === 16) {
    return "Cut along all red dashed lines to separate the eight physical pieces.";
  }

  if (pages === 32) {
    return "Cut each sheet along the red dashed lines to create eight physical pieces per sheet.";
  }

  return "";
}

function getFoldText(pages) {
  if (pages === 4) {
    return "Fold the two pages together at their center.";
  }

  if (pages === 8) {
    return "Fold each two-page pair at the blue center line.";
  }

  if (pages === 16) {
    return "Fold between each pair: 16|1, 10|7, 6|11 and 14|3.";
  }

  if (pages === 32) {
    return "Fold each pair at the blue center line, then stack the pieces in booklet order.";
  }

  return "";
}

function getFinishText(pages) {
  if (pages === 32) {
    return "Stack Sheet 1 and Sheet 2 in order, then staple along the spine.";
  }

  return "Stack the folded pieces in order and staple along the spine.";
}
