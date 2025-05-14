// 材料マスタ（玉ねぎ、にんじん、鶏肉など）の定義
export interface Material {
    id: string;               // 材料ID（主キー）
    name: string;             // 材料名（例: 玉ねぎ）
    unitPrefix?: string;      // 単位の前置き（例: おおさじ、カップ）
    unitSuffix?: string;      // 単位の後置き（例: 杯、個）
    price?: number;           // 購入価格（任意）
    store?: string;           // 購入場所（任意）
}
