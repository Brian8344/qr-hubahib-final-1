
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Tabs, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function TabLayout() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadRole() {
        if (authLoading) return;

        if (!user) {
          if (active) {
            setRole(null);
            setLoadingRole(false);
          }
          return;
        }

        setLoadingRole(true);

        try {
          const profile = await getProfile(user.id);

          if (active) {
            setRole(profile?.role ?? null);
          }
        } catch (error) {
          console.error('Unable to load user role:', error);

          if (active) {
            setRole(null);
          }
        } finally {
          if (active) {
            setLoadingRole(false);
          }
        }
      }

      void loadRole();

      return () => {
        active = false;
      };
    }, [user, authLoading])
  );

  if (authLoading || loadingRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '800',
        },
        headerShadowVisible: false,

        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 3,
        },
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 66,
          paddingTop: 5,
          paddingBottom: 5,
          elevation: 8,
          shadowColor: COLORS.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: {
            width: 0,
            height: -3,
          },
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Student QR scanner */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan QR',
          href: isStudent ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'scan' : 'scan-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Existing student and teacher history */}
      <Tabs.Screen
        name="history"
        options={{
          title: isTeacher ? 'Attendance' : 'History',
          href: isStudent || isTeacher ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Teacher event screen */}
      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Events',
          href: isTeacher ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Admin user management */}
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Admin event management */}
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Admin attendance overview */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Admin tab is immediately after Attendance */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'shield-checkmark'
                  : 'shield-checkmark-outline'
              }
              color={color}
              size={22}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
