# Serverless Route 53 Backup Solution (`sam-backup-route53`)

Serverless stack to back up Route 53 DNS hosted zones to S3 on a daily schedule.

---

## Architecture & Features

- **cron:** Triggered daily.
- **S3 Storage:** Backups are stored in an S3 bucket transitioning objects to **S3 Glacier Deep Archive** after 90 days with a 3-year expiration.
- **Optional Tagging & Custom Naming:** Parameterized tags and bucket name prefixes that support clean local linting and production overrides.

---

## Prerequisites

Ensure you have the following installed on your machine:
- [AWS CLI](https://aws.amazon.com/cli/) (configured with appropriate credentials)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Node.js](https://nodejs.org/) (Node 24.x or compatible runtime)

---

## Getting Started & Configuration

When you clone this repository, local configuration files like `samconfig.toml` are excluded from Git tracking for security. To get started, create a `samconfig.toml` file in the root directory based on the example below.

### Example `samconfig.toml`

Create a file named `samconfig.toml` in your project root:

```toml
version = 0.1

[default.deploy.parameters]
stack_name = "sam-backup-route53"
s3_bucket = "your-sam-deployment-bucket-name"
s3_prefix = "sam-backup-route53"
region = "us-east-1"
confirm_changeset = true
capabilities = ["CAPABILITY_IAM"]
parameter_overrides = "BucketNamePrefix=\"mycompany\" BrandTag=\"Corporate\" FunctionTag=\"Management\" ProjectTag=\"Route53Backup\" BillingTag=\"Infrastructure\""
```

---

## Deployment

1. **Build the application:**
   ```bash
   sam build
   ```

2. **Run a dry-run deployment (preview changes):**
   ```bash
   sam deploy --no-execute-changeset
   ```

3. **Deploy live to your AWS account:**
   ```bash
   sam deploy
   ```

---

## Cleanup

To delete the stack and all associated resources (excluding retained snapshots if configured), run:
```bash
sam delete
```