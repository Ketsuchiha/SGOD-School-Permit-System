import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { NotificationPermissionRequester } from './components/NotificationPermissionRequester';
import { NotificationDisplay } from './components/NotificationDisplay';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <NotificationPermissionRequester />
      <NotificationDisplay />
    </>
  );
}

export default App;
