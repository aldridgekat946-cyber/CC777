
import { GoogleGenAI, Type } from "@google/genai";
import { UserSelection, Match, AuditResponse, DataSource } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const TIMEOUT_MS = 35000; // Increased to 35s to allow for deep search and generation

export const fetchLotteryMatches = async (source: DataSource, onStatusUpdate?: (status: string) => void): Promise<Match[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];

  const officialPrompt = `
    Search for today's (${today}) China Sports Lottery (竞彩足球/篮球) opening matches and odds.
    Sources: sporttery.cn, 500.com, okooo.com.
    
    Fields needed:
    1. Football: WDL, Handicap WDL (e.g. -1), Total Goals (0-7+), and as many Correct Scores (1:0, 0:0, 0:1, etc.) as available.
    2. Basketball: Handicap and Total Points.
    3. Match ID (e.g. 周一001).
    
    Return a JSON array of Match objects. Do not explain, just return the data.
  `;

  const internationalPrompt = `
    Search for international bookmaker odds (Bet365, Pinnacle) for top matches on ${today}.
    Provide WDL, Handicap, Total Goals, and Correct Scores.
    Return a JSON array of Match objects matching the required schema.
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
    const fetchPromise = performFetch(prompt, source === 'OFFICIAL' ? "正在从官方数据节点获取盘口..." : "正在从国际博彩中心抓取即时数据...");
    const timeoutPromise = new Promise<Match[]>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS));
    
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    if (error.message === "TIMEOUT") {
      console.warn("Gemini data fetch timed out. Falling back to internal data.");
    } else {
      console.error("Fetch matches error:", error);
    }
    return []; // Return empty so App.tsx falls back to mock data
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
    contents: `请审计以下投注：\n组合：${JSON.stringify(portfolio)}\n实时环境数据：${JSON.stringify(matchContext)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    },
  });

  return JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
};
