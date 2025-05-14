import Dexie, { Table } from 'dexie';
import { Material } from '../types/Material';
import { Recipe } from '../types/Recipe';
import { SynonymEntry } from '../types/SynonymDictionary';

// データベース定義
export class ReciplanDB extends Dexie {
  materials!: Table<Material>;             // 材料マスタ
  recipes!: Table<Recipe>;                 // レシピ情報
  synonymDictionary!: Table<SynonymEntry>; // 名寄せ辞書

  constructor() {
    super('reciplanDB');
    this.version(1).stores({
      materials: 'id, name',
      recipes: 'id, name',
      synonymDictionary: '++synonymId, materialId, synonymWord',
    });
  }
}

export const db = new ReciplanDB();