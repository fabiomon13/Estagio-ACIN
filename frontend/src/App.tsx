import { AppRouter } from './app/AppRouter';
import ToastProvider from './components/ui/toast/ToastProvider';
import KitchenNotificationProvider from './features/kitchen/components/kitchen-notification/KitchenNotificationProvider';

function App() {
  return (
    <ToastProvider>
      <KitchenNotificationProvider>
        <AppRouter />
      </KitchenNotificationProvider>
    </ToastProvider>
  );
}

export default App;
