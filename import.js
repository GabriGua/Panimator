import { frames, selectFrame, setGridParams } from "./app.js";
import {setFilename} from "./export.js";



export function importProjectFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            setFilename(projectData.filename || "animation");
            // Aggiorna anche il campo di input visivo
            const filenameInput = document.getElementById("export-filename");
            if (filenameInput) filenameInput.value = projectData.filename || "animation";
            setGridParams({
                width: projectData.gridWidth,
                height: projectData.gridHeight,
                pixel: projectData.pixelSize,
                name: projectData.filename
            });

            // Ripristina i frame
            frames.length = 0;
            window.activeFrameIndex = -1;
            const frameContainer = document.getElementById("timeline");
            while (frameContainer.firstChild) frameContainer.removeChild(frameContainer.firstChild);

            projectData.frames.forEach((frameData, i) => {
                // Imposta l'indice attivo PRIMA della creazione del frame (mai negativo)
                window.activeFrameIndex = frames.length > 0 ? frames.length - 1 : 0;
                if (typeof window.createFrame === "function") {
                    window.createFrame(frameData.grid, frameData.width, frameData.height, frameData.pixelSize);
                }
                const frameObj = frames[frames.length - 1];
                if (!frameObj) {
                    console.error("Frame non creato correttamente! frames:", frames);
                    throw new Error("Frame non creato correttamente: frames[" + (frames.length - 1) + "] è undefined");
                }
                frameObj.undoStack = [JSON.stringify(frameData.grid)];
                frameObj.redoStack = [];
                if (typeof window.drawPreviewFromStack === "function") {
                    window.drawPreviewFromStack(frames.length - 1);
                }
            });

            // Se sono stati importati frame, seleziona il primo e aggiorna la UI
            if (frames.length > 0) {
                selectFrame(0);
                if (typeof window.redrawCanvas === "function") {
                    window.redrawCanvas();
                }
            }

            // Ripristina la palette usando data-color (hex)
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
                        window.activeTool = "pencil";
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

            // NON chiamare setGridSize dopo l'import: cancella i frame appena importati

            // Salva in localStorage
            if (typeof window.saveToLocalStorage === "function") {
                window.saveToLocalStorage();
            }

            alert("Progetto importato con successo!");
        } catch (err) {
            alert("Errore nell'importazione del progetto: " + err.message);
        }
    };
    reader.readAsText(file);
}