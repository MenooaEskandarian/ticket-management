import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { imageFile } from "@/test/utils";
import { MAX_FILE_BYTES, MAX_PHOTOS } from "./schemas";
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

  it("names an oversized photo instead of accepting it silently", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoPicker value={[]} onChange={onChange} />);

    const tooBig = imageFile("holiday.jpg", "image/jpeg", MAX_FILE_BYTES + 1);
    await user.upload(screen.getByTestId("photo-input"), tooBig);

    expect(screen.getByRole("alert")).toHaveTextContent("holiday.jpg is larger than 5 MB.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("names a file of the wrong type instead of accepting it silently", async () => {
    // The accept attribute keeps most of these out of the file dialog; turning
    // it off exercises the guard sitting behind it.
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    render(<PhotoPicker value={[]} onChange={onChange} />);

    await user.upload(
      screen.getByTestId("photo-input"),
      imageFile("receipt.pdf", "application/pdf"),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("receipt.pdf is not a JPEG, PNG or WebP");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the good files from a mixed selection", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    render(<PhotoPicker value={[]} onChange={onChange} />);

    await user.upload(screen.getByTestId("photo-input"), [
      imageFile("good.jpg"),
      imageFile("bad.pdf", "application/pdf"),
    ]);

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: "good.jpg" })]);
    expect(screen.getByRole("alert")).toHaveTextContent("bad.pdf");
  });

  it("stops accepting files once the limit is reached", () => {
    const full = Array.from({ length: MAX_PHOTOS }, (_, i) => imageFile(`p${i}.jpg`));
    render(<PhotoPicker value={full} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /add photos/i })).toBeDisabled();
  });
});
