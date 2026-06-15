import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ToastProvider } from './components/Toast.tsx'
import './styles/global.scss'

// IndexedDB가 브라우저/OS에 의해 임의로 비워지지 않도록 영구 저장소 요청
// (특히 설치형 PWA의 데이터 보호)
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((already) => {
    if (!already) navigator.storage.persist()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
