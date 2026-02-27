import { test, expect } from "./fixtures";

async function extSendMessage(extPage: any, msg: any): Promise<any> {
  const out = await extPage.evaluate(
    (m: any) =>
      new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(m, (resp) => {
            const err = chrome.runtime.lastError?.message || null;
            resolve({ resp, err });
          });
        } catch (e: any) {
          resolve({ resp: null, err: String(e?.message || e) });
        }
      }),
    msg
  );
  if (out?.err) return { ok: false, err: out.err };
  return out?.resp;
}

test("Backend handler matrix is wired for sidebar actions", async ({
  extPage
}) => {
  const resp = await extSendMessage(extPage, {
    type: "SOCA_TEST_BACKEND_HANDLERS"
  });
  expect(resp?.ok).toBe(true);

  const matrix = resp?.data || {};
  expect(Boolean(matrix.chat)).toBe(true);
  expect(Boolean(matrix.callback)).toBe(true);
  expect(Boolean(matrix.uploadFile)).toBe(true);
  expect(Boolean(matrix.stop)).toBe(true);
  expect(Boolean(matrix.getTabs)).toBe(true);
  expect(Boolean(matrix.promptbuddy_enhance)).toBe(true);
  expect(Boolean(matrix.promptbuddy_profiles)).toBe(true);
});
