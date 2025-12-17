import React, { useEffect, useState } from "react";
import { Layout } from "./Layout";
import { motion } from "framer-motion";
import { ChatList } from "../pages/chatSection/ChatList";
import { getAllUsers } from "../services/user_Services";
import { LayoutStore } from "../../store/LayoutStore";

export const HomePage = () => {
  const setSelectedContact = LayoutStore((state) => state.setSelectedContact);
  const [allUsers, setAllUsers] = useState([]);
  const getAllUser = async () => {
    try {
      const result = await getAllUsers();
      if (result?.status === "success") {
        setAllUsers(result.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };
  
  useEffect(() => {
    getAllUser();
  }, []);
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <ChatList contacts={allUsers} />
      </motion.div>
    </Layout>
  );
};
