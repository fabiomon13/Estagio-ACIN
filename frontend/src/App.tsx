import { AppRouter } from './app/AppRouter';
import ToastProvider from './components/ui/toast/ToastProvider';

function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

export default App;
