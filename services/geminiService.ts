
import { GoogleGenAI, Type } from "@google/genai";
import { UserSelection, Match, AuditResponse, DataSource, GroundingUrl } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const TIMEOUT_MS = 35000;

/**
 * Fetches match data using Gemini with Google Search tool.
 * Prompts the model specifically for upcoming (not started) matches.
 */
export const fetchLotteryMatches = async (source: DataSource, onStatusUpdate?: (status: string) => void): Promise<Match[]> => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const officialPrompt = `
    搜索当前（北京时间 ${now.toLocaleString()}）中国竞彩足球和篮球【已开盘】且【尚未开始】的所有赛事。
    必须过滤掉已经结束或正在进行的比赛，仅保留未来进行的赛事。
    
    来源参考: 竞彩网 (sporttery.cn), 500.com, okooo.com.
    
    要求:
    1. 足球: WDL、WDHL、总进球、比分赔率。
    2. 篮球: 让分盘和大小分。
    3. 必须包含竞彩 ID (如 周一001)。
    4. 球队名、联赛名必须翻译成【简体中文】。
    
    以 JSON 数组形式返回 Match 对象。
  `;

  const internationalPrompt = `
    搜索当前（${now.toLocaleString()}）国际主流市场 (Bet365, Pinnacle) 的顶级赛事。
    仅抓取【尚未开始】的比赛赔率。
    
    要求:
    1. 转换国际赔率为中国竞彩标准格式。
    2. 球队、联赛名翻译为【简体中文】。
    
    以 JSON 数组形式返回 Match 对象。
  `;

  const performFetch = async (prompt: string, status: string): Promise<Match[]> => {
    try {
      onStatusUpdate?.(status);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

      // Maintain grounding data internally for compliance but will be hidden in UI
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingUrls: GroundingUrl[] = groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];

      const text = response.text;
      if (!text) return [];
      
      const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const matches: Match[] = JSON.parse(cleanedJson);
      
      return matches.map(m => ({
        ...m,
        grounding_urls: groundingUrls
      }));
    } catch (e) {
      console.error("Fetch implementation error:", e);
      return [];
    }
  };

  try {
    const prompt = source === 'OFFICIAL' ? officialPrompt : internationalPrompt;
    const fetchPromise = performFetch(prompt, source === 'OFFICIAL' ? "正在抓取最新开盘赛程..." : "正在同步全球市场数据...");
    const timeoutPromise = new Promise<Match[]>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS));
    
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    return []; 
  }
};

/**
 * Audit user portfolio using Gemini 3 Pro model.
 */
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
    contents: `请对以下投注方案进行深度风控审计。
    
    【投注组合】：
    ${JSON.stringify(portfolio)}
    
    【赛况背景数据】：
    ${JSON.stringify(matchContext)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    },
  });

  const text = response.text;
  if (!text) throw new Error("AI returned empty content");
  
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
};
