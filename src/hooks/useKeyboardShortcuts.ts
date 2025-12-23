import { useEffect, useCallback } from "react";
import { TimeInterval } from "@/types/trading";
import { toast } from "sonner";

interface UseKeyboardShortcutsProps {
  onRefresh: () => void;
  onIntervalChange: (interval: TimeInterval) => void;
  onScan?: () => void;
}

const intervalMap: Record<string, TimeInterval> = {
  "1": "1h",
  "2": "4h",
  "3": "1d",
};

export function useKeyboardShortcuts({
  onRefresh,
  onIntervalChange,
  onScan,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // R to refresh
      if (key === "r" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        onRefresh();
        toast.info("Refreshing data...", { duration: 1500 });
      }

      // S to scan
      if (key === "s" && !event.metaKey && !event.ctrlKey && onScan) {
        event.preventDefault();
        onScan();
        toast.info("Running scan...", { duration: 1500 });
      }

      // Number keys for intervals
      if (intervalMap[event.key]) {
        event.preventDefault();
        const interval = intervalMap[event.key];
        onIntervalChange(interval);
        toast.info(`Switched to ${interval.toUpperCase()} interval`, {
          duration: 1500,
        });
      }

      // ? to show shortcuts help
      if (key === "/" && event.shiftKey) {
        event.preventDefault();
        toast.info("Keyboard Shortcuts", {
          description: "R: Refresh • S: Scan • 1: 1H • 2: 4H • 3: 1D",
          duration: 4000,
        });
      }
    },
    [onRefresh, onIntervalChange, onScan]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
