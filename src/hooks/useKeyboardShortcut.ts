import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean; // Command key on Mac
  preventDefault?: boolean;
  allowInInputFields?: boolean; // Allow the shortcut to work even when focused on input fields
}

export const useKeyboardShortcut = (
  options: UseKeyboardShortcutOptions,
  callback: () => void
) => {
  const {
    key,
    ctrlKey = false,
    altKey = false,
    shiftKey = false,
    metaKey = false,
    preventDefault = true,
    allowInInputFields = false,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if all modifier keys match
      const modifiersMatch =
        event.ctrlKey === ctrlKey &&
        event.altKey === altKey &&
        event.shiftKey === shiftKey &&
        event.metaKey === metaKey;

      // Check if the key matches (case insensitive)
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();

      if (modifiersMatch && keyMatches) {
        // Check if focus is in an input element
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.hasAttribute("contenteditable");

        // Only trigger if not in an input field (unless allowInInputFields is true)
        if (!isInputFocused || allowInInputFields) {
          if (preventDefault) {
            event.preventDefault();
          }
          callback();
        }
      }
    },
    [
      key,
      ctrlKey,
      altKey,
      shiftKey,
      metaKey,
      preventDefault,
      allowInInputFields,
      callback,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
};
