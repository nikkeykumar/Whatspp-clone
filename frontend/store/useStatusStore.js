import { create } from "zustand";
import { getSocket } from "../src/services/chat_Services";
import axiosInstance from "../src/services/url_Services";

const useStatusStore = create((set, get) => ({
  //state
  statuses: [],
  loading: false,
  error: null,
  init: async () => {
    const { fetchStatuses, initializeSocket } = get();
    initializeSocket();
    await fetchStatuses();
  },

  //Active
  setStatuses: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  //Initialize the socket listeners
  initializeSocket: () => {
    const socket = getSocket();
    if (socket) return;

    //Real-time status events
    socket.on("new_status", (newStatus) => {
      set((state) => ({
        statuses: state.statuses.some((s) => s._id === newStatus._id)
          ? state.statuses
          : [newStatus, ...state.statuses],
      }));
    }),
      socket.on("status_deleted", (statusId) => {
        set((state) => ({
          statuses: state.statuses.filter((s) => s._id !== statusId),
        }));
      }),
      socket.on("status_viewed", (statusId, viewers) => {
        set((state) => ({
          statuses: state.statuses.map((status) =>
            status._id === statusId ? { ...status, viewers } : status
          ),
        }));
      });
  },
  cleanupSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("new_status");
      socket.off("status_deleted");
      socket.off("status_viewed");
    }
  },
  //fetch status
  fetchStatuses: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/status/get");
      set({ statuses: data.data || [], loading: false });
    } catch (error) {
      console.error("Error fetching status ", error);
      set({ error: error.message, loading: false });
    }
  },
  //create status
  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      if (statusData.file) {
        formData.append("media", statusData.file);
      }
      if (statusData.content?.trim()) {
        formData.append("content", statusData.content);
      }

      const { data } = await axiosInstance.post("/status/create", formData);
      //add to status in local state
      if (data?.data) {
        set((state) => ({
          statuses: state.statuses.some((s) => s._id === data.data._id)
            ? state.statuses
            : [data.data, ...state.statuses],
        }));
      }
      set({ loading: false });
    } catch (error) {
      console.error("Error creating status ", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  //view status
  viewStatus: async (statusId) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.put(`/status/${statusId}/view`);
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status } : status
        ),
      }));
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  deleteStatus: async (statusId) => {
    try {
      await axiosInstance.delete(`/status/${statusId}`);
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
    } catch (error) {
      console.error("Error deleteStatus status ", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  getStatusViewers: async (statusId) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(`/status/${statusId}/viewers`);
      set({ loading: false });
      return data.data;
    } catch (error) {
      console.error("Error getting status viewers ", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  //helper functions for grouped status
  getGroupedStatus: () => {
    const { statuses } = get();

    return statuses.reduce((acc, status) => {
      const statusUserId = status.user?._id;

      if (!acc[statusUserId]) {
        acc[statusUserId] = {
          id: statusUserId,
          name: status?.user?.username,
          avatar: status?.user?.ProfilePicture,
          statuses: [],
        };
      }
      acc[statusUserId].statuses.push({
        id: status._id,
        media: status.content,
        contentType: status.contentType,
        timestamp: status.createdAt,
        viewers: status.viewers,
      });
      return acc;
    }, {});
  },
  getUserStatuses: (userId) => {
    const groupedStatus = get().getGroupedStatus();

    return userId ? groupedStatus[userId] : null;
  },

  getOtherStatuses: (userId) => {
    const groupedStatus = get().getGroupedStatus();
    return Object.values(groupedStatus).filter(
      (contact) => contact.id !== userId
    );
  },

  clearError: () => set({ error: null }),
  reset: () => set({ statuses: [], loading: false, error: null }),
}));
export { useStatusStore };
