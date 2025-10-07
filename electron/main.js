const { app, BrowserWindow, BrowserView, ipcMain, shell } = require("electron");
const { join, resolve } = require("path");
const isDev = process.env.NODE_ENV === "development";
let mainWindow;

// Enable live reload for Electron in development
if (isDev) {
  require("electron-reload")(__dirname, {
    electron: join(__dirname, "..", "node_modules", ".bin", "electron"),
    hardResetMethod: "exit",
  });
}

async function createWindow() {
  console.log("Creating window...");

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: join(__dirname, "..", "public", "logo", "desktop", "samaura.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: join(__dirname, "preload.js"),
      webSecurity: false, // Disable web security for development
    },
    titleBarStyle: "hiddenInset",
    show: true, // Show immediately for debugging
    backgroundColor: "#ffffff", // Set a background color
  });

  console.log("Window created with dimensions:", mainWindow.getSize());

  // Always load from localhost for now (you'll need to run 'npm start' separately)
  try {
    console.log("Loading URL: http://localhost:3000");
    await mainWindow.loadURL("http://localhost:3000");
    console.log("URL loaded successfully");
  } catch (error) {
    console.error("Failed to load URL:", error);
    // Show error page
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h1>Connection Error</h1>
          <p>Could not connect to http://localhost:3000</p>
          <p>Make sure your Next.js server is running with: <code>npm run dev</code></p>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `);
  }

  if (isDev) {
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  }

  // Add web contents event listeners for debugging
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error(
        "Failed to load:",
        errorCode,
        errorDescription,
        validatedURL
      );
    }
  );

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Page finished loading");
  });

  mainWindow.webContents.on("dom-ready", () => {
    console.log("DOM is ready");
  });

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle fullscreen changes
  mainWindow.on("enter-full-screen", () => {
    console.log("Main process: Entered fullscreen");
    mainWindow.webContents.send("fullscreen-changed", true);
  });

  mainWindow.on("leave-full-screen", () => {
    console.log("Main process: Left fullscreen");
    mainWindow.webContents.send("fullscreen-changed", false);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// App event listeners
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handler to get current fullscreen state
ipcMain.handle("get-fullscreen-state", async () => {
  if (mainWindow) {
    const isFullscreen = mainWindow.isFullScreen();
    console.log("Current fullscreen state:", isFullscreen);
    return { isFullscreen };
  }
  return { isFullscreen: false };
});

// Handle app protocol for deep linking (optional)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("samaura", process.execPath, [
      resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("samaura");
}
