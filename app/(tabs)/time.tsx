import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, SafeAreaView, Platform, StatusBar, Switch, ScrollView } from 'react-native';

// --- Main Component ---
export default function TimeScreen() {
    const [time, setTime] = useState(new Date());
    const [isAlarmEnabled, setIsAlarmEnabled] = useState(false);

    useEffect(() => {
        // 1초마다 현재 시간을 업데이트합니다.
        const timerId = setInterval(() => {
            setTime(new Date());
        }, 1000);

        // 컴포넌트가 언마운트될 때 타이머를 정리합니다.
        return () => clearInterval(timerId);
    }, []);

    const formatTime = (date: Date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0시는 12시로 표시
        const formattedMinutes = String(minutes).padStart(2, '0');
        return {
            ampm,
            time: `${hours}:${formattedMinutes}`,
        };
    };

    const { ampm, time: formattedTime } = formatTime(time);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.container}>
                {/* --- 상단부: 시계 --- */}
                <View style={styles.clockContainer}>
                    <View style={styles.clockCircle}>
                        <Text style={styles.ampmText}>{ampm}</Text>
                        <Text style={styles.timeText}>{formattedTime}</Text>
                        <Switch
                            trackColor={{ false: '#343A40', true: '#845EC2' }}
                            thumbColor={isAlarmEnabled ? '#F8F9FA' : '#F8F9FA'}
                            ios_backgroundColor="#343A40"
                            onValueChange={() => setIsAlarmEnabled(previousState => !previousState)}
                            value={isAlarmEnabled}
                            style={styles.alarmSwitch}
                        />
                    </View>
                </View>

                {/* --- 하단부: 질문 --- */}
                <View style={styles.journalContainer}>
                    <Text style={styles.journalTitle}>오늘 남긴 글</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.questionText}>오늘 당신은 어땠나요?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="아직 남긴 글이 없습니다."
                            placeholderTextColor="#868E96"
                            multiline
                        />
                    </View>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.questionText}>조금 더 나은 나를 위해 한 일이 있나요?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="오늘 한 일을 기록해보세요."
                            placeholderTextColor="#868E96"
                            multiline
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles based on Design System Prompt ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#181A1E',
    },
    container: {
        flexGrow: 1,
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20,
    },
    clockContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    clockCircle: {
        width: Dimensions.get('window').width * 0.7,
        height: Dimensions.get('window').width * 0.7,
        borderRadius: (Dimensions.get('window').width * 0.7) / 2,
        borderWidth: 3,
        borderColor: '#A19ECA', // 보조 하이라이트
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#212529', // 카드 및 섹션 배경
    },
    ampmText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#F8F9FA', // 기본 텍스트
    },
    timeText: {
        fontSize: 64,
        fontWeight: 'bold',
        color: '#F8F9FA', // 기본 텍스트
        marginVertical: 5,
    },
    alarmSwitch: {
        transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }],
        marginTop: 10,
    },
    journalContainer: {
        width: '100%',
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    journalTitle: {
        fontSize: 20, // 카드/모달 제목
        fontWeight: '600',
        color: '#F8F9FA', // 기본 텍스트
        marginTop: 24,
        marginBottom: 24,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    questionText: {
        fontSize: 16, // 섹션 제목
        fontWeight: '500',
        color: '#ADB5BD', // 보조 텍스트
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#212529', // 카드 및 섹션 배경
        borderRadius: 10, // 입력 필드 둥근 모서리
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16, // 기본 텍스트
        color: '#F8F9FA', // 기본 텍스트
        borderWidth: 1,
        borderColor: '#343A40', // 구분선/테두리
        minHeight: 80,
        textAlignVertical: 'top',
    },
});
