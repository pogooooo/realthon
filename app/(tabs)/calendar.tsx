import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Platform,
    StatusBar,
    Dimensions,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
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
import CustomModal from '../../components/ui/CustomModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---
type Event = { id: number; title: string; memo: string };
type Events = { [key: string]: Event[] };
type DailyAnswers = { [key: string]: string };
type GestureContext = { startY: number };

// --- Constants & Helpers ---
const { height } = Dimensions.get('window');
const PANEL_HEADER_HEIGHT = 80;
const MAX_PANEL_HEIGHT = height * 0.7; // 패널 높이 약간 증가
const MIN_PANEL_HEIGHT = PANEL_HEADER_HEIGHT + 40;
const SNAP_TOP = -(MAX_PANEL_HEIGHT - MIN_PANEL_HEIGHT);
const SNAP_BOTTOM = 0;
const today = new Date();

const dailyQuestions = [
    "오늘 당신은 어땠나요?", "조금 더 나은 나를 위해 한 일이 있나요?", "오늘 하루 가장 감사했던 순간은 언제였나요?",
    "최근 당신을 웃게 만든 것은 무엇인가요?", "내일의 나에게 어떤 응원의 말을 해주고 싶나요?",
];

const getISODateString = (date: Date): string => date.toISOString().split('T')[0];

const getQuestionForDate = (date: Date): string => {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dailyQuestions[dayOfYear % dailyQuestions.length];
};

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [modalVisible, setModalVisible] = useState(false);
    const [events, setEvents] = useState<Events>({});
    const [dailyAnswers, setDailyAnswers] = useState<DailyAnswers>({}); // ✅ 일일 답변 상태
    const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({ title: '', memo: '' });

    const translateY = useSharedValue(SNAP_BOTTOM);

    // ✅ 앱 시작 시 모든 이벤트와 답변을 불러옵니다.
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const allKeys = await AsyncStorage.getAllKeys();
                const allData = await AsyncStorage.multiGet(allKeys);

                const loadedEvents: Events = {};
                const loadedAnswers: DailyAnswers = {};

                allData.forEach(([key, value]) => {
                    if (value) {
                        if (key.startsWith('@event:')) {
                            loadedEvents[key.replace('@event:', '')] = JSON.parse(value);
                        } else if (key.startsWith('@dailyAnswer:')) {
                            loadedAnswers[key.replace('@dailyAnswer:', '')] = value;
                        }
                    }
                });
                setEvents(loadedEvents);
                setDailyAnswers(loadedAnswers);
            } catch (e) {
                console.error("Failed to load initial data.", e);
            }
        };
        loadInitialData();
    }, []);

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

    const handleSaveEvent = useCallback(async () => {
        if (!selectedDate || !currentEvent.title?.trim()) {
            Alert.alert("알림", "제목을 입력해주세요.");
            return;
        }
        const key = getISODateString(selectedDate);
        const storageKey = `@event:${key}`;

        const dayEvents = events[key] || [];
        let updatedDayEvents;

        if (currentEvent.id) {
            updatedDayEvents = dayEvents.map(event =>
                event.id === currentEvent.id ? { ...event, ...currentEvent } as Event : event
            );
        } else {
            const newEvent = { ...currentEvent, id: Date.now() } as Event;
            updatedDayEvents = [...dayEvents, newEvent];
        }

        const newEvents = { ...events, [key]: updatedDayEvents };
        setEvents(newEvents);
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDayEvents));
        setModalVisible(false);
    }, [currentEvent, selectedDate, events]);

    const handleDeleteEvent = useCallback(async () => {
        if (!selectedDate || !currentEvent.id) return;
        const key = getISODateString(selectedDate);
        const storageKey = `@event:${key}`;

        const dayEvents = events[key] || [];
        const updatedDayEvents = dayEvents.filter(event => event.id !== currentEvent.id);
        const newEvents = { ...events };

        if (updatedDayEvents.length > 0) {
            newEvents[key] = updatedDayEvents;
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDayEvents));
        } else {
            delete newEvents[key];
            await AsyncStorage.removeItem(storageKey);
        }
        setEvents(newEvents);
        setModalVisible(false);
    }, [currentEvent.id, selectedDate, events]);

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

    const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const contentOpacityStyle = useAnimatedStyle(() => ({ opacity: interpolate(translateY.value, [SNAP_BOTTOM, SNAP_TOP], [0, 1], Extrapolate.CLAMP) }));

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const calendarDays: (number | null)[] = Array(firstDayOfMonth).fill(null);
        for (let i = 1; i <= daysInMonth; i++) { calendarDays.push(i); }

        return (
            <View style={styles.calendarGrid}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => <Text key={day} style={styles.dayOfWeekText}>{day}</Text>)}
                {calendarDays.map((day, index) => {
                    if (!day) return <View key={index} style={styles.dayCellContainer} />;

                    const date = new Date(year, month, day);
                    const dateKey = getISODateString(date);
                    const isToday = dateKey === getISODateString(today);
                    const isSelected = selectedDate ? dateKey === getISODateString(selectedDate) : false;
                    const hasEvent = events[dateKey] && events[dateKey].length > 0;
                    const hasAnswer = !!dailyAnswers[dateKey];

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
                                        <View style={styles.dotContainer}>
                                            {hasEvent && <MotiView style={styles.eventDot} from={{ scale: 0 }} animate={{ scale: 1 }} />}
                                            {hasAnswer && <MotiView style={styles.answerDot} from={{ scale: 0 }} animate={{ scale: 1 }} />}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </MotiView>
                        </View>
                    )
                })}
            </View>
        );
    };

    const selectedKey = selectedDate ? getISODateString(selectedDate) : '';
    const selectedDayEvents = events[selectedKey] || [];
    const selectedDayAnswer = dailyAnswers[selectedKey];
    const selectedDayQuestion = selectedDate ? getQuestionForDate(selectedDate) : '';
    const dayOfWeek = selectedDate ? ['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()] : '';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.calendarContainer}>
                    <View style={styles.monthHeader}>
                        <TouchableOpacity onPress={() => handleMonthChange(-1)}><Feather name="chevron-left" size={28} color="#ADB5BD" /></TouchableOpacity>
                        <Text style={styles.monthText}>{`${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`}</Text>
                        <TouchableOpacity onPress={() => handleMonthChange(1)}><Feather name="chevron-right" size={28} color="#ADB5BD" /></TouchableOpacity>
                    </View>
                    {renderCalendar()}
                </View>

                <PanGestureHandler onGestureEvent={gestureHandler}>
                    <Animated.View style={[styles.todoSection, panelStyle]}>
                        <View style={styles.panelHandleContainer}><View style={styles.panelHandle} /></View>
                        <View style={styles.todoHeader}>
                            <Text style={styles.todoTitle}>{selectedDate ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${dayOfWeek})` : '날짜를 선택하세요'}</Text>
                            <TouchableOpacity onPress={handleOpenModalForNew} disabled={!selectedDate}><Feather name="plus-circle" size={24} color={selectedDate ? "#A178DF" : "#495057"} /></TouchableOpacity>
                        </View>
                        <Animated.ScrollView style={[styles.eventList, contentOpacityStyle]}>
                            {selectedDayAnswer && (
                                <View style={styles.answerContainer}>
                                    <View style={styles.answerHeader}>
                                        <Feather name="help-circle" size={18} color="#A19ECA" />
                                        <Text style={styles.answerTitle}>그날의 질문</Text>
                                    </View>
                                    <Text style={styles.answerQuestionText}>{selectedDayQuestion}</Text>
                                    <Text style={styles.answerText}>{selectedDayAnswer}</Text>
                                </View>
                            )}
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
                                !selectedDayAnswer && <Text style={styles.noEventText}>{selectedDate ? '등록된 기록이 없습니다.' : ''}</Text>
                            )}
                        </Animated.ScrollView>
                    </Animated.View>
                </PanGestureHandler>

                <CustomModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    title={currentEvent.id ? '일정 수정' : '일정 추가'}
                    footer={
                        <View style={styles.modalFooterContent}>
                            {currentEvent.id && (<TouchableOpacity onPress={handleDeleteEvent} style={styles.deleteButton}><Feather name="trash-2" size={20} color="#E03131" /></TouchableOpacity>)}
                            <TouchableOpacity onPress={handleSaveEvent} style={{ flex: 1 }}><MotiView whileTap={{ scale: 0.95 }} style={{ width: '100%' }}><LinearGradient colors={['#845EC2', '#A178DF']} style={styles.saveButton}><Text style={styles.saveButtonText}>저장</Text></LinearGradient></MotiView></TouchableOpacity>
                        </View>
                    }
                >
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: '100%' }}>
                        <Text style={styles.modalLabel}>제목</Text>
                        <TextInput style={styles.input} placeholder="일정을 입력하세요" placeholderTextColor="#868E96" value={currentEvent.title} onChangeText={(text) => setCurrentEvent(prev => ({ ...prev, title: text }))} />
                        <Text style={styles.modalDateText}>{selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')} (${dayOfWeek})` : ''}</Text>
                        <Text style={styles.modalLabel}>메모</Text>
                        <TextInput style={[styles.input, styles.memoInput]} multiline placeholder="메모를 입력하세요" placeholderTextColor="#868E96" value={currentEvent.memo} onChangeText={(text) => setCurrentEvent(prev => ({ ...prev, memo: text }))} />
                    </KeyboardAvoidingView>
                </CustomModal>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#181A1E', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    calendarContainer: { paddingHorizontal: 20, marginTop: 20 },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    monthText: { fontSize: 28, fontWeight: 'bold', color: '#F8F9FA' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayOfWeekText: { width: `${100 / 7}%`, textAlign: 'center', marginBottom: 15, fontSize: 14, color: '#868E96' },
    dayCellContainer: { width: `${100 / 7}%`, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    dayCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    todayCell: { backgroundColor: '#212529', borderRadius: 20 },
    todayText: { fontWeight: 'bold', color: '#F8F9FA' },
    selectedDayCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, elevation: 4, shadowColor: '#FF7043', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    dayText: { fontSize: 16, color: '#ADB5BD' },
    selectedDayText: { color: '#FFFFFF', fontWeight: 'bold' },
    dotContainer: { flexDirection: 'row', position: 'absolute', bottom: 5 },
    eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#845EC2', marginHorizontal: 1.5 },
    answerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#20C997', marginHorizontal: 1.5 },
    todoSection: { position: 'absolute', bottom: -MAX_PANEL_HEIGHT + MIN_PANEL_HEIGHT, width: '100%', height: MAX_PANEL_HEIGHT, backgroundColor: '#212529', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, shadowRadius: 10, borderTopWidth: 1, borderColor: '#343A40' },
    panelHandleContainer: { height: 20, alignItems: 'center', justifyContent: 'center' },
    panelHandle: { width: 40, height: 5, backgroundColor: '#495057', borderRadius: 3 },
    todoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#343A40' },
    todoTitle: { fontSize: 18, fontWeight: '600', color: '#F8F9FA' },
    eventList: { paddingHorizontal: 20, paddingTop: 10 },
    answerContainer: { backgroundColor: '#181A1E', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#343A40' },
    answerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    answerTitle: { fontSize: 14, fontWeight: '500', color: '#ADB5BD', marginLeft: 8 },
    answerQuestionText: { fontSize: 16, fontWeight: '600', color: '#F8F9FA', marginBottom: 8, lineHeight: 22 },
    answerText: { fontSize: 15, color: '#CED4DA', lineHeight: 22 },
    eventItem: { backgroundColor: '#181A1E', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#343A40' },
    eventItemTitle: { fontSize: 16, fontWeight: 'bold', color: '#F8F9FA' },
    eventItemMemo: { fontSize: 14, color: '#ADB5BD', marginTop: 4 },
    noEventText: { textAlign: 'center', marginTop: 20, color: '#868E96', fontSize: 16 },
    modalLabel: { fontSize: 14, fontWeight: '600', color: '#868E96', marginBottom: 8, width: '100%' },
    input: { width: '100%', height: 45, backgroundColor: '#343A40', borderColor: '#495057', borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, fontSize: 16, color: '#F8F9FA' },
    memoInput: { height: 100, textAlignVertical: 'top', paddingTop: 15 },
    modalDateText: { fontSize: 16, color: '#ADB5BD', marginBottom: 20, alignSelf: 'center' },
    modalFooterContent: { flexDirection: 'row', width: '100%', alignItems: 'center' },
    saveButton: { width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    deleteButton: { padding: 12, marginRight: 10, borderRadius: 12, borderWidth: 1, borderColor: '#343A40' },
});
