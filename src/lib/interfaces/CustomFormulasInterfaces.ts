import type { CustomFormulaFormat } from "lib/enums/enums";

export interface CreateAdAccountCustomFormulaRequest {
  name: string;
  formula: string;
  format: CustomFormulaFormat;
  description: string;
  adAccountId: string;
}

export interface UpdateAdAccountCustomFormulaRequest {
  name: string;
  formula: string;
  format: CustomFormulaFormat;
  description: string;
}