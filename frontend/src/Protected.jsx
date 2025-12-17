import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStor } from "../store/useUserStore.js";
import { checkUserAuth } from "./services/user_Services.js";
import { Loader } from "../utils/Loader.jsx";

export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const { setUser, isAuthenticated, clearUser } = useUserStor();
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkUserAuth();
        if (result?.isAuthenticated) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch (error) {
        console.error(error);
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) {
    return <Loader />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

export const PublicRoute = () => {
  const isAuthenticated = useUserStor((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};
