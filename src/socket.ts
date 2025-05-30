// src/socket.ts
import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import Notification from './models/Notification.model';

// Socket.io setup function
export const setupSocketIO = (server: HttpServer, corsOptions: any) => {
  // Initialize Socket.io with CORS options
  const io = new SocketIOServer(server, {
    cors: corsOptions,
    path: "/api/socket.io"
  });

  // Set up socket.io event handlers
  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    // Join user's room for private notifications
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });

    socket.on("notificationRead", async ({ notificationId, userId }) => {
      try {
        const notification = await Notification.findById(notificationId);
        if (notification && notification.recipient.toString() === userId) {
          notification.read = true;
          await notification.save();
          
          // Emit the updated unread count
          const count = await Notification.countDocuments({
            recipient: userId,
            read: false
          });
          io.to(userId).emit('unreadCountUpdate', { count });
        }
      } catch (error) {
        console.error('Error updating notification read status:', error);
      }
    });
  });

  return io;
};