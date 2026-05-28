# portfolio-site

Source for **[seba.sh](https://seba.sh)** — a hand-built, single-page Cloud /
DevOps portfolio. Vanilla HTML/CSS/JS, no framework, no build step. Hosted on
AWS S3 + CloudFront and deployed by GitHub Actions using OIDC (no long-lived
AWS credentials).

The infrastructure that serves this site lives in a separate repo,
[`portfolio-tf`](https://github.com/sebrcg/portfolio-tf) (Terraform). This repo
holds only the website itself and the deploy workflow.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page markup. |
| `styles.css` | All styling — dark/light themes, layout, animation. |
| `nodes.js` | Particle / canvas background. |
| `diagram.js` | Interactive AWS architecture diagram + edge map. |
| `main.js` | Nav, theme toggle, tweaks panel, live stats, easter eggs. |

## Local preview

No build needed. Serve the folder with any static server:

```sh
python -m http.server 8000   # then open http://localhost:8000
# or, with Node installed: npx serve .
```

(Opening `index.html` directly works too, but a local server matches how it's
served in production.)

## Deployment

Push to `main` → GitHub Actions syncs the files to S3 and invalidates
CloudFront. The flow:

1. GitHub Actions mints a short-lived OIDC token for the run.
2. `aws-actions/configure-aws-credentials` exchanges it with AWS STS
   (`AssumeRoleWithWebIdentity`) for ~1h temporary credentials.
3. AWS verifies the token against the registered OIDC provider and the IAM
   role's trust policy (which requires
   `sub = repo:sebrcg/portfolio-site:ref:refs/heads/main`).
4. The job runs `aws s3 sync` then a CloudFront invalidation.

No AWS keys are stored in GitHub, on disk, or anywhere else.

### One-time setup

After `terraform apply` succeeds in `portfolio-tf/envs/prod`, read the outputs:

```sh
terraform output -raw deploy_role_arn
terraform output -raw bucket_name
terraform output -raw distribution_id
```

Then, in **GitHub → Settings → Secrets and variables → Actions → Variables**,
add four repository **variables** (these are not secrets — the role ARN is not
sensitive, and OIDC stores no credentials):

| Name | Value |
|---|---|
| `AWS_ROLE_TO_ASSUME` | `deploy_role_arn` output |
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET` | `bucket_name` output |
| `CLOUDFRONT_DISTRIBUTION_ID` | `distribution_id` output |

Push to `main` (or run the workflow manually from the Actions tab) to deploy.
