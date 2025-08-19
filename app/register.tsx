// app/register.tsx

import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, Alert, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [age, setAge] = useState('');
    const [alarmTime, setAlarmTime] = useState('');

    const { register, isLoading } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            Alert.alert('비밀번호 불일치', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        try {
            await register({
                email,
                password,
                nickname,
                age: parseInt(age, 10),
                alarm_time: alarmTime,
            });
            router.replace('/(tabs)');
        } catch (e) {
            Alert.alert('회원가입 실패', '다시 시도해 주세요.');
        }
    };

    // ✅ 아이디(닉네임) 중복 확인 로직은 백엔드 API가 필요합니다.
    // 여기서는 임시로 경고창만 띄우도록 구현합니다.
    const checkNicknameAvailability = () => {
        Alert.alert('중복 확인', '아이디 중복 확인 기능은 백엔드 연동이 필요합니다.');
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
                    <View style={styles.nicknameInputContainer}>
                        <TextInput
                            style={[styles.input, styles.nicknameInput]}
                            placeholder="아이디"
                            placeholderTextColor="#868E96"
                            value={nickname}
                            onChangeText={setNickname}
                        />
                        <TouchableOpacity style={styles.checkButton} onPress={checkNicknameAvailability}>
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
                        onPress={handleRegister}
                        disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator color="#181A1E" />
                        ) : (
                            <Text style={styles.registerButtonText}>확인</Text>
                        )}
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
    nicknameInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    nicknameInput: {
        flex: 1,
        marginBottom: 0, // 기본 마진을 없애고
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
});
