document.getElementById("tutorial-prev").onclick = () => {};

// Tutorial steps: each step points to a selector and a message
const tutorialSteps = [
  { element: ".canvasstyle", text: "This is your Canvas, draw whatever you like!" },
  { element: ".toolbar", text: "Here is the Toolbar: Use the tools to draw in the canvas" },
  { element: "#color-list", text: "That's a color palette! Save your favourite colors" },
  { element: ".timeline-container", text: "In the timeline you can switch from a frame to another." },
  { element: ".animation-controls", text: "Control the animation, set the frame rate and add new frames" },
  { element: "#delete-project", text: "Delete the current project, you can always import it again. " },
  { element: ".theme", text: "Change Theme or set the grid size whenever you want" },
  { element: ".import-export", text: "Import your project, or export as a GIF, PNG, mPNG and Spritesheet." },
  { element: ".question", text: "Click here to see all the shortcuts, speed up your work!" },
  { element: ".layers-toggle", text: "Click here to open the layer drawer and manage your layers." },
  { element: ".tutorial", text: "Click here to start the tutorial again. yk it could be useful right?" },
];

let currentStepIndex = 0;
let targetElement = null;
let spotlightCanvas = null;
let spotlightContext = null;

let isAnimating = false;
let animationStartTime = null;
let animationFromRect = null;
let animationToRect = null;
const spotlightAnimationDuration = 350;

function updateSpotlightPosition(shouldAnimate = false) {
  const highlightOverlay = document.getElementById("tutorial-highlight");
  if (!targetElement) return;

  const elementBounds = targetElement.getBoundingClientRect();
  highlightOverlay.style.display = "none";

  if (spotlightCanvas && spotlightContext) {
    spotlightCanvas.width = window.innerWidth;
    spotlightCanvas.height = window.innerHeight;

    const spotlightBounds = {
      x: elementBounds.left - 6,
      y: elementBounds.top - 6,
      width: elementBounds.width + 12,
      height: elementBounds.height + 12
    };

    if (shouldAnimate && animationFromRect) {
      isAnimating = true;
      animationStartTime = performance.now();
      animationToRect = spotlightBounds;
      requestAnimationFrame(animateSpotlightTransition);
      return;
    }

    drawSpotlightRect(spotlightBounds.x, spotlightBounds.y, spotlightBounds.width, spotlightBounds.height);
    animationFromRect = spotlightBounds;
  }
}

function drawSpotlightRect(x, y, width, height) {
  // Draws the dark overlay and the spotlight with border and glow
  const borderThickness = 3;
  const cornerRadius = 8;
  const glowStrength = 90;

  if (!spotlightCanvas || !spotlightContext) return;

  spotlightContext.clearRect(0, 0, spotlightCanvas.width, spotlightCanvas.height);
  spotlightContext.fillStyle = 'rgba(0,0,0,0.6)';
  spotlightContext.fillRect(0, 0, spotlightCanvas.width, spotlightCanvas.height);

  spotlightContext.save();
  spotlightContext.globalCompositeOperation = 'destination-out';

  spotlightContext.save();
  spotlightContext.shadowColor = '#ccff00';
  spotlightContext.shadowBlur = glowStrength;
  spotlightContext.beginPath();
  drawRoundedRect(spotlightContext, x, y, width, height, cornerRadius);
  spotlightContext.fillStyle = 'rgba(0,0,0,1)';
  spotlightContext.fill();
  spotlightContext.restore();

  spotlightContext.save();
  spotlightContext.globalCompositeOperation = 'destination-out';
  spotlightContext.lineWidth = borderThickness * 2;
  spotlightContext.strokeStyle = 'rgba(0,0,0,1)';
  spotlightContext.beginPath();
  drawRoundedRect(spotlightContext, x, y, width, height, cornerRadius);
  spotlightContext.stroke();
  spotlightContext.restore();

  spotlightContext.save();
  spotlightContext.globalCompositeOperation = 'source-over';
  spotlightContext.lineWidth = borderThickness;
  spotlightContext.strokeStyle = '#ccff00';
  spotlightContext.shadowColor = '#ccff00';
  spotlightContext.shadowBlur = 10;
  spotlightContext.beginPath();
  drawRoundedRect(spotlightContext, x, y, width, height, cornerRadius);
  spotlightContext.stroke();
  spotlightContext.restore();

  spotlightContext.restore();
}

function animateSpotlightTransition(currentTime) {
  if (!isAnimating || !animationFromRect || !animationToRect) return;

  const progress = Math.min(1, (currentTime - animationStartTime) / spotlightAnimationDuration);
  const smoothStep = (a, b) => a + (b - a) * easeInOutCubic(progress);

  const x = smoothStep(animationFromRect.x, animationToRect.x);
  const y = smoothStep(animationFromRect.y, animationToRect.y);
  const width = smoothStep(animationFromRect.width, animationToRect.width);
  const height = smoothStep(animationFromRect.height, animationToRect.height);

  drawSpotlightRect(x, y, width, height);

  if (progress < 1) {
    requestAnimationFrame(animateSpotlightTransition);
  } else {
    isAnimating = false;
    animationFromRect = animationToRect;
  }
}

function easeInOutCubic(t) {
  // Easing for smooth animation
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function showTutorialStep(index) {
  const overlay = document.getElementById("tutorial-overlay");
  const highlight = document.getElementById("tutorial-highlight");
  const textBox = document.getElementById("tutorial-box");
  const messageText = document.getElementById("tutorial-text");
  const previousButton = document.getElementById("tutorial-prev");
  const nextButton = document.getElementById("tutorial-next");

  //scroll disable
  if (index < 0 || index >= tutorialSteps.length) {
    overlay.style.display = "none";
    if (spotlightCanvas) spotlightCanvas.style.display = 'none';
    document.body.style.overflow = ""; 
    return;
}

overlay.style.display = "block";
if (spotlightCanvas) spotlightCanvas.style.display = 'block';
document.body.style.overflow = "hidden"; 

document.getElementById("tutorial-next").onclick = () => {
  if (currentStepIndex < tutorialSteps.length - 1) {
    currentStepIndex++;
    showTutorialStep(currentStepIndex);
  } else {
    document.getElementById("tutorial-overlay").style.display = "none";
    if (spotlightCanvas) spotlightCanvas.style.display = 'none';
    document.body.style.overflow = ""; 
    window.removeEventListener("scroll", updateSpotlightPosition);
    window.removeEventListener("resize", updateSpotlightPosition);
  }
};

document.getElementById("tutorial-skip").onclick = () => {
  document.getElementById("tutorial-overlay").style.display = "none";
  if (spotlightCanvas) spotlightCanvas.style.display = 'none';
  document.body.style.overflow = ""; 
  window.removeEventListener("scroll", updateSpotlightPosition);
  window.removeEventListener("resize", updateSpotlightPosition);
};

  // Create spotlight canvas if needed
  if (!spotlightCanvas) {
    spotlightCanvas = document.createElement('canvas');
    spotlightCanvas.id = 'tutorial-spotlight-canvas';
    spotlightCanvas.style.position = 'fixed';
    spotlightCanvas.style.top = '0';
    spotlightCanvas.style.left = '0';
    spotlightCanvas.style.zIndex = '9998';
    spotlightCanvas.style.pointerEvents = 'auto';
    overlay.insertBefore(spotlightCanvas, overlay.firstChild);
    spotlightContext = spotlightCanvas.getContext('2d');
  }

  if (index < 0 || index >= tutorialSteps.length) {
    overlay.style.display = "none";
    if (spotlightCanvas) spotlightCanvas.style.display = 'none';
    return;
  }

  overlay.style.display = "block";
  if (spotlightCanvas) spotlightCanvas.style.display = 'block';

  const step = tutorialSteps[index];
  messageText.textContent = step.text;

  const elementToHighlight = document.querySelector(step.element);
  targetElement = elementToHighlight;

  // Remove old listeners
  window.removeEventListener("scroll", onScrollOrResize);
  window.removeEventListener("resize", onScrollOrResize);

  if (elementToHighlight) {
    updateSpotlightPosition(true);
    elementToHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
    window.addEventListener("scroll", onScrollOrResize);
    window.addEventListener("resize", onScrollOrResize);
  } else {
    highlight.style.display = "none";
    if (spotlightCanvas) spotlightCanvas.style.display = 'none';
  }

  function onScrollOrResize() {
    updateSpotlightPosition(true);
  }

  previousButton.disabled = index === 0;
  nextButton.textContent = index === tutorialSteps.length - 1 ? "End" : "Next";
}

document.getElementById("tutorial-prev").onclick = () => {
  if (currentStepIndex > 0) currentStepIndex--;
  showTutorialStep(currentStepIndex);
};

document.getElementById("tutorial-next").onclick = () => {
  if (currentStepIndex < tutorialSteps.length - 1) {
    currentStepIndex++;
    showTutorialStep(currentStepIndex);
  } else {
    document.getElementById("tutorial-overlay").style.display = "none";
    if (spotlightCanvas) spotlightCanvas.style.display = 'none';
    window.removeEventListener("scroll", updateSpotlightPosition);
    window.removeEventListener("resize", updateSpotlightPosition);
  }
};

document.getElementById("tutorial-skip").onclick = () => {
  document.getElementById("tutorial-overlay").style.display = "none";
  if (spotlightCanvas) spotlightCanvas.style.display = 'none';
  window.removeEventListener("scroll", updateSpotlightPosition);
  window.removeEventListener("resize", updateSpotlightPosition);
};

window.startTutorial = function () {
  currentStepIndex = 0;
  showTutorialStep(0);
};
