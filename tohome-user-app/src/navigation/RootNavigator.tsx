// 根导航
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, Receipt, ChatCircle, User } from '@/components/Icons';
import { useUserStore } from '../store/userStore';
import { colors } from '../theme';

import { HomeScreen } from '../screens/HomeScreen';
import { OrderListScreen } from '../screens/OrderListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ServiceListScreen } from '../screens/ServiceListScreen';
import { ServiceDetailScreen } from '../screens/ServiceDetailScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import AddressListScreen from '../screens/AddressListScreen';
import AddressEditScreen from '../screens/AddressEditScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ChatScreen from '../screens/ChatScreen';
import SearchScreen from '../screens/SearchScreen';
import { TechDashboardScreen } from '../screens/TechDashboardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let Icon;
          switch (route.name) {
            case 'Home':
              Icon = House;
              break;
            case 'Order':
              Icon = Receipt;
              break;
            case 'Message':
              Icon = ChatCircle;
              break;
            case 'Profile':
              Icon = User;
              break;
            default:
              Icon = House;
          }
          return <Icon size={size} color={color} weight={focused ? 'fill' : 'regular'} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '首页' }} />
      <Tab.Screen name="Order" component={OrderListScreen} options={{ tabBarLabel: '订单' }} />
      <Tab.Screen
        name="Message"
        component={ProfileScreen}
        options={{ tabBarLabel: '消息' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '我的' }} />
    </Tab.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  const isLoggedIn = useUserStore(state => state.isLoggedIn);
  const fetchUserInfo = useUserStore(state => state.fetchUserInfo);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserInfo();
    }
  }, [isLoggedIn]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ServiceList" component={ServiceListScreen} />
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="EditProfile" component={ProfileScreen} />
            <Stack.Screen name="AddressList" component={AddressListScreen} />
            <Stack.Screen name="AddressEdit" component={AddressEditScreen} />
            <Stack.Screen name="Coupons" component={ProfileScreen} />
            <Stack.Screen name="Favorites" component={ProfileScreen} />
            <Stack.Screen name="Wallet" component={ProfileScreen} />
            <Stack.Screen name="MemberCenter" component={ProfileScreen} />
            <Stack.Screen name="Notifications" component={ProfileScreen} />
            <Stack.Screen name="CustomerService" component={ChatScreen} />
            <Stack.Screen name="Settings" component={ProfileScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="TechDashboard" component={TechDashboardScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
