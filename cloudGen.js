const sky = document.getElementById("sky");
const cloudImage = ["./assets/cloud.png", "./assets/cloud2.png", "./assets/cloud1.png"]

function generateClouds() {
    console.log("Generating clouds...");
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

setInterval(generateClouds, 2000);
    
