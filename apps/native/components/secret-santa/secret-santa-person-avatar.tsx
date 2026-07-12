import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSecretSantaPersonName } from "@/lib/secret-santa";
import type { SecretSantaPerson } from "@wishlist/backend/types/secret-santa";
import { useGT } from "gt-react-native";

export function SecretSantaPersonAvatar({
  person,
  sizeClassName = "size-10",
}: {
  person: SecretSantaPerson;
  sizeClassName?: string;
}) {
  const t = useGT();
  const name = getSecretSantaPersonName(person, t);

  return (
    <Avatar className={sizeClassName} alt={name}>
      {person.avatar_url ? <AvatarImage source={{ uri: person.avatar_url }} /> : null}
      <AvatarFallback className="bg-brand-lighter" initialsClassName="text-brand" />
    </Avatar>
  );
}
