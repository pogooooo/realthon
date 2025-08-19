// app/login.tsx

import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, Alert, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import {Redirect, useRouter} from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        try {
            await login({ email, password });
            router.replace('/(tabs)');
        } catch (e) {
            Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
        }
    };

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
                        placeholder="이메일"
                        placeholderTextColor="#868E96"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
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
                        onPress={handleLogin}
                        disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator color="#F8F9FA" />
                        ) : (
                            <Text style={styles.loginButtonText}>로그인</Text>
                        )}
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
});
