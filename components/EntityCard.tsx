
import React, { useState } from 'react';
import { EntityResult, Region, TradeMode, TaxType } from '../types';

interface Props {
  data: EntityResult;
  isProfitWarning?: boolean;
  showIncomeTax?: boolean;
}

export const EntityCard: React.FC<Props> = ({ data, isProfitWarning, showIncomeTax = false }) => {
  const [showLogic, setShowLogic] = useState(false);
  const [showContract, setShowContract] = useState(false); // New state for contract details
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const formatNumber = (val: number) => 
    new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const formatUnit = (val: number) => 
    new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);

  // Determine tax rate label for display
  const getTaxLabel = () => {
     if (data.notes.some(n => n.includes('一般'))) return '13%';
     if (data.notes.some(n => n.includes('小规模'))) return '1%';
     return '';
  };

  const totalTaxesPaid = data.vatPayable + data.surcharges + data.incomeTax;
  
  // Consignment Logic Check
  const isConsignmentRetailer = data.role.includes('终端') && data.tradeMode === TradeMode.CONSIGNMENT;

  return (
    <div className={`rounded-xl shadow-sm border ${isProfitWarning ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow relative group`}>
      
      {/* Warning Badges */}
      {data.warnings && data.warnings.length > 0 && (
          <div className="absolute top-0 right-0 p-1 flex flex-col items-end gap-1 z-10">
              {data.warnings.map((w, idx) => (
                  <span key={idx} className="text-[10px] bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded shadow-sm font-bold animate-pulse">
                      {w}
                  </span>
              ))}
          </div>
      )}

      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 relative">
        <div className="flex justify-between items-start mb-2">
             <div>
                <h3 className="font-bold text-lg text-gray-800">{data.name}</h3>
                <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">{data.role}</p>
                    <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded">{getTaxLabel()}</span>
                </div>
             </div>
             <div className="flex flex-col items-end gap-1 mt-4 md:mt-0">
                 <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${data.region === Region.TIBET ? 'bg-tibet-red text-white border-tibet-red' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {data.region === Region.TIBET ? '西藏主体' : '内地主体'}
                 </span>
                 {isConsignmentRetailer && (
                     <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                         代销模式 (Consignment)
                     </span>
                 )}
             </div>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-grow">
        
        {/* Core Financials */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold">
                    {isConsignmentRetailer ? '协助销售额 (GMV)' : '含税销售收入 (Revenue)'}
                </div>
                <div className="text-lg font-bold text-indigo-900 font-mono leading-none">
                    {formatNumber(data.outPriceInclTax)}
                </div>
                {isConsignmentRetailer ? (
                   <div className="text-[9px] text-orange-600 font-bold">
                       实际服务收入: {formatNumber(data.grossProfit)}
                   </div>
                ) : (
                   <div className="text-[9px] text-gray-400">
                      不含税: {formatNumber(data.outPriceExclTax)}
                   </div>
                )}
            </div>
            <div className="space-y-1 text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold">
                    {isConsignmentRetailer ? '应收佣金 (Commission)' : '含税采购成本 (Cost)'}
                </div>
                <div className="text-lg font-bold text-gray-600 font-mono leading-none">
                    {isConsignmentRetailer 
                      ? formatNumber(data.grossProfit * (1 + (data.notes.some(n=>n.includes('一般')) ? 0.06 : 0.01))) 
                      : formatNumber(data.inPriceInclTax)
                    }
                </div>
                <div className="text-[9px] text-gray-400">
                    {isConsignmentRetailer ? '平台支付服务费 (含税)' : (data.vatInput > 0 ? `进项税: ${formatNumber(data.vatInput)}` : '进项不可抵')}
                </div>
            </div>
        </div>

        {/* Consignment Special Badges */}
        {isConsignmentRetailer && (
            <div className="flex gap-2 text-[9px]">
                <div className="flex-1 bg-gray-100 p-1.5 rounded border border-gray-200 text-gray-600 text-center">
                    📦 货权: 平台所有 <br/> (零库存)
                </div>
                <div className="flex-1 bg-red-50 p-1.5 rounded border border-red-100 text-red-700 text-center font-bold">
                    🧾 发票: 禁开 <br/> (消费者直连平台)
                </div>
            </div>
        )}

        {/* Expenses Summary */}
        <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100 flex justify-between items-center text-xs">
            <div className="text-gray-600">
                <div className="font-bold">期间费用</div>
                <div className="scale-90 origin-left text-gray-400">
                    {data.commissionCost && data.commissionCost > 0 ? '资金+运营+佣金' : '资金+运营'}
                </div>
            </div>
            <div className="text-right">
                <div className="font-bold text-orange-700">-{formatNumber(data.financeCost + data.operationalCost + (data.commissionCost || 0))}</div>
            </div>
        </div>

        {/* Taxes Summary */}
        <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex justify-between items-center text-xs">
            <div className="text-gray-600">
                <div className="font-bold">实缴税金</div>
                <div className="scale-90 origin-left text-gray-400">
                   {showIncomeTax ? '增值+附加+所得' : '增值+附加'}
                </div>
            </div>
            <div className="text-right">
                <div className="font-bold text-blue-700">
                    -{formatNumber(totalTaxesPaid)} 
                </div>
                {data.taxRefunds > 0 && <div className="text-[9px] text-green-600">+税收返还: {formatNumber(data.taxRefunds)}</div>}
            </div>
        </div>

        {/* Sales Contract Details Toggle */}
        <div className="border-t border-dashed border-gray-200 pt-2">
            <button 
                onClick={() => setShowContract(!showContract)}
                className="w-full flex items-center justify-between text-[10px] text-gray-500 hover:text-indigo-600 transition-colors py-1 group"
            >
                <span className="font-bold flex items-center gap-1">
                    📄 销售合同明细 <span className="text-[9px] font-normal bg-gray-100 px-1 rounded text-gray-400 group-hover:text-indigo-500">含税</span>
                </span>
                <span className={`transform transition-transform ${showContract ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showContract && (
                <div className="mt-2 bg-slate-50 rounded border border-slate-100 p-2 animate-fade-in shadow-inner">
                    <div className="flex justify-between text-[8px] text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                        <span>Item Details</span>
                        <span>Subtotal</span>
                    </div>
                    
                    <div className="space-y-1.5">
                        {data.priceBreakdown.map((item, i) => (
                            <div key={i} className="flex justify-between items-start text-[9px] font-mono leading-tight">
                                <div className="flex flex-col">
                                    <span className="text-slate-700 font-medium truncate max-w-[120px]">{item.productName}</span>
                                    <span className="text-[8px] text-slate-400">
                                        {formatUnit(item.unitPriceInclTax)} × {item.quantity}
                                    </span>
                                </div>
                                <div className="font-bold text-slate-600">
                                    {formatNumber(item.totalPriceInclTax)}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-2 pt-1 border-t border-dashed border-slate-300 flex justify-between items-baseline">
                        <span className="text-[8px] text-slate-500 font-medium">TOTAL (INCL. TAX)</span>
                        <span className="text-[10px] font-bold text-slate-800 font-mono">{formatNumber(data.outPriceInclTax)}</span>
                    </div>
                </div>
            )}
        </div>
        
        {/* Toggle Logic View */}
        <button 
            onClick={() => setShowLogic(!showLogic)}
            className="w-full text-[10px] text-center text-gray-400 hover:text-indigo-600 pt-2 flex items-center justify-center gap-1 transition-colors mt-auto"
        >
            <span>{showLogic ? '收起利润计算逻辑' : '查看利润计算逻辑'}</span>
            <span className={`transform transition-transform ${showLogic ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Profit Waterfall Logic (Visible on Toggle) */}
        {showLogic && (
            <div className="bg-gray-50 p-2 rounded border border-gray-200 text-[10px] font-mono space-y-1 animate-fade-in">
                <div className="flex justify-between items-center text-gray-500">
                    <span>(+) {isConsignmentRetailer ? '实际服务收入' : '含税销售收入'}</span>
                    <span>{formatNumber(isConsignmentRetailer ? data.grossProfit : data.outPriceInclTax)}</span>
                </div>
                {!isConsignmentRetailer && (
                    <div className="flex justify-between items-center text-gray-500">
                        <span>(-) 含税采购成本</span>
                        <span>{formatNumber(data.inPriceInclTax)}</span>
                    </div>
                )}
                
                <div className="flex justify-between items-center text-blue-600 font-bold bg-blue-50 px-1 rounded">
                    <span>(-) 应缴增值税</span>
                    <span>{formatNumber(data.vatPayable)}</span>
                </div>
                <div className="pl-2 text-[9px] text-gray-400 flex justify-between">
                    <span>↳ 销项税额</span>
                    <span>{formatNumber(data.vatOutput)}</span>
                </div>
                <div className="pl-2 text-[9px] text-gray-400 flex justify-between border-b border-gray-200 pb-1 mb-1">
                    <span>↳ 进项抵扣</span>
                    <span>{formatNumber(data.vatInput)}</span>
                </div>

                <div className="flex justify-between items-center text-gray-500">
                    <span>(-) 附加税</span>
                    <span>{formatNumber(data.surcharges)}</span>
                </div>
                
                <div className="flex justify-between items-center text-orange-600">
                    <span>(-) 资金与运营费</span>
                    <span>{formatNumber(data.financeCost + data.operationalCost)}</span>
                </div>
                
                {data.commissionCost && data.commissionCost > 0 && (
                    <div className="flex justify-between items-center text-indigo-600 font-bold bg-indigo-50 px-1 rounded">
                        <span>(-) 代销佣金支出</span>
                        <span>{formatNumber(data.commissionCost)}</span>
                    </div>
                )}
                
                {showIncomeTax && (
                    <div className="flex justify-between items-center text-gray-500">
                        <span>(-) 企业所得税</span>
                        <span>{formatNumber(data.incomeTax)}</span>
                    </div>
                )}

                {data.taxRefunds > 0 && (
                    <div className="flex justify-between items-center text-green-600 font-bold">
                        <span>(+) 税收返还</span>
                        <span>{formatNumber(data.taxRefunds)}</span>
                    </div>
                )}
                <div className="border-t-2 border-gray-300 pt-1 mt-1 flex justify-between items-center font-bold text-xs text-indigo-900">
                    <span>(=) 净利润 {showIncomeTax ? '(税后)' : '(税前)'}</span>
                    <span>{formatNumber(data.netProfit)}</span>
                </div>
            </div>
        )}

      </div>

      {/* Footer: Net Profit */}
      <div className={`px-4 py-3 border-t ${isProfitWarning ? 'bg-red-100' : 'bg-gray-100'}`}>
        <div className="flex justify-between items-center">
            <div className="flex flex-col">
                 <div className="text-xs text-gray-500">净利润 (Net Profit)</div>
                 <div className="text-[9px] text-gray-400 transform scale-90 origin-left">
                    {showIncomeTax ? '已扣除所得税' : '未扣除所得税'}
                 </div>
            </div>
            <div className={`text-xl font-bold ${data.netProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(data.netProfit)}
            </div>
        </div>
        {data.netProfit < 0 && (
            <div className="mt-1 text-[10px] text-red-600 font-bold">⚠️ 亏损预警</div>
        )}
      </div>
    </div>
  );
};
