#!/usr/bin/env python3
"""Reconstruct reviewed source bytes from two immutable Git objects; no runner imports."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
INPUT = HERE / 'inputs'
sha = lambda value: hashlib.sha256(value).hexdigest()
read = lambda path: json.loads(path.read_text())

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')

def git_blobs(repository, revision):
    assert re.fullmatch('[a-f0-9]{40}', revision)
    raw = subprocess.check_output(['git', 'ls-tree', '-rz', revision], cwd=repository)
    entries = []
    for row in raw.split(b'\0'):
        if not row:
            continue
        metadata, name = row.split(b'\t', 1)
        mode, kind, oid = metadata.decode().split()
        name = name.decode()
        assert kind == 'blob' and mode in ['100644', '100755'], 'nonregular Git input'
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        entries.append((name, oid, mode))
    process = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=repository,
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    result, modes = {}, {}
    try:
        for name, oid, mode in entries:
            process.stdin.write((oid + '\n').encode())
            process.stdin.flush()
            header = process.stdout.readline().decode().split()
            assert header[:2] == [oid, 'blob']
            value = process.stdout.read(int(header[2]))
            assert process.stdout.read(1) == b'\n'
            result[name], modes[name] = value, mode
        process.stdin.close()
        assert process.wait() == 0
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
        process.stdin.close()
        process.stdout.close()
    return result, modes

def normalized_subject(candidate, original, variant):
    result = dict(candidate)
    for name, value in result.items():
        if Path(name).suffix not in ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']:
            continue
        text = value.decode()
        for old, new in [('vite-plus/test/browser-playwright', '@vitest/browser-playwright'),
                         ('vite-plus/test', 'vitest'), ('vite-plus', 'vite')]:
            text = re.sub(r"(['\"])" + re.escape(old) + r'\1', lambda m: m[1] + new + m[1], text)
        result[name] = text.encode()
    config = result['vitest.config.ts'].decode().replace(
        "import { configDefaults, defineConfig } from 'vite';",
        "import { configDefaults, defineConfig } from 'vitest/config';")
    assert config.count('export default defineConfig({') == 1
    config = "import { applyBenchmark } from './benchmark-harness';\n" + config.replace(
        'export default defineConfig({', 'const benchmarkConfig = defineConfig({')
    result['vitest.config.ts'] = (config + '\nexport default applyBenchmark(benchmarkConfig);\n').encode()
    result['scripts/verification-provenance.mjs'] = (INPUT / 'verification-provenance.mjs').read_bytes()
    result['benchmark-harness.ts'] = (INPUT / 'benchmark-harness.ts').read_bytes()
    if variant == 'original':
        for name in ['package.json', 'package-lock.json']:
            result[name] = original[name]
    return result

def reconstruct(repository, task, verify_only=False):
    spec, source = read(INPUT / 'git-source-spec.json'), read(INPUT / 'source-map.json')
    candidate, candidate_modes = git_blobs(repository, spec['candidateCommit'])
    original, original_modes = git_blobs(repository, spec['originalToolchainCommit'])
    assert candidate_modes == spec['candidateModes'] and original_modes == spec['originalModes']
    hashes = {name: sha(value) for name, value in candidate.items()}
    assert len(candidate) == source['sourceFileCount'] == 2255 and hashes == source['sourceHashes']
    assert sha(json.dumps(hashes, sort_keys=True, separators=(',', ':')).encode()) == source['sourceDigest']
    assert {name: sha(value) for name, value in original.items()} == spec['originalHashes']
    assert len(original) == 2213 and candidate['.npmrc'] == original['.npmrc']
    subjects = {}
    for variant in ['original', 'candidate']:
        subjects[variant] = normalized_subject(candidate, original, variant)
        expected = read(INPUT / (variant + '-expected.json'))
        assert len(subjects[variant]) == 2256
        assert {name: sha(value) for name, value in subjects[variant].items()} == expected['files'], variant
    differences = [name for name in subjects['original'] if subjects['original'][name] != subjects['candidate'][name]]
    assert sorted(differences) == ['package-lock.json', 'package.json']
    proof = {'schemaVersion': 1, 'canonicalCommit': spec['candidateCommit'],
             'originalToolchainCommit': spec['originalToolchainCommit'], 'canonicalFiles': 2255,
             'originalGitFiles': 2213, 'subjectFiles': 2256, 'mismatches': [],
             'crossSubjectDifferences': sorted(differences), 'runtimeExecuted': False,
             'sourceDigest': source['sourceDigest'], 'historicalAcceptedFreezeSHA256': source['historicalAcceptedFreezeSHA256'],
             'historicalMacSubjectSeals': {v: read(INPUT / (v + '-expected.json'))['historicalMacManifestSHA256']
                                           for v in subjects},
             'sourceBytesMatchHistoricalMacSubjects': False,
             'sharedInstrumentationDelta': read(HERE / 'input-lock.json')['sharedInstrumentationDelta'],
             'commonProductSourceBytesChangedFromHistoricalFreeze': False,
             'newHostBindingsRequired': True}
    if verify_only:
        return proof
    assert not task.exists(), 'fresh CI workspace required; never restart failed materialization'
    task.mkdir(parents=True)
    for directory, files, modes in [('admin', candidate, candidate_modes), ('admin-baseline', original, original_modes),
                                     ('state/admin-foundation/controlled-benchmark/subjects/original', subjects['original'], candidate_modes),
                                     ('state/admin-foundation/controlled-benchmark/subjects/candidate', subjects['candidate'], candidate_modes)]:
        for name, value in files.items():
            target = task / directory / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(value)
            target.chmod(0o755 if modes.get(name) == '100755' else 0o644)
    benchmark = task / 'state/admin-foundation/controlled-benchmark'
    for name in ['run.py', 'guard-controls.py', 'guard-control-child.mjs', 'cache-receipt-controls.py']:
        shutil.copyfile(HERE / name, benchmark / name)
    for name in ['expected-inventory.json', 'schedule.json']:
        shutil.copyfile(INPUT / name, benchmark / name)
    write(benchmark / 'canonical-source-manifest.json', source)
    write(benchmark / 'git-reconstruction-receipt.json', proof)
    return proof

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repository', type=Path, required=True)
    parser.add_argument('--task', type=Path, required=True)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    print(json.dumps(reconstruct(args.repository.resolve(), args.task.resolve(), args.verify_only)))
