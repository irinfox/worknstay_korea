# Privacy Policy

This site uses privacy-first, cookieless analytics to understand how it is used and to improve the user experience.

**What data is collected:**
* **Page interactions:** Anonymous page views, page transitions, and interface interactions (e.g., scrolls, clicks on navigation, external links, calculator submissions).
* **Calculator inputs:** Strictly generalized. Income is stored as a ratio of the GNI, age is grouped into ranges (e.g., "30–34"), and accompanying family is saved as a simple yes/no. Exact numbers are never saved.
* **Technical environment:** Generalized device category (mobile/tablet/desktop), screen-width bucket, browser language, and a bot-probability flag.
* **Acquisition:** The referring site's domain and campaign parameters (UTMs), if present.
* **Site health:** Short JavaScript error messages (with all numbers masked to protect inputs) and server-side API performance logs.
* **Country of origin:** Cloudflare uses the user's IP address at the network edge to determine the country. The country is saved, but the IP address is immediately discarded and never reaches the project's database.

**What IS NOT collected:**
* No cookies or local storage tracking entries are placed on the user's device.
* No IP addresses, raw User-Agents, or personal identifiers (PII) are saved.
* No cross-site tracking or persistent individual profiles. Events are only linked together during a single page view using a temporary, in-memory ID that disappears as soon as user navigates away or reloads the page.

**Data storage and retention:**
* Project uses **PostHog** and **Cloudflare D1** to process and store this anonymous data.
* To ensure strict data protection standards, the PostHog instance is hosted exclusively on **EU servers**.
* PostHog's Session Replay or heatmap features are configured to strictly mask all text inputs, ensuring no typed data is ever recorded.
* PostHog is not loaded if the user's browser sends a Do Not Track or Global Privacy Control signal.
* Raw event logs are automatically deleted after 24 months. Only aggregated monthly summaries (e.g., "120 calculator submissions") are kept permanently.

**Third-Party Services:**
* **[Google Fonts:](https://fonts.google.com/faq#privacy)** The site uses Google Fonts. When a user's browser downloads these fonts, the user IP address may be exposed to Google's servers.
* **[Cloudflare Web Analytics:](https://developers.cloudflare.com/web-analytics/about/)** The site uses Cloudflare's built-in, cookieless analytics to monitor overall traffic and site performance. It does not track individual visitors or place tracking cookies on user's device.

**Contact:**
In case of any privacy concerns, you can reach out via the [Feedback form](https://tally.so/r/0Q2zrP).

The full analytics pipeline is presented in [`TRACKING_PLAN.md`](./docs/TRACKING_PLAN.md).
