
export type SportType = 'FOOTBALL' | 'BASKETBALL';

export interface MarketOdds {
  label: string;
  value: string;
  odds: number;
}

export interface Match {
  id: string;
  sport: SportType;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  match_context: {
    injuries: { player: string; status: string; importance: string }[];
    recent_form: { home: string; away: string; };
    international_odds: {
      wdl: { h: number; d: number; a: number }; // 胜平负
      trend: string;
      kelly_index?: { h: number; d: number; a: number }; // 凯利指数
    };
    markets: {
      correct_score?: MarketOdds[]; // 波胆
      handicap?: string; // 让球数/盘口
    };
    stats: {
      home_off_rating?: number;
      away_def_rating?: number;
      goal_avg_home?: number;
      goal_avg_away?: number;
    };
    league_rank: { home: number; away: number; };
    motivation_level: "High" | "Medium" | "Low";
    news_sentiment?: string;
  };
}

export interface UserSelection {
  match_id: string;
  match_name: string;
  sport: SportType;
  market_type: 'WDL' | 'CS' | 'TOTALS'; // Removed HTFT
  pick: string;
}

export interface Optimization {
  available: boolean;
  type: "SAFETY_NET" | "PIVOT";
  suggested_pick_name: string;
  suggested_reason: string;
}

export interface AuditDetail {
  selection_id: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  ui_color: string;
  risk_tag: string;
  analysis: string;
  optimization: Optimization;
}

export interface PortfolioSummary {
  status: "PASS" | "WARNING" | "CRITICAL";
  total_risk_score: number;
  summary_text: string;
}

export interface AuditResponse {
  portfolio_summary: PortfolioSummary;
  audit_details: AuditDetail[];
}
