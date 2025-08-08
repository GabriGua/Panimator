
import { frames, selectFrame, setGridParams, activeFrameIndex, activeTool } from "./app.js";
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