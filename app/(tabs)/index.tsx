import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Platform, StatusBar, ScrollView, TouchableOpacity, Image, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useTechTree } from '../../hooks/useTechTree';
import { useRouter } from 'expo-router';
// ✅ useDailyQuestion 대신 useDailyRecords 훅을 사용합니다.
import { useDailyRecords, DailyAnswer } from '../../hooks/useDailyRecords';
import { useAuth } from '../../hooks/useAuth';

// --- Notification Handler ---
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Encouraging Messages
const encouragingMessages = [
    (nickname: string) => `${nickname}님, 오늘도 힘내세요!`,
    (nickname: string) => `멋진 하루가 될 거예요, ${nickname}님.`,
    (nickname: string) => `언제나 ${nickname}님을 응원합니다.`,
    (nickname: string) => `오늘도 ${nickname}님 덕분에 세상이 빛나요.`,
    (nickname: string) => `최고의 ${nickname}님, 오늘 하루도 당신의 꿈을 향해 나아가세요.`,
];

// 일일 질문 배열
const dailyQuestions = [
    { key: 'q1', text: "오늘 당신이 한 일은 무엇인가요?", type: 'text' },
    { key: 'q2', text: "오늘 자신을 평가하면 어떤가요?", type: 'evaluation' },
    { key: 'q3', text: "오늘 자신보다 나아질 방법은 무엇인가요?", type: 'text' },
];

const getISODateString = (date: Date): string => date.toISOString().split('T')[0];

// --- Main Component ---
export default function TimeScreen() {
    const [alarmTime, setAlarmTime] = useState(new Date(new Date().setHours(21, 0, 0, 0)));
    const [isAlarmEnabled, setIsAlarmEnabled] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [encouragingMessage, setEncouragingMessage] = useState('');

    const router = useRouter();
    const { techData } = useTechTree();
    const focusedNode = techData.find(node => node.isFocused);
    const { user } = useAuth();

    // ✅ useDailyRecords 훅에서 데이터와 함수를 가져옵니다.
    const { dailyAnswers, saveDailyAnswer } = useDailyRecords();

    const todayDate = new Date();
    const todayKey = getISODateString(todayDate);

    // ✅ 사용자의 입력 값을 임시로 저장할 로컬 상태
    const [localAnswers, setLocalAnswers] = useState<DailyAnswer | null>(
        dailyAnswers[todayKey] || { q1: '', q2: null, q3: '' }
    );

    // ✅ dailyAnswers 값이 변경될 때마다 localAnswers 업데이트
    useEffect(() => {
        setLocalAnswers(dailyAnswers[todayKey] || { q1: '', q2: null, q3: '' });
    }, [dailyAnswers, todayKey]);

    // --- 알람 및 응원 메시지 관련 데이터 로딩 ---
    useEffect(() => {
        const setupScreen = async () => {
            try {
                const savedTime = await AsyncStorage.getItem('alarmTime');
                const savedAlarmStatus = await AsyncStorage.getItem('isAlarmEnabled');
                if (savedTime) setAlarmTime(new Date(JSON.parse(savedTime)));
                if (savedAlarmStatus) setIsAlarmEnabled(JSON.parse(savedAlarmStatus));
            } catch (e) {
                console.error("Failed to load data.", e);
            }
            registerForPushNotificationsAsync();
        };
        setupScreen();
    }, []);

    // ✅ 사용자의 닉네임이 변경될 때마다 응원 메시지 업데이트
    useEffect(() => {
        const currentNickname = user?.nickname || '사용자';
        const randomMessageIndex = Math.floor(Math.random() * encouragingMessages.length);
        const randomMessage = encouragingMessages[randomMessageIndex](currentNickname);
        setEncouragingMessage(randomMessage);
    }, [user]);

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

    // --- Format Time for Display ---
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // --- Handle Alarm Toggle ---
    const toggleAlarm = async (value: boolean) => {
        setIsAlarmEnabled(value);
        await AsyncStorage.setItem('isAlarmEnabled', JSON.stringify(value));
        if (value) {
            await scheduleDailyNotification(alarmTime);
        } else {
            await Notifications.cancelAllScheduledNotificationsAsync();
        }
    };

    // ✅ 확인 버튼을 눌렀을 때 모든 답변을 저장하는 함수 (비동기 처리)
    const handleConfirm = async () => {
        if (!localAnswers) return;

        try {
            await saveDailyAnswer(todayDate, localAnswers); // ✅ useDailyRecords의 saveDailyAnswer 호출
            // Alert.alert("저장 완료", "오늘의 기록이 성공적으로 저장되었습니다!");
            console.log(localAnswers);
        } catch (error) {
            console.error("Failed to save answers:", error);
            // Alert.alert("저장 실패", "기록을 저장하는 중에 오류가 발생했습니다.");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerContainer}>
                    <Image
                        source={require('../../assets/images/icon.png')}
                        style={styles.logo}
                    />
                </View>

                <Text style={styles.encouragingText}>{encouragingMessage}</Text>

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
                        <Text style={styles.cardTitle}>오늘의 기록</Text>
                    </View>

                    {/* 첫 번째 질문 */}
                    <Text style={styles.questionText}>{dailyQuestions.find(q => q.key === 'q1')?.text}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="여기에 답변을 기록하세요..."
                        placeholderTextColor="#868E96"
                        multiline
                        value={localAnswers?.q1 || ''}
                        onChangeText={(text) => setLocalAnswers(prev => ({ ...prev, q1: text }))}
                    />

                    {/* 두 번째 질문 */}
                    <Text style={[styles.questionText, { marginTop: 20 }]}>{dailyQuestions.find(q => q.key === 'q2')?.text}</Text>
                    <View style={styles.evaluationContainer}>
                        <TouchableOpacity
                            style={[styles.evaluationButton, localAnswers?.q2 === 1 && styles.evaluationSelected]}
                            onPress={() => setLocalAnswers(prev => ({ ...prev, q2: 1 }))}
                        >
                            <Feather name="thumbs-up" size={24} color={localAnswers?.q2 === 1 ? "#28A745" : "#ADB5BD"} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.evaluationButton, localAnswers?.q2 === 0 && styles.evaluationSelected]}
                            onPress={() => setLocalAnswers(prev => ({ ...prev, q2: 0 }))}
                        >
                            <Feather name="thumbs-down" size={24} color={localAnswers?.q2 === 0 ? "#DC3545" : "#ADB5BD"} />
                        </TouchableOpacity>
                    </View>

                    {/* 세 번째 질문 */}
                    <Text style={[styles.questionText, { marginTop: 20 }]}>{dailyQuestions.find(q => q.key === 'q3')?.text}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="여기에 답변을 기록하세요..."
                        placeholderTextColor="#868E96"
                        multiline
                        value={localAnswers?.q3 || ''}
                        onChangeText={(text) => setLocalAnswers(prev => ({ ...prev, q3: text }))}
                    />
                </View>

                {/* ✅ 확인 버튼 추가 */}
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                    <Text style={styles.confirmButtonText}>확인</Text>
                </TouchableOpacity>

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
    const notificationQuestion = "오늘의 기록을 남겨주세요!";

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
        // Alert.alert('알림 권한 실패', '푸시 알림을 받으려면 알림 권한을 허용해주세요!');
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
        paddingBottom: 100,
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
    headerContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 100,
        height: 40,
        resizeMode: 'contain',
    },
    encouragingText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ADB5BD',
        textAlign: 'center',
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
    // ✅ 추가된 스타일
    confirmButton: {
        backgroundColor: '#845EC2',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmButtonText: {
        color: '#F8F9FA',
        fontSize: 18,
        fontWeight: 'bold',
    },
    evaluationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#343A40',
        borderRadius: 10,
        padding: 15,
        backgroundColor: '#181A1E',
    },
    evaluationButton: {
        padding: 10,
        marginHorizontal: 10,
        borderRadius: 50,
        backgroundColor: '#212529',
    },
    evaluationSelected: {
        borderWidth: 2,
        borderColor: '#845EC2',
    }
});
