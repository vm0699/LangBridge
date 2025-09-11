import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/appnav';

type Props = NativeStackScreenProps<RootStackParamList, 'SyncContacts'>;

type Row = {
  id: string;
  name: string;
  numbers: string[];
};

export default function SyncContacts({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== Contacts.PermissionStatus.GRANTED) {
        setLoading(false);
        Alert.alert(
          'Permission needed',
          'Enable contacts permission in settings to show your contacts.'
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        pageSize: 2000,
        pageOffset: 0,
      });

      const normalized: Row[] = (data || [])
        .map((c) => {
          const nums =
            (c.phoneNumbers || [])
              .map((p) => (p?.number || '').replace(/\s+/g, ''))
              .filter(Boolean) || [];
          return {
            id: c.id!,
            name: c.name || 'Unnamed',
            numbers: nums,
          };
        })
        .filter((r) => r.numbers.length > 0);

      normalized.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );

      setRows(normalized);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.numbers.some((n) => n.includes(term))
    );
  }, [q, rows]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <ActivityIndicator size="large" />
        <Text>Loading contacts…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <TextInput
          placeholder="Search contacts"
          value={q}
          onChangeText={setQ}
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: '#eee' }} />
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('ChatScreen', {
                peerName: item.name,
                peerNumber: item.numbers[0], // pick primary number
              })
            }
            style={{ padding: 16 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: '#666', marginTop: 2 }}>{item.numbers[0]}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
