// // src/index.ts
// import express from "express";
// import http from "http";
// import { Server as SocketIOServer } from "socket.io";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import dotenv from "dotenv";
// import helmet from "helmet";
// import morgan from "morgan";
// import connectDB from "./config/db";
// import passport from "./config/passport";
// import { notFound, errorHandler } from "./middleware/error.middleware";
// import courseRoutes from "./routes/course.routes";
// import adminRoutes from "./routes/admin.routes";

// // Routes
// import authRoutes from "./routes/auth.routes";
// import postRoutes from "./routes/post.routes";
// import commentRoutes from "./routes/comment.routes";
// import notificationRoutes from "./routes/notification.routes";
// import leaderboardRoutes from "./routes/leaderboard.routes";

// // Load environment variables
// dotenv.config();

// // Connect to MongoDB
// connectDB();

// // Initialize Express app
// const app = express();
// const server = http.createServer(app);
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: process.env.CLIENT_URL,
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// // Set up socket.io
// app.set("io", io);
// io.on("connection", (socket) => {
//   console.log("A user connected", socket.id);

//   // Join user's room for private notifications
//   socket.on("join", (userId) => {
//     socket.join(userId);
//     console.log(`User ${userId} joined their room`);
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected");
//   });
// });

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(helmet());
// app.use(morgan("dev"));
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL,
//     credentials: true,
//   })
// );

// // Passport middleware
// app.use(passport.initialize());

// app.get("/", (req, res) => {
//   res.send("server is running");
// });
// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/posts", postRoutes);
// app.use("/api/comments", commentRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api/leaderboard", leaderboardRoutes);
// app.use("/api/courses", courseRoutes);
// app.use("/api/admin", adminRoutes);

// // Error handling middleware
// app.use(notFound);
// app.use(errorHandler);

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

















// src/index.ts
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/db";
import passport from "./config/passport";
import { notFound, errorHandler } from "./middleware/error.middleware";
import { setupSocketIO } from "./socket";

import authRoutes from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";
import notificationRoutes from "./routes/notification.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import courseRoutes from "./routes/course.routes";
import adminRoutes from "./routes/admin.routes";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// CORS configuration for both Express and Socket.io
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// Initialize Socket.io with the server and CORS options
const io = setupSocketIO(server, corsOptions);

// Set up global access to io
app.set("io", io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan("dev"));

// Apply CORS middleware
app.use(cors(corsOptions));

// Passport middleware
app.use(passport.initialize());
app.set('trust proxy', 1);

app.get("/", (req, res) => {
  res.send("server is running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);







// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

























// // src/index.ts
// // src/index.ts (updated CORS configuration)
// import express from "express";
// import http from "http";
// import { Server as SocketIOServer } from "socket.io";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import dotenv from "dotenv";
// import helmet from "helmet";
// import { RequestHandler } from "express";
// import morgan from "morgan";
// import connectDB from "./config/db";
// import passport from "./config/passport";
// import { notFound, errorHandler } from "./middleware/error.middleware";
// import courseRoutes from "./routes/course.routes";
// import adminRoutes from "./routes/admin.routes";
// import Notification from './models/Notification.model';

// // Routes
// import authRoutes from "./routes/auth.routes";
// import postRoutes from "./routes/post.routes";
// import commentRoutes from "./routes/comment.routes";
// import notificationRoutes from "./routes/notification.routes";
// import leaderboardRoutes from "./routes/leaderboard.routes";

// // Load environment variables
// dotenv.config();

// // Connect to MongoDB
// connectDB();

// // Initialize Express app
// const app = express();
// const server = http.createServer(app);

// // CORS configuration for both Express and Socket.io
// const corsOptions = {
//   origin: process.env.CLIENT_URL || 'http://localhost:3000',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
//   exposedHeaders: ['Content-Range', 'X-Content-Range']
// };

// // Initialize Socket.io with CORS options
// const io = new SocketIOServer(server, {
//   cors: corsOptions,
//   path: "/api/socket.io"
// });

// // Set up socket.io
// app.set("io", io);
// io.on("connection", (socket) => {
//   console.log("A user connected", socket.id);

//   // Join user's room for private notifications
//   socket.on("join", (userId) => {
//     socket.join(userId);
//     console.log(`User ${userId} joined their room`);
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected");
//   });

//   socket.on("notificationRead", async ({ notificationId, userId }) => {
//     try {
//       const notification = await Notification.findById(notificationId);
//       if (notification && notification.recipient.toString() === userId) {
//         notification.read = true;
//         await notification.save();
        
//         // Emit the updated unread count
//         const count = await Notification.countDocuments({
//           recipient: userId,
//           read: false
//         });
//         io.to(userId).emit('unreadCountUpdate', { count });
//       }
//     } catch (error) {
//       console.error('Error updating notification read status:', error);
//     }
//   });
// });

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" }
// }));
// app.use(morgan("dev"));

// // Apply CORS middleware
// app.use(cors(corsOptions));

// // Pre-flight requests
// // app.options('/*', cors(corsOptions));

// // Passport middleware
// app.use(passport.initialize());
// app.use((req, res, next) => {
//   req.io = io;
//   next();
// });
// app.set('trust proxy', 1);

// // const corsHeaderMiddleware: RequestHandler = (req, res, next) => {
// //   res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
// //   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
// //   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
// //   res.header('Access-Control-Allow-Credentials', 'true');

// //   if (req.method === 'OPTIONS') {
// //     return res.sendStatus(200);
// //   }

// //   next();
// // };

// // app.use(corsHeaderMiddleware); // ✅ clean and reliable



// app.get("/", (req, res) => {
//   res.send("server is running");
// });

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/posts", postRoutes);
// app.use("/api/comments", commentRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api/leaderboard", leaderboardRoutes);
// app.use("/api/courses", courseRoutes);
// app.use("/api/admin", adminRoutes);

// // Error handling middleware
// app.use(notFound);
// app.use(errorHandler);

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });