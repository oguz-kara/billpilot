# BillPilot

**AI invoice processing for property managers.** Email a vendor PDF invoice;
BillPilot extracts vendor, line items, tax and totals with Claude, validates
that lines + tax equal the total, maps each line to a property, checks for
duplicate payments, routes low-confidence extractions to a human review
screen, and posts approved bills to QuickBooks Online as multi-line bills.

> Personal build. Built on [vercel-labs/ai-sdk-preview-pdf-support](https://github.com/vercel-labs/ai-sdk-preview-pdf-support)
> (Apache-2.0) — I replaced the quiz flow with an invoice-extraction schema,
> added validation, property allocation, duplicate detection, a review UI
> (side-by-side viewer pattern credited to Nutlope/pdftochat) and the
> n8n → QuickBooks pipeline. Demo data is fictional.

## Why

Off-the-shelf tools (Hubdoc, Dext) read invoice headers but can't split one
landscaper's invoice across six properties, extract tax codes, or block a
duplicate payment. n8n's stock QuickBooks node writes single-line bills only.
BillPilot fills exactly that gap.

## Status

Skeleton — see `docs/spec.md` for scope and the measurement protocol.
No client-outcome numbers are claimed; the "Measured" section will carry only
metrics from this repo's own labeled test runs.

## License

Apache-2.0 — see [LICENSE](LICENSE). Original work (c) Vercel; modifications (c) Oguz Kara.
