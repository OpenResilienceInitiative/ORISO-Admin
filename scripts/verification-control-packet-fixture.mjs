// Test-only synthetic packets. Independent of the production result validator.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ElementA11yParameterError } from 'storybook/internal/preview-errors';
import { createVerificationRecorder } from '../.storybook/verificationIntegrity.ts';

// Synthetic native transport regression; these packets do not execute axe.
const matcherFile = path.join(
    path.dirname(createRequire(import.meta.url).resolve('@storybook/addon-a11y/preview')),
    '_browser-chunks/matchers-JIUQ3HVY.js',
);
const { toHaveNoViolations } = await import(/* @vite-ignore */ pathToFileURL(matcherFile).href);
export const expected = new Map([
    ['Healthy', null],
    ['Contextual Feedback', null],
    ['Low Contrast', 'color-contrast'],
    ['Unnamed Button', 'button-name'],
    ['Missing Alt', 'image-alt'],
    ['Caught Error', 'console-error: controlled console error'],
    ['Uncaught Error', 'uncaught-error: Uncaught Error: controlled uncaught error'],
    ['Unhandled Rejection', 'unhandled-rejection: controlled unhandled rejection'],
    ['Unexpected Request', 'unexpected-request:'],
    ['Fallback', 'fallback: A failure fallback replaced the story'],
    ['Production Boundary', 'fallback: A failure fallback replaced the story'],
    ['Expected Error', null],
    ['Known Baseline', 'color-contrast'],
    ['Known Added Node', 'color-contrast'],
    ['Known Worse Style', 'color-contrast'],
    ['Known Operational Error', 'color-contrast'],
    ['Missing Audit', 'Accessibility audit requires exactly one'],
    ['Audit Error', 'Accessibility audit'],
    ['Duplicate Audit', 'Accessibility audit requires exactly one'],
    ['Strict Addon Violation', 'Unapproved accessibility violation'],
]);
const eventFixtures = {
    'Caught Error': [{ kind: 'console-error', message: 'controlled console error' }],
    'Uncaught Error': [
        { kind: 'uncaught-error', message: 'Uncaught Error: controlled uncaught error' },
        { kind: 'console-error', message: 'Uncaught Error: controlled uncaught error' },
    ],
    'Unhandled Rejection': [
        { kind: 'unhandled-rejection', message: 'controlled unhandled rejection' },
        { kind: 'console-error', message: '[object PromiseRejectionEvent]' },
    ],
    'Unexpected Request': [
        { kind: 'unexpected-request', message: 'GET http://localhost:63315/service/__verification_unexpected__' },
    ],
    Fallback: [{ kind: 'fallback', message: 'A failure fallback replaced the story' }],
    'Production Boundary': [
        {
            kind: 'console-error',
            message:
                '%o\n\n%s\n\n%s\n controlled production boundary failure The above error occurred in the <BrokenProductChild> component. React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.',
        },
        {
            kind: 'console-error',
            message:
                '[ErrorBoundary:verification] controlled production boundary failure \n    at BrokenProductChild (http://localhost:63315/controls.tsx:1:1)\n    at ErrorBoundary (http://localhost:63315/boundary.tsx:1:1)',
        },
        { kind: 'fallback', message: 'A failure fallback replaced the story' },
    ],
    'Known Operational Error': [{ kind: 'console-error', message: 'approved story independent console failure' }],
};
const fixtureEvidence = (title, failure, control) => {
    const storyId = `verificationcontrols-temporary--${title.toLowerCase().replaceAll(' ', '-')}`;
    const decorated = (message) =>
        `\n\x1b[34mClick to debug the error directly in Storybook: http://localhost:6006/?path=/story/${storyId}&addonPanel=storybook/interactions/panel\x1b[39m\n\n${message}`;
    const details = [];
    const functional = control.profile === 'functional-pilot';
    const events = eventFixtures[title];
    if (events && (title !== 'Known Operational Error' || control.phase === 'verify')) {
        const recorder = createVerificationRecorder();
        events.forEach((event) => recorder.record(event.kind, event.message));
        try {
            recorder.assertComplete();
        } catch (error) {
            details.push({
                name: error.name,
                message: error.message,
                verificationFailures: error.verificationFailures,
                verificationOrigin: error.verificationOrigin,
            });
        }
    }
    if (functional) {
        if (title === 'Duplicate Audit')
            details.push({ name: 'Error', message: 'Functional pilot unexpected audit report' });
        return {
            details,
            a11y: {
                profile: 'functional-pilot',
                storyId,
                auditCount: 0,
                compliance: { status: 'DEFERRED', execution: 'NOT_RUN', reason: 'pilot scope' },
                reports: title === 'Duplicate Audit' ? [{ result: { error: 'controlled duplicate audit' } }] : [],
            },
        };
    }
    const rules = {
        'Unnamed Button': 'button-name',
        'Strict Addon Violation': 'button-name',
        'Missing Alt': 'image-alt',
    };
    const rule = rules[title] ?? 'color-contrast';
    const violates =
        failure &&
        [
            'Low Contrast',
            'Unnamed Button',
            'Missing Alt',
            'Known Baseline',
            'Known Added Node',
            'Known Worse Style',
            'Known Operational Error',
            'Strict Addon Violation',
        ].includes(title) &&
        !(title === 'Known Operational Error' && control.phase === 'verify');
    const raw = {
        violations: violates
            ? [
                  {
                      id: rule,
                      impact: 'serious',
                      help: 'Fixture help',
                      nodes: [{ html: '<p>Fixture</p>', target: ['#fixture'], failureSummary: 'Fixture failure' }],
                  },
              ]
            : [],
    };
    const fingerprints = violates ? [JSON.stringify({ rule, html: '<p>Fixture</p>' })] : [];
    const reports = [{ result: raw }];
    if (violates) {
        const message = toHaveNoViolations(raw).message();
        reports.push({ result: { error: message, errorDetails: { name: 'Error', message } } });
        details.push(
            { name: 'Error', message: decorated(message) },
            { name: 'Error', message: `Unapproved accessibility violation in ${storyId}: ${fingerprints.join('\n')}` },
        );
    }
    const prefix =
        'Accessibility audit requires exactly one fresh version1 raw report and only its pinned strict assertion companion; received';
    if (title === 'Missing Audit') details.push({ name: 'Error', message: `${prefix} 0 reports (0 valid raw)` });
    if (title === 'Duplicate Audit') details.push({ name: 'Error', message: `${prefix} 2 reports (1 valid raw)` });
    if (title === 'Audit Error') {
        const error = new ElementA11yParameterError();
        details.push(
            { name: error.name, message: decorated(error.message) },
            { name: 'Error', message: 'Accessibility audit missing, malformed, failed, or unexpected engine version' },
        );
    }
    return {
        details,
        a11y: {
            profile: 'strict',
            storyId,
            environment: 'fixture',
            auditCount: 1,
            strictAssertionCompanion: !!violates,
            fingerprints,
            reports,
        },
    };
};
export function writeControlPacket(control, directory, unhandledErrors = [], checks = expected) {
    const run = path.join(directory, 'run-current');
    mkdirSync(run);
    const provenance = { path: 'provenance.json', runId: 'reporter-current' };
    const cases = [...checks].map(([name, failure]) => {
        const { details, a11y } = fixtureEvidence(name, failure, control);
        return {
            provenance,
            file: 'controls.tsx',
            name,
            state: failure ? 'failed' : 'passed',
            errors: details.map((error) => error.message),
            errorDetails: details,
            a11y,
        };
    });
    writeFileSync(
        path.join(directory, 'controls.json'),
        JSON.stringify({
            testResults: [
                {
                    assertionResults: [...checks].map(([title, failure]) => ({
                        title,
                        fullName: title,
                        status: failure ? 'failed' : 'passed',
                        failureMessages: cases
                            .find((item) => item.name === title)
                            .errorDetails.map((error) => error.stack || error.message),
                    })),
                },
            ],
        }),
    );
    writeFileSync(path.join(run, 'cases.jsonl'), cases.map((item) => JSON.stringify(item)).join('\n'));
    writeFileSync(
        path.join(run, 'events.jsonl'),
        cases
            .map((item) =>
                JSON.stringify({ provenance, event: 'result', name: item.name, file: item.file, state: item.state }),
            )
            .join('\n'),
    );
    writeFileSync(
        path.join(run, 'inventory.json'),
        JSON.stringify({ provenance, inventoryComplete: true, executed: checks.size, unhandledErrors }),
    );
    writeFileSync(
        path.join(run, 'provenance.json'),
        JSON.stringify({ runId: provenance.runId, source: control.source, control }),
    );
    return directory;
}
