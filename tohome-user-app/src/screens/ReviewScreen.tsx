import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from '../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { orderApi } from '../api/order';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import Button from '../components/Button';

const TAGS = ['服务好', '技术好', '态度好', '很准时', '环境整洁', '专业', '性价比高', '推荐'];

export default function ReviewScreen() {
  const route: any = useRoute();
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const orderId = route.params?.orderId;
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [content, setContent] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => orderApi.reviewOrder(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('评价成功', '感谢您的评价！', [{ text: '确定', onPress: () => nav.goBack() }]);
    },
    onError: () => Alert.alert('评价失败', '请稍后重试'),
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = () => {
    if (content.trim().length < 5) { Alert.alert('提示', '请至少输入5个字'); return; }
    mutation.mutate({ rating, tags: selectedTags, content });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>评价服务</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setRating(i)}>
              <Star size={36} weight="fill" color={i <= rating ? colors.secondary : colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tags}>
          {TAGS.map(tag => (
            <TouchableOpacity key={tag} style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]} onPress={() => toggleTag(tag)}>
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="写下您的评价（至少5个字）"
          multiline
          numberOfLines={4}
          value={content}
          onChangeText={setContent}
          maxLength={500}
          textAlignVertical="top"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={styles.count}>{content.length}/500</Text>
      </View>
      <View style={styles.footer}>
        <Button title="提交评价" onPress={handleSubmit} loading={mutation.isPending} fullWidth size="large" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  tagActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  tagText: { fontSize: fontSize.sm, color: colors.textSecondary },
  tagTextActive: { color: colors.primary },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.textPrimary, minHeight: 120, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xs },
  count: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'right', marginBottom: spacing.lg },
  footer: { padding: spacing.md, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
});
