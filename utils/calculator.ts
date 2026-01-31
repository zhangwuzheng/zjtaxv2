
import { CalculationConfig, SimulationResult, EntityResult, TaxType, ProductPriceDetail, TradeMode, Region } from '../types';

export const calculateSimulation = (config: CalculationConfig): SimulationResult => {
  const {
    packageItems,
    includeIncomeTax,
    funder, 
    retailer, 
    
    // Global Rates
    funderInterestRate,
    cangjingInterestRate,
    
    // Funder
    funderRegion,
    funderMarkupPercent,
    funderPaymentTermMonths,
    funderVatSurchargeRate,
    funderIncomeTaxRate,
    funderVatRefundRate = 0,
    funderIncomeTaxRefundRate = 0,
    funderLogisticsCostPercent = 0, 

    // Cangjing
    cangjingRegion,
    cangjingMarkupPercent,
    cangjingTaxType,
    cangjingVatSurchargeRate,
    cangjingIncomeTaxRate,
    cangjingVatRefundRate = 0,
    cangjingIncomeTaxRefundRate = 0,
    cangjingCostStructure, // New Cost Package

    // Trader
    hasIntermediary,
    traderRegion,
    traderTaxType,
    traderMarkupPercent,
    traderVatSurchargeRate,
    traderIncomeTaxRate,

    // Retailer
    retailerRegion,
    retailerTradeMode,
    retailerTaxType, 
    retailerMarkupPercent,
    retailerPaymentTermDays,
    retailerVatSurchargeRate,
    retailerIncomeTaxRate,
  } = config;

  // Rate helpers
  const funderMonthlyRate = funderInterestRate / 100 / 12;
  const cangjingDailyRate = cangjingInterestRate / 100 / 365;

  // Calculate Total MSRP of the Package
  const totalPackageMsrp = packageItems.reduce((acc, item) => acc + (item.product.msrp * item.quantity), 0);

  // --- 1. Manufacturer (Aggregate Source) ---
  let totalMfgPriceExcl = 0;
  let totalMfgPriceIncl = 0;
  let totalMfgVatOutput = 0;
  const mfgBreakdown: ProductPriceDetail[] = [];

  packageItems.forEach(item => {
    const unitPriceIncl = item.product.basePrice;
    const unitPriceExcl = unitPriceIncl / (1 + item.manufacturer.taxType);
    const lineTotalIncl = unitPriceIncl * item.quantity;
    const lineTotalExcl = unitPriceExcl * item.quantity;
    const lineVat = lineTotalIncl - lineTotalExcl;

    totalMfgPriceExcl += lineTotalExcl;
    totalMfgPriceIncl += lineTotalIncl;
    totalMfgVatOutput += lineVat;

    mfgBreakdown.push({
        productName: item.product.name,
        quantity: item.quantity,
        unitPriceInclTax: unitPriceIncl,
        totalPriceInclTax: lineTotalIncl
    });
  });

  const isSingleSource = packageItems.length === 1;
  const sourceName = isSingleSource ? packageItems[0].manufacturer.name : `采购包 (${packageItems.length}种商品)`;
  const mfgResult: EntityResult = {
    id: 'source-aggregate',
    name: sourceName,
    role: '源头供应 (Source)',
    region: Region.TIBET,
    inPriceExclTax: 0,
    inPriceInclTax: 0,
    outPriceExclTax: totalMfgPriceExcl,
    outPriceInclTax: totalMfgPriceIncl,
    vatInput: 0,
    vatOutput: totalMfgVatOutput,
    vatPayable: totalMfgVatOutput, 
    surcharges: 0,
    incomeTax: 0,
    taxRefunds: 0,
    financeCost: 0,
    operationalCost: 0,
    commissionCost: 0,
    grossProfit: totalMfgPriceExcl, 
    netProfit: totalMfgPriceExcl,
    cashOutflow: 0,
    taxBurdenRate: totalMfgPriceExcl > 0 ? (totalMfgVatOutput / totalMfgPriceExcl) : 0,
    notes: isSingleSource ? [packageItems[0].manufacturer.taxType === TaxType.GENERAL ? '一般纳税人' : '小规模'] : ['多厂商混合'],
    warnings: [],
    priceBreakdown: mfgBreakdown
  };

  // --- 2. Funder (Chenming) ---
  const cmInputVat = totalMfgVatOutput; 
  const cmMarkupRate = funderMarkupPercent / 100;
  
  const cmPriceExcl = totalMfgPriceExcl * (1 + cmMarkupRate);
  const cmTaxRate = 0.13; 
  const cmOutputVat = cmPriceExcl * cmTaxRate;
  const cmPriceIncl = cmPriceExcl * (1 + cmTaxRate);
  
  const funderBreakdown: ProductPriceDetail[] = mfgBreakdown.map(item => {
    const pkgItem = packageItems.find(p => p.product.name === item.productName);
    const mfgTaxRate = pkgItem ? pkgItem.manufacturer.taxType : 0.13;
    const mfgUnitExcl = item.unitPriceInclTax / (1 + mfgTaxRate);
    const cmUnitExcl = mfgUnitExcl * (1 + cmMarkupRate);
    const cmUnitIncl = cmUnitExcl * (1 + cmTaxRate);
    
    return {
        productName: item.productName,
        quantity: item.quantity,
        unitPriceInclTax: cmUnitIncl,
        totalPriceInclTax: cmUnitIncl * item.quantity
    };
  });

  const cmVatPayable = Math.max(0, cmOutputVat - cmInputVat);
  const cmSurcharges = cmVatPayable * (funderVatSurchargeRate / 100);
  const cmFinanceCost = totalMfgPriceIncl * funderMonthlyRate * funderPaymentTermMonths;
  
  // Calculate Funder Logistics Cost
  const cmLogisticsCost = cmPriceExcl * (funderLogisticsCostPercent / 100);
  const cmOperationalCost = cmLogisticsCost;

  const cmGrossProfit = cmPriceExcl - totalMfgPriceExcl;
  const cmPreTaxProfit = cmGrossProfit - cmSurcharges - cmFinanceCost - cmOperationalCost;
  
  // Refunds Calculation (VAT Refund is usually taxable income)
  const cmVatRefund = cmVatPayable * (funderVatRefundRate / 100);
  
  // Income Tax (Conditional)
  // Taxable Base = PreTax Profit + VAT Refunds (Subsidies)
  const cmTaxableBase = cmPreTaxProfit + cmVatRefund;
  const cmIncomeTax = includeIncomeTax ? Math.max(0, cmTaxableBase * (funderIncomeTaxRate / 100)) : 0;

  const cmIncomeTaxRefund = includeIncomeTax ? (cmIncomeTax * (funderIncomeTaxRefundRate / 100)) : 0;
  const cmTotalRefunds = cmVatRefund + cmIncomeTaxRefund;

  const cmNetProfit = cmPreTaxProfit - cmIncomeTax + cmTotalRefunds;

  const funderNotes = ['一般纳税人 (13%)', `垫资: ${funderPaymentTermMonths}月`];
  if (cmTotalRefunds > 0) funderNotes.push('含税收返还');
  if (cmOperationalCost > 0) funderNotes.push('含物流仓储');

  const funderResult: EntityResult = {
    id: funder.id,
    name: funder.name,
    role: '垫资/一级经销',
    region: funderRegion,
    inPriceExclTax: totalMfgPriceExcl,
    inPriceInclTax: totalMfgPriceIncl,
    outPriceExclTax: cmPriceExcl,
    outPriceInclTax: cmPriceIncl,
    vatInput: cmInputVat,
    vatOutput: cmOutputVat,
    vatPayable: cmVatPayable,
    surcharges: cmSurcharges,
    incomeTax: cmIncomeTax,
    taxRefunds: cmTotalRefunds,
    financeCost: cmFinanceCost,
    operationalCost: cmOperationalCost,
    commissionCost: 0,
    grossProfit: cmGrossProfit,
    netProfit: cmNetProfit,
    cashOutflow: totalMfgPriceIncl,
    taxBurdenRate: cmPriceExcl > 0 ? ((cmVatPayable + cmSurcharges + cmIncomeTax - cmTotalRefunds) / cmPriceExcl) : 0,
    notes: funderNotes,
    warnings: [],
    priceBreakdown: funderBreakdown
  };

  // --- 3. Cangjing (Central Node) ---
  const cjWarnings: string[] = [];
  const cjTips: string[] = [];
  let cjCostBase: number; 
  let cjInputVat: number;

  if (cangjingTaxType === TaxType.GENERAL) {
    cjCostBase = cmPriceExcl; 
    cjInputVat = cmOutputVat; 
  } else {
    // Small Scale cannot deduct input
    cjCostBase = cmPriceIncl;
    cjInputVat = 0;
  }

  const cjMarkupRate = cangjingMarkupPercent / 100;
  const cjPriceExcl = cjCostBase * (1 + cjMarkupRate); 
  const cjTaxRate = cangjingTaxType; 
  
  let cjOutputVat = cjPriceExcl * cjTaxRate;
  let cjPriceIncl = cjPriceExcl * (1 + cjTaxRate);

  if (cangjingTaxType === TaxType.GENERAL) {
     const effectiveInputRate = cjInputVat / cjCostBase;
     const effectiveOutputRate = cjTaxRate;
     
     if (effectiveOutputRate - effectiveInputRate > 0.05) {
         cjWarnings.push('⚠️ 进销项税率差过大，税负极高');
     }
  }

  const downstreamMode = hasIntermediary ? TradeMode.SALES : retailerTradeMode;
  
  if (downstreamMode === TradeMode.CONSIGNMENT) {
      cjTips.push("【开票时点】代销模式下，纳税义务发生时间为收到代销清单之日。");
  } else {
      cjTips.push(`【开票时点】赊销模式下，纳税义务发生时间为书面合同约定的付款日期。`);
  }

  if (cangjingRegion === Region.TIBET) {
      cjTips.push("【西藏合规】必须确保“实质性运营”。");
  }

  const cjBreakdown: ProductPriceDetail[] = funderBreakdown.map(item => {
    const cmUnitIncl = item.unitPriceInclTax;
    const cmUnitExcl = cmUnitIncl / 1.13;
    let unitCostBase = (cangjingTaxType === TaxType.GENERAL) ? cmUnitExcl : cmUnitIncl;
    const cjUnitExcl = unitCostBase * (1 + cjMarkupRate);
    const cjUnitIncl = cjUnitExcl * (1 + cjTaxRate);
    return {
        productName: item.productName,
        quantity: item.quantity,
        unitPriceInclTax: cjUnitIncl,
        totalPriceInclTax: cjUnitIncl * item.quantity
    };
  });

  // --- 4. Intermediary (Optional) ---
  let supplierToRetailerPriceExcl = cjPriceExcl;
  let supplierToRetailerPriceIncl = cjPriceIncl;
  let supplierToRetailerOutputVat = cjOutputVat;
  let supplierToRetailerTaxType = cjTaxRate;
  let traderResult: EntityResult | undefined;
  let traderBreakdown: ProductPriceDetail[] = [];

  if (hasIntermediary) {
      let trInputVat = 0;
      let trCostBase = 0;
      let trWarnings: string[] = [];

      if (traderTaxType === TaxType.GENERAL && cangjingTaxType !== TaxType.SMALL) {
          trInputVat = cjOutputVat;
          trCostBase = cjPriceExcl;
      } else if (traderTaxType === TaxType.GENERAL && cangjingTaxType === TaxType.SMALL) {
          trInputVat = cjOutputVat; // 1%
          trCostBase = cjPriceExcl;
          trWarnings.push('⚠️ 进项不足 (上游为小规模)');
      } else {
          trInputVat = 0;
          trCostBase = cjPriceIncl;
      }

      const trMarkupRate = traderMarkupPercent / 100;
      const trPriceExcl = trCostBase * (1 + trMarkupRate);
      const trTaxRate = traderTaxType;
      const trOutputVat = trPriceExcl * trTaxRate;
      const trPriceIncl = trPriceExcl * (1 + trTaxRate);

      const trVatPayable = Math.max(0, trOutputVat - trInputVat);
      const trSurcharges = trVatPayable * (traderVatSurchargeRate / 100);
      const trGrossProfit = trPriceExcl - trCostBase;
      const trPreTaxProfit = trGrossProfit - trSurcharges; 
      
      const trIncomeTax = includeIncomeTax ? Math.max(0, trPreTaxProfit * (traderIncomeTaxRate / 100)) : 0;
      const trNetProfit = trPreTaxProfit - trIncomeTax;

      traderBreakdown = cjBreakdown.map(item => {
          const prevIncl = item.unitPriceInclTax;
          let uCost = (traderTaxType === TaxType.GENERAL && cangjingTaxType !== TaxType.SMALL) 
            ? prevIncl / (1 + cangjingTaxType) 
            : prevIncl;
          
          const uExcl = uCost * (1 + trMarkupRate);
          const uIncl = uExcl * (1 + trTaxRate);
          return {
              productName: item.productName,
              quantity: item.quantity,
              unitPriceInclTax: uIncl,
              totalPriceInclTax: uIncl * item.quantity
          }
      });

      traderResult = {
          id: 'trader',
          name: '中间贸易商',
          role: '渠道商 (Distributor)',
          region: traderRegion,
          inPriceExclTax: cjPriceExcl,
          inPriceInclTax: cjPriceIncl,
          outPriceExclTax: trPriceExcl,
          outPriceInclTax: trPriceIncl,
          vatInput: trInputVat,
          vatOutput: trOutputVat,
          vatPayable: trVatPayable,
          surcharges: trSurcharges,
          incomeTax: trIncomeTax,
          taxRefunds: 0,
          financeCost: 0,
          operationalCost: 0,
          commissionCost: 0,
          grossProfit: trGrossProfit,
          netProfit: trNetProfit,
          cashOutflow: 0,
          taxBurdenRate: trPriceExcl > 0 ? ((trVatPayable + trSurcharges + trIncomeTax) / trPriceExcl) : 0,
          notes: [traderTaxType === TaxType.GENERAL ? '一般纳税人' : '小规模'],
          warnings: trWarnings,
          priceBreakdown: traderBreakdown
      };

      supplierToRetailerPriceExcl = trPriceExcl;
      supplierToRetailerPriceIncl = trPriceIncl;
      supplierToRetailerOutputVat = trOutputVat;
      supplierToRetailerTaxType = trTaxRate;
  }

  // --- 5. Retailer ---
  const dsMarkupRate = retailerMarkupPercent / 100;
  
  let dsPriceExcl: number;
  let dsPriceIncl: number;
  let dsOutputVat: number;
  let dsInputVat: number;
  let dsGrossProfit: number;
  let dsWarnings: string[] = [];
  
  const supplierBreakdown = hasIntermediary ? traderBreakdown : cjBreakdown;
  const dsBreakdown: ProductPriceDetail[] = [];
  
  // Commission Logic
  let commissionExpense = 0;
  let commissionInputVat = 0; // The VAT on the commission invoice that Cangjing can deduct

  // Cost Base logic
  let dsCostBase = 0;
  if (retailerTaxType === TaxType.GENERAL) {
     if (supplierToRetailerTaxType === TaxType.SMALL) {
         dsInputVat = supplierToRetailerOutputVat;
         dsCostBase = supplierToRetailerPriceExcl; 
     } else {
         dsInputVat = supplierToRetailerOutputVat;
         dsCostBase = supplierToRetailerPriceExcl;
     }
  } else {
     dsInputVat = 0;
     dsCostBase = supplierToRetailerPriceIncl;
  }

  if (retailerTradeMode === TradeMode.CONSIGNMENT) {
    const retailTaxRate = retailerTaxType; 
    if (retailerTaxType === TaxType.GENERAL) {
        dsPriceExcl = dsCostBase * (1 + dsMarkupRate);
        dsOutputVat = dsPriceExcl * 0.13;
        dsPriceIncl = dsPriceExcl * 1.13;
    } else {
        dsPriceIncl = dsCostBase * (1 + dsMarkupRate);
        dsPriceExcl = dsPriceIncl / (1 + retailTaxRate);
        dsOutputVat = dsPriceExcl * retailTaxRate;
    }

    // Commission is the "Margin" retained by retailer
    const commissionTotal = dsPriceExcl - supplierToRetailerPriceExcl;
    
    // Service VAT calculation (Retailer issues this invoice to Cangjing)
    const serviceTaxRate = retailerTaxType === TaxType.GENERAL ? 0.06 : 0.01;
    
    // Reverse calculate Tax from the total Commission margin
    // CommissionTotal = CommExcl + CommVat
    // CommVat = CommExcl * Rate
    // So CommissionTotal = CommExcl * (1 + Rate)
    const commissionExcl = commissionTotal / (1 + serviceTaxRate);
    const serviceVat = commissionExcl * serviceTaxRate;

    dsGrossProfit = commissionExcl;
    dsInputVat = 0; // Retailer has no goods input VAT in consignment (they provide service)
    dsOutputVat = serviceVat; // They pay VAT on their service fee
    
    commissionExpense = commissionExcl; // Cangjing records exclusive expense
    commissionInputVat = serviceVat;    // Cangjing records Input VAT (if general taxpayer)

  } else {
    const retailTaxRate = retailerTaxType;
    if (retailerTaxType === TaxType.GENERAL) {
        dsPriceExcl = dsCostBase * (1 + dsMarkupRate);
        dsOutputVat = dsPriceExcl * retailTaxRate;
        dsPriceIncl = dsPriceExcl * (1 + retailTaxRate);
    } else {
        const priceIncl = dsCostBase * (1 + dsMarkupRate);
        dsPriceExcl = priceIncl / (1 + retailTaxRate);
        dsOutputVat = dsPriceExcl * retailTaxRate;
        dsPriceIncl = priceIncl;
    }
    
    if (retailerTaxType === TaxType.GENERAL && supplierToRetailerTaxType === TaxType.SMALL) {
        dsWarnings.push('⚠️ 进项不足 (上游为小规模)');
    }

    dsGrossProfit = dsPriceExcl - (retailerTaxType === TaxType.GENERAL ? dsCostBase : (dsCostBase / (1+retailTaxRate))); 
    if (retailerTaxType === TaxType.SMALL) {
         dsGrossProfit = dsPriceExcl - dsCostBase;
    }
  }
  
  if (dsPriceIncl > totalPackageMsrp) {
     const diff = dsPriceIncl - totalPackageMsrp;
     dsWarnings.push(`⚠️ 售价高于指导价 (超¥${Math.round(diff)})`);
  }

  supplierBreakdown.forEach(item => {
      const uIncl = item.unitPriceInclTax * (1 + dsMarkupRate); 
      dsBreakdown.push({
          productName: item.productName,
          quantity: item.quantity,
          unitPriceInclTax: uIncl,
          totalPriceInclTax: uIncl * item.quantity
      });
  });

  const dsVatPayable = Math.max(0, dsOutputVat - dsInputVat);
  const dsSurcharges = dsVatPayable * (retailerVatSurchargeRate / 100);
  const dsPreTaxProfit = dsGrossProfit - dsSurcharges;
  
  const dsIncomeTax = includeIncomeTax ? Math.max(0, dsPreTaxProfit * (retailerIncomeTaxRate / 100)) : 0;
  const dsNetProfit = dsPreTaxProfit - dsIncomeTax;

  const retailerResult: EntityResult = {
    id: retailer.id,
    name: retailer.name,
    role: '终端渠道',
    region: retailerRegion,
    tradeMode: retailerTradeMode,
    inPriceExclTax: supplierToRetailerPriceExcl,
    inPriceInclTax: supplierToRetailerPriceIncl,
    outPriceExclTax: dsPriceExcl,
    outPriceInclTax: dsPriceIncl,
    vatInput: dsInputVat,
    vatOutput: dsOutputVat,
    vatPayable: dsVatPayable,
    surcharges: dsSurcharges,
    incomeTax: dsIncomeTax,
    taxRefunds: 0,
    financeCost: 0,
    operationalCost: 0,
    commissionCost: 0,
    grossProfit: dsGrossProfit,
    netProfit: dsNetProfit,
    cashOutflow: 0,
    taxBurdenRate: dsGrossProfit > 0 ? ((dsVatPayable + dsSurcharges + dsIncomeTax) / dsGrossProfit) : 0,
    notes: [
      retailerTradeMode === TradeMode.CONSIGNMENT ? '委托代销 (佣金)' : '经销买卖',
      retailerTaxType === TaxType.GENERAL ? '一般纳税人' : '小规模'
    ],
    warnings: dsWarnings,
    priceBreakdown: dsBreakdown
  };

  // --- Finalizing CANGJING Results ---
  let cjFinalRev = cjPriceExcl;
  let cjFinalOutIncl = cjPriceIncl;
  let cjFinalOutVat = cjOutputVat;
  let cjCommissionExp = 0;

  if (!hasIntermediary && retailerTradeMode === TradeMode.CONSIGNMENT) {
      cjFinalRev = dsPriceExcl;
      cjFinalOutIncl = dsPriceIncl;
      cjFinalOutVat = dsPriceExcl * cjTaxRate;
      
      cjCommissionExp = commissionExpense;
      
      // CRITICAL FIX: If Cangjing is General Taxpayer, deduct Service VAT from Retailer
      if (cangjingTaxType === TaxType.GENERAL) {
          cjInputVat += commissionInputVat;
      }
  }

  const cjVatPayable = Math.max(0, cjFinalOutVat - cjInputVat);
  const cjSurcharges = cjVatPayable * (cangjingVatSurchargeRate / 100);

  const apDays = funderPaymentTermMonths * 30;
  const effectiveARDays = hasIntermediary ? (config.traderPaymentTermDays || 0) : retailerPaymentTermDays;
  const fundingGapDays = Math.max(0, effectiveARDays - apDays);
  const cjFinanceCost = cjPriceIncl * cangjingDailyRate * fundingGapDays;
  
  // -- Detailed Cost Package Calculation --
  const cjCostStructureDetails = {
      warehousing: cjPriceExcl * (cangjingCostStructure.warehousing / 100),
      logistics: cjPriceExcl * (cangjingCostStructure.logistics / 100),
      management: cjPriceExcl * (cangjingCostStructure.management / 100),
      other: cjPriceExcl * (cangjingCostStructure.other / 100)
  };
  
  const cjTotalOpCost = cjCostStructureDetails.warehousing 
                      + cjCostStructureDetails.logistics 
                      + cjCostStructureDetails.management 
                      + cjCostStructureDetails.other;
  
  const cjGrossProfit = cjFinalRev - cjCostBase;
  // Subtract Commission Explicitly
  const cjPreTaxProfit = cjGrossProfit - cjSurcharges - cjFinanceCost - cjTotalOpCost - cjCommissionExp;
  
  // Calculate VAT Refund FIRST to add to Taxable Income
  const cjVatRefund = cjVatPayable * (cangjingVatRefundRate / 100);
  
  // Income Tax Calc
  // Taxable Income includes the VAT Refund as subsidy income
  const cjTaxableIncome = cjPreTaxProfit + cjVatRefund;
  const cjIncomeTax = includeIncomeTax ? Math.max(0, cjTaxableIncome * (cangjingIncomeTaxRate / 100)) : 0;

  const cjIncomeTaxRefund = includeIncomeTax ? (cjIncomeTax * (cangjingIncomeTaxRefundRate / 100)) : 0;
  const cjTotalRefunds = cjVatRefund + cjIncomeTaxRefund;

  const cjNetProfit = cjPreTaxProfit - cjIncomeTax + cjTotalRefunds;
  
  const hasCashFloat = apDays > effectiveARDays;
  const cjNotes = [
      cangjingTaxType === TaxType.GENERAL ? '一般 (13%)' : '小规模 (1%)',
      hasCashFloat ? `资金盈余: ${(apDays - effectiveARDays)}天` : `资金占用: ${fundingGapDays}天`,
      (cjCommissionExp > 0) ? '承担代销佣金' : (hasIntermediary ? '销售给贸易商' : '直销终端')
  ];
  if (cjTotalRefunds > 0) cjNotes.push('含税收返还');
  if (cjTotalOpCost > 0) cjNotes.push('含综合费用包');

  const cangjingResult: EntityResult = {
    id: 'cangjing',
    name: '藏境山水',
    role: '核心平台',
    region: cangjingRegion,
    inPriceExclTax: cmPriceExcl,
    inPriceInclTax: cmPriceIncl,
    outPriceExclTax: cjFinalRev,
    outPriceInclTax: cjFinalOutIncl,
    vatInput: cjInputVat,
    vatOutput: cjFinalOutVat,
    vatPayable: cjVatPayable,
    surcharges: cjSurcharges,
    incomeTax: cjIncomeTax,
    taxRefunds: cjTotalRefunds,
    financeCost: cjFinanceCost,
    operationalCost: cjTotalOpCost,
    commissionCost: cjCommissionExp, // Explicitly separate for UI
    grossProfit: cjGrossProfit,
    netProfit: cjNetProfit,
    cashOutflow: 0,
    taxBurdenRate: cjFinalRev > 0 ? ((cjVatPayable + cjSurcharges + cjIncomeTax - cjTotalRefunds) / cjFinalRev) : 0,
    isCentralNode: true,
    notes: cjNotes,
    warnings: cjWarnings,
    complianceTips: cjTips, 
    priceBreakdown: cjBreakdown,
    costDetails: cjCostStructureDetails
  };

  return { manufacturer: mfgResult, funder: funderResult, cangjing: cangjingResult, trader: traderResult, retailer: retailerResult };
};
