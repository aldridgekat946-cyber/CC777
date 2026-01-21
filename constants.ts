
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
    league: "英超 (周日001)",
    startTime: getMatchDate(0, "20:15"),
    match_context: {
      injuries: [{ player: "布鲁诺-费尔南德斯", status: "停赛", importance: "Key" }],
      recent_form: { home: "D-D-L", away: "W-W-W" },
      international_odds: {
        wdl: { h: 1.95, d: 3.50, a: 3.80 },
        wdhl: { h: 3.60, d: 3.65, a: 1.72, handicap: -1 },
        total_goals: [
          { label: "0球", value: "0", odds: 12.0 },
          { label: "1球", odds: 4.8, value: "1" },
          { label: "2球", odds: 3.4, value: "2" },
          { label: "3球", odds: 3.8, value: "3" },
          { label: "4球", odds: 5.5, value: "4" },
          { label: "5球", odds: 9.5, value: "5" },
          { label: "6球", odds: 16.0, value: "6" },
          { label: "7+球", odds: 25.0, value: "7+" }
        ],
        trend: "主胜凯利指数波动剧烈"
      },
      markets: {
        correct_score: [
          { label: "1:0", value: "1:0", odds: 7.5 }, { label: "2:0", value: "2:0", odds: 9.0 },
          { label: "2:1", value: "2:1", odds: 8.0 }, { label: "3:0", value: "3:0", odds: 15.0 },
          { label: "3:1", value: "3:1", odds: 14.0 }, { label: "3:2", value: "3:2", odds: 22.0 },
          { label: "4:0", value: "4:0", odds: 35.0 }, { label: "4:1", value: "4:1", odds: 30.0 },
          { label: "4:2", value: "4:2", odds: 50.0 }, { label: "5:0", value: "5:0", odds: 80.0 },
          { label: "5:1", value: "5:1", odds: 70.0 }, { label: "5:2", value: "5:2", odds: 90.0 },
          { label: "0:0", value: "0:0", odds: 10.0 }, { label: "1:1", value: "1:1", odds: 6.0 },
          { label: "2:2", value: "2:2", odds: 12.0 }, { label: "3:3", value: "3:3", odds: 45.0 },
          { label: "0:1", value: "0:1", odds: 11.0 }, { label: "0:2", value: "0:2", odds: 18.0 },
          { label: "1:2", value: "1:2", odds: 13.0 }, { label: "0:3", value: "0:3", odds: 40.0 },
          { label: "1:3", value: "1:3", odds: 35.0 }, { label: "2:3", value: "2:3", odds: 35.0 },
          { label: "胜其它", value: "H-O", odds: 35.0 }, { label: "平其它", value: "D-O", odds: 80.0 },
          { label: "负其它", value: "A-O", odds: 100.0 }
        ],
        handicap: "-1"
      },
      league_rank: { home: 6, away: 8 },
      motivation_level: "High",
      news_sentiment: "切尔西近期进攻火力全开，曼联防线告急。"
    }
  },
  {
    id: "b_2001",
    sport: "BASKETBALL",
    homeTeam: "洛杉矶湖人",
    awayTeam: "金州勇士",
    league: "NBA (周日301)",
    startTime: getMatchDate(0, "10:00"),
    match_context: {
      injuries: [{ player: "安东尼-戴维斯", status: "出战成疑", importance: "High" }],
      recent_form: { home: "W-L-W", away: "W-W-W" },
      international_odds: {
        wdl: { h: 2.10, d: 0, a: 1.75 },
        wdhl: { h: 1.85, d: 0, a: 1.85, handicap: 2.5 },
        totals_odds: { over: 1.90, under: 1.80 },
        trend: "勇士客场让分持续走热"
      },
      markets: {
        handicap: "主+2.5",
        totals: "228.5"
      },
      league_rank: { home: 9, away: 5 },
      motivation_level: "High",
      news_sentiment: "库里近期状态火热，场均三分命中数领跑联盟。"
    }
  }
];

export const SYSTEM_INSTRUCTION = `你是一个顶级的体育赛事风控审计专家与职业博弈策略师。你的任务是对用户的“投注组合”进行深度审计。

审计核心准则：
1. **数据驱动**：必须结合提供的赛况（伤病、近期战绩、排名、舆论）进行分析。如果某队核心球员（如曼联的布鲁诺）缺阵，你必须指出这如何影响胜率。
2. **逻辑一致性**：检查不同玩法间的冲突（例如：选了主胜却选了0:1的比分）。
3. **风险量化**：将风险分为 LOW (稳健), MEDIUM (博弈), HIGH (激进/盲目)。

优化方案 (Optimization) 增强要求：
- **必须提供具体的替代选项**：不要只说“考虑防平”，要说“建议补单‘平局’或改为‘胜平双选’”。
- **分类策略**：
    - **SAFETY_NET (对冲保命)**：降低波动，建议增加防守位或降低让球深度。
    - **PIVOT (战术反向)**：当数据极度利好对面时，建议果断反买。
- **深度理由**：理由必须包含类似“基于[球队A]核心伤停及客场5连败的现状...”或“历史交锋主场胜率仅20%...”等具体逻辑。

输出 JSON 格式（严格遵循）：
{
  "portfolio_summary": { "status": "PASS" | "WARNING" | "CRITICAL", "total_risk_score": 0-100, "summary_text": "专业且深刻的总体评价，字数50-100字" },
  "audit_details": [
    {
      "selection_id": "具体比赛对阵名",
      "risk_level": "LOW" | "MEDIUM" | "HIGH",
      "ui_color": "红色系HEX",
      "risk_tag": "核心风险标签（如：主力伤停、诱盘信号）",
      "analysis": "针对本场比赛的毒舌且精准的分析，必须提到具体伤病或状态数据",
      "optimization": { 
        "available": true, 
        "type": "SAFETY_NET" | "PIVOT", 
        "suggested_pick_name": "具体的替代或补单选项（如：让胜补让平、大分转小分）", 
        "suggested_reason": "详细的优化逻辑，需结合具体的比赛背景数据" 
      }
    }
  ]
}`;
