
import React from 'react';
import { SimulationResult, CalculationConfig, TradeMode, TaxType } from '../types';

interface Props {
  results: SimulationResult;
  config: CalculationConfig;
}

export const FlowVisualizer: React.FC<Props> = ({ results, config }) => {
  const formatMoney = (val: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(val);
  
  // --- Styles for Flow Animation ---
  const FlowStyles = () => (
    <style>{`
      @keyframes marchRight {
        0% { background-position: 0 0; }
        100% { background-position: 12px 0; }
      }
      @keyframes marchLeft {
        0% { background-position: 0 0; }
        100% { background-position: -12px 0; }
      }
      .flow-line-base {
        height: 2px;
        width: 100%;
        position: absolute;
        top: 50%;
        margin-top: -1px;
      }
      .animate-flow-r {
        background: repeating-linear-gradient(90deg, currentColor 0, currentColor 4px, transparent 4px, transparent 8px);
        background-size: 12px 2px;
        animation: marchRight 1s linear infinite;
      }
      .animate-flow-l {
        background: repeating-linear-gradient(90deg, currentColor 0, currentColor 4px, transparent 4px, transparent 8px);
        background-size: 12px 2px;
        animation: marchLeft 1s linear infinite;
      }
      .line-solid {
        background: currentColor;
      }
    `}</style>
  );

  // --- Icons & Helpers ---
  const icons = {
      goods: (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      invoice: (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      funds: (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  };

  // --- Components ---

  const EntityNode = ({ data, icon, color, subLabel, isCenter, isConsumer }: any) => (
    <div className={`flex flex-col items-center z-10 shrink-0 ${isCenter ? 'w-40 scale-105' : 'w-32'}`}>
      <div className={`relative rounded-2xl shadow-lg flex items-center justify-center ${color} text-white ring-4 ring-white transition-transform hover:scale-105 ${isCenter ? 'w-16 h-16 text-3xl' : 'w-12 h-12 text-2xl'}`}>
        {icon}
        {isCenter && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">核心</span>
        )}
      </div>
      <div className={`mt-3 text-center bg-white/95 backdrop-blur border rounded-lg px-3 py-2 w-full shadow-sm ${isCenter ? 'border-tibet-gold shadow-md' : 'border-gray-200'}`}>
        <div className="font-bold text-gray-800 text-xs truncate">{data.name}</div>
        <div className="text-[10px] text-gray-500 mb-1">{subLabel}</div>
        {!isConsumer && (
            <div className="border-t border-gray-100 pt-1 mt-1">
                <div className="text-[9px] text-gray-400 uppercase">含税交易额</div>
                <div className="font-mono font-bold text-tibet-red text-xs">{formatMoney(data.outPriceInclTax)}</div>
            </div>
        )}
      </div>
    </div>
  );

  const ArrowLine = ({ label, sub, direction, colorClass, iconType, warning, labelColor, dashed, animated }: any) => {
     // Determine animation class
     let animClass = 'line-solid';
     if (animated || dashed) {
         if (direction === 'right') animClass = 'animate-flow-r';
         if (direction === 'left') animClass = 'animate-flow-l';
     }

     // Extract Text Color for gradient
     const textColor = colorClass.replace('bg-', 'text-').replace('border-', 'text-').split(' ')[0] || 'text-gray-400';

     return (
         <div className={`relative w-full h-8 flex items-center justify-center group ${textColor}`}>
             {/* Line */}
             <div className={`flow-line-base ${animClass} ${warning ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity`}></div>
             
             {/* Arrow Heads */}
             {direction === 'right' && (
                 <svg className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3`} viewBox="0 0 10 10" fill="currentColor">
                     <path d="M0,0 L10,5 L0,10 L2,5 Z" />
                 </svg>
             )}
             {direction === 'left' && (
                 <svg className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3`} viewBox="0 0 10 10" fill="currentColor">
                     <path d="M10,0 L0,5 L10,10 L8,5 Z" />
                 </svg>
             )}

             {/* Label Badge */}
             <div className={`relative z-10 px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 bg-white ${warning ? 'border-red-200 bg-red-50' : 'border-gray-200'} transition-transform group-hover:scale-105`}>
                {iconType && <span className={warning ? 'text-red-500' : (labelColor || 'text-gray-400')}>{icons[iconType]}</span>}
                <div className="flex flex-col items-start leading-none">
                    <span className={`text-[9px] font-bold ${warning ? 'text-red-700' : (labelColor || 'text-gray-700')}`}>{label}</span>
                    {sub && <span className="text-[8px] text-gray-400 mt-0.5 scale-90 origin-left">{sub}</span>}
                </div>
             </div>
         </div>
     );
  };

  const ConnectionBlock = ({ goods, invoice, funds, directInvoice }: any) => (
    <div className="flex-1 min-w-[180px] px-2 flex flex-col justify-center gap-4 py-2 opacity-90 hover:opacity-100 transition-opacity">
       {/* 1. Goods Flow */}
       {goods && (
           <ArrowLine 
              label={goods.label} sub={goods.sub}
              direction="right" 
              colorClass="text-gray-400" 
              iconType="goods"
           />
       )}
       
       {/* 2. Invoice Flow Container */}
       {(invoice || directInvoice) && (
           <div className="flex flex-col gap-2">
                {invoice && (
                    <ArrowLine 
                        label={invoice.label} sub={invoice.sub}
                        direction={invoice.dir} 
                        colorClass="text-orange-400" 
                        iconType="invoice"
                        labelColor="text-orange-600"
                        dashed={true}
                    />
                )}
                
                {directInvoice && (
                    <ArrowLine 
                        label={directInvoice.label} 
                        sub={directInvoice.sub}
                        direction={directInvoice.dir || "right"} 
                        colorClass="text-indigo-400"
                        labelColor="text-indigo-600"
                        dashed={true}
                    />
                )}
           </div>
       )}

       {/* 3. Funds Flow */}
       {funds && (
           <ArrowLine 
              label={funds.label} sub={funds.sub}
              direction={funds.dir} 
              colorClass="text-green-500" 
              iconType="funds"
              warning={funds.warning}
              labelColor="text-green-700"
              animated={true} // Funds always animated
           />
       )}
    </div>
  );

  // --- Logic to Build Flow ---
  
  // Dynamic Invoice Info Logic
  const getInvoiceInfo = (sourceEntity: any, targetEntity: any, isConsignment = false) => {
      // Case 1: Consignment (Commission Invoice: Retailer -> Platform)
      if (isConsignment) {
          // Retailer is Source of service invoice
          const isRetailerGeneral = targetEntity.notes.some((n:string) => n.includes('一般'));
          
          return { 
              main: {
                  label: isRetailerGeneral ? '6% 服务费专票' : '1% 服务费专票', 
                  dir: 'left', // Retailer -> Platform
                  sub: '渠道 → 平台 (佣金)' 
              }
              // Direct invoice is handled at the last leg (Retailer -> Consumer)
          };
      }

      // Case 2: Standard Sales
      const isSourceGeneral = sourceEntity.notes.some((n:string) => n.includes('一般'));
      const isSourceSmall = sourceEntity.notes.some((n:string) => n.includes('小规模'));
      const isTargetGeneral = targetEntity.notes.some((n:string) => n.includes('一般'));
      
      let label = '普票';
      if (isSourceGeneral) {
          label = '13% 增值税专票';
      } else if (isSourceSmall) {
          label = isTargetGeneral ? '1% 增值税专票' : '1% 增值税普/专';
      }

      return { 
          main: {
              label: label, 
              dir: 'right', 
              sub: '货款结算'
          }
      };
  };

  const sequence = [];

  // 1. Manufacturer
  sequence.push({
      type: 'node', id: 'mfg',
      component: <EntityNode data={results.manufacturer} icon="🏭" color="bg-gray-600" subLabel="源头工厂" />
  });

  // Link: Mfg -> Funder
  const inv1 = getInvoiceInfo(results.manufacturer, results.funder);
  sequence.push({
      type: 'conn', id: 'c1',
      component: <ConnectionBlock 
         goods={{ label: '现货交付', sub: '物流运输' }}
         invoice={inv1.main}
         funds={{ label: '现结 (T+0)', dir: 'left', sub: '银行转账' }}
      />
  });

  // 2. Funder
  sequence.push({
      type: 'node', id: 'funder',
      component: <EntityNode data={results.funder} icon="🏦" color="bg-orange-500" subLabel="一级垫资" />
  });

  // Link: Funder -> Cangjing
  const inv2 = getInvoiceInfo(results.funder, results.cangjing);
  sequence.push({
      type: 'conn', id: 'c2',
      component: <ConnectionBlock 
         goods={{ label: '货权转移', sub: '虚拟入库/直发' }}
         invoice={inv2.main}
         funds={{ label: `${config.funderPaymentTermMonths}个月 账期`, dir: 'left', sub: '商业承兑/赊销', warning: true }}
      />
  });

  // 3. Cangjing
  sequence.push({
      type: 'node', id: 'cangjing',
      component: <EntityNode data={results.cangjing} icon="🏔️" color="bg-tibet-gold" subLabel="藏境平台" isCenter={true} />
  });

  let lastEntity = results.cangjing;

  // Optional: Trader
  if (config.hasIntermediary && results.trader) {
      const inv3 = getInvoiceInfo(results.cangjing, results.trader);
      sequence.push({
          type: 'conn', id: 'c3',
          component: <ConnectionBlock 
             goods={{ label: '货权调拨', sub: '库内划转' }}
             invoice={inv3.main}
             funds={{ label: config.traderPaymentTermDays > 0 ? `${config.traderPaymentTermDays}天 账期` : '现结', dir: 'left' }}
          />
      });
      sequence.push({
          type: 'node', id: 'trader',
          component: <EntityNode data={results.trader} icon="🚢" color="bg-purple-500" subLabel="中间贸易商" />
      });
      lastEntity = results.trader;
  }

  // Link: Last -> Retailer
  const isConsignment = config.retailerTradeMode === TradeMode.CONSIGNMENT;
  
  // Platform -> Retailer Funds Flow Logic:
  // Sales: Retailer pays Platform (Left)
  // Consignment: Platform pays Retailer Commission (Right)
  
  const fundsLabel = isConsignment ? '支付佣金' : `${config.retailerPaymentTermDays}天 回款`;
  const fundsSub = isConsignment ? `T+${config.retailerPaymentTermDays} 结算` : '全额结算';
  const fundsDir = isConsignment ? 'right' : 'left';
  
  const inv4 = getInvoiceInfo(lastEntity, results.retailer, isConsignment);

  sequence.push({
      type: 'conn', id: 'c4',
      component: <ConnectionBlock 
         goods={{ label: '终端交付', sub: isConsignment ? '货权保留/铺货' : '买断销售' }}
         invoice={inv4.main}
         funds={{ label: fundsLabel, dir: fundsDir, sub: fundsSub }}
      />
  });

  // 4. Retailer
  sequence.push({
      type: 'node', id: 'retailer',
      component: <EntityNode data={results.retailer} icon="🏪" color="bg-blue-600" subLabel="终端渠道" />
  });

  // Link: Retailer -> Consumer (NEW)
  // Consignment: 
  //   - Goods: Retailer -> Consumer
  //   - Invoice: Platform -> Consumer (Visualized here as flow from 'system' or right direction)
  //   - Funds: Consumer -> Platform (Direct)
  
  // Sales:
  //   - Goods: Retailer -> Consumer
  //   - Invoice: Retailer -> Consumer
  //   - Funds: Consumer -> Retailer

  const consumerInv = isConsignment 
      ? { label: '平台直开票', sub: '藏境 → 消费者', dir: 'right' } 
      : { label: '零售发票', sub: '渠道 → 消费者', dir: 'right' };

  const consumerFunds = isConsignment
      ? { label: '平台直收款', sub: '消费者 → 藏境', dir: 'left', warning: true }
      : { label: '零售收款', sub: '消费者 → 渠道', dir: 'left' };

  sequence.push({
      type: 'conn', id: 'c5',
      component: <ConnectionBlock 
         goods={{ label: '最终交付', sub: '商品/服务' }}
         directInvoice={consumerInv}
         funds={consumerFunds}
      />
  });

  // 5. Consumer Node
  sequence.push({
      type: 'node', id: 'consumer',
      component: <EntityNode data={{name: '终端消费者', outPriceInclTax: 0}} icon="👤" color="bg-teal-600" subLabel="C端/B端用户" isConsumer={true} />
  });

  return (
    <div className="mt-8 mb-8 p-8 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 overflow-x-auto print:shadow-none print:border-none print:p-0">
       <FlowStyles />
       
       {/* Legend */}
       <div className="flex justify-center gap-6 mb-8 text-[10px] text-gray-500 bg-white/50 py-2 rounded-full w-max mx-auto px-6 border border-gray-100">
          <div className="flex items-center font-bold text-gray-600"><span className="w-8 h-px bg-gray-400 mr-2 flex items-center justify-center relative"><span className="absolute -top-1.5 left-1/2 -translate-x-1/2">📦</span></span> 实物/货权流 (Forward)</div>
          <div className="flex items-center font-bold text-orange-600"><span className="w-8 h-px border-t-2 border-dashed border-orange-400 mr-2 flex items-center justify-center relative"><span className="absolute -top-1.5 left-1/2 -translate-x-1/2">🧾</span></span> 发票流 (Tax Chain)</div>
          <div className="flex items-center font-bold text-green-600"><span className="w-8 h-px border-t-2 border-dotted border-green-500 mr-2 flex items-center justify-center relative"><span className="absolute -top-1.5 left-1/2 -translate-x-1/2">💰</span></span> 资金流 (Cash Flow)</div>
       </div>

       {/* Flow Chart */}
       <div className="min-w-[1000px] flex items-center justify-between mx-auto max-w-7xl px-4">
          {sequence.map((item) => (
            <React.Fragment key={item.id}>
              {item.component}
            </React.Fragment>
          ))}
       </div>
    </div>
  );
};
