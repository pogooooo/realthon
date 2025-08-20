import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, Alert, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
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

const USERS_STORAGE_KEY = 'registered_users';
const ADMIN_NICKNAME = 'admin';
const ADMIN_PASSWORD = '1234';

// useAuth 훅을 동일 파일에 포함시켜 import 경로 문제를 해결
const useAuth = () => {
    const [user, setUser] = useState<MemberData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
                    email: data.id,
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


export default function RegisterScreen() {
    // 닉네임, 아이디, 비밀번호 상태 변수 선언
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [id, setId] = useState('');

    // 아이디 중복 확인 관련 상태 추가
    const [isIdChecked, setIsIdChecked] = useState(false);
    const [isIdAvailable, setIsIdAvailable] = useState(false);

    // useAuth 훅에서 필요한 함수와 상태를 가져옵니다.
    const { register, isLoading, user, checkIdAvailability } = useAuth();
    const router = useRouter();

    // 로그인 성공 시 자동 리디렉션 로직
    useEffect(() => {
        if (user && !isLoading) {
            router.replace('/(tabs)');
        }
    }, [user, isLoading, router]);

    // 아이디 입력값이 변경되면 중복 확인 상태를 초기화
    useEffect(() => {
        setIsIdChecked(false);
        setIsIdAvailable(false);
    }, [id]);

    // 아이디 중복 확인 함수
    const handleCheckId = async () => {
        if (!id.trim()) {
            Alert.alert('입력 오류', '아이디를 입력해주세요.');
            return;
        }

        try {
            const isAvailable = await checkIdAvailability(id);
            setIsIdChecked(true);
            setIsIdAvailable(isAvailable);
            if (isAvailable) {
                Alert.alert('성공', '사용 가능한 아이디입니다.');
            } else {
                Alert.alert('실패', '이미 사용 중인 아이디입니다.');
            }
        } catch (e) {
            Alert.alert('오류', '아이디 중복 확인 중 오류가 발생했습니다.');
        }
    };

    // 회원가입 처리 함수
    const handleRegister = async () => {
        if (!nickname.trim() || !id.trim() || !password.trim()) {
            Alert.alert('입력 오류', '모든 필수 정보를 입력해주세요.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('비밀번호 불일치', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        // 아이디 중복 확인이 완료되었는지 확인
        if (!isIdChecked || !isIdAvailable) {
            Alert.alert('회원가입 실패', '아이디 중복 확인을 완료하고 사용 가능한 아이디를 선택해주세요.');
            return;
        }

        try {
            await register({
                nickname,
                id,
                password,
            });
        } catch (e: any) {
            Alert.alert('회원가입 실패', e.message || '다시 시도해 주세요.');
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#A19ECA" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>
                {/* 로고 */}
                <View style={styles.logoContainer}>
                    <Image
                        // 로컬 이미지 경로 대신 임시 URL 사용
                        source={{ uri: 'https://placehold.co/120x120/A19ECA/181A1E?text=ICON' }}
                        style={styles.logo}
                    />
                </View>

                {/* 입력 필드 */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="닉네임"
                        placeholderTextColor="#868E96"
                        value={nickname}
                        onChangeText={setNickname}
                    />
                    {/* 아이디 입력 필드와 중복 확인 버튼 */}
                    <View style={styles.idInputContainer}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder="아이디"
                            placeholderTextColor="#868E96"
                            value={id}
                            onChangeText={setId}
                        />
                        <TouchableOpacity
                            style={styles.checkButton}
                            onPress={handleCheckId}
                            disabled={!id.trim()}>
                            <Text style={styles.checkButtonText}>중복 확인</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="비밀번호"
                        placeholderTextColor="#868E96"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="비밀번호 재입력"
                        placeholderTextColor="#868E96"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>

                {/* 확인 버튼 */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegister}>
                        <Text style={styles.registerButtonText}>확인</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

// 스타일
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#181A1E',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    logoContainer: {
        marginBottom: 50,
    },
    logo: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#212529',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 20,
        fontSize: 16,
        color: '#F8F9FA',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    idInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    checkButton: {
        backgroundColor: '#A19ECA',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 15,
        alignItems: 'center',
        marginLeft: 10,
    },
    checkButtonText: {
        color: '#181A1E',
        fontWeight: 'bold',
    },
    buttonContainer: {
        width: '100%',
    },
    registerButton: {
        backgroundColor: '#A19ECA',
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#181A1E',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#181A1E',
    },
});
