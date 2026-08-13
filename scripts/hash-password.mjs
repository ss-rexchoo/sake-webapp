#!/usr/bin/env node
/**
 * Prints a scrypt hash for the shared staff password.
 *
 *   npm run hash-password                  # prompts, input hidden
 *   npm run hash-password -- 'my password' # non-interactive (shell history!)
 *
 * Paste the output into `ADMIN_PASSWORD_HASH` — in AWS Secrets Manager for the
 * ECS service, or in `.env.local` to exercise the real login locally.
 *
 * This is a standalone .mjs rather than TypeScript so it runs with plain `node`
 * and needs no build step or loader flag. It duplicates ~20 lines of
 * `src/lib/auth/password.ts` on purpose: importing a `.ts` module from a script
 * would drag in a transpiler, and the format is pinned by the parser on the
 * other side, which rejects anything it does not understand.
 */

import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// Keep in step with SCRYPT_N / SCRYPT_R / SCRYPT_P in src/lib/auth/password.ts.
// The hash records them, so an older hash keeps verifying if these change.
const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const MAXMEM = 128 * 1024 * 1024;

/** Reads a line from the TTY without echoing it. Falls back to a plain read. */
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // `_writeToOutput` is readline's own hook for exactly this; muting the
    // output stream wholesale would also swallow the prompt.
    let muted = false;
    rl._writeToOutput = (text) => {
      if (!muted || text.includes(question)) rl.output.write(text);
    };

    rl.question(question, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
    rl.on("error", reject);
    muted = true;
  });
}

async function main() {
  const fromArgs = process.argv.slice(2).join(" ").trim();
  const password = fromArgs || (await promptHidden("Staff password: ")).trim();

  if (!password) {
    console.error("No password given. Nothing was hashed.");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error(
      `\n⚠  That password is ${password.length} characters. This is the only ` +
        "credential guarding the whole admin, and it is shared by everyone on\n" +
        "   shift — use a long passphrase (16+ characters). Hashing it anyway.\n",
    );
  }

  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });

  const hash = [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");

  console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
  console.log(
    "Store this in AWS Secrets Manager (or .env.local for a local run).\n" +
      "It is a hash — safe to paste into a secret store, useless to an attacker\n" +
      "without the password. You also need SESSION_SECRET; generate one with:\n" +
      "  openssl rand -base64 48\n",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
