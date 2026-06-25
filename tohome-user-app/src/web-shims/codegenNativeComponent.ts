// Web shim: react-native-screens 用到的 codegenNativeComponent 在 web 端为 noop
import { View } from 'react-native';

export default function codegenNativeComponent<Props>(
  _name: string,
  _options?: any,
): React.ComponentType<Props> {
  return View as any;
}

export type NativeComponentType<T> = React.ComponentType<T>;
