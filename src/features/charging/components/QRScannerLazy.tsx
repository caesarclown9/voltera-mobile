import { lazy, Suspense } from 'react'

const QRScanner = lazy(() => import('./QRScanner').then(module => ({ default: module.QRScanner })))

interface QRScanResult {
  stationId: string
  connectorId: string
}

interface QRScannerLazyProps {
  onScan: (result: QRScanResult) => void
  onError?: (error: string) => void
}

export function QRScannerLazy(props: QRScannerLazyProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Загрузка QR сканера...</span>
      </div>
    }>
      <QRScanner {...props} />
    </Suspense>
  )
}