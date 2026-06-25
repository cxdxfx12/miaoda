// 登录屏幕 — 高端商业视觉 (参考目搭H5风格)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, Dimensions, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Phone, ShieldCheck, FlowerLotus, Crown, HandWaving, FirstAidKit, Star } from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';
import { authApi } from '../api/auth';
import { useUserStore } from '../store/userStore';
import { AppConfig } from '../config';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { validatePhone } from '../utils';

const { width: SW, height: SH } = Dimensions.get('window');

// 装饰性气泡组件
const DecoBubble: React.FC<{
  size: number; top: number; left: number;
  color: string; opacity: number; delay: number;
}> = ({ size, top, left, color, opacity, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', top, left,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: anim.interpolate({
        inputRange: [0, 1], outputRange: [opacity * 0.4, opacity],
      }),
      transform: [{ scale: anim.interpolate({
        inputRange: [0, 1], outputRange: [0.8, 1.1],
      }) }],
    }} />
  );
};

// 服务展示卡片
const ServiceShowcase: React.FC<{
  icon: React.ComponentType<any>; label: string; desc: string; colors: string[];
}> = ({ icon: Icon, label, desc, colors: cardColors }) => (
  <View style={[showStyles.card, { backgroundColor: cardColors[0] + '18' }]}>
    <View style={[showStyles.cardIcon, { backgroundColor: cardColors[0] + '22' }]}>
      <Icon size={22} color={cardColors[1] || cardColors[0]} />
    </View>
    <Text style={showStyles.cardLabel}>{label}</Text>
    <Text style={showStyles.cardDesc}>{desc}</Text>
  </View>
);

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [showWechatWebView, setShowWechatWebView] = useState(false);
  const [wechatAuthUrl, setWechatAuthUrl] = useState('');
  const wechatLogin = useUserStore(state => state.wechatLogin);
  const timerRef = useRef<any>(null);
  const toast = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const login = useUserStore(state => state.login);
  const loading = useUserStore(state => state.loading);

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSendCode = async () => {
    if (!validatePhone(phone)) { toast.warning('请输入正确的手机号'); return; }
    try {
      setSending(true);
      await authApi.sendSmsCode(phone);
      toast.success('验证码已发送');
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); return 0; } return prev - 1; });
      }, 1000);
    } catch (e: any) {
      toast.error(e.message || '发送失败，请稍后重试');
    } finally { setSending(false); }
  };

  const handleLogin = async () => {
    if (!validatePhone(phone)) { toast.warning('请输入正确的手机号'); return; }
    if (code.length !== 6) { toast.warning('请输入6位验证码'); return; }
    try {
      await login(phone, code);
      navigation.replace('Main');
    } catch (e: any) {
      toast.error(e.message || '登录失败，请稍后重试');
    }
  };

  // 微信一键登录
  const handleWechatLogin = async () => {
    try {
      // 1. 获取微信配置
      const res = await authApi.getWechatConfig();
      const config = (res as any)?.data || res;
      if (!config?.app_id) {
        toast.warning('微信登录暂未配置，请使用手机号登录');
        return;
      }
      // 2. 构造OAuth授权URL
      const redirectUri = encodeURIComponent(config.redirect_uri || `${AppConfig.API_BASE_URL}/auth/wechat/callback`);
      const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.app_id}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=login#wechat_redirect`;
      setWechatAuthUrl(authUrl);
      setShowWechatWebView(true);
    } catch (e: any) {
      toast.error('获取微信配置失败');
    }
  };

  // 处理WebView中微信回调返回的消息
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'wechat_login' && msg.data?.token) {
        setShowWechatWebView(false);
        // 使用wechatLogin store方法完成登录
        const { token, refresh_token, user } = msg.data;
        // 直接设置token和用户信息，无需再次调API
        useUserStore.setState({
          token,
          userInfo: user,
          isLoggedIn: true,
        });
        navigation.replace('Main');
      }
    } catch (e) {
      // 忽略解析错误
    }
  }, [navigation]);

  const serviceCards = [
    { icon: HandWaving, label: '全身按摩', desc: '舒缓解压', cardColors: [colors.primary, colors.primaryLight] },
    { icon: FlowerLotus, label: '足疗保健', desc: '放松身心', cardColors: [colors.lavender, colors.lavender] },
    { icon: FirstAidKit, label: '中医理疗', desc: '专业调理', cardColors: [colors.success, colors.mint] },
    { icon: Crown, label: 'SPA美容', desc: '焕新体验', cardColors: [colors.secondary, colors.secondaryLight] },
  ];

  return (
    <SafeAreaView style={loginStyles.container}>
      {/* 装饰背景 */}
      <View style={loginStyles.bgDecor}>
        {/* 大圆 */}
        <View style={[loginStyles.bgCircle, {
          width: 340, height: 340, borderRadius: 170,
          top: -100, right: -100,
          backgroundColor: colors.primary + '08',
        }]} />
        <View style={[loginStyles.bgCircle, {
          width: 220, height: 220, borderRadius: 110,
          top: '22%', left: -60,
          backgroundColor: colors.secondary + '10',
        }]} />
        <View style={[loginStyles.bgCircle, {
          width: 160, height: 160, borderRadius: 80,
          top: '48%', right: -40,
          backgroundColor: colors.lavender + '0D',
        }]} />
        {/* 装饰气泡 */}
        <DecoBubble size={30} top="15%" left="20%" color={colors.primary} opacity={0.06} delay={0} />
        <DecoBubble size={18} top="30%" left="75%" color={colors.secondary} opacity={0.08} delay={500} />
        <DecoBubble size={24} top="55%" left="12%" color={colors.lavender} opacity={0.06} delay={1000} />
        <DecoBubble size={14} top="65%" left="80%" color={colors.mint} opacity={0.07} delay={1500} />
        <DecoBubble size={36} top="78%" left="40%" color={colors.rose} opacity={0.05} delay={2000} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={loginStyles.container}>
        <ScrollView
          contentContainerStyle={loginStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Logo 区域 */}
          <Animated.View style={[loginStyles.logoArea, {
            opacity: fadeAnim, transform: [{ scale: logoScale }],
          }]}>
            <View style={loginStyles.logoOuterRing}>
              <View style={loginStyles.logoInnerRing}>
                <View style={loginStyles.logoCore}>
                  <FlowerLotus size={38} color={colors.primary} weight="fill" />
                </View>
              </View>
            </View>
            <Text style={loginStyles.appName}>喵搭</Text>
            <Text style={loginStyles.tagline}>专业上门按摩 · 放松随时随地</Text>
          </Animated.View>

          {/* 服务展示卡片 (参考目搭风格) */}
          <Animated.View style={[loginStyles.showcase, {
            opacity: fadeAnim, transform: [{ translateY: cardSlide }],
          }]}>
            <Text style={loginStyles.showcaseTitle}>精选服务</Text>
            <View style={loginStyles.showcaseGrid}>
              {serviceCards.map((s, i) => (
                <ServiceShowcase key={i} {...s} />
              ))}
            </View>
          </Animated.View>

          {/* 登录表单 */}
          <Animated.View style={[loginStyles.formArea, {
            opacity: fadeAnim, transform: [{ translateY: slideUp }],
          }]}>
            <View style={loginStyles.formCard}>
              <Text style={loginStyles.formTitle}>手机号登录</Text>

              <View style={loginStyles.inputGroup}>
                <View style={loginStyles.inputRow}>
                  <View style={loginStyles.inputIcon}>
                    <Phone size={18} color={colors.textTertiary} />
                  </View>
                  <View style={loginStyles.inputWrap}>
                    <Input
                      label="" placeholder="请输入手机号"
                      value={phone} onChangeText={setPhone}
                      keyboardType="phone-pad" maxLength={11}
                    />
                  </View>
                </View>

                <View style={loginStyles.inputRow}>
                  <View style={loginStyles.inputIcon}>
                    <ShieldCheck size={18} color={colors.textTertiary} />
                  </View>
                  <View style={loginStyles.inputWrap}>
                    <Input
                      label="" placeholder="请输入6位验证码"
                      value={code} onChangeText={setCode}
                      keyboardType="number-pad" maxLength={6}
                    />
                  </View>
                  <TouchableOpacity
                    style={[loginStyles.codeBtn, (countdown > 0 || sending) && loginStyles.codeBtnDisabled]}
                    onPress={handleSendCode}
                    disabled={countdown > 0 || sending}
                    activeOpacity={0.7}>
                    <Text style={[loginStyles.codeBtnText, (countdown > 0 || sending) && loginStyles.codeBtnTextDisabled]}>
                      {countdown > 0 ? `${countdown}s` : sending ? '发送中' : '获取验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title="登录 / 注册"
                onPress={handleLogin}
                loading={loading}
                fullWidth
                size="large"
                style={loginStyles.loginBtn}
              />

              {/* 微信一键登录 */}
              <TouchableOpacity
                style={loginStyles.wechatBtn}
                onPress={handleWechatLogin}
                activeOpacity={0.7}
              >
                <View style={loginStyles.wechatIcon}>
                  <Text style={loginStyles.wechatIconText}>微</Text>
                </View>
                <Text style={loginStyles.wechatBtnText}>微信一键登录</Text>
              </TouchableOpacity>

              <View style={loginStyles.agreementRow}>
                <View style={loginStyles.agreementDot} />
                <Text style={loginStyles.agreementText}>
                  登录即表示同意<Text style={loginStyles.agreementLink}>《用户协议》</Text>和<Text style={loginStyles.agreementLink}>《隐私政策》</Text>
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* 底部安心保障 */}
          <Animated.View style={[loginStyles.trust, { opacity: fadeAnim }]}>
            <View style={loginStyles.trustItem}>
              <Star size={14} color={colors.gold} weight="fill" />
              <Text style={loginStyles.trustText}>实名认证</Text>
            </View>
            <View style={loginStyles.trustDot} />
            <View style={loginStyles.trustItem}>
              <Star size={14} color={colors.gold} weight="fill" />
              <Text style={loginStyles.trustText}>专业培训</Text>
            </View>
            <View style={loginStyles.trustDot} />
            <View style={loginStyles.trustItem}>
              <Star size={14} color={colors.gold} weight="fill" />
              <Text style={loginStyles.trustText}>品质保障</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 微信OAuth WebView 弹窗 */}
      <Modal
        visible={showWechatWebView}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWechatWebView(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={loginStyles.webviewHeader}>
            <TouchableOpacity
              onPress={() => setShowWechatWebView(false)}
              style={loginStyles.webviewCloseBtn}
            >
              <Text style={loginStyles.webviewCloseText}>取消</Text>
            </TouchableOpacity>
            <Text style={loginStyles.webviewTitle}>微信授权登录</Text>
            <View style={{ width: 50 }} />
          </View>
          {showWechatWebView && wechatAuthUrl !== '' && (
            <WebView
              source={{ uri: wechatAuthUrl }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={loginStyles.webviewLoading}>
                  <Text style={loginStyles.webviewLoadingText}>加载中...</Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// ---- Login Screen Styles ----
const loginStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  // 装饰背景
  bgDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgCircle: { position: 'absolute' },
  // Logo
  logoArea: { alignItems: 'center', paddingTop: 50, marginBottom: spacing.lg },
  logoOuterRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.primary + '10',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.primary + '1A',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  logoInnerRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  logoCore: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  appName: {
    fontSize: fontSize.xxxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginTop: spacing.md,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: fontSize.base, color: colors.textSecondary,
    marginTop: spacing.xs, letterSpacing: 1,
  },
  // 服务展示
  showcase: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  showcaseTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, marginBottom: spacing.md, letterSpacing: 0.5,
  },
  showcaseGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  // 表单
  formArea: { paddingHorizontal: spacing.lg },
  formCard: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: spacing.lg, ...shadow.md,
    borderWidth: 1, borderColor: colors.border + '60',
  },
  formTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.lg,
  },
  inputGroup: { gap: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: {
    width: 40, height: 46, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background, borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderWidth: 1, borderRightWidth: 0, borderColor: colors.border,
  },
  inputWrap: { flex: 1 },
  codeBtn: {
    marginLeft: spacing.sm, paddingHorizontal: spacing.md,
    height: 46, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary + '0F',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.primary + '30', minWidth: 98,
  },
  codeBtnDisabled: { backgroundColor: colors.backgroundAlt, borderColor: colors.border },
  codeBtnText: {
    fontSize: fontSize.base, color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  codeBtnTextDisabled: { color: colors.textTertiary },
  loginBtn: {
    marginTop: spacing.lg, borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  // 协议
  agreementRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: spacing.lg,
  },
  agreementDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.textTertiary, marginRight: spacing.xs,
  },
  agreementText: {
    fontSize: fontSize.sm, color: colors.textTertiary,
    lineHeight: 20, textAlign: 'center',
  },
  agreementLink: { color: colors.primary, fontWeight: fontWeight.medium },
  // 底部信任
  trust: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: spacing.xxl,
    gap: spacing.md,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trustText: { fontSize: fontSize.sm, color: colors.textTertiary },
  trustDot: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: colors.textDisabled,
  },
  // 微信一键登录按钮
  wechatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.md, paddingVertical: 12,
    borderRadius: radius.lg, borderWidth: 1,
    borderColor: '#07C160', backgroundColor: '#F0FFF4',
    gap: spacing.sm,
  },
  wechatIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#07C160', alignItems: 'center', justifyContent: 'center',
  },
  wechatIconText: {
    fontSize: 14, fontWeight: fontWeight.bold, color: '#FFFFFF',
  },
  wechatBtnText: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: '#07C160',
  },
  // WebView样式
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  webviewCloseBtn: {
    width: 50, paddingVertical: 4,
  },
  webviewCloseText: {
    fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium,
  },
  webviewTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary,
  },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  webviewLoadingText: {
    fontSize: fontSize.md, color: colors.textSecondary,
  },
});

// ---- ServiceShowcase Styles ----
const showStyles = StyleSheet.create({
  card: {
    width: (SW - spacing.lg * 2 - spacing.sm * 2) / 2 - 4,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#00000008',
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textPrimary, marginBottom: 2,
  },
  cardDesc: {
    fontSize: fontSize.sm, color: colors.textTertiary,
  },
});
