import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import AppRoutes from './routes/AppRoutes';

function App() {
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
