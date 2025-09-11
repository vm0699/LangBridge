import React, { useState, useCallback } from 'react';
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
import { verifyOtp } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { DEV_BYPASS } from '@/config';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOTP'>;

export default function VerifyOTP({ route, navigation }: Props) {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore(s => s.setToken);

  const goToApp = useCallback(
    async (token: string) => {
      await setToken(token);
      navigation.reset({ index: 0, routes: [{ name: 'SyncContacts' }] });
    },
    [navigation, setToken]
  );

  const submitVerify = useCallback(async () => {
    if (!otp || otp.length < 4) {
      if (DEV_BYPASS) {
        await goToApp('dev-token');
        return;
      }
      Alert.alert('Enter the OTP');
      return;
    }

    if (DEV_BYPASS) {
      await goToApp('dev-token');
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();
      const data = await verifyOtp(phone, otp);
      if (!data?.token) throw new Error('Token missing in response');
      await goToApp(data.token);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        'Try again';
      Alert.alert('Verification failed', msg);
    } finally {
      setLoading(false);
    }
  }, [otp, phone, goToApp]);

  const onChangeOtp = (val: string) => {
    // keep digits only, max 6
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    // Optional: auto-submit when 6 digits entered and not loading
    // if (digits.length === 6 && !loading) submitVerify();
  };

  const onVerifyPress = async () => {
    await submitVerify();
  };

  const onBypass = async () => {
    await goToApp('dev-token');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>
          OTP sent to {phone}
        </Text>

        <TextInput
          value={otp}
          onChangeText={onChangeOtp}
          keyboardType="number-pad"
          placeholder="Enter OTP"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={onVerifyPress}
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 12,
            letterSpacing: 6,
          }}
        />

        <Pressable
          onPress={onVerifyPress}
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
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Text>
        </Pressable>

        {DEV_BYPASS && (
          <Pressable
            onPress={onBypass}
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              alignItems: 'center',
            }}
          >
            <Text>🚧 Dev bypass (skip OTP)</Text>
          </Pressable>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
