import { Keyboard } from "@raycast/api";

export const PARAMETER_SHORTCUTS: Record<
  "decrease" | "reset" | "increase",
  Keyboard.Shortcut
> = {
  decrease: { modifiers: ["opt"], key: "[" },
  reset: { modifiers: ["opt"], key: "\\" },
  increase: { modifiers: ["opt"], key: "]" },
};
