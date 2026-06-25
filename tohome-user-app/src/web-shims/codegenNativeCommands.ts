// Web shim: react-native-screens 用到的 codegenNativeCommands 在 web 端为 noop
export default {
  SupportedCommands: [],
} as any;

export function codegenNativeCommands<T>(_options: T): Record<string, never> {
  return {} as Record<string, never>;
}
