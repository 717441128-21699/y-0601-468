import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title: string, body: string) => ipcRenderer.invoke('notify', { title, body }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
})

declare global {
  interface Window {
    electronAPI: {
      notify: (title: string, body: string) => Promise<boolean>
      getAppVersion: () => Promise<string>
    }
  }
}
