
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, Activity, TrendingUp, Dribbble, Trophy, LayoutGrid, ChevronDown, 
  Loader2, Clock, RefreshCw, Zap, Trash2, CheckCircle, 
  AlertTriangle, Globe, Database, Info, Calculator, Layers, XCircle, ExternalLink
} from 'lucide-react';
import { MOCK_MATCHES } from './constants';
import { Match, UserSelection, AuditResponse, SportType, MarketOdds, DataSource, AuditDetail } from './types';
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
        setLastSync(new Date().toLocaleTimeString() + " (模拟数据)");
      }
    } catch (err) {
      setMatches(MOCK_MATCHES);
      setLastSync(new Date().toLocaleTimeString() + " (同步异常)");
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

  const combinationInfo = useMemo(() => {
    if (portfolio.length === 0) return { count: 0, min: 0, max: 0 };
    const grouped = portfolio.reduce((acc, item) => {
      if (!acc[item.match_id]) acc[item.match_id] = [];
      acc[item.match_id].push(item.odds);
      return acc;
    }, {} as Record<string, number[]>);
    const matchIds = Object.keys(grouped);
    let totalCombinations = 1;
    let minCombinedOdds = 1;
    let maxCombinedOdds = 1;
    matchIds.forEach(id => {
      const oddsList = grouped[id];
      totalCombinations *= oddsList.length;
      minCombinedOdds *= Math.min(...oddsList);
      maxCombinedOdds *= Math.max(...oddsList);
    });
    return { count: totalCombinations, min: minCombinedOdds, max: maxCombinedOdds };
  }, [portfolio]);

  const addToPortfolio = (match: Match, market: UserSelection['market_type'], pick: string, odds: number | undefined) => {
    if (odds === undefined || odds === 0) return;
    setPortfolio(prev => {
      const isSelected = prev.some(p => p.match_id === match.id && p.market_type === market && p.pick === pick);
      if (isSelected) {
        return prev.filter(p => !(p.match_id === match.id && p.market_type === market && p.pick === pick));
      }
      return [...prev, {
        match_id: match.id, 
        match_name: `${match.homeTeam} 对阵 ${match.awayTeam}`,
        sport: match.sport, 
        market_type: market, 
        pick: pick,
        odds: odds
      }];
    });
    setAuditResult(null);
  };

  const removeFromPortfolio = (matchId: string, market: string, pick: string) => {
    setPortfolio(prev => prev.filter(p => !(p.match_id === matchId && p.market_type === market && p.pick === pick)));
    setAuditResult(null);
  };

  const clearPortfolio = () => {
    setPortfolio([]);
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
      alert("风控引擎繁忙，请稍后再试。");
    } finally {
      setIsAuditing(false);
    }
  };

  const isSelected = (match_id: string, market_type: string, pick: string) => {
    return portfolio.some(p => p.match_id === match_id && p.market_type === market_type && p.pick === pick);
  };

  const renderCorrectScores = (match: Match) => {
    const scores = match.match_context.markets.correct_score || [];
    const homeWins = ["1:0", "2:0", "2:1", "3:0", "3:1", "3:2", "4:0", "4:1", "4:2", "5:0", "5:1", "5:2", "胜其它"];
    const draws = ["0:0", "1:1", "2:2", "3:3", "平其它"];
    const awayWins = ["0:1", "0:2", "1:2", "0:3", "1:3", "2:3", "0:4", "1:4", "2:4", "0:5", "1:5", "2:5", "负其它"];
    const getScoreOdds = (label: string) => scores.find(s => s.label === label)?.odds;
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-3 bg-red-600 rounded-full"></span> 主胜波胆
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {homeWins.map(score => {
              const odds = getScoreOdds(score);
              return <ScoreBtn key={score} label={score} odds={odds} active={isSelected(match.id, 'CS', score)} onClick={() => addToPortfolio(match, 'CS', score, odds)} />;
            })}
          </div>
        </div>
        <div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-3 bg-gray-400 rounded-full"></span> 平局波胆
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {draws.map(score => {
              const odds = getScoreOdds(score);
              return <ScoreBtn key={score} label={score} odds={odds} active={isSelected(match.id, 'CS', score)} onClick={() => addToPortfolio(match, 'CS', score, odds)} />;
            })}
          </div>
        </div>
        <div>
          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-3 bg-blue-600 rounded-full"></span> 客胜波胆
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {awayWins.map(score => {
              const odds = getScoreOdds(score);
              return <ScoreBtn key={score} label={score} odds={odds} active={isSelected(match.id, 'CS', score)} onClick={() => addToPortfolio(match, 'CS', score, odds)} />;
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#1a1a1a] selection:bg-red-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 blur-[120px] rounded-full bg-red-500"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] blur-[150px] bg-red-400 rounded-full"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-tr from-red-600 to-red-700 p-3.5 rounded-2xl shadow-xl shadow-red-600/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-[900] tracking-tighter uppercase italic text-gray-900">
                收天米 <span className="text-red-600">PRO</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{isFetching ? fetchStatus : `已开盘赛程同步: ${lastSync}`}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="bg-white p-1 rounded-2xl border border-gray-100 flex shadow-sm">
              <button 
                onClick={() => setDataSource('OFFICIAL')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${dataSource === 'OFFICIAL' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Database className="w-3 h-3" /> 竞彩中心
              </button>
              <button 
                onClick={() => setDataSource('INTERNATIONAL')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${dataSource === 'INTERNATIONAL' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Globe className="w-3 h-3" /> 国际盘口
              </button>
            </div>

            <div className="bg-white p-1 rounded-2xl border border-gray-100 flex shadow-sm">
              <button 
                onClick={() => { setActiveSport('FOOTBALL'); setActiveMarketTab('WDL'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeSport === 'FOOTBALL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400'}`}
              >
                <Trophy className="w-3 h-3" /> 竞彩足球
              </button>
              <button 
                onClick={() => { setActiveSport('BASKETBALL'); setActiveMarketTab('BASKET'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeSport === 'BASKETBALL' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400'}`}
              >
                <Dribbble className="w-3 h-3" /> 竞彩篮球
              </button>
            </div>

            <button onClick={initData} disabled={isFetching} className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-600 shadow-sm transition-all disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-50 flex gap-2 overflow-x-auto no-scrollbar bg-gray-50/30">
                {activeSport === 'FOOTBALL' ? (
                  <>
                    <MarketTabBtn active={activeMarketTab === 'WDL'} onClick={() => setActiveMarketTab('WDL')}>胜平负</MarketTabBtn>
                    <MarketTabBtn active={activeMarketTab === 'WDHL'} onClick={() => setActiveMarketTab('WDHL')}>让球胜平</MarketTabBtn>
                    <MarketTabBtn active={activeMarketTab === 'TG'} onClick={() => setActiveMarketTab('TG')}>进球数</MarketTabBtn>
                    <MarketTabBtn active={activeMarketTab === 'CS'} onClick={() => setActiveMarketTab('CS')}>比分波胆</MarketTabBtn>
                  </>
                ) : (
                  <MarketTabBtn active={true} onClick={() => {}}>让分/总分</MarketTabBtn>
                )}
              </div>

              <div className="divide-y divide-gray-50 max-h-[700px] overflow-y-auto custom-scrollbar">
                {isFetching ? (
                  <div className="p-24 flex flex-col items-center justify-center space-y-6">
                    <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{fetchStatus}</p>
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="p-24 text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">当前无开盘的未来赛事</p>
                  </div>
                ) : filteredMatches.map(match => (
                  <div key={match.id} className="p-6 hover:bg-red-50/30 transition-all duration-300 group">
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black border border-red-100 uppercase">{match.league}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                          <Clock className="w-3 h-3" /> {match.startTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.match_context.news_sentiment && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>}
                        <span className="text-[9px] font-black text-gray-300 px-2 py-0.5 rounded border border-gray-100">受注中</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex-1 text-center">
                        <p className="text-lg font-black tracking-tighter text-gray-900">{match.homeTeam}</p>
                        <p className="text-[9px] text-gray-400 mt-1 font-bold">排名 {match.match_context.league_rank?.home || '--'}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-300 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">VS</span>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-lg font-black tracking-tighter text-gray-900">{match.awayTeam}</p>
                        <p className="text-[9px] text-gray-400 mt-1 font-bold">排名 {match.match_context.league_rank?.away || '--'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {activeMarketTab === 'WDL' && (
                        <div className="grid grid-cols-3 gap-2.5">
                          <BetBtn label="主胜" active={isSelected(match.id, 'WDL', '主胜')} odds={match.match_context.international_odds.wdl.h} onClick={() => addToPortfolio(match, 'WDL', '主胜', match.match_context.international_odds.wdl.h)} />
                          <BetBtn label="平局" active={isSelected(match.id, 'WDL', '平局')} odds={match.match_context.international_odds.wdl.d} onClick={() => addToPortfolio(match, 'WDL', '平局', match.match_context.international_odds.wdl.d)} />
                          <BetBtn label="客胜" active={isSelected(match.id, 'WDL', '客胜')} odds={match.match_context.international_odds.wdl.a} onClick={() => addToPortfolio(match, 'WDL', '客胜', match.match_context.international_odds.wdl.a)} />
                        </div>
                      )}
                      {activeMarketTab === 'WDHL' && (
                        <div className="grid grid-cols-3 gap-2.5">
                          <BetBtn label={`让胜(${match.match_context.markets.handicap || match.match_context.international_odds.wdhl?.handicap || '?'})`} active={isSelected(match.id, 'WDHL', '让胜')} odds={match.match_context.international_odds.wdhl?.h} onClick={() => addToPortfolio(match, 'WDHL', '让胜', match.match_context.international_odds.wdhl?.h)} />
                          <BetBtn label="让平" active={isSelected(match.id, 'WDHL', '让平')} odds={match.match_context.international_odds.wdhl?.d} onClick={() => addToPortfolio(match, 'WDHL', '让平', match.match_context.international_odds.wdhl?.d)} />
                          <BetBtn label="让负" active={isSelected(match.id, 'WDHL', '让负')} odds={match.match_context.international_odds.wdhl?.a} onClick={() => addToPortfolio(match, 'WDHL', '让负', match.match_context.international_odds.wdhl?.a)} />
                        </div>
                      )}
                      {activeMarketTab === 'TG' && (
                        <div className="grid grid-cols-4 gap-2.5">
                          {match.match_context.international_odds.total_goals?.map(tg => (
                            <BetBtn key={tg.value} label={tg.label} active={isSelected(match.id, 'TG', tg.label)} odds={tg.odds} onClick={() => addToPortfolio(match, 'TG', tg.label, tg.odds)} />
                          ))}
                        </div>
                      )}
                      {activeMarketTab === 'CS' && (
                        <div>
                          <button 
                            onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                            className="w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 flex items-center justify-center gap-3 text-[10px] font-black text-gray-400 uppercase transition-all"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            {expandedMatch === match.id ? '折叠比分面板' : '单场复式波胆盘口'}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedMatch === match.id ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedMatch === match.id && (
                            <div className="mt-6 p-4 bg-gray-50/50 rounded-3xl border border-gray-100 animate-in slide-in-from-top-4 duration-300">
                              {renderCorrectScores(match)}
                            </div>
                          )}
                        </div>
                      )}
                      {activeSport === 'BASKETBALL' && (
                        <div className="space-y-4">
                           <div className="grid grid-cols-3 gap-2.5">
                             <BetBtn label="大分" active={isSelected(match.id, 'TOTALS', '大分')} odds={match.match_context.international_odds.totals_odds?.over} onClick={() => addToPortfolio(match, 'TOTALS', '大分', match.match_context.international_odds.totals_odds?.over)} />
                             <div className="bg-gray-50 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 px-1 text-center">
                               {match.match_context.markets.totals || '总分'}
                             </div>
                             <BetBtn label="小分" active={isSelected(match.id, 'TOTALS', '小分')} odds={match.match_context.international_odds.totals_odds?.under} onClick={() => addToPortfolio(match, 'TOTALS', '小分', match.match_context.international_odds.totals_odds?.under)} />
                           </div>
                           <div className="grid grid-cols-3 gap-2.5">
                             <BetBtn label="让胜" active={isSelected(match.id, 'WDHL', '让胜')} odds={match.match_context.international_odds.wdhl?.h} onClick={() => addToPortfolio(match, 'WDHL', '让胜', match.match_context.international_odds.wdhl?.h)} />
                             <div className="bg-gray-50 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 px-1 text-center">
                               {match.match_context.markets.handicap || '让分'}
                             </div>
                             <BetBtn label="让负" active={isSelected(match.id, 'WDHL', '让负')} odds={match.match_context.international_odds.wdhl?.a} onClick={() => addToPortfolio(match, 'WDHL', '让负', match.match_context.international_odds.wdhl?.a)} />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Shield className="w-32 h-32 text-red-600" />
              </div>

              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-4 text-gray-900">
                  <Activity className="w-6 h-6 text-red-600" /> 风控审计台
                </h2>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    {portfolio.length > 0 && (
                      <button onClick={clearPortfolio} className="text-[10px] font-black text-red-400 hover:text-red-600 flex items-center gap-1 uppercase transition-colors mr-2">
                        <Trash2 className="w-3 h-3" /> 清空
                      </button>
                    )}
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">已选选项:</span>
                    <span className="px-4 py-1.5 bg-red-600 rounded-full text-[10px] font-black text-white shadow-lg shadow-red-600/10">{portfolio.length}</span>
                  </div>
                  {portfolio.length > 0 && (
                    <div className="flex flex-col items-end gap-1 mt-1 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3 h-3 text-red-600" />
                        <span className="text-[10px] font-black text-gray-400">排列组合注数:</span>
                        <span className="text-sm font-black text-red-600">{combinationInfo.count} 注</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calculator className="w-3 h-3 text-red-600" />
                        <span className="text-[10px] font-black text-gray-400">组合赔率范围:</span>
                        <span className="text-sm font-black text-red-600">
                          {combinationInfo.min.toFixed(2)} {combinationInfo.max > combinationInfo.min ? `~ ${combinationInfo.max.toFixed(2)}` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {portfolio.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[40px] text-gray-300 group hover:border-red-100 transition-colors">
                  <Shield className="w-16 h-16 mb-6 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest">请从左侧选择尚未开始的比赛，支持同一场比赛选择多个选项</p>
                </div>
              ) : (
                <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto custom-scrollbar pr-3">
                  {(Object.entries(portfolio.reduce((acc, item) => {
                    if (!acc[item.match_id]) acc[item.match_id] = [];
                    acc[item.match_id].push(item);
                    return acc;
                  }, {} as Record<string, UserSelection[]>)) as [string, UserSelection[]][]).map(([matchId, items]) => (
                    <div key={matchId} className="bg-gray-50/50 rounded-[32px] border border-gray-100 p-6 animate-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${items[0].sport === 'FOOTBALL' ? 'bg-red-50 text-red-600' : 'bg-gray-800 text-white'}`}>
                            {items[0].sport === 'FOOTBALL' ? <Trophy className="w-4 h-4" /> : <Dribbble className="w-4 h-4" />}
                          </div>
                          <p className="text-[11px] text-gray-900 font-black uppercase tracking-tight">{items[0].match_name}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm group">
                            <span className="text-[9px] font-black text-gray-300 uppercase">
                              {item.market_type === 'WDL' ? '胜平负' : item.market_type === 'WDHL' ? '让球' : item.market_type === 'CS' ? '比分' : item.market_type === 'TG' ? '进球' : '总分'}
                            </span>
                            <span className="text-sm font-black text-red-600">{item.pick}</span>
                            <span className="text-[10px] font-bold text-gray-400">@{item.odds.toFixed(2)}</span>
                            <button onClick={() => removeFromPortfolio(item.match_id, item.market_type, item.pick)} className="ml-1 text-gray-300 hover:text-red-500 transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleAudit}
                disabled={portfolio.length === 0 || isAuditing}
                className={`w-full py-6 rounded-[32px] font-black text-lg uppercase tracking-tight flex items-center justify-center gap-4 transition-all relative overflow-hidden ${
                  portfolio.length > 0 && !isAuditing
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/20'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isAuditing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Shield className="w-6 h-6" />}
                <span>{isAuditing ? 'AI 正在排列组合与大数据分析...' : `生成风控报告 (${combinationInfo.count}注方案)`}</span>
              </button>
            </div>

            {auditResult && !isAuditing && (
              <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-8 pb-24">
                <div className={`p-10 rounded-[50px] border shadow-sm relative overflow-hidden ${
                  auditResult.portfolio_summary.status === 'PASS' ? 'bg-green-50 border-green-100' : auditResult.portfolio_summary.status === 'WARNING' ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'
                }`}>
                  <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="w-32 h-32 rounded-[40px] bg-white flex flex-col items-center justify-center border border-gray-100 shadow-sm">
                      <span className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">风险指数</span>
                      <span className={`text-5xl font-black tracking-tighter ${auditResult.portfolio_summary.total_risk_score < 40 ? 'text-green-600' : auditResult.portfolio_summary.total_risk_score < 70 ? 'text-orange-500' : 'text-red-600'}`}>
                        {auditResult.portfolio_summary.total_risk_score}
                      </span>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-3xl font-black italic uppercase mb-4 tracking-tighter flex items-center gap-4 justify-center md:justify-start">
                        {auditResult.portfolio_summary.status === 'PASS' ? <CheckCircle className="w-10 h-10 text-green-600" /> : <AlertTriangle className="w-10 h-10 text-orange-500" />}
                        审计状态: {auditResult.portfolio_summary.status}
                      </h3>
                      <p className="text-lg text-gray-600 font-medium leading-relaxed italic border-l-4 border-red-200 pl-6">"{auditResult.portfolio_summary.summary_text}"</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {(auditResult.audit_details as AuditDetail[]).map((detail, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-[32px] p-8 hover:border-red-100 transition-all group relative overflow-hidden shadow-sm">
                      <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp className="w-24 h-24 text-red-600" /></div>
                      <div className="flex items-center gap-5 mb-8">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[11px] font-black text-gray-300 border border-gray-100">0{i+1}</div>
                        <div>
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-1">{detail.risk_tag}</span>
                          <h4 className="text-xl font-black tracking-tight text-gray-900">{detail.selection_id}</h4>
                        </div>
                        <div className="ml-auto">
                          <span className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border" style={{ color: detail.ui_color === '#3b82f6' ? '#ef4444' : detail.ui_color, borderColor: `${detail.ui_color}20`, backgroundColor: `${detail.ui_color}05` }}>
                            {detail.risk_level === 'LOW' ? '低风险' : detail.risk_level === 'MEDIUM' ? '中风险' : '高风险'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100">
                          <div className="flex items-center gap-2 mb-4 text-gray-400 font-black text-[10px] uppercase tracking-widest"><Info className="w-3.5 h-3.5" /> 核心风险分析</div>
                          <p className="text-gray-700 font-medium italic leading-relaxed text-sm">"{detail.analysis}"</p>
                        </div>
                        {detail.optimization.available && (
                          <div className="bg-red-50 p-6 rounded-[24px] border border-red-100 relative shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-red-600 font-black text-[10px] uppercase tracking-widest"><Zap className="w-3.5 h-3.5" /> 方案优化建议 ({detail.optimization.type})</div>
                            <div className="mb-4">
                              <span className="text-[10px] text-gray-400 block font-black mb-1 uppercase">推荐替换选项:</span>
                              <span className="text-2xl font-black text-red-600 tracking-tighter">{detail.optimization.suggested_pick_name}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed bg-white/50 p-3 rounded-xl">原因: {detail.optimization.suggested_reason}</p>
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

const MarketTabBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black transition-all border ${active ? 'bg-red-600 text-white border-red-600 shadow-md' : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-white'}`}>{children}</button>
);

const BetBtn: React.FC<{ onClick: () => void; label: string; odds: number | undefined; active?: boolean }> = ({ onClick, label, odds, active }) => (
  <button onClick={onClick} className={`border py-3.5 rounded-2xl transition-all group/btn active:scale-[0.97] flex flex-col items-center justify-center gap-1 shadow-sm ${active ? 'bg-red-600 border-red-600 text-white' : 'bg-white hover:bg-red-50 border-gray-100 hover:border-red-200 text-gray-600'}`}>
    <div className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${active ? 'text-red-100' : 'text-gray-400 group-hover/btn:text-red-400'}`}>{label}</div>
    <div className={`text-sm font-black transition-colors ${active ? 'text-white' : 'text-gray-600 group-hover/btn:text-red-600'}`}>{odds ? odds.toFixed(2) : '--'}</div>
  </button>
);

const ScoreBtn: React.FC<{ label: string; odds: number | undefined; onClick: () => void; active?: boolean }> = ({ label, odds, onClick, active }) => (
  <button onClick={onClick} className={`py-2.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center min-h-[46px] group/score shadow-sm ${active ? 'bg-red-600 border-red-600 text-white' : 'bg-white hover:bg-red-50 border-gray-100 hover:border-red-200'}`}>
    <div className={`text-[10px] font-black transition-colors ${active ? 'text-white' : 'text-gray-500 group-hover/score:text-red-600'}`}>{label}</div>
    <div className={`text-[9px] font-bold leading-none mt-0.5 transition-colors ${active ? 'text-red-100' : 'text-gray-300 group-hover/score:text-red-400'}`}>{odds ? odds.toFixed(2) : '--'}</div>
  </button>
);

export default App;
