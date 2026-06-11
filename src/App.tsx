import React, { useState, useEffect } from 'react';
import { getAdminToken } from './lib/api';
import Landing from './components/Landing';
import SplashScreen from './components/SplashScreen';
import AdminDashboard from './components/AdminDashboard';
import POSDashboard from './components/POSDashboard';
import KitchenDashboard from './components/KitchenDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import WaiterDashboard from './components/WaiterDashboard';
import DineInQueuePage from './components/DineInQueuePage';
import CookieConsent from './components/CookieConsent';
import LegalPages from './components/LegalPages';
import { LegalPageId } from './legal/legalContent';

const LEGAL_HASH_MAP: Record<string, LegalPageId> = {
  '#privacy': 'privacy',
  '#terms': 'terms',
  '#refund': 'refund',
  '#cookies': 'cookies',
  '#legal': 'legal',
};

export default function App() {
  const normalizeHash = (hash: string) => hash.toLowerCase();
  const [currentHash, setCurrentHash] = useState(() => normalizeHash(window.location.hash));
  const [showSplash, setShowSplash] = useState(() => {
    if (window.location.hash) return false;
    return window.self === window.top;
  });

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(normalizeHash(window.location.hash));
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  let content: React.ReactNode;

  if (currentHash.startsWith('#admin')) {
    content = <AdminDashboard />;
  } else if (currentHash.startsWith('#pos')) {
    content = <POSDashboard />;
  } else if (currentHash.startsWith('#kitchen')) {
    content = <KitchenDashboard />;
  } else if (currentHash.startsWith('#waiter')) {
    content = <WaiterDashboard />;
  } else if (currentHash.startsWith('#dinein')) {
    content = <DineInQueuePage />;
  } else if (LEGAL_HASH_MAP[currentHash]) {
    content = <LegalPages page={LEGAL_HASH_MAP[currentHash]} />;
  } else if (currentHash.startsWith('#super-admin')) {
    const token = getAdminToken();
    if (!token) {
      window.location.hash = "#admin";
      content = <AdminDashboard />;
    } else {
      content = <SuperAdminDashboard />;
    }
  } else {
    content = (
      <>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        {!showSplash && <Landing />}
      </>
    );
  }

  const isCustomerFacing =
    !currentHash.startsWith('#admin') &&
    !currentHash.startsWith('#pos') &&
    !currentHash.startsWith('#kitchen') &&
    !currentHash.startsWith('#waiter') &&
    !currentHash.startsWith('#super-admin');

  return (
    <>
      {content}
      {isCustomerFacing && <CookieConsent />}
    </>
  );
}
