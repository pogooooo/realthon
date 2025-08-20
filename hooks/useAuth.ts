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
    login: (credentials: { nickname: string; password: string }) => Promise<void>;
    // ✅ register 함수가 nickname, id, password를 받도록 타입 정의 변경
    register: (data: { nickname: string; id: string; password: string }) => Promise<void>;
    // ✅ 아이디 중복 확인 함수 추가
    checkIdAvailability: (id: string) => Promise<boolean>;
    logout: () => Promise<void>;
}

const USERS_STORAGE_KEY = 'registered_users';
const ADMIN_NICKNAME = 'admin';
const ADMIN_PASSWORD = '1234';

export const useAuth = (): AuthContextType => {
    const [user, setUser] = useState<MemberData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 로컬 스토리지에서 사용자 정보 로드
    useEffect(() => {
        const loadUser = async () => {
            setIsLoading(true);
            try {
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load user', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    // 로그인 함수 (변경사항 없음)
    const login = useCallback(async (credentials: { nickname: string; password: string }) => {
        setIsLoading(true);
        try {
            if (credentials.nickname === ADMIN_NICKNAME && credentials.password === ADMIN_PASSWORD) {
                const adminUser: MemberData = {
                    member_id: -1,
                    email: 'admin@example.com',
                    nickname: ADMIN_NICKNAME,
                    age: 99,
                    alarm_time: '00:00',
                };
                await new Promise(resolve => setTimeout(resolve, 500));
                await AsyncStorage.setItem('user', JSON.stringify(adminUser));
                setUser(adminUser);
                return;
            }

            try {
                const response = await axiosClient.post('/auth/login', credentials);
                const userData: MemberData = response.data;
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
            } catch (apiError) {
                console.error('API login failed. Checking local storage.', apiError);
                const storedUsersString = await AsyncStorage.getItem(USERS_STORAGE_KEY);
                const storedUsers = storedUsersString ? JSON.parse(storedUsersString) : [];
                const foundUser = storedUsers.find(
                    (u: any) => u.nickname === credentials.nickname && u.password === credentials.password
                );

                if (foundUser) {
                    const userData: MemberData = {
                        member_id: foundUser.member_id,
                        email: foundUser.email,
                        nickname: foundUser.nickname,
                        age: foundUser.age,
                        alarm_time: foundUser.alarm_time,
                    };
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await AsyncStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                } else {
                    throw new Error('Invalid credentials');
                }
            }
        } catch (error) {
            console.error('Login process failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ✅ 회원가입 함수
    const register = useCallback(async (data: { nickname: string; id: string; password: string }) => {
        setIsLoading(true);
        try {
            // API 호출 시 백엔드가 어떤 데이터를 요구하는지 확인해야 합니다.
            // 여기서는 닉네임, 아이디, 비밀번호만 보낸다고 가정합니다.
            try {
                const response = await axiosClient.post('/auth/register', data);
                const userData: MemberData = response.data;
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
            } catch (apiError) {
                console.error('API registration failed. Saving to local storage.', apiError);
                const storedUsersString = await AsyncStorage.getItem(USERS_STORAGE_KEY);
                const storedUsers = storedUsersString ? JSON.parse(storedUsersString) : [];

                const newUser = {
                    ...data,
                    member_id: Math.floor(Math.random() * 100000),
                    email: data.id, // ✅ 아이디를 이메일 필드에 저장
                    age: 0,
                    alarm_time: '',
                };

                storedUsers.push(newUser);
                await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(storedUsers));

                const loggedInUser: MemberData = {
                    member_id: newUser.member_id,
                    email: newUser.email,
                    nickname: newUser.nickname,
                    age: newUser.age,
                    alarm_time: newUser.alarm_time,
                };
                await new Promise(resolve => setTimeout(resolve, 500));
                await AsyncStorage.setItem('user', JSON.stringify(loggedInUser));
                setUser(loggedInUser);
            }
        } catch (error) {
            console.error('Registration process failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ✅ 아이디 중복 확인 함수 추가
    const checkIdAvailability = useCallback(async (id: string) => {
        try {
            // API를 통한 중복 확인
            // const response = await axiosClient.post('/auth/checkId', { id });
            // return response.data.isAvailable;

            // API 실패 시 로컬 스토리지에서 확인
            const storedUsersString = await AsyncStorage.getItem(USERS_STORAGE_KEY);
            const storedUsers = storedUsersString ? JSON.parse(storedUsersString) : [];
            const isIdTaken = storedUsers.some((u: any) => u.email === id);

            // 관리자 아이디는 항상 사용 불가능
            if (id === ADMIN_NICKNAME) {
                return false;
            }

            return !isIdTaken;
        } catch (error) {
            console.error('Failed to check ID availability', error);
            // 에러 발생 시 일단 사용 가능하다고 가정
            return true;
        }
    }, []);

    // 로그아웃 함수는 변경이 필요하지 않습니다.
    const logout = useCallback(async () => {
        try {
            await AsyncStorage.removeItem('user');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
            throw error;
        }
    }, []);

    return { user, isLoading, login, register, checkIdAvailability, logout };
};
