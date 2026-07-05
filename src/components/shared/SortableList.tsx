import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DragHandleProps } from "@/types";

interface SortableItemProps<T extends { id: string }> {
  item: T;
  renderItem: (item: T, handleProps: DragHandleProps | undefined) => React.ReactNode;
}

function SortableItem<T extends { id: string }>({ item, renderItem }: SortableItemProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : undefined,
        position: "relative",
      }}
    >
      {renderItem(item, { ...attributes, ...listeners })}
    </div>
  );
}

interface SortableListProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T, handleProps: DragHandleProps | undefined) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  active?: boolean;
}

export function SortableList<T extends { id: string }>({
  items,
  renderItem,
  onReorder,
  active = false,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === String(dragActive.id));
    const newIndex = items.findIndex((i) => i.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((i) => i.id));
  };

  if (!active) {
    return (
      <>
        {items.map((item) => (
          <div key={item.id}>{renderItem(item, undefined)}</div>
        ))}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} item={item} renderItem={renderItem} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
