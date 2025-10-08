"use client";

import React, { useState, useMemo } from "react";
import { MediaCard } from "@/components/media-card";
import {
  BaseItemDto,
  ItemSortBy,
} from "@jellyfin/sdk/lib/generated-client/models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ArrowUpDown,
  Search,
  Type,
  Dice6,
  Star,
  ThumbsUp,
  Calendar,
  CalendarDays,
  Clock,
  ArrowUp,
  ArrowDown,
  Dices,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiveChannelCard } from "./live-channel-card";

type SortField = {
  value: string;
  label: string;
  getSortValue: (item: BaseItemDto) => number | string | boolean;
  isDate?: boolean;
};

type SortOrder = "asc" | "desc";

// Icon mapping for sort fields
const getSortFieldIcon = (fieldValue: string) => {
  const iconMap = {
    SortName: Type,
    Random: Dice6,
    CommunityRating: Star,
    CriticRating: ThumbsUp,
    DateCreated: Calendar,
    PremiereDate: CalendarDays,
    Runtime: Clock,
    ProductionYear: Calendar,
    IsFavoriteOrLiked: Heart,
  };
  return iconMap[fieldValue as keyof typeof iconMap] || Type;
};

// Icon mapping for sort orders
const getSortOrderIcon = (orderValue: SortOrder) => {
  return orderValue === "asc" ? ArrowUp : ArrowDown;
};

const sortFields: SortField[] = [
  {
    value: "SortName",
    label: "Name",
    getSortValue: (item) => item.Name || "",
  },
  {
    value: "Random",
    label: "Random",
    getSortValue: () => Math.random(),
  },
  {
    value: "CommunityRating",
    label: "Community Rating",
    getSortValue: (item) => item.CommunityRating || 0,
  },
  {
    value: "CriticRating",
    label: "Critics Rating",
    getSortValue: (item) => item.CriticRating || 0,
  },
  {
    value: "DateCreated",
    label: "Date Added",
    getSortValue: (item) =>
      item.DateCreated ? new Date(item.DateCreated).getTime() : 0,
    isDate: true,
  },
  {
    value: "PremiereDate",
    label: "Release Date",
    getSortValue: (item) =>
      item.PremiereDate ? new Date(item.PremiereDate).getTime() : 0,
    isDate: true,
  },
  {
    value: "Runtime",
    label: "Runtime",
    getSortValue: (item) => item.RunTimeTicks || 0,
  },
  {
    value: "ProductionYear",
    label: "Year",
    getSortValue: (item) => item.ProductionYear || 0,
  },
  {
    value: ItemSortBy.IsFavoriteOrLiked,
    label: "Favorites",
    getSortValue: (item) => item?.UserData?.IsFavorite || false,
  },
];

const sortOrders = [
  { value: "asc" as SortOrder, label: "Ascending" },
  { value: "desc" as SortOrder, label: "Descending" },
];

interface LibraryMediaListProps {
  mediaItems: BaseItemDto[];
  serverUrl: string;
  initialSortField?: ItemSortBy;
}

export function LibraryMediaList({
  mediaItems,
  serverUrl,
  initialSortField = ItemSortBy.SortName,
}: LibraryMediaListProps) {
  const [sortField, setSortField] = useState<string>(initialSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [rerollTrigger, setRerollTrigger] = useState<number>(0);

  // Function to trigger a reroll for random sorting
  const handleReroll = () => {
    setRerollTrigger((prev) => prev + 1);
  };

  const filteredAndSortedItems = useMemo(() => {
    // First filter by search query
    const filtered = mediaItems.filter((item) =>
      (item.Name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Then sort the filtered results
    const selectedField = sortFields.find((field) => field.value === sortField);
    if (!selectedField) return filtered;

    return [...filtered].sort((a, b) => {
      // Special case for random sorting
      if (sortField === "Random") {
        return Math.random() - 0.5;
      }

      const valueA = selectedField.getSortValue(a);
      const valueB = selectedField.getSortValue(b);

      let comparison = 0;
      if (typeof valueA === "string" && typeof valueB === "string") {
        comparison = valueA.localeCompare(valueB);
      } else if (typeof valueA === "boolean" && typeof valueB === "boolean") {
        comparison = valueA === valueB ? 0 : valueA ? -1 : 1;
      } else {
        comparison = (valueA as number) - (valueB as number);
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });
  }, [mediaItems, sortField, sortOrder, searchQuery, rerollTrigger]);

  const selectedFieldLabel =
    sortFields.find((field) => field.value === sortField)?.label || "Name";
  const selectedOrderLabel =
    sortOrders.find((order) => order.value === sortOrder)?.label || "Ascending";
  const SelectedFieldIcon = getSortFieldIcon(sortField);
  const SelectedOrderIcon = getSortOrderIcon(sortOrder);

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Sort Field Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SelectedFieldIcon className="h-4 w-4" />
                Sort: {selectedFieldLabel}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {sortFields.map((field) => {
                const FieldIcon = getSortFieldIcon(field.value);
                return (
                  <DropdownMenuItem
                    key={field.value}
                    onClick={() => setSortField(field.value)}
                    className={`gap-2 ${
                      sortField === field.value ? "bg-accent" : ""
                    }`}
                  >
                    <FieldIcon className="h-4 w-4" />
                    {field.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Order Button - Hide for Random */}
          {sortField !== "Random" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <SelectedOrderIcon className="h-4 w-4" />
              {selectedOrderLabel}
            </Button>
          )}

          {/* Reroll Button - Show only for Random */}
          {sortField === "Random" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReroll}
                    className="gap-2"
                  >
                    <Dices className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reroll</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 auto-rows-max">
        {filteredAndSortedItems.map((item) =>
          item.Type !== "TvChannel" ? (
            <MediaCard
              key={item.Id}
              item={item}
              serverUrl={serverUrl}
              fullWidth
            />
          ) : (
            <LiveChannelCard key={item.Id} item={item} serverUrl={serverUrl} />
          )
        )}
      </div>

      {/* Empty State */}
      {filteredAndSortedItems.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-muted-foreground text-lg mb-2">
              {searchQuery ? "No matching items found" : "No items found"}
            </div>
            <div className="text-muted-foreground text-sm">
              {searchQuery
                ? `No media items match "${searchQuery}". Try adjusting your search.`
                : "This library appears to be empty."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
