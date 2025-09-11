import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/appnav';
import { sendOtp } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { DEV_BYPASS } from '@/config';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginPhone'>;

export default function LoginPhone({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const setPhoneInStore = useAuthStore(s => s.setPhone);

  const normalizePhone = (num: string) => {
    // Ensure phone is in E.164 format
    if (!num.startsWith('+')) {
      return '+91' + num.replace(/\D/g, ''); // default to India if missing
    }
    return num.replace(/\s+/g, '');
  };

  const onSend = async () => {
    if (!phone || phone.length < 8) {
      Alert.alert('Enter a valid phone number');
      return;
    }

    const formatted = normalizePhone(phone);
    setPhoneInStore(formatted);

    // 🚧 DEV bypass for navigation only
    if (DEV_BYPASS) {
      navigation.navigate('VerifyOTP', { phone: formatted });
      return;
    }

    try {
      setLoading(true);
      await sendOtp(formatted); // calls backend /otp/send
      navigation.navigate('VerifyOTP', { phone: formatted });
    } catch (e: any) {
  console.log('[OTP] send error', e?.message, e?.response?.data);
  Alert.alert('Failed to send OTP', e?.response?.data?.detail || e?.message || 'Try again'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
          LangBridge
        </Text>

        <Text>Enter phone number</Text>

        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+91 9xxxxxxxxx"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 12,
          }}
        />

        <Pressable
          onPress={onSend}
          style={{
            backgroundColor: '#111827',
            padding: 14,
            borderRadius: 10,
            alignItems: 'center',
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>
            {loading ? 'Sending...' : 'Send OTP'}
          </Text>
        </Pressable>
      </View>
    </TouchableWithoutFeedback>
  );
}
