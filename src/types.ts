export interface BallRecord {
  over: number;
  ball: number;
  runs: number | 'W';
  bowler: string;
  batsman: string;
  commentary?: string;
}

export interface SyncLog {
  timestamp: string;
  source: 'PRIVATE_API' | 'RSS_FEED' | 'SIMULATION';
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  message: string;
}

export interface GameState {
  matchId: string;
  teams: { batting: string; bowling: string };
  score: {
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
  };
  currentPartnership: {
    batsman1: string;
    batsman2: string;
    runs: number;
  };
  currentBowler: string;
  lastInsight: string;
  history: BallRecord[];
  apiStatus?: string;
  syncLogs?: SyncLog[];
}

export interface GraphNode {
  id: string;
  type: 'PLAYER' | 'TEAM' | 'CONDITION' | 'MATCH_EVENT';
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'PLAYS_FOR' | 'BOWLS_TO' | 'DISMISSES' | 'BUFFS' | 'NERFS';
  weight: number;
}
