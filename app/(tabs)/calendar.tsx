import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    TextInput,
    Platform,
    StatusBar,
    Dimensions,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedGestureHandler,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';

// --- Types ---
type Event = { id: number; title: string; memo: string };
type Events = { [key: string]: Event[] };
type GestureContext = { startY: number };

// --- Constants ---
const { height } = Dimensions.get('window');
const PANEL_HEADER_HEIGHT = 80;
const MAX_PANEL_HEIGHT = height * 0.6;
const MIN_PANEL_HEIGHT = PANEL_HEADER_HEIGHT + 40;
const SNAP_TOP = -(MAX_PANEL_HEIGHT - MIN_PANEL_HEIGHT);
const SNAP_BOTTOM = 0;
const today = new Date();


const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [modalVisible, setModalVisible] = useState(false);
    const [events, setEvents] = useState<Events>({
        [`${today.getFullYear()}-${today.getMonth()}-${13}`]: [{ id: 1, title: '운동하기', memo: '헬스장 가기' }],
    });
    const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({ title: '', memo: '' });

    const translateY = useSharedValue(SNAP_BOTTOM);

    const handleDatePress = useCallback((day: number) => {
        const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(newSelectedDate);
        translateY.value = withSpring(SNAP_TOP, { damping: 15 });
    }, [currentDate, translateY]);

    const handleMonthChange = useCallback((increment: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
    }, []);

    const handleOpenModalForNew = useCallback(() => {
        setCurrentEvent({ title: '', memo: '' });
        setModalVisible(true);
    }, []);

    const handleOpenModalForEdit = useCallback((event: Event) => {
        setCurrentEvent(event);
        setModalVisible(true);
    }, []);

    const handleSaveEvent = useCallback(() => {
        if (!selectedDate || !currentEvent.title?.trim()) {
            Alert.alert("알림", "제목을 입력해주세요.");
            return;
        }
        const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;

        setEvents(prevEvents => {
            const dayEvents = prevEvents[key] || [];
            let updatedDayEvents;

            if (currentEvent.id) {
                updatedDayEvents = dayEvents.map(event =>
                    event.id === currentEvent.id ? { ...event, ...currentEvent } as Event : event
                );
            } else {
                const newEvent = { ...currentEvent, id: Date.now() } as Event;
                updatedDayEvents = [...dayEvents, newEvent];
            }
            return { ...prevEvents, [key]: updatedDayEvents };
        });

        setModalVisible(false);
    }, [currentEvent, selectedDate]);

    const handleDeleteEvent = useCallback(() => {
        if (!selectedDate || !currentEvent.id) return;

        const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;

        setEvents(prevEvents => {
            const dayEvents = prevEvents[key] || [];
            const updatedDayEvents = dayEvents.filter(event => event.id !== currentEvent.id);
            const newEvents = { ...prevEvents };
            if (updatedDayEvents.length > 0) {
                newEvents[key] = updatedDayEvents;
            } else {
                delete newEvents[key];
            }
            return newEvents;
        });

        setModalVisible(false);
    }, [currentEvent.id, selectedDate]);

    const deselectDate = useCallback(() => {
        setSelectedDate(null);
    }, []);

    const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, GestureContext>({
        onStart: (_, ctx) => { ctx.startY = translateY.value; },
        onActive: (event, ctx) => {
            translateY.value = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, event.translationY + ctx.startY));
        },
        onEnd: (event) => {
            if (translateY.value < SNAP_TOP / 2 || event.velocityY < -500) {
                translateY.value = withSpring(SNAP_TOP, { damping: 15 });
            } else {
                translateY.value = withSpring(SNAP_BOTTOM, { damping: 15 });
                runOnJS(deselectDate)();
            }
        },
    });

    const panelStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const contentOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateY.value, [SNAP_BOTTOM, SNAP_TOP], [0, 1], Extrapolate.CLAMP),
    }));

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const calendarDays: (number | null)[] = Array(firstDayOfMonth).fill(null);
        for (let i = 1; i <= daysInMonth; i++) { calendarDays.push(i); }

        return (
            <View style={styles.calendarGrid}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <Text key={day} style={styles.dayOfWeekText}>{day}</Text>
                ))}
                {calendarDays.map((day, index) => {
                    if (!day) {
                        return <View key={index} style={styles.dayCellContainer} />;
                    }

                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month;

                    return (
                        <View key={index} style={styles.dayCellContainer}>
                            <MotiView whileTap={{ scale: 0.85 }}>
                                <TouchableOpacity onPress={() => handleDatePress(day)}>
                                    <View style={[styles.dayCell, isToday && !isSelected && styles.todayCell]}>
                                        {isSelected ? (
                                            <LinearGradient colors={['#FF8A65', '#FF7043']} style={styles.selectedDayCell}>
                                                <Text style={[styles.dayText, styles.selectedDayText]}>{day}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
                                        )}
                                        {events[`${year}-${month}-${day}`] && (
                                            <MotiView style={styles.eventDot} from={{ scale: 0 }} animate={{ scale: 1 }} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </MotiView>
                        </View>
                    )
                })}
            </View>
        );
    };

    const selectedDayEvents = selectedDate ? events[`${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`] || [] : [];
    const dayOfWeek = selectedDate ? ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()] : '';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />

                <View style={styles.calendarContainer}>
                    <View style={styles.monthHeader}>
                        <TouchableOpacity onPress={() => handleMonthChange(-1)}>
                            <Feather name="chevron-left" size={28} color="#ADB5BD" />
                        </TouchableOpacity>
                        <Text style={styles.monthText}>{`${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`}</Text>
                        <TouchableOpacity onPress={() => handleMonthChange(1)}>
                            <Feather name="chevron-right" size={28} color="#ADB5BD" />
                        </TouchableOpacity>
                    </View>
                    {renderCalendar()}
                </View>

                <PanGestureHandler onGestureEvent={gestureHandler}>
                    <Animated.View style={[styles.todoSection, panelStyle]}>
                        <View style={styles.panelHandleContainer}>
                            <View style={styles.panelHandle} />
                        </View>
                        <View style={styles.todoHeader}>
                            <Text style={styles.todoTitle}>
                                {selectedDate ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${dayOfWeek})` : '날짜를 선택하세요'}
                            </Text>
                            <TouchableOpacity onPress={handleOpenModalForNew} disabled={!selectedDate}>
                                <Feather name="plus-circle" size={24} color={selectedDate ? "#A178DF" : "#495057"} />
                            </TouchableOpacity>
                        </View>
                        <Animated.ScrollView style={[styles.eventList, contentOpacityStyle]}>
                            {selectedDayEvents.length > 0 ? (
                                selectedDayEvents.map((event) => (
                                    <TouchableOpacity key={event.id} onPress={() => handleOpenModalForEdit(event)}>
                                        <View style={styles.eventItem}>
                                            <Text style={styles.eventItemTitle}>{event.title}</Text>
                                            <Text style={styles.eventItemMemo}>{event.memo}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.noEventText}>등록된 일정이 없습니다.</Text>
                            )}
                        </Animated.ScrollView>
                    </Animated.View>
                </PanGestureHandler>

                <AnimatePresence>
                    {modalVisible && (
                        <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === "ios" ? "padding" : "height"}
                                style={styles.modalOverlay}
                            >
                                <MotiView
                                    from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                    exit={{ opacity: 0, scale: 0.85, translateY: 20 }}
                                    transition={{ type: 'spring', damping: 15 }}
                                    style={styles.modalView}
                                >
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                        <Feather name="x" size={24} color="#868E96" />
                                    </TouchableOpacity>

                                    <Text style={styles.modalTitle}>제목</Text>
                                    <TextInput style={styles.input} placeholder="일정을 입력하세요" placeholderTextColor="#868E96" value={currentEvent.title} onChangeText={(text) => setCurrentEvent(prev => ({ ...prev, title: text }))} />
                                    <Text style={styles.modalDateText}>
                                        {selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')} (${dayOfWeek})` : ''}
                                    </Text>
                                    <Text style={styles.modalTitle}>메모</Text>
                                    <TextInput style={[styles.input, styles.memoInput]} multiline placeholder="메모를 입력하세요" placeholderTextColor="#868E96" value={currentEvent.memo} onChangeText={(text) => setCurrentEvent(prev => ({ ...prev, memo: text }))} />

                                    <View style={styles.buttonContainer}>
                                        {currentEvent.id && (
                                            <TouchableOpacity onPress={handleDeleteEvent} style={styles.deleteButton}>
                                                <Feather name="trash-2" size={20} color="#E03131" />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity onPress={handleSaveEvent} style={{flex: 1}}>
                                            <MotiView whileTap={{ scale: 0.95 }} style={{width: '100%'}}>
                                                <LinearGradient colors={['#845EC2', '#A178DF']} style={styles.saveButton}>
                                                    <Text style={styles.saveButtonText}>저장</Text>
                                                </LinearGradient>
                                            </MotiView>
                                        </TouchableOpacity>
                                    </View>
                                </MotiView>
                            </KeyboardAvoidingView>
                        </Modal>
                    )}
                </AnimatePresence>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    // Applying Design System Colors & Styles
    container: {
        flex: 1,
        backgroundColor: '#181A1E', // 가장 어두운 배경
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    calendarContainer: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    monthText: {
        fontSize: 28, // 화면 제목
        fontWeight: 'bold',
        color: '#F8F9FA', // 기본 텍스트
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayOfWeekText: {
        width: `${100 / 7}%`,
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 14,
        color: '#868E96', // 비활성/힌트 텍스트
    },
    dayCellContainer: {
        width: `${100 / 7}%`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    dayCell: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    todayCell: {
        backgroundColor: '#212529', // 카드 및 섹션 배경
        borderRadius: 20,
    },
    todayText: {
        fontWeight: 'bold',
        color: '#F8F9FA', // 기본 텍스트
    },
    selectedDayCell: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#FF7043',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    dayText: {
        fontSize: 16, // 기본 텍스트
        color: '#ADB5BD', // 보조 텍스트
    },
    selectedDayText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    eventDot: {
        position: 'absolute',
        bottom: 5,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#845EC2', // 주요 액션
    },
    todoSection: {
        position: 'absolute',
        bottom: -MAX_PANEL_HEIGHT + MIN_PANEL_HEIGHT,
        width: '100%',
        height: MAX_PANEL_HEIGHT,
        backgroundColor: '#212529', // 카드 및 섹션 배경
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        borderTopWidth: 1,
        borderColor: '#343A40',
    },
    panelHandleContainer: {
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    panelHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#495057',
        borderRadius: 3,
    },
    todoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#343A40', // 구분선
    },
    todoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8F9FA', // 기본 텍스트
    },
    eventList: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    eventItem: {
        backgroundColor: '#181A1E', // 가장 어두운 배경
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    eventItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F8F9FA'
    },
    eventItemMemo: {
        fontSize: 14,
        color: '#ADB5BD',
        marginTop: 4,
    },
    noEventText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#868E96',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // 모달 오버레이
    },
    modalView: {
        width: '85%',
        backgroundColor: '#212529', // 카드 및 섹션 배경
        borderRadius: 20, // 모달 둥근 모서리
        padding: 25,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#868E96',
        marginBottom: 8,
    },
    input: {
        width: '100%',
        height: 45,
        backgroundColor: '#343A40', // 입력 필드 배경
        borderColor: '#495057', // 입력 필드 테두리
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
        color: '#F8F9FA', // 입력 필드 텍스트 색상
    },
    memoInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 15,
    },
    modalDateText: {
        fontSize: 16,
        color: '#ADB5BD', // 보조 텍스트
        marginBottom: 20,
        alignSelf: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
    },
    saveButton: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 12, // 주요 버튼 둥근 모서리
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 12,
        marginRight: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
    },
});

export default Calendar;
