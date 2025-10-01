
import { frames, selectFrame, setGridParams, activeFrameIndex, activeTool, gridHeight, gridWidth } from "./app.js";
import {setFilename} from "./export.js";



export function importProjectFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            setFilename(projectData.filename || "animation");
            
            const version = projectData.version || "1.0";

            const filenameInput = document.getElementById("export-filename");
            if (filenameInput) filenameInput.value = projectData.filename || "animation";
            setGridParams({
                width: projectData.gridWidth,
                height: projectData.gridHeight,
                pixel: projectData.pixelSize,
                name: projectData.filename
            });

            // Reset Frames
            frames.length = 0;
        
            const frameContainer = document.getElementById("timeline");
            while (frameContainer.firstChild) frameContainer.removeChild(frameContainer.firstChild);

            projectData.frames.forEach((frameData, i) => {
                let frameGrid;
                if(version ==="2.0")
                {
                    if (frameData.format === "compressed" && frameData.cells) {
                        // Frame compressed
                        frameGrid = decompressFrame(frameData.cells, projectData.gridWidth, projectData.gridHeight);
                    } else if (frameData.format === "legacy" && frameData.grid) {
                        // Frame legacy
                        frameGrid = frameData.grid;
                    }
                    
                    window.createFrameWithImportedGrid(frameGrid);
                }
                else if (typeof window.createFrameWithImportedGrid === "function") {
                    window.createFrameWithImportedGrid(frameData.grid);
                    console.log(`Frame ${i + 1} created with grid size: ${frameData.grid.length}x${frameData.grid[0].length}`);
                }
                const frameObj = frames[frames.length - 1];
                if (!frameObj) {
                    console.error("Frame non creato correttamente! frames:", frames);
                    return;
                }

                if(version === "2.0")
                {
                   frameObj.undoStack = [JSON.stringify(frameGrid)];
                frameObj.redoStack = []; 
                }
                else
                {
                    frameObj.undoStack = [JSON.stringify(frameData.grid)];
                    frameObj.redoStack = []; 
                }
                
                if (typeof window.drawPreviewFromStack === "function") {
                    window.drawPreviewFromStack(frames.length - 1);
                }
            });

            
            if (frames.length > 0) {
                for (let i = 0; i < frames.length; i++) {
                    selectFrame(i);
                }
                selectFrame(0);
                if (typeof window.redrawCanvas === "function") {
                    window.redrawCanvas();
                }
            }

            // Palette reset
            if (projectData.palette && Array.isArray(projectData.palette)) {
                const colorList = document.getElementById("color-list");
                colorList.innerHTML = "";
                projectData.palette.forEach(color => {
                    const newColorDiv = document.createElement("div");
                    newColorDiv.className = "color";
                    newColorDiv.style.backgroundColor = color;
                    newColorDiv.setAttribute("data-color", color);
                    newColorDiv.addEventListener("click", () => {
                        document.getElementById("color-picker").value = color;
                        activeTool = "pencil";
                        newColorDiv.classList.remove("pulse");
                        void newColorDiv.offsetWidth;
                        newColorDiv.classList.add("pulse");
                        document.getElementById("pencil-tool").classList.add("active");
                        document.getElementById("eraser-tool").classList.remove("active");
                        document.getElementById("fill-tool").classList.remove("active");
                    });
                    colorList.appendChild(newColorDiv);
                });
            }

            

        
            if (typeof window.saveToLocalStorage === "function") {
                window.saveToLocalStorage();
            }


            
        } catch (err) {
            alert("Error: " + err.message);
        }
    };
    reader.readAsText(file);
}

function decompressFrame(compressedCells, width, height) {
    if (!compressedCells || !Array.isArray(compressedCells)) {
        console.warn('compressedCells non valido:', compressedCells);
        return Array.from({ length: width }, () => Array(height).fill(null));
    }
    
    const frameGrid = Array.from({ length: width }, () => 
        Array(height).fill(null)
    );
    
    compressedCells.forEach(cell => {
        if (cell && typeof cell.pixel === 'number' && cell.color) {
            const pixelIndex = cell.pixel - 1;
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
                frameGrid[x][y] = cell.color;
            } else {
                console.warn(`Pixel ${cell.pixel} fuori dai limiti: x=${x}, y=${y}`);
            }
        }
    });
    
    return frameGrid;
}

function decompressCellsToGrid(cells, width, height) {
  const grid = Array.from({ length: width }, () => Array(height).fill(null));
  if (!Array.isArray(cells)) return grid;
  for (const { pixel, color } of cells) {
    if (typeof pixel !== "number") continue;
    const idx = pixel - 1;
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[x][y] = color;
    }
  }
  return grid;
}

function composeLayers(layers, width, height) {
  const composite = Array.from({ length: width }, () => Array(height).fill(null));
  if (!Array.isArray(layers)) return composite;
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    if (!L || L.visible === false || !Array.isArray(L.grid)) continue;
    const g = L.grid;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const c = g[x]?.[y];
        if (c) composite[x][y] = c; 
      }
    }
  }
  return composite;
}

function normalizeLayersFromFrameData(fd) {
  
  if (Array.isArray(fd.layers) && fd.layers.length > 0) {
    return fd.layers.map(L => ({
      name: L.name || "Layer",
      visible: L.visible !== false,
      grid: fixGridSize(L.grid, gridWidth, gridHeight)
    }));
  }
 
  const legacyGrid = fd.format === "compressed"
    ? decompressCellsToGrid(fd.cells, gridWidth, gridHeight)
    : fixGridSize(fd.grid, gridWidth, gridHeight);
  return [{
    name: "Layer 1",
    visible: true,
    grid: legacyGrid
  }];
}

function fixGridSize(src, width, height) {
  const g = Array.isArray(src) ? src : [];
  const out = Array.from({ length: width }, () => Array(height).fill(null));
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      out[x][y] = g[x]?.[y] ?? null;
    }
  }
  return out;
}

function toFramesLocalStorageShape(project) {
  const result = [];

  // palette e filename a livello globale
  if (Array.isArray(project.palette)) {
    localStorage.setItem("palette", JSON.stringify(project.palette));
  }
  if (project.filename) {
    localStorage.setItem("projectFilename", project.filename);
  }

  for (let i = 0; i < project.frames.length; i++) {
    const fd = project.frames[i];

    
    const layers = normalizeLayersFromFrameData(fd);


    const composite = composeLayers(layers, gridWidth, gridHeight);


    const undoStack = [JSON.stringify(composite)];
    const redoStack = [];

    result.push({
      grid: composite,          
      layers: layers,         
      activeLayerIndex: Math.min(fd.activeLayerIndex ?? 0, Math.max(0, layers.length - 1)),
      undoStack,
      redoStack
    });
  }

  return result;
}

async function readJSONFile(file) {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON non valido:", e);
    throw new Error("File JSON non valido");
  }
}

function migrateLegacyProject(raw) {

  if (!raw || !Array.isArray(raw.frames)) throw new Error("Formato progetto non valido");
  return {
    version: raw.version || "2.0",
    frames: raw.frames.map(f => ({
      index: f.index ?? 0,
      format: f.format || (Array.isArray(f.cells) ? "compressed" : "legacy"),
      grid: f.grid,
      cells: f.cells,
      layers: undefined, 
      activeLayerIndex: 0,
      timestamp: f.timestamp
    })),
    gridWidth: raw.gridWidth,
    gridHeight: raw.gridHeight,
    pixelSize: raw.pixelSize,
    filename: raw.filename || "animation",
    palette: raw.palette || [],
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function normalizeProject(raw) {
  if (!raw || !Array.isArray(raw.frames)) throw new Error("Formato progetto non valido");

  
  if (raw.version && String(raw.version).startsWith("3") && raw.frames.some(f => Array.isArray(f.layers))) {
    return raw;
  }
  
  return migrateLegacyProject(raw);
}

function applyImportedFramesToLocalStorage(framesLSShape) {
  
  localStorage.setItem("frames", JSON.stringify(framesLSShape));
  
  window.location.reload();
}

function setupImportUI() {
  const fileInput = document.getElementById("import-project");
  if (!fileInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await readJSONFile(file);
      const project = normalizeProject(raw);
      const framesLSShape = toFramesLocalStorageShape(project);
      applyImportedFramesToLocalStorage(framesLSShape);
    } catch (err) {
      alert(`Import fallito: ${err.message || err}`);
      console.error(err);
    } finally {
      
      e.target.value = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", setupImportUI);