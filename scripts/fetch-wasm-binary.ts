import { createHash } from "node:crypto";
import {
  createWriteStream,
  mkdirSync,
  existsSync,
  renameSync,
  unlinkSync,
  readFileSync,
} from "node:fs";
import https from "node:https";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { loadEnvFile } from "node:process";

import pkg from "../package.json" with { type: "json" };

// Automatically looks for a file named '.env' in the current directory
try {
  loadEnvFile();
} catch (e) {
  console.warn(".env file not found, skipping local load.");
}

// Resolve __dirname for ES Modules (tsx)
const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration - Use env vars for CI/CD security
const GITHUB_TOKEN = process.env.ACCESS_TOKEN || "";
const OWNER = "wailo";
const REPO = "Compact-Flight-Simulator";
const TAG = pkg.wasmTag; // You can also use 'latest'

// Hardcoded files and destinations
const ASSETS = [
  {
    name: "flightsimulator_exec.d.ts",
    dest: "src/wasm/generated",
  },
  {
    name: "flightsimulator_exec.js",
    dest: "src/wasm/generated",
  },
  {
    name: "flightsimulator_exec_meta.ts",
    dest: "src/wasm/generated",
  },
  {
    name: "flightsimulator_exec.wasm",
    dest: "public",
  },
  {
    name: "flightsimulator_exec.data",
    dest: "public",
  },
];

async function fetchAssetIdByName(
  name: string,
): Promise<{ id: number; digest: string }> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "CI-Script",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch release: ${res.status} ${res.statusText}`);
  }

  const release = await res.json();
  const asset = release.assets.find((a: any) => a.name === name);
  if (!asset) {
    throw new Error(`Asset not found: ${name}`);
  }

  return { id: asset.id, digest: asset.digest };
}

function downloadAssetById(
  assetId: number,
): Promise<import("http").IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = (url: string, withAuth: boolean) => {
      https
        .get(
          url,
          {
            headers: {
              ...(withAuth && {
                Authorization: `Bearer ${GITHUB_TOKEN.trim()}`,
              }),
              ...(withAuth && { Accept: "application/octet-stream" }),
              "User-Agent": "CI-Script",
            },
          },
          (res) => {
            const { statusCode, headers } = res;

            // 🔁 Handle redirect
            if (statusCode && [301, 302, 303, 307, 308].includes(statusCode)) {
              const location = headers.location;
              if (!location) {
                reject(new Error("Redirect without location header"));
                return;
              }

              // IMPORTANT: drop auth after redirect (S3 URL)
              request(location, false);
              return;
            }

            if (statusCode !== 200) {
              let errorBody = "";
              res.on("data", (chunk) => (errorBody += chunk));
              res.on("end", () => {
                reject(
                  new Error(
                    `Download failed (${statusCode}): ${errorBody || res.statusMessage}`,
                  ),
                );
              });
              return;
            }

            resolve(res);
          },
        )
        .on("error", reject);
    };

    const initialUrl = `https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${assetId}`;

    request(initialUrl, true);
  });
}

async function run() {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  for (const asset of ASSETS) {
    console.log(`🔍 Resolving ID for ${asset.name}...`);

    const { id: assetId, digest: assetHash } = await fetchAssetIdByName(
      asset.name,
    );

    const tempPath = join(__dirname, `temp_${asset.name}`);

    console.log(`⬇️ Downloading ${asset.name}...`);

    const response = await downloadAssetById(assetId);

    if (response.statusCode !== 200) {
      throw new Error(
        `Failed to download ${asset.name}. Error: ${response.statusCode} ${response.statusMessage}`,
      );
    }

    await pipeline(response, createWriteStream(tempPath));

    // Verify Hash
    const actualHash = createHash("sha256")
      .update(readFileSync(tempPath))
      .digest("hex");

    if (actualHash !== assetHash.split(":")[1]) {
      unlinkSync(tempPath);
      throw new Error(`Hash mismatch for ${asset.name}!`);
    }

    if (!existsSync(asset.dest)) {
      mkdirSync(asset.dest, { recursive: true });
    }

    renameSync(tempPath, join(asset.dest, asset.name));
    console.log(`✅ ${asset.name} verified and moved to ${asset.dest}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
