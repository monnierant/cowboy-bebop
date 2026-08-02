# 0002 — Currencies follow their owners

**Status:** accepted

## Context

The first Sliced Dials integration embedded every dial on a prime and kept both
cartons and false notes there. That made permission impossible to grant at the
right level: an embedded item inherits its actor's ownership, so letting one
player fill one threat dial also handed them the entire prime.

Cartons describe a particular hunter's positive contribution. Pooling them on
the target lost who had earned them and made spending another hunter's cartons
indistinguishable from spending one's own.

## Decision

- Dials are world Items. A Cowboy Bebop flag links each one to a prime.
- Cartons live on the hunter who earned them and pay positive slices.
- False notes collect on the active prime and pay negative slices.
- Objective and threat dials both accept either resource. A slice intent opens
  the system's payer-and-genre picker: negative slices are paid by the linked
  prime; positive slices are paid by an owned hunter chosen
  from the picker.
- Foundry document permissions remain authoritative. A client is offered only
  actors it can update. Consequently, a player may fill a dial with their own
  cartons, while spending a prime's notes normally remains a GM act.
- Roll settlement is a GM action because it credits the prime. The active GM
  receives the chat action, and successful settlement deletes the shared chat
  message so the same result cannot be collected twice from another client.
- The active prime is one world setting, not one boolean on every actor.

## Consequences

- A dial can be revealed and owned independently of its prime.
- The prime sheet provides link and unlink actions for existing world dials.
- The prime sheet shows aggregate carton totals by genre. Individual correction
  stays on each hunter sheet, where ownership is explicit.
- Existing `isCurrentTarget` and prime-level carton data are abandoned. The
  system is young enough that a migration would cost more risk than recreating
  those small pools and selecting the active prime once.
- Placement and debit are still two document writes. The picker validates
  immediately before placement and pools are clamped at zero, but two clients
  spending the final token simultaneously remains a table-level race to verify.
