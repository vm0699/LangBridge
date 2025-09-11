import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/appnav';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatList'>;

export default function ChatList({ navigation }: Props) {
  return (
    <View style={{ flex: 1, padding: 20, gap: 16, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>LangBridge booted ✅</Text>
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        style={{ marginTop: 8, padding: 12, borderWidth: 1, borderRadius: 8 }}
      >
        <Text>Settings</Text>
      </Pressable>
    </View>
  );
}
