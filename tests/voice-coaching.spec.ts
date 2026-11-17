import { mkdir } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

test.use({
  viewport: { width: 1366, height: 768 },
  controlledTutorEnabled: false,
  modelEnvironment: {
    TUTOR_OPENAI_FIXTURE_URL: "fixture",
    TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "8000000000",
  },
  launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
});
async function setup(page: Page) {
  await page.addInitScript(() => {
    const state = {
      spoken: [] as { text: string; local: boolean }[],
      cancelled: 0,
      denyMicrophone: false,
      failPlayback: false,
      remoteOnly: false,
      streams: [] as MediaStream[],
    };
    // Only the microphone hardware boundary is controlled. Actual MediaStream,
    // Web Audio, AudioWorklet, WAV encoding and app HTTP route remain real.
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        if (state.denyMicrophone)
          throw new DOMException("Permission denied", "NotAllowedError");
        const audio = new AudioContext({ sampleRate: 16000 });
        await audio.resume();
        const destination = audio.createMediaStreamDestination();
        const oscillator = audio.createOscillator();
        oscillator.frequency.value = 440;
        oscillator.connect(destination);
        oscillator.start();
        const stream = destination.stream;
        for (const track of stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => {
            stop();
            oscillator.stop();
            void audio.close();
          };
        }
        state.streams.push(stream);
        return stream;
      },
    });
    Object.assign(window, { speechFixture: state });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
      configurable: true,
    });
    const speech = new EventTarget();
    Object.assign(speech, {
      getVoices: () =>
        [
          {
            name: "Remote default",
            lang: "en-US",
            localService: false,
            default: true,
          },
          {
            name: "Fictional local voice",
            lang: "en-US",
            localService: true,
            default: false,
          },
        ].filter((voice) => !state.remoteOnly || !voice.localService),
      speak: (utterance: SpeechSynthesisUtterance) => {
        if (state.failPlayback) {
          utterance.onerror?.(new Event("error") as SpeechSynthesisErrorEvent);
          return;
        }
        state.spoken.push({
          text: utterance.text,
          local: utterance.voice?.localService === true,
        });
        utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
      },
      cancel: () => {
        state.cancelled++;
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: speech,
      configurable: true,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill("parent@example.test");
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
async function record(page: Page, screenshot = false) {
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording" }),
  ).toBeVisible();
  if (screenshot) {
    await mkdir("/tmp/ai-tutor-research/ticket09", { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "/tmp/ai-tutor-research/ticket09/recording-laptop.png",
    });
  }
  // Allow actual Web Audio samples from the fictional microphone.
  await page.waitForTimeout(400);
  await page
    .getByRole("button", { name: "Stop and transcribe", exact: true })
    .click();
}
test("reviewed speech and typed attempts share context and explicitly local read-aloud", async ({
  page,
  openai,
}) => {
  await setup(page);
  await page.getByLabel("My scratchpad").fill("Draw six cups");
  openai.transcribe("How can I share 24 pens among six cuts?");
  await record(page, true);
  await expect(page.getByLabel("Review your transcription")).toHaveValue(
    "How can I share 24 pens among six cuts?",
  );
  expect(openai.requests).toHaveLength(1);
  expect(openai.requests[0]).toMatchObject({
    path: "/v1/audio/transcriptions",
    body: { model: "gpt-transcribe", fileType: "audio/wav" },
  });
  await page
    .getByLabel("Review your transcription")
    .fill("How can I share 24 pencils among six cups?");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "/tmp/ai-tutor-research/ticket09/transcription-review-laptop.png",
  });
  const reviewAction = await page
    .getByRole("button", { name: "Use this text", exact: true })
    .boundingBox();
  expect(reviewAction!.y + reviewAction!.height).toBeLessThanOrEqual(768);
  await page
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  openai.reply("Try drawing six cups. What would you put in each?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("24 pencils");
  await page.getByRole("button", { name: "Read latest reply aloud" }).click();
  expect(
    await page.evaluate(() => (window as any).speechFixture.spoken),
  ).toEqual([
    { text: "Try drawing six cups. What would you put in each?", local: true },
  ]);
  await page.getByRole("button", { name: "Stop reading", exact: true }).click();
  openai.reply("How can you check that all 24 pencils are used?");
  await page
    .getByLabel("Your message")
    .fill("I think four fit in each cup because 6 times 4 is 24.");
  await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("all 24 pencils");
  expect(JSON.stringify(openai.requests[2].body.input)).toContain(
    "Try drawing six cups",
  );
  expect(JSON.stringify(openai.requests[2].body.input)).not.toContain(
    "six cuts",
  );
  await expect(page.getByLabel("My scratchpad")).toHaveValue("Draw six cups");
  const usage = await (await page.request.get("/api/model-access")).json();
  expect(usage.unknownNanoUsd).toBe("0");
  expect(BigInt(usage.settledNanoUsd)).toBeGreaterThanOrEqual(46_075_000n);
  expect(BigInt(usage.settledNanoUsd)).toBeLessThanOrEqual(50_500_000n);
  await page.setViewportSize({ width: 1366, height: 768 });
  await mkdir("/tmp/ai-tutor-research/ticket09", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "/tmp/ai-tutor-research/ticket09/spoken-coaching-laptop.png",
  });
  const submit = await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .boundingBox();
  expect(submit!.y + submit!.height).toBeLessThanOrEqual(768);
});

test("leaving a hidden activity stops microphone capture without sending audio", async ({
  page,
  openai,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording" }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Record a message", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).speechFixture.streams.flatMap((stream: MediaStream) =>
        stream.getTracks().map((track) => track.readyState),
      ),
    ),
  ).toEqual(["ended"]);
  expect(openai.requests).toHaveLength(0);
  await expect(page.getByLabel("Your question")).toBeEnabled();
});

test("microphone denial, transcription outage and playback failure leave typing usable", async ({
  page,
  openai,
}) => {
  await setup(page);
  await page.evaluate(() => {
    (window as any).speechFixture.denyMicrophone = true;
  });
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Microphone permission was denied" }),
  ).toBeVisible();
  await expect(page.getByLabel("Your question")).toBeEnabled();
  await page.evaluate(() => {
    (window as any).speechFixture.denyMicrophone = false;
  });
  openai.fail();
  await record(page);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Speech could not be transcribed" }),
  ).toBeVisible();
  expect(
    await (await page.request.get("/api/model-access")).json(),
  ).toMatchObject({ unknownNanoUsd: "4500000" });
  openai.reply("Draw a shape with four sides.");
  await page
    .getByLabel("Your question")
    .fill("How can I compare these shapes?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("four sides");
  await page.evaluate(() => {
    (window as any).speechFixture.failPlayback = true;
  });
  await page.getByRole("button", { name: "Read latest reply aloud" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Read-aloud could not play" }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as any).speechFixture.remoteOnly = true;
    window.speechSynthesis.dispatchEvent(new Event("voiceschanged"));
  });
  await expect(
    page.getByRole("button", { name: "Read latest reply aloud" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => (window as any).speechFixture.spoken),
  ).toEqual([]);
  await expect(page.getByLabel("Your message")).toBeEnabled();
});

test("profile and activity changes discard pending audio and stop playback", async ({
  page,
  openai,
}) => {
  await setup(page);
  const release = openai.holdTranscription(
    "Old River words must not become Sky words.",
  );
  await record(page);
  await expect.poll(() => openai.requests.length).toBe(1);
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await page.getByRole("button", { name: "Start an activity" }).click();
  release();
  await expect(page.getByLabel("Your question")).toHaveValue("");
  await expect(page.getByLabel("Review your transcription")).toHaveCount(0);
  openai.reply("What do you notice about the colors?");
  await page.getByLabel("Your question").fill("I want to paint a forest.");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await page.getByRole("button", { name: "Read latest reply aloud" }).click();
  const cancelled = await page.evaluate(
    () => (window as any).speechFixture.cancelled,
  );
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Stop reading", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Read latest reply aloud" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Switch Learner" }).click();
  expect(
    await page.evaluate(() => (window as any).speechFixture.cancelled),
  ).toBeGreaterThan(cancelled);
  expect(
    await page.evaluate(() =>
      (window as any).speechFixture.streams.every((stream: MediaStream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await expect(page.getByLabel("Your question")).toHaveValue("");
  const finish = openai.holdTranscription("Ended activity text");
  await record(page);
  await expect.poll(() => openai.requests.length).toBe(3);
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  finish();
  await page.getByRole("button", { name: "Start an activity" }).click();
  await expect(page.getByLabel("Your question")).toHaveValue("");
  await expect(page.getByLabel("Review your transcription")).toHaveCount(0);
});

function wav(seconds = 1) {
  const buffer = Buffer.alloc(44 + 16000 * 2 * seconds);
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
async function currentPath(page: Page) {
  const family = await (await page.request.get("/api/family")).json();
  const path = `/api/learners/${family.selectedLearnerId}/session`;
  const session = (await (await page.request.get(path)).json()).session;
  return { path: `${path}/${session.id}`, family, session };
}
test("transcription validates bytes, ownership and replay before spending and saves no audio or unreviewed words", async ({
  page,
  app,
  openai,
  browser,
}) => {
  await setup(page);
  const { path, family } = await currentPath(page);
  const headers = {
    origin: app.url,
    "Content-Type": "audio/wav",
    "X-Recording-Id": "one-recording",
  };
  const endpoint = `${path}/transcription`;
  const anonymous = await browser.newContext();
  expect(
    (
      await anonymous.request.post(app.url + endpoint, { headers, data: wav() })
    ).status(),
  ).toBe(401);
  await anonymous.close();
  expect(
    (
      await page.request.post(endpoint, {
        headers: { ...headers, origin: "https://other.invalid" },
        data: wav(),
      })
    ).status(),
  ).toBe(403);
  const sibling = family.learners.find(
    (learner: { id: string }) => learner.id !== family.selectedLearnerId,
  );
  expect(
    (
      await page.request.post(
        endpoint.replace(family.selectedLearnerId, sibling.id),
        { headers, data: wav() },
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(endpoint, {
        headers,
        data: Buffer.from("not audio"),
      })
    ).status(),
  ).toBe(400);
  const spoof = wav();
  spoof.writeUInt32LE(8000, 24);
  expect(
    (await page.request.post(endpoint, { headers, data: spoof })).status(),
  ).toBe(400);
  expect(
    (await page.request.post(endpoint, { headers, data: wav(61) })).status(),
  ).toBe(413);
  expect(openai.requests).toHaveLength(0);
  const release = openai.holdTranscription("Unreviewed words");
  const pending = page.request.post(endpoint, { headers, data: wav() });
  await expect.poll(() => openai.requests.length).toBe(1);
  expect(
    await (
      await page.request.get("/api/model-access?operation=transcription")
    ).json(),
  ).toMatchObject({ reservedNanoUsd: "4500000" });
  expect(
    (await page.request.post(endpoint, { headers, data: wav() })).status(),
  ).toBe(503);
  expect(openai.requests).toHaveLength(1);
  release();
  expect(await (await pending).json()).toEqual({ text: "Unreviewed words" });
  expect(
    await (await page.request.get("/api/model-access")).json(),
  ).toMatchObject({ settledNanoUsd: "75000", unknownNanoUsd: "0" });
  expect((await (await page.request.get(path)).json()).session.actions).toEqual(
    [],
  );
  expect(
    (
      await (
        await page.request.get(
          `/api/learners/${family.selectedLearnerId}/portfolio`,
        )
      ).json()
    ).entries,
  ).toEqual([]);
  await app.restart();
  expect(
    (await page.request.post(endpoint, { headers, data: wav() })).status(),
  ).toBe(503);
  expect(openai.requests).toHaveLength(1);
  expect((await (await page.request.get(path)).json()).session.actions).toEqual(
    [],
  );
});

test("missing speech usage keeps the reservation while reviewed text stays usable", async ({
  page,
  openai,
}) => {
  await setup(page);
  openai.transcribe("I could draw three groups.", {
    type: "tokens",
    input_tokens: 5,
  });
  await record(page);
  await expect(page.getByLabel("Review your transcription")).toHaveValue(
    "I could draw three groups.",
  );
  expect(
    await (
      await page.request.get("/api/model-access?operation=transcription")
    ).json(),
  ).toMatchObject({ unknownNanoUsd: "4500000", settledNanoUsd: "0" });
  await page
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  await expect(page.getByLabel("Your question")).toHaveValue(
    "I could draw three groups.",
  );
});

test("speech readiness is separate and a depleted shared allowance prevents dispatch", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  await app.restart({ TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "4499999" });
  expect(
    await (
      await page.request.get("/api/model-access?operation=transcription")
    ).json(),
  ).toMatchObject({ ready: false, reason: "allowance_exhausted" });
  const { path } = await currentPath(page);
  expect(
    (
      await page.request.post(`${path}/transcription`, {
        headers: {
          origin: app.url,
          "Content-Type": "audio/wav",
          "X-Recording-Id": "blocked",
        },
        data: wav(),
      })
    ).status(),
  ).toBe(503);
  expect(openai.requests).toHaveLength(0);
  await app.restart({
    TUTOR_OPENAI_FIXTURE_URL: "",
    OPENAI_API_KEY: "fictional-not-live",
    TUTOR_FUNDING_EVIDENCE: JSON.stringify({
      windowId: "fictional",
      organizationId: "org-fictional",
      projectId: "proj-fictional",
      source: "activated_subscription_grant",
      evidenceReference: "fictional-review",
      activatedGrantNanoUsd: "200000000000",
      availableGrantNanoUsd: "10000000000",
      allocationNanoUsd: "8000000000",
      checkedAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      evidenceExpiresAt: new Date(Date.now() + 43200000).toISOString(),
      purchasedCreditsAbsent: true,
      automaticRechargeDisabled: true,
      unapprovedPostpaidDisabled: true,
      otherConsumers: "none",
      usageBoundary: "exclusive_app_ledger",
      regionalProcessing: false,
      pricePolicy: "sol-standard-no-cache-2026-11-16",
    }),
    TUTOR_RETENTION_EVIDENCE: JSON.stringify({
      organizationId: "org-fictional",
      projectId: "proj-fictional",
      evidenceReference: "fictional-retention",
      approvedZdr: true,
      responsesTextApproved: true,
      applicationRetentionVerified: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  expect(
    await (await page.request.get("/api/model-access")).json(),
  ).toMatchObject({ ready: true });
  expect(
    await (
      await page.request.get("/api/model-access?operation=transcription")
    ).json(),
  ).toMatchObject({ ready: false, reason: "unverified_retention" });
  expect(
    (
      await page.request.post(`${path}/transcription`, {
        headers: {
          origin: app.url,
          "Content-Type": "audio/wav",
          "X-Recording-Id": "unapproved",
        },
        data: wav(),
      })
    ).status(),
  ).toBe(503);
  expect(openai.requests).toHaveLength(0);
});

test("pausing stops recording and rejects transcripts spanning pause and resume", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  const { path } = await currentPath(page);
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume activity", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).speechFixture.streams.every((stream: MediaStream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    ),
  ).toBe(true);
  expect(
    (
      await page.request.post(`${path}/transcription`, {
        headers: {
          origin: app.url,
          "Content-Type": "audio/wav",
          "X-Recording-Id": "while-paused",
        },
        data: wav(),
      })
    ).status(),
  ).toBe(409);
  await page
    .getByRole("button", { name: "Resume activity", exact: true })
    .click();
  await expect(page.getByLabel("Your question")).toBeVisible();
  const release = openai.holdTranscription("Before the break");
  const pending = page.request.post(`${path}/transcription`, {
    headers: {
      origin: app.url,
      "Content-Type": "audio/wav",
      "X-Recording-Id": "before-pause",
    },
    data: wav(),
  });
  await expect.poll(() => openai.requests.length).toBe(1);
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume activity", exact: true })
    .click();
  await expect(page.getByLabel("Your question")).toBeVisible();
  release();
  expect((await pending).status()).toBe(409);
  await expect(page.getByLabel("Your question")).toHaveValue("");
  await expect(page.getByLabel("Review your transcription")).toHaveCount(0);
});

test("late microphone permission cannot reopen capture in another profile", async ({
  page,
  openai,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        new Promise<MediaStream>((resolve) => {
          (window as any).releaseMicrophone = async () =>
            resolve(await original({ audio: true }));
        }),
    });
  });
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Waiting for microphone permission" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await page.evaluate(() => (window as any).releaseMicrophone());
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).speechFixture.streams.flatMap((stream: MediaStream) =>
          stream.getTracks().map((track) => track.readyState),
        ),
      ),
    )
    .toEqual(["ended"]);
  await page.getByRole("button", { name: "Start an activity" }).click();
  await expect(page.getByLabel("Your question")).toHaveValue("");
  expect(openai.requests).toHaveLength(0);
});

test("contradictory speech duration cannot release a minute reservation", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  const { path } = await currentPath(page);
  openai.transcribe("A fictional long explanation.", {
    type: "duration",
    seconds: 1,
  });
  const response = await page.request.post(`${path}/transcription`, {
    headers: {
      origin: app.url,
      "Content-Type": "audio/wav",
      "X-Recording-Id": "long-recording",
    },
    data: wav(60),
  });
  expect(response.status()).toBe(200);
  expect(
    await (
      await page.request.get("/api/model-access?operation=transcription")
    ).json(),
  ).toMatchObject({ unknownNanoUsd: "4500000", settledNanoUsd: "0" });
});
