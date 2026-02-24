import { useEffect, useState } from 'react';
import { ControlCenter } from './pages/ControlCenter';
import { LandingPage } from './pages/LandingPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);

    // Polyfill for pushState to trigger event
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      handleLocationChange();
      return result;
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      history.pushState = originalPushState;
    };
  }, []);

  if (currentPath === '/dashboard') {
    return <ControlCenter />;
  }

  return <LandingPage />;
}
