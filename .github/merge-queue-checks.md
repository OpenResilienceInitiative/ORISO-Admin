# Admin merge queue checks

The pull-request workflows also run for `merge_group` candidates. Each checkout uses the event SHA, so a queued run validates the synthetic combined commit. The queue must remain disabled until this change is reviewed and merged and its emitted check names have been verified.

Candidate check names:

- Admin application image validation
- Unit tests (shard 1/4) through Unit tests (shard 4/4)
- Storybook component tests (interactions + a11y)
- Admin Storybook image validation

Both image builds keep publishing disabled. Existing review and branch protections remain in place. After merge, validate the real queue event, exact candidate SHA, independent concurrency and each emitted name before configuring required checks.
