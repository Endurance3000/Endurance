import { playbackBridge } from "../../services/playback/playbackBridge";
import {
  PlaybackSnapshot,
  shouldApplyPlaybackSnapshot,
} from "../../services/playback/playbackProtocol";

export async function connectMiniPlayerBridge(
  onSnapshot: (snapshot: PlaybackSnapshot) => void,
): Promise<() => void> {
  let latestSnapshot: PlaybackSnapshot | null = null;
  const unlisten = await playbackBridge.onState((snapshot) => {
    if (shouldApplyPlaybackSnapshot(latestSnapshot, snapshot)) {
      latestSnapshot = snapshot;
      onSnapshot(snapshot);
    }
  });

  await playbackBridge.requestState();
  return unlisten;
}

export function sendMiniPlayerCommand(
  command: Parameters<typeof playbackBridge.sendCommand>[0],
): void {
  void playbackBridge.sendCommand(command);
}
