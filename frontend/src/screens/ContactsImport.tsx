import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/appnav';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactsImport'>;

export default function ContactsImport({ navigation }: Props) {
  return (
    <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', textAlign: 'center' }}>
        Import Contacts (placeholder)
      </Text>
      <Text style={{ textAlign: 'center', color: '#555' }}>
        We’ll request permission and map contacts to LangBridge later.
      </Text>
      <Pressable
        onPress={() => navigation.replace('ChatList')}
        style={{
          backgroundColor: '#111827',
          padding: 14,
          borderRadius: 10,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Continue</Text>
      </Pressable>
    </View>
  );
}
