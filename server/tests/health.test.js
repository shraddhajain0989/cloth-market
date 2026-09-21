import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

test("express app initializes", () => {
  const app = createApp();
  assert.equal(typeof app, "function");
  assert.equal(typeof app.use, "function");
});
