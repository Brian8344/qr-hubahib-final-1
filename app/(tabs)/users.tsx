
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

const roles: Role[] = ['student', 'teacher', 'admin'];

export default function UsersScreen() {
  const { user, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setError('Please log in first.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const profile = await getProfile(user.id);
      if (profile?.role !== 'admin') {
        setAuthorized(false);
        setError('Only administrators can manage accounts.');
        return;
      }

      setAuthorized(true);
      setError('');

      const result = await supabase
        .from('profiles')
        .select('id,email,full_name,role')
        .order('email', { ascending: true });

      if (result.error) throw result.error;
      setUsers((result.data ?? []) as UserRow[]);
    } catch (e) {
      console.error('Load users error:', e);
      setError('Could not load users. Check your Supabase permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const changeRole = (account: UserRow, nextRole: Role) => {
    if (account.id === user?.id) {
      Alert.alert('Action not allowed', 'You cannot change your own role here.');
      return;
    }

    Alert.alert(
      'Change account role?',
      `Change ${account.email} from ${account.role} to ${nextRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change role',
          onPress: async () => {
            const result = await supabase
              .from('profiles')
              .update({ role: nextRole })
              .eq('id', account.id);

            if (result.error) {
              Alert.alert(
                'Update failed',
                result.error.message +
                  '\n\nCheck your role-protection trigger and RLS policies.'
              );
              return;
            }

            Alert.alert('Updated', 'The account role was updated.');
            void loadUsers();
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((item) => {
    const query = search.trim().toLowerCase();
    return (
      item.email.toLowerCase().includes(query) ||
      (item.full_name ?? '').toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading user accounts...</Text>
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={styles.container}>
        <Header title="User Management" />
        <Text style={styles.error}>{error || 'Access restricted.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="User Management" subtitle="Manage registered accounts" />

      <View style={styles.summary}>
        <Ionicons name="people" size={25} color={COLORS.primary} />
        <View>
          <Text style={styles.summaryNumber}>{users.length}</Text>
          <Text style={styles.muted}>Registered profiles</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search name, email, or role..."
        placeholderTextColor={COLORS.muted}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadUsers();
            }}
          />
        }
      >
        {filteredUsers.map((account) => (
          <View key={account.id} style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={23} color={COLORS.primary} />
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.name}>
                {account.full_name || 'Unnamed user'}
              </Text>
              <Text style={styles.email}>{account.email}</Text>
              <Text style={styles.role}>Current role: {account.role}</Text>

              <View style={styles.roleOptions}>
                {roles.map((itemRole) => (
                  <Pressable
                    key={itemRole}
                    onPress={() => changeRole(account, itemRole)}
                    disabled={itemRole === account.role}
                    style={[
                      styles.roleButton,
                      itemRole === account.role && styles.roleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        itemRole === account.role && styles.roleSelectedText,
                      ]}
                    >
                      {itemRole}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <Text style={styles.empty}>No matching accounts found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.primaryLight,
    margin: 16,
    padding: 18,
    borderRadius: 16,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  search: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 13,
    padding: 13,
    marginHorizontal: 16,
    marginBottom: 10,
    color: COLORS.textPrimary,
  },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1, gap: 6 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  email: { fontSize: 12, color: COLORS.textSecondary },
  role: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  roleButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roleSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  roleSelectedText: { color: COLORS.textOnPrimary },
  muted: { fontSize: 12, color: COLORS.textSecondary },
  error: { margin: 16, color: COLORS.danger },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    padding: 24,
  },
});
