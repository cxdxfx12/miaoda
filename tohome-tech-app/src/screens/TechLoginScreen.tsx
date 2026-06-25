// 达人登录屏幕
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { HandWaving } from 'phosphor-react-native';
import { Phone, ShieldCheck } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useTechStore } from '../store/techStore';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';
import { validatePhone } from '../utils';

export const TechLoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<any>(null);

  const login = useTechStore(state => state.login);
  const loading = useTechStore(state => state.loading);

  const handleSendCode = () => {
    if (!validatePhone(phone)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }
    // 实际调用API
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    if (!validatePhone(phone) || code.length !== 6) {
      Alert.alert('提示', '请输入正确的手机号和验证码');
      return;
    }
    try {
      await login(phone, code);
      navigation.replace('Main');
    } catch (e: any) {
      Alert.alert('登录失败', e.message || '请稍后重试');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <HandWaving size={40} color={colors.primary} weight="bold" />
          </View>
          <Text style={styles.title}>达人端</Text>
          <Text style={styles.subtitle}>专业服务 · 高效接单</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="手机号"
            placeholder="请输入手机号"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={11}
            leftIcon={<Phone size={20} color={colors.textTertiary} />}
          />
          <Input
            label="验证码"
            placeholder="请输入验证码"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            leftIcon={<ShieldCheck size={20} color={colors.textTertiary} />}
            rightIcon={
              <TouchableOpacity onPress={handleSendCode} disabled={countdown > 0}>
                <Text style={[styles.codeText, countdown > 0 && styles.codeTextDisabled]}>
                  {countdown > 0 ? `${countdown}s` : '获取'}
                </Text>
              </TouchableOpacity>
            }
          />
          <Button
            title="登录"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="large"
            style={styles.loginButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logo: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: { fontSize: 40 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.xs },
  form: { paddingHorizontal: spacing.xl },
  codeText: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.medium },
  codeTextDisabled: { color: colors.textTertiary },
  loginButton: { marginTop: spacing.lg },
});
