const bookletTab = document.getElementById("bookletTab");
const converterTab = document.getElementById("converterTab");

const bookletTool = document.getElementById("bookletTool");
const converterTool = document.getElementById("converterTool");

bookletTab.addEventListener("click", () => {
  bookletTab.classList.add("active");
  converterTab.classList.remove("active");

  bookletTool.classList.remove("hidden");
  converterTool.classList.add("hidden");
});

converterTab.addEventListener("click", () => {
  converterTab.classList.add("active");
  bookletTab.classList.remove("active");

  bookletTool.classList.add("hidden");
  converterTool.classList.remove("hidden");
});
