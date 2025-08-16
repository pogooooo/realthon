import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, ScrollView, TouchableOpacity, Dimensions, TextInput, Modal, TouchableWithoutFeedback, FlatList } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedGestureHandler,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';

// --- Constants ---
const { height, width } = Dimensions.get('window');
const PANEL_HEADER_HEIGHT = 60;
const MAX_PANEL_HEIGHT = height * 0.6;
const MIN_PANEL_HEIGHT = PANEL_HEADER_HEIGHT + 40;
const SNAP_TOP = -(MAX_PANEL_HEIGHT - MIN_PANEL_HEIGHT);
const SNAP_BOTTOM = 0;

// --- Layout Constants ---
const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;
const HORIZONTAL_SPACING = 80;
const VERTICAL_SPACING = 20;
const COLUMN_WIDTH = NODE_WIDTH + HORIZONTAL_SPACING;

// --- Initial Data ---
const initialTechData = [
    { id: '1', title: '자기 성찰', description: '나를 이해하는 첫 걸음', fullInfo: '자기 성찰은 자신의 생각, 감정, 행동을 깊이 들여다보는 과정입니다. 이를 통해 개인적인 가치관을 확립하고, 더 나은 의사결정을 내릴 수 있습니다.', unlocks: ['2.1', '2.2', '2.3'] },
    { id: '2.1', title: '가치관 정립', description: '인생의 나침반', fullInfo: '자신이 중요하게 생각하는 가치를 명확히 하는 과정입니다.', unlocks: ['3.1'] },
    { id: '2.2', title: '감정 일기', description: '마음의 소리 듣기', fullInfo: '매일의 감정을 기록하며 자신을 더 깊이 이해합니다.', unlocks: ['3.2'] },
    { id: '2.3', title: '강점 찾기', description: '나의 무기 발견', fullInfo: '자신의 강점을 인지하고 활용하는 것은 자신감을 높이는 데 큰 도움이 됩니다.', unlocks: ['3.2', '3.1'] },
    { id: '3.1', title: '목표 설정', description: '나아갈 방향을 정하다', fullInfo: '명확하고 현실적인 목표를 설정하는 것은 동기 부여의 핵심입니다. SMART 원칙을 활용하여 구체적인 계획을 세워보세요.', unlocks: ['4.1'] },
    { id: '3.2', title: '건강한 습관', description: '몸과 마음의 균형', fullInfo: '규칙적인 운동, 균형 잡힌 식단, 충분한 수면은 성공적인 삶의 기반이 됩니다.', unlocks: ['4.1'] },
    { id: '4.1', title: '지속적인 성장', description: '어제보다 나은 오늘', fullInfo: '성장은 목적지가 아닌 여정입니다. 새로운 것을 배우고, 실패로부터 교훈을 얻으며, 끊임없이 자신을 발전시키려는 자세가 당신을 더 높은 곳으로 이끌 것입니다.', unlocks: [] },
];

const initialTechTreeLayout = [
    [{ id: '1' }],
    [{ id: '2.1' }, { id: '2.2' }, { id: '2.3' }],
    [{ id: '3.1' }, { id: '3.2' }],
    [{ id: '4.1' }],
];

type Tech = typeof initialTechData[0];
type GestureContext = { startY: number };
type MenuState = { visible: boolean; x: number; y: number; nodeId: string | null };
type ParentModalState = { visible: boolean; childId: string | null; potentialParents: Tech[] };

// --- Main Component ---
export default function MapScreen() {
    const [techData, setTechData] = useState(initialTechData);
    const [techTreeLayout, setTechTreeLayout] = useState(initialTechTreeLayout);
    const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
    const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0, nodeId: null });
    const [parentModal, setParentModal] = useState<ParentModalState>({ visible: false, childId: null, potentialParents: [] });
    const translateY = useSharedValue(0);
    const mapTranslateY = useSharedValue(0);

    const nodePositions = useMemo(() => {
        const positions = new Map<string, { x: number; y: number }>();
        const mapHeight = height * 0.55;
        techTreeLayout.forEach((column, colIndex) => {
            const columnHeight = column.length * (NODE_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING;
            const startY = (mapHeight - columnHeight) / 2;
            column.forEach((node, nodeIndex) => {
                positions.set(node.id, {
                    x: colIndex * COLUMN_WIDTH + HORIZONTAL_SPACING / 2,
                    y: startY + nodeIndex * (NODE_HEIGHT + VERTICAL_SPACING),
                });
            });
        });
        return positions;
    }, [techTreeLayout]);

    const deselectTechNode = () => setSelectedTech(null);

    const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, GestureContext>({
        onStart: (_, ctx) => { ctx.startY = translateY.value; },
        onActive: (event, ctx) => {
            const newY = ctx.startY + event.translationY;
            translateY.value = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, newY));
        },
        onEnd: (event) => {
            'worklet';
            if (translateY.value < SNAP_TOP / 2 || event.velocityY < -500) {
                translateY.value = withSpring(SNAP_TOP, { damping: 15 });
                mapTranslateY.value = withSpring(-150);
            } else {
                translateY.value = withSpring(SNAP_BOTTOM, { damping: 15 });
                mapTranslateY.value = withSpring(0);
                runOnJS(deselectTechNode)();
            }
        },
    });

    const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const mapStyle = useAnimatedStyle(() => ({ transform: [{ translateY: mapTranslateY.value }] }));
    const contentOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateY.value, [SNAP_BOTTOM, SNAP_TOP], [0, 1], Extrapolate.CLAMP),
    }));

    const findTechById = (id: string) => techData.find(t => t.id === id);

    const handleNodePress = (tech: Tech) => {
        setSelectedTech(tech);
        translateY.value = withSpring(SNAP_TOP);
        mapTranslateY.value = withSpring(-150);
    };

    const handleInfoChange = (text: string) => {
        if (!selectedTech) return;
        setSelectedTech(current => current ? { ...current, fullInfo: text } : null);
        setTechData(prevData => prevData.map(t =>
            t.id === selectedTech.id ? { ...t, fullInfo: text } : t
        ));
    };

    const handleAddNewNode = (parentId: string) => {
        const newId = Date.now().toString();
        const newNode = { id: newId, title: '새로운 목표', description: '설명을 입력하세요', fullInfo: '', unlocks: [] };
        setTechData(prevData => [...prevData, newNode].map(t => t.id === parentId ? { ...t, unlocks: [...t.unlocks, newId] } : t));
        setTechTreeLayout(prevLayout => {
            const parentColIndex = prevLayout.findIndex(col => col.some(node => node.id === parentId));
            const newLayout = [...prevLayout.map(col => [...col])];
            if (parentColIndex + 1 >= newLayout.length) newLayout.push([]);
            newLayout[parentColIndex + 1].push({ id: newId });
            return newLayout;
        });
        setMenu({ ...menu, visible: false });
    };

    const handleDeleteNode = (idToDelete: string) => {
        setTechData(prevData =>
            prevData
                .map(tech => ({
                    ...tech,
                    unlocks: tech.unlocks.filter(id => id !== idToDelete),
                }))
                .filter(tech => tech.id !== idToDelete)
        );
        setTechTreeLayout(prevLayout =>
            prevLayout
                .map(col => col.filter(node => node.id !== idToDelete))
                .filter(col => col.length > 0)
        );
        if (selectedTech?.id === idToDelete) {
            translateY.value = withSpring(SNAP_BOTTOM);
            mapTranslateY.value = withSpring(0);
            setSelectedTech(null);
        }
        setMenu({ ...menu, visible: false });
    };

    const openParentSelector = (childId: string) => {
        const childColIndex = techTreeLayout.findIndex(col => col.some(node => node.id === childId));
        if (childColIndex > 0) {
            const parentColumn = techTreeLayout[childColIndex - 1];
            const potentialParents = parentColumn.map(node => findTechById(node.id)).filter(Boolean) as Tech[];
            setParentModal({ visible: true, childId, potentialParents });
        }
        setMenu({ ...menu, visible: false });
    };

    const handleSelectParent = (newParentId: string, childId: string) => {
        const parentColIndex = techTreeLayout.findIndex(col => col.some(node => node.id === newParentId));
        if (parentColIndex < 0) return;

        const siblingParentIds = new Set(techTreeLayout[parentColIndex].map(node => node.id));

        setTechData(prevData =>
            prevData.map(tech => {
                if (siblingParentIds.has(tech.id)) {
                    if (tech.id === newParentId) {
                        const newUnlocks = new Set(tech.unlocks);
                        newUnlocks.add(childId);
                        return { ...tech, unlocks: Array.from(newUnlocks) };
                    } else {
                        return { ...tech, unlocks: tech.unlocks.filter(id => id !== childId) };
                    }
                }
                return tech;
            })
        );
        setParentModal({ visible: false, childId: null, potentialParents: [] });
    };

    const openMenu = (nodeId: string, event: { absoluteX: number, absoluteY: number }) => {
        setMenu({ visible: true, x: event.absoluteX, y: event.absoluteY, nodeId });
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <Animated.View style={[styles.mapScrollContainer, mapStyle]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ width: techTreeLayout.length * COLUMN_WIDTH + 100 }}>
                            <View style={styles.mapContainer}>
                                <Svg style={StyleSheet.absoluteFill}>
                                    {techData.map(tech => {
                                        const startPos = nodePositions.get(tech.id);
                                        if (!startPos) return null;
                                        return tech.unlocks.map(unlockId => {
                                            const endPos = nodePositions.get(unlockId);
                                            if (!endPos) return null;
                                            const d = `M ${startPos.x + NODE_WIDTH} ${startPos.y + NODE_HEIGHT / 2} C ${startPos.x + NODE_WIDTH + HORIZONTAL_SPACING / 2} ${startPos.y + NODE_HEIGHT / 2}, ${endPos.x - HORIZONTAL_SPACING / 2} ${endPos.y + NODE_HEIGHT / 2}, ${endPos.x} ${endPos.y + NODE_HEIGHT / 2}`;
                                            return <Path key={`${tech.id}-${unlockId}`} d={d} stroke="#5C5C5C" strokeWidth="2" fill="none" />;
                                        });
                                    })}
                                </Svg>
                                {Array.from(nodePositions.entries()).map(([id, pos]) => {
                                    const tech = findTechById(id);
                                    if (!tech) return null;
                                    const isSelected = selectedTech?.id === id;
                                    return (
                                        <LongPressGestureHandler
                                            key={id}
                                            onHandlerStateChange={(event) => {
                                                if (event.nativeEvent.state === State.ACTIVE) {
                                                    openMenu(id, { absoluteX: event.nativeEvent.absoluteX, absoluteY: event.nativeEvent.absoluteY });
                                                }
                                            }}
                                            minDurationMs={500}
                                        >
                                            <TouchableOpacity
                                                style={[styles.techNode, { left: pos.x, top: pos.y }, isSelected && styles.highlightedNode]}
                                                onPress={() => handleNodePress(tech)}
                                            >
                                                <Ionicons name={isSelected ? "bulb" : "bulb-outline"} size={24} color={isSelected ? '#fff' : '#EAEAEA'} />
                                                <View style={styles.techTextContainer}>
                                                    <Text style={styles.techTitle}>{tech.title}</Text>
                                                    <Text style={styles.techDescription}>{tech.description}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </LongPressGestureHandler>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </Animated.View>

                    <PanGestureHandler onGestureEvent={gestureHandler}>
                        <Animated.View style={[styles.infoPanel, panelStyle]}>
                            <View style={styles.panelHeader}>
                                <View style={styles.panelHandle} />
                                <Text style={styles.panelTitle}>{selectedTech?.title || '항목을 선택하세요'}</Text>
                            </View>
                            <Animated.ScrollView style={styles.panelContent}>
                                <Animated.View style={contentOpacityStyle}>
                                    <TextInput
                                        style={styles.panelFullInfoInput}
                                        value={selectedTech?.fullInfo}
                                        onChangeText={handleInfoChange}
                                        multiline
                                    />
                                </Animated.View>
                            </Animated.ScrollView>
                        </Animated.View>
                    </PanGestureHandler>

                    {menu.visible && (
                        <TouchableWithoutFeedback onPress={() => setMenu({ ...menu, visible: false })}>
                            <View style={StyleSheet.absoluteFill}>
                                <View style={[styles.contextMenu, { top: menu.y, left: menu.x }]}>
                                    <TouchableOpacity style={styles.menuItem} onPress={() => menu.nodeId && handleAddNewNode(menu.nodeId)}>
                                        <Ionicons name="add-circle-outline" size={22} color="#495057" />
                                        <Text style={styles.menuText}>새 노트 추가</Text>
                                    </TouchableOpacity>
                                    <View style={styles.menuSeparator} />
                                    <TouchableOpacity style={styles.menuItem} onPress={() => menu.nodeId && openParentSelector(menu.nodeId)}>
                                        <Ionicons name="arrow-up-circle-outline" size={22} color="#495057" />
                                        <Text style={styles.menuText}>상단 노트 연결</Text>
                                    </TouchableOpacity>
                                    <View style={styles.menuSeparator} />
                                    <TouchableOpacity style={styles.menuItem} onPress={() => menu.nodeId && handleDeleteNode(menu.nodeId)}>
                                        <Ionicons name="trash-outline" size={22} color="#E03131" />
                                        <Text style={[styles.menuText, { color: '#E03131' }]}>노트 삭제</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    )}

                    <AnimatePresence>
                        {parentModal.visible && (
                            <Modal transparent visible={parentModal.visible} animationType="fade" onRequestClose={() => setParentModal({ ...parentModal, visible: false })}>
                                <View style={styles.modalCenterOverlay}>
                                    <MotiView
                                        from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                        exit={{ opacity: 0, scale: 0.85, translateY: 20 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                        style={styles.parentSelectorModal}
                                    >
                                        <TouchableOpacity onPress={() => setParentModal({ ...parentModal, visible: false })} style={styles.modalCloseButton}>
                                            <Ionicons name="close" size={24} color="#868E96" />
                                        </TouchableOpacity>
                                        <Text style={styles.parentSelectorTitle}>상위 노트 연결</Text>
                                        <FlatList
                                            data={parentModal.potentialParents}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity style={styles.parentItem} onPress={() => parentModal.childId && handleSelectParent(item.id, parentModal.childId)}>
                                                    <Text style={styles.parentItemText}>{item.title}</Text>
                                                </TouchableOpacity>
                                            )}
                                            ItemSeparatorComponent={() => <View style={styles.menuSeparator} />}
                                        />
                                    </MotiView>
                                </View>
                            </Modal>
                        )}
                    </AnimatePresence>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#181A1E' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#181A1E' },
    mapScrollContainer: {
        height: height * 0.55,
        position: 'absolute',
        top: (height * 0.45) / 2 - (MIN_PANEL_HEIGHT / 2),
    },
    mapContainer: { flex: 1, position: 'relative' },
    techNode: {
        position: 'absolute',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: '#212529',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#343A40',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    highlightedNode: {
        borderColor: '#A19ECA',
        shadowColor: '#A19ECA',
        shadowOpacity: 0.7,
    },
    techTextContainer: { marginLeft: 10, flex: 1 },
    techTitle: { fontSize: 16, fontWeight: 'bold', color: '#F8F9FA' },
    techDescription: { fontSize: 12, color: '#ADB5BD', marginTop: 2 },
    infoPanel: {
        position: 'absolute',
        bottom: -MAX_PANEL_HEIGHT + MIN_PANEL_HEIGHT,
        width: '100%',
        height: MAX_PANEL_HEIGHT,
        backgroundColor: '#212529',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    panelHeader: {
        height: PANEL_HEADER_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#343A40',
    },
    panelHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#495057',
        borderRadius: 3,
        position: 'absolute',
        top: 10,
    },
    panelTitle: { fontSize: 18, fontWeight: '600', color: '#F8F9FA' },
    panelContent: { flex: 1, paddingHorizontal: 24, paddingVertical: 12 },
    panelFullInfoInput: {
        fontSize: 16,
        lineHeight: 24,
        color: '#E9ECEF',
        textAlignVertical: 'top'
    },
    contextMenu: {
        position: 'absolute',
        backgroundColor: '#343A40',
        borderRadius: 8,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#495057',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    menuText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#F8F9FA',
    },
    menuSeparator: {
        height: 1,
        backgroundColor: '#495057',
        marginHorizontal: 5,
    },
    modalCenterOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    parentSelectorModal: {
        width: '85%',
        backgroundColor: '#212529',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: '70%',
        borderWidth: 1,
        borderColor: '#343A40',
    },
    parentSelectorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginBottom: 20,
    },
    parentItem: {
        paddingVertical: 15,
        width: '100%',
    },
    parentItemText: {
        fontSize: 16,
        textAlign: 'center',
        color: '#E9ECEF',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
    },
});
