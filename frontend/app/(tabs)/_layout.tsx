/**
 * (tabs)/_layout.tsx
 *
 * Tab structure:
 *   Map      — always visible (public, no auth required)
 *   Vendor   — vendor only (hidden for customers / guests)
 *   Billing  — vendor only (hidden for customers / guests)
 *   Profile  — always visible (shows login prompt if not authenticated)
 *
 * Design: icons only, glassmorphic bottom bar, active pill highlight.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "../../components/haptic-tab";
import { Colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

const theme = Colors.light;
const NAV_HEIGHT = 60;

type TabIconProps = {
  iconName: string;
  color: string;
  focused: boolean;
};

function TabIcon({ iconName, color, focused }: TabIconProps) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <MaterialIcons name={iconName as any} size={24} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isVendor = user?.role === "vendor";
  const bottomInset = insets.bottom || (Platform.OS === "ios" ? 34 : 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.onSurfaceVariant,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: [
          styles.tabBar,
          { height: NAV_HEIGHT + bottomInset, paddingBottom: bottomInset },
        ],
      }}
    >
      {/* ── Map (always visible) ─────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon iconName={focused ? "map" : "map"} color={color} focused={focused} />
          ),
        }}
      />

      {/* ── Vendor / Inventory (vendor only) ─────────── */}
      <Tabs.Screen
        name="vendor"
        options={{
          title: "Inventory",
          href: isVendor ? undefined : null,   // null = hide from tab bar
          tabBarIcon: ({ color, focused }) => (
            <TabIcon iconName="inventory-2" color={color} focused={focused} />
          ),
        }}
      />

      {/* ── Billing (vendor only) ────────────────────── */}
      <Tabs.Screen
        name="billing"
        options={{
          title: "Billing",
          href: isVendor ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon iconName="receipt-long" color={color} focused={focused} />
          ),
        }}
      />

      {/* ── Profile (always visible) ─────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon iconName={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(244, 250, 253, 0.94)",
    borderTopWidth: 1,
    borderTopColor: "rgba(155, 69, 0, 0.10)",   // faint primary tint
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 0,
    paddingTop: 0,
  },
  iconPill: {
    width: 48,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconPillActive: {
    backgroundColor: "rgba(155, 69, 0, 0.12)",  // primary/12%
  },
});
