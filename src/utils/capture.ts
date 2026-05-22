import html2canvas from "html2canvas";

const CAPTURE_BACKGROUND = "#f7f3ea";
const CAPTURE_SCALE = 2;

export async function captureElement(
  selector: string,
  fileName: string,
): Promise<boolean> {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return false;

  const canvas = await html2canvas(target, {
    backgroundColor: CAPTURE_BACKGROUND,
    scale: CAPTURE_SCALE,
    useCORS: true,
  });

  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
  return true;
}
