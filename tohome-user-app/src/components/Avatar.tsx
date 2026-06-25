// 头像组件
import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, fontSize, fontWeight } from '../theme';

interface AvatarProps {
  source?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '',
  size = 48,
  style,
}) => {
  const containerStyle = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    styles.container,
    style,
  ];

  if (source) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: source }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      </View>
    );
  }

  // 显示首字母
  const firstChar = name ? name[0].toUpperCase() : '?';
  const fontSizeValue = size * 0.4;

  return (
    <View style={containerStyle}>
      <Text style={[{ fontSize: fontSizeValue, color: '#fff' }, styles.text]}>
        {firstChar}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
});
