import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  useEffect(() => {
    AOS.init({
      duration: 500,
      easing: 'ease-out-cubic',
      once: true,
      offset: 30,
      delay: 0,
    });
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
          <AppRoutes />
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
