import { App } from './app/index.js'
import './styles/main.css'

const container = document.getElementById('app-container')

if (container) {
  const app = new App(container)

  window.addEventListener('beforeunload', () => {
    if (app) {
      app.dispose()
    }
  })
}
