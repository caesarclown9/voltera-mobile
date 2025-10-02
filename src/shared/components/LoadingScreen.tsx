export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner mb-4 mx-auto"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">EvPower</h2>
        <p className="text-gray-600">Загрузка приложения...</p>
      </div>
    </div>
  )
}