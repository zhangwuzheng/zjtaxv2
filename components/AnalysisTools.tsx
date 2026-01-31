
import React, { useState, useMemo } from 'react';
import { CalculationConfig, SimulationResult, TradeMode, TaxType } from '../types';
import { calculateSimulation } from '../utils/calculator';

interface Props {
  config: CalculationConfig;
  results: SimulationResult;
}

export const AnalysisTools: React.FC<Props> = ({ config, results }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'structure' | 'sensitivity' | 'compare' | 'reverse'>('timeline');

  // --- Shared Calculation Helpers ---
  const retailerPayDay = config.retailerPaymentTermDays;
  const funderPayDay = config.funderPaymentTermMonths * 30;
  const maxDay = Math.max(retailerPayDay, funderPayDay) + 30;

  // --- 1. Scenario Comparison Logic (Auto Sales vs Consignment) ---
  const comparisonData = useMemo(() => {
      // Create Config A (Sales)
      const configSales = { ...config, retailerTradeMode: TradeMode.SALES };
      const resSales = calculateSimulation(configSales);

      // Create Config B (Consignment)
      const configConsignment = { ...config, retailerTradeMode: TradeMode.CONSIGNMENT };
      const resConsignment = calculateSimulation(configConsignment);
      
      const cjSales = resSales.cangjing;
      const cjConsign = resConsignment.cangjing;
      const rtSales = resSales.retailer;
      const rtConsign = resConsignment.retailer;
      
      return {
          cangjing: [
              { label: '净利润 (Net Profit)', sales: cjSales.netProfit, consign: cjConsign.netProfit, format: 'currency', higherIsBetter: true },
              { label: '综合税负 (Total Tax)', sales: cjSales.vatPayable + cjSales.surcharges + cjSales.incomeTax, consign: cjConsign.vatPayable + cjConsign.surcharges + cjConsign.incomeTax, format: 'currency', higherIsBetter: false },
          ],
          retailer: [
              { label: '净利润 (Net Profit)', sales: rtSales.netProfit, consign: rtConsign.netProfit, format: 'currency', higherIsBetter: true },
              { label: '资金占用成本 (Finance)', sales: rtSales.financeCost, consign: rtConsign.financeCost, format: 'currency', higherIsBetter: false },
          ]
      };
  }, [config]);


  // --- 2. Capital Efficiency Logic (Annualized ROI) ---
  const capitalMetrics = useMemo(() => {
      const r = results.cangjing;
      const profit = r.netProfit;
      
      // Cycle Calculation
      const receivableDays = config.retailerPaymentTermDays;
      const payableDays = config.funderPaymentTermMonths * 30;
      
      const fundingGap = Math.max(0, receivableDays - payableDays);
      
      // Deal Duration
      const dealDuration = Math.max(receivableDays, payableDays, 30); // Min 30 days floor
      const annualTurnoverRate = 365 / dealDuration;
      
      // Annualized ROI on "Own Capital"
      let ownCapitalRequirement = fundingGap > 0 ? r.inPriceInclTax : 0; 
      // Add operational cost as required working capital
      ownCapitalRequirement += r.operationalCost;
      
      let annualizedROE = 0;
      if (ownCapitalRequirement > 0) {
          annualizedROE = (profit * annualTurnoverRate / ownCapitalRequirement) * 100;
      }

      return {
          dealDuration,
          fundingGap,
          annualTurnoverRate,
          ownCapitalRequirement,
          annualizedROE,
          isInfinite: ownCapitalRequirement === 0 && profit > 0
      };
  }, [results, config]);


  // --- 3. Reverse Calculator Logic ---
  const [targetProfit, setTargetProfit] = useState<number>(100);
  
  const reverseCalc = useMemo(() => {
      const currentNet = results.cangjing.netProfit;
      const currentRev = results.cangjing.outPriceExclTax; 
      const diff = targetProfit - currentNet;
      
      const taxRate = config.cangjingTaxType; 
      
      const revIncrease = diff; // Simplified
      
      const suggestedExcl = currentRev + revIncrease;
      const suggestedIncl = suggestedExcl * (1 + taxRate);
      
      const currentMarkup = ((results.cangjing.outPriceExclTax / results.cangjing.inPriceExclTax) - 1) * 100;
      const suggestedMarkup = ((suggestedExcl / results.cangjing.inPriceExclTax) - 1) * 100;

      return { suggestedIncl, suggestedExcl, currentMarkup, suggestedMarkup };
  }, [targetProfit, results, config]);


  // --- 4. Sensitivity Logic ---
  const [sensitivityParam, setSensitivityParam] = useState<string>('cangjingMarkup');

  const sensitivityData = useMemo(() => {
      const scenarios = [
          { label: '极度悲观 (-20%)', factor: 0.8 },
          { label: '悲观 (-10%)', factor: 0.9 },
          { label: '当前方案 (Base)', factor: 1.0 },
          { label: '乐观 (+10%)', factor: 1.1 },
          { label: '极度乐观 (+20%)', factor: 1.2 },
      ];

      return scenarios.map(scenario => {
          const newConfig = JSON.parse(JSON.stringify(config)); 
          let displayVal = '';

          switch (sensitivityParam) {
              case 'cangjingMarkup': 
                  newConfig.cangjingMarkupPercent = config.cangjingMarkupPercent * scenario.factor;
                  displayVal = `${newConfig.cangjingMarkupPercent.toFixed(1)}%`;
                  break;
              case 'funderMarkup': 
                  newConfig.funderMarkupPercent = config.funderMarkupPercent * scenario.factor;
                  displayVal = `${newConfig.funderMarkupPercent.toFixed(1)}%`;
                  break;
              case 'funderInterest':
                  newConfig.funderInterestRate = config.funderInterestRate * scenario.factor;
                  displayVal = `${newConfig.funderInterestRate.toFixed(1)}%`;
                  break;
               case 'paymentTerm':
                  newConfig.retailerPaymentTermDays = Math.round(config.retailerPaymentTermDays * scenario.factor);
                  displayVal = `${newConfig.retailerPaymentTermDays}天`;
                  break;
          }

          const res = calculateSimulation(newConfig);
          const profit = res.cangjing.netProfit;
          const roi = res.cangjing.outPriceExclTax > 0 ? (profit / res.cangjing.outPriceExclTax) * 100 : 0;

          let bgClass = 'bg-gray-50';
          if (scenario.factor === 1.0) bgClass = 'bg-blue-50 border-blue-200 ring-1 ring-blue-200 font-bold';
          else if (profit < 0) bgClass = 'bg-red-50 text-red-700';
          else if (profit > results.cangjing.netProfit) bgClass = 'bg-green-50 text-green-700';

          return { ...scenario, valDisplay: displayVal, profit, roi, bgClass };
      });
  }, [config, sensitivityParam, results.cangjing.netProfit]);


  // --- 5. Structure Logic ---
  const costStructure = useMemo(() => {
      const r = results.cangjing;
      const totalRev = r.outPriceInclTax; 
      if (totalRev === 0) return [];
      
      const items = [
          { label: '商品采购', value: r.inPriceInclTax, color: 'from-gray-400 to-gray-500', bg: 'bg-gray-500', desc: '上游含税成本' },
          { label: '综合税负', value: r.vatPayable + r.surcharges + r.incomeTax - r.taxRefunds, color: 'from-blue-400 to-blue-500', bg: 'bg-blue-500', desc: '增值+附加+所得-返还' },
          { label: '资金成本', value: r.financeCost, color: 'from-orange-400 to-orange-500', bg: 'bg-orange-500', desc: '利息支出' },
      ];

      // New: Commission Cost
      if (r.commissionCost && r.commissionCost > 0) {
          items.push({ label: '代销佣金', value: r.commissionCost, color: 'from-indigo-400 to-indigo-500', bg: 'bg-indigo-500', desc: '支付给渠道' });
      }

      // Expand Cost Details if available
      if (r.costDetails) {
          if (r.costDetails.warehousing > 0) items.push({ label: '仓储费', value: r.costDetails.warehousing, color: 'from-purple-300 to-purple-400', bg: 'bg-purple-400', desc: '费用包:仓储' });
          if (r.costDetails.logistics > 0) items.push({ label: '物流费', value: r.costDetails.logistics, color: 'from-purple-400 to-purple-500', bg: 'bg-purple-500', desc: '费用包:物流' });
          if (r.costDetails.management > 0) items.push({ label: '管理费', value: r.costDetails.management, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-600', desc: '费用包:管理' });
          if (r.costDetails.other > 0) items.push({ label: '其他费用', value: r.costDetails.other, color: 'from-purple-600 to-purple-700', bg: 'bg-purple-700', desc: '费用包:其他' });
      } else if (r.operationalCost > 0) {
          items.push({ label: '运营/物流', value: r.operationalCost, color: 'from-purple-400 to-purple-500', bg: 'bg-purple-500', desc: '仓储物流及杂项' });
      }

      items.push({ label: '净利润', value: r.netProfit, color: r.netProfit >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-600', bg: r.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600', desc: '最终落袋收益' });
      
      return items.filter(i => Math.abs(i.value) > 0.01);
  }, [results]);


  // --- Tabs Styling ---
  const tabs = [
      { id: 'timeline', label: '资金流全景', icon: '⏳' },
      { id: 'compare', label: '经销 vs 代销', icon: '⚖️' }, 
      { id: 'structure', label: '成本结构', icon: '🍰' },
      { id: 'sensitivity', label: '敏感性测试', icon: '📈' },
      { id: 'reverse', label: '利润倒推', icon: '🎯' },
  ];

  const formatMoney = (val: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white rounded-xl shadow-xl border border-indigo-50 overflow-hidden print:break-inside-avoid font-sans">
       
       {/* Navigation */}
       <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[100px] py-4 text-xs md:text-sm font-bold flex flex-col md:flex-row items-center justify-center gap-2 transition-all duration-200 relative
                    ${activeTab === tab.id 
                        ? 'text-indigo-700 bg-white' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}
              >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                  )}
              </button>
          ))}
       </div>

       <div className="p-6 md:p-8 min-h-[400px]">
           
           {/* === TAB 1: TIMELINE === */}
           {activeTab === 'timeline' && (
               <div className="animate-fade-in space-y-8">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
                       <div>
                           <h3 className="text-lg font-bold text-gray-800">资金流生命周期 (Cash Flow Lifecycle)</h3>
                           <p className="text-xs text-gray-400 mt-1">展示单笔交易资金占用时长与盈余窗口期</p>
                       </div>
                       <div className="mt-4 md:mt-0 flex gap-4 text-xs">
                           <div className="flex items-center"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 mr-1"></span> 资金占用 (垫资)</div>
                           <div className="flex items-center"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 mr-1"></span> 资金盈余 (免息)</div>
                       </div>
                   </div>

                   {/* Duration Bar Chart */}
                   <div className="relative h-32 md:h-40 bg-gray-50 rounded-2xl border border-gray-200 mt-8 mx-4 md:mx-8">
                        {/* Timeline Axis Line */}
                        <div className="absolute top-1/2 left-0 w-full h-px bg-gray-300 -z-0"></div>

                        {/* Events */}
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                             <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-2">T+0</div>
                             <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
                             <div className="mt-2 text-[10px] text-gray-500 font-bold w-20 text-center">垫资方付款</div>
                        </div>

                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-500"
                             style={{ left: `${(retailerPayDay / maxDay) * 100}%` }}>
                             <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-2">T+{retailerPayDay}</div>
                             <div className="w-4 h-4 rounded-full bg-green-600 border-2 border-white shadow-sm"></div>
                             <div className="mt-2 text-[10px] text-gray-500 font-bold w-24 text-center">收到渠道回款</div>
                             <div className="text-[10px] font-mono font-bold text-green-600">+¥{Math.round(results.retailer.inPriceInclTax).toLocaleString()}</div>
                        </div>

                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-500"
                             style={{ left: `${(funderPayDay / maxDay) * 100}%` }}>
                             <div className={`text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-2 ${funderPayDay > retailerPayDay ? 'bg-indigo-500' : 'bg-red-500'}`}>T+{funderPayDay}</div>
                             <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${funderPayDay > retailerPayDay ? 'bg-indigo-500' : 'bg-red-500'}`}></div>
                             <div className="mt-2 text-[10px] text-gray-500 font-bold w-24 text-center">偿还垫资方</div>
                             <div className="text-[10px] font-mono font-bold text-red-600">-¥{Math.round(results.funder.outPriceInclTax).toLocaleString()}</div>
                        </div>

                        {/* Duration Zones */}
                        {retailerPayDay < funderPayDay ? (
                            <div className="absolute top-1/2 -translate-y-1/2 h-8 bg-green-100/50 border border-green-200 rounded flex items-center justify-center text-[10px] text-green-700 font-bold z-0"
                                 style={{ left: `${(retailerPayDay / maxDay) * 100}%`, width: `${((funderPayDay - retailerPayDay) / maxDay) * 100}%` }}>
                                 资金沉淀期 {funderPayDay - retailerPayDay}天
                            </div>
                        ) : (
                             <div className="absolute top-1/2 -translate-y-1/2 h-8 bg-red-100/50 border border-red-200 rounded flex items-center justify-center text-[10px] text-red-700 font-bold z-0"
                                 style={{ left: `${(funderPayDay / maxDay) * 100}%`, width: `${((retailerPayDay - funderPayDay) / maxDay) * 100}%` }}>
                                 资金占用期 {retailerPayDay - funderPayDay}天
                            </div>
                        )}
                   </div>
               </div>
           )}
           
           {/* === TAB 2: COMPARE (Auto Sales vs Consignment) === */}
           {activeTab === 'compare' && (
               <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                   
                   {/* Module A: Annualized ROI */}
                   <div className="space-y-6">
                       <div>
                           <h3 className="text-lg font-bold text-gray-800 flex items-center">
                               🚀 资金周转与年化回报
                               <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">决策核心</span>
                           </h3>
                           <p className="text-xs text-gray-400 mt-1">基于当前配置，评估生意的真实资金效率。</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                           <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                               <div className="text-xs text-gray-500 mb-1">单笔生意周期</div>
                               <div className="text-2xl font-bold text-indigo-700">{capitalMetrics.dealDuration} <span className="text-sm font-normal text-gray-400">天</span></div>
                               <div className="text-[10px] text-indigo-400 mt-1">年周转率: {capitalMetrics.annualTurnoverRate.toFixed(1)} 次</div>
                           </div>
                           <div className={`p-4 rounded-xl border shadow-sm ${capitalMetrics.fundingGap > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                               <div className="text-xs text-gray-500 mb-1">{capitalMetrics.fundingGap > 0 ? '自有资金占用 (缺口)' : '无需自有资金'}</div>
                               <div className={`text-2xl font-bold ${capitalMetrics.fundingGap > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                   {capitalMetrics.fundingGap > 0 ? formatMoney(capitalMetrics.ownCapitalRequirement) : '全额垫资'}
                               </div>
                               <div className="text-[10px] mt-1 opacity-70">
                                   {capitalMetrics.fundingGap > 0 ? `缺口时长: ${capitalMetrics.fundingGap} 天` : '享受资金沉淀收益'}
                               </div>
                           </div>
                       </div>

                       <div className="bg-gray-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                           <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                               <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.15-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.35 0 .81.91 1.51 2.67 1.91 2.55.58 4.2 1.61 4.2 3.82 0 1.93-1.57 3.14-3.34 3.54z"/></svg>
                           </div>
                           <div className="relative z-10">
                               <div className="text-xs text-gray-400 font-bold uppercase mb-2">年化自有资金回报率 (Annualized ROE)</div>
                               <div className="flex items-baseline">
                                   {capitalMetrics.isInfinite ? (
                                       <span className="text-4xl font-bold text-green-400">∞ 无限</span>
                                   ) : (
                                       <span className="text-4xl font-mono font-bold text-tibet-gold">{capitalMetrics.annualizedROE.toFixed(1)}%</span>
                                   )}
                                   {!capitalMetrics.isInfinite && <span className="ml-2 text-sm text-gray-400">/ 年</span>}
                               </div>
                               <div className="mt-4 pt-4 border-t border-gray-700 text-[10px] text-gray-400 leading-relaxed">
                                   计算逻辑：单笔净利润 × 年周转次数 ÷ 自有资金投入。
                                   <br/>
                                   若回报率 &gt; 20%，说明资金周转效率极高，是优质现金流业务。
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Module B: Sales vs Consignment Comparison */}
                   <div className="space-y-6 border-l border-gray-100 lg:pl-8">
                       <div>
                           <h3 className="text-lg font-bold text-gray-800 flex items-center justify-between">
                               <span>⚖️ 经销 vs 代销 (模式对比)</span>
                           </h3>
                           <p className="text-xs text-gray-400 mt-1">
                               自动模拟对比两种交易模式下的利润与税负差异。
                           </p>
                       </div>

                       <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                           <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">
                               <div className="py-2">主体 / 指标</div>
                               <div className={`py-2 bg-blue-50/50 ${config.retailerTradeMode === TradeMode.SALES ? 'text-blue-700 ring-2 ring-inset ring-blue-200' : 'text-blue-600'}`}>经销模式 (Sales)</div>
                               <div className={`py-2 bg-indigo-50/50 ${config.retailerTradeMode === TradeMode.CONSIGNMENT ? 'text-indigo-700 ring-2 ring-inset ring-indigo-200' : 'text-indigo-600'}`}>代销模式 (Consign)</div>
                           </div>
                           <div className="divide-y divide-gray-100">
                               
                               {/* Cangjing Section */}
                               <div className="bg-gray-50/30 px-2 py-1 text-[10px] font-bold text-gray-400 uppercase">藏境山水 (Platform)</div>
                               {comparisonData.cangjing.map((row, idx) => {
                                   const isSalesBetter = row.higherIsBetter ? row.sales > row.consign : row.sales < row.consign;
                                   const isConsignBetter = row.higherIsBetter ? row.consign > row.sales : row.consign < row.sales;
                                   const isEqual = Math.abs(row.sales - row.consign) < 0.01;

                                   return (
                                       <div key={idx} className="grid grid-cols-3 text-xs py-3 items-center hover:bg-gray-50">
                                           <div className="px-4 text-gray-600 font-medium">{row.label}</div>
                                           <div className={`px-4 text-center font-mono ${isEqual ? '' : (isSalesBetter ? 'text-green-600 font-bold' : 'text-gray-500')}`}>
                                               {formatMoney(row.sales)}
                                           </div>
                                           <div className={`px-4 text-center font-mono ${isEqual ? '' : (isConsignBetter ? 'text-green-600 font-bold' : 'text-gray-500')}`}>
                                               {formatMoney(row.consign)}
                                           </div>
                                       </div>
                                   )
                               })}

                               {/* Retailer Section */}
                               <div className="bg-gray-50/30 px-2 py-1 text-[10px] font-bold text-gray-400 uppercase border-t border-gray-100 mt-2">终端渠道 (Retailer)</div>
                               {comparisonData.retailer.map((row, idx) => {
                                   const isSalesBetter = row.higherIsBetter ? row.sales > row.consign : row.sales < row.consign;
                                   const isConsignBetter = row.higherIsBetter ? row.consign > row.sales : row.consign < row.sales;
                                   const isEqual = Math.abs(row.sales - row.consign) < 0.01;

                                   return (
                                       <div key={idx} className="grid grid-cols-3 text-xs py-3 items-center hover:bg-gray-50">
                                           <div className="px-4 text-gray-600 font-medium">{row.label}</div>
                                           <div className={`px-4 text-center font-mono ${isEqual ? '' : (isSalesBetter ? 'text-green-600 font-bold' : 'text-gray-500')}`}>
                                               {formatMoney(row.sales)}
                                           </div>
                                           <div className={`px-4 text-center font-mono ${isEqual ? '' : (isConsignBetter ? 'text-green-600 font-bold' : 'text-gray-500')}`}>
                                               {formatMoney(row.consign)}
                                           </div>
                                       </div>
                                   )
                               })}
                           </div>
                       </div>
                   </div>
               </div>
           )}

           {/* === TAB 3: COST STRUCTURE === */}
           {activeTab === 'structure' && (
               <div className="animate-fade-in">
                   <h3 className="text-lg font-bold text-gray-800 mb-6">成本利润结构分解 (Breakdown)</h3>
                   
                   {/* Stacked Bar */}
                   <div className="w-full h-12 flex rounded-xl overflow-hidden shadow-sm mb-8 ring-4 ring-gray-50">
                       {costStructure.map((item, idx) => {
                           const pct = (item.value / results.cangjing.outPriceInclTax) * 100;
                           return (
                               <div key={idx} style={{ width: `${pct}%` }} className={`bg-gradient-to-b ${item.color} relative group transition-all duration-300 hover:brightness-110`}>
                                    {pct > 5 && (
                                        <div className="absolute inset-0 flex items-center justify-center text-white/90 text-[10px] font-bold shadow-sm">
                                            {pct.toFixed(0)}%
                                        </div>
                                    )}
                               </div>
                           );
                       })}
                   </div>

                   {/* Legend Grid */}
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       {costStructure.map((item, idx) => (
                           <div key={idx} className="flex items-start p-3 rounded-lg border border-gray-100 hover:shadow-md transition-shadow bg-white">
                               <div className={`w-3 h-3 rounded-full mt-1 mr-3 ${item.bg}`}></div>
                               <div>
                                   <div className="text-xs text-gray-500 font-bold">{item.label}</div>
                                   <div className="text-lg font-mono font-bold text-gray-800 my-0.5">
                                       ¥{Math.round(item.value).toLocaleString()}
                                   </div>
                                   <div className="text-[10px] text-gray-400">{item.desc}</div>
                               </div>
                           </div>
                       ))}
                   </div>
                   
                   {/* Break-even Badge */}
                   <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                       盈亏平衡点估算：若售价降低 <span className="font-bold text-slate-800">{((results.cangjing.netProfit / results.cangjing.outPriceExclTax)*100).toFixed(1)}%</span>，业务将不在盈利。
                   </div>
               </div>
           )}

           {/* === TAB 4: SENSITIVITY (Heatmap) === */}
           {activeTab === 'sensitivity' && (
               <div className="animate-fade-in">
                   <div className="flex justify-between items-center mb-6">
                       <div>
                            <h3 className="text-lg font-bold text-gray-800">利润敏感性压力测试</h3>
                            <p className="text-xs text-gray-400">模拟单一变量波动对最终净利润的影响</p>
                       </div>
                       <select 
                            className="text-sm border-gray-200 rounded-lg bg-white shadow-sm py-2 px-3 focus:ring-indigo-500"
                            value={sensitivityParam}
                            onChange={(e) => setSensitivityParam(e.target.value)}
                          >
                              <option value="cangjingMarkup">调整: 平台加价率 (Platform Markup)</option>
                              <option value="funderMarkup">调整: 垫资成本</option>
                              <option value="paymentTerm">调整: 渠道账期</option>
                              <option value="funderInterest">调整: 资金利息</option>
                        </select>
                   </div>

                   <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                       <table className="w-full text-sm">
                           <thead>
                               <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                   <th className="py-3 px-4 text-left">情景 (Scenario)</th>
                                   <th className="py-3 px-4 text-center">模拟参数值</th>
                                   <th className="py-3 px-4 text-right">预估净利润</th>
                                   <th className="py-3 px-4 text-center">ROI</th>
                                   <th className="py-3 px-4 text-center">状态</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {sensitivityData.map((row, idx) => {
                                   const diff = row.profit - results.cangjing.netProfit;
                                   return (
                                       <tr key={idx} className={`${row.bgClass} transition-colors duration-200`}>
                                           <td className="py-3 px-4 font-medium">{row.label}</td>
                                           <td className="py-3 px-4 text-center font-mono opacity-80">{row.valDisplay}</td>
                                           <td className="py-3 px-4 text-right font-bold font-mono">
                                               ¥{Math.round(row.profit).toLocaleString()}
                                               {Math.abs(diff) > 1 && (
                                                   <span className={`block text-[10px] ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                       {diff > 0 ? '+' : ''}{Math.round(diff)}
                                                   </span>
                                               )}
                                           </td>
                                           <td className="py-3 px-4 text-center">
                                               <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/50 border border-black/5">
                                                   {row.roi.toFixed(1)}%
                                               </div>
                                           </td>
                                            <td className="py-3 px-4 text-center">
                                                {row.profit > 0 ? (
                                                    <span className="text-green-600 font-bold text-xs">盈利</span>
                                                ) : (
                                                    <span className="text-red-600 font-bold text-xs">亏损</span>
                                                )}
                                            </td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                   </div>
               </div>
           )}

           {/* === TAB 5: REVERSE CALCULATOR (Interactive) === */}
           {activeTab === 'reverse' && (
               <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                   
                   {/* Left: Controls */}
                   <div className="space-y-6">
                       <h3 className="text-lg font-bold text-gray-800">目标利润反推定价 (Targeting)</h3>
                       
                       <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                           <label className="block text-sm font-bold text-gray-700 mb-2">
                               期望净利润 (Net Profit)
                           </label>
                           <div className="flex items-center gap-4 mb-4">
                               <input 
                                  type="range" 
                                  min="0" 
                                  max={results.cangjing.netProfit * 3 || 1000} 
                                  step="10"
                                  value={targetProfit}
                                  onChange={(e) => setTargetProfit(Number(e.target.value))}
                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                               />
                           </div>
                           <div className="relative">
                               <input 
                                  type="number" 
                                  className="w-full text-3xl font-bold p-3 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-teal-800 bg-white"
                                  value={targetProfit}
                                  onChange={(e) => setTargetProfit(Number(e.target.value))}
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">CNY</span>
                           </div>
                       </div>
                       
                       <div className="text-xs text-gray-500 leading-relaxed">
                           <span className="font-bold">💡 逻辑说明：</span> 
                           此工具固定采购成本与资金费率，仅通过调整 <span className="text-teal-600 font-bold">终端售价</span> 来达成利润目标。适用于销售报价决策。
                       </div>
                   </div>

                   {/* Right: Results Card */}
                   <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-3 opacity-20">
                           <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/></svg>
                       </div>
                       
                       <div className="relative z-10">
                           <div className="text-teal-100 text-xs font-bold uppercase mb-1">建议报价 (Suggested MSRP)</div>
                           <div className="text-4xl font-mono font-bold mb-4">
                               ¥{Math.round(reverseCalc.suggestedIncl).toLocaleString()}
                           </div>
                           
                           <div className="space-y-3 border-t border-white/20 pt-4">
                               <div className="flex justify-between items-center">
                                   <span className="text-teal-100 text-xs">调整后加价率</span>
                                   <span className="font-bold font-mono text-lg">{reverseCalc.suggestedMarkup.toFixed(1)}%</span>
                               </div>
                               <div className="flex justify-between items-center text-teal-200 text-xs">
                                   <span>当前加价率</span>
                                   <span className="line-through">{reverseCalc.currentMarkup.toFixed(1)}%</span>
                               </div>
                               <div className="bg-white/20 rounded-lg p-2 text-center text-xs mt-2 backdrop-blur-sm">
                                   {(reverseCalc.suggestedIncl > results.cangjing.outPriceInclTax) ? (
                                       <span>需涨价 <span className="font-bold">+{((reverseCalc.suggestedIncl/results.cangjing.outPriceInclTax - 1)*100).toFixed(1)}%</span></span>
                                   ) : (
                                       <span>可降价 <span className="font-bold">{((1 - reverseCalc.suggestedIncl/results.cangjing.outPriceInclTax)*100).toFixed(1)}%</span></span>
                                   )}
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
           )}

       </div>
    </div>
  );
};
