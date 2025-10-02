// Skeleton Loader Components

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

// Card Skeleton
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

// Balance Card Skeleton
export function BalanceCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <Skeleton className="h-10 w-32 mb-6" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}

// Station Card Skeleton
export function StationCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>

      <div className="flex space-x-2 pt-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-12 rounded-lg" />
      </div>
    </div>
  )
}

// Station List Skeleton
export function StationListSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="mb-4">
        <Skeleton className="h-4 w-32" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <StationCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Map Skeleton
export function MapSkeleton() {
  return (
    <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />
        <Skeleton className="h-4 w-32 mx-auto mb-2" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
      
      {/* Floating skeleton elements to simulate map pins */}
      <div className="absolute top-1/4 left-1/4">
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
      <div className="absolute top-1/3 right-1/3">
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
      <div className="absolute bottom-1/3 left-1/2">
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
    </div>
  )
}

// Navigation Skeleton
export function NavigationSkeleton() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-2 pt-1">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1">
            <Skeleton className="w-6 h-6 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </nav>
  )
}

// Profile Skeleton
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </main>
    </div>
  )
}

// Generic List Skeleton
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="w-4 h-4" />
        </div>
      ))}
    </div>
  )
}

// QR Scanner Skeleton
export function QRScannerSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-4">
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      
      <div className="w-full max-w-sm mx-auto">
        <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center animate-pulse">
          <div className="w-16 h-16 border-4 border-gray-300 border-dashed rounded-lg" />
        </div>
      </div>
      
      <Skeleton className="h-10 w-full mt-4 rounded-lg" />
    </div>
  )
}

// Charging Status Skeleton
export function ChargingStatusSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4">
            <Skeleton className="h-3 w-12 mb-1" />
            <div className="flex items-baseline space-x-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-8" />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>

      <Skeleton className="h-12 w-full mt-6 rounded-lg" />
    </div>
  )
}