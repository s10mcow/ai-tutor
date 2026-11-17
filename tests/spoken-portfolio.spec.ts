import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

test.use({
  modelEnvironment: {
    TUTOR_OPENAI_FIXTURE_URL: "fixture",
    TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "8000000000",
  },
  viewport: { width: 1366, height: 768 },
  launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
});
async function setup(page: Page, email = "parent@example.test") {
  await page.addInitScript(() => {
    const state = { deny: false, streams: [] as MediaStream[] };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        if (state.deny)
          throw new DOMException("Permission denied", "NotAllowedError");
        const audio = new AudioContext({ sampleRate: 16000 });
        await audio.resume();
        const destination = audio.createMediaStreamDestination();
        const oscillator = audio.createOscillator();
        oscillator.connect(destination);
        oscillator.start();
        for (const track of destination.stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => {
            stop();
            oscillator.stop();
            void audio.close();
          };
        }
        state.streams.push(destination.stream);
        return destination.stream;
      },
    });
    Object.assign(window, { reflectionFixture: state });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  for (const name of ["River", "Sky"]) {
    await page.getByLabel("Learner name").fill(name);
    await page.getByRole("button", { name: "Add Learner" }).click();
    await expect(
      page.getByRole("button", { name: `Open ${name}’s workspace` }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await page.getByRole("button", { name: "Start an activity" }).click();
  await expect(page.getByLabel("Your question")).toBeVisible();
}
async function record(page: Page) {
  await page
    .getByRole("button", { name: "Record a reflection to keep", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording your reflection" }),
  ).toBeVisible();
  await page.waitForTimeout(1200); // Real AudioWorklet collects the controlled microphone samples.
  await page
    .getByRole("button", { name: "Stop and review reflection", exact: true })
    .click();
  await expect(page.getByLabel("Review spoken reflection")).toBeVisible();
}

test("a new spoken reflection can be reviewed and deliberately saved without a typed attempt, then played on a later visit", async ({
  page,
  app,
  openai,
  tutor,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page.getByLabel("Entry title").fill("My spoken discovery");
  await record(page);
  const review = page.getByLabel("Review spoken reflection");
  await review.evaluate(async (element: HTMLAudioElement) => {
    await element.play();
  });
  await expect
    .poll(() =>
      review.evaluate((element: HTMLAudioElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  await mkdir("/tmp/ai-tutor-research/ticket12", { recursive: true });
  await page.screenshot({
    path: "/tmp/ai-tutor-research/ticket12/review-laptop.png",
  });
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  const family = await (await page.request.get("/api/family")).json();
  const path = `/api/learners/${family.selectedLearnerId}/portfolio`;
  const entries = (await (await page.request.get(path)).json()).entries;
  expect(entries).toHaveLength(1);
  const entry = (
    await (await page.request.get(`${path}/${entries[0].id}`)).json()
  ).entry;
  expect(entry.evidence).toEqual([]);
  expect(entry.reflection).toBe("");
  expect(entry.audio.durationSeconds).toBeGreaterThan(0.25);
  expect(openai.requests).toHaveLength(0);
  expect(tutor.requests).toHaveLength(0);
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start an activity" }),
  ).toBeVisible();
  await page.goto("about:blank");
  await app.restart({ TUTOR_PREVIEW_URL: "", TUTOR_OPENAI_FIXTURE_URL: "" });
  await page.goto(app.url);
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await page
    .getByRole("button", { name: "Open My spoken discovery", exact: true })
    .click();
  const playback = page.getByLabel("Saved spoken reflection");
  await playback.evaluate(async (element: HTMLAudioElement) => {
    await element.play();
  });
  await expect
    .poll(() =>
      playback.evaluate((element: HTMLAudioElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Show my parent", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Entry to show my parent" })
      .getByLabel("Saved spoken reflection"),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/ai-tutor-research/ticket12/playback-laptop.png",
  });
});

test("ordinary speech and discarded reflection recordings stay temporary and microphone failure can recover", async ({
  page,
  openai,
}) => {
  await setup(page);
  let saveRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/portfolio"))
      saveRequests++;
  });
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save Learning evidence" }),
  ).toBeDisabled();
  openai.transcribe("An ordinary conversation is not a saved reflection.");
  await page.waitForTimeout(400);
  await page
    .getByRole("button", { name: "Stop and transcribe", exact: true })
    .click();
  await expect(page.getByLabel("Review your transcription")).toHaveValue(
    "An ordinary conversation is not a saved reflection.",
  );
  await page
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page.getByLabel("Entry title").fill("Not saved");
  await expect(
    page.getByRole("button", { name: "Save to Portfolio", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Review spoken reflection")).toHaveCount(0);
  await record(page);
  const previewUrl = await page
    .getByLabel("Review spoken reflection")
    .getAttribute("src");
  await page
    .getByRole("button", { name: "Discard reflection recording", exact: true })
    .click();
  await expect(page.getByLabel("Review spoken reflection")).toHaveCount(0);
  expect(
    await page.evaluate(async (url) => {
      try {
        await fetch(url!);
        return "still available";
      } catch {
        return "discarded";
      }
    }, previewUrl),
  ).toBe("discarded");
  await expect(
    page.getByRole("button", { name: "Save to Portfolio", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    (window as any).reflectionFixture.deny = true;
  });
  await page
    .getByRole("button", { name: "Record a reflection to keep" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Microphone permission was denied",
  );
  await page.evaluate(() => {
    (window as any).reflectionFixture.deny = false;
  });
  await record(page);
  const closingUrl = await page
    .getByLabel("Review spoken reflection")
    .getAttribute("src");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(
    await page.evaluate(async (url) => {
      try {
        await fetch(url!);
        return "still available";
      } catch {
        return "discarded";
      }
    }, closingUrl),
  ).toBe("discarded");
  expect(
    await page.evaluate(() =>
      (window as any).reflectionFixture.streams.every((stream: MediaStream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    ),
  ).toBe(true);
  expect(saveRequests).toBe(0);
  expect(openai.requests).toHaveLength(1);
  const family = await (await page.request.get("/api/family")).json();
  expect(
    (
      await (
        await page.request.get(
          `/api/learners/${family.selectedLearnerId}/portfolio`,
        )
      ).json()
    ).entries,
  ).toEqual([]);
});

test("a failed audio commit and lost save response recover the same recording exactly once", async ({
  page,
  app,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page.getByLabel("Entry title").fill("Try, listen, keep");
  await record(page);
  await app.configureDatabase(`
    CREATE FUNCTION reject_audio_commit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'fictional storage failure'; END; $$;
    CREATE CONSTRAINT TRIGGER reject_audio_commit AFTER INSERT ON portfolio_audio
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_audio_commit();
  `);
  const audio = Buffer.from(
    await page
      .getByLabel("Review spoken reflection")
      .evaluate(async (element: HTMLAudioElement) => [
        ...new Uint8Array(await (await fetch(element.src)).arrayBuffer()),
      ]),
  );
  const family = await (await page.request.get("/api/family")).json();
  const base = `/api/learners/${family.selectedLearnerId}`;
  const source = (await (await page.request.get(`${base}/session`)).json())
    .session;
  const endpoint = `${base}/portfolio`;
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "save wasn’t confirmed",
  );
  expect((await (await page.request.get(endpoint)).json()).entries).toEqual([]);
  await app.configureDatabase(
    "DROP TRIGGER reject_audio_commit ON portfolio_audio; DROP FUNCTION reject_audio_commit();",
  );
  await page.route(
    "**/api/learners/*/portfolio",
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort("connectionreset");
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "save wasn’t confirmed",
  );
  const entries = (await (await page.request.get(endpoint)).json()).entries;
  expect(entries).toHaveLength(1);
  const input = {
    id: entries[0].id,
    sessionId: source.id,
    actionIds: [],
    title: "Try, listen, keep",
    reflection: "",
  };
  const asset = `${endpoint}/${input.id}/audio`;
  expect(await (await page.request.get(asset)).body()).toEqual(audio);
  expect(
    (await (await page.request.get(endpoint)).json()).entries,
  ).toHaveLength(1);
  await page.request.post(
    `/api/learners/${family.selectedLearnerId}/session/${input.sessionId}`,
    { headers: { origin: app.url }, data: { intent: "end" } },
  );
  // A device playback error must not change the already-submitted save identity.
  await page.getByLabel("Review spoken reflection").dispatchEvent("error");
  await expect(
    page.getByRole("button", { name: "Retry save", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  expect(
    (await (await page.request.get(endpoint)).json()).entries,
  ).toHaveLength(1);
  expect(await (await page.request.get(asset)).body()).toEqual(audio);
  const replays = await Promise.all(
    [1, 2].map(() =>
      page.request.post(endpoint, {
        headers: { origin: app.url },
        multipart: {
          input: JSON.stringify(input),
          audio: {
            name: "reflection.wav",
            mimeType: "audio/wav",
            buffer: audio,
          },
        },
      }),
    ),
  );
  expect(replays.map((response) => response.status())).toEqual([200, 200]);
  const changedAudio = Buffer.from(audio);
  changedAudio[44] ^= 1;
  expect(
    (
      await page.request.post(endpoint, {
        headers: { origin: app.url },
        multipart: {
          input: JSON.stringify(input),
          audio: {
            name: "reflection.wav",
            mimeType: "audio/wav",
            buffer: changedAudio,
          },
        },
      })
    ).status(),
  ).toBe(409);
});

function wav(seconds = 1) {
  const buffer = Buffer.alloc(44 + 32000 * seconds);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(buffer.length - 44, 40);
  return buffer;
}

test("saved audio validates bytes and stays owned by its family and Learner", async ({
  page,
  app,
  browser,
  openai,
}) => {
  await setup(page);
  const family = await (await page.request.get("/api/family")).json();
  const learner = family.selectedLearnerId;
  const sibling = family.learners.find(
    (item: { id: string }) => item.id !== learner,
  ).id;
  const base = `/api/learners/${learner}`;
  const source = (await (await page.request.get(`${base}/session`)).json())
    .session;
  const endpoint = `${base}/portfolio`;
  const input = {
    id: "owned-reflection",
    sessionId: source.id,
    actionIds: [],
    title: "What I tried",
    reflection: "",
  };
  const upload = (buffer = wav(), mimeType = "audio/wav") => ({
    headers: { origin: app.url },
    multipart: {
      input: JSON.stringify(input),
      audio: { name: "reflection.wav", mimeType, buffer },
    },
  });
  expect(
    (
      await page.request.post(endpoint, {
        headers: { origin: app.url },
        data: { ...input, audio: { url: "https://example.invalid/audio.wav" } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(endpoint, upload(Buffer.from("not a WAV")))
    ).status(),
  ).toBe(400);
  expect(
    (await page.request.post(endpoint, upload(wav(), "audio/mpeg"))).status(),
  ).toBe(400);
  const spoof = wav();
  spoof.writeUInt32LE(8000, 24);
  expect((await page.request.post(endpoint, upload(spoof))).status()).toBe(400);
  expect((await page.request.post(endpoint, upload(wav(0.1)))).status()).toBe(
    400,
  );
  expect((await page.request.post(endpoint, upload(wav(61)))).status()).toBe(
    413,
  );
  expect(
    (
      await page.request.post(endpoint, {
        ...upload(),
        headers: { origin: "https://other.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(`/api/learners/${sibling}/portfolio`, upload())
    ).status(),
  ).toBe(404);
  expect((await (await page.request.get(endpoint)).json()).entries).toEqual([]);
  const saves = await Promise.all(
    [1, 2].map(() => page.request.post(endpoint, upload())),
  );
  expect(saves.map((response) => response.status())).toEqual([200, 200]);
  expect(
    (await (await page.request.get(endpoint)).json()).entries,
  ).toHaveLength(1);
  const asset = `${endpoint}/${input.id}/audio`;
  const response = await page.request.get(asset);
  expect(response.headers()).toMatchObject({
    "content-type": "audio/wav",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  });
  expect(await response.body()).toEqual(wav());
  expect(
    (await page.request.get(asset.replace(learner, sibling))).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(`/api/learners/${sibling}/portfolio`, upload())
    ).status(),
  ).toBe(404);
  const stranger = await browser.newContext({ baseURL: app.url });
  try {
    expect((await stranger.request.get(asset)).status()).toBe(401);
    expect((await stranger.request.post(endpoint, upload())).status()).toBe(
      401,
    );
    await setup(await stranger.newPage(), "other@example.test");
    expect((await stranger.request.get(asset)).status()).toBe(404);
    const other = await (await stranger.request.get("/api/family")).json();
    expect(
      (
        await stranger.request.get(
          asset.replace(learner, other.selectedLearnerId),
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await stranger.request.post(
          `/api/learners/${other.selectedLearnerId}/portfolio`,
          upload(),
        )
      ).status(),
    ).toBe(404);
  } finally {
    await stranger.close();
  }
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "My Portfolio", exact: true }),
  ).not.toContainText("What I tried");
  await expect(page.getByLabel("Saved spoken reflection")).toHaveCount(0);
  expect(openai.requests).toHaveLength(0);
});

test("a deliberately kept spoken reflection accompanies a picture while ordinary speech does not", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  openai.transcribe("These are ordinary words for the Tutor.");
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording" }),
  ).toBeVisible();
  await page.waitForTimeout(400);
  await page
    .getByRole("button", { name: "Stop and transcribe", exact: true })
    .click();
  await expect(page.getByLabel("Review your transcription")).toHaveValue(
    "These are ordinary words for the Tutor.",
  );
  await page
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Attach a picture", exact: true })
    .click();
  await page.getByLabel("Picture subject").selectOption("art");
  await page.getByLabel("Workbook or artwork picture").setInputFiles({
    name: "fictional-art.png",
    mimeType: "image/png",
    buffer: await sharp(
      Buffer.from(
        '<svg width="400" height="200"><rect width="400" height="200" fill="#a7c7da"/><path d="M0 200L170 10L400 200Z" fill="#29566c"/></svg>',
      ),
    )
      .png()
      .toBuffer(),
  });
  openai.reply(
    JSON.stringify({
      readable: true,
      description: "A fictional blue mountain.",
    }),
  );
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(page.getByLabel("Check the picture description")).toHaveValue(
    "A fictional blue mountain.",
  );
  await page
    .getByRole("button", { name: "Confirm picture", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Attached art picture" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page
    .getByRole("checkbox", { name: "Keep this art picture", exact: true })
    .check();
  await page.getByLabel("Entry title").fill("Why I drew a mountain");
  await expect(
    page.getByRole("button", { name: "Save to Portfolio", exact: true }),
  ).toBeDisabled();
  await record(page);
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  const family = await (await page.request.get("/api/family")).json();
  const base = `/api/learners/${family.selectedLearnerId}`;
  const source = (await (await page.request.get(`${base}/session`)).json())
    .session;
  const entries = (await (await page.request.get(`${base}/portfolio`)).json())
    .entries;
  const entryPath = `${base}/portfolio/${entries[0].id}`;
  const entry = (await (await page.request.get(entryPath)).json()).entry;
  expect(entry.evidence).toEqual([]);
  expect(entry.images).toHaveLength(1);
  expect(entry.audio.durationSeconds).toBeGreaterThan(0.25);
  expect(entry.reflection).toBe("");
  expect(
    (
      await page.request.patch(entryPath, {
        headers: { origin: app.url },
        data: { reflection: "" },
      })
    ).status(),
  ).toBe(200);
  await page.request.post(`${base}/session/${source.id}`, {
    headers: { origin: app.url },
    data: { intent: "end" },
  });
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Why I drew a mountain", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Saved art picture" }),
  ).toBeVisible();
  await expect(page.getByLabel("Saved spoken reflection")).toBeVisible();
  expect((await page.request.get(`${entryPath}/audio`)).status()).toBe(200);
  expect(openai.requests).toHaveLength(2);
});

test("closing a pending microphone request cannot carry a recording into another Learner", async ({
  page,
  openai,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        new Promise<MediaStream>((resolve) => {
          (window as any).releaseReflectionMicrophone = async () =>
            resolve(await original({ audio: true }));
        }),
    });
  });
  await page
    .getByRole("button", { name: "Record a reflection to keep" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Waiting for microphone permission" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await page.evaluate(() => (window as any).releaseReflectionMicrophone());
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).reflectionFixture.streams.flatMap(
          (stream: MediaStream) =>
            stream.getTracks().map((track) => track.readyState),
        ),
      ),
    )
    .toEqual(["ended"]);
  await page.getByRole("button", { name: "Start an activity" }).click();
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await expect(page.getByLabel("Review spoken reflection")).toHaveCount(0);
  await expect(page.getByLabel("Entry title")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Save to Portfolio", exact: true }),
  ).toBeDisabled();
  expect(openai.requests).toHaveLength(0);
});
