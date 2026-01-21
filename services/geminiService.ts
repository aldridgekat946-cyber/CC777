
import { GoogleGenAI, Type } from "@google/genai";
import { UserSelection, Match, AuditResponse } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const fetchLotteryMatches = async (onStatusUpdate?: (status: string) => void): Promise<Match[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];
  
  onStatusUpdate?.("正在访问 500.com 实时赔率库...");

  // Using Flash for much faster search and generation to avoid "hanging"
  const prompt = `
    Search for today's (${today}) China Sports Lottery (竞彩) official matches.
    Primary sources: 500.com (500网) or sporttery.cn.
    
    Instructions:
    1. Fetch EXACTLY 5 high-profile matches (mix of Football and Basketball if available).
    2. For Football: Include the "Correct Score" (波胆) market with standard CSL odds. To ensure fast response, only include the most popular 15 score options (e.g., 1:0, 2:0, 2:1, 0:0, 1:1, 0:1, 0:2, etc.) + "Others".
    3. For Basketball: Include "Point Spread" (让分) and official handicap values.
    4. Mimic the professional data structure of "API-Football".
    5. League names must include the Lottery ID (e.g., "周四001").
    
    Return a strictly formatted JSON array of Match objects. Do not include any text before or after the JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash is better for speed and large object generation
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
                          },
                          required: ["label", "value", "odds"]
                        }
                      },
                      handicap: { type: Type.STRING }
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

    onStatusUpdate?.("解析赔率引擎数据...");
    const text = response.text;
    if (!text) return [];
    
    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
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
    作为顶级风控专家，请审计此竞彩投注组合：
    
    投注单: ${JSON.stringify(portfolio)}
    
    比赛环境数据: 
    ${JSON.stringify(matchContext)}
    
    要求：采用 API-Football 的专业视角，对比国际庄家赔率背离，检查比分与赛果的物理冲突。
    必须返回 JSON，严禁 Markdown。
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
