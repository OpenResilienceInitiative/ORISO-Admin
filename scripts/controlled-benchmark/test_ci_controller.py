#!/usr/bin/env python3
"""Regression tests for rereading native inventories through the CI JSON boundary."""
import copy
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest

sys.dont_write_bytecode = True
from ci_controller import sha, verify_samples, write


class PersistedInventoryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.benchmark = Path(self.temporary.name)
        self.attempt = 'native-proof'
        self.actual = {}
        self.materialization = self.benchmark / 'materialization-receipt.json'
        self.materialization.write_text('{}\n')
        (self.benchmark / 'run.py').write_text('# immutable supervisor fixture\n')
        rows = []
        for variant in ['original', 'candidate']:
            for cache in ['cold', 'warm']:
                directory = self.benchmark / 'results/unit-proof' / self.attempt / variant / cache
                directory.mkdir(parents=True)
                identity = {'source': variant, 'checkedAtUTC': 'before'}
                write(directory / 'identity-before.json', identity)
                write(directory / 'identity-after.json', {**identity, 'checkedAtUTC': 'after'})
                cases = [('src/sample.test.ts', f'case {i}') for i in range(52)]
                inventory = {
                    'expected': 52, 'executed': 52, 'passed': 52, 'failed': 0,
                    'skipped': 0, 'todo': 0, 'retried': 0, 'unhandled': 0,
                    'rawSuccessfulAudits': 0, 'cases': sorted(cases),
                    'actualCaseOrder': cases,
                    'sourceProof': {'sourceWitnesses': [{'path': 'src/sample.test.ts', 'sha256': 'abc'}]}
                }
                self.actual[directory] = inventory
                rows.append({
                    'variant': variant, 'suite': 'unit', 'repeat': 1, 'cache': cache,
                    'state': 'passed', 'exitCode': 0, 'remainingOwnedProcesses': [],
                    'artifactDirectory': str(directory), 'inventory': inventory
                })
        write(self.benchmark / 'run-state.json', {
            'terminal': True, 'active': None, 'state': 'passed', 'stage': 'unit-proof',
            'attempt': self.attempt, 'runs': rows
        })
        write(self.benchmark / f'unit-proof-receipt-{self.attempt}.json', {
            'passed': True, 'attempt': self.attempt, 'runs': rows,
            'materializationReceiptSHA256': sha(self.materialization),
            'supervisorSHA256': sha(self.benchmark / 'run.py')
        })
        self.supervisor = SimpleNamespace(
            RECEIPT=self.materialization,
            inspect_result=lambda directory, suite: copy.deepcopy(self.actual[directory]),
            guard=lambda variant: {'source': variant}
        )
        self.first = next(iter(self.actual.values()))

    def verify(self):
        return verify_samples(self.benchmark, self.attempt, 'unit-proof', self.supervisor)

    def test_exact_native_tuple_inventory_survives_json_receipt_round_trip(self):
        stored = json.loads((self.benchmark / 'run-state.json').read_text())
        self.assertIsInstance(self.first['cases'][0], tuple)
        self.assertIsInstance(stored['runs'][0]['inventory']['cases'][0], list)
        self.assertEqual(self.verify()['actualSuccessfulCommands'], 4)

    def test_changed_case_name_is_rejected(self):
        self.first['cases'][0] = ('src/sample.test.ts', 'changed case')
        with self.assertRaises(AssertionError):
            self.verify()

    def test_missing_case_is_rejected(self):
        self.first['cases'].pop()
        with self.assertRaises(AssertionError):
            self.verify()

    def test_changed_execution_order_is_rejected(self):
        self.first['actualCaseOrder'] = list(reversed(self.first['actualCaseOrder']))
        with self.assertRaises(AssertionError):
            self.verify()

    def test_changed_source_witness_is_rejected(self):
        self.first['sourceProof']['sourceWitnesses'][0]['sha256'] = 'different'
        with self.assertRaises(AssertionError):
            self.verify()

    def test_changed_expected_count_is_rejected(self):
        self.first['expected'] = 51
        with self.assertRaises(AssertionError):
            self.verify()

    def test_changed_raw_audit_count_is_rejected(self):
        self.first['rawSuccessfulAudits'] = 1
        with self.assertRaises(AssertionError):
            self.verify()


class HistoricalInstrumentationTests(unittest.TestCase):
    def test_reconstruction_distinguishes_changed_instrumentation_from_product_bytes(self):
        from assemble import reconstruct

        here = Path(__file__).resolve().parent
        declaration = json.loads((here / 'input-lock.json').read_text())
        delta = declaration['sharedInstrumentationDelta']
        self.assertEqual([row['path'] for row in delta],
                         ['benchmark-harness.ts', 'scripts/verification-provenance.mjs'])
        for row, source in zip(delta, ['benchmark-harness.ts', 'verification-provenance.mjs']):
            self.assertEqual(row['currentSHA256'], sha(here / 'inputs' / source))
            self.assertNotEqual(row['previousSHA256'], row['currentSHA256'])
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / 'uncreated'
            proof = reconstruct(here.parents[1], target, verify_only=True)
            self.assertFalse(target.exists())
        self.assertIs(proof['sourceBytesMatchHistoricalMacSubjects'], False)
        self.assertIs(proof['commonProductSourceBytesChangedFromHistoricalFreeze'], False)
        self.assertEqual(proof['sharedInstrumentationDelta'], delta)


if __name__ == '__main__':
    unittest.main()
