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
import User from './models/User.model'

import authRoutes from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";
import notificationRoutes from "./routes/notification.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import courseRoutes from "./routes/course.routes";
import adminRoutes from "./routes/admin.routes";
import chatRoutes from "./routes/chatRoutes"
import attendanceRoutes from "./routes/attendance.route"
import subscriptionRoutes from "./routes/subscription.routes";
import journalRoutes from "./routes/journal.routes";



//import { processAndStoreKnowledge } from "./prepare-knowledge";


dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
};

const io = setupSocketIO(server, corsOptions);

app.set("io", io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));

app.use(cors(corsOptions));

app.use(passport.initialize());
app.set("trust proxy", 1);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", chatRoutes);
app.use('/api/attendance', attendanceRoutes);

app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/journal', journalRoutes);



const addManualSubscription = async (): Promise<void> => {
  try {
    const userEmail = 'parva17861@gmail.com';
    
    // Calculate an expiry date 30 days from now
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

    // Find the user by email and update their subscription
    const updatedUser = await User.findOneAndUpdate(
      { email: userEmail },
      {
        $set: {
          'subscription.status': 'active',
          'subscription.endDate': subscriptionEndDate,
        },
      },
      { new: true } // This option returns the updated document
    );

    if (updatedUser) {
      console.log('✅ SUCCESS: Subscription successfully added!');
      console.log(`User: ${updatedUser.name} (${updatedUser.email})`);
      console.log(`New Status: ${updatedUser.subscription.status}`);
      console.log(`Expires On: ${updatedUser.subscription.endDate?.toDateString()}`);
    } else {
      console.error(`❌ ERROR: Could not find user with email: ${userEmail}`);
    }
  } catch (error) {
    console.error('❌ ERROR: An error occurred while adding the subscription:', error);
  }
};

addManualSubscription();





app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {});


// const startServer = async () => {
//   try {
//     // First, connect to the database and wait for it to finish
//     await connectDB();
//     console.log("✅ MongoDB Connected...");

//     // Second, run the one-time knowledge processing script
//     // It will check if data exists and only run if the collection is empty
//     //await processAndStoreKnowledge();

//     // Finally, start the server now that the database is ready
//     const PORT = process.env.PORT || 5000;
//     server.listen(PORT, () => {
//       console.log(`🚀 Server running on port ${PORT}`);
//     });

//   } catch (error) {
//     console.error("❌ Failed to start server:", error);
//     process.exit(1);
//   }
// };

// // --- 3. CALL THE STARTUP FUNCTION ---
// startServer();