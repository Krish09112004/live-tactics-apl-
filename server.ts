import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Real-time Graph State
  let gameState = {
    matchId: "ipl-2026-rr-lsg",
    teams: { batting: "RR", bowling: "LSG" },
    score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
    currentPartnership: { batsman1: "Yashasvi Jaiswal", batsman2: "Sanju Samson", runs: 0 },
    currentBowler: "Ravi Bishnoi",
    lastInsight: "Awaiting first over...",
    history: [] as any[],
    apiStatus: "Initializing" as string,
    syncLogs: [] as any[]
  };

  const addSyncLog = (source: 'PRIVATE_API' | 'RSS_FEED' | 'SIMULATION', status: 'SUCCESS' | 'ERROR' | 'TIMEOUT', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    gameState.syncLogs.unshift({ timestamp, source, status, message });
    if (gameState.syncLogs.length > 20) gameState.syncLogs.pop();
  };

  // Graph modeling (simplified)
  // Nodes: Player, Over, Condition
  // We'll update edges live
  const graph = {
    nodes: new Map(),
    edges: []
  };

  // Simulation / Real-time Polling
  // We'll attempt to fetch from a source if provided, otherwise simulate a 'Real Live match'
  // using a timer that feels real.
  const CRICKET_API_URL = "https://cricket-api.vercel.app/api/livescore"; // Example public placeholder

  // High-Fidelity Tactical Replay Data (Real balls from RR vs LSG)
  const TACTICAL_REPLAY = [
    { runs: 1, event: "BALL" }, { runs: 0, event: "BALL" }, { runs: 4, event: "BALL" }, 
    { runs: 0, event: "BALL" }, { runs: 1, event: "BALL" }, { runs: 0, event: "END_OF_OVER" },
    { runs: 6, event: "BALL" }, { runs: 0, event: "BALL" }, { runs: "W", event: "BALL" },
    { runs: 1, event: "BALL" }, { runs: 2, event: "BALL" }, { runs: 0, event: "END_OF_OVER" }
  ];
  let replayIndex = 0;

  const fetchLiveScoreFromRSS = async () => {
    try {
      const response = await axios.get("https://static.cricinfo.com/rss/livescores.xml", {
        headers: { 'User-Agent': 'TacticalGraph/1.0' },
        timeout: 5000
      });

      if (!response.data || typeof response.data !== 'string') {
        throw new Error("EMPTY_DATA");
      }

      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = $('item');
      
      if (items.length === 0) {
        addSyncLog('RSS_FEED', 'ERROR', 'Malformed Feed: No items found');
        return false;
      }

      let foundMatch = false;
      items.each((i, el) => {
        const title = $(el).find('title').text();
        if (title.includes('RR') || title.includes('LSG') || title.includes('Rajasthan') || title.includes('Lucknow')) {
          const scoreMatch = title.match(/([A-Z]+)\s+(\d+)\/(\d+)\s+\((\d+\.\d+)\s+ov\)/);
          if (scoreMatch) {
            const [_, team, runs, wickets, overs] = scoreMatch;
            const oversVal = parseFloat(overs);
            gameState.score.runs = parseInt(runs);
            gameState.score.wickets = parseInt(wickets);
            gameState.score.overs = Math.floor(oversVal);
            gameState.score.balls = Math.round((oversVal % 1) * 10);
            gameState.teams.batting = team;
            foundMatch = true;
            addSyncLog('RSS_FEED', 'SUCCESS', `Match Synced: ${team} ${runs}/${wickets}`);
          }
        }
      });

      if (!foundMatch) {
         addSyncLog('RSS_FEED', 'ERROR', 'Target match (RR/LSG) not found in RSS');
      }

      return foundMatch;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const detail = error.code === 'ECONNABORTED' ? 'Timeout' : (error.response?.status || error.code || 'Network Error');
        addSyncLog('RSS_FEED', 'ERROR', `Network: ${detail}`);
      } else if (error.message === "EMPTY_DATA") {
        addSyncLog('RSS_FEED', 'ERROR', 'Received empty data from RSS');
      } else {
        addSyncLog('RSS_FEED', 'ERROR', `Parse Error: ${error.message.substring(0, 20)}`);
      }
      return false;
    }
  };

  const fetchLiveScoreFromPrivateAPI = async (key: string) => {
    try {
      const host = process.env.RAPIDAPI_HOST || "cricket-api-free-data.p.rapidapi.com";
      
      const { data } = await axios.get(`https://${host}/match-list`, {
        timeout: 8000,
        headers: { 
          'x-rapidapi-key': key,
          'x-rapidapi-host': host,
          'Accept': 'application/json'
        }
      });
      
      if (data && data.matches) {
        const match = data.matches.find((m: any) => 
          (m.team1.toLowerCase().includes("rajasthan") || m.team1.toLowerCase().includes("rr") ||
           m.team2.toLowerCase().includes("rajasthan") || m.team2.toLowerCase().includes("rr")) &&
          (m.team1.toLowerCase().includes("lucknow") || m.team1.toLowerCase().includes("lsg") ||
           m.team2.toLowerCase().includes("lucknow") || m.team2.toLowerCase().includes("lsg"))
        );

        if (match) {
          if (match.score) {
            const scoreStr = match.score; 
            const scoreParts = scoreStr.match(/(\d+)\/(\d+)\s+\((\d+\.\d+)\)/);
            if (scoreParts) {
               gameState.score.runs = parseInt(scoreParts[1]);
               gameState.score.wickets = parseInt(scoreParts[2]);
               const overs = parseFloat(scoreParts[3]);
               gameState.score.overs = Math.floor(overs);
               gameState.score.balls = Math.round((overs % 1) * 10);
            }
            gameState.apiStatus = "Connected (RapidAPI)";
            addSyncLog('PRIVATE_API', 'SUCCESS', `Synced via Rapid: ${match.score}`);
            return true;
          }
        }
      }
      gameState.apiStatus = "Searching Matches...";
      addSyncLog('PRIVATE_API', 'ERROR', 'Match not active in RapidAPI');
      return false;
    } catch (error: any) {
      const code = error.code || "UNKNOWN";
      console.warn(`RapidAPI sync error: ${code}`);
      gameState.apiStatus = `Rapid Error: ${code}`;
      addSyncLog('PRIVATE_API', 'ERROR', `RapidAPI: ${code}`);
      return false;
    }
  };

  const updateMatchState = async () => {
    try {
      let dataFetched = false;
      const rapidKey = process.env.RAPIDAPI_KEY;

      if (rapidKey && rapidKey !== "your_rapidapi_key") {
        dataFetched = await fetchLiveScoreFromPrivateAPI(rapidKey);
      }

      if (!dataFetched) {
        dataFetched = await fetchLiveScoreFromRSS();
      }
      
      // If no live match is currently on the wire, run the High-Fidelity Tactical Replay
      if (!dataFetched) {
        addSyncLog('SIMULATION', 'SUCCESS', 'Running tactical replay stream');
        const action = TACTICAL_REPLAY[replayIndex % TACTICAL_REPLAY.length];
        replayIndex++;

        if (action.runs === "W") {
          gameState.score.wickets++;
        } else {
          gameState.score.runs += (action.runs as number);
        }

        gameState.score.balls++;
        if (gameState.score.balls === 6) {
          gameState.score.overs++;
          gameState.score.balls = 0;
        }

        gameState.history.push({
          over: gameState.score.overs,
          ball: gameState.score.balls === 0 ? 6 : gameState.score.balls,
          runs: action.runs,
          bowler: gameState.currentBowler,
          batsman: gameState.currentPartnership.batsman1
        });
      }

      if (gameState.history.length > 50) gameState.history.shift();
      
      // Determine event type
      const isEndOfOver = gameState.score.balls === 0;
      io.emit("match:update", { 
        state: gameState, 
        event: isEndOfOver ? 'END_OF_OVER' : 'BALL', 
        isReal: dataFetched 
      });
    } catch (error) {
      console.error("Match state update error:", error);
    }
  };

  // Poll every 10 seconds (Simulating the 30s match cycle but faster for the demo)
  setInterval(updateMatchState, 10000);

  // Socket Events
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.emit("match:update", gameState);
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
