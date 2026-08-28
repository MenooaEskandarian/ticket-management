import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { imageFile } from "@/test/utils";
import { MAX_PHOTOS } from "./schemas";
import { PhotoPicker } from "./PhotoPicker";

describe("PhotoPicker", () => {
  it("hands chosen files back to the form", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoPicker value={[]} onChange={onChange} />);

    await user.upload(screen.getByTestId("photo-input"), imageFile("bloom.jpg"));

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: "bloom.jpg" })]);
  });

  it("lists what has been attached and allows removing one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoPicker value={[imageFile("a.jpg"), imageFile("b.jpg")]} onChange={onChange} />);

    expect(screen.getByText("a.jpg")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove a.jpg" }));

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: "b.jpg" })]);
  });

  it("stops accepting files once the limit is reached", () => {
    const full = Array.from({ length: MAX_PHOTOS }, (_, i) => imageFile(`p${i}.jpg`));
    render(<PhotoPicker value={full} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /add photos/i })).toBeDisabled();
  });
});
