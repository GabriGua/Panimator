//canvas rendering
const canvas = document.getElementById("pixel-canvas");
let canvasPreview;
const ctx = canvas.getContext("2d");
let pixelSize = 16;
let gridWidth = Math.floor(canvas.width / pixelSize);
let gridHeight = Math.floor(canvas.height / pixelSize);

let previewPixelSizeX;
let previewPixelSizeY;
let ctxPreview;

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
let hoverCell = null;

//buttons
const pencilButton = document.getElementById("pencil-tool");
const eraserButton = document.getElementById("eraser-tool");
const fillButton = document.getElementById("fill-tool");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const x16Button = document.getElementById("16");
const x32Button = document.getElementById("32");
const x8Button = document.getElementById("8");
const colorSave = document.getElementById("color-save");
const addFrame = document.getElementById("add-frame");


//Handling frames
let frames = [];
let activeFrameIndex = 0;

function createFrame() {
    const frameContainer = document.getElementById("timeline");
    const newFrame = document.createElement("canvas");
    newFrame.width = 100;
    newFrame.height = 100;
    newFrame.className = "frame-canvas";
    newFrame.id = `frame-${frameContainer.children.length + 1}`;
    const frameWrap = document.createElement("div");
    frameWrap.className = "frame-wrap";
    const frameNumber = document.createElement("span");
    frameNumber.className = "frame-number";
    frameNumber.textContent = frameContainer.children.length + 1;
    const deleteFrame = document.createElement("button");
    const deleteIcon = document.createElement("i");
    deleteIcon.className = "delete-icon";
    deleteFrame.appendChild(deleteIcon);
    deleteFrame.className = "delete-frame";

    //DELETING FRAMES
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
        } else {
            alert("You cannot delete the last frame.");
        }
    });
    frameWrap.appendChild(deleteFrame);
    frameWrap.appendChild(frameNumber);
    frameWrap.appendChild(newFrame);
    frameContainer.appendChild(frameWrap);
    // Each frame is indivual
    let prevFrame = frames[activeFrameIndex];
    let newGrid;
    if (prevFrame) {
        newGrid = JSON.parse(JSON.stringify(prevFrame.grid));
    } else {
        newGrid = Array.from({length: gridWidth}, () => Array(gridHeight).fill(null));
    }
    frames.push({
        grid: newGrid,
        undoStack: [],
        redoStack: [],
        canvas: newFrame,
        ctx: newFrame.getContext("2d")
    });
    selectFrame(frames.length - 1);
    newFrame.addEventListener("click", () => {
        selectFrame(Array.from(frameContainer.children).indexOf(frameWrap));
    });
}

function selectFrame(index) {
    
    document.querySelectorAll(".frame-wrap.active").forEach(f => f.classList.remove("active"));
    document.querySelectorAll(".frame-canvas.active").forEach(c => c.classList.remove("active"));
    
    const frameContainer = document.getElementById("timeline");
    const frameWrap = frameContainer.children[index];
    const frameCanvas = frameWrap.querySelector(".frame-canvas");
    frameWrap.classList.add("active");
    frameCanvas.classList.add("active");
    activeFrameIndex = index;
    // Loading Frames
    grid = JSON.parse(JSON.stringify(frames[index].grid));
    undoStack = frames[index].undoStack;
    redoStack = frames[index].redoStack;
    previewIndex = undoStack.length - 1;
    redrawCanvas();
    drawPreviewFromStack(previewIndex);
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

    //this is the cursor hover effect that adapts to the size of each tool
    if (hoverCell && activeTool !== "fill" && activeTool !== null) {
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
}

//this function is used for the preview in the frames
function drawPreviewFromStack(index) {
    const frame = frames[activeFrameIndex];
    if (!frame || !frame.ctx || !frame.canvas) return;
    const ctxPreview = frame.ctx;
    const canvasPreview = frame.canvas;
    ctxPreview.clearRect(0, 0, canvasPreview.width, canvasPreview.height);
    if (index < 0 || index >= undoStack.length) return;
    const state = JSON.parse(undoStack[index]);
    
    const cellSizeX = canvasPreview.width / gridWidth;
    const cellSizeY = canvasPreview.height / gridHeight;
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            if (state[x][y]) {
                ctxPreview.fillStyle = state[x][y];
                ctxPreview.fillRect(x * cellSizeX, y * cellSizeY, cellSizeX, cellSizeY);
            }
        }
    }
    // this draw the grid on the preview canvas
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
        saveState();
        redoStack = [];
        frames[activeFrameIndex].redoStack = redoStack;
    }
});
canvas.addEventListener("mouseleave", function() {
    isDrawing = false;
    hoverCell = null;
    redrawCanvas();
    if ((activeTool === "pencil" || activeTool === "eraser") && isGridChanged()) {
        saveState();
        redoStack = [];
        frames[activeFrameIndex].redoStack = redoStack;
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
    frames[activeFrameIndex].grid = JSON.parse(JSON.stringify(grid));
    undoStack.push(JSON.stringify(grid));
    frames[activeFrameIndex].undoStack = undoStack;
    frames[activeFrameIndex].redoStack = redoStack;
    previewIndex = undoStack.length - 1;
    drawPreviewFromStack(previewIndex);
}

undoButton.addEventListener("click", () => {
    if (undoStack.length > 1) {
        redoStack.push(JSON.stringify(grid));
        undoStack.pop();
        grid = JSON.parse(undoStack[undoStack.length - 1]);
        frames[activeFrameIndex].grid = JSON.parse(JSON.stringify(grid));
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
        frames[activeFrameIndex].grid = JSON.parse(JSON.stringify(grid));
        redrawCanvas();
        previewIndex = undoStack.length - 1;
        drawPreviewFromStack(previewIndex);
    }
});

// Save and preview initial state
undoStack = [JSON.stringify(grid)];
previewIndex = 0;
drawPreviewFromStack(previewIndex);



//tools functions

//pencil
function drawingAtMouse(e)
{
    if (!isDrawing || activeTool !== "pencil") {
        return;
    }
    const colorPicker = document.getElementById("color-picker");
    const currentColor = colorPicker ? colorPicker.value : "#000000";
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
    // Save the state after filling
    undoStack.push(JSON.stringify(grid));
    frames[activeFrameIndex].grid = JSON.parse(JSON.stringify(grid));
    frames[activeFrameIndex].undoStack = undoStack;
    frames[activeFrameIndex].redoStack = redoStack;
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

function hexToRgb(hex) {
    
    hex = hex.replace(/^#/, '');
    
    if (hex.length === 3) {
        hex = hex.split('').map(x => x + x).join('');
    }
    const num = parseInt(hex, 16);
    return `rgb(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255})`;
}

colorSave.addEventListener("click", () => {
    const currentColor = document.getElementById("color-picker").value;
    const colorList = document.getElementById("color-list");
    const rgbColor = hexToRgb(currentColor);
    const alreadyExists = Array.from(colorList.children).some(div => 
    div.style.backgroundColor.replace(/\s/g, '').toLowerCase() === rgbColor.replace(/\s/g, '').toLowerCase()
    );
    if (alreadyExists) return;
    const newColorDiv = document.createElement("div");
    newColorDiv.className = "color";
    newColorDiv.style.backgroundColor = currentColor;
    newColorDiv.addEventListener("click", () => {
        document.getElementById("color-picker").value = currentColor;
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
addFrame.addEventListener("click", createFrame);

window.addEventListener("DOMContentLoaded", () => {
    createFrame();
});

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
    
    undoStack = [JSON.stringify(grid)];
    redoStack = [];
    previewIndex = 0;
    // Create the first frame (again)
    createFrame();
    redrawCanvas();
}