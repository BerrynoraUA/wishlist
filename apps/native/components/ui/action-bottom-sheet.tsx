import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export type ActionBottomSheetMessagePayload = {
  title: string;
  message?: string;
};

export type ActionBottomSheetConfirmTone = "default" | "brand" | "success" | "destructive";

export function ActionBottomSheetMessage({
  message,
  onClose,
}: {
  message: ActionBottomSheetMessagePayload | null;
  onClose: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!message) return null;

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  return (
    <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={onClose}>
      <View className="gap-4 px-5 pb-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{message.title}</Text>
          {message.message ? (
            <Text className="text-sm leading-5 text-text-muted">{message.message}</Text>
          ) : null}
        </View>
        <Button onPress={handleClose}>
          <Text>{t("OK")}</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}

export function ActionBottomSheetConfirm({
  open,
  title,
  message,
  confirmLabel,
  isPending,
  tone = "default",
  children,
  confirmDisabled,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isPending?: boolean;
  tone?: ActionBottomSheetConfirmTone;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!open) return null;

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  return (
    <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={onClose}>
      <View className="gap-4 px-5 pb-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{title}</Text>
          <Text className="text-sm leading-5 text-text-muted">{message}</Text>
        </View>
        {children}
        <View className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={isPending} onPress={handleClose}>
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            variant={
              tone === "destructive" ? "destructive" : tone === "default" ? "default" : "ghost"
            }
            disabled={isPending || confirmDisabled}
            onPress={onConfirm}
            className={
              tone === "success"
                ? "rounded-lg border border-success/35 bg-success-bg"
                : tone === "brand"
                  ? "rounded-lg border border-brand/25 bg-brand-lighter"
                  : undefined
            }
          >
            {isPending ? (
              <ActivityIndicator
                colorClassName={
                  tone === "success"
                    ? "accent-success"
                    : tone === "brand"
                      ? "accent-brand"
                      : "accent-white"
                }
              />
            ) : null}
            <Text
              className={
                tone === "success" ? "text-success" : tone === "brand" ? "text-brand" : undefined
              }
            >
              {confirmLabel}
            </Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
