import test from "node:test";
import assert from "node:assert/strict";
import * as common from "../../src/index.js";
test("CMake comments and strings cannot declare frameworks or native languages", () => {
  const body =
    '#[[\nfind_package(Drogon 1.9)\nproject(fake LANGUAGES CXX)\n]]\nset(text [[\nfind_package(Drogon)\n]])\nmessage("project(fake LANGUAGES C)")';
  assert.deepEqual(common.cmakePackageVersion(body, "Drogon"), {
    present: false,
    version: undefined,
  });
  assert.deepEqual(common.declaredNativeLanguages(body), []);
  assert.deepEqual(
    common.cmakePackageVersion(
      "find_package(Drogon 1.9 CONFIG REQUIRED)",
      "Drogon",
    ),
    { present: true, version: "1.9" },
  );
});
test("Gradle dependency strings in unrelated values do not become coordinates", () => {
  assert.deepEqual(
    common.gradleCoordinates(
      "val docs = \"implementation('org.springframework.boot:spring-boot-starter-web:3.5')\"",
    ),
    [],
  );
  assert.deepEqual(
    common.gradleCoordinates(
      'dependencies {\n implementation("org.springframework.boot:spring-boot-starter-web:3.5.16")\n}',
    ),
    [
      {
        group: "org.springframework.boot",
        artifact: "spring-boot-starter-web",
        version: "3.5.16",
      },
    ],
  );
});
test("malformed Maven XML and dependency field types fail before inference", () => {
  assert.throws(() =>
    common.mavenCoordinates(
      "<project><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot</artifactId></dependency>",
    ),
  );
  assert.throws(() => common.npmDependencies('{"dependencies":{"react":123}}'));
  assert.throws(() => common.npmDependencies('{"dependencies":["electron"]}'));
});
