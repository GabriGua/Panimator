import { exportCanvasWithTransparentBg } from "./app.js";
const exportButton = document.getElementById("export-button");
const exportModal = document.getElementById("export-modal");
const closeButton = document.getElementById("export-close-button");
const GIFButton = document.getElementById("export-GIF-button");
const PNGButton = document.getElementById("export-PNG-button");
const MPNGButton = document.getElementById("export-mPNG-button");
const filenameInput = document.getElementById("export-filename");


let filename = "animation";

exportButton.addEventListener("click", () => {
    exportModal.style.display = "block";
    });

closeButton.addEventListener("click", () => {
    exportModal.style.display = "none";
    });

filenameInput.addEventListener("input", (event) => {
    filename = event.target.value || "animation";
});


PNGButton.addEventListener("click", () => {
    
    exportPNG();
    exportModal.style.display = "none";
});

function exportPNG() {
    exportCanvasWithTransparentBg(() => {
        const canvas = document.getElementById("pixel-canvas");
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

export {exportPNG};
