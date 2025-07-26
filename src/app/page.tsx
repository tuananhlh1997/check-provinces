'use client';

import dynamic from 'next/dynamic';

const ClientAddressParser = dynamic(() => import('../../src/components/ClientAddressParser'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-gray-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">Đang tải...</p>
      </div>
    </div>
  )
});

export default function Home() {
  return (
    <main>
      <ClientAddressParser />
    </main>
  );
}