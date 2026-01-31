
import React from 'react';
import { CalculationConfig, TradeMode, TaxType, Region } from '../types';

interface Props {
  config: CalculationConfig;
}

export const PrintSummary: React.FC<Props> = ({ config }) => {
  return (
    <div className="hidden print:block mb-8 font-sans bg-white border border-gray-200 rounded p-6 shadow-none">
      <div className="flex justify-between items-end border-b-2 border-tibet-red pb-2 mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            1. 基础配置参数 (Configuration)
          </h2>
          <span className="text-xs text-gray-500">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
        {/* Left Column: Product & Source */}
        <div className="space-y-4">
            <section>
                <h3 className="font-bold text-tibet-dark bg-gray-50 px-2 py-1 rounded mb-2 border-l-4 border-tibet-gold text-xs uppercase tracking-wider">采购与商品 (Procurement)</h3>
                <table className="w-full text-xs text-left">
                    <thead>
                        <tr className="border-b border-gray-300 text-gray-500">
                            <th className="py-1 font-medium">商品名称</th>
                            <th className="py-1 font-medium">厂商</th>
                            <th className="text-right py-1 font-medium">数量</th>
                            <th className="text-right py-1 font-medium">基准价</th>
                        </tr>
                    </thead>
                    <tbody>
                        {config.packageItems.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                                <td className="py-1 text-gray-800">{item.product.name}</td>
                                <td className="py-1 text-gray-600">{item.manufacturer.name}</td>
                                <td className="text-right py-1 text-gray-800">{item.quantity}</td>
                                <td className="text-right py-1 font-mono">¥{item.product.basePrice.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50/50">
                         <tr>
                             <td colSpan={3} className="py-1 text-right font-bold text-gray-600">合计采购成本:</td>
                             <td className="py-1 text-right font-bold font-mono">
                                ¥{config.packageItems.reduce((a,b)=>a+(b.product.basePrice*b.quantity),0).toLocaleString()}
                             </td>
                         </tr>
                    </tfoot>
                </table>
            </section>

            <section>
                <h3 className="font-bold text-tibet-dark bg-gray-50 px-2 py-1 rounded mb-2 border-l-4 border-orange-500 text-xs uppercase tracking-wider">垫资方配置 (Funder)</h3>
                <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
                    <div className="text-gray-500">主体名称:</div> <div className="font-medium">{config.funder.name}</div>
                    <div className="text-gray-500">注册区域:</div> <div>{config.funderRegion === Region.TIBET ? '西藏 (Tibet)' : '内地 (Mainland)'}</div>
                    <div className="text-gray-500">加价率:</div> <div>{config.funderMarkupPercent}%</div>
                    <div className="text-gray-500">账期 (Payment):</div> <div>{config.funderPaymentTermMonths} 个月</div>
                    <div className="text-gray-500">资金利息:</div> <div>{config.funderInterestRate}% (年化)</div>
                    <div className="text-gray-500">物流成本:</div> <div>{config.funderLogisticsCostPercent}%</div>
                </div>
            </section>
        </div>

        {/* Right Column: Platform & Retailer */}
        <div className="space-y-4">
             <section>
                <h3 className="font-bold text-tibet-dark bg-gray-50 px-2 py-1 rounded mb-2 border-l-4 border-tibet-red text-xs uppercase tracking-wider">藏境山水 (Platform)</h3>
                <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
                    <div className="text-gray-500">纳税身份:</div> <div className="font-medium">{config.cangjingTaxType === TaxType.GENERAL ? '一般纳税人 (13%)' : '小规模纳税人 (1%)'}</div>
                    <div className="text-gray-500">注册区域:</div> <div>{config.cangjingRegion === Region.TIBET ? '西藏 (Tibet)' : '内地 (Mainland)'}</div>
                    <div className="text-gray-500">平台加价率:</div> <div>{config.cangjingMarkupPercent}%</div>
                    <div className="text-gray-500">中间贸易商:</div> <div>{config.hasIntermediary ? '启用 (Yes)' : '未启用 (No)'}</div>
                    <div className="text-gray-500">物流成本:</div> <div>{config.cangjingLogisticsCostPercent}%</div>
                </div>
            </section>

            <section>
                <h3 className="font-bold text-tibet-dark bg-gray-50 px-2 py-1 rounded mb-2 border-l-4 border-blue-500 text-xs uppercase tracking-wider">终端渠道 (Retailer)</h3>
                 <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
                    <div className="text-gray-500">渠道名称:</div> <div className="font-medium">{config.retailer.name}</div>
                    <div className="text-gray-500">交易模式:</div> <div className="font-bold text-blue-800">{config.retailerTradeMode === TradeMode.CONSIGNMENT ? '委托代销 (Consignment)' : '经销买卖 (Sales)'}</div>
                    <div className="text-gray-500">{config.retailerTradeMode === TradeMode.CONSIGNMENT ? '佣金率' : '渠道加价'}:</div> <div>{config.retailerMarkupPercent}%</div>
                    <div className="text-gray-500">回款周期:</div> <div>{config.retailerPaymentTermDays} 天</div>
                </div>
            </section>
            
            <section className="bg-yellow-50 border border-yellow-100 p-2 rounded text-xs text-yellow-800 mt-4">
                <strong>注:</strong> 报表中的“利润”为预估净利润，已扣除预估税金、资金利息和运营成本。实际执行中可能因银行利率波动、发票合规度等因素产生差异。
            </section>
        </div>
      </div>
    </div>
  );
};
