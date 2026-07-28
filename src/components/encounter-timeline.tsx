"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { reorderEncountersAction } from "@/lib/actions/characters";

const UNASSIGNED = "unassigned";

type EncounterCard = {
  id: string;
  title: string;
  participantNames: string[];
};

type Track = {
  key: string;
  name: string;
  plotLineId: string | null;
};

export function EncounterTimeline({
  owner,
  slug,
  tracks,
  initialLanes,
  cards,
}: {
  owner: string;
  slug: string;
  tracks: Track[];
  initialLanes: Record<string, string[]>;
  cards: Record<string, EncounterCard>;
}) {
  const [lanes, setLanes] = useState(initialLanes);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function findTrackKey(id: string): string | undefined {
    return Object.keys(lanes).find((key) => lanes[key].includes(id));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceKey = findTrackKey(activeId);
    const destKey = lanes[overId] ? overId : findTrackKey(overId);
    if (!sourceKey || !destKey || sourceKey === destKey) return;

    setLanes((prev) => {
      const source = prev[sourceKey].filter((id) => id !== activeId);
      const overIndex = prev[destKey].indexOf(overId);
      const dest = [...prev[destKey]];
      dest.splice(overIndex >= 0 ? overIndex : dest.length, 0, activeId);
      return { ...prev, [sourceKey]: source, [destKey]: dest };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const destKey = lanes[overId] ? overId : findTrackKey(overId);
    if (!destKey) return;

    setLanes((prev) => {
      const items = [...prev[destKey]];
      const from = items.indexOf(activeId);
      const to = items.indexOf(overId) >= 0 ? items.indexOf(overId) : items.length - 1;
      if (from !== -1 && from !== to) {
        items.splice(from, 1);
        items.splice(to, 0, activeId);
      }
      const next = { ...prev, [destKey]: items };

      const track = tracks.find((t) => t.key === destKey);
      startTransition(() => {
        reorderEncountersAction({
          owner,
          slug,
          plotLineId: track?.plotLineId ?? null,
          orderedEncounterIds: items,
        });
      });

      return next;
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        {tracks.map((track) => (
          <TrackRow key={track.key} track={track} ids={lanes[track.key] ?? []} cards={cards} />
        ))}
      </div>
      <DragOverlay>
        {activeId && cards[activeId] ? <EncounterCardView card={cards[activeId]} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function TrackRow({
  track,
  ids,
  cards,
}: {
  track: Track;
  ids: string[];
  cards: Record<string, EncounterCard>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: track.key });

  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-xs font-medium text-muted-foreground">{track.name}</span>
      <div
        ref={setNodeRef}
        className={`flex min-h-16 items-center gap-2 overflow-x-auto rounded-lg border p-2 transition-colors ${
          isOver ? "border-foreground/30 bg-accent/30" : "border-dashed"
        }`}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          {ids.length === 0 && (
            <span className="px-2 text-xs text-muted-foreground">여기로 카드를 끌어오세요</span>
          )}
          {ids.map((id) => (cards[id] ? <SortableEncounterCard key={id} id={id} card={cards[id]} /> : null))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableEncounterCard({ id, card }: { id: string; card: EncounterCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40" : ""}
    >
      <EncounterCardView card={card} />
    </div>
  );
}

function EncounterCardView({ card, dragging }: { card: EncounterCard; dragging?: boolean }) {
  return (
    <div
      className={`flex w-48 shrink-0 cursor-grab flex-col gap-1.5 rounded-lg border bg-background px-3 py-2 text-sm active:cursor-grabbing ${
        dragging ? "shadow-lg" : ""
      }`}
    >
      <span className="font-medium">{card.title}</span>
      <div className="flex flex-wrap gap-1">
        {card.participantNames.map((name) => (
          <Badge key={name} variant="outline" className="text-xs">
            {name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export { UNASSIGNED };
