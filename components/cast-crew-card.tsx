import { useAuth } from "@/hooks/useAuth";
import { BaseItemPerson } from "@jellyfin/sdk/lib/generated-client/models";
import Link from "next/link";

// Utility function to format role names by adding spaces before capital letters
function formatRole(role: string): string {
  return role.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function CastCrewCard({ person }: { person: BaseItemPerson }) {
  const { serverUrl } = useAuth();

  const imageUrl = `${serverUrl}/Items/${person.Id}/Images/Primary?maxWidth=250&maxHeight=250&quality=60&tag=${person.PrimaryImageTag}`;

  const lightSpeedUrl = imageUrl?.includes("192.168.")
    ? imageUrl
    : "https://lightspeed.ac/?url=" + imageUrl;

  return (
    <Link href={`/person/${person.Id}`} className="shrink-0 group">
      <figure className="cursor-pointer transition-transform">
        <div className="overflow-hidden rounded-full shadow-lg group-hover:brightness-75 transition">
          {person.PrimaryImageTag ? (
            <img
              src={lightSpeedUrl}
              alt={person.Name || "Cast member"}
              className="aspect-square h-fit w-24 object-cover"
            />
          ) : (
            <div className="aspect-square h-24 w-24 bg-muted rounded-full flex items-center justify-center">
              <span className="text-muted-foreground text-lg font-medium font-mono">
                {person.Name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
        </div>
        <figcaption className="pt-3 text-xs text-center text-muted-foreground max-w-24">
          <p
            className="font-semibold text-foreground truncate group-hover:underline"
            title={person.Name!}
          >
            {person.Name}
          </p>
          {person.Role && (
            <p
              className="text-sm truncate mt-0.5"
              title={formatRole(person.Role)}
            >
              {formatRole(person.Role)}
            </p>
          )}
          {person.Type && (
            <p
              className="text-xs text-muted-foreground/70 truncate"
              title={formatRole(person.Type)}
            >
              {formatRole(person.Type)}
            </p>
          )}
        </figcaption>
      </figure>
    </Link>
  );
}
