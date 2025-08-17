import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, TextInput, FlatList, TouchableWithoutFeedback } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedGestureHandler,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS,
    WithSpringConfig,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../../components/ui/CustomModal'; // CustomModal 경로를 확인해주세요.
import { useTechTree, Tech, NODE_STATUS } from '../../hooks/useTechTree'; // 타입과 함께 훅을 가져옵니다.

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

type GestureContext = {
    startY: number;
};

// --- Main Component ---
export default function MapScreen() {
    const {
        techData,
        techTreeLayout,
        selectedTech,
        setSelectedTech,
        menu,
        setMenu,
        parentModal,
        highlightedAncestorIds,
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
    } = useTechTree();

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

    const deselectTechNode = useCallback(() => {
        setSelectedTech(null);
    }, [setSelectedTech]);

    const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, GestureContext>({
        onStart: (_, ctx) => {
            ctx.startY = translateY.value;
        },
        onActive: (event, ctx) => {
            const newY = ctx.startY + event.translationY;
            translateY.value = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, newY));
        },
        onEnd: (event) => {
            const springConfig: WithSpringConfig = { damping: 15 };
            if (translateY.value < SNAP_TOP / 2 || event.velocityY < -500) {
                translateY.value = withSpring(SNAP_TOP, springConfig);
                mapTranslateY.value = withSpring(-150, springConfig);
            } else {
                translateY.value = withSpring(SNAP_BOTTOM, springConfig);
                mapTranslateY.value = withSpring(0, springConfig);
                runOnJS(deselectTechNode)();
            }
        },
    });

    const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const mapStyle = useAnimatedStyle(() => ({ transform: [{ translateY: mapTranslateY.value }] }));
    const contentOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateY.value, [SNAP_BOTTOM, SNAP_TOP], [0, 1], Extrapolate.CLAMP),
    }));

    const openMenu = (nodeId: string, event: { absoluteX: number, absoluteY: number }) => {
        setMenu({ visible: true, x: event.absoluteX, y: event.absoluteY, nodeId });
    };

    const handleNodePress = (tech: Tech) => {
        setSelectedTech(tech);
        const springConfig: WithSpringConfig = { damping: 15 };
        translateY.value = withSpring(SNAP_TOP, springConfig);
        mapTranslateY.value = withSpring(-150, springConfig);
    };

    const getNodeStyle = (tech: Tech) => {
        const style: any[] = [styles.techNode];
        if (tech.isFocused) {
            style.push(styles.focusedNode);
        } else if (highlightedAncestorIds.has(tech.id)) {
            style.push(styles.ancestorNode);
        } else {
            switch (tech.status) {
                case NODE_STATUS.IN_PROGRESS:
                    style.push(styles.inProgressNode);
                    break;
                case NODE_STATUS.COMPLETED:
                    style.push(styles.completedNode);
                    break;
                default:
                    break;
            }
        }
        if (selectedTech?.id === tech.id) {
            style.push(styles.highlightedNode);
        }
        return style;
    };

    const focusedNode = techData.find(n => n.isFocused);
    const hotSet = useMemo(() => {
        if (!focusedNode) return new Set<string>();
        return new Set([focusedNode.id, ...highlightedAncestorIds]);
    }, [focusedNode, highlightedAncestorIds]);

    // ✅ 선택된 노트의 내용을 부제목과 본문으로 분리
    const { description: currentDescription, body: currentBody } = useMemo(() => {
        if (!selectedTech?.fullInfo) return { description: '', body: '' };
        const parts = selectedTech.fullInfo.split('\n');
        const description = parts[0] || '';
        const body = parts.slice(1).join('\n');
        return { description, body };
    }, [selectedTech]);

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
                                            const isHotEdge = hotSet.has(tech.id) && hotSet.has(unlockId);
                                            return <Path key={`${tech.id}-${unlockId}`} d={d} stroke={isHotEdge ? "#FFD700" : "#5C5C5C"} strokeWidth={isHotEdge ? 2.5 : 2} fill="none" />;
                                        });
                                    })}
                                </Svg>
                                {Array.from(nodePositions.entries()).map(([id, pos]) => {
                                    const tech = findTechById(id);
                                    if (!tech) return null;
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
                                                style={[getNodeStyle(tech), { left: pos.x, top: pos.y }]}
                                                onPress={() => handleNodePress(tech)}
                                            >
                                                <Ionicons name={selectedTech?.id === id ? "bulb" : "bulb-outline"} size={24} color={tech.isFocused || highlightedAncestorIds.has(tech.id) ? '#fff' : '#EAEAEA'} />
                                                <View style={styles.techTextContainer}>
                                                    <Text style={[styles.techTitle, (tech.isFocused || highlightedAncestorIds.has(tech.id)) && { color: '#fff' }]}>{tech.title}</Text>
                                                    <Text style={styles.techDescription} numberOfLines={1}>{tech.description}</Text>
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
                                {selectedTech ? (
                                    <TextInput
                                        style={styles.panelTitleInput}
                                        value={selectedTech.title}
                                        onChangeText={(text) => handleTitleChange(selectedTech.id, text)}
                                        placeholder="노트 제목"
                                        placeholderTextColor="#868E96"
                                    />
                                ) : (
                                    <Text style={styles.panelTitle}>항목을 선택하세요</Text>
                                )}
                            </View>
                            <Animated.ScrollView style={styles.panelContent}>
                                <Animated.View style={contentOpacityStyle}>
                                    {selectedTech && (
                                        <>
                                            <View style={styles.statusSelectorContainer}>
                                                {(Object.values(NODE_STATUS)).map(status => (
                                                    <TouchableOpacity
                                                        key={status}
                                                        style={[styles.statusPill, selectedTech.status === status && styles.statusPillActive]}
                                                        onPress={() => handleChangeStatus(selectedTech.id, status)}
                                                    >
                                                        <Text style={[styles.statusPillText, selectedTech.status === status && styles.statusPillTextActive]}>
                                                            {status === 'pending' ? '대기중' : status === 'inProgress' ? '진행중' : '완료'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            {/* ✅ 부제목과 본문 입력창 분리 */}
                                            <TextInput
                                                style={styles.panelSubtitleInput}
                                                value={currentDescription}
                                                onChangeText={(newDescription) => {
                                                    handleInfoChange(newDescription + '\n' + currentBody);
                                                }}
                                                placeholder="부제목"
                                                placeholderTextColor="#868E96"
                                            />
                                            <View style={styles.inputSeparator} />
                                            <TextInput
                                                style={styles.panelBodyInput}
                                                value={currentBody}
                                                onChangeText={(newBody) => {
                                                    handleInfoChange(currentDescription + '\n' + newBody);
                                                }}
                                                multiline
                                                placeholder="내용을 입력하세요..."
                                                placeholderTextColor="#868E96"
                                            />
                                        </>
                                    )}
                                </Animated.View>
                            </Animated.ScrollView>
                        </Animated.View>
                    </PanGestureHandler>

                    {menu.visible && (
                        <TouchableWithoutFeedback onPress={() => setMenu(prev => ({ ...prev, visible: false }))}>
                            <View style={StyleSheet.absoluteFill}>
                                <View
                                    style={[styles.contextMenu, { top: menu.y, left: menu.x }]}
                                    onStartShouldSetResponder={() => true}
                                >
                                    <TouchableOpacity style={styles.menuItem} onPress={() => menu.nodeId && handleSetFocus(menu.nodeId)}>
                                        <Ionicons name="locate-outline" size={22} color="#CED4DA" />
                                        <Text style={styles.menuText}>노트 활성화 (포커스)</Text>
                                    </TouchableOpacity>
                                    <View style={styles.menuSeparator} />
                                    <TouchableOpacity style={styles.menuItem} onPress={() => menu.nodeId && handleAddNewNode(menu.nodeId)}>
                                        <Ionicons name="add-circle-outline" size={22} color="#CED4DA" />
                                        <Text style={styles.menuText}>새 노트 추가</Text>
                                    </TouchableOpacity>
                                    <View style={styles.menuSeparator} />
                                    <TouchableOpacity style={styles.menuItem} onPress={() => menu.nodeId && openParentSelector(menu.nodeId)}>
                                        <Ionicons name="arrow-up-circle-outline" size={22} color="#CED4DA" />
                                        <Text style={styles.menuText}>상위 노트 연결</Text>
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

                    <CustomModal
                        visible={parentModal.visible}
                        onClose={closeModal}
                        title="상위 노트 연결"
                        footer={
                            <>
                                <TouchableOpacity style={[styles.footerBtn, styles.footerCancel]} onPress={closeModal}>
                                    <Text style={styles.footerBtnText}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.footerBtn, styles.footerSave]} onPress={saveParentConnections}>
                                    <Ionicons name="save-outline" size={18} color="#0B0C0E" />
                                    <Text style={[styles.footerBtnText, { color: '#0B0C0E', marginLeft: 6 }]}>저장</Text>
                                </TouchableOpacity>
                            </>
                        }
                    >
                        <FlatList
                            data={parentModal.potentialParents}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const isSelected = parentModal.selectedParentIds.includes(item.id);
                                return (
                                    <TouchableOpacity style={styles.parentRow} onPress={() => toggleSelectParent(item.id)}>
                                        <Text style={[styles.parentItemText, isSelected && { color: '#F8F9FA', fontWeight: '500' }]}>{item.title}</Text>
                                        <Ionicons
                                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={24}
                                            color={isSelected ? '#A19ECA' : '#495078'}
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                            ItemSeparatorComponent={() => <View style={styles.menuSeparator} />}
                            ListEmptyComponent={<Text style={styles.emptyListText}>연결 가능한 상위 노트가 없습니다.</Text>}
                        />
                    </CustomModal>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

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
    },
    inProgressNode: {
        backgroundColor: '#2A2F3B',
    },
    completedNode: {
        backgroundColor: '#2B3B34',
    },
    focusedNode: {
        backgroundColor: '#4d3800',
        borderColor: '#FFD700',
        borderWidth: 2,
        shadowColor: '#FFC700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 16,
    },
    ancestorNode: {
        borderColor: 'rgba(255, 215, 0, 0.5)',
        shadowColor: '#FFC700',
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 12,
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
    panelTitleInput: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8F9FA',
        textAlign: 'center',
        width: '80%',
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#343A40',
    },
    panelContent: { flex: 1, paddingHorizontal: 24, paddingVertical: 12 },
    statusSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingVertical: 10,
        backgroundColor: '#181A1E',
        borderRadius: 12,
    },
    statusPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#495057',
    },
    statusPillActive: {
        backgroundColor: '#A19ECA',
        borderColor: '#A19ECA',
    },
    statusPillText: {
        color: '#ADB5BD',
        fontWeight: '600',
    },
    statusPillTextActive: {
        color: '#181A1E',
    },
    // ✅ 부제목과 본문 입력창 스타일
    panelSubtitleInput: {
        fontSize: 16,
        fontWeight: '500',
        color: '#EAEAEA',
        paddingBottom: 12,
    },
    inputSeparator: {
        height: 1,
        backgroundColor: '#343A40',
        marginBottom: 12,
    },
    panelBodyInput: {
        fontSize: 16,
        lineHeight: 24,
        color: '#E9ECEF',
        textAlignVertical: 'top',
        minHeight: 150, // 최소 높이 지정
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
        zIndex: 1001,
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
        marginVertical: 4,
    },
    emptyListText: {
        textAlign: 'center',
        color: '#868E96',
        paddingVertical: 20,
    },
    parentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    parentItemText: {
        fontSize: 16,
        color: '#ADB5BD',
    },
    footerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginLeft: 8,
    },
    footerCancel: {
        backgroundColor: '#343A40',
    },
    footerSave: {
        backgroundColor: '#A19ECA',
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F8F9FA',
    },
});
