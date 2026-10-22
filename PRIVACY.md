# Privacy Policy

This site uses privacy-first, cookieless analytics to understand how it is used and to improve the user experience.

**What data is collected:**
* **Page interactions:** Anonymous page views, page transitions, and interface interactions (e.g., scrolls, clicks on navigation, external links, calculator submissions).
* **Calculator inputs:** Strictly generalized. Income is stored as a ratio of the GNI, age is grouped into ranges (e.g., "30–34"), and accompanying family is saved as a simple yes/no. Exact numbers are never saved.
* **Technical environment:** Generalized device category (mobile/tablet/desktop), screen-width bucket, browser language, and a bot-probability flag.
* **Acquisition:** The referring site's domain and campaign parameters (UTMs), if present.
* **Site health:** Short JavaScript error messages (with all numbers masked to protect inputs) and server-side API performance logs.
* **Country of origin:** Cloudflare uses user's IP address at the network edge to determine the country. The country is saved, but the IP address is immediately discarded and never reaches project's database.

**What IS NOT collected:**
* No cookies or local storage tracking entries are placed on user's device.
* No IP addresses, raw User-Agents, or personal identifiers (PII) are saved.
* No cross-site tracking or persistent individual profiles. Events are only linked together during a single page view using a temporary, in-memory ID that disappears as soon as user navigates away or reload the page.

**Data storage and retention:**
* Project uses **PostHog** and **Cloudflare D1** to process and store this anonymous data.
* To ensure strict data protection standards, the PostHog instance is hosted exclusively on **EU servers**.
* Any Session Replay or heatmap features in PostHog are configured to strictly mask all text inputs and DOM elements, ensuring no typed data is ever recorded.
* Raw event logs are automatically deleted after 24 months. Only aggregated monthly summaries (e.g., "120 calculator submissions") are kept permanently.

**Third-Party Services:**
* **Google Fonts:** The site uses Google Fonts. When a user's browser downloads these fonts, user IP address may be exposed to Google's servers.

**Contact:**
In case of any privacy concerns, you can reach out via the [Feedback form](https://tally.so/r/0Q2zrP).

The full analytics pipeline is presented in [`TRACKING_PLAN.md`](./docs/TRACKING_PLAN.md).
