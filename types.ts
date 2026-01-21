
export type SportType = 'FOOTBALL' | 'BASKETBALL';
export type DataSource = 'OFFICIAL' | 'INTERNATIONAL';

export interface MarketOdds {
  label: string;
  value: string;
  odds: number;
}

export interface GroundingUrl {
  title: string;
  uri: string;
}

export interface Match {
  id: string;
  sport: SportType;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  grounding_urls?: GroundingUrl[];
  match_context: {
    injuries: { player: string; status: string; importance: string }[];
    recent_form: { home: string; away: string; };
    international_odds: {
      wdl: { h: number; d: number; a: number }; // 胜平负
      wdhl?: { h: number; d: number; a: number; handicap: number }; // 让球胜平负
      totals_odds?: { over: number; under: number }; // 大小分赔率
      total_goals?: MarketOdds[]; // 总进球 (0, 1, 2... 7+)
      trend: string;
    };
    markets: {
      correct_score?: MarketOdds[]; // 全量波胆
      handicap?: string; // 让球数 (e.g. "-1")
      totals?: string; // 总分盘口
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
  market_type: 'WDL' | 'WDHL' | 'CS' | 'TG' | 'TOTALS';
  pick: string;
  odds: number; // 选定选项的赔率
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
