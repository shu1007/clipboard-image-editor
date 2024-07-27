// main.js
const {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  nativeImage,
  dialog,
} = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("renderer/index.html");

  // クリップボードから画像を取得してレンダラープロセスに送信
  mainWindow.webContents.on("did-finish-load", () => {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const imageData = image.toDataURL();
      mainWindow.webContents.send("load-image", imageData);
    } else {
      // 画像がない場合にダイアログを表示
      dialog
        .showMessageBox(mainWindow, {
          type: "info",
          buttons: ["OK"],
          title: "No Image in Clipboard",
          message:
            "No image found in clipboard. The application will now close.",
        })
        .then(() => {
          app.quit();
        });
    }
  });

  // レンダラープロセスからの画像データをクリップボードに保存
  ipcMain.on("save-image", (event, imageData) => {
    const image = nativeImage.createFromDataURL(imageData);
    clipboard.writeImage(image);
  });

  // 画像サイズにウィンドウをリサイズ
  ipcMain.on("resize-window", (event, width, height) => {
    mainWindow.setContentSize(width, height + 50); // ヘッダーの高さを考慮
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
