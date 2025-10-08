"use client";

import React, { useRef, useEffect } from "react";
import { BaseItemPerson } from "@jellyfin/sdk/lib/generated-client/models/base-item-person";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CastCrewCard } from "./cast-crew-card";

interface CastScrollAreaProps {
  people?: BaseItemPerson[];
  mediaId: string;
}

export function CastScrollArea({ people, mediaId }: CastScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the ScrollArea viewport after component mounts
    if (scrollRef.current) {
      const viewport = scrollRef.current
        .closest('[data-slot="scroll-area"]')
        ?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;
      if (viewport) {
        viewportRef.current = viewport;
      }
    }
  }, []);

  const scrollLeft = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  if (!people || people.length === 0) {
    return (
      <section className="relative z-10 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-foreground font-poppins">
            Cast & Crew
          </h3>
        </div>
        <p className="text-muted-foreground">No cast information available.</p>
      </section>
    );
  }

  return (
    <section className="relative z-10 mb-12">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold text-foreground font-poppins">
          Cast & Crew
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background/10 border-border text-foreground hover:bg-accent p-2"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/10 border-border text-foreground hover:bg-accent p-2"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="w-full pb-6">
        <div className="flex gap-4 w-max" ref={scrollRef}>
          {people.map((person, index) => (
            <CastCrewCard person={person} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
