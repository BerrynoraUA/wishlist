import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSubscription, useOfferings, usePurchase } from "@/hooks/use-subscription";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { PRICING } from "@/types/subscription";

export default function SubscriptionScreen() {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const { data: offerings } = useOfferings();
  const purchase = usePurchase();

  const isPro = subscription?.plan === "pro";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {isPro ? "You're on Pro ✨" : "Upgrade to Pro"}
        </Text>
        <Text style={styles.subtitle}>
          {isPro
            ? "Thanks for supporting Wishlist!"
            : "Unlock unlimited wishlists & items"}
        </Text>

        {!isPro && offerings && (
          <View style={styles.plans}>
            <TouchableOpacity
              style={styles.planCard}
              onPress={() => {
                const monthly = offerings.find((p) => p.identifier === "pro_monthly");
                if (monthly) purchase.mutate(monthly);
              }}
            >
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>${PRICING.monthly}/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.planCard, styles.planCardHighlight]}
              onPress={() => {
                const annual = offerings.find((p) => p.identifier === "pro_yearly");
                if (annual) purchase.mutate(annual);
              }}
            >
              <Text style={styles.planName}>Annual</Text>
              <Text style={styles.planPrice}>${PRICING.yearly}/yr</Text>
              <Text style={styles.planSavings}>Save {PRICING.yearlySavingsPercent}%</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: "600" },
  content: { flex: 1, padding: Spacing.xl, alignItems: "center", paddingTop: 60 },
  title: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.text },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  plans: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
    width: "100%",
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planCardHighlight: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  planName: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  planPrice: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  planSavings: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
});
