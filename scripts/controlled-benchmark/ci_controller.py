#!/usr/bin/env python3
"""Single-job CI sequence. Setup/control/equality failure prevents all later phases."""
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
import uuid

sys.dont_write_bytecode = True
from assemble import reconstruct

HERE = Path(__file__).resolve().parent
PROFILE = 'admin1611-314228e-cache5'
REPOSITORY = 'OpenResilienceInitiative/ORISO-Admin'
POSITIVE = ['http-root', 'http-source', 'http-public', 'http-own-package', 'virtual-module']
NEGATIVE = ['module-root', 'module-outside', 'http-fs-outside', 'http-fs-encoded-outside',
            'http-fs-root', 'http-absolute-outside', 'http-symlink-outside', 'module-cross-dependency',
            'virtual-outside', 'config-root-isolation', 'cache-isolation', 'cache-env-isolation',
            'duplicate-guard', 'foreign-marker']
CACHE_NEGATIVE = ['native-cache-root-escape', 'native-cache-project-symlink', 'native-cache-path-missing']
RECEIPT_NEGATIVE = ['missing-selected-source-witness', 'foreign-command-source-witness',
                    'changed-source-witness-bytes', 'cold-resolve-and-source-callback-without-actual-load',
                    'wrong-cold-to-warm-source-identity', 'wrong-cold-to-warm-cache-snapshot',
                    'missing-accepted-cold-provenance']
PHASE_ORDER = ['controls', 'cache-controls', 'unit-proof', 'receipt-controls', 'gate', 'timed']
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads(p.read_text())
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)

def load_supervisor(path):
    spec = importlib.util.spec_from_file_location('ci_benchmark_supervisor', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def verify_packet():
    packet = HERE / 'input-lock.json'
    assert sha(packet) == os.environ['BENCHMARK_INPUT_SHA256'], 'reviewed packet identity changed'
    declaration = read(packet)
    actual = sorted(str(p.relative_to(HERE)) for p in HERE.rglob('*') if p.is_file())
    assert actual == sorted([*declaration['files'], 'input-lock.json']), 'unexpected/missing portable input'
    assert not [p for p in HERE.rglob('*') if p.is_symlink()]
    assert all(sha(HERE / name) == digest for name, digest in declaration['files'].items())
    assert declaration['profile'] == PROFILE and declaration['phaseOrder'] == PHASE_ORDER
    assert [row['phase'] for row in declaration['phaseCommandTemplates']] == PHASE_ORDER
    assert hashlib.sha256(json.dumps(declaration['phaseCommandTemplates'], sort_keys=True,
        separators=(',', ':')).encode()).hexdigest() == declaration['phaseCommandTemplatesSHA256']
    return declaration

def command(argv, cwd, log, timeout, supervisor, state, observe_initial=True):
    """No outer measurement polling: child supervisor owns its existing observation cadence."""
    entry = {'argv': [str(x) for x in argv], 'cwd': str(cwd), 'startedAtUTC': now(),
             'timeoutSeconds': timeout, 'log': str(log)}
    state['commands'].append(entry)
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open('x') as output:
        process = subprocess.Popen(entry['argv'], cwd=cwd, stdout=output, stderr=subprocess.STDOUT,
                                   start_new_session=True)
        entry.update({'pid': process.pid, 'pgid': process.pid,
                      'initialOwnedProcesses': supervisor.process_group(process.pid) if observe_initial else [],
                      'noOuterObservationInsideChildSequence': not observe_initial})
        try:
            entry['exitCode'] = process.wait(timeout=timeout)
            assert entry['exitCode'] == 0, 'command failed: ' + str(log)
            assert not supervisor.process_group(process.pid), 'command left owned children'
        finally:
            if supervisor.process_group(process.pid):
                supervisor.terminate_owned(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    pass
                deadline = time.monotonic() + 15
                while supervisor.process_group(process.pid) and time.monotonic() < deadline:
                    time.sleep(.5)
                if supervisor.process_group(process.pid):
                    supervisor.terminate_owned(process.pid, signal.SIGKILL)
            process.wait(timeout=15)
            entry.update({'finishedAtUTC': now(), 'exitCode': process.returncode,
                          'remainingOwnedProcesses': supervisor.process_group(process.pid)})
            write(log.with_suffix('.process.json'), entry)
    assert not entry['remainingOwnedProcesses']
    return entry

def verify_terminal_processes(entries):
    # Phase boundary only; no extra observer inside any measurement window.
    snapshot = subprocess.check_output(['ps', '-axo', 'pid=,lstart='], text=True)
    alive = {}
    for row in snapshot.splitlines():
        fields = row.split(None, 1)
        if len(fields) == 2:
            alive[int(fields[0])] = ' '.join(fields[1].split())
    seen = {}
    for entry in entries:
        assert entry.get('remainingOwnedProcesses') == [], 'missing terminal owned-process receipt'
        for observation in entry.get('observations', []):
            for process in observation['processes']:
                seen[process['pid']] = process['birth']
        for process in entry.get('initialOwnedProcesses', []):
            seen[process['pid']] = process['birth']
    live = [pid for pid, birth in seen.items() if alive.get(pid) == birth]
    assert not live, ('owned process still alive', live)
    return {'observedOwnedPidCount': len(seen), 'liveOwnedPidsWithSameBirth': live,
            'verifiedAtUTC': now(), 'pidReuseComparedByBirth': True}

def rebind(benchmark, node, browser, browser_version, workflow_commit):
    source = read(HERE / 'inputs/source-map.json')
    spec = read(HERE / 'inputs/git-source-spec.json')
    task = benchmark.parents[2]
    receipt = {'freeze': str(benchmark / 'canonical-source-manifest.json'),
               'freezeSHA256': sha(benchmark / 'canonical-source-manifest.json'),
               'canonicalFiles': 2255, 'canonicalSourceDigest': source['sourceDigest'],
               'toolchains': read(HERE / 'inputs/toolchains.json'), 'subjects': {},
               'crossSubjectByteDifferences': ['package-lock.json', 'package.json'],
               'expectedBrowserExecutable': {'path': str(browser), 'sha256': sha(browser), 'version': browser_version,
                                             'origin': 'one shared pinned Playwright install in this CI job'},
               'ci': {'workflowToolsCommit': workflow_commit, 'commonSourceCommit': spec['candidateCommit'],
                      'originalToolchainCommit': spec['originalToolchainCommit'],
                      'historicalAcceptedFreezeSHA256': source['historicalAcceptedFreezeSHA256'],
                      'historicalMacRunsRelabelled': False, 'freshLinuxHostSeals': True,
                      'sourceBytesChangedFromHistoricalSubjects': True,
                      'sharedInstrumentationDelta': read(HERE / 'input-lock.json')['sharedInstrumentationDelta'],
                      'commonProductSourceBytesChangedFromHistoricalFreeze': False,
                      'nodePath': str(node), 'nodeSHA256': sha(node),
                      'cache5LocalProofIsOriginOnly': read(HERE / 'input-lock.json')['localProofIsOriginOnly'],
                      'requiredFreshPhaseOrder': PHASE_ORDER}}
    for variant in ['original', 'candidate']:
        root = benchmark / 'subjects' / variant
        dependency = task / ('admin-baseline' if variant == 'original' else 'admin') / 'node_modules'
        assert dependency.is_dir() and not dependency.is_symlink()
        (root / 'node_modules').symlink_to(dependency, target_is_directory=True)
        expected = read(HERE / 'inputs' / (variant + '-expected.json'))
        assert all(sha(root / name) == digest for name, digest in expected['files'].items())
        manifest = {'subjectRoot': str(root), 'sharedDependencyRoot': str(dependency),
                    'origin': {'kind': 'git-reconstructed-matched-source-with-reviewed-toolchain-adapters',
                               'baseRevision': spec['candidateCommit'], 'commonSourceCommit': spec['candidateCommit'],
                               'originalToolchainRevision': spec['originalToolchainCommit'],
                               'sourceManifestSHA256': sha(benchmark / 'canonical-source-manifest.json'),
                               'toolchainVariant': variant, 'sourceFiles': 2255, 'sourceDigest': source['sourceDigest'],
                               'historicalAcceptedFreezeSHA256': source['historicalAcceptedFreezeSHA256'],
                               'historicalMacManifestSHA256': expected['historicalMacManifestSHA256'],
                               'CIManifestIsNewHostBinding': True},
                    'exclusions': ['node_modules', '.preflight-cache', '.probe-source-manifest.json'],
                    'files': expected['files']}
        path = root / '.probe-source-manifest.json'
        write(path, manifest)
        receipt['subjects'][variant] = {'root': str(root), 'manifest': str(path), 'manifestSHA256': sha(path),
                                        'dependencyRoot': str(dependency), 'dependenciesPresent': True, 'files': 2256}
    write(benchmark / 'materialization-receipt.json', receipt)
    return receipt

def issue_lease(benchmark, stage, attempt, hours):
    path = benchmark / ('ci-lease-' + stage + '-' + attempt + '.json')
    assert not path.exists(), 'never reuse a lease'
    lease = {'owner': 'root', 'issuer': 'root-authorized-conditional-CI-controller', 'exclusive': True,
             'purpose': 'admin-controlled-benchmark', 'leaseId': str(uuid.uuid4()), 'allow': [stage],
             'attempt': attempt, 'createdAtUTC': now(), 'expiresAtEpoch': time.time() + hours * 3600,
             'authorization': 'fresh phase only after exact prior actual outcomes/source/PID receipts pass'}
    write(path, lease)
    return path

def revoke(path, outcome):
    lease = read(path)
    lease.update({'allow': [], 'exclusive': False, 'expiresAtEpoch': 0,
                  'releasedAtUTC': now(), 'releaseOutcome': outcome})
    write(path, lease)

def verify_controls(benchmark, attempt, supervisor, cache_only=False):
    directory = benchmark / 'results' / ('cache-controls' if cache_only else 'controls') / attempt
    state, receipt = read(directory / 'controls-state.json'), read(directory / 'controls-receipt.json')
    assert state['terminal'] is True and state['active'] is None
    assert state['state'] == receipt['state'] == 'controls-passed-not-equality'
    assert receipt['materializationReceiptSHA256'] == sha(supervisor.RECEIPT)
    assert receipt['supervisorSHA256'] == sha(benchmark / 'run.py')
    assert receipt['childControlSHA256'] == sha(benchmark / 'guard-control-child.mjs')
    expected = [(v, case) for v in ['original', 'candidate'] for case in
                (CACHE_NEGATIVE + (['native-source-changed'] if v == 'candidate' else [])
                 if cache_only else POSITIVE + NEGATIVE)]
    rows = receipt['runs']
    assert len(rows) == (7 if cache_only else 38) and [(r['variant'], r['case']) for r in rows] == expected
    assert state['runs'] == rows
    assert state['cacheHookFixturesAreNotActualVitestResolution'] is cache_only
    for row in rows:
        assert row['state'] == 'control-expected-outcome-observed'
        output = directory / row['variant'] / row['case']
        process = read(output / 'process.json')
        assert process['exitCode'] == row['exitCode'] and process['remainingOwnedProcesses'] == []
        if row['case'] in POSITIVE:
            actual = read(output / 'control-result.json')
            assert row['exitCode'] == 0 and actual['status'] == 'native-positive-passed'
            assert actual['caseName'] == row['case'] and actual['noRejectedEvents'] and actual['noFatalMarker']
            assert not (output / 'fatal.json').exists()
        else:
            assert row['exitCode'] != 0 and row.get('guardFatalObserved')
            observed = read(output / 'fatal-observed.json')
            assert observed == row['guardFatalObserved'] and observed['sha256'] == sha(output / 'fatal.json')
            if row['case'] == 'foreign-marker':
                assert observed['bindingIssues'] and 'binding mismatch' in str(observed['bindingIssues'])
            else:
                assert observed['bindingIssues'] == []
            proof = read(output / 'first-fatal-proof.json')
            assert proof['caseName'] == row['case'] and proof['firstMarkerPreserved']
            assert proof['temporaryPublicationFilesRemaining'] == 0
    identities = {v: supervisor.guard(v) for v in ['original', 'candidate']}
    return {'expectedControls': len(expected), 'actualExpectedOutcomes': len(rows), 'identities': identities,
            'hookFixturesNotNativeResolutionRuns': cache_only,
            'receiptSHA256': sha(directory / 'controls-receipt.json'), 'processes': verify_terminal_processes(rows)}

def verify_receipt_controls(benchmark, attempt, proof_attempt, supervisor):
    directory = benchmark / 'results/cache-receipt-controls' / attempt
    receipt = read(directory / 'controls-receipt.json')
    assert receipt['terminal'] is True and receipt['state'] == 'seven-negative-controls-rejected'
    assert receipt['positiveActualReceiptValidations'] == 2
    assert receipt['noRunnerOrBrowserCommands'] and receipt['noSourceOrCacheMutations']
    assert receipt['notNativeExecutionOrTimingProof'] is True
    assert receipt['proofReceiptSHA256'] == sha(benchmark / ('unit-proof-receipt-' + proof_attempt + '.json'))
    assert [row['name'] for row in receipt['controls']] == RECEIPT_NEGATIVE
    assert sorted(p.name for p in directory.iterdir()) == sorted(
        ['controls-receipt.json'] + [name + '-fixture.json' for name in RECEIPT_NEGATIVE])
    for row in receipt['controls']:
        fixture = directory / (row['name'] + '-fixture.json')
        assert row['actualOutcome'] == 'rejected' and sha(fixture) == row['fixtureSHA256']
        assert isinstance(read(fixture), list)
    assert not (benchmark / 'execution.lock').exists()
    return {'positiveActualReceiptValidations': 2, 'actualRejectedFixtures': 7,
            'identities': {v: supervisor.guard(v) for v in ['original', 'candidate']},
            'receiptSHA256': sha(directory / 'controls-receipt.json'),
            'notAdditionalNativeCommandsOrTimingProof': True}

def verify_samples(benchmark, attempt, stage, supervisor, gate_attempt=None):
    state = read(benchmark / 'run-state.json')
    assert state['terminal'] is True and state['active'] is None and state['state'] == 'passed'
    assert state['stage'] == stage and state['attempt'] == attempt
    rows = state['runs']
    if stage in ['gate', 'unit-proof']:
        receipt_path = benchmark / (stage + '-receipt-' + attempt + '.json')
        receipt = read(receipt_path)
        assert receipt['passed'] and receipt['attempt'] == attempt and receipt['runs'] == rows
        assert receipt['materializationReceiptSHA256'] == sha(supervisor.RECEIPT)
        assert receipt['supervisorSHA256'] == sha(benchmark / 'run.py')
        expected = ([(v, 'unit', 1, cache) for v in ['original', 'candidate'] for cache in ['cold', 'warm']]
                    if stage == 'unit-proof' else
                    [(v, suite, 0, 'untimed') for v in ['original', 'candidate'] for suite in ['unit', 'storybook']])
        assert [(r['variant'], r['suite'], r['repeat'], r['cache']) for r in rows] == expected
        if stage == 'unit-proof':
            orders = [row['inventory']['actualCaseOrder'] for row in rows]
            assert all(order == orders[0] for order in orders)
    else:
        receipt_path = benchmark / ('timing-summary-' + attempt + '.json')
        receipt = read(receipt_path)
        assert receipt['notFullSuitePerformance'] is True and receipt['runs'] == rows
        assert len(rows) == 24
        assert [{k: r[k] for k in ['variant', 'suite', 'repeat', 'cache']} for r in rows] == read(benchmark / 'schedule.json')
        assert receipt['gateAttempt'] == gate_attempt
        assert receipt['gateReceiptSHA256'] == sha(benchmark / ('gate-receipt-' + gate_attempt + '.json'))
    for row in rows:
        assert row['state'] == 'passed' and row['exitCode'] == 0 and row['remainingOwnedProcesses'] == []
        directory = Path(row['artifactDirectory'])
        assert directory.is_relative_to(benchmark / 'results' / stage / attempt)
        actual = supervisor.inspect_result(directory, row['suite'])
        # The supervisor returns tuples; persisted JSON receipts carry arrays.
        assert json.loads(json.dumps(actual)) == row['inventory'] and actual['expected'] == (52 if row['suite'] == 'unit' else 10)
        assert actual['rawSuccessfulAudits'] == (0 if row['suite'] == 'unit' else 10)
        assert not (directory / 'fatal.json').exists()
        before, after = read(directory / 'identity-before.json'), read(directory / 'identity-after.json')
        assert after == {**before, 'checkedAtUTC': after['checkedAtUTC']}
    identities = {v: supervisor.guard(v) for v in ['original', 'candidate']}
    if stage != 'unit-proof':
        gate = read(benchmark / ('gate-receipt-' + (gate_attempt if stage == 'timed' else attempt) + '.json'))
        assert gate['identities'] == {v: {k: val for k, val in identity.items() if k != 'checkedAtUTC'}
                                      for v, identity in identities.items()}
    return {'actualSuccessfulCommands': len(rows), 'identities': identities,
            'rawAuditsRevalidated': sum(r['inventory']['rawSuccessfulAudits'] for r in rows),
            'receiptSHA256': sha(receipt_path), 'processes': verify_terminal_processes(rows)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repository', type=Path, required=True)
    parser.add_argument('--task', type=Path, required=True)
    parser.add_argument('--artifacts', type=Path, required=True)
    parser.add_argument('--profile', choices=[PROFILE], required=True)
    args = parser.parse_args()
    artifacts = args.artifacts.resolve()
    artifacts.mkdir(parents=True, exist_ok=True)
    marker = artifacts / 'pipeline-started.json'
    with marker.open('x') as stream:
        json.dump({'startedAtUTC': now(), 'profile': args.profile}, stream)
    state = {'state': 'preparing', 'terminal': False, 'commands': [], 'phases': {}, 'noRetries': True,
             'scope': 'matched52unit/10healthyM3sample; ordinary/full-suite speed remains unmeasured'}
    def interrupted(signum, frame):
        raise InterruptedError('CI controller interrupted by signal ' + str(signum))
    signal.signal(signal.SIGTERM, interrupted)
    benchmark, active_lease = None, None
    try:
        state['inputPacket'] = verify_packet()
        assert os.environ['GITHUB_REPOSITORY'] == REPOSITORY
        assert os.environ['GITHUB_EVENT_NAME'] in ['pull_request', 'workflow_dispatch']
        assert os.environ['GITHUB_RUN_ATTEMPT'] == '1', 'a failed job is not restarted; request a fresh reviewed run'
        assert os.environ['RUNNER_OS'] == 'Linux' and os.environ['RUNNER_ARCH'] == 'X64'
        release = dict(line.split('=', 1) for line in Path('/etc/os-release').read_text().splitlines() if '=' in line)
        assert release['ID'].strip('"') == 'ubuntu' and release['VERSION_ID'].strip('"') == '24.04'
        assert platform.machine() == 'x86_64'
        node = Path(shutil.which('node')).resolve()
        assert subprocess.check_output([str(node), '--version'], text=True).strip() == 'v22.23.3'
        os.environ['BENCHMARK_NODE_BINARY'] = str(node)
        workflow_commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.repository, text=True).strip()
        assert workflow_commit == os.environ['BENCHMARK_TOOLS_COMMIT'] and re.fullmatch('[a-f0-9]{40}', workflow_commit)
        assert os.environ.get('VERIFICATION_SOURCE_SHA') is None
        state['host'] = {'platform': platform.platform(), 'runnerImage': os.environ.get('ImageOS'),
                         'runnerImageVersion': os.environ.get('ImageVersion'), 'runnerName': os.environ.get('RUNNER_NAME'),
                         'cpuCount': os.cpu_count(), 'cpuAffinity': sorted(os.sched_getaffinity(0)),
                         'memory': Path('/proc/meminfo').read_text(), 'cpu': Path('/proc/cpuinfo').read_text(),
                         'runnerJob': os.environ['GITHUB_JOB'], 'workflowToolsCommit': workflow_commit,
                         'workflowRef': os.environ.get('GITHUB_WORKFLOW_REF'), 'workflowSHA': os.environ.get('GITHUB_WORKFLOW_SHA'),
                         'runId': os.environ['GITHUB_RUN_ID'], 'runAttempt': os.environ['GITHUB_RUN_ATTEMPT'],
                         'jobURL': 'https://github.com/' + REPOSITORY + '/actions/runs/' + os.environ['GITHUB_RUN_ID'],
                         'nodePath': str(node), 'nodeSHA256': sha(node),
                         'npmDownloadCache': {'freshJobLocalDirectory': True, 'sharedAcrossBothLockedInstalls': True,
                                              'reusedFromEarlierJob': False},
                         'transformCachesReusedFromOtherJob': False,
                         'coldScope': 'new own variant/suite/repetition transform cache; OS/files/browser binaries may be warm'}
        state['reconstruction'] = reconstruct(args.repository.resolve(), args.task.resolve())
        benchmark = args.task.resolve() / 'state/admin-foundation/controlled-benchmark'
        supervisor = load_supervisor(benchmark / 'run.py')
        npm = Path(shutil.which('npm')).resolve()
        state['npm'] = {'cliPath': str(npm), 'cliSHA256': sha(npm),
                        'version': read(npm.parent.parent / 'package.json')['version']}
        os.environ['npm_config_cache'] = str(args.task.resolve() / 'npm-download-cache')
        os.environ['PLAYWRIGHT_BROWSERS_PATH'] = str(args.task.resolve() / 'pinned-browsers')
        for variant, owner in [('original', 'admin-baseline'), ('candidate', 'admin')]:
            directory = args.task.resolve() / owner
            assert not (directory / 'node_modules').exists()
            before = {name: sha(directory / name) for name in ['package.json', 'package-lock.json', '.npmrc']}
            command([node, npm, 'ci', '--ignore-scripts'], directory, artifacts / ('install-' + variant + '.log'), 1800, supervisor, state)
            assert before == {name: sha(directory / name) for name in before}, 'install changed locked input/policy'
        candidate = args.task.resolve() / 'admin'
        for owner in ['admin-baseline', 'admin']:
            assert read(args.task.resolve() / owner / 'node_modules/playwright/package.json')['version'] == '1.62.1'
        command([node, candidate / 'node_modules/playwright/cli.js', 'install', '--with-deps', 'chromium'],
                candidate, artifacts / 'install-shared-browser.log', 1800, supervisor, state)
        browsers = [p for p in Path(os.environ['PLAYWRIGHT_BROWSERS_PATH']).rglob('chrome-headless-shell') if p.is_file()]
        assert len(browsers) == 1, 'exact shared headless executable required'
        declaration = read(candidate / 'node_modules/playwright-core/browsers.json')
        assert declaration == read(args.task.resolve() / 'admin-baseline/node_modules/playwright-core/browsers.json')
        browser_entry = next(row for row in declaration['browsers'] if row['name'] == 'chromium-headless-shell')
        assert browser_entry['revision'] == '1234' and browser_entry['browserVersion'] == '151.0.7922.34'
        state['browserDeclaration'] = browser_entry
        rebind(benchmark, node, browsers[0].resolve(), browser_entry['browserVersion'], workflow_commit)
        state['initialIdentities'] = {v: supervisor.guard(v) for v in ['original', 'candidate']}
        suffix = os.environ['GITHUB_RUN_ID'] + 'a' + os.environ['GITHUB_RUN_ATTEMPT']
        attempts = dict(zip(PHASE_ORDER, [prefix + suffix for prefix in ['c', 'h', 'u', 'r', 'g', 't']]))
        assert len(set(attempts.values())) == len(PHASE_ORDER)
        state['attempts'] = attempts
        for stage in PHASE_ORDER:
            print('Starting CI phase ' + stage + '; no retries or fallback', flush=True)
            state['state'] = stage
            write(artifacts / 'pipeline-state.json', state)
            lease_stage = 'controls' if stage in ['controls', 'cache-controls', 'receipt-controls'] else stage
            active_lease = issue_lease(benchmark, lease_stage, attempts[stage], 1 if stage != 'timed' else 5)
            if stage in ['controls', 'cache-controls']:
                argv = [sys.executable, benchmark / 'guard-controls.py', '--lease', active_lease,
                        '--timeout', '60', '--attempt', attempts[stage]]
                if stage == 'cache-controls':
                    argv.append('--cache-only')
                timeout = (7 if stage == 'cache-controls' else 38) * 90 + 120
            elif stage == 'receipt-controls':
                argv = [sys.executable, benchmark / 'cache-receipt-controls.py', '--lease', active_lease,
                        '--attempt', attempts[stage], '--proof-attempt', attempts['unit-proof']]
                timeout = 120
            else:
                argv = [sys.executable, benchmark / 'run.py', stage, '--lease', active_lease,
                        '--timeout', '600', '--attempt', attempts[stage]]
                if stage == 'timed':
                    argv.extend(['--gate-attempt', attempts['gate']])
                timeout = (24 if stage == 'timed' else 4) * 660 + 120
            command(argv, benchmark, artifacts / (stage + '.log'), timeout, supervisor, state, observe_initial=False)
            if stage in ['controls', 'cache-controls']:
                accepted = verify_controls(benchmark, attempts[stage], supervisor, cache_only=stage == 'cache-controls')
            elif stage == 'receipt-controls':
                accepted = verify_receipt_controls(benchmark, attempts[stage], attempts['unit-proof'], supervisor)
            else:
                accepted = verify_samples(benchmark, attempts[stage], stage, supervisor, gate_attempt=attempts['gate'])
                # Preserve each native phase's terminal inventory before the next
                # phase replaces the shared live run-state pointer.
                write(benchmark / ('run-state-' + stage + '-' + attempts[stage] + '.json'), read(benchmark / 'run-state.json'))
            state['phases'][stage] = accepted
            current = state['phases'][stage]['identities']
            assert {v: {k: x for k, x in row.items() if k != 'checkedAtUTC'} for v, row in current.items()} == {
                v: {k: x for k, x in row.items() if k != 'checkedAtUTC'} for v, row in state['initialIdentities'].items()}
            state['phases'][stage]['controllerProcesses'] = verify_terminal_processes([state['commands'][-1]])
            revoke(active_lease, 'exact-actual-outcomes-source-processes-verified')
            active_lease = None
            write(artifacts / (stage + '-acceptance.json'), state['phases'][stage])
            print('Accepted actual outcomes/source/PIDs for ' + stage, flush=True)
        state.update({'terminal': True, 'state': 'all38controls-7cachehooks-4unitproof-2positive7negative-receipts-4untimed-24timed-passed', 'finishedAtUTC': now(),
                      'noFullSuiteSpeedClaim': True, 'allFiveDeliveriesStillOpen': True})
    except BaseException as error:
        state.update({'terminal': True, 'state': 'failed-no-retry-no-later-phase', 'failure': repr(error), 'finishedAtUTC': now()})
        raise
    finally:
        if active_lease:
            revoke(active_lease, 'failed-no-later-phase')
        write(artifacts / 'pipeline-state.json', state)
        if benchmark and benchmark.exists():
            for path in benchmark.glob('*.json'):
                shutil.copyfile(path, artifacts / path.name)
            for variant in ['original', 'candidate']:
                path = benchmark / 'subjects' / variant / '.probe-source-manifest.json'
                if path.is_file():
                    shutil.copyfile(path, artifacts / (variant + '-CI-subject-manifest.json'))
            if (benchmark / 'results').exists():
                shutil.copytree(benchmark / 'results', artifacts / 'results')
        write(artifacts / 'artifact-hashes.json', {str(p.relative_to(artifacts)): sha(p)
              for p in sorted(artifacts.rglob('*')) if p.is_file() and p.name != 'artifact-hashes.json'})

if __name__ == '__main__':
    main()
