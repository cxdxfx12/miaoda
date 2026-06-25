// 统一图标组件 - 基于 @expo/vector-icons (Ionicons)
// 提供与 phosphor-react-native 兼容的命名导出，方便迁移
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap | string;
type IconProps = {
  size?: number;
  color?: string;
  weight?: 'regular' | 'bold' | 'fill';
};

// Helper: 统一封装 Ionicons
function createIcon(defaultName: string, outlineName?: string) {
  return function ({ size = 20, color = '#1F2937', weight = 'regular' }: IconProps) {
    const name = (weight === 'fill' || weight === 'bold') && outlineName
      ? outlineName
      : defaultName;
    return <Ionicons name={name as any} size={size} color={color} />;
  };
}

// 方向类
export const CaretLeft    = createIcon('chevron-back');
export const CaretRight   = createIcon('chevron-forward');
export const CaretDown    = createIcon('chevron-down');
export const CaretUp      = createIcon('chevron-up');
export const ChevronLeft  = createIcon('chevron-back');  // alias

// 操作类
export const ArrowLeft    = createIcon('arrow-back');
export const XCircle      = createIcon('close-circle', 'close-circle');
export const X            = createIcon('close');
export const CheckCircle  = createIcon('checkmark-circle', 'checkmark-circle');
export const PencilSimple = createIcon('create-outline');

// 导航/搜索类
export const MapPin             = createIcon('location-outline', 'location');
export const MapPinFill         = createIcon('location');
export const MagnifyingGlass    = createIcon('search-outline', 'search');
export const NavigationArrow    = createIcon('navigate-outline', 'navigate');

// 消息/通讯类
export const ChatCircleDots  = createIcon('chatbubbles-outline', 'chatbubbles');
export const ChatCircle      = createIcon('chatbubble-outline', 'chatbubble');  // alias
export const PaperPlaneTilt  = createIcon('paper-plane-outline', 'paper-plane');
export const Headphones      = createIcon('headset-outline', 'headset');
export const Bell            = createIcon('notifications-outline', 'notifications');
export const BellFill        = createIcon('notifications');

// 金融/钱包类
export const Wallet              = createIcon('wallet-outline', 'wallet');
export const CreditCard          = createIcon('card-outline', 'card');
export const CurrencyCircleDollar = createIcon('cash-outline', 'cash');
export const Money               = createIcon('cash-outline', 'cash');
export const EmptyWallet         = createIcon('wallet-outline');  // alias
export const Bank                = createIcon('business-outline', 'business');
export const TrendingUp          = createIcon('trending-up-outline', 'trending-up');

// 时间/日历类
export const Clock   = createIcon('time-outline', 'time');
export const Calendar = createIcon('calendar-outline', 'calendar');

// 评分/社交类
export const Star     = createIcon('star-outline', 'star');
export const StarFill = createIcon('star');
export const Heart    = createIcon('heart-outline', 'heart');
export const HeartFill = createIcon('heart');
export const Share    = createIcon('share-outline', 'share');

// 状态/标识类
export const Fire        = createIcon('flame-outline', 'flame');
export const Gift        = createIcon('gift-outline', 'gift');
export const ShieldCheck = createIcon('shield-checkmark-outline', 'shield-checkmark');
export const Info        = createIcon('information-circle-outline', 'information-circle');
export const Warning     = createIcon('warning-outline', 'warning');
export const WarningFill = createIcon('warning');

// 用户类
export const User    = createIcon('person-outline', 'person');
export const Users   = createIcon('people-outline', 'people');
export const UserCircle = createIcon('person-circle-outline', 'person-circle');
export const Settings = createIcon('settings-outline', 'settings');

// 服务/订单类
export const Clipboard  = createIcon('clipboard-outline', 'clipboard');
export const List       = createIcon('list-outline', 'list');
export const Tag        = createIcon('pricetag-outline', 'pricetag');
export const Briefcase  = createIcon('briefcase-outline', 'briefcase');
export const Home       = createIcon('home-outline', 'home');
export const HomeFill   = createIcon('home');
export const Phone      = createIcon('call-outline', 'call');

// 按摩/健康类
export const HandPointing = createIcon('hand-left-outline');
export const Hand         = createIcon('hand-left-outline');
export const HandWaving   = createIcon('hand-right-outline');
export const Handshake    = createIcon('handshake-outline');
export const FlowerLotus  = createIcon('flower-outline', 'flower');
export const Flower       = createIcon('flower-outline', 'flower');
export const FirstAidKit  = createIcon('medkit-outline', 'medkit');
export const Crown        = createIcon('diamond-outline', 'diamond');
export const Receipt      = createIcon('receipt-outline', 'receipt');
export const Ticket       = createIcon('ticket-outline', 'ticket');
export const Gear         = createIcon('settings-outline', 'settings');
export const SignOut      = createIcon('log-out-outline', 'log-out');

// 其他
export const Trash       = createIcon('trash-outline', 'trash');
export const TrashSimple = createIcon('trash-outline', 'trash');  // alias
export const Plus        = createIcon('add-outline', 'add');
export const Camera      = createIcon('camera-outline', 'camera');
export const Image       = createIcon('image-outline', 'image');
export const Lock        = createIcon('lock-closed-outline', 'lock-closed');
export const Eye         = createIcon('eye-outline', 'eye');
export const EyeSlash    = createIcon('eye-off-outline', 'eye-off');
export const LogOut      = createIcon('log-out-outline', 'log-out');
export const AddCircle   = createIcon('add-circle-outline', 'add-circle');
export const Circle      = createIcon('ellipse-outline', 'ellipse');
export const ShareNetwork = createIcon('share-social-outline', 'share-social');
export const Power       = createIcon('power-outline', 'power');

// 默认导出 Ionicons 以便直接访问所有图标
export { Ionicons };
