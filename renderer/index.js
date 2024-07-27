// renderer/index.js
const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";

  const canvas = document.getElementById("drawCanvas");
  const context = canvas.getContext("2d");
  let drawing = false;
  let currentColor = "#000000"; // デフォルトの線の色
  let drawMode = "freehand"; // デフォルトの描画モード
  let startX, startY;
  let overlayCanvas, overlayContext;

  const initOverlay = () => {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = "0";
    overlayCanvas.style.left = "0";
    overlayCanvas.style.pointerEvents = "none";
    overlayCanvas.style.backgroundColor = "transparent"; // 透明に設定
    container.appendChild(overlayCanvas);
    overlayContext = overlayCanvas.getContext("2d");
  };

  canvas.parentNode.insertBefore(container, canvas);
  container.appendChild(canvas);
  initOverlay();

  ipcRenderer.on("load-image", (event, imageData) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      overlayCanvas.width = img.width;
      overlayCanvas.height = img.height;
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      ipcRenderer.send("resize-window", img.width, img.height);
    };
    img.src = imageData;
  });

  canvas.addEventListener("mousedown", (event) => {
    drawing = true;
    startX = event.clientX - canvas.offsetLeft;
    startY = event.clientY - canvas.offsetTop;

    if (drawMode === "freehand") {
      context.beginPath();
      context.moveTo(startX, startY);
      context.strokeStyle = currentColor;
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
      const currentX = event.clientX - canvas.offsetLeft;
      const currentY = event.clientY - canvas.offsetTop;

      if (drawMode === "freehand") {
        context.lineTo(currentX, currentY);
        context.stroke();
      } else if (drawMode === "rectangle") {
        overlayContext.clearRect(
          0,
          0,
          overlayCanvas.width,
          overlayCanvas.height
        );
        overlayContext.strokeStyle = currentColor;
        overlayContext.strokeRect(
          startX,
          startY,
          currentX - startX,
          currentY - startY
        );
      }
    }
  });

  canvas.addEventListener("mouseup", (event) => {
    drawing = false;
    const endX = event.clientX - canvas.offsetLeft;
    const endY = event.clientY - canvas.offsetTop;

    if (drawMode === "freehand") {
      context.closePath();
    } else if (drawMode === "rectangle") {
      overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      context.strokeStyle = currentColor;
      context.strokeRect(startX, startY, endX - startX, endY - startY);
    }
  });

  canvas.addEventListener("mouseleave", () => {
    drawing = false;
    if (drawMode === "freehand") {
      context.closePath();
    }
  });

  const saveButton = document.getElementById("saveButton");
  saveButton.addEventListener("click", () => {
    const imageData = canvas.toDataURL();
    ipcRenderer.send("save-image", imageData);
  });

  const colorPicker = document.getElementById("colorPicker");
  colorPicker.addEventListener("input", (event) => {
    currentColor = event.target.value;
  });

  const toggleModeButton = document.getElementById("toggleModeButton");
  toggleModeButton.addEventListener("click", () => {
    if (drawMode === "freehand") {
      drawMode = "rectangle";
      toggleModeButton.textContent = "Switch to Freehand Mode";
    } else {
      drawMode = "freehand";
      toggleModeButton.textContent = "Switch to Rectangle Mode";
    }
  });
});
