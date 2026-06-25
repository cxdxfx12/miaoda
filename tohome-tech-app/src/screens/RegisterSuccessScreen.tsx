// 注册成功页面
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { CheckCircle, Clock, ArrowRight } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

export const RegisterSuccessScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 成功图标 */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <CheckCircle size={64} color={colors.success} weight="fill" />
          </View>
        </View>

        <Text style={styles.title}>提交成功！</Text>
        <Text style={styles.subtitle}>
          您的资料已提交成功，我们将在1-3个工作日内完成审核
        </Text>

        {/* 审核流程 */}
        <View style={styles.processCard}>
          <Text style={styles.processTitle}>审核流程</Text>
          <View style={styles.processSteps}>
            <View style={styles.processStep}>
              <View style={[styles.processDot, styles.processDotDone]}>
                <CheckCircle size={16} color="#fff" weight="fill" />
              </View>
              <View style={styles.processLine} />
              <View>
                <Text style={styles.processLabel}>资料提交</Text>
                <Text style={styles.processTime}>已完成</Text>
              </View>
            </View>
            <View style={styles.processStep}>
              <View style={[styles.processDot, styles.processDotPending]}>
                <Clock size={16} color="#fff" weight="fill" />
              </View>
              <View style={styles.processLine} />
              <View>
                <Text style={styles.processLabel}>资质审核</Text>
                <Text style={styles.processTime}>预计1-3个工作日</Text>
              </View>
            </View>
            <View style={styles.processStep}>
              <View style={[styles.processDot, styles.processDotPending]}>
                <Clock size={16} color="#fff" weight="fill" />
              </View>
              <View>
                <Text style={styles.processLabel}>审核通过</Text>
                <Text style={styles.processTime}>开启接单</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 提示信息 */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>温馨提示</Text>
          <Text style={styles.tipsText}>
            - 请保持手机畅通，审核人员可能会与您联系{'\n'}
            - 您可以在"我的-入驻进度"中查看审核状态{'\n'}
            - 如有问题请联系客服：400-xxx-xxxx
          </Text>
        </View>
      </View>

      {/* 底部按钮 */}
      <View style={styles.footer}>
        <Button
          title="返回首页"
          type="secondary"
          fullWidth
          size="large"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
          style={styles.secondaryBtn}
        />
        <Button
          title="查看进度"
          type="primary"
          fullWidth
          size="large"
          onPress={() => navigation.navigate('RegisterProgress')}
          icon={<ArrowRight size={20} color="#fff" />}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 60 },
  iconContainer: { alignItems: 'center', marginBottom: spacing.lg },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  processCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  processTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  processSteps: {},
  processStep: { flexDirection: 'row', alignItems: 'flex-start' },
  processDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  processDotDone: { backgroundColor: colors.success },
  processDotPending: { backgroundColor: colors.textTertiary },
  processLine: {
    width: 2,
    height: 36,
    backgroundColor: colors.divider,
    marginLeft: 13,
    marginBottom: 4,
    marginTop: 4,
  },
  processLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.textPrimary },
  processTime: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
  tipsCard: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  tipsTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  tipsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  secondaryBtn: {},
});
