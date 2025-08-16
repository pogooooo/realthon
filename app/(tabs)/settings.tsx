import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Platform,
    StatusBar,
    Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// --- Main Component ---
export default function SettingsScreen() {

    // Helper component for each setting item
    const SettingItem = ({ icon, text, onPress, isDestructive = false }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name={icon} size={22} color={isDestructive ? '#E03131' : '#ADB5BD'} />
                <Text style={[styles.settingText, isDestructive && styles.destructiveText]}>{text}</Text>
            </View>
            {!isDestructive && <Feather name="chevron-right" size={22} color="#495057" />}
        </TouchableOpacity>
    );

    // Helper component for section headers
    const SectionHeader = ({ title }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.container}>
                <Text style={styles.headerTitle}>설정</Text>

                {/* --- User Info Card --- */}
                <View style={styles.userCard}>
                    <Image
                        source={{ uri: 'https://placehold.co/100x100/343A40/EAEAEA?text=User' }}
                        style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>홍길동</Text>
                        <Text style={styles.userEmail}>gildong.hong@example.com</Text>
                    </View>
                    <TouchableOpacity style={styles.editButton}>
                        <Feather name="edit-2" size={18} color="#CED4DA" />
                    </TouchableOpacity>
                </View>

                {/* --- Settings Sections --- */}
                <SectionHeader title="일반" />
                <View style={styles.section}>
                    <SettingItem icon="bell" text="알림 설정" onPress={() => {}} />
                    <View style={styles.separator} />
                    <SettingItem icon="sun" text="화면 설정" onPress={() => {}} />
                </View>

                <SectionHeader title="데이터" />
                <View style={styles.section}>
                    <SettingItem icon="database" text="데이터 백업" onPress={() => {}} />
                    <View style={styles.separator} />
                    <SettingItem icon="share-2" text="데이터 내보내기" onPress={() => {}} />
                </View>

                <SectionHeader title="정보" />
                <View style={styles.section}>
                    <SettingItem icon="info" text="앱 버전" onPress={() => {}} />
                    <View style={styles.separator} />
                    <SettingItem icon="file-text" text="서비스 이용약관" onPress={() => {}} />
                    <View style={styles.separator} />
                    <SettingItem icon="shield" text="개인정보 처리방침" onPress={() => {}} />
                </View>

                <SectionHeader title="계정" />
                <View style={styles.section}>
                    <SettingItem icon="log-out" text="로그아웃" onPress={() => {}} />
                    <View style={styles.separator} />
                    <SettingItem icon="trash-2" text="계정 탈퇴" onPress={() => {}} isDestructive={true} />
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles ---
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
        marginLeft: 52, // Icon size + margin
    },
});
