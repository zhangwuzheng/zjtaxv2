
import React, { useState } from 'react';
import { CalculationConfig, Manufacturer, Funder, Retailer, TaxType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: CalculationConfig;
  onConfigChange: (updates: Partial<CalculationConfig>) => void;
  
  // Data Management Props
  manufacturers: Manufacturer[];
  funders: Funder[];
  retailers: Retailer[];
  
  onAddManufacturer: (name: string, taxType: TaxType) => void;
  onDeleteManufacturer: (id: string) => void;
  
  onAddProduct: (mfgId: string, name: string, price: number, msrp: number) => void;
  onDeleteProduct: (mfgId: string, prodId: string) => void;
  
  onAddFunder: (name: string, markup: number, term: number) => void;
  onDeleteFunder: (id: string) => void;
  
  onAddRetailer: (name: string, markup: number, term: number, taxType: TaxType) => void;
  onDeleteRetailer: (id: string) => void;
}

type Tab = 'general' | 'manufacturers' | 'funders' | 'retailers';

export const SettingsModal: React.FC<Props> = ({ 
  isOpen, onClose, config, onConfigChange,
  manufacturers, funders, retailers,
  onAddManufacturer, onDeleteManufacturer,
  onAddProduct, onDeleteProduct,
  onAddFunder, onDeleteFunder,
  onAddRetailer, onDeleteRetailer
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // Local state for forms
  const [newMfgName, setNewMfgName] = useState('');
  const [newMfgTax, setNewMfgTax] = useState(TaxType.GENERAL);
  
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<string>('');
  const [newProdMsrp, setNewProdMsrp] = useState<string>('');
  const [targetMfgId, setTargetMfgId] = useState<string>('');

  const [newFunderName, setNewFunderName] = useState('');
  const [newFunderMarkup, setNewFunderMarkup] = useState<string>('3');
  const [newFunderTerm, setNewFunderTerm] = useState<string>('6');

  const [newRetailerName, setNewRetailerName] = useState('');
  const [newRetailerMarkup, setNewRetailerMarkup] = useState<string>('20');
  const [newRetailerTerm, setNewRetailerTerm] = useState<string>('45');
  const [newRetailerTax, setNewRetailerTax] = useState(TaxType.GENERAL);

  if (!isOpen) return null;

  const handleAddMfg = () => {
    if (newMfgName.trim()) {
      onAddManufacturer(newMfgName, newMfgTax);
      setNewMfgName('');
    }
  };

  const handleAddProd = (mfgId: string) => {
    const price = Number(newProdPrice);
    const msrp = Number(newProdMsrp);
    if (newProdName.trim() && price > 0 && msrp > 0) {
      onAddProduct(mfgId, newProdName, price, msrp);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdMsrp('');
    }
  };

  const handleAddFunder = () => {
    if (newFunderName.trim()) {
      onAddFunder(newFunderName, Number(newFunderMarkup), Number(newFunderTerm));
      setNewFunderName('');
    }
  };

  const handleAddRetailer = () => {
    if (newRetailerName.trim()) {
      onAddRetailer(newRetailerName, Number(newRetailerMarkup), Number(newRetailerTerm), newRetailerTax);
      setNewRetailerName('');
    }
  };

  const TabButton = ({ id, label, icon }: { id: Tab, label: string, icon: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`px-4 py-3 text-sm font-bold flex items-center space-x-2 transition-colors
        ${activeTab === id ? 'bg-tibet-gold text-tibet-dark border-b-2 border-tibet-red' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-tibet-gold animate-fade-in">
        
        {/* Header */}
        <div className="bg-gray-800 flex justify-between items-center px-4 shrink-0">
          <div className="flex">
             <TabButton id="general" label="基础参数设置" icon="⚙️" />
             <TabButton id="manufacturers" label="厂商与商品管理" icon="🏭" />
             <TabButton id="funders" label="垫资方管理" icon="🏦" />
             <TabButton id="retailers" label="渠道方管理" icon="🏪" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white px-3 py-2 text-xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          
          {/* --- Tab: General Settings --- */}
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-sm font-bold text-tibet-dark uppercase tracking-wide mb-4 pb-2 border-b border-gray-100 flex items-center">
                    <span className="bg-blue-600 w-1 h-4 mr-2 rounded"></span> 通用税务参数默认值
                </h4>
                <div className="grid grid-cols-2 gap-8">
                    {/* Mainland Defaults */}
                    <div>
                        <div className="text-xs font-bold text-gray-500 mb-3 uppercase flex items-center">
                            <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                            内地主体 (Mainland)
                        </div>
                        <div className="space-y-4 bg-gray-50 p-4 rounded border border-gray-100">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">附加税率 (Surcharges)</label>
                              <div className="flex items-center space-x-2">
                                <input type="number" className="w-20 text-sm border-gray-200 rounded" 
                                    value={config.defaultMainlandSurcharge}
                                    onChange={(e) => onConfigChange({ defaultMainlandSurcharge: Number(e.target.value) })}
                                />
                                <span className="text-sm text-gray-600">%</span>
                              </div>
                              <p className="text-[9px] text-gray-400 mt-1">通常为增值税的 12% (城建7%+教育3%+地方2%)</p>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">所得税率 (Income Tax)</label>
                              <div className="flex items-center space-x-2">
                                <input type="number" className="w-20 text-sm border-gray-200 rounded" 
                                    value={config.defaultMainlandIncomeTax}
                                    onChange={(e) => onConfigChange({ defaultMainlandIncomeTax: Number(e.target.value) })}
                                />
                                <span className="text-sm text-gray-600">%</span>
                              </div>
                            </div>
                        </div>
                    </div>

                    {/* Tibet Defaults */}
                    <div>
                        <div className="text-xs font-bold text-tibet-red mb-3 uppercase flex items-center">
                             <span className="w-2 h-2 rounded-full bg-tibet-red mr-2"></span>
                             西藏主体 (Tibet)
                        </div>
                        <div className="space-y-4 bg-tibet-cream/20 p-4 rounded border border-tibet-gold/30">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">附加税率 (Surcharges)</label>
                              <div className="flex items-center space-x-2">
                                <input type="number" className="w-20 text-sm border-gray-200 rounded" 
                                    value={config.defaultTibetSurcharge}
                                    onChange={(e) => onConfigChange({ defaultTibetSurcharge: Number(e.target.value) })}
                                />
                                <span className="text-sm text-gray-600">%</span>
                              </div>
                              <p className="text-[9px] text-gray-400 mt-1">西藏优惠：通常减按增值税的 1% 左右征收</p>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">所得税率 (Income Tax)</label>
                              <div className="flex items-center space-x-2">
                                <input type="number" className="w-20 text-sm border-gray-200 rounded" 
                                    value={config.defaultTibetIncomeTax}
                                    onChange={(e) => onConfigChange({ defaultTibetIncomeTax: Number(e.target.value) })}
                                />
                                <span className="text-sm text-gray-600">%</span>
                              </div>
                              <p className="text-[9px] text-gray-400 mt-1">西藏普惠政策通常为 15% (甚至更低)</p>
                            </div>
                            <div className="border-t border-dashed border-gray-300 pt-3">
                                <label className="block text-[10px] text-gray-600 font-bold mb-2">默认税收返还 (Tax Refunds)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[9px] text-gray-400">增值税返还 %</label>
                                        <input type="number" className="w-full text-xs border-gray-200 rounded" 
                                            value={config.defaultTibetVatRefund || 0}
                                            onChange={(e) => onConfigChange({ defaultTibetVatRefund: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-gray-400">所得税返还 %</label>
                                        <input type="number" className="w-full text-xs border-gray-200 rounded" 
                                            value={config.defaultTibetIncomeTaxRefund || 0}
                                            onChange={(e) => onConfigChange({ defaultTibetIncomeTaxRefund: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1">返税比例为实缴税额的百分比 (模拟估算)</p>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
              
            </div>
          )}

          {/* --- Tab: Manufacturers --- */}
          {activeTab === 'manufacturers' && (
            <div className="space-y-6">
               {/* Add New Mfg */}
               <div className="bg-white p-4 rounded shadow-sm flex items-end space-x-2 border border-blue-100">
                  <div className="flex-1">
                     <label className="block text-xs font-bold text-gray-500 mb-1">新增厂商名称</label>
                     <input className="w-full text-sm border-gray-300 rounded" value={newMfgName} onChange={e => setNewMfgName(e.target.value)} placeholder="例如：那曲牧民合作社" />
                  </div>
                  <div className="w-40">
                     <label className="block text-xs font-bold text-gray-500 mb-1">纳税类型</label>
                     <select className="w-full text-sm border-gray-300 rounded" value={newMfgTax} onChange={e => setNewMfgTax(Number(e.target.value))}>
                        <option value={TaxType.GENERAL}>一般纳税人</option>
                        <option value={TaxType.SMALL}>小规模</option>
                     </select>
                  </div>
                  <button onClick={handleAddMfg} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 h-[38px]">添加厂商</button>
               </div>

               {/* List */}
               <div className="grid grid-cols-1 gap-4">
                  {manufacturers.map(mfg => (
                    <div key={mfg.id} className="bg-white rounded border border-gray-200 overflow-hidden">
                       <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b border-gray-200">
                          <div>
                             <span className="font-bold text-gray-800">{mfg.name}</span>
                             <span className="ml-2 text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                {mfg.taxType === TaxType.GENERAL ? '一般纳税人(13%)' : '小规模(1%)'}
                             </span>
                          </div>
                          <button onClick={() => onDeleteManufacturer(mfg.id)} className="text-red-500 text-xs hover:underline">删除厂商</button>
                       </div>
                       <div className="p-4">
                          <div className="space-y-2">
                             {mfg.products.map(prod => (
                                <div key={prod.id} className="flex justify-between items-center text-sm border-b border-dashed border-gray-100 pb-1 last:border-0">
                                   <div className="flex-1">
                                      <span className="text-gray-700">📦 {prod.name}</span>
                                      <span className="ml-2 text-[10px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">建议零售: ¥{prod.msrp}</span>
                                   </div>
                                   <div className="flex items-center space-x-4">
                                      <span className="font-mono text-gray-600">成本: ¥{prod.basePrice}</span>
                                      <button onClick={() => onDeleteProduct(mfg.id, prod.id)} className="text-gray-400 hover:text-red-500">&times;</button>
                                   </div>
                                </div>
                             ))}
                             {mfg.products.length === 0 && <div className="text-xs text-gray-400 italic">暂无商品</div>}
                          </div>
                          
                          {/* Add Product Inline */}
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-2">
                             <input 
                                className="flex-1 text-xs border-gray-200 rounded bg-gray-50" 
                                placeholder="新商品名称" 
                                value={targetMfgId === mfg.id ? newProdName : ''}
                                onChange={e => { setTargetMfgId(mfg.id); setNewProdName(e.target.value); }}
                                onFocus={() => setTargetMfgId(mfg.id)}
                             />
                             <input 
                                type="number"
                                className="w-16 text-xs border-gray-200 rounded bg-gray-50" 
                                placeholder="成本价" 
                                value={targetMfgId === mfg.id ? newProdPrice : ''}
                                onChange={e => { setTargetMfgId(mfg.id); setNewProdPrice(e.target.value); }}
                             />
                             <input 
                                type="number"
                                className="w-20 text-xs border-gray-200 rounded bg-blue-50" 
                                placeholder="建议零售" 
                                value={targetMfgId === mfg.id ? newProdMsrp : ''}
                                onChange={e => { setTargetMfgId(mfg.id); setNewProdMsrp(e.target.value); }}
                             />
                             <button 
                               onClick={() => handleAddProd(mfg.id)}
                               disabled={targetMfgId !== mfg.id}
                               className="text-xs bg-gray-200 text-gray-600 px-2 py-1.5 rounded hover:bg-blue-100 hover:text-blue-600"
                             >
                               + 添加商品
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* --- Tab: Funders --- */}
          {activeTab === 'funders' && (
             <div className="space-y-6">
               <div className="bg-white p-4 rounded shadow-sm flex items-end space-x-2 border border-orange-100">
                  <div className="flex-1">
                     <label className="block text-xs font-bold text-gray-500 mb-1">新增垫资方名称</label>
                     <input className="w-full text-sm border-gray-300 rounded" value={newFunderName} onChange={e => setNewFunderName(e.target.value)} placeholder="例如：某供应链公司" />
                  </div>
                  <div className="w-24">
                     <label className="block text-xs font-bold text-gray-500 mb-1">默认加价%</label>
                     <input type="number" className="w-full text-sm border-gray-300 rounded" value={newFunderMarkup} onChange={e => setNewFunderMarkup(e.target.value)} />
                  </div>
                   <div className="w-24">
                     <label className="block text-xs font-bold text-gray-500 mb-1">默认账期(月)</label>
                     <input type="number" className="w-full text-sm border-gray-300 rounded" value={newFunderTerm} onChange={e => setNewFunderTerm(e.target.value)} />
                  </div>
                  <button onClick={handleAddFunder} className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-600 h-[38px]">添加</button>
               </div>

                <div className="grid grid-cols-1 gap-3">
                  {funders.map(f => (
                     <div key={f.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                        <div>
                           <div className="font-bold text-gray-800">{f.name}</div>
                           <div className="text-xs text-gray-500">默认配置: 加价 {f.defaultMarkupPercent}% | 账期 {f.defaultPaymentTermMonths}个月</div>
                        </div>
                        <button onClick={() => onDeleteFunder(f.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
                     </div>
                  ))}
                </div>
             </div>
          )}

          {/* --- Tab: Retailers --- */}
          {activeTab === 'retailers' && (
             <div className="space-y-6">
               <div className="bg-white p-4 rounded shadow-sm border border-blue-100">
                  <div className="flex items-end space-x-2 mb-2">
                      <div className="flex-1">
                         <label className="block text-xs font-bold text-gray-500 mb-1">新增渠道名称</label>
                         <input className="w-full text-sm border-gray-300 rounded" value={newRetailerName} onChange={e => setNewRetailerName(e.target.value)} placeholder="例如：某直播选品" />
                      </div>
                      <div className="w-32">
                         <label className="block text-xs font-bold text-gray-500 mb-1">纳税类型</label>
                         <select className="w-full text-sm border-gray-300 rounded" value={newRetailerTax} onChange={e => setNewRetailerTax(Number(e.target.value))}>
                            <option value={TaxType.GENERAL}>一般纳税人</option>
                            <option value={TaxType.SMALL}>小规模</option>
                         </select>
                      </div>
                  </div>
                  <div className="flex items-end space-x-2">
                       <div className="w-24">
                         <label className="block text-xs font-bold text-gray-500 mb-1">默认加价%</label>
                         <input type="number" className="w-full text-sm border-gray-300 rounded" value={newRetailerMarkup} onChange={e => setNewRetailerMarkup(e.target.value)} />
                      </div>
                       <div className="w-24">
                         <label className="block text-xs font-bold text-gray-500 mb-1">默认回款(天)</label>
                         <input type="number" className="w-full text-sm border-gray-300 rounded" value={newRetailerTerm} onChange={e => setNewRetailerTerm(e.target.value)} />
                      </div>
                      <button onClick={handleAddRetailer} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 h-[38px]">添加</button>
                  </div>
               </div>

                <div className="grid grid-cols-1 gap-3">
                  {retailers.map(r => (
                     <div key={r.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                        <div>
                           <div className="font-bold text-gray-800 flex items-center">
                              {r.name}
                              <span className="ml-2 text-[10px] font-normal text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">
                                {r.defaultTaxType === TaxType.SMALL ? '小规模' : '一般纳税人'}
                              </span>
                           </div>
                           <div className="text-xs text-gray-500">默认配置: 加价 {r.defaultMarkupPercent}% | 回款 {r.defaultPaymentTermDays}天</div>
                        </div>
                        <button onClick={() => onDeleteRetailer(r.id)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
                     </div>
                  ))}
                </div>
             </div>
          )}

        </div>
        
        <div className="p-4 bg-white border-t border-gray-200 text-right flex justify-end">
           <button onClick={onClose} className="bg-gray-800 text-white px-6 py-2 rounded shadow hover:bg-gray-700 font-bold">完成设置</button>
        </div>
      </div>
    </div>
  );
};
