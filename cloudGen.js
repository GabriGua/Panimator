import { isLight } from "./themeSwitcher.js";
const sky = document.getElementById("sky");
const cloudImage = ["./assets/cloud.png", "./assets/cloud2.png", "./assets/cloud1.png"]
const starImage = ["./assets/star1.png", "./assets/star2.png", "./assets/star3.png"];

function generateClouds() {
    
    const cloud = document.createElement("img");
    const randomIndex = Math.floor(Math.random() * cloudImage.length);
    cloud.src = cloudImage[randomIndex];
    
    cloud.classList.add("cloud");

    const size = Math.random() * 0.5 + 40;
    const width = Math.random() * 50; 
    const duration = Math.random() * 30 + 20;

    cloud.style.top = `${width}vh`;
    cloud.style.transform = `scale(${size})`;
    cloud.style.animationDuration = `${duration}s`;

    sky.appendChild(cloud);

    

    setTimeout(() => {
        sky.removeChild(cloud);
    }, duration * 1000);
}

function generateStars() {
const star = document.createElement("img");
    const randomIndex = Math.floor(Math.random() * cloudImage.length);
    star.src = starImage[randomIndex];
    
    star.classList.add("star");

    const size = Math.random() * 0.5 + 40;
    const width = Math.random() * 50; 
    const duration = Math.random() * 30 + 20;
    const rotation = Math.random() * 360;

    star.style.top = `${width}vh`;
    star.style.transform = `scale(${size}) rotate(${rotation}deg)`;
    star.style.animationDuration = `${duration}s`;
    sky.appendChild(star);

    

    setTimeout(() => {
        sky.removeChild(star);
    }, duration * 1000);
}


let skyInterval = null;
function startSkyInterval(isLightTheme) {
    if (skyInterval) clearInterval(skyInterval);
    
    sky.innerHTML = "";
    if (isLightTheme) {
        skyInterval = setInterval(generateClouds, 2000);
    } else {
        skyInterval = setInterval(generateStars, 2000);
    }
}


startSkyInterval(isLight);


window.addEventListener("themechange", (e) => {
    startSkyInterval(e.detail.isLight);
});
