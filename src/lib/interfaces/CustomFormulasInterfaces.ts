export interface CreateAdAccountCustomFormulaRequest {
  adAccountId: string;
  name: string;
  formula: string;
  format: 'currency' | 'number' | 'percentage' | 'decimal';
  description?: string;
}

export interface UpdateAdAccountCustomFormulaRequest {
  formula: string;
  name?: string;
  format?: 'currency' | 'number' | 'percentage' | 'decimal';
  description?: string;
}

export interface CustomFormula {
  uuid: string;
  name: string;
  order: number;
}

export interface ExtendedCustomFormula extends CustomFormula {
  formula: string;
  format: 'currency' | 'number' | 'percentage' | 'decimal';
  description: string;
}
