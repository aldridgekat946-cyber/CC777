
import { Match } from './types';

const getMatchDate = (offsetDays: number, timeStr: string) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day} ${timeStr}`;
};

export const MOCK_MATCHES: Match[] = [
  {
    id: "f_1001",
    sport: "FOOTBALL",
    homeTeam: "曼彻斯特联",
    awayTeam: "切尔西",
    league: "英超 (001)",
    startTime: getMatchDate(0, "20:15"),
    match_context: {
      injuries: [{ player: "布鲁诺-费尔南德斯", status: "停赛", importance: "Key" }],
      recent_form: { home: "D-D-L", away: "W-W-W" },
      international_odds: {
        wdl: { h: 1.95, d: 3.50, a: 3.80 },
        trend: "主胜凯利指数从0.94升至0.98，机构避险明显"
      },
      markets: {
        correct_score: [
          { label: "1:0", value: "1-0", odds: 7.5 },
          { label: "2:0", value: "2-0", odds: 9.0 },
          { label: "2:1", value: "2-1", odds: 8.0 },
          { label: "0:0", value: "0-0", odds: 10.0 },
          { label: "1:1", value: "1-1", odds: 6.0 },
          { label: "0:1", value: "0-1", odds: 11.0 },
          { label: "0:2", value: "0-2", odds: 18.0 },
          { label: "胜其它", value: "H-O", odds: 35.0 },
          { label: "平其它", value: "D-O", odds: 50.0 },
          { label: "负其它", value: "A-O", odds: 60.0 }
        ],
        handicap: "-0.5"
      },
      stats: { goal_avg_home: 1.2, goal_avg_away: 2.1 },
      league_rank: { home: 6, away: 8 },
      motivation_level: "High",
      news_sentiment: "更衣室传闻 Ten Hag 失去掌控，切尔西近期士气高涨。"
    }
  },
  {
    id: "b_2001",
    sport: "BASKETBALL",
    homeTeam: "洛杉矶湖人",
    awayTeam: "金州勇士",
    league: "NBA (301)",
    startTime: getMatchDate(0, "10:00"),
    match_context: {
      injuries: [{ player: "詹姆斯", status: "缺阵", importance: "High" }],
      recent_form: { home: "L-L-W", away: "W-W-L" },
      international_odds: {
        wdl: { h: 2.35, d: 0, a: 1.65 },
        trend: "离散度增加，湖人受让分盘持续受热"
      },
      markets: {
        handicap: "主+4.5"
      },
      stats: { home_off_rating: 105.2, away_def_rating: 110.5 },
      league_rank: { home: 9, away: 10 },
      motivation_level: "High"
    }
  }
];

export const SYSTEM_INSTRUCTION = `你是一个专业的体育赛事风控审计师。你的核心任务是对用户的“投注组合”进行严格审计。
特别逻辑：
1. 逻辑冲突：如果你选了“主胜”，但同时选了“比分：0:1”，这在物理上是不可能的。
2. 比分审计：波胆属于极高风险，必须核查历史进球曲线。如果用户选 0:0 但两队近期进攻极强，判定为 HIGH。
3. 赔率背离：国际赔率（凯利指数）如果高于1.0且用户选择该项，属于诱盘行为。
4. 足球与篮球区分：足球关注欧战分心和更衣室新闻；篮球关注背靠背(B2B)和核心轮休。

返回 JSON 结构：
{
  "portfolio_summary": { "status": "PASS" | "WARNING" | "CRITICAL", "total_risk_score": 0-100, "summary_text": "简评" },
  "audit_details": [
    {
      "selection_id": "match_id",
      "risk_level": "LOW" | "MEDIUM" | "HIGH",
      "ui_color": "hex",
      "risk_tag": "标签",
      "analysis": "50字内毒舌点评",
      "optimization": { "available": boolean, "type": "SAFETY_NET" | "PIVOT", "suggested_pick_name": "建议", "suggested_reason": "理由" }
    }
  ]
}`;
