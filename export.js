import { exportCanvasWithTransparentBg } from "./app.js";
import { gridWidth, gridHeight, pixelSize, selectFrame, getCurrentPalette } from "./app.js";
import { frames } from "./app.js";
const canvas = document.getElementById("pixel-canvas");
const frameRate = document.getElementById("frame-rate");
const exportButton = document.getElementById("export-button");
export const exportModal = document.getElementById("export-modal");
const closeButton = document.getElementById("export-close-button");
const GIFButton = document.getElementById("export-GIF-button");
const PNGButton = document.getElementById("export-PNG-button");
const MPNGButton = document.getElementById("export-mPNG-button");
const spriteSheetButton = document.getElementById("export-spriteSheet-button");
const projectButton = document.getElementById("export-project-button");
const filenameInput = document.getElementById("export-filename");

let fps = 24;
export let filename = "animation";

export function setFilename(name) {
    filename = name;
}


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

GIFButton.addEventListener("click", async () => {
    await exportGIF();
    exportModal.style.display = "none";
});

MPNGButton.addEventListener("click", () => {
    exportMPNG();
    exportModal.style.display = "none";
});

spriteSheetButton.addEventListener("click", () => {
    exportSpriteSheet();
    exportModal.style.display = "none";
});

projectButton.addEventListener("click", () => {
    exportProject();
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

function findUnusedColor(frames) {
    const usedColors = new Set();
    for (const frame of frames) {
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (frame.grid[x][y]) usedColors.add(frame.grid[x][y].toUpperCase());
            }
        }
    }
    
    const candidates = ["#FF00FF", "#00FFFE", "#123456", "#ABCDEF"];
    return candidates.find(c => !usedColors.has(c)) || "#FF00FF";
}

async function exportGIF() {
    fps = frameRate.value;
    const transparentColor = findUnusedColor(frames);
    const gifOptions = {
        workers: 2,
        quality: 10,
        workerScript: './assets/lib/gif.worker.js',
        width: canvas.width,
        height: canvas.height,
        transparent: parseInt(transparentColor.replace("#", "0x"), 16)
    };

    const gif = new window.GIF(gifOptions);

    
    for (let i = 0; i < frames.length; i++) {
        selectFrame(i);
        const frame = frames[i];
        const composite = buildCompositeGridFromLayersOrFrame(frame);
        await new Promise(resolve => requestAnimationFrame(resolve));
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        

        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const col = composite[x][y];
                if (col) {
                    tempCtx.fillStyle = col;
                    tempCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                } else {
                    tempCtx.fillStyle = transparentColor;
                    tempCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }

        gif.addFrame(tempCtx, {copy: true, delay: 1000 / fps});
    }

    gif.on('finished', function(blob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.gif`;
        link.click();
    });

    gif.render();
}

async function exportMPNG() {

    const zip = new JSZip();

    for (let i = 0; i < frames.length; i++) {

        const frame = frames[i];
    const composite = buildCompositeGridFromLayersOrFrame(frame);


        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const col = composite[x][y];
                if (col) {
                    tempCtx.fillStyle = col;
                    tempCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                } 

            }
        }

    const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, "image/png"));
        zip.file(`frame-${i + 1}.png`, blob);
    }

    // Generate the zip file and trigger download
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `${filename}.zip`;
            link.click();
        });
}

function exportSpriteSheet()
{
    const spriteSheetCanvas = document.createElement("canvas");
    const spriteSheetCtx = spriteSheetCanvas.getContext("2d");

    const frameWidth = gridWidth * pixelSize;
    const frameHeight = gridHeight * pixelSize;
    const totalFrames = frames.length;

    spriteSheetCanvas.width = frameWidth * totalFrames;
    spriteSheetCanvas.height = frameHeight;

    for (let i = 0; i < totalFrames; i++) {

        selectFrame(i);
        const frame = frames[i];
    const composite = buildCompositeGridFromLayersOrFrame(frame);
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const col = composite[x][y];
                if (col) {
                    spriteSheetCtx.fillStyle = col;
                    spriteSheetCtx.fillRect(x * pixelSize + i * frameWidth, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = spriteSheetCanvas.toDataURL("image/png");
    link.click();
}

function exportProject() {
    const palette = getCurrentPalette();
    const projectData = {
        version: "3.0",                    // ← nuova versione con layers
        frames: [],
        gridWidth,
        gridHeight,
        pixelSize,
        filename: typeof filename !== "undefined" && filename ? filename : "animation",
        palette: Array.isArray(palette) ? palette : [],
        createdAt: new Date().toISOString()
    };

    frames.forEach((frame, index) => {
        // Snapshot composito (per compatibilità e anteprime)
        const compositeGrid = frame.grid;

        // Compat: comprime o salva “legacy”
        const compressedCells = compressFrame(compositeGrid);
        const useCompression = JSON.stringify(compressedCells).length < JSON.stringify(compositeGrid).length;

        // Layer per-frame: name, visible, grid
        const layersOut = Array.isArray(frame.layers)
            ? frame.layers.map(L => ({
                name: L.name || `Layer`,
                visible: L.visible !== false,
                grid: L.grid
            }))
            : [{
                // Retro-compat: se non ci sono layers, crea layer unico dal composito
                name: "Layer 1",
                visible: true,
                grid: compositeGrid
            }];

        const frameData = {
            index,
            timestamp: frame.timestamp || new Date().toISOString(),
            activeLayerIndex: frame.activeLayerIndex ?? 0,
            layers: layersOut,
            format: useCompression ? "compressed" : "legacy"
        };

        if (useCompression) {
            frameData.cells = compressedCells;
        } else {
            frameData.grid = compositeGrid;
        }

        projectData.frames.push(frameData);
    });

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${filename}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
}


document.addEventListener("keydown", function(e) {
    if (e.key === "Enter")  {
        e.preventDefault();
        exportButton.click();
    }
});

function compressFrame(frameGrid) {
    if (!frameGrid || !Array.isArray(frameGrid)) {
        console.warn('frameGrid non valido:', frameGrid);
        return [];
    }
    
    const compressedCells = [];
    
    for (let x = 0; x < frameGrid.length; x++) {
        if (!Array.isArray(frameGrid[x])) continue;
        
        for (let y = 0; y < frameGrid[x].length; y++) {
            const color = frameGrid[x][y];
            if (color !== null && color !== undefined && color !== '') {
                const pixelNumber = y * frameGrid.length + x + 1;
                compressedCells.push({
                    pixel: pixelNumber,
                    color: color
                });
            }
        }
    }
    
    return compressedCells.sort((a, b) => a.pixel - b.pixel);
}


function buildCompositeGridFromLayersOrFrame(frame) {
  if (!frame || !Array.isArray(frame.layers) || frame.layers.length === 0) {
    return frame?.grid ?? [];
  }
  const composite = Array.from({ length: gridWidth }, () => Array(gridHeight).fill(null));
  for (let li = 0; li < frame.layers.length; li++) {
    const L = frame.layers[li];
    if (!L || L.visible === false || !Array.isArray(L.grid)) continue;
    const g = L.grid;
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const c = g[x]?.[y];
        if (c) composite[x][y] = c;
      }
    }
  }
  return composite;
}




export {exportPNG};
