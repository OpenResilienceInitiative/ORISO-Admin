#!/usr/bin/env python3
"""Explicit-lease-only benchmark supervisor. No automatic installs/builds/retries."""
import argparse
import collections
import datetime
import hashlib
import json
import os
import re
from pathlib import Path
import signal
import shlex
import statistics
import subprocess
import sys
import time

B = Path(__file__).resolve().parent
TASK = B.parents[2]
NODE = Path(os.environ['BENCHMARK_NODE_BINARY']).resolve()
RECEIPT = B / 'materialization-receipt.json'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(p.name + '.tmp')
    tmp.write_text(json.dumps(value, indent=2) + '\n')
    tmp.replace(p)

def read(p):
    return json.loads(p.read_text())

def lease_check(args):
    lease = read(Path(args.lease))
    assert lease.get('owner') == 'root' and lease.get('exclusive') is True
    assert lease.get('purpose') == 'admin-controlled-benchmark'
    assert args.stage in lease.get('allow', []) and lease.get('leaseId')
    assert lease.get('attempt') == args.attempt, 'explicit new attempt must match renewed lease'
    assert lease.get('expiresAtEpoch', 0) > time.time(), 'lease expired'
    return lease

def guard(variant):
    receipt = read(RECEIPT)
    freeze = Path(receipt['freeze'])
    assert sha(freeze) == receipt['freezeSHA256'], 'canonical freeze seal changed'
    canonical = read(freeze)['sourceHashes']
    assert len(canonical) == receipt['canonicalFiles'] == 2255, 'canonical inventory boundary changed'
    assert hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(',', ':')).encode()).hexdigest() == receipt['canonicalSourceDigest'], 'canonical source digest changed'
    assert all(sha(TASK / 'admin' / f) == h for f, h in canonical.items()), 'canonical source changed'
    subject = receipt['subjects'][variant]
    root = Path(subject['root'])
    manifest_path = Path(subject['manifest'])
    assert sha(manifest_path) == subject['manifestSHA256'], 'subject seal changed'
    manifest = read(manifest_path)
    assert len(manifest['files']) == subject['files']
    actual_files = []
    for directory, dirs, names in os.walk(root, followlinks=False):
        relative_dir = Path(directory).relative_to(root)
        if relative_dir == Path('.'):
            dirs[:] = [x for x in dirs if x not in ['node_modules', '.preflight-cache']]
        for name in names:
            p = Path(directory) / name
            relative = p.relative_to(root).as_posix()
            if relative == '.probe-source-manifest.json':
                continue
            assert not p.is_symlink(), relative
            actual_files.append(relative)
    assert sorted(actual_files) == sorted(manifest['files']), 'source inventory changed'
    assert all(sha(root / f) == h for f, h in manifest['files'].items()), 'subject bytes changed'
    assert (root / 'node_modules').is_symlink()
    assert (root / 'node_modules').resolve() == Path(subject['dependencyRoot']).resolve()
    assert Path(subject['dependencyRoot']).is_dir(), 'original install is absent; obtain lease and install once separately'
    lock_owner = TASK / ('admin-baseline' if variant == 'original' else 'admin')
    expected = receipt['toolchains'][variant]
    assert sha(lock_owner / 'package-lock.json') == expected['lockSHA256'], 'lock drift'
    packages = {}
    for name, version in expected['packages'].items():
        p = root / 'node_modules' / name / 'package.json'
        metadata = read(p)
        assert metadata['version'] == version, (name, version, metadata['version'])
        packages[name] = {'version': version, 'path': str(p.resolve()), 'sha256': sha(p)}
    browser = receipt['expectedBrowserExecutable']
    assert sha(Path(browser['path'])) == browser['sha256'], 'shared browser executable changed'
    assert subprocess.check_output([str(NODE), '--version'], text=True).strip() == 'v22.23.3'
    return {'checkedAtUTC': now(), 'subjectManifestSHA256': sha(manifest_path), 'canonicalManifestSHA256': sha(freeze),
            'node': {'path': str(NODE), 'sha256': sha(NODE)}, 'packages': packages,
            'browserExecutable': browser,
            'runner': {'path': str((root / 'node_modules/vitest/vitest.mjs').resolve()), 'sha256': sha(root / 'node_modules/vitest/vitest.mjs')},
            'sourceMismatchCount': 0}

OWNED_BIRTHS = {}

def process_group(group):
    """Observe own descendants even when Playwright gives a browser its own group."""
    result = subprocess.run(['ps', '-axo', 'pid=,ppid=,pgid=,stat=,pcpu=,rss=,lstart=,command='], capture_output=True, text=True, check=True)
    all_rows = []
    for line in result.stdout.splitlines():
        fields = line.strip().split(None, 11)
        if len(fields) == 12 and not fields[3].startswith('Z'):
            all_rows.append({'pid': int(fields[0]), 'parent': int(fields[1]), 'pgid': int(fields[2]),
                             'state': fields[3], 'cpuPercentSnapshot': fields[4], 'rssKiBSnapshot': fields[5],
                             'birth': ' '.join(fields[6:11]), 'command': fields[11]})
    known = OWNED_BIRTHS.setdefault(group, {})
    owned = {group}
    owned.update(row['pid'] for row in all_rows if known.get(row['pid']) == row['birth'])
    while True:
        expanded = owned | {row['pid'] for row in all_rows if row['pgid'] == group or row['parent'] in owned}
        if expanded == owned:
            break
        owned = expanded
    rows = [row for row in all_rows if row['pid'] in owned]
    known.update({row['pid']: row['birth'] for row in rows})
    return rows

def terminate_owned(group, sig):
    rows = process_group(group)
    owned_leaders = {row['pid'] for row in rows}
    for pgid in {row['pgid'] for row in rows}:
        # Never signal a pre-existing group merely because it contains a child.
        if pgid != group and pgid not in owned_leaders:
            continue
        try:
            os.killpg(pgid, sig)
        except ProcessLookupError:
            pass

def fail_on_guard_marker(args, entry, directory, identity, state, state_path):
    """A failed/badly-bound marker always fails closed; never ignore a foreign payload."""
    marker = directory / 'fatal.json'
    if not marker.exists() and not marker.is_symlink():
        return
    issues = []
    payload = None
    marker_sha = None
    if marker.is_symlink() or not marker.is_file():
        issues.append('fatal marker is not an owned regular file')
    else:
        marker_sha = sha(marker)
        try:
            payload = read(marker)
        except (ValueError, OSError) as error:
            issues.append('invalid fatal marker: ' + repr(error))
    subject = read(RECEIPT)['subjects'][entry['variant']]
    expected = {'attempt': args.attempt, 'variant': entry['variant'], 'project': entry['suite'],
                'output': str(directory), 'sourceManifest': subject['manifest'],
                'sourceManifestSHA256': identity['subjectManifestSHA256']}
    if isinstance(payload, dict):
        if type(payload.get('schemaVersion')) is not int or payload.get('schemaVersion') != 1 or payload.get('kind') != 'benchmark-guard-fatal':
            issues.append('unknown fatal marker schema/kind')
        if not isinstance(payload.get('reason'), str) or not payload['reason']:
            issues.append('fatal reason missing')
        command = payload.get('command')
        if command != expected:
            issues.append('fatal command/source binding mismatch')
        observed = payload.get('observed', {})
        if not isinstance(observed, dict):
            issues.append('fatal observed identity missing')
        else:
            for key, value in {'project': entry['suite'], 'root': str(Path(subject['root']).resolve()),
                               'dependencyRoot': str(Path(subject['dependencyRoot']).resolve()),
                               'requestedCache': entry['cacheBoundary']['requested']}.items():
                if observed.get(key) != value:
                    issues.append('fatal observed ' + key + ' mismatch')
            if type(observed.get('pid')) is not int or observed['pid'] <= 0 or not isinstance(observed.get('instanceId'), str) or not observed['instanceId']:
                issues.append('fatal process/plugin identity missing')
    else:
        issues.append('fatal marker payload is not an object')
    entry['guardFatalObserved'] = {'atUTC': now(), 'path': str(marker), 'sha256': marker_sha,
                                   'expectedCommand': expected, 'bindingIssues': issues, 'payload': payload}
    write(directory / 'fatal-observed.json', entry['guardFatalObserved'])
    write(state_path, state)
    reason = payload.get('reason') if isinstance(payload, dict) else 'unreadable fatal marker'
    raise AssertionError('Fatal benchmark guard: ' + str(reason) + ('; ' + '; '.join(issues) if issues else ''))

def assert_cache_ancestry(cache, root):
    assert root == root.resolve(strict=True), 'subject root symlink rejected'
    assert cache.is_relative_to(root), 'requested cache outside own subject'
    current = root
    for part in cache.relative_to(root).parts:
        current = current / part
        assert not current.is_symlink(), 'requested cache ancestor symlink rejected'

def cache_snapshot(cache):
    assert not cache.is_symlink(), 'owned cache root symlink rejected'
    cache = cache.resolve(strict=True)
    files = {}
    for directory, dirs, names in os.walk(cache, followlinks=False):
        for name in dirs + names:
            path = Path(directory) / name
            assert not path.is_symlink(), 'owned cache contains a symlink'
            assert path.resolve().is_relative_to(cache), 'owned cache realpath escape'
        for name in names:
            path = Path(directory) / name
            assert path.is_file(), 'owned cache contains a nonregular artifact'
            files[path.relative_to(cache).as_posix()] = sha(path)
    return files

def retain_native_metadata(cache, directory, phase):
    captured = {}
    for source in (cache / 'native').rglob('_metadata.json'):
        assert source.is_file() and not source.is_symlink()
        relative = source.relative_to(cache)
        target = directory / 'native-cache-metadata' / phase / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as output:
            output.write(source.read_bytes())
        captured[relative.as_posix()] = sha(target)
    write(directory / ('native-metadata-' + phase + '.json'), captured)

def validate_warm_binding(entry, identity, before_cache, cold, cold_after, cold_identity):
    assert cold['accepted'] is True and cold['cache'] == 'cold'
    assert cold['variant'] == entry['variant'] and cold['suite'] == entry['suite']
    assert cold['attempt'] == entry['attempt'] and cold['repeat'] == entry['repeat']
    assert cold['cacheRoot'] == entry['cacheBoundary']['requested']
    assert cold['supervisorSHA256'] == sha(Path(__file__)), 'warm supervisor changed'
    assert identity == {**cold_identity, 'checkedAtUTC': identity['checkedAtUTC']}, 'warm source/runtime identity changed'
    assert before_cache == cold_after, 'warm cache missing/foreign/changed since accepted cold'
    assert cold['cacheAfterDigest'] == hashlib.sha256(json.dumps(cold_after, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def validate_unit_source_proof(directory, entry, expectation, raw_cases, inventory, provenance, events):
    root = Path(entry['cwd'])
    manifest_path = root / '.probe-source-manifest.json'
    manifest = read(manifest_path)
    selected = sorted({file for file, _ in expectation})
    expected_files = {str(root / file) for file in selected}
    assert inventory['expectedFiles'] == inventory['collectedFiles'] == inventory['completedFiles'] == len(selected)
    assert provenance['source']['subjectRoot'] == str(root)
    assert provenance['source']['manifest']['sha256'] == sha(manifest_path)
    assert sorted(x['path'] for x in provenance['invocation']['inputs']) == selected
    assert all(x['sha256'] == manifest['files'][x['path']] for x in provenance['invocation']['inputs'])
    assert {c['file'] for c in raw_cases} == expected_files, 'selected module/executed case identity differs'
    native = [e for e in events if e.get('phase') == 'native-cache-config' and e.get('project') == 'unit']
    assert native, 'actual final native cache configuration absent'
    native_enabled = entry['variant'] == 'candidate'
    cache = Path(entry['cacheBoundary']['requested'])
    digests = {e['contractDigest'] for e in native}
    assert len(digests) == 1 and re.fullmatch('[a-f0-9]{64}', next(iter(digests)))
    source_items = sorted(manifest['files'].items(), key=lambda row: row[0].encode('utf-16-be'))
    source_digest = hashlib.sha256(json.dumps(source_items, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    for config in native:
        contract = config['contract']
        assert contract['schema'] == 'oriso-supported-native-cache-source-v1'
        assert contract['sourceContractDigest'] == source_digest
        assert contract['guardSHA256'] == manifest['files']['benchmark-harness.ts']
        assert contract['lockSHA256'] == manifest['files']['package-lock.json']
        assert contract['variant'] == entry['variant'] and contract['project'] == 'unit' and contract['node'] == 'v22.23.3'
        assert contract['rootEnabled'] is native_enabled and contract['projectEnabled'] is native_enabled
        assert hashlib.sha256(json.dumps(contract, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest() == config['contractDigest']
        assert config['root'] == str(root) and config['projectName'] == 'unit'
        assert config['sourceManifestSHA256'] == sha(manifest_path)
        assert config['global']['enabled'] is native_enabled and config['actual']['enabled'] is native_enabled
        assert config['global']['path'] == str(cache / 'native/root')
        assert config['actual']['path'] == str(cache / 'native/unit')
        assert config['contract']['vitest'] == ('5.0.5' if native_enabled else '4.1.9')
    loads = {e.get('real') for e in events if e.get('phase') == 'load' and e.get('project') == 'unit'}
    witnesses = []
    if entry['cache'] != 'warm' or not native_enabled:
        assert expected_files <= loads, 'selected COLD/cache-disabled project files lack actual load-guard evidence'
    if native_enabled:
        for file in selected:
            matches = [e for e in events if e.get('phase') == 'cache-source' and e.get('project') == 'unit' and e.get('real') == str(root / file)]
            assert matches, 'selected native source-byte witness missing'
            for witness in matches:
                assert witness['sourceSHA256'] == witness['expectedSHA256'] == manifest['files'][file]
                assert witness['relative'] == file and witness['sourceManifestSHA256'] == sha(manifest_path)
                assert witness['contractDigest'] in digests and witness['id'].split('?', 1)[0] == str(root / file)
                assert witness['run'] == {'attempt': entry['attempt'], 'variant': entry['variant'],
                    'output': str(directory), 'project': 'unit', 'pid': entry['pid']}
            witnesses.append({'file': file, 'sourceSHA256': manifest['files'][file], 'callbackCount': len(matches)})
        after_cache = read(directory / 'cache-after.json')
        assert 'native/root/_metadata.json' in after_cache, 'owned root native cache metadata absent'
        assert any(file.startswith('native/unit/') and Path(file).name not in ['_metadata.json', 'CACHEDIR.TAG'] for file in after_cache), 'owned native unit cache not populated'
    if entry['cache'] == 'warm':
        binding = entry['warmFrom']
        cold_path = Path(binding['acceptance'])
        assert cold_path.is_relative_to(B / 'results' / entry['stage'] / entry['attempt'])
        assert sha(cold_path) == binding['acceptanceSHA256']
        cold = read(cold_path)
        assert cold['sourceProof']['contractDigest'] == next(iter(digests)), 'warm guard/source contract changed'
        assert cold['sourceProof']['selectedFiles'] == selected
        assert cold['sourceProof']['nativeEnabled'] is native_enabled
        validate_warm_binding(entry, read(directory / 'identity-before.json'), read(directory / 'cache-before.json'),
                              cold, read(cold_path.parent / 'cache-after.json'), read(cold_path.parent / 'identity-after.json'))
    return {'kind': 'supported-source-bytes-plus-native-collection-execution-and-owned-cache-continuity',
            'contractDigest': next(iter(digests)), 'selectedFiles': selected, 'nativeEnabled': native_enabled,
            'actualSelectedLoads': sorted(expected_files & loads), 'sourceWitnesses': witnesses,
            'individualCacheArtifactConsumedClaim': False}

def inspect_result(directory, suite):
    result = read(directory / 'results.json')
    expectation = read(B / 'expected-inventory.json')[suite]
    count = 52 if suite == 'unit' else 10
    assert result['success'] is True and result['numTotalTests'] == count
    assert result['numPassedTests'] == count
    assert all(result.get(k, 0) == 0 for k in ['numFailedTests', 'numPendingTests', 'numTodoTests']), 'nonpositive case'
    cases = [(Path(t['name']).as_posix().split('/subjects/')[-1].split('/', 1)[-1], a['fullName'])
             for t in result['testResults'] for a in t['assertionResults']]
    assert sorted(cases) == sorted(map(tuple, expectation)), 'sample identity mismatch'
    inventories = list((directory / 'verification').glob('*/inventory.json'))
    assert len(inventories) == 1, 'exactly one durable reporter inventory required'
    inventory = read(inventories[0])
    assert inventory['inventoryComplete'] and inventory['expectedTests'] == count
    assert inventory['passed'] == count and inventory['executed'] == count
    assert all(inventory.get(k, 0) == 0 for k in ['failed', 'skipped', 'todo', 'retries'])
    assert not inventory.get('unhandledErrors') and not inventory.get('unfinished') and not inventory.get('running')
    assert not inventory.get('eventAnomalies'), 'reporter event anomaly requires examination'
    resolution = [[json.loads(line) for line in p.read_text().splitlines()] for p in directory.glob('resolution-*.jsonl')]
    assert resolution and any(e.get('phase') == 'effective-config' and e.get('project') == suite for events in resolution for e in events)
    assert not [e for events in resolution for e in events if e.get('accepted') is False]
    observed_loads = {e.get('real') for events in resolution for e in events if e.get('phase') == 'load' and e.get('project') == suite}
    # Bind observed loads to the actual source root carried by the reporter.
    reported_root = next(e['root'] for events in resolution for e in events if e.get('phase') == 'effective-config' and e.get('project') == suite)
    expected_files = {str(Path(reported_root) / f) for f, _ in expectation}
    if suite != 'unit':
        assert expected_files <= observed_loads, 'selected project files lack actual load-guard evidence'
    raw_cases = [json.loads(line) for p in (directory / 'verification').glob('*/cases.jsonl') for line in p.read_text().splitlines()]
    assert len(raw_cases) == count and all(c['state'] == 'passed' and c.get('retries', 0) == 0 for c in raw_cases)
    source_proof = None
    if suite == 'unit':
        source_proof = validate_unit_source_proof(directory, read(directory / 'process.json'), expectation, raw_cases,
            inventory, read(inventories[0].parent / 'provenance.json'), [e for events in resolution for e in events])
    raw_audits = []
    if suite == 'storybook':
        selections = [read(p) for p in directory.glob('selection-*.json')]
        assert selections and all(len(s['kept']) == 10 and len(s['excluded']) == 2 for s in selections)
        observed_ids = []
        for case in raw_cases:
            evidence = case.get('a11y', {})
            reports = evidence.get('reports', [])
            assert len(reports) == 1, 'each case needs one actual audit, no assertion companion'
            report = reports[0]
            audit = report.get('result', {})
            assert report.get('type') == 'a11y' and audit.get('testEngine') == {'name': 'axe-core', 'version': '4.12.1'}
            assert not audit.get('violations') and audit.get('testEnvironment', {}).get('windowWidth') == 1200
            assert audit['testEnvironment']['windowHeight'] == 900
            # Gate's canonical metadata string is deliberately retained, not parsed as JSON (undefined values are explicit).
            environment = evidence.get('environment', '')
            assert '"locale":"de-DE"' in environment and '"timezone":"Europe/Berlin"' in environment and '"viewport":[1200,900,1]' in environment
            assert case.get('browser', {}).get('version') == read(RECEIPT)['expectedBrowserExecutable']['version'], 'browser identity changed'
            observed_ids.append(evidence['storyId'])
            raw_audits.append(audit)
        assert sorted(observed_ids) == sorted(read(B / 'expected-inventory.json')['storyIds'])
        assert observed_ids == read(B / 'expected-inventory.json')['storyIds'], 'actual story execution order differs'
    return {'expected': count, 'executed': count, 'passed': count, 'failed': 0, 'skipped': 0, 'todo': 0,
            'retried': 0, 'unhandled': 0, 'rawSuccessfulAudits': len(raw_audits), 'cases': sorted(cases),
            'sourceProof': source_proof, 'actualCaseOrder': [(Path(c['file']).as_posix().split('/subjects/')[-1].split('/', 1)[-1], c['name']) for c in raw_cases]}

def monitor_owned_process(args, process, entry, state, directory, identity, started, state_path=None):
    """Shared by real samples and native guard controls; observation cadence unchanged."""
    state_path = state_path or B / 'run-state.json'
    failure = None
    try:
        drain_started = None
        next_observation = 0
        while True:
            # wait(timeout) wakes immediately at runner exit; observation frequency
            # must not round every short sample duration up to two seconds.
            try:
                process.wait(timeout=.1)
            except subprocess.TimeoutExpired:
                pass
            rows = None
            if time.monotonic() >= next_observation or process.poll() is not None:
                rows = process_group(process.pid)
                for row in rows:
                    try:
                        executable = Path(shlex.split(row['command'])[0])
                        if executable.is_absolute() and executable.is_file() and str(executable) not in entry['executables']:
                            entry['executables'][str(executable)] = {'observedPid': row['pid']}
                    except (ValueError, IndexError):
                        pass
                entry['observations'].append({'atUTC': now(), 'processes': rows})
                entry['lastObservedAtUTC'] = now()
                write(state_path, state)
                next_observation = time.monotonic() + 2
                fail_on_guard_marker(args, entry, directory, identity, state, state_path)
            if process.poll() is not None:
                if not rows:
                    break
                drain_started = drain_started or time.monotonic()
                assert time.monotonic() - drain_started < 30, 'owned child/browser group did not terminate'
            lease_check(args)
            assert time.monotonic() - started < args.timeout, 'per-command timeout'
            if process.poll() is not None:
                time.sleep(.1)
        fail_on_guard_marker(args, entry, directory, identity, state, state_path)
    except BaseException as error:
        failure = repr(error)
        # Only this supervisor-created, measured process group can be terminated.
        if process_group(process.pid):
            terminate_owned(process.pid, signal.SIGTERM)
            deadline = time.monotonic() + 15
            while process_group(process.pid) and time.monotonic() < deadline:
                time.sleep(.5)
            if process_group(process.pid):
                terminate_owned(process.pid, signal.SIGKILL)
        process.wait(timeout=15)
    return failure

def run_one(args, variant, suite, repeat, cache_kind, state):
    lease_check(args)
    identity = guard(variant)
    root = B / 'subjects' / variant
    label = f'{suite}-{variant}-{repeat}-{cache_kind}'
    directory = B / 'results' / args.stage / args.attempt / label
    directory.mkdir(parents=True, exist_ok=False)
    write(directory / 'identity-before.json', identity)
    cache = root / '.preflight-cache' / f'{args.stage}-{args.attempt}-{suite}-{repeat}'
    assert_cache_ancestry(cache, root)
    if cache_kind in ['cold', 'untimed']:
        assert not cache.exists(), 'cold cache must be new; no deletion/retry'
        cache.mkdir(parents=True)
    else:
        assert cache.is_dir(), 'warm requires immediately prior own cold cache'
    before_cache = cache_snapshot(cache)
    write(directory / 'cache-before.json', before_cache)
    retain_native_metadata(cache, directory, 'before')
    expected = read(B / 'expected-inventory.json')
    files = sorted({f for f, _ in expected[suite]})
    argv = [str(NODE), 'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--project', suite,
            *files, '--maxWorkers=1', '--no-file-parallelism', '--retry=0', '--reporter=dot',
            '--reporter=./scripts/verification-reporter.mjs', '--reporter=json', '--outputFile=' + str(directory / 'results.json')]
    env = os.environ.copy()
    for key in ['VERIFICATION_SOURCE_SHA', 'ORISO_A11Y_CONTROL_PHASE', 'ORISO_A11Y_BASELINE_JSON',
                'BUNDLE_MAIN_GZIP_LIMIT_KB', 'BUNDLE_MIN_LAZY_CHUNKS', 'npm_config_ignore_scripts', 'NPM_CONFIG_IGNORE_SCRIPTS']:
        env.pop(key, None)
    env.update({'PATH': str(NODE.parent) + ':' + env.get('PATH', ''), 'CI': 'true', 'TZ': 'Europe/Berlin',
                'NODE_OPTIONS': '--max-old-space-size=6144', 'ORISO_VERIFICATION_CONTROLS': 'false',
                'BENCHMARK_VARIANT': variant, 'BENCHMARK_PROJECT': suite, 'BENCHMARK_OUTPUT': str(directory), 'BENCHMARK_CACHE': str(cache),
                'BENCHMARK_ATTEMPT': args.attempt, 'CACHE_DIR': str(cache),
                'VERIFICATION_ARTIFACTS_DIR': str(directory / 'verification'),
                'PREFLIGHT_SUBJECT_MANIFEST': str(root / '.probe-source-manifest.json'),
                'PREFLIGHT_SUBJECT_MANIFEST_SHA256': identity['subjectManifestSHA256']})
    entry = {'label': label, 'stage': args.stage, 'attempt': args.attempt, 'variant': variant, 'suite': suite, 'repeat': repeat, 'cache': cache_kind,
             'argv': argv, 'cwd': str(root), 'startedAtUTC': now(), 'timeoutSeconds': args.timeout,
             'cacheBoundary': {'requested': str(cache), 'CACHE_DIR': str(cache), 'attempt': args.attempt},
             'artifactDirectory': str(directory), 'state': 'starting', 'observations': [], 'executables': {}}
    if cache_kind == 'warm':
        assert state['runs'], 'warm has no immediately prior accepted cold'
        prior = state['runs'][-1]
        assert (prior['variant'], prior['suite'], prior['repeat'], prior['cache'], prior['state']) == (variant, suite, repeat, 'cold', 'passed')
        cold_path = Path(prior['artifactDirectory']) / 'cache-source-acceptance.json'
        assert sha(cold_path) == prior['cacheAcceptanceSHA256']
        cold = read(cold_path)
        validate_warm_binding(entry, identity, before_cache, cold, read(cold_path.parent / 'cache-after.json'),
                              read(cold_path.parent / 'identity-after.json'))
        entry['warmFrom'] = {'acceptance': str(cold_path), 'acceptanceSHA256': sha(cold_path)}
    state['runs'].append(entry)
    state['active'] = entry
    write(B / 'run-state.json', state)
    failure = None
    with (directory / 'run.log').open('w') as output:
        started = time.monotonic()
        process = subprocess.Popen(argv, cwd=root, env=env, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
        entry.update({'pid': process.pid, 'pgid': process.pid, 'state': 'running'})
        write(B / 'run-state.json', state)
        failure = monitor_owned_process(args, process, entry, state, directory, identity, started)
        entry.update({'wallSeconds': time.monotonic() - started, 'finishedAtUTC': now(), 'exitCode': process.wait(),
                      'remainingOwnedProcesses': process_group(process.pid)})
    # Hash observed executables only after the timing window; avoid hashing a
    # browser binary concurrently with the sampled runner.
    for executable, metadata in entry['executables'].items():
        if Path(executable).is_file():
            metadata['sha256'] = sha(Path(executable))
    write(directory / 'process.json', entry)
    after = guard(variant)
    write(directory / 'identity-after.json', after)
    assert after == {**identity, 'checkedAtUTC': after['checkedAtUTC']}, 'source/runtime package identity changed during run'
    assert_cache_ancestry(cache, root)
    write(directory / 'cache-after.json', cache_snapshot(cache))
    retain_native_metadata(cache, directory, 'after')
    assert not failure, failure
    fail_on_guard_marker(args, entry, directory, identity, state, B / 'run-state.json')
    assert entry['exitCode'] == 0 and not entry['remainingOwnedProcesses'], 'runner failed or children remain'
    if suite == 'storybook':
        expected_browser = read(RECEIPT)['expectedBrowserExecutable']
        assert entry['executables'].get(expected_browser['path'], {}).get('sha256') == expected_browser['sha256'], 'actual browser process executable was not observed/matched'
    entry['inventory'] = inspect_result(directory, suite)
    if args.stage == 'timed':
        gate = read(B / f'gate-receipt-{args.gate_attempt}.json')
        prior = next(x['inventory']['actualCaseOrder'] for x in gate['runs'] if x['variant'] == variant and x['suite'] == suite)
        assert json.dumps(entry['inventory']['actualCaseOrder']) == json.dumps(prior), 'timed execution order differs from equality gate'
    if cache_kind == 'cold':
        after_cache = read(directory / 'cache-after.json')
        acceptance = {'accepted': True, 'attempt': args.attempt, 'variant': variant, 'suite': suite, 'repeat': repeat,
            'cache': 'cold', 'cacheRoot': str(cache), 'supervisorSHA256': sha(Path(__file__)),
            'sourceProof': entry['inventory']['sourceProof'],
            'cacheAfterDigest': hashlib.sha256(json.dumps(after_cache, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
        write(directory / 'cache-source-acceptance.json', acceptance)
        entry['cacheAcceptanceSHA256'] = sha(directory / 'cache-source-acceptance.json')
    entry['state'] = 'passed'
    state['active'] = None
    write(B / 'run-state.json', state)
    return entry

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['gate', 'timed', 'unit-proof'])
    parser.add_argument('--lease', required=True)
    parser.add_argument('--attempt', required=True, help='fresh attempt identity, also required in renewed lease')
    parser.add_argument('--timeout', type=int, default=600, help='per command safety ceiling, not a runtime estimate')
    parser.add_argument('--gate-attempt', help='timed only: explicit distinct accepted equality attempt')
    args = parser.parse_args()
    assert re.fullmatch(r'[A-Za-z0-9_-]{1,32}', args.attempt), 'invalid attempt identity'
    assert 30 <= args.timeout <= 1200
    assert bool(args.gate_attempt) == (args.stage == 'timed'), 'explicit gate binding required only for timing'
    if args.gate_attempt:
        assert re.fullmatch(r'[A-Za-z0-9_-]{1,32}', args.gate_attempt) and args.gate_attempt != args.attempt
    lease = lease_check(args)
    lock = B / 'execution.lock'
    descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(descriptor, json.dumps({'supervisorPid': os.getpid(), 'leaseId': lease['leaseId'], 'createdAtUTC': now()}).encode())
    os.close(descriptor)
    state = {'stage': args.stage, 'terminal': False, 'owner': 'root-explicit-benchmark-lease',
             'attempt': args.attempt, 'leaseId': lease['leaseId'], 'supervisorPid': os.getpid(), 'runs': [], 'active': None}
    try:
        identities = {v: guard(v) for v in ['original', 'candidate']}
        if args.stage == 'timed':
            gate = read(B / f'gate-receipt-{args.gate_attempt}.json')
            assert gate['passed'] and gate['materializationReceiptSHA256'] == sha(RECEIPT)
            assert gate['supervisorSHA256'] == sha(Path(__file__)), 'supervisor changed after gate'
            assert gate['identities'] == {v: {k: x for k, x in identity.items() if k != 'checkedAtUTC'} for v, identity in identities.items()}, 'runtime changed after gate'
        write(B / 'run-state.json', state)
        if args.stage == 'unit-proof':
            for variant in ['original', 'candidate']:
                for temperature in ['cold', 'warm']:
                    run_one(args, variant, 'unit', 1, temperature, state)
            assert len(state['runs']) == 4
            orders = [row['inventory']['actualCaseOrder'] for row in state['runs']]
            assert all(order == orders[0] for order in orders), 'bounded proof case/order equality differs'
            write(B / f'unit-proof-receipt-{args.attempt}.json', {'passed': True, 'attempt': args.attempt,
                'scope': 'four unit cold/warm tooling proof commands, not timing/CI acceptance', 'runs': state['runs'],
                'materializationReceiptSHA256': sha(RECEIPT), 'supervisorSHA256': sha(Path(__file__)),
                'noMediansOrSpeedClaim': True, 'allFiveDeliveriesRemainOpen': True})
        elif args.stage == 'gate':
            for variant in ['original', 'candidate']:
                for suite in ['unit', 'storybook']:
                    run_one(args, variant, suite, 0, 'untimed', state)
            for suite in ['unit', 'storybook']:
                rows = [x['inventory']['cases'] for x in state['runs'] if x['suite'] == suite]
                assert rows[0] == rows[1], 'cross-toolchain case equality failed'
                orders = [x['inventory']['actualCaseOrder'] for x in state['runs'] if x['suite'] == suite]
                assert orders[0] == orders[1], 'actual cross-toolchain execution order differs'
            write(B / f'gate-receipt-{args.attempt}.json', {'passed': True, 'attempt': args.attempt, 'atUTC': now(), 'materializationReceiptSHA256': sha(RECEIPT),
                  'supervisorSHA256': sha(Path(__file__)),
                  'identities': {v: {k: x for k, x in identity.items() if k != 'checkedAtUTC'} for v, identity in identities.items()},
                  'runs': state['runs']})
        else:
            for slot in read(B / 'schedule.json'):
                run_one(args, slot['variant'], slot['suite'], slot['repeat'], slot['cache'], state)
            medians = {}
            for suite in ['unit', 'storybook']:
                for variant in ['original', 'candidate']:
                    for cache in ['cold', 'warm']:
                        values = [x['wallSeconds'] for x in state['runs'] if x['suite'] == suite and x['variant'] == variant and x['cache'] == cache]
                        assert len(values) == 3
                        medians[f'{suite}-{variant}-{cache}'] = statistics.median(values)
            write(B / f'timing-summary-{args.attempt}.json', {'scope': 'matched52unit/10healthyM3sample; direct Vitest entry including equal strict harness/provenance guards',
                  'notFullSuitePerformance': True, 'gateAttempt': args.gate_attempt,
                  'gateReceiptSHA256': sha(B / f'gate-receipt-{args.gate_attempt}.json'),
                  'mediansSeconds': medians, 'runs': state['runs']})
        state.update({'terminal': True, 'state': 'passed', 'finishedAtUTC': now()})
    except BaseException as error:
        if state.get('active'):
            state['active'].update({'state': 'failed-no-retry', 'failure': repr(error)})
            state['active'] = None
        state.update({'terminal': True, 'state': 'failed-no-retry', 'failure': repr(error), 'finishedAtUTC': now()})
        raise
    finally:
        write(B / 'run-state.json', state)
        lock.unlink()

if __name__ == '__main__':
    main()
