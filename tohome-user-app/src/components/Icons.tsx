// 图标兼容层 - 统一使用 @expo/vector-icons (兼容 Expo 和 React Native)
// 用法: import { IconName } from '@/components/Icons';
import {
  MaterialCommunityIcons as MCIcons,
  Ionicons,
  Feather,
  FontAwesome,
  MaterialIcons,
  AntDesign,
} from '@expo/vector-icons';

// 底部导航图标
export const House = (props: any) => <MCIcons name="home" size={24} color={props.color} />;
export const Receipt = (props: any) => <Ionicons name="receipt-outline" size={24} color={props.color} />;
export const ChatCircle = (props: any) => <Ionicons name="chatbubble-outline" size={24} color={props.color} />;
export const User = (props: any) => <Ionicons name="person-outline" size={24} color={props.color} />;

// 通用图标
export const Phone = (props: any) => <Feather name="phone" size={props.size || 20} color={props.color || '#666'} />;
export const ShieldCheck = (props: any) => <MCIcons name="shield-check" size={props.size || 24} color={props.color || '#666'} />;
export const Eye = (props: any) => <Feather name="eye" size={props.size || 20} color={props.color || '#666'} />;
export const EyeSlash = (props: any) => <Feather name="eye-off" size={props.size || 20} color={props.color || '#666'} />;
export const Star = (props: any) => <FontAwesome name={props.fill ? 'star' : 'star-o'} size={props.size || 16} color={props.color || '#FFB84D'} />;
export const MapPin = (props: any) => <Ionicons name="location-outline" size={props.size || 18} color={props.color || '#666'} />;
export const Clock = (props: any) => <Ionicons name="time-outline" size={props.size || 16} color={props.color || '#666'} />;
export const Heart = (props: any) => <AntDesign name={props.filled ? 'heart' : 'hearto'} size={props.size || 20} color={props.color || '#666'} />;
export const NavigationArrow = (props: any) => <MaterialIcons name="near-me" size={props.size || 18} color={props.color || '#666'} />;
export const ChevronLeft = (props: any) => <Ionicons name="chevron-back" size={props.size || 24} color={props.color || '#666'} />;
export const X = (props: any) => <Ionicons name="close" size={props.size || 20} color={props.color || '#666'} />;
export const ArrowRight = (props: any) => <Ionicons name="arrow-forward" size={props.size || 20} color={props.color || '#666'} />;
export const CheckCircle = (props: any) => <Ionicons name="checkmark-circle" size={props.size || 20} color={props.color || '#10B981'} />;
export const Warning = (props: any) => <Ionicons name="warning-outline" size={props.size || 20} color={props.color || '#FF9800'} />;
export const StarFill = (props: any) => <FontAwesome name="star" size={props.size || 16} color={props.color || '#FFB84D'} />;
export const Gear = (props: any) => <Feather name="settings" size={props.size || 20} color={props.color || '#666'} />;
export const Bell = (props: any) => <Feather name="bell" size={props.size || 20} color={props.color || '#666'} />;
export const Ticket = (props: any) => <MCIcons name="ticket-confirmation" size={props.size || 20} color={props.color || '#666'} />;
export const Wallet = (props: any) => <MCIcons name="wallet" size={props.size || 20} color={props.color || '#666'} />;
export const Headphones = (props: any) => <Feather name="headphones" size={props.size || 20} color={props.color || '#666'} />;
export const SignOut = (props: any) => <MCIcons name="logout" size={props.size || 20} color={props.color || '#666'} />;
export const CaretRight = (props: any) => <Ionicons name="chevron-forward" size={props.size || 20} color={props.color || '#666'} />;
export const Crown = (props: any) => <MCIcons name="crown" size={props.size || 20} color={props.color || '#666'} />;
export const SignOutOutline = (props: any) => <MCIcons name="logout" size={props.size || 20} color={props.color || '#EF4444'} />;

// 辅助函数
export const getIcon = (name: string, props?: any) => {
  const icons: Record<string, React.ReactElement> = {
    House: <House {...props} />,
    Receipt: <Receipt {...props} />,
    ChatCircle: <ChatCircle {...props} />,
    User: <User {...props} />,
    Phone: <Phone {...props} />,
    ShieldCheck: <ShieldCheck {...props} />,
    Eye: <Eye {...props} />,
    EyeSlash: <EyeSlash {...props} />,
    Star: <Star {...props} />,
    MapPin: <MapPin {...props} />,
    Clock: <Clock {...props} />,
    Heart: <Heart {...props} />,
    NavigationArrow: <NavigationArrow {...props} />,
    ChevronLeft: <ChevronLeft {...props} />,
    X: <X {...props} />,
    ArrowRight: <ArrowRight {...props} />,
    CheckCircle: <CheckCircle {...props} />,
    Warning: <Warning {...props} />,
    StarFill: <StarFill {...props} />,
  };
  return icons[name] || null;
};
