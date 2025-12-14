import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import RoutesConfig from './routes';
import Toast from './components/common/Toast';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toast />
          <RoutesConfig />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;