import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
  type BottomSheetRef,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useCreateFeatureIdea } from "@/hooks/use-feature-ideas";
import { IDEA_DESCRIPTION_MAX_LENGTH, IDEA_TITLE_MAX_LENGTH } from "@/lib/feature-ideas";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, type ScrollView, View } from "react-native";

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
  const sheetScrollRef = React.useRef<ScrollView>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [descriptionError, setDescriptionError] = React.useState<string | null>(null);
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
    const nextTitleError = trimmedTitle ? null : t("Title is required.");
    const nextDescriptionError = trimmedDescription ? null : t("Description is required.");
    setTitleError(nextTitleError);
    setDescriptionError(nextDescriptionError);
    if (nextTitleError || nextDescriptionError) {
      return;
    }

    if (!canSubmit) return;

    setError(null);
    createIdea.mutate(
      { title: trimmedTitle, description: trimmedDescription },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setTitleError(null);
          setDescriptionError(null);
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
    <BottomSheet
      ref={sheetRef}
      scrollableRef={sheetScrollRef}
      detents={["auto"]}
      onDidDismiss={onClose}
      header={<BottomSheetHeader title={t("Submit a Feature Idea")} />}
      footer={
        <View className="w-full gap-3 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          {error ? (
            <View className="rounded-lg border border-destructive/25 bg-danger-bg p-3">
              <Text selectable className="text-sm font-semibold text-destructive">
                {error}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-stretch gap-2">
            <Button
              className="min-w-0 flex-1"
              variant="outline"
              disabled={createIdea.isPending}
              onPress={handleClose}
            >
              <Text>{t("Cancel")}</Text>
            </Button>
            <Button
              className="min-w-0 flex-1"
              disabled={createIdea.isPending}
              onPress={handleSubmit}
            >
              {createIdea.isPending ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Text>{createIdea.isPending ? t("Submitting...") : t("Submit")}</Text>
            </Button>
          </View>
        </View>
      }
    >
      <BottomSheetScrollView
        ref={sheetScrollRef}
        className="max-h-full"
        contentContainerClassName="gap-4 px-5 pb-3"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-text">{t("Title")}</Text>
            <Text className="text-xs text-text-light">
              {title.length}/{IDEA_TITLE_MAX_LENGTH}
            </Text>
          </View>
          <Input
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (value.trim()) setTitleError(null);
            }}
            placeholder={t("e.g. Dark mode calendar view")}
            maxLength={IDEA_TITLE_MAX_LENGTH}
            editable={!createIdea.isPending}
            returnKeyType="next"
            className={cn(titleError && "border-destructive")}
          />
          {titleError ? <Text className="text-xs text-destructive">{titleError}</Text> : null}
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
            onChangeText={(value) => {
              setDescription(value);
              if (value.trim()) setDescriptionError(null);
            }}
            placeholder={t("Describe your idea and why it would be useful...")}
            maxLength={IDEA_DESCRIPTION_MAX_LENGTH}
            editable={!createIdea.isPending}
            className={cn("min-h-24 text-text", descriptionError && "border-destructive")}
          />
          {descriptionError ? (
            <Text className="text-xs text-destructive">{descriptionError}</Text>
          ) : null}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
