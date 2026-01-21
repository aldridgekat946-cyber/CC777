
import { GoogleGenAI, Type } from "@google/genai";
import { UserSelection, Match, AuditResponse, DataSource } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const TIMEOUT_MS = 35000;

export const fetchLotteryMatches = async (source: DataSource, onStatusUpdate?: (status: string) => void): Promise<Match[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];

  const officialPrompt = `
    搜索今天 (${today}) 的中国竞彩足球和篮球开售赛事及赔率。
    来源: 竞彩网 (sporttery.cn), 500.com, okooo.com.
    
    要求:
    1. 足球: 提供胜平负(WDL)、让球胜平负(WDHL)、进球数(0-7+)、以及所有可用的比分(波胆)赔率。
    2. 篮球: 让分盘和大小分。
    3. 必须包含竞彩 ID (如 周一001)。
    4. 所有的球队名称、联赛名称、环境描述必须翻译成【简体中文】。
    
    以 JSON 数组形式返回 Match 对象，不要包含任何解释。
  `;

  const internationalPrompt = `
    搜索今天 (${today}) 国际主流博彩公司 (Bet365, Pinnacle) 的顶级赛事赔率。
    提供 WDL、让球盘、进球数和比分赔率。
    
    要求:
    1. 将国际赔率格式转换为中国竞彩标准。
    2. 所有的球队、联赛名、趋势描述必须翻译成【简体中文】。
    
    以 JSON 数组形式返回 Match 对象。
  `;

  const performFetch = async (prompt: string, status: string): Promise<Match[]> => {
    try {
      onStatusUpdate?.(status);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                sport: { type: Type.STRING, enum: ["FOOTBALL", "BASKETBALL"] },
                homeTeam: { type: Type.STRING },
                awayTeam: { type: Type.STRING },
                league: { type: Type.STRING },
                startTime: { type: Type.STRING },
                match_context: {
                  type: Type.OBJECT,
                  properties: {
                    international_odds: {
                      type: Type.OBJECT,
                      properties: {
                        wdl: { type: Type.OBJECT, properties: { h: {type:Type.NUMBER}, d: {type:Type.NUMBER}, a: {type:Type.NUMBER} } },
                        wdhl: { type: Type.OBJECT, properties: { h: {type:Type.NUMBER}, d: {type:Type.NUMBER}, a: {type:Type.NUMBER}, handicap: {type:Type.NUMBER} } },
                        total_goals: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, value: {type:Type.STRING}, odds: {type:Type.NUMBER} } } },
                        totals_odds: { type: Type.OBJECT, properties: { over: {type:Type.NUMBER}, under: {type:Type.NUMBER} } },
                        trend: { type: Type.STRING }
                      }
                    },
                    markets: {
                      type: Type.OBJECT,
                      properties: {
                        correct_score: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, value: {type:Type.STRING}, odds: {type:Type.NUMBER} } } },
                        handicap: { type: Type.STRING },
                        totals: { type: Type.STRING }
                      }
                    },
                    league_rank: { type: Type.OBJECT, properties: { home: {type:Type.NUMBER}, away: {type:Type.NUMBER} } },
                    news_sentiment: { type: Type.STRING }
                  }
                }
              }
            }
          }
        },
      });

      const text = response.text;
      if (!text) return [];
      const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedJson);
    } catch (e) {
      console.error("Fetch implementation error:", e);
      return [];
    }
  };

  try {
    const prompt = source === 'OFFICIAL' ? officialPrompt : internationalPrompt;
    const fetchPromise = performFetch(prompt, source === 'OFFICIAL' ? "正在同步竞彩中心数据..." : "正在链接全球博彩市场数据...");
    const timeoutPromise = new Promise<Match[]>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS));
    
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    return []; 
  }
};

export const auditPortfolio = async (portfolio: UserSelection[], matches: Match[]): Promise<AuditResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const matchContext = portfolio.map(item => {
    const match = matches.find(m => m.id === item.match_id);
    return match ? { 
      match_name: item.match_name, 
      details: match.match_context, 
      user_pick: item.pick, 
      market: item.market_type 
    } : null;
  }).filter(Boolean);

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `请使用【简体中文】审计以下投注：\n组合：${JSON.stringify(portfolio)}\n实时环境数据：${JSON.stringify(matchContext)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    },
  });

  return JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
};
