# Flow: seller and offer lifecycle

```mermaid
flowchart TD
  Signup[Create or sign in to global account] --> Market[Select target market]
  Market --> Verify[Verify contact / seller requirements<br/>to be defined]
  Verify --> Plan[Select subscription]
  Plan --> Draft[Create offer draft<br/>in selected market]
  Draft --> Validate[Validate seller eligibility, market area,<br/>pair, assets, amount, methods, expiration]
  Validate --> Within{Meets rules and plan?}
  Within -->|No| Fix[Show validation errors]
  Fix --> Draft
  Within -->|Yes| Active[Publish active offer<br/>in selected market]
  Active --> Search[Available in that market's<br/>list/map by area and filters]
  Search --> Chat[Buyer starts a conversation<br/>from the offer]
  Chat --> Update{Is seller available?}
  Update -->|No| Pause[Pause offer<br/>and notify buyer]
  Update -->|Yes| Agree{Do both parties agree<br/>to the offer terms?}
  Agree -->|No| Chat
  Agree -->|Yes| Exchange[Create exchange record<br/>inheriting offer market]
  Exchange --> Coordinate[Coordinate a public meeting]
  Coordinate --> Finish[Mark completed/cancelled<br/>and rate/report if appropriate]
  Active --> Expire[Expire by time or close manually]
  Finish --> Expire
  Pause --> Active
```

## Intended product rules

- Buyers do not pay a subscription or per-exchange commission.
- Sellers pay a fixed monthly plan; limits and priority are enforced by the backend and explained to users.
- Publish only offers that pass domain validation, plan limits, and applicable moderation in the selected market.
- Each offer belongs to exactly one market. Account identity is global; market selection does not create a separate account or itself grant seller permissions.
- The billing scope of seller plans and whether seller profiles are global or market-specific remain to be decided. Publication eligibility must still be checked for the selected market.
- Basic/Pro prices and benefits from the proposal are hypotheses to validate before committing.
- Profile verification, KYC, and badges must not promise that an in-person exchange is safe. Confirm regulatory requirements and support procedures before the pilot.
