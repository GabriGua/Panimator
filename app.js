//canvas rendering
const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext("2d");
let pixelSize = 16;
const gridWidth = Math.floor(canvas.width / pixelSize);
const gridHeight = Math.floor(canvas.height / pixelSize);
let grid = [];
let gridUndo = [];
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
                ctx.fillStyle = gridUndo[x][y];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
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

    }
    if (isDrawing && activeTool === "eraser") {
        eraseAtMouse(e);
    }
    
});

canvas.addEventListener("mouseup", function() {
    isDrawing = false;
    if (activeTool === "pencil" || activeTool === "eraser") {
        undoStack.push(JSON.stringify(grid));
        redoStack = [];
    }
});
canvas.addEventListener("mouseleave", function() {
    isDrawing = false;
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
undoButton.addEventListener("click", () => {
    console.log(undoStack);
    if (undoStack.length > 0) {
        redoStack.push(JSON.stringify(grid));
        if (undoStack.length > 1) {
            undoStack.pop(); // Remove current state
            grid = JSON.parse(undoStack.pop()); // Get previous state
        }
        redrawCanvas();
    }
});
redoButton.addEventListener("click", () => {
    if (redoStack.length > 0) {
        undoStack.push(JSON.stringify(grid));
        grid = JSON.parse(redoStack.pop());
        redrawCanvas();
    }
}
);
undoStack.push(JSON.stringify(gridUndo)); // Initialize undo stack with the initial grid state

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