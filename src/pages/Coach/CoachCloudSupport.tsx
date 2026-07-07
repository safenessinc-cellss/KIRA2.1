import React from 'react';
import { useAuth } from '@/src/hooks/useAuth';

export function CoachCloudSupport() {
  const { user } = useAuth();
  return (
    <div className="p-8 bg-white rounded-2xl border border-slate-200">
      <h1 className="text-2xl font-bold">Cloud Support</h1>
      <p className="text-slate-500 mt-2">Módulo en desarrollo...</p>
    </div>
  );
}
