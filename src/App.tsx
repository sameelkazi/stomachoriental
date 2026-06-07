import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import SplashScreen from './components/SplashScreen';
import AdminDashboard from './components/AdminDashboard';
import POSDashboard from './components/POSDashboard';
import KitchenDashboard from './components/KitchenDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import WaiterDashboard from './components/WaiterDashboard';

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (currentHash.startsWith('#admin')) {
    return <AdminDashboard />;
  }

  if (currentHash.startsWith('#pos')) {
    return <POSDashboard />;
  }

  if (currentHash.startsWith('#kitchen')) {
    return <KitchenDashboard />;
  }

  if (currentHash.startsWith('#waiter')) {
    return <WaiterDashboard />;
  }

  if (currentHash.startsWith('#super-admin')) {
    return <SuperAdminDashboard />;
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {!showSplash && <Landing />}
    </>
  );
}
