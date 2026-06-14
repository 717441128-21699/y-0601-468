export interface ElectronAPI {
  notify: (title: string, body: string) => void
  getAppVersion: () => string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
