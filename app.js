const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext("2d");
const pixelSize = 16;
let activeTool = null;
let isDrawing = false;
const pencilButton = document.getElementById("pencil-tool");
const tools = {
  pencil: (x, y) => {
    ctx.fillStyle = currentColor;
    ctx.fillRect(
      Math.floor(x/pixelSize)*pixelSize,
      Math.floor(y/pixelSize)*pixelSize,
      pixelSize,
      pixelSize
    );
  },
  
}
function drawGrid()
{
   
    for (let x = 0; x < canvas.width; x += pixelSize)
    {
        for(let y = 0; y < canvas.height; y += pixelSize)
        {
            ctx.strokeRect(x, y, pixelSize, pixelSize);
            
        }
    }
}
drawGrid();

canvas.addEventListener('mousedown', function(e) {
    if (activeTool !== "pencil") {
        return;
    }
    isDrawing = true;
    drawingAtMouse(e);

});

canvas.addEventListener('mousemove', function(e) {
    if (isDrawing && activeTool === "pencil") {
        drawingAtMouse(e);
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
        alert("Pencil tool is already active.");
    activeTool = null;
    pencilButton.classList.remove("active"); 
  } else {
    alert("Pencil tool activated.");
    activeTool = "pencil";
    pencilButton.classList.add("active");
  }
});

function drawingAtMouse(e)
{
    if (!isDrawing || activeTool !== "pencil") {
        return;
    }
      const currentColor = document.getElementById("color-picker").value;
    ctx.fillStyle = currentColor;
    ctx.fillRect(
    Math.floor(e.offsetX / pixelSize) * pixelSize,
    Math.floor(e.offsetY / pixelSize) * pixelSize,
    pixelSize,
    pixelSize
  );
  
}