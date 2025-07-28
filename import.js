import { frames, selectFrame, setGridParams, activeFrameIndex, activeTool } from "./app.js";
import {setFilename} from "./export.js";



export function importProjectFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            setFilename(projectData.filename || "animation");
            
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
                
                
                if (typeof window.createFrameWithImportedGrid === "function") {
                    window.createFrameWithImportedGrid(frameData.grid);
                    console.log(`Frame ${i + 1} created with grid size: ${frameData.grid.length}x${frameData.grid[0].length}`);
                }
                const frameObj = frames[frames.length - 1];
                if (!frameObj) {
                    console.error("Frame non creato correttamente! frames:", frames);
                    return;
                }
                frameObj.undoStack = [JSON.stringify(frameData.grid)];
                frameObj.redoStack = [];
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