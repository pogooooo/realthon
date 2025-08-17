import { useState, useMemo, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 타입 정의 ---
export const NODE_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'inProgress',
    COMPLETED: 'completed',
} as const;

export type NodeStatus = typeof NODE_STATUS[keyof typeof NODE_STATUS];

export interface Tech {
    id: string;
    title: string;
    description: string;
    fullInfo: string;
    unlocks: string[];
    status: NodeStatus;
    isFocused: boolean;
}

export interface MenuState {
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
}

export interface ParentModalState {
    visible: boolean;
    childId: string | null;
    potentialParents: Tech[];
    selectedParentIds: string[];
}

// --- 초기 데이터 (AsyncStorage에 데이터가 없을 때만 사용됨) ---
const initialTechData: Tech[] = [
    { id: '1', title: '자기 성찰', description: '나를 이해하는 첫 걸음', fullInfo: '나를 이해하는 첫 걸음\n\n자기 성찰은 자신의 생각, 감정, 행동을 깊이 들여다보는 과정입니다.', unlocks: ['2.1', '2.2', '2.3'], status: NODE_STATUS.PENDING, isFocused: false },
    { id: '2.1', title: '가치관 정립', description: '인생의 나침반', fullInfo: '인생의 나침반\n\n자신이 중요하게 생각하는 가치를 명확히 하는 과정입니다.', unlocks: ['3.1'], status: NODE_STATUS.PENDING, isFocused: false },
    { id: '2.2', title: '감정 일기', description: '마음의 소리 듣기', fullInfo: '마음의 소리 듣기\n\n매일의 감정을 기록하며 자신을 더 깊이 이해합니다.', unlocks: ['3.2'], status: NODE_STATUS.PENDING, isFocused: false },
    { id: '2.3', title: '강점 찾기', description: '나의 무기 발견', fullInfo: '나의 무기 발견\n\n자신의 강점을 인지하고 활용하는 것은 자신감을 높이는 데 큰 도움이 됩니다.', unlocks: ['3.2', '3.1'], status: NODE_STATUS.PENDING, isFocused: false },
    { id: '3.1', title: '목표 설정', description: '나아갈 방향을 정하다', fullInfo: '나아갈 방향을 정하다\n\n명확하고 현실적인 목표를 설정하는 것은 동기 부여의 핵심입니다.', unlocks: ['4.1'], status: NODE_STATUS.PENDING, isFocused: false },
    { id: '3.2', title: '건강한 습관', description: '몸과 마음의 균형', fullInfo: '몸과 마음의 균형\n\n규칙적인 운동, 균형 잡힌 식단, 충분한 수면은 성공적인 삶의 기반이 됩니다.', unlocks: ['4.1'], status: NODE_STATUS.PENDING, isFocused: false },
    { id: '4.1', title: '지속적인 성장', description: '어제보다 나은 오늘', fullInfo: '어제보다 나은 오늘\n\n성장은 목적지가 아닌 여정입니다.', unlocks: [], status: NODE_STATUS.PENDING, isFocused: false },
];

const initialTechTreeLayout: { id: string }[][] = [
    [{ id: '1' }],
    [{ id: '2.1' }, { id: '2.2' }, { id: '2.3' }],
    [{ id: '3.1' }, { id: '3.2' }],
    [{ id: '4.1' }],
];

const TECH_DATA_STORAGE_KEY = '@techTree:data';
const TECH_LAYOUT_STORAGE_KEY = '@techTree:layout';

// --- 커스텀 훅 ---
export const useTechTree = () => {
    const [techData, setTechData] = useState<Tech[]>([]);
    const [techTreeLayout, setTechTreeLayout] = useState<{ id: string }[][]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
    const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0, nodeId: null });
    const [parentModal, setParentModal] = useState<ParentModalState>({ visible: false, childId: null, potentialParents: [], selectedParentIds: [] });
    const [highlightedAncestorIds, setHighlightedAncestorIds] = useState(new Set<string>());

    useEffect(() => {
        const loadData = async () => {
            try {
                const storedData = await AsyncStorage.getItem(TECH_DATA_STORAGE_KEY);
                const storedLayout = await AsyncStorage.getItem(TECH_LAYOUT_STORAGE_KEY);
                setTechData(storedData ? JSON.parse(storedData) : initialTechData);
                setTechTreeLayout(storedLayout ? JSON.parse(storedLayout) : initialTechTreeLayout);
            } catch (e) {
                console.error("Failed to load tech tree data from storage", e);
                setTechData(initialTechData);
                setTechTreeLayout(initialTechTreeLayout);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const saveData = async () => {
            try {
                await AsyncStorage.setItem(TECH_DATA_STORAGE_KEY, JSON.stringify(techData));
                await AsyncStorage.setItem(TECH_LAYOUT_STORAGE_KEY, JSON.stringify(techTreeLayout));
            } catch (e) {
                console.error("Failed to save tech tree data to storage", e);
            }
        };
        saveData();
    }, [techData, techTreeLayout, isLoading]);

    const parentMap = useMemo(() => {
        const map = new Map<string, string[]>();
        techData.forEach(parent => {
            parent.unlocks.forEach(childId => {
                if (!map.has(childId)) {
                    map.set(childId, []);
                }
                map.get(childId)!.push(parent.id);
            });
        });
        return map;
    }, [techData]);

    useEffect(() => {
        const focusedNode = techData.find(node => node.isFocused);
        if (!focusedNode) {
            setHighlightedAncestorIds(new Set());
            return;
        }
        const ancestors = new Set<string>();
        const queue: string[] = [focusedNode.id];
        const visited = new Set<string>([focusedNode.id]);
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const parents = parentMap.get(currentId) || [];
            parents.forEach(parentId => {
                if (!visited.has(parentId)) {
                    ancestors.add(parentId);
                    visited.add(parentId);
                    queue.push(parentId);
                }
            });
        }
        setHighlightedAncestorIds(ancestors);
    }, [techData, parentMap]);

    const findTechById = useCallback((id: string): Tech | undefined => techData.find(t => t.id === id), [techData]);

    const handleInfoChange = (text: string) => {
        if (!selectedTech) return;

        // ✅ 노트 내용의 첫 줄을 추출하여 부제목(description)으로 설정
        const firstLine = text.split('\n')[0] || '';

        setTechData(prevData => prevData.map(t =>
            t.id === selectedTech.id ? { ...t, fullInfo: text, description: firstLine } : t
        ));
        setSelectedTech(prev => prev ? { ...prev, fullInfo: text, description: firstLine } : null);
    };

    const handleTitleChange = (nodeId: string, newTitle: string) => {
        setTechData(prevData =>
            prevData.map(tech =>
                tech.id === nodeId ? { ...tech, title: newTitle } : tech
            )
        );
        if (selectedTech?.id === nodeId) {
            setSelectedTech(prev => prev ? { ...prev, title: newTitle } : null);
        }
    };

    const handleAddNewNode = (parentId: string) => {
        const newId = Date.now().toString();
        // ✅ description을 빈 문자열로 초기화
        const newNode: Tech = { id: newId, title: '새로운 목표', description: '', fullInfo: '', unlocks: [], status: NODE_STATUS.PENDING, isFocused: false };
        setTechData(prevData => [...prevData, newNode].map(t => t.id === parentId ? { ...t, unlocks: [...t.unlocks, newId] } : t));
        setTechTreeLayout(prevLayout => {
            const parentColIndex = prevLayout.findIndex(col => col.some(node => node.id === parentId));
            const newLayout = [...prevLayout.map(col => [...col])];
            if (parentColIndex + 1 >= newLayout.length) {
                newLayout.push([]);
            }
            newLayout[parentColIndex + 1].push({ id: newId });
            return newLayout;
        });
        setMenu({ ...menu, visible: false });
    };

    const handleDeleteNode = (idToDelete: string) => {
        setTechData(prevData =>
            prevData
                .map(tech => ({ ...tech, unlocks: tech.unlocks.filter(id => id !== idToDelete) }))
                .filter(tech => tech.id !== idToDelete)
        );
        setTechTreeLayout(prevLayout =>
            prevLayout
                .map(col => col.filter(node => node.id !== idToDelete))
                .filter(col => col.length > 0)
        );
        if (selectedTech?.id === idToDelete) {
            setSelectedTech(null);
        }
        setMenu({ ...menu, visible: false });
    };

    const openParentSelector = (childId: string) => {
        const childColIndex = techTreeLayout.findIndex(col => col.some(node => node.id === childId));
        if (childColIndex > 0) {
            const parentColumn = techTreeLayout[childColIndex - 1];
            const potentialParents = parentColumn.map(node => findTechById(node.id)).filter((tech): tech is Tech => Boolean(tech));
            const currentlyConnectedIds = techData
                .filter(tech => potentialParents.some(p => p.id === tech.id) && tech.unlocks.includes(childId))
                .map(tech => tech.id);
            setParentModal({ visible: true, childId, potentialParents, selectedParentIds: currentlyConnectedIds });
        }
        setMenu({ ...menu, visible: false });
    };

    const toggleSelectParent = (parentId: string) => {
        setParentModal(current => {
            const selected = new Set(current.selectedParentIds);
            if (selected.has(parentId)) {
                selected.delete(parentId);
            } else {
                selected.add(parentId);
            }
            return { ...current, selectedParentIds: Array.from(selected) };
        });
    };

    const saveParentConnections = () => {
        const { childId, potentialParents, selectedParentIds } = parentModal;
        if (!childId) return;
        const selectedSet = new Set(selectedParentIds);
        setTechData(currentData =>
            currentData.map(tech => {
                if (potentialParents.some(p => p.id === tech.id)) {
                    const unlocks = new Set(tech.unlocks);
                    if (selectedSet.has(tech.id)) {
                        unlocks.add(childId);
                    } else {
                        unlocks.delete(childId);
                    }
                    return { ...tech, unlocks: Array.from(unlocks) };
                }
                return tech;
            })
        );
        closeModal();
    };

    const closeModal = useCallback(() => {
        setParentModal({ visible: false, childId: null, potentialParents: [], selectedParentIds: [] });
    }, []);

    const handleChangeStatus = (nodeId: string, newStatus: NodeStatus) => {
        setTechData(prevData =>
            prevData.map(tech =>
                tech.id === nodeId ? { ...tech, status: newStatus } : tech
            )
        );
        if (selectedTech?.id === nodeId) {
            setSelectedTech(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };

    const handleSetFocus = (nodeId: string) => {
        const newTechData = techData.map(tech => ({
            ...tech,
            isFocused: tech.id === nodeId,
        }));
        setTechData(newTechData);

        const newSelectedTech = newTechData.find(tech => tech.id === selectedTech?.id);
        if (newSelectedTech) {
            setSelectedTech(newSelectedTech);
        }

        setMenu({ ...menu, visible: false });
    };

    return {
        techData,
        techTreeLayout,
        selectedTech,
        setSelectedTech,
        menu,
        setMenu,
        parentModal,
        highlightedAncestorIds,
        isLoading,
        findTechById,
        handleInfoChange,
        handleTitleChange,
        handleAddNewNode,
        handleDeleteNode,
        openParentSelector,
        toggleSelectParent,
        saveParentConnections,
        closeModal,
        handleChangeStatus,
        handleSetFocus,
    };
};
