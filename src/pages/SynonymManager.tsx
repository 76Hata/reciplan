import { useState, useEffect, useRef } from 'react';
import {
    Box, Button, FormControl, FormLabel, Heading, Input, Select, Table, Thead, Tbody, Tr, Th, Td, VStack, HStack,
    IconButton, useToast, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody,
    AlertDialogFooter, useDisclosure, Collapse, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/reciplanDB';
import { Material } from '../types/Material'
import { SynonymEntry } from '../types/SynonymDictionary'
import { Layout } from '../components/Layout';

interface SynonymForm {
    materialId: string;
    synonymWord: string;
}

interface MaterialEditForm {
    id: string;
    name: string;
}

const SynonymManager = () => {
    // 状態管理
    const [synonyms, setSynonyms] = useState<SynonymEntry[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [form, setForm] = useState<SynonymForm>({ materialId: '', synonymWord: '' });
    const [newMaterialName, setNewMaterialName] = useState<string>(''); // 材料追加用
    const [editingMaterial, setEditingMaterial] = useState<MaterialEditForm | null>(null); // 材料編集
    const [editingSynonym, setEditingSynonym] = useState<SynonymEntry | null>(null);
    const [deleteSynonymId, setDeleteSynonymId] = useState<number | null>(null);
    const [isSynonymListOpen, setIsSynonymListOpen] = useState(false); // 類義語一覧アコーディオン
    const [isMaterialListOpen, setIsMaterialListOpen] = useState(false); // 材料一覧アコーディオン
    const { isOpen, onOpen, onClose } = useDisclosure(); // 削除ダイアログ用
    const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure(); // 材料編集モーダル用
    const { isOpen: isAddMaterialModalOpen, onOpen: onAddMaterialModalOpen, onClose: onAddMaterialModalClose } = useDisclosure(); // 材料追加モーダル用
    const toast = useToast();
    const cancelRef = useRef<HTMLButtonElement>(null);

    // データ取得
    useEffect(() => {
        const fetchData = async () => {
            const [synonyms, materials] = await Promise.all([
                db.synonymDictionary.toArray(),
                db.materials.toArray(),
            ]);
            setSynonyms(synonyms);
            setMaterials(materials);
        };
        fetchData();
    }, []);

    // フォーム入力ハンドラ
    const handleInputChange = (field: keyof SynonymForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // 材料追加ハンドラ
    const handleAddMaterial = async () => {
        const trimmedName = newMaterialName.trim();
        if (!trimmedName) {
            toast({
                title: '入力エラー',
                description: '材料名を入力してください。',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // 重複チェック
        const existing = await db.materials.where('name').equalsIgnoreCase(trimmedName).first();
        if (existing) {
            toast({
                title: 'エラー',
                description: 'この材料名はすでに登録されています。',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            const newMaterial: Material = {
                id: uuidv4(),
                name: trimmedName,
            };
            await db.materials.add(newMaterial);
            setMaterials([...materials, newMaterial]);
            setNewMaterialName('');
            onAddMaterialModalClose();
            toast({
                title: '材料を追加しました！',
                description: `${trimmedName} を登録しました。`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error('材料追加エラー:', err);
            toast({
                title: '材料の追加に失敗しました。',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        }
    };

    // 材料編集ハンドラ
    const handleEditMaterial = (material: Material) => {
        setEditingMaterial({ id: material.id, name: material.name });
        onEditModalOpen();
    };

    const handleUpdateMaterial = async () => {
        if (!editingMaterial || !editingMaterial.name.trim()) {
            toast({
                title: '入力エラー',
                description: '材料名を入力してください。',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const trimmedName = editingMaterial.name.trim();
        // 重複チェック（自身を除く）
        const existing = await db.materials.where('name').equalsIgnoreCase(trimmedName).first();
        if (existing && existing.id !== editingMaterial.id) {
            toast({
                title: 'エラー',
                description: 'この材料名はすでに登録されています。',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            // Material 更新
            await db.transaction('readwrite', [db.materials, db.synonymDictionary], async () => {
                await db.materials.update(editingMaterial.id, { name: trimmedName });
                // SynonymEntry.materialName を同期
                await db.synonymDictionary
                    .where('materialId')
                    .equals(editingMaterial.id)
                    .modify((obj) => {
                        obj.synonymWord = trimmedName;
                        return true;
                    })
            });

            // 状態更新
            setMaterials(materials.map(m => m.id === editingMaterial.id ? { ...m, name: trimmedName } : m));
            setEditingMaterial(null);
            onEditModalClose();
            toast({
                title: '材料名を更新しました！',
                description: `${trimmedName} に変更しました。`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            // 類義語一覧を再取得
            const synonyms = await db.synonymDictionary.toArray();
            setSynonyms(synonyms);
        } catch (err) {
            console.error('材料更新エラー:', err);
            toast({
                title: '材料の更新に失敗しました。',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        }
    };

    // 登録・更新ハンドラ
    const handleSubmit = async () => {
        if (!form.materialId || !form.synonymWord.trim()) {
            toast({
                title: '入力エラー',
                description: '材料と類義語を入力してください。',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            const material = materials.find(m => m.id === form.materialId);
            if (!material) {
                toast({
                    title: 'エラー',
                    description: '選択された材料が見つかりません。',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            // 重複チェック
            const existing = await db.synonymDictionary
                .where({ materialId: form.materialId, synonymWord: form.synonymWord })
                .first();
            if (existing && existing.synonymId !== editingSynonym?.synonymId) {
                toast({
                    title: 'エラー',
                    description: 'この材料に対する類義語はすでに登録されています。',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            if (editingSynonym) {
                // 編集
                await db.synonymDictionary.update(editingSynonym.synonymId, {
                    materialId: form.materialId,
                    synonymWord: form.synonymWord,
                })

                toast({
                    title: '類義語を更新しました！',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } else {
                // 新規登録
                // await db.synonymDictionary.add({
                //     materialId: form.materialId,
                //     synonymWord: form.synonymWord,
                //     materialName: material.name,
                // });

                await db.synonymDictionary.add({
                    materialId: form.materialId,
                    synonymWord: form.synonymWord,
                });



                toast({
                    title: '類義語を登録しました！',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            }

            // フォームリセット
            setForm({ materialId: '', synonymWord: '' });
            setEditingSynonym(null);
            // データ再取得
            const synonyms = await db.synonymDictionary.toArray();
            setSynonyms(synonyms);
        } catch (err) {
            console.error('処理エラー:', err);
            toast({
                title: '処理に失敗しました。',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        }
    };

    // 編集開始
    const handleEdit = (synonym: SynonymEntry) => {
        setEditingSynonym(synonym);
        setForm({
            materialId: synonym.materialId,
            synonymWord: synonym.synonymWord,
        });
    };

    // 削除確認
    const handleDeleteConfirm = (synonymId: number) => {
        setDeleteSynonymId(synonymId);
        onOpen();
    };

    // 削除実行
    const handleDelete = async () => {
        if (deleteSynonymId === null) return;
        try {
            await db.synonymDictionary.delete(deleteSynonymId);
            toast({
                title: '類義語を削除しました。',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            const synonyms = await db.synonymDictionary.toArray();
            setSynonyms(synonyms);
            onClose();
        } catch (err) {
            console.error('削除エラー:', err);
            toast({
                title: '削除に失敗しました。',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        }
    };

    return (
        <Layout>
            <Box maxW="lg" mx="auto" py={10} px={6}>
                <Heading as="h1" size="xl" mb={4} textAlign="center">
                    📖 類義語辞書管理
                </Heading>

                {/* 類義語登録・編集フォーム */}
                <VStack spacing={4} align="stretch" mb={8}>
                    <Heading as="h2" size="sm">
                        類義語を登録 / 編集
                    </Heading>
                    <FormControl>
                        <FormLabel>材料を選択</FormLabel>
                        <HStack>
                            <Select
                                flex="1"
                                placeholder="材料を選択"
                                value={form.materialId}
                                onChange={e => handleInputChange('materialId', e.target.value)}
                            >
                                {materials
                                    .slice()
                                    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                                    .map(material => (
                                        <option key={material.id} value={material.id}>
                                            {material.name}
                                        </option>
                                    ))
                                }
                            </Select>
                            <Button
                                colorScheme="teal"
                                size="md"
                                onClick={() => {
                                    setNewMaterialName('');
                                    onAddMaterialModalOpen();
                                }}
                            >
                                材料を追加
                            </Button>
                        </HStack>
                    </FormControl>
                    <FormControl>
                        <FormLabel>類義語</FormLabel>
                        <Input
                            placeholder="例: とりにく"
                            value={form.synonymWord}
                            onChange={e => handleInputChange('synonymWord', e.target.value)}
                        />
                    </FormControl>
                    <Button
                        colorScheme="blue"
                        onClick={handleSubmit}
                        isDisabled={!form.materialId || !form.synonymWord.trim()}
                    >
                        {editingSynonym ? '更新する' : '登録する'}
                    </Button>
                    {editingSynonym && (
                        <Button
                            colorScheme="gray"
                            variant="outline"
                            onClick={() => {
                                setEditingSynonym(null);
                                setForm({ materialId: '', synonymWord: '' });
                            }}
                        >
                            キャンセル
                        </Button>
                    )}
                </VStack>

                {/* 類義語一覧 */}
                <Heading as="h2" size="md" mb={2}>
                    登録済み類義語
                </Heading>
                <Button
                    onClick={() => setIsSynonymListOpen(!isSynonymListOpen)}
                    rightIcon={isSynonymListOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    colorScheme="teal"
                    variant="outline"
                    mb={4}
                >
                    {isSynonymListOpen ? '類義語一覧を閉じる' : '類義語一覧を開く'}
                </Button>
                <Collapse in={isSynonymListOpen} animateOpacity>
                    {synonyms.length === 0 ? (
                        <Box textAlign="center" color="gray.500" p={4}>
                            登録済みの類義語はありません。
                        </Box>
                    ) : (
                        <Box maxHeight="300px" overflowY="auto">
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>材料名</Th>
                                        <Th>類義語</Th>
                                        <Th>操作</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {synonyms
                                        .slice()
                                        .sort((a, b) => {
                                            const nameA = materials.find((m) => m.id === a.materialId)?.name || '';
                                            const nameB = materials.find((m) => m.id === b.materialId)?.name || '';
                                            return nameA.localeCompare(nameB, 'ja');
                                        })
                                        .map(syn => (
                                            <Tr
                                                key={syn.synonymId}
                                                cursor="pointer"
                                                _hover={{ bg: 'gray.100' }}
                                                onClick={() => handleEdit(syn)}
                                            >
                                                <Td>
                                                    { materials.find((mat) => mat.id === syn.materialId)?.name || '不明' }
                                                </Td>
                                                <Td>{syn.synonymWord}</Td>
                                                <Td>
                                                    <HStack spacing={2}>
                                                        <IconButton
                                                            aria-label="編集"
                                                            icon={<EditIcon />}
                                                            size="sm"
                                                            onClick={() => handleEdit(syn)}
                                                        />
                                                        <IconButton
                                                            aria-label="削除"
                                                            icon={<DeleteIcon />}
                                                            size="sm"
                                                            colorScheme="red"
                                                            onClick={() => 
                                                                syn.synonymId !== undefined ? handleDeleteConfirm(syn.synonymId) : undefined
                                                            }
                                                        />
                                                    </HStack>
                                                </Td>
                                            </Tr>
                                        ))
                                    }
                                </Tbody>
                            </Table>
                        </Box>
                    )}
                </Collapse>

                {/* 材料一覧 */}
                <Heading as="h2" size="md" mt={8} mb={2}>
                    登録済み材料
                </Heading>
                <Button
                    onClick={() => setIsMaterialListOpen(!isMaterialListOpen)}
                    rightIcon={isMaterialListOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    colorScheme="teal"
                    variant="outline"
                    mb={4}
                >
                    {isMaterialListOpen ? '材料一覧を閉じる' : '材料一覧を開く'}
                </Button>
                <Collapse in={isMaterialListOpen} animateOpacity>
                    {materials.length === 0 ? (
                        <Box textAlign="center" color="gray.500" p={4}>
                            登録済みの材料はありません。
                        </Box>
                    ) : (
                        <Box maxHeight="200px" overflowY="auto">
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>材料名</Th>
                                        <Th>操作</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {materials
                                        .slice()
                                        .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                                        .map(mat => (
                                            <Tr
                                                key={mat.id}
                                                cursor="pointer"
                                                _hover={{ bg: 'gray.100' }}
                                                onClick={() => {
                                                    setForm(prev => ({ ...prev, materialId: mat.id, synonymWord: ''}));
                                                }}
                                            >
                                                <Td>{mat.name}</Td>
                                                <Td>
                                                    <IconButton
                                                        aria-label="編集"
                                                        icon={<EditIcon />}
                                                        size="sm"
                                                        onClick={() => handleEditMaterial(mat)}
                                                    />
                                                </Td>
                                            </Tr>
                                        ))
                                    }
                                </Tbody>
                            </Table>
                        </Box>
                    )}
                </Collapse>

                {/* 削除確認ダイアログ */}
                <AlertDialog
                    isOpen={isOpen}
                    leastDestructiveRef={cancelRef}
                    onClose={onClose}
                >
                    <AlertDialogOverlay>
                        <AlertDialogContent>
                            <AlertDialogHeader>類義語の削除確認</AlertDialogHeader>
                            <AlertDialogBody>
                                この類義語を削除してもよろしいですか？この操作は元に戻せません。
                            </AlertDialogBody>
                            <AlertDialogFooter>
                                <Button ref={cancelRef} onClick={onClose}>
                                    キャンセル
                                </Button>
                                <Button colorScheme="red" onClick={handleDelete} ml={3}>
                                    削除する
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialogOverlay>
                </AlertDialog>

                {/* 材料編集モーダル */}
                <Modal isOpen={isEditModalOpen} onClose={onEditModalClose}>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>材料名の編集</ModalHeader>
                        <ModalBody>
                            <FormControl>
                                <FormLabel>新しい材料名</FormLabel>
                                <Input
                                    value={editingMaterial?.name || ''}
                                    onChange={e => setEditingMaterial(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    placeholder="例: とりむね肉"
                                />
                            </FormControl>
                        </ModalBody>
                        <ModalFooter>
                            <Button colorScheme="gray" mr={3} onClick={onEditModalClose}>
                                キャンセル
                            </Button>
                            <Button
                                colorScheme="blue"
                                onClick={handleUpdateMaterial}
                                isDisabled={!editingMaterial?.name.trim()}
                            >
                                更新
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>

                {/* 材料追加モーダル */}
                <Modal isOpen={isAddMaterialModalOpen} onClose={onAddMaterialModalClose}>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>新しい材料の追加</ModalHeader>
                        <ModalBody>
                            <FormControl>
                                <FormLabel>材料名</FormLabel>
                                <Input
                                    value={newMaterialName}
                                    onChange={e => setNewMaterialName(e.target.value)}
                                    placeholder="例: とり肉"
                                />
                            </FormControl>
                        </ModalBody>
                        <ModalFooter>
                            <Button colorScheme="gray" mr={3} onClick={onAddMaterialModalClose}>
                                キャンセル
                            </Button>
                            <Button
                                colorScheme="teal"
                                onClick={handleAddMaterial}
                                isDisabled={!newMaterialName.trim()}
                            >
                                追加
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </Box>
        </Layout>
    );
};

export default SynonymManager;
