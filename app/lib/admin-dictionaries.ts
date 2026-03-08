export interface AdminColorRow {
    id: number;
    name: string;
    hexCode: string | null;
}

export interface AdminLocationRow {
    id: number;
    name: string;
}

export interface AdminDistrictRow {
    id: number;
    name: string;
    locationId: number;
    beaches?: string | null;
    deliveryPrice?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AdminHotelRow {
    id: number;
    name: string;
    locationId: number;
    locationName?: string | null;
    districtId: number;
    districtName?: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AdminDurationRow {
    id: number;
    rangeName: string;
    minDays: number;
    maxDays: number | null;
    priceMultiplier: number;
    discountLabel: string | null;
}

export interface AdminSeasonRow {
    id: number;
    seasonName: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    priceMultiplier: number;
    discountLabel: string | null;
}

export interface AdminBrandRow {
    id: number;
    name: string;
    logo: string | null;
    modelsCount: number;
    createdAt: string;
}

export interface AdminModelRow {
    id: number;
    brandName: string;
    brandId: number;
    name: string;
    bodyTypeId?: number | null;
    bodyTypeName?: string | null;
}

export interface AdminPaymentStatusRow {
    id: number;
    name: string;
}

export interface LocationsPageDistrict {
    id: number;
    name: string;
    locationId: number;
    beaches: string | null;
    streets: string | null;
    isActive: boolean;
    deliveryPrice: number | null;
    createdAt: Date;
    updatedAt: Date;
}
