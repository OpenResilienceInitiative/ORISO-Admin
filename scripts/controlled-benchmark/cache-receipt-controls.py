#!/usr/bin/env python3
"""Bounded negative verifier controls over a fresh accepted four-command proof.

No test runner/browser/source/cache mutation. Requires its own explicit controls
lease. All fixtures are in-memory copies of that proof's actual raw receipts.
"""
import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path

B = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('cache_control_supervisor', B / 'run.py')
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lease', required=True)
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--proof-attempt', required=True)
    args = parser.parse_args()
    args.stage = 'controls'
    supervisor.lease_check(args)
    assert all(supervisor.re.fullmatch('[A-Za-z0-9_-]{1,32}', value) for value in [args.attempt, args.proof_attempt])
    proof = supervisor.read(B / ('unit-proof-receipt-' + args.proof_attempt + '.json'))
    assert proof['passed'] and len(proof['runs']) == 4
    assert proof['materializationReceiptSHA256'] == supervisor.sha(supervisor.RECEIPT)
    assert proof['supervisorSHA256'] == supervisor.sha(B / 'run.py')
    output = B / 'results/cache-receipt-controls' / args.attempt
    output.mkdir(parents=True, exist_ok=False)
    lock = B / 'execution.lock'
    descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(descriptor, json.dumps({'supervisorPid': os.getpid(), 'stage': 'controls', 'attempt': args.attempt}).encode())
    os.close(descriptor)
    result = {'terminal': False, 'controls': [], 'noRunnerOrBrowserCommands': True,
              'noSourceOrCacheMutations': True, 'notNativeExecutionOrTimingProof': True}
    try:
        warm = next(row for row in proof['runs'] if row['variant'] == 'candidate' and row['cache'] == 'warm')
        cold = next(row for row in proof['runs'] if row['variant'] == 'candidate' and row['cache'] == 'cold')
        expectation = supervisor.read(B / 'expected-inventory.json')['unit']
        def arguments(row):
            directory = Path(row['artifactDirectory'])
            inventories = list((directory / 'verification').glob('*/inventory.json'))
            assert len(inventories) == 1
            events = [json.loads(line) for path in directory.glob('resolution-*.jsonl') for line in path.read_text().splitlines()]
            cases = [json.loads(line) for path in (directory / 'verification').glob('*/cases.jsonl') for line in path.read_text().splitlines()]
            return [directory, row, expectation, cases, supervisor.read(inventories[0]),
                    supervisor.read(inventories[0].parent / 'provenance.json'), events]
        warm_arguments = arguments(warm)
        cold_arguments = arguments(cold)
        supervisor.validate_unit_source_proof(*warm_arguments)
        supervisor.validate_unit_source_proof(*cold_arguments)
        result['positiveActualReceiptValidations'] = 2
        def rejects(name, function, fixture):
            supervisor.lease_check(args)
            fixture_path = output / (name + '-fixture.json')
            supervisor.write(fixture_path, json.loads(json.dumps(fixture, default=str)))
            try:
                function()
            except AssertionError as error:
                result['controls'].append({'name': name, 'actualOutcome': 'rejected', 'reason': str(error),
                                           'fixtureSHA256': supervisor.sha(fixture_path)})
            else:
                raise AssertionError('Negative control was accepted: ' + name)
        selected = str(Path(warm['cwd']) / expectation[0][0])
        changed = copy.deepcopy(warm_arguments)
        changed[-1] = [e for e in changed[-1] if not (e.get('phase') == 'cache-source' and e.get('real') == selected)]
        rejects('missing-selected-source-witness', lambda: supervisor.validate_unit_source_proof(*changed), changed)
        changed = copy.deepcopy(warm_arguments)
        for event in changed[-1]:
            if event.get('phase') == 'cache-source' and event.get('real') == selected:
                event['run']['output'] += '-foreign'
        rejects('foreign-command-source-witness', lambda: supervisor.validate_unit_source_proof(*changed), changed)
        changed = copy.deepcopy(warm_arguments)
        for event in changed[-1]:
            if event.get('phase') == 'cache-source' and event.get('real') == selected:
                event['sourceSHA256'] = '0' * 64
        rejects('changed-source-witness-bytes', lambda: supervisor.validate_unit_source_proof(*changed), changed)
        changed = copy.deepcopy(cold_arguments)
        changed[-1] = [e for e in changed[-1] if e.get('phase') != 'load']
        rejects('cold-resolve-and-source-callback-without-actual-load', lambda: supervisor.validate_unit_source_proof(*changed), changed)
        cold_path = Path(warm['warmFrom']['acceptance'])
        binding = [warm, supervisor.read(Path(warm['artifactDirectory']) / 'identity-before.json'),
                   supervisor.read(Path(warm['artifactDirectory']) / 'cache-before.json'), supervisor.read(cold_path),
                   supervisor.read(cold_path.parent / 'cache-after.json'), supervisor.read(cold_path.parent / 'identity-after.json')]
        supervisor.validate_warm_binding(*binding)
        changed = copy.deepcopy(binding)
        changed[1]['subjectManifestSHA256'] = '0' * 64
        rejects('wrong-cold-to-warm-source-identity', lambda: supervisor.validate_warm_binding(*changed), changed)
        changed = copy.deepcopy(binding)
        changed[2]['CONTROL-foreign-or-altered-cache'] = '0' * 64
        rejects('wrong-cold-to-warm-cache-snapshot', lambda: supervisor.validate_warm_binding(*changed), changed)
        changed = copy.deepcopy(binding)
        changed[3]['accepted'] = False
        rejects('missing-accepted-cold-provenance', lambda: supervisor.validate_warm_binding(*changed), changed)
        result.update({'terminal': True, 'state': 'seven-negative-controls-rejected',
                       'proofReceiptSHA256': supervisor.sha(B / ('unit-proof-receipt-' + args.proof_attempt + '.json'))})
    except BaseException as error:
        result.update({'terminal': True, 'state': 'failed-no-retry', 'failure': repr(error)})
        raise
    finally:
        supervisor.write(output / 'controls-receipt.json', result)
        lock.unlink()

if __name__ == '__main__':
    main()
