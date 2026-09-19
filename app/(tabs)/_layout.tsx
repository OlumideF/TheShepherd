import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';

import { colors, typography } from '@/constants/theme';

function TabIcon({
  ios,
  android,
  web,
  color,
}: {
  ios: string;
  android: string;
  web: string;
  color: string;
}) {
  return (
    <SymbolView
      name={{
        ios: ios as 'house.fill',
        android: android as 'home',
        web: web as 'home',
      }}
      tintColor={color}
      size={24}
      fallback={
        <Text
          style={{
            color,
            fontSize: 12,
            fontFamily: 'SourceSans3_600SemiBold',
          }}
        >
          {web.slice(0, 1).toUpperCase()}
        </Text>
      }
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTitleStyle: {
          ...typography.heading,
          color: colors.ink,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarStyle: {
          backgroundColor: colors.canvasElevated,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: {
          fontFamily: 'SourceSans3_600SemiBold',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="house.fill"
              android="home"
              web="home"
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="play.rectangle.fill"
              android="play_circle"
              web="play"
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="calendar"
              android="calendar_month"
              web="event"
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="person.3.fill"
              android="groups"
              web="groups"
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="person.crop.circle"
              android="person"
              web="person"
              color={String(color)}
            />
          ),
        }}
      />
    </Tabs>
  );
}
