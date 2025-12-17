import { create } from "zustand";
import { getSocket } from "../src/services/chat_Services";
import axiosInstance from "../src/services/url_Services";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),

  // socket event listeners setup
  initsocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // remove existing listeners to prevent duplicate events
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_error");
    socket.off("message_deleted");

    //listen for incoming messages
    socket.on("receive_message", (message) => {
      useChatStore.getState().receiveMessage(message);
    });

    // confirm message sent
    socket.on("message_send", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...msg } : msg
        ),
      }));
    });

    //update message status
    socket.on("message_status_updated", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    //handle reaction on message
    socket.on("reaction_updated", ({ messageId, reacticons }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reacticons } : msg
        ),
      }));
    });

    //handle remove message  form local state
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });

    // handle any message sending error
    socket.on("message_error", (error) => {
      console.error("message error", error);
    });
    // listner for typing users
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }
        const typingSet = newTypingUsers.get(conversationId);
        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }

        return { typingUsers: newTypingUsers };
      });
    });

    //track user's online/offline status
    socket.on("user_online", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

    //emit status check for all users in converstion list
    const { conversations } = get();
    if (conversations?.data?.length > 0) {
      conversations.data.forEach((conv) => {
        const otherUser = conv.participants.find(
          (p) => p._id !== get().currentUser._id
        );
        if (otherUser._id) {
          socket.emit("get_user_status", otherUser._id, (state) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(state.userId, {
                isOnline: state.isOnline,
                lastSeen: state.lastSeen,
              });
              return { onlineUsers: newOnlineUsers };
            });
          });
        }
      });
    }
  },
  setCurrentUser: (user) => set({ currentUser: user }),

  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/chats/conversation");
      set({ conversations: data, loading: false }); // was: set({ connections: data, loading: false });
      get().initsocketListeners();
      return data;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return null;
    }
  },

  //fetch message for a conversation
  fetchMassages: async (conversationId) => {
    if (!conversationId) return;

    set({ loading: true, error: null });
    try {
      // FIX: Check your backend route and use the correct endpoint
      // If your backend expects /chats/conversation/:id/messages (singular 'conversation'), update here:
      const { data } = await axiosInstance.get(
        `/chats/messages/${conversationId}`
      );
      const messageArray = data.data || data || [];

      set({
        messages: messageArray,
        currentConversation: conversationId,
        loading: false,
      });
      // call markMessagesAsRead from store to ensure latest state
      get().markMessagesAsRead();

      return messageArray;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return [];
    }
  },

  //send message in real time
  sendMessage: async (formData) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus");

    const socket = getSocket();

    const { conversations } = get();
    let conversationId = null;

    if (conversations?.data?.length > 0) {
      const conversation = conversations?.data?.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId)
      );

      if (conversation) {
        conversationId = conversation._id;
        set({ currentConversation: conversationId });
      }
    }

    // ******** REAL-TIME MESSAGE OBJECT ********
    const realtimeMessage = {
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      conversation: conversationId,
      content,
      contentType: media
        ? media.type.startsWith("image")
          ? "image"
          : "video"
        : "text",
      messageStatus,
    };

    // 🚀🚀🚀 VERY IMPORTANT (THIS WAS MISSING)
    socket.emit("send_message", realtimeMessage);

    // ********* OPTIMISTIC UI *********
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      ...realtimeMessage,
      _id: tempId,
      imageOrVideoUrl:
        media && typeof media !== "string" ? URL.createObjectURL(media) : null,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    // ********* SAVE TO DB *********
    try {
      const { data } = await axiosInstance.post(
        "/chats/send-message",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const messageData = data.data || data;

      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        ),
      }));

      return messageData;
    } catch (error) {
      console.error("Error sending message", error);

      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "failed" } : msg
        ),
        error: error?.response?.data?.message || error?.message,
      }));

      throw error;
    }
  },

  receiveMessage: (message) => {
    const { currentConversation, currentUser, messages, conversations } = get();

    // check if message already exists
    const messageExists = messages.some((msg) => msg._id === message._id);
    if (messageExists) return;

    // add message if chat open
    if (message.conversation === currentConversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));

      // mark as read
      if (message?.receiver?._id === currentUser?._id) {
        get().markMessagesAsRead();
      }
    }

    // update conversation preview & unread count
    const updatedConversation = conversations?.data?.map((conv) => {
      if (conv._id === message.conversation) {
        return {
          ...conv,
          lastMessage: message,
          unreadCount:
            message?.receiver?._id === currentUser?._id
              ? (conv.unreadCount || 0) + 1
              : conv.unreadCount || 0,
        };
      }
      return conv;
    });
    return {
      conversations: {
        ...conversations,
        data: updatedConversation,
      },
    };
  },

  //mark as read
  markMessagesAsRead: async () => {
    // use latest store values
    const { messages, currentUser } = get();

    if (!messages.length || !currentUser) return;

    // filter messages belonging to this conversation and that are unread for current user
    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" && msg.receiver?._id === currentUser._id
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    try {
      // use plural 'messages' endpoint and send messageIds
      const { data } = await axiosInstance.put("/chats/message/read", {
        messageIds: unreadIds,
      });

      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg
        ),
      }));

      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageIds: unreadIds,
          // notify sender(s) - pick first sender as fallback
          senderId: messages[0]?.sender?._id,
        });
      }
    } catch (error) {
      console.error("failed to mark message as read", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chats/messages/${messageId}`);
      set((state) => ({
        messages: state.messages?.filter((msg) => msg?._id !== messageId),
      }));
      return true;
    } catch (error) {
      console.error("error deleting message", error);
      set({ error: error?.response?.data?.message || error?.message });
      return false;
    }
  },

  //add/change reactions
  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();
    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
      });
    }
  },

  startTyping: async (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation && receiverId) {
      socket.emit("typing_start", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  stopTyping: async (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation && receiverId) {
      socket.emit("typing_stop", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (
      !currentConversation ||
      !typingUsers.has(currentConversation) ||
      !userId
    ) {
      return false;
    }
    return typingUsers.get(currentConversation).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return false;
    const { onlineUsers } = get();

    const user = onlineUsers.get(userId);

    return user?.isOnline || false;
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();

    const user = onlineUsers.get(userId);
    return user?.lastSeen || null;
  },

  cleanup: () => {
    set({
      connections: [],
      currentConversation: null,
      messages: [],
      typingUsers: new Map(),
      onlineUsers: new Map(),
    });
  },
}));
