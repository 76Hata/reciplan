// src/pages/Home.tsx
import { useState, useEffect, useRef } from 'react';
import {
    Box, Button, FormControl, FormLabel, Heading, Input, Text, HStack, VStack,
    IconButton, Collapse, useDisclosure, useToast, AlertDialog,
    AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody,
    AlertDialogFooter
} from '@chakra-ui/react';
import { AddIcon, MinusIcon, ChevronDownIcon, ChevronUpIcon, DeleteIcon, RepeatIcon } from '@chakra-ui/icons'; // Chakra UIアイコン
import { db } from '../db/reciplanDB';
import { v4 as uuidv4 } from 'uuid';
import { Layout } from '../components/Layout';

// 材料入力欄で使う型
type IngredientInput = {
    name: string;           // 材料名
    quantity: string;       // 数値部分（例："1.5"）
    unitPrefix?: string;    // 単位の前置詞（例："おおさじ"）
    unitSuffix?: string;    // 単位の後置詞（例："杯"）
};

// 共通ユーティリティ関数
const isValidIngredient = (i: IngredientInput) => i.name.trim() && i.quantity.trim();
const getValidIngredients = (items: IngredientInput[]) => items.filter(isValidIngredient);

const parseQuantityUnitParts = (input: string): { quantity: string; unitPrefix?: string; unitSuffix?: string } => {
    const toHalfWidth = (str: string) => str.replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)).replace(/　/g, '').trim();
    const half = toHalfWidth(input);
    const match = half.match(/^([^\d.]*)([\d.\/]+)([^\d.]*)$/);
    return {
        quantity: match?.[2] || half,
        unitPrefix: match?.[1] || '',
        unitSuffix: match?.[3] || '',
    };
};

// 全角数字を半角に変換する
const toHalfWidthNumber = (str: string) =>
    str.replace(/[０-９．／]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

// ローカルストレージ書き込み
const saveDraft = (recipeName: string, ingredients: IngredientInput[]) => {
    try {
        localStorage.setItem('draftRecipe', JSON.stringify({ recipeName, ingredients }));
    } catch (e) {
        console.warn('ドラフト保存失敗', e);
    }
};

// ローカルストレージ呼び出し
const loadDraft = (): { recipeName?: string; ingredients?: IngredientInput[] } | null => {
    try {
        const saved = localStorage.getItem('draftRecipe');
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
};


const Home = () => {
    // ******************
    // プロパティブロック
    // ******************
    // 料理名の入力値を保持する
    const [recipeName, setRecipeName] = useState('');

    // 読み込み済みフラグ(読み込み直後の画面クリア抑止)
    const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

    // 複数の材料入力欄の状態を保持（初期は1行）
    const [ingredients, setIngredients] = useState<IngredientInput[]>([
        { name: '', quantity: '' },
    ]);

    // 登録後の確認表示に使う、最後に登録したレシピ情報
    const [, setLastRegistered] = useState<{
        name: string;
        ingredients: IngredientInput[]
    } | null>(null);

    const [loadingRecipe, setLoadingRecipe] = useState(false);  // レシピ読み込み中フラグ
    const [allRecipes, setAllRecipes] = useState<{ id: string; name: string }[]>([]); // 全レシピリスト
    const { isOpen, onToggle } = useDisclosure(); // Collapse制御用
    const toast = useToast(); // トースト通知

    // 削除確認ダイアログ関連
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
    const cancelRef = useRef(null);

    const onOpenDeleteDialog = (id: string) => {
        setSelectedRecipeId(id);
        setIsDeleteDialogOpen(true);
    };

    const onCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedRecipeId(null);
    };

    const handleDelete = async () => {
        if (selectedRecipeId) {
            await db.recipes.delete(selectedRecipeId);
            await fetchRecipes();
            toast({ title: 'レシピを削除しました。', status: 'warning', duration: 3000, isClosable: true });
            onCloseDeleteDialog();
        }
    };

    // 材料名からmaterialIdを名寄せ辞書を通じて解決
    const resolveMaterialIdByName = async (name: string): Promise<string> => {
        const synonym = await db.synonymDictionary.where('synonymWord').equalsIgnoreCase(name).first();
        return synonym?.materialId || '';
    };

    // レシピ一覧をIndexedDBから取得
    const fetchRecipes = async () => {
        const recipes = await db.recipes.toArray();
        recipes.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        setAllRecipes(recipes.map((r) => ({ id: r.id, name: r.name })));
    };

    // 初期表示時に既存レシピ一覧を取得
    useEffect(() => {
        fetchRecipes();             // 全レシピをIndexedDBから取得しstateにセット

        // ローカルストレージ呼び出し
        const draft = loadDraft();
        if (draft?.recipeName) setRecipeName(draft.recipeName);
        if (draft?.ingredients?.length) setIngredients(draft.ingredients);
        setHasLoadedDraft(true);
    }, []);

    useEffect(() => {
        if (hasLoadedDraft) saveDraft(recipeName, ingredients);
    }, [recipeName, JSON.stringify(ingredients), hasLoadedDraft]);


    const loadRecipeIngredients = async (name: string) => {
        if (!name.trim() || loadingRecipe) return;

        setLoadingRecipe(true);
        try {
            const existingRecipe = await db.recipes.where('name').equals(name.trim()).first();
            if (existingRecipe) {
                const loadedIngredients = await Promise.all(
                    existingRecipe.ingredients.map(async (ref) => {
                        const ing = await db.materials.get(ref.ingredientId);
                        return {
                            name: ing?.name || '',
                            quantity: toHalfWidthNumber(ref.quantity),
                            unitPrefix: ref.unitPrefix || '',
                            unitSuffix: ref.unitSuffix || '',
                        };
                    })
                );
                setIngredients([]);
                setTimeout(() => setIngredients(loadedIngredients), 0);
                toast({
                    title: 'レシピを読み込みました。',
                    status: 'info',
                    duration: 3000,
                    isClosable: true,
                });
            }
        } finally {
            setLoadingRecipe(false);
        }
    };

    // 材料行を追加する処理（＋ボタン押下時）
    const handleAddIngredient = () => {
        setIngredients((prev) => [...prev, { name: '', quantity: '' }]);
        setTimeout(() => {
            const inputs = document.querySelectorAll<HTMLInputElement>('input[placeholder="材料名"]');
            inputs[inputs.length - 1]?.focus();
        }, 0);
    };

    // 材料行を削除する処理（−ボタン押下時）
    const handleRemoveIngredient = (index: number) => {
        setIngredients((prev) => prev.filter((_, i) => i !== index));
    };

  // 材料名または数量が変更されたときに状態を更新する処理
    const handleIngredientChange = (index: number, field: keyof IngredientInput, value: string) => {
        const updated = [...ingredients];
        if (field === 'quantity') {
            // 数量変更時は一旦 unitPrefix と unitSuffix をクリアし、onBlur で再パース
            updated[index] = {
                ...updated[index],
                quantity: value,
                unitPrefix: '',
                unitSuffix: '',
            };
        } else {
            updated[index][field] = value;
        }
        setIngredients(updated);
    };

    // 初期化ボタン押下時の処理（画面リセット）
    const handleReset = () => {
        setRecipeName('');
        setIngredients([{ name: '', quantity: '' }]);
        setLastRegistered(null);
        toast({ title: '画面を初期化しました。', status: 'info', duration: 3000, isClosable: true });
    };

    const handleSubmit = async () => {
        // 料理名チェック
        if (!recipeName.trim()) {
            toast({ title: '料理名は必須です。', status: 'error', duration: 3000, isClosable: true });
            document.querySelector<HTMLInputElement>('input[placeholder="例：カレーライス"]')?.focus();
            return;
        }

        // 材料チェック
        const validIngredients = getValidIngredients(ingredients);
        if (!validIngredients.length) {
            toast({ title: '登録対象となる材料がありません。', status: 'warning', duration: 3000, isClosable: true });
            document.querySelector<HTMLInputElement>('input[placeholder="材料名"]')?.focus();
            return;
        }

        try {
            // 料理名の検索
            const existingRecipe = await db.recipes.where('name').equals(recipeName).first();
            // 未登録の場合、ID発行
            const recipeId = existingRecipe ? existingRecipe.id : uuidv4();
            // 既存の登録料理データがある場合、適切な変数、配列に格納
            const existingMap = new Map(
                existingRecipe?.ingredients.map((ref) => [ref.ingredientId, { quantity: ref.quantity, unitPrefix: ref.unitPrefix, unitSuffix: ref.unitSuffix }]) || []
            );

            const ingredientRefs = await Promise.all(
                validIngredients.map(async (item) => {
                    // すでにunitPrefix/unitSuffixがある場合は使う。それ以外はquantityから分解
                    const alreadyParsed = item.unitPrefix || item.unitSuffix;
                    const { quantity, unitPrefix, unitSuffix } = alreadyParsed
                        ? { quantity: item.quantity, unitPrefix: item.unitPrefix || '', unitSuffix: item.unitSuffix || '' }
                    : parseQuantityUnitParts(item.quantity);

                    let material = await db.materials.where('name').equalsIgnoreCase(item.name).first();

                    if (!material) {
                        const resolvedId = await resolveMaterialIdByName(item.name);

                        if (resolvedId) {
                            material = await db.materials.get(resolvedId);

                            if (!material) {
                                throw new Error(`resolvedId: ${resolvedId} に対応する材料が見つかりませんでした`);
                            }
                        } else {
                            material = {
                                id: uuidv4(),
                                name: item.name,
                                unitPrefix,
                                unitSuffix
                            };
                            await db.materials.add(material);
                        }
                    }

                    return {
                        ingredientId: material.id,
                        quantity,
                        unitPrefix,
                        unitSuffix,
                    };
                })
            );

            const isDifferent = () => {
                if (!existingRecipe) return true;
                if (existingRecipe.ingredients.length !== ingredientRefs.length) return true;

                for (const ref of ingredientRefs) {
                    const old = existingMap.get(ref.ingredientId);
                    if (!old ||
                        old.quantity !== ref.quantity ||
                        old.unitPrefix !== ref.unitPrefix ||
                        old.unitSuffix !== ref.unitSuffix
                    ) return true;
                }

                return false;
            };

            if (isDifferent()) {
                await db.recipes.put({ id: recipeId, name: recipeName, ingredients: ingredientRefs });
                await fetchRecipes();
                toast({ title: existingRecipe ? '既存レシピを更新しました！' : '新規レシピを登録しました！', status: 'success', duration: 3000, isClosable: true });
                localStorage.removeItem('draftRecipe');
                setLastRegistered({ name: recipeName, ingredients: [...ingredients] });
                localStorage.removeItem('draftRecipe');
            } else {
                toast({ title: 'レシピに変更はありません。', status: 'info', duration: 3000, isClosable: true });
            }

        } catch (err) {
            console.error('登録エラー:', err);
            toast({ title: '登録に失敗しました。コンソールをご確認ください。', status: 'error', duration: 4000, isClosable: true });
        }
    };

    return (
    <Layout>
        <Box maxW="lg" mx="auto" py={10} px={6}>
        <Heading as="h1" size="xl" mb={4} textAlign="center">
            🍳 食材プランナー
        </Heading>
        <Text fontSize="lg" mb={6} textAlign="center">
            作りたい料理を登録してください。
        </Text>

        <VStack spacing={4} align="stretch">
            <FormControl>
            <FormLabel>料理名</FormLabel>
            <HStack>
                <Input
                placeholder="例：カレーライス"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                />
                <Button leftIcon={<RepeatIcon />} onClick={handleReset} colorScheme="gray" variant="outline">
                クリア
                </Button>
            </HStack>
            </FormControl>

            <Button
                onClick={onToggle}
                rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                variant="ghost"
                colorScheme="teal"
                size="sm"
                mt={2}
            >
            既存レシピ一覧を表示
            </Button>

            <Collapse in={isOpen} animateOpacity>
            <Box
                mt={2} p={3} border="1px solid" borderColor="gray.200" borderRadius="md" bg="gray.50"
                maxHeight="200px" overflowY="auto"
            >


                <VStack align="start" spacing={1}>
                {allRecipes.length === 0 ? (
                    <Text color="gray.500">登録済みのレシピはありません。</Text>
                ) : (
                    allRecipes.map((recipe) => (
                    <HStack key={recipe.id} justify="space-between" width="100%">
                        <Button
                        key={recipe.id}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setRecipeName(recipe.name);
                            loadRecipeIngredients(recipe.name);
                        }}
                        >
                        🍽️ {recipe.name}
                        </Button>
                        <IconButton
                        aria-label="レシピ削除"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => onOpenDeleteDialog(recipe.id)}
                        />
                    </HStack>
                    ))
                )}
                </VStack>
            </Box>
            </Collapse>

            <FormLabel mt={4}>材料と必要数量</FormLabel>

            {ingredients.map((item, index) => (
            <HStack key={index}>
                <Input
                placeholder="材料名"
                value={item.name}
                onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                />
                <Input
                    placeholder="数量（例：おおさじ1杯）"
                    value={`${item.unitPrefix || ''}${item.quantity}${item.unitSuffix || ''}`}
                    onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                    onBlur={() => {
                        const currentQuantity = ingredients[index].quantity;
                        // 入力が数字のみ（例："1" や "1.5"）の場合、既存の unitPrefix と unitSuffix を保持
                        if (/^[\d.\/]+$/.test(currentQuantity)) {
                            return; // 状態を更新せず、既存の unitPrefix と unitSuffix を保持
                        }
                        // それ以外の場合は、parseQuantityUnitParts でパース
                        const parsed = parseQuantityUnitParts(currentQuantity);
                        const updated = [...ingredients];
                        updated[index] = {
                            ...updated[index],
                            quantity: parsed.quantity,
                            unitPrefix: parsed.unitPrefix,
                            unitSuffix: parsed.unitSuffix,
                        };
                        setIngredients(updated);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault(); // フォーム送信防止
                            if (index === ingredients.length - 1) {
                                handleAddIngredient(); // 最終行なら新規行を追加
                            }
                        }
                    }}
                />
                <IconButton
                aria-label="削除"
                icon={<MinusIcon />}
                colorScheme="red"
                variant="outline"
                onClick={() => handleRemoveIngredient(index)}
                isDisabled={ingredients.length === 1}  // １行だけ残す
                />
            </HStack>
            ))}

            <HStack>
            <Button leftIcon={<AddIcon />} onClick={handleAddIngredient} colorScheme="teal" variant="outline">
                材料を追加
            </Button>
            <Button leftIcon={<RepeatIcon />} onClick={handleReset} colorScheme="gray" variant="outline">
                クリア
            </Button>
            </HStack>

            <Button colorScheme="blue" size="lg" onClick={handleSubmit}>
            登録する
            </Button>
        </VStack>
        </Box>

        <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onCloseDeleteDialog}
        >
        <AlertDialogOverlay>
            <AlertDialogContent>
            <AlertDialogHeader>レシピの削除確認</AlertDialogHeader>
            <AlertDialogBody>
                このレシピを削除してもよろしいですか？この操作は元に戻せません。
            </AlertDialogBody>
            <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onCloseDeleteDialog}>
                キャンセル
                </Button>
                <Button colorScheme="red" onClick={handleDelete} ml={3}>
                削除する
                </Button>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialogOverlay>
        </AlertDialog>
    </Layout>
    );
};

export default Home;
