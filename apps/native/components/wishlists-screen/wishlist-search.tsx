import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react-native";
import { View } from "react-native";

export function WishlistSearch({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <View className="w-full flex-row items-center gap-1 rounded-full border border-border-subtle bg-card-bg px-2 pl-3 shadow-sm">
      <Icon as={Search} className="size-4 text-text-muted" />
      <Input
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search wishlists..."
        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none"
        returnKeyType="search"
      />
      {search.length > 0 ? (
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel="Clear search"
          onPress={() => onSearchChange("")}
          className="size-9 shrink-0 rounded-full"
        >
          <Icon as={X} className="size-4 text-text-muted" />
        </Button>
      ) : null}
    </View>
  );
}
