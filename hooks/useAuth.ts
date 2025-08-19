import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../api/axiosClient';

// member 테이블의 필드에 맞춘 타입 정의
interface MemberData {
    member_id: number;
    email: string;
    nickname: string;
    age: number;
    alarm_time: string;
}

interface AuthContextType {
    user: MemberData | null;
    isLoading: boolean;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    register: (data: Omit<MemberData, 'member_id'> & { password: string }) => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuth = (): AuthContextType => {
    const [user, setUser] = useState<MemberData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 로컬 스토리지에서 사용자 정보 로드
    useEffect(() => {
        const loadUser = async () => {
            setIsLoading(true); // ✅ 로딩 시작
            try {
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load user', e);
            } finally {
                setIsLoading(false); // ✅ 로딩 완료
            }
        };
        loadUser();
    }, []);

    // 로그인 함수 (API 호출 우선, 실패 시 임시 데이터 사용)
    const login = useCallback(async (credentials: { email: string; password: string }) => {
        setIsLoading(true); // ✅ 로그인 시작 시 로딩 상태 활성화
        try {
            const response = await axiosClient.post('/auth/login', credentials);
            const userData: MemberData = response.data;
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            console.error('API login failed. Using temporary data.', error);
            // API 요청 실패 시 임시 데이터 사용
            const fakeUser: MemberData = {
                member_id: 1,
                email: 'test@example.com',
                nickname: '테스트유저',
                age: 25,
                alarm_time: '08:00',
            };
            if (credentials.email === fakeUser.email && credentials.password === '1234') {
                await new Promise(resolve => setTimeout(resolve, 500));
                await AsyncStorage.setItem('user', JSON.stringify(fakeUser));
                setUser(fakeUser);
            } else {
                throw new Error('Invalid credentials');
            }
        } finally {
            setIsLoading(false); // ✅ 로그인 완료/실패 후 로딩 상태 비활성화
        }
    }, []);

    // 회원가입 함수 (API 호출 우선, 실패 시 임시 데이터 사용)
    const register = useCallback(async (data: Omit<MemberData, 'member_id'> & { password: string }) => {
        setIsLoading(true); // ✅ 회원가입 시작 시 로딩 상태 활성화
        try {
            const response = await axiosClient.post('/auth/register', data);
            const userData: MemberData = response.data;
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            console.error('API registration failed. Using temporary data.', error);
            // API 요청 실패 시 임시 데이터 사용
            const fakeUser: MemberData = {
                member_id: Math.floor(Math.random() * 100000),
                email: data.email,
                nickname: data.nickname,
                age: data.age,
                alarm_time: data.alarm_time,
            };
            await new Promise(resolve => setTimeout(resolve, 500));
            await AsyncStorage.setItem('user', JSON.stringify(fakeUser));
            setUser(fakeUser);
        } finally {
            setIsLoading(false); // ✅ 회원가입 완료/실패 후 로딩 상태 비활성화
        }
    }, []);

    // 로그아웃 함수
    const logout = useCallback(async () => {
        try {
            await AsyncStorage.removeItem('user');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
            throw error;
        }
    }, []);

    return { user, isLoading, login, register, logout };
};
