#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const resultsDir = join(root, 'test-results');
const recordingsDir = join(root, 'recordings');
const outputVideo = join(recordingsDir, 'cabo-del-sol-booking-flow.webm');
const outputMetadata = join(recordingsDir, 'cabo-del-sol-booking-flow.json');

async function findFiles(directory, extension) {
  const matches = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) matches.push(...(await findFiles(path, extension)));
    else if (entry.name.endsWith(extension)) matches.push(path);
  }
  return matches;
}

async function newest(paths) {
  const files = await Promise.all(
    paths.map(async (path) => ({ path, modifiedAt: (await stat(path)).mtimeMs })),
  );
  files.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return files[0]?.path;
}

await mkdir(recordingsDir, { recursive: true });
await rm(outputVideo, { force: true });
await rm(outputMetadata, { force: true });

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const startedAt = new Date();
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(
    executable,
    ['playwright', 'test', 'tests/booking.spec.ts', '--project=e2e', '--workers=1'],
    {
      cwd: root,
      env: { ...process.env, RECORD_MODE: 'true' },
      stdio: 'inherit',
      shell: false,
    },
  );
  child.once('error', reject);
  child.once('close', (code) => resolve(code ?? 1));
});

if (exitCode !== 0) process.exit(exitCode);

const video = await newest(await findFiles(resultsDir, '.webm'));
if (!video) throw new Error('The E2E test passed but Playwright produced no WebM recording.');

await copyFile(video, outputVideo);
await writeFile(
  outputMetadata,
  `${JSON.stringify(
    {
      test: 'Four Seasons technical assessment — Cabo Del Sol booking flow',
      status: 'passed',
      site: process.env.BASE_URL ?? 'https://www.fourseasons.com',
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      sourceVideo: relative(root, video),
    },
    null,
    2,
  )}\n`,
);

console.log(`Saved successful recording: ${relative(root, outputVideo)}`);
