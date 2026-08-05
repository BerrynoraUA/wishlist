import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SingleImagePicker } from "@/components/ui/single-image-picker";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBugReport } from "@/hooks/use-bug-reports";
import { BUG_DESCRIPTION_MAX_LENGTH, BUG_TITLE_MAX_LENGTH } from "@/lib/bug-reports";
import { useImageUploadField } from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import { Bug, ImagePlus } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function SubmitBugReportSheet({
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
  const screenshotUpload = useImageUploadField("bug");
  const [error, setError] = React.useState<string | null>(null);
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [descriptionError, setDescriptionError] = React.useState<string | null>(null);
  const createReport = useCreateBugReport();
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (!open) return null;

  function handleClose() {
    if (createReport.isPending) return;
    void sheetRef.current?.dismiss();
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    screenshotUpload.reset();
    setError(null);
    setTitleError(null);
    setDescriptionError(null);
  }

  async function handleSubmit() {
    const nextTitleError = trimmedTitle ? null : t("Title is required.");
    const nextDescriptionError = trimmedDescription ? null : t("Description is required.");
    setTitleError(nextTitleError);
    setDescriptionError(nextDescriptionError);
    if (nextTitleError || nextDescriptionError || createReport.isPending) return;

    setError(null);
    // Resolves the background upload started when the screenshot was picked.
    const screenshotUrl = await screenshotUpload.resolveImageUrl("");
    if (screenshotUrl === undefined) return;

    createReport.mutate(
      { title: trimmedTitle, description: trimmedDescription, screenshotUrl },
      {
        onSuccess: () => {
          resetForm();
          onSubmitted();
          void sheetRef.current?.dismiss();
        },
        onError: (submitError) => {
          setError(submitError.message || t("Failed to submit bug report."));
        },
      },
    );
  }

  return (
    <BottomSheet ref={sheetRef} detents={["auto"]} onDidDismiss={onClose}>
      <View className="px-5 pb-6 pt-5">
        <View className="gap-4">
          <View className="flex-row items-start gap-3">
            <View className="size-10 items-center justify-center rounded-full bg-destructive/10">
              <Icon as={Bug} className="size-5 text-destructive" />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-lg font-extrabold text-text">{t("Report a Bug")}</Text>
              <Text className="text-sm leading-5 text-text-muted">
                {t("Tell us what happened, and we will look into it.")}
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-text">{t("Title")}</Text>
              <Text className="text-xs text-text-light">
                {title.length}/{BUG_TITLE_MAX_LENGTH}
              </Text>
            </View>
            <Input
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (value.trim()) setTitleError(null);
              }}
              placeholder={t("e.g. Wishlist items disappear after editing")}
              maxLength={BUG_TITLE_MAX_LENGTH}
              editable={!createReport.isPending}
              returnKeyType="next"
              className={cn(titleError && "border-destructive")}
            />
            {titleError ? <Text className="text-xs text-destructive">{titleError}</Text> : null}
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-text">{t("Description")}</Text>
              <Text className="text-xs text-text-light">
                {description.length}/{BUG_DESCRIPTION_MAX_LENGTH}
              </Text>
            </View>
            <Textarea
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                if (value.trim()) setDescriptionError(null);
              }}
              placeholder={t("What happened, and what did you expect instead?")}
              maxLength={BUG_DESCRIPTION_MAX_LENGTH}
              editable={!createReport.isPending}
              className={cn("min-h-28 text-text", descriptionError && "border-destructive")}
            />
            {descriptionError ? (
              <Text className="text-xs text-destructive">{descriptionError}</Text>
            ) : null}
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-text">{t("Screenshot")}</Text>
              <Text className="text-xs text-text-light">{t("Optional")}</Text>
            </View>
            <SingleImagePicker
              previewUri={screenshotUpload.pickedImage?.uri}
              aspect={[16, 9]}
              pickLabel={t("Attach a screenshot")}
              changeLabel={t("Change screenshot")}
              onPick={screenshotUpload.onPick}
              onClear={screenshotUpload.onClear}
              onError={screenshotUpload.onError}
              showChangeButton={false}
            />
            {screenshotUpload.error ? (
              <Text className="text-xs text-destructive">{screenshotUpload.error}</Text>
            ) : (
              <View className="flex-row items-center gap-1">
                <Icon as={ImagePlus} className="size-3.5 text-text-light" />
                <Text className="text-xs text-text-light">{t("PNG or JPG, up to 5 MB.")}</Text>
              </View>
            )}
          </View>

          {error ? (
            <View className="rounded-lg border border-destructive/25 bg-danger-bg p-3">
              <Text selectable className="text-sm font-semibold text-destructive">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              variant="outline"
              disabled={createReport.isPending}
              onPress={handleClose}
            >
              <Text>{t("Cancel")}</Text>
            </Button>
            <Button className="flex-1" disabled={createReport.isPending} onPress={handleSubmit}>
              {createReport.isPending ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Text>{createReport.isPending ? t("Submitting...") : t("Submit")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
