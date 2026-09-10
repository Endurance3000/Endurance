import { invoke } from "@tauri-apps/api/core";

export const miniPlayerService = {
  async open(): Promise<void> {
    await invoke("open_mini_player");
  },
};
