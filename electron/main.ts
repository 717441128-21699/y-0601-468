import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.DIST_ELECTRON = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let win: BrowserWindow | null
const preload = path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

function createWindow() {
  win = new BrowserWindow({
    title: '医疗废物智慧管理系统',
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.svg'),
    backgroundColor: '#1A2332',
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (url) {
    win.loadURL(url)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(indexHtml)
  }

  win.on('closed', () => {
    win = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
      allWindows[0].focus()
    } else {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('notify', (_event, { title, body }) => {
  new Notification({ title, body, icon: path.join(process.env.VITE_PUBLIC, 'favicon.svg') }).show()
  return true
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})
