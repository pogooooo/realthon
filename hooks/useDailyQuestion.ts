import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const dailyQuestions = [
    "오늘 당신은 어땠나요?",
    "조금 더 나은 나를 위해 한 일이 있나요?",
    "오늘 하루 가장 감사했던 순간은 언제였나요?",
    "최근 당신을 웃게 만든 것은 무엇인가요?",
    "내일의 나에게 어떤 응원의 말을 해주고 싶나요?",
];

const getISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0]; // 'YYYY-MM-DD' 형식
};

const getStorageKey = (date: Date): string => {
    return `@dailyAnswer:${getISODateString(date)}`;
};

// 날짜를 기반으로 그날의 질문을 반환하는 헬퍼 함수
export const getDailyQuestionForDate = (date: Date): string => {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dailyQuestions[dayOfYear % dailyQuestions.length];
};

// 모든 답변 기록을 불러오는 함수
export const loadAllAnswers = async (): Promise<Record<string, string>> => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const answerKeys = keys.filter(key => key.startsWith('@dailyAnswer:'));
        if (answerKeys.length === 0) return {};

        const dataPairs = await AsyncStorage.multiGet(answerKeys);
        const answers: Record<string, string> = {};
        dataPairs.forEach(([key, value]) => {
            if (key && value) {
                // 키에서 날짜 부분만 추출 ('@dailyAnswer:YYYY-MM-DD' -> 'YYYY-MM-DD')
                const dateString = key.substring(13);
                answers[dateString] = value;
            }
        });
        return answers;
    } catch (e) {
        console.error("Failed to load all answers.", e);
        return {};
    }
};


export const useDailyQuestion = () => {
    const [dailyQuestion, setDailyQuestion] = useState<string>('');
    const [answer, setAnswer] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadCurrentData = async () => {
            setIsLoading(true);
            const today = new Date();
            setDailyQuestion(getDailyQuestionForDate(today));

            try {
                const storageKey = getStorageKey(today);
                const savedAnswer = await AsyncStorage.getItem(storageKey);
                setAnswer(savedAnswer || '');
            } catch (e) {
                console.error("Failed to load daily answer.", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadCurrentData();
    }, []);

    const handleSaveAnswer = useCallback(async (text: string) => {
        setAnswer(text);
        try {
            const today = new Date();
            const storageKey = getStorageKey(today);
            await AsyncStorage.setItem(storageKey, text);
        } catch (e) {
            console.error("Failed to save daily answer.", e);
        }
    }, []);

    return {
        dailyQuestion,
        answer,
        handleSaveAnswer,
        isLoading,
    };
};
