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
    <BottomSheet ref={sheetRef} detents={["auto"]} dismissOnBack={false} onDidDismiss={onClose}>
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
  destructive = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isPending?: boolean;
  destructive?: boolean;
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
    <BottomSheet ref={sheetRef} detents={["auto"]} dismissOnBack={false} onDidDismiss={onClose}>
      <View className="gap-4 px-5 pb-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">{title}</Text>
          <Text className="text-sm leading-5 text-text-muted">{message}</Text>
        </View>
        <View className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={isPending} onPress={handleClose}>
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onPress={onConfirm}
          >
            {isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>{confirmLabel}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
