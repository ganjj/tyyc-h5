// 测试运行时把 "@/xxx" 别名解析到 .test-build/src/xxx（tsc 不重写 paths 别名）
const path = require("node:path");
const Module = require("node:module");
const root = path.resolve(__dirname, "..", ".test-build", "src");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  const target = request.startsWith("@/") ? path.join(root, request.slice(2)) : request;
  return original.call(this, target, ...rest);
};
