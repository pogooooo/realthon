import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 일일 질문 배열
const dailyQuestions = [
    { key: 'q1', text: "오늘 당신이 한 일은 무엇인가요?", type: 'text' },
    { key: 'q2', text: "오늘 자신을 평가하면 어떤가요?", type: 'evaluation' },
    { key: 'q3', text: "오늘 자신보다 나아질 방법은 무엇인가요?", type: 'text' },
];

// 'YYYY-MM-DD' 형식의 날짜 문자열 반환
const getISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// AsyncStorage 키 생성
const getStorageKey = (date: Date): string => {
    return `@dailyAnswer:${getISODateString(date)}`;
};

// 저장할 답변 데이터 타입
interface DailyAnswer {
    q1: string;
    q2: 0 | 1 | null;
    q3: string;
}

export const useDailyQuestion = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [answers, setAnswers] = useState<DailyAnswer | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // 선택된 날짜에 대한 답변을 불러오는 함수
    const loadAnswer = useCallback(async (date: Date) => {
        setIsLoading(true);
        try {
            const storageKey = getStorageKey(date);
            const savedData = await AsyncStorage.getItem(storageKey);
            if (savedData) {
                setAnswers(JSON.parse(savedData));
                console.log("Loaded answers for", getISODateString(date), ":", JSON.parse(savedData));
            } else {
                setAnswers({ q1: '', q2: null, q3: '' });
                console.log("No saved answers found for", getISODateString(date), ". Initializing with empty values.");
            }
        } catch (e) {
            console.error("Failed to load daily answers.", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 날짜 변경 시 답변 로드
    useEffect(() => {
        loadAnswer(selectedDate);
    }, [selectedDate, loadAnswer]);

    // ✅ 모든 답변을 한 번에 저장하는 함수 추가
    const handleSaveAllAnswers = useCallback(async (newAnswers: DailyAnswer) => {
        try {
            const storageKey = getStorageKey(selectedDate);
            await AsyncStorage.setItem(storageKey, JSON.stringify(newAnswers));
            setAnswers(newAnswers); // 훅의 상태를 직접 업데이트
            console.log("Successfully saved all answers:", newAnswers);
        } catch (e) {
            console.error("Failed to save daily answers.", e);
        }
    }, [selectedDate]);

    // 답변 삭제
    const handleDeleteAnswer = useCallback(async () => {
        try {
            const storageKey = getStorageKey(selectedDate);
            await AsyncStorage.removeItem(storageKey);
            setAnswers({ q1: '', q2: null, q3: '' });
        } catch (e) {
            console.error("Failed to delete daily answer.", e);
        }
    }, [selectedDate]);

    return {
        dailyQuestions,
        answers,
        isLoading,
        selectedDate,
        setSelectedDate,
        handleSaveAllAnswers,
        handleDeleteAnswer,
    };
};

// 모든 답변 기록을 불러오는 함수 (캘린더 뷰에서 사용)
export const loadAllAnswers = async (): Promise<string[]> => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        return keys.filter(key => key.startsWith('@dailyAnswer:')).map(key => key.substring(13));
    } catch (e) {
        console.error("Failed to load all answer dates.", e);
        return [];
    }
};
