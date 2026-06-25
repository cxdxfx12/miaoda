// 在线客服聊天页面
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaretLeft, PaperPlaneTilt, ChatCircleDots, Headphones, Clock } from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

// 快捷问题
const QUICK_QUESTIONS = [
  '如何预约服务？',
  '服务时长是多少？',
  '如何取消订单？',
  '支付方式有哪些？',
  '达人资质如何？',
  '投诉与建议',
];

// 模拟回复
const AUTO_REPLIES: Record<string, string> = {
  '如何预约服务？': '您可以打开「首页」，选择需要的服务项目，选择服务规格和预约时间，添加地址后即可下单预约。系统会自动为您匹配附近的达人。',
  '服务时长是多少？': '我们的服务时长根据不同的项目规格有所不同，一般为60-120分钟。您可以在服务详情页查看具体时长，下单时也可与达人协商调整。',
  '如何取消订单？': '在订单列表中点击需要取消的订单，进入详情页点击「取消订单」按钮即可。达人接单前取消不收取费用，接单后取消可能会产生取消费，具体以页面提示为准。',
  '支付方式有哪些？': '我们支持微信支付、支付宝和余额支付三种方式。订单完成后系统会自动扣款，也可以提前充值余额享受更多优惠。',
  '达人资质如何？': '所有入驻的达人均经过实名认证、健康证审核和专业培训。每位达人都有详细的评分和评价，您可以放心选择。',
  '投诉与建议': '非常抱歉给您带来不便。您可以直接在此描述问题，也可以拨打客服热线 400-888-9999，我们会尽快为您处理。',
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: number;
}

const WELCOME_MSG: Message = {
  id: 'welcome',
  text: '您好！我是到家按摩的客服助手，有什么可以帮您的吗？您可以直接描述问题，或点击下方快捷问题快速获取帮助。',
  sender: 'system',
  timestamp: Date.now(),
};

export default function ChatScreen() {
  const nav = useNavigation<any>();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [inputText, setInputText] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      text: text.trim(),
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setShowQuick(false);

    // 模拟客服回复（延迟500-1500ms）
    setTimeout(() => {
      const reply = AUTO_REPLIES[text.trim()] ||
        '您的消息已收到，客服正在核实中，请稍候。如有紧急问题，可拨打客服热线 400-888-9999。';
      const sysMsg: Message = {
        id: `sys_${Date.now()}`,
        text: reply,
        sender: 'system',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, sysMsg]);
    }, 500 + Math.random() * 1000);
  }, []);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowSystem]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Headphones size={20} color={colors.card} />
          </View>
        )}
        <View style={[
          styles.msgBubble,
          isUser ? styles.msgBubbleUser : styles.msgBubbleSystem,
        ]}>
          <Text style={isUser ? styles.msgTextUser : styles.msgTextSystem}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, isUser && styles.msgTimeRight]}>
            {new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <CaretLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>在线客服</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>在线</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerRight}>
          <Text style={styles.headerPhone}>400-888-9999</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            showQuick && messages.length <= 1 ? (
              <View style={styles.quickSection}>
                <Text style={styles.quickTitle}>快捷问题</Text>
                <View style={styles.quickGrid}>
                  {QUICK_QUESTIONS.map(q => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickItem}
                      onPress={() => sendMessage(q)}>
                      <Text style={styles.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : !showQuick ? (
              <TouchableOpacity
                style={styles.showQuickBtn}
                onPress={() => setShowQuick(true)}>
                <ChatCircleDots size={14} color={colors.primary} />
                <Text style={styles.showQuickText}>快捷问题</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="输入您的问题..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim()}>
            <PaperPlaneTilt size={20} color={inputText.trim() ? colors.card : colors.textDisabled} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { padding: spacing.xs },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  headerRight: {
    padding: spacing.xs,
  },
  headerPhone: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  msgList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  msgRowUser: {
    alignSelf: 'flex-end',
  },
  msgRowSystem: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  msgBubble: {
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    maxWidth: '100%',
  },
  msgBubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  msgBubbleSystem: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: radius.xs,
    ...shadow.sm,
  },
  msgTextUser: {
    fontSize: fontSize.base,
    color: '#fff',
    lineHeight: 22,
  },
  msgTextSystem: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  msgTime: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: 4,
    textAlign: 'left',
  },
  msgTimeRight: {
    textAlign: 'right',
  },
  quickSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  quickTitle: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  quickItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  quickText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  showQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  showQuickText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.backgroundAlt,
  },
});
