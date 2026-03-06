export type ContractNewCarRow = {
  id: number;
  pricePerDay: number | null;
  deposit: number | null;
  licensePlate: string | null;
  brandName: string | null;
  modelName: string | null;
};

export type ContractNewDistrictRow = {
  id: number;
  name: string | null;
  name_en: string | null;
};
