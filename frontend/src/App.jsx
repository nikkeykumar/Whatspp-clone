import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { useEffect } from "react";
import Login from "./pages/user_login/Login";
import { ToastContainer } from "react-toastify";
import { ProtectedRoute, PublicRoute } from "./Protected.jsx";
import { HomePage } from "./component/HomePage.jsx";
import { UserDeatials } from "./component/UserDeatials.jsx";
import { Statuse } from "./pages/statusSection/Statuse.jsx";
import { Setting } from "./pages/settingSection/Setting.jsx";
import { initiateSocket } from "./services/chat_Services.js";
import { useUserStor } from "../store/useUserStore.js";
import { useChatStore } from "../store/chatStore.js";
import { useStatusStore } from "../store/useStatusStore.js";

function App() {
  const { user } = useUserStor();
  const { setCurrentUser, initsocketListeners, cleanup } = useChatStore();
  const { init: initStatus, cleanupSocket } = useStatusStore();

  useEffect(() => {
    if (user?._id) {
      // ---------- CHAT SOCKET ----------
      const socket = initiateSocket();
      if (socket) {
        setCurrentUser(user);
        initsocketListeners();
      }

      // ---------- STATUS INIT ----------
      initStatus();
    }

    return () => {
      cleanup(); // chat cleanup
      cleanupSocket(); // status socket cleanup
    };
  }, [user?._id]);

  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/user-profile" element={<UserDeatials />} />
            <Route path="/status" element={<Statuse />} />
            <Route path="/settings" element={<Setting />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
