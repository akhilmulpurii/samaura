import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { User } from "lucide-react";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models/base-item-dto";
import { Link } from "react-router-dom";

interface PersonCardProps {
  person: BaseItemDto;
  serverUrl: string;
}

export function PersonCard({ person, serverUrl }: PersonCardProps) {
  const imageUrl = person.Id
    ? `${serverUrl}/Items/${person.Id}/Images/Primary`
    : null;

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Link to={`/person/${person.Id}`} draggable={false}>
      <div className="group flex flex-col items-center space-y-4 p-4 rounded-2xl hover:bg-accent/50 cursor-pointer max-w-[150px] active:scale-[0.98] transition select-none">
        {/* Avatar */}
        <Avatar className="size-32 shadow-lg transition-all">
          {imageUrl && (
            <AvatarImage
              src={imageUrl}
              alt={person.Name || "Person"}
              className="object-cover"
              draggable={false}
            />
          )}
          <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-lg">
            {person.Name ? (
              getInitials(person.Name)
            ) : (
              <User className="size-8" />
            )}
          </AvatarFallback>
        </Avatar>

        {/* Person Info */}
        <div className="text-center space-y-1">
          <h3 className="font-medium text-foreground line-clamp-2 text-sm leading-tight">
            {person.Name || "Unknown Person"}
          </h3>

          {/* Show birth year if available */}
          {person.PremiereDate && (
            <p className="text-xs text-muted-foreground">
              Born {new Date(person.PremiereDate).getFullYear()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
