// レシピ全体（料理名 + 材料リスト）
export interface Recipe {
    id: string;               // レシピID（主キー）
    name: string;             // レシピ名（例: カレー）
    ingredients: IngredientInRecipe[]; // レシピ内で使われる材料情報
}

// レシピに含まれる個々の材料データ（例: 玉ねぎ2個）
export interface IngredientInRecipe {
    ingredientId: string;     // 紐づく材料ID（Materialのid）
    quantity: string;         // 数量（例: 2、1/2など）
    unitPrefix?: string;      // 単位の前置き（例: おおさじ）
    unitSuffix?: string;      // 単位の後置き（例: 杯）
}
