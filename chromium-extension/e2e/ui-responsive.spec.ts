import fs from "fs";
import path from "path";
import { test, expect } from "./fixtures";

type WidthCheck = {
  width: number;
  sendOrStopVisible: boolean;
  newVisible: boolean;
  quickVisible: boolean;
  moreVisible: boolean;
  overflowOk: boolean;
};

const WIDTHS = [280, 320, 480, 720];

test("UI responsive contract keeps primary actions reachable at 280px+", async ({
  context,
  extensionId
}) => {
  const sidebar = await context.newPage();
  const results: WidthCheck[] = [];
  const screenshotPath = String(
    process.env.SOCA_EVIDENCE_SCREENSHOT_PATH || ""
  );
  const jsonPath = String(process.env.SOCA_EVIDENCE_JSON_PATH || "");

  await sidebar.goto(`chrome-extension://${extensionId}/sidebar.html`);
  await sidebar.waitForLoadState("domcontentloaded");

  for (const width of WIDTHS) {
    await sidebar.setViewportSize({ width, height: 900 });
    await sidebar.waitForTimeout(80);

    const sendVisible = await sidebar
      .getByTestId("soca-btn-send")
      .isVisible()
      .catch(() => false);
    const stopVisible = await sidebar
      .getByTestId("soca-btn-stop")
      .isVisible()
      .catch(() => false);
    const sendOrStopVisible = sendVisible || stopVisible;

    const newVisible = await sidebar
      .getByTestId("soca-btn-new")
      .isVisible()
      .catch(() => false);
    const quickVisible = await sidebar
      .getByTestId("soca-btn-quick")
      .isVisible()
      .catch(() => false);
    const moreVisible = await sidebar
      .getByTestId("soca-btn-more")
      .isVisible()
      .catch(() => false);

    expect(sendOrStopVisible).toBeTruthy();
    expect(newVisible).toBeTruthy();
    expect(moreVisible).toBeTruthy();

    const overflowOk = await sidebar.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return (
        root.scrollWidth <= root.clientWidth &&
        body.scrollWidth <= body.clientWidth
      );
    });
    expect(overflowOk).toBeTruthy();

    await sidebar.getByTestId("soca-btn-more").click();
    await expect(sidebar.getByText("Attach file")).toBeVisible();
    await expect(sidebar.getByText("Session history")).toBeVisible();
    await expect(sidebar.getByText("Settings")).toBeVisible();
    await expect(
      sidebar.getByText(/Show advanced|Hide advanced/)
    ).toBeVisible();
    await sidebar.keyboard.press("Escape");

    results.push({
      width,
      sendOrStopVisible,
      newVisible,
      quickVisible,
      moreVisible,
      overflowOk
    });
  }

  if (screenshotPath) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await sidebar.setViewportSize({ width: 280, height: 900 });
    await sidebar.screenshot({ path: screenshotPath, fullPage: true });
  }
  if (jsonPath) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify({ widths: results }, null, 2));
  }

  await sidebar.close();
});
