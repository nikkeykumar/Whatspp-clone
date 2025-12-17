import React, { useState } from "react";
import { LayoutStore } from "../../../store/LayoutStore";
import { useThemeStor } from "../../../store/themeStore";
import { useUserStor } from "../../../store/useUserStore";
import { FaPlus, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";
import formatTimestamp from "../../../utils/formatTime";

export const ChatList = ({ contacts }) => {
  const selectedContact = LayoutStore((state) => state.selectedContact);
  const setSelectedContact = LayoutStore((state) => state.setSelectedContact);
  const { theme } = useThemeStor();
  const { user } = useUserStor();
  const [searchTerm, setSearchTerm] = useState("");
  const filteredContacts = contacts?.filter((contact) =>
    contact?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div
      className={`w-full border-r h-screen ${
        theme === "dark"
          ? " border-gray-600 bg-[rgb(17,27,33)] "
          : " bg-white border-gray-200"
      }`}
    >
      <div
        className={`flex justify-between p-4 ${
          theme === "dark" ? "text-white" : " text-gray-800"
        }`}
      >
        <h2 className="text-2xl font-bold">Chats</h2>
        <button
          className={`p-2 rounded-full text-white bg-green-500 hover:bg-green-600 transition-colors`}
        >
          <FaPlus />
        </button>
      </div>
      <div className="p-2">
        <div className="relative">
          <FaSearch
            className={` absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === " dark " ? " text-gray-400 " : " text-gray-800"
            }`}
          />
          <input
            type=" text "
            placeholder=" Search or start new chat  "
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              theme === "dark"
                ? "bg-gray-800 text-white border-gray-700 placeholder:text-gray-500"
                : " bg-gray-100 text-black border-gray-200 placeholder:text-gray-400"
            }`}
          />
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-120px)]">
        {filteredContacts.map((contact) => (
          <motion.div
            key={contact._id}
            onClick={() => setSelectedContact(contact)}
            className={`p-3 flex items-center cursor-pointer ${
              theme === "dark"
                ? selectedContact?.id === contact?._id
                  ? "bg-gray-700"
                  : "hover:bg-gray-800"
                : selectedContact?.id === contact?._id
                ? "bg-gray-200"
                : "hover:bg-gray-100"
            }`}
          >
            <img
              src={contact?.ProfilePicture}
              alt={contact?.username}
              className="w-12 h-12 rounded-full"
            />
            <div className="ml-3 flex-1">
              <div className=" flex justify-between items-baseline">
                <h2
                  className={`font-semibold ${
                    theme === "dark" ? "text-white" : "text-black"
                  }`}
                >
                  {" "}
                  {contact?.username}
                </h2>
                {contact?.conversation && (
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-400" : " text-gray-500"
                    }`}
                  >
                    {formatTimestamp(
                      contact?.conversation?.lastMessage?.createdAt
                    )}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-baseline">
                <p
                  className={`text-xs ${
                    theme === "dark" ? "text-gray-400" : " text-gray-500"
                  } truncate`}
                >
                  {contact?.conversation?.lastMessage?.content}
                </p>
                {contact?.conversation &&
                  contact?.conversation?.unreadCount > 0 &&
                  contact?.conversation?.lastMessage?.receiver ===
                    user?._id && (
                    <p
                      className={`text-xs font-semibold h-6 w-6 flex items-center justify-center bg-yellow-500 rounded-full ${
                        theme === "dark" ? "text-gray-800" : " text-gray-500"
                      } truncate`}
                    >
                      {contact?.conversation?.unreadCount}
                    </p>
                  )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
