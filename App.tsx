
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Trash2, 
  Activity, TrendingUp, 
  Dribbble, Trophy, LayoutGrid, ChevronDown, ListFilter,
  Loader2, Clock, RefreshCw
} from 'lucide-react';
import { MOCK_MATCHES } from './constants';
import { Match, UserSelection, AuditResponse, SportType, MarketOdds } from './types';
import { auditPortfolio, fetchLotteryMatches } from './services/geminiService';

const App: React.FC = () => {
  const [activeSport, setActiveSport] = useState<SportType>('FOOTBALL');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchStatus, setFetchStatus] = useState('初始化中...');
  const [portfolio, setPortfolio] = useState<UserSelection[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>('');

  const initData = async () => {
    setIsFetching(true);
    setFetchStatus('连接 API-Football 数据网关...');
    try {
      // Pass a status update callback to show real progress
      const realMatches = await fetchLotteryMatches((status) => setFetchStatus(status));
      if (realMatches && realMatches.length > 0) {
        setMatches(realMatches);
        setLastSync(new Date().toLocaleTimeString());
      } else {
        console.warn("No real matches fetched, using fallback data.");
        setMatches(MOCK_MATCHES);
        setLastSync(new Date().toLocaleTimeString() + " (模拟)");
      }
    } catch (err) {
      console.error("Sync initialization failed:", err);
      setMatches(MOCK_MATCHES);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const filteredMatches = useMemo(() => 
    matches.filter(m => m.sport === activeSport), 
  [activeSport, matches]);

  const addToPortfolio = (match: Match, market: UserSelection['market_type'], pick: string) => {
    const pickId = `${match.id}_${market}`;
    setPortfolio(prev => {
      const filtered = prev.filter(p => `${p.match_id}_${p.market_type}` !== pickId);
      return [...filtered, {
        match_id: match.id,
        match_name: `${match.homeTeam} VS ${match.awayTeam}`,
        sport: match.sport,
        market_type: market,
        pick: pick
      }];
    });
    setAuditResult(null);
  };

  const removeFromPortfolio = (matchId: string, market: string) => {
    setPortfolio(prev => prev.filter(p => !(p.match_id === matchId && p.market_type === market)));
    setAuditResult(null);
  };

  const handleAudit = async () => {
    if (portfolio.length === 0) return;
    setIsAuditing(true);
    try {
      const result = await auditPortfolio(portfolio, matches);
      setAuditResult(result);
    } catch (err) {
      alert("风控引擎暂时离线，正在重启审计链路。");
    } finally {
      setIsAuditing(false);
    }
  };

  const groupScores = (scores: MarketOdds[] | undefined) => {
    if (!scores || !Array.isArray(scores)) return { home: [], draw: [], away: [] };
    const home: MarketOdds[] = [];
    const draw: MarketOdds[] = [];
    const away: MarketOdds[] = [];

    scores.forEach(s => {
      const label = s.label || '';
      if (label.includes('胜其它')) home.push(s);
      else if (label.includes('平其它')) draw.push(s);
      else if (label.includes('负其它')) away.push(s);
      else {
        const parts = label.split(':');
        if (parts.length === 2) {
          const h = Number(parts[0]);
          const a = Number(parts[1]);
          if (h > a) home.push(s);
          else if (h === a) draw.push(s);
          else away.push(s);
        } else if (label.startsWith('胜')) home.push(s);
        else if (label.startsWith('平')) draw.push(s);
        else if (label.startsWith('负')) away.push(s);
      }
    });

    return { home, draw, away };
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-['Inter'] selection:bg-blue-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className={`absolute -top-24 -left-24 w-96 h-96 blur-[120px] rounded-full transition-colors duration-1000 ${activeSport === 'FOOTBALL' ? 'bg-emerald-600' : 'bg-orange-600'}`}></div>
      </div>

      <div className="relative z-10 p-4 md:p-8">
        <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-3 rounded-2xl shadow-2xl shadow-blue-600/20 border border-white/10 ring-4 ring-blue-600/5">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-[900] tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
                Sentinel <span className="text-blue-500">PRO</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${isFetching ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
                <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">
                  {isFetching ? fetchStatus : `API-FOOTBALL 同步成功: ${lastSync}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {!isFetching && (
               <button 
                 onClick={initData}
                 className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all"
                 title="刷新数据"
               >
                 <RefreshCw className="w-4 h-4" />
               </button>
             )}
            <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-inner">
              <button 
                onClick={() => setActiveSport('FOOTBALL')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${activeSport === 'FOOTBALL' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Trophy className="w-4 h-4" /> 竞彩足球
              </button>
              <button 
                onClick={() => setActiveSport('BASKETBALL')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${activeSport === 'BASKETBALL' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Dribbble className="w-4 h-4" /> 竞彩篮球
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] overflow-hidden backdrop-blur-2xl shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-slate-400">
                  <ListFilter className="w-4 h-4 text-blue-500" /> 中国体育彩票官方赛程
                </h2>
                {isFetching && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              </div>
              
              <div className="divide-y divide-slate-800/50 max-h-[700px] overflow-y-auto custom-scrollbar">
                {isFetching ? (
                  <div className="p-20 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      <Activity className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{fetchStatus}</p>
                      <p className="text-[8px] text-slate-700 font-bold italic uppercase tracking-widest">Sourcing Real-time odds from 500.com</p>
                    </div>
                  </div>
                ) : filteredMatches.length === 0 ? (
                   <div className="p-20 text-center text-slate-600 uppercase text-[10px] font-black tracking-widest">
                      该板块暂无即时开售赛事
                   </div>
                ) : filteredMatches.map(match => {
                  const markets = match.match_context?.markets;
                  const { home, draw, away } = groupScores(markets?.correct_score);
                  return (
                    <div key={match.id} className="p-6 hover:bg-slate-800/30 transition-all duration-500 group">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black border border-slate-700 uppercase">{match.league}</span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold">
                            <Clock className="w-3 h-3" /> {match.startTime}
                          </div>
                        </div>
                        {match.match_context.news_sentiment && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" title="实时舆情预警"></div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex-1 text-center">
                          <p className="text-lg font-black tracking-tighter">{match.homeTeam}</p>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">RANK {match.match_context.league_rank?.home || '--'}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-700 italic px-3 py-1 bg-slate-950 rounded-full border border-slate-800">VS</span>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-lg font-black tracking-tighter">{match.awayTeam}</p>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">RANK {match.match_context.league_rank?.away || '--'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 mb-4">
                        {activeSport === 'FOOTBALL' ? (
                          <>
                            <MarketButton onClick={() => addToPortfolio(match, 'WDL', '主胜')} label="胜" odds={match.match_context.international_odds?.wdl?.h} />
                            <MarketButton onClick={() => addToPortfolio(match, 'WDL', '平局')} label="平" odds={match.match_context.international_odds?.wdl?.d} />
                            <MarketButton onClick={() => addToPortfolio(match, 'WDL', '客胜')} label="负" odds={match.match_context.international_odds?.wdl?.a} />
                          </>
                        ) : (
                          <>
                            <MarketButton onClick={() => addToPortfolio(match, 'WDL', '主胜')} label="主胜" odds={match.match_context.international_odds?.wdl?.h} />
                            <div className="bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-center text-[10px] text-slate-700 font-black uppercase text-center px-1">
                              {markets?.handicap || '不让分'}
                            </div>
                            <MarketButton onClick={() => addToPortfolio(match, 'WDL', '客胜')} label="客胜" odds={match.match_context.international_odds?.wdl?.a} />
                          </>
                        )}
                      </div>

                      {activeSport === 'FOOTBALL' && (
                        <div className="mt-4">
                          <button 
                            onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                            className="w-full py-2 bg-slate-950/50 hover:bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase transition-all"
                          >
                            <LayoutGrid className="w-3 h-3" /> {expandedMatch === match.id ? '收起波胆' : '查看波胆 (即时比分方案)'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedMatch === match.id ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {expandedMatch === match.id && (
                            <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div>
                                <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mb-3 px-1 border-l-2 border-emerald-500/30 ml-1">主胜波胆</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {home.map(score => (
                                    <ScoreButton key={score.value} onClick={() => addToPortfolio(match, 'CS', score.label)} label={score.label} odds={score.odds} />
                                  ))}
                                  {home.length === 0 && <p className="col-span-5 text-[10px] text-slate-700 italic text-center py-2 uppercase">无数据</p>}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-500/70 uppercase tracking-widest mb-3 px-1 border-l-2 border-slate-500/30 ml-1">平局波胆</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {draw.map(score => (
                                    <ScoreButton key={score.value} onClick={() => addToPortfolio(match, 'CS', score.label)} label={score.label} odds={score.odds} />
                                  ))}
                                  {draw.length === 0 && <p className="col-span-5 text-[10px] text-slate-700 italic text-center py-2 uppercase">无数据</p>}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-red-500/70 uppercase tracking-widest mb-3 px-1 border-l-2 border-red-500/30 ml-1">客胜波胆</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {away.map(score => (
                                    <ScoreButton key={score.value} onClick={() => addToPortfolio(match, 'CS', score.label)} label={score.label} odds={score.odds} />
                                  ))}
                                  {away.length === 0 && <p className="col-span-5 text-[10px] text-slate-700 italic text-center py-2 uppercase">无数据</p>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-[40px] p-8 shadow-2xl backdrop-blur-3xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <Activity className="w-6 h-6 text-blue-500" /> 审计清单 (Audit)
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-600 uppercase">已选:</span>
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] font-black text-white">{portfolio.length} 场</span>
                </div>
              </div>

              {portfolio.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[32px] text-slate-600">
                  <Shield className="w-16 h-16 mb-6 opacity-10" />
                  <p className="text-sm font-black uppercase tracking-widest opacity-30">请选择体彩赛事进入审计通道</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-8">
                  {portfolio.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950/80 p-5 rounded-3xl border border-slate-800 hover:border-blue-500/20 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-2xl ${item.sport === 'FOOTBALL' ? 'bg-emerald-600/10 text-emerald-500' : 'bg-orange-600/10 text-orange-500'}`}>
                          {item.sport === 'FOOTBALL' ? <Trophy className="w-5 h-5" /> : <Dribbble className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{item.match_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-slate-900 text-[10px] font-black text-slate-400 rounded-md border border-slate-800">{item.market_type === 'WDL' ? '胜平负' : '波胆'}</span>
                            <span className="text-lg font-black text-blue-400">{item.pick}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeFromPortfolio(item.match_id, item.market_type)} className="p-3 text-slate-700 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleAudit}
                disabled={portfolio.length === 0 || isAuditing}
                className={`w-full py-6 rounded-[32px] font-black text-lg uppercase tracking-tighter flex items-center justify-center gap-4 transition-all ${
                  portfolio.length > 0 && !isAuditing
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-600/30 ring-4 ring-blue-600/10'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {isAuditing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Shield className="w-6 h-6" />}
                {isAuditing ? 'AI SENTINEL 正在进行链路审计...' : '启动竞彩风控审计'}
              </button>
            </div>

            {auditResult && !isAuditing && (
              <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-8 pb-24">
                <div className={`p-10 rounded-[50px] border-2 shadow-inner relative overflow-hidden ${
                  auditResult.portfolio_summary.status === 'PASS' 
                  ? 'bg-emerald-600/5 border-emerald-500/30' 
                  : 'bg-red-600/5 border-red-500/30'
                }`}>
                  <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="w-32 h-32 rounded-[40px] bg-slate-950 flex flex-col items-center justify-center border-4 border-slate-800 shadow-2xl">
                      <span className="text-[10px] text-slate-600 font-black uppercase mb-1 tracking-widest">Risk Score</span>
                      <span className={`text-6xl font-[900] tracking-tighter ${
                        auditResult.portfolio_summary.total_risk_score < 40 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {auditResult.portfolio_summary.total_risk_score}
                      </span>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-4xl font-[900] italic uppercase mb-3 tracking-tighter flex items-center gap-4 justify-center md:justify-start">
                        {auditResult.portfolio_summary.status === 'PASS' ? <CheckCircle className="w-10 h-10 text-emerald-500" /> : <AlertTriangle className="w-10 h-10 text-red-500" />}
                        审计结果: {auditResult.portfolio_summary.status}
                      </h3>
                      <p className="text-lg text-slate-400 font-medium leading-relaxed italic">
                        "{auditResult.portfolio_summary.summary_text}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {auditResult.audit_details.map((detail, i) => (
                    <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-[32px] p-8 hover:border-slate-700 transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <TrendingUp className="w-24 h-24" />
                      </div>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-600 border border-slate-800">0{i+1}</div>
                        <div>
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">{detail.risk_tag}</span>
                          <h4 className="text-xl font-[900] uppercase tracking-tighter">{detail.selection_id} 穿透详情</h4>
                        </div>
                        <div className="ml-auto">
                          <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ color: detail.ui_color, borderColor: `${detail.ui_color}40`, backgroundColor: `${detail.ui_color}10` }}>
                            {detail.risk_level} RISK
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50">
                          <div className="flex items-center gap-2 mb-4 text-slate-600 font-black text-[10px] uppercase tracking-widest">分析路径</div>
                          <p className="text-slate-300 font-medium italic leading-relaxed text-sm">"{detail.analysis}"</p>
                        </div>
                        
                        {detail.optimization.available && (
                          <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-500/20 relative shadow-inner">
                            <div className="flex items-center gap-2 mb-4 text-blue-500 font-black text-[10px] uppercase tracking-widest">优化方案 ({detail.optimization.type})</div>
                            <div className="mb-4">
                              <span className="text-[10px] text-slate-600 block font-black mb-1 uppercase">建议投注:</span>
                              <span className="text-xl font-[900] text-emerald-400 tracking-tighter">{detail.optimization.suggested_pick_name}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{detail.optimization.suggested_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const MarketButton: React.FC<{ onClick: () => void; label: string; odds: number | undefined }> = ({ onClick, label, odds }) => (
  <button 
    onClick={onClick}
    className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 py-3 rounded-xl transition-all group/btn active:scale-95"
  >
    <div className="text-[10px] text-slate-500 font-bold group-hover/btn:text-slate-300">{label}</div>
    <div className="text-sm font-black text-slate-400 group-hover/btn:text-white">{odds !== undefined ? odds : '--'}</div>
  </button>
);

const ScoreButton: React.FC<{ onClick: () => void; label: string; odds: number | undefined }> = ({ onClick, label, odds }) => (
  <button 
    onClick={onClick}
    className="bg-slate-950 hover:bg-blue-600/20 py-2 rounded-lg border border-slate-800 hover:border-blue-500/30 text-[9px] font-black transition-all group/btn flex flex-col items-center justify-center leading-tight min-h-[40px]"
  >
    <div className="text-slate-500 group-hover/btn:text-blue-400">{label}</div>
    <div className="text-[8px] text-slate-700 group-hover/btn:text-blue-500/70">{odds !== undefined ? odds : '--'}</div>
  </button>
);

export default App;
