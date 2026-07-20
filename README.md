# AI Intake Agent

An AI-powered intake pipeline built with **Node.js**, **Express.js**, and **Groq LLM** that ingests lead and patient data from multiple sources, normalizes records into a common format, validates the data, performs AI-driven analysis, generates personalized outreach messages, and stores the processed records in a mock CRM.

---

## Features

- Read lead data from a CSV file
- Fetch patient data from a FHIR API
- Normalize multiple data sources into a unified schema
- Validate records before AI processing
- Store invalid records separately with validation errors
- AI-powered classification and prioritization using Groq LLM
- Generate personalized outreach messages
- Deliver processed records to a mock CRM using REST APIs
- Store CRM records in a local JSON database
- Retry mechanism for temporary Groq API rate limits

---

## Architecture

```text
                 +------------------+
                 |  mock_leads.csv  |
                 +------------------+
                          |
                          v
                  Normalize Leads
                          |
+------------------+      |
|    FHIR API      |------+
+------------------+
        |
        v
 Normalize Patients
        |
        v
+--------------------------+
| Unified Record Structure |
+--------------------------+
            |
            v
+--------------------------+
| Record Validation        |
+--------------------------+
      |             |
      |             |
      |             +----------------------+
      |                                    |
      |                                    v
      |                      failed_records.json
      |
      v
+--------------------------+
| AI Intake Agent          |
|                          |
| • Classification         |
| • Priority               |
| • Decision               |
| • Outreach Channel       |
| • Personalized Message   |
+--------------------------+
            |
            v
+--------------------------+
| CRM Client               |
+--------------------------+
            |
            v
POST /api/crm/records
            |
            v
+--------------------------+
| Mock CRM API             |
+--------------------------+
            |
            v
processed_records.json
```

---

## Project Structure

```text
ai-intake-agent/
│
├── data/
│   ├── mock_leads.csv
│   ├── processed_records.json
│   └── failed_records.json
│
├── logs/
│   └── agent.log
│
├── src/
│   ├── agent/
│   ├── delivery/
│   ├── ingest/
│   ├── llm/
│   ├── normalize/
│   ├── routes/
│   ├── utils/
│   └── app.js
│
├── .env.example
├── package.json
└── README.md
```

---

## Tech Stack

- Node.js
- Express.js
- Groq LLM
- Axios
- CSV Parser
- FHIR API
- JavaScript (ES6)

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
```

Navigate to the project directory:

```bash
cd ai-intake-agent
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create a `.env` file using the following template:

```env
PORT=3000

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

CRM_BASE_URL=http://localhost:3000/api/crm
```

---

## Running the Project

Start the server:

```bash
node src/app.js
```

The application will:

1. Read lead data from the CSV file.
2. Fetch patient data from the FHIR API.
3. Normalize all records.
4. Validate records.
5. Save invalid records.
6. Process valid records using the AI agent.
7. Deliver processed records to the mock CRM.

---

## API Endpoints

### Health Check

```
GET /health
```

Response

```json
{
  "success": true,
  "message": "AI Intake Agent API is running"
}
```

---

### Get All CRM Records

```
GET /api/crm/records
```

---

### Get Record by ID

```
GET /api/crm/records/:recordId
```

---

### Create / Update CRM Record

```
POST /api/crm/records
```

Example Request

```json
{
  "recordId": "L001",
  "recordType": "lead",
  "name": "Rebecca Hart"
}
```

---

## AI Processing

For every valid record, the AI agent performs:

- Classification
- Priority Assignment
- Recommended Action
- Communication Channel Selection
- Personalized Message Generation

Example Output

```json
{
  "agentDecision": {
    "classification": "warm",
    "priority": "medium",
    "recommendedAction": "send_linkedin_message",
    "channel": "linkedin"
  },
  "generatedMessage": "Hi Rebecca, I noticed your interest in AI solutions for clinics..."
}
```

---

## Validation

Each record is validated before AI processing.

Validation includes:

- Record ID
- Name
- Record Type
- Contact Information
- Lead-specific fields
- Patient-specific fields

Invalid records are stored in:

```
data/failed_records.json
```

---

## Output Files

### Processed Records

```
data/processed_records.json
```

Contains successfully processed records delivered to the mock CRM.

### Failed Records

```
data/failed_records.json
```

Contains records that failed validation along with the corresponding validation errors.

---

## Workflow

```text
CSV Leads
        │
        ▼
FHIR Patients
        │
        ▼
Normalization
        │
        ▼
Validation
        │
        ├──────────────► failed_records.json
        │
        ▼
AI Agent
(Classification + Decision + Message)
        │
        ▼
CRM Client
        │
        ▼
Mock CRM API
        │
        ▼
processed_records.json
```

---

## Sample Output

A successful sample run containing 10 end-to-end processed records is included in:

```text
sample-output/processed_records.json
```

The sample contains:

- 5 lead records
- 5 synthetic patient records
- AI classification and priority
- Agent reasoning
- Recommended action and communication channel
- Final personalized message
- Mock CRM delivery confirmation

Additional sample files:

```text
sample-output/failed_records.json
sample-output/run-summary.txt
```

The processed records can also be viewed while the server is running:

```text
GET http://localhost:3000/api/crm/records
```

The final sample run completed with:

```text
Records Processed : 10
CRM Delivered     : 10
Validation Failed : 1
Processing Failed : 0
```

---

## Assumptions

- The FHIR server provides publicly accessible synthetic patient data.
- CSV files follow the expected schema.
- Invalid records are excluded from AI processing.
- The local JSON file acts as a mock CRM database.
- Groq API credentials are configured through environment variables.

---

## Future Improvements

- Optimize prompts to reduce token usage.
- Add authentication to the CRM API.
- Replace the JSON database with MongoDB or PostgreSQL.
- Add unit and integration tests.
- Add Swagger/OpenAPI documentation.
- Containerize the application using Docker.
- Support batch AI processing.

---

## Author

**Ashish Kumari**

Software Developer | Node.js | MERN Stack | AI Integration