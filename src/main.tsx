import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from "./context/UserContext";
import './i18n';
import './index.css';
import './tailwind.css';
import i18n from './i18n';
import { I18nextProvider } from 'react-i18next';
import { LoadingProvider } from "./context/LoadingContext";
import { ChatProvider } from "./context/ChatContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <AuthProvider>
            <UserProvider>
              <LoadingProvider>
                <ChatProvider>
                  <App />
                </ChatProvider>
              </LoadingProvider>
            </UserProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
