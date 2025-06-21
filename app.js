const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext("2d");
const pixelSize = 16;

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
