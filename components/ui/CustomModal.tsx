import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';

export default function CustomModal({ visible, onClose, title, children, footer }) {
    useEffect(() => {
        const handleBackPress = () => {
            if (visible) {
                onClose();
                return true;
            }
            return false;
        };
        const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandlerSubscription.remove();
    }, [visible, onClose]);

    return (
        <AnimatePresence>
            {visible && (
                <MotiView style={styles.container} from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <View style={styles.overlay} />
                    <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9, translateY: 20 }} animate={{ opacity: 1, scale: 1, translateY: 0 }} exit={{ opacity: 0, scale: 0.9, translateY: -10 }} transition={{ type: 'spring', damping: 15 }}>
                        <View style={styles.header}>
                            <Text style={styles.title}>{title || '알림'}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#868E96" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.body}>
                            {children}
                        </View>
                        {footer && (
                            <View style={styles.footer}>
                                {footer}
                            </View>
                        )}
                    </MotiView>
                </MotiView>
            )}
        </AnimatePresence>
    );
}

const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    card: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: '#212529',
        borderRadius: 16,
        overflow: 'hidden',
        maxHeight: '85%', // ✅ 모달의 최대 높이를 화면의 85%로 제한
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#343A40',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    closeButton: {
        padding: 4,
    },
    body: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        flexShrink: 1, // ✅ body가 내용이 많아져도 header와 footer를 밀어내지 않고 스스로 줄어들도록 설정
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#343A40',
        justifyContent: 'flex-end',
    },
});
