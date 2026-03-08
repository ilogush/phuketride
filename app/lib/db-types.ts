export type DictionaryRow = {
    id: number;
    name: string;
};

export type ModelRow = DictionaryRow & {
    brand_id: number;
};

export type CurrencyRow = {
    id: number;
    code: string;
    symbol: string | null;
};

export type CurrencyDetailedRow = {
    id: number;
    name: string;
    code: string;
    symbol: string | null;
    companyId: number | null;
    isActive: number | boolean | null;
};

export type PaymentTemplateRow = {
    id: number;
    name: string;
    sign: "+" | "-";
    description: string | null;
    showOnCreate: boolean | number | null;
    showOnClose: boolean | number | null;
    isActive: boolean | number | null;
    isSystem: boolean | number | null;
    companyId: number | null;
};

export type UserListRow = {
    id: string;
    email: string;
    name: string | null;
    surname: string | null;
    role: string;
    phone: string | null;
    avatarUrl: string | null;
};

export type CarListRow = {
    id: number;
    photos: string | null;
    license_plate: string | null;
    price_per_day: number | null;
    insurance_type: string | null;
    engine_volume: number | null;
    mileage: number | null;
    deposit: number | null;
    status: string;
    brandName: string | null;
    modelName: string | null;
    bodyTypeName: string | null;
    colorName: string | null;
};

export type ContractListRow = {
    id: number;
    startDate: string | null;
    endDate: string | null;
    totalAmount: number | null;
    status: string;
};

export type BookingListRow = {
    id: number;
    startDate: string;
    endDate: string;
    estimatedAmount: number;
    currency: string;
    depositAmount: number | null;
    depositPaid: number;
    status: "pending" | "confirmed" | "converted" | "cancelled";
    createdAt: string;
    clientName: string;
    clientSurname: string;
    clientPhone: string;
    clientEmail: string | null;
    carLicensePlate: string;
    carYear: number;
    brandName: string | null;
    modelName: string | null;
};

export type PaymentListRow = {
    id: number;
    amount: number;
    status: string;
    created_at?: string | null;
    createdAt?: string | null;
    contractId?: number | null;
    paymentTypeName?: string | null;
    paymentTypeSign?: string | null;
    currencyCode?: string | null;
    currencySymbol?: string | null;
    creatorName?: string | null;
    creatorSurname?: string | null;
};

export type CompanyListRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    locationId: number | null;
    districtId: number | null;
    ownerId: string;
    archivedAt: string | null;
    ownerName: string | null;
    ownerSurname: string | null;
    ownerArchivedAt: string | null;
    districtName: string | null;
    carCount: number | string | null;
};
