#!/usr/bin/env python3
"""Explicit-controls-lease native checks. Preparation does not execute this file."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time
from types import SimpleNamespace

B = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('benchmark_supervisor', B / 'run.py')
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)
POSITIVE = ['http-root', 'http-source', 'http-public', 'http-own-package', 'virtual-module']
NEGATIVE = ['module-root', 'module-outside', 'http-fs-outside', 'http-fs-encoded-outside',
            'http-fs-root', 'http-absolute-outside', 'http-symlink-outside', 'module-cross-dependency',
            'virtual-outside', 'config-root-isolation', 'cache-isolation', 'cache-env-isolation',
            'duplicate-guard', 'foreign-marker']

CACHE_NEGATIVE = ['native-cache-root-escape', 'native-cache-project-symlink', 'native-cache-path-missing']

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lease', required=True)
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--timeout', type=int, default=60, help='control safety ceiling, not an estimated runtime')
    parser.add_argument('--cache-only', action='store_true', help='only seven new cache/source hook controls, not the historical38')
    args = parser.parse_args()
    args.stage = 'controls'
    assert 30 <= args.timeout <= 120
    assert supervisor.re.fullmatch(r'[A-Za-z0-9_-]{1,32}', args.attempt)
    lease = supervisor.lease_check(args)
    lock = B / 'execution.lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(fd, json.dumps({'supervisorPid': os.getpid(), 'leaseId': lease['leaseId'], 'stage': 'controls'}).encode())
    os.close(fd)
    result_root = B / 'results' / ('cache-controls' if args.cache_only else 'controls') / args.attempt
    state = {'stage': 'controls', 'attempt': args.attempt, 'terminal': False, 'runs': [],
             'leaseId': lease['leaseId'], 'controlsAreNotBenchmarks': True, 'active': None,
             'cacheHookFixturesAreNotActualVitestResolution': args.cache_only}
    state_path = result_root / 'controls-state.json'
    result_root_created = False
    receipt = supervisor.read(supervisor.RECEIPT)
    try:
        result_root.mkdir(parents=True, exist_ok=False)
        result_root_created = True
        identities = {v: supervisor.guard(v) for v in ['original', 'candidate']}
        for variant in ['original', 'candidate']:
            other = 'candidate' if variant == 'original' else 'original'
            subject = receipt['subjects'][variant]
            root = Path(subject['root'])
            cases = (CACHE_NEGATIVE + (['native-source-changed'] if variant == 'candidate' else [])) if args.cache_only else POSITIVE + NEGATIVE
            for case in cases:
                supervisor.lease_check(args)
                directory = result_root / variant / case
                directory.mkdir(parents=True, exist_ok=False)
                cache = root / '.preflight-cache' / ('controls-' + args.attempt) / case
                assert not cache.exists(), 'fresh control cache; no retry/deletion'
                env = os.environ.copy()
                for key in ['VERIFICATION_SOURCE_SHA', 'ORISO_A11Y_CONTROL_PHASE', 'ORISO_A11Y_BASELINE_JSON',
                            'BUNDLE_MAIN_GZIP_LIMIT_KB', 'BUNDLE_MIN_LAZY_CHUNKS']:
                    env.pop(key, None)
                env.update({'PATH': str(supervisor.NODE.parent) + ':' + env.get('PATH', ''), 'CI': 'true',
                            'TZ': 'Europe/Berlin', 'BENCHMARK_ATTEMPT': args.attempt,
                            'BENCHMARK_VARIANT': variant, 'BENCHMARK_PROJECT': 'storybook',
                            'BENCHMARK_OUTPUT': str(directory), 'BENCHMARK_CACHE': str(cache), 'CACHE_DIR': str(cache),
                            'PREFLIGHT_SUBJECT_MANIFEST': subject['manifest'],
                            'PREFLIGHT_SUBJECT_MANIFEST_SHA256': identities[variant]['subjectManifestSHA256'],
                            'CONTROL_OTHER_DEPENDENCY_ROOT': receipt['subjects'][other]['dependencyRoot']})
                argv = [str(supervisor.NODE), str(B / 'guard-control-child.mjs'), case]
                entry = {'label': variant + '-' + case, 'variant': variant, 'suite': 'storybook',
                         'case': case, 'attempt': args.attempt, 'argv': argv, 'cwd': str(root),
                         'cacheBoundary': {'requested': str(cache)}, 'observations': [], 'executables': {},
                         'state': 'starting', 'expected': 'positive' if case in POSITIVE else 'rejection'}
                state['runs'].append(entry)
                state['active'] = entry
                supervisor.write(state_path, state)
                with (directory / 'run.log').open('w') as output:
                    started = time.monotonic()
                    process = subprocess.Popen(argv, cwd=root, env=env, stdout=output, stderr=subprocess.STDOUT,
                                               start_new_session=True)
                    entry.update({'pid': process.pid, 'pgid': process.pid, 'state': 'running'})
                    failure = supervisor.monitor_owned_process(args, process, entry, state, directory,
                                                              identities[variant], started, state_path)
                    entry.update({'diagnosticWallSeconds': time.monotonic() - started, 'exitCode': process.wait(),
                                  'remainingOwnedProcesses': supervisor.process_group(process.pid)})
                supervisor.write(directory / 'process.json', entry)
                assert not entry['remainingOwnedProcesses'], 'control left owned processes'
                if case in POSITIVE:
                    assert failure is None and entry['exitCode'] == 0, failure
                    result = supervisor.read(directory / 'control-result.json')
                    assert result['status'] == 'native-positive-passed' and result['noRejectedEvents'] and result['noFatalMarker']
                else:
                    assert failure and entry.get('guardFatalObserved'), 'fatal marker must stop shared monitor, not hit safety timeout'
                    fatal = entry['guardFatalObserved']
                    if case == 'foreign-marker':
                        assert fatal['bindingIssues'] and 'binding mismatch' in str(fatal['bindingIssues'])
                    else:
                        assert not fatal['bindingIssues'], fatal
                    proof = supervisor.read(directory / 'first-fatal-proof.json')
                    assert proof['firstMarkerPreserved'] and proof['temporaryPublicationFilesRemaining'] == 0
                    assert entry['exitCode'] != 0, 'expected owned termination after fatal marker'
                entry['state'] = 'control-expected-outcome-observed'
                state['active'] = None
                supervisor.write(state_path, state)
                after = supervisor.guard(variant)
                assert after == {**identities[variant], 'checkedAtUTC': after['checkedAtUTC']}
        state.update({'terminal': True, 'state': 'controls-passed-not-equality', 'finishedAtUTC': supervisor.now()})
        supervisor.write(result_root / 'controls-receipt.json', {'state': state['state'], 'runs': state['runs'],
                         'materializationReceiptSHA256': supervisor.sha(supervisor.RECEIPT),
                         'supervisorSHA256': supervisor.sha(B / 'run.py'),
                         'childControlSHA256': supervisor.sha(B / 'guard-control-child.mjs'),
                         'noSampleTimingOrEqualityClaim': True})
    except BaseException as error:
        state.update({'terminal': True, 'state': 'controls-failed-no-retry', 'failure': repr(error)})
        raise
    finally:
        if result_root_created:
            supervisor.write(state_path, state)
        lock.unlink()

if __name__ == '__main__':
    main()
