import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import * as React from "react";
import { View } from "react-native";

export type ShareFeedback = {
  variant: "success" | "error";
  title: string;
  description: string;
  link?: string | null;
} | null;

export function ShareFeedbackSheet({
  feedback,
  onOpenChange,
}: {
  feedback: ShareFeedback;
  onOpenChange: (open: boolean) => void;
}) {
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!feedback) return null;

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
    >
      <View className="gap-4 px-5 pb-5 pt-5">
        <View className="gap-2">
          <Text
            className={
              feedback.variant === "success"
                ? "text-lg font-extrabold text-success"
                : "text-lg font-extrabold text-destructive"
            }
          >
            {feedback.title}
          </Text>
          <Text className="text-sm text-text-muted">{feedback.description}</Text>
        </View>

        {feedback.link ? (
          <View className="rounded-xl border border-border-subtle bg-bg-subtle p-3">
            <Text className="text-xs font-semibold text-text-muted" selectable>
              {feedback.link}
            </Text>
          </View>
        ) : null}

        <Button onPress={handleClose}>
          <Text>Done</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}
