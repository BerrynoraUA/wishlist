import { configureRevenueCat } from "@/lib/revenuecat";
import { syncSubscription } from "@/api/subscription";
import { subscriptionKeys, useSubscriptionStatus } from "@/hooks/use-subscription";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import Purchases, {
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  STORE_REPLACEMENT_MODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  type StoreProductChangeInfo,
} from "react-native-purchases";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Linking, Platform } from "react-native";

type PurchaseState = "idle" | "loading" | "purchasing" | "restoring";

const RC_PRO_ENTITLEMENT_ID = "pro_access";
const ANDROID_SUBSCRIPTION_STORES = new Set(["PLAY_STORE", "TEST_STORE"]);

interface SubscriptionContextValue {
  customerInfo: CustomerInfo | null;
  offering: PurchasesOffering | null;
  packages: PurchasesPackage[];
  selectedPackage: PurchasesPackage | null;
  selectedPackageId: string | null;
  activeProductId: string | null;
  activeEntitlementStore: string | null;
  hasExternalSubscription: boolean;
  hasManageableSubscription: boolean;
  isConfigured: boolean;
  isPro: boolean;
  expiresAt: string | null;
  isLoading: boolean;
  state: PurchaseState;
  error: string | null;
  selectPackage: (packageId: string) => void;
  refresh: () => Promise<void>;
  purchaseSelectedPackage: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  openManagement: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function formatError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  ) {
    return null;
  }

  if (error && typeof error === "object" && "userCancelled" in error) {
    const cancelled = (error as { userCancelled?: unknown }).userCancelled;
    if (cancelled === true) return null;
  }

  if (error instanceof Error) return error.message;
  return "Subscription action failed";
}

function sortPackages(packages: PurchasesPackage[]) {
  return [...packages].sort((a, b) => {
    if (a.packageType === PACKAGE_TYPE.ANNUAL) return -1;
    if (b.packageType === PACKAGE_TYPE.ANNUAL) return 1;
    if (a.packageType === PACKAGE_TYPE.MONTHLY) return -1;
    if (b.packageType === PACKAGE_TYPE.MONTHLY) return 1;
    if (a.packageType === PACKAGE_TYPE.LIFETIME) return -1;
    if (b.packageType === PACKAGE_TYPE.LIFETIME) return 1;
    return a.identifier.localeCompare(b.identifier);
  });
}

function getProductId(subscription: string) {
  return subscription.split(":")[0];
}

function getSubscriptionStore(customerInfo: CustomerInfo, subscription: string) {
  return customerInfo.subscriptionsByProductIdentifier[getProductId(subscription)]?.store ?? null;
}

function isAndroidSubscriptionStore(store?: string | null) {
  return Boolean(store && ANDROID_SUBSCRIPTION_STORES.has(store));
}

function getActiveAndroidSubscription(customerInfo: CustomerInfo) {
  return customerInfo.activeSubscriptions.find((subscription) =>
    isAndroidSubscriptionStore(getSubscriptionStore(customerInfo, subscription)),
  );
}

async function getProductChangeInfo(
  selectedPackage: PurchasesPackage,
): Promise<StoreProductChangeInfo | null> {
  if (Platform.OS !== "android") return null;

  const customerInfo = await Purchases.getCustomerInfo();
  const activeSubscription = getActiveAndroidSubscription(customerInfo);

  if (
    !activeSubscription ||
    getProductId(activeSubscription) === selectedPackage.product.identifier
  ) {
    return null;
  }

  return {
    oldProductIdentifier: getProductId(activeSubscription),
    replacementMode: STORE_REPLACEMENT_MODE.DEFERRED,
  };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const subscriptionStatus = useSubscriptionStatus();
  const {
    expiresAt,
    isLoading: isSubscriptionLoading,
    isPro,
    refetch: refetchSubscriptionStatus,
  } = subscriptionStatus;
  const queryClient = useQueryClient();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [state, setState] = useState<PurchaseState>("idle");
  const [error, setError] = useState<string | null>(null);

  const packages = useMemo(
    () => sortPackages(offering?.availablePackages ?? []),
    [offering?.availablePackages],
  );

  const selectedPackage = useMemo(() => {
    return packages.find((item) => item.identifier === selectedPackageId) ?? packages[0] ?? null;
  }, [packages, selectedPackageId]);
  const activeProductId = useMemo(() => {
    if (!customerInfo) return null;

    const activeSubscription = getActiveAndroidSubscription(customerInfo);
    return activeSubscription ? getProductId(activeSubscription) : null;
  }, [customerInfo]);
  const activeEntitlementStore = useMemo(() => {
    const proEntitlement = customerInfo?.entitlements.active[RC_PRO_ENTITLEMENT_ID];
    return proEntitlement?.store ?? null;
  }, [customerInfo]);
  const hasManageableSubscription = Boolean(customerInfo?.managementURL);
  const hasExternalSubscription =
    isPro && Boolean(activeEntitlementStore) && !isAndroidSubscriptionStore(activeEntitlementStore);

  const updateCustomerInfo = React.useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
  }, []);

  const syncServerStatus = React.useCallback(async () => {
    const status = await syncSubscription();
    queryClient.setQueryData(subscriptionKeys.status(user?.id), status);
    return status;
  }, [queryClient, user?.id]);

  const refresh = React.useCallback(async () => {
    if (!user?.id) return;

    setState("loading");
    setError(null);

    try {
      await refetchSubscriptionStatus();

      const configured = Boolean(await configureRevenueCat(user.id));
      setIsConfigured(configured);

      if (!configured) {
        setError("RevenueCat is not configured for this build.");
        return;
      }

      const info = await Purchases.getCustomerInfo();
      updateCustomerInfo(info);

      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
      setOffering(currentOffering);
    } catch (err) {
      setIsConfigured(false);
      setError(formatError(err) ?? "Could not load subscription options");
    } finally {
      setState("idle");
    }
  }, [refetchSubscriptionStatus, updateCustomerInfo, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setCustomerInfo(null);
      setOffering(null);
      setSelectedPackageId(null);
      setIsConfigured(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedPackageId && packages.some((item) => item.identifier === selectedPackageId)) {
      return;
    }

    setSelectedPackageId(packages[0]?.identifier ?? null);
  }, [packages, selectedPackageId]);

  async function purchaseSelectedPackage() {
    if (!selectedPackage) return false;

    setState("purchasing");
    setError(null);

    try {
      const result = await Purchases.purchasePackage(
        selectedPackage,
        null,
        await getProductChangeInfo(selectedPackage),
      );
      updateCustomerInfo(result.customerInfo);
      await syncServerStatus();
      return true;
    } catch (err) {
      const message = formatError(err);
      if (message) setError(message);
      return false;
    } finally {
      setState("idle");
    }
  }

  async function restorePurchases() {
    setState("restoring");
    setError(null);

    try {
      const info = await Purchases.restorePurchases();
      updateCustomerInfo(info);
      await syncServerStatus();
      return true;
    } catch (err) {
      const message = formatError(err);
      if (message) setError(message);
      return false;
    } finally {
      setState("idle");
    }
  }

  async function openManagement() {
    setError(null);

    try {
      const info = await Purchases.getCustomerInfo();
      updateCustomerInfo(info);

      if (info.managementURL) {
        await Linking.openURL(info.managementURL);
        return;
      }

      if (Platform.OS !== "ios") {
        setError("Subscription management is not available until a store subscription is active.");
        return;
      }

      await Purchases.showManageSubscriptions();
    } catch (err) {
      setError(formatError(err) ?? "Could not open subscription management");
    }
  }

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      customerInfo,
      offering,
      packages,
      selectedPackage,
      selectedPackageId,
      activeProductId,
      activeEntitlementStore,
      hasExternalSubscription,
      hasManageableSubscription,
      isConfigured,
      isPro,
      expiresAt,
      isLoading: state === "loading" || isSubscriptionLoading,
      state,
      error,
      selectPackage: setSelectedPackageId,
      refresh,
      purchaseSelectedPackage,
      restorePurchases,
      openManagement,
    }),
    [
      customerInfo,
      error,
      isConfigured,
      offering,
      packages,
      refresh,
      selectedPackage,
      selectedPackageId,
      state,
      activeProductId,
      activeEntitlementStore,
      expiresAt,
      hasExternalSubscription,
      hasManageableSubscription,
      isPro,
      isSubscriptionLoading,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptionManager() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error("useSubscriptionManager must be used within SubscriptionProvider");
  }

  return context;
}
