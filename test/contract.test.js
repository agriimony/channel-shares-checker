const test = require("node:test"); const assert = require("node:assert/strict");
test("ABI channel id position",()=>{const input="0x2279a970"+BigInt(2486).toString(16).padStart(64,"0")+"1".padStart(64,"0"); assert.equal(BigInt("0x"+input.slice(10,74)),2486n)});
