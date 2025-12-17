import React, { useEffect, useState } from "react";
import { useThemeStor } from "../../store/themeStore";
import { Link, useLocation } from "react-router-dom";
import { useUserStor } from "../../store/useUserStore";
import { LayoutStore } from "../../store/LayoutStore";
import { motion } from "framer-motion";
import { FaCog, FaUserCircle, FaWhatsapp } from "react-icons/fa";
import { MdOutlineRadioButtonChecked } from "react-icons/md";

export const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStor();
  const { user } = useUserStor();
  const { activeTab, setActiveTab, selectedContact } = LayoutStore();
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    if (location.pathname === "/") {
      setActiveTab("chats");
    } else if (location.pathname === "/status") {
      setActiveTab("status");
    } else if (location.pathname === "/user-profile") {
      setActiveTab("profile");
    } else if (location.pathname === "/settings") {
      setActiveTab("setting");
    }
  }, [location, setActiveTab]);
  if (isMobile && selectedContact) {
    return null;
  }
  const SidebarContent = (
    <>
      <Link
        to="/"
        className={`${isMobile ? "" : " mb-8 "}${
          activeTab === "chats" && " bg-gray-300 shadow-sm p-2 rounded-full"
        } focus: outline-none`}
      >
        <FaWhatsapp
          className={`h-6 w-6 ${
            activeTab === "chats"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-300"
              : "text-gray-800 "
          }`}
        />
      </Link>
      <Link
        to="/status"
        className={`${isMobile ? "" : " mb-8 "}${
          activeTab === "status" && " bg-gray-300 shadow-sm p-2 rounded-full"
        } focus: outline-none`}
      >
        <MdOutlineRadioButtonChecked
          className={`h-6 w-6 ${
            activeTab === "status"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-300"
              : "text-gray-800 "
          }`}
        />
      </Link>
      {!isMobile && <div className="flex-grow" />}
      <Link
        to="/user-profile"
        className={`${isMobile ? "" : " mb-8 "}${
          activeTab === "profile" && " bg-gray-300 shadow-sm p-2 rounded-full"
        } focus: outline-none`}
      >
        {user?.ProfilePicture ? (
          <img
            src={user?.ProfilePicture}
            alt="profile "
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <FaUserCircle
            className={`h-6 w-6 ${
              activeTab === "profile"
                ? theme === "dark"
                  ? "text-gray-800"
                  : ""
                : theme === "dark"
                ? "text-gray-300"
                : "text-gray-800 "
            }`}
          />
        )}
      </Link>
      <Link
        to="/settings"
        className={`${isMobile ? "" : " mb-8 "}${
          activeTab === "setting" && " bg-gray-300 shadow-sm p-2 rounded-full"
        } focus: outline-none`}
      >
        <FaCog
          className={`h-6 w-6 ${
            activeTab === "setting"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-300"
              : "text-gray-800 "
          }`}
        />
      </Link>
    </>
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${
        isMobile
          ? "fixed bottom-0 left-0 right-0 h-16"
          : "w-16 h-screen border-r-2"
      } ${
        theme === "dark"
          ? "bg-gray-800 border-gray-600"
          : "border-gray-300  bg-[#eff2fe]"
      } bg-opcity-90 py-4 shadow-lg flex items-center ${
        isMobile ? "flex-row justify-around " : " flex-col justify-between"
      }`}
    >
      {SidebarContent}
    </motion.div>
  );
};
