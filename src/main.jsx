// Punto de arranque de toda la web: monta la app en la página, define las
// 3 rutas (portfolio público, login y panel privado protegido) y envuelve
// todo con los proveedores de tema, sesión y manejo de errores.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ApplicationsProvider } from './context/ApplicationsContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import LanguageSwitcher from './components/UI/LanguageSwitcher';
import Toast from './components/UI/Toast';
import App from './App.jsx';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ApplicationsProvider>
                  <DashboardPage />
                </ApplicationsProvider>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <LanguageSwitcher />
        {/* DT-183: los avisos flotantes se montan UNA vez, aquí, fuera de las
            rutas. Antes cada página los montaba por su cuenta y el panel de
            escritorio se había quedado sin ellos: todos los `showToast` de
            Kanban, búsquedas guardadas, avisos en directo y gestión de
            ventanas se perdían en silencio en /dashboard. */}
        <Toast />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);