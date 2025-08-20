import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, Alert, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
    // ✅ 이메일 대신 아이디(닉네임)를 저장하는 상태로 변경
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');

    // useAuth 훅에서 user와 isLoading 상태를 가져옵니다.
    const { login, isLoading, user } = useAuth();
    const router = useRouter();

    // ⛔️ IMPORTANT: `useAuth` 훅이 이미 로그인된 사용자를 감지하면, 즉시 리디렉션합니다.
    useEffect(() => {
        if (user && !isLoading) {
            router.replace('/(tabs)');
        }
    }, [user, isLoading, router]);

    const handleLogin = async () => {
        // ✅ 아이디와 비밀번호 입력 필드가 비어있는지 확인
        if (!nickname.trim() || !password.trim()) {
            Alert.alert('로그인 실패', '아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        try {
            // ✅ login 함수에 아이디(nickname)와 비밀번호를 전달합니다.
            await login({ nickname, password });
            // 로그인 성공 후 리디렉션은 useEffect에서 처리됩니다.
        } catch (e) {
            Alert.alert('로그인 실패', '아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    // 로딩 중일 때 로딩 화면을 표시합니다.
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
                        source={require('../assets/images/icon.png')}
                        style={styles.logo}
                    />
                </View>

                {/* 입력 필드 */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        // ✅ 이메일 대신 아이디를 입력받도록 placeholder를 변경합니다.
                        placeholder="아이디"
                        placeholderTextColor="#868E96"
                        keyboardType="default" // 이메일 키보드 타입 대신 기본 타입으로 변경
                        autoCapitalize="none"
                        value={nickname} // 상태를 email에서 nickname으로 변경
                        onChangeText={setNickname}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="비밀번호"
                        placeholderTextColor="#868E96"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                {/* 버튼들 */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}>
                        <Text style={styles.loginButtonText}>로그인</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={() => router.push('/register')}>
                        <Text style={styles.registerButtonText}>회원가입</Text>
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
    buttonContainer: {
        width: '100%',
    },
    loginButton: {
        backgroundColor: '#A19ECA',
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 10,
    },
    loginButtonText: {
        color: '#181A1E',
        fontSize: 18,
        fontWeight: 'bold',
    },
    registerButton: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#A19ECA',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#181A1E',
    },
});
