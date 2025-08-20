import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Platform,
    StatusBar,
    Image,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
// Expo-router를 mock 처리하여 컴파일 오류를 방지합니다.
import { useRouter } from 'expo-router';
// AsyncStorage 및 axiosClient를 mock 처리하여 독립적으로 실행 가능하게 만듭니다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';

// member 테이블의 필드에 맞춘 타입 정의
interface MemberData {
    member_id: number;
    email: string;
    nickname: string;
    age: number;
    alarm_time: string;
}

// Auth 훅의 타입 정의
interface AuthContextType {
    user: MemberData | null;
    isLoading: boolean;
    login: (credentials: { nickname: string; password: string }) => Promise<void>;
    register: (data: { nickname: string; id: string; password: string }) => Promise<void>;
    checkIdAvailability: (id: string) => Promise<boolean>;
    logout: () => Promise<void>;
}

const USERS_STORAGE_KEY = 'registered_users';
const ADMIN_NICKNAME = 'admin';
const ADMIN_PASSWORD = '1234';

// 제공된 useAuth 훅 코드를 여기에 포함시킵니다.
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

    // 로그인 함수
    const login = useCallback(async (credentials: { nickname: string; password: string }) => {
        setIsLoading(true);
        try {
            if (credentials.nickname === ADMIN_NICKname && credentials.password === ADMIN_PASSWORD) {
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

    // 회원가입 함수
    const register = useCallback(async (data: { nickname: string; id: string; password: string }) => {
        setIsLoading(true);
        try {
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

    // 아이디 중복 확인 함수
    const checkIdAvailability = useCallback(async (id: string) => {
        try {
            const storedUsersString = await AsyncStorage.getItem(USERS_STORAGE_KEY);
            const storedUsers = storedUsersString ? JSON.parse(storedUsersString) : [];
            const isIdTaken = storedUsers.some((u: any) => u.email === id);

            if (id === ADMIN_NICKNAME) {
                return false;
            }

            return !isIdTaken;
        } catch (error) {
            console.error('Failed to check ID availability', error);
            return true;
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

    return { user, isLoading, login, register, checkIdAvailability, logout };
};

// 메인 SettingsScreen 컴포넌트
export default function SettingsScreen() {
    // useAuth 훅을 사용하여 사용자 정보를 가져옵니다.
    const { user, logout } = useAuth();
    const router = useRouter();

    // 각 설정 항목을 위한 도우미 컴포넌트
    const SettingItem = ({ icon, text, onPress, isDestructive = false }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name={icon} size={22} color={isDestructive ? '#E03131' : '#ADB5BD'} />
                <Text style={[styles.settingText, isDestructive && styles.destructiveText]}>{text}</Text>
            </View>
            {!isDestructive && <Feather name="chevron-right" size={22} color="#495057" />}
        </TouchableOpacity>
    );

    // 섹션 헤더를 위한 도우미 컴포넌트
    const SectionHeader = ({ title }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('로그아웃 실패', '다시 시도해 주세요.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.container}>
                <Text style={styles.headerTitle}>설정</Text>

                {/* --- 사용자 정보 카드 --- */}
                <View style={styles.userCard}>
                    <Image
                        source={{ uri: 'https://placehold.co/100x100/343A40/EAEAEA?text=User' }}
                        style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                        {/* 닉네임과 아이디가 출력되도록 수정 */}
                        <Text style={styles.userName}>{user?.nickname || '닉네임'}</Text>
                        <Text style={styles.userEmail}>{user?.email || '아이디'}</Text>
                    </View>
                    <TouchableOpacity style={styles.editButton}>
                        <Feather name="edit-2" size={18} color="#CED4DA" />
                    </TouchableOpacity>
                </View>

                {/* --- 설정 섹션 --- */}
                <SectionHeader title="일반" />
                <View style={styles.section}>
                    <SettingItem icon="sun" text="화면 설정" onPress={() => Alert.alert('화면 설정', '이 기능은 아직 개발 중입니다.')} />
                </View>

                <SectionHeader title="정보" />
                <View style={styles.section}>
                    <SettingItem icon="file-text" text="서비스 이용약관" onPress={() => Alert.alert('서비스 이용약관', '이 기능은 아직 개발 중입니다.')} />
                </View>

                <SectionHeader title="계정" />
                <View style={styles.section}>
                    <SettingItem icon="log-out" text="로그아웃" onPress={handleLogout} />
                    <View style={styles.separator} />
                    <SettingItem icon="trash-2" text="계정 탈퇴" onPress={() => Alert.alert('계정 탈퇴', '이 기능은 아직 개발 중입니다.', [{ text: '취소' }, { text: '확인' }])} isDestructive={true} />
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// 스타일
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#181A1E',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginTop: 20,
        marginBottom: 20,
    },
    userCard: {
        backgroundColor: '#212529',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    userInfo: {
        marginLeft: 15,
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#F8F9FA',
    },
    userEmail: {
        fontSize: 14,
        color: '#ADB5BD',
        marginTop: 4,
    },
    editButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#343A40'
    },
    section: {
        backgroundColor: '#212529',
        borderRadius: 12,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '500',
        color: '#868E96',
        marginBottom: 10,
        marginLeft: 5,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 15,
    },
    settingText: {
        fontSize: 16,
        color: '#E9ECEF',
        marginLeft: 15,
    },
    destructiveText: {
        color: '#E03131',
    },
    separator: {
        height: 1,
        backgroundColor: '#343A40',
        marginLeft: 52, // 아이콘 크기 + 여백
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#181A1E',
    },
});
