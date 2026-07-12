import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useCreateFeatureIdea } from "@/hooks/use-feature-ideas";
import { IDEA_DESCRIPTION_MAX_LENGTH, IDEA_TITLE_MAX_LENGTH } from "@/lib/feature-ideas";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function SubmitFeatureIdeaSheet({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const createIdea = useCreateFeatureIdea();
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const canSubmit = Boolean(trimmedTitle && trimmedDescription && !createIdea.isPending);

  if (!open) return null;

  function handleClose() {
    if (createIdea.isPending) return;
    void sheetRef.current?.dismiss();
  }

  function handleSubmit() {
    if (!canSubmit) return;

    setError(null);
    createIdea.mutate(
      { title: trimmedTitle, description: trimmedDescription },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          onSubmitted();
          void sheetRef.current?.dismiss();
        },
        onError: (submitError) => {
          setError(submitError.message || t("Failed to submit idea."));
        },
      },
    );
  }

  return (
    <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={onClose}>
      <View className="px-5 pb-6 pt-5">
        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-lg font-extrabold text-text">{t("Submit a Feature Idea")}</Text>
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-text">{t("Title")}</Text>
              <Text className="text-xs text-text-light">
                {title.length}/{IDEA_TITLE_MAX_LENGTH}
              </Text>
            </View>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder={t("e.g. Dark mode calendar view")}
              maxLength={IDEA_TITLE_MAX_LENGTH}
              editable={!createIdea.isPending}
              returnKeyType="next"
            />
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-text">{t("Description")}</Text>
              <Text className="text-xs text-text-light">
                {description.length}/{IDEA_DESCRIPTION_MAX_LENGTH}
              </Text>
            </View>
            <Textarea
              value={description}
              onChangeText={setDescription}
              placeholder={t("Describe your idea and why it would be useful...")}
              maxLength={IDEA_DESCRIPTION_MAX_LENGTH}
              editable={!createIdea.isPending}
              className="min-h-24"
            />
          </View>

          {error ? (
            <View className="rounded-lg border border-destructive/25 bg-danger-bg p-3">
              <Text selectable className="text-sm font-semibold text-destructive">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={createIdea.isPending} onPress={handleClose}>
              <Text>{t("Cancel")}</Text>
            </Button>
            <Button disabled={!canSubmit} onPress={handleSubmit}>
              {createIdea.isPending ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Text>{createIdea.isPending ? t("Submitting...") : t("Submit")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
