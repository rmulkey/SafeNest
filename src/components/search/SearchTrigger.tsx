"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchDialog } from "./SearchDialog";

/**
 * Client island rendered inside the (server) Header. Owns the open/closed state
 * for the global search dialog and wires up the keyboard shortcuts:
 *   - "/"               opens search (unless typing in a field)
 *   - Cmd/Ctrl + K      opens search
 *   - Escape            closes (handled inside the dialog)
 *
 * Focus is returned to the trigger button when the dialog closes.
 */
export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openDialog = useCallback(() => setOpen(true), []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    // Restore focus to the trigger that opened the dialog.
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        node.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      // "/" shortcut — ignore when the user is typing in a field.
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isEditable(e.target)) return;
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        aria-label="Search"
        aria-keyshortcuts="Control+K /"
        onClick={openDialog}
        className="text-muted-foreground hover:text-foreground"
      >
        <Search className="size-5" />
      </Button>
      {/* Desktop ⌘K hint — opens search when clicked, hidden from a11y tree */}
      <button
        type="button"
        onClick={openDialog}
        tabIndex={-1}
        aria-hidden="true"
        className="hidden items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
      >
        <kbd className="font-sans">⌘</kbd>
        <kbd className="font-sans">K</kbd>
      </button>
      <SearchDialog open={open} onClose={closeDialog} />
    </>
  );
}
