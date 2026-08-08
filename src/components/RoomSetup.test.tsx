// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoomSetup } from "./RoomSetup";

const inviteToken = "c".repeat(48);

describe("RoomSetup", () => {
  it("offers a private room and invitation code without account fields", () => {
    const onCreate = vi.fn();
    const onJoin = vi.fn();
    const onDisplayNameChange = vi.fn();

    render(
      <RoomSetup
        displayName="다정한 곰"
        onDisplayNameChange={onDisplayNameChange}
        onCreate={onCreate}
        onJoin={onJoin}
        connection="connected"
        error={null}
      />,
    );

    expect((screen.getByLabelText("표시 이름") as HTMLInputElement).value).toBe("다정한 곰");
    expect(screen.queryByLabelText(/이메일|비밀번호/)).toBeNull();
    expect((screen.getByRole("button", { name: "참여하기" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("초대 코드"), {
      target: { value: inviteToken },
    });
    fireEvent.click(screen.getByRole("button", { name: "참여하기" }));

    expect(onJoin).toHaveBeenCalledWith(inviteToken);
  });

  it("explains a full room with the product copy", () => {
    render(
      <RoomSetup
        displayName="다정한 곰"
        onDisplayNameChange={() => undefined}
        onCreate={() => undefined}
        onJoin={() => undefined}
        connection="error"
        error="room_full"
      />,
    );

    expect(screen.getByText("방이 가득 찼어요")).toBeTruthy();
  });

  it("returns to setup with a clear message when a stored room is no longer accessible", () => {
    render(
      <RoomSetup
        displayName="다정한 곰"
        onDisplayNameChange={() => undefined}
        onCreate={() => undefined}
        onJoin={() => undefined}
        connection="connected"
        error="room_access_lost"
      />,
    );

    expect(
      screen.getByText("이전 작업실에 다시 들어갈 수 없어 새 작업실을 선택해 주세요"),
    ).toBeTruthy();
  });
});
