import { frames, selectFrame, activeFrameIndex } from "./app.js";

const playButton = document.getElementById("play-button");
const pauseButton = document.getElementById("stop-button");
const clearButton = document.getElementById("clear-button");
const frameRate = document.getElementById("frame-rate");



let animationFrameRate = 24;
let frameNumber;
let isPlaying = false;
let animationTimer = null;

function startAnimation() {
    isPlaying = true;
    frameNumber = frames.length;
    animationFrameRate = frameRate.value;
    let currentFrame = activeFrameIndex;

    playButton.disabled = true;
    pauseButton.disabled = false;
    clearButton.disabled = false;
    frameRate.disabled = true;

    function showNextFrame() {
        
        
            selectFrame(currentFrame);
            console.log(`Displaying frame ${currentFrame + 1} of ${frameNumber}`);
            currentFrame++;
            if (currentFrame < frameNumber) {
                animationTimer = setTimeout(showNextFrame, 1000 / animationFrameRate);
            } else {
                playButton.disabled = false;
                frameRate.disabled = false;
            }
        
    }

    if(isPlaying) {

    showNextFrame();
    }
   
}

function pauseAnimation() {
    isPlaying = false;
    clearTimeout(animationTimer);
    playButton.disabled = false;
    frameRate.disabled = false;
}

function clearAnimation() {
    isPlaying = false;
    clearTimeout(animationTimer);
    playButton.disabled = false;
    pauseButton.disabled = true;
    clearButton.disabled = true;
    frameRate.disabled = false;
    selectFrame(0);
}


console.log(playButton, pauseButton, clearButton, frameRate);
playButton.addEventListener('click', startAnimation);
pauseButton.addEventListener('click', pauseAnimation);
clearButton.addEventListener('click', clearAnimation);

document.addEventListener('keydown', function(e) {
    if (e.key === "ArrowRight") {
        if (activeFrameIndex >= frames.length - 1) {
            return;
        }
        e.preventDefault(); 
        selectFrame(activeFrameIndex + 1);
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === "ArrowLeft") {
        if (activeFrameIndex <= 0) {
            return;
        }
        e.preventDefault();
        selectFrame(activeFrameIndex - 1);
    }
});

export {animationFrameRate};