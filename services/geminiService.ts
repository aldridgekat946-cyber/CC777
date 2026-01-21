
import { GoogleGenAI, Type } from "@google/genai";
import { UserSelection, Match, AuditResponse } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const TIMEOUT_MS = 15000;

export const fetchLotteryMatches = async (onStatusUpdate?: (status: string) => void): Promise<Match[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];

  const primaryPrompt = `
    Search for the ABSOLUTE LATEST real-time China Sports Lottery (竞彩) matches and odds for today (${today}).
    Primary Source: Official sporttery.cn.
    
    Instructions:
    1. Fetch exactly 6 active matches currently open for betting.
    2. Prioritize high-liquidity leagues (Premier League, NBA, UCL, etc.).
    3. For Football: Include WDL (胜平负) and the 15 most common Correct Score (波胆) odds.
    4. For Basketball: Include Point Spread (让分) and Total Points (大小分).
    5. League names MUST include the official Lottery ID prefix (e.g., 周五001).
    
    Return a strictly valid JSON array of Match objects.
  `;

  const fallbackPrompt = `
    Official sources are slow. Search ANY reputable sports aggregate source (500.com, OKOOO, Scoreway) 
    to fetch today's (${today}) China Sports Lottery (竞彩) official matches and real-time odds.
    
    Requirements remain the same: 6 matches, WDL/Correct Score for football, Point Spread for basketball, 
    include Lottery IDs (e.g., 周六002).
    
    Return a strictly valid JSON array of Match objects.
  `;

  const performFetch = async (prompt: string, status: string): Promise<Match[]> => {
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
                  injuries: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        player: { type: Type.STRING },
                        status: { type: Type.STRING },
                        importance: { type: Type.STRING }
                      }
                    }
                  },
                  recent_form: {
                    type: Type.OBJECT,
                    properties: {
                      home: { type: Type.STRING },
                      // Fixed: Removed stray '%' character from Type.STRING to resolve syntax error
                      away: { type: Type.STRING }
                    }
                  },
                  international_odds: {
                    type: Type.OBJECT,
                    properties: {
                      wdl: {
                        type: Type.OBJECT,
                        properties: {
                          h: { type: Type.NUMBER },
                          d: { type: Type.NUMBER },
                          a: { type: Type.NUMBER }
                        }
                      },
                      totals_odds: {
                        type: Type.OBJECT,
                        properties: {
                          over: { type: Type.NUMBER },
                          under: { type: Type.NUMBER }
                        }
                      }
                    }
                  },
                  markets: {
                    type: Type.OBJECT,
                    properties: {
                      correct_score: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            label: { type: Type.STRING },
                            value: { type: Type.STRING },
                            odds: { type: Type.NUMBER }
                          }
                        }
                      },
                      handicap: { type: Type.STRING },
                      totals: { type: Type.STRING }
                    }
                  },
                  league_rank: {
                    type: Type.OBJECT,
                    properties: {
                      home: { type: Type.NUMBER },
                      away: { type: Type.NUMBER }
                    }
                  },
                  motivation_level: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  news_sentiment: { type: Type.STRING }
                },
                required: ["markets", "league_rank"]
              }
            },
            required: ["id", "sport", "homeTeam", "awayTeam", "league", "startTime", "match_context"]
          }
        }
      },
    });

    const text = response.text;
    if (!text) return [];
    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);
    return Array.isArray(parsed) ? parsed : [];
  };

  try {
    // Try primary fetch with a timeout
    const fetchPromise = performFetch(primaryPrompt, "正在连接中国体彩官方中心...");
    const timeoutPromise = new Promise<Match[]>((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS)
    );

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    if (error.message === "TIMEOUT") {
      console.warn("Primary source timed out (15s), switching to aggregate sources...");
      return await performFetch(fallbackPrompt, "官方源超时，正在切换备用赔率中心...");
    }
    console.error("Fetch matches error:", error);
    return [];
  }
};

export const auditPortfolio = async (
  portfolio: UserSelection[],
  matches: Match[]
): Promise<AuditResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const matchContext = portfolio.map(item => {
    const match = matches.find(m => m.id === item.match_id);
    return match ? { 
      match_id: match.id, 
      match_name: `${match.homeTeam} vs ${match.awayTeam}`,
      details: match.match_context,
      user_pick: item.pick,
      market: item.market_type
    } : null;
  }).filter(Boolean);

  const prompt = `
    作为体彩风控审计专家，请审计此组合。关注即时赔率波动与凯利指数偏差。
    
    投注单: ${JSON.stringify(portfolio)}
    
    环境数据: ${JSON.stringify(matchContext)}
    
    必须返回 JSON。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 15000 }
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response");
    const cleanedJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson) as AuditResponse;
  } catch (error) {
    console.error("Audit error:", error);
    throw error;
  }
};
