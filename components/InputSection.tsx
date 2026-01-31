
import React, { useState } from 'react';
import { Manufacturer, Product, Funder, Retailer, CalculationConfig, TaxType, PackageItem, Region, TradeMode } from '../types';

interface Props {
  config: CalculationConfig;
  manufacturers: Manufacturer[];
  funders: Funder[];
  retailers: Retailer[];
  onConfigChange: (updates: Partial<CalculationConfig>) => void;
}

export const InputSection: React.FC<Props> = ({ config, manufacturers, funders, retailers, onConfigChange }) => {
  // Local state for Package Builder
  const [selectedMfgId, setSelectedMfgId] = useState<string>(manufacturers.length > 0 ? manufacturers[0].id : '');
  const [selectedProdId, setSelectedProdId] = useState<string>('');
  const [qty, setQty] = useState<number>(1);

  // Helper to get current selection objects
  const currentMfg = manufacturers.find(m => m.id === selectedMfgId);
  const currentProd = currentMfg?.products.find(p => p.id === selectedProdId);

  // Auto-set tax rates based on Region using Global Settings
  const updateRegion = (entity: 'funder' | 'cangjing' | 'trader' | 'retailer', region: Region) => {
      const surcharge = region === Region.TIBET ? config.defaultTibetSurcharge : config.defaultMainlandSurcharge;
      const income = region === Region.TIBET ? config.defaultTibetIncomeTax : config.defaultMainlandIncomeTax;
      
      const vatRefund = region === Region.TIBET ? (config.defaultTibetVatRefund || 0) : 0;
      const incomeRefund = region === Region.TIBET ? (config.defaultTibetIncomeTaxRefund || 0) : 0;

      const updates: any = {};
      
      if (entity === 'funder') {
          updates.funderRegion = region;
          updates.funderVatSurchargeRate = surcharge;
          updates.funderIncomeTaxRate = income;
          updates.funderVatRefundRate = vatRefund;
          updates.funderIncomeTaxRefundRate = incomeRefund;
      } else if (entity === 'cangjing') {
          updates.cangjingRegion = region;
          updates.cangjingVatSurchargeRate = surcharge;
          updates.cangjingIncomeTaxRate = income;
          updates.cangjingVatRefundRate = vatRefund;
          updates.cangjingIncomeTaxRefundRate = incomeRefund;
      } else if (entity === 'trader') {
          updates.traderRegion = region;
          updates.traderVatSurchargeRate = surcharge;
          updates.traderIncomeTaxRate = income;
      } else if (entity === 'retailer') {
          updates.retailerRegion = region;
          updates.retailerVatSurchargeRate = surcharge;
          updates.retailerIncomeTaxRate = income;
      }
      onConfigChange(updates);
  };

  // Helper for Cost Package updates
  const updateCostStructure = (key: keyof typeof config.cangjingCostStructure, value: number) => {
      onConfigChange({
          cangjingCostStructure: {
              ...config.cangjingCostStructure,
              [key]: value
          }
      });
  };

  // Initialize selected product when manufacturer changes
  const handleMfgSelection = (mfgId: string) => {
    setSelectedMfgId(mfgId);
    const mfg = manufacturers.find(m => m.id === mfgId);
    if (mfg && mfg.products.length > 0) {
      setSelectedProdId(mfg.products[0].id);
    } else {
      setSelectedProdId('');
    }
  };

  const addToPackage = () => {
    if (currentMfg && currentProd) {
      const newItem: PackageItem = {
        id: `item-${Date.now()}`,
        manufacturer: currentMfg,
        product: currentProd,
        quantity: qty
      };
      onConfigChange({ packageItems: [...config.packageItems, newItem] });
    }
  };

  const removeFromPackage = (itemId: string) => {
    onConfigChange({ packageItems: config.packageItems.filter(i => i.id !== itemId) });
  };

  const totalPackagePrice = config.packageItems.reduce((acc, item) => acc + (item.product.basePrice * item.quantity), 0);
  const totalPackageMsrp = config.packageItems.reduce((acc, item) => acc + (item.product.msrp * item.quantity), 0);

  const gridColsClass = config.hasIntermediary 
    ? "grid-cols-1 md:grid-cols-5" 
    : "grid-cols-1 md:grid-cols-4";

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden print:hidden transition-all duration-300">
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <span className="bg-tibet-red text-white w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">1</span>
          方案配置 (Configuration)
        </h2>
        
        <div className="flex items-center space-x-6">
            {/* Income Tax Toggle */}
            <label className="flex items-center cursor-pointer select-none">
                <div className="relative">
                    <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={config.includeIncomeTax}
                        onChange={(e) => onConfigChange({ includeIncomeTax: e.target.checked })}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${config.includeIncomeTax ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.includeIncomeTax ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-2 text-xs font-bold text-gray-600">
                   计算企业所得税
                </div>
            </label>
        
          <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                采购成本: ¥{totalPackagePrice.toLocaleString()}
              </div>
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                建议零售: ¥{totalPackageMsrp.toLocaleString()}
              </div>
          </div>
        </div>
      </div>
      
      <div className={`p-6 grid ${gridColsClass} gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100`}>
        
        {/* 1. Procurement Package */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-tibet-red font-semibold text-sm uppercase tracking-wider">
             <div className="flex items-center space-x-2">
                <span>采购包 (Procurement)</span>
             </div>
             <span className="text-[9px] bg-tibet-cream text-tibet-dark px-1.5 rounded border border-tibet-gold">西藏源头</span>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
             {/* Manufacturer Select */}
             <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">选择厂商</label>
                <select 
                  className="w-full text-xs border-gray-300 rounded focus:ring-tibet-red"
                  value={selectedMfgId}
                  onChange={(e) => handleMfgSelection(e.target.value)}
                >
                  {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
             </div>

             {/* Product Select */}
             <div>
                 <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">选择商品</label>
                 <select 
                    className="w-full text-xs border-gray-300 rounded focus:ring-tibet-red"
                    value={selectedProdId}
                    onChange={(e) => setSelectedProdId(e.target.value)}
                    disabled={!currentMfg || currentMfg.products.length === 0}
                 >
                    {!currentMfg?.products.length && <option>无商品</option>}
                    {currentMfg?.products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} (进:¥{p.basePrice} / 售:¥{p.msrp})
                        </option>
                    ))}
                 </select>
             </div>

             {/* Quantity & Add */}
             <div className="flex space-x-2">
                <div className="flex-1">
                   <label className="block text-[10px] text-gray-500 mb-1">数量</label>
                   <input type="number" min="1" className="w-full text-xs border-gray-300 rounded" value={qty} onChange={e => setQty(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                   <button 
                     onClick={addToPackage}
                     disabled={!selectedProdId}
                     className="bg-tibet-red text-white text-xs px-3 py-2 rounded hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed h-[34px]"
                   >
                     添加
                   </button>
                </div>
             </div>
          </div>
           {/* List */}
           <div className="border border-gray-200 rounded-lg overflow-hidden">
             <div className="max-h-[100px] overflow-y-auto divide-y divide-gray-100">
               {config.packageItems.map(item => (
                 <div key={item.id} className="p-2 text-xs flex justify-between items-center">
                    <div className="flex-1 truncate">{item.product.name} x{item.quantity}</div>
                    <button onClick={() => removeFromPackage(item.id)} className="text-red-400">&times;</button>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* 2. Funder */}
        <div className="space-y-4 md:pl-6 pt-4 md:pt-0">
           <div className="flex items-center justify-between space-x-2 text-orange-600 font-semibold text-sm uppercase tracking-wider">
             <span>垫资方 (一级)</span>
             <select 
               className="text-[10px] border-orange-200 rounded text-orange-700 bg-orange-50 focus:ring-0"
               value={config.funderRegion}
               onChange={(e) => updateRegion('funder', e.target.value as Region)}
             >
                <option value={Region.MAINLAND}>内地</option>
                <option value={Region.TIBET}>西藏</option>
             </select>
          </div>

          <div>
            <select 
              className="w-full text-sm border-gray-300 rounded-md mb-2"
              value={config.funder.id}
              onChange={(e) => {
                const f = funders.find(x => x.id === e.target.value);
                if (f) onConfigChange({ funder: f, funderMarkupPercent: f.defaultMarkupPercent, funderPaymentTermMonths: f.defaultPaymentTermMonths });
              }}
            >
              {funders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3 mb-2">
               <div>
                 <label className="block text-[10px] text-gray-500 font-bold">加价 %</label>
                 <input type="number" className="w-full text-sm border-gray-300 rounded" value={config.funderMarkupPercent} onChange={(e) => onConfigChange({ funderMarkupPercent: Number(e.target.value) })}/>
               </div>
               <div>
                 <label className="block text-[10px] text-gray-500 font-bold">账期 (月)</label>
                 <input type="number" className="w-full text-sm border-gray-300 rounded" value={config.funderPaymentTermMonths} onChange={(e) => onConfigChange({ funderPaymentTermMonths: Number(e.target.value) })}/>
               </div>
            </div>
            <div>
                 <label className="block text-[10px] text-gray-500 font-bold">资金利息 (年化%)</label>
                 <input 
                   type="number" step="0.1"
                   className="w-full text-sm border-gray-300 rounded text-orange-700 font-semibold" 
                   value={config.funderInterestRate} 
                   onChange={(e) => onConfigChange({ funderInterestRate: Number(e.target.value) })}
                 />
            </div>
            <div className="mt-2">
                 <label className="block text-[10px] text-gray-500 font-bold">物流/仓储成本 (%)</label>
                 <input 
                   type="number" step="0.1"
                   className="w-full text-sm border-gray-300 rounded" 
                   value={config.funderLogisticsCostPercent} 
                   onChange={(e) => onConfigChange({ funderLogisticsCostPercent: Number(e.target.value) })}
                 />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
             <div className="grid grid-cols-2 gap-2 mb-1">
                 <div>
                    <label className="block text-[9px] text-gray-400">附加税 %</label>
                    <input type="number" className="w-full text-xs border-gray-200 rounded" value={config.funderVatSurchargeRate} onChange={e=>onConfigChange({funderVatSurchargeRate: Number(e.target.value)})}/>
                 </div>
                 {config.includeIncomeTax && (
                 <div>
                    <label className="block text-[9px] text-gray-400">所得税 %</label>
                    <input type="number" className="w-full text-xs border-gray-200 rounded" value={config.funderIncomeTaxRate} onChange={e=>onConfigChange({funderIncomeTaxRate: Number(e.target.value)})}/>
                 </div>
                 )}
             </div>
             {config.funderRegion === Region.TIBET && (
                 <div className="grid grid-cols-2 gap-2 bg-orange-50 p-1 rounded border border-orange-100 mt-1">
                     <div>
                        <label className="block text-[8px] text-orange-500 font-bold">增值税返还 %</label>
                        <input type="number" className="w-full text-xs border-orange-200 rounded" value={config.funderVatRefundRate || 0} onChange={e=>onConfigChange({funderVatRefundRate: Number(e.target.value)})}/>
                     </div>
                     {config.includeIncomeTax && (
                     <div>
                        <label className="block text-[8px] text-orange-500 font-bold">所得税返还 %</label>
                        <input type="number" className="w-full text-xs border-orange-200 rounded" value={config.funderIncomeTaxRefundRate || 0} onChange={e=>onConfigChange({funderIncomeTaxRefundRate: Number(e.target.value)})}/>
                     </div>
                     )}
                 </div>
             )}
          </div>
        </div>

        {/* 3. Cangjing */}
        <div className="space-y-4 md:pl-6 pt-4 md:pt-0">
          <div className="flex items-center justify-between space-x-2 text-yellow-600 font-semibold text-sm uppercase tracking-wider">
             <span>藏境山水</span>
             <select 
               className="text-[10px] border-yellow-200 rounded text-yellow-700 bg-yellow-50 focus:ring-0"
               value={config.cangjingRegion}
               onChange={(e) => updateRegion('cangjing', e.target.value as Region)}
             >
                <option value={Region.MAINLAND}>内地</option>
                <option value={Region.TIBET}>西藏</option>
             </select>
          </div>
          
          <div>
            <select 
              className="w-full text-xs border-yellow-300 rounded bg-yellow-50 mb-2"
              value={config.cangjingTaxType}
              onChange={(e) => onConfigChange({ cangjingTaxType: Number(e.target.value) })}
            >
                <option value={TaxType.GENERAL}>一般纳税人 (13%)</option>
                <option value={TaxType.SMALL}>小规模纳税人 (1%)</option>
            </select>
             <div className="grid grid-cols-2 gap-2 mb-2">
                 <div>
                    <label className="block text-[10px] text-gray-500 font-bold">平台加价 %</label>
                    <input type="number" className="w-full text-sm border-gray-300 rounded" value={config.cangjingMarkupPercent} onChange={(e) => onConfigChange({ cangjingMarkupPercent: Number(e.target.value) })}/>
                 </div>
                 <div>
                    <label className="block text-[10px] text-gray-500 font-bold">资金成本 (%)</label>
                    <input 
                        type="number" step="0.1"
                        className="w-full text-sm border-gray-300 rounded" 
                        value={config.cangjingInterestRate} 
                        onChange={(e) => onConfigChange({ cangjingInterestRate: Number(e.target.value) })}
                    />
                </div>
             </div>
             
             {/* New Cost Package Grid */}
             <div className="bg-yellow-50/50 p-2 rounded border border-yellow-100">
                 <div className="text-[10px] font-bold text-yellow-800 mb-2 flex items-center justify-between">
                     <span>📦 综合费用包 (Cost Pkg)</span>
                     <span className="text-[9px] bg-white px-1 rounded border border-yellow-200">
                         Total: {(config.cangjingCostStructure.warehousing + config.cangjingCostStructure.logistics + config.cangjingCostStructure.management + config.cangjingCostStructure.other).toFixed(1)}%
                     </span>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[9px] text-gray-500">仓储费 %</label>
                        <input 
                            type="number" step="0.1" className="w-full text-xs border-gray-200 rounded" 
                            value={config.cangjingCostStructure.warehousing}
                            onChange={(e) => updateCostStructure('warehousing', Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] text-gray-500">物流费 %</label>
                        <input 
                            type="number" step="0.1" className="w-full text-xs border-gray-200 rounded" 
                            value={config.cangjingCostStructure.logistics}
                            onChange={(e) => updateCostStructure('logistics', Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] text-gray-500">管理费 %</label>
                        <input 
                            type="number" step="0.1" className="w-full text-xs border-gray-200 rounded" 
                            value={config.cangjingCostStructure.management}
                            onChange={(e) => updateCostStructure('management', Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] text-gray-500">其他 %</label>
                        <input 
                            type="number" step="0.1" className="w-full text-xs border-gray-200 rounded" 
                            value={config.cangjingCostStructure.other}
                            onChange={(e) => updateCostStructure('other', Number(e.target.value))}
                        />
                    </div>
                 </div>
             </div>
          </div>

          <div className="pt-2 border-t border-gray-100 relative mt-2">
             <div className="absolute right-0 top-[-10px]">
                 <label className="flex items-center space-x-1 cursor-pointer bg-white px-1">
                    <input 
                      type="checkbox" 
                      className="form-checkbox h-3 w-3 text-purple-600"
                      checked={config.hasIntermediary}
                      onChange={(e) => onConfigChange({ hasIntermediary: e.target.checked })}
                    />
                    <span className="text-[9px] text-purple-600 font-bold">增加贸易商 →</span>
                 </label>
             </div>
             <div className="grid grid-cols-2 gap-2 mt-2 mb-1">
                 <div>
                    <label className="block text-[9px] text-gray-400">附加税 %</label>
                    <input type="number" className="w-full text-xs border-gray-200 rounded" value={config.cangjingVatSurchargeRate} onChange={e=>onConfigChange({cangjingVatSurchargeRate: Number(e.target.value)})}/>
                 </div>
                 {config.includeIncomeTax && (
                 <div>
                    <label className="block text-[9px] text-gray-400">所得税 %</label>
                    <input type="number" className="w-full text-xs border-gray-200 rounded" value={config.cangjingIncomeTaxRate} onChange={e=>onConfigChange({cangjingIncomeTaxRate: Number(e.target.value)})}/>
                 </div>
                 )}
             </div>
             {config.cangjingRegion === Region.TIBET && (
                 <div className="grid grid-cols-2 gap-2 bg-yellow-50 p-1 rounded border border-yellow-200 mt-1">
                     <div>
                        <label className="block text-[8px] text-yellow-700 font-bold">增值税返还 %</label>
                        <input type="number" className="w-full text-xs border-yellow-100 rounded" value={config.cangjingVatRefundRate || 0} onChange={e=>onConfigChange({cangjingVatRefundRate: Number(e.target.value)})}/>
                     </div>
                     {config.includeIncomeTax && (
                     <div>
                        <label className="block text-[8px] text-yellow-700 font-bold">所得税返还 %</label>
                        <input type="number" className="w-full text-xs border-yellow-100 rounded" value={config.cangjingIncomeTaxRefundRate || 0} onChange={e=>onConfigChange({cangjingIncomeTaxRefundRate: Number(e.target.value)})}/>
                     </div>
                     )}
                 </div>
             )}
          </div>
        </div>

        {/* 3.5 Intermediary (Conditional) */}
        {config.hasIntermediary && (
            <div className="space-y-4 md:pl-6 pt-4 md:pt-0 bg-purple-50/50 rounded-lg border border-purple-100 p-2 animate-fade-in">
              <div className="flex items-center justify-between space-x-2 text-purple-600 font-semibold text-sm uppercase tracking-wider">
                <span>贸易商</span>
                <select 
                  className="text-[10px] border-purple-200 rounded text-purple-700 bg-purple-50 focus:ring-0"
                  value={config.traderRegion}
                  onChange={(e) => updateRegion('trader', e.target.value as Region)}
                >
                    <option value={Region.MAINLAND}>内地</option>
                    <option value={Region.TIBET}>西藏</option>
                </select>
              </div>

              <div>
                 <select 
                    className="w-full text-xs border-purple-300 rounded bg-white mb-2"
                    value={config.traderTaxType}
                    onChange={(e) => onConfigChange({ traderTaxType: Number(e.target.value) })}
                  >
                      <option value={TaxType.GENERAL}>一般纳税人</option>
                      <option value={TaxType.SMALL}>小规模</option>
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-[10px] text-gray-500 font-bold">加价 %</label>
                        <input type="number" className="w-full text-sm border-gray-300 rounded" value={config.traderMarkupPercent} onChange={(e) => onConfigChange({ traderMarkupPercent: Number(e.target.value) })}/>
                     </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold">账期 (天)</label>
                        <input type="number" className="w-full text-sm border-gray-300 rounded" value={config.traderPaymentTermDays} onChange={(e) => onConfigChange({ traderPaymentTermDays: Number(e.target.value) })}/>
                     </div>
                  </div>
              </div>
              <div className="pt-2 border-t border-purple-100">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[9px] text-gray-400">附加税 %</label>
                        <input type="number" className="w-full text-xs border-purple-200 rounded" value={config.traderVatSurchargeRate} onChange={e=>onConfigChange({traderVatSurchargeRate: Number(e.target.value)})}/>
                    </div>
                     {config.includeIncomeTax && (
                     <div>
                        <label className="block text-[9px] text-gray-400">所得税 %</label>
                        <input type="number" className="w-full text-xs border-purple-200 rounded" value={config.traderIncomeTaxRate} onChange={e=>onConfigChange({traderIncomeTaxRate: Number(e.target.value)})}/>
                     </div>
                     )}
                </div>
              </div>
            </div>
        )}

        {/* 4. Retailer */}
        <div className="space-y-4 md:pl-6 pt-4 md:pt-0">
           <div className="flex items-center justify-between space-x-2 text-blue-600 font-semibold text-sm uppercase tracking-wider">
             <span>终端渠道</span>
             <select 
               className="text-[10px] border-blue-200 rounded text-blue-700 bg-blue-50 focus:ring-0"
               value={config.retailerRegion}
               onChange={(e) => updateRegion('retailer', e.target.value as Region)}
             >
                <option value={Region.MAINLAND}>内地</option>
                <option value={Region.TIBET}>西藏</option>
             </select>
          </div>

           <div>
            <select 
              className="w-full text-sm border-gray-300 rounded-md mb-2"
              value={config.retailer.id}
              onChange={(e) => {
                const r = retailers.find(x => x.id === e.target.value);
                if (r) onConfigChange({ 
                    retailer: r, 
                    retailerMarkupPercent: r.defaultMarkupPercent, 
                    retailerPaymentTermDays: r.defaultPaymentTermDays,
                    retailerTaxType: r.defaultTaxType || TaxType.GENERAL // Default to general if undefined
                });
              }}
            >
              {retailers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            
            <select 
                className="w-full text-xs border-blue-300 rounded bg-blue-50 mb-2"
                value={config.retailerTaxType}
                onChange={(e) => onConfigChange({ retailerTaxType: Number(e.target.value) })}
            >
                <option value={TaxType.GENERAL}>一般纳税人 (13%)</option>
                <option value={TaxType.SMALL}>小规模 (1%)</option>
            </select>

            <select 
                  className="w-full text-xs border-blue-300 rounded bg-blue-50 mb-2"
                  value={config.retailerTradeMode}
                  onChange={(e) => onConfigChange({ retailerTradeMode: e.target.value as TradeMode })}
              >
                  <option value={TradeMode.SALES}>经销买卖</option>
                  <option value={TradeMode.CONSIGNMENT}>委托代销</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="block text-[10px] text-gray-500 font-bold">{config.retailerTradeMode === TradeMode.SALES ? '加价 %' : '佣金 %'}</label>
                   <input type="number" className="w-full text-sm border-gray-300 rounded" value={config.retailerMarkupPercent} onChange={(e) => onConfigChange({ retailerMarkupPercent: Number(e.target.value) })}/>
                </div>
                 <div>
                   <label className="block text-[10px] text-gray-500 font-bold">回款 (天)</label>
                   <input type="number" className="w-full text-sm border-gray-300 rounded" value={config.retailerPaymentTermDays} onChange={(e) => onConfigChange({ retailerPaymentTermDays: Number(e.target.value) })}/>
                </div>
              </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
             <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="block text-[9px] text-gray-400">附加税 %</label>
                    <input type="number" className="w-full text-xs border-gray-200 rounded" value={config.retailerVatSurchargeRate} onChange={e=>onConfigChange({retailerVatSurchargeRate: Number(e.target.value)})}/>
                 </div>
                 {config.includeIncomeTax && (
                 <div>
                    <label className="block text-[9px] text-gray-400">所得税 %</label>
                    <input type="number" className="w-full text-xs border-gray-200 rounded" value={config.retailerIncomeTaxRate} onChange={e=>onConfigChange({retailerIncomeTaxRate: Number(e.target.value)})}/>
                 </div>
                 )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
