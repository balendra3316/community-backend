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
import Admin from './models/Admin.model'
import bcrypt from 'bcryptjs';




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
  origin: process.env.CLIENT_URL || "*",
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















app.use(notFound);
app.use(errorHandler);



// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {});


const startServer = async () => {
  try {
    // First, connect to the database and wait for it to finish
    await connectDB();
    console.log("✅ MongoDB Connected...");

    // Second, run the one-time knowledge processing script
    // It will check if data exists and only run if the collection is empty
    //await processAndStoreKnowledge();

    // Finally, start the server now that the database is ready
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
};

// --- 3. CALL THE STARTUP FUNCTION ---
startServer();






// // --- ADMIN CREATION FUNCTION ---
// const addAdminToDatabase = async (
//   email: string,
//   password: string,
//   name: string
// ): Promise<void> => {
//   try {
//     // Check if admin already exists
//     const existingAdmin = await Admin.findOne({ email });
//     if (existingAdmin) {
//       console.log(`⚠️  Admin with email ${email} already exists!`);
//       return;
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create new admin
//     const newAdmin = new Admin({
//       email,
//       password: hashedPassword,
//       name,
//     });

//     // Save to database
//     await newAdmin.save();
//     console.log(`✅ Admin successfully created!`);
//     console.log(`   Email: ${email}`);
//     console.log(`   Name: ${name}`);
//   } catch (error) {
//     console.error("❌ Error creating admin:", error);
//   }
// };

// // --- UNCOMMENT BELOW TO ADD AN ADMIN ---
//  addAdminToDatabase('vinay626397@gmail.com', 'Vin@y123', 'Tech Community Admin');








// const addManualSubscription = async (): Promise<void> => {
//   try {
//     const userEmail = 'parva17861@gmail.com';
    
//     // Calculate an expiry date 30 days from now
//     const subscriptionEndDate = new Date();
//     subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

//     // Find the user by email and update their subscription
//     const updatedUser = await User.findOneAndUpdate(
//       { email: userEmail },
//       {
//         $set: {
//           'subscription.status': 'active',
//           'subscription.endDate': subscriptionEndDate,
//         },
//       },
//       { new: true } // This option returns the updated document
//     );

//     if (updatedUser) {
//       console.log('✅ SUCCESS: Subscription successfully added!');
//       console.log(`User: ${updatedUser.name} (${updatedUser.email})`);
//       console.log(`New Status: ${updatedUser.subscription.status}`);
//       console.log(`Expires On: ${updatedUser.subscription.endDate?.toDateString()}`);
//     } else {
//       console.error(`❌ ERROR: Could not find user with email: ${userEmail}`);
//     }
//   } catch (error) {
//     console.error('❌ ERROR: An error occurred while adding the subscription:', error);
//   }
// };

// addManualSubscription();






// export const runBadgeBackfill = async (): Promise<void> => {
//     console.log('--- Starting one-time backfill for user levels and badges ---');
//     try {
//         const users = await User.find({}, 'points leaderboardBadges level').cursor();

//         let updatedCount = 0;
//         for await (const user of users) {
//             const userPoints = user.points;
//             let newLevel = 0;
//             // Create a quick lookup of levels the user already has
//             const awardedLevels = new Set(user.leaderboardBadges.map(badge => badge.level));

//             // Determine the highest level the user has earned based on their points
//             for (const levelInfo of LEVEL_CONFIG) {
//                 if (userPoints >= levelInfo.points) {
//                     newLevel = levelInfo.level;
//                 } else {
//                     break; // No need to check higher levels
//                 }
//             }

//             // Find all badges the user should have but doesn't yet
//             const badgesToAward = LEVEL_CONFIG
//                 .filter(levelInfo => userPoints >= levelInfo.points && !awardedLevels.has(levelInfo.level));

//             let wasModified = false;

//             // Add the new badges if any were found
//             if (badgesToAward.length > 0) {
//                 const newBadges = badgesToAward.map(levelInfo => ({
//                     name: levelInfo.name,
//                     level: levelInfo.level,
//                     earnedAt: new Date(),
//                 }));
//                 user.leaderboardBadges.push(...newBadges);
//                 wasModified = true;
//             }

//             // Update the user's main level if it's different
//             if (user.level !== newLevel) {
//                 user.level = newLevel;
//                 wasModified = true;
//             }

//             // Only save to the database if a change was actually made
//             if (wasModified) {
//                 await user.save();
//                 updatedCount++;
//             }
//         }

//         console.log(`[SUCCESS] Backfill complete. ${updatedCount} users were updated.`);
//         console.log('--- You can now safely remove the runBadgeBackfill() call from your server startup file. ---');

//     } catch (error) {
//         console.error('[ERROR] An error occurred during the backfill process:', error);
//     }
// };




// runBadgeBackfill();









// async function dropIndex() {
//   try {
    
    

//     // This command will drop the index by its name
//     // You can find the name by checking the collection's indexes in a shell or GUI.
//     // A single-field index is usually `field_name_1`
//     const indexName = 'googleId_1'; 
//     const indexResult = await User.collection.dropIndex(indexName);

//     console.log(`Successfully dropped index '${indexName}' from 'users' collection.`);
//     console.log(indexResult);

//   } catch (err:any) {
//     // If the index doesn't exist, it will throw an error.
//     if (err.code === 27) { // 27 is the error code for "index not found"
//         console.log(`Index  not found. It may have already been dropped.`);
//     } else {
//         console.error("Error dropping index:", err);
//     }
//   } finally {
    
//     console.log("MongoDB disconnected.");
//   }
// }

// // Call the function
// dropIndex();

