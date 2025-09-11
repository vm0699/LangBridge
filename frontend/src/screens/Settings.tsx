import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/appnav';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function Settings({ navigation }: Props) {
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);

  const onLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'LoginPhone' }] });
  };

  return (
    <View style={{ flex: 1, padding: 20, gap: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Settings</Text>
      <Text numberOfLines={2} style={{ color: '#555' }}>
        Token: {token ? token.slice(0, 16) + '…' : '(none)'}
      </Text>
      <Pressable
        onPress={onLogout}
        style={{ backgroundColor: '#ef4444', padding: 12, borderRadius: 10, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Log out</Text>
      </Pressable>
    </View>
  );
}
