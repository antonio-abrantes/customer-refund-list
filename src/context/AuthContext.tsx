import { createContext, useState, ReactNode, useEffect } from 'react';
import toast from 'react-hot-toast';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: username, password }),
      });
  
      if (response.status === 401) {
        toast.error("Credenciais inválidas", {
          position: "top-center",
        });
        return false;
      }
  
      if (!response.ok) {
        toast.error("Não foi possível autenticar", {
          position: "top-center",
        });
        return false;
      }
  
      const data = await response.json();
      if (data.token) {
        setIsAuthenticated(true);
        localStorage.setItem("authToken", data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Erro ao tentar autenticar:", error);
      toast.error("Erro no servidor. Tente novamente mais tarde.", {
        position: "top-center",
      });
      return false;
    }
  };
  

  const logout = () => {
    localStorage.removeItem("authToken");
    setIsAuthenticated(false);
  };
  

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
