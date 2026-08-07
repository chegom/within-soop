import { describe, expect, it, vi } from "vitest";
import { listenForInvite, readInitialInvite, type DeepLinkApi } from "./deepLink";

const inviteToken = "b".repeat(48);

function createDeepLinkApi(urls: string[]): DeepLinkApi {
  return {
    getCurrent: vi.fn().mockResolvedValue(urls),
    onOpenUrl: vi.fn().mockResolvedValue(() => undefined),
  };
}

describe("desktop invitation links", () => {
  it("reads only the first valid invite when the app starts", async () => {
    const api = createDeepLinkApi([
      "https://example.com/not-an-invite",
      `gyeot://join/${inviteToken}`,
    ]);

    await expect(readInitialInvite(api)).resolves.toBe(inviteToken);
  });

  it("forwards valid links received while the app is running", async () => {
    let receiveUrls: (urls: string[]) => void = () => undefined;
    const api: DeepLinkApi = {
      getCurrent: vi.fn().mockResolvedValue([]),
      onOpenUrl: vi.fn().mockImplementation(async (handler) => {
        receiveUrls = handler;
        return () => undefined;
      }),
    };
    const onInvite = vi.fn();

    const unlisten = await listenForInvite(onInvite, api);
    receiveUrls(["gyeot://wrong/path", `gyeot://join/${inviteToken}`]);

    expect(onInvite).toHaveBeenCalledWith(inviteToken);
    unlisten();
  });
});
