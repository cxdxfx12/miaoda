// 达人端导航 — 完整路由配置
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, Receipt, User, Lightning } from 'phosphor-react-native';
import { useTechStore } from '../store/techStore';
import { colors } from '../theme';

// Tab 页面
import { DashboardScreen } from '../screens/DashboardScreen';
import { PendingOrdersScreen } from '../screens/PendingOrdersScreen';
import { GrabPoolScreen } from '../screens/GrabPoolScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Stack 页面（从 Tab 进入的子页面）
import { CurrentOrderScreen } from '../screens/CurrentOrderScreen';
import { TechLoginScreen } from '../screens/TechLoginScreen';
import { TalentRegisterScreen } from '../screens/TalentRegisterScreen';
import { RegisterSuccessScreen } from '../screens/RegisterSuccessScreen';
import IncomeScreen from '../screens/IncomeScreen';
import WithdrawScreen from '../screens/WithdrawScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// 占位页面（功能尚未实现）
const PlaceholderPage: React.FC<{ navigation?: any; route?: any }> = ({ route }) => {
  const name = route?.name || '未知页面';
  const titleMap: Record<string, string> = {
    EditProfile: '编辑资料',
    ServiceStats: '服务统计',
    MyReviews: '我的评价',
    ServiceHistory: '服务记录',
    Notifications: '消息通知',
    Help: '帮助与反馈',
    ChangePassword: '修改密码',
    RegisterProgress: '入驻进度',
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937' }}>{titleMap[name] || name}</Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8 }}>功能开发中，敬请期待</Text>
    </View>
  );
};
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let Icon;
          switch (route.name) {
            case 'Dashboard': Icon = House; break;
            case 'GrabPool':   Icon = Lightning; break;
            case 'Orders':     Icon = Receipt; break;
            case 'Profile':    Icon = User; break;
            default:           Icon = House; break;
          }
          return <Icon size={size} color={color} weight={focused ? 'fill' : 'regular'} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: '工作台' }} />
      <Tab.Screen
        name="GrabPool"
        component={GrabPoolScreen}
        options={{
          tabBarLabel: '抢单',
          tabBarBadgeStyle: { backgroundColor: '#EF4444', minWidth: 16, height: 16, fontSize: 10 },
        }}
      />
      <Tab.Screen name="Orders" component={PendingOrdersScreen} options={{ tabBarLabel: '订单' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '我的' }} />
    </Tab.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  const isLoggedIn = useTechStore(state => state.isLoggedIn);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            {/* 主 Tab 导航 */}
            <Stack.Screen name="Main" component={MainTabs} />

            {/* 订单相关 */}
            <Stack.Screen name="PendingOrders" component={PendingOrdersScreen}
              options={{ presentation: 'card' }} />
            <Stack.Screen name="CurrentOrder" component={CurrentOrderScreen}
              options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="GrabPool" component={GrabPoolScreen} />

            {/* 个人中心子页面 */}
            <Stack.Screen name="EditProfile" component={PlaceholderPage}
              options={{ presentation: 'card' }} />
            <Stack.Screen name="TalentRegister" component={TalentRegisterScreen}
              options={{ presentation: 'modal' }} />
            <Stack.Screen name="RegisterSuccess" component={RegisterSuccessScreen} />
            <Stack.Screen name="RegisterProgress" component={PlaceholderPage} />
            <Stack.Screen name="IncomeRecords" component={IncomeScreen}
              options={{ presentation: 'card' }} />
            <Stack.Screen name="Withdraw" component={WithdrawScreen}
              options={{ presentation: 'modal' }} />
            <Stack.Screen name="ServiceStats" component={PlaceholderPage} />
            <Stack.Screen name="MyReviews" component={PlaceholderPage} />
            <Stack.Screen name="ServiceHistory" component={PlaceholderPage} />
            <Stack.Screen name="Notifications" component={PlaceholderPage} />
            <Stack.Screen name="Help" component={PlaceholderPage} />

            {/* 设置 */}
            <Stack.Screen name="Settings" component={SettingsScreen}
              options={{ presentation: 'card' }} />
            <Stack.Screen name="ChangePassword" component={PlaceholderPage} />
          </>
        ) : (
          // 未登录：登录 + 注册流程
          <>
            <Stack.Screen name="TechLogin" component={TechLoginScreen} />
            <Stack.Screen name="TalentRegister" component={TalentRegisterScreen} />
            <Stack.Screen name="RegisterSuccess" component={RegisterSuccessScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
