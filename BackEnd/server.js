const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const padRoutes = require("./routes/padRoutes");
const ieeeRoutes = require("./routes/ieeeRoutes");
const usersRoutes = require("./routes/userRoutes");
const Pad = require("./models/Pad");
const Mindmap = require("./models/Mindmap");
const path = require("path");
const mindmapRoutes = require("./routes/mindmapRoutes");
require("dotenv").config();

const app = express();
connectDB();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running successfully!" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory structure for tracking connected users per pad
let pads = {};
let mindmaps = {};

// A simple palette and helper for assigning colors

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // 1. User joins a specific pad
  socket.on("join-pad", async ({ padId, userId, userName }) => {
    socket.join(padId);
    try {
      const pad = await Pad.findById(padId);
      if (!pad) return socket.emit("error", { msg: "Pad not found" });
      if (!pad.users.includes(userId)) {
        pad.users.push(userId);
        await pad.save();
      }
      if (!pads[padId]) {
        pads[padId] = { users: {} };
      }
      pads[padId].users[userId] = { userId, userName, socketId: socket.id };
      socket.emit("load-pad", {
        sections: pad.sections || [],
        authors: pad.authors || [],
        references: pad.references || [],
        title: pad.title || "",
        abstract: pad.abstract || "",
        keyword: pad.keyword || "",
      });
      io.to(padId).emit("update-users", Object.values(pads[padId].users));
    } catch (err) {
      console.error("❌ Error joining pad:", err);
    }
  });

  // 2. "send-changes": Real-time Quill content updates
  socket.on(
    "send-changes",
    async ({ padId, sectionId, subId, fullContent, userId, cursor }) => {
      try {
        const pad = await Pad.findById(padId);
        if (!pad) return socket.emit("error", { msg: "Pad not found" });
        const sectionIndex = pad.sections.findIndex((s) => s.id === sectionId);
        if (sectionIndex !== -1) {
          if (!subId) {
            pad.sections[sectionIndex].content = fullContent;
          } else {
            const subIndex = pad.sections[sectionIndex].subsections.findIndex(
              (sub) => sub.id === subId
            );
            if (subIndex !== -1) {
              pad.sections[sectionIndex].subsections[subIndex].content =
                fullContent;
            }
          }
          await pad.save();
        }
        console.log(
          `[EditLog] User ${userId} changed section ${sectionId} subId ${subId} to fullContent: ${JSON.stringify(
            fullContent
          )} at ${new Date().toISOString()}`
        );
        // Broadcast the full content update to all OTHER clients.
        socket.to(padId).emit("receive-changes", {
          sectionId,
          subId,
          fullContent,
          userId,
          cursor: cursor || { index: 0, length: 0 },
        });
      } catch (err) {
        console.error("❌ Error saving changes:", err);
      }
    }
  );

  function getColorForUser(userId) {
    // Create a hash from the userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Convert hash to hex color
    let color = "#";
    for (let i = 0; i < 3; i++) {
      // Extract 8 bits and convert to hex
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).substr(-2);
    }
    return color;
  }

  socket.on("cursor-selection", ({ padId, userId, cursor, nodeId }) => {
    const color = getColorForUser(userId);
    socket.to(padId).emit("remote-cursor", { userId, cursor, color, nodeId });
  });

  // 3. "update-pad": Update entire pad structure.
  socket.on(
    "update-pad",
    async ({
      padId,
      sections,
      authors,
      references,
      title,
      abstract,
      keyword,
    }) => {
      try {
        const pad = await Pad.findById(padId);
        if (!pad) return;
        pad.sections = sections;
        pad.authors = authors;
        pad.references = references;
        if (title !== undefined) pad.title = title;
        if (abstract !== undefined) pad.abstract = abstract;
        if (keyword !== undefined) pad.keyword = keyword;
        await pad.save();
        io.to(padId).emit("load-pad", {
          sections: pad.sections,
          authors: pad.authors,
          references: pad.references,
          title: pad.title,
          abstract: pad.abstract,
          keyword: pad.keyword,
        });
      } catch (err) {
        console.error("❌ Error updating pad:", err);
      }
    }
  );

  // 4. Handle user disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (const padId in pads) {
      if (!pads[padId]) continue;
      let userToRemove = null;
      for (const uId in pads[padId].users) {
        if (pads[padId].users[uId].socketId === socket.id) {
          userToRemove = uId;
          break;
        }
      }
      if (userToRemove) {
        console.log(`🔻 Removing user: ${userToRemove} from pad ${padId}`);
        delete pads[padId].users[userToRemove];
        io.to(padId).emit("update-users", Object.values(pads[padId].users));
      }
    }

    for (const mindmapId in mindmaps) {
      if (!mindmaps[mindmapId]) continue;
      let userToRemove = null;
      let userData = null;
      // Use the actual key from your mindmaps users object.
      for (const uId in mindmaps[mindmapId].users) {
        if (mindmaps[mindmapId].users[uId].socketId === socket.id) {
          userToRemove = uId;
          userData = mindmaps[mindmapId].users[uId];
          break;
        }
      }
      if (userToRemove) {
        console.log(`🔻 Removing user: ${userToRemove} from mindmap ${mindmapId}`);
        delete mindmaps[mindmapId].users[userToRemove];
        // Emit update for the mindmap users list
        io.to(mindmapId).emit("mindmap-users", Object.values(mindmaps[mindmapId].users));
  
        // Emit the "node-selected" event with null nodeId and the user's name
        // Make sure you send the same identifier (e.g., username) as used on the client side.
        const userName = (userData && userData.username) || userToRemove;
        io.to(mindmapId).emit("node-selected", { nodeId: null, userName });
      }
    }
  });

  // 5. If user manually leaves the pad
  socket.on("leave-pad", ({ padId, userId }) => {
    console.log(`❌ User ${userId} left pad ${padId}`);
    if (pads[padId] && pads[padId].users[userId]) {
      delete pads[padId].users[userId];
      io.to(padId).emit("update-users", Object.values(pads[padId].users));
    }
  });

  // ─────────────────────────────────────────────
  // NEW: MINDMAP LOGIC
  // ─────────────────────────────────────────────

  // 1. User joins a specific mindmap
  socket.on("join-mindmap", async ({ mindmapId, userId, userName }) => {
    socket.join(mindmapId);

    if (!mindmaps[mindmapId]) {
      mindmaps[mindmapId] = { users: {} };
    }
    // Set active flag to true on join.
    mindmaps[mindmapId].users[userId] = {
      userId,
      userName,
      socketId: socket.id,
      active: true,
    };

    // Broadcast the updated user list to all clients in this mindmap.
    io.to(mindmapId).emit(
      "mindmap-users",
      Object.values(mindmaps[mindmapId].users)
    );
  });

  socket.on("node-selected", ({ mindmapId, nodeId, userName }) => {
    // Broadcast to everyone else in that mindmap room
    socket.to(mindmapId).emit("node-selected", { nodeId, userName });
  });

  // 2. Update mindmap changes
  socket.on("update-mindmap", async ({ mindmapId, nodes, links, userId }) => {
    try {
      // If you want to save to DB each time, do so here:
      // await Mindmap.findByIdAndUpdate(mindmapId, { nodes, links });

      // Then broadcast the changes to everyone else
      io.to(mindmapId).emit("receive-mindmap-changes", {
        nodes,
        links,
        userId,
      });
    } catch (err) {
      console.error("❌ Error updating mindmap:", err);
    }
  });

  // 3. If user manually leaves the mindmap
  socket.on("leave-mindmap", ({ mindmapId, userId }) => {
    console.log(`❌ User ${userId} left mindmap ${mindmapId}`);
    if (mindmaps[mindmapId] && mindmaps[mindmapId].users[userId]) {
      delete mindmaps[mindmapId].users[userId];
      io.to(mindmapId).emit(
        "mindmap-users",
        Object.values(mindmaps[mindmapId].users)
      );
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/pads", padRoutes);
app.use("/api/convert", ieeeRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/mindmaps", mindmapRoutes);

// Use in Local
// server.listen(4000, () => {
//   console.log("✅ Server running on port 4000");
// });

// Use when hosted
const port = process.env.PORT || 4000;
server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});
