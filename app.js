import { addFrameDuringAnimation, pauseAnimation } from "./animation.js";
import { exportModal } from "./export.js";
import { isLight } from "./themeSwitcher.js";
//canvas rendering
const canvas = document.getElementById("pixel-canvas");

const ctx = canvas.getContext("2d");
let pixelSize = 16;
let gridWidth = Math.floor(canvas.width / pixelSize);
let gridHeight = Math.floor(canvas.height / pixelSize);
let onionSkinEnabled = false;

let grid = [];

let previewIndex = 0;
let currentOpacity = 100;

for (let x = 0; x < gridWidth; x++) {
    grid[x] = [];
    for (let y = 0; y < gridHeight; y++) {
        grid[x][y] = null;
    }
}

//tools state
let activeTool = null;
let isDrawing = false;
let hoverCell = null;
let lastDrawX = null;
let lastDrawY = null;

//buttons
const pencilButton = document.getElementById("pencil-tool");
const eraserButton = document.getElementById("eraser-tool");
const fillButton = document.getElementById("fill-tool");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const x16Button = document.getElementById("16");
const x32Button = document.getElementById("32");
const x64Button = document.getElementById("64");
const colorSave = document.getElementById("color-save");
const hMirrorButton = document.getElementById("horizontal-mirror");
const vMirrorButton = document.getElementById("vertical-mirror");
const addFrame = document.getElementById("add-frame");
const copyFrameToggle = document.getElementById("copyFrame-toggle");
const pixelPerfectToggle = document.getElementById("pixelPerfect-toggle");
const questionButton = document.getElementById("question-button");
const modal = document.getElementById("modal");
const closeButton = document.getElementById("close-button");



let layers = [];
let activeLayerIndex = 0;

//Handling frames
let frames = [];
let activeFrameIndex = 0;
let draggedElement = null;
let draggedIndex = null;

function deepCloneGrid(g)
{
    return g? g.map(col => col.slice()) : null;
}

function createLayerData(name = "") {
    return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name,
    visible: true,
    grid: Array.from({ length: gridWidth }, () => Array(gridHeight).fill(null)),
    
    previewCanvas: null,
    previewCtx: null,
    wrapEl: null
  };
}

function createLayerFromGrid(name, gridSrc) {
    const L = createLayerData(name);
    L.grid = deepCloneGrid(gridSrc);
    return L;
}

function deepCloneLayers(srcLayers)
{

    return srcLayers.map(layer => {
        const newLayer = createLayerData(layer.name);
        newLayer.visible = layer.visible;
        newLayer.grid = deepCloneGrid(layer.grid);
        return newLayer;
    });
}

function  composeToMainCanvas()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = isLight ? "#fff" : "#585858ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    if (!L || !L.visible || !L.grid) continue;
    const g = L.grid;
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const c = g[x][y];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }
}

function buildCompositeGridFromLayers(ls = layers) {
  const composite = Array.from({ length: gridWidth }, () => Array(gridHeight).fill(null));
  for (let li = 0; li < ls.length; li++) {
    const L = ls[li];
    if (!L || !L.visible || !L.grid) continue;
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const c = L.grid[x][y];
        if (c) composite[x][y] = c; 
      }
    }
  }
  return composite;
}

function createNewFrame() {
    return createFrame(null);
}

function createFrameWithImportedGrid(importedGrid) {
    return createFrame(importedGrid);
}

function createFrame(importedGrid = null) {
    addFrameDuringAnimation();
    const frameContainer = document.getElementById("timeline");
    const newFrame = document.createElement("canvas");
    newFrame.width = 100;
    newFrame.height = 100;
    newFrame.className = "frame-canvas";
    
    const frameWrap = document.createElement("div");
    frameWrap.className = "frame-wrap";

    frameWrap.draggable = true;
    frameWrap.setAttribute('data-frame-index', '');

    const frameNumber = document.createElement("span");
    frameNumber.className = "frame-number";
    
    //Download single frame
    const downloadFrame = document.createElement("button");
    const downloadIcon = document.createElement("i");
    downloadFrame.className = "download-frame";
    downloadIcon.className = "download-icon";
    downloadFrame.appendChild(downloadIcon);

    downloadFrame.addEventListener("click", (e) => {
        const index = Array.from(frameContainer.children).indexOf(frameWrap);
        exportSpecificFrameAsPNG(index, `frame-${index + 1}`);
    });

    //DELETING FRAMES
    const deleteFrame = document.createElement("button");
    const deleteIcon = document.createElement("i");
    deleteIcon.className = "delete-icon";
    deleteFrame.appendChild(deleteIcon);
    deleteFrame.className = "delete-frame";
    deleteFrame.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = Array.from(frameContainer.children).indexOf(frameWrap);
        if (frames.length > 1) {
            frames.splice(index, 1);
            frameContainer.removeChild(frameWrap);
            //Updating frame numbers
            Array.from(frameContainer.children).forEach((wrap, i) => {
            const number = wrap.querySelector('.frame-number');
            if (number) number.textContent = i + 1;
            // Updating frames IDs
            const canvas = wrap.querySelector('.frame-canvas');
            if (canvas) canvas.id = `frame-${i + 1}`;
        });
            if (activeFrameIndex >= frames.length) {
                activeFrameIndex = frames.length - 1;
            }
            selectFrame(activeFrameIndex);
            saveToLocalStorage();
        } else {
            alert("You cannot delete the last frame.");
        }
    });


    frameWrap.addEventListener('dragstart', handleDragStart);
    frameWrap.addEventListener('dragover', handleDragOver);
    frameWrap.addEventListener('drop', handleDrop);
    frameWrap.addEventListener('dragend', handleDragEnd);
    frameWrap.addEventListener('dragenter', handleDragEnter);
    frameWrap.addEventListener('dragleave', handleDragLeave);

    const optionsMenu = document.createElement("div");
    optionsMenu.className = "options-menu";
    optionsMenu.appendChild(downloadFrame);
    optionsMenu.appendChild(deleteFrame);
    
    frameWrap.appendChild(optionsMenu);
    const optionsButton = document.createElement("button");
    optionsButton.className = "options-button";
    optionsButton.innerHTML = "&#8942;";
    
    optionsButton.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".frame-wrap.show-options").forEach(wrap => {
            if (wrap !== frameWrap) wrap.classList.remove("show-options");
        });
        frameWrap.classList.toggle("show-options");
    });

    // close button for the modal
    document.addEventListener("click", (e) => {
        document.querySelectorAll(".frame-wrap.show-options").forEach(wrap => {
            wrap.classList.remove("show-options");
        });
    });

    optionsMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    });
    

    frameWrap.appendChild(frameNumber);
    frameWrap.appendChild(newFrame);
    frameWrap.appendChild(optionsButton);
   
    
    let prevFrame = frames[activeFrameIndex];
    let newGrid;
    let newLayers;

    if (importedGrid !== null && importedGrid !== undefined) {
        
       
        newLayers = [createLayerFromGrid("Layer 1", importedGrid)];
    }
    else if (prevFrame && copyFrameToggle.checked) {
        
        
        newLayers = deepCloneLayers(prevFrame.layers);
    } else {
        
        
        newLayers = [createLayerData("Layer 1")];
    }

    const newComposite = buildCompositeGridFromLayers(newLayers);

    const insertIndex = activeFrameIndex + 1;
    frames.splice(insertIndex, 0, {
        grid: newComposite,
        layers: newLayers,
        activeLayerIndex: 0,
        undoStack: [JSON.stringify(newComposite)],
        redoStack: [],
        canvas: newFrame,
        ctx: newFrame.getContext("2d")
    });
    

     const wraps = Array.from(frameContainer.children);
frameContainer.insertBefore(frameWrap, wraps[insertIndex] || null);

    Array.from(frameContainer.children).forEach((wrap, i) => {
        const number = wrap.querySelector('.frame-number');
        if (number) number.textContent = i + 1;
        const canvas = wrap.querySelector('.frame-canvas');
        if (canvas) canvas.id = `frame-${i + 1}`;
    });

    frameWrap.addEventListener("click", () => {
        selectFrame(Array.from(frameContainer.children).indexOf(frameWrap));
    });
    selectFrame(insertIndex);
    saveToLocalStorage();
}



function selectFrame(index) {
    
    document.querySelectorAll(".frame-wrap.active").forEach(f => f.classList.remove("active"));
    document.querySelectorAll(".frame-canvas.active").forEach(c => c.classList.remove("active"));
    

    const frameContainer = document.getElementById("timeline");
    const frameWrap = frameContainer.children[index];
    if(!frameWrap)  return;
    const frameCanvas = frameWrap.querySelector(".frame-canvas");
    frameWrap.classList.add("active");
    frameCanvas.classList.add("active");
    activeFrameIndex = index;
    // Loading Frames
    const frame = frames[activeFrameIndex];
    if (!frame.layers) {
    frame.layers = [createLayerFromGrid("Layer 1", frame.grid)];
    frame.activeLayerIndex = 0;
   }
   layers = frame.layers;
  activeLayerIndex = frame.activeLayerIndex ?? 0;
    
    rebuildLayersUI();

    grid = layers[activeLayerIndex].grid;

    previewIndex = frame.undoStack.length - 1;
    redrawCanvas();
    drawPreviewFromStack(previewIndex);
}

//canvas rendering
function redrawCanvas() {
    
    if (!layers[activeLayerIndex]) return;
    grid = layers[activeLayerIndex].grid;
    

    composeToMainCanvas();
    drawGrid(); 

    if (onionSkinEnabled) {
        drawOnionSkin();
    }

    //this is the cursor hover effect that adapts to the size of each tool
    if (hoverCell &&  activeTool !== null) {
        const pixelSizeInput = document.getElementById("pixel-size");
        const eraseSizeInput = document.getElementById("erase-size");
        let pixelReSize = 1;
        if (activeTool === "pencil") {
         pixelReSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
        }
        else
        if (activeTool === "eraser") {
             pixelReSize = eraseSizeInput ? parseInt(eraseSizeInput.value) : 1;
        }
        else {
            pixelReSize = 1;
        }
        let startX, startY, size;
        if (pixelReSize > 1) {
            if (pixelReSize % 2 !== 0) {
                
                const half = Math.floor(pixelReSize / 2);
                startX = hoverCell.x - half;
                startY = hoverCell.y - half;
            } else {
                
                const half = pixelReSize / 2;
                startX = hoverCell.x - half;
                startY = hoverCell.y - half;
            }
            size = pixelReSize;
        } else {
            startX = hoverCell.x;
            startY = hoverCell.y;
            size = 1;
        }

        ctx.save();
        ctx.strokeStyle = "#ff9800";
        ctx.lineWidth = 2;
        ctx.strokeRect(
            startX * pixelSize + 1,
            startY * pixelSize + 1,
            size * pixelSize - 2,
            size * pixelSize - 2
        );
        ctx.restore();
    }
    syncFrameCompositeAndPreview();//
    refreshAllLayerPreviews();//
}
function syncFrameCompositeAndPreview() {
  const frame = frames[activeFrameIndex];
  if (!frame) return;
  frame.grid = buildCompositeGridFromLayers(layers);
  // aggiorna anteprima timeline
  if (frame.ctx && frame.canvas) {
    const ctxPreview = frame.ctx;
    const cv = frame.canvas;
    const cellW = cv.width / gridWidth, cellH = cv.height / gridHeight;
    ctxPreview.clearRect(0, 0, cv.width, cv.height);
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const c = frame.grid[x][y];
        if (c) {
          ctxPreview.fillStyle = c;
          ctxPreview.fillRect(x * cellW, y * cellH, cellW, cellH);
        }
      }
    }
    ctxPreview.save();
    ctxPreview.strokeStyle = "rgba(0,0,0,0.15)";
    ctxPreview.lineWidth = 1;
    for (let x = 0; x <= gridWidth; x++) {
      ctxPreview.beginPath(); ctxPreview.moveTo(x * cellW, 0); ctxPreview.lineTo(x * cellW, cv.height); ctxPreview.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
      ctxPreview.beginPath(); ctxPreview.moveTo(0, y * cellH); ctxPreview.lineTo(cv.width, y * cellH); ctxPreview.stroke();
    }
    ctxPreview.restore();
  }
}

function drawOnionSkin() {
    const currentFrame = activeFrameIndex;
    
    
    if (currentFrame > 0) {
        const prevFrame = frames[currentFrame - 1];
        if (prevFrame && prevFrame.grid) {
            drawOnionLayer(prevFrame.grid, 'rgba(0, 100, 255, 0.1)');
        }
    }
    
    
    if (currentFrame < frames.length - 1) {
        const nextFrame = frames[currentFrame + 1];
        if (nextFrame && nextFrame.grid) {
            drawOnionLayer(nextFrame.grid, 'rgba(255, 50, 50, 0.1)');
        }
    }
}


function drawOnionLayer(frameGrid, overlayColor) {
    ctx.save();
    
    
    const rgba = overlayColor.match(/rgba?\(([^)]+)\)/)[1].split(',');
    const alpha = parseFloat(rgba[3]);
    
    
    const isBlue = overlayColor.includes('0, 100, 255');
    const tintColor = isBlue ? 'rgba(0, 100, 255, 1)' : 'rgba(255, 50, 50, 1)';
    
    
    ctx.globalAlpha = alpha;
    
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (frameGrid[x][y]) {
                ctx.fillStyle = frameGrid[x][y];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    
    
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.3; 
    ctx.fillStyle = tintColor;
    
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (frameGrid[x][y]) {
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    
   
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.restore();
}
function toggleOnionSkin() {
    onionSkinEnabled = !onionSkinEnabled;
    redrawCanvas();
}
const onionSkinToggle = document.getElementById("onion-skin-toggle");


onionSkinToggle.addEventListener("change", () => {
    toggleOnionSkin();
});

//this function is used for the preview in the frames
function drawPreviewFromStack(index) {
    const frame = frames[activeFrameIndex];
  if (!frame || !frame.ctx || !frame.canvas || !frame.undoStack?.length) return;

  const ctxPreview = frame.ctx;
  const canvasPreview = frame.canvas;
  ctxPreview.clearRect(0, 0, canvasPreview.width, canvasPreview.height);

  if (index < 0 || index >= frame.undoStack.length) return;

  let composite;
  try {
    const state = JSON.parse(frame.undoStack[index]);
    if (Array.isArray(state)) {
      // legacy: grid
      composite = state;
    } else if (state && state.layers) {
      // layers: costruisci composito
      composite = buildCompositeGridFromLayers(state.layers);
    }
  } catch {
    composite = frame.grid; // fallback
  }
  composite = composite || frame.grid || buildCompositeGridFromLayers(layers);

  const cellSizeX = canvasPreview.width / gridWidth;
  const cellSizeY = canvasPreview.height / gridHeight;
  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      const c = composite[x][y];
      if (c) {
        ctxPreview.fillStyle = c;
        ctxPreview.fillRect(x * cellSizeX, y * cellSizeY, cellSizeX, cellSizeY);
      }
    }
  }
  // griglia overlay
  ctxPreview.save();
  ctxPreview.strokeStyle = "rgba(0,0,0,0.15)";
  ctxPreview.lineWidth = 1;
  for (let x = 0; x <= gridWidth; x++) {
    ctxPreview.beginPath();
    ctxPreview.moveTo(x * cellSizeX, 0);
    ctxPreview.lineTo(x * cellSizeX, canvasPreview.height);
    ctxPreview.stroke();
  }
  for (let y = 0; y <= gridHeight; y++) {
    ctxPreview.beginPath();
    ctxPreview.moveTo(0, y * cellSizeY);
    ctxPreview.lineTo(canvasPreview.width, y * cellSizeY);
    ctxPreview.stroke();
  }
  ctxPreview.restore();
}

function drawGrid()
{
   
    for (let x = 0; x < canvas.width; x += pixelSize)
    {
        for(let y = 0; y < canvas.height; y += pixelSize)
        {
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, pixelSize, pixelSize);
            
        }
    }
}
//Here everything starts
drawGrid();
redrawCanvas(); // Initial canvas rendering


//different listeners for mouse events

canvas.addEventListener("mousedown", function(e) {
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);
    lastDrawX = cellX;
    lastDrawY = cellY;
    switch (activeTool) {
        case "pencil":
            isDrawing = true;
            drawingAtMouse(e);
            break;
        case "eraser":
            isDrawing = true;
            eraseAtMouse(e);
            break;
        case "fill":
            fillAtMouse(e);
            break;
        default:
            isDrawing = false;
            break;
    }
});

canvas.addEventListener("mousemove", function(e) {
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);

    if (!hoverCell || hoverCell.x !== cellX || hoverCell.y !== cellY) {
        hoverCell = { x: cellX, y: cellY };
        redrawCanvas();
    }
    if (isDrawing && activeTool === "pencil") {

        if(pixelPerfectToggle.checked) {
        drawLineOnGrid(lastDrawX, lastDrawY, cellX, cellY, getCurrentColorWithOpacity());
        }
        else
        {
        drawingAtMouse(e);
        }
        lastDrawX = cellX;
        lastDrawY = cellY;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
        
        console.log("Drawing at mouse position:", e.offsetX, e.offsetY);

    }
    if (isDrawing && activeTool === "eraser") {
        if(pixelPerfectToggle.checked) {
            drawLineOnGrid(lastDrawX, lastDrawY, cellX, cellY, null);
        }
        else
        {
            eraseAtMouse(e);
        }
        lastDrawX = cellX;
        lastDrawY = cellY;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
        
        console.log("Erasing at mouse position:", e.offsetX, e.offsetY);
    }

    
    
});

function isGridChanged() {
    const frame = frames[activeFrameIndex];
  if (!frame || !frame.undoStack || frame.undoStack.length === 0) return true;

  const currentComposite = buildCompositeGridFromLayers(layers);
  let last = frame.undoStack[frame.undoStack.length - 1];
  try {
    const parsed = JSON.parse(last);
    if (Array.isArray(parsed)) {
      // legacy: parsed è una grid
      return JSON.stringify(currentComposite) !== JSON.stringify(parsed);
    } else if (parsed && parsed.layers) {
      // nuovo formato: ricomponi
      const prevComposite = buildCompositeGridFromLayers(parsed.layers);
      return JSON.stringify(currentComposite) !== JSON.stringify(prevComposite);
    }
  } catch {
    // se non è JSON, fallback
  }
  return true;
}

canvas.addEventListener("mouseup", function() {
    isDrawing = false;
    lastDrawX = null;
    lastDrawY = null;
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        saveState();
        const frame = frames[activeFrameIndex];
        if (frame) frame.redoStack = [];
    }
});


document.addEventListener("mouseup", function() {
    if (!isDrawing) return;
    isDrawing = false;
    lastDrawX = null;
    lastDrawY = null;
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        saveState();
        const frame = frames[activeFrameIndex];
        if (frame) frame.redoStack = [];
    }
});


canvas.addEventListener("mouseleave", function() {
    
    hoverCell = null;
    redrawCanvas();
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        saveState();
        const frame = frames[activeFrameIndex];
        if (frame) frame.redoStack = [];
    }
});

//setting grid size
x64Button.addEventListener("click", () => {

    confirmGridResize(() => {
    pixelSize = 8;
    setGridSize();
    });
});
x16Button.addEventListener("click", () => {
    confirmGridResize(() => {
    pixelSize = 32;
    setGridSize();
    });
}
);
x32Button.addEventListener("click", () => {
    confirmGridResize(() => {
    pixelSize = 16;
    setGridSize();
    });
}
);


//selecting tools
pencilButton.addEventListener("click", () => {
    if (activeTool === "pencil") {
        
    activeTool = null;
    pencilButton.classList.remove("active"); 
    
    
  } else {
    
    activeTool = "pencil";
    pencilButton.classList.add("active");
    eraserButton.classList.remove("active");
    fillButton.classList.remove("active");
  }
  updateCursor();
});

eraserButton.addEventListener("click", () => {
    if (activeTool === "eraser") {
        
        activeTool = null;
        eraserButton.classList.remove("active");
    } else {
        
        activeTool = "eraser";
        eraserButton.classList.add("active");
        pencilButton.classList.remove("active");
        fillButton.classList.remove("active");
    }
    updateCursor();
}
);

fillButton.addEventListener("click", () => {
    if (activeTool === "fill") {
        activeTool = null;
        fillButton.classList.remove("active");
    } else {
        activeTool = "fill";
        fillButton.classList.add("active");
        pencilButton.classList.remove("active");
        eraserButton.classList.remove("active");
    }
    updateCursor();
}
);

hMirrorButton.addEventListener("click", () => {
    horizontalMirroring();
});

vMirrorButton.addEventListener("click", () => {
    verticalMirroring();
});

//undo and redo functionality


function saveState() {
  const frame = frames[activeFrameIndex];
  if (!frame) return;

  // aggiorna composito
  const composite = buildCompositeGridFromLayers(layers);
  frame.grid = composite;

  // push snapshot layers
  frame.undoStack = frame.undoStack || [];
  frame.redoStack = [];
  frame.undoStack.push(snapshotLayersState());

  previewIndex = frame.undoStack.length - 1;
  drawPreviewFromStack(previewIndex);
  saveToLocalStorage();
}

undoButton.addEventListener("click", () => {
    const frame = frames[activeFrameIndex];
  if (!frame || frame.undoStack.length <= 1) return;

  // Sposta lo stato corrente su redo
  frame.redoStack.push(snapshotLayersState());

  // Rimuovi lo stato corrente e ripristina il precedente
  frame.undoStack.pop();
  const prevSnap = frame.undoStack[frame.undoStack.length - 1];
  restoreFromSnapshot(prevSnap);

  previewIndex = frame.undoStack.length - 1;
  drawPreviewFromStack(previewIndex);
});
redoButton.addEventListener("click", () => {
    const frame = frames[activeFrameIndex];
  if (!frame || frame.redoStack.length === 0) return;

  // Porta lo stato redo in undo e ripristinalo
  const snap = frame.redoStack.pop();
  frame.undoStack.push(snap);
  restoreFromSnapshot(snap);

  previewIndex = frame.undoStack.length - 1;
  drawPreviewFromStack(previewIndex);
});




//tools functions

//pencil

//Bresenham
function drawLineOnGrid(x0, y0, x1, y1, color) {
    if (x0 === null || y0 === null) return;
    
    // Get the tool size based on active tool
    let toolSize = 1;
    if (activeTool === "pencil") {
        const pixelSizeInput = document.getElementById("pixel-size");
        toolSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
    } else if (activeTool === "eraser") {
        const eraseSizeInput = document.getElementById("erase-size");
        toolSize = eraseSizeInput ? parseInt(eraseSizeInput.value) : 1;
    }
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    
    while (true) {
        // Draw area of toolSize centered on current point
        drawToolArea(x, y, toolSize, color);
        
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

// Helper function to draw an area with the specified tool size
function drawToolArea(centerX, centerY, toolSize, color) {
    if (toolSize <= 1) {
        // Single pixel
        if (centerX >= 0 && centerX < gridWidth && centerY >= 0 && centerY < gridHeight) {
            grid[centerX][centerY] = color;
        }
        return;
    }
    
    // Multiple pixels - handle both odd and even sizes
    let startX, startY;
    if (toolSize % 2 !== 0) {
        // Odd size - center perfectly
        const halfSize = Math.floor(toolSize / 2);
        startX = centerX - halfSize;
        startY = centerY - halfSize;
    } else {
        // Even size - offset slightly
        const halfSize = toolSize / 2;
        startX = Math.floor(centerX - halfSize);
        startY = Math.floor(centerY - halfSize);
    }
    
    // Draw the area
    for (let x = startX; x < startX + toolSize; x++) {
        for (let y = startY; y < startY + toolSize; y++) {
            if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                grid[x][y] = color;
            }
        }
    }
}

function drawingAtMouse(e)
{
    if (!isDrawing || activeTool !== "pencil") {
        return;
    }
    const colorPicker = document.getElementById("color-picker");
    const currentColor = getCurrentColorWithOpacity();
const pixelSizeInput = document.getElementById("pixel-size");
    const pixelReSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
    //Adjust the pixel size based on the input value
    if (pixelReSize > 1) {
        if (pixelReSize % 2 !== 0) {
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = Math.floor(pixelReSize / 2);
            for (let x = cellX - halfSize; x <= cellX + halfSize; x++) {
                for (let y = cellY - halfSize; y <= cellY + halfSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {

                        grid[x][y] = currentColor;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
        else {
    
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = pixelReSize / 2;
            
            const startX = Math.floor(cellX - halfSize );
            const startY = Math.floor(cellY - halfSize );
            for (let x = startX; x < startX + pixelReSize; x++) {
                for (let y = startY; y < startY + pixelReSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[x][y] = currentColor;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
    }   
    else {
        const cellX = Math.floor(e.offsetX / pixelSize);
        const cellY = Math.floor(e.offsetY / pixelSize);
        grid[cellX][cellY] = currentColor;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
    }
}


//eraser
function eraseAtMouse(e) {
    if (!isDrawing || activeTool !== "eraser") {
        return;
    }
    const pixelSizeInput = document.getElementById("erase-size");
    const pixelReSize = pixelSizeInput ? parseInt(pixelSizeInput.value) : 1;
    //same adjustment as the pencil
    if (pixelReSize > 1) {
        if (pixelReSize % 2 !== 0) {
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = Math.floor(pixelReSize / 2);
            for (let x = cellX - halfSize; x <= cellX + halfSize; x++) {
                for (let y = cellY - halfSize; y <= cellY + halfSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[x][y] = null;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
        else {
    
            const cellX = Math.floor(e.offsetX / pixelSize);
            const cellY = Math.floor(e.offsetY / pixelSize);
            const halfSize = pixelReSize / 2;
            
            const startX = Math.floor(cellX - halfSize );
            const startY = Math.floor(cellY - halfSize );
            for (let x = startX; x < startX + pixelReSize; x++) {
                for (let y = startY; y < startY + pixelReSize; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[x][y] = null;
                    }
                }
            }
            redrawCanvas();
            drawPreviewFromStack(previewIndex);
        }
    }   
    else {
        const cellX = Math.floor(e.offsetX / pixelSize);
        const cellY = Math.floor(e.offsetY / pixelSize);
        grid[cellX][cellY] = null;
        redrawCanvas();
        drawPreviewFromStack(previewIndex);
    }
}

//fill
function fillAtMouse(e) {
    if (activeTool !== "fill") return;
    const currentColor = getCurrentColorWithOpacity();
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);
    if (grid[cellX][cellY] === currentColor) return;
    const targetColor = grid[cellX][cellY];
    floodFill(cellX, cellY, targetColor, currentColor);
    redrawCanvas();
    saveState();
    drawPreviewFromStack(previewIndex);
}

function floodFill(x, y, targetColor, replacementColor) {
    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
        return;
    }
    if (grid[x][y] !== targetColor) {
        return;
    }
    grid[x][y] = replacementColor;
    
    // Recursively fill adjacent cells, this repeats until all connected 
    // cells of the target color are filled
    // with the replacement color.
    // (ik not the most efficient way, but works for this purpose)
    
       floodFill(x + 1, y, targetColor, replacementColor);
    
    
       floodFill(x, y + 1, targetColor, replacementColor);
    
    
       floodFill(x - 1, y, targetColor, replacementColor);
    
    
       floodFill(x, y - 1, targetColor, replacementColor);
    
}

//pulse effect on buttons

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
        btn.classList.remove('pulse');
        void btn.offsetWidth;
        btn.classList.add('pulse');
    });
    
});

//save or load color

function hexToRgb(hex, opacity) {
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
        
    hex = hex.replace(/^#/, '');
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    const alpha = opacity / 100;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

colorSave.addEventListener("click", () => {
    const currentColor = getCurrentColorWithOpacity();
  const colorList = document.getElementById("color-list");
  const alreadyExists = Array.from(colorList.children).some(div => {
    const savedColor = div.getAttribute("data-color");
    if (!currentColor.startsWith('rgba') && !savedColor.startsWith('rgba')) {
      return currentColor.toLowerCase() === savedColor.toLowerCase(); // fix
    }
    const currentNormalized = normalizeColor(currentColor);
    const savedNormalized = normalizeColor(savedColor);
    return currentNormalized === savedNormalized;
  });
  if (alreadyExists) return;
    const newColorDiv = document.createElement("div");
    newColorDiv.className = "color";
    newColorDiv.style.backgroundColor = currentColor;
    newColorDiv.setAttribute("data-color", currentColor);
    newColorDiv.setAttribute("data-opacity", currentOpacity);
    newColorDiv.addEventListener("click", () => {
        const savedColor = newColorDiv.getAttribute("data-color");
        const savedOpacity = newColorDiv.getAttribute("data-opacity") || "100";
        
        if(savedColor.startsWith('rgba'))
        {
        const match = savedColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
            if (match) {
                const r = parseInt(match[1]);
                const g = parseInt(match[2]);
                const b = parseInt(match[3]);
                const hexColor = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                document.getElementById("color-picker").value = hexColor;
                
                
                currentOpacity = parseInt(savedOpacity);
                document.getElementById("opacity-slider").value = currentOpacity;
                document.getElementById("opacity-value").textContent = `${currentOpacity}%`;
            }
        }
        else
        {
            document.getElementById("color-picker").value = savedColor;
            currentOpacity = 100;
            document.getElementById("opacity-slider").value = 100;
            document.getElementById("opacity-value").textContent = "100%";
        }

        activeTool = "pencil";
        newColorDiv.classList.remove("pulse");
        void newColorDiv.offsetWidth;
        newColorDiv.classList.add("pulse");
        pencilButton.classList.add("active");
        eraserButton.classList.remove("active");
        fillButton.classList.remove("active");

        updateColorPreview();
    });
    
    colorList.appendChild(newColorDiv);
    saveToLocalStorage();
});

function normalizeColor(color) {
    if(!color) return "";

    if(color.startsWith('rgba')) {
        return color.replace(/\s+/g, '').toLowerCase();
    }

    if(color.startsWith('#')) {
        const rgba = hexToRgb(color, 100);
        return rgba.replace(/\s/g, '').toLowerCase();
    }

    return color.toLowerCase();
}

// Pixel size and erase size inputs
const pixelSizeInputs = document.querySelectorAll('input[id="pixel-size"]');
pixelSizeInputs.forEach(input => {
    input.addEventListener('input', () => {
        activeTool = "pencil";
        pencilButton.classList.add("active");
        eraserButton.classList.remove("active");
        fillButton.classList.remove("active");
    });
});

const eraseSizeInputs = document.querySelectorAll('input[id="erase-size"]');
eraseSizeInputs.forEach(input => {
    input.addEventListener('input', () => {
        activeTool = "eraser";
        eraserButton.classList.add("active");
        pencilButton.classList.remove("active");
        fillButton.classList.remove("active");
    });
});

// This add the first frame to the timeline when the page loads
addFrame.addEventListener("click", createNewFrame);

window.addEventListener("DOMContentLoaded", () => {
     if (localStorage.getItem("frames")) {
    loadFromLocalStorage();
    for (let i = 0; i < frames.length; i++) selectFrame(i);
    selectFrame(0);
  } else {
    createNewFrame();
    // Assicura layers sul primo frame
    if (!frames[0].layers) {
      frames[0].layers = [createLayerData("Layer 1")];
      frames[0].activeLayerIndex = 0;
      frames[0].grid = buildCompositeGridFromLayers(frames[0].layers);
      frames[0].undoStack = [JSON.stringify(frames[0].grid)];
      frames[0].redoStack = [];
    }
    selectFrame(0);
  }
    activeTool = "pencil";
    updateCursor();
    pencilButton.classList.add("active");

    //opacity slider functionality
    const opacitySlider = document.getElementById("opacity-slider");
    const opacityValue = document.getElementById("opacity-value");
    if (opacitySlider && opacityValue) {
        opacitySlider.addEventListener('input', (e) => {
            currentOpacity = parseInt(e.target.value);
            opacityValue.textContent = `${currentOpacity}%`;
            
            
            const opacity = currentOpacity / 100;
            opacitySlider.style.background = `linear-gradient(to right, 
                rgba(255, 255, 255, 0.2), 
                rgba(47, 191, 113, ${opacity}))`;
                
            
            updateColorPreview();
        });
    }
});

function confirmGridResize(callback) {
    if (confirm("*Changing size will delete every frame*\nAre you sure you want to continue?")) {
        callback();
    }
}

function setGridSize() {

    // Update pixel size and grid dimensions to the frames
    gridWidth = Math.floor(canvas.width / pixelSize);
    gridHeight = Math.floor(canvas.height / pixelSize);
    // This deletes all frames from the timeline
    const frameContainer = document.getElementById("timeline");
    while (frameContainer.firstChild) {
        frameContainer.removeChild(frameContainer.firstChild);
    }
    // Reset
    frames = [];
    activeFrameIndex = 0;
    
    grid = [];
    for (let x = 0; x < gridWidth; x++) {
        grid[x] = [];
        for (let y = 0; y < gridHeight; y++) {
            grid[x][y] = null;
        }
    }
    
    
    previewIndex = 0;
    // Create the first frame (again)
    createNewFrame();
    redrawCanvas();
}

function exportCanvasWithTransparentBg(callback) {
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const composite = buildCompositeGridFromLayers();
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            const col = composite[x][y];
            if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }

    // export the canvas as PNG
    callback();

    // Restore the original image data
    ctx.putImageData(imageData, 0, 0);
}

function exportSpecificFrameAsPNG(frameIndex, filename = "frame") {
    const frame = frames[frameIndex];
    if (!frame) {
        alert("Frame non trovato!");
        return;
    }

    // Create a temporary canvas to draw the frame
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    
    const composite = Array.isArray(frame.layers) && frame.layers.length
    ? buildCompositeGridFromLayers(frame.layers)
    : frame.grid;

    
    
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            const col = composite[x][y];
            if (col) {
                tempCtx.fillStyle = col;
                tempCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }

    // Export the temporary canvas as PNG
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
}


// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Check if user is typing in an input field
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.isContentEditable
    );
    
    // If user is typing in an input, don't activate shortcuts
    if (isInputActive) {
        return;
    }

    const pixelSizeInput = document.getElementById("pixel-size");
    const eraseSizeInput = document.getElementById("erase-size");
    if(exportModal.style.display === "block") {
        return;
    }
        if (e.ctrlKey) {
            e.preventDefault();
            addFrame.click();
        }
        
        if (e.key === "z" || e.key === "Z") {
            e.preventDefault();
            undoButton.click();
        }

        if (e.key === "x" || e.key === "X") {
            e.preventDefault();
            redoButton.click();
        }

        if(e.key === "b" || e.key === "B")
        {
            e.preventDefault();
            if (activeTool === "pencil") {
                activeTool = null;
                pencilButton.classList.remove("active");
                
            }
            else {
                activeTool = "pencil";
                pencilButton.classList.add("active");
                eraserButton.classList.remove("active");
                fillButton.classList.remove("active");
            }
            redrawCanvas();
            updateCursor();
        }

        if(e.key === "e" || e.key === "E")
        {
            e.preventDefault();
            if (activeTool === "eraser") {
                activeTool = null;
                eraserButton.classList.remove("active");
            }
            else {
                activeTool = "eraser";
                eraserButton.classList.add("active");
                pencilButton.classList.remove("active");
                fillButton.classList.remove("active");
            }
            redrawCanvas();
            updateCursor();
        }
        if(e.key === "f" || e.key === "F")
        {
            console.log("Fill tool activated");
            e.preventDefault();
            if (activeTool === "fill") {
                activeTool = null;
                fillButton.classList.remove("active");
            }
            else {
                activeTool = "fill";
                fillButton.classList.add("active");
                pencilButton.classList.remove("active");
                eraserButton.classList.remove("active");
            }
            redrawCanvas();
            updateCursor();
        }

        if (e.key === ".") {
            e.preventDefault();
            copyFrameToggle.checked = !copyFrameToggle.checked;
            
            copyFrameToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if(activeTool === "pencil")
        {
            if (e.key === "ArrowUp") {
                e.preventDefault();
                pixelSizeInput.value = Math.min(parseInt(pixelSizeInput.value) + 1, 20);
                pixelSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
                redrawCanvas();
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                pixelSizeInput.value = Math.max(parseInt(pixelSizeInput.value) - 1, 1);
                pixelSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
                redrawCanvas();
                
            }
        }
        else if(activeTool === "eraser")
        {
            if (e.key === "ArrowUp") {
                e.preventDefault();
                eraseSizeInput.value = Math.min(parseInt(eraseSizeInput.value) + 1, 20);
                eraseSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
                redrawCanvas();
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                eraseSizeInput.value = Math.max(parseInt(eraseSizeInput.value) - 1, 1);
                eraseSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
                redrawCanvas();
            }
        }

        if (e.key === "s" || e.key === "S") {
            e.preventDefault();
            colorSave.click();
        }

        if (e.key === "h" || e.key === "H") {
            e.preventDefault();
            hMirrorButton.click();
        }
        
        if (e.key === "v" || e.key === "V") {
            e.preventDefault();
            vMirrorButton.click();
        }

        if (e.key === "Escape") {
            modal.style.display = "none";
        }

        if (e.key === "p" || e.key === "P") {
            e.preventDefault();
            pixelPerfectToggle.checked = !pixelPerfectToggle.checked;
            pixelPerfectToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (e.key === "o" || e.key === "O") {
            e.preventDefault();
            onionSkinToggle.checked = !onionSkinToggle.checked;
            onionSkinToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
    
});


questionButton.addEventListener("click", () => {
    modal.style.display = "block";
});

closeButton.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("themechange", (e) => {
    
    redrawCanvas();
});


// localStorage functions
function saveToLocalStorage() {
  const framesData = frames.map(frame => ({
    grid: frame.grid, 
    layers: frame.layers ? frame.layers.map(L => ({
      name: L.name,
      visible: L.visible,
      grid: L.grid
    })) : undefined,
    activeLayerIndex: frame.activeLayerIndex ?? 0,
    undoStack: frame.undoStack,
    redoStack: frame.redoStack
  }));
  const colorList = document.getElementById("color-list");
  const palette = Array.from(colorList.children).map(div => div.getAttribute("data-color"));
  localStorage.setItem("palette", JSON.stringify(palette));
  localStorage.setItem("frames", JSON.stringify(framesData));
}


function loadFromLocalStorage() {
  const framesData = JSON.parse(localStorage.getItem("frames"));
  const palette = JSON.parse(localStorage.getItem("palette"));

  if (framesData && Array.isArray(framesData)) {
    const frameContainer = document.getElementById("timeline");
    while (frameContainer.firstChild) frameContainer.removeChild(frameContainer.firstChild);
    frames.length = 0;
    activeFrameIndex = 0;

    framesData.forEach((fd, i) => {
      createNewFrame(); 
      
      if (fd.layers && Array.isArray(fd.layers)) {
        frames[i].layers = fd.layers.map(L => {
          const nl = createLayerData(L.name || `Layer`);
          nl.visible = (L.visible !== false);
          nl.grid = deepCloneGrid(L.grid);
          return nl;
        });
        frames[i].activeLayerIndex = fd.activeLayerIndex ?? 0;
      } else {
        
        frames[i].layers = [createLayerFromGrid("Layer 1", fd.grid)];
        frames[i].activeLayerIndex = 0;
      }
      
      const composite = buildCompositeGridFromLayers(frames[i].layers);
      frames[i].grid = composite;
      frames[i].undoStack = fd.undoStack && fd.undoStack.length ? fd.undoStack : [JSON.stringify(composite)];
      frames[i].redoStack = fd.redoStack || [];
    });
    selectFrame(0);
  }

    // Create Palette from stored colors
    if (palette && Array.isArray(palette)) {
        const colorList = document.getElementById("color-list");
        colorList.innerHTML = "";
        palette.forEach(color => {
            const newColorDiv = document.createElement("div");
            newColorDiv.className = "color";
            newColorDiv.style.backgroundColor = color;
            newColorDiv.addEventListener("click", () => {
                document.getElementById("color-picker").value = color;
                activeTool = "pencil";
                newColorDiv.classList.remove("pulse");
                void newColorDiv.offsetWidth;
                newColorDiv.classList.add("pulse");
                pencilButton.classList.add("active");
                eraserButton.classList.remove("active");
                fillButton.classList.remove("active");
            });
            colorList.appendChild(newColorDiv);
        });
    }
}

const deleteProjectButton = document.getElementById("delete-project");
if (deleteProjectButton) {
    deleteProjectButton.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete the project? This action cannot be undone.")) {
            localStorage.removeItem("frames");
            localStorage.removeItem("palette");
            // Reset editor
            const frameContainer = document.getElementById("timeline");
            while (frameContainer.firstChild) frameContainer.removeChild(frameContainer.firstChild);
            frames.length = 0;
            activeFrameIndex = 0;
            grid = [];
            for (let x = 0; x < gridWidth; x++) {
                grid[x] = [];
                for (let y = 0; y < gridHeight; y++) {
                    grid[x][y] = null;
                }
            }
            
            pauseAnimation();
            createNewFrame();
            selectFrame(0);
            const colorList = document.getElementById("color-list");
            if (colorList) colorList.innerHTML = "";
            redrawCanvas();

           
            previewIndex = 0;
            
            // Reset the import input
            const importProjectInput = document.getElementById("import-project");
            if (importProjectInput) {
                importProjectInput.value = "";
            }
            
        }
    });
}

export function setGridParams({ width, height, pixel }) {
    gridWidth = width;
    gridHeight = height;
    pixelSize = pixel;

    grid = [];
    for (let x = 0; x < gridWidth; x++) {
        grid[x] = [];
        for (let y = 0; y < gridHeight; y++) {
            grid[x][y] = null;
        }
    }
}

const importProjectBtn = document.getElementById("import-button");
const importProjectInput = document.getElementById("import-project");

importProjectBtn.addEventListener("click", () => {
    importProjectInput.click();
});

importProjectInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        // Reset the input value to allow re-importing the same file
        e.target.value = "";
        
        
        import("./import.js").then(module => {
            if (module && module.importProjectFromFile) {
                module.importProjectFromFile(file);
            } else {
                console.error("Import module not loaded correctly");
                alert("Error loading import module. Please refresh the page and try again.");
            }
        }).catch(error => {
            console.error("Error importing module:", error);
            alert("Error importing project. Please refresh the page and try again.");
        });
    }
});

export function getCurrentPalette() {
    const colorList = document.getElementById("color-list");
    if (!colorList) return [];
    
    return Array.from(colorList.children).map(div => {
         let color = div.getAttribute("data-color") || 
                   div.style.backgroundColor || 
                   div.dataset.color;
               
               if (color && color.startsWith('rgb')) {
            color = rgbToHex(color);
        }
        return color;
    }).filter(color => color);

    
}


function rgbToHex(rgb) {
    
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return rgb;
    
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    
   
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function handleDragStart(e) {
    draggedElement = this;
    const frameContainer = document.getElementById("timeline");
    draggedIndex = Array.from(frameContainer.children).indexOf(this);
    
    
    this.style.opacity = '0.5';
    this.classList.add('dragging');
    
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); 
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); 
    }
    
    if (draggedElement !== this) {
        const frameContainer = document.getElementById("timeline");
        const targetIndex = Array.from(frameContainer.children).indexOf(this);
        
        
        const draggedFrame = frames.splice(draggedIndex, 1)[0];
        frames.splice(targetIndex, 0, draggedFrame);
        
        
        if (draggedIndex < targetIndex) {
            frameContainer.insertBefore(draggedElement, this.nextSibling);
        } else {
            frameContainer.insertBefore(draggedElement, this);
        }
        
        
        updateFrameNumbers();
        
       
        if (activeFrameIndex === draggedIndex) {
            activeFrameIndex = targetIndex;
        } else if (activeFrameIndex === targetIndex) {
            activeFrameIndex = draggedIndex;
        }
        
        
        saveToLocalStorage();
    }
    
    return false;
}

function handleDragEnd(e) {
    // Ripristina lo stile
    this.style.opacity = '';
    this.classList.remove('dragging');
    
    // Rimuovi le classi di stile da tutti i frame
    document.querySelectorAll('.frame-wrap').forEach(frame => {
        frame.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedIndex = null;
}

function updateFrameNumbers() {
    const frameContainer = document.getElementById("timeline");
    Array.from(frameContainer.children).forEach((wrap, i) => {
        const number = wrap.querySelector('.frame-number');
        if (number) number.textContent = i + 1;
        const canvas = wrap.querySelector('.frame-canvas');
        if (canvas) canvas.id = `frame-${i + 1}`;
    });
}

function getCurrentColorWithOpacity() {
    const colorPicker = document.getElementById("color-picker");
    const currentColor = colorPicker ? colorPicker.value : "#000000";

    if(currentOpacity < 100) {
        return hexToRgb(currentColor, currentOpacity);
    }
    return currentColor;
}

function updateColorPreview() {
    const colorPicker = document.getElementById("color-picker");
    const colorPickerWrap = document.getElementById("color-picker-wrap");

    if(colorPicker && colorPickerWrap) {
        const currentColor = getCurrentColorWithOpacity();
        colorPickerWrap.style.setProperty('--current-opacity', currentOpacity / 100);

        colorPicker.dataset.opacity = currentOpacity;
    }
}

function updateCursor()
{
    const canvas = document.getElementById("pixel-canvas");
    canvas.classList.remove('cursor-pencil');
    canvas.classList.remove('cursor-eraser');
    canvas.classList.remove('cursor-fill');

    if(activeTool === "pencil")
    {
        
        canvas.classList.remove('cursor-eraser');
        canvas.classList.remove('cursor-fill');
        canvas.classList.add('cursor-pencil');
    }
    else if(activeTool === "eraser")
    {
        canvas.classList.remove('cursor-fill');
        canvas.classList.remove('cursor-pencil');
        canvas.classList.add('cursor-eraser');
    }
    else if(activeTool === "fill")
    {
        
         canvas.classList.remove('cursor-pencil');
        canvas.classList.remove('cursor-eraser');
        canvas.classList.add('cursor-fill');
    }
    else
    {
        canvas.classList.remove('cursor-pencil');
        canvas.classList.remove('cursor-eraser');
        canvas.classList.remove('cursor-fill');
    }

};



function horizontalMirroring()
{
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < Math.floor(gridWidth / 2); x++) {
            const oppositeX = gridWidth - 1 - x;
            const temp = grid[x][y];
            grid[x][y] = grid[oppositeX][y];
            grid[oppositeX][y] = temp;
        }
    }
    redrawCanvas();
    saveState();
    drawPreviewFromStack(previewIndex);
}

function verticalMirroring()
{
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < Math.floor(gridHeight / 2); y++) {
            const oppositeY = gridHeight - 1 - y;
            const temp = grid[x][y];
            grid[x][y] = grid[x][oppositeY];
            grid[x][oppositeY] = temp;
        }
    }
    redrawCanvas();
    saveState();
    drawPreviewFromStack(previewIndex);
}

function updateLayerNumbers() {
  const container = document.getElementById("layer-container");
  if (!container) return;
  Array.from(container.children).forEach((wrap, i) => {
    const label = wrap.querySelector(".layer-label");
    if (label) label.textContent = `Layer ${i + 1}`;
  });
}

// array layers
function applyOrderFromDOM() {
  const container = document.getElementById("layer-container");
  if (!container) return;

  const newOrderEls = Array.from(container.children);
  const byId = Object.fromEntries(layers.map(L => [L.id, L]));
  const newLayers = [];

  newOrderEls.forEach(wrap => {
    const id = wrap.dataset.layerId;
    let L = id ? byId[id] : null;
    if (!L) L = layers.find(Lx => Lx.wrapEl === wrap);
    if (L) newLayers.push(L);
  });

  const currentActive = layers[activeLayerIndex];
  layers = newLayers;
  activeLayerIndex = Math.max(0, layers.indexOf(currentActive));

  if (frames[activeFrameIndex]) {
    frames[activeFrameIndex].layers = layers;
    frames[activeFrameIndex].activeLayerIndex = activeLayerIndex;
  }
  updateLayerNumbers();
  setActiveLayer(activeLayerIndex);
  redrawCanvas();
}


function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.layer-wrap:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function addLayerUI(L, insertIndex = null) {
  const container = document.getElementById("layer-container");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "layer-wrap";
  wrap.draggable = true;

  // Preview
  const prev = document.createElement("canvas");
  prev.width = 96; prev.height = 96;
  prev.className = "layer-canvas";
  const pctx = prev.getContext("2d");

  const label = document.createElement("span");
  label.className = "layer-label";
  label.textContent = L.name || `Layer ${container.children.length + 1}`;

  const visBtn = document.createElement("button");
  visBtn.className = "layer-vis-btn";
  const updateEye = () => visBtn.textContent = L.visible ? "👁️" : "🚫";
  updateEye();
  visBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    L.visible = !L.visible;
    updateEye();
    redrawCanvas();
  });

  const delBtn = document.createElement("button");
  delBtn.className = "delete-layer-btn";
  delBtn.title = "Delete";
  delBtn.textContent = "×";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const idx = layers.indexOf(L);
    if (idx >= 0 && layers.length > 1) {
      layers.splice(idx, 1);
      container.removeChild(wrap);
      const newIdx = Math.max(0, Math.min(activeLayerIndex, layers.length - 1));
      setActiveLayer(newIdx);
      updateLayerNumbers();
      redrawCanvas();
      saveState?.();
    }
  });

  wrap.addEventListener("click", () => {
    const idx = Array.from(container.children).indexOf(wrap);
    setActiveLayer(idx);
  });

  // Drag & drop
  wrap.addEventListener("dragstart", (e) => {
    wrap.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", L.id);
  });
  wrap.addEventListener("dragend", () => {
    wrap.classList.remove("dragging");
    applyOrderFromDOM();
  });

  // Mount
  const left = document.createElement("div");
  left.style.display = "flex"; left.style.alignItems = "center"; left.style.gap = "8px";
  left.appendChild(prev); left.appendChild(label);

  const right = document.createElement("div");
  right.style.marginLeft = "auto"; right.style.display = "flex"; right.style.gap = "6px";
  right.appendChild(visBtn); right.appendChild(delBtn);

  wrap.appendChild(left); wrap.appendChild(right);

  if (insertIndex !== null && insertIndex >= 0 && insertIndex <= container.children.length) {
    const ref = container.children[insertIndex] || null;
    container.insertBefore(wrap, ref);
  } else {
    container.appendChild(wrap);
  }

 
  wrap.dataset.layerId = L.id;
  L.previewCanvas = prev;
  L.previewCtx = pctx;
  L.wrapEl = wrap;

  drawLayerPreview(L);


  if (!container._dragoverBound) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const dragging = container.querySelector('.layer-wrap.dragging');
      if (!dragging) return;
      if (afterElement == null) {
        container.appendChild(dragging);
      } else {
        container.insertBefore(dragging, afterElement);
      }
    });
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      applyOrderFromDOM();
    });
    container._dragoverBound = true;
  }

  updateLayerNumbers();
}

function drawLayerPreview(L) {
  if (!L.previewCanvas || !L.previewCtx) return;
  const pc = L.previewCanvas, pctx = L.previewCtx;
  pctx.clearRect(0, 0, pc.width, pc.height);
  const cellW = pc.width / gridWidth, cellH = pc.height / gridHeight;
  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      const c = L.grid[x][y];
      if (c) { pctx.fillStyle = c; pctx.fillRect(x * cellW, y * cellH, cellW, cellH); }
    }
  }
}
function refreshAllLayerPreviews() { layers.forEach(drawLayerPreview); }

function rebuildLayersUI() {
  const container = document.getElementById("layer-container");
  if (!container) return;
  container.innerHTML = "";
  layers.forEach((L, i) => addLayerUI(L, i));
  setActiveLayer(frames[activeFrameIndex].activeLayerIndex ?? 0);
}

function setActiveLayer(index) {
  if (index < 0 || index >= layers.length) return;
  activeLayerIndex = index;
  if (frames[activeFrameIndex]) frames[activeFrameIndex].activeLayerIndex = activeLayerIndex;
  grid = layers[activeLayerIndex].grid;

  const container = document.getElementById("layer-container");
  if (container) {
    Array.from(container.children).forEach((el, i) => {
      el.classList.toggle("active", i === activeLayerIndex);
    });
  }
  redrawCanvas();
}


const addLayerBtn = document.getElementById("add-layer-btn");
addLayerBtn?.addEventListener("click", () => {
 const insertIndex = Math.min(activeLayerIndex + 1, layers.length);
  const L = createLayerData(`Layer ${insertIndex + 1}`);
  layers.splice(insertIndex, 0, L);
  addLayerUI(L, insertIndex);
  updateLayerNumbers();
  setActiveLayer(insertIndex);
  saveState?.();
});

(function initDrawer() {
  const drawer = document.getElementById('layers-drawer');
  const toggleBtn = document.getElementById('layers-toggle');
  const closeBtn = document.getElementById('layers-close');
  const overlay = document.querySelector('.layers-overlay');
  if (!drawer || !toggleBtn || !overlay) return;
  function openDrawer() {
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    toggleBtn.classList.add('open'); toggleBtn.setAttribute('aria-expanded','true');
    overlay.classList.add('show'); document.body.classList.add('layers-open');
  }
  function closeDrawer() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    toggleBtn.classList.remove('open'); toggleBtn.setAttribute('aria-expanded','false');
    overlay.classList.remove('show'); document.body.classList.remove('layers-open');
  }
  toggleBtn.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
  closeBtn?.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
})();

function snapshotLayersState() {
  return JSON.stringify({
    layers: deepCloneLayers(layers),
    activeLayerIndex
  });
}

// Ripristina da snapshot (supporta legacy: array grid)
function restoreFromSnapshot(snap) {
  let parsed;
  try { parsed = JSON.parse(snap); } catch { parsed = null; }
  if (!parsed) return;

  if (Array.isArray(parsed)) {
    // Legacy: snap è la grid composita -> crea un layer unico da quella
    const newLayers = [createLayerFromGrid("Layer 1", parsed)];
    frames[activeFrameIndex].layers = newLayers;
    frames[activeFrameIndex].activeLayerIndex = 0;
    layers = newLayers;
    activeLayerIndex = 0;
  } else if (parsed.layers) {
    // Nuovo formato: layers + indice attivo
    const newLayers = deepCloneLayers(parsed.layers);
    const idx = Math.min(
      parsed.activeLayerIndex ?? 0,
      Math.max(0, newLayers.length - 1)
    );
    frames[activeFrameIndex].layers = newLayers;
    frames[activeFrameIndex].activeLayerIndex = idx;
    layers = newLayers;
    activeLayerIndex = idx;
  }

  // Riallinea alias grid, UI e composito
  grid = layers[activeLayerIndex].grid;
  rebuildLayersUI?.();
  // Aggiorna snapshot composito del frame
  frames[activeFrameIndex].grid = buildCompositeGridFromLayers(layers);
  redrawCanvas();
}



export{exportCanvasWithTransparentBg};

export {frames, activeFrameIndex, selectFrame, gridHeight, gridWidth, pixelSize, activeTool};

window.createFrameWithImportedGrid = createFrameWithImportedGrid;
window.drawPreviewFromStack = drawPreviewFromStack;
window.saveToLocalStorage = saveToLocalStorage;
window.redrawCanvas = redrawCanvas;