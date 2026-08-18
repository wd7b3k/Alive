import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import RedesignApp from '../RedesignApp';
import { registerNavigator } from '../services/navigation';

function NavigationRegistrar() {
  const navigate = useNavigate();

  useEffect(() => registerNavigator(navigate), [navigate]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <NavigationRegistrar />
      <Routes>
        <Route path="*" element={<RedesignApp />} />
      </Routes>
    </BrowserRouter>
  );
}
