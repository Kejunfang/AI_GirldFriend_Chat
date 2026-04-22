"use client";

import { useEffect, useRef, useState } from "react";

import type { ConversationSummaryDTO } from "@/types/chat";

const DELETE_ACTION_WIDTH = 92;
const SWIPE_TRIGGER_OFFSET = 40;
const DRAG_START_OFFSET = 8;

interface ConversationSwipeItemProps {
  conversation: ConversationSummaryDTO;
  isActive: boolean;
  isOpen: boolean;
  isPending?: boolean;
  variant?: "sidebar" | "compact";
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
}

export function ConversationSwipeItem({
  conversation,
  isActive,
  isOpen,
  isPending = false,
  variant = "sidebar",
  onDelete,
  onOpenChange,
  onSelect,
}: ConversationSwipeItemProps) {
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const axisRef = useRef<"undecided" | "horizontal" | "vertical">("undecided");
  const suppressClickRef = useRef(false);
  const isDraggingRef = useRef(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const restingOffset = isOpen ? -DELETE_ACTION_WIDTH : 0;
  const translateX = dragOffset ?? restingOffset;

  useEffect(() => {
    if (!isDraggingRef.current) {
      setDragOffset(null);
    }
  }, [isOpen]);

  const resetPointerState = () => {
    pointerIdRef.current = null;
    axisRef.current = "undecided";
    isDraggingRef.current = false;
    setDragOffset(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPending) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    baseOffsetRef.current = restingOffset;
    axisRef.current = "undecided";
    suppressClickRef.current = false;
    isDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;

    if (axisRef.current === "undecided") {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < DRAG_START_OFFSET) {
        return;
      }

      axisRef.current =
        Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    if (axisRef.current === "vertical") {
      return;
    }

    suppressClickRef.current = true;
    event.preventDefault();

    const nextOffset = Math.min(
      0,
      Math.max(-DELETE_ACTION_WIDTH, baseOffsetRef.current + deltaX),
    );

    setDragOffset(nextOffset);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const finalOffset = dragOffset ?? restingOffset;
    const shouldOpen =
      axisRef.current === "horizontal"
        ? finalOffset <= -SWIPE_TRIGGER_OFFSET
        : isOpen;

    onOpenChange(shouldOpen);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetPointerState();
  };

  const handleCardClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (isOpen) {
      onOpenChange(false);
      return;
    }

    onSelect();
  };

  const wrapperClassName =
    variant === "compact"
      ? "relative overflow-hidden rounded-[1.3rem]"
      : "relative overflow-hidden rounded-[1.4rem]";
  const cardClassName =
    variant === "compact"
      ? `w-full rounded-[1.3rem] border px-4 py-3 text-left transition ${
          isActive
            ? "border-leaf/18 bg-white/82 shadow-[0_18px_42px_-34px_rgba(36,52,59,0.92)]"
            : "border-transparent bg-white/38 hover:border-leaf/10 hover:bg-white/58"
        }`
      : `w-full rounded-[1.4rem] border px-4 py-3 text-left transition ${
          isActive
            ? "border-leaf/20 bg-white/80 shadow-[0_16px_40px_-34px_rgba(36,52,59,0.95)]"
            : "border-transparent bg-white/35 hover:border-leaf/10 hover:bg-white/55"
        }`;

  return (
    <div
      className={wrapperClassName}
      style={{ touchAction: "pan-y" }}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <div className="absolute inset-y-0 right-0 flex w-[92px] items-stretch justify-end">
        <button
          type="button"
          className="flex h-full w-[92px] items-center justify-center rounded-[1.3rem] bg-rose-500/92 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-300"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          删除
        </button>
      </div>

      <div
        className="relative z-10 transition-transform duration-200 ease-out"
        style={{ transform: `translate3d(${translateX}px, 0, 0)` }}
      >
        <button
          type="button"
          className={cardClassName}
          disabled={isPending}
          onClick={handleCardClick}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-ink">
              {conversation.title}
            </p>
            <span className="text-[11px] text-ink/40">
              {new Date(conversation.lastMessageAt).toLocaleDateString("zh-CN", {
                month: "numeric",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="mt-1 truncate text-xs leading-5 text-ink/52">
            {conversation.lastMessagePreview}
          </p>
        </button>
      </div>
    </div>
  );
}
