import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Platform, StatusBar, Switch, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useTechTree } from '../../hooks/useTechTree';
import { useRouter } from 'expo-router';
import { useDailyQuestion } from '../../hooks/useDailyQuestion'; // ✅ 일일 질문 훅 임포트

// --- Notification Handler ---
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// --- Daily Questions (For Notifications) ---
const dailyQuestions = [
    "오늘 당신은 어땠나요?",
    "조금 더 나은 나를 위해 한 일이 있나요?",
    "오늘 하루 가장 감사했던 순간은 언제였나요?",
    "최근 당신을 웃게 만든 것은 무엇인가요?",
    "내일의 나에게 어떤 응원의 말을 해주고 싶나요?",
];

// --- Main Component ---
export default function TimeScreen() {
    const [alarmTime, setAlarmTime] = useState(new Date(new Date().setHours(21, 0, 0, 0)));
    const [isAlarmEnabled, setIsAlarmEnabled] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const router = useRouter();
    const { techData } = useTechTree();
    const focusedNode = techData.find(node => node.isFocused);

    // ✅ 일일 질문 관련 상태와 로직을 훅에서 가져옵니다.
    const { dailyQuestion, answer, handleSaveAnswer } = useDailyQuestion();

    // --- 알람 관련 데이터 로딩 ---
    useEffect(() => {
        const setupAlarm = async () => {
            try {
                const savedTime = await AsyncStorage.getItem('alarmTime');
                const savedAlarmStatus = await AsyncStorage.getItem('isAlarmEnabled');

                if (savedTime) setAlarmTime(new Date(JSON.parse(savedTime)));
                if (savedAlarmStatus) setIsAlarmEnabled(JSON.parse(savedAlarmStatus));
            } catch (e) {
                console.error("Failed to load alarm data.", e);
            }
            registerForPushNotificationsAsync();
        };

        setupAlarm();
    }, []);

    // --- Handle Alarm Time Change ---
    const onTimeChange = async (event: any, selectedDate?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setAlarmTime(selectedDate);
            await AsyncStorage.setItem('alarmTime', JSON.stringify(selectedDate));
            if (isAlarmEnabled) {
                await scheduleDailyNotification(selectedDate);
            }
        }
    };

    // --- Handle Alarm Toggle ---
    const toggleAlarm = async (value: boolean) => {
        setIsAlarmEnabled(value);
        await AsyncStorage.setItem('isAlarmEnabled', JSON.stringify(value));
        if (value) {
            await scheduleDailyNotification(alarmTime);
            Alert.alert("알림 설정", `매일 ${formatTime(alarmTime)}에 알림이 울립니다.`);
        } else {
            await Notifications.cancelAllScheduledNotificationsAsync();
            Alert.alert("알림 해제", "모든 알림이 해제되었습니다.");
        }
    };

    // --- Format Time for Display ---
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.headerTitle}>오늘의 기록</Text>

                {focusedNode ? (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Feather name="target" size={20} color="#FFD700" />
                            <Text style={styles.cardTitle}>현재 활성화된 노트</Text>
                        </View>
                        <Text style={styles.focusedNodeTitle}>{focusedNode.title}</Text>
                        <Text style={styles.focusedNodeDescription}>{focusedNode.description}</Text>
                        <TouchableOpacity style={styles.goToButton} onPress={() => router.push('/(tabs)/map')}>
                            <Text style={styles.goToButtonText}>지도로 이동하기</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Feather name="compass" size={20} color="#A19ECA" />
                            <Text style={styles.cardTitle}>포커스 노트 선택하기</Text>
                        </View>
                        <Text style={styles.focusedNodeDescription}>
                            현재 활성화된 노트가 없습니다. {'\n'}지도에서 집중할 목표를 선택해주세요.
                        </Text>
                        <TouchableOpacity style={styles.goToButton} onPress={() => router.push('/(tabs)/map')}>
                            <Text style={styles.goToButtonText}>지도로 이동하기</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="bell" size={20} color="#A19ECA" />
                        <Text style={styles.cardTitle}>알림 시간</Text>
                    </View>
                    <View style={styles.alarmControl}>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                            <Text style={styles.timeText}>{formatTime(alarmTime)}</Text>
                        </TouchableOpacity>
                        <Switch
                            trackColor={{ false: '#343A40', true: '#845EC2' }}
                            thumbColor={isAlarmEnabled ? '#F8F9FA' : '#F8F9FA'}
                            ios_backgroundColor="#343A40"
                            onValueChange={toggleAlarm}
                            value={isAlarmEnabled}
                        />
                    </View>
                </View>

                {/* --- Daily Question & Answer Card --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="help-circle" size={20} color="#A19ECA" />
                        <Text style={styles.cardTitle}>오늘의 질문</Text>
                    </View>
                    <Text style={styles.questionText}>{dailyQuestion}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="여기에 답변을 기록하세요..."
                        placeholderTextColor="#868E96"
                        multiline
                        value={answer}
                        onChangeText={handleSaveAnswer} // ✅ 훅에서 가져온 함수 사용
                    />
                </View>

                {showTimePicker && (
                    <DateTimePicker
                        value={alarmTime}
                        mode="time"
                        is24Hour={false}
                        display="spinner"
                        onChange={onTimeChange}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Push Notification Logic ---
async function scheduleDailyNotification(time: Date) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const trigger = new Date(time);

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const notificationQuestion = dailyQuestions[dayOfYear % dailyQuestions.length];

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "오늘의 질문이 도착했어요! 📬",
            body: notificationQuestion,
            sound: 'default',
        },
        trigger: {
            hour: trigger.getHours(),
            minute: trigger.getMinutes(),
            repeats: true,
        },
    });
}

async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
        return false;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        Alert.alert('알림 권한 실패', '푸시 알림을 받으려면 알림 권한을 허용해주세요!');
        return false;
    }
    try {
        const token = (await Notifications.getPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;
        console.log("Push Notification Token:", token);
    } catch (e) {
        console.error("Failed to get push token", e);
    }
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }
    return true;
}

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#181A1E',
    },
    container: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#212529',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ADB5BD',
        marginLeft: 10,
    },
    alarmControl: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    questionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8F9FA',
        marginBottom: 15,
        lineHeight: 26,
    },
    input: {
        backgroundColor: '#181A1E',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: '#F8F9FA',
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#343A40',
    },
    focusedNodeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginBottom: 5,
    },
    focusedNodeDescription: {
        fontSize: 14,
        color: '#ADB5BD',
        marginBottom: 15,
        lineHeight: 20,
    },
    goToButton: {
        backgroundColor: '#343A40',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    goToButtonText: {
        color: '#F8F9FA',
        fontWeight: '600',
        fontSize: 16,
    },
});
