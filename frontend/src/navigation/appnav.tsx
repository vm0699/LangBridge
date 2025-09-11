import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginPhone from '@/screens/LoginPhone';
import VerifyOTP from '@/screens/VerifyOTP';
import ContactsImport from '@/screens/ContactsImport';
import ChatList from '@/screens/ChatList';
import Settings from '@/screens/Settings';
import { useAuthStore } from '@/store/auth';
import SyncContacts from '@/screens/SyncContacts';

export type RootStackParamList = {
  LoginPhone: undefined;
  VerifyOTP: { phone: string };
  ContactsImport: undefined;
  ChatList: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNav() {
  const token = useAuthStore(s => s.token);
  // If token exists => go to app flow, else auth flow
  const isAuthed = !!token;

  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      {!isAuthed ? (
        <>
          <Stack.Screen
            name="LoginPhone"
            component={LoginPhone}
            options={{ title: 'Login' }}
          />
          <Stack.Screen
            name="VerifyOTP"
            component={VerifyOTP}
            options={{ title: 'Verify OTP' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="ChatList"
            component={ChatList}
            options={{ title: 'LangBridge' }}
          />
          <Stack.Screen
            name="ContactsImport"
            component={ContactsImport}
            options={{ title: 'Import Contacts' }}
          />
          <Stack.Screen
            name="Settings"
            component={Settings}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="SyncContacts"
            component={SyncContacts}
            options={{ title: 'Contacts' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
