const {
  globalShortcut,
  ipcMain,
  BrowserWindow,
  clipboard,
  nativeImage
} = require('electron').remote
const { ipcRenderer } = require('electron')

// 保证函数只执行一次
let isRuned = false
const $windows = []
let isClose = false
export function supportCut(mainWindow) {
  if (isRuned) {
    return
  }
  isRuned = true

  // 注册全局快捷键
  globalShortcut.register('ctrl+alt+a', function () {
    mainWindow.webContents.send('shortcut-capture')
  })
  ipcMain.on('short-from-render', () => {
    mainWindow.webContents.send('shortcut-capture')
  })

  // 抓取截图之后显示窗口
  ipcMain.on('shortcut-capture', (e, sources) => {
    closeWindow()
    sources.forEach(source => {
      createWindow(source)
    })
  })
  // 有一个窗口关闭就关闭所有的窗口
  ipcMain.on('cancel-shortcut-capture', closeWindow)
  ipcMain.on('set-shortcut-capture', (e, dataURL) => {
    clipboard.writeText(dataURL)
    ipcRenderer.send('select-file-request', { shortcut: 1 })
    closeWindow()
  })
}

function createWindow (source) {
  const { display } = source
  const $win = new BrowserWindow({
    fullscreen: true,
    width: display.width,
    height: display.height,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    autoHideMenuBar: true,
  })
  setFullScreen($win, display)
  // 只能通过cancel-shortcut-capture的方式关闭窗口
  $win.on('close', e => {
    if (!isClose) {
      e.preventDefault()
    }
  })
  // 页面初始化完成之后再显示窗口
  // 并检测是否有版本更新
  $win.once('ready-to-show', () => {
    $win.show()
    $win.focus()
    // 重新调整窗口位置和大小
    setFullScreen($win, display)
  })

  $win.webContents.on('dom-ready', () => {
    $win.webContents.executeJavaScript(`window.source = ${JSON.stringify(source)}`)
    $win.webContents.send('dom-ready')
    $win.focus()
  })
  // $win.loadURL(`file://${__dirname}/shortcut-capture.html`)
  // console.log(getRootPath())
  $win.loadURL(`${getRootPath()}/dist/static/shortcut/shortcut-captur.html?v=${Math.round(Math.random()*10000)}`)
  $windows.push($win)
}
function getRootPath(){
    return window.location.origin;
}

function setFullScreen ($win, display) {
  $win.setBounds({
    width: display.width,
    height: display.height,
    x: display.x,
    y: display.y
  })
  $win.setAlwaysOnTop(true)
  $win.setFullScreen(true)
}

function closeWindow () {
  isClose = true
  while ($windows.length) {
    const $winItem = $windows.pop()
    $winItem.close()
  }
  isClose = false
}
