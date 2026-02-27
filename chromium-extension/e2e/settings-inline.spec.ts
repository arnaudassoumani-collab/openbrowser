import { test, expect } from "./fixtures";

test("Settings gear opens inline iframe instead of new tab", async ({
  context,
  extensionId
}) => {
  const sidebar = await context.newPage();
  await sidebar.goto(`chrome-extension://${extensionId}/sidebar.html`);
  await sidebar.waitForLoadState("domcontentloaded");

  // Count pages before clicking Settings
  const pagesBefore = context.pages().length;

  // Click the Settings gear button
  const settingsBtn = sidebar.getByTestId("soca-btn-settings");
  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();

  // Assert the settings iframe is now visible
  const iframe = sidebar.getByTestId("soca-settings-iframe");
  await expect(iframe).toBeVisible({ timeout: 3000 });

  // Assert no new tab was opened
  // Allow a small settle time for any potential new tab
  await sidebar.waitForTimeout(500);
  expect(context.pages().length).toBe(pagesBefore);

  // Assert the chat input is hidden
  const sendBtn = sidebar.getByTestId("soca-btn-send");
  await expect(sendBtn).not.toBeVisible();

  // Click back button
  const backBtn = sidebar.getByTestId("soca-btn-settings-back");
  await expect(backBtn).toBeVisible();
  await backBtn.click();

  // Assert iframe is gone and chat is restored
  await expect(iframe).not.toBeVisible();
  await expect(sidebar.getByTestId("soca-btn-send")).toBeVisible();

  await sidebar.close();
});

test("More dropdown > Settings also opens inline", async ({
  context,
  extensionId
}) => {
  const sidebar = await context.newPage();
  await sidebar.goto(`chrome-extension://${extensionId}/sidebar.html`);
  await sidebar.waitForLoadState("domcontentloaded");

  // Open "More" dropdown and click Settings
  await sidebar.getByTestId("soca-btn-more").click();
  await sidebar.getByText("Settings").click();

  // Assert settings iframe appears
  const iframe = sidebar.getByTestId("soca-settings-iframe");
  await expect(iframe).toBeVisible({ timeout: 3000 });

  // Go back
  await sidebar.getByTestId("soca-btn-settings-back").click();
  await expect(iframe).not.toBeVisible();

  await sidebar.close();
});
