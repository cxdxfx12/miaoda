// 设置页面 — iOS 风格精致设计
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Moon, Lock, Info, Trash, Globe, Translate, ShieldCheck, ChevronRight,
  Palette, TextT, ClockCounterClockwise, UserCircleGear, DeviceMobileCamera } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTechStore } from '../store/techStore';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';

type SettingItem = {
  icon: typeof ArrowLeft;
  label: string; value?: string;
  type?: 'toggle' | 'nav' | 'action' | 'switch';
  action?: () => void; danger?: boolean; route?: string;
  toggleValue?: boolean;
};

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  const handleClearCache = async () => {
    Alert.alert('清除缓存', '确定要清除所有本地缓存数据吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: async () => {
        try { await AsyncStorage.clear(); Alert.alert('成功', '缓存已清除'); }
        catch { Alert.alert('错误', '清除失败'); }
      }},
    ]);
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: '通知',
      items: [
        { icon: Bell, label: '推送通知', type: 'toggle', action: () => setPushEnabled(v => !v), toggleValue: pushEnabled },
        { icon: DeviceMobileCamera, label: '声音与震动', type: 'toggle', action: () => setSoundEnabled(v => !v), toggleValue: soundEnabled },
      ],
    },
    {
      title: '通用',
      items: [
        { icon: Globe, label: '语言', value: '简体中文', type: 'nav' },
        { icon: Moon, label: '深色模式', type: 'toggle', action: () => setDarkMode(v => !v), toggleValue: darkMode },
        { icon: TextT, label: '字体大小', value: '标准', type: 'nav' },
        { icon: Palette, label: '主题色', value: '默认蓝', type: 'nav' },
      ],
    },
    {
      title: '账户安全',
      items: [
        { icon: Lock, label: '修改密码', type: 'nav', route: 'ChangePassword' },
        { icon: ShieldCheck, label: '隐私政策', type: 'nav' },
        { icon: UserCircleGear, label: '账号管理', type: 'nav' },
      ],
    },
    {
      title: '关于',
      items: [
        { icon: Info, label: '关于喵搭达人', value: 'v1.0.0 (build 2025)', type: 'nav' },
        { icon: ClockCounterClockwise, label: '检查更新', value: '已是最新版', type: 'action' },
        { icon: Trash, label: '清除缓存', type: 'action', danger: true, action: handleClearCache },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sections.map((section, sIdx) => (
          <Animated.View key={sIdx} entering={FadeInUp.delay(sIdx * 60).duration(300)}>
            {/* 分组标题 */}
            <View style={styles.secHeader}>
              <Text style={styles.secLabel}>{section.title}</Text>
              {sIdx === 3 && (
                <Text style={styles.version}>v1.0.0</Text>
              )}
            </View>

            {/* 卡片 */}
            <View style={[styles.card, section.items.some(i => i.danger) && styles.cardDanger]}>
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isLast = iIdx === section.items.length - 1;

                return (
                  <React.Fragment key={iIdx}>
                    <TouchableOpacity
                      style={[
                        styles.row,
                        !isLast && styles.rowBorder,
                        item.danger && styles.dangerRow,
                      ]}
                      onPress={() => item.route ? navigation.navigate(item.route) : item.action?.()}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.iconBox, { backgroundColor: item.danger ? colors.errorBg : colors.primaryBg }]}>
                        <Icon
                          size={17}
                          color={item.danger ? colors.error : colors.textSecondary}
                          weight="duotone"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, item.danger && styles.dangerLbl]}>
                          {item.label}
                        </Text>
                        {item.danger && (
                          <Text style={styles.dangerHint}>此操作不可撤销</Text>
                        )}
                      </View>

                      {/* 右侧 */}
                      {item.type === 'toggle' ? (
                        <Switch
                          value={item.toggleValue ?? false}
                          onValueChange={item.action}
                          trackColor={{ false: colors.divider, true: colors.primary + '70' }}
                          thumbColor="#fff"
                          ios_backgroundColor={colors.divider}
                        />
                      ) : (
                        <View style={styles.rightSide}>
                          {item.value && (
                            <Text style={[styles.value, item.label === '检查更新' && styles.updateVal]}>
                              {item.value}
                            </Text>
                          )}
                          {!item.danger && <ChevronRight size={15} color={colors.textDisabled} />}
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* 分割线 */}
                  </React.Fragment>
                );
              })}
            </View>
          </Animated.View>
        ))}

        {/* 底部信息 */}
        <Animated.View entering={FadeInUp.delay(400).duration(300)}>
          <View style={styles.footer}>
            <Text style={styles.footerTxt}>喵搭达人 · 让服务更专业</Text>
            <Text style={styles.footerSub}>© 2025 Miaoda Tech</Text>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },

  // Section header
  secHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.lg, marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  secLabel: {
    fontSize: 13, color: colors.textTertiary,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase', letterSpacing: 0.8,
    flex: 1,
  },
  version: {
    fontSize: 12, color: colors.textDisabled,
    fontWeight: '500',
  },

  // Card
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    overflow: 'hidden', ...shadow.sm,
  },
  cardDanger: {
    borderColor: colors.error + '20', borderWidth: 1,
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md + 2,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  dangerRow: {},
  dangerRow: {},

  iconBox: {
    width: 32, height: 32, borderRadius: radius.sm + 4,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },

  label: {
    fontSize: fontSize.base, color: colors.textPrimary,
    fontWeight: '400',
  },
  dangerLbl: { color: colors.error },
  dangerHint: {
    fontSize: 10, color: colors.textTertiary, marginTop: 1,
  },

  rightSide: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  value: {
    fontSize: fontSize.sm, color: colors.textTertiary,
    marginRight: 2,
  },
  updateVal: {
    color: colors.success,
  },

  // Footer
  footer: {
    alignItems: 'center', paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  footerTxt: {
    fontSize: fontSize.base, color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  footerSub: {
    fontSize: fontSize.xs, color: colors.textDisabled,
    marginTop: 4,
  },
});
