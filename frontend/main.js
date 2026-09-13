import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Maximize ya responsive start karne ke liye
  win.maximize();

  // 🛠️ FIX: win.loadFile ki jagah win.loadURL use karne se dobara kholne par blank page nahi aayega
  const indexPath = `file://${path.join(__dirname, 'dist', 'index.html')}`;
  win.loadURL(indexPath).catch(err => {
    console.error("Failed to load app:", err);
  });

  // Optional: Agar aapko ab DevTools ki zaroorat nahi hai toh niche wali line hata sakte hain, warna rehne dein
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
