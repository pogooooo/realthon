import React, { useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    StatusBar,
    Platform,
    Switch,
} from 'react-native';

type PS = 'fullScreen' | 'pageSheet' | 'overFullScreen' | 'formSheet'; // iOS 전용 옵션 포함

export default function HomeScreen() {
    const [visible, setVisible] = useState(false);
    const [transparent, setTransparent] = useState(true);
    const [translucentSB, setTranslucentSB] = useState(true);
    const [presentationStyle, setPresentationStyle] = useState<PS>('overFullScreen');

    const cyclePresentation = () => {
        const order: PS[] = ['overFullScreen', 'fullScreen', 'pageSheet', 'formSheet'];
        const idx = order.indexOf(presentationStyle);
        setPresentationStyle(order[(idx + 1) % order.length]);
    };

    return (
        <SafeAreaView style={styles.root}>
            {/* 상태바 투명 토글(안드로이드 표시 이슈 점검용) */}
            <StatusBar translucent={translucentSB} backgroundColor="transparent" barStyle="light-content" />

            <View style={styles.container}>
                <Text style={styles.title}>Modal Test Scene</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>transparent</Text>
                    <Switch value={transparent} onValueChange={setTransparent} />
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>statusBarTranslucent (Android)</Text>
                    <Switch value={translucentSB} onValueChange={setTranslucentSB} />
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>presentationStyle</Text>
                    <Pressable onPress={cyclePresentation} style={styles.chip}>
                        <Text style={styles.chipText}>{presentationStyle}</Text>
                    </Pressable>
                </View>

                <Pressable onPress={() => setVisible(true)} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Open Modal</Text>
                </Pressable>
            </View>

            {/* 테스트용 모달 */}
            <Modal
                visible={visible}
                transparent={transparent}
                animationType="fade"
                presentationStyle={presentationStyle as any}
                statusBarTranslucent={translucentSB}
                onRequestClose={() => setVisible(false)}
            >
                {/* transparent=true일 때는 직접 반투명 오버레이를 깔아야 함 */}
                <View
                    style={[
                        styles.overlay,
                        transparent && { backgroundColor: 'rgba(0,0,0,0.6)' },
                        !transparent && { backgroundColor: undefined }, // iOS pageSheet 등은 시스템 시트로 표현
                    ]}
                >
                    {/* 모달 카드 */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>This is a modal</Text>
                        <Text style={styles.cardDesc}>
                            - Android에서 모달이 화면 전체를 제대로 덮는지{'\n'}
                            - 상태바 아래까지 오버레이되는지{'\n'}
                            - 투명 모달/시트 모달이 각각 정상인지{'\n'}
                            를 빠르게 점검하세요.
                        </Text>

                        <View style={{ height: 12 }} />

                        <Pressable onPress={() => setVisible(false)} style={styles.secondaryBtn}>
                            <Text style={styles.secondaryBtnText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#0F1115',
    },
    container: {
        flex: 1,
        padding: 20,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 12,
    },
    title: {
        color: '#E6E8EB',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    label: {
        color: '#AEB4BD',
        fontSize: 14,
        flex: 1,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#23262B',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    chipText: { color: '#D7DBE0', fontSize: 13 },

    primaryBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
        backgroundColor: '#BFD200',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
    },
    primaryBtnText: {
        color: '#0B0C0E',
        fontWeight: '700',
    },

    overlay: {
        flex: 1,
        // transparent=false일 때도 중앙 정렬 확인을 위해 유지
        justifyContent: 'center',
        alignItems: 'center',
    },

    card: {
        width: '86%',
        backgroundColor: '#1A1D22',
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: '#343A40',
    },
    cardTitle: { color: '#E6E8EB', fontSize: 18, fontWeight: '700', marginBottom: 8 },
    cardDesc: { color: '#C9CED6', fontSize: 13, lineHeight: 20 },

    secondaryBtn: {
        alignSelf: 'flex-end',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#2D3138',
        borderWidth: 1,
        borderColor: '#3A3F46',
    },
    secondaryBtnText: { color: '#E6E8EB', fontWeight: '600' },
});
