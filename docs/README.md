# Lock-Ad v3 Documentation

Use this index to find the current product, implementation, and operations
guides. The project plan describes verified behavior and clearly separates it
from proposed work.

## Start here

- [Root README](../README.md): setup and project overview.
- [User Guide](USER_GUIDE.md): current web-app workflows and limitations.
- [Project README and Plan](PROJECT_README.md): implemented scope, known gaps,
  principles, and roadmap.

## Product and architecture

- [System Architecture](../architecture/README.md): system topology, component
  responsibilities, and terminology.
- [Data Sources and Coverage](DATA_SOURCES_AND_COVERAGE.md): active sources,
  freshness, limitations, and candidates not yet integrated.
- [Long-Term Product Vision](Lock-Ad_v3_Long-Term_Vision.md): aspirational
  product direction.

## Implementation references

- [API Reference](API_REFERENCE.md): endpoint permissions, payloads, and
  response contracts.
- [Backend Guide](BACKEND.md): Django setup, configuration, and development.
- [Frontend Guide](FRONTEND.md): React/Vite setup and client structure.

## Operations and governance

- [Operations and Production Readiness](OPERATIONS.md): deployment, backups,
  workers, and recovery.
- [Report Privacy and AI Processing](PRIVACY_AND_AI.md): data flows, access,
  and optional external AI processing.
- [Conversation / Project Context Export](CONVERSATION_EXPORT.md): historical
  planning and conversation context; use current implementation docs when
  deciding what the app does today.

## Documentation rule

Keep one canonical home for each durable fact: endpoint contracts belong in
the API reference, source coverage in the data-source guide, operations in the
operations guide, and cross-cutting implementation state in the project plan.
Keep product and implementation guides here; architecture-specific references
and decision records stay under architecture/. Link to those sources instead
of maintaining conflicting copies.
