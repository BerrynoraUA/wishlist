import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useSubscriptionManager } from "@/providers/subscription-provider";
import { useGT } from "gt-react-native";
import { Check, X } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, ImageBackground, Pressable, View } from "react-native";
import { PACKAGE_TYPE, type PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const background = require("@/assets/images/subscription-premium-bg.png");

const PREMIUM_FEATURES = [
  "Unlimited lists & items",
  "Collaborator access",
  "Sale alerts & tracking",
  "Custom colors & priorities",
] as const;

function getPlanName(plan: PurchasesPackage) {
  switch (plan.packageType) {
    case PACKAGE_TYPE.ANNUAL:
      return "Yearly";
    case PACKAGE_TYPE.MONTHLY:
      return "Monthly";
    case PACKAGE_TYPE.LIFETIME:
      return "Lifetime";
    default:
      return plan.product.title;
  }
}

function getPlanDetail(plan: PurchasesPackage) {
  switch (plan.packageType) {
    case PACKAGE_TYPE.ANNUAL:
      return plan.product.pricePerMonthString
        ? `${plan.product.pricePerMonthString} per month`
        : "Best value";
    case PACKAGE_TYPE.MONTHLY:
      return "Billed monthly";
    case PACKAGE_TYPE.LIFETIME:
      return "One-time purchase";
    default:
      return plan.product.description;
  }
}

function getPlanSuffix(plan: PurchasesPackage) {
  switch (plan.packageType) {
    case PACKAGE_TYPE.ANNUAL:
      return " / year";
    case PACKAGE_TYPE.MONTHLY:
      return " / month";
    default:
      return "";
  }
}

function getSavingsBadge(plan: PurchasesPackage, packages: PurchasesPackage[]) {
  if (plan.packageType !== PACKAGE_TYPE.ANNUAL) return null;

  const monthly = packages.find((candidate) => candidate.packageType === PACKAGE_TYPE.MONTHLY);
  const monthlyYearlyPrice = monthly?.product.price ? monthly.product.price * 12 : null;

  if (!monthlyYearlyPrice || monthlyYearlyPrice <= plan.product.price) return "SAVE 50%";

  const savings = Math.round((1 - plan.product.price / monthlyYearlyPrice) * 100);
  return savings > 0 ? `SAVE ${savings}%` : null;
}

function PlanOption({
  plan,
  isSelected,
  isCurrent,
  savingsBadge,
  onPress,
}: {
  plan: PurchasesPackage;
  isSelected: boolean;
  isCurrent: boolean;
  savingsBadge: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
    >
      <View
        className={cn(
          "min-h-[62px] flex-row items-center gap-3 rounded-xl border bg-black/35 px-4 py-3",
          isCurrent
            ? "border-success bg-success/15"
            : isSelected
              ? "border-white bg-white/15"
              : "border-white/15",
        )}
      >
        <View
          className={cn(
            "size-5 items-center justify-center rounded-full border-2 border-white/40",
            isSelected && "border-white",
          )}
        >
          {isSelected ? <View className="size-2.5 rounded-full bg-white" /> : null}
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-white">{getPlanName(plan)}</Text>
            {savingsBadge ? (
              <View className="rounded-full bg-white px-2 py-0.5">
                <Text className="text-[10px] font-bold text-black">{savingsBadge}</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xs text-white/60">
            {isCurrent ? "Current plan" : getPlanDetail(plan)}
          </Text>
        </View>
        <Text className="shrink-0 font-semibold text-white">
          {plan.product.priceString}
          <Text className="text-xs font-normal text-white/60">{getPlanSuffix(plan)}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

export function Subscription({
  onClose,
  onCompleted,
  className,
}: {
  onClose?: () => void;
  onCompleted?: () => void;
  className?: string;
}) {
  const t = useGT();
  const insets = useSafeAreaInsets();
  const {
    packages,
    selectedPackage,
    selectedPackageId,
    activeProductId,
    isConfigured,
    isLoading,
    isPro,
    expiresAt,
    paddleSubscriptionId,
    state,
    error,
    selectPackage,
    purchaseSelectedPackage,
    restorePurchases,
    openManagement,
    refresh,
  } = useSubscriptionManager();

  const isPurchasing = state === "purchasing";
  const isRestoring = state === "restoring";
  const isBusy = isPurchasing || isRestoring;
  const isWebSubscription = isPro && Boolean(paddleSubscriptionId);
  const hasMobileSubscription = Boolean(activeProductId);
  const hasExternalSubscription = isWebSubscription;
  const isCurrentSelection =
    Boolean(activeProductId) && activeProductId === selectedPackage?.product.identifier;
  const isPurchaseDisabled =
    !isConfigured || !selectedPackage || isCurrentSelection || hasExternalSubscription || isBusy;
  const renewalLabel = expiresAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(expiresAt))
    : null;

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handlePurchase() {
    const didComplete = await purchaseSelectedPackage();
    if (didComplete) onCompleted?.();
  }

  async function handleRestore() {
    const didComplete = await restorePurchases();
    if (didComplete) onCompleted?.();
  }

  return (
    <View className={cn("flex-1 overflow-hidden bg-black", className)}>
      <ImageBackground className="flex-1" resizeMode="cover" source={background}>
        <View className="absolute inset-0 bg-black/10" />
        <View
          className="flex-1 justify-between"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View
            className="flex-row items-center justify-between px-6"
            style={{ paddingTop: insets.top + 24 }}
          >
            <Pressable
              disabled={!isConfigured || isBusy}
              hitSlop={12}
              onPress={() => void handleRestore()}
            >
              <Text className="text-sm font-medium text-white/70">
                {isRestoring ? t("Restoring purchases...") : t("Restore purchases")}
              </Text>
            </Pressable>
            {onClose ? (
              <Pressable
                accessibilityLabel={t("Close")}
                className="size-10 items-center justify-center rounded-full bg-black/30 active:bg-black/45"
                hitSlop={12}
                onPress={onClose}
              >
                <Icon as={X} className="size-5 text-white" />
              </Pressable>
            ) : (
              <View className="size-10" />
            )}
          </View>

          <View className="gap-5 px-6">
            <View className="gap-2">
              <Text className="text-3xl font-bold tracking-tight text-white">
                {t("Wishlane Premium")}
              </Text>
              <Text className="text-base text-white/75">
                {t("More room, smarter lists, and better sharing.")}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-y-2">
              {PREMIUM_FEATURES.map((feature) => (
                <View className="w-1/2 flex-row items-center gap-2" key={feature}>
                  <Icon as={Check} className="size-4 text-white/80" strokeWidth={3} />
                  <Text className="text-xs font-medium text-white/80">{t(feature)}</Text>
                </View>
              ))}
            </View>

            <View className="gap-3">
              {isLoading ? (
                <ActivityIndicator accessibilityLabel={t("Loading plans")} size="large" />
              ) : null}

              {!isLoading && !isConfigured ? (
                <View className="gap-2 rounded-xl border border-white/15 bg-black/35 p-4">
                  <Text className="font-semibold text-white">{t("Premium plans unavailable")}</Text>
                  <Text selectable className="text-sm leading-5 text-white/70">
                    {error ??
                      t(
                        "Add the RevenueCat public SDK key for this platform to load premium plans.",
                      )}
                  </Text>
                </View>
              ) : null}

              {isConfigured && !isLoading && packages.length === 0 ? (
                <View className="gap-2 rounded-xl border border-white/15 bg-black/35 p-4">
                  <Text className="font-semibold text-white">{t("No plans found")}</Text>
                  <Text selectable className="text-sm leading-5 text-white/70">
                    {t("Add products to the current RevenueCat offering to display them here.")}
                  </Text>
                </View>
              ) : null}

              {packages.map((plan) => {
                const isSelected = selectedPackageId === plan.identifier;
                const isCurrent = activeProductId === plan.product.identifier;

                return (
                  <PlanOption
                    key={plan.identifier}
                    plan={plan}
                    isSelected={isSelected}
                    isCurrent={isCurrent}
                    savingsBadge={getSavingsBadge(plan, packages)}
                    onPress={() => selectPackage(plan.identifier)}
                  />
                );
              })}
            </View>

            {hasExternalSubscription ? (
              <View className="gap-1 rounded-xl border border-white/15 bg-black/35 p-4">
                <Text className="font-semibold text-white">{t("Subscription active")}</Text>
                <Text className="text-sm leading-5 text-white/70">
                  {renewalLabel
                    ? t(
                        "Your subscription is active through {date}. Manage it where you subscribed.",
                        {
                          date: renewalLabel,
                        },
                      )
                    : t("Your subscription is active. Manage it where you subscribed.")}
                </Text>
              </View>
            ) : null}

            {isConfigured && error ? (
              <Text selectable className="text-center text-sm text-red-300">
                {error}
              </Text>
            ) : null}

            <View className="gap-3">
              <Button
                size="lg"
                className="h-14 rounded-xl bg-white active:bg-white/90"
                disabled={isPurchaseDisabled}
                onPress={() => void handlePurchase()}
              >
                {isBusy ? <ActivityIndicator color="black" /> : null}
                <Text className="text-black">
                  {isPurchasing
                    ? t("Completing purchase...")
                    : hasExternalSubscription
                      ? t("Subscription active")
                      : isPro
                        ? t("Switch plan")
                        : t("Continue")}
                </Text>
              </Button>

              {hasMobileSubscription ? (
                <Pressable className="py-2" disabled={isBusy} onPress={() => void openManagement()}>
                  <Text className="text-center text-sm font-medium text-red-300">
                    {t("Cancel subscription")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
