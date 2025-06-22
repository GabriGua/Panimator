const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext("2d");
const pixelSize = 16;
let activeTool = null;
let isDrawing = false;
const pencilButton = document.getElementById("pencil-tool");
const eraserButton = document.getElementById("eraser-tool");
const gridWidth = Math.floor(canvas.width / pixelSize);
const gridHeight = Math.floor(canvas.height / pixelSize);
let grid = [];
for (let x = 0; x < gridWidth; x++) {
    grid[x] = [];
    for (let y = 0; y < gridHeight; y++) {
        grid[x][y] = null; // null = cella vuota
    }
}

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

canvas.addEventListener('mousedown', function(e) {
    switch (activeTool) {
        case "pencil":
            isDrawing = true;
            drawingAtMouse(e);
            break;
        case "eraser":
            isDrawing = true;
            eraseAtMouse(e);
            break;
        default:
            isDrawing = false;
            break;
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (isDrawing && activeTool === "pencil") {
        drawingAtMouse(e);
    }
    if (isDrawing && activeTool === "eraser") {
        eraseAtMouse(e);
    }
});

canvas.addEventListener('mouseup', function() {
    isDrawing = false;
});
canvas.addEventListener('mouseleave', function() {
    isDrawing = false;
});

pencilButton.addEventListener("click", () => {
    if (activeTool === "pencil") {
        
    activeTool = null;
    pencilButton.classList.remove("active"); 
  } else {
    
    activeTool = "pencil";
    pencilButton.classList.add("active");
    eraserButton.classList.remove("active");
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
    }
}
);

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

function eraseAtMouse(e) {
    if (!isDrawing || activeTool !== "eraser") {
        return;
    }
    const cellX = Math.floor(e.offsetX / pixelSize);   
    const cellY = Math.floor(e.offsetY / pixelSize);
    grid[cellX][cellY] = null; 
    redrawCanvas();

}
