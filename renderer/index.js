// renderer/index.js
const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  const canvasContainer = document.getElementById("canvasContainer");
  const canvas = document.getElementById("drawCanvas");
  const context = canvas.getContext("2d");
  let drawing = false;
  let currentColor = "#000000"; // デフォルトの線の色
  let currentLineWidth = 5; // デフォルトの線の太さ
  let drawMode = "freehand"; // デフォルトの描画モード
  let startX, startY;
  let overlayCanvas, overlayContext;
  let initialImageData = null; // 最初に読み込んだ画像データ

  const initOverlay = () => {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = "0";
    overlayCanvas.style.left = "0";
    overlayCanvas.style.pointerEvents = "none";
    overlayCanvas.style.backgroundColor = "transparent"; // 透明に設定
    canvasContainer.appendChild(overlayCanvas);
    overlayContext = overlayCanvas.getContext("2d");
  };

  initOverlay();

  ipcRenderer.on("load-image", (event, imageData) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      overlayCanvas.width = img.width;
      overlayCanvas.height = img.height;
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      initialImageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ); // 最初の画像データを保持
      ipcRenderer.send(
        "resize-window",
        Math.max(800, img.width),
        Math.max(100, img.height)
      );
    };
    img.src = imageData;
  });

  const getMousePos = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  canvas.addEventListener("mousedown", (event) => {
    drawing = true;
    const pos = getMousePos(event);
    startX = pos.x;
    startY = pos.y;

    if (drawMode === "freehand") {
      context.beginPath();
      context.moveTo(startX, startY);
      context.strokeStyle = currentColor;
      context.lineWidth = currentLineWidth;
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
      const pos = getMousePos(event);
      const currentX = pos.x;
      const currentY = pos.y;

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
        overlayContext.lineWidth = currentLineWidth;
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
    const pos = getMousePos(event);
    const endX = pos.x;
    const endY = pos.y;

    if (drawMode === "freehand") {
      context.closePath();
    } else if (drawMode === "rectangle") {
      overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      context.strokeStyle = currentColor;
      context.lineWidth = currentLineWidth;
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
    saveButton.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      saveButton.innerHTML = '<i class="fas fa-clipboard"></i>';
    }, 1000);
  });

  const colorPicker = document.getElementById("colorPicker");
  colorPicker.addEventListener("input", (event) => {
    currentColor = event.target.value;
  });

  const lineWidthSelector = document.getElementById("lineWidthOptions");
  lineWidthSelector.addEventListener("click", (event) => {
    if (
      event.target &&
      event.target.parentElement &&
      event.target.parentElement.dataset.width
    ) {
      currentLineWidth = parseInt(event.target.parentElement.dataset.width, 10);
      document.querySelector("#lineWidthSelector .dropbtn").innerHTML =
        event.target.outerHTML;
    }
  });

  const toggleModeButton = document.getElementById("toggleModeButton");
  toggleModeButton.addEventListener("click", () => {
    if (drawMode === "freehand") {
      drawMode = "rectangle";
      toggleModeButton.innerHTML = '<i class="far fa-square"></i>';
    } else {
      drawMode = "freehand";
      toggleModeButton.innerHTML = '<i class="fas fa-pen"></i>';
    }
  });

  const resetButton = document.getElementById("resetButton");
  resetButton.addEventListener("click", () => {
    if (initialImageData) {
      context.putImageData(initialImageData, 0, 0); // 最初の画像データを描画
    }
  });
});
