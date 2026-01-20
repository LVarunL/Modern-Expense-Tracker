import AsyncStorage from "@react-native-async-storage/async-storage";

export type TutorialId = "capture" | "analytics" | "feed";

const TUTORIAL_VERSION = "v1";

function keyFor(id: TutorialId): string {
  return `tutorial.${TUTORIAL_VERSION}.${id}`;
}

export async function isTutorialComplete(id: TutorialId): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(keyFor(id));
    return value === "1";
  } catch {
    return false;
  }
}

export async function markTutorialComplete(id: TutorialId): Promise<void> {
  await AsyncStorage.setItem(keyFor(id), "1");
}
