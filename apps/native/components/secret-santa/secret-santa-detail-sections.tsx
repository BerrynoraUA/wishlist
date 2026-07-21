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
  MIN_PARTICIPANTS_TO_LAUNCH,
} from "@/lib/secret-santa";
import { cn } from "@/lib/utils";
import { getWishlistAccentClass } from "@/lib/wishlists";
import type {
  SecretSantaDetails,
  SecretSantaPendingInvite,
  SecretSantaPerson,
  VisibleItem,
} from "@wishlist/backend/types/secret-santa";
import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  Copy,
  Gift,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
  Users,
  UserMinus,
} from "lucide-react-native";
import { useGT, useLocale } from "gt-react-native";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

function HeroChip({ icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View className="h-9 min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/25 px-3">
      <Icon as={icon} className="size-3.5 text-white" />
      <Text className="text-xs font-bold text-white" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function formatSecretSantaPeopleCount(count: number, t: ReturnType<typeof useGT>) {
  return count === 1 ? t("1 person") : t("{count} people", { count });
}

export function SecretSantaDetailHero({
  event,
  totalPeople,
  isOwner,
  onInvite,
  onCopyLink,
  onEdit,
  onDelete,
  topInset = 0,
}: {
  event: SecretSantaDetails;
  totalPeople: number;
  isOwner: boolean;
  onInvite: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  topInset?: number;
}) {
  const t = useGT();
  const locale = useLocale();
  const hasInviteAction = !event.is_started;
  const hasActionsMenu = isOwner;
  const headerActionsCount = Number(hasInviteAction) + Number(hasActionsMenu);
  const headerActionsRightPadding =
    headerActionsCount >= 2 ? "pr-20" : headerActionsCount === 1 ? "pr-12" : "";
  const eventDateLabel = formatSecretSantaDate(event.event_date, locale ?? "en");
  const budgetLabel = formatSecretSantaBudget(event.budget, event.currency);
  const peopleCountLabel = formatSecretSantaPeopleCount(totalPeople, t);

  return (
    <View className="w-full self-stretch overflow-hidden border-b border-border-subtle">
      <View className={cn("absolute inset-0", getWishlistAccentClass(null))} />
      <View className="absolute inset-0 bg-black/25" />

      <View className="overflow-visible px-4 pb-4" style={{ paddingTop: topInset + 8 }}>
        {headerActionsCount > 0 ? (
          <View
            className="absolute right-4 z-10 flex-row items-center justify-end gap-2"
            style={{ top: topInset + 8 }}
          >
            {hasInviteAction ? (
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("Invite people")}
                onPress={onInvite}
                className="size-9 items-center justify-center rounded-full border border-white/35 bg-white/25"
              >
                <Icon as={Share2} className="size-4 text-white" />
              </AnimatedPressable>
            ) : null}

            {hasActionsMenu ? (
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
                  {!event.is_started ? (
                    <DropdownMenuItem onPress={onCopyLink}>
                      <Icon as={Copy} className="size-4 text-popover-foreground" />
                      <Text>{t("Copy invite link")}</Text>
                    </DropdownMenuItem>
                  ) : null}
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
        ) : null}

        <View className="gap-4">
          {event.image_url ? (
            <View className="flex-row items-start gap-3">
              <View className="mt-2 size-24 shrink-0 overflow-hidden rounded-2xl border border-white/35 bg-white/15">
                <StyledImage
                  source={{ uri: event.image_url }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={event.id}
                  className="size-full"
                />
              </View>
              <View className="min-w-0 flex-1" style={{ minHeight: 104 }}>
                <View
                  className={cn(
                    headerActionsCount > 0 && "min-h-9 justify-center",
                    headerActionsCount > 0 && headerActionsRightPadding,
                  )}
                  style={{ minHeight: headerActionsCount > 0 ? 36 : undefined }}
                >
                  <Text
                    className="text-[21px] font-extrabold leading-6 text-white"
                    numberOfLines={3}
                  >
                    {event.name}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View
                className={cn("min-w-0", headerActionsCount > 0 && headerActionsRightPadding)}
                style={{ minHeight: headerActionsCount > 0 ? 36 : undefined }}
              >
                <Text className="text-[21px] font-extrabold leading-6 text-white" numberOfLines={2}>
                  {event.name}
                </Text>
              </View>
            </View>
          )}

          <View className="w-full flex-row items-center gap-2">
            <HeroChip icon={CalendarDays} label={eventDateLabel} />
            <HeroChip icon={Gift} label={budgetLabel} />
            <HeroChip icon={Users} label={peopleCountLabel} />
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
  ownerId,
  onRemove,
  emptyMascot,
}: {
  title: string;
  description?: string;
  emptyText: string;
  people: Array<SecretSantaPerson | SecretSantaPendingInvite>;
  ownerId?: string;
  onRemove?: (person: SecretSantaPerson | SecretSantaPendingInvite) => void;
  emptyMascot?: MascotVariant;
}) {
  const t = useGT();

  return (
    <View className="gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm">
      <View className="gap-1">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className="text-lg font-extrabold text-text">{title}</Text>
          {people.length > 0 ? (
            <Text
              className="text-sm font-bold text-text-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {people.length}
            </Text>
          ) : null}
        </View>
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
            const isPendingInvite = "invite_id" in person;
            const isOrganizer = !isPendingInvite && Boolean(ownerId) && person.id === ownerId;
            const subtitle =
              person.nickname ?? (isPendingInvite ? t("Invitation pending") : t("Wishlane member"));

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
                {isPendingInvite ? (
                  <View className="rounded-full bg-info-bg px-2 py-1">
                    <Text className="text-[11px] font-extrabold text-info">{t("Pending")}</Text>
                  </View>
                ) : null}
                {isOrganizer ? (
                  <View className="rounded-full bg-bg-muted px-2 py-1">
                    <Text className="text-[11px] font-extrabold text-text-muted">
                      {t("Organizer")}
                    </Text>
                  </View>
                ) : null}
                {onRemove && !isOrganizer ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    accessibilityLabel={t("Remove {name}", {
                      name: getSecretSantaPersonName(person, t),
                    })}
                    onPress={() => onRemove(person)}
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
  onInvite,
}: {
  canLaunch: boolean;
  pendingInvitesCount: number;
  participantsCount: number;
  onLaunch: () => void;
  onInvite: () => void;
}) {
  const t = useGT();
  const missingParticipants = Math.max(MIN_PARTICIPANTS_TO_LAUNCH - participantsCount, 0);
  const status = canLaunch
    ? t("Everyone is in. Draw names when you're ready!")
    : missingParticipants > 0
      ? missingParticipants === 1
        ? t("You need 1 more participant before you can draw names.")
        : t("You need {count} more participants before you can draw names.", {
            count: missingParticipants,
          })
      : pendingInvitesCount === 1
        ? t("Waiting on 1 invite to be answered.")
        : t("Waiting on {count} invites to be answered.", { count: pendingInvitesCount });

  return (
    <View className="gap-4 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm">
      <View className="gap-1.5">
        <Text className="text-lg font-extrabold text-text">{t("Ready to draw?")}</Text>
        <View className="flex-row items-center gap-2">
          <Icon
            as={canLaunch ? CircleCheck : missingParticipants > 0 ? Users : Clock3}
            className={canLaunch ? "size-4 text-success" : "size-4 text-text-muted"}
          />
          <Text className="flex-1 text-sm leading-5 text-text-muted">{status}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Button
          variant={canLaunch ? "outline" : "default"}
          className="min-w-0 flex-1"
          onPress={onInvite}
        >
          <Icon
            as={Share2}
            className={canLaunch ? "size-4 text-text" : "size-4 text-primary-foreground"}
          />
          <Text numberOfLines={1}>{t("Invite friends")}</Text>
        </Button>
        <Button
          variant={canLaunch ? "default" : "outline"}
          className="min-w-0 flex-1"
          disabled={!canLaunch}
          accessibilityHint={!canLaunch ? status : undefined}
          onPress={onLaunch}
        >
          <Icon
            as={Sparkles}
            className={canLaunch ? "size-4 text-primary-foreground" : "size-4 text-text-muted"}
          />
          <Text numberOfLines={1}>{t("Draw names")}</Text>
        </Button>
      </View>
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
  const url = item.url;

  return (
    <Pressable
      accessibilityRole={url ? "link" : undefined}
      disabled={!url}
      onPress={url ? () => void Linking.openURL(url).catch(() => {}) : undefined}
      className={cn(
        "flex-row items-center gap-3 rounded-xl bg-bg-subtle p-3",
        url && "active:bg-brand-lighter",
      )}
    >
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
      <View className="items-end gap-1">
        {price ? (
          <Text className="text-sm font-extrabold text-brand" numberOfLines={1}>
            {item.currency ? `${item.currency} ` : ""}
            {price}
          </Text>
        ) : null}
        {url ? <Icon as={ArrowUpRight} className="size-3.5 text-text-muted" /> : null}
      </View>
    </Pressable>
  );
}
