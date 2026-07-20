# Technical Write-up

## Architecture Decisions

The solution is designed as a modular Node.js pipeline with separate components for ingestion, normalization, validation, AI reasoning, and CRM delivery. Lead data is read from a CSV file, while synthetic patient data is fetched from a FHIR API. Since both sources have different structures, each record is normalized into a common internal format before further processing.

Validation is performed before sending records to the AI agent. Invalid records are excluded from AI processing and stored separately with their validation errors. This avoids unnecessary LLM usage and prevents incomplete data from reaching the mock CRM.

The AI agent is responsible for classifying each record, assigning a priority, selecting the next action and communication channel, explaining its reasoning, and generating a personalized message. The processed result is then sent through a CRM client to a local Express-based mock CRM API. Separating the CRM client from the CRM routes makes it easier to replace the local JSON-based CRM with Airtable, HubSpot, Salesforce, or another external system later.

Local JSON files were used for this assessment because they keep the project easy to run without requiring paid infrastructure or database setup. Groq was selected as the LLM provider because its free tier supports fast model inference, while the SMART Health IT FHIR source provides synthetic healthcare data suitable for development and demonstration.

## Handling 10,000 Records per Day

For 10,000 leads or patients per day, I would move from sequential processing to an asynchronous, queue-based architecture. Ingestion services would place validated records into a message queue such as Amazon SQS, RabbitMQ, or Kafka. Multiple worker processes could then consume records concurrently and scale horizontally according to queue size.

Records and processing states would be stored in PostgreSQL or another durable database instead of local JSON files. Each record would have a unique idempotency key to prevent duplicate processing or duplicate CRM delivery. AI requests would be batched where appropriate, rate-limited, retried with exponential backoff, and moved to a dead-letter queue after repeated failures.

I would also add caching, structured logging, metrics, alerts, and dashboards for queue depth, processing time, AI failures, token usage, and CRM delivery failures. Sensitive workflows could use separate queues based on record type and priority. This architecture would allow the application to recover from partial failures without rerunning the entire pipeline.

## Handling Real PHI and HIPAA-Relevant Data

The current project uses synthetic patient data and is not intended to process real protected health information. For real PHI, I would only use infrastructure and third-party services that are approved for the healthcare environment and covered by the required Business Associate Agreements. HHS guidance states that cloud providers handling electronic PHI on behalf of covered entities or business associates generally require a HIPAA-compliant BAA. :contentReference[oaicite:0]{index=0}

PHI would be encrypted both in transit and at rest. Access would follow role-based access control and least-privilege principles, with multi-factor authentication, secret management, audit logs, access reviews, backups, and incident-response procedures. HIPAA's Security Rule requires appropriate administrative, physical, and technical safeguards to protect the confidentiality, integrity, and availability of electronic PHI. :contentReference[oaicite:1]{index=1}

Only the minimum information necessary for the specific task would be sent to the AI model or downstream system. Direct identifiers should be removed or tokenized whenever possible, and PHI should never appear in application logs, error messages, prompts, analytics, or source-code repositories. This follows the HIPAA Privacy Rule's minimum-necessary principle, which requires reasonable efforts to limit PHI use, disclosure, and requests to what is needed for the intended purpose. :contentReference[oaicite:2]{index=2}

I would also define retention and secure deletion policies, maintain audit trails, perform regular risk assessments, and establish breach-detection and notification procedures. AI prompts and responses would only be processed by a provider contractually permitted to handle PHI. Where possible, the AI layer would receive de-identified or pseudonymized clinical context rather than complete patient records.