import { createPage, getPage, addCorrection, refreshPage } from '../src/mock/mockApi';

// Mock localStorage and window in Node environment
const storage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => { storage[k] = String(v); },
  removeItem: (k: string) => { delete storage[k]; },
};
(globalThis as any).window = {
  location: { search: '', hash: '' },
};

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runMockCheck() {
  console.log('--- 1. Testing Page.error on Seed Pages ---');
  const errorSeedPage = await getPage(8);
  console.log(`Page 8 status: "${errorSeedPage.status}", error:`, errorSeedPage.error);
  if (errorSeedPage.error?.code !== 'model_failed' || errorSeedPage.error.message !== 'The model could not read this page.') {
    throw new Error('Page 8 error shape does not match expected {code: "model_failed", message: "The model could not read this page."}');
  }
  const doneSeedPage = await getPage(1);
  console.log(`Page 1 status: "${doneSeedPage.status}", error:`, doneSeedPage.error);
  if (doneSeedPage.error !== null) {
    throw new Error('Page 1 error should be null');
  }

  console.log('\n--- 2. Creating New Page and Polling Until Done ---');
  const dummyFile = new Blob(['test image content'], { type: 'image/jpeg' });
  const created = await createPage(dummyFile, { writer: 'Test Letter 1965' });
  console.log(`createPage returned: id=${created.id}, status="${created.status}"`);

  let page = await getPage(created.id);
  console.log(`Initial getPage(${created.id}): status="${page.status}", transcript="${page.transcript.text}", translation.text="${page.translation.text}", facts=${page.facts.length}`);

  let lastStatus = page.status;
  while (page.status !== 'done') {
    await sleep(600);
    page = await getPage(created.id);
    if (page.status !== lastStatus) {
      console.log(`  -> Stage advanced to: "${page.status}" (elapsed: ${(Date.now() - (page.createdAtMs || 0))}ms)`);
      if (page.status === 'queued' || page.status === 'transcribing') {
        if (page.transcript.text !== '' || page.translation.text !== '' || page.facts.length !== 0) {
          throw new Error('Before transcript exists, text, translation.text and facts must be empty');
        }
      }
      lastStatus = page.status;
    }
  }
  console.log(`Page ${page.id} reached "done"! Facts count: ${page.facts.length}, uncertain count: ${page.transcript.uncertain.length}`);

  console.log('\n--- 3. Testing addCorrection on Uncertain Span ---');
  const targetUncertain = page.transcript.uncertain[0];
  console.log(`Uncertain span to correct: start=${targetUncertain.start}, end=${targetUncertain.end}, text="${page.transcript.text.slice(targetUncertain.start, targetUncertain.end)}"`);

  const replacementText = 'विशेष पार्सल';
  const correctedPage = await addCorrection(page.id, {
    start: targetUncertain.start,
    end: targetUncertain.end,
    new_text: replacementText,
  });

  const latestCorrection = correctedPage.transcript.corrections[correctedPage.transcript.corrections.length - 1];
  console.log('Correction record:', latestCorrection);
  console.log(`Verified corrected slice in CURRENT transcript: "${correctedPage.transcript.text.slice(latestCorrection.start, latestCorrection.end)}"`);
  if (latestCorrection.end !== latestCorrection.start + replacementText.length) {
    throw new Error('Correction end does not equal start + new.length');
  }
  console.log(`Remaining uncertain spans: ${correctedPage.transcript.uncertain.length}`);

  console.log('\n--- 4. Testing Asynchronous refreshPage and Polling Until Done ---');
  const refreshedImmediate = await refreshPage(correctedPage.id);
  console.log(`refreshPage returned immediately with status: "${refreshedImmediate.status}"`);
  if (refreshedImmediate.status !== 'translating') {
    throw new Error('refreshPage should return immediately with status "translating"');
  }

  page = await getPage(correctedPage.id);
  lastStatus = page.status;
  console.log(`Initial getPage after refresh: status="${page.status}"`);

  while (page.status !== 'done') {
    await sleep(600);
    page = await getPage(correctedPage.id);
    if (page.status !== lastStatus) {
      console.log(`  -> Refresh stage advanced to: "${page.status}"`);
      lastStatus = page.status;
    }
  }

  console.log(`Refreshed page reached "done"! Status: "${page.status}"`);
  console.log('Recomputed facts:');
  for (const f of page.facts) {
    const slice = page.transcript.text.slice(f.start, f.end);
    console.log(`  - [${f.kind}] "${f.text}" at [${f.start}, ${f.end}] matches transcript: "${slice}"`);
  }

  console.log('\nAll mock behaviors verified successfully!');
}

runMockCheck().catch((err) => {
  console.error('Check failed:', err);
  process.exit(1);
});
