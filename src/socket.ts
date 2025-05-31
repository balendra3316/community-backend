
import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import Notification from './models/Notification.model';


export const setupSocketIO = (server: HttpServer, corsOptions: any) => {

  const io = new SocketIOServer(server, {
    cors: corsOptions,
    path: "/api/socket.io"
  });


  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.join(userId);
    });

    socket.on("disconnect", () => {
    });

    socket.on("notificationRead", async ({ notificationId, userId }) => {
      try {
        const notification = await Notification.findById(notificationId);
        if (notification && notification.recipient.toString() === userId) {
          notification.read = true;
          await notification.save();
          

          const count = await Notification.countDocuments({
            recipient: userId,
            read: false
          });
          io.to(userId).emit('unreadCountUpdate', { count });
        }
      } catch (error) {
      }
    });
  });

  return io;
};