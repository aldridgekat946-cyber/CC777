
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, Activity, TrendingUp, Dribbble, Trophy, LayoutGrid, ChevronDown, 
  ListFilter, Loader2, Clock, RefreshCw, Zap, Server, Trash2, CheckCircle, 
  AlertTriangle, Globe, Database, Info
} from 'lucide-react';
import { MOCK_MATCHES } from './constants';
import { Match, UserSelection, AuditResponse, SportType, MarketOdds, DataSource } from './types';
import { auditPortfolio, fetchLotteryMatches } from './services/geminiService';

type MarketTab = 'WDL' | 'WDHL' | 'CS' | 'TG' | 'BASKET';

const App: React.FC = () => {
  const [activeSport, setActiveSport] = useState<SportType>('FOOTBALL');
  const [activeMarketTab, setActiveMarketTab] = useState<MarketTab>('WDL');
  const [dataSource, setDataSource] = useState<DataSource>('OFFICIAL');
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
    try {
      const realMatches = await fetchLotteryMatches(dataSource, (status) => setFetchStatus(status));
      if (realMatches && realMatches.length > 0) {
        setMatches(realMatches);
        setLastSync(new Date().toLocaleTimeString());
      } else {
        setMatches(MOCK_MATCHES);
        setLastSync(new Date().toLocaleTimeString() + " (本地库)");
      }
    } catch (err) {
      setMatches(MOCK_MATCHES);
      setLastSync(new Date().toLocaleTimeString() + " (错误回退)");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    initData();
  }, [dataSource, activeSport]);

  const filteredMatches = useMemo(() => 
    matches.filter(m => m.sport === activeSport), 
  [activeSport, matches]);

  const addToPortfolio = (match: Match, market: UserSelection['market_type'], pick: string) => {
    setPortfolio(prev => {
      // Allow multiple picks per match but unique per market type
      const filtered = prev.filter(p => !(p.match_id === match.id && p.market_type === market));
      return [...filtered, {
        match_id: match.id, match_name: `${match.homeTeam} VS ${match.awayTeam}`,
        sport: match.sport, market_type: market, pick: pick
      }];
    });
    setAuditResult(null);
  };

  const removeFromPortfolio = (index: number) => {
    setPortfolio(prev => prev.filter((_, i) => i !== index));
    setAuditResult(null);
  };

  const handleAudit = async () => {
    if (portfolio.length === 0) return;
    setIsAuditing(true);
    try {
      const result = await auditPortfolio(portfolio, matches);
      setAuditResult(result);
    } catch (e) {
      console.error(e);
      alert("审计引擎繁忙，请稍后再试。");
    } finally {
      setIsAuditing(false);
    }
  };

  const renderCorrectScores = (match: Match) => {
    const scores = match.match_context.markets.correct_score || [];
    
    // Standard Correct Score Layouts for China Sports Lottery
    const homeWins = ["1:0", "2:0", "2:1", "3:0", "3:1", "3:2", "4:0", "4:1", "4:2", "5:0", "5:1", "5:2", "胜其它"];
    const draws = ["0:0", "1:1", "2:2", "3:3", "平其它"];
    const awayWins = ["0:1", "0:2", "1:2", "0:3", "1:3", "2:3", "0:4", "1:4", "2:4", "0:5", "1:5", "2:5", "负其它"];

    const findOdds = (label: string) => scores.find(s => s.label === label)?.odds;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-3 bg-emerald-500 rounded-full"></span> 主胜比分
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {homeWins.map(score => (
              <ScoreBtn key={score} label={score} odds={findOdds(score)} onClick={() => addToPortfolio(match, 'CS', score)} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-3 bg-slate-500 rounded-full"></span> 平局比分
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {draws.map(score => (
              <ScoreBtn key={score} label={score} odds={findOdds(score)} onClick={() => addToPortfolio(match, 'CS', score)} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-3 bg-rose-500 rounded-full"></span> 客胜比分
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {awayWins.map(score => (
              <ScoreBtn key={score} label={score} odds={findOdds(score)} onClick={() => addToPortfolio(match, 'CS', score)} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-['Inter'] selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className={`absolute -top-24 -left-24 w-96 h-96 blur-[120px] rounded-full transition-colors duration-1000 ${activeSport === 'FOOTBALL' ? 'bg-emerald-600' : 'bg-orange-600'}`}></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] blur-[150px] bg-blue-900 opacity-20 rounded-full"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-3.5 rounded-2xl shadow-2xl shadow-blue-600/20 ring-1 ring-white/10">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Sentinel <span className="text-blue-500">PRO</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isFetching ? fetchStatus : `已同步: ${lastSync}`}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Source Switcher */}
            <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl flex shadow-inner">
              <button 
                onClick={() => setDataSource('OFFICIAL')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${dataSource === 'OFFICIAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Database className="w-3 h-3" /> 竞彩官方
              </button>
              <button 
                onClick={() => setDataSource('INTERNATIONAL')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${dataSource === 'INTERNATIONAL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Globe className="w-3 h-3" /> 国际主流
              </button>
            </div>

            {/* Sport Switcher */}
            <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl flex shadow-inner">
              <button 
                onClick={() => { setActiveSport('FOOTBALL'); setActiveMarketTab('WDL'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeSport === 'FOOTBALL' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                <Trophy className="w-3 h-3" /> 足球专线
              </button>
              <button 
                onClick={() => { setActiveSport('BASKETBALL'); setActiveMarketTab('BASKET'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeSport === 'BASKETBALL' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                <Dribbble className="w-3 h-3" /> 篮球专线
              </button>
            </div>

            <button 
              onClick={initData}
              disabled={isFetching}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Matches Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] overflow-hidden backdrop-blur-2xl shadow-2xl">
              {/* Market Tabs */}
              <div className="p-4 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar bg-slate-900/20">
                {activeSport === 'FOOTBALL' ? (
                  <>
                    <MarketTabBtn active={activeMarketTab === 'WDL'} onClick={() => setActiveMarketTab('WDL')}>胜平负</MarketTabBtn>
                    <MarketTabBtn active={activeMarketTab === 'WDHL'} onClick={() => setActiveMarketTab('WDHL')}>让球胜平负</MarketTabBtn>
                    <MarketTabBtn active={activeMarketTab === 'TG'} onClick={() => setActiveMarketTab('TG')}>总进球</MarketTabBtn>
                    <MarketTabBtn active={activeMarketTab === 'CS'} onClick={() => setActiveMarketTab('CS')}>比分全量</MarketTabBtn>
                  </>
                ) : (
                  <MarketTabBtn active={true} onClick={() => {}}>让分/总分</MarketTabBtn>
                )}
              </div>

              <div className="divide-y divide-slate-800/50 max-h-[700px] overflow-y-auto custom-scrollbar">
                {isFetching ? (
                  <div className="p-24 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      <Zap className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{fetchStatus}</p>
                      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest italic">Encrypted Secure Data Link Active</p>
                    </div>
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="p-24 text-center">
                    <AlertTriangle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">当前时段无开售赛事</p>
                  </div>
                ) : filteredMatches.map(match => (
                  <div key={match.id} className="p-6 hover:bg-slate-800/20 transition-all duration-300 group">
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-slate-800/50 text-slate-400 rounded-lg text-[9px] font-black border border-slate-700 uppercase tracking-tight">{match.league}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                          <Clock className="w-3 h-3" /> {match.startTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.match_context.news_sentiment && <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" title="风控预警"></div>}
                        <span className="text-[9px] font-black text-blue-500/80 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">LIVE ODDS</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-8">
                      <div className="flex-1 text-center">
                        <p className="text-lg font-black tracking-tighter group-hover:text-white transition-colors uppercase">{match.homeTeam}</p>
                        <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-widest">排名 {match.match_context.league_rank?.home || '--'}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-700 italic px-4 py-1.5 bg-slate-950 rounded-full border border-slate-800 shadow-inner">VS</span>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-lg font-black tracking-tighter group-hover:text-white transition-colors uppercase">{match.awayTeam}</p>
                        <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-widest">排名 {match.match_context.league_rank?.away || '--'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {activeMarketTab === 'WDL' && (
                        <div className="grid grid-cols-3 gap-2.5">
                          <BetBtn label="主胜" odds={match.match_context.international_odds.wdl.h} onClick={() => addToPortfolio(match, 'WDL', '主胜')} />
                          <BetBtn label="平局" odds={match.match_context.international_odds.wdl.d} onClick={() => addToPortfolio(match, 'WDL', '平局')} />
                          <BetBtn label="客胜" odds={match.match_context.international_odds.wdl.a} onClick={() => addToPortfolio(match, 'WDL', '客胜')} />
                        </div>
                      )}
                      {activeMarketTab === 'WDHL' && (
                        <div className="grid grid-cols-3 gap-2.5">
                          <BetBtn label={`让胜(${match.match_context.markets.handicap || match.match_context.international_odds.wdhl?.handicap || '?'})`} odds={match.match_context.international_odds.wdhl?.h} onClick={() => addToPortfolio(match, 'WDHL', '让胜')} />
                          <BetBtn label="让平" odds={match.match_context.international_odds.wdhl?.d} onClick={() => addToPortfolio(match, 'WDHL', '让平')} />
                          <BetBtn label="让负" odds={match.match_context.international_odds.wdhl?.a} onClick={() => addToPortfolio(match, 'WDHL', '让负')} />
                        </div>
                      )}
                      {activeMarketTab === 'TG' && (
                        <div className="grid grid-cols-4 gap-2.5">
                          {match.match_context.international_odds.total_goals?.length ? (
                            match.match_context.international_odds.total_goals.map(tg => (
                              <BetBtn key={tg.value} label={tg.label} odds={tg.odds} onClick={() => addToPortfolio(match, 'TG', tg.label)} />
                            ))
                          ) : (
                            ['0球', '1球', '2球', '3球', '4球', '5球', '6球', '7+球'].map(label => (
                              <BetBtn key={label} label={label} odds={undefined} onClick={() => addToPortfolio(match, 'TG', label)} />
                            ))
                          )}
                        </div>
                      )}
                      {activeMarketTab === 'CS' && (
                        <div>
                          <button 
                            onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                            className="w-full py-3 bg-slate-950/50 hover:bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center gap-3 text-[10px] font-black text-slate-500 uppercase transition-all hover:text-blue-400 group/expand"
                          >
                            <LayoutGrid className="w-3.5 h-3.5 group-hover/expand:rotate-90 transition-transform" />
                            {expandedMatch === match.id ? '折叠波胆面板' : '展开 31 项全量波胆盘口'}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedMatch === match.id ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedMatch === match.id && (
                            <div className="mt-6 p-4 bg-slate-950/30 rounded-3xl border border-slate-800/50 animate-in slide-in-from-top-4 duration-300">
                              {renderCorrectScores(match)}
                            </div>
                          )}
                        </div>
                      )}
                      {activeSport === 'BASKETBALL' && (
                        <div className="space-y-4">
                           <div className="grid grid-cols-3 gap-2.5">
                             <BetBtn label="大分" odds={match.match_context.international_odds.totals_odds?.over} onClick={() => addToPortfolio(match, 'TOTALS', '大分')} />
                             <div className="bg-slate-950/50 rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-700 border border-slate-800 px-1 text-center">
                               {match.match_context.markets.totals || '总分'}
                             </div>
                             <BetBtn label="小分" odds={match.match_context.international_odds.totals_odds?.under} onClick={() => addToPortfolio(match, 'TOTALS', '小分')} />
                           </div>
                           <div className="grid grid-cols-3 gap-2.5">
                             <BetBtn label="让胜" odds={match.match_context.international_odds.wdhl?.h} onClick={() => addToPortfolio(match, 'WDHL', '让胜')} />
                             <div className="bg-slate-950/50 rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-700 border border-slate-800 px-1 text-center">
                               {match.match_context.markets.handicap || '让分'}
                             </div>
                             <BetBtn label="让负" odds={match.match_context.international_odds.wdhl?.a} onClick={() => addToPortfolio(match, 'WDHL', '让负')} />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-[40px] p-8 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Shield className="w-32 h-32" />
              </div>

              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                  <Activity className="w-6 h-6 text-blue-500" /> AI 策略风控中心
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-600 uppercase">当前挂载:</span>
                  <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black text-white shadow-lg shadow-blue-600/20">{portfolio.length} 项</span>
                </div>
              </div>

              {portfolio.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-[40px] text-slate-700 group hover:border-blue-500/30 transition-colors">
                  <Shield className="w-16 h-16 mb-6 opacity-10 group-hover:opacity-20 transition-opacity" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">请从左侧面板选择盘口方案</p>
                  <p className="text-[9px] text-slate-800 font-bold uppercase mt-2 tracking-[0.3em]">Ready for analysis</p>
                </div>
              ) : (
                <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-3">
                  {portfolio.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950/80 p-5 rounded-[24px] border border-slate-800 hover:border-blue-500/20 transition-all group animate-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center gap-5">
                        <div className={`p-3.5 rounded-2xl ${item.sport === 'FOOTBALL' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {item.sport === 'FOOTBALL' ? <Trophy className="w-5 h-5" /> : <Dribbble className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight">{item.match_name}</p>
                          <div className="flex items-center gap-2.5 mt-1.5">
                            <span className="px-2.5 py-1 bg-slate-900 text-[9px] font-black text-slate-400 rounded-lg border border-slate-800 uppercase">
                              {item.market_type === 'WDL' ? '胜平负' : item.market_type === 'WDHL' ? '让球胜平' : item.market_type === 'CS' ? '波胆' : item.market_type === 'TG' ? '进球数' : '总分'}
                            </span>
                            <span className="text-xl font-black text-blue-400 tracking-tighter">{item.pick}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromPortfolio(idx)}
                        className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleAudit}
                disabled={portfolio.length === 0 || isAuditing}
                className={`w-full py-6 rounded-[32px] font-black text-lg uppercase tracking-tight flex items-center justify-center gap-4 transition-all relative overflow-hidden ${
                  portfolio.length > 0 && !isAuditing
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                {isAuditing && <div className="absolute inset-0 bg-blue-400/20 animate-pulse"></div>}
                {isAuditing ? <Loader2 className="w-6 h-6 animate-spin relative z-10" /> : <Shield className="w-6 h-6 relative z-10" />}
                <span className="relative z-10">{isAuditing ? '深度审计进行中...' : '生成风控审计报告'}</span>
              </button>
            </div>

            {auditResult && !isAuditing && (
              <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-8 pb-24">
                <div className={`p-10 rounded-[50px] border-2 shadow-inner relative overflow-hidden ${
                  auditResult.portfolio_summary.status === 'PASS' 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : auditResult.portfolio_summary.status === 'WARNING'
                  ? 'bg-orange-500/5 border-orange-500/20'
                  : 'bg-rose-500/5 border-rose-500/20'
                }`}>
                  <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="w-32 h-32 rounded-[40px] bg-slate-950 flex flex-col items-center justify-center border-4 border-slate-800 shadow-2xl ring-1 ring-white/5">
                      <span className="text-[10px] text-slate-600 font-black uppercase mb-1 tracking-widest">Risk Index</span>
                      <span className={`text-5xl font-black tracking-tighter ${
                        auditResult.portfolio_summary.total_risk_score < 40 ? 'text-emerald-500' : auditResult.portfolio_summary.total_risk_score < 70 ? 'text-orange-500' : 'text-rose-500'
                      }`}>
                        {auditResult.portfolio_summary.total_risk_score}
                      </span>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-4xl font-black italic uppercase mb-4 tracking-tighter flex items-center gap-4 justify-center md:justify-start">
                        {auditResult.portfolio_summary.status === 'PASS' ? <CheckCircle className="w-10 h-10 text-emerald-500" /> : <AlertTriangle className="w-10 h-10 text-orange-500" />}
                        审计结论: {auditResult.portfolio_summary.status}
                      </h3>
                      <p className="text-xl text-slate-400 font-medium leading-relaxed italic border-l-4 border-slate-800 pl-6 py-2">
                        "{auditResult.portfolio_summary.summary_text}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {auditResult.audit_details.map((detail, i) => (
                    <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-8 hover:border-slate-700 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="w-24 h-24" />
                      </div>
                      <div className="flex items-center gap-5 mb-8">
                        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-[11px] font-black text-slate-500 border border-slate-800 shadow-inner">0{i+1}</div>
                        <div>
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] block mb-1">{detail.risk_tag}</span>
                          <h4 className="text-xl font-black uppercase tracking-tight">{detail.selection_id}</h4>
                        </div>
                        <div className="ml-auto">
                          <span className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-xl" style={{ color: detail.ui_color, borderColor: `${detail.ui_color}40`, backgroundColor: `${detail.ui_color}10` }}>
                            {detail.risk_level} 风险级别
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-slate-950/40 p-6 rounded-[24px] border border-slate-800/50 shadow-inner">
                          <div className="flex items-center gap-2 mb-4 text-slate-600 font-black text-[10px] uppercase tracking-widest">
                            <Info className="w-3.5 h-3.5" /> 战术风控路径
                          </div>
                          <p className="text-slate-300 font-medium italic leading-relaxed text-sm">"{detail.analysis}"</p>
                        </div>
                        
                        {detail.optimization.available && (
                          <div className="bg-blue-600/5 p-6 rounded-[24px] border border-blue-500/20 relative shadow-2xl">
                            <div className="flex items-center gap-2 mb-4 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                              <Zap className="w-3.5 h-3.5" /> 优化替换策略 ({detail.optimization.type})
                            </div>
                            <div className="mb-4">
                              <span className="text-[10px] text-slate-600 block font-black mb-1 uppercase tracking-tight">推荐替代方案:</span>
                              <span className="text-2xl font-black text-emerald-400 tracking-tighter">{detail.optimization.suggested_pick_name}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-white/5">{detail.optimization.suggested_reason}</p>
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

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
};

const MarketTabBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button 
    onClick={onClick} 
    className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
      active ? 'bg-slate-800 text-white border-slate-700 shadow-xl' : 'text-slate-600 border-transparent hover:text-slate-400 hover:bg-slate-800/40'
    }`}
  >
    {children}
  </button>
);

const BetBtn: React.FC<{ onClick: () => void; label: string; odds: number | undefined }> = ({ onClick, label, odds }) => (
  <button 
    onClick={onClick} 
    className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 py-3.5 rounded-2xl transition-all group/btn active:scale-[0.97] flex flex-col items-center justify-center gap-1 shadow-sm"
  >
    <div className="text-[9px] text-slate-500 font-bold group-hover/btn:text-slate-400 transition-colors uppercase tracking-tighter">{label}</div>
    <div className="text-sm font-black text-slate-400 group-hover/btn:text-blue-400 transition-colors">{odds ? odds.toFixed(2) : '--'}</div>
  </button>
);

const ScoreBtn: React.FC<{ label: string; odds: number | undefined; onClick: () => void }> = ({ label, odds, onClick }) => (
  <button 
    onClick={onClick} 
    className="bg-slate-900/40 hover:bg-blue-600/20 py-2.5 rounded-xl border border-slate-800 hover:border-blue-500/30 transition-all text-center flex flex-col items-center justify-center min-h-[46px] group/score"
  >
    <div className="text-[10px] font-black text-slate-400 group-hover/score:text-white transition-colors">{label}</div>
    <div className="text-[9px] font-bold text-slate-600 group-hover/score:text-blue-400/80 transition-colors leading-none mt-0.5">{odds ? odds.toFixed(2) : '--'}</div>
  </button>
);

export default App;
