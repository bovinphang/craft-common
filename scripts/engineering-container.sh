#!/bin/sh
set -eu
mkdir -p /work
cp -R /src/. /work/
cd /work
export RUSTUP_AUTO_INSTALL=0 GOTOOLCHAIN=local GOPROXY=off GOSUMDB=off PYTHONDONTWRITEBYTECODE=1
export PATH="/tools:$PATH"
case "$CASE_ID" in
  EP-TS-01)
    node --version > /out/versions.txt
    node /toolchain/typescript/bin/tsc --version >> /out/versions.txt
    node -p "require('/toolchain/@types/node/package.json').version" >> /out/versions.txt
    node /toolchain/typescript/bin/tsc --noEmit -p . --typeRoots /toolchain/@types > /out/compile.log 2>&1
    set -- node --experimental-strip-types --test --test-reporter=tap boundary.test.ts ;;
  EP-RS-01)
    rustc --version > /out/versions.txt
    cargo --version >> /out/versions.txt
    cargo test --offline --locked --no-run > /out/compile.log 2>&1
    set -- cargo test --offline --locked ;;
  EP-GO-01)
    go version > /out/versions.txt
    go test -run='^$' ./... > /out/compile.log 2>&1
    set -- go test -json -count=1 -timeout=15s ./... ;;
  EP-JAVA-01)
    javac -version > /out/versions.txt 2>&1
    java -version >> /out/versions.txt 2>&1
    javac --release 17 ResourceBoundary.java ResourceBoundaryTest.java > /out/compile.log 2>&1
    set -- java -ea -cp . ResourceBoundaryTest ;;
  EP-PY-01)
    python3 --version > /out/versions.txt
    set -- python3 -B -m unittest -v test_resource_boundary.py ;;
  EP-C-01)
    cc --version > /out/versions.txt
    cc -std=c11 -DNDEBUG -Wall -Wextra -Werror boundary.c boundary_test.c -o boundary-test > /out/compile.log 2>&1
    set -- ./boundary-test ;;
  EP-CPP-01)
    c++ --version > /out/versions.txt
    c++ -std=c++17 -DNDEBUG -Wall -Wextra -Werror boundary.cpp boundary_test.cpp -o boundary-test > /out/compile.log 2>&1
    set -- ./boundary-test ;;
  EP-IPC-01)
    node --version > /out/versions.txt
    set -- node --test --test-reporter=tap ipc-lifecycle.test.cjs ;;
  *) echo 'Unsupported owned case' >&2; exit 2 ;;
esac
set +e
CRAFT_ENGINEERING_DEFECTIVE=1 "$@" > /out/red.log 2>&1
task_red=$?
CRAFT_ENGINEERING_DEFECTIVE=0 "$@" > /out/green.log 2>&1
task_green=$?
set -e
printf '{"red":%s,"green":%s}\n' "$task_red" "$task_green" > /out/status.json
