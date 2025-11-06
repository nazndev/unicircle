'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from './Layout';

export default function ProtectedRoute({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole?: ('super_admin' | 'admin' | 'moderator')[];
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, hasPermission } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      const authState = useAuthStore.getState();
      if (!authState.isAuthenticated) {
        router.replace('/login');
      } else if (requiredRole && !hasPermission(requiredRole)) {
        router.replace('/dashboard');
      }
    };
    init();
  }, [router, checkAuth, requiredRole, hasPermission]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Access denied</div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}

