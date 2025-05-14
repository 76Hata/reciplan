// 類義語辞書（名寄せ用）
export interface SynonymEntry {
    synonymId?: number;      // 自動連番（主キー）
    materialId: string;     // 紐づく材料ID（材料マスタのidと一致）
    synonymWord: string;    // 類義語（例: とりにく、鳥肉、とり肉）
  }
