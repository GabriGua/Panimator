//canvas rendering
const canvas = document.getElementById("pixel-canvas");
const canvasPreview = document.getElementById("frame-1");
const ctx = canvas.getContext("2d");
let pixelSize = 16;
const gridWidth = Math.floor(canvas.width / pixelSize);
const gridHeight = Math.floor(canvas.height / pixelSize);

const previewPixelSizeX = canvasPreview.width / gridWidth;
const previewPixelSizeY = canvasPreview.height / gridHeight;
const ctxPreview = canvasPreview.getContext("2d");

let grid = [];
let gridUndo = [];
let previewIndex = 0;


for (let x = 0; x < gridWidth; x++) {
    grid[x] = [];
    for (let y = 0; y < gridHeight; y++) {
        grid[x][y] = null;
    }
}

//tools state
let activeTool = null;
let isDrawing = false;

//buttons
const pencilButton = document.getElementById("pencil-tool");
const eraserButton = document.getElementById("eraser-tool");
const fillButton = document.getElementById("fill-tool");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const x16Button = document.getElementById("16");
const x32Button = document.getElementById("32");
const x8Button = document.getElementById("8");


function setGridSize() {
    
    redrawCanvas();
}

//canvas rendering
function redrawCanvas() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(); 
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (grid[x][y]) {
                ctx.fillStyle = grid[x][y];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}

function drawPreviewFromStack(index) {
    ctxPreview.clearRect(0, 0, canvasPreview.width, canvasPreview.height);
    if (index < 0 || index >= undoStack.length) return;
    const state = JSON.parse(undoStack[index]);
    for (let x = 0; x < state.length; x++) {
        for (let y = 0; y < state[x].length; y++) {
            if (state[x][y]) {
                ctxPreview.fillStyle = state[x][y];
                ctxPreview.fillRect(x * previewPixelSizeX, y * previewPixelSizeY, previewPixelSizeX, previewPixelSizeY);
            }
        }
    }
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
drawGrid();
redrawCanvas(); // Initial canvas rendering


canvas.addEventListener("mousedown", function(e) {
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
    if (isDrawing && activeTool === "pencil") {

        drawingAtMouse(e);
        console.log("Drawing at mouse position:", e.offsetX, e.offsetY);

    }
    if (isDrawing && activeTool === "eraser") {
        eraseAtMouse(e);
        console.log("Erasing at mouse position:", e.offsetX, e.offsetY);
    }
    
});

function isGridChanged() {
    if (undoStack.length === 0) return true;
    const last = JSON.stringify(grid);
    const prev = undoStack[undoStack.length - 1];
    return last !== prev;
}

canvas.addEventListener("mouseup", function() {
    isDrawing = false;
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        undoStack.push(JSON.stringify(grid));
        redoStack = [];
        previewIndex = undoStack.length - 1;
        drawPreviewFromStack(previewIndex);
    }
});
canvas.addEventListener("mouseleave", function() {
    isDrawing = false;
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        undoStack.push(JSON.stringify(grid));
        redoStack = [];
        previewIndex = undoStack.length - 1;
        drawPreviewFromStack(previewIndex);
    }
});

//setting grid size
x8Button.addEventListener("click", () => {
    pixelSize = 64;
    setGridSize();
});
x16Button.addEventListener("click", () => {
    pixelSize = 32;
    setGridSize();
}
);
x32Button.addEventListener("click", () => {
    pixelSize = 16;
    setGridSize();
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
}
);

//undo and redo functionality
let undoStack = [];
let redoStack = [];

function saveState() {
    undoStack.push(JSON.stringify(grid));
    previewIndex = undoStack.length - 1;
    drawPreviewFromStack(previewIndex);
}

undoButton.addEventListener("click", () => {
    if (undoStack.length > 1) {
        redoStack.push(JSON.stringify(grid));
        undoStack.pop();
        grid = JSON.parse(undoStack[undoStack.length - 1]);
        redrawCanvas();
        previewIndex = undoStack.length - 1;
        drawPreviewFromStack(previewIndex);
    }
});
redoButton.addEventListener("click", () => {
    if (redoStack.length > 0) {
        const redoState = redoStack.pop();
        undoStack.push(redoState);
        grid = JSON.parse(redoState);
        redrawCanvas();
        previewIndex = undoStack.length - 1;
        drawPreviewFromStack(previewIndex);
    }
});

// Save and preview initial state
undoStack = [JSON.stringify(grid)];
previewIndex = 0;
drawPreviewFromStack(previewIndex);

// Bottoni per navigare lo stack
const prevStateBtn = document.getElementById("prev-state");
const nextStateBtn = document.getElementById("next-state");
if (prevStateBtn && nextStateBtn) {
    prevStateBtn.addEventListener("click", () => {
        if (previewIndex > 0) {
            previewIndex--;
            drawPreviewFromStack(previewIndex);
        }
    });
    nextStateBtn.addEventListener("click", () => {
        if (previewIndex < undoStack.length - 1) {
            previewIndex++;
            drawPreviewFromStack(previewIndex);
        }
    });
}
//tools functions

//pencil
function drawingAtMouse(e)
{
    if (!isDrawing || activeTool !== "pencil") {
        return;
    }
    const currentColor = document.getElementById("color-picker").value;
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);
    grid[cellX][cellY] = currentColor;
    redrawCanvas();
    drawPreviewFromStack(previewIndex);
}

//eraser
function eraseAtMouse(e) {
    if (!isDrawing || activeTool !== "eraser") {
        return;
    }
    const cellX = Math.floor(e.offsetX / pixelSize);   
    const cellY = Math.floor(e.offsetY / pixelSize);
    grid[cellX][cellY] = null; 
    redrawCanvas();
    drawPreviewFromStack(previewIndex);
}

//fill
function fillAtMouse(e) {
    if (activeTool !== "fill") {
        return;
    }
    const currentColor = document.getElementById("color-picker").value;
    const cellX = Math.floor(e.offsetX / pixelSize);
    const cellY = Math.floor(e.offsetY / pixelSize);
    if (grid[cellX][cellY] === currentColor) {
        return;
    }
    const targetColor = grid[cellX][cellY];
    floodFill(cellX, cellY, targetColor, currentColor);
    redrawCanvas();
    // Salva lo stato solo qui per il fill
    undoStack.push(JSON.stringify(grid));
    redoStack = [];
    previewIndex = undoStack.length - 1;
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
    
    if(grid[x + 1][y] === targetColor) {
       floodFill(x + 1, y, targetColor, replacementColor);
    }
    if(grid[x][y + 1] === targetColor) {
       floodFill(x, y + 1, targetColor, replacementColor);
    }
    if(grid[x - 1][y] === targetColor) {
       floodFill(x - 1, y, targetColor, replacementColor);
    }
    if(grid[x][y - 1] === targetColor) {
       floodFill(x, y - 1, targetColor, replacementColor);
    }
}

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
        btn.classList.remove('pulse');
        void btn.offsetWidth;
        btn.classList.add('pulse');
    });
});

