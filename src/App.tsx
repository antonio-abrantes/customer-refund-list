import { useContext } from 'react';
import ClientList from './components/ClientList';
import Login from './components/Login';
import { AuthContext } from './context/AuthContext';

function App() {
  const { isAuthenticated } = useContext(AuthContext)!;

  return (
      <div className="min-h-screen bg-gray-100">
        {isAuthenticated ? (
          <div className="container mx-auto p-4">
            <ClientList />
          </div>
        ) : (
          <Login />
        )}
      </div>
  );
}

export default App;
