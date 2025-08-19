import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 타입 정의 ---
export interface DailyAnswer {
    q1: string;
    q2: 0 | 1 | null;
    q3: string;
}

export type Event = { id: number; title: string; memo: string };
export type Events = { [key: string]: Event[] };
export type DailyAnswers = { [key: string]: DailyAnswer | null };

interface DailyRecordsContextType {
    dailyAnswers: DailyAnswers;
    events: Events;
    isLoading: boolean;
    loadRecords: () => Promise<void>;
    saveDailyAnswer: (date: Date, answers: DailyAnswer) => Promise<void>;
    deleteDailyAnswer: (date: Date) => Promise<void>;
    saveEvent: (date: Date, event: Event) => Promise<void>;
    deleteEvent: (date: Date, eventId: number) => Promise<void>;
}

const DailyRecordsContext = createContext<DailyRecordsContextType | undefined>(undefined);

// --- Provider 컴포넌트 ---
export const DailyRecordsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dailyAnswers, setDailyAnswers] = useState<DailyAnswers>({});
    const [events, setEvents] = useState<Events>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const getISODateString = useCallback((date: Date): string => date.toISOString().split('T')[0], []);
    const getDailyAnswerStorageKey = useCallback((date: Date): string => `@dailyAnswer:${getISODateString(date)}`, [getISODateString]);
    const getEventStorageKey = useCallback((date: Date): string => `@event:${getISODateString(date)}`, [getISODateString]);

    // 모든 기록 불러오기
    const loadRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const allData = await AsyncStorage.multiGet(allKeys);

            const loadedAnswers: DailyAnswers = {};
            const loadedEvents: Events = {};

            allData.forEach(([key, value]) => {
                if (value) {
                    if (key.startsWith('@dailyAnswer:')) {
                        loadedAnswers[key.replace('@dailyAnswer:', '')] = JSON.parse(value);
                    } else if (key.startsWith('@event:')) {
                        loadedEvents[key.replace('@event:', '')] = JSON.parse(value);
                    }
                }
            });
            setDailyAnswers(loadedAnswers);
            setEvents(loadedEvents);
        } catch (e) {
            console.error("Failed to load initial data.", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // DailyAnswers 저장
    const saveDailyAnswer = useCallback(async (date: Date, newAnswers: DailyAnswer) => {
        const key = getISODateString(date);
        const storageKey = getDailyAnswerStorageKey(date);
        await AsyncStorage.setItem(storageKey, JSON.stringify(newAnswers));
        setDailyAnswers(prev => ({ ...prev, [key]: newAnswers }));
    }, [getISODateString, getDailyAnswerStorageKey]);

    // DailyAnswers 삭제
    const deleteDailyAnswer = useCallback(async (date: Date) => {
        const key = getISODateString(date);
        const storageKey = getDailyAnswerStorageKey(date);
        await AsyncStorage.removeItem(storageKey);
        setDailyAnswers(prev => {
            const newAnswers = { ...prev };
            delete newAnswers[key];
            return newAnswers;
        });
    }, [getISODateString, getDailyAnswerStorageKey]);

    // Event 저장
    const saveEvent = useCallback(async (date: Date, newEvent: Event) => {
        const key = getISODateString(date);
        const storageKey = getEventStorageKey(date);
        const dayEvents = events[key] || [];
        let updatedDayEvents;

        if (newEvent.id) {
            updatedDayEvents = dayEvents.map(event =>
                event.id === newEvent.id ? { ...event, ...newEvent } as Event : event
            );
        } else {
            const newEventWithId = { ...newEvent, id: Date.now() } as Event;
            updatedDayEvents = [...dayEvents, newEventWithId];
        }

        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDayEvents));
        setEvents(prev => ({ ...prev, [key]: updatedDayEvents }));
    }, [getISODateString, getEventStorageKey, events]);

    // Event 삭제
    const deleteEvent = useCallback(async (date: Date, eventId: number) => {
        const key = getISODateString(date);
        const storageKey = getEventStorageKey(date);
        const dayEvents = events[key] || [];
        const updatedDayEvents = dayEvents.filter(event => event.id !== eventId);

        if (updatedDayEvents.length > 0) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDayEvents));
            setEvents(prev => ({ ...prev, [key]: updatedDayEvents }));
        } else {
            await AsyncStorage.removeItem(storageKey);
            setEvents(prev => {
                const newEvents = { ...prev };
                delete newEvents[key];
                return newEvents;
            });
        }
    }, [getISODateString, getEventStorageKey, events]);

    // 앱 시작 시 데이터 로드
    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    const value = {
        dailyAnswers,
        events,
        isLoading,
        loadRecords,
        saveDailyAnswer,
        deleteDailyAnswer,
        saveEvent,
        deleteEvent,
    };

    return <DailyRecordsContext.Provider value={value}>{children}</DailyRecordsContext.Provider>;
};

// --- Custom Hook ---
export const useDailyRecords = () => {
    const context = useContext(DailyRecordsContext);
    if (context === undefined) {
        throw new Error('useDailyRecords must be used within a DailyRecordsProvider');
    }
    return context;
};
