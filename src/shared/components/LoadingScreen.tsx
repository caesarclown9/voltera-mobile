export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <img
          src="/icons/voltera-logo-horizontal.png"
          alt="Voltera"
          className="h-16 w-auto mx-auto mb-6"
        />
        <div className="spinner mb-4 mx-auto"></div>
        <p className="text-gray-600">Загрузка приложения...</p>
      </div>
    </div>
  );
}
