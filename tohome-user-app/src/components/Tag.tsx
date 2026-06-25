// 标签组件
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../theme';

type TagType = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface TagProps {
  text: string;
  type?: TagType;
  onPress?: () => void;
  style?: ViewStyle;
  size?: 'small' | 'medium';
}

const tagColors: Record<TagType, { bg: string; text: string }> = {
  default: { bg: colors.backgroundAlt, text: colors.textSecondary },
  primary: { bg: colors.primaryBg, text: colors.primary },
  success: { bg: colors.successBg, text: colors.success },
  warning: { bg: colors.warningBg, text: colors.warning },
  error: { bg: colors.errorBg, text: colors.error },
  info: { bg: colors.infoBg, text: colors.info },
};

export const Tag: React.FC<TagProps> = ({ text, type = 'default', onPress, style, size = 'small' }) => {
  const colors_ = tagColors[type];

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors_.bg,
      paddingVertical: size === 'small' ? 2 : 6,
      paddingHorizontal: size === 'small' ? 6 : 10,
    },
    style,
  ];

  const textStyle = [
    styles.text,
    { color: colors_.text },
    size === 'medium' && { fontSize: fontSize.base },
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={containerStyle}>
        <Text style={textStyle}>{text}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
