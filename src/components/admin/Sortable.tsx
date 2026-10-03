"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { type CSSProperties, type ReactNode, useId } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type HandleProps = Record<string, unknown>;

type SortableProps<T> = {
  items: T[];
  getId: (item: T) => string | number;
  onReorder: (items: T[]) => void;
  /** "grid" for tiles, "list" for rows. */
  layout?: "grid" | "list";
  className?: string;
  /** Renders one item. Spread `handle` on the element that should start a drag. */
  children: (item: T, handle: HandleProps, index: number) => ReactNode;
  itemClassName?: (item: T) => string | undefined;
};

/**
 * Drag to reorder, with mouse, touch (press and hold) or keyboard (focus the
 * handle, Space, arrow keys, Space). Calls onReorder with the new order.
 */
export function Sortable<T>({ items, getId, onReorder, layout = "list", className, children, itemClassName }: SortableProps<T>) {
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(items, ids.indexOf(active.id), ids.indexOf(over.id)));
  };

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, i) => (
            <SortableItem key={getId(item)} id={getId(item)} className={itemClassName?.(item)}>
              {(handle) => children(item, handle, i)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, className, children }: { id: string | number; className?: string; children: (handle: HandleProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined };
  return (
    <div ref={setNodeRef} style={style} className={cn(className, isDragging && "opacity-80 shadow-lg")}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

/** The grip a user drags (or focuses and moves with the keyboard). */
export function DragHandle({ handle, label, className }: { handle: HandleProps; label: string; className?: string }) {
  return (
    <button type="button" aria-label={label} className={cn("flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xs text-ink/50 hover:bg-ivory hover:text-ink active:cursor-grabbing", className)} {...handle}>
      <Icon icon={GripVertical} size={16} />
    </button>
  );
}
