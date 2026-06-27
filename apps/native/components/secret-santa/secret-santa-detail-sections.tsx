import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { SecretSantaPersonAvatar } from "@/components/secret-santa/secret-santa-person-avatar";
import { MascotEmptyState, type MascotVariant } from "@/components/shared/mascot-empty-state";
import { useGiftSuggestions } from "@/hooks/use-secret-santa";
import {
  formatSecretSantaBudget,
  formatSecretSantaDate,
  getSecretSantaPersonName,
} from "@/lib/secret-santa";
import type {
  SecretSantaDetails,
  SecretSantaPendingInvite,
  SecretSantaPerson,
  VisibleItem,
} from "@wishlist/backend/types/secret-santa";
import {
  CalendarDays,
  Copy,
  Gift,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react-native";
import { useGT, useLocale } from "gt-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";

export function SecretSantaDetailHero({
  event,
  totalPeople,
  isOwner,
  copied,
  onCopyLink,
  onEdit,
  onDelete,
  topInset = 0,
}: {
  event: SecretSantaDetails;
  totalPeople: number;
  isOwner: boolean;
  copied: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  topInset?: number;
}) {
  const t = useGT();
  const locale = useLocale();

  return (
    <View className="w-full self-stretch overflow-hidden border-b border-border-subtle">
      <View className="absolute inset-0 bg-linear-135 from-pink-300 via-pink-400 to-pink-600" />
      {event.image_url ? (
        <StyledImage
          source={{ uri: event.image_url }}
          contentFit="cover"
          className="absolute inset-0 size-full"
        />
      ) : (
        <View className="absolute inset-0 items-center justify-center bg-brand-lighter">
          <Icon as={Gift} className="size-20 text-brand" />
        </View>
      )}
      <View className="absolute inset-0 bg-black/25" />

      <View className="gap-4 px-4 pb-4" style={{ paddingTop: topInset + 8 }}>
        <View className="flex-row items-center justify-end gap-2">
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={copied ? t("Invite link copied") : t("Copy invite")}
            onPress={onCopyLink}
            className="size-9 items-center justify-center rounded-full border border-white/35 bg-white/25"
          >
            <Icon as={Copy} className="size-4 text-white" />
          </AnimatedPressable>

          {isOwner ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Secret Santa actions")}
                  className="size-9 items-center justify-center rounded-full border border-white/35 bg-white/25"
                >
                  <Icon as={MoreHorizontal} className="size-4 text-white" />
                </AnimatedPressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-44">
                <DropdownMenuItem onPress={onEdit}>
                  <Icon as={Pencil} className="size-4 text-popover-foreground" />
                  <Text>{t("Edit")}</Text>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={onDelete}
                  className="active:bg-danger-bg dark:active:bg-danger-bg/90"
                >
                  <Icon as={Trash2} className="size-4 text-destructive" />
                  <Text className="text-destructive">{t("Delete")}</Text>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </View>

        <View className="min-h-24 justify-end gap-3">
          <Text className="text-[21px] font-extrabold leading-6 text-white" numberOfLines={2}>
            {event.name}
          </Text>

          <View className="flex-row gap-2">
            <View className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/25 px-3">
              <Icon as={CalendarDays} className="size-3.5 text-white" />
              <Text className="text-xs font-bold text-white" numberOfLines={1}>
                {formatSecretSantaDate(event.event_date, locale ?? "en")}
              </Text>
            </View>
            <View className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/25 px-3">
              <Icon as={Gift} className="size-3.5 text-white" />
              <Text className="text-xs font-bold text-white" numberOfLines={1}>
                {formatSecretSantaBudget(event.budget, event.currency)}
              </Text>
            </View>
            <View className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/25 px-3">
              <Icon as={Users} className="size-3.5 text-white" />
              <Text className="text-xs font-bold text-white" numberOfLines={1}>
                {t("{count} people", { count: totalPeople })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function SecretSantaPeopleSection({
  title,
  description,
  emptyText,
  people,
  onRemove,
  emptyMascot,
}: {
  title: string;
  description?: string;
  emptyText: string;
  people: Array<SecretSantaPerson | SecretSantaPendingInvite>;
  onRemove?: (id: string) => void;
  emptyMascot?: MascotVariant;
}) {
  const t = useGT();

  return (
    <View className="gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm">
      <View className="gap-1">
        <Text className="text-lg font-extrabold text-text">{title}</Text>
        {description ? (
          <Text className="text-sm leading-5 text-text-muted">{description}</Text>
        ) : null}
      </View>

      {people.length === 0 ? (
        emptyMascot ? (
          <MascotEmptyState compact variant={emptyMascot} message={emptyText} />
        ) : (
          <Text className="rounded-xl bg-bg-subtle p-3 text-sm text-text-muted">{emptyText}</Text>
        )
      ) : (
        <View className="gap-2">
          {people.map((person) => {
            const key = "invite_id" in person ? person.invite_id : person.id;
            const subtitle =
              person.nickname ??
              ("invite_id" in person ? t("Invitation pending") : t("Wishlane member"));

            return (
              <View key={key} className="flex-row items-center gap-3 rounded-xl bg-bg-subtle p-3">
                <SecretSantaPersonAvatar person={person} />
                <View className="min-w-0 flex-1">
                  <Text className="font-extrabold text-text" numberOfLines={1}>
                    {getSecretSantaPersonName(person, t)}
                  </Text>
                  <Text className="text-sm text-text-muted" numberOfLines={1}>
                    {person.nickname ? `@${subtitle}` : subtitle}
                  </Text>
                </View>
                {"invite_id" in person ? (
                  <View className="rounded-full bg-info-bg px-2 py-1">
                    <Text className="text-[11px] font-extrabold text-info">{t("Pending")}</Text>
                  </View>
                ) : null}
                {onRemove ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    accessibilityLabel={t("Remove")}
                    onPress={() => onRemove(key)}
                    className="rounded-full"
                  >
                    <Icon as={UserMinus} className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function SecretSantaReceiverCard({ receiver }: { receiver: SecretSantaPerson }) {
  const t = useGT();

  return (
    <View className="gap-3 rounded-xl border border-brand/25 bg-brand-lighter p-4">
      <View className="flex-row items-center gap-3">
        <SecretSantaPersonAvatar person={receiver} sizeClassName="size-12" />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-brand">{t("Your Secret Santa match")}</Text>
          <Text className="text-xl font-extrabold text-text" numberOfLines={1}>
            {getSecretSantaPersonName(receiver, t)}
          </Text>
          {receiver.nickname ? (
            <Text className="text-sm text-text-muted" numberOfLines={1}>
              @{receiver.nickname}
            </Text>
          ) : null}
        </View>
        <Icon as={Sparkles} className="size-6 text-brand" />
      </View>
    </View>
  );
}

export function SecretSantaLaunchCard({
  canLaunch,
  pendingInvitesCount,
  participantsCount,
  onLaunch,
}: {
  canLaunch: boolean;
  pendingInvitesCount: number;
  participantsCount: number;
  onLaunch: () => void;
}) {
  const t = useGT();

  return (
    <View className="gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm">
      <View className="gap-1">
        <Text className="text-lg font-extrabold text-text">{t("Ready to draw?")}</Text>
      </View>
      <View className="gap-1">
        <Text className="text-sm font-semibold text-text-muted">
          {t("{count} accepted participants", { count: participantsCount })}
        </Text>
        <Text className="text-sm font-semibold text-text-muted">
          {t("{count} pending invites", { count: pendingInvitesCount })}
        </Text>
      </View>
      <Button disabled={!canLaunch} onPress={onLaunch}>
        <Icon as={Sparkles} className="size-4 text-primary-foreground" />
        <Text>{t("Launch Secret Santa")}</Text>
      </Button>
    </View>
  );
}

export function SecretSantaGiftSuggestions({
  receiverId,
  budget,
  currency,
}: {
  receiverId?: string;
  budget: number;
  currency: string | null;
}) {
  const t = useGT();
  const query = useGiftSuggestions(receiverId, budget);
  const items = query.data?.items ?? [];

  return (
    <View className="gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm">
      <View className="gap-1">
        <Text className="text-lg font-extrabold text-text">{t("Gift suggestions")}</Text>
        <Text className="text-sm leading-5 text-text-muted">
          {t("Visible wishlist items within {budget}.", {
            budget: formatSecretSantaBudget(budget, currency),
          })}
        </Text>
      </View>

      {query.isLoading ? (
        <View className="items-center justify-center rounded-xl bg-bg-subtle p-5">
          <ActivityIndicator colorClassName="accent-brand" />
        </View>
      ) : null}
      {query.isError ? (
        <Text className="rounded-xl bg-danger-bg p-3 text-sm font-semibold text-destructive">
          {t("Failed to load gift suggestions.")}
        </Text>
      ) : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <Text className="rounded-xl bg-bg-subtle p-3 text-sm text-text-muted">
          {t("No visible gift suggestions yet.")}
        </Text>
      ) : null}

      {items.map((item) => (
        <GiftSuggestionRow key={item.id} item={item} />
      ))}
    </View>
  );
}

function GiftSuggestionRow({ item }: { item: VisibleItem }) {
  const price =
    item.has_discount && item.discount_price ? item.discount_price : (item.price ?? null);

  return (
    <Pressable className="flex-row items-center gap-3 rounded-xl bg-bg-subtle p-3 active:bg-brand-lighter">
      <View className="size-14 items-center justify-center overflow-hidden rounded-xl bg-bg-muted">
        {item.image_url ? (
          <StyledImage source={{ uri: item.image_url }} contentFit="cover" className="size-full" />
        ) : (
          <Icon as={ImageIcon} className="size-5 text-text-light" />
        )}
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-extrabold text-text" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-xs font-semibold text-text-muted" numberOfLines={1}>
          {item.wishlist_title}
        </Text>
      </View>
      {price ? (
        <Text className="text-sm font-extrabold text-brand" numberOfLines={1}>
          {item.currency ? `${item.currency} ` : ""}
          {price}
        </Text>
      ) : null}
    </Pressable>
  );
}
